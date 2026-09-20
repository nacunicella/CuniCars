# CUNICARS — Sistema de rastreo (Traccar)

Front en React + Vite + TypeScript. Mapa con Leaflet/OpenStreetMap. Datos en
vivo desde un servidor **Traccar** (REST + WebSocket). App Android empaquetada
con Capacitor (mismo código).

## Requisitos

- Node 20+ (probado en 24)
- Un servidor Traccar accesible (propio o `https://demo.traccar.org`)
- Para Android: Android Studio + JDK 17

## Configuración

Copiá `.env.example` a `.env` y apuntá a tu Traccar:

```
VITE_TRACCAR_URL=http://tu-servidor:8082
```

## Desarrollo (web)

```bash
npm install
npm run dev
```

En dev, Vite proxyea `/api` y `/api/socket` hacia `VITE_TRACCAR_URL` (resuelve
CORS automáticamente). Entrá con tu email/contraseña de Traccar.

## Build web

```bash
npm run build      # genera dist/
npm run preview    # sirve el build
```

## Android (Capacitor)

```bash
npm run android:sync                     # build web + copia a android/
cd android && ./gradlew assembleDebug    # APK en app/build/outputs/apk/debug/
```

O `npx cap open android` para compilar desde Android Studio.

> **Sin CORS:** la app corre desde `https://localhost`, pero con
> `CapacitorHttp` activado (ver `capacitor.config.ts`) los pedidos los hace el
> runtime nativo de Android, no el WebView: no pasan por CORS y **no hay que
> tocar `web.origin` en el servidor**.
>
> **Sin WebSocket:** la cookie de sesión de Traccar es `SameSite=Lax` y no
> viaja en el handshake cross-site del WebSocket. Adentro del APK el estado
> vivo se refresca por REST cada 15 s (ver `api/useLiveSocket.ts`).

Para publicar el APK desde la web (botón "Descargar APK" en Ajustes), copiá el
archivo generado a `public/cunicars.apk` y deployá.

## Estructura

```
src/
  api/
    client.ts          # axios + URL del WebSocket (proxy dev / directo prod)
    traccar.ts         # login, devices, positions, route, events
    useLiveSocket.ts   # hook del WebSocket /api/socket (live)
  components/
    Login.tsx          # form de sesión
    Sidebar.tsx        # lista de vehículos
    MapView.tsx        # mapa Leaflet + markers en vivo
  types/traccar.ts     # tipos del API
  App.tsx              # orquesta auth + layout
```

## Pendiente

- [ ] Importar el diseño `CUNICARS.dc.html` desde claude.ai/design y aplicarlo
      a la UI (requiere `/login` con scope de diseño en la sesión de Claude).
- [ ] Historial de recorrido (ya hay `getRoute` en la API).
- [ ] Geocercas y eventos/alarmas.
