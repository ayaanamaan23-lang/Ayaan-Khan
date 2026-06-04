import * as React from "react";
import { motion } from "framer-motion";
import { Radio, Shield, MapPin, Activity } from "lucide-react";
import { useFirebase } from "@/components/FirebaseProvider";

export default function LoginPage() {
  const { signInWithGoogle, loading } = useFirebase();

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen w-full px-6 relative overflow-hidden"
      style={{ background: "#0d0d12" }}
      data-testid="login-page"
    >
      {/* Visual background accents */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-64 h-64 rounded-full filter blur-[100px] opacity-20 pointer-events-none" style={{ background: "#00b4ff" }} />
      <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 w-80 h-80 rounded-full filter blur-[120px] opacity-10 pointer-events-none" style={{ background: "#fb923c" }} />

      <div className="w-full max-w-sm flex flex-col items-center relative z-10 space-y-8 text-center">
        {/* Glowing Brand Pulse Icon */}
        <div className="relative">
          {/* Animated concentric pulses */}
          <motion.div
            animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="absolute inset-0 rounded-full w-20 h-20 bg-sky-500/10 border border-sky-400/20"
          />
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [0.8, 0, 0.8] }}
            transition={{ repeat: Infinity, duration: 3, delay: 1, ease: "easeInOut" }}
            className="absolute inset-0 rounded-full w-20 h-20 bg-sky-500/15 border border-sky-400/30"
          />

          {/* Core App Icon */}
          <div
            className="w-20 h-20 rounded-[24px] flex items-center justify-center relative z-10 border border-sky-400/30 shadow-lg"
            style={{
              background: "linear-gradient(135deg, rgba(22,25,38,0.95), rgba(13,13,18,0.98))",
              boxShadow: "0 0 30px rgba(0,180,255,0.25)",
            }}
          >
            <Radio className="w-9 h-9 text-sky-400 animate-pulse" />
          </div>
        </div>

        {/* Hero Title details */}
        <div className="space-y-2">
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-extrabold tracking-tight text-white mb-1"
            style={{ letterSpacing: "-0.03em" }}
          >
            Live<span className="text-sky-400">Pulse</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-xs text-white/40 uppercase tracking-widest font-mono"
          >
            Citizen Co-monitoring Network
          </motion.p>
        </div>

        {/* Feature Cards matching app glass theme */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card w-full rounded-2xl p-5 text-left space-y-4"
        >
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Activity className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white/90">Real-time City Alerts</h3>
              <p className="text-[11px] text-white/45 mt-0.5">Instant community warning notifications for utilities, fires, and safety.</p>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Shield className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white/90">Decentralized Trust Verification</h3>
              <p className="text-[11px] text-white/45 mt-0.5">Consensus-based incident reports verified by citizen upvotes and contributions.</p>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MapPin className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white/90">Location Guard Alerts</h3>
              <p className="text-[11px] text-white/45 mt-0.5">Pin major locations like Work and Home to filter and secure your neighborhoods.</p>
            </div>
          </div>
        </motion.div>

        {/* Action controls button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full space-y-4"
        >
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl hover:opacity-90 active:scale-95 transition-all text-sm font-semibold border"
            style={{
              background: "rgba(0,180,255,0.14)",
              borderColor: "rgba(0,180,255,0.3)",
              color: "#00b4ff",
              boxShadow: "0 4px 15px rgba(0,180,255,0.1)",
            }}
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {/* Standard flat Google icon */}
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.08H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.92l2.85-2.22c-.87-2.6-3.3-4.53-6.16-4.53z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.08l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google Account
              </>
            )}
          </button>

          <p className="text-[10px] text-white/20">
            By logging in you agree to contribute real and verified reports to
            the city's network. Keep details objective.
          </p>
        </motion.div>
      </div>

      {/* Humble branding credits */}
      <div className="absolute bottom-6 text-center z-10">
        <p className="text-[10px] text-white/25">LivePulse. Decentralized, Citizen-First.</p>
      </div>
    </div>
  );
}
