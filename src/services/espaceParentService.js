// -------------------------------------------------------
// Réviz — Espace parent, côté élève (api/_espaceParent.js)
//
// C'est l'élève qui décide : users/{uid}.espaceParent = false coupe tous les
// liens ; +1 sur users/{uid}.espaceParentVersion annule les liens déjà envoyés
// (les nouveaux portent la nouvelle version). Les règles Firestore laissent le
// propriétaire écrire ces champs.
// -------------------------------------------------------
import { doc, getDoc, setDoc, increment } from 'firebase/firestore'
import { db } from './firebaseConfig'

/** L'espace parent est-il ouvert ? (oui tant que l'élève ne l'a pas coupé) */
export async function lireEspaceParent(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.data()?.espaceParent !== false
}

export async function reglerEspaceParent(uid, actif) {
  await setDoc(doc(db, 'users', uid), { espaceParent: actif }, { merge: true })
}

/** Les liens déjà envoyés ne s'ouvrent plus. */
export async function couperLiensParent(uid) {
  await setDoc(doc(db, 'users', uid), { espaceParentVersion: increment(1) }, { merge: true })
}
