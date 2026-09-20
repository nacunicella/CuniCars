import { Capacitor } from "@capacitor/core";

// true adentro del APK (Android), false en la web y en la PWA.
//
// En nativo la app corre desde https://localhost y el tráfico a Traccar sale
// por CapacitorHttp (nativo, sin CORS). Lo que NO funciona ahí es el WebSocket
// /api/socket: la cookie de sesión es SameSite=Lax y no viaja en un handshake
// cross-site, así que el estado vivo se refresca por REST.
export const isNative = Capacitor.isNativePlatform();
