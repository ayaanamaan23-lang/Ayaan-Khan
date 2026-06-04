import { useState, useEffect } from "react";

export interface GeoPosition {
  lat: number;
  lng: number;
}

const NYC_DEFAULT: GeoPosition = { lat: 40.7128, lng: -74.006 };

export function useGeolocation() {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      setLoading(false);
      return;
    }

    // Get initial fix quickly
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoading(false);
      },
      () => {
        // Fall back to NYC silently
        setPosition(NYC_DEFAULT);
        setLoading(false);
      },
      { timeout: 8000, maximumAge: 60000 }
    );

    // Keep watching as user moves
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition((prev) => {
          if (!prev) return next;
          // Only update if difference is more than 0.0001 degrees (~11 meters)
          if (Math.abs(prev.lat - next.lat) < 0.0001 && Math.abs(prev.lng - next.lng) < 0.0001) {
            return prev; // keeps exact same object reference, preventing state update
          }
          return next;
        });
      },
      () => {},
      { enableHighAccuracy: false, maximumAge: 30000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return { position: position ?? NYC_DEFAULT, loading, error };
}
