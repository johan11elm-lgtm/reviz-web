import { UserIcon, MailIcon, KeyIcon, BellIcon, MoonIcon, LockIcon, GemIcon, InfoIcon, ScaleIcon, FileTextIcon, ClipboardIcon, LogOutIcon, AlertIcon } from '../components/Icons';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { PageHeader } from '../components/PageHeader';
import { LevelSelector } from '../components/LevelSelector';
import { THEMES } from '../utils/themes';
import { formatLevelLabel } from '../utils/levels';
import { openBillingPortal, startCheckout } from '../services/billingService';
import { remindersAvailable, isReminderEnabled, enableReminder, disableReminder } from '../services/reminderService';
import { loadLessons } from '../services/historyService';
import { countDueCards } from '../services/srsService';
import './Reglages.css';

function firebaseErrorFr(code) {
  switch (code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return 'Mot de passe incorrect.';
    case 'auth/invalid-email':      return 'Adresse email invalide.';
    case 'auth/email-already-in-use': return 'Cet email est déjà utilisé.';
    case 'auth/weak-password':      return 'Mot de passe trop court (6 caractères min).';
    case 'auth/too-many-requests':  return 'Trop de tentatives. Réessaie plus tard.';
    default:                        return 'Une erreur est survenue. Réessaie.';
  }
}

