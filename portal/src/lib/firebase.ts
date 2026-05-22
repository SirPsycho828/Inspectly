import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: 'REDACTED_FIREBASE_API_KEY',
  authDomain: 'inspectly-prod-app.firebaseapp.com',
  projectId: 'inspectly-prod-app',
  storageBucket: 'inspectly-prod-app.firebasestorage.app',
  messagingSenderId: 'REDACTED_SENDER_ID',
  appId: '1:REDACTED_SENDER_ID:web:5191e6bc907bf54d8a8d83',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'us-central1');
