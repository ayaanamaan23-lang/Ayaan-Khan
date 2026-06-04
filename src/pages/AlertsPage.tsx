import * as React from "react";
import { useState, useRef, useCallback } from "react";
import { Search, LocateFixed, Mic, MicOff, MapPin, X, Home, Briefcase } from "lucide-react";
import {
  useListIncidents,
  getListIncidentsQueryKey,
  useGetUserProfile,
  getGetUserProfileQueryKey,
} from '@/api-client';
import MapView from "@/components/MapView";
import IncidentCard from "@/components/IncidentCard";
import ReportModal from "@/components/ReportModal";
import VerificationBanner from "@/components/VerificationBanner";
import { motion, AnimatePresence } from "framer-motion";
import { useGeolocation } from "@/hooks/useGeolocation";
import type { GeoPosition } from "@/hooks/useGeolocation";
import { usePinnedLocations } from "@/hooks/usePinnedLocations";
import { getUserFingerprint } from "@/lib/fingerprint";
import { getBadge } from "@/lib/badges";

const RADIUS_M = 500;

interface GeocodedPlace {
  name: string;
  pos: GeoPosition;
}

async function geocodePlace(query: string): Promise<GeocodedPlace | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const res = await fetch(url, { headers: { "Accept-Language": "en" } });
    const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    if (data.length === 0) return null;
    return {
      name: data[0].display_name.split(",").slice(0, 2).join(", "),
      pos: { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) },
    };
  } catch {
    return null;
  }
}