export default function Reglages() {
  const navigate = useNavigate();
  const { theme, setTheme, isDark, toggleTheme } = useTheme();
  const {
    currentUser, isPremium, logout,
    getUserLevel, setUserLevel, updateDisplayName,
    updateUserEmail, updateUserPassword, deleteAccount,
  } = useAuth();

  const prenom     = currentUser?.displayName ?? '';
  const userLevel  = getUserLevel();
  const levelLabel = formatLevelLabel(userLevel);

  // ── 1. Compte — panneau actif : null | 'profil' | 'email' | 'password' ──
  const [activePanel, setActivePanel] = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');

  const [editPrenom, setEditPrenom]   = useState('');
  const [editLevel, setEditLevel]     = useState({ cycle: null, classe: null, specialites: [], filiere: null });
  const [newEmail, setNewEmail]           = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');

  function openPanel(panel) {
    setActivePanel(panel);
    setError(''); setSuccess('');
    if (panel === 'profil')   {
      setEditPrenom(prenom);
      setEditLevel(userLevel ?? { cycle: null, classe: null, specialites: [], filiere: null });
    }
    if (panel === 'email')    { setNewEmail(''); setEmailPassword(''); }
    if (panel === 'password') { setCurrentPassword(''); setNewPassword(''); }
  }
  function closePanel() { setActivePanel(null); setError(''); setSuccess(''); }
  function togglePanel(panel) { activePanel === panel ? closePanel() : openPanel(panel); }

  async function handleSaveProfil(e) {
    e.preventDefault();
    if (!editPrenom.trim()) return;
    setLoading(true); setError('');
    try {
      await updateDisplayName(editPrenom.trim());
      if (editLevel?.cycle && editLevel?.classe) setUserLevel(editLevel);
      setSuccess('Profil mis à jour !');
    } catch {
      setError('Erreur lors de la sauvegarde, réessaie.');
    } finally { setLoading(false); }
  }

  async function handleSaveEmail(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await updateUserEmail(newEmail.trim(), emailPassword);
      setSuccess('Email mis à jour !');
    } catch (err) {
      setError(firebaseErrorFr(err.code));
    } finally { setLoading(false); }
  }

  async function handleSavePassword(e) {
    e.preventDefault();
    if (newPassword.length < 6) { setError('Mot de passe trop court (6 caractères min).'); return; }
    setLoading(true); setError('');
    try {
      await updateUserPassword(currentPassword, newPassword);
      setSuccess('Mot de passe mis à jour !');
    } catch (err) {
      setError(firebaseErrorFr(err.code));
    } finally { setLoading(false); }
  }

  // ── 2. Notifications — rappel quotidien (app native uniquement) ──
  const notifsAvailable = remindersAvailable();
  const [reminderOn, setReminderOn]         = useState(isReminderEnabled());
  const [reminderDenied, setReminderDenied] = useState(false);

  async function handleReminderToggle(e) {
    const wanted = e.target.checked;
    setReminderDenied(false);
    if (!wanted) {
      setReminderOn(false);
      await disableReminder();
      return;
    }
    setReminderOn(true); // optimiste, reverti si refus
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

  // ── 3. Apparence — thèmes Réviz+ verrouillés hors abonnement ──
  const [themeLockedHint, setThemeLockedHint] = useState(false);

  // ── 4. Objectif quotidien ──
  const [dailyGoal, setDailyGoal] = useState(
    () => parseInt(localStorage.getItem(`reviz-daily-goal-${currentUser?.uid}`) || '3')
  );
  function handleGoal(n) {
    setDailyGoal(n);
    localStorage.setItem(`reviz-daily-goal-${currentUser?.uid}`, String(n));
  }

  // ── 5. Abonnement ──
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError]     = useState('');

  async function handleUpgrade() {
    if (billingLoading) return;
    setBillingLoading(true); setBillingError('');
    try {
      await startCheckout(); // redirige vers Stripe en cas de succès
    } catch (err) {
      setBillingLoading(false);
      setBillingError(err.message === 'EMAIL_NOT_VERIFIED'
        ? 'Confirme d\'abord ton adresse email, puis réessaie.'
        : 'Impossible d\'ouvrir le paiement. Réessaie dans un moment.');
    }
  }

  async function handleManageSubscription() {
    if (billingLoading) return;
    setBillingLoading(true); setBillingError('');
    try {
      await openBillingPortal(); // redirige vers Stripe en cas de succès
    } catch {
      setBillingLoading(false);
      setBillingError('Impossible d\'ouvrir la gestion de l\'abonnement. Réessaie dans un moment.');
    }
  }

  // ── 6. Informations ──
  const [aproposOpen, setAproposOpen] = useState(false);

  // ── 7. Déconnexion + zone de danger ──
  const [deleteStep, setDeleteStep]   = useState(0); // 0=hidden, 1=confirm, 2=password
  const [deletePwd, setDeletePwd]     = useState('');
  const [deleting, setDeleting]       = useState(false);
  const [deleteError, setDeleteError] = useState('');

  async function handleLogout() {
    await logout();
    navigate('/welcome');
  }

  async function handleDeleteAccount() {
    const isGoogle = currentUser?.providerData[0]?.providerId === 'google.com';
    if (deleteStep === 0) { setDeleteStep(1); return; }
    if (deleteStep === 1 && !isGoogle) { setDeleteStep(2); return; }
    // Étape 2 (mot de passe) ou étape 1 (Google) → suppression réelle
    setDeleting(true); setDeleteError('');
    try {
      await deleteAccount(isGoogle ? null : deletePwd);
      navigate('/welcome');
    } catch (err) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setDeleteError('Mot de passe incorrect.');
      } else {
        setDeleteError('Erreur lors de la suppression. Réessaie.');
      }
    } finally { setDeleting(false); }
  }

  return (
    <div className="app reglages-page">
      <PageHeader variant="back" title="Réglages" onBack={() => navigate('/profil')} />

      <div className="rg-content">

        {/* ── 1. Compte ── */}
        <section className="rg-section">
          <h2 className="rg-section-title">Compte</h2>
          <div className="rv-card rg-card">

            <button
              type="button"
              className="rg-row"
              onClick={() => togglePanel('profil')}
              aria-expanded={activePanel === 'profil'}
            >
              <span className="rv-icon-square rv-icon-square--violet" aria-hidden="true"><UserIcon /></span>
              <span className="rg-row-text">
                <span className="rg-row-label">Prénom et niveau</span>
                <span className="rg-row-sub">{[prenom, levelLabel].filter(Boolean).join(' · ') || 'À compléter'}</span>
              </span>
              <span className="rg-row-arrow" aria-hidden="true">{activePanel === 'profil' ? '∨' : '›'}</span>
            </button>
            {activePanel === 'profil' && (
              <form className="rg-panel" onSubmit={handleSaveProfil}>
                <label className="rg-label" htmlFor="rg-prenom">Prénom</label>
                <input
                  id="rg-prenom"
                  className="rg-input"
                  value={editPrenom}
                  onChange={e => setEditPrenom(e.target.value)}
                  placeholder="Ton prénom"
                  maxLength={30}
                />
                <label className="rg-label">Niveau</label>
                <LevelSelector value={editLevel} onChange={setEditLevel} compact />
                {error   && <p className="rg-error">{error}</p>}
                {success && <p className="rg-success">{success}</p>}
                <button className="rv-btn-cta rv-btn-cta--full" type="submit" disabled={loading || !editPrenom.trim()}>
                  {loading ? 'Sauvegarde…' : 'Sauvegarder'}
                </button>
              </form>
            )}

            <button
              type="button"
              className="rg-row"
              onClick={() => togglePanel('email')}
              aria-expanded={activePanel === 'email'}
            >
              <span className="rv-icon-square rv-icon-square--orange" aria-hidden="true"><MailIcon /></span>
              <span className="rg-row-text">
                <span className="rg-row-label">Adresse e-mail</span>
                <span className="rg-row-sub">{currentUser?.email}</span>
              </span>
              <span className="rg-row-arrow" aria-hidden="true">{activePanel === 'email' ? '∨' : '›'}</span>
            </button>
            {activePanel === 'email' && (
              <form className="rg-panel" onSubmit={handleSaveEmail}>
                <input
                  className="rg-input"
                  type="email"
                  placeholder="Nouvel email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  autoFocus
                />
                <input
                  className="rg-input"
                  type="password"
                  placeholder="Mot de passe actuel"
                  value={emailPassword}
                  onChange={e => setEmailPassword(e.target.value)}
                  autoComplete="current-password"
                />
                {error   && <p className="rg-error">{error}</p>}
                {success && <p className="rg-success">{success}</p>}
                <button className="rv-btn-cta rv-btn-cta--full" type="submit" disabled={loading}>
                  {loading ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </form>
            )}

            <button
              type="button"
              className="rg-row"
              onClick={() => togglePanel('password')}
              aria-expanded={activePanel === 'password'}
            >
              <span className="rv-icon-square rv-icon-square--green" aria-hidden="true"><KeyIcon /></span>
              <span className="rg-row-text">
                <span className="rg-row-label">Mot de passe</span>
              </span>
              <span className="rg-row-arrow" aria-hidden="true">{activePanel === 'password' ? '∨' : '›'}</span>
            </button>
            {activePanel === 'password' && (
              <form className="rg-panel" onSubmit={handleSavePassword}>
                <input
                  className="rg-input"
                  type="password"
                  placeholder="Mot de passe actuel"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  autoFocus
                />
                <input
                  className="rg-input"
                  type="password"
                  placeholder="Nouveau mot de passe"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
                {error   && <p className="rg-error">{error}</p>}
                {success && <p className="rg-success">{success}</p>}
                <button className="rv-btn-cta rv-btn-cta--full" type="submit" disabled={loading}>
                  {loading ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </form>
            )}
          </div>
        </section>

        {/* ── 2. Notifications ── */}
        <section className="rg-section">
          <h2 className="rg-section-title">Notifications</h2>
          <div className="rv-card rg-card">
            <div className="rg-toggle-row">
              <span className="rv-icon-square rv-icon-square--orange" aria-hidden="true"><BellIcon /></span>
              <span className="rg-row-text">
                <span className="rg-row-label">Rappel quotidien</span>
                <span className="rg-row-sub">Tous les jours à 18 h 30</span>
              </span>
              <label className="toggle-wrap">
                <input
                  type="checkbox"
                  checked={reminderOn}
                  onChange={handleReminderToggle}
                  disabled={!notifsAvailable}
                  aria-label="Activer le rappel de révision quotidien à 18 h 30"
                />
                <span className="toggle-slider" />
              </label>
            </div>
            {!notifsAvailable && (
              <p className="rg-hint">Les rappels sont disponibles dans l'app mobile Réviz.</p>
            )}
            {reminderDenied && (
              <p className="rg-error" role="alert">
                Notifications refusées — autorise Réviz dans Réglages &gt; Notifications.
              </p>
            )}
          </div>
        </section>

        {/* ── 3. Apparence ── */}
        <section className="rg-section">
          <h2 className="rg-section-title">Apparence</h2>
          <div className="rv-card rg-card">
            <div className="rg-toggle-row">
              <span className="rv-icon-square rv-icon-square--violet" aria-hidden="true"><MoonIcon /></span>
              <span className="rg-row-text">
                <span className="rg-row-label">Mode sombre</span>
              </span>
              <label className="toggle-wrap">
                <input
                  type="checkbox"
                  checked={isDark}
                  onChange={toggleTheme}
                  aria-label="Activer le mode sombre"
                />
                <span className="toggle-slider" />
              </label>
            </div>

            {/* Thèmes — les thèmes Réviz+ sont un avantage abonnement */}
            <div className="rg-theme-grid" role="radiogroup" aria-label="Thème de l'application">
              {THEMES.map(t => {
                const locked = t.premium && !isPremium;
                const active = theme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`rg-theme-swatch${active ? ' rg-theme-swatch--active' : ''}${locked ? ' rg-theme-swatch--locked' : ''}`}
                    style={{ background: `linear-gradient(135deg, ${t.swatch[0]} 55%, ${t.swatch[1]} 55%)` }}
                    role="radio"
                    aria-checked={active}
                    aria-label={`Thème ${t.label}${t.premium ? ' (Réviz+)' : ''}${locked ? ' — verrouillé' : ''}`}
                    onClick={() => {
                      if (locked) { setThemeLockedHint(true); return; }
                      setThemeLockedHint(false);
                      setTheme(t.id);
                    }}
                  >
                    {locked && <span className="rg-theme-lock" aria-hidden="true"><LockIcon /></span>}
                    <span className="rg-theme-name">{t.label}</span>
                  </button>
                );
              })}
            </div>
            {themeLockedHint && (
              <p className="rg-hint" role="status">
                Les thèmes sont un avantage Réviz+ : débloque-les avec l'abonnement juste en dessous.
              </p>
            )}
          </div>
        </section>

        {/* ── 4. Objectif quotidien ── */}
        <section className="rg-section">
          <h2 className="rg-section-title">Objectif quotidien</h2>
          <div className="rv-card rg-card">
            <p className="rg-hint rg-goal-hint">Combien de révisions par jour souhaites-tu faire ?</p>
            <div className="rg-goal-grid" role="radiogroup" aria-label="Objectif de révisions par jour">
              {[1, 3, 5, 10].map(n => (
                <button
                  key={n}
                  type="button"
                  className={`rg-goal-btn${dailyGoal === n ? ' rg-goal-btn--active' : ''}`}
                  role="radio"
                  aria-checked={dailyGoal === n}
                  aria-label={`${n} révision${n > 1 ? 's' : ''} par jour`}
                  onClick={() => handleGoal(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── 5. Abonnement ── */}
        <section className="rg-section">
          <h2 className="rg-section-title">Abonnement</h2>
          <div className="rv-card rg-card">
            <div className="rg-plan-row">
              <span className="rg-plan-label">Plan actuel</span>
              {isPremium
                ? <span className="premium-chip premium-chip--active"><GemIcon /> Réviz+ actif</span>
                : <span className="rg-plan-free">Gratuit</span>}
            </div>
            {isPremium ? (
              <button
                type="button"
                className="rv-btn-cta rv-btn-cta--ghost rv-btn-cta--full"
                onClick={handleManageSubscription}
                disabled={billingLoading}
              >
                {billingLoading ? 'Ouverture…' : 'Gérer mon abonnement'}
              </button>
            ) : (
              <button
                type="button"
                className="rv-btn-cta rv-btn-cta--full"
                onClick={handleUpgrade}
                disabled={billingLoading}
              >
                {billingLoading ? 'Ouverture…' : 'Passer à Réviz+'}
              </button>
            )}
            {billingError && <p className="rg-error" role="alert">{billingError}</p>}
          </div>
        </section>

        {/* ── 6. Informations ── */}
        <section className="rg-section">
          <h2 className="rg-section-title">Informations</h2>
          <div className="rv-card rg-card">
            <button
              type="button"
              className="rg-row"
              onClick={() => setAproposOpen(o => !o)}
              aria-expanded={aproposOpen}
            >
              <span className="rv-icon-square rv-icon-square--violet" aria-hidden="true"><InfoIcon /></span>
              <span className="rg-row-text">
                <span className="rg-row-label">À propos</span>
              </span>
              <span className="rg-row-arrow" aria-hidden="true">{aproposOpen ? '∨' : '›'}</span>
            </button>
            {aproposOpen && (
              <div className="rg-about">
                <div className="rg-about-logo">réviz ✦</div>
                <p>Réviz t'aide à mieux retenir tes leçons grâce à l'IA. Scanne une leçon et choisis ton format : flashcards, quiz, résumé ou carte mentale.</p>
                <p className="rg-about-version">Version 1.0.0</p>
              </div>
            )}

            <Link to="/legal/mentions-legales" className="rg-row">
              <span className="rv-icon-square rv-icon-square--green" aria-hidden="true"><ScaleIcon /></span>
              <span className="rg-row-text">
                <span className="rg-row-label">Mentions légales</span>
              </span>
              <span className="rg-row-arrow" aria-hidden="true">›</span>
            </Link>

            <Link to="/legal/confidentialite" className="rg-row">
              <span className="rv-icon-square rv-icon-square--orange" aria-hidden="true"><FileTextIcon /></span>
              <span className="rg-row-text">
                <span className="rg-row-label">Confidentialité</span>
              </span>
              <span className="rg-row-arrow" aria-hidden="true">›</span>
            </Link>

            <Link to="/legal/cgu" className="rg-row">
              <span className="rv-icon-square rv-icon-square--pink" aria-hidden="true"><ClipboardIcon /></span>
              <span className="rg-row-text">
                <span className="rg-row-label">CGU</span>
              </span>
              <span className="rg-row-arrow" aria-hidden="true">›</span>
            </Link>
          </div>
        </section>

        {/* ── 7. Déconnexion + zone de danger ── */}
        <section className="rg-section">
          <button
            type="button"
            className="rv-btn-cta rv-btn-cta--ghost rv-btn-cta--full rg-logout"
            onClick={handleLogout}
          >
            <LogOutIcon /> Se déconnecter
          </button>

          <div className="rg-danger">
            <h2 className="rg-section-title rg-section-title--danger">Zone de danger</h2>

            {deleteStep === 0 && (
              <button
                type="button"
                className="rv-btn-cta rv-btn-cta--ghost rv-btn-cta--full rg-delete-trigger"
                onClick={handleDeleteAccount}
              >
                Supprimer mon compte
              </button>
            )}

            {deleteStep === 1 && (
              <div className="rg-delete-confirm">
                <div className="rv-callout rv-callout--red">
                  <span className="rv-callout-label"><AlertIcon /> Irréversible</span>
                  Toutes tes leçons, révisions et données seront supprimées définitivement.
                </div>
                <button
                  type="button"
                  className="rv-btn-cta rv-btn-cta--danger rv-btn-cta--full"
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                >
                  {deleting ? 'Suppression…' : 'Confirmer la suppression'}
                </button>
                <button
                  type="button"
                  className="rv-btn-cta rv-btn-cta--ghost rv-btn-cta--full"
                  onClick={() => setDeleteStep(0)}
                >
                  Annuler
                </button>
              </div>
            )}

            {deleteStep === 2 && (
              <div className="rg-delete-confirm">
                <div className="rv-callout rv-callout--red">
                  <span className="rv-callout-label"><AlertIcon /> Confirmation</span>
                  Entre ton mot de passe pour confirmer la suppression définitive.
                </div>
                <input
                  className="rg-input"
                  type="password"
                  value={deletePwd}
                  onChange={e => setDeletePwd(e.target.value)}
                  placeholder="Mot de passe actuel"
                  autoComplete="current-password"
                />
                {deleteError && <p className="rg-error" role="alert">{deleteError}</p>}
                <button
                  type="button"
                  className="rv-btn-cta rv-btn-cta--danger rv-btn-cta--full"
                  onClick={handleDeleteAccount}
                  disabled={deleting || !deletePwd}
                >
                  {deleting ? 'Suppression…' : 'Supprimer définitivement'}
                </button>
                <button
                  type="button"
                  className="rv-btn-cta rv-btn-cta--ghost rv-btn-cta--full"
                  onClick={() => setDeleteStep(0)}
                >
                  Annuler
                </button>
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
