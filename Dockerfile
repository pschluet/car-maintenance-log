# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# deps — install once, shared by both the "build" (prod) and "dev" targets.
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY web/package.json web/package.json
COPY infra/package.json infra/package.json
RUN npm ci

# ---------------------------------------------------------------------------
# build — compiles the Next.js standalone server.
# ---------------------------------------------------------------------------
FROM deps AS build
COPY web ./web
RUN npm run build -w web

# ---------------------------------------------------------------------------
# dev — used by docker-compose. Source is bind-mounted over this at
# container start, so this stage only needs to have installed once.
# ---------------------------------------------------------------------------
FROM deps AS dev
WORKDIR /app/web
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ---------------------------------------------------------------------------
# runtime — deployed to Lambda behind the Lambda Web Adapter. This is a
# plain Node base image, not one of AWS's Lambda-runtime base images: the
# adapter fully replaces the Lambda Runtime Interface Client, so the
# container just needs to run a normal HTTP server (`node server.js`)
# listening on AWS_LWA_PORT — the exact same command that works outside
# Lambda, which is the whole point of using LWA for local-dev parity.
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS runtime
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1 /lambda-adapter /opt/extensions/lambda-adapter

# next.config.ts points outputFileTracingRoot at the repo root (npm hoists
# shared deps like "next" itself there, not into web/node_modules), so the
# standalone output nests as standalone/{node_modules,package.json,web/} —
# server.js ends up at web/server.js, not at the top level.
WORKDIR /app
COPY --from=build /app/web/.next/standalone ./
COPY --from=build /app/web/public ./web/public
COPY --from=build /app/web/.next/static ./web/.next/static

WORKDIR /app/web

ENV NODE_ENV=production
ENV PORT=3000
ENV AWS_LWA_PORT=3000
ENV AWS_LWA_INVOKE_MODE=response_stream
ENV AWS_LWA_READINESS_CHECK_PATH=/api/health

EXPOSE 3000
CMD ["node", "server.js"]
