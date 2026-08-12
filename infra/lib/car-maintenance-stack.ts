import * as path from "node:path";
import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps, Tags } from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";
import * as cr from "aws-cdk-lib/custom-resources";

export interface CarMaintenanceStackProps extends StackProps {
  /** "owner/repo" allowed to assume the GitHub Actions deploy role. */
  readonly githubRepo: string;
  /** Gets created as the first Admins-group user on initial deploy. */
  readonly adminEmail: string;
  readonly domainName: string;
  readonly hostedZoneId: string;
  readonly hostedZoneName: string;
  /** Must be an ISSUED cert in us-east-1 covering domainName. */
  readonly certificateArn: string;
  /**
   * Overrides the app Lambda's image source. Only used by tests, to avoid
   * a real `docker build` of the whole Next.js app during `cdk synth` —
   * real deploys always take the default (`fromImageAsset` against the
   * repo-root Dockerfile).
   */
  readonly appImageCode?: lambda.DockerImageCode;
}

export class CarMaintenanceStack extends Stack {
  constructor(scope: Construct, id: string, props: CarMaintenanceStackProps) {
    super(scope, id, props);

    const { githubRepo, adminEmail, domainName, hostedZoneId, hostedZoneName, certificateArn } =
      props;

    // Applied to the stack itself (rather than at the App level in
    // bin/app.ts) so every resource is tagged regardless of how this stack
    // gets instantiated — including directly from a test, with no app-level
    // tagging step in between.
    Tags.of(this).add("REPO", "https://github.com/pschluet/car-maintenance-log");
    Tags.of(this).add("SITE", "cars.pauldev.io");

    // -------------------------------------------------------------------
    // DynamoDB — single table + one GSI for garage-wide list views
    // -------------------------------------------------------------------
    const table = new dynamodb.Table(this, "Table", {
      tableName: "CarMaintenanceLog",
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
    });
    table.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: { name: "gsi1pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "gsi1sk", type: dynamodb.AttributeType.STRING },
    });

