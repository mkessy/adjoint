import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.test.ts"],
    exclude: ["node_modules/**", "dist/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/**",
        "test/**",
        "dist/**",
        "**/*.d.ts",
        "**/*.config.*"
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    // Property-based testing configuration
    pool: "threads",
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads: 4
      }
    },
    // Fail fast on first error for mathematical correctness
    bail: 1,
    // Verbose output for debugging mathematical properties
    reporter: ["verbose", "json"],
    outputFile: {
      json: "./test-results.json"
    }
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname
    }
  }
})
