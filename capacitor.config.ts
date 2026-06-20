import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.cunicars.tracker",
  appName: "CUNICARS",
  webDir: "dist",
  server: {
    androidScheme: "https",
    // En Android la app corre desde https://localhost, así que el tráfico a
    // Traccar es cross-origin: el servidor Traccar debe permitir el origin
    // (traccar.xml -> <entry key='web.origin'>*</entry>) o usar un proxy propio.
    cleartext: true, // permite http:// si tu Traccar no tiene TLS
  },
};

export default config;
