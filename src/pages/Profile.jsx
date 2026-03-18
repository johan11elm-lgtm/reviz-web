import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loadLessons, syncFromFirestore } from '../services/historyService';
import { loadRevisions, syncRevisionsFromFirestore } from '../services/revisionService';
import { Drawer } from '../components/Drawer';
import { BottomNav } from '../components/BottomNav';
import './Profile.css';

const XP_PAR_LECON  = 100;
const XP_PAR_NIVEAU = 500;
const CLASSES = ['6ème', '5ème', '4ème', '3ème'];

function computeStreak(lessons) {
  if (!lessons.length) return 0;
  const days = new Set(lessons.map(l => new Date(l.scannedAt).toLocaleDateString('fr-FR')));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (days.has(d.toLocaleDateString('fr-FR'))) streak++;
    else if (i > 0) break;
  }
  return streak;
}

function computeLevel(lessons) {
  const xp      = lessons.length * XP_PAR_LECON;
  const level   = Math.floor(xp / XP_PAR_NIVEAU) + 1;
  const xpInLvl = xp % XP_PAR_NIVEAU;
  const fillPct = Math.round(xpInLvl / XP_PAR_NIVEAU * 100);
  return { level, xpInLvl, fillPct };
}

function computeBadges(lessons, revisions, streak, level) {
  const types = new Set(revisions.map(r => r.type));
  const allFormats = ['flashcards', 'quiz', 'resume', 'mindmap'].every(t => types.has(t));

  // Flashcards totales générées
  const totalFlashcards = lessons.reduce((s, l) => s + (l.flashcardsCount || 0), 0);

  // Max révisions en un seul jour
  const revsByDay = {};
  revisions.forEach(r => {
    const day = new Date(r.revisedAt).toLocaleDateString('fr-FR');
    revsByDay[day] = (revsByDay[day] || 0) + 1;
  });
  const maxRevsInDay = Object.values(revsByDay).length ? Math.max(...Object.values(revsByDay)) : 0;

  // Max révisions d'une même leçon
  const revsByLesson = {};
  revisions.forEach(r => {
    if (r.lessonId) revsByLesson[r.lessonId] = (revsByLesson[r.lessonId] || 0) + 1;
  });
  const maxRevsPerLesson = Object.values(revsByLesson).length ? Math.max(...Object.values(revsByLesson)) : 0;

  // 20+ révisions de chaque format
  const countByType = { flashcards: 0, quiz: 0, resume: 0, mindmap: 0 };
  revisions.forEach(r => { if (r.type in countByType) countByType[r.type]++; });
  const isMaitre = Object.values(countByType).every(c => c >= 20);

  return [
    { emoji: '🚀', label: 'Lanceur',      locked: lessons.length < 1 },
    { emoji: '⭐', label: 'Curieux',      locked: types.size < 3 },
    { emoji: '⚡', label: 'Rapide',       locked: revisions.length < 1 },
    { emoji: '🎓', label: 'Étudiant',     locked: lessons.length < 5 },
    { emoji: '🔄', label: 'Régulier',     locked: streak < 3 },
    { emoji: '🔬', label: 'Chercheur',    locked: totalFlashcards < 50 },
    { emoji: '🎯', label: 'Précis',       locked: !allFormats },
    { emoji: '🔥', label: '7 jours',      locked: streak < 7 },
    { emoji: '📅', label: 'Fidèle',       locked: streak < 14 },
    { emoji: '☕', label: 'Acharné',      locked: maxRevsInDay < 10 },
    { emoji: '🧠', label: 'Expert',       locked: lessons.length < 10 },
    { emoji: '💪', label: 'Approfondi',   locked: maxRevsPerLesson < 5 },
    { emoji: '⚙️', label: 'Maître',       locked: !isMaitre },
    { emoji: '🏆', label: 'Champion',     locked: revisions.length < 50 },
    { emoji: '📚', label: 'Bibliothèque', locked: lessons.length < 50 },
    { emoji: '👑', label: 'Niveau 10',    locked: level < 10 },
    { emoji: '💎', label: 'Diamant',      locked: lessons.length < 25 },
    { emoji: '🌟', label: 'Légende',      locked: streak < 30 },
  ];
}

