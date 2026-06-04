import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, ThumbsUp, ThumbsDown, X } from "lucide-react";
import type { Incident } from '@/api-client';
import { useVoteOnIncident, getListIncidentsQueryKey } from '@/api-client';
import { useQueryClient } from "@tanstack/react-query";
import { getCategoryColor, getCategoryIcon } from "@/lib/categories";
import { getUserFingerprint, hasVoted, markVoted } from "@/lib/fingerprint";

interface Props {
  incidents: Incident[];
}

export default function VerificationBanner({ incidents }: Props) {
  const [queue, setQueue] = useState<Incident[]>([]);
  const [current, setCurrent] = useState<Incident | null>(null);
  const seenRef = useRef<Set<number>>(new Set());
  const qc = useQueryClient();
  const vote = useVoteOnIncident();

  // Detect newly arrived pending incidents the user hasn't voted on
  useEffect(() => {
    const fresh = incidents.filter(
      (inc) =>
        inc.status === "Pending" &&
        !hasVoted(inc.id) &&
        !seenRef.current.has(inc.id)
    );

    if (fresh.length > 0) {
      fresh.forEach((inc) => seenRef.current.add(inc.id));
      setQueue((q) => {
        const ids = new Set(q.map((x) => x.id));
        return [...q, ...fresh.filter((x) => !ids.has(x.id))];
      });
    }
  }, [incidents]);

  // Pop next from queue when current is cleared
  useEffect(() => {
    if (!current && queue.length > 0) {
      const [next, ...rest] = queue;
      setCurrent(next);
      setQueue(rest);
    }
  }, [current, queue]);

  // Auto-dismiss after 12s
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => setCurrent(null), 12000);
    return () => clearTimeout(t);
  }, [current]);

  function handleVote(v: boolean) {
    if (!current) return;
    const fp = getUserFingerprint();
    vote.mutate(
      { id: current.id, data: { vote: v, userFingerprint: fp } },
      {
        onSettled: () => {
          markVoted(current.id);
          qc.invalidateQueries({ queryKey: getListIncidentsQueryKey() });
          setCurrent(null);
        },
      }
    );
  }

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.id}
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 280 }}
          className="fixed top-0 left-0 right-0 max-w-md mx-auto px-3 pt-2"
          style={{ zIndex: 8000 }}
        >
          <div
            className="rounded-2xl p-3.5 flex items-start gap-3"
            style={{
              background: "rgba(14,17,28,0.97)",
              border: `1px solid ${getCategoryColor(current.category)}55`,
              boxShadow: `0 4px 24px rgba(0,0,0,0.6), 0 0 16px ${getCategoryColor(current.category)}22`,
              backdropFilter: "blur(16px)",
            }}
          >
            {/* Icon */}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              style={{
                background: `${getCategoryColor(current.category)}18`,
                border: `1px solid ${getCategoryColor(current.category)}35`,
              }}
            >
              {getCategoryIcon(current.category)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <AlertTriangle size={11} className="text-amber-400 flex-shrink-0" />
                <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                  Nearby Report
                </span>
              </div>
              <p className="text-sm font-semibold text-white/90 truncate">
                {current.customCategory ?? current.category}
              </p>
              <p className="text-[11px] text-white/45 truncate">{current.description}</p>

              {/* Vote row */}
              <div className="flex items-center gap-2 mt-2.5">
                <span className="text-[10px] text-white/35 flex-1">Is this accurate?</span>
                <button
                  onClick={() => handleVote(true)}
                  disabled={vote.isPending}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                  style={{
                    background: "rgba(34,197,94,0.15)",
                    border: "1px solid rgba(34,197,94,0.3)",
                    color: "#22c55e",
                  }}
                >
                  <ThumbsUp size={10} /> Yes
                </button>
                <button
                  onClick={() => handleVote(false)}
                  disabled={vote.isPending}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                  style={{
                    background: "rgba(239,68,68,0.12)",
                    border: "1px solid rgba(239,68,68,0.25)",
                    color: "#f87171",
                  }}
                >
                  <ThumbsDown size={10} /> No
                </button>
              </div>
            </div>

            {/* Dismiss */}
            <button
              onClick={() => setCurrent(null)}
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <X size={12} className="text-white/50" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
