import react from "@vitejs/plugin-react"
import { resolve } from "path"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@adjoint/web": resolve(__dirname, "../domain/build/esm"),
      // Redirect platform-specific imports to browser-compatible versions
      "@effect/platform-node-shared": "@effect/platform-browser",
      "@effect/platform-bun": "@effect/platform-browser"
    }
  },
  build: {
    rollupOptions: {
      external: [
        "bun:sqlite",
        "@effect/sql-sqlite-bun"
      ]
    }
  },
  optimizeDeps: {
    exclude: [
      "@effect/platform-node-shared"
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