export default function Profile() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showAllBadges, setShowAllBadges] = useState(false);
  const navigate = useNavigate();

  const { currentUser, getUserClasse, logout, updateDisplayName, updateUserPassword } = useAuth();
  const prenom   = currentUser?.displayName ?? '';
  const initiale = prenom[0]?.toUpperCase() ?? '?';
  const classe   = getUserClasse();

  const [allLessons, setAllLessons]     = useState(() => loadLessons());
  const [allRevisions, setAllRevisions] = useState(() => loadRevisions());

  // Sync depuis Firestore au montage
  useEffect(() => {
    syncFromFirestore().then(setAllLessons);
    syncRevisionsFromFirestore().then(setAllRevisions);
  }, []);

  const streak = computeStreak(allLessons);
  const { level, xpInLvl, fillPct } = computeLevel(allLessons);
  const badges = computeBadges(allLessons, allRevisions, streak, level);

  const createdAt = currentUser?.metadata?.creationTime
    ? new Date(currentUser.metadata.creationTime)
        .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : '';

  // --- Sheets ---
  const [activeSheet, setActiveSheet] = useState(null); // 'profil' | 'notifications' | 'confidentialite'

  // Sheet : Modifier le profil
  const [editPrenom, setEditPrenom]   = useState('');
  const [editClasse, setEditClasse]   = useState('');
  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState('');

  // Sheet : Notifications
  const [notifsEnabled, setNotifsEnabled] = useState(
    () => localStorage.getItem('reviz-notifs') === 'true'
  );

  // Sheet : Confidentialité — changer mot de passe
  const [currentPwd, setCurrentPwd]   = useState('');
  const [newPwd, setNewPwd]           = useState('');
  const [pwdSaving, setPwdSaving]     = useState(false);
  const [pwdError, setPwdError]       = useState('');
  const [pwdSuccess, setPwdSuccess]   = useState(false);

  function openSheet(name) {
    if (name === 'profil') {
      setEditPrenom(prenom);
      setEditClasse(classe);
      setSaveError('');
    }
    if (name === 'confidentialite') {
      setCurrentPwd(''); setNewPwd('');
      setPwdError(''); setPwdSuccess(false);
    }
    setActiveSheet(name);
  }

  function closeSheet() { setActiveSheet(null); }

  async function handleSaveProfil() {
    if (!editPrenom.trim()) return;
    setSaving(true); setSaveError('');
    try {
      await updateDisplayName(editPrenom.trim());
      if (editClasse && currentUser)
        localStorage.setItem(`reviz-classe-${currentUser.uid}`, editClasse);
      closeSheet();
    } catch {
      setSaveError('Erreur lors de la sauvegarde, réessaie.');
    } finally {
      setSaving(false);
    }
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
      setPwdSuccess(true);
      setCurrentPwd(''); setNewPwd('');
    } catch (err) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential')
        setPwdError('Mot de passe actuel incorrect.');
      else
        setPwdError('Erreur, réessaie.');
    } finally {
      setPwdSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/welcome');
  }

  return (
    <div className="app">
      {/* Header */}
      <div className="header">
        <button className="back-btn" onClick={() => navigate('/')}>←</button>
        <span className="header-title">Profil</span>
        <div className="header-avatar" onClick={() => setDrawerOpen(true)}>{initiale}</div>
      </div>

      {/* Content */}
      <div className="content">

        {/* Hero */}
        <div className="profile-hero">
          <div className="avatar-wrap">
            <div className="avatar">{initiale}</div>
            <div className="avatar-level">Niv. {level}</div>
          </div>
          <div className="profile-name">{prenom}</div>
          {classe && <div className="profile-classe">{classe}</div>}
          {createdAt && <div className="profile-handle">Membre depuis {createdAt}</div>}
        </div>

        {/* XP */}
        <div className="xp-section">
          <div className="xp-header">
            <span className="xp-label">Niveau {level}</span>
            <span className="xp-value">{xpInLvl} / {XP_PAR_NIVEAU} XP</span>
          </div>
          <div className="xp-bar">
            <div className="xp-fill" style={{ width: fillPct + '%' }} />
          </div>
          <div className="xp-sub">{XP_PAR_NIVEAU - xpInLvl} XP jusqu'au niveau {level + 1}</div>
        </div>

        {/* Stats */}
        <div className="profile-stats-grid">
          <div className="stat-card">
            <span className="stat-icon">🔥</span>
            <span className="stat-value">{streak}</span>
            <span className="stat-label">Jours de suite</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">📚</span>
            <span className="stat-value">{allLessons.length}</span>
            <span className="stat-label">Leçons scannées</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">⚡</span>
            <span className="stat-value">{allRevisions.length}</span>
            <span className="stat-label">Révisions faites</span>
          </div>
        </div>

        {/* Badges */}
        <div className="badges-header">
          <div className="section-title" style={{ margin: 0 }}>Badges</div>
          <span className="badges-count">{badges.filter(b => !b.locked).length}/{badges.length}</span>
        </div>
        <div className="badges-grid">
          {(showAllBadges ? badges : badges.slice(0, 8)).map((b, i) => (
            <div key={i} className={`badge-item${b.locked ? ' locked' : ''}`}>
              <span className="badge-emoji">{b.emoji}</span>
              <span className="badge-label">{b.label}</span>
            </div>
          ))}
        </div>
        {badges.length > 8 && (
          <button className="badges-more-btn" onClick={() => setShowAllBadges(v => !v)}>
            {showAllBadges ? 'Voir moins' : `Voir les ${badges.length - 8} autres`}
          </button>
        )}

        {/* Settings */}
        <div className="section-title">Compte</div>
        <div className="settings-list">
          <div className="settings-item" onClick={() => openSheet('profil')}>
            <div className="settings-left">
              <div className="settings-icon">👤</div>
              <span className="settings-label">Modifier le profil</span>
            </div>
            <span className="settings-chevron">›</span>
          </div>
          <div className="settings-item" onClick={() => openSheet('notifications')}>
            <div className="settings-left">
              <div className="settings-icon">🔔</div>
              <span className="settings-label">Notifications</span>
            </div>
            <span className="settings-chevron">›</span>
          </div>
          <div className="settings-item" onClick={() => openSheet('confidentialite')}>
            <div className="settings-left">
              <div className="settings-icon">🔒</div>
              <span className="settings-label">Confidentialité</span>
            </div>
            <span className="settings-chevron">›</span>
          </div>
          <div className="settings-item danger" onClick={handleLogout}>
            <div className="settings-left">
              <div className="settings-icon">🚪</div>
              <span className="settings-label">Se déconnecter</span>
            </div>
            <span className="settings-chevron">›</span>
          </div>
        </div>

      </div>

      {/* ── Bottom Sheets ── */}
      {activeSheet && (
        <div className="sheet-overlay" onClick={closeSheet}>
          <div className="sheet" onClick={e => e.stopPropagation()}>

            {/* Sheet : Modifier le profil */}
            {activeSheet === 'profil' && (
              <>
                <div className="sheet-header">
                  <button className="sheet-close" onClick={closeSheet}>←</button>
                  <span className="sheet-title">Modifier le profil</span>
                </div>
                <div className="sheet-body">
                  <label className="sheet-label">Prénom</label>
                  <input
                    className="sheet-input"
                    value={editPrenom}
                    onChange={e => setEditPrenom(e.target.value)}
                    placeholder="Ton prénom"
                    maxLength={30}
                  />
                  <label className="sheet-label" style={{ marginTop: 18 }}>Classe</label>
                  <div className="classe-grid">
                    {CLASSES.map(c => (
                      <button
                        key={c}
                        className={`classe-btn${editClasse === c ? ' active' : ''}`}
                        onClick={() => setEditClasse(c)}
                      >{c}</button>
                    ))}
                  </div>
                  {saveError && <p className="sheet-error">{saveError}</p>}
                  <button
                    className="sheet-save-btn"
                    onClick={handleSaveProfil}
                    disabled={saving || !editPrenom.trim()}
                  >
                    {saving ? 'Sauvegarde…' : 'Sauvegarder'}
                  </button>
                </div>
              </>
            )}

            {/* Sheet : Notifications */}
            {activeSheet === 'notifications' && (
              <>
                <div className="sheet-header">
                  <button className="sheet-close" onClick={closeSheet}>←</button>
                  <span className="sheet-title">Notifications</span>
                </div>
                <div className="sheet-body">
                  <div className="notif-row">
                    <div className="notif-info">
                      <span className="notif-name">Rappel quotidien</span>
                      <span className="notif-desc">Révise 10 min par jour</span>
                    </div>
                    <button
                      className={`toggle-btn${notifsEnabled ? ' on' : ''}`}
                      onClick={handleToggleNotifs}
                    >
                      <div className="toggle-knob" />
                    </button>
                  </div>
                  <p className="sheet-hint">
                    Les notifications push seront disponibles dans la version mobile.
                  </p>
                </div>
              </>
            )}

            {/* Sheet : Confidentialité */}
            {activeSheet === 'confidentialite' && (
              <>
                <div className="sheet-header">
                  <button className="sheet-close" onClick={closeSheet}>←</button>
                  <span className="sheet-title">Confidentialité</span>
                </div>
                <div className="sheet-body">
                  <div className="confid-email-row">
                    <span className="confid-email-label">Email</span>
                    <span className="confid-email-value">{currentUser?.email}</span>
                  </div>
                  <label className="sheet-label" style={{ marginTop: 20 }}>Changer le mot de passe</label>
                  <input
                    className="sheet-input"
                    type="password"
                    value={currentPwd}
                    onChange={e => setCurrentPwd(e.target.value)}
                    placeholder="Mot de passe actuel"
                  />
                  <input
                    className="sheet-input"
                    type="password"
                    value={newPwd}
                    onChange={e => setNewPwd(e.target.value)}
                    placeholder="Nouveau mot de passe"
                    style={{ marginTop: 10 }}
                  />
                  {pwdError   && <p className="sheet-error">{pwdError}</p>}
                  {pwdSuccess && <p className="sheet-success">Mot de passe mis à jour ✓</p>}
                  <button
                    className="sheet-save-btn"
                    onClick={handleChangePwd}
                    disabled={pwdSaving || !currentPwd || !newPwd}
                  >
                    {pwdSaving ? 'Mise à jour…' : 'Mettre à jour'}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <BottomNav active="profile" />

      {/* Drawer */}
      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
