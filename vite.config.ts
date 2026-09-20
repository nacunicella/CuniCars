import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// El servidor de dev no conoce la extensión .apk y la sirve sin Content-Type:
// el navegador la sniffea como ZIP y la guarda como .zip. Con el tipo correcto
// se puede bajar el APK al celular desde la LAN (npm run dev -- --host).
const apkMime: Plugin = {
  name: "apk-mime",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url?.split("?")[0].endsWith(".apk")) {
        res.setHeader("Content-Type", "application/vnd.android.package-archive");
      }
      next();
    });
  },
};

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.VITE_TRACCAR_URL || "http://localhost:8082";

  return {
    plugins: [react(), apkMime],
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
