import { registerPlugin } from "@capacitor/core";
import { isNative } from "./platform";

// Android 15 obliga a dibujar de borde a borde: el WebView queda debajo de la
// barra de estado y de la de navegación. Esas alturas no llegan por CSS —
// env(safe-area-inset-*) da cero en Android—, así que las pide el plugin nativo
// Insets y las publicamos en --sat/--sab, que es lo que usan TopBar y BottomDock.
interface InsetsPlugin {
  get(): Promise<{ top: number; bottom: number }>;
}

const Insets = registerPlugin<InsetsPlugin>("Insets");

// Último recurso si el plugin no está (por ejemplo, un APK viejo): alcanza para
// despegar el dock de una barra de gestos, no de una de tres botones.
const MINIMO_PX = 24;

export async function applySafeAreaInsets(): Promise<void> {
  if (!isNative) return; // en la web las safe areas reales las da el navegador

  const root = document.documentElement.style;
  try {
    const { top, bottom } = await Insets.get();
    if (top > 0) root.setProperty("--sat", `${top}px`);
    if (bottom > 0) root.setProperty("--sab", `${bottom}px`);
    if (top > 0 || bottom > 0) return;
  } catch {
    /* sin plugin nativo: seguimos con el mínimo */
  }
  root.setProperty("--sat", `${MINIMO_PX}px`);
  root.setProperty("--sab", `${MINIMO_PX}px`);
}
