import { initializeApp } from 'firebase/app'
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  type Auth,
} from 'firebase/auth'
import {
  enableIndexedDbPersistence,
  getFirestore,
  getDoc,
  addDoc,
  collection,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean)

let auth: Auth | null = null
let db: Firestore | null = null

if (isFirebaseConfigured) {
  const app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
  enableIndexedDbPersistence(db).catch(() => {})
}

export {
  auth,
  db,
  onAuthStateChanged,
  signInAnonymously,
  onSnapshot,
  doc,
  getDoc,
  addDoc,
  collection,
  setDoc,
  serverTimestamp,
}
