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
npm run build
npx cap sync android
npx cap open android   # abre Android Studio para compilar/correr el APK
```

> **CORS en Android:** la app corre desde `https://localhost`, así que el
> tráfico a Traccar es cross-origin. En el servidor, en `conf/traccar.xml`
> agregá:
> ```xml
> <entry key='web.origin'>*</entry>
> ```
> o poné Traccar detrás de un proxy con los headers CORS correctos.

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
