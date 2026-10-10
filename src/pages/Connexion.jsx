import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SocialLogin, { erreurConnexionSociale } from '../components/SocialLogin';
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

  const { login, loginWithProvider, loginWithCustomToken, resetPassword } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(firebaseErrorFr(err.code));
    } finally {
      setLoading(false);
    }
  }

  // Retour de la connexion TikTok : /api/auth renvoie ici avec un jeton
  // Firebase dans le fragment (#tiktok=…), jamais envoyé au serveur.
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get('tiktok');
    const echec = params.has('tiktok_erreur');
    if (!token && !echec) return;
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    if (echec) { setError('Connexion TikTok impossible. Réessaie.'); return; }
    setLoading(true);
    loginWithCustomToken(token)
      .then(() => navigate('/', { replace: true }))
      .catch(() => { setError('Connexion TikTok impossible. Réessaie.'); setLoading(false); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleProvider(id) {
    setError('');
    setLoading(true);
    try {
      const user = await loginWithProvider(id);
      if (!user) return; // redirection en cours (TikTok)
      navigate('/', { replace: true });
    } catch (err) {
      const msg = erreurConnexionSociale(err);
      if (msg) setError(msg);
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
          <label className="auth-label" htmlFor="connexion-email">Email</label>
          <input
            id="connexion-email"
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
          <label className="auth-label" htmlFor="connexion-password">Mot de passe</label>
          <input
            id="connexion-password"
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
          <p className="auth-reset-sent">Email de réinitialisation envoyé !</p>
        )}

        <p className="auth-error">{error}</p>

        <button className="auth-btn" type="submit" disabled={!!loading}>
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>

                  <div className="auth-divider"><span>ou</span></div>

          <SocialLogin onLogin={handleProvider} disabled={!!loading} />

        <p className="auth-link">
          Pas encore de compte ?{' '}
          <Link to="/inscription">Créer un compte</Link>
        </p>
      </form>
    </div>
  );
}
