import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.cunicars.tracker",
  appName: "CUNICARS",
  webDir: "dist",
  server: {
    androidScheme: "https",
    // En Android la app corre desde https://localhost. Con CapacitorHttp
    // activado (abajo) los pedidos a Traccar los hace el runtime NATIVO, no el
    // WebView: no pasan por CORS, así que no hace falta abrir web.origin en el
    // servidor ni montar un proxy.
    cleartext: true, // permite apuntar a un Traccar sin TLS (ej. la IP de la LAN)
  },
  plugins: {
    // Redirige fetch() y XMLHttpRequest al HTTP nativo de Android. La cookie de
    // sesión (JSESSIONID) queda en el cookie jar nativo y viaja en cada pedido.
    CapacitorHttp: { enabled: true },
  },
};

export default config;
