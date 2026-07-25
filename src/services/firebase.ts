import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDHRp8__gImAvLP_TInKdSRjgNXsNwk3Pk",
  authDomain: "scenenearby.firebaseapp.com",
  projectId: "scenenearby",
  storageBucket: "scenenearby.firebasestorage.app",
  messagingSenderId: "637794754644",
  appId: "1:637794754644:web:4c1f95461c8b707c380dc1",
};

export const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
export const db = getFirestore(app);
