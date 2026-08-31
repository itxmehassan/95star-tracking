import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firestore database instance
export const firestore: Firestore = getFirestore(
  app,
  firebaseConfig.firestoreDatabaseId || undefined
);

export default app;