    // -------------------------------------------------------------------
    // S3 — car photos, insurance/registration scans, and entry attachments.
    // Kept forever; nothing here has a natural expiration.
    // -------------------------------------------------------------------
    const attachmentsBucket = new s3.Bucket(this, "AttachmentsBucket", {
      removalPolicy: RemovalPolicy.RETAIN,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET],
          allowedOrigins: [`https://${domainName}`, "http://localhost:3000"],
          allowedHeaders: ["*"],
          exposedHeaders: ["ETag"],
          maxAge: 3000,
        },
      ],
    });

    // -------------------------------------------------------------------
    // Cognito — passwordless sign-in via a custom 6-digit email code.
    //
    // Cognito's built-in "email OTP" first factor (used by e.g. the
    // secure-transfer stack) doesn't expose a code-length setting, and
    // TODO.md specifically calls for a six-character token — so this pool
    // uses the classic three-Lambda CUSTOM_AUTH flow instead, which also
    // keeps it on the free Lite feature plan rather than requiring
    // Essentials.
    // -------------------------------------------------------------------
    const commonAuthLambdaEnv = { FROM_EMAIL: `no-reply@${hostedZoneName}` };
    const commonAuthLambdaProps = {
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 128,
      timeout: Duration.seconds(10),
      bundling: { minify: true, target: "node22" },
    };

    const defineAuthFn = new NodejsFunction(this, "DefineAuthFn", {
      entry: path.join(__dirname, "..", "lambda", "cognito", "define-auth.ts"),
      handler: "handler",
      ...commonAuthLambdaProps,
    });
    const createAuthFn = new NodejsFunction(this, "CreateAuthFn", {
      entry: path.join(__dirname, "..", "lambda", "cognito", "create-auth.ts"),
      handler: "handler",
      ...commonAuthLambdaProps,
      environment: commonAuthLambdaEnv,
    });
    const verifyAuthFn = new NodejsFunction(this, "VerifyAuthFn", {
      entry: path.join(__dirname, "..", "lambda", "cognito", "verify-auth.ts"),
      handler: "handler",
      ...commonAuthLambdaProps,
    });

    const sesIdentityArn = `arn:aws:ses:${this.region}:${this.account}:identity/${hostedZoneName}`;
    createAuthFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ses:SendEmail", "ses:SendRawEmail"],
        resources: [sesIdentityArn],
      })
    );

    const userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: "car-maintenance-log",
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
      },
      accountRecovery: cognito.AccountRecovery.NONE,
      removalPolicy: RemovalPolicy.RETAIN,
      featurePlan: cognito.FeaturePlan.LITE,
      email: cognito.UserPoolEmail.withSES({
        fromEmail: `no-reply@${hostedZoneName}`,
        fromName: "Car Maintenance Log",
        sesRegion: "us-east-1",
        sesVerifiedDomain: hostedZoneName,
      }),
      lambdaTriggers: {
        defineAuthChallenge: defineAuthFn,
        createAuthChallenge: createAuthFn,
        verifyAuthChallengeResponse: verifyAuthFn,
      },
    });

    const userPoolClient = userPool.addClient("WebClient", {
      authFlows: { custom: true }, // enables CUSTOM_AUTH (the 6-digit email code flow)
      disableOAuth: true, // the server talks to Cognito directly; no Hosted UI/OAuth redirect
      generateSecret: false,
      preventUserExistenceErrors: true,
      accessTokenValidity: Duration.hours(1),
      idTokenValidity: Duration.hours(1),
      refreshTokenValidity: Duration.days(30),
    });

    const adminsGroup = new cognito.CfnUserPoolGroup(this, "AdminsGroup", {
      userPoolId: userPool.userPoolId,
      groupName: "Admins",
      description: "Users who can access the admin page and manage other users",
    });

    // First-ever admin: created once on initial deploy so there's a way in
    // before anyone can use the in-app admin page. Re-deploys are
    // idempotent — AdminCreateUser on an existing user is ignored.
    const bootstrapAdminUser = new cr.AwsCustomResource(this, "BootstrapAdminUser", {
      onCreate: {
        service: "CognitoIdentityServiceProvider",
        action: "adminCreateUser",
        parameters: {
          UserPoolId: userPool.userPoolId,
          Username: adminEmail,
          UserAttributes: [
            { Name: "email", Value: adminEmail },
            { Name: "email_verified", Value: "true" },
          ],
          MessageAction: "SUPPRESS",
        },
        physicalResourceId: cr.PhysicalResourceId.of(`BootstrapAdminUser-${adminEmail}`),
        ignoreErrorCodesMatching: "UsernameExistsException",
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({ resources: [userPool.userPoolArn] }),
    });

    const bootstrapAdminGroup = new cr.AwsCustomResource(this, "BootstrapAdminGroup", {
      onCreate: {
        service: "CognitoIdentityServiceProvider",
        action: "adminAddUserToGroup",
        parameters: {
          UserPoolId: userPool.userPoolId,
          Username: adminEmail,
          GroupName: "Admins",
        },
        physicalResourceId: cr.PhysicalResourceId.of(`BootstrapAdminGroup-${adminEmail}`),
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({ resources: [userPool.userPoolArn] }),
    });
    bootstrapAdminGroup.node.addDependency(bootstrapAdminUser);
    bootstrapAdminGroup.node.addDependency(adminsGroup);

    // -------------------------------------------------------------------
    // App container — Next.js standalone server + Lambda Web Adapter,
    // built from the repo-root Dockerfile's "runtime" stage.
    // -------------------------------------------------------------------
    const repoRoot = path.join(__dirname, "..", "..");
    const appImageCode =
      props.appImageCode ??
      lambda.DockerImageCode.fromImageAsset(repoRoot, { file: "Dockerfile", target: "runtime" });
    const appFn = new lambda.DockerImageFunction(this, "AppFunction", {
      code: appImageCode,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 1024,
      timeout: Duration.seconds(30),
      environment: {
        TABLE_NAME: table.tableName,
        ATTACHMENTS_BUCKET: attachmentsBucket.bucketName,
        USER_POOL_ID: userPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        SITE_URL: `https://${domainName}`,
        FROM_EMAIL: `no-reply@${hostedZoneName}`,
        // Deliberately absent: LOCAL_AUTH. That flag only exists in
        // docker-compose's environment for local dev — see web/src/lib/
        // session.ts and infra/test/car-maintenance-stack.test.ts, which
        // asserts this environment has no such key.
      },
    });
    table.grantReadWriteData(appFn);
    attachmentsBucket.grantReadWrite(appFn);
    attachmentsBucket.grantDelete(appFn);
    appFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "cognito-idp:AdminCreateUser",
          "cognito-idp:AdminDeleteUser",
          "cognito-idp:AdminAddUserToGroup",
          "cognito-idp:AdminListGroupsForUser",
          "cognito-idp:ListUsers",
          "cognito-idp:InitiateAuth",
          "cognito-idp:RespondToAuthChallenge",
        ],
        resources: [userPool.userPoolArn],
      })
    );

    // AWS_IAM + Origin Access Control was the first approach here, but it
    // doesn't work for this app: CloudFront's OAC signs POST/PUT bodies to a
    // Lambda Function URL only if the *viewer* already computed and sent a
    // SHA256 payload hash, which a normal browser fetch() never does — every
    // POST/PATCH/DELETE (i.e. every mutation in this app) came back
    // "signature does not match." OAC-signed Lambda Function URLs are only
    // practical for GET-only origins. NONE auth means the app's own Cognito
    // session check (middleware + getCurrentUser() in every route handler)
    // is what actually gates access — the same trust boundary as any normal
    // website; nothing behind it is reachable without a valid session.
    const appFnUrl = appFn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      invokeMode: lambda.InvokeMode.RESPONSE_STREAM,
    });

    // -------------------------------------------------------------------
    // CloudFront — fronts the Function URL for the custom domain/cert.
    // -------------------------------------------------------------------
    const certificate = acm.Certificate.fromCertificateArn(this, "Certificate", certificateArn);

    const distribution = new cloudfront.Distribution(this, "Distribution", {
      domainNames: [domainName],
      certificate,
      defaultBehavior: {
        origin: new origins.FunctionUrlOrigin(appFnUrl),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      },
      additionalBehaviors: {
        "/_next/static/*": {
          origin: new origins.FunctionUrlOrigin(appFnUrl),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
      },
    });

    // -------------------------------------------------------------------
    // DNS — cars.pauldev.io -> CloudFront
    // -------------------------------------------------------------------
    const zone = route53.HostedZone.fromHostedZoneAttributes(this, "Zone", {
      hostedZoneId,
      zoneName: hostedZoneName,
    });
    new route53.ARecord(this, "AliasRecord", {
      zone,
      recordName: domainName,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
    });
    new route53.AaaaRecord(this, "AliasRecordV6", {
      zone,
      recordName: domainName,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
    });

    // -------------------------------------------------------------------
    // GitHub Actions OIDC deploy role — scoped to the CDK bootstrap roles
    // (not AdministratorAccess) and to this one repo. The OIDC provider
    // itself already exists in this account (created by another stack), so
    // it's imported here rather than created — a second provider for the
    // same URL is rejected by IAM.
    // -------------------------------------------------------------------
    const githubProvider = iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
      this,
      "GitHubOidcProvider",
      `arn:aws:iam::${this.account}:oidc-provider/token.actions.githubusercontent.com`
    );

    // GitHub embeds immutable owner/repo IDs in the sub claim (e.g.
    // "repo:owner@123/repo@456:ref:...") rather than the plain
    // "repo:owner/repo:*" form, so match both to be safe.
    const [githubOwner, githubRepoName] = githubRepo.split("/");
    const deployRole = new iam.Role(this, "GitHubDeployRole", {
      roleName: "car-maintenance-log-github-deploy",
      assumedBy: new iam.WebIdentityPrincipal(githubProvider.openIdConnectProviderArn, {
        StringEquals: {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
        },
        StringLike: {
          "token.actions.githubusercontent.com:sub": [
            `repo:${githubRepo}:*`,
            `repo:${githubOwner}@*/${githubRepoName}@*:*`,
          ],
        },
      }),
      maxSessionDuration: Duration.hours(1),
    });
    // CDK bootstrap creates deploy/file-publishing/image-publishing/lookup
    // roles in this account; assuming those (rather than granting broad
    // service permissions directly) is the standard least-privilege
    // pattern for CDK-via-GitHub-Actions, and also covers pushing the
    // Docker image to the bootstrap ECR repo during `cdk deploy`.
    deployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["sts:AssumeRole"],
        resources: [`arn:aws:iam::${this.account}:role/cdk-hnb659fds-*`],
      })
    );
    // Needed for `cdk deploy` to read bootstrap stack/version info directly.
    deployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["cloudformation:DescribeStacks"],
        resources: [`arn:aws:cloudformation:${this.region}:${this.account}:stack/CDKToolkit/*`],
      })
    );
    deployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["cloudfront:CreateInvalidation"],
        resources: [
          `arn:aws:cloudfront::${this.account}:distribution/${distribution.distributionId}`,
        ],
      })
    );

    // -------------------------------------------------------------------
    // Outputs
    // -------------------------------------------------------------------
    new CfnOutput(this, "SiteUrl", { value: `https://${domainName}` });
    new CfnOutput(this, "UserPoolId", { value: userPool.userPoolId });
    new CfnOutput(this, "UserPoolClientId", { value: userPoolClient.userPoolClientId });
    new CfnOutput(this, "TableName", { value: table.tableName });
    new CfnOutput(this, "AttachmentsBucketName", { value: attachmentsBucket.bucketName });
    new CfnOutput(this, "DistributionId", { value: distribution.distributionId });
    new CfnOutput(this, "FunctionUrl", { value: appFnUrl.url });
    new CfnOutput(this, "GitHubDeployRoleArn", { value: deployRole.roleArn });
  }
}
