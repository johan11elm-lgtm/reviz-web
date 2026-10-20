import { UsersIcon } from '../components/Icons';
import { Mascot } from '../components/Mascot';
import { useState, useMemo, useEffect } from 'react';
import { Link, Navigate, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
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
import { track } from '../services/statsService';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { nbsp } from '../utils/typography';
import ChampDateNaissance from '../components/ChampDateNaissance';
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

// Attente maximale de la relecture du gate avant de passer à la suite.
const ATTENTE_GATE_MS = 2000;

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
  const [animDir, setAnimDir]             = useState('in');
  const [voirMdp, setVoirMdp]             = useState(false);
  const [compteCree, setCompteCree]       = useState(false);
  const [plusTardEnCours, setPlusTardEnCours] = useState(false);

  const { signup, loginWithProvider, refreshGate, currentUser, isGuest } = useAuth();
  // Compte déjà ouvert en arrivant ici (page rechargée en plein tunnel,
  // retour arrière) : refaire le tunnel créerait un second compte (19/10).
  const [dejaInscrit] = useState(() => !!currentUser && !isGuest);
  const navigate                          = useNavigate();
  const location                          = useLocation();
  const [params, setParams]               = useSearchParams();
  const isDesktop                         = useIsDesktop();

  // L'étape vit dans l'URL (?etape=2) : chaque étape est une entrée
  // d'historique, donc le retour d'Android (geste ou bouton) revient à
  // l'étape précédente au lieu de renvoyer sur /welcome en perdant tout.
  const stepIdx = Math.max(0, Number(params.get('etape')) || 0);
  function goTo(i, { replace = false } = {}) {
    setParams(i > 0 ? { etape: String(i) } : {}, { replace });
  }

  // Construction dynamique de la liste des étapes en fonction du profil.
  const steps = useMemo(() => {
    const base = ['prenom', 'birthdate', 'cycle', 'classe'];
    if (needsSpecialites(level)) base.push('detail');
    base.push('account');
    if (isUnder15(birthDate)) base.push('parent');
    return base;
  }, [level, birthDate]);

  // Les réponses ne vivent qu'en mémoire : arrivé au milieu du tunnel sans
  // elles (page rechargée, lien partagé), on repart du début.
  // Idem si une étape précédente n'est pas remplie (sinon on pourrait créer
  // un compte sans date de naissance, donc sans accord parental).
  useEffect(() => {
    if (dejaInscrit) return;
    const manquante = steps.slice(0, stepIdx).findIndex(id => validate(id));
    if (manquante >= 0) goTo(manquante, { replace: true });
    else if (stepIdx >= steps.length) goTo(steps.length - 1, { replace: true });
  }, [steps, stepIdx]);

  // Compte déjà créé (moins de 15 ans) : revenir en arrière recréerait le
  // compte (« email déjà utilisé »). On reste sur l'étape parent.
  useEffect(() => {
    if (dejaInscrit) return;
    const iParent = steps.indexOf('parent');
    if (compteCree && iParent >= 0 && stepIdx !== iParent) goTo(iParent, { replace: true });
  }, [compteCree, stepIdx, steps]);

  const stepId = steps[stepIdx];
  const totalVisible = steps.includes('parent') ? steps.length - 1 : steps.length;
  const progressIdx  = Math.min(stepIdx, totalVisible - 1);

  function goNext({ replace = false } = {}) {
    setError('');
    setAnimDir('in');
    goTo(Math.min(stepIdx + 1, steps.length - 1), { replace });
  }
  function goPrev() {
    setError('');
    setAnimDir('out');
    // Même chemin que le retour du téléphone. Arrivé directement sur
    // /inscription (pas d'historique dans l'app) : accueil, sans empiler.
    if (location.key !== 'default') navigate(-1);
    else if (stepIdx > 0) goTo(stepIdx - 1, { replace: true });
    else navigate('/welcome', { replace: true });
  }
  // Le retour du téléphone passe par l'historique, sans goPrev : on règle
  // le sens de l'animation d'après l'étape qui change.
  const [etapePrec, setEtapePrec] = useState(stepIdx);
  if (etapePrec !== stepIdx) {
    setEtapePrec(stepIdx);
    setAnimDir(stepIdx > etapePrec ? 'in' : 'out');
  }

  function validate(id) {
    switch (id) {
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

  // La suite ne dépend pas de la relecture du gate (le statut est déjà
  // calculé, et l'accueil se recale tout seul) : sur Safari iOS, une lecture
  // Firestore peut rester sans réponse, et l'élève restait bloqué ici (19/10).
  function rafraichirGate() {
    const relecture = Promise.resolve(refreshGate?.()).catch(() => {});
    return Promise.race([relecture, new Promise(r => setTimeout(r, ATTENTE_GATE_MS))]);
  }

  async function handlePrimary() {
    const err = validate(stepId);
    if (err) { setError(err); return; }

    // Étape 'account' : on crée le compte Firebase + profil Firestore
    if (stepId === 'account') {
      setLoading(true);
      try {
        await signup(prenom.trim(), email.trim(), password, level, birthDate);
        await rafraichirGate();
        if (isUnder15(birthDate)) {
          setCompteCree(true);
          goNext({ replace: true });
        } else {
          navigate('/', { replace: true });
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
        track('consent_envoye');
        await rafraichirGate();
        navigate('/', { replace: true });
      } catch (err) {
        setError(consentErrorMessage(err.message));
      } finally {
        setLoading(false);
      }
      return;
    }

    goNext();
  }

  // « Plus tard » : le compte existe déjà, l'élève entre dans l'app et a
  // 15 jours pour donner l'email d'un parent (bandeau, relances par email).
  async function plusTard() {
    setError('');
    setLoading(true);
    setPlusTardEnCours(true);
    track('consent_plus_tard');
    await rafraichirGate();
    navigate('/', { replace: true });
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
    setTimeout(() => goNext(), 180);
  }

  function pickClasse(classe) {
    setLevel(l => ({ ...l, classe, specialites: [], filiere: null }));
    setError('');
    setTimeout(() => goNext(), 180);
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
    if (loading && stepId === 'parent' && !plusTardEnCours) return 'Envoi...';
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
              enterKeyHint="next"
              autoFocus
            />
        ),
      };
      case 'birthdate': return {
        titre: 'Quand es-tu né·e ?',
        aide: 'Pour adapter Réviz à ton âge.',
        corps: (
            <ChampDateNaissance value={birthDate} onChange={setBirthDate} grand idPrefix="signup-naissance" />
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
                autoCapitalize="none"
                enterKeyHint="next"
                onKeyDown={e => {
                  // Entrée sur l'email : on passe au mot de passe, sans valider.
                  if (e.key === 'Enter') { e.preventDefault(); document.getElementById('signup-password')?.focus(); }
                }}
              />
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="signup-password">Mot de passe</label>
              <div className="auth-password">
                <input
                  id="signup-password"
                  className="auth-input"
                  type={voirMdp ? 'text' : 'password'}
                  placeholder="6 caractères minimum"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
                  enterKeyHint="done"
                />
                <button type="button" className="auth-password-toggle" onClick={() => setVoirMdp(v => !v)}
                  aria-pressed={voirMdp}>
                  {voirMdp ? 'Masquer' : 'Afficher'}
                </button>
              </div>
              <p className="auth-field-hint">6 caractères minimum, invente-le : ce n'est pas celui de ta messagerie.</p>
            </div>
            <label className="auth-checkbox-row">
              <input
                type="checkbox"
                checked={acceptCgu}
                onChange={e => setAcceptCgu(e.target.checked)}
              />
              <span>
                {/* Nouvel onglet : sinon ouvrir les CGU efface tout ce qui est saisi. */}
                J'accepte les <Link to="/legal/cgu" target="_blank" rel="noopener">CGU</Link> et la <Link to="/legal/confidentialite" target="_blank" rel="noopener">politique de confidentialité</Link>
              </span>
            </label>
            {isUnder15(birthDate) && (
              <div className="auth-parent-notice-inline">
                Tu pourras réviser tout de suite. Il faudra juste l'email d'un de tes parents, maintenant ou dans les 15 jours.
              </div>
            )}
          </>
        ),
      };
      case 'parent': return {
        titre: 'Ton compte est prêt !',
        aide: 'Une dernière chose, maintenant ou plus tard.',
        corps: (
          <>
            <div className="auth-parent-info">
              <span className="auth-parent-icon"><UsersIcon /></span>
              <p>
                Comme tu as moins de 15 ans, un de tes parents doit donner son accord par email.
                Pas son adresse sous la main ? Commence quand même : tu as <strong>15 jours</strong> pour la donner.
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
                autoCapitalize="none"
                enterKeyHint="send"
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
          type="submit"
          disabled={loading}
        >
          {primaryLabel}
        </button>
  );
  const boutonPlusTard = stepId === 'parent' && (
        <button type="button" className="auth-btn-plus-tard" onClick={plusTard} disabled={loading}>
          {plusTardEnCours ? 'Un instant…' : 'Plus tard, je commence à réviser →'}
          <small>Tu as 15 jours pour donner l'email</small>
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

  if (dejaInscrit) {
    return <Navigate to="/" replace />;
  }

  if (isDesktop) {
    return (
      <div className="app auth-desk-page">
        <div className="auth-desk">
          <div className="auth-desk-intro">
            <button type="button" className="auth-back" onClick={goPrev} aria-label="Retour">←</button>
            <span className="auth-desk-mascot"><Mascot pose={POSE_ETAPE[stepId] ?? 'hello'} size={132} alt="" aria-hidden="true" /></span>
            {etape && <h1 className="signup-question">{nbsp(etape.titre)}</h1>}
            {etape?.aide && <p className="signup-hint">{etape.aide}</p>}
            {stepId !== 'parent' && <p className="auth-desk-step">Étape {progressIdx + 1} sur {totalVisible}</p>}
          </div>
          {/* Entrée valide l'étape, comme le bouton */}
          <form className="auth-desk-card" noValidate onSubmit={e => { e.preventDefault(); handlePrimary(); }}>
            {progression}
            <div className={`auth-desk-body signup-anim-${animDir}`} key={stepId}>
              {etape?.corps}
            </div>
            <p className="auth-error" role="alert">{error}</p>
            {bouton}
            {boutonPlusTard}
            {autresChoix}
          </form>
        </div>
      </div>
    );
  }

  // Formulaire aussi sur téléphone : la touche Entrée / « Suivant » du
  // clavier valide l'étape, même quand le clavier cache le bouton.
  return (
    <form className="app" noValidate onSubmit={e => { e.preventDefault(); if (!loading) handlePrimary(); }}>
      <div className="auth-header signup-header">
        <button type="button" className="auth-back" onClick={goPrev} aria-label="Retour">←</button>
        {progression}
      </div>

      <div className={`auth-content signup-content signup-anim-${animDir}`} key={stepId}>
        {etape && <h1 className="signup-question">{nbsp(etape.titre)}</h1>}
        {etape?.aide && <p className="signup-hint">{etape.aide}</p>}
        {etape?.corps}

        <p className="auth-error" role="alert">{error}</p>
      </div>

      <div className="signup-footer">
        {bouton}
        {boutonPlusTard}

        {autresChoix}
      </div>
    </form>
  );
}
