import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Inscription.css';

function firebaseErrorFr(code) {
  switch (code) {
    case 'auth/email-already-in-use': return 'Cet email est déjà utilisé.';
    case 'auth/invalid-email':        return 'Adresse email invalide.';
    case 'auth/weak-password':        return 'Mot de passe trop court (6 caractères min).';
    default:                          return 'Une erreur est survenue. Réessaie.';
  }
}

export default function Inscription() {
  const [prenom, setPrenom]       = useState('');
  const [classe, setClasse]       = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  const { signup } = useAuth();
  const navigate   = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!prenom.trim()) { setError('Entre ton prénom.'); return; }
    setError('');
    setLoading(true);
    try {
      await signup(prenom.trim(), email, password, classe.trim());
      navigate('/verify-email');
    } catch (err) {
      setError(firebaseErrorFr(err.code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      {/* Header */}
      <div className="auth-header">
        <Link to="/welcome" className="auth-back">←</Link>
        <span className="auth-title">Créer un compte</span>
      </div>

      {/* Formulaire */}
      <form className="auth-content" onSubmit={handleSubmit} noValidate>
        <div className="auth-field">
          <label className="auth-label">Prénom</label>
          <input
            className="auth-input"
            type="text"
            placeholder="Lucas"
            value={prenom}
            onChange={e => setPrenom(e.target.value)}
            autoComplete="given-name"
            required
          />
        </div>

        <div className="auth-field">
          <label className="auth-label">Classe</label>
          <input
            className="auth-input"
            type="text"
            placeholder="4ème"
            value={classe}
            onChange={e => setClasse(e.target.value)}
            autoComplete="off"
          />
        </div>

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
            placeholder="6 caractères minimum"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        <p className="auth-error">{error}</p>

        <button className="auth-btn" type="submit" disabled={loading}>
          {loading ? 'Création...' : 'Créer mon compte'}
        </button>

        <p className="auth-link">
          Déjà un compte ?{' '}
          <Link to="/connexion">Se connecter</Link>
        </p>
      </form>
    </div>
  );
}
