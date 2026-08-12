import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required so the Docker "runtime" stage can copy a self-contained
  // server (.next/standalone) into the Lambda Web Adapter image without
  // shipping the full node_modules tree.
  output: "standalone",
  // Must be the actual npm workspaces root (one level up), not this
  // directory: npm hoists shared deps like "next" itself to the repo
  // root's node_modules, and Next's file tracer can only copy what it can
  // see from outputFileTracingRoot down. Pointing this at web/ instead
  // left the traced node_modules empty ("Cannot find module 'next'" at
  // runtime) because nothing under web/ needed tracing — everything
  // lived one level above it. The tradeoff: standalone output nests at
  // .next/standalone/web/server.js instead of .next/standalone/server.js,
  // which the Dockerfile's COPY/CMD paths account for.
  outputFileTracingRoot: path.join(__dirname, ".."),
};

export default nextConfig;
