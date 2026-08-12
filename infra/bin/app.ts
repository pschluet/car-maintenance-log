#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { CarMaintenanceStack } from "../lib/car-maintenance-stack";

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT ?? "435432815368";
// SES (pauldev.io) and the *.pauldev.io ACM cert both already live in
// us-east-1; deploying there keeps everything in one region and lets
// CloudFront reference the cert without a cross-region lookup.
const region = "us-east-1";

const githubRepo = app.node.tryGetContext("githubRepo") ?? "pschluet/car-maintenance-log";
// Confirm this is the address you want before the first deploy — it's the
// only account that exists until it invites the rest from /admin.
const adminEmail = app.node.tryGetContext("adminEmail") ?? "paul@paulschlueter.com";

// Tags are applied inside CarMaintenanceStack itself (not here), so every
// resource is tagged regardless of how the stack gets instantiated.
new CarMaintenanceStack(app, "CarMaintenanceStack", {
  env: { account, region },
  githubRepo,
  adminEmail,
  domainName: "cars.pauldev.io",
  hostedZoneId: "Z0005541NUHRO213TE6L",
  hostedZoneName: "pauldev.io",
  certificateArn:
    "arn:aws:acm:us-east-1:435432815368:certificate/e2fec70c-b80c-4143-b853-105c118d4749",
});
