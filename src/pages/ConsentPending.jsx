import { MailIcon } from '../components/Icons';
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sendParentalConsent, consentErrorMessage } from '../services/consentService';
import './Inscription.css';

// Écran affiché seulement quand l'accès d'un <15 ans est suspendu :
// email parent jamais parti, délai de réponse écoulé, ou refus du parent.
// Pendant l'attente de la réponse, l'élève utilise l'app normalement.
const TEXTES = {
  'a-demander': {
    titre: 'Préviens un parent',
    intro: 'Comme tu as moins de 15 ans, on envoie un email à un de tes parents pour lui dire que tu utilises Réviz. Tu peux réviser tout de suite.',
    bouton: 'Envoyer et commencer',
  },
  'sans-reponse': {
    titre: 'Ton parent n\'a pas encore répondu',
    intro: 'Sans son accord, ton accès est en pause. Demande-lui de regarder ses emails (et ses spams), ou renvoie la demande.',
    bouton: 'Renvoyer la demande',
  },
  refuse: {
    titre: 'Ton parent n\'a pas donné son accord',
    intro: 'Ton accès à Réviz est en pause. Si c\'était une erreur, parles-en avec lui puis renvoie la demande.',
    bouton: 'Renvoyer la demande',
  },
};

export default function ConsentPending() {
  const { state } = useLocation();
  const { currentUser, consentBlocked, consent, refreshGate, logout } = useAuth();
  const navigate = useNavigate();
  const [parentEmail, setParentEmail] = useState(state?.parentEmail ?? consent?.parentEmail ?? '');
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [msg, setMsg]         = useState('');

  const prenom = currentUser?.displayName ?? '';
  const textes = TEXTES[consent?.status] ?? TEXTES['a-demander'];

  // L'email du parent arrive avec le gate (Firestore) : pré-remplit le champ.
  useEffect(() => {
    if (consent?.parentEmail) setParentEmail(e => e || consent.parentEmail);
  }, [consent?.parentEmail]);

  // Accès rouvert (email parti, parent qui accepte) → on entre.
  useEffect(() => {
    if (currentUser && !consentBlocked) navigate('/', { replace: true });
  }, [currentUser, consentBlocked, navigate]);

  async function handleSend() {
    if (!/^\S+@\S+\.\S+$/.test(parentEmail.trim())) { setMsg('Adresse email invalide.'); return; }
    setLoading(true); setMsg('');
    try {
      await sendParentalConsent(parentEmail.trim(), prenom);
      setSent(true);
      // Premier envoi : l'accès s'ouvre, le useEffect ci-dessus redirige.
      await refreshGate?.();
    } catch (err) {
      setMsg(consentErrorMessage(err.message));
    } finally { setLoading(false); }
  }

  async function handleCheck() {
    setChecking(true); setMsg('');
    try { await refreshGate?.(); } finally { setChecking(false); }
    // Le useEffect ci-dessus redirige automatiquement si l'accès est rouvert.
    setMsg('Toujours en attente de l\'accord de ton parent.');
  }

  async function handleLogout() {
    await logout();
    navigate('/welcome', { replace: true });
  }

  return (
    <div className="app">
      <div className="auth-content" style={{ paddingTop: 48, textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 16, color: 'var(--accent-orange)' }}><MailIcon /></div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{textes.titre}</h2>

        {sent ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.5, marginBottom: 24 }}>
            Un email a été envoyé à <strong>{parentEmail}</strong>.<br />
            Dès qu'il aura accepté, ton accès reprendra.
          </p>
        ) : (
          <>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.5, marginBottom: 16 }}>
              {textes.intro}
            </p>
            <div className="auth-field" style={{ textAlign: 'left', marginBottom: 12 }}>
              <label className="auth-label" htmlFor="consent-parent-email">Email de ton parent</label>
              <input
                id="consent-parent-email"
                className="auth-input"
                type="email"
                placeholder="parent@exemple.com"
                value={parentEmail}
                onChange={e => setParentEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </>
        )}

        {msg && <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 12 }}>{msg}</p>}

        {!sent ? (
          <button className="auth-btn" style={{ marginBottom: 12 }} onClick={handleSend} disabled={loading || !parentEmail}>
            {loading ? 'Envoi...' : textes.bouton}
          </button>
        ) : (
          <button className="auth-btn" style={{ marginBottom: 12 }} onClick={handleCheck} disabled={checking}>
            {checking ? 'Vérification...' : 'Il a accepté → vérifier'}
          </button>
        )}

        <button
          className="auth-btn"
          style={{ background: 'var(--bg-muted)', color: 'var(--text-primary)' }}
          onClick={handleLogout}
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
