import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../services/firebaseConfig';
import './VerifyEmail.css';

export default function VerifyEmail() {
  const { currentUser, resendVerificationEmail } = useAuth();
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const navigate = useNavigate();

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
    try {
      await auth.currentUser?.reload();
      if (auth.currentUser?.emailVerified) {
        navigate('/onboarding', { replace: true });
      } else {
        navigate('/onboarding', { replace: true }); // on laisse passer de toute façon
      }
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="app ve-page">
      <div className="ve-icon">📬</div>
      <h1 className="ve-title">Vérifie ton email</h1>
      <p className="ve-sub">
        On a envoyé un lien de confirmation à<br />
        <strong>{currentUser?.email}</strong>
      </p>
      <p className="ve-hint">
        Clique sur le lien dans l'email pour activer ton compte. Vérifie aussi tes spams !
      </p>

      <button className="ve-btn-main" onClick={handleContinue} disabled={checking}>
        {checking ? 'Vérification...' : "J'ai confirmé mon email →"}
      </button>

      <button className="ve-btn-ghost" onClick={handleResend} disabled={loading || sent}>
        {sent ? '✓ Email renvoyé !' : loading ? 'Envoi...' : 'Renvoyer l\'email'}
      </button>

      <button className="ve-btn-skip" onClick={() => navigate('/onboarding')}>
        Continuer sans vérifier
      </button>
    </div>
  );
}
