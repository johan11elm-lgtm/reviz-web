// -------------------------------------------------------
// Réviz — Boutons « Continuer avec … » (Connexion / Inscription)
// Google est toujours proposé. Apple, Microsoft et TikTok s'allument via
// VITE_AUTH_PROVIDERS (ex. "apple,microsoft,tiktok") une fois le
// fournisseur configuré côté Firebase / TikTok — sans ça, le bouton
// mènerait à une erreur.
// -------------------------------------------------------
import { Capacitor } from '@capacitor/core';
import './SocialLogin.css';

const ACTIFS = new Set(
  (import.meta.env.VITE_AUTH_PROVIDERS ?? '').split(',').map(s => s.trim()).filter(Boolean),
);

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function AppleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 814 1000" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="currentColor" d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
    </svg>
  );
}

function MicrosoftLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
      <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
    </svg>
  );
}

function TiktokLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="currentColor" d="M41 15.6a11.5 11.5 0 0 1-9.6-5.1V31a11.6 11.6 0 1 1-11.6-11.6c.4 0 .8 0 1.2.1v5.9a5.8 5.8 0 1 0 4.6 5.6V4h5.8a11.5 11.5 0 0 0 9.6 9.8z"/>
    </svg>
  );
}

const FOURNISSEURS = [
  { id: 'apple',     label: 'Continuer avec Apple',     Logo: AppleLogo },
  { id: 'google',    label: 'Continuer avec Google',    Logo: GoogleLogo },
  { id: 'microsoft', label: 'Continuer avec Microsoft', Logo: MicrosoftLogo },
  // Connexion TikTok = redirection web : pas encore branchée dans l'app iOS.
  { id: 'tiktok',    label: 'Continuer avec TikTok',    Logo: TiktokLogo, webSeulement: true },
];

export function fournisseursVisibles() {
  const natif = Capacitor.isNativePlatform();
  return FOURNISSEURS.filter(f =>
    (f.id === 'google' || ACTIFS.has(f.id)) && !(natif && f.webSeulement));
}

export default function SocialLogin({ onLogin, disabled }) {
  return (
    <div className="auth-social">
      {fournisseursVisibles().map(({ id, label, Logo }) => (
        <button
          key={id}
          type="button"
          className="auth-google-btn"
          onClick={() => onLogin(id)}
          disabled={disabled}
        >
          <Logo />
          {label}
        </button>
      ))}
    </div>
  );
}

// Message d'erreur commun aux pages Connexion / Inscription.
// null = rien à afficher (l'utilisateur a fermé la fenêtre).
export function erreurConnexionSociale(err) {
  switch (err?.code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return null;
    case 'auth/account-exists-with-different-credential':
      return 'Un compte existe déjà avec cet e-mail. Connecte-toi avec ta méthode habituelle.';
    case 'auth/popup-blocked':
      return 'La fenêtre de connexion a été bloquée. Autorise les pop-ups et réessaie.';
    default:
      return 'Connexion impossible. Réessaie.';
  }
}
