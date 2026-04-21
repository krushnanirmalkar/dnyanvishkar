import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'appId'];
const hasRequiredConfig = requiredKeys.every((key) => {
  const value = firebaseConfig[key];
  return typeof value === 'string' && value.trim().length > 0;
});

let firebaseAuth = null;
let firebaseConfigError = '';

if (!hasRequiredConfig) {
  firebaseConfigError = 'Firebase is not configured. Please set VITE_FIREBASE_* environment variables.';
} else {
  try {
    const app = initializeApp(firebaseConfig);
    firebaseAuth = getAuth(app);
  } catch (error) {
    firebaseConfigError = error?.message || 'Unable to initialize Firebase.';
    console.error('Firebase initialization failed:', error);
  }
}

export { firebaseAuth, firebaseConfigError };
