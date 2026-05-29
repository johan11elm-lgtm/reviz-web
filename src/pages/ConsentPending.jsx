import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Inscription.css';

export default function ConsentPending() {
  const { state } = useLocation();
  const { currentUser, consentBlocked, refreshGate, logout } = useAuth();
  const navigate = useNavigate();
  const [parentEmail, setParentEmail] = useState(state?.parentEmail ?? '');
  const [sent, setSent]       = useState(Boolean(state?.parentEmail));
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [msg, setMsg]         = useState('');

  const prenom = currentUser?.displayName ?? '';

  // Si le consentement n'est plus bloquant (parent a approuvé), on entre.
  useEffect(() => {
    if (currentUser && !consentBlocked) navigate('/', { replace: true });
  }, [currentUser, consentBlocked, navigate]);

  async function handleSend() {
    if (!/^\S+@\S+\.\S+$/.test(parentEmail.trim())) { setMsg('Adresse email invalide.'); return; }
    setLoading(true); setMsg('');
    try {
      await fetch('/api/send-parental-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: currentUser?.uid, parentEmail: parentEmail.trim(), childName: prenom }),
      });
      setSent(true);
    } catch {
      setMsg('Impossible d\'envoyer l\'email. Réessaie.');
    } finally { setLoading(false); }
  }

  async function handleCheck() {
    setChecking(true); setMsg('');
    try { await refreshGate?.(); } finally { setChecking(false); }
    // Le useEffect ci-dessus redirige automatiquement si le compte est débloqué.
    setMsg('Toujours en attente de l\'accord de ton parent.');
  }

  async function handleLogout() {
    await logout();
    navigate('/welcome', { replace: true });
  }

  return (
    <div className="app">
      <div className="auth-content" style={{ paddingTop: 48, textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>📬</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Autorisation parentale requise</h2>

        {sent ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.5, marginBottom: 24 }}>
            Un email a été envoyé à <strong>{parentEmail}</strong>.<br />
            Ton parent doit cliquer sur le lien de confirmation pour activer ton compte.
          </p>
        ) : (
          <>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.5, marginBottom: 16 }}>
              Comme tu as moins de 15 ans, on a besoin de l'accord d'un parent. Entre son email pour lui envoyer la demande.
            </p>
            <div className="auth-field" style={{ textAlign: 'left', marginBottom: 12 }}>
              <label className="auth-label">Email de ton parent</label>
              <input
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
            {loading ? 'Envoi...' : 'Envoyer la demande'}
          </button>
        ) : (
          <button className="auth-btn" style={{ marginBottom: 12 }} onClick={handleCheck} disabled={checking}>
            {checking ? 'Vérification...' : 'J\'ai l\'accord → vérifier'}
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
