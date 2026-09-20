import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "./index.css";
import App from "./App.tsx";
import { registerSW } from "./lib/pwa";
import { applySafeAreaInsets } from "./lib/safeArea";

registerSW();
void applySafeAreaInsets();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
