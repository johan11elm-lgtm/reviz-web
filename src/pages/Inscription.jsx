import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  CYCLES,
  CLASSES_BY_CYCLE,
  SPECIALITES_LYCEE,
  FILIERES_SUP,
  needsSpecialites,
  needsFiliere,
} from '../utils/levels';
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
  const [prenom, setPrenom]               = useState('');
  const [birthDate, setBirthDate]         = useState('');
  const [level, setLevel]                 = useState({ cycle: null, classe: null, specialites: [], filiere: null });
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [acceptCgu, setAcceptCgu]         = useState(false);
  const [parentEmail, setParentEmail]     = useState('');
  const [createdUid, setCreatedUid]       = useState(null);
  const [error, setError]                 = useState('');
  const [loading, setLoading]             = useState(false);
  const [stepIdx, setStepIdx]             = useState(0);
  const [animDir, setAnimDir]             = useState('in');

  const { signup, loginWithGoogle }       = useAuth();
  const navigate                          = useNavigate();

  // Construction dynamique de la liste des étapes en fonction du profil.
  const steps = useMemo(() => {
    const base = ['prenom', 'birthdate', 'cycle', 'classe'];
    if (needsSpecialites(level) || needsFiliere(level)) base.push('detail');
    base.push('account');
    if (isUnder15(birthDate)) base.push('parent');
    return base;
  }, [level, birthDate]);

  // Si l'utilisateur a remonté, et que les steps changent, on clamp stepIdx.
  useEffect(() => {
    if (stepIdx >= steps.length) setStepIdx(steps.length - 1);
  }, [steps, stepIdx]);

  const stepId = steps[stepIdx];
  const totalVisible = steps.includes('parent') ? steps.length - 1 : steps.length;
  const progressIdx  = Math.min(stepIdx, totalVisible - 1);

  function goNext() {
    setError('');
    setAnimDir('in');
    setStepIdx(i => Math.min(i + 1, steps.length - 1));
  }
  function goPrev() {
    setError('');
    if (stepIdx === 0) {
      navigate('/welcome');
      return;
    }
    setAnimDir('out');
    setStepIdx(i => Math.max(i - 1, 0));
  }

  function validateCurrent() {
    switch (stepId) {
      case 'prenom':
        if (!prenom.trim()) return 'Entre ton prénom.';
        return null;
      case 'birthdate': {
        if (!birthDate) return 'Entre ta date de naissance.';
        const d = new Date(birthDate);
        if (isNaN(d.getTime())) return 'Date invalide.';
        if (d > new Date()) return 'La date ne peut pas être dans le futur.';
        if (d < new Date('1950-01-01')) return 'Date invalide.';
        return null;
      }
      case 'cycle':
        if (!level.cycle) return 'Choisis ton cycle.';
        return null;
      case 'classe':
        if (!level.classe) return 'Choisis ta classe.';
        return null;
      case 'detail':
        if (needsFiliere(level) && !level.filiere) return 'Choisis ta filière.';
        // Spés optionnelles : on n'oblige pas un minimum (l'utilisateur peut être en 1ère sans choix défini)
        return null;
      case 'account':
        if (!email.trim()) return 'Entre ton email.';
        if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'Adresse email invalide.';
        if (password.length < 6) return 'Mot de passe trop court (6 caractères min).';
        if (!acceptCgu) return 'Tu dois accepter les CGU pour continuer.';
        return null;
      case 'parent':
        if (!parentEmail.trim()) return 'Entre l\'email de ton parent.';
        if (!/^\S+@\S+\.\S+$/.test(parentEmail.trim())) return 'Adresse email invalide.';
        return null;
      default:
        return null;
    }
  }

  async function handlePrimary() {
    const err = validateCurrent();
    if (err) { setError(err); return; }

    // Étape 'account' : on crée le compte Firebase + profil Firestore
    if (stepId === 'account') {
      setLoading(true);
      try {
        const user = await signup(prenom.trim(), email.trim(), password, level, birthDate);
        if (isUnder15(birthDate)) {
          setCreatedUid(user.uid);
          goNext();
        } else {
          navigate('/verify-email', { replace: true });
        }
      } catch (err) {
        setError(firebaseErrorFr(err.code));
      } finally {
        setLoading(false);
      }
      return;
    }

    // Étape 'parent' : envoi de la demande de consentement parental
    if (stepId === 'parent') {
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
      return;
    }

    goNext();
  }

  async function handleGoogle() {
    setError('');
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

  function pickCycle(cycleId) {
    setLevel({ cycle: cycleId, classe: null, specialites: [], filiere: null });
    setError('');
    // Auto-advance après un léger délai pour laisser voir la sélection
    setTimeout(() => {
      setAnimDir('in');
      setStepIdx(i => i + 1);
    }, 180);
  }

  function pickClasse(classe) {
    setLevel(l => ({ ...l, classe, specialites: [], filiere: null }));
    setError('');
    setTimeout(() => {
      setAnimDir('in');
      setStepIdx(i => i + 1);
    }, 180);
  }

  function toggleSpec(spec) {
    setLevel(l => {
      const cur = l.specialites ?? [];
      return {
        ...l,
        specialites: cur.includes(spec) ? cur.filter(s => s !== spec) : [...cur, spec],
      };
    });
  }

  function setFiliere(filiere) {
    setLevel(l => ({ ...l, filiere }));
  }

  const isLast = stepIdx === steps.length - 1;
  const primaryLabel = (() => {
    if (loading && stepId === 'account') return 'Création...';
    if (loading && stepId === 'parent')  return 'Envoi...';
    if (stepId === 'account') return 'Créer mon compte';
    if (stepId === 'parent')  return 'Envoyer la demande →';
    return 'Continuer';
  })();

  return (
    <div className="app">
      <div className="auth-header signup-header">
        <span className="auth-back" onClick={goPrev} role="button" aria-label="Retour">←</span>
        <div className="signup-progress">
          <div className="signup-progress-bar" style={{ width: `${((progressIdx + 1) / totalVisible) * 100}%` }} />
        </div>
      </div>

      <div className={`auth-content signup-content signup-anim-${animDir}`} key={stepId}>
        {stepId === 'prenom' && (
          <>
            <h1 className="signup-question">Quel est ton prénom ?</h1>
            <p className="signup-hint">On l'utilise pour te dire bonjour 👋</p>
            <input
              className="auth-input signup-input-lg"
              type="text"
              placeholder="Lucas"
              value={prenom}
              onChange={e => setPrenom(e.target.value)}
              autoComplete="given-name"
              autoFocus
            />
          </>
        )}

        {stepId === 'birthdate' && (
          <>
            <h1 className="signup-question">Quand es-tu né·e ?</h1>
            <p className="signup-hint">Pour adapter Réviz à ton âge.</p>
            <input
              className="auth-input signup-input-lg"
              type="date"
              value={birthDate}
              onChange={e => setBirthDate(e.target.value)}
              autoComplete="bday"
              max={new Date().toISOString().split('T')[0]}
              autoFocus
            />
          </>
        )}

        {stepId === 'cycle' && (
          <>
            <h1 className="signup-question">Où en es-tu ?</h1>
            <p className="signup-hint">Choisis ton cycle.</p>
            <div className="signup-card-stack">
              {CYCLES.map(c => (
                <button
                  type="button"
                  key={c.id}
                  className={`signup-card${level.cycle === c.id ? ' active' : ''}`}
                  onClick={() => pickCycle(c.id)}
                >
                  <span className="signup-card-emoji">{c.emoji}</span>
                  <span className="signup-card-body">
                    <span className="signup-card-label">{c.label}</span>
                    <span className="signup-card-desc">{c.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {stepId === 'classe' && (
          <>
            <h1 className="signup-question">Quelle classe ?</h1>
            <p className="signup-hint">{CYCLES.find(c => c.id === level.cycle)?.label}</p>
            <div className="signup-card-grid">
              {(CLASSES_BY_CYCLE[level.cycle] ?? []).map(c => (
                <button
                  type="button"
                  key={c}
                  className={`signup-card-sm${level.classe === c ? ' active' : ''}`}
                  onClick={() => pickClasse(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </>
        )}

        {stepId === 'detail' && needsSpecialites(level) && (
          <>
            <h1 className="signup-question">Tes spécialités ?</h1>
            <p className="signup-hint">Sélectionne celles que tu suis (tu peux en choisir plusieurs).</p>
            <div className="signup-chips">
              {SPECIALITES_LYCEE.map(s => {
                const active = level.specialites?.includes(s);
                return (
                  <button
                    type="button"
                    key={s}
                    className={`signup-chip${active ? ' active' : ''}`}
                    onClick={() => toggleSpec(s)}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {stepId === 'detail' && needsFiliere(level) && (
          <>
            <h1 className="signup-question">Ta filière ?</h1>
            <p className="signup-hint">Pour mieux cibler tes révisions.</p>
            <div className="signup-chips">
              {FILIERES_SUP.map(f => (
                <button
                  type="button"
                  key={f}
                  className={`signup-chip${level.filiere === f ? ' active' : ''}`}
                  onClick={() => setFiliere(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </>
        )}

        {stepId === 'account' && (
          <>
            <h1 className="signup-question">Crée ton compte</h1>
            <p className="signup-hint">Dernière étape, {prenom || 'on y est presque'} ✨</p>
            <div className="auth-field">
              <label className="auth-label">Email</label>
              <input
                className="auth-input"
                type="email"
                placeholder="lucas@exemple.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
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
              />
            </div>
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
            {isUnder15(birthDate) && (
              <div className="auth-parent-notice-inline">
                👪 Un email sera envoyé à ton parent pour confirmer ton inscription.
              </div>
            )}
          </>
        )}

        {stepId === 'parent' && (
          <>
            <h1 className="signup-question">Autorisation parentale</h1>
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
                autoFocus
              />
            </div>
          </>
        )}

        <p className="auth-error">{error}</p>
      </div>

      <div className="signup-footer">
        <button
          className="auth-btn signup-primary"
          type="button"
          onClick={handlePrimary}
          disabled={loading}
        >
          {primaryLabel}
        </button>

        {stepId === 'prenom' && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
