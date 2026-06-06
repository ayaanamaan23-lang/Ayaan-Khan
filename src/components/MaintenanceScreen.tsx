import * as React from "react";
import { motion } from "motion/react";
import { Wrench, RefreshCw, ShieldAlert } from "lucide-react";

interface MaintenanceScreenProps {
  onCheckStatus: () => void;
  isChecking: boolean;
}

export default function MaintenanceScreen({ onCheckStatus, isChecking }: MaintenanceScreenProps) {
  return (
    <div 
      className="flex items-center justify-center min-h-screen w-full px-6" 
      style={{ background: "#0d0d12" }}
      id="maintenance-viewport"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-sm rounded-[24px] p-6 text-center space-y-6 relative overflow-hidden flex flex-col items-center"
        style={{
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
        }}
        id="maintenance-box"
      >
        {/* Neon decorative background glow */}
        <div 
          className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full filter blur-[100px] pointer-events-none opacity-20"
          style={{ background: "radial-gradient(circle, #f59e0b, transparent)" }}
        />

        {/* Floating status badge */}
        <div 
          className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/30 flex items-center gap-1.5 animate-pulse"
          id="maintenance-badge"
        >
          <ShieldAlert size={10} />
          Maintained / عارضی بندش
        </div>

        {/* Animating Wrench Hub */}
        <div className="relative w-20 h-20 flex items-center justify-center mt-2" id="maintenance-icon-wrapper">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
            className="absolute inset-0 rounded-full border border-dashed border-amber-500/30"
          />
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <Wrench size={32} className="animate-pulse" />
          </div>
        </div>

        <div className="space-y-3" id="maintenance-text-group">
          {/* Main Title English/Urdu */}
          <h1 className="text-xl font-extrabold tracking-tight text-white font-sans" id="maintenance-title">
            Site Par Kaam Chal Raha Hai
          </h1>
          <h2 className="text-sm font-semibold text-amber-300 font-sans" id="maintenance-subtitle">
            سائٹ عارضی طور پر بند ہے
          </h2>
          
          {/* Paragraph explanation description */}
          <p className="text-xs text-white/50 leading-relaxed font-normal" id="maintenance-description">
            The application is temporarily offline for essential maintenance. Our operator is working hard to deploy updates. Please check back shortly.
          </p>

          <p className="text-[11px] text-white/35 leading-relaxed font-normal italic font-sans" id="maintenance-description-urdu">
            سائٹ کو بہتر بنانے کے لیے عارضی کام جاری ہے، ہم بہت جلد دوبارہ لائیو ہوں گے۔ آپ کے صبر کا بے حد شکریہ۔
          </p>
        </div>

        {/* Reload retry button widget */}
        <button
          id="maintenance-reload-btn"
          onClick={onCheckStatus}
          disabled={isChecking}
          className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 active:scale-98 transition-all flex items-center justify-center gap-2 text-white/80 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={13} className={`${isChecking ? "animate-spin text-amber-400" : ""}`} />
          {isChecking ? "Checking Status..." : "Dobaara Check Karen (Check Status)"}
        </button>

        <div className="text-[9px] text-white/20 font-mono tracking-wider" id="maintenance-footer">
          OPERATOR BYPASS MODE PERMITTED
        </div>
      </motion.div>
    </div>
  );
}
