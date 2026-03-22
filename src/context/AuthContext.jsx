// -------------------------------------------------------
// Réviz — Contexte d'authentification Firebase
// -------------------------------------------------------
import { createContext, useContext, useEffect, useState } from 'react';
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
  deleteUser,
} from 'firebase/auth';
import { auth, db } from '../services/firebaseConfig';
import { setActiveUser } from '../services/historyService';
import { setActiveUser as setRevisionUser } from '../services/revisionService';
import { setSrsUser } from '../services/srsService';
import { setChallengeUser } from '../services/challengeService';
import { setBrevetUser } from '../services/brevetService';
import { setScanLimitUser } from '../services/scanLimitService';
import { collection, getDocs, deleteDoc, doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser]   = useState(null);
  const [loading, setLoading]           = useState(true);
  const [consentPending, setConsentPending] = useState(false);

  // --- Inscription ---
  async function signup(prenom, email, password, classe) {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(user, { displayName: prenom });
    // Envoyer l'email de vérification (fire-and-forget)
    sendEmailVerification(user).catch(() => {});
    // Forcer le re-render avec le displayName mis à jour
    setCurrentUser({ ...auth.currentUser });
    // La classe n'est pas gérée par Firebase Auth → on la met en localStorage
    if (classe) localStorage.setItem(`reviz-classe-${user.uid}`, classe);
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
  async function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    const { user } = await signInWithPopup(auth, provider);
    return user;
  }

  // --- Déconnexion ---
  function logout() {
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
    // Supprimer les données Firestore (lessons + revisions)
    try {
      const lessonsSnap = await getDocs(collection(db, 'users', uid, 'lessons'));
      await Promise.all(lessonsSnap.docs.map(d => deleteDoc(d.ref)));
      const revisionsSnap = await getDocs(collection(db, 'users', uid, 'revisions'));
      await Promise.all(revisionsSnap.docs.map(d => deleteDoc(d.ref)));
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
    // Supprimer le compte Firebase Auth
    await deleteUser(user);
  }

  // --- Classe de l'utilisateur (localStorage lié au uid) ---
  function getUserClasse() {
    if (!currentUser) return '';
    return localStorage.getItem(`reviz-classe-${currentUser.uid}`) ?? '';
  }

  // --- Écoute l'état de connexion Firebase ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      setActiveUser(user?.uid ?? null);
      setRevisionUser(user?.uid ?? null);
      setSrsUser(user?.uid ?? null);
      setChallengeUser(user?.uid ?? null);
      setBrevetUser(user?.uid ?? null);
      setScanLimitUser(user?.uid ?? null);
      setCurrentUser(user);

      // Vérifier le consentement parental pour les <15 ans
      if (user) {
        try {
          const consentDoc = await getDoc(
            doc(db, 'users', user.uid, 'parentalConsent', 'consent')
          );
          setConsentPending(consentDoc.exists() && consentDoc.data()?.status === 'pending');
        } catch {
          setConsentPending(false);
        }
      } else {
        setConsentPending(false);
      }

      setLoading(false);
    });
    return unsub;
  }, []);

  const value = {
    currentUser,
    loading,
    consentPending,
    signup,
    login,
    loginWithGoogle,
    logout,
    resetPassword,
    getUserClasse,
    updateDisplayName,
    updateUserEmail,
    updateUserPassword,
    resendVerificationEmail,
    deleteAccount,
  };

  // On ne rend les enfants qu'une fois Firebase prêt (évite le flash de redirect)
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
