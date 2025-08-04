import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import { resolve } from "path"

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
      "@adjoint/domain": resolve(__dirname, "../domain/src"),
      "@adjoint/nlp-wink": resolve(__dirname, "../nlp-wink/src")
    }
  }
})