import { createContext, useContext, useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { AuthAPI } from "../services/api";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app      = initializeApp(firebaseConfig);
const auth     = getAuth(app);
const provider = new GoogleAuthProvider();
provider.addScope("profile");
provider.addScope("email");

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
  const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        const token = await firebaseUser.getIdToken();
        localStorage.setItem("orbit_token", token);

        setUser({
          uid:      firebaseUser.uid,
          email:    firebaseUser.email,
          name:     firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        });

        AuthAPI.verify(token)
          .then((profile) => {
            setUser((prev) => ({ ...prev, ...profile, photoURL: firebaseUser.photoURL }));
          })
          .catch((e) => {
            console.error("AuthAPI.verify failed:", e);
          });

      } catch (e) {
        console.error("getIdToken failed:", e);
        setUser(null);
      }
    } else {
      localStorage.removeItem("orbit_token");
      setUser(null);
    }
    setLoading(false);
  });
  return unsub;
}, []);

  const signInWithGoogle = async (onSuccess) => {
    setError(null);
    try {
      await signInWithPopup(auth, provider);
      onSuccess?.();
    } catch (e) {
      setError(e.message);
      throw e;
    }
  };

  const logout = async () => {
    await signOut(auth);
    localStorage.removeItem("orbit_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
