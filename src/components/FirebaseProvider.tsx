import * as React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth, googleProvider, db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

interface FirebaseContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Sync the lp_fingerprint so other modules immediately recognize this verified Firebase UID
        localStorage.setItem("lp_fingerprint", currentUser.uid);

        // Save authenticated profile directly to Cloud Firestore to circumvent unauthenticated server-write permissions limits
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (!userDocSnap.exists()) {
            await setDoc(userDocRef, {
              uid: currentUser.uid,
              displayName: currentUser.displayName || "Anonymous User",
              email: currentUser.email || null,
              lastActiveAt: new Date().toISOString(),
              createdAt: new Date().toISOString()
            });
          } else {
            const existingData = userDocSnap.data();
            const currentName = currentUser.displayName || "Anonymous User";
            const updatePayload: any = {
              lastActiveAt: new Date().toISOString()
            };
            if (existingData?.displayName !== currentName) {
              updatePayload.displayName = currentName;
            }
            if (!existingData?.email && currentUser.email) {
              updatePayload.email = currentUser.email;
            }
            await setDoc(userDocRef, updatePayload, { merge: true });
          }
        } catch (dbErr) {
          console.error("Direct Firestore user save skipped or blocked:", dbErr);
        }

        // Ensure database registration by pinging PUT /api/users/profile in the background
        try {
          await fetch("/api/users/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fingerprint: currentUser.uid,
              displayName: currentUser.displayName || "Anonymous User",
              email: currentUser.email,
            }),
          });
        } catch (err) {
          console.error("Failed to sync background profile with Express server:", err);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
      toast({
        title: "Authenticated Successfully!",
        description: "Welcome to LivePulse.",
      });
    } catch (err: any) {
      console.error("Google Authentication error:", err);
      toast({
        title: "Login Failed",
        description: err.message || "An error occurred during Google sign in.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      // Clean up local reference to prevent leakage on logouts
      localStorage.removeItem("lp_fingerprint");
      toast({
        title: "Signed Out",
        description: "You have been logged out securely.",
      });
    } catch (err: any) {
      console.error("Sign-out error:", err);
      toast({
        title: "Sign-out error",
        description: err.message || "Failed to log out cleanly.",
        variant: "destructive",
      });
    }
  };

  return (
    <FirebaseContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error("useFirebase must be used within a FirebaseProvider");
  }
  return context;
}