export default function AlertsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchCenter, setSearchCenter] = useState<GeoPosition | null>(null);
  const [searchLabel, setSearchLabel] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [listening, setListening] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const { position: myPos } = useGeolocation();
  const { pins } = usePinnedLocations();
  const fp = getUserFingerprint();

  const { data: profile } = useGetUserProfile(fp, {
    query: { queryKey: getGetUserProfileQueryKey(fp), staleTime: 60_000 },
  });

  const badge = getBadge(profile?.trustPoints ?? 0);

  const activeCenter = searchCenter ?? myPos;

  const incidentParams = { lat: activeCenter.lat, lng: activeCenter.lng, radius: RADIUS_M };
  
  const { data: incidents = [], isLoading } = useListIncidents(incidentParams, {
    query: {
      queryKey: getListIncidentsQueryKey(incidentParams),
      refetchInterval: 15_000,
      staleTime: 10_000,
    },
  });

  // --- Search geocoding ---
  async function handleSearch(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter" || !search.trim()) return;
    setGeocoding(true);
    const result = await geocodePlace(search.trim());
    setGeocoding(false);
    if (result) {
      setSearchCenter(result.pos);
      setSearchLabel(result.name);
    }
  }

  function clearSearch() {
    setSearch("");
    setSearchCenter(null);
    setSearchLabel(null);
  }

  // --- Voice search ---
  function toggleVoice() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) return;

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    recognitionRef.current = rec;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const text: string = e.results[0]?.[0]?.transcript ?? "";
      setSearch(text);
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);

    rec.start();
    setListening(true);
  }

  // --- Pin navigation ---
  function goToPin(lat: number, lng: number, label: string) {
    setSearchCenter({ lat, lng });
    setSearchLabel(label);
    setSearch(label);
  }

  // --- Map center array ---
  const mapCenter: [number, number] = [activeCenter.lat, activeCenter.lng];

  const handleMapMarkerClick = useCallback(() => {
    // Could open detail sheet in future
  }, []);

  return (
    <div className="flex flex-col h-full" data-testid="alerts-page">
      {/* ── Header bar with trust badge ── */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-5 pt-11 pb-3"
        style={{ background: "rgba(13,13,18,0.95)" }}
      >
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white" style={{ letterSpacing: "-0.02em" }}>
            LivePulse
          </h1>
          <p className="text-[11px] text-white/35 mt-0.5">Incidents near you</p>
        </div>

        {/* Trust points badge */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-2xl"
          style={{
            background: `${badge.color}14`,
            border: `1px solid ${badge.color}35`,
          }}
        >
          <span className="text-base leading-none">{badge.emoji}</span>
          <div className="text-right">
            <div className="text-xs font-bold" style={{ color: badge.color }}>
              {profile?.trustPoints ?? 0} pts
            </div>
            <div className="text-[9px] text-white/35">{badge.name}</div>
          </div>
        </div>
      </div>

      {/* ── Search bar ── */}
      <div className="flex-shrink-0 px-4 pb-2" style={{ background: "rgba(13,13,18,0.95)" }}>
        <div
          className="flex items-center gap-2 rounded-2xl px-3.5 py-2.5"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Search size={14} className="text-white/30 flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearch}
            placeholder={geocoding ? "Searching…" : "Search incidents or type a location…"}
            className="flex-1 bg-transparent text-sm text-white/80 placeholder-white/25 outline-none"
          />
          {search ? (
            <button onClick={clearSearch}>
              <X size={14} className="text-white/30" />
            </button>
          ) : (
            <button onClick={toggleVoice}>
              {listening ? (
                <MicOff size={14} className="animate-pulse" style={{ color: "#f87171" }} />
              ) : (
                <Mic size={14} className="text-white/30" />
              )}
            </button>
          )}
        </div>

        {/* Active location pill */}
        <AnimatePresence>
          {searchLabel && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-xl"
              style={{
                background: "rgba(0,180,255,0.1)",
                border: "1px solid rgba(0,180,255,0.2)",
              }}
            >
              <LocateFixed size={12} style={{ color: "#00b4ff" }} />
              <span className="text-[11px] text-white/70 truncate flex-1">{searchLabel}</span>
              <button onClick={clearSearch}>
                <X size={12} className="text-white/35" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pinned location chips */}
        {pins.length > 0 && (
          <div className="flex gap-2 mt-2 overflow-x-auto pb-0.5 no-scrollbar">
            {pins.map((pin) => (
              <button
                key={pin.id}
                onClick={() => goToPin(pin.lat, pin.lng, pin.label)}
                className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all active:scale-95"
                style={{
                  background:
                    searchLabel === pin.label
                      ? "rgba(0,180,255,0.2)"
                      : "rgba(255,255,255,0.06)",
                  border:
                    searchLabel === pin.label
                      ? "1px solid rgba(0,180,255,0.4)"
                      : "1px solid rgba(255,255,255,0.1)",
                  color: searchLabel === pin.label ? "#00b4ff" : "rgba(255,255,255,0.6)",
                }}
              >
                <span className="text-base leading-none">{pin.emoji}</span>
                {pin.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Map ── */}
      <div className="flex-shrink-0" style={{ height: "220px", position: "relative" }}>
        <VerificationBanner incidents={incidents} />
        <MapView
          incidents={incidents}
          center={mapCenter}
          onMarkerClick={handleMapMarkerClick}
          radiusM={RADIUS_M}
        />
      </div>

      {/* ── Incident list ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {/* Header row */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h2 className="text-sm font-bold text-white/80">
            Local Alerts{" "}
            <span className="text-white/35 font-normal">({incidents.length})</span>
          </h2>
          <button className="text-[11px] font-semibold" style={{ color: "#00b4ff" }}>
            See All ›
          </button>
        </div>

        {/* Cards */}
        <div className="px-4 pb-4 space-y-3">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
            </div>
          )}
          <AnimatePresence>
            {incidents.map((inc, i) => (
              <IncidentCard
                key={inc.id}
                incident={inc}
                index={i}
                showVoting={true}
                displayName={profile?.displayName ?? "Anonymous"}
              />
            ))}
          </AnimatePresence>
          {!isLoading && incidents.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-10"
            >
              <div className="text-3xl mb-2">🏙️</div>
              <p className="text-sm text-white/30">No incidents nearby</p>
              <p className="text-xs text-white/20 mt-1">All clear in your area</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── New Report CTA ── */}
      <div className="flex-shrink-0 px-4 py-3" style={{ background: "rgba(13,13,18,0.95)" }}>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center justify-center gap-2 w-full rounded-2xl py-4 font-bold text-base text-black neon-glow transition-all active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #00b4ff 0%, #0072ff 100%)" }}
        >
          <MapPin size={18} />
          New Report +
        </button>
      </div>

      <ReportModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
