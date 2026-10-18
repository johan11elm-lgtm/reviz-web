import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../services/firebaseConfig';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { Mascot } from '../components/Mascot';
import { mesurer } from '../services/mesure';
import './Inscription.css';
import './VerifyEmail.css';

export default function VerifyEmail() {
  const { currentUser, resendVerificationEmail } = useAuth();
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [notYet, setNotYet]   = useState(false);
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();

  async function handleResend() {
    setLoading(true);
    try {
      await resendVerificationEmail();
      setSent(true);
      setTimeout(() => setSent(false), 4000);
    } finally {
      setLoading(false);
    }
  }

  async function handleContinue() {
    setChecking(true);
    setNotYet(false);
    try {
      await auth.currentUser?.reload();
      if (auth.currentUser?.emailVerified) {
        // Force un nouveau idToken : le claim email_verified est vérifié
        // côté serveur (scan, paiement), il doit être à jour dans le token.
        await auth.currentUser.getIdToken(true);
        mesurer('email_verifie');
        navigate('/onboarding', { replace: true });
      } else {
        setNotYet(true);
        setTimeout(() => setNotYet(false), 5000);
      }
    } finally {
      setChecking(false);
    }
  }

  const adresse = (
    <p className="ve-adresse">
      Lien envoyé à <strong>{currentUser?.email}</strong>. Pense à regarder dans les spams.
    </p>
  );

  const actions = (
    <>
      <button className="auth-btn" onClick={handleContinue} disabled={checking}>
        {checking ? 'Vérification…' : "J'ai confirmé mon email"}
      </button>
      {notYet && (
        <p className="ve-pas-encore" role="alert">
          Ton email n'est pas encore confirmé. Clique sur le lien dans l'email, puis reviens ici.
        </p>
      )}
      <button className="ve-btn-ghost" onClick={handleResend} disabled={loading || sent}>
        {sent ? '✓ Email renvoyé' : loading ? 'Envoi…' : 'Renvoyer l\'email'}
      </button>
      <button className="ve-btn-skip" onClick={() => navigate('/onboarding')}>
        Explorer sans vérifier (scan et Réviz+ bloqués)
      </button>
    </>
  );

  // Ordinateur : la même composition que l'inscription (auth-desk, desktop.css).
  if (isDesktop) {
    return (
      <div className="app auth-desk-page">
        <div className="auth-desk">
          <div className="auth-desk-intro">
            <span className="auth-desk-mascot"><Mascot pose="pointing" size={132} alt="" aria-hidden="true" /></span>
            <h1 className="signup-question">Vérifie ton email</h1>
            <p className="signup-hint">Un clic sur le lien reçu, et ton compte est activé.</p>
            <ul className="auth-desk-why">
              <li>Le lien confirme que l'adresse est bien <strong>la tienne</strong> : c'est elle qui permet de retrouver ton compte.</li>
              <li>Le scan de leçons et Réviz+ s'ouvrent <strong>une fois l'email confirmé</strong>.</li>
            </ul>
          </div>
          <div className="auth-desk-card">
            {adresse}
            {actions}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app ve-page">
      <div className="auth-content signup-content ve-content">
        <Mascot pose="pointing" size={112} className="ve-mascot" alt="" aria-hidden="true" />
        <h1 className="signup-question">Vérifie ton email</h1>
        <p className="signup-hint">Un clic sur le lien reçu, et ton compte est activé.</p>
        {adresse}
      </div>
      <div className="signup-footer">
        {actions}
      </div>
    </div>
  );
}
