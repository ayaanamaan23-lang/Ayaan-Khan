import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Medal, Star } from "lucide-react";
import { useGetLeaderboard } from '@/api-client';
import { getBadge, BADGE_LEVELS } from "@/lib/badges";
import { getUserFingerprint } from "@/lib/fingerprint";

const RANK_COLORS = ["#f59e0b", "#94a3b8", "#b45309"];
const RANK_ICONS = [Trophy, Medal, Star];

export default function LeaderboardPage() {
  const myFp = getUserFingerprint();
  const { data: entries = [], isLoading } = useGetLeaderboard({
    query: { queryKey: ["leaderboard"], refetchInterval: 30000 },
  });

  return (
    <div className="flex flex-col h-full overflow-hidden" data-testid="leaderboard-page">
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-12 pb-4" style={{ background: "rgba(13,13,18,0.95)" }}>
        <h1 className="text-2xl font-extrabold tracking-tight text-white" style={{ letterSpacing: "-0.02em" }}>
          Leaderboard
        </h1>
        <p className="text-xs text-white/35 mt-1">Trust points from verified community reports</p>
      </div>

      {/* Badge legend */}
      <div className="flex-shrink-0 px-4 pb-3 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {BADGE_LEVELS.map((b) => (
            <div
              key={b.name}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-semibold flex-shrink-0"
              style={{
                background: `${b.color}12`,
                border: `1px solid ${b.color}30`,
                color: b.color,
              }}
            >
              <span>{b.emoji}</span>
              <span>{b.name}</span>
              <span className="opacity-50">{b.minPoints}+</span>
            </div>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4 space-y-2.5">
        {isLoading ? (
          [...Array(8)].map((_, i) => (
            <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} />
          ))
        ) : entries.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🏆</div>
            <p className="text-white/30 text-sm">No reporters yet</p>
            <p className="text-white/18 text-xs mt-1">Submit reports to earn trust points</p>
          </div>
        ) : (
          entries.map((entry, i) => {
            const badge = getBadge(entry.trustPoints);
            const isMe = entry.fingerprint === myFp;
            const RankIcon = RANK_ICONS[i] ?? null;

            return (
              <motion.div
                key={entry.fingerprint}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
                className="glass-card rounded-2xl p-3.5 flex items-center gap-3"
                style={
                  isMe
                    ? { border: "1px solid rgba(0,180,255,0.3)", background: "rgba(0,180,255,0.06)" }
                    : {}
                }
              >
                {/* Rank */}
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={
                    i < 3
                      ? { background: `${RANK_COLORS[i]}18`, color: RANK_COLORS[i], border: `1px solid ${RANK_COLORS[i]}30` }
                      : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.35)" }
                  }
                >
                  {i < 3 && RankIcon ? <RankIcon size={14} /> : entry.rank}
                </div>

                {/* Badge emoji */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{
                    background: `${badge.color}14`,
                    border: `1px solid ${badge.color}28`,
                  }}
                >
                  {badge.emoji}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm text-white/90 truncate">
                      {entry.displayName}
                    </span>
                    {isMe && (
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: "rgba(0,180,255,0.2)", color: "#00b4ff" }}
                      >
                        You
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-semibold" style={{ color: badge.color }}>
                      {badge.emoji} {badge.name}
                    </span>
                    <span className="text-[10px] text-white/30">
                      {entry.totalReports} report{entry.totalReports !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* Trust points */}
                <div className="text-right flex-shrink-0">
                  <div className="text-lg font-extrabold" style={{ color: badge.color }}>
                    {entry.trustPoints}
                  </div>
                  <div className="text-[9px] text-white/35 font-medium">pts</div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
