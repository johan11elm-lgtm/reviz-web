// -------------------------------------------------------
// Réviz — Création de compte (email + mot de passe, Google)
// Vit hors du AuthProvider pour que /inscription affiche ses étapes sans
// Firebase : la page importe ce module en différé (import()) seulement au
// moment où un compte se crée. AuthContext délègue ici, donc Connexion et
// FinishSetup gardent exactement la même logique qu'avant.
// -------------------------------------------------------
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { auth, db } from './firebaseConfig';
import { createUserProfile } from './userProfileService';
import { serializeLevel, isUnder15 } from '../utils/levels';

// Tout ce dont l'inscription a besoin côté Firebase passe par ce seul module
// (un seul import() côté page) : le consentement parental y est ré-exporté.
export { sendParentalConsent, consentErrorMessage } from './consentService';

// --- Inscription ---
// `level` est un objet { cycle, classe, specialites?, filiere? }
export async function signup(prenom, email, password, level, birthDate = null) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName: prenom });
  // Envoyer l'email de vérification (fire-and-forget)
  sendEmailVerification(user).catch(() => {});
  // Profil persistant dans Firestore — ATTENDU : le gate de consentement
  // mineur en dépend (birthDate), donc on ne le laisse pas en fire-and-forget.
  try {
    await createUserProfile(user.uid, { prenom, email, birthDate, level });
  } catch { /* best-effort : le profil sera recréé au besoin */ }
  // Mineur <15 ans : trace de consentement 'pending' posée dès l'inscription,
  // même si le tunnel est abandonné avant l'étape parent. Le gate bloque déjà
  // en l'absence de doc ; ceci rend l'attente visible/auditables côté serveur.
  // L'approbation reste impossible côté client (firestore.rules).
  if (isUnder15(birthDate)) {
    try {
      await setDoc(doc(db, 'users', user.uid, 'parentalConsent', 'consent'), {
        status: 'pending',
        createdAt: Date.now(),
      });
    } catch { /* best-effort : recréé par /api/send-parental-consent */ }
  }
  // Niveau scolaire stocké aussi en localStorage (cache lu par le reste de l'app)
  if (level?.cycle) {
    localStorage.setItem(`reviz-level-${user.uid}`, serializeLevel(level));
  }
  return user;
}

// --- Connexion Google ---
// Web : popup Firebase classique. App native (Capacitor) : la popup ne
// fonctionne pas dans la WebView — on passe par le SDK Google natif
// (@capacitor-firebase/authentication) puis on échange le jeton contre
// une session Firebase JS (signInWithCredential) : tout l'aval
// (onAuthStateChanged, Firestore, gating) reste identique.
export async function loginWithGoogle() {
  if (Capacitor.isNativePlatform()) {
    const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
    let result;
    try {
      result = await FirebaseAuthentication.signInWithGoogle();
    } catch (err) {
      // Annulation du sheet natif → même code que la popup web fermée,
      // déjà ignoré par Connexion/Inscription.
      const cancelled = /cancel|12501|dismiss/i.test(err?.message ?? '');
      const e = new Error(err?.message ?? 'Connexion Google impossible');
      e.code = cancelled ? 'auth/popup-closed-by-user' : 'auth/google-signin-failed';
      throw e;
    }
    const idToken = result?.credential?.idToken;
    if (!idToken) {
      const e = new Error('Connexion Google annulée');
      e.code = 'auth/popup-closed-by-user';
      throw e;
    }
    const credential = GoogleAuthProvider.credential(idToken);
    const { user } = await signInWithCredential(auth, credential);
    return user;
  }
  const provider = new GoogleAuthProvider();
  const { user } = await signInWithPopup(auth, provider);
  return user;
}
