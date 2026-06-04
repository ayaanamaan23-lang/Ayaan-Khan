import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  User,
  Shield,
  Bell,
  Info,
  ChevronRight,
  Radio,
  Pencil,
  Check,
  MapPin,
  Plus,
  Trash2,
  Home,
  Briefcase,
  Navigation,
  X,
  AlertCircle,
  HelpCircle,
  TrendingUp,
} from "lucide-react";
import { useGetUserProfile, useUpsertUserProfile } from '@/api-client';
import { useQueryClient } from "@tanstack/react-query";
import { getUserFingerprint } from "@/lib/fingerprint";
import { getBadge, getProgressToNext, BADGE_LEVELS } from "@/lib/badges";
import { useToast } from "@/hooks/use-toast";
import { usePinnedLocations } from "@/hooks/usePinnedLocations";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useFirebase } from "@/components/FirebaseProvider";

const PIN_PRESETS = [
  { emoji: "🏠", label: "Home" },
  { emoji: "💼", label: "Office" },
  { emoji: "⭐", label: "Favourite" },
  { emoji: "📍", label: "Custom" },
];

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const fp = getUserFingerprint();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { signOut, user } = useFirebase();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [addingPin, setAddingPin] = useState(false);
  const [pinLabel, setPinLabel] = useState("Home");
  const [pinEmoji, setPinEmoji] = useState("🏠");

  // Problem reporting states
  const [showReportProblemModal, setShowReportProblemModal] = useState(false);
  const [problemText, setProblemText] = useState("");
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false);

  const { position } = useGeolocation();
  const { pins, addPin, removePin } = usePinnedLocations();

  const { data: profile, isLoading } = useGetUserProfile(fp, {
    query: { queryKey: ["profile", fp], refetchInterval: 30000 },
  });

  const upsertProfile = useUpsertUserProfile();

  const isAdmin = user?.email === "ayaanamaan23@gmail.com";

  const menuItems = [
    { id: "notifications", icon: Bell, label: "Notifications", sub: "Alert preferences" },
    { id: "privacy", icon: Shield, label: "Privacy", sub: "Location & data settings" },
    { id: "problem", icon: AlertCircle, label: "Report a Problem", sub: "Tell us if things are broken" },
    { id: "about", icon: Info, label: "About LivePulse", sub: "Version 2.0.0" },
    ...(isAdmin ? [{ id: "admin", icon: Shield, label: "🛡️ Admin Control Panel", sub: "View metrics & feedback" }] : []),
  ];

  useEffect(() => {
    if (profile?.displayName && profile.displayName !== "Anonymous") {
      setNameInput(profile.displayName);
    }
  }, [profile?.displayName]);

  function saveName() {
    if (!nameInput.trim()) return;
    upsertProfile.mutate(
      { data: { fingerprint: fp, displayName: nameInput.trim() } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["profile", fp] });
          qc.invalidateQueries({ queryKey: ["leaderboard"] });
          setEditingName(false);
          toast({ title: "Name updated!" });
        },
      }
    );
  }

  function handleAddPin() {
    if (!position) {
      toast({ title: "Location not available yet", variant: "destructive" });
      return;
    }
    const label = pinLabel.trim() || "Pin";
    addPin(label, position.lat, position.lng, pinEmoji);
    setAddingPin(false);
    toast({ title: `📍 ${label} pinned — you'll get alerts from this area` });
  }

  const handleMenuClick = (item: any) => {
    if (item.id === "admin") {
      setLocation("/admin");
    } else if (item.id === "problem") {
      setShowReportProblemModal(true);
    } else {
      toast({
        title: item.label,
        description: `This preference is currently active and structured for LivePulse.`,
      });
    }
  };

  const handleSubmitProblem = async () => {
    if (!problemText.trim()) {
      toast({ title: "Please enter a description" });
      return;
    }
    setIsFeedbackSubmitting(true);
    try {
      const response = await fetch("/api/problems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userFingerprint: fp,
          userEmail: user?.email || null,
          description: problemText.trim(),
        }),
      });
      if (response.ok) {
        toast({
          title: "Problem Reported Successfully!",
          description: "Our engineering team will look into this right away. Thank you!",
        });
        setProblemText("");
        setShowReportProblemModal(false);
      } else {
        const data = await response.json();
        throw new Error(data.error || "Submission failed");
      }
    } catch (err: any) {
      toast({
        title: "Could not submit report",
        description: err.message || "Something went wrong. Please check your network.",
        variant: "destructive",
      });
    } finally {
      setIsFeedbackSubmitting(false);
    }
  };

  const tp = profile?.trustPoints ?? 0;
  const badge = getBadge(tp);
  const progress = getProgressToNext(tp);
  const displayName = profile?.displayName ?? "Anonymous";

  return (
    <div className="flex flex-col h-full" data-testid="profile-page">
      <div className="flex-shrink-0 px-5 pt-12 pb-4" style={{ background: "rgba(13,13,18,0.95)" }}>
        <h1 className="text-2xl font-extrabold tracking-tight text-white" style={{ letterSpacing: "-0.02em" }}>
          Profile
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4 space-y-4">
        {/* Avatar + name */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center py-5"
        >
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mb-3"
            style={{
              background: `${badge.color}14`,
              border: `2px solid ${badge.color}40`,
              boxShadow: `0 0 20px ${badge.color}20`,
              fontSize: 38,
            }}
          >
            {badge.emoji}
          </div>

          {/* Editable name */}
          <div className="flex items-center gap-2 mb-1">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveName()}
                  maxLength={30}
                  className="text-base font-bold text-white bg-transparent border-b outline-none text-center"
                  style={{ borderColor: "#00b4ff", minWidth: 120 }}
                  placeholder="Your name"
                />
                <button
                  onClick={saveName}
                  disabled={upsertProfile.isPending}
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(0,180,255,0.2)" }}
                >
                  <Check size={13} style={{ color: "#00b4ff" }} />
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-bold text-white">{isLoading ? "…" : displayName}</h2>
                <button onClick={() => setEditingName(true)}>
                  <Pencil size={13} className="text-white/30" />
                </button>
              </>
            )}
          </div>

          <p className="text-xs font-semibold" style={{ color: badge.color }}>
            {badge.emoji} {badge.name}
          </p>

          {/* Stats */}
          <div className="flex gap-6 mt-4">
            <div className="text-center">
              <div className="text-xl font-extrabold" style={{ color: badge.color }}>{tp}</div>
              <div className="text-[10px] text-white/35">Trust pts</div>
            </div>
            <div className="w-px" style={{ background: "rgba(255,255,255,0.08)" }} />
            <div className="text-center">
              <div className="text-xl font-extrabold text-white">{profile?.totalReports ?? 0}</div>
              <div className="text-[10px] text-white/35">Reports</div>
            </div>
            <div className="w-px" style={{ background: "rgba(255,255,255,0.08)" }} />
            <div className="text-center">
              <div className="text-xl font-extrabold text-white">{tp}</div>
              <div className="text-[10px] text-white/35">Verified</div>
            </div>
          </div>
        </motion.div>

        {/* Trust progress bar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card rounded-2xl p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-white/70">Trust Level Progress</span>
            {badge.next ? (
              <span className="text-[10px] text-white/35">{tp} / {badge.next} pts to next</span>
            ) : (
              <span className="text-[10px]" style={{ color: badge.color }}>Max level reached!</span>
            )}
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${badge.color}88, ${badge.color})` }}
            />
          </div>
          <div className="flex justify-between mt-3">
            {BADGE_LEVELS.map((b) => (
              <div
                key={b.name}
                className="flex flex-col items-center gap-0.5"
                style={{ opacity: tp >= b.minPoints ? 1 : 0.3 }}
              >
                <span className="text-base">{b.emoji}</span>
                <span className="text-[8px]" style={{ color: b.color }}>{b.name}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Monitoring status */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-4 flex items-center gap-3"
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(0,180,255,0.12)", border: "1px solid rgba(0,180,255,0.25)" }}
          >
            <Radio size={18} style={{ color: "#00b4ff" }} />
          </div>
          <div>
            <div className="text-sm font-semibold text-white/90">Monitoring Active</div>
            <div className="text-xs text-white/40 mt-0.5">Receiving alerts within 500m radius</div>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#22c55e" }} />
            <span className="text-xs font-semibold" style={{ color: "#22c55e" }}>Live</span>
          </div>
        </motion.div>

        {/* ── Pinned Locations ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="glass-card rounded-2xl p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-semibold text-white/85">📍 Pinned Locations</div>
              <div className="text-[10px] text-white/35 mt-0.5">Get alerts from your saved spots</div>
            </div>
            {pins.length < 4 && (
              <button
                onClick={() => setAddingPin(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all active:scale-95"
                style={{
                  background: "rgba(0,180,255,0.14)",
                  border: "1px solid rgba(0,180,255,0.3)",
                  color: "#00b4ff",
                }}
              >
                <Plus size={11} />
                Add
              </button>
            )}
          </div>

          {/* Add pin form */}
          <AnimatePresence>
            {addingPin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-3 overflow-hidden"
              >
                <div
                  className="rounded-xl p-3 space-y-3"
                  style={{ background: "rgba(0,180,255,0.06)", border: "1px solid rgba(0,180,255,0.15)" }}
                >
                  {/* Preset buttons */}
                  <div className="flex gap-2 flex-wrap">
                    {PIN_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        onClick={() => { setPinEmoji(p.emoji); setPinLabel(p.label); }}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
                        style={{
                          background: pinLabel === p.label ? "rgba(0,180,255,0.2)" : "rgba(255,255,255,0.06)",
                          border: pinLabel === p.label ? "1px solid rgba(0,180,255,0.4)" : "1px solid rgba(255,255,255,0.08)",
                          color: pinLabel === p.label ? "#00b4ff" : "rgba(255,255,255,0.5)",
                        }}
                      >
                        {p.emoji} {p.label}
                      </button>
                    ))}
                  </div>
                  {/* Custom name input */}
                  <input
                    value={pinLabel}
                    onChange={(e) => setPinLabel(e.target.value)}
                    placeholder="Label (e.g. Home)"
                    maxLength={20}
                    className="w-full rounded-lg px-3 py-2 text-sm text-white/80 outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAddingPin(false)}
                      className="flex-1 py-2 rounded-xl text-[12px] font-semibold text-white/40"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddPin}
                      className="flex-1 py-2 rounded-xl text-[12px] font-semibold"
                      style={{ background: "rgba(0,180,255,0.22)", border: "1px solid rgba(0,180,255,0.4)", color: "#00b4ff" }}
                    >
                      📍 Pin current location
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pin list */}
          {pins.length === 0 && !addingPin && (
            <p className="text-[11px] text-white/25 text-center py-2">
              No pins yet — add Home or Office to get nearby alerts
            </p>
          )}

          <div className="space-y-2">
            {pins.map((pin) => (
              <div
                key={pin.id}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <span className="text-lg">{pin.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-white/80">{pin.label}</div>
                  <div className="text-[10px] text-white/30 truncate">
                    {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
                  </div>
                </div>
                <button
                  onClick={() => removePin(pin.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-95"
                  style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.18)" }}
                >
                  <Trash2 size={12} style={{ color: "#f87171" }} />
                </button>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Menu */}
        <div className="space-y-2">
          {menuItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.07 }}
                onClick={() => handleMenuClick(item)}
                className="w-full glass-card rounded-2xl p-4 flex items-center gap-3 text-left transition-all active:scale-[0.98]"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <Icon size={16} className="text-white/50" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white/85">{item.label}</div>
                  <div className="text-xs text-white/35 mt-0.5">{item.sub}</div>
                </div>
                <ChevronRight size={14} className="text-white/25" />
              </motion.button>
            );
          })}
        </div>

        {/* Action button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          onClick={signOut}
          className="w-full py-3 rounded-2xl text-xs font-bold transition-all active:scale-95 text-center mt-2 cursor-pointer"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.22)",
            color: "#f87171",
          }}
        >
          🔒 Sign Out from LivePulse
        </motion.button>

        <div className="text-center py-3">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #00c6ff, #0072ff)" }}>
              <div className="w-2 h-2 rounded-full bg-black" />
            </div>
            <span className="text-xs font-bold text-white/50">LivePulse</span>
          </div>
          <p className="text-[10px] text-white/20">Keeping cities informed, together</p>
        </div>
      </div>

      {/* ── REPORT A PROBLEM BOTTOM SHEET / MODAL Overlay ── */}
      <AnimatePresence>
        {showReportProblemModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center select-none">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isFeedbackSubmitting && setShowReportProblemModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            {/* Card Content */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative w-full max-w-md rounded-t-[32px] p-6 space-y-4 pb-10"
              style={{
                background: "linear-gradient(180deg, #161622 0%, #0d0d12 100%)",
                borderTop: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle size={18} className="text-rose-400" />
                  <h3 className="text-lg font-bold text-white">Report a Problem</h3>
                </div>
                <button
                  disabled={isFeedbackSubmitting}
                  onClick={() => setShowReportProblemModal(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 border border-white/10"
                >
                  <X size={14} className="text-white/60" />
                </button>
              </div>

              <p className="text-xs text-white/50 leading-relaxed">
                Describe the issue or feedback you are having with LivePulse app.
                Our team monitors this feedback continuously to make improvements.
              </p>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider font-extrabold text-white/40">
                  What went wrong?
                </label>
                <textarea
                  value={problemText}
                  onChange={(e) => setProblemText(e.target.value)}
                  placeholder="Tell us what is not working properly..."
                  disabled={isFeedbackSubmitting}
                  maxLength={1000}
                  rows={4}
                  className="w-full rounded-2xl p-4 text-xs bg-white/[0.04] border border-white/10 text-white/90 outline-none placeholder:text-white/20 focus:border-red-400/40 focus:ring-1 focus:ring-red-400/30 transition-all resize-none"
                />
                <div className="text-right text-[9px] text-white/30">
                  {problemText.length}/1000 characters
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={isFeedbackSubmitting}
                  onClick={() => setShowReportProblemModal(false)}
                  className="flex-1 py-3.5 rounded-2xl text-xs font-bold text-white/60 bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isFeedbackSubmitting || !problemText.trim()}
                  onClick={handleSubmitProblem}
                  className="flex-1 py-3.5 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  style={{
                    background: "linear-gradient(135deg, #f43f5e, #e11d48)",
                    opacity: !problemText.trim() ? 0.5 : 1,
                    boxShadow: "0 4px 12px rgba(225,29,72,0.25)"
                  }}
                >
                  {isFeedbackSubmitting ? (
                    <>
                      <div className="w-4.5 h-4.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Report"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
