import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.VITE_TRACCAR_URL || "http://localhost:8082";

  return {
    plugins: [react()],
    server: {
      // Proxy en dev: el front llama a "/api/..." y Vite lo reenvía a Traccar.
      // Evita CORS y reescribe la cookie de sesión al host local.
      proxy: {
        "/api": {
          target,
          changeOrigin: true,
          ws: true, // habilita el WebSocket /api/socket
          secure: false,
        },
      },
    },
  };
});
