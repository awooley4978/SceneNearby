import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';

// Dev only — skip real Firebase initialization
const DEV_MODE = true;

const firebaseConfig = {
  apiKey: DEV_MODE ? "dev" : "AIzaSyDHRp8__gImAvLP_TInKdSRjgNXsNwk3Pk",
  authDomain: DEV_MODE ? "dev" : "scenenearby.firebaseapp.com",
  projectId: DEV_MODE ? "dev" : "scenenearby",
  storageBucket: DEV_MODE ? "dev" : "scenenearby.firebasestorage.app",
  messagingSenderId: DEV_MODE ? "dev" : "637794754644",
  appId: DEV_MODE ? "dev" : "1:637794754644:web:4c1f95461c8b707c380dc1",
};

export const app = initializeApp(firebaseConfig);
export const auth = DEV_MODE
  ? ({ currentUser: null } as any)
  : initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
export const db = DEV_MODE
  ? ({} as any)
  : getFirestore(app);
