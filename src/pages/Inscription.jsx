import { UsersIcon } from '../components/Icons';
import { Mascot } from '../components/Mascot';
import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SocialLogin, { erreurConnexionSociale } from '../components/SocialLogin';
import {
  CYCLES,
  CLASSES_BY_CYCLE,
  SPECIALITES_LYCEE,
  needsSpecialites,
  isUnder15,
} from '../utils/levels';
import { readGuest } from '../services/guestService';
import { sendParentalConsent, consentErrorMessage } from '../services/consentService';
import { useIsDesktop } from '../hooks/useMediaQuery';
import './Inscription.css';

// Mascotte de chaque étape, sur ordinateur seulement.
const POSE_ETAPE = {
  prenom: 'hello', birthdate: 'thinking', cycle: 'reading', classe: 'graduation',
  detail: 'search', account: 'writing', parent: 'retour',
};

function firebaseErrorFr(code) {
  switch (code) {
    case 'auth/email-already-in-use': return 'Cet email est déjà utilisé.';
    case 'auth/invalid-email':        return 'Adresse email invalide.';
    case 'auth/weak-password':        return 'Mot de passe trop court (6 caractères min).';
    default:                          return 'Une erreur est survenue. Réessaie.';
  }
}

// isUnder15 est désormais importé depuis ../utils/levels (source unique).

