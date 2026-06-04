import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with specific database ID mapping
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Authentication and external Auth providers
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Standard Auth helper to trigger Login Popup securely in SPA
googleProvider.setCustomParameters({
  prompt: "select_account",
});
