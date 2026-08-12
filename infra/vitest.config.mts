import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // `cdk synth`/`cdk deploy` stage a full copy of the repo (the Docker
    // build context for the app Lambda image) under cdk.out/asset.*/,
    // which otherwise gets picked up by vitest's default recursive glob
    // and re-runs every test file — including web's, which fail here
    // since this project has no jsdom/path-alias setup for them.
    exclude: ["**/node_modules/**", "**/dist/**", "**/cdk.out/**"],
  },
});
