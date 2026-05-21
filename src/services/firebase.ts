// Firebase service initialization
// Uses @react-native-firebase which auto-configures from google-services.json / GoogleService-Info.plist

import firebase from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import functions from '@react-native-firebase/functions';

// Enable Firestore offline persistence with unlimited cache
// (default on mobile, but explicit for clarity)
firestore().settings({
  cacheSizeBytes: firestore.CACHE_SIZE_UNLIMITED,
});

// Helper to call Cloud Functions
export function callable(name: string) {
  return functions().httpsCallable(name);
}

export { firebase, auth, firestore, storage, functions };
