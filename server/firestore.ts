import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  Firestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc,
  type DocumentData,
  type QueryDocumentSnapshot
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

let firestoreInstance: Firestore | null = null;
let isInitialized = false;
let configCache: FirebaseConfigFile | null = null;

interface FirebaseConfigFile {
  projectId: string;
  apiKey: string;
  authDomain?: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

export function getFirestoreServer(): Firestore | null {
  if (isInitialized) {
    return firestoreInstance;
  }

  isInitialized = true;

  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const configRaw = fs.readFileSync(configPath, 'utf-8');
      configCache = JSON.parse(configRaw);

      if (configCache && configCache.apiKey && configCache.projectId) {
        const app: FirebaseApp = getApps().length === 0 
          ? initializeApp(configCache, 'server-db-app') 
          : getApps()[0];

        firestoreInstance = getFirestore(app, configCache.firestoreDatabaseId || undefined);
        console.log(`[Firestore Server] Connected to Firestore database: ${configCache.firestoreDatabaseId || '(default)'} (Project: ${configCache.projectId})`);
      }
    }
  } catch (err) {
    console.warn('[Firestore Server] Initialization fallback to local store:', err);
    firestoreInstance = null;
  }

  return firestoreInstance;
}

export function isCloudFirestoreActive(): boolean {
  return Boolean(getFirestoreServer());
}

export function getFirestoreConfig(): FirebaseConfigFile | null {
  getFirestoreServer();
  return configCache;
}

/**
 * Deeply sanitizes any object or array before writing to Firestore.
 * Removes `undefined` values that Firestore rejects, converting nulls or omitting undefined keys.
 */
export function sanitizeForFirestore<T = any>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as any;
  }

  if (Array.isArray(obj)) {
    return obj
      .filter(item => item !== undefined)
      .map(item => sanitizeForFirestore(item)) as any;
  }

  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        sanitized[key] = sanitizeForFirestore(value);
      }
    }
    return sanitized as T;
  }

  return obj;
}

export async function verifyFirestoreConnection(): Promise<{ connected: boolean; databaseId?: string; projectId?: string; error?: string }> {
  try {
    const fsDb = getFirestoreServer();
    if (!fsDb) {
      return { connected: false, error: 'Firestore configuration not initialized' };
    }

    // Ping Firestore with settings read/check
    const pingRef = doc(fsDb, 'settings', 'branding');
    await getDoc(pingRef);

    return {
      connected: true,
      databaseId: configCache?.firestoreDatabaseId || '(default)',
      projectId: configCache?.projectId
    };
  } catch (err: any) {
    return {
      connected: false,
      error: err.message || 'Failed to connect to Firestore'
    };
  }
}

export {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc
};
export type { DocumentData, QueryDocumentSnapshot };
