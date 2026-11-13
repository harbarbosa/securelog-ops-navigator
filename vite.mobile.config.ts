import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(root, "src") } },
  base: "./",
  build: {
    outDir: "capacitor-web",
    emptyOutDir: true,
    cssMinify: false,
    rollupOptions: { input: { index: path.resolve(root, "mobile-index.html") } },
  },
});
