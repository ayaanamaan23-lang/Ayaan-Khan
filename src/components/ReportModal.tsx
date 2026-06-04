import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Sparkles, Send, Loader2, Mic, MicOff, Check, AlertCircle, RefreshCw } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCreateIncident,
  useProcessIncidentWithAI,
  getListIncidentsQueryKey,
  getGetIncidentStatsQueryKey,
} from '@/api-client';
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { CATEGORIES, getCategoryColor, getCategoryIcon } from "@/lib/categories";
import { getUserFingerprint } from "@/lib/fingerprint";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useGeolocation } from "@/hooks/useGeolocation";

const schema = z.object({
  category: z.string().min(1, "Please select an incident category"),
  customCategory: z.string().optional(),
  description: z.string().min(5, "Incident details must be at least 5 characters"),
  lat: z.number(),
  lng: z.number(),
});
type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ReportModal({ open, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<"voice" | "manual">("voice");
  const [locating, setLocating] = useState(false);
  const [locationCaptured, setLocationCaptured] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false); // is recording active
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [hasAppliedInitialLocation, setHasAppliedInitialLocation] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const qc = useQueryClient();
  const { toast } = useToast();
  const { position: geoPos } = useGeolocation();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: "",
      customCategory: "",
      description: "",
      lat: geoPos?.lat ?? 40.7128,
      lng: geoPos?.lng ?? -74.006,
    },
  });

  const lat = form.watch("lat");
  const lng = form.watch("lng");
  const category = form.watch("category");
  const description = form.watch("description");

  const createIncident = useCreateIncident();
  const processAI = useProcessIncidentWithAI();

  // Reset initial applied state on open or close
  useEffect(() => {
    if (open) {
      setHasAppliedInitialLocation(false);
    }
  }, [open]);

  // Set initial location from hook ONCE when modal is opened
  useEffect(() => {
    if (open && geoPos && !hasAppliedInitialLocation && !locationCaptured) {
      const gLat = geoPos.lat;
      const gLng = geoPos.lng;
      if (typeof gLat === "number" && typeof gLng === "number" && gLat !== 0) {
        form.setValue("lat", gLat);
        form.setValue("lng", gLng);
        setHasAppliedInitialLocation(true);
      }
    }
  }, [open, geoPos?.lat, geoPos?.lng, hasAppliedInitialLocation, locationCaptured]);

  // Clean up recording parameters on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // GPS capture
  function handleGetLocation() {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation not supported", variant: "destructive" });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        form.setValue("lat", pos.coords.latitude);
        form.setValue("lng", pos.coords.longitude);
        setLocating(false);
        setLocationCaptured(true);
        toast({ title: "📍 GPS Location Sync Successful!" });
      },
      () => {
        setLocating(false);
        toast({ title: "Could not fetch satellite location", variant: "destructive" });
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  // Native HTML5 Audio Recording and upload to Gemini
  async function startRecording() {
    audioChunksRef.current = [];
    setRecordSeconds(0);
    setVoiceTranscript("");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast({
        title: "Mic Access Offline",
        description: "Standard audio recording is not active or blocked in this browser context.",
        variant: "destructive"
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let recorder: MediaRecorder;
      try {
        let options = {};
        if (typeof MediaRecorder.isTypeSupported === "function") {
          if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
            options = { mimeType: "audio/webm;codecs=opus" };
          } else if (MediaRecorder.isTypeSupported("audio/webm")) {
            options = { mimeType: "audio/webm" };
          } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
            options = { mimeType: "audio/ogg" };
          } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
            options = { mimeType: "audio/mp4" };
          }
        }
        recorder = new MediaRecorder(stream, options);
      } catch (err) {
        console.warn("Failed standard MediaRecorder options, falling back to simple configuration:", err);
        recorder = new MediaRecorder(stream);
      }
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        setIsProcessingAudio(true);
        toast({
          title: "🤖 Analyzing speech audio...",
          description: "Enhancing voice and creating report details.",
        });

        reader.onloadend = async () => {
          try {
            const base64Audio = (reader.result as string).split(",")[1];
            
            const response = await fetch("/api/incidents/ai/process-audio", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                audio: base64Audio, 
                mimeType: audioBlob.type 
              }),
            });

            if (!response.ok) {
              throw new Error(`Server status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.description) {
              setVoiceTranscript(data.transcribedText || "Audio report recorded and summarized successfully.");
              form.setValue("category", data.category || "Other");
              form.setValue("description", data.description);
              toast({
                title: "✅ Refined Alert Dispatched to Form!",
                description: "Review details below and tap Dispatch when ready."
              });
            } else {
              throw new Error("Invalid response schema from server");
            }
          } catch (err: any) {
            console.error("Audio upload error:", err);
            toast({
              title: "AI Speech Sync Blocked",
              description: "Could not transcribe audio. Defaulted to manual category.",
              variant: "destructive"
            });
            setVoiceTranscript("Spoken voice captured (Transcription Offline)");
            form.setValue("category", "Other");
            form.setValue("description", "[Spoken Voice Alert] Manual entry review needed.");
          } finally {
            setIsProcessingAudio(false);
          }
        };
      };

      recorder.start();
      setVoiceListening(true);
      
      timerIntervalRef.current = setInterval(() => {
        setRecordSeconds((prev) => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);

      toast({
        title: "🎙️ Recording Voice...",
        description: "Speak clearly. Describe the road block, outage, bursts or hazards."
      });

    } catch (err: any) {
      console.error("Microphone hardware block:", err);
      toast({
        title: "Microphone Access Issue",
        description: "Please check your browser micro-permissions or open this site in a separate tab.",
        variant: "destructive"
      });
      setVoiceListening(false);
    }
  }

  function stopRecording() {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.error("Error stopping recorder:", err);
      }
    }
    setVoiceListening(false);
  }

  function toggleVoice() {
    if (voiceListening) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  function handleResetVoice() {
    setVoiceTranscript("");
    form.setValue("category", "");
    form.setValue("description", "");
  }

  function onSubmit(data: FormData) {
    const userId = getUserFingerprint();
    createIncident.mutate(
      { data: { ...data, userId } },
      {
        onSuccess: async (newIncident: any) => {
          // Direct authenticated write from client to Cloud Firestore
          try {
            await setDoc(doc(db, "incidents", String(newIncident.id)), {
              id: Number(newIncident.id),
              category: String(newIncident.category),
              customCategory: newIncident.customCategory || null,
              description: String(newIncident.description),
              lat: Number(newIncident.lat),
              lng: Number(newIncident.lng),
              status: String(newIncident.status),
              userId: String(newIncident.userId || userId),
              timestamp: String(newIncident.timestamp),
              trueVotes: Number(newIncident.trueVotes || 0),
              falseVotes: Number(newIncident.falseVotes || 0),
              isDuplicate: !!newIncident.isDuplicate
            });
          } catch (e) {
            console.error("Direct Firestore write failed for new incident:", e);
          }

          qc.invalidateQueries({ queryKey: getListIncidentsQueryKey() });
          qc.invalidateQueries({ queryKey: getGetIncidentStatsQueryKey() });
          toast({ title: "✅ Professional Civic Report Dispatched!" });
          
          form.reset({
            category: "",
            customCategory: "",
            description: "",
            lat: geoPos?.lat ?? 40.7128,
            lng: geoPos?.lng ?? -74.006,
          });
          setVoiceTranscript("");
          setLocationCaptured(false);
          onClose();
        },
        onError: (err: any) => {
          const errMsg = err?.data?.error || err?.message || "Failed to submit report";
          toast({
            title: "Submission Terminated",
            description: errMsg,
            variant: "destructive",
          });
        },
      }
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0"
            style={{ background: "rgba(0,0,0,0.85)", zIndex: 9000, backdropFilter: "blur(6px)" }}
            data-testid="modal-backdrop"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            className="fixed bottom-0 left-0 right-0 max-w-md mx-auto"
            style={{ zIndex: 9001 }}
            data-testid="report-modal"
          >
            <div
              className="rounded-t-[2.5rem] overflow-hidden"
              style={{
                background: "linear-gradient(185deg, rgba(20,24,35,0.99) 0%, rgba(11,13,18,1) 100%)",
                backdropFilter: "blur(40px)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderBottom: "none",
                boxShadow: "0 -15px 45px rgba(0,0,0,0.6)"
              }}
            >
              {/* Friction handle bar */}
              <div className="flex justify-center pt-4 pb-2">
                <div className="w-12 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
              </div>

              {/* Header Title section */}
              <div className="flex items-center justify-between px-6 pt-2 pb-4">
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
                    Civic Broadcaster <span className="text-xs bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">AI Live</span>
                  </h2>
                  <p className="text-xs text-white/45 mt-0.5">Choose your entry option to alert neighbors</p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all bg-white/5 border border-white/10 hover:bg-white/10 active:scale-90"
                  data-testid="modal-close"
                >
                  <X size={14} className="text-white/60" />
                </button>
              </div>

              <div className="overflow-y-auto" style={{ maxHeight: "75vh" }}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 pb-8 space-y-5">

                  {/* ── SEGMENTED SLIDING TAB ── */}
                  <div className="flex p-1 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setActiveTab("voice")}
                      className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 z-10 ${
                        activeTab === "voice" ? "text-slate-900" : "text-white/55 hover:text-white/80"
                      }`}
                    >
                      <Mic size={14} />
                      🎙️ AI Voice Report
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("manual")}
                      className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 z-10 ${
                        activeTab === "manual" ? "text-slate-900" : "text-white/55 hover:text-white/80"
                      }`}
                    >
                      <Sparkles size={14} />
                      ✏️ Manual Input
                    </button>

                    {/* sliding pill block */}
                    <div
                      className="absolute top-1 bottom-1 rounded-xl bg-white transition-all duration-300 ease-out"
                      style={{
                        width: "calc(50% - 4px)",
                        left: activeTab === "voice" ? "4px" : "calc(50% - 0px)",
                      }}
                    />
                  </div>

                  {/* ── TAB CONTENT: VOICE REPORT ── */}
                  {activeTab === "voice" && (
                    <div className="space-y-4">
                      {isProcessingAudio ? (
                        /* PROCESSING VOICE AI LOADER */
                        <div className="flex flex-col items-center justify-center py-10 px-4 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4 text-center">
                          <Loader2 size={36} className="animate-spin text-cyan-400" />
                          <div>
                            <h3 className="text-sm font-bold text-white">Enhancing Spoken Alert via AI...</h3>
                            <p className="text-xs text-white/40 mt-1 max-w-[270px] mx-auto leading-relaxed">
                              Gemini is transcribing, filtering verbal fillers, formatting standard titles and matching categories. Please wait.
                            </p>
                          </div>
                        </div>
                      ) : !voiceTranscript ? (
                        /* MIC SPEAK UI CORES */
                        <div className="flex flex-col items-center justify-center py-6 px-4 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4 text-center">
                          <div className="relative">
                            {/* Glow rings below */}
                            <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-xl scale-125" />
                            <AnimatePresence>
                              {voiceListening && (
                                <motion.div
                                  initial={{ scale: 0.8, opacity: 1 }}
                                  animate={{ scale: 1.6, opacity: 0 }}
                                  exit={{ scale: 0.8 }}
                                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
                                  className="absolute inset-0 rounded-full border border-red-500/50"
                                />
                              )}
                            </AnimatePresence>

                            <button
                              type="button"
                              onClick={toggleVoice}
                              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all bg-radial active:scale-95 duration-300 relative z-10 ${
                                voiceListening
                                  ? "bg-gradient-to-tr from-red-600 to-rose-500 shadow-lg shadow-red-500/30 ring-4 ring-rose-500/20"
                                  : "bg-gradient-to-tr from-cyan-600 to-sky-400 shadow-lg shadow-cyan-500/25 border border-white/20 ring-4 ring-cyan-500/10"
                              }`}
                            >
                              {voiceListening ? (
                                <MicOff size={28} className="text-white animate-pulse" />
                              ) : (
                                <Mic size={28} className="text-white" />
                              )}
                            </button>
                          </div>

                          <div>
                            <h3 className="text-sm font-bold text-white flex items-center justify-center gap-2">
                              {voiceListening ? (
                                <span className="flex items-center gap-1.5 text-red-400 font-extrabold animate-pulse">
                                  🔴 Recording {Math.floor(recordSeconds / 60)}:{(recordSeconds % 60).toString().padStart(2, "0")}
                                </span>
                              ) : (
                                "Tap to Record Voice"
                              )}
                            </h3>
                            <p className="text-xs text-white/40 mt-1 max-w-[270px] mx-auto leading-relaxed">
                              {voiceListening
                                ? "Describe the risk now (e.g. Traffic road failure, electric blackout, fire in market). Tap stop when finished."
                                : "Describe any neighborhood risk: speak naturally, system automatically transcribes and categorizes."}
                            </p>
                          </div>
                        </div>
                      ) : (
                        /* POST-VOICE AI RESULT CARD */
                        <div className="rounded-2xl p-4 bg-white/[0.03] border border-white/10 space-y-3 relative overflow-hidden transition-all">
                          {/* Top Tag */}
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1 bg-cyan-400/10 px-2 py-0.5 rounded-full">
                              <Sparkles size={8} />
                              AI Refined Event
                            </span>
                            <button
                              type="button"
                              onClick={handleResetVoice}
                              className="text-white/40 hover:text-white/75 flex items-center gap-1 text-[10px] font-semibold"
                            >
                              <RefreshCw size={10} />
                              Re-record Voice
                            </button>
                          </div>

                          <div className="space-y-2.5">
                            {/* Voice quote */}
                            <div className="p-2.5 rounded-xl bg-white/[0.02] border-l-2 border-white/25 text-xs text-white/50 italic font-medium leading-relaxed">
                              "{voiceTranscript}"
                            </div>

                            {/* Form preview elements */}
                            <div className="space-y-1">
                              <span className="text-[9px] font-semibold text-white/30 uppercase tracking-wide block">Assigned Alert Topic</span>
                              <div className="text-xs font-medium text-white bg-white/[0.04] p-3 rounded-xl border border-white/5 leading-relaxed">
                                {description || "Awaiting AI interpretation..."}
                              </div>
                            </div>

                            {category && (
                              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5">
                                <span className="text-[9px] font-semibold text-white/30 uppercase tracking-wide">Category Match</span>
                                <span
                                  className="text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5"
                                  style={{
                                    background: `${getCategoryColor(category)}14`,
                                    color: getCategoryColor(category),
                                  }}
                                >
                                  <span>{getCategoryIcon(category)}</span>
                                  {category}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── TAB CONTENT: MANUAL INPUT ── */}
                  {activeTab === "manual" && (
                    <div className="space-y-4">
                      {/* Category field */}
                      <div>
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2 block">
                          Incident Category
                        </label>
                        <select
                          data-testid="select-category"
                          {...form.register("category")}
                          className="w-full rounded-xl px-4 py-3 text-sm text-white/90 outline-none appearance-none"
                          style={{
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          <option value="" className="bg-gray-900">Select Category</option>
                          {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat} className="bg-gray-900">{cat}</option>
                          ))}
                        </select>
                        {form.formState.errors.category && (
                          <p className="text-red-400 text-xs mt-1">{form.formState.errors.category.message}</p>
                        )}
                      </div>

                      {/* Custom input logic for 'Other' category */}
                      {category === "Other" && (
                        <div className="animate-slideDown">
                          <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2 block">
                            Custom Category Label
                          </label>
                          <input
                            data-testid="input-custom-category"
                            {...form.register("customCategory")}
                            placeholder="Describe specific risk type..."
                            className="w-full rounded-xl px-4 py-3 text-sm text-white/90 placeholder-white/20 outline-none"
                            style={{
                              background: "rgba(255,255,255,0.06)",
                              border: "1px solid rgba(255,255,255,0.08)",
                            }}
                          />
                        </div>
                      )}

                      {/* Manual text description */}
                      <div>
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2 block">
                          Topic & Description
                        </label>
                        <textarea
                          data-testid="textarea-description"
                          {...form.register("description")}
                          placeholder="Type factual civic issue topic. Mention street or cross junctions if known."
                          rows={4}
                          className="w-full rounded-xl px-4 py-3 text-sm text-white/90 placeholder-white/20 outline-none resize-none leading-relaxed"
                          style={{
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.08)",
                          }}
                        />
                        {form.formState.errors.description && (
                          <p className="text-red-400 text-xs mt-1">{form.formState.errors.description.message}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── SECTION 2: LIVE LOCATION CAPTURE ── */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                      📍 Incident Location
                    </span>
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      disabled={locating}
                      data-testid="button-get-location"
                      className="flex items-center gap-3 w-full rounded-2xl p-4 text-xs font-semibold text-left transition-all active:scale-[0.98]"
                      style={{
                        background: locationCaptured ? "rgba(34,197,94,0.05)" : "rgba(255,255,255,0.03)",
                        border: locationCaptured ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(255,255,255,0.06)",
                        color: locationCaptured ? "#4ade80" : "rgba(255,255,255,0.5)",
                      }}
                    >
                      <div className="flex-shrink-0">
                        {locating ? (
                          <Loader2 size={16} className="animate-spin text-cyan-400" />
                        ) : locationCaptured ? (
                          <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/30">
                            <Check size={11} className="text-green-400" />
                          </div>
                        ) : (
                          <MapPin size={16} className="text-cyan-400/80 animate-bounce" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-white">
                          {locating ? "Satellite Locating..." : locationCaptured ? "GPS Geolocation Sync OK" : "Auto-Capture Geolocation"}
                        </div>
                        <div className="text-[10px] text-white/35 mt-0.5 truncate">
                          {locating ? "Locking GPS co-ordinate fix..." : locationCaptured ? `Verified at coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}` : "Tap to query live satellite GPS position"}
                        </div>
                      </div>

                      {!locating && !locationCaptured && (
                        <span className="text-[10px] bg-cyan-700/10 text-cyan-400 px-2.5 py-1 rounded-lg border border-cyan-500/20 font-bold ml-auto hover:bg-cyan-500/15">
                          Tap to Detect
                        </span>
                      )}
                    </button>
                  </div>

                  {/* ── BROADCAST SUBMIT TRIGGER ── */}
                  <button
                    type="submit"
                    disabled={createIncident.isPending || !category || !description}
                    data-testid="button-submit-report"
                    className="flex items-center justify-center gap-2.5 w-full rounded-2xl py-4 font-bold text-sm text-slate-900 transition-all active:scale-[0.98] disabled:opacity-35 disabled:pointer-events-none cursor-pointer mt-2"
                    style={{
                      background: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)",
                      boxShadow: "0 4px 15px rgba(6,182,212,0.2)"
                    }}
                  >
                    {createIncident.isPending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Send size={15} />
                    )}
                    Dispatch Civic Incident Report
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
