const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

export async function signInWithGoogle() {
  if (!window.firebase) throw new Error("Firebase SDK is not loaded.");
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) throw new Error("Firebase configuration is missing.");
  const app = window.firebase.apps.length ? window.firebase.app() : window.firebase.initializeApp(firebaseConfig);
  const auth = window.firebase.auth(app);
  try {
    const result = await auth.signInWithPopup(new window.firebase.auth.GoogleAuthProvider());
    const idToken = await result.user.getIdToken(true);
    return { idToken, user: result.user };
  } catch (error) {
    if (error?.code === "auth/operation-not-allowed") {
      throw new Error("Google Sign-In is disabled in Firebase Console. Enable Google provider under Authentication > Sign-in method.");
    }
    if (error?.code === "auth/unauthorized-domain") {
      throw new Error("This domain is not authorized in Firebase Authentication settings.");
    }
    throw error;
  }
}
