// Auth state hook
// Manages Firebase auth state and Firestore user document subscription

import { useEffect, useState, useCallback } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS } from '@/constants/collections';
import { getAuthState } from '@/services/auth';
import type { AuthState, User } from '@/types';

interface AuthContext {
  authState: AuthState;
  firebaseUser: FirebaseAuthTypes.User | null;
  user: User | null;
  loading: boolean;
}

export function useAuth(): AuthContext {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((fbUser) => {
      setFirebaseUser(fbUser);
      if (!fbUser) {
        setUser(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  // Listen to Firestore user document when authenticated
  useEffect(() => {
    if (!firebaseUser) return;

    const unsubscribe = firestore()
      .collection(COLLECTIONS.USERS)
      .doc(firebaseUser.uid)
      .onSnapshot(
        (doc) => {
          if (doc.exists) {
            setUser({ id: doc.id, ...doc.data() } as User);
          } else {
            setUser(null);
          }
          setLoading(false);
        },
        () => {
          setLoading(false);
        }
      );

    return unsubscribe;
  }, [firebaseUser?.uid]);

  const authState = getAuthState(firebaseUser, user);

  return { authState, firebaseUser, user, loading };
}
