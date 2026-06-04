import * as React from "react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, MapPin, ThumbsUp, ThumbsDown, MessageCircle, CheckCircle2, ChevronDown } from "lucide-react";
import type { Incident } from '@/api-client';
import { useVoteOnIncident, useUpdateIncident, getListIncidentsQueryKey } from '@/api-client';
import { useQueryClient } from "@tanstack/react-query";
import { getCategoryColor, getCategoryIcon } from "@/lib/categories";
import { getUserFingerprint, hasVoted, markVoted } from "@/lib/fingerprint";
import CommentThread from "./CommentThread";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, setDoc, deleteDoc } from "firebase/firestore";

interface Props {
  key?: React.Key;
  incident: Incident;
  index?: number;
  onClick?: () => void;
  showVoting?: boolean;
  displayName?: string;
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function statusStyle(status: string): { bg: string; color: string; label: string } {
  if (status === "Verified") return { bg: "rgba(34,197,94,0.18)", color: "#22c55e", label: "Verified" };
  if (status === "Resolved") return { bg: "rgba(148,163,184,0.18)", color: "#94a3b8", label: "Resolved ✓" };
  return { bg: "rgba(251,146,60,0.18)", color: "#fb923c", label: "Pending" };
}

export default function IncidentCard({ incident, index = 0, onClick, showVoting = false, displayName = "Anonymous" }: Props) {
  const color = getCategoryColor(incident.category);
  const icon = getCategoryIcon(incident.category);
  const [voted, setVoted] = useState(() => hasVoted(incident.id));
  const [localTrue, setLocalTrue] = useState(incident.trueVotes);
  const [localFalse, setLocalFalse] = useState(incident.falseVotes);
  const [dismissed, setDismissed] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [localStatus, setLocalStatus] = useState(incident.status);
  const { toast } = useToast();

  const qc = useQueryClient();
  const vote = useVoteOnIncident();
  const updateIncident = useUpdateIncident();
  const ss = statusStyle(localStatus);

  function handleVote(v: boolean, e: React.MouseEvent) {
    e.stopPropagation();
    if (voted) return;
    const fp = getUserFingerprint();
    vote.mutate(
      { id: incident.id, data: { vote: v, userFingerprint: fp } },
      {
        onSuccess: async (result: any) => {
          markVoted(incident.id);
          setVoted(true);
          if (result.deleted) {
            setDismissed(true);
            try {
              await deleteDoc(doc(db, "incidents", String(incident.id)));
            } catch (err) {
              console.error("Direct Firestore incident delete skipped or blocked:", err);
            }
          } else if (result.incident) {
            const updated = result.incident;
            setLocalTrue(updated.trueVotes);
            setLocalFalse(updated.falseVotes);

            try {
              // 1. Log the vote
              const voteId = `vote_${incident.id}_${fp}`;
              await setDoc(doc(db, "votes", voteId), {
                id: voteId,
                incidentId: Number(incident.id),
                userFingerprint: String(fp),
                vote: v,
                createdAt: new Date().toISOString()
              });

              // 2. Update the incident stats
              await setDoc(doc(db, "incidents", String(incident.id)), {
                id: Number(incident.id),
                category: String(updated.category || incident.category),
                customCategory: updated.customCategory ?? incident.customCategory ?? null,
                description: String(updated.description || incident.description),
                lat: Number(updated.lat || incident.lat),
                lng: Number(updated.lng || incident.lng),
                status: String(updated.status || incident.status),
                userId: String(updated.userId || incident.userId || "Anonymous"),
                timestamp: String(updated.timestamp || incident.timestamp),
                trueVotes: Number(updated.trueVotes),
                falseVotes: Number(updated.falseVotes),
                isDuplicate: !!(updated.isDuplicate || incident.isDuplicate)
              }, { merge: true });
            } catch (err) {
              console.error("Direct Firestore vote synchronization skipped or blocked:", err);
            }
          }
          qc.invalidateQueries({ queryKey: getListIncidentsQueryKey() });
        },
      }
    );
  }

  function handleResolve(e: React.MouseEvent) {
    e.stopPropagation();
    updateIncident.mutate(
      { id: incident.id, data: { status: "Resolved" } },
      {
        onSuccess: async (updatedIncident: any) => {
          setLocalStatus("Resolved");

          try {
            await setDoc(doc(db, "incidents", String(incident.id)), {
              status: "Resolved"
            }, { merge: true });
          } catch (err) {
            console.error("Direct Firestore resolve status synchronization skipped or blocked:", err);
          }

          qc.invalidateQueries({ queryKey: getListIncidentsQueryKey() });
          toast({ title: "✅ Marked as Resolved" });
        },
        onError: () => toast({ title: "Failed to resolve", variant: "destructive" }),
      }
    );
  }

  function toggleComments(e: React.MouseEvent) {
    e.stopPropagation();
    setShowComments((v) => !v);
  }

  if (dismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.06, ease: "easeOut" }}
      data-testid={`incident-card-${incident.id}`}
      className="glass-card rounded-2xl p-3.5"
    >
      {/* Top row — clickable area */}
      <div
        className="flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
        onClick={onClick}
      >
        {/* Category icon */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
          style={{
            background: `${color}18`,
            border: `1px solid ${color}35`,
            boxShadow: `0 0 12px ${color}20`,
          }}
        >
          {icon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-semibold text-sm text-white/90 truncate">
              {incident.customCategory ?? incident.category}
            </span>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ background: ss.bg, color: ss.color }}
            >
              {ss.label}
            </span>
          </div>
          <p className="text-xs text-white/50 truncate mb-1">{incident.description}</p>
          <div className="flex items-center gap-3 text-[10px] text-white/35">
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {timeAgo(incident.timestamp)}
            </span>
            {incident.distanceMi != null && (
              <span className="flex items-center gap-1">
                <MapPin size={10} />
                {incident.distanceMi} mi
              </span>
            )}
          </div>
        </div>

