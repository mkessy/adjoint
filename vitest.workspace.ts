import * as path from "node:path"
import { defineWorkspace, type UserWorkspaceConfig } from "vitest/config"

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const project = (
  config: UserWorkspaceConfig["test"] & { name: `${string}|${string}` },
  root = config.root ?? path.join(__dirname, `packages/${config.name.split("|").at(0)}`)
) => ({
  extends: "vitest.shared.ts",
  test: { root, ...config }
})

export default defineWorkspace([
  // Add specialized configuration for some packages.
  // project({ name: "my-package|browser", environment: "happy-dom" }),
  // Add the default configuration for all packages.
  "packages/*"
], {
  resolve: {
    alias: {
      "@adjoint/domain": path.resolve(__dirname, "./packages/domain/src"),
      "@adjoint/nlp-wink": path.resolve(__dirname, "./packages/nlp-wink/src")
    }
  }
})
