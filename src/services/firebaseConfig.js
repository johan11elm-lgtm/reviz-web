// -------------------------------------------------------
// Réviz — Configuration Firebase
// En mode émulateur (VITE_FIREBASE_EMULATOR=1, utilisé par les tests e2e),
// l'app se branche sur l'Emulator Suite locale (auth + firestore) avec un
// projet `demo-*` 100 % hors-ligne : aucune donnée ne touche la prod.
// -------------------------------------------------------
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const useEmulator = import.meta.env.VITE_FIREBASE_EMULATOR === '1';

const firebaseConfig = useEmulator
  ? {
      // Valeurs factices : l'émulateur accepte n'importe quelle clé,
      // et un projectId `demo-` garantit qu'aucun appel ne sort du local.
      apiKey: 'demo-api-key',
      authDomain: 'demo-reviz.firebaseapp.com',
      projectId: 'demo-reviz',
    }
  : {
      apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId:             import.meta.env.VITE_FIREBASE_APP_ID,
    };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

if (useEmulator) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
