import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDocs, setDoc, deleteDoc } from "firebase/firestore";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "20mb" }));

// ── DATABASE PERSISTENCE layer (db.json / Firestore) ──────────────────────────
const DB_FILE = path.join(process.cwd(), "db.json");

interface Incident {
  id: number;
  category: string;
  customCategory?: string | null;
  description: string;
  lat: number;
  lng: number;
  status: "Pending" | "Verified" | "Resolved";
  userId?: string | null;
  timestamp: string; // ISO string
  trueVotes: number;
  falseVotes: number;
  isDuplicate: boolean;
}

interface Vote {
  id: number;
  incidentId: number;
  userFingerprint: string;
  vote: boolean;
  createdAt: string; // ISO string
}

interface Comment {
  id: number;
  incidentId: number;
  userFingerprint: string;
  displayName: string;
  body: string;
  createdAt: string; // ISO string
}

interface User {
  fingerprint: string;
  displayName: string;
  createdAt: string; // ISO string
  email?: string | null;
  lastActiveAt?: string | null; // ISO string
}

interface Problem {
  id: string;
  userFingerprint: string;
  userEmail?: string | null;
  description: string;
  createdAt: string; // ISO string
}

interface DBState {
  incidents: Incident[];
  votes: Vote[];
  comments: Comment[];
  users: User[];
  problems: Problem[];
}

let dbState: DBState = {
  incidents: [],
  votes: [],
  comments: [],
  users: [],
  problems: [],
};

// ── FIREBASE BACKEND SYNCHRONIZATION ──────────────────────────────────────────
let db: any = null;
try {
  const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(firebaseConfigPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf8"));
    const firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
    console.log(`[Firebase] Server-side Firestore configured using ID: ${firebaseConfig.firestoreDatabaseId}`);
  } else {
    console.warn("[Firebase] Config file not found, running exclusively on database state.");
  }
} catch (error) {
  console.warn("[Firebase] Failed to initialize server Firestore client:", error);
}

async function syncFromFirestore() {
  if (!db) return;
  try {
    console.log("[Firebase] Synced database data from Cloud Firestore...");

    // Incidents
    const incidentsSnapshot = await getDocs(collection(db, "incidents"));
    const loadedIncidents: Incident[] = [];
    incidentsSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      loadedIncidents.push({
        id: Number(data.id),
        category: String(data.category),
        customCategory: data.customCategory || null,
        description: String(data.description),
        lat: Number(data.lat),
        lng: Number(data.lng),
        status: data.status as "Pending" | "Verified" | "Resolved",
        userId: data.userId || null,
        timestamp: String(data.timestamp),
        trueVotes: Number(data.trueVotes || 0),
        falseVotes: Number(data.falseVotes || 0),
        isDuplicate: !!data.isDuplicate
      });
    });
    if (loadedIncidents.length > 0) {
      dbState.incidents = loadedIncidents;
    }

    // Votes
    const votesSnapshot = await getDocs(collection(db, "votes"));
    const loadedVotes: Vote[] = [];
    votesSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      loadedVotes.push({
        id: Number(data.id),
        incidentId: Number(data.incidentId),
        userFingerprint: String(data.userFingerprint),
        vote: !!data.vote,
        createdAt: String(data.createdAt)
      });
    });
    if (loadedVotes.length > 0) {
      dbState.votes = loadedVotes;
    }

    // Comments
    const commentsSnapshot = await getDocs(collection(db, "comments"));
    const loadedComments: Comment[] = [];
    commentsSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      loadedComments.push({
        id: Number(data.id),
        incidentId: Number(data.incidentId),
        userFingerprint: String(data.userFingerprint),
        displayName: String(data.displayName || "Anonymous"),
        body: String(data.body),
        createdAt: String(data.createdAt)
      });
    });
    if (loadedComments.length > 0) {
      dbState.comments = loadedComments;
    }

    // Users
    const usersSnapshot = await getDocs(collection(db, "users"));
    const loadedUsers: User[] = [];
    usersSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      loadedUsers.push({
        fingerprint: String(data.fingerprint || docSnap.id),
        displayName: String(data.displayName || "Anonymous User"),
        createdAt: String(data.createdAt || new Date().toISOString()),
        email: data.email || null,
        lastActiveAt: data.lastActiveAt || null,
      });
    });
    if (loadedUsers.length > 0) {
      dbState.users = loadedUsers;
    }

    // Problems
    try {
      const problemsSnapshot = await getDocs(collection(db, "problems"));
      const loadedProblems: Problem[] = [];
      problemsSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        loadedProblems.push({
          id: String(data.id || docSnap.id),
          userFingerprint: String(data.userFingerprint || ""),
          userEmail: data.userEmail || null,
          description: String(data.description || ""),
          createdAt: String(data.createdAt || new Date().toISOString()),
        });
      });
      dbState.problems = loadedProblems;
    } catch (pe) {
      console.warn("[Firebase] Could not sync problems collection:", pe);
    }

    saveDB();
  } catch (error) {
    console.warn("[Firebase] Could not sync database state with Firestore:", error);
  }
}

async function persistIncident(incident: Incident) {
  // Bypassed on the unauthenticated server (the authenticated client writes directly to Firestore instead)
  return;
}

async function persistVote(vote: Vote) {
  // Bypassed on the unauthenticated server
  return;
}

async function persistComment(comment: Comment) {
  // Bypassed on the unauthenticated server
  return;
}

async function persistUser(user: User) {
  // Bypassed on the unauthenticated server
  return;
}

async function removeIncident(id: number) {
  // Bypassed on the unauthenticated server
  return;
}

function seedDB() {
  dbState.incidents = [];
  dbState.votes = [];
  dbState.comments = [];
  dbState.users = [];
  saveDB();
}

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf8");
      dbState = JSON.parse(data);
      // Clean out legacy seeded users/data immediately on boot
      if (dbState.users.some(u => u.fingerprint === "usr_seed_1" || u.fingerprint === "usr_seed_2")) {
        console.log("[DB] Flushed legacy fake seeds to keep database completely authentic.");
        seedDB();
      } else {
        console.log(`[DB] Loaded ${dbState.incidents.length} incidents, ${dbState.votes.length} votes, ${dbState.comments.length} comments.`);
      }
    } else {
      console.log("[DB] Seeding empty database state...");
      seedDB();
    }
  } catch (error) {
    console.warn("[DB] Error loading database file, using defaults:", error);
  }
}

function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), "utf8");
  } catch (error) {
    console.error("[DB] Error writing database file:", error);
  }
}

loadDB();

// ── UTILS ─────────────────────────────────────────────────────────────────
const VERIFY_THRESHOLD = 5;
const REJECT_THRESHOLD = 5;

function calcDistanceMi(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getBadge(trustPoints: number): string {
  if (trustPoints >= 50) return "🏆 Protector";
  if (trustPoints >= 25) return "⭐ Sentinel";
  if (trustPoints >= 10) return "🛡️ Guardian";
  if (trustPoints >= 5)  return "🏅 Reporter";
  if (trustPoints >= 1)  return "📍 Observer";
  return "🌱 Newcomer";
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Traffic: ["traffic", "jam", "accident", "road", "car", "vehicle", "block", "raste", "sadak", "gaadi", "bandh", "signal"],
  Power: ["bijli", "light", "power", "electricity", "outage", "current", "electric", "blackout"],
  Water: ["water", "paani", "flood", "pipe", "leak", "sewage", "drain", "naali", "baarish"],
  Fire: ["fire", "aag", "smoke", "dhuan", "burn", "explosion", "blast"],
  ATM: ["atm", "cash", "bank", "machine", "withdraw"],
  Internet: ["internet", "wifi", "network", "broadband", "connection", "down", "slow"],
};

function ruleBasedProcess(rawText: string): { category: string; description: string } {
  const lower = rawText.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      const capFirst = rawText.trim().charAt(0).toUpperCase() + rawText.trim().slice(1);
      const description = capFirst.endsWith(".") ? capFirst : capFirst + ".";
      return { category: cat === "Fire" ? "Fire/Emergency" : cat, description };
    }
  }
  return { category: "Other", description: rawText.trim() };
}

