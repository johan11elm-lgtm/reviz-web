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
} from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import { setActiveUser } from '../services/historyService';
import { setActiveUser as setRevisionUser } from '../services/revisionService';
import { setSrsUser } from '../services/srsService';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading]         = useState(true);

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

  // --- Classe de l'utilisateur (localStorage lié au uid) ---
  function getUserClasse() {
    if (!currentUser) return '';
    return localStorage.getItem(`reviz-classe-${currentUser.uid}`) ?? '';
  }

  // --- Écoute l'état de connexion Firebase ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setActiveUser(user?.uid ?? null);     // historique lié à l'UID
      setRevisionUser(user?.uid ?? null);   // révisions liées à l'UID
      setSrsUser(user?.uid ?? null);        // SRS lié à l'UID
      setCurrentUser(user);
      setLoading(false);
    });
    return unsub;
  }, []);

  const value = {
    currentUser,
    loading,
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
  };

  // On ne rend les enfants qu'une fois Firebase prêt (évite le flash de redirect)
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
