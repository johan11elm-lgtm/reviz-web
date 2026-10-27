import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { UserIcon, MailIcon, KeyIcon, BellIcon, LockIcon, CheckIcon, LogOutIcon, InstallIcon, ChatIcon } from '../components/Icons';
import { InstallerModal } from '../components/InstallerApp';
import { useInstallation } from '../hooks/useInstallation';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { useModalA11y } from '../hooks/useModalA11y';
import { BottomNav } from '../components/BottomNav';
import { LevelSelector } from '../components/LevelSelector';
import { Mascot } from '../components/Mascot';
import { Pantin } from '../components/Pantin';
import { BulleReviz } from '../components/reviz/BulleReviz';
import { RevizPlusSheet } from '../components/RevizPlus';
import { THEMES_PROPOSES, SOMBRE_DISPONIBLE, MODES, themeAffiche } from '../utils/themes';
import { TEINTES, varsTeinte } from '../utils/teinteMatiere';
import { phaseRevizPlus, joursAvant, dateCourte } from '../utils/revizPlus';
import { openBillingPortal, startCheckout } from '../services/billingService';
import { remindersAvailable, isReminderEnabled, enableReminder, disableReminder } from '../services/reminderService';
import { etatPush, activerPush, desactiverPush, pushActif } from '../services/pushService';
import { HEURE_RAPPEL } from '../utils/push';
import { loadLessons } from '../services/historyService';
import { countDueCards } from '../services/srsService';
import { FIN_LANCEMENT, DERNIER_JOUR_OFFERT, PREMIER_PRELEVEMENT, VENTES_OUVERTES, tarifFondateurOuvert } from '../../api/_lancement.js';
import { PRIX_FONDATEUR, prixDe } from '../../api/_prix.js';
import '../components/reviz/HerosMatiere.css';
import './Reglages.css';
import { revenir } from '../utils/navigation';

const CLASSES_COLLEGE = ['6ème', '5ème', '4ème', '3ème'];
const classeCourte = c => c?.replace(/ème$/, 'e') ?? '';
const NIVEAU_VIDE = { cycle: null, classe: null, specialites: [], filiere: null };
const RESEAU = 'Ça n’a pas marché. Vérifie ta connexion et réessaie.';

function erreurFirebase(code) {
  switch (code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':   return 'Mot de passe incorrect. Réessaie.';
    case 'auth/invalid-email':        return 'Vérifie l’adresse e-mail.';
    case 'auth/email-already-in-use': return 'Cette adresse est déjà utilisée.';
    case 'auth/weak-password':        return '6 caractères au moins.';
    case 'auth/too-many-requests':    return 'Trop de tentatives. Réessaie dans un moment.';
    default:                          return RESEAU;
  }
}

const Chevron = ({ sens = 'droite' }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={sens === 'gauche' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
  </svg>
);

/** Feuille du bas sur téléphone, fenêtre centrée sur ordinateur ; Réviz dépasse en haut à droite. */
function Feuille({ titre, pose, onClose, bloque = false, children }) {
  const fermer = bloque ? () => {} : onClose;
  const ref = useModalA11y(fermer, true);
  return (
    <div className="rg-voile" onClick={fermer}>
      <div className="rg-feuille" ref={ref} role="dialog" aria-modal="true" aria-label={titre} onClick={e => e.stopPropagation()}>
        <span className="rg-poignee" aria-hidden="true" />
        {pose && <Mascot pose={pose} size={112} alt="" aria-hidden="true" className="rg-feuille-reviz" />}
        {children}
      </div>
    </div>
  );
}

function Message({ type, titre, texte }) {
  return (
    <div className={`rg-message rg-message--${type}`} role={type === 'erreur' ? 'alert' : 'status'}>
      <span className="rg-message-rond" aria-hidden="true">{type === 'reussite' && <CheckIcon />}</span>
      <span>{titre && <b>{titre}</b>}{texte}</span>
    </div>
  );
}

function Interrupteur({ checked, onChange, label, disabled }) {
  return (
    <label className="rg-inter">
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} aria-label={label} />
      <span aria-hidden="true" />
    </label>
  );
}

/**
 * Réglages (handoff Claude Design du 22/10) : héros court lavande (famille Moi) avec Réviz,
 * puis des cartes : compte (feuilles prénom et classe, e-mail, mot de passe), rappels,
 * objectif du jour, apparence et thèmes, Réviz+ (abonné, offert, gratuit), informations,
 * déconnexion et suppression du compte en deux étapes. Mode essai sans compte ni Réviz+.
 */
