// -------------------------------------------------------
// Réviz — Configuration Firebase
// -------------------------------------------------------
import { initializeApp } from 'firebase/app';
import { getAuth }       from 'firebase/auth';
import { getFirestore }  from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            'AIzaSyBfRis15ju6rs4wJS1CX8UhhZBIfMBmegw',
  authDomain:        'reviz-c0828.firebaseapp.com',
  projectId:         'reviz-c0828',
  storageBucket:     'reviz-c0828.firebasestorage.app',
  messagingSenderId: '454941025759',
  appId:             '1:454941025759:web:2dfa41cfd639d18622d06a',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
