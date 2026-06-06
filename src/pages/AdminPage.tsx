import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  Shield,
  ArrowLeft,
  Users,
  Activity,
  AlertTriangle,
  FileText,
  Mail,
  Calendar,
  Clock,
  CheckCircle,
  HelpCircle,
  Search,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirebase } from "@/components/FirebaseProvider";

interface User {
  fingerprint: string;
  displayName: string;
  createdAt: string;
  email?: string | null;
  lastActiveAt?: string | null;
}

interface Problem {
  id: string;
  userFingerprint: string;
  userEmail?: string | null;
  description: string;
  createdAt: string;
}

interface AdminStats {
  totalUsers: number;
  activeToday: number;
  reportsToday: number;
  problems: Problem[];
  users: User[];
}

function formatTimeAgo(isoString: string) {
  if (!isoString) return "Never";
  const d = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (60 * 1000));
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function AdminPage() {
  const [, setLocation] = useLocation();
  const { user } = useFirebase();
  const { toast } = useToast();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"problems" | "users">("problems");
  const [searchQuery, setSearchQuery] = useState("");
  const [maintenance, setMaintenance] = useState(false);
  const [togglingMaintenance, setTogglingMaintenance] = useState(false);

  // Guard routing unless email matches the admin account
  const isAdmin = user?.email === "ayaanamaan23@gmail.com";

  useEffect(() => {
    if (!isAdmin) {
      toast({
        title: "Access Restricted",
        description: "Only verified operators can command this panel.",
        variant: "destructive",
      });
      setLocation("/profile");
    }
  }, [isAdmin, setLocation, toast]);

  const fetchStats = async () => {
    if (!user?.email) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/stats?email=${encodeURIComponent(user.email)}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setMaintenance(!!data.maintenance);
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to retrieve stats");
      }
    } catch (err: any) {
      toast({
        title: "Admin Sync Failed",
        description: err.message || "Failed to communicate with administrative backend.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMaintenance = async () => {
    if (!user?.email || togglingMaintenance) return;
    try {
      setTogglingMaintenance(true);
      const nextState = !maintenance;
      const res = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          active: nextState,
        }),
      });

      if (res.ok) {
        setMaintenance(nextState);
        toast({
          title: nextState ? "Maintenance Lock Active" : "Maintenance Lock Removed",
          description: nextState
            ? "Site has been closed to standard users. Maintenance screen is now visible."
            : "Site has been opened back up to standard users.",
        });
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to update configuration.");
      }
    } catch (err: any) {
      toast({
        title: "Configuration Failed",
        description: err.message || "Failed to toggle maintenance mode.",
        variant: "destructive",
      });
    } finally {
      setTogglingMaintenance(false);
    }
  };

  useEffect(() => {
    if (isAdmin && user?.email) {
      fetchStats();
    }
  }, [isAdmin, user?.email]);

  if (!isAdmin) {
    return null;
  }

  // Filter issues based on description or email
  const filteredProblems = stats?.problems.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.description.toLowerCase().includes(q) ||
      (p.userEmail && p.userEmail.toLowerCase().includes(q))
    );
  }) || [];

  // Filter users based on display name or email
  const filteredUsers = stats?.users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q))
    );
  }) || [];

  return (
    <div className="flex flex-col h-full bg-[#0d0d12] text-white">
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-12 pb-4 bg-gradient-to-b from-[#161622] to-[#0d0d12] border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation("/profile")}
            className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10 active:scale-95 transition-all cursor-pointer"
          >
            <ArrowLeft size={16} className="text-white/70" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-cyan-400" />
              <h1 className="text-xl font-extrabold tracking-tight">Admin Console</h1>
            </div>
            <p className="text-[10px] text-white/40 mt-0.5">Logged in: {user?.email}</p>
          </div>
        </div>
      </div>

      {loading && !stats ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-white/45">Loading cockpit data...</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4">
          {/* Quick Bento Stats Grid */}
          <div className="grid grid-cols-3 gap-2">
            {/* Stat Item 1 */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-3 flex flex-col relative overflow-hidden"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <div className="text-[9px] uppercase tracking-wider font-extrabold text-white/30 flex items-center gap-1.5">
                <Users size={10} className="text-emerald-400" />
                Signups
              </div>
              <div className="text-xl font-black text-emerald-400 mt-2">
                {stats?.totalUsers ?? 0}
              </div>
              <div className="text-[8px] text-white/20 mt-1">Total Users</div>
            </motion.div>

            {/* Stat Item 2 */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="glass-card rounded-2xl p-3 flex flex-col relative overflow-hidden"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <div className="text-[9px] uppercase tracking-wider font-extrabold text-white/30 flex items-center gap-1.5">
                <Activity size={10} className="text-cyan-400" />
                Online
              </div>
              <div className="text-xl font-black text-cyan-400 mt-2 flex items-center gap-1.5">
                {stats?.activeToday ?? 0}
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              </div>
              <div className="text-[8px] text-white/20 mt-1">Active (24h)</div>
            </motion.div>

            {/* Stat Item 3 */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card rounded-2xl p-3 flex flex-col relative overflow-hidden"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <div className="text-[9px] uppercase tracking-wider font-extrabold text-white/30 flex items-center gap-1.5">
                <AlertTriangle size={10} className="text-amber-400" />
                Reports
              </div>
              <div className="text-xl font-black text-amber-300 mt-2">
                {stats?.reportsToday ?? 0}
              </div>
              <div className="text-[8px] text-white/20 mt-1">Today's Alerts</div>
            </motion.div>
          </div>

          {/* Maintenance Lock / Control Panel */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-card rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-3 h-3 rounded-full ${maintenance ? 'bg-amber-500 animate-pulse ring-4 ring-amber-500/15' : 'bg-emerald-500 ring-4 ring-emerald-500/15'}`} />
                <div>
                  <h3 className="text-xs font-bold tracking-wide text-white">
                    Maintained Option (سائٹ بند کریں)
                  </h3>
                  <p className="text-[10px] text-white/40 mt-0.5">
                    Toggle active downtime lock instantly
                  </p>
                </div>
              </div>
              
              {/* Custom Toggle Switch */}
              <button
                type="button"
                onClick={handleToggleMaintenance}
                disabled={togglingMaintenance}
                className={`w-11 h-6 rounded-full p-0.5 transition-colors relative duration-300 focus:outline-none cursor-pointer ${
                  maintenance ? "bg-amber-500" : "bg-white/10"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                    maintenance ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="text-[10px] text-white/50 leading-relaxed bg-white/[0.01] p-2.5 rounded-xl border border-white/[0.03]">
              {maintenance ? (
                <span className="text-amber-400 font-medium">
                  ⚠️ <strong>Sait Band Hai (Active):</strong> Logged-in citizen accounts are securely locked on an informational under-maintenance page. Admin is permitted to bypass the lock for easy toggle toggling.
                </span>
              ) : (
                <span className="text-white/60">
                  🟢 <strong>Chalu Hai (Operational):</strong> All users can normally access, report incidents, submit comments, and explore maps without interruption.
                </span>
              )}
            </div>
          </motion.div>

          {/* Tab Switchers */}
          <div className="flex rounded-xl p-1 bg-white/[0.04]" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
            <button
              onClick={() => { setActiveTab("problems"); setSearchQuery(""); }}
              className="flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all"
              style={{
                background: activeTab === "problems" ? "rgba(255,255,255,0.08)" : "transparent",
                color: activeTab === "problems" ? "#ffffff" : "rgba(255,255,255,0.5)",
              }}
            >
              <FileText size={13} className={activeTab === "problems" ? "text-rose-400" : ""} />
              Problem Reports ({stats?.problems.length ?? 0})
            </button>
            <button
              onClick={() => { setActiveTab("users"); setSearchQuery(""); }}
              className="flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all"
              style={{
                background: activeTab === "users" ? "rgba(255,255,255,0.08)" : "transparent",
                color: activeTab === "users" ? "#ffffff" : "rgba(255,255,255,0.5)",
              }}
            >
              <Users size={13} className={activeTab === "users" ? "text-cyan-400" : ""} />
              User Profiles ({stats?.users.length ?? 0})
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-3 text-white/20" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === "problems" ? "Search reported problems..." : "Search user accounts..."}
              className="w-full text-xs rounded-xl pl-10 pr-4 py-2.5 outline-none text-white/80 transition-colors bg-white/[0.03] border border-white/5 focus:border-cyan-400/40"
            />
          </div>

          {/* Tab Contents: reported problems list */}
          <AnimatePresence mode="wait">
            {activeTab === "problems" ? (
              <motion.div
                key="problems"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {filteredProblems.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <HelpCircle size={32} className="mx-auto text-white/10" />
                    <p className="text-xs text-white/35 font-semibold">No problems reported matching query.</p>
                  </div>
                ) : (
                  filteredProblems.map((prob) => (
                    <motion.div
                      key={prob.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-card rounded-2xl p-4 space-y-3"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                          <span className="text-[10px] font-black tracking-wider uppercase text-rose-400">
                            Problem Filed
                          </span>
                        </div>
                        <span className="text-[9px] text-white/30 flex items-center gap-1">
                          <Clock size={9} />
                          {formatTimeAgo(prob.createdAt)}
                        </span>
                      </div>

                      <p className="text-xs text-white/80 leading-relaxed font-medium bg-red-500/[0.02] p-2.5 rounded-xl border border-red-500/[0.05]">
                        {prob.description}
                      </p>

                      <div className="flex items-center gap-3 pt-1 border-t border-white/[0.04]">
                        {prob.userEmail ? (
                          <div className="flex items-center gap-1 text-[10px] text-white/50 max-w-[150px] truncate">
                            <Mail size={10} className="text-rose-400/70" />
                            {prob.userEmail}
                          </div>
                        ) : (
                          <div className="text-[10px] text-white/30">Anonymous reporter</div>
                        )}
                        <div className="w-px h-3 bg-white/10" />
                        <span className="text-[9px] text-white/35 font-mono truncate max-w-[120px]">
                          ID: {prob.userFingerprint?.slice(0, 8)}...
                        </span>
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            ) : (
              <motion.div
                key="users"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                {filteredUsers.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <Users size={32} className="mx-auto text-white/10" />
                    <p className="text-xs text-white/35 font-semibold">No users found matching query.</p>
                  </div>
                ) : (
                  filteredUsers.map((u) => {
                    const isOnline = u.lastActiveAt && (new Date().getTime() - new Date(u.lastActiveAt).getTime()) < 24 * 60 * 60 * 1000;
                    return (
                      <motion.div
                        key={u.fingerprint}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card rounded-2xl p-4 flex items-center gap-3"
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                          style={{
                            background: isOnline ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.03)",
                            border: isOnline ? "1px solid rgba(34,197,94,0.18)" : "1px solid rgba(255,255,255,0.06)",
                            color: isOnline ? "#4ade80" : "rgba(255,255,255,0.4)"
                          }}
                        >
                          {u.displayName?.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white/90 truncate block">{u.displayName}</span>
                            {isOnline && (
                              <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" title="Active today" />
                            )}
                          </div>
                          {u.email && (
                            <span className="text-[10px] text-white/40 block truncate">{u.email}</span>
                          )}
                          <span className="text-[9px] text-white/20 block font-mono mt-0.5 truncate">
                            UID: {u.fingerprint}
                          </span>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1 flex-shrink-0">
                          <div className="text-[9px] text-white/30 flex items-center gap-1">
                            <Calendar size={9} />
                            Joined {new Date(u.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </div>
                          <div className="text-[9px] text-white/35">
                            Active {formatTimeAgo(u.lastActiveAt || "")}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
