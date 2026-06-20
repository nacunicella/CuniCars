// Rasteriza los SVG de icono a los PNG que necesitan PWA, favicon y @capacitor/assets.
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { mkdirSync } from "node:fs";

const A = "assets";
const P = "public";
mkdirSync(P, { recursive: true });

const src = readFileSync(`${A}/icon-source.svg`); // full-bleed (auto + fondo)
const rounded = readFileSync(`${P}/icon.svg`); // redondeado (favicon/PWA)
const bg = readFileSync(`${A}/icon-background.svg`);
const fg = readFileSync(`${A}/icon-foreground.svg`);

async function png(svg, size, out) {
  await sharp(svg, { density: 384 }).resize(size, size).png().toFile(out);
  console.log("✓", out);
}

await Promise.all([
  // Fuentes para @capacitor/assets (Android)
  png(src, 1024, `${A}/icon-only.png`),
  png(bg, 1024, `${A}/icon-background.png`),
  png(fg, 1024, `${A}/icon-foreground.png`),
  // PWA / web
  png(rounded, 192, `${P}/pwa-192.png`),
  png(rounded, 512, `${P}/pwa-512.png`),
  png(src, 512, `${P}/pwa-maskable-512.png`),
  png(src, 180, `${P}/apple-touch-icon.png`),
  png(rounded, 32, `${P}/favicon-32.png`),
]);
console.log("listo");
