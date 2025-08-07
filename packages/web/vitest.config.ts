import react from "@vitejs/plugin-react"
import { resolve } from "path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    coverage: {
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/**",
        "test/**",
        "*.config.*",
        "**/*.d.ts",
        "build/**"
      ]
    }
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@adjoint/domain": resolve(__dirname, "../domain/src")
    }
  }
})
