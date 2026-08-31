import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loadLessons, syncFromFirestore } from '../services/historyService';
import { loadRevisions, syncRevisionsFromFirestore } from '../services/revisionService';
import { Drawer } from '../components/Drawer';
import { BottomNav } from '../components/BottomNav';
import { LevelSelector } from '../components/LevelSelector';
import { PageHeader } from '../components/PageHeader';
import { Mascot } from '../components/Mascot';
import { computeStreak, computeLevel, computeBadges, XP_PAR_NIVEAU } from '../utils/gamification';
import { formatLevelLabel } from '../utils/levels';
import './Profile.css';

// Mascotte adaptative au niveau / streak / activité — pattern Progres `getHeroNarrative`.
function getProfileHero(level, streak, lessonsCount) {
  if (level >= 10)        return { pose: 'trophy',      phrase: `Niveau ${level}, t'es au top.` };
  if (streak >= 7)        return { pose: 'fire',        phrase: `${streak} jours d'affilée. T'es chaud.` };
  if (level >= 3)         return { pose: 'celebration', phrase: `Niveau ${level}, ça avance bien.` };
  if (lessonsCount >= 1)  return { pose: 'reading',     phrase: `Tu as déjà scanné ${lessonsCount} leçon${lessonsCount > 1 ? 's' : ''}. Continue !` };
  return                       { pose: 'hello',       phrase: `Bienvenue dans ton profil. Première leçon dans 1 clic ?` };
}

const ACCOUNT_ITEMS = [
  { id: 'profil',          icon: '👤', label: 'Modifier le profil', tone: 'violet' },
  { id: 'notifications',   icon: '🔔', label: 'Notifications',      tone: 'orange' },
  { id: 'objectif',        icon: '🎯', label: 'Objectif quotidien', tone: 'green'  },
  { id: 'confidentialite', icon: '🔒', label: 'Confidentialité',    tone: 'pink'   },
  { id: 'logout',          icon: '🚪', label: 'Se déconnecter',     tone: 'red', danger: true },
];

const SHEET_TITLES = {
  profil:          'Modifier le profil',
  notifications:   'Notifications',
  objectif:        'Objectif quotidien',
  confidentialite: 'Confidentialité',
};

