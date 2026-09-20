import { useEffect, useState } from "react";
import { getAddress } from "../api/traccar";

// Las direcciones se piden de a una (ver getAddress) y no cambian, así que las
// cacheamos por coordenada redondeada: mover el mapa o reabrir la ficha del
// mismo vehículo no vuelve a pegarle al geocoder.
const cache = new Map<string, string>();

const clave = (lat: number, lng: number) => `${lat.toFixed(5)},${lng.toFixed(5)}`;

// Devuelve la dirección del punto, o "" mientras no se sepa. Nunca tira: si el
// geocoder falla, la ficha se queda con las coordenadas.
export function useAddress(lat: number | null, lng: number | null): string {
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (lat === null || lng === null) {
      setAddress("");
      return;
    }
    const k = clave(lat, lng);
    const yaEsta = cache.get(k);
    if (yaEsta !== undefined) {
      setAddress(yaEsta);
      return;
    }

    let vigente = true;
    setAddress("");
    getAddress(lat, lng)
      .then((dir) => {
        cache.set(k, dir);
        if (vigente) setAddress(dir);
      })
      .catch(() => {
        // No se cachea el error: si el geocoder falló una vez, el vehículo
        // estacionado en el mismo punto se quedaría sin dirección para siempre.
      });

    return () => {
      vigente = false;
    };
  }, [lat, lng]);

  return address;
}
