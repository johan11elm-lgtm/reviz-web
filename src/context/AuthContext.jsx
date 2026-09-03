// -------------------------------------------------------
// Réviz — Contexte d'authentification Firebase
// -------------------------------------------------------
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  deleteUser,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { auth, db } from '../services/firebaseConfig';
import { parseLevel, serializeLevel, migrateLegacyClasse, isUnder15 } from '../utils/levels';
import { createUserProfile } from '../services/userProfileService';
import { setActiveUser } from '../services/historyService';
import { setActiveUser as setRevisionUser } from '../services/revisionService';
import { setSrsUser } from '../services/srsService';
import { setChallengeUser } from '../services/challengeService';
import { setScanLimitUser, setPremiumStatus } from '../services/scanLimitService';
import { readSessionCache, writeSessionCache, clearSessionCache, userFromSessionCache } from '../services/sessionCache';
import { collection, getDocs, deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

// Rattache les services locaux (clés localStorage par utilisateur) à un uid.
function bindServicesToUser(uid) {
  setActiveUser(uid);
  setRevisionUser(uid);
  setSrsUser(uid);
  setChallengeUser(uid);
  setScanLimitUser(uid);
}

export function AuthProvider({ children }) {
  // Démarrage optimiste : la dernière session confirmée (cache local) rend
  // l'app immédiatement ; Firebase confirme ou invalide en arrière-plan.
  // Sans cache (premier lancement, déconnexion), on attend Firebase comme avant.
  const [cached] = useState(() => {
    const c = readSessionCache();
    if (c) {
      bindServicesToUser(c.uid);
      setPremiumStatus(c.isPremium);
    }
    return c;
  });
  const [currentUser, setCurrentUser]   = useState(() => (cached ? userFromSessionCache(cached, auth) : null));
  // true tant que Firebase n'a pas confirmé la session (même si l'app est déjà rendue depuis le cache).
  const [loading, setLoading]           = useState(true);
  // Mineur <15 ans dont le consentement parental n'est pas (encore) approuvé.
  const [consentBlocked, setConsentBlocked] = useState(cached?.consentBlocked ?? false);
  // Compte Google sans profil complété (pas encore de date de naissance / niveau).
  const [needsProfileSetup, setNeedsProfileSetup] = useState(cached?.needsProfileSetup ?? false);
  const [isPremium, setIsPremium] = useState(cached?.isPremium ?? false);
  // uid pour lequel le gate ci-dessus a été calculé (Firestore) — garde le cache cohérent.
  const [gateUid, setGateUid] = useState(cached?.uid ?? null);

  // --- Inscription ---
  // `level` est un objet { cycle, classe, specialites?, filiere? }
  async function signup(prenom, email, password, level, birthDate = null) {
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
    // Forcer le re-render avec le displayName mis à jour
    setCurrentUser({ ...auth.currentUser });
    // Niveau scolaire stocké aussi en localStorage (cache lu par le reste de l'app)
    if (level?.cycle) {
      localStorage.setItem(`reviz-level-${user.uid}`, serializeLevel(level));
    }
    return user;
  }

  // --- Renvoyer l'email de vérification ---
  function resendVerificationEmail() {
    if (auth.currentUser) return sendEmailVerification(auth.currentUser);
  }

  // --- Connexion ---
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // --- Connexion Google ---
  // Web : popup Firebase classique. App native (Capacitor) : la popup ne
  // fonctionne pas dans la WebView — on passe par le SDK Google natif
  // (@capacitor-firebase/authentication) puis on échange le jeton contre
  // une session Firebase JS (signInWithCredential) : tout l'aval
  // (onAuthStateChanged, Firestore, gating) reste identique.
  async function loginWithGoogle() {
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

  // --- Déconnexion ---
  function logout() {
    clearSessionCache();
    return signOut(auth);
  }

  // --- Mot de passe oublié ---
  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  // --- Modifier le prénom (+ rafraîchit currentUser) ---
  async function updateDisplayName(prenom) {
    await updateProfile(auth.currentUser, { displayName: prenom });
    setCurrentUser({ ...auth.currentUser });
  }

  // --- Modifier l'e-mail (réauthentification requise) ---
  async function updateUserEmail(newEmail, password) {
    const cred = EmailAuthProvider.credential(auth.currentUser.email, password);
    await reauthenticateWithCredential(auth.currentUser, cred);
    await updateEmail(auth.currentUser, newEmail);
    setCurrentUser({ ...auth.currentUser });
  }

  // --- Modifier le mot de passe (réauthentification requise) ---
  async function updateUserPassword(currentPassword, newPassword) {
    const cred = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
    await reauthenticateWithCredential(auth.currentUser, cred);
    await updatePassword(auth.currentUser, newPassword);
  }

  // --- Supprimer le compte (RGPD art. 17) ---
  async function deleteAccount(password) {
    const user = auth.currentUser;
    if (!user) throw new Error('No user');
    // Réauthentifier si connexion par email
    if (password && user.providerData[0]?.providerId === 'password') {
      const cred = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, cred);
    }
    const uid = user.uid;
    // Supprimer les données Firestore (lessons + revisions + consentement parental)
    try {
      const lessonsSnap = await getDocs(collection(db, 'users', uid, 'lessons'));
      await Promise.all(lessonsSnap.docs.map(d => deleteDoc(d.ref)));
      const revisionsSnap = await getDocs(collection(db, 'users', uid, 'revisions'));
      await Promise.all(revisionsSnap.docs.map(d => deleteDoc(d.ref)));
      // Consentement parental (email du parent) — suppression complète (RGPD art. 17)
      await deleteDoc(doc(db, 'users', uid, 'parentalConsent', 'consent')).catch(() => {});
      await deleteDoc(doc(db, 'users', uid));
    } catch (e) { console.warn('[Réviz] Firestore cleanup error', e); }
    // Supprimer les données localStorage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('reviz-') && key.includes(uid)) keysToRemove.push(key);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    localStorage.removeItem('reviz-ai-data');
    localStorage.removeItem('reviz-lesson-text');
    localStorage.removeItem('reviz-captured-image');
    localStorage.removeItem('reviz-current-lesson-id');
    clearSessionCache();
    // Supprimer le compte Firebase Auth
    await deleteUser(user);
  }

  // --- Niveau scolaire de l'utilisateur (localStorage lié au uid) ---
  // Lit `reviz-level-{uid}` (nouveau format) avec fallback automatique vers
  // l'ancienne clé `reviz-classe-{uid}` (legacy collège uniquement).
  function getUserLevel() {
    if (!currentUser) return null;
    const uid = currentUser.uid;
    const stored = localStorage.getItem(`reviz-level-${uid}`);
    if (stored) {
      const parsed = parseLevel(stored);
      // Migration : le cycle "supérieur" n'est plus supporté → force re-sélection
      if (parsed?.cycle === 'superieur') return null;
      return parsed;
    }
    const legacy = localStorage.getItem(`reviz-classe-${uid}`);
    const migrated = migrateLegacyClasse(legacy);
    if (migrated) {
      localStorage.setItem(`reviz-level-${uid}`, serializeLevel(migrated));
      return migrated;
    }
    return null;
  }

  function setUserLevel(level) {
    if (!currentUser || !level?.cycle) return;
    localStorage.setItem(`reviz-level-${currentUser.uid}`, serializeLevel(level));
    // On nettoie l'ancienne clé après migration
    localStorage.removeItem(`reviz-classe-${currentUser.uid}`);
  }

  // Wrapper de compatibilité — à retirer quand plus aucun appel ne l'utilise
  function getUserClasse() {
    const level = getUserLevel();
    return level?.classe ?? '';
  }

  // Calcule l'état du gate (consentement mineur + premium) depuis le profil Firestore.
  async function loadGateState(user) {
    if (!user) {
      setConsentBlocked(false);
      setNeedsProfileSetup(false);
      setIsPremium(false);
      setPremiumStatus(false);
      setGateUid(null);
      return;
    }
    // Les deux lectures partent en parallèle : un seul aller-retour Firestore
    // au lieu de deux enchaînés. Lecture impossible → on n'élève pas le
    // blocage (fail-open UX).
    const [profile, approved] = await Promise.all([
      getDoc(doc(db, 'users', user.uid))
        .then(snap => (snap.exists() ? snap.data() : null))
        .catch(() => null),
      getDoc(doc(db, 'users', user.uid, 'parentalConsent', 'consent'))
        .then(c => c.exists() && c.data()?.status === 'approved')
        .catch(() => false),
    ]);

    // Compte Google sans profil complété (pas de date de naissance) → doit finir l'inscription.
    const isGoogle = user.providerData?.some(p => p.providerId === 'google.com');
    setNeedsProfileSetup(!!isGoogle && !profile?.birthDate);

    const premium = profile?.plan === 'premium';
    setIsPremium(premium);
    setPremiumStatus(premium);

    // Mineur <15 ans non approuvé → accès bloqué (que le doc soit absent OU en attente).
    setConsentBlocked(isUnder15(profile?.birthDate) && !approved);
    setGateUid(user.uid);
  }

  // Re-vérifie le gate pour l'utilisateur courant (après signup, retour de consentement…).
  function refreshGate() {
    if (auth.currentUser) return loadGateState(auth.currentUser);
  }

  // --- Écoute l'état de connexion Firebase ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      bindServicesToUser(user?.uid ?? null);
      // Remplace l'utilisateur issu du cache par le vrai (ou null : session
      // invalide → PrivateRoute redirige vers /welcome).
      setCurrentUser(user);
      if (!user) clearSessionCache();

      await loadGateState(user);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Session confirmée par Firebase et gate calculé pour cet utilisateur →
  // on mémorise l'état pour le prochain démarrage.
  useEffect(() => {
    if (loading || !currentUser || gateUid !== currentUser.uid) return;
    writeSessionCache(currentUser, { isPremium, consentBlocked, needsProfileSetup });
  }, [loading, currentUser, gateUid, isPremium, consentBlocked, needsProfileSetup]);

  // Permet de re-vérifier le statut premium (après retour Stripe)
  async function refreshPremium() {
    if (!auth.currentUser) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const premium = userDoc.exists() && userDoc.data()?.plan === 'premium';
      setIsPremium(premium);
      setPremiumStatus(premium);
    } catch {
      // ignore
    }
  }

  // Identité stable du value : sans useMemo, chaque render du provider
  // re-rendait tous les consommateurs (~15 pages/composants). Les fonctions
  // sont recréées à chaque render mais seules celles closant sur un état
  // listé en dépendance (getUserLevel/getUserClasse → currentUser) doivent
  // être fraîches — currentUser est bien dans les deps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(() => ({
    currentUser,
    loading,
    consentBlocked,
    needsProfileSetup,
    isPremium,
    refreshPremium,
    refreshGate,
    signup,
    login,
    loginWithGoogle,
    logout,
    resetPassword,
    getUserClasse,
    getUserLevel,
    setUserLevel,
    updateDisplayName,
    updateUserEmail,
    updateUserPassword,
    resendVerificationEmail,
    deleteAccount,
  }), [currentUser, loading, consentBlocked, needsProfileSetup, isPremium]);

  // Enfants rendus dès que Firebase a confirmé la session — ou immédiatement
  // depuis le cache local (démarrage optimiste). Sans cache, on attend :
  // ça évite un flash de redirection vers /welcome.
  const ready = !loading || cached !== null;
  return (
    <AuthContext.Provider value={value}>
      {ready && children}
    </AuthContext.Provider>
  );
}
