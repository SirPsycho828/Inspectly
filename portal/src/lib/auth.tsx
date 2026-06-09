'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

export interface AppUser {
  id: string;
  displayName: string;
  email: string;
  role: 'inspector' | 'firm_admin';
  firmId: string | null;
  licenseNumber: string;
  profilePhotoUrl: string | null;
  onboardingComplete: boolean;
  status: string;
}

type AuthState = 'loading' | 'unauthenticated' | 'unverified' | 'needs_onboarding' | 'authenticated';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: AppUser | null;
  authState: AuthState;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [authState, setAuthState] = useState<AuthState>('loading');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (!fbUser) {
        setUser(null);
        setAuthState('unauthenticated');
        return;
      }

      if (!fbUser.emailVerified && fbUser.providerData[0]?.providerId === 'password') {
        setUser(null);
        setAuthState('unverified');
        return;
      }

      try {
        const snap = await getDoc(doc(db, 'users', fbUser.uid));
        if (snap.exists()) {
          const data = snap.data() as Omit<AppUser, 'id'>;
          if (!data.onboardingComplete) {
            setUser(null);
            setAuthState('needs_onboarding');
            return;
          }
          setUser({ id: snap.id, ...data });
          setAuthState('authenticated');
        } else {
          setUser(null);
          setAuthState('needs_onboarding');
        }
      } catch {
        setUser(null);
        setAuthState('unauthenticated');
      }
    });
    return unsub;
  }, []);

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signUp(email: string, password: string) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(cred.user);
  }

  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
  }

  return (
    <AuthContext.Provider
      value={{ firebaseUser, user, authState, signIn, signUp, signInWithGoogle, signOut, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
