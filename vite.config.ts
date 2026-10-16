import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Tauri needs a fixed port and ignores the dev server's own HMR overlay host checks.
export default defineConfig({
  // The Tauri app loads from its own root; the GitHub Pages deploy is served
  // from a /<repo>/ subpath, so its CI build step sets GH_PAGES_BASE.
  base: process.env.GH_PAGES_BASE || "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
});
