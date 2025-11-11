import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
}

const ensureFirebaseApp = () => {
  if (import.meta.env.PROD) {
    // eslint-disable-next-line no-console
    console.log('firebaseConfig(runtime)', firebaseConfig)
  }

  if (!firebaseConfig.apiKey) {
    throw new Error(
      'Missing Firebase configuration. Ensure VITE_FIREBASE_* environment variables are set.'
    )
  }

  if (!getApps().length) {
    initializeApp(firebaseConfig)
  }

  return getApp()
}

export const getFirebaseAuth = () => {
  const app = ensureFirebaseApp()
  const auth = getAuth(app)
  auth.useDeviceLanguage()
  return auth
}


