// -------------------------------------------------------
// Réviz — Contexte d'authentification Firebase
// -------------------------------------------------------
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  verifyBeforeUpdateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail,
  sendEmailVerification,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithCredential,
  signInWithCustomToken,
  revokeAccessToken,
  deleteUser,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { auth, db } from '../services/firebaseConfig';
import { parseLevel, serializeLevel, migrateLegacyClasse, isUnder15 } from '../utils/levels';
import { consentGate } from '../utils/consent';
import { createUserProfile } from '../services/userProfileService';
import { setActiveUser, pushLessonsToFirestore } from '../services/historyService';
import { setActiveUser as setRevisionUser, pushRevisionsToFirestore, lierEssai } from '../services/revisionService';
import { readGuest, startGuest, clearGuest, guestUser, isGuestUid, migrateGuestLocalData } from '../services/guestService';
import { setSrsUser } from '../services/srsService';
import { setChallengeUser } from '../services/challengeService';
import { setScanLimitUser, setPremiumStatus, setRevizPlusOffert } from '../services/scanLimitService';
import { estFondateur } from '../utils/revizPlus.js';
import { lancementOffert } from '../../api/_lancement.js';
import { readSessionCache, writeSessionCache, clearSessionCache, userFromSessionCache } from '../services/sessionCache';
import { track } from '../services/statsService';
import { apiFetch, apiUrl } from '../services/apiClient';
import { noterEmailEnAttente, oublierEmailEnAttente } from '../services/emailEnAttente';
import { collection, getDocs, deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { noterOuverture } from '../services/retourService';
import { reprendreAvatarDuProfil } from '../services/avatarService';
import { reprendreQuetesDuProfil } from '../services/quetesService';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

// Rattache les services locaux (clés localStorage par utilisateur) à un uid.
/** Champs d'abonnement du profil Firestore (api/stripe-webhook.js). */
function lireAbonnement(profile) {
  if (profile?.plan !== 'premium') return null;
  return {
    formule: profile.formule ?? null,
    fondateur: profile.fondateur ?? null,
    periodeFin: profile.periodeFin ?? null,
    annuleLe: profile.annuleLe ?? null,
  };
}

function bindServicesToUser(uid) {
  setActiveUser(uid);
  setRevisionUser(uid);
  setSrsUser(uid);
  setChallengeUser(uid);
  setScanLimitUser(uid);
}

// Fournisseur pour la popup web (signInWithPopup).
function providerWeb(id) {
  if (id === 'google') return new GoogleAuthProvider();
  if (id === 'apple') {
    const p = new OAuthProvider('apple.com');
    p.addScope('email');
    p.addScope('name');
    p.setCustomParameters({ locale: 'fr_FR' });
    return p;
  }
  if (id === 'microsoft') {
    const p = new OAuthProvider('microsoft.com');
    // Comptes perso ET scolaires (Office 365 du lycée) ; choix du compte à chaque fois.
    p.setCustomParameters({ prompt: 'select_account' });
    return p;
  }
  throw new Error(`Fournisseur inconnu : ${id}`);
}

// Les liens des e-mails (confirmation, nouvelle adresse) ramènent dans l'appli : la page Firebase
// affiche « Continuer ». Domaine autorisé dans Firebase Auth ; s'il ne l'était plus, le lien part
// quand même, sans le retour.
const RETOUR_LIEN = { url: 'https://app.revizapp.fr/' };
const RETOUR_REFUSE = ['auth/unauthorized-continue-uri', 'auth/invalid-continue-uri', 'auth/missing-continue-uri'];
async function envoyerLien(envoi) {
  try {
    await envoi(RETOUR_LIEN);
  } catch (err) {
    if (!RETOUR_REFUSE.includes(err?.code)) throw err;
    await envoi(undefined);
  }
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
  // Mode essai (« sans compte ») : un invité (prénom + classe) vit dans le
  // navigateur, sans Firestore. Une vraie session en cache prime sur lui.
  const [guest, setGuest] = useState(() => {
    if (cached) return null;
    const g = readGuest();
    if (g) bindServicesToUser(g.uid);
    return g;
  });
  const [currentUser, setCurrentUser]   = useState(() => (cached ? userFromSessionCache(cached, auth) : guest ? guestUser(guest) : null));
  // true tant que Firebase n'a pas confirmé la session (même si l'app est déjà rendue depuis le cache).
  const [loading, setLoading]           = useState(true);
  // Mineur <15 ans dont l'accès est suspendu : email parent pas encore
  // parti, refus du parent, ou délai de réponse écoulé (voir utils/consent).
  const [consentBlocked, setConsentBlocked] = useState(cached?.consentBlocked ?? false);
  // Détail du consentement : { status, parentEmail, joursRestants }.
  const [consent, setConsent] = useState(() => ({
    status: cached?.consentStatus ?? 'ok', parentEmail: null, joursRestants: null,
  }));
  // Compte sans date de naissance dans son profil → fin d'inscription (/finish-setup).
  const [needsProfileSetup, setNeedsProfileSetup] = useState(cached?.needsProfileSetup ?? false);
  // Vrai pendant signup() : la fiche n'a pas encore le profil, ce n'est pas un profil incomplet.
  const inscriptionEnCours = useRef(false);
  const [isPremium, setIsPremium] = useState(cached?.isPremium ?? false);
  // Récapitulatif de l'abonnement écrit par le webhook Stripe (formule,
  // tarif fondateur, fin de période, annulation programmée) ; null sans abonnement.
  const [abonnement, setAbonnement] = useState(null);
  // uid pour lequel le gate ci-dessus a été calculé (Firestore) — garde le cache cohérent.
  const [gateUid, setGateUid] = useState(cached?.uid ?? null);
  // Incrémenté quand le niveau change hors d'un setState (localStorage) pour
  // que les consommateurs de getUserLevel() se re-rendent.
  const [levelTick, setLevelTick] = useState(0);

  // --- Inscription ---
  // `level` est un objet { cycle, classe, specialites?, filiere? }
  async function signup(prenom, email, password, level, birthDate = null) {
    inscriptionEnCours.current = true;
    try {
      return await inscrire(prenom, email, password, level, birthDate);
    } finally {
      inscriptionEnCours.current = false;
    }
  }

  async function inscrire(prenom, email, password, level, birthDate) {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    track('compte_cree', { classe: level?.classe });
    await updateProfile(user, { displayName: prenom });
    // Envoyer l'email de vérification (fire-and-forget)
    envoyerLien(reglages => sendEmailVerification(user, reglages)).catch(() => {});
    // Profil persistant dans Firestore — ATTENDU : le gate de consentement
    // mineur en dépend (birthDate), donc on ne le laisse pas en fire-and-forget.
    try {
      await createUserProfile(user.uid, { prenom, email, birthDate, level });
    } catch (err) {
      // Best-effort (l'élève entre quand même, le profil se complète à son retour), mais
      // signalé à Sentry : un refus muet a vidé les profils des essais devenus comptes (26-29/10).
      globalThis.reportError?.(err);
    }
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
    if (auth.currentUser) return envoyerLien(reglages => sendEmailVerification(auth.currentUser, reglages));
  }

  // --- Corriger l'adresse d'un compte pas encore confirmé (carte d'activation) ---
  // La protection contre l'énumération des e-mails (Firebase Auth) refuse updateEmail : le lien part
  // à la nouvelle adresse, et un clic dessus la remplace et la confirme d'un coup. Mot de passe
  // seulement si Firebase redemande une connexion récente (auth/requires-recent-login).
  async function corrigerEmail(nouvelle, password) {
    const user = auth.currentUser;
    if (password) await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
    await envoyerLien(reglages => verifyBeforeUpdateEmail(user, nouvelle, reglages));
    noterEmailEnAttente(user.uid, nouvelle);
  }

  // --- Relire le compte (e-mail confirmé ailleurs) : les pages se re-rendent ---
  function actualiserCompte() {
    if (auth.currentUser) setCurrentUser({ ...auth.currentUser });
  }

  // --- Connexion ---
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // --- Connexion Google / Apple / Microsoft / TikTok ---
  // Web : popup Firebase classique. App native (Capacitor) : la popup ne
  // fonctionne pas dans la WebView — on passe par le SDK natif
  // (@capacitor-firebase/authentication) puis on ouvre une session
  // Firebase JS : tout l'aval (onAuthStateChanged, Firestore, gating)
  // reste identique quel que soit le fournisseur.
  async function loginWithProvider(id) {
    if (id === 'tiktok') {
      // Redirection complète : /api/auth renvoie sur /connexion avec un
      // jeton Firebase (cf. loginWithCustomToken).
      window.location.assign(apiUrl('/api/auth?action=tiktok'));
      return null;
    }
    if (Capacitor.isNativePlatform()) return loginNatif(id);
    const { user } = await signInWithPopup(auth, providerWeb(id));
    return user;
  }

  // Compat : anciens appels.
  function loginWithGoogle() {
    return loginWithProvider('google');
  }

  async function loginNatif(id) {
    const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
    const appel = {
      google:    () => FirebaseAuthentication.signInWithGoogle(),
      apple:     () => FirebaseAuthentication.signInWithApple(),
      // Firebase refuse les jetons Microsoft dans signInWithCredential :
      // connexion côté natif, puis passage de session via /api/auth.
      microsoft: () => FirebaseAuthentication.signInWithMicrosoft({ skipNativeAuth: false }),
    }[id];
    if (!appel) throw new Error(`Fournisseur inconnu : ${id}`);
    let result;
    try {
      result = await appel();
    } catch (err) {
      // Annulation du sheet natif → même code que la popup web fermée,
      // déjà ignoré par Connexion/Inscription.
      const cancelled = /cancel|12501|dismiss|1001/i.test(err?.message ?? '');
      const e = new Error(err?.message ?? 'Connexion impossible');
      e.code = cancelled ? 'auth/popup-closed-by-user' : 'auth/native-signin-failed';
      throw e;
    }

    if (id === 'microsoft') {
      const { token } = await FirebaseAuthentication.getIdToken();
      const res = await apiFetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'natif', idToken: token }),
      });
      const data = await res.json().catch(() => ({}));
      // La session JS prend le relais : la session native ne sert plus.
      FirebaseAuthentication.signOut().catch(() => {});
      if (!res.ok || !data.customToken) {
        const e = new Error(data.error ?? 'Connexion Microsoft impossible');
        e.code = 'auth/native-signin-failed';
        throw e;
      }
      return loginWithCustomToken(data.customToken);
    }

    const idToken = result?.credential?.idToken;
    if (!idToken) {
      const e = new Error('Connexion annulée');
      e.code = 'auth/popup-closed-by-user';
      throw e;
    }
    const credential = id === 'apple'
      ? new OAuthProvider('apple.com').credential({ idToken, rawNonce: result.credential.nonce })
      : GoogleAuthProvider.credential(idToken);
    const { user } = await signInWithCredential(auth, credential);
    // Apple ne transmet le nom qu'à la toute première connexion, et
    // seulement au SDK natif : on le recopie sur le compte Firebase.
    const nomApple = result?.user?.displayName;
    if (id === 'apple' && nomApple && !user.displayName) {
      await updateProfile(user, { displayName: nomApple }).catch(() => {});
      setCurrentUser({ ...auth.currentUser });
    }
    return user;
  }

  // Session ouverte par le serveur (TikTok, Microsoft natif).
  async function loginWithCustomToken(token) {
    const { user } = await signInWithCustomToken(auth, token);
    return user;
  }

  // --- Déconnexion ---
  function logout() {
    clearSessionCache();
    // Déconnexion voulue : l'adresse corrigée en attente ne doit pas être proposée à la connexion.
    oublierEmailEnAttente();
    if (guest) {
      // Fin de la session d'essai : rien à révoquer côté serveur.
      clearGuest();
      bindServicesToUser(null);
      setGuest(null);
      setCurrentUser(null);
      return Promise.resolve();
    }
    return signOut(auth);
  }

  // --- Mode essai : prénom + classe, sans compte ---
  function loginAsGuest({ prenom, level }) {
    const g = startGuest({ prenom, level });
    track('essai_demarre', { classe: level?.classe });
    bindServicesToUser(g.uid);
    setPremiumStatus(false);
    setIsPremium(false);
    setConsentBlocked(false);
    setConsent({ status: 'ok', parentEmail: null, joursRestants: null });
    setNeedsProfileSetup(false);
    setGuest(g);
    setCurrentUser(guestUser(g));
    return g;
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
  // Même chemin que la correction : l'adresse change au clic sur le lien reçu à la nouvelle.
  function updateUserEmail(newEmail, password) {
    return corrigerEmail(newEmail, password);
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
    // Compte Apple dans l'app iOS : Apple exige de révoquer l'accès à la
    // suppression (App Store 5.1.1). Il faut un code tout frais → on
    // redemande la connexion Apple, qui sert aussi de réauthentification.
    if (Capacitor.isNativePlatform() && user.providerData?.some(p => p.providerId === 'apple.com')) {
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
      const result = await FirebaseAuthentication.signInWithApple();
      const { idToken, nonce, authorizationCode } = result?.credential ?? {};
      await reauthenticateWithCredential(
        user,
        new OAuthProvider('apple.com').credential({ idToken, rawNonce: nonce }),
      );
      if (authorizationCode) {
        await revokeAccessToken(auth, authorizationCode)
          .catch(e => console.warn('[Réviz] Révocation Apple impossible', e));
      }
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
    // Le profil Firestore suit, pour retrouver la classe sur un autre appareil.
    if (!isGuestUid(currentUser.uid)) {
      setDoc(doc(db, 'users', currentUser.uid), { level }, { merge: true }).catch(() => {});
    }
    setLevelTick(n => n + 1);
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
      setConsent({ status: 'ok', parentEmail: null, joursRestants: null });
      setNeedsProfileSetup(false);
      setIsPremium(false);
      setPremiumStatus(false);
      setAbonnement(null);
      setGateUid(null);
      return;
    }
    // Lue avant les lectures : une fiche lue pendant l'inscription peut précéder le profil.
    const pendantInscription = inscriptionEnCours.current;
    // Les deux lectures partent en parallèle : un seul aller-retour Firestore
    // au lieu de deux enchaînés. Lecture impossible → on n'élève pas le
    // blocage (fail-open UX). Profil : null = pas de fiche, undefined = lecture ratée.
    const [profile, consentDoc] = await Promise.all([
      getDoc(doc(db, 'users', user.uid))
        .then(snap => (snap.exists() ? snap.data() : null))
        .catch(() => undefined),
      getDoc(doc(db, 'users', user.uid, 'parentalConsent', 'consent'))
        .then(c => (c.exists() ? c.data() : null))
        .catch(() => null),
    ]);

    // Classe retrouvée depuis le profil quand ce navigateur ne la connaît pas
    // (nouvel appareil, poste du CDI) : getUserLevel() ne lit que localStorage.
    const levelKey = `reviz-level-${user.uid}`;
    if (profile?.level?.cycle && !localStorage.getItem(levelKey)) {
      localStorage.setItem(levelKey, serializeLevel(profile.level));
      setLevelTick(n => n + 1);
    }
    // Et l'inverse : profil resté sans prénom ou sans classe (essais devenus comptes du 26 au
    // 29/10, écriture refusée) → complété par le prénom du compte et la classe de ce navigateur.
    // Jamais de création de fiche ici, ni d'écrasement d'un champ rempli.
    const manque = {};
    const levelLocal = parseLevel(localStorage.getItem(levelKey));
    if (profile && !user.isAnonymous) {
      if (!profile.prenom && user.displayName) manque.prenom = user.displayName;
      if (!profile.level?.cycle && levelLocal?.cycle) manque.level = levelLocal;
    }
    if (Object.keys(manque).length) {
      setDoc(doc(db, 'users', user.uid), manque, { merge: true }).catch(() => {});
    }

    // Pas de date de naissance → doit finir l'inscription : compte Google, Apple, Microsoft,
    // TikTok à sa première connexion, ou compte e-mail dont le profil n'a pas été enregistré
    // (essais devenus comptes du 26 au 29/10). Jamais pendant l'inscription par e-mail, ni
    // sur une lecture ratée.
    setNeedsProfileSetup(!user.isAnonymous && profile !== undefined && !profile?.birthDate && !pendantInscription);
    // Photo de profil choisie sur un autre appareil.
    reprendreAvatarDuProfil(user.uid, profile?.avatar);
    // Récompenses de quêtes récupérées sur un autre appareil.
    reprendreQuetesDuProfil(user.uid, profile?.quetes);

    const premium = profile?.plan === 'premium';
    setIsPremium(premium);
    setPremiumStatus(premium);
    setAbonnement(lireAbonnement(profile));

    // Mineur <15 ans : accès ouvert le temps de donner l'email d'un parent
    // puis d'attendre sa réponse ; suspendu à l'issue d'un délai ou en cas de refus.
    // Naissance perdue (essais devenus comptes, 26-29/10) : la trace de consentement, posée à
    // l'inscription seulement pour un moins de 15 ans, suffit à le savoir mineur.
    const { blocked, ...detail } = consentGate({
      under15: isUnder15(profile?.birthDate) || (!profile?.birthDate && !!consentDoc),
      consent: consentDoc,
      inscritLe: Date.parse(user.metadata?.creationTime) || null,
    });
    setConsentBlocked(blocked);
    setConsent(detail);
    setGateUid(user.uid);
  }

  // Re-vérifie le gate pour l'utilisateur courant (après signup, retour de consentement…).
  function refreshGate() {
    if (auth.currentUser) return loadGateState(auth.currentUser);
  }

  // --- Écoute l'état de connexion Firebase ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) {
        clearSessionCache();
        // Pas de session Firebase : un invité en cours reste en mode essai.
        const g = readGuest();
        if (g) {
          bindServicesToUser(g.uid);
          setGuest(g);
          setCurrentUser(guestUser(g));
          await loadGateState(null);
          setLoading(false);
          return;
        }
      } else {
        // Un invité qui vient de créer son compte (ou de se connecter) :
        // sa progression d'essai suit sur le vrai compte.
        const g = readGuest();
        if (g) {
          const { lessons, revisions } = migrateGuestLocalData(g.uid, user.uid);
          bindServicesToUser(user.uid);
          pushLessonsToFirestore(lessons);
          pushRevisionsToFirestore(revisions);
          lierEssai(g.uid);
        }
      }
      bindServicesToUser(user?.uid ?? null);
      setGuest(null);
      // Remplace l'utilisateur issu du cache par le vrai (ou null : session
      // invalide → PrivateRoute redirige vers /welcome).
      setCurrentUser(user);

      await loadGateState(user);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Session confirmée par Firebase et gate calculé pour cet utilisateur →
  // on mémorise l'état pour le prochain démarrage.
  useEffect(() => {
    if (loading || !currentUser || gateUid !== currentUser.uid) return;
    writeSessionCache(currentUser, { isPremium, consentBlocked, consentStatus: consent.status, needsProfileSetup });
  }, [loading, currentUser, gateUid, isPremium, consentBlocked, consent.status, needsProfileSetup]);

  // Jour d'ouverture (mesure des retours) : au démarrage, puis à chaque
  // retour au premier plan, l'app restant souvent ouverte d'un jour à l'autre.
  useEffect(() => {
    if (loading || !currentUser) return;
    noterOuverture(currentUser);
    const auPremierPlan = () => { if (document.visibilityState === 'visible') noterOuverture(currentUser); };
    document.addEventListener('visibilitychange', auPremierPlan);
    return () => document.removeEventListener('visibilitychange', auPremierPlan);
  }, [loading, currentUser?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Permet de re-vérifier le statut premium (après retour Stripe)
  async function refreshPremium() {
    if (!auth.currentUser) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const premium = userDoc.exists() && userDoc.data()?.plan === 'premium';
      setIsPremium(premium);
      setPremiumStatus(premium);
      setAbonnement(lireAbonnement(userDoc.exists() ? userDoc.data() : null));
    } catch {
      // ignore
    }
  }

  // Réviz+ offert à tous jusqu'au 25 octobre (même règle que l'API).
  const offert = !isPremium && lancementOffert();
  setRevizPlusOffert(offert); // simple variable de module, réglée avant le rendu des enfants

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
    consent,
    needsProfileSetup,
    isPremium, // abonnement payé (Stripe)
    abonnement,
    // Avantages Réviz+ : abonné, ou offert (à tous pendant le lancement).
    hasRevizPlus: isPremium || offert,
    revizPlusOffert: offert,
    // Compte créé pendant le lancement (jamais un invité).
    estFondateur: !!currentUser && !currentUser.isGuest && estFondateur(currentUser.metadata?.creationTime),
    isGuest: !!currentUser?.isGuest,
    loginAsGuest,
    refreshPremium,
    refreshGate,
    signup,
    login,
    loginWithGoogle,
    loginWithProvider,
    loginWithCustomToken,
    logout,
    resetPassword,
    getUserClasse,
    getUserLevel,
    setUserLevel,
    updateDisplayName,
    updateUserEmail,
    updateUserPassword,
    resendVerificationEmail,
    corrigerEmail,
    actualiserCompte,
    deleteAccount,
  }), [currentUser, loading, consentBlocked, consent, needsProfileSetup, isPremium, abonnement, offert, guest, levelTick]);

  // Enfants rendus dès que Firebase a confirmé la session — ou immédiatement
  // depuis le cache local (démarrage optimiste). Sans cache, on attend :
  // ça évite un flash de redirection vers /welcome.
  const ready = !loading || cached !== null || guest !== null;
  return (
    <AuthContext.Provider value={value}>
      {ready && children}
    </AuthContext.Provider>
  );
}