        {/* Distance badge */}
        {incident.distanceMi != null && (
          <div className="text-right flex-shrink-0">
            <span className="text-xs font-semibold" style={{ color: "#00b4ff" }}>
              {incident.distanceMi} mi
            </span>
          </div>
        )}
      </div>

      {/* Voting + action row */}
      {(showVoting || localStatus === "Pending") && localStatus !== "Resolved" && (
        <div
          className="mt-3 pt-3 flex items-center gap-2"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <span className="text-[10px] text-white/35 flex-1">Is this real?</span>

          {voted ? (
            <span className="text-[10px] text-white/40 italic">Vote recorded</span>
          ) : (
            <>
              <button
                onClick={(e) => handleVote(true, e)}
                disabled={vote.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all active:scale-95 disabled:opacity-50"
                style={{
                  background: "rgba(34,197,94,0.12)",
                  border: "1px solid rgba(34,197,94,0.25)",
                  color: "#22c55e",
                }}
              >
                <ThumbsUp size={11} />
                Real {localTrue > 0 && <span className="opacity-60">({localTrue})</span>}
              </button>
              <button
                onClick={(e) => handleVote(false, e)}
                disabled={vote.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all active:scale-95 disabled:opacity-50"
                style={{
                  background: "rgba(239,68,68,0.10)",
                  border: "1px solid rgba(239,68,68,0.22)",
                  color: "#f87171",
                }}
              >
                <ThumbsDown size={11} />
                Fake {localFalse > 0 && <span className="opacity-60">({localFalse})</span>}
              </button>
            </>
          )}
        </div>
      )}

      {/* Resolved + Comments bar */}
      <div
        className="mt-3 pt-3 flex items-center gap-2"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Resolve button (only for non-resolved incidents) */}
        {localStatus !== "Resolved" && (
          <button
            onClick={handleResolve}
            disabled={updateIncident.isPending}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all active:scale-95 disabled:opacity-40"
            style={{
              background: "rgba(148,163,184,0.10)",
              border: "1px solid rgba(148,163,184,0.2)",
              color: "#94a3b8",
            }}
          >
            <CheckCircle2 size={10} />
            Cleared
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Comment toggle */}
        <button
          onClick={toggleComments}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all active:scale-95"
          style={{
            background: showComments ? "rgba(0,180,255,0.14)" : "rgba(255,255,255,0.05)",
            border: showComments ? "1px solid rgba(0,180,255,0.3)" : "1px solid rgba(255,255,255,0.08)",
            color: showComments ? "#00b4ff" : "rgba(255,255,255,0.4)",
          }}
        >
          <MessageCircle size={10} />
          Discuss
          <ChevronDown
            size={9}
            className="transition-transform"
            style={{ transform: showComments ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>
      </div>

      {/* Inline comment thread */}
      <AnimatePresence>
        {showComments && (
          <CommentThread
            key={`comments-${incident.id}`}
            incidentId={incident.id}
            displayName={displayName}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
