import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: 'AIzaSyCZdAZIRf5-pqavuT6UkLC0GFvPteJ-2VI',
  authDomain: 'inspectly-prod-app.firebaseapp.com',
  projectId: 'inspectly-prod-app',
  storageBucket: 'inspectly-prod-app.firebasestorage.app',
  messagingSenderId: '371745821114',
  appId: '1:371745821114:web:5191e6bc907bf54d8a8d83',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'us-central1');
