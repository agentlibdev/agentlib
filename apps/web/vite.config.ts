import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@core": "/packages/core/src",
      "@providers": "/packages/providers/src",
      "@storage": "/packages/storage/src", 
      "@validation": "/packages/validation/src"
    }
  },
  server: {
    port: 4173,
    host: "127.0.0.1",
    proxy: {
      "/api": "http://127.0.0.1:8787",
      "/health": "http://127.0.0.1:8787"
    }
  }
});