// ── GEMINI INTEGRATION ────────────────────────────────────────────────────
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

async function callGemini(systemPrompt: string, userPrompt: string, retries = 3): Promise<string> {
  if (!ai) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `${systemPrompt}\n\n${userPrompt}`,
        config: {
          responseMimeType: "application/json",
        },
      });
      return response.text ?? "{}";
    } catch (err: any) {
      if (err?.status === 429 && attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Gemini API call retries exceeded");
}

// ── API ROUTES ────────────────────────────────────────────────────────────

// GET /api/health & /api/healthz
app.get(["/api/health", "/api/healthz"], (req, res) => {
  res.json({ status: "ok" });
});

// GET /api/incidents - List all incidents
app.get("/api/incidents", (req, res) => {
  const lat = req.query.lat ? parseFloat(req.query.lat as string) : null;
  const lng = req.query.lng ? parseFloat(req.query.lng as string) : null;
  const radius = req.query.radius ? parseFloat(req.query.radius as string) : null; // In meters

  const METERS_PER_MILE = 1609.34;
  const radiusMi = radius != null ? radius / METERS_PER_MILE : null;
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

  const result = dbState.incidents
    .map((r) => {
      const distanceMi = (lat != null && lng != null)
        ? parseFloat(calcDistanceMi(lat, lng, r.lat, r.lng).toFixed(2))
        : null;
      
      const commentCount = dbState.comments.filter((c) => c.incidentId === r.id).length;

      return {
        ...r,
        distanceMi,
        commentCount,
      };
    })
    .filter((r) => {
      // 1-Day (24h) absolute reset - expire older reports
      if (new Date(r.timestamp).getTime() < oneDayAgo) return false;
      if (radiusMi != null && r.distanceMi != null && r.distanceMi > radiusMi) return false;
      if (r.isDuplicate) return false;
      return true;
    })
    // Sort by timestamp desc
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  res.json(result);
});

// POST /api/incidents - Create a new incident
app.post("/api/incidents", async (req, res) => {
  const { category, customCategory, description, lat, lng, userId } = req.body;

  if (!category || !description || lat === undefined || lng === undefined) {
    res.status(400).json({ error: "Missing required fields (category, description, lat, lng)" });
    return;
  }

  // ── SYNCHRONOUS AI VALIDATION (SCAMS / SPAM / DUPLICATE DETECTOR) ─────────────
  if (ai) {
    try {
      // Find candidate incidents reported in last 24 hours within 0.5 miles
      const candidates = dbState.incidents.filter((r) => {
        if (calcDistanceMi(parseFloat(lat), parseFloat(lng), r.lat, r.lng) > 0.5) return false;
        const hoursOld = (Date.now() - new Date(r.timestamp).getTime()) / (1000 * 60 * 60);
        return hoursOld <= 24;
      });

      const systemPrompt = `You are an AI city emergency and local alert validator.
Evaluate the reporter's input criteria.
Rules to check:
1. SPAM / SCAMS / OFF-TOPIC: Citizen alerts are strictly reserved for civic or local public incidents (Traffic congestion/accidents, power outages, pipe burst/water flooding, internet/fiber down, localized fire, ATM cash outages, general civil risk, damaged roads, broken street lamps). Anything else, e.g. promo links, earning money online, test strings (like "asdf"), random user text, or trolling, is SPAM or SCAM.
2. DUPLICATES: Identify if this new report is the exact same event as any incident reported recently nearby.

Recent incidents reported nearby in last 24 hours:
${candidates.map((c) => `- [ID: ${c.id}] Category: ${c.category}, Description: "${c.description}"`).join("\n")}

Respond strictly with a JSON object format:
{
  "isSpamOrScam": true/false,
  "spamReason": "Readable rejection message explaining the scam/spam if true, otherwise empty",
  "isDuplicate": true/false,
  "duplicateOfId": number_or_null,
  "duplicateReason": "Precise explanatory message stating which nearby alert already covers it, otherwise empty"
}`;

      const userText = `Category: ${category} ${customCategory ? `(${customCategory})` : ""}
Description: "${description}"`;

      const gResponse = await callGemini(systemPrompt, userText);
      const valOutcome = JSON.parse(gResponse) as {
        isSpamOrScam?: boolean;
        spamReason?: string;
        isDuplicate?: boolean;
        duplicateOfId?: number | null;
        duplicateReason?: string;
      };

      if (valOutcome.isSpamOrScam === true) {
        res.status(400).json({ error: valOutcome.spamReason || "This report has been flagged as spam, off-topic, or a scam by AI moderation." });
        return;
      }

      if (valOutcome.isDuplicate === true) {
        res.status(409).json({ error: valOutcome.duplicateReason || "This localized problem is already reported nearby. Please check active reports map!" });
        return;
      }
    } catch (err) {
      console.warn("[AI] Sync validation bypassed due to error:", err);
    }
  }

  const newId = dbState.incidents.length > 0 ? Math.max(...dbState.incidents.map((i) => i.id)) + 1 : 1;
  const newIncident: Incident = {
    id: newId,
    category,
    customCategory: customCategory || null,
    description,
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    status: "Pending",
    userId: userId || null,
    timestamp: new Date().toISOString(),
    trueVotes: 0,
    falseVotes: 0,
    isDuplicate: false,
  };

  dbState.incidents.push(newIncident);
  saveDB();
  persistIncident(newIncident); // Cloud Firestore Sync Write

  res.status(201).json({ ...newIncident, distanceMi: null, commentCount: 0 });
});

// GET /api/incidents/stats/summary - Summary charts
app.get("/api/incidents/stats/summary", (req, res) => {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  // Stats also reset every 24h to map current day summary metrics cleanly
  const rows = dbState.incidents.filter((r) => new Date(r.timestamp).getTime() > oneDayAgo);
  const total = rows.length;
  const pending = rows.filter((r) => r.status === "Pending").length;
  const verified = rows.filter((r) => r.status === "Verified").length;
  const resolved = rows.filter((r) => r.status === "Resolved").length;

  const categoryMap: Record<string, number> = {};
  for (const r of rows) {
    categoryMap[r.category] = (categoryMap[r.category] ?? 0) + 1;
  }
  const byCategory = Object.entries(categoryMap).map(([category, count]) => ({ category, count }));

  res.json({ total, pending, verified, resolved, byCategory });
});

// POST /api/incidents/ai/process - Process incident
app.post("/api/incidents/ai/process", async (req, res) => {
  const { rawText } = req.body;
  if (!rawText) {
    res.status(400).json({ error: "Missing rawText in request body" });
    return;
  }

  if (!ai) {
    console.log("[AI] No GEMINI_API_KEY configured. Falling back to rule-based.");
    const fallback = ruleBasedProcess(rawText);
    res.json({ ...fallback, suggestedLocation: null });
    return;
  }

  const systemPrompt = `You are a professional city alert coordinator. Given raw citizen text (which might be spoken voice transcript or brief typed descriptions), refine it into a highly professional, polite public security alert.
Guidelines:
1. Strip any conversational voice filler words ("brother", "hey", "hello", "bhai", "yaar", "umm", "actually", "like") or greetings.
2. Map it to one of these valid categories: Traffic, Power, ATM, Internet, Fire/Emergency, Water, Other.
3. Rewrite the primary description starting with a descriptive bracketed Topic header, e.g.:
   "[Water Main Burst] Major pipe burst causing structural surface flooding."
   "[Extreme Traffic Jam] Massive vehicle congestion reported along the main avenue."
4. Maintain a strictly formal, objective, objective third-person tone.
5. If the input is completely nonsensical gibberish or spam, do not refuse, but rewrite it into a polite, clear notification under category "Other".

Respond ONLY with valid JSON in this exact format:
{"category": "...", "description": "...", "suggestedLocation": "...or null"}`;

  try {
    const rawResult = await callGemini(systemPrompt, `Raw text details: "${rawText}"`);
    const parsed = JSON.parse(rawResult) as {
      category?: string;
      description?: string;
      suggestedLocation?: string | null;
    };
    res.json({
      category: parsed.category ?? "Other",
      description: parsed.description ?? rawText,
      suggestedLocation: parsed.suggestedLocation ?? null,
    });
  } catch (err) {
    console.warn("[AI] Gemini process error, falling back to rule-based:", err);
    const fallback = ruleBasedProcess(rawText);
    res.json({ ...fallback, suggestedLocation: null });
  }
});

// POST /api/incidents/ai/process-audio - Process recorded audio using Gemini
app.post("/api/incidents/ai/process-audio", async (req, res) => {
  const { audio, mimeType } = req.body;
  if (!audio) {
    res.status(400).json({ error: "Missing audio base64 data" });
    return;
  }

  if (!ai) {
    console.log("[AI] No GEMINI_API_KEY configured for voice processing.");
    res.status(503).json({ error: "AI transcription engine not configured or offline" });
    return;
  }

  const systemPrompt = `You are a professional city alert coordinator.
You will see a base64 audio recording of a user describing an incident/problem in their neighborhood.
Listen attentively to their spoken words.
Extract:
1. One category from: Traffic, Power, ATM, Internet, Fire/Emergency, Water, Other.
2. A formal description of the issue.
3. The transcribed text of what the user literally said in the audio.
Guidelines:
- Strip any conversational voice filler words or greetings (e.g., "brother", "bhai", "yaar", "actually", "like").
- Keep it highly professional, polite, and clean.
- Format the description starting with a descriptive bracketed Topic header, e.g. "[Power Interruption] Total electric blackout in neighborhood."
- Do not make up information that was not said in the audio.
- Match one of the specified categories.

Respond ONLY with valid JSON in this exact format:
{"category": "...", "description": "...", "transcribedText": "..."}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        { text: systemPrompt },
        {
          inlineData: {
            mimeType: mimeType || "audio/webm",
            data: audio
          }
        }
      ],
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text ?? "{}";
    const parsed = JSON.parse(text) as {
      category?: string;
      description?: string;
      transcribedText?: string;
    };

    res.json({
      category: parsed.category ?? "Other",
      description: parsed.description ?? "Spoken audio report captured",
      transcribedText: parsed.transcribedText ?? ""
    });
  } catch (err: any) {
    console.error("[AI] Error processing audio with Gemini:", err);
    res.status(500).json({ error: "Could not transcribe or process civic report: " + err.message });
  }
});

// POST /api/incidents/ai/describe - Describe topic quickly
app.post("/api/incidents/ai/describe", async (req, res) => {
  const { topic } = req.body;
  if (!topic) {
    res.status(400).json({ error: "Missing topic in request body" });
    return;
  }

  if (!ai) {
    console.log("[AI] No GEMINI_API_KEY configured. Falling back to rule-based parsing.");
    const fallback = ruleBasedProcess(topic);
    res.json({ ...fallback, suggestedLocation: null });
    return;
  }

  const systemPrompt = `You are helping a citizen report a city incident.
The user provided a short topic: "${topic}"

Generate:
1. The single best category from: Traffic, Power, ATM, Internet, Fire/Emergency, Water, Other
2. A formal description starting with a descriptive bracketed Topic header, e.g. "[Traffic Congestion] Massive vehicle slowdown observed." or "[Water Leakage] Severe street leaking."

Respond ONLY with valid JSON in this exact format:
{"category": "...", "description": "...", "suggestedLocation": null}`;

  try {
    const rawResult = await callGemini(systemPrompt, `Topic query: "${topic}"`);
    const parsed = JSON.parse(rawResult) as {
      category?: string;
      description?: string;
    };
    res.json({
      category: parsed.category ?? "Other",
      description: parsed.description ?? topic,
      suggestedLocation: null,
    });
  } catch (err) {
    console.warn("[AI] Gemini describe error, falling back to rule-based:", err);
    const fallback = ruleBasedProcess(topic);
    res.json({ ...fallback, suggestedLocation: null });
  }
});

// POST /api/incidents/:id/vote - Upvote / Downvote incident validity
app.post("/api/incidents/:id/vote", (req, res) => {
  const id = parseInt(req.params.id);
  const { vote, userFingerprint } = req.body;

  if (vote === undefined || !userFingerprint) {
    res.status(400).json({ error: "Missing userFingerprint or vote parameter" });
    return;
  }

  const existingVote = dbState.votes.find((v) => v.incidentId === id && v.userFingerprint === userFingerprint);
  if (existingVote) {
    res.status(409).json({ error: "Already voted on this incident" });
    return;
  }

  const incidentIndex = dbState.incidents.findIndex((inc) => inc.id === id);
  if (incidentIndex === -1) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }

  const incident = dbState.incidents[incidentIndex];

  // Record vote
  const newVoteId = dbState.votes.length > 0 ? Math.max(...dbState.votes.map((v) => v.id)) + 1 : 1;
  const newVote: Vote = {
    id: newVoteId,
    incidentId: id,
    userFingerprint,
    vote,
    createdAt: new Date().toISOString(),
  };

  dbState.votes.push(newVote);
  persistVote(newVote); // Firestore write

  const newTrueVotes = incident.trueVotes + (vote ? 1 : 0);
  const newFalseVotes = incident.falseVotes + (!vote ? 1 : 0);

  // If false votes reach threshold, delete the incident
  if (newFalseVotes >= REJECT_THRESHOLD) {
    dbState.incidents.splice(incidentIndex, 1);
    saveDB();
    removeIncident(id); // Firestore delete
    res.json({ deleted: true });
    return;
  }

  // If true votes reach threshold, auto-transition to Verified status
  let newStatus = incident.status;
  if (newTrueVotes >= VERIFY_THRESHOLD && incident.status === "Pending") {
    newStatus = "Verified";
  }

  const updatedIncident = {
    ...incident,
    trueVotes: newTrueVotes,
    falseVotes: newFalseVotes,
    status: newStatus,
  };

  dbState.incidents[incidentIndex] = updatedIncident;
  saveDB();
  persistIncident(updatedIncident); // Firestore update

  res.json({
    deleted: false,
    incident: {
      ...updatedIncident,
      distanceMi: null,
      commentCount: dbState.comments.filter((c) => c.incidentId === id).length,
    },
  });
});

// GET /api/incidents/:id/comments - List comments
app.get("/api/incidents/:id/comments", (req, res) => {
  const id = parseInt(req.params.id);
  const rows = dbState.comments
    .filter((c) => c.incidentId === id)
    // Newest comments first
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json(rows);
});

// POST /api/incidents/:id/comments - Write comment
app.post("/api/incidents/:id/comments", async (req, res) => {
  const id = parseInt(req.params.id);
  const { userFingerprint, displayName, body } = req.body;

  if (!userFingerprint || !body) {
    res.status(400).json({ error: "Missing userFingerprint or comment body" });
    return;
  }

  const incident = dbState.incidents.find((i) => i.id === id);
  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }

  // Moderate spam/bullying/cyber-abuse or ads in comments
  if (ai) {
    try {
      const systemPrompt = `You are a municipal safety dashboard comment moderator. Prevent abuse, commercial advertisements, trolling, or scam elements.
Respond strictly in JSON format: {"isAbusiveOrSpam": true/false, "rejectionReason": "Clean explanation or empty"}`;
      const modRes = await callGemini(systemPrompt, `Comment text: "${body}"`);
      const modObj = JSON.parse(modRes) as { isAbusiveOrSpam?: boolean; rejectionReason?: string };
      if (modObj.isAbusiveOrSpam === true) {
        res.status(400).json({ error: modObj.rejectionReason || "Comment blocked by AI safety parameters." });
        return;
      }
    } catch (e) {
      console.warn("[AI] Comment mod failed, bypass to standard save:", e);
    }
  }

  const newCommentId = dbState.comments.length > 0 ? Math.max(...dbState.comments.map((c) => c.id)) + 1 : 1;
  const newComment: Comment = {
    id: newCommentId,
    incidentId: id,
    userFingerprint,
    displayName: displayName || "Anonymous",
    body,
    createdAt: new Date().toISOString(),
  };

  dbState.comments.push(newComment);
  saveDB();
  persistComment(newComment); // Firestore update

  res.status(201).json(newComment);
});

// GET /api/incidents/:id - Get a single incident
app.get("/api/incidents/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const incident = dbState.incidents.find((i) => i.id === id);

  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }

  const commentCount = dbState.comments.filter((c) => c.incidentId === id).length;
  res.json({
    ...incident,
    distanceMi: null,
    commentCount,
  });
});

// PATCH /api/incidents/:id - Update incident
app.patch("/api/incidents/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const idx = dbState.incidents.findIndex((i) => i.id === id);

  if (idx === -1) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }

  const updated = {
    ...dbState.incidents[idx],
    ...req.body,
  };
  dbState.incidents[idx] = updated;

  saveDB();
  persistIncident(updated); // Firestore update

  res.json({
    ...updated,
    distanceMi: null,
    commentCount: dbState.comments.filter((c) => c.incidentId === id).length,
  });
});

// DELETE /api/incidents/:id - Delete incident
app.delete("/api/incidents/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const idx = dbState.incidents.findIndex((i) => i.id === id);

  if (idx !== -1) {
    dbState.incidents.splice(idx, 1);
    dbState.comments = dbState.comments.filter((c) => c.incidentId !== id);
    dbState.votes = dbState.votes.filter((v) => v.incidentId !== id);
    saveDB();
    removeIncident(id); // Firestore delete
  }

  res.status(204).send();
});

// GET /api/users/leaderboard - Users Leaderboard
app.get("/api/users/leaderboard", (req, res) => {
  // Aggregate verified reports per user fingerprint
  const fingerprintPoints: Record<string, { trustPoints: number; totalReports: number }> = {};
  
  for (const r of dbState.incidents) {
    if (!r.userId) continue;
    if (!fingerprintPoints[r.userId]) {
      fingerprintPoints[r.userId] = { trustPoints: 0, totalReports: 0 };
    }
    
    fingerprintPoints[r.userId].totalReports += 1;
    if (r.status === "Verified") {
      fingerprintPoints[r.userId].trustPoints += 1;
    }
  }

  const nameMap = new Map<string, string>();
  for (const u of dbState.users) {
    nameMap.set(u.fingerprint, u.displayName);
  }

  const result = Object.entries(fingerprintPoints)
    .map(([fingerprint, stats]) => ({
      fingerprint,
      displayName: nameMap.get(fingerprint) || "Anonymous",
      trustPoints: stats.trustPoints,
      totalReports: stats.totalReports,
      badge: getBadge(stats.trustPoints),
    }))
    // Sort by trustPoints desc
    .sort((a, b) => b.trustPoints - a.trustPoints)
    .map((entry, idx) => ({
      ...entry,
      rank: idx + 1,
    }))
    .slice(0, 50);

  res.json(result);
});

// PUT /api/users/profile - Create or override user profile
app.put("/api/users/profile", (req, res) => {
  const { fingerprint, displayName, email } = req.body;

  if (!fingerprint || !displayName) {
    res.status(400).json({ error: "Missing fingerprint or displayName" });
    return;
  }

  const idx = dbState.users.findIndex((u) => u.fingerprint === fingerprint);
  const updatedUser: User = {
    fingerprint,
    displayName,
    createdAt: idx !== -1 ? dbState.users[idx].createdAt : new Date().toISOString(),
    email: email || (idx !== -1 ? dbState.users[idx].email : null),
    lastActiveAt: new Date().toISOString()
  };

  if (idx !== -1) {
    dbState.users[idx] = updatedUser;
  } else {
    dbState.users.push(updatedUser);
  }

  const userReports = dbState.incidents.filter((i) => i.userId === fingerprint);
  const trustPoints = userReports.filter((i) => i.status === "Verified").length;

  saveDB();
  persistUser(updatedUser); // Firestore synchronization write

  res.json({
    fingerprint,
    displayName,
    email: updatedUser.email,
    lastActiveAt: updatedUser.lastActiveAt,
    trustPoints,
    totalReports: userReports.length,
    badge: getBadge(trustPoints),
  });
});

// GET /api/admin/stats - Admin Dashboard stats (restrict to admin email)
app.get("/api/admin/stats", (req, res) => {
  const email = req.query.email as string;
  if (!email || (email !== "ayaanamaan23@gmail.com" && process.env.NODE_ENV === "production")) {
    res.status(403).json({ error: "Access denied. Private admin access only." });
    return;
  }

  const totalUsers = dbState.users.length;
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  // Online / Active users in the last 24 hours
  const activeToday = dbState.users.filter((u) => {
    if (!u.lastActiveAt) return false;
    return new Date(u.lastActiveAt).getTime() >= oneDayAgo;
  }).length;

  // New reports received in the last 24 hours
  const reportsToday = dbState.incidents.filter((inc) => {
    return new Date(inc.timestamp).getTime() >= oneDayAgo;
  }).length;

  res.json({
    totalUsers,
    activeToday,
    reportsToday,
    problems: dbState.problems || [],
    users: dbState.users || []
  });
});

// POST /api/problems - File a new problem report
app.post("/api/problems", async (req, res) => {
  const { userFingerprint, userEmail, description } = req.body;
  if (!description || !userFingerprint) {
    res.status(400).json({ error: "Missing required fields (description, userFingerprint)" });
    return;
  }

  const newProblemId = "prob_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
  const newProblem: Problem = {
    id: newProblemId,
    userFingerprint,
    userEmail: userEmail || null,
    description,
    createdAt: new Date().toISOString()
  };

  dbState.problems = dbState.problems || [];
  dbState.problems.push(newProblem);
  saveDB();

  // Also sync to Cloud Firestore
  if (db) {
    try {
      await setDoc(doc(db, "problems", newProblemId), {
        id: newProblemId,
        userFingerprint,
        userEmail: userEmail || null,
        description,
        createdAt: newProblem.createdAt
      });
      console.log(`[Firebase] Swapped/Synced Reported Problem ${newProblemId} to Firestore.`);
    } catch (err) {
      console.warn("[Firebase] Could not sync reported problem to Firestore:", err);
    }
  }

  res.status(201).json(newProblem);
});

// GET /api/users/:fingerprint - Get profile details
app.get("/api/users/:fingerprint", (req, res) => {
  const { fingerprint } = req.params;
  const user = dbState.users.find((u) => u.fingerprint === fingerprint);

  const userReports = dbState.incidents.filter((i) => i.userId === fingerprint);
  const trustPoints = userReports.filter((i) => i.status === "Verified").length;

  res.json({
    fingerprint,
    displayName: user?.displayName ?? "Anonymous",
    trustPoints,
    totalReports: userReports.length,
    badge: getBadge(trustPoints),
  });
});

async function purgeExpiredIncidents() {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const expiredIncidentIds = new Set(
    dbState.incidents
      .filter((r) => new Date(r.timestamp).getTime() < oneDayAgo)
      .map((r) => r.id)
  );

  if (expiredIncidentIds.size > 0) {
    dbState.incidents = dbState.incidents.filter((r) => !expiredIncidentIds.has(r.id));
    dbState.comments = dbState.comments.filter((c) => !expiredIncidentIds.has(c.incidentId));
    dbState.votes = dbState.votes.filter((v) => !expiredIncidentIds.has(v.incidentId));
    console.log(`[DB] Hourly Purge: Cleared ${expiredIncidentIds.size} expired reports outside 24h cycle.`);
    saveDB();
  }
}

// ── VITE / STATIC MIDDLEWARE ──────────────────────────────────────────────
async function startServer() {
  // Push existing records from Cloud Firestore right on boot to establish the warm layer
  await syncFromFirestore();

  // Clean-up any legacy expired incidents on boot
  await purgeExpiredIncidents();

  // Hourly clean-up loop to wipe reports older than 1 day
  setInterval(async () => {
    try {
      await purgeExpiredIncidents();
    } catch (e) {
      console.warn("[Purge Task] Failed to run regular purge:", e);
    }
  }, 1000 * 60 * 60);

  if (process.env.NODE_ENV !== "production") {
    // Development mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production mode
    const distPath = path.join(process.cwd(), "dist");
    
    // Serve static files
    app.use(express.static(distPath));
    
    // SPA routing fallback
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] LivePulse backend server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
