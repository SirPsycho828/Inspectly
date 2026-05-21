import React, { createContext, useContext } from 'react';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { useAuth } from '@/hooks/useAuth';
import type { AuthState, User } from '@/types';

interface AuthContextValue {
  authState: AuthState;
  firebaseUser: FirebaseAuthTypes.User | null;
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  authState: 'unauthenticated',
  firebaseUser: null,
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  return useContext(AuthContext);
}
