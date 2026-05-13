// -------------------------------------------------------
// Réviz — Profil utilisateur (Firestore)
// -------------------------------------------------------
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebaseConfig';

export async function createUserProfile(uid, profile) {
  const { prenom, email, birthDate, level } = profile;
  await setDoc(
    doc(db, 'users', uid),
    {
      prenom: prenom ?? null,
      email: email ?? null,
      birthDate: birthDate ?? null,
      level: level ?? null,
      plan: 'free',
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}