export default function Reglages() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const { theme, setTheme, mode, setMode, isDark } = useTheme();
  const location = useLocation();
  // Arrivée depuis « Choisir mon thème » (fiche Réviz+, accueil) ou depuis la
  // landing (« Réserver mon prix fondateur ») : on descend à la bonne section.
  useEffect(() => {
    const cible = { '#themes': 'themes', '#abonnement': 'abonnement' }[location.hash];
    if (!cible) return;
    const t = setTimeout(() => document.getElementById(cible)?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 80);
    return () => clearTimeout(t);
  }, [location.hash]);
  const {
    currentUser, isPremium, hasRevizPlus, revizPlusOffert, abonnement, logout, isGuest,
    getUserLevel, setUserLevel, updateDisplayName,
    updateUserEmail, updateUserPassword, deleteAccount,
  } = useAuth();

  const prenom    = currentUser?.displayName ?? '';
  const userLevel = getUserLevel();

  // ── Réviz dans le héros ──
  const pantin = useRef(null);
  const [parle, setParle] = useState(false);
  const lignes = ['Tout se règle ici.', 'Rien ne part sans ton accord.'];
  useEffect(() => { if (parle) pantin.current?.dire(lignes.join('\n')); }, [parle]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    let t;
    const essai = () => { t = setTimeout(() => (document.hidden ? essai() : setParle(true)), 4000); };
    essai();
    return () => clearTimeout(t);
  }, []);

  // ── 1. Compte : feuille ouverte (null | 'profil' | 'email' | 'password') ──
  const [feuille, setFeuille]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [editPrenom, setEditPrenom] = useState('');
  const [editLevel, setEditLevel]   = useState(NIVEAU_VIDE);
  const [newEmail, setNewEmail]           = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');

  function ouvrir(nom) {
    setFeuille(nom);
    setError(''); setSuccess('');
    if (nom === 'profil')   { setEditPrenom(prenom); setEditLevel(userLevel ?? NIVEAU_VIDE); }
    if (nom === 'email')    { setNewEmail(''); setEmailPassword(''); }
    if (nom === 'password') { setCurrentPassword(''); setNewPassword(''); }
  }
  function fermer() { setFeuille(null); setError(''); setSuccess(''); }

  async function handleSaveProfil(e) {
    e.preventDefault();
    if (!editPrenom.trim()) return;
    setLoading(true); setError('');
    try {
      await updateDisplayName(editPrenom.trim());
      if (editLevel?.cycle && editLevel?.classe) setUserLevel(editLevel);
      setSuccess('Ton profil est à jour.');
    } catch {
      setError(RESEAU);
    } finally { setLoading(false); }
  }

  async function handleSaveEmail(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await updateUserEmail(newEmail.trim(), emailPassword);
      setSuccess(`Tu te connectes maintenant avec ${newEmail.trim()}.`);
    } catch (err) {
      setError(erreurFirebase(err.code));
    } finally { setLoading(false); }
  }

  async function handleSavePassword(e) {
    e.preventDefault();
    if (newPassword.length < 6) { setError('6 caractères au moins.'); return; }
    setLoading(true); setError('');
    try {
      await updateUserPassword(currentPassword, newPassword);
      setSuccess('Ton mot de passe a changé.');
    } catch (err) {
      const code = err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential' ? null : err.code;
      setError(code ? erreurFirebase(code) : 'Mot de passe actuel incorrect. Réessaie.');
    } finally { setLoading(false); }
  }

  // ── 2. Rappels : notifications locales dans l'app native, notifications web ailleurs ──
  const natif = remindersAvailable();
  const [push, setPush] = useState(() => etatPush());
  const notifsAvailable = natif || push === 'proposables' || push === 'autorisees';
  const [reminderOn, setReminderOn]         = useState(natif ? isReminderEnabled() : false);
  const [reminderDenied, setReminderDenied] = useState(false);
  const [reminderErreur, setReminderErreur] = useState(false);

  // Web : l'interrupteur suit l'abonnement réel du navigateur.
  useEffect(() => {
    if (natif || isGuest) return;
    let vivant = true;
    pushActif().then(actif => { if (vivant) setReminderOn(actif); });
    return () => { vivant = false; };
  }, [natif, isGuest]);

  async function handleReminderToggle(e) {
    const wanted = e.target.checked;
    setReminderDenied(false);
    setReminderErreur(false);
    if (!wanted) {
      setReminderOn(false);
      if (natif) await disableReminder(); else await desactiverPush();
      return;
    }
    setReminderOn(true); // optimiste, reverti si refus
    if (!natif) {
      const res = await activerPush('reglages');
      setPush(etatPush());
      if (!res.ok) {
        setReminderOn(false);
        if (res.raison === 'refusees') setReminderDenied(true); else setReminderErreur(true);
      }
      return;
    }
    const due = loadLessons().reduce(
      (sum, l) => sum + countDueCards(l.id, l.flashcardsCount ?? l.aiData?.flashcards?.length ?? 0),
      0
    );
    const res = await enableReminder(due);
    if (!res.ok) {
      setReminderOn(false);
      if (res.reason === 'denied') setReminderDenied(true);
    }
  }

  // ── 3. Objectif du jour ──
  const [dailyGoal, setDailyGoal] = useState(
    () => parseInt(localStorage.getItem(`reviz-daily-goal-${currentUser?.uid}`) || '3')
  );
  function handleGoal(n) {
    setDailyGoal(n);
    localStorage.setItem(`reviz-daily-goal-${currentUser?.uid}`, String(n));
  }

  // ── 4. Apparence : un thème Réviz+ touché sans Réviz+ ──
  const [themeVerrouille, setThemeVerrouille] = useState(null);

  // ── 5. Réviz+ ──
  const [revizPlusOuvert, setRevizPlusOuvert] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError]     = useState('');
  async function handleManageSubscription() {
    if (billingLoading) return;
    setBillingLoading(true); setBillingError('');
    try {
      await openBillingPortal(); // redirige vers Stripe en cas de succès
    } catch {
      setBillingLoading(false);
      setBillingError('Impossible d’ouvrir la gestion de l’abonnement. Réessaie dans un moment.');
    }
  }
  // Avant le 26 : réserver le tarif fondateur pendant l'offre de lancement.
  const [paiement, setPaiement] = useState(null);
  async function reserver(formule) {
    if (paiement) return;
    setPaiement(formule); setBillingError('');
    try {
      await startCheckout(formule); // redirection pleine page en cas de succès
    } catch (err) {
      setPaiement(null);
      if (err.message === 'EMAIL_NOT_VERIFIED') navigate('/verify-email');
      else setBillingError('Impossible d’ouvrir le paiement. Réessaie dans un moment.');
    }
  }

  // ── 6. Informations ──
  const [installerOpen, setInstallerOpen] = useState(false);
  const { aProposer: installerAProposer } = useInstallation();

  // ── 7. Déconnexion et suppression ──
  const [deleteStep, setDeleteStep]   = useState(0); // 0 fermé, 1 confirmer, 2 mot de passe
  const [deletePwd, setDeletePwd]     = useState('');
  const [deleting, setDeleting]       = useState(false);
  const [deleteError, setDeleteError] = useState('');
  // Compte Google / Apple / Microsoft / TikTok : pas de mot de passe à redemander.
  const sansMotDePasse = !currentUser?.providerData?.some(p => p.providerId === 'password');

  async function handleLogout() {
    await logout();
    navigate('/welcome');
  }

  async function handleDeleteAccount() {
    if (deleteStep === 1 && !sansMotDePasse) { setDeleteStep(2); return; }
    setDeleting(true); setDeleteError('');
    try {
      await deleteAccount(sansMotDePasse ? null : deletePwd);
      navigate('/welcome');
    } catch (err) {
      setDeleting(false);
      setDeleteError(err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential'
        ? 'Mot de passe incorrect. Réessaie.' : RESEAU);
    }
  }
  function fermerSuppression() { if (!deleting) { setDeleteStep(0); setDeletePwd(''); setDeleteError(''); } }

  // ── Blocs ──
  const ligne = ({ icone, teinte, label, sous, onClick, to, droite }) => {
    const contenu = (
      <>
        <span className={`rg-rond rg-rond--${teinte}`} aria-hidden="true">{icone}</span>
        <span className="rg-ligne-txt"><b>{label}</b>{sous && <span>{sous}</span>}</span>
        {droite !== undefined ? droite : <Chevron />}
      </>
    );
    if (to) return <Link to={to} className="rg-ligne">{contenu}</Link>;
    if (onClick) return <button type="button" className="rg-ligne" onClick={onClick}>{contenu}</button>;
    return <div className="rg-ligne rg-ligne--fixe">{contenu}</div>;
  };

  const compte = !isGuest && (
    <section className="rg-carte" aria-labelledby="rg-compte">
      <h2 id="rg-compte" className="rg-h2">Compte</h2>
      {ligne({ icone: <UserIcon />, teinte: 'lavande', label: 'Prénom et classe', sous: [prenom, classeCourte(userLevel?.classe)].filter(Boolean).join(' · ') || 'À compléter', onClick: () => ouvrir('profil') })}
      {ligne({ icone: <MailIcon />, teinte: 'lavande', label: 'Adresse e-mail', sous: currentUser?.email, onClick: () => ouvrir('email') })}
      {ligne({ icone: <KeyIcon />, teinte: 'lavande', label: 'Mot de passe', onClick: () => ouvrir('password') })}
    </section>
  );

  const essai = isGuest && (
    <section className="rg-carte rg-essai">
      <div className="rg-essai-haut">
        <Mascot pose="hello" size={56} alt="" aria-hidden="true" />
        <span><b>Mode essai</b>Ta progression est gardée sur cet appareil.</span>
      </div>
      <button type="button" className="rg-btn" onClick={() => navigate('/inscription')}>Créer mon compte</button>
    </section>
  );

  const rappels = (
    <section className="rg-carte" aria-labelledby="rg-rappels">
      <h2 id="rg-rappels" className="rg-h2">Rappels</h2>
      {ligne({
        icone: <BellIcon />, teinte: 'peche', label: 'Rappel quotidien',
        sous: natif ? 'Tous les jours à 18 h 30' : `À ${HEURE_RAPPEL}, les jours où tu n’as pas encore révisé`,
        droite: notifsAvailable && !isGuest ? <Interrupteur checked={reminderOn} onChange={handleReminderToggle} label={natif ? 'Activer le rappel de révision quotidien à 18 h 30' : `Activer le rappel de révision à ${HEURE_RAPPEL}`} /> : null,
      })}
      {!natif && isGuest && <p className="rg-note">Crée ton compte pour recevoir un rappel à {HEURE_RAPPEL}.</p>}
      {!natif && !isGuest && push === 'installer' && <p className="rg-note">Sur iPhone, les rappels arrivent une fois Réviz sur ton écran d’accueil. <Link to="/installer">Voir comment l’installer</Link></p>}
      {!natif && !isGuest && push === 'indisponible' && <p className="rg-note">Ce navigateur n’affiche pas de notifications. Les rappels marchent dans Chrome, Edge, Firefox, Safari et l’app mobile Réviz.</p>}
      {!natif && !isGuest && push === 'refusees' && !reminderDenied && <p className="rg-note">Notifications bloquées pour Réviz dans ce navigateur : rouvre-les dans ses réglages du site, puis reviens ici.</p>}
      {reminderDenied && <Message type="erreur" texte={natif ? 'Notifications refusées : autorise Réviz dans Réglages, puis Notifications.' : 'Notifications refusées : rouvre-les dans les réglages du site de ton navigateur.'} />}
      {reminderErreur && <Message type="erreur" texte="Le rappel n’a pas pu s’activer. Vérifie ta connexion et réessaie." />}
    </section>
  );

  const objectif = (
    <section className="rg-carte" aria-labelledby="rg-objectif">
      <h2 id="rg-objectif" className="rg-h2">Objectif du jour</h2>
      <p className="rg-sous">Combien de révisions par jour ?</p>
      <div className="rg-objectifs" role="radiogroup" aria-label="Objectif de révisions par jour">
        {[1, 3, 5, 10].map(n => (
          <button key={n} type="button" role="radio" aria-checked={dailyGoal === n}
            className={`rg-objectif${dailyGoal === n ? ' is-choisi' : ''}`}
            aria-label={`${n} révision${n > 1 ? 's' : ''} par jour`} onClick={() => handleGoal(n)}>{n}</button>
        ))}
      </div>
    </section>
  );

  const tuile = t => {
    const verrou = t.premium && !hasRevizPlus;
    const actif = themeAffiche(theme) === t.id;
    const p = t.preview;
    return (
      <button key={t.id} type="button" role="radio" aria-checked={actif}
        className={`rg-theme${actif ? ' is-actif' : ''}${verrou ? ' is-verrou' : ''}`}
        aria-label={`Thème ${t.label}${t.premium ? ' (Réviz+)' : ''}${verrou ? ', verrouillé' : ''}`}
        onClick={() => {
          if (verrou) { setThemeVerrouille(t.label); return; }
          setThemeVerrouille(null);
          setTheme(t.id);
        }}>
        <span className="rg-theme-apercu" style={{ background: p.app }} aria-hidden="true">
          <i className="rg-theme-hero" style={{ background: p.hero[0] }} />
          <i className="rg-theme-carte" style={{ background: p.card }}><i style={{ background: p.accent }} /></i>
          <i className="rg-theme-carte rg-theme-carte--court" style={{ background: p.card }} />
          {actif && <span className="rg-theme-coche"><CheckIcon /></span>}
          {verrou && <span className="rg-theme-cadenas"><LockIcon /></span>}
        </span>
        <span className="rg-theme-nom">{t.label}</span>
      </button>
    );
  };
  const apparence = (
    <section className="rg-carte" id="themes" aria-labelledby="rg-apparence">
      <h2 id="rg-apparence" className="rg-h2">Apparence</h2>
      {SOMBRE_DISPONIBLE && (
        <>
          <span className="rg-sur">Affichage</span>
          <div className="rg-modes" role="radiogroup" aria-label="Affichage clair ou sombre">
            {MODES.map(m => (
              <button key={m.id} type="button" role="radio" aria-checked={mode === m.id}
                className={`rg-mode${mode === m.id ? ' is-choisi' : ''}`} onClick={() => setMode(m.id)}>{m.label}</button>
            ))}
          </div>
          {mode === 'auto' && <p className="rg-sous rg-mode-note">Comme ton appareil : clair le jour, sombre s’il est en mode sombre.</p>}
          {isDark && <p className="rg-sous rg-mode-note">Les thèmes ci-dessous habillent le mode clair.</p>}
        </>
      )}
      <span className="rg-sur">Classiques</span>
      <div className="rg-themes" role="radiogroup" aria-label="Thèmes classiques">{THEMES_PROPOSES.filter(t => !t.premium).map(tuile)}</div>
      <span className="rg-sur">Réviz+ <em>{hasRevizPlus ? `${THEMES_PROPOSES.filter(t => t.premium).length} thèmes débloqués` : 'Avec Réviz+'}</em></span>
      <div className="rg-themes" role="radiogroup" aria-label="Thèmes Réviz+">{THEMES_PROPOSES.filter(t => t.premium).map(tuile)}</div>
      {themeVerrouille && (
        <div className="rg-verrou" role="status">
          <b>{themeVerrouille} fait partie de Réviz+.</b>
          <span>Tu peux le découvrir quand tu veux.</span>
          {!isGuest && VENTES_OUVERTES && <button type="button" className="rg-btn rg-btn--blanc rg-btn--petit" onClick={() => setRevizPlusOuvert(true)}>Voir Réviz+</button>}
        </div>
      )}
    </section>
  );

  // Réviz+ : abonné, offert pendant le lancement, ou gratuit.
  const fondateurOuvert = tarifFondateurOuvert();
  const phase = phaseRevizPlus();
  let revizPlus = null;
  if (!isGuest) {
    let corps;
    if (isPremium) {
      const fondateur = abonnement?.fondateur ?? (fondateurOuvert || null);
      const prix = prixDe(abonnement?.formule, !!fondateur);
      const nom = fondateur ? 'Membre fondateur' : abonnement?.formule === 'mensuel' ? 'Réviz+ mensuel' : 'Réviz+ annuel';
      const echeance = abonnement?.annuleLe ? ['Se termine le', dateCourte(abonnement.annuleLe)]
        : fondateurOuvert ? ['Premier prélèvement', PREMIER_PRELEVEMENT]
        : abonnement?.periodeFin ? ['Prochaine échéance', dateCourte(abonnement.periodeFin)] : null;
      corps = (
        <>
          <div className="rg-plus-formule">
            <Mascot pose="levelup" size={60} alt="" aria-hidden="true" />
            <span><b>{nom}</b><span>{prix.montant} {prix.cadence === '/an' ? 'par an' : 'par mois'}</span></span>
          </div>
          {echeance && <div className="rg-plus-echeance"><span>{echeance[0]}</span><b>{echeance[1]}</b></div>}
          <button type="button" className="rg-btn rg-btn--blanc" onClick={handleManageSubscription} disabled={billingLoading}>
            {billingLoading ? 'Ouverture…' : 'Gérer mon abonnement'}
          </button>
          <p className="rg-note rg-note--centre">S’ouvre sur le portail de paiement sécurisé.</p>
        </>
      );
    } else if (revizPlusOffert) {
      const texte = phase === 'derniers-jours'
        ? `Offert jusqu’au ${DERNIER_JOUR_OFFERT} : plus que ${joursAvant(FIN_LANCEMENT)} jour${joursAvant(FIN_LANCEMENT) > 1 ? 's' : ''}.`
        : phase === 'prolonge' ? 'Offert pendant le lancement de Réviz. Rien à payer, rien à activer.'
        : `Offert jusqu’au ${DERNIER_JOUR_OFFERT}. Rien à payer, rien à activer.`;
      corps = (
        <>
          <div className="rg-plus-formule">
            <Mascot pose="trophy" size={60} alt="" aria-hidden="true" />
            <span><b>Réviz+ offert</b><span>{texte}</span></span>
          </div>
          {VENTES_OUVERTES && fondateurOuvert && (
            <>
              <p className="rg-note">Garde ton prix fondateur après le lancement. Rien n’est prélevé avant le {PREMIER_PRELEVEMENT}.</p>
              <button type="button" className="rg-btn" onClick={() => reserver('annuel')} disabled={!!paiement}>
                {paiement === 'annuel' ? 'Ouverture du paiement…' : `Réserver à ${PRIX_FONDATEUR.annuel.montant} par an`}
              </button>
              <button type="button" className="rg-lien" onClick={() => reserver('mensuel')} disabled={!!paiement}>
                {paiement === 'mensuel' ? 'Ouverture du paiement…' : `ou ${PRIX_FONDATEUR.mensuel.montant} par mois, sans engagement`}
              </button>
            </>
          )}
        </>
      );
    } else {
      corps = (
        <>
          <div className="rg-plus-formule">
            <Mascot pose="trophy" size={60} alt="" aria-hidden="true" />
            <span className="rg-sous">Pour aller plus loin, quand tu veux.</span>
          </div>
          <ul className="rg-avantages">
            <li><CheckIcon />Scans de leçons illimités</li>
            <li><CheckIcon />Questions à Réviz IA illimitées</li>
            <li><CheckIcon />Les {THEMES_PROPOSES.filter(t => t.premium).length} thèmes Réviz+</li>
          </ul>
          {VENTES_OUVERTES && <button type="button" className="rg-btn" onClick={() => setRevizPlusOuvert(true)}>Découvrir Réviz+</button>}
        </>
      );
    }
    revizPlus = (
      <section className="rg-carte" id="abonnement" aria-labelledby="rg-plus">
        <div className="rg-carte-tete">
          <h2 id="rg-plus" className="rg-h2">Réviz+</h2>
          {isPremium && <span className="rg-etat rg-etat--actif">{fondateurOuvert ? 'Réservé' : 'Actif'}</span>}
          {!isPremium && revizPlusOffert && <span className="rg-etat rg-etat--offert">Offert</span>}
        </div>
        {corps}
        {billingError && <Message type="erreur" texte={billingError} />}
      </section>
    );
  }

  const informations = (
    <section className="rg-carte" aria-labelledby="rg-infos">
      <h2 id="rg-infos" className="rg-h2">Informations</h2>
      {installerAProposer && ligne({ icone: <InstallIcon />, teinte: 'menthe', label: 'Installer l’app', sous: 'Sur ton téléphone ou ton ordinateur', onClick: () => setInstallerOpen(true) })}
      {ligne({ icone: <ChatIcon />, teinte: 'menthe', label: 'Donner mon avis', to: '/avis' })}
      <div className="rg-apropos">
        <div><b>À propos</b><span>Version 1.0.0</span></div>
        <p>Réviz t’aide à mieux retenir tes leçons. Scanne une leçon et choisis ton format : flashcards, quiz, résumé ou carte mentale.</p>
      </div>
      <nav className="rg-legal" aria-label="Documents légaux">
        <Link to="/legal/mentions-legales">Mentions légales</Link>
        <Link to="/legal/confidentialite">Confidentialité</Link>
        <Link to="/legal/cgu">CGU</Link>
        <Link to="/legal/cgv">CGV Réviz+</Link>
      </nav>
    </section>
  );

  const pied = (
    <div className="rg-pied">
      {isGuest ? (
        <button type="button" className="rg-btn rg-btn--blanc" onClick={handleLogout}>Quitter le mode essai</button>
      ) : (
        <>
          <button type="button" className="rg-btn rg-btn--blanc" onClick={handleLogout}><LogOutIcon />Se déconnecter</button>
          <button type="button" className="rg-supprimer" onClick={() => setDeleteStep(1)}>Supprimer mon compte</button>
        </>
      )}
    </div>
  );

  const hero = (
    <div className="ch-hero rg-hero">
      <span className="ch-deco ch-deco--a" aria-hidden="true" />
      <span className="ch-deco ch-deco--b" aria-hidden="true" />
      <span className="ch-point" aria-hidden="true" />
      <span className="ch-grain" aria-hidden="true" />
      <div className="rg-hero-haut">
        <button type="button" className="rg-retour" onClick={() => revenir(navigate, '/profil')} aria-label="Retour à Moi"><Chevron sens="gauche" /></button>
      </div>
      <div className="rg-hero-corps">
        <div className="rg-hero-titres">
          <span className="rg-sur rg-sur--hero">Mon profil</span>
          <h1 className="rg-titre">Réglages</h1>
          {!isDesktop && <BulleReviz lignes={lignes} parle={parle} pointe="droite" className="rg-bulle" />}
        </div>
        {isDesktop && <BulleReviz lignes={lignes} parle={parle} pointe="droite" grande className="rg-bulle" />}
        <Pantin ref={pantin} size={isDesktop ? 200 : 150} expression="reflechit" entree="saut" repli={null}
          onEntree={() => setParle(true)} onClick={() => pantin.current?.geste('gratterTete')} label="Réviz, ta mascotte" />
      </div>
    </div>
  );

  const feuilles = (
    <>
      {feuille === 'profil' && (
        <Feuille titre="Prénom et classe" pose="writing" onClose={fermer}>
          <form className="rg-form" onSubmit={handleSaveProfil}>
            <h2 className="rg-feuille-titre">Prénom et classe</h2>
            <label className="rg-label" htmlFor="rg-prenom">Prénom</label>
            <input id="rg-prenom" className="rg-input" value={editPrenom} onChange={e => setEditPrenom(e.target.value)} placeholder="Ton prénom" maxLength={30} />
            <span className="rg-label">Classe</span>
            {(editLevel?.cycle ?? 'college') === 'college' ? (
              <div className="rg-classes" role="group" aria-label="Classe">
                {CLASSES_COLLEGE.map(c => (
                  <button key={c} type="button" className={`rg-classe${editLevel?.classe === c ? ' is-choisie' : ''}`} aria-pressed={editLevel?.classe === c}
                    onClick={() => setEditLevel({ cycle: 'college', classe: c, specialites: [], filiere: null })}>{classeCourte(c)}</button>
                ))}
              </div>
            ) : <LevelSelector value={editLevel} onChange={setEditLevel} compact />}
            {error && <Message type="erreur" texte={error} />}
            {success && <Message type="reussite" titre="C’est enregistré." texte={success} />}
            {success
              ? <button type="button" className="rg-btn rg-btn--blanc" onClick={fermer}>Fermer</button>
              : <>
                <button type="submit" className="rg-btn" disabled={loading || !editPrenom.trim()}>{loading ? 'Enregistrement…' : 'Enregistrer'}</button>
                <button type="button" className="rg-lien" onClick={fermer}>Annuler</button>
              </>}
          </form>
        </Feuille>
      )}
      {feuille === 'email' && (
        <Feuille titre="Adresse e-mail" pose="pointing" onClose={fermer}>
          <form className="rg-form" onSubmit={handleSaveEmail}>
            <h2 className="rg-feuille-titre">Adresse e-mail</h2>
            <p className="rg-sous">Actuelle : {currentUser?.email}</p>
            {!success && (
              <>
                <label className="rg-label" htmlFor="rg-email">Nouvel e-mail</label>
                <input id="rg-email" className="rg-input" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} autoComplete="email" />
                <label className="rg-label" htmlFor="rg-email-mdp">Mot de passe actuel</label>
                <input id="rg-email-mdp" className="rg-input" type="password" value={emailPassword} onChange={e => setEmailPassword(e.target.value)} autoComplete="current-password" />
              </>
            )}
            {error && <Message type="erreur" texte={error} />}
            {success && <Message type="reussite" titre="C’est enregistré." texte={success} />}
            {success
              ? <button type="button" className="rg-btn rg-btn--blanc" onClick={fermer}>Fermer</button>
              : <button type="submit" className="rg-btn" disabled={loading || !newEmail.trim() || !emailPassword}>{loading ? 'Enregistrement…' : 'Enregistrer'}</button>}
          </form>
        </Feuille>
      )}
      {feuille === 'password' && (
        <Feuille titre="Mot de passe" pose="writing" onClose={fermer}>
          <form className="rg-form" onSubmit={handleSavePassword}>
            <h2 className="rg-feuille-titre">Mot de passe</h2>
            {!success && (
              <>
                <label className="rg-label" htmlFor="rg-mdp">Mot de passe actuel</label>
                <input id="rg-mdp" className="rg-input" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} autoComplete="current-password" />
                <label className="rg-label" htmlFor="rg-mdp-nouveau">Nouveau mot de passe</label>
                <input id="rg-mdp-nouveau" className="rg-input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} autoComplete="new-password" />
                <p className="rg-note">6 caractères au moins.</p>
              </>
            )}
            {error && <Message type="erreur" texte={error} />}
            {success && <Message type="reussite" titre="C’est enregistré." texte={success} />}
            {success
              ? <button type="button" className="rg-btn rg-btn--blanc" onClick={fermer}>Fermer</button>
              : <button type="submit" className="rg-btn" disabled={loading || !currentPassword || !newPassword}>{loading ? 'Enregistrement…' : 'Enregistrer'}</button>}
          </form>
        </Feuille>
      )}
      {deleteStep > 0 && (
        <Feuille titre="Supprimer mon compte" pose="sad" onClose={fermerSuppression} bloque={deleting}>
          <div className="rg-form">
            {deleting ? (
              <>
                <h2 className="rg-feuille-titre">Suppression…</h2>
                <p className="rg-sous">Ça prend quelques secondes.</p>
                <button type="button" className="rg-btn rg-btn--encre" disabled><span className="rg-anneau" aria-hidden="true" />Suppression…</button>
              </>
            ) : deleteStep === 1 ? (
              <>
                {!sansMotDePasse && <span className="rg-sur">Étape 1 sur 2</span>}
                <h2 className="rg-feuille-titre">Supprimer mon compte ?</h2>
                <p className="rg-sous">Toutes tes leçons, révisions et badges seront supprimés pour toujours.</p>
                {deleteError && <Message type="erreur" texte={deleteError} />}
                <button type="button" className="rg-btn rg-btn--encre" onClick={handleDeleteAccount}>{sansMotDePasse ? 'Supprimer définitivement' : 'Continuer'}</button>
                <button type="button" className="rg-btn rg-btn--blanc" onClick={fermerSuppression}>Annuler</button>
              </>
            ) : (
              <>
                <span className="rg-sur">Étape 2 sur 2</span>
                <h2 className="rg-feuille-titre">Entre ton mot de passe pour confirmer.</h2>
                <label className="rg-label" htmlFor="rg-suppr-mdp">Mot de passe</label>
                <input id="rg-suppr-mdp" className="rg-input" type="password" value={deletePwd} onChange={e => setDeletePwd(e.target.value)} autoComplete="current-password" autoFocus />
                {deleteError && <Message type="erreur" texte={deleteError} />}
                <button type="button" className="rg-btn rg-btn--encre" onClick={handleDeleteAccount} disabled={!deletePwd}>Supprimer définitivement</button>
                <button type="button" className="rg-btn rg-btn--blanc" onClick={fermerSuppression}>Annuler</button>
              </>
            )}
          </div>
        </Feuille>
      )}
      {revizPlusOuvert && <RevizPlusSheet onClose={() => setRevizPlusOuvert(false)} />}
      {installerOpen && <InstallerModal onClose={() => setInstallerOpen(false)} />}
    </>
  );

  const racine = `app app--no-halo ch-page rg-page${isDesktop ? ' app--large ch-page--large rg-page--large' : ''}`;
  return (
    <div className={racine} style={varsTeinte(TEINTES.lavande)}>
      <div className="content rg-defile">
        {hero}
        {isDesktop ? (
          <div className="rg-colonnes">
            <div className="rg-colonne">{essai}{compte}{rappels}{objectif}</div>
            <div className="rg-colonne">{apparence}{revizPlus}{informations}</div>
          </div>
        ) : (
          <div className="rg-colonne">{essai}{compte}{rappels}{objectif}{apparence}{revizPlus}{informations}</div>
        )}
        {pied}
      </div>
      {feuilles}
      {!isDesktop && <BottomNav />}
    </div>
  );
}
