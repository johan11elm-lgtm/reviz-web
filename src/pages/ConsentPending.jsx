import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Inscription.css';

export default function ConsentPending() {
  const { state } = useLocation();
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [resent, setResent]   = useState(false);
  const [loading, setLoading] = useState(false);

  const parentEmail = state?.parentEmail ?? '';
  const prenom = currentUser?.displayName ?? '';

  async function handleResend() {
    setLoading(true);
    try {
      await fetch('/api/send-parental-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: currentUser?.uid, parentEmail, childName: prenom }),
      });
      setResent(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/welcome', { replace: true });
  }

  return (
    <div className="app">
      <div className="auth-content" style={{ paddingTop: 48, textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>📬</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>En attente d'autorisation</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.5, marginBottom: 24 }}>
          Un email a été envoyé à <strong>{parentEmail}</strong>.<br />
          Ton parent doit cliquer sur le lien de confirmation pour activer ton compte.
        </p>

        {resent ? (
          <p style={{ color: '#22C55E', fontWeight: 600, marginBottom: 16 }}>✓ Email renvoyé !</p>
        ) : (
          <button
            className="auth-btn"
            style={{ marginBottom: 12 }}
            onClick={handleResend}
            disabled={loading || !parentEmail}
          >
            {loading ? 'Envoi...' : 'Renvoyer l\'email'}
          </button>
        )}

        <button
          className="auth-btn"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          onClick={handleLogout}
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
