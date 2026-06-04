import * as React from "react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { useListIncidentComments, useAddIncidentComment, getListIncidentCommentsQueryKey } from '@/api-client';
import { useQueryClient } from "@tanstack/react-query";
import { getUserFingerprint } from "@/lib/fingerprint";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface Props {
  key?: React.Key;
  incidentId: number;
  displayName: string;
}

export default function CommentThread({ incidentId, displayName }: Props) {
  const [body, setBody] = useState("");
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: comments = [], isLoading } = useListIncidentComments(incidentId, {
    query: { queryKey: getListIncidentCommentsQueryKey(incidentId), staleTime: 10_000 },
  });

  const addComment = useAddIncidentComment();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || trimmed.length < 2) return;
    const fp = getUserFingerprint();
    addComment.mutate(
      {
        id: incidentId,
        data: { userFingerprint: fp, displayName, body: trimmed },
      },
      {
        onSuccess: async (newComment: any) => {
          setBody("");

          try {
            await setDoc(doc(db, "comments", String(newComment.id)), {
              id: Number(newComment.id),
              incidentId: Number(newComment.incidentId),
              userFingerprint: String(newComment.userFingerprint),
              displayName: String(newComment.displayName),
              body: String(newComment.body),
              createdAt: String(newComment.createdAt)
            });
          } catch (err) {
            console.error("Direct Firestore comment synchronization skipped or blocked:", err);
          }

          qc.invalidateQueries({ queryKey: getListIncidentCommentsQueryKey(incidentId) });
        },
        onError: (err: any) => {
          const errMsg = err?.data?.error || err?.message || "Failed to post comment";
          toast({ title: "Failed to post comment", description: errMsg, variant: "destructive" });
        },
      }
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.22 }}
      style={{ borderTop: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}
    >
      <div className="pt-3 space-y-2.5">
        {/* Header */}
        <div className="flex items-center gap-1.5 mb-1">
          <MessageCircle size={11} style={{ color: "#00b4ff" }} />
          <span className="text-[10px] font-semibold" style={{ color: "#00b4ff" }}>
            Discussion
          </span>
          {comments.length > 0 && (
            <span className="text-[10px] text-white/30">· {comments.length} comment{comments.length !== 1 ? "s" : ""}</span>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center gap-2 py-1">
            <Loader2 size={12} className="animate-spin text-white/30" />
            <span className="text-[11px] text-white/30">Loading comments…</span>
          </div>
        )}

        {/* Comment list */}
        <AnimatePresence>
          {comments.map((c) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex gap-2.5"
            >
              {/* Avatar dot */}
              <div
                className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5"
                style={{
                  background: "rgba(0,180,255,0.18)",
                  border: "1px solid rgba(0,180,255,0.3)",
                  color: "#00b4ff",
                }}
              >
                {c.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5 mb-0.5">
                  <span className="text-[11px] font-semibold text-white/75">{c.displayName}</span>
                  <span className="text-[9px] text-white/25">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="text-[11px] leading-relaxed text-white/55">{c.body}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty state */}
        {!isLoading && comments.length === 0 && (
          <p className="text-[10px] text-white/25 py-1">No comments yet — be the first!</p>
        )}

        {/* Comment input */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-2">
          <div
            className="flex-1 rounded-xl px-3 py-2 flex items-center gap-2"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Add a comment…"
              maxLength={280}
              className="flex-1 bg-transparent text-[12px] text-white/80 placeholder-white/20 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={!body.trim() || addComment.isPending}
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95 disabled:opacity-40"
            style={{
              background: body.trim() ? "rgba(0,180,255,0.22)" : "rgba(255,255,255,0.05)",
              border: body.trim() ? "1px solid rgba(0,180,255,0.4)" : "1px solid rgba(255,255,255,0.07)",
            }}
          >
            {addComment.isPending ? (
              <Loader2 size={13} className="animate-spin" style={{ color: "#00b4ff" }} />
            ) : (
              <Send size={13} style={{ color: body.trim() ? "#00b4ff" : "rgba(255,255,255,0.3)" }} />
            )}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
