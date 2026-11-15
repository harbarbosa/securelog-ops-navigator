import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(root, "src") } },
  base: "./",
  build: {
    outDir: "capacitor-web",
    emptyOutDir: true,
    rollupOptions: { input: { index: path.resolve(root, "mobile-index.html") } },
  },
});
