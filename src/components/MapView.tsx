import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import type { Incident } from '@/api-client';
import { getCategoryColor } from "@/lib/categories";

interface Props {
  incidents: Incident[];
  center?: [number, number];
  onMarkerClick?: (incident: Incident) => void;
  radiusM?: number;
  onMapClick?: (lat: number, lng: number) => void;
}

const CATEGORY_EMOJI: Record<string, string> = {
  "Fire/Emergency": "🔥",
  "Traffic": "🚗",
  "Power": "⚡",
  "Water": "💧",
  "Internet": "📶",
  "ATM": "💳",
  "Other": "⚠️",
};

function makeIcon(category: string, verified: boolean) {
  const color = getCategoryColor(category);
  const emoji = CATEGORY_EMOJI[category] ?? "⚠️";
  const opacity = verified ? "1" : "0.72";
  const html = `
    <div class="lp-marker" style="position:relative;width:44px;height:52px;">
      <div class="lp-pulse" style="
        position:absolute;
        top:50%;left:50%;
        transform:translate(-50%,-65%);
        width:44px;height:44px;
        border-radius:50%;
        background:${color}22;
        border:2px solid ${color}66;
        animation:lp-ping ${verified ? "1.8s" : "2.8s"} ease-out infinite;
      "></div>
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="50" viewBox="0 0 40 50"
           style="position:absolute;top:0;left:2px;opacity:${opacity};filter:drop-shadow(0 0 6px ${color}) drop-shadow(0 0 14px ${color}88);">
        <defs>
          <radialGradient id="pg-${category.replace(/[^a-z]/gi,"")}" cx="40%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="${color}" stop-opacity="1"/>
          </radialGradient>
        </defs>
        <ellipse cx="20" cy="46" rx="7" ry="3.5" fill="rgba(0,0,0,0.45)"/>
        <path d="M20 3 C12 3 6 9 6 17 C6 28 20 46 20 46 C20 46 34 28 34 17 C34 9 28 3 20 3Z"
          fill="url(#pg-${category.replace(/[^a-z]/gi,"")})"
          stroke="${color}" stroke-width="1.5" stroke-opacity="0.8"/>
        ${!verified ? `<circle cx="20" cy="17" r="11" fill="none" stroke="rgba(251,146,60,0.6)" stroke-width="1.5" stroke-dasharray="3 2"/>` : ""}
        <circle cx="20" cy="17" r="9" fill="rgba(0,0,0,0.38)"/>
        <text x="20" y="22" text-anchor="middle" font-size="12" dominant-baseline="middle">${emoji}</text>
      </svg>
    </div>`;

  return L.divIcon({
    html,
    className: "",
    iconSize: [44, 52],
    iconAnchor: [22, 50],
    popupAnchor: [0, -52],
  });
}

