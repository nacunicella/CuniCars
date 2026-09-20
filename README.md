# CUNICARS — Sistema de rastreo (Traccar)

Front en React + Vite + TypeScript. Mapa con Leaflet/OpenStreetMap. Datos en
vivo desde un servidor **Traccar** (REST + WebSocket). App Android empaquetada
con Capacitor (mismo código).

## Requisitos

- Node 20+ (probado en 24)
- Un servidor Traccar accesible (propio o `https://demo.traccar.org`)
- Para Android: Android Studio (aporta su propio JDK; el wrapper está clavado
  en Gradle 9.5.0 porque ese JDK es 25 y AGP 8.13 no corre con Gradle 9.6+)

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
cd android && ./gradlew assembleRelease  # APK en app/build/outputs/apk/release/
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

> **Publicá siempre el APK de release, no el de debug.** El de debug sale con
> `android:debuggable="true"`: con el teléfono en la mano y ADB se pueden leer
> los datos de la app, incluido el token de sesión guardado en el WebView.
>
> Sin `android/keystore.properties` el release se firma con la clave de debug,
> que alcanza para instalarlo a mano. Para una clave propia, generala con
> `keytool -genkeypair -v -keystore cunicars.jks -keyalg RSA -keysize 2048 -validity 10000 -alias cunicars`
> y creá `android/keystore.properties` (ignorado por git) con `storeFile`,
> `storePassword`, `keyAlias` y `keyPassword`. Guardá esa clave: sin ella no se
> puede actualizar una instalación existente.

Para publicar el APK desde la web (botón "Descargar APK" en Ajustes), copiá el
archivo generado a `public/cunicars.apk` y deployá. La versión sale de
`package.json`: se toca ahí y la usan la UI y el `versionName` del APK.

## Estructura

```
src/
  api/
    client.ts          # axios, sesión, token y URL del WebSocket
    traccar.ts         # login, devices, positions, reportes, geocode, share
    useLiveSocket.ts   # estado vivo: WebSocket en web, polling REST en el APK
  lib/
    vehicles.ts        # Device + Position -> modelo de vista (y los 3 estados)
    format.ts          # unidades, fechas y tiempos relativos
    address.ts         # direcciones a pedido, con cache
    platform.ts        # isNative
    safeArea.ts        # alto real de las barras del sistema (Android)
    pwa.ts, diag.ts
  views/               # MapTab, ListTab, AlertsTab, RouteTab, SettingsTab,
                       # TopBar, BottomDock
  types/traccar.ts     # tipos del API
  App.tsx              # sesión, snapshot REST y orquestación de pestañas
android/               # proyecto Capacitor + InsetsPlugin (barras del sistema)
```

## Pendiente

- [ ] Notificaciones con la app cerrada (se configura en Traccar: Firebase o
      Telegram; la app sola no puede despertarse).
- [ ] Geocercas: `getGeofences()` existe en la API y no se usa en ninguna vista.
- [ ] Comandos al equipo (pedir posición, cortar corriente).
- [ ] Modo claro.