export default function Profile() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showAllBadges, setShowAllBadges] = useState(false);
  const navigate = useNavigate();

  const { currentUser, getUserLevel, setUserLevel, logout, updateDisplayName, updateUserPassword, deleteAccount } = useAuth();
  const prenom   = currentUser?.displayName ?? '';
  const initiale = prenom[0]?.toUpperCase() ?? '?';
  const userLevel  = getUserLevel();
  const levelLabel = formatLevelLabel(userLevel);

  const [allLessons, setAllLessons]     = useState(() => loadLessons());
  const [allRevisions, setAllRevisions] = useState(() => loadRevisions());

  useEffect(() => {
    syncFromFirestore().then(setAllLessons);
    syncRevisionsFromFirestore().then(setAllRevisions);
  }, []);

  const streak = computeStreak(allLessons);
  const { level, xpInLvl, fillPct } = computeLevel(allLessons);
  const badges = computeBadges(allLessons, allRevisions, streak, level);
  const unlocked = badges.filter(b => !b.locked).length;
  const hero = getProfileHero(level, streak, allLessons.length);


  const [activeSheet, setActiveSheet] = useState(null);
  const [editPrenom, setEditPrenom]   = useState('');
  const [editLevel, setEditLevel]     = useState({ cycle: null, classe: null, specialites: [], filiere: null });
  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState('');
  const [notifsEnabled, setNotifsEnabled] = useState(
    () => localStorage.getItem('reviz-notifs') === 'true'
  );
  const [currentPwd, setCurrentPwd]   = useState('');
  const [newPwd, setNewPwd]           = useState('');
  const [pwdSaving, setPwdSaving]     = useState(false);
  const [pwdError, setPwdError]       = useState('');
  const [pwdSuccess, setPwdSuccess]   = useState(false);
  const [deleteStep, setDeleteStep]   = useState(0); // 0=hidden, 1=confirm, 2=password
  const [deletePwd, setDeletePwd]     = useState('');
  const [deleting, setDeleting]       = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [dailyGoal, setDailyGoal] = useState(
    () => parseInt(localStorage.getItem(`reviz-daily-goal-${currentUser?.uid}`) || '3')
  );

  function openSheet(name) {
    if (name === 'profil') {
      setEditPrenom(prenom);
      setEditLevel(userLevel ?? { cycle: null, classe: null, specialites: [], filiere: null });
      setSaveError('');
    }
    if (name === 'confidentialite') {
      setCurrentPwd(''); setNewPwd(''); setPwdError(''); setPwdSuccess(false);
      setDeleteStep(0); setDeletePwd(''); setDeleteError('');
    }
    setActiveSheet(name);
  }

  function closeSheet() { setActiveSheet(null); }

  async function handleSaveProfil() {
    if (!editPrenom.trim()) return;
    setSaving(true); setSaveError('');
    try {
      await updateDisplayName(editPrenom.trim());
      if (editLevel?.cycle && editLevel?.classe) {
        setUserLevel(editLevel);
      }
      closeSheet();
    } catch { setSaveError('Erreur lors de la sauvegarde, réessaie.'); }
    finally { setSaving(false); }
  }

  function handleToggleNotifs() {
    const next = !notifsEnabled;
    setNotifsEnabled(next);
    localStorage.setItem('reviz-notifs', String(next));
  }

  async function handleChangePwd() {
    if (!currentPwd || !newPwd) return;
    if (newPwd.length < 6) { setPwdError('Le mot de passe doit faire au moins 6 caractères.'); return; }
    setPwdSaving(true); setPwdError(''); setPwdSuccess(false);
    try {
      await updateUserPassword(currentPwd, newPwd);
      setPwdSuccess(true); setCurrentPwd(''); setNewPwd('');
    } catch (err) {
      setPwdError(
        err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential'
          ? 'Mot de passe actuel incorrect.' : 'Erreur, réessaie.'
      );
    } finally { setPwdSaving(false); }
  }

  async function handleDeleteAccount() {
    const isGoogle = currentUser?.providerData[0]?.providerId === 'google.com';
    if (deleteStep === 0) { setDeleteStep(1); return; }
    if (deleteStep === 1 && !isGoogle) { setDeleteStep(2); return; }
    // Step 2 (password) or step 1 (Google) → actually delete
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

  async function handleLogout() {
    await logout();
    navigate('/welcome');
  }

  function onAccountClick(id) {
    if (id === 'logout') return handleLogout();
    openSheet(id);
  }

  return (
    <div className="app profile-page">
      <PageHeader
        variant="title-only"
        title="Profil"
        right={
          <button
            type="button"
            className="rv-bell-btn"
            onClick={() => setDrawerOpen(true)}
            aria-label="Ouvrir le menu"
          >
            {initiale}
          </button>
        }
      />

      <div className="pf-content">
        {/* HERO centré — identité + progression en un seul bloc */}
        <section className="pf-hero">
          <Mascot
            pose={hero.pose}
            size={112}
            glow
            priority
            className="pf-hero-mascot"
          />
          <h1 className="pf-hero-name">{prenom || 'Toi'}</h1>
          <div className="pf-hero-meta">
            <span className="rv-pill rv-pill--orange pf-hero-pill">Niveau {level}</span>
            {levelLabel && <span className="pf-hero-classe">{levelLabel}</span>}
          </div>
          <div className="pf-hero-xp">
            <div className="rv-bar rv-bar--tall rv-bar--orange-bg">
              <div className="rv-bar-fill rv-bar-fill--orange" style={{ width: `${fillPct}%` }} />
            </div>
            <p className="pf-xp-sub">{xpInLvl} / {XP_PAR_NIVEAU} XP — encore {XP_PAR_NIVEAU - xpInLvl} avant le niveau {level + 1}</p>
          </div>
        </section>

        {/* Stats — une seule carte, trois colonnes */}
        <section className="rv-card rv-card--padded pf-stats-card">
          <div className="pf-stat">
            <span className="pf-stat-icon" aria-hidden="true">🔥</span>
            <span className="pf-stat-value">{streak}</span>
            <span className="pf-stat-label">Jours de suite</span>
          </div>
          <div className="pf-stat-sep" aria-hidden="true" />
          <div className="pf-stat">
            <span className="pf-stat-icon" aria-hidden="true">📚</span>
            <span className="pf-stat-value">{allLessons.length}</span>
            <span className="pf-stat-label">Leçons</span>
          </div>
          <div className="pf-stat-sep" aria-hidden="true" />
          <div className="pf-stat">
            <span className="pf-stat-icon" aria-hidden="true">⚡</span>
            <span className="pf-stat-value">{allRevisions.length}</span>
            <span className="pf-stat-label">Révisions</span>
          </div>
        </section>

        {/* Badges */}
        <section className="pf-section">
          <header className="pf-section-header">
            <h2 className="pf-section-title">Badges</h2>
            <span className="pf-badges-count">{unlocked}/{badges.length}</span>
          </header>
          <div className="pf-badges-grid">
            {(showAllBadges ? badges : badges.slice(0, 8)).map((b, i) => (
              <div
                key={b.id ?? `${b.label}-${i}`}
                className={`pf-badge${b.locked ? ' pf-badge--locked' : ''}`}
              >
                <span className="pf-badge-emoji" aria-hidden="true">{b.emoji}</span>
                <span className="pf-badge-label">{b.label}</span>
              </div>
            ))}
          </div>
          {badges.length > 8 && (
            <button
              type="button"
              className="pf-badges-more"
              onClick={() => setShowAllBadges(v => !v)}
            >
              {showAllBadges ? 'Voir moins' : `Voir les ${badges.length - 8} autres`}
            </button>
          )}
        </section>

        {/* Compte */}
        <section className="pf-section">
          <h2 className="pf-section-title">Compte</h2>
          <div className="pf-account-list">
            {ACCOUNT_ITEMS.map(it => (
              <button
                key={it.id}
                type="button"
                className={`pf-account-btn${it.danger ? ' pf-account-btn--danger' : ''}`}
                onClick={() => onAccountClick(it.id)}
              >
                <span className={`rv-icon-square rv-icon-square--${it.tone}`} aria-hidden="true">
                  {it.icon}
                </span>
                <span className="pf-account-label">{it.label}</span>
                <span className="pf-account-arrow" aria-hidden="true">›</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Backdrop sheet — fade in/out */}
      {activeSheet && (
        <div
          className="pf-sheet-backdrop"
          onClick={closeSheet}
          aria-hidden="true"
        />
      )}

      {/* Bottom sheet unifiée — toujours dans le DOM, transform-slide */}
      <aside
        className={`rv-sheet--bottom pf-sheet${activeSheet ? '' : ' rv-sheet--bottom-hidden'}`}
        aria-hidden={!activeSheet}
        aria-label={activeSheet ? SHEET_TITLES[activeSheet] : undefined}
      >
        <div className="rv-sheet-handle" />
        <header className="pf-sheet-header">
          <h2 className="pf-sheet-title">{SHEET_TITLES[activeSheet] || ''}</h2>
          <button
            type="button"
            className="pf-sheet-close"
            onClick={closeSheet}
            aria-label="Fermer"
          >
            ×
          </button>
        </header>
        <div className="pf-sheet-body" key={activeSheet || 'closed'}>
          {activeSheet === 'profil' && (
            <>
              <label className="pf-sheet-label" htmlFor="pf-prenom">Prénom</label>
              <input
                id="pf-prenom"
                className="pf-sheet-input"
                value={editPrenom}
                onChange={e => setEditPrenom(e.target.value)}
                placeholder="Ton prénom"
                maxLength={30}
              />
              <label className="pf-sheet-label" style={{ marginTop: 14 }}>Niveau</label>
              <LevelSelector value={editLevel} onChange={setEditLevel} />
              {saveError && <p className="pf-sheet-error">{saveError}</p>}
              <button
                type="button"
                className="rv-btn-cta rv-btn-cta--full pf-sheet-save"
                onClick={handleSaveProfil}
                disabled={saving || !editPrenom.trim()}
              >
                {saving ? 'Sauvegarde…' : 'Sauvegarder'}
              </button>
            </>
          )}

          {activeSheet === 'notifications' && (
            <>
              <div className="pf-notif-row">
                <div className="pf-notif-info">
                  <span className="pf-notif-name">Rappel quotidien</span>
                  <span className="pf-notif-desc">Révise 10 min par jour</span>
                </div>
                <button
                  type="button"
                  className={`pf-toggle${notifsEnabled ? ' pf-toggle--on' : ''}`}
                  onClick={handleToggleNotifs}
                  aria-pressed={notifsEnabled}
                  aria-label="Activer le rappel quotidien"
                >
                  <span className="pf-toggle-knob" />
                </button>
              </div>
              <p className="pf-sheet-hint">
                Les notifications push seront disponibles dans la version mobile.
              </p>
            </>
          )}

          {activeSheet === 'objectif' && (
            <>
              <p className="pf-sheet-hint">Combien de révisions par jour souhaites-tu faire ?</p>
              <div className="pf-goal-grid">
                {[1, 3, 5, 10].map(n => (
                  <button
                    key={n}
                    type="button"
                    className={`pf-goal-btn${dailyGoal === n ? ' pf-goal-btn--active' : ''}`}
                    onClick={() => {
                      setDailyGoal(n);
                      localStorage.setItem(`reviz-daily-goal-${currentUser?.uid}`, String(n));
                      closeSheet();
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </>
          )}

          {activeSheet === 'confidentialite' && (
            <>
              <div className="rv-card rv-card--tight pf-confid-email">
                <span className="pf-confid-email-label">Email</span>
                <span className="pf-confid-email-value">{currentUser?.email}</span>
              </div>

              <label className="pf-sheet-label" style={{ marginTop: 14 }}>
                Changer le mot de passe
              </label>
              <input
                className="pf-sheet-input"
                type="password"
                value={currentPwd}
                onChange={e => setCurrentPwd(e.target.value)}
                placeholder="Mot de passe actuel"
                autoComplete="current-password"
              />
              <input
                className="pf-sheet-input"
                type="password"
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                placeholder="Nouveau mot de passe"
                autoComplete="new-password"
              />
              {pwdError   && <p className="pf-sheet-error">{pwdError}</p>}
              {pwdSuccess && <p className="pf-sheet-success">Mot de passe mis à jour ✓</p>}
              <button
                type="button"
                className="rv-btn-cta rv-btn-cta--full pf-sheet-save"
                onClick={handleChangePwd}
                disabled={pwdSaving || !currentPwd || !newPwd}
              >
                {pwdSaving ? 'Mise à jour…' : 'Mettre à jour'}
              </button>

              <div className="pf-delete-section">
                <label className="pf-sheet-label">Zone de danger</label>

                {deleteStep === 0 && (
                  <button
                    type="button"
                    className="rv-btn-cta rv-btn-cta--ghost rv-btn-cta--full pf-delete-trigger"
                    onClick={handleDeleteAccount}
                  >
                    Supprimer mon compte
                  </button>
                )}

                {deleteStep === 1 && (
                  <div className="pf-delete-confirm">
                    <div className="rv-callout rv-callout--red">
                      <span className="rv-callout-label">⚠️ Irréversible</span>
                      Toutes tes leçons, révisions et données seront supprimées définitivement.
                    </div>
                    <div className="pf-delete-actions">
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
                  </div>
                )}

                {deleteStep === 2 && (
                  <div className="pf-delete-confirm">
                    <div className="rv-callout rv-callout--red">
                      <span className="rv-callout-label">⚠️ Confirmation</span>
                      Entre ton mot de passe pour confirmer la suppression définitive.
                    </div>
                    <input
                      className="pf-sheet-input"
                      type="password"
                      value={deletePwd}
                      onChange={e => setDeletePwd(e.target.value)}
                      placeholder="Mot de passe actuel"
                      autoComplete="current-password"
                    />
                    {deleteError && <p className="pf-sheet-error">{deleteError}</p>}
                    <div className="pf-delete-actions">
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
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </aside>

      <BottomNav active="profile" />
      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
