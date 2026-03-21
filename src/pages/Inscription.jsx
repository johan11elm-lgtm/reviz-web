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

function isUnder15(dateStr) {
  if (!dateStr) return false;
  const birth = new Date(dateStr);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age < 15;
}

export default function Inscription() {
  const [step, setStep]             = useState(1); // 1 = form, 2 = parent email
  const [prenom, setPrenom]         = useState('');
  const [classe, setClasse]         = useState('');
  const [dateNaissance, setDateNaissance] = useState('');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [acceptCgu, setAcceptCgu]   = useState(false);
  const [parentEmail, setParentEmail] = useState('');
  const [createdUid, setCreatedUid] = useState(null);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);

  const { signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const needsParentConsent = isUnder15(dateNaissance);

  async function handleGoogle() {
    setError('');
    if (!acceptCgu) { setError('Tu dois accepter les CGU pour continuer.'); return; }
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') setError('Connexion Google impossible. Réessaie.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!prenom.trim())    { setError('Entre ton prénom.'); return; }
    if (!dateNaissance)    { setError('Entre ta date de naissance.'); return; }
    if (!acceptCgu)        { setError('Tu dois accepter les CGU pour continuer.'); return; }
    setError('');
    setLoading(true);
    try {
      const user = await signup(prenom.trim(), email, password, classe.trim());
      if (needsParentConsent) {
        // Store UID for step 2, do not navigate yet
        setCreatedUid(user.uid);
        setStep(2);
      } else {
        navigate('/verify-email', { replace: true });
      }
    } catch (err) {
      setError(firebaseErrorFr(err.code));
    } finally {
      setLoading(false);
    }
  }

  async function handleParentEmail(e) {
    e.preventDefault();
    if (!parentEmail.trim()) { setError('Entre l\'email de ton parent.'); return; }
    setError('');
    setLoading(true);
    try {
      await fetch('/api/send-parental-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: createdUid, parentEmail: parentEmail.trim(), childName: prenom }),
      });
      navigate('/consent-pending', { replace: true, state: { parentEmail: parentEmail.trim() } });
    } catch {
      setError('Impossible d\'envoyer l\'email. Réessaie.');
    } finally {
      setLoading(false);
    }
  }

  // ── Étape 2 : email du parent ──────────────────────────────────
  if (step === 2) {
    return (
      <div className="app">
        <div className="auth-header">
          <span className="auth-back" onClick={() => setStep(1)}>←</span>
          <span className="auth-title">Autorisation parentale</span>
        </div>
        <form className="auth-content" onSubmit={handleParentEmail} noValidate>
          <div className="auth-parent-info">
            <span className="auth-parent-icon">👪</span>
            <p>
              Comme tu as moins de 15 ans, nous avons besoin de l'accord d'un de tes parents
              avant de t'ouvrir l'accès à Réviz. Un email lui sera envoyé avec un lien de confirmation.
            </p>
          </div>
          <div className="auth-field">
            <label className="auth-label">Email de ton parent</label>
            <input
              className="auth-input"
              type="email"
              placeholder="parent@exemple.com"
              value={parentEmail}
              onChange={e => setParentEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <p className="auth-error">{error}</p>
          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? 'Envoi...' : 'Envoyer la demande →'}
          </button>
        </form>
      </div>
    );
  }

  // ── Étape 1 : formulaire principal ─────────────────────────────
  return (
    <div className="app">
      <div className="auth-header">
        <Link to="/welcome" className="auth-back">←</Link>
        <span className="auth-title">Créer un compte</span>
      </div>

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
          <label className="auth-label">Date de naissance</label>
          <input
            className="auth-input"
            type="date"
            value={dateNaissance}
            onChange={e => setDateNaissance(e.target.value)}
            autoComplete="bday"
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

        {needsParentConsent && (
          <div className="auth-parent-notice-inline">
            👪 Un email sera envoyé à ton parent pour confirmer ton inscription.
          </div>
        )}

        <label className="auth-checkbox-row">
          <input
            type="checkbox"
            checked={acceptCgu}
            onChange={e => setAcceptCgu(e.target.checked)}
          />
          <span>
            J'accepte les <Link to="/legal/cgu">CGU</Link> et la <Link to="/legal/confidentialite">politique de confidentialité</Link>
          </span>
        </label>

        <p className="auth-error">{error}</p>

        <button className="auth-btn" type="submit" disabled={loading}>
          {loading ? 'Création...' : 'Créer mon compte'}
        </button>

        <div className="auth-divider"><span>ou</span></div>

        <button type="button" className="auth-google-btn" onClick={handleGoogle} disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continuer avec Google
        </button>

        <p className="auth-link">
          Déjà un compte ?{' '}
          <Link to="/connexion">Se connecter</Link>
        </p>
      </form>
    </div>
  );
}
