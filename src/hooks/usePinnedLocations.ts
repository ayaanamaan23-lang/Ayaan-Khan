import { useState, useCallback } from "react";

export interface PinnedLocation {
  id: string;
  label: string;
  lat: number;
  lng: number;
  emoji: string;
}

const STORAGE_KEY = "lp_pins";

function load(): PinnedLocation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PinnedLocation[]) : [];
  } catch {
    return [];
  }
}

function save(pins: PinnedLocation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
}

export function usePinnedLocations() {
  const [pins, setPins] = useState<PinnedLocation[]>(load);

  const addPin = useCallback((label: string, lat: number, lng: number, emoji = "📍") => {
    const id = `pin_${Date.now()}`;
    const newPin: PinnedLocation = { id, label, lat, lng, emoji };
    setPins((prev) => {
      const next = [...prev, newPin];
      save(next);
      return next;
    });
    return newPin;
  }, []);

  const removePin = useCallback((id: string) => {
    setPins((prev) => {
      const next = prev.filter((p) => p.id !== id);
      save(next);
      return next;
    });
  }, []);

  const updatePin = useCallback((id: string, label: string) => {
    setPins((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, label } : p));
      save(next);
      return next;
    });
  }, []);

  return { pins, addPin, removePin, updatePin };
}
