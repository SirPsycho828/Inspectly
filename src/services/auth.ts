// Authentication service
// Implements flows from docs/planning/01_Auth_Roles.md

import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS } from '@/constants/collections';
import type { AuthState, User } from '@/types';

export function getAuthState(
  firebaseUser: FirebaseAuthTypes.User | null,
  userDoc: User | null
): AuthState {
  if (!firebaseUser) return 'unauthenticated';
  if (!firebaseUser.emailVerified && !isGoogleProvider(firebaseUser)) return 'unverified';
  if (!userDoc?.onboardingComplete) return 'needs_onboarding';
  if (userDoc?.status === 'suspended') return 'suspended';
  return 'authenticated';
}

function isGoogleProvider(user: FirebaseAuthTypes.User): boolean {
  return user.providerData.some((p) => p.providerId === 'google.com');
}

export async function signInWithEmail(email: string, password: string) {
  return auth().signInWithEmailAndPassword(email, password);
}

export async function signUpWithEmail(email: string, password: string) {
  const result = await auth().createUserWithEmailAndPassword(email, password);
  await result.user.sendEmailVerification();
  return result;
}

export async function sendPasswordReset(email: string) {
  return auth().sendPasswordResetEmail(email);
}

export async function resendVerificationEmail() {
  const user = auth().currentUser;
  if (user) await user.sendEmailVerification();
}

export async function signOut() {
  // Clear Firestore cache on sign-out to prevent stale data
  await firestore().clearPersistence();
  return auth().signOut();
}

export async function completeOnboarding(data: {
  displayName: string;
  phone: string | null;
  licenseNumber: string;
  firmInviteCode?: string;
}) {
  const user = auth().currentUser;
  if (!user) throw new Error('No authenticated user');

  const userDoc: Omit<User, 'id' | 'createdAt' | 'updatedAt'> = {
    displayName: data.displayName,
    email: user.email!,
    phone: data.phone,
    role: 'inspector',
    firmId: null,
    licenseNumber: data.licenseNumber,
    profilePhotoUrl: user.photoURL,
    onboardingComplete: true,
    status: 'active',
    deletedAt: null,
  };

  await firestore()
    .collection(COLLECTIONS.USERS)
    .doc(user.uid)
    .set({
      ...userDoc,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });

  // Force token refresh to pick up custom claims set by onUserDocWrite trigger
  await user.getIdToken(true);
}

export async function forceTokenRefresh() {
  const user = auth().currentUser;
  if (user) await user.getIdToken(true);
}
