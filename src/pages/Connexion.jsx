import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Connexion.css';

function firebaseErrorFr(code) {
  switch (code) {
    case 'auth/invalid-email':      return 'Adresse email invalide.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return 'Email ou mot de passe incorrect.';
    case 'auth/too-many-requests':  return 'Trop de tentatives. Réessaie plus tard.';
    default:                        return 'Une erreur est survenue. Réessaie.';
  }
}

export default function Connexion() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState('');
  const [resetSent, setResetSent] = useState(false);

  const { login, resetPassword } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(firebaseErrorFr(err.code));
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    if (!email) { setError('Entre ton email pour réinitialiser ton mot de passe.'); return; }
    try {
      await resetPassword(email);
      setResetSent(true);
      setError('');
    } catch (err) {
      setError(firebaseErrorFr(err.code));
    }
  }

  return (
    <div className="app">
      {/* Header */}
      <div className="auth-header">
        <Link to="/welcome" className="auth-back">←</Link>
        <span className="auth-title">Se connecter</span>
      </div>

      {/* Formulaire */}
      <form className="auth-content" onSubmit={handleSubmit} noValidate>
        <div className="auth-field">
          <label className="auth-label">Email</label>
          <input
            className="auth-input"
            type="email"
            placeholder="lucas@exemple.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div className="auth-field">
          <label className="auth-label">Mot de passe</label>
          <input
            className="auth-input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        {/* Mot de passe oublié */}
        <button type="button" className="auth-forgot" onClick={handleReset}>
          Mot de passe oublié ?
        </button>

        {resetSent && (
          <p className="auth-reset-sent">✉️ Email de réinitialisation envoyé !</p>
        )}

        <p className="auth-error">{error}</p>

        <button className="auth-btn" type="submit" disabled={!!loading}>
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>

        <p className="auth-link">
          Pas encore de compte ?{' '}
          <Link to="/inscription">Créer un compte</Link>
        </p>
      </form>
    </div>
  );
}
