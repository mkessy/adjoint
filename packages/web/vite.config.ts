import react from "@vitejs/plugin-react"
import { resolve } from "path"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@adjoint/domain": resolve(__dirname, "../domain/build/esm"),
      "@adjoint/nlp-wink": resolve(__dirname, "../nlp-wink/build/esm"),
      // Redirect platform-specific imports to browser-compatible versions
      "@effect/platform-node-shared": "@effect/platform-browser",
      "@effect/platform-bun": "@effect/platform-browser",
      "@effect/platform-node": "@effect/platform-browser"
    }
  },
  build: {
    rollupOptions: {
      external: [
        // Exclude Node.js-specific SQL packages
        "bun:sqlite",
        "@effect/sql-sqlite-bun",
        "@effect/sql-sqlite-node",
        "@effect/sql-pg",
        "@effect/sql-mysql2"
      ]
    },
    target: "esnext",
    minify: "esbuild"
  },
  optimizeDeps: {
    exclude: [
      "@effect/platform-node-shared",
      "@effect/platform-node"
    ],
    include: [
      "effect",
      "@effect/platform",
      "@effect/platform-browser",
      "@effect/sql",
      "@effect/sql-sqlite-wasm",
      "@effect-rx/rx",
      "@effect-rx/rx-react",
      "react",
      "react-dom"
    ]
  },
  server: {
    port: 3001,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "")
      }
    }
  }
})