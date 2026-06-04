import { useState } from "react";
import { Search, Filter } from "lucide-react";
import { useListIncidents } from '@/api-client';
import { getListIncidentsQueryKey } from '@/api-client';
import IncidentCard from "@/components/IncidentCard";
import { CATEGORIES } from "@/lib/categories";
import { motion } from "framer-motion";

const NYC = { lat: 40.7128, lng: -74.006 };

export default function ReportsPage() {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const { data: incidents = [], isLoading } = useListIncidents(
    { lat: NYC.lat, lng: NYC.lng },
    { query: { queryKey: getListIncidentsQueryKey({ lat: NYC.lat, lng: NYC.lng }) } }
  );

  const filtered = incidents.filter((inc) => {
    const matchSearch =
      !search ||
      inc.category.toLowerCase().includes(search.toLowerCase()) ||
      inc.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCat || inc.category === filterCat;
    const matchStatus = !filterStatus || inc.status === filterStatus;
    return matchSearch && matchCat && matchStatus;
  });

  return (
    <div className="flex flex-col h-full" data-testid="reports-page">
      {/* Header */}
      <div
        className="flex-shrink-0 px-5 pt-12 pb-3"
        style={{ background: "rgba(13,13,18,0.95)", backdropFilter: "blur(12px)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-extrabold tracking-tight text-white" style={{ letterSpacing: "-0.02em" }}>
            All Reports
          </h1>
          <span className="text-xs text-white/40 font-medium">{filtered.length} active reports</span>
        </div>

        <div
          className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 mb-3"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <Search size={14} className="text-white/30" />
          <input
            data-testid="input-search-reports"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search alerts..."
            className="bg-transparent flex-1 text-sm text-white/80 placeholder-white/28 outline-none"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          <button
            data-testid="filter-all"
            onClick={() => { setFilterCat(""); setFilterStatus(""); }}
            className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
            style={
              !filterCat && !filterStatus
                ? { background: "#00b4ff", color: "#000" }
                : { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }
            }
          >
            All
          </button>
          {["Pending", "Verified"].map((s) => (
            <button
              key={s}
              data-testid={`filter-status-${s.toLowerCase()}`}
              onClick={() => setFilterStatus(filterStatus === s ? "" : s)}
              className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
              style={
                filterStatus === s
                  ? { background: "#00b4ff", color: "#000" }
                  : { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }
              }
            >
              {s}
            </button>
          ))}
          {CATEGORIES.slice(0, 4).map((cat) => (
            <button
              key={cat}
              data-testid={`filter-cat-${cat.toLowerCase()}`}
              onClick={() => setFilterCat(filterCat === cat ? "" : cat)}
              className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
              style={
                filterCat === cat
                  ? { background: "#00b4ff", color: "#000" }
                  : { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }
              }
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-2 space-y-2.5">
        {isLoading ? (
          <>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} />
            ))}
          </>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <Filter size={32} className="mx-auto mb-3 text-white/15" />
            <p className="text-white/30 text-sm">No incidents match</p>
          </motion.div>
        ) : (
          filtered.map((inc, i) => (
            <IncidentCard
              key={inc.id}
              incident={inc}
              index={i}
            />
          ))
        )}
      </div>
    </div>
  );
}