export default function Inscription() {
  const [prenom, setPrenom]               = useState(() => readGuest()?.prenom ?? '');
  const [birthDate, setBirthDate]         = useState('');
  const [level, setLevel]                 = useState(() => {
    // Un élève en mode essai arrive avec sa classe déjà connue.
    const g = readGuest()?.level;
    return g?.cycle && g?.classe
      ? { cycle: g.cycle, classe: g.classe, specialites: g.specialites ?? [] }
      : { cycle: null, classe: null, specialites: [] };
  });
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [acceptCgu, setAcceptCgu]         = useState(false);
  const [parentEmail, setParentEmail]     = useState('');
  const [error, setError]                 = useState('');
  const [loading, setLoading]             = useState(false);
  const [stepIdx, setStepIdx]             = useState(0);
  const [animDir, setAnimDir]             = useState('in');

  const { signup, loginWithProvider, refreshGate } = useAuth();
  const navigate                          = useNavigate();
  const isDesktop                         = useIsDesktop();

  // Construction dynamique de la liste des étapes en fonction du profil.
  const steps = useMemo(() => {
    const base = ['prenom', 'birthdate', 'cycle', 'classe'];
    if (needsSpecialites(level)) base.push('detail');
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
        // Le serveur refuse aussi (PARENT_EMAIL_IS_CHILD) — on échoue tôt ici
        // avec un message clair plutôt qu'après l'aller-retour API.
        if (parentEmail.trim().toLowerCase() === email.trim().toLowerCase()) {
          return 'Entre l\'email de ton parent, pas le tien.';
        }
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
        await signup(prenom.trim(), email.trim(), password, level, birthDate);
        await refreshGate?.();
        if (isUnder15(birthDate)) {
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

    // Étape 'parent' : on prévient le parent, l'élève entre aussitôt dans
    // l'app (le parent accepte ou refuse depuis l'email).
    if (stepId === 'parent') {
      setLoading(true);
      try {
        await sendParentalConsent(parentEmail.trim(), prenom);
        await refreshGate?.();
        navigate('/verify-email', { replace: true });
      } catch (err) {
        setError(consentErrorMessage(err.message));
      } finally {
        setLoading(false);
      }
      return;
    }

    goNext();
  }

  async function handleProvider(id) {
    setError('');
    setLoading(true);
    try {
      const user = await loginWithProvider(id);
      if (!user) return; // redirection en cours (TikTok)
      navigate('/');
    } catch (err) {
      const msg = erreurConnexionSociale(err);
      if (msg) setError(msg);
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

  const isLast = stepIdx === steps.length - 1;
  const primaryLabel = (() => {
    if (loading && stepId === 'account') return 'Création...';
    if (loading && stepId === 'parent')  return 'Envoi...';
    if (stepId === 'account') return 'Créer mon compte';
    if (stepId === 'parent')  return 'Envoyer et commencer →';
    return 'Continuer';
  })();

  // Chaque étape : sa question, son aide, puis ses réponses. Le téléphone
  // les empile dans la colonne ; l'ordinateur pose la question à gauche et
  // les réponses dans une carte à droite.
  const etape = (() => {
    switch (stepId) {
      case 'prenom': return {
        titre: 'Quel est ton prénom ?',
        aide: "On l'utilise pour te dire bonjour.",
        corps: (
            <input
              className="auth-input signup-input-lg"
              type="text"
              placeholder="Lucas"
              value={prenom}
              onChange={e => setPrenom(e.target.value)}
              autoComplete="given-name"
              autoFocus
            />
        ),
      };
      case 'birthdate': return {
        titre: 'Quand es-tu né·e ?',
        aide: 'Pour adapter Réviz à ton âge.',
        corps: (
            <div className={`auth-date auth-date--lg${birthDate ? '' : ' auth-date--empty'}`} data-placeholder="JJ / MM / AAAA">
              <input
                className="auth-input signup-input-lg"
                type="date"
                aria-label="Ta date de naissance"
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
                autoComplete="bday"
                max={new Date().toISOString().split('T')[0]}
                autoFocus
              />
            </div>
        ),
      };
      case 'cycle': return {
        titre: 'Où en es-tu ?',
        aide: 'Choisis ton cycle.',
        corps: (
            <div className="signup-card-stack">
              {CYCLES.map(c => (
                <button
                  type="button"
                  key={c.id}
                  className={`signup-card${level.cycle === c.id ? ' active' : ''}`}
                  onClick={() => pickCycle(c.id)}
                >
                  <span className="signup-card-emoji"><Mascot pose={c.pose} size={40} alt="" aria-hidden="true" /></span>
                  <span className="signup-card-body">
                    <span className="signup-card-label">{c.label}</span>
                    <span className="signup-card-desc">{c.desc}</span>
                  </span>
                </button>
              ))}
            </div>
        ),
      };
      case 'classe': return {
        titre: 'Quelle classe ?',
        aide: CYCLES.find(c => c.id === level.cycle)?.label,
        corps: (
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
        ),
      };
      case 'detail': return needsSpecialites(level) ? {
        titre: 'Tes spécialités ?',
        aide: 'Sélectionne celles que tu suis (tu peux en choisir plusieurs).',
        corps: (
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
        ),
      } : null;
      case 'account': return {
        titre: 'Crée ton compte',
        aide: `Dernière étape, ${prenom || 'on y est presque'}.`,
        corps: (
          <>
            <div className="auth-field">
              <label className="auth-label" htmlFor="signup-email">Email</label>
              <input
                id="signup-email"
                className="auth-input"
                type="email"
                placeholder="lucas@exemple.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="signup-password">Mot de passe</label>
              <input
                id="signup-password"
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
                On préviendra un de tes parents par email. Tu pourras réviser tout de suite.
              </div>
            )}
          </>
        ),
      };
      case 'parent': return {
        titre: 'Autorisation parentale',
        corps: (
          <>
            <div className="auth-parent-info">
              <span className="auth-parent-icon"><UsersIcon /></span>
              <p>
                Comme tu as moins de 15 ans, on envoie un email à un de tes parents pour lui dire
                que tu utilises Réviz. Tu peux commencer tout de suite : il aura 7 jours pour donner son accord.
              </p>
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="signup-parent-email">Email de ton parent</label>
              <input
                id="signup-parent-email"
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
        ),
      };
      default: return null;
    }
  })();

  const bouton = (
        <button
          className="auth-btn signup-primary"
          type={isDesktop ? 'submit' : 'button'}
          onClick={isDesktop ? undefined : handlePrimary}
          disabled={loading}
        >
          {primaryLabel}
        </button>
  );
  const autresChoix = stepId === 'prenom' && (
          <>
                          <div className="auth-divider"><span>ou</span></div>
              <SocialLogin onLogin={handleProvider} disabled={loading} />
            <p className="auth-link">
              Déjà un compte ?{' '}
              <Link to="/connexion">Se connecter</Link>
            </p>
          </>
  );
  const progression = (
        <div className="signup-progress">
          <div className="signup-progress-bar" style={{ width: `${((progressIdx + 1) / totalVisible) * 100}%` }} />
        </div>
  );

  if (isDesktop) {
    return (
      <div className="app auth-desk-page">
        <div className="auth-desk">
          <div className="auth-desk-intro">
            <button type="button" className="auth-back" onClick={goPrev} aria-label="Retour">←</button>
            <span className="auth-desk-mascot"><Mascot pose={POSE_ETAPE[stepId] ?? 'hello'} size={132} alt="" aria-hidden="true" /></span>
            {etape && <h1 className="signup-question">{etape.titre}</h1>}
            {etape?.aide && <p className="signup-hint">{etape.aide}</p>}
            {stepId !== 'parent' && <p className="auth-desk-step">Étape {progressIdx + 1} sur {totalVisible}</p>}
          </div>
          {/* Entrée valide l'étape, comme le bouton */}
          <form className="auth-desk-card" noValidate onSubmit={e => { e.preventDefault(); handlePrimary(); }}>
            {progression}
            <div className={`auth-desk-body signup-anim-${animDir}`} key={stepId}>
              {etape?.corps}
            </div>
            <p className="auth-error">{error}</p>
            {bouton}
            {autresChoix}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="auth-header signup-header">
        <button type="button" className="auth-back" onClick={goPrev} aria-label="Retour">←</button>
        {progression}
      </div>

      <div className={`auth-content signup-content signup-anim-${animDir}`} key={stepId}>
        {etape && <h1 className="signup-question">{etape.titre}</h1>}
        {etape?.aide && <p className="signup-hint">{etape.aide}</p>}
        {etape?.corps}

        <p className="auth-error">{error}</p>
      </div>

      <div className="signup-footer">
        {bouton}

        {autresChoix}
      </div>
    </div>
  );
}
