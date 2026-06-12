import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  base: "/Material_Helper_Byungil/",
  root: projectRoot,
  plugins: [react()],
  build: {
    outDir: "dist"
  }
});
