# Car Maintenance Log

A mobile-first app for tracking maintenance on the family cars, at **cars.pauldev.io**. Everyone
signs in with a passwordless 6-digit email code via Cognito. Every signed-in user shares one
garage — cars, maintenance history, and the mechanic directory are common to the household, not
siloed per person. An admin page lets admins invite (or remove) other users.

## Architecture

- **App:** Next.js (App Router) + TypeScript, one server for both the UI and the API
  (`/api/*` route handlers). Deployed as a container behind the [Lambda Web
  Adapter](https://github.com/awslabs/aws-lambda-web-adapter) — the exact same image runs
  locally via `docker compose` and in Lambda, so "does it work" is answered the same way in both
  places.
- **Auth:** Cognito User Pool, custom `CUSTOM_AUTH` Lambda triggers
  (`infra/lambda/cognito/*.ts`) implement a 6-digit email one-time code (Cognito's built-in
  email-OTP factor doesn't support a fixed code length). Sessions are httpOnly cookies set by
  Next.js route handlers — the browser never holds a raw Cognito token. An `Admins` Cognito
  group gates `/admin`.
- **API:** Next.js Route Handlers, guarded by `web/src/middleware.ts` (session + admin-group
  checks) with a second, defense-in-depth check inside each handler via `getCurrentUser()`.
- **Storage:** one DynamoDB table (`CarMaintenanceLog`, on-demand billing) + one GSI for
  garage-wide list views (all cars, all mechanics). See the key-shape table in
  `web/src/lib/db.ts`. Car photos, insurance/registration scans, and maintenance-entry
  attachments go to one S3 bucket, uploaded/downloaded via presigned URLs (Lambda's 6 MB request
  cap makes proxying phone photos through the server a non-starter).
- **Retention:** the table and the attachments bucket are `RemovalPolicy.RETAIN` — nothing here
  has a natural expiration, and nobody wants a `cdk destroy` to quietly delete years of
  maintenance history.
- **Infrastructure:** AWS CDK (`infra/`). Every resource is tagged `REPO` and `SITE` (see
  `infra/bin/app.ts`).

Cost at this scale is a few dollars a month at most: on-demand DynamoDB, Lambda within the free
tier for a two-person household, S3 storage, Cognito Lite (free), SES ($0.10/1,000 emails).

## Repo layout

```
web/      Next.js app (UI + API)
infra/    AWS CDK app
scripts/  seed-local.ts — sets up the docker-compose local stack
Dockerfile, docker-compose.yml
```

## Local development

Everything runs locally with no AWS account needed — `docker compose` starts the app alongside
DynamoDB Local and MinIO (an S3-compatible store), and a `LOCAL_AUTH` flag makes every request
act as a seeded local admin instead of going through Cognito. That flag is **never** set in the
deployed Lambda's environment (see `infra/lib/car-maintenance-stack.ts` and the CDK assertion
test that checks for its absence) — it only exists in `docker-compose.yml`.

```sh
npm install
docker compose up --build
npm run seed:local   # in a second terminal, once — creates the table, bucket, and a sample car
```

Then open <http://localhost:3000>. Source under `web/` is bind-mounted into the container, so
edits hot-reload.

To run the Next.js dev server directly on the host instead (still needs `docker compose up
dynamodb minio` for the data layer):

```sh
npm run dev
```

## Tests, lint, and formatting

```sh
npm test                          # web + infra unit tests (Vitest)
npm run typecheck --workspaces    # tsc --noEmit in both workspaces
npm run lint                      # Biome lint
npm run format:write              # Biome format, in place
```

`infra`'s CDK-assertion test stubs out the app Lambda's Docker image (a fake `ecr.Repository`
reference) so `npm test` never has to run a real `docker build` — only an actual deploy does
that.

## One-time AWS setup

These happen once, outside normal `git push` deploys.

### 1. Bootstrap CDK in us-east-1

The app deploys entirely to **us-east-1** (where the `pauldev.io` SES identity and the
`*.pauldev.io` ACM certificate already live):

```sh
npx --prefix infra cdk bootstrap aws://<account-id>/us-east-1
```

### 2. Confirm SES is ready

```sh
aws sesv2 get-email-identity --email-identity pauldev.io --region us-east-1
```

Confirm `DkimAttributes.Status` is `SUCCESS` and that
`aws sesv2 get-account --region us-east-1 --query ProductionAccessEnabled` returns `true` — in
sandbox mode, sign-in codes only reach pre-verified addresses.

### 3. Check the CDK context defaults

`infra/bin/app.ts` defaults `githubRepo` to `pschluet/car-maintenance-log` and `adminEmail` to
`paul@paulschlueter.com` — the GitHub OIDC deploy role is scoped to the former, and the latter
becomes the first `Admins`-group user (created by a CDK custom resource on first deploy, so
there's a way in before anyone can use the in-app admin page). Override either at deploy time if
needed:

```sh
npx --prefix infra cdk deploy -c githubRepo=your-org/your-repo -c adminEmail=you@example.com
```

Changing `adminEmail` **after** the first deploy does not move admin access — it just leaves the
original address as the sole admin until someone adds the new one from `/admin`.

### 4. First deploy — run locally, once

The GitHub Actions deploy workflow assumes an IAM role that this same stack creates, so the very
first deploy has to happen from a machine with AWS credentials and Docker running, not CI:

```sh
npm install
npm run deploy -w infra
```

This builds the app's Docker image, publishes it, and stands up every resource — Cognito, the
table, the bucket, the Lambda + Function URL, CloudFront, DNS, and the GitHub deploy role. After
this, every push to `main` deploys automatically via `.github/workflows/deploy.yml`.

### 5. Sign in

Visit `https://cars.pauldev.io` and sign in as the `adminEmail` address from step 3 — you'll get
a 6-digit code by email. From `/admin`, invite the rest of the household.

## Notes on the auth flow

Cognito's `CUSTOM_AUTH` flow is implemented by three small Lambdas
(`infra/lambda/cognito/{define,create,verify}-auth.ts`):

- **define-auth** decides, after each round, whether to issue tokens, offer a retry, or lock the
  session out after 3 wrong attempts.
- **create-auth** generates a 6-digit code (`crypto.randomInt`) and emails it via SES on the
  first round; on a retry it reuses the same code (via `challengeMetadata`) instead of sending a
  second email.
- **verify-auth** compares the submitted code with `crypto.timingSafeEqual`.

`web/src/middleware.ts` verifies the session cookie at the edge (via `aws-jwt-verify`, which has
no Node-only dependencies) and redirects page loads through `/api/auth/refresh` when the ID
token has expired but the refresh token hasn't — that route runs in the Node runtime, since
refreshing requires the Cognito SDK. API calls get a `401` instead of a redirect; the client-side
`apiFetch` helper (`web/src/lib/apiClient.ts`) retries once after a silent refresh.