export default function MapView({ incidents, center = [40.7128, -74.006], onMarkerClick, radiusM, onMapClick }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const radiusCircleRef = useRef<L.Circle | null>(null);
  const userDotRef = useRef<L.CircleMarker | null>(null);
  const heatLayerRef = useRef<L.Circle[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);

  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  // Inject keyframes + styles once
  useEffect(() => {
    if (document.getElementById("lp-keyframes")) return;
    const style = document.createElement("style");
    style.id = "lp-keyframes";
    style.textContent = `
      @keyframes lp-ping {
        0%   { transform: translate(-50%,-65%) scale(0.5); opacity: 0.9; }
        70%  { transform: translate(-50%,-65%) scale(1.4); opacity: 0; }
        100% { transform: translate(-50%,-65%) scale(1.4); opacity: 0; }
      }
      .lp-map-container .leaflet-tile-pane {
        filter: brightness(0.78) saturate(0.7) contrast(1.1) hue-rotate(190deg);
      }
      .lp-map-container::after {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          linear-gradient(rgba(0,180,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,180,255,0.03) 1px, transparent 1px);
        background-size: 40px 40px;
        z-index: 400;
      }
      .lp-map-container .leaflet-control-zoom {
        border: 1px solid rgba(0,180,255,0.25) !important;
        box-shadow: 0 0 12px rgba(0,180,255,0.15) !important;
        border-radius: 10px !important;
        overflow: hidden;
      }
      .lp-map-container .leaflet-control-zoom a {
        background: rgba(10,14,26,0.92) !important;
        color: #00b4ff !important;
        border-color: rgba(0,180,255,0.15) !important;
        font-weight: 700;
        transition: background 0.15s;
      }
      .lp-map-container .leaflet-control-zoom a:hover {
        background: rgba(0,180,255,0.18) !important;
      }
      .lp-map-container::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 2px;
        background: linear-gradient(90deg, transparent, #00b4ff, #0072ff, #00b4ff, transparent);
        z-index: 500;
        pointer-events: none;
        animation: lp-scan 3s linear infinite;
      }
      @keyframes lp-scan {
        0%   { opacity: 0.6; }
        50%  { opacity: 1; }
        100% { opacity: 0.6; }
      }
      .leaflet-popup-content-wrapper {
        background: rgba(10,14,26,0.96) !important;
        border: 1px solid rgba(0,180,255,0.2) !important;
        border-radius: 14px !important;
        box-shadow: 0 4px 24px rgba(0,0,0,0.7), 0 0 16px rgba(0,180,255,0.1) !important;
        color: white !important;
      }
      .leaflet-popup-tip { background: rgba(10,14,26,0.96) !important; }
    `;
    document.head.appendChild(style);
  }, []);

  // Init map
  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    const map = L.map(mapRef.current, {
      center,
      zoom: 15,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    map.zoomControl.setPosition("bottomright");
    
    map.on("click", (e: L.LeafletMouseEvent) => {
      onMapClickRef.current?.(e.latlng.lat, e.latlng.lng);
    });

    leafletMapRef.current = map;

    return () => {
      map.remove();
      leafletMapRef.current = null;
    };
  }, []);

  // Update center + radius circle + user dot
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;

    map.setView(center, map.getZoom(), { animate: true });

    radiusCircleRef.current?.remove();
    userDotRef.current?.remove();

    userDotRef.current = L.circleMarker(center, {
      radius: 7,
      fillColor: "#00b4ff",
      fillOpacity: 1,
      color: "#ffffff",
      weight: 2,
    }).addTo(map);

    if (radiusM) {
      radiusCircleRef.current = L.circle(center, {
        radius: radiusM,
        color: "#00b4ff",
        weight: 1.5,
        opacity: 0.4,
        fillColor: "#00b4ff",
        fillOpacity: 0.04,
        dashArray: "4 6",
      }).addTo(map);
    }
  }, [center, radiusM]);

  // Update markers
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    incidents.forEach((inc) => {
      const color = getCategoryColor(inc.category);
      const verified = inc.status === "Verified";
      const marker = L.marker([inc.lat, inc.lng], { icon: makeIcon(inc.category, verified) })
        .addTo(map)
        .bindPopup(
          `<div style="min-width:140px;font-family:Inter,sans-serif;">
            <div style="font-weight:700;font-size:13px;margin-bottom:4px;color:#fff;
              text-shadow:0 0 8px ${color};">${inc.customCategory ?? inc.category}</div>
            <div style="font-size:11px;line-height:1.4;opacity:0.65;margin-bottom:8px;color:#e2e8f0">
              ${inc.description.slice(0, 90)}${inc.description.length > 90 ? "…" : ""}
            </div>
            <span style="font-size:10px;font-weight:600;padding:3px 9px;border-radius:20px;${
              verified
                ? "background:rgba(34,197,94,0.2);color:#22c55e;border:1px solid rgba(34,197,94,0.4)"
                : inc.status === "Resolved"
                ? "background:rgba(148,163,184,0.2);color:#94a3b8;border:1px solid rgba(148,163,184,0.4)"
                : "background:rgba(251,146,60,0.2);color:#fb923c;border:1px solid rgba(251,146,60,0.4)"
            }">${inc.status}</span>
          </div>`,
          { maxWidth: 240 }
        );

      if (onMarkerClick) marker.on("click", () => onMarkerClick(inc));
      markersRef.current.push(marker);
    });
  }, [incidents, onMarkerClick]);

  // Heatmap overlay
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;

    heatLayerRef.current.forEach((c) => c.remove());
    heatLayerRef.current = [];

    if (!showHeatmap) return;

    incidents.forEach((inc) => {
      const color = getCategoryColor(inc.category);
      const circle = L.circle([inc.lat, inc.lng], {
        radius: 120,
        color: "transparent",
        fillColor: color,
        fillOpacity: 0.22,
        interactive: false,
      }).addTo(map);

      const outerCircle = L.circle([inc.lat, inc.lng], {
        radius: 260,
        color: "transparent",
        fillColor: color,
        fillOpacity: 0.08,
        interactive: false,
      }).addTo(map);

      heatLayerRef.current.push(circle, outerCircle);
    });
  }, [incidents, showHeatmap]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
        ref={mapRef}
        className="lp-map-container w-full h-full"
        data-testid="map-view"
        style={{ background: "#080d1a", position: "relative" }}
      />

      {/* Heatmap toggle button */}
      <button
        onClick={() => setShowHeatmap((v) => !v)}
        style={{
          position: "absolute",
          bottom: 56,
          right: 10,
          zIndex: 900,
          padding: "6px 10px",
          borderRadius: 10,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.02em",
          display: "flex",
          alignItems: "center",
          gap: 5,
          cursor: "pointer",
          transition: "all 0.18s",
          background: showHeatmap ? "rgba(255,100,50,0.22)" : "rgba(10,14,26,0.86)",
          border: showHeatmap ? "1px solid rgba(255,100,50,0.5)" : "1px solid rgba(0,180,255,0.25)",
          color: showHeatmap ? "#ff6432" : "#00b4ff",
          boxShadow: showHeatmap ? "0 0 12px rgba(255,100,50,0.2)" : "0 0 8px rgba(0,180,255,0.12)",
        }}
      >
        🌡️ {showHeatmap ? "Heat On" : "Heatmap"}
      </button>
    </div>
  );
}
