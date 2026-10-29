// -------------------------------------------------------
// Réviz — Profil utilisateur (Firestore)
// -------------------------------------------------------
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebaseConfig';

// Jamais de `plan` ici (sans plan = gratuit) : c'est un champ de facturation, que les règles
// interdisent au client de modifier. Quand la fiche existe déjà (essai devenu compte : lierEssai
// passe avant), l'écriture devient une mise à jour, et elle était refusée en entier (26-29/10).
export async function createUserProfile(uid, profile) {
  const { prenom, email, birthDate, level } = profile;
  await setDoc(
    doc(db, 'users', uid),
    {
      prenom: prenom ?? null,
      email: email ?? null,
      birthDate: birthDate ?? null,
      level: level ?? null,
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}
