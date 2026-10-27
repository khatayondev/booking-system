import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

export const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyBI7WIa0AJJsK1VOMhf6b7_seA1zaeTdoI",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "beccas-crown.firebaseapp.com",
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "beccas-crown",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "beccas-crown.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "618803495150",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    "1:618803495150:web:dae3c373e61e529876b3ff",
  measurementId:
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-7DBRESB6DX",
};

/**
 * Initializes and returns the Firebase app instance.
 * Safe for both SSR and client environments.
 */
export function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

/**
 * Initializes Firebase Analytics on supported client-side environments.
 */
export async function initFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === "undefined") {
    return null;
  }
  const supported = await isSupported();
  if (supported) {
    const app = getFirebaseApp();
    return getAnalytics(app);
  }
  return null;
}
