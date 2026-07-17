import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    port: 5175,
    proxy: { "/api": { target: "http://localhost:8002", changeOrigin: true } },
  },
});
