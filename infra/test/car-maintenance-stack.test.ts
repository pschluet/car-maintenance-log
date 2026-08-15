import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { describe, expect, it } from "vitest";
import { CarMaintenanceStack } from "../lib/car-maintenance-stack";

// A stand-in DockerImageCode so `cdk synth` in these tests never shells out
// to `docker build` for the real Next.js app image — see the
// `appImageCode` override on CarMaintenanceStackProps.
function fakeAppImageCode(scope: cdk.Stack): lambda.DockerImageCode {
  const repo = ecr.Repository.fromRepositoryAttributes(scope, "FakeAppRepo", {
    repositoryArn: "arn:aws:ecr:us-east-1:435432815368:repository/fake-app-repo",
    repositoryName: "fake-app-repo",
  });
  return lambda.DockerImageCode.fromEcr(repo, { tagOrDigest: "latest" });
}

// appImageCode needs a construct scope, which doesn't exist until a stack
// does — so build a small throwaway stack purely to hang the fake ECR
// reference off of, then construct the real stack under test.
function synthWithFakeImage() {
  const app = new cdk.App();
  const scope = new cdk.Stack(app, "ScopeHolder");
  const appImageCode = fakeAppImageCode(scope);

  const realApp = new cdk.App();
  const stack = new CarMaintenanceStack(realApp, "TestStack", {
    env: { account: "435432815368", region: "us-east-1" },
    githubRepo: "pschluet/car-maintenance-log",
    adminEmail: "paul@paulschlueter.com",
    domainName: "cars.pauldev.io",
    hostedZoneId: "Z0005541NUHRO213TE6L",
    hostedZoneName: "pauldev.io",
    certificateArn:
      "arn:aws:acm:us-east-1:435432815368:certificate/e2fec70c-b80c-4143-b853-105c118d4749",
    appImageCode,
  });
  return Template.fromStack(stack);
}

describe("CarMaintenanceStack", () => {
  const template = synthWithFakeImage();

  it("tags every resource with REPO and SITE", () => {
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      Tags: Match.arrayWith([
        { Key: "REPO", Value: "https://github.com/pschluet/car-maintenance-log" },
        { Key: "SITE", Value: "cars.pauldev.io" },
      ]),
    });
    template.hasResourceProperties("AWS::S3::Bucket", {
      Tags: Match.arrayWith([
        { Key: "REPO", Value: "https://github.com/pschluet/car-maintenance-log" },
        { Key: "SITE", Value: "cars.pauldev.io" },
      ]),
    });
  });

  it("retains the table and the attachments bucket on stack deletion", () => {
    template.hasResource("AWS::DynamoDB::Table", { DeletionPolicy: "Retain" });
    template.resourceCountIs("AWS::S3::Bucket", 1);
    template.hasResource("AWS::S3::Bucket", { DeletionPolicy: "Retain" });
  });

  it("blocks all public access on the attachments bucket", () => {
    template.hasResourceProperties("AWS::S3::Bucket", {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  it("uses response streaming on the app Lambda's function URL", () => {
    // AuthType is intentionally NONE, not AWS_IAM — see the comment above
    // the addFunctionUrl() call in the stack for why OAC doesn't work here
    // (it can't sign POST/PUT bodies from a plain browser fetch()).
    template.hasResourceProperties("AWS::Lambda::Url", {
      AuthType: "NONE",
      InvokeMode: "RESPONSE_STREAM",
    });
  });

  it("imports the GitHub OIDC provider instead of creating a new one", () => {
    template.resourceCountIs("AWS::IAM::OIDCProvider", 0);
    template.hasResourceProperties("AWS::IAM::Role", {
      RoleName: "car-maintenance-log-github-deploy",
    });
  });

  it("never sets LOCAL_AUTH on the deployed app Lambda", () => {
    const fns = template.findResources("AWS::Lambda::Function", {
      Properties: { PackageType: "Image" },
    });
    const appFn = Object.values(fns)[0] as {
      Properties: { Environment?: { Variables?: Record<string, unknown> } };
    };
    expect(appFn).toBeDefined();
    expect(appFn.Properties.Environment?.Variables).not.toHaveProperty("LOCAL_AUTH");
  });

  it("sets SITE_URL on the app Lambda so middleware can build absolute redirect URLs", () => {
    // Behind CloudFront + the Function URL, the app never sees its own
    // public hostname in any header — see web/src/lib/site-url.ts. Redirect
    // correctness depends on this var being present at runtime.
    const fns = template.findResources("AWS::Lambda::Function", {
      Properties: { PackageType: "Image" },
    });
    const appFn = Object.values(fns)[0] as {
      Properties: { Environment?: { Variables?: Record<string, unknown> } };
    };
    expect(appFn).toBeDefined();
    expect(appFn.Properties.Environment?.Variables).toMatchObject({
      SITE_URL: "https://cars.pauldev.io",
    });
  });

  it("scopes the CUSTOM_AUTH client to the custom flow only", () => {
    template.hasResourceProperties("AWS::Cognito::UserPoolClient", {
      ExplicitAuthFlows: Match.arrayWith(["ALLOW_CUSTOM_AUTH"]),
    });
  });
});
