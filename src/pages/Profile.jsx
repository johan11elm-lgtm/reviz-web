import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loadLessons, syncFromFirestore } from '../services/historyService';
import { loadRevisions, syncRevisionsFromFirestore } from '../services/revisionService';
import { Drawer } from '../components/Drawer';
import { BottomNav } from '../components/BottomNav';
import { computeStreak, computeLevel, computeBadges, XP_PAR_LECON, XP_PAR_NIVEAU } from '../utils/gamification';
import './Profile.css';

const CLASSES = ['6ème', '5ème', '4ème', '3ème'];

export default function Profile() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showAllBadges, setShowAllBadges] = useState(false);
  const navigate = useNavigate();

  const { currentUser, getUserClasse, logout, updateDisplayName, updateUserPassword, deleteAccount } = useAuth();
  const prenom   = currentUser?.displayName ?? '';
  const initiale = prenom[0]?.toUpperCase() ?? '?';
  const classe   = getUserClasse();

  const [allLessons, setAllLessons]     = useState(() => loadLessons());
  const [allRevisions, setAllRevisions] = useState(() => loadRevisions());

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

  const [activeSheet, setActiveSheet] = useState(null);
  const [editPrenom, setEditPrenom]   = useState('');
  const [editClasse, setEditClasse]   = useState('');
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
    if (name === 'profil') { setEditPrenom(prenom); setEditClasse(classe); setSaveError(''); }
    if (name === 'confidentialite') { setCurrentPwd(''); setNewPwd(''); setPwdError(''); setPwdSuccess(false); setDeleteStep(0); setDeletePwd(''); setDeleteError(''); }
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

  return (
    <div className="app">

      {/* Header */}
      <div className="pf-header">
        <span className="pf-header-title">Profil</span>
        <div className="pf-header-avatar" onClick={() => setDrawerOpen(true)} role="button" tabIndex={0} aria-label="Ouvrir le menu">{initiale}</div>
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

        {/* Compte */}
        <div className="section-title">Compte</div>
        <div className="acct-list">
          <button className="acct-btn" onClick={() => openSheet('profil')}>
            <span className="acct-icon">👤</span>
            <span className="acct-label">Modifier le profil</span>
            <span className="acct-arrow">›</span>
          </button>
          <button className="acct-btn" onClick={() => openSheet('notifications')}>
            <span className="acct-icon">🔔</span>
            <span className="acct-label">Notifications</span>
            <span className="acct-arrow">›</span>
          </button>
          <button className="acct-btn" onClick={() => openSheet('objectif')}>
            <span className="acct-icon">🎯</span>
            <span className="acct-label">Objectif quotidien</span>
            <span className="acct-arrow">›</span>
          </button>
          <button className="acct-btn" onClick={() => openSheet('confidentialite')}>
            <span className="acct-icon">🔒</span>
            <span className="acct-label">Confidentialité</span>
            <span className="acct-arrow">›</span>
          </button>
          <button className="acct-btn acct-btn--danger" onClick={handleLogout}>
            <span className="acct-icon">🚪</span>
            <span className="acct-label">Se déconnecter</span>
            <span className="acct-arrow">›</span>
          </button>
        </div>

      </div>

      {/* Bottom Sheets */}
      {activeSheet && (
        <div className="sheet-overlay" onClick={closeSheet}>
          <div className="sheet" onClick={e => e.stopPropagation()}>

            {activeSheet === 'profil' && (
              <>
                <div className="sheet-header">
                  <button className="sheet-close" onClick={closeSheet}>←</button>
                  <span className="sheet-title">Modifier le profil</span>
                </div>
                <div className="sheet-body">
                  <label className="sheet-label">Prénom</label>
                  <input className="sheet-input" value={editPrenom} onChange={e => setEditPrenom(e.target.value)} placeholder="Ton prénom" maxLength={30} />
                  <label className="sheet-label" style={{ marginTop: 18 }}>Classe</label>
                  <div className="classe-grid">
                    {CLASSES.map(c => (
                      <button key={c} className={`classe-btn${editClasse === c ? ' active' : ''}`} onClick={() => setEditClasse(c)}>{c}</button>
                    ))}
                  </div>
                  {saveError && <p className="sheet-error">{saveError}</p>}
                  <button className="sheet-save-btn" onClick={handleSaveProfil} disabled={saving || !editPrenom.trim()}>
                    {saving ? 'Sauvegarde…' : 'Sauvegarder'}
                  </button>
                </div>
              </>
            )}

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
                    <button className={`toggle-btn${notifsEnabled ? ' on' : ''}`} onClick={handleToggleNotifs}>
                      <div className="toggle-knob" />
                    </button>
                  </div>
                  <p className="sheet-hint">Les notifications push seront disponibles dans la version mobile.</p>
                </div>
              </>
            )}

            {activeSheet === 'objectif' && (
              <>
                <div className="sheet-header">
                  <button className="sheet-close" onClick={closeSheet}>←</button>
                  <span className="sheet-title">Objectif quotidien</span>
                </div>
                <div className="sheet-body">
                  <p className="sheet-hint" style={{ marginBottom: 16 }}>Combien de révisions par jour souhaites-tu faire ?</p>
                  <div className="classe-grid">
                    {[1, 3, 5, 10].map(n => (
                      <button
                        key={n}
                        className={`classe-btn${dailyGoal === n ? ' active' : ''}`}
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
                </div>
              </>
            )}

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
                  <input className="sheet-input" type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} placeholder="Mot de passe actuel" />
                  <input className="sheet-input" type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Nouveau mot de passe" style={{ marginTop: 10 }} />
                  {pwdError   && <p className="sheet-error">{pwdError}</p>}
                  {pwdSuccess && <p className="sheet-success">Mot de passe mis à jour ✓</p>}
                  <button className="sheet-save-btn" onClick={handleChangePwd} disabled={pwdSaving || !currentPwd || !newPwd}>
                    {pwdSaving ? 'Mise à jour…' : 'Mettre à jour'}
                  </button>

                  <div className="delete-account-section">
                    <label className="sheet-label" style={{ marginTop: 24 }}>Zone de danger</label>
                    {deleteStep === 0 && (
                      <button className="delete-account-btn" onClick={handleDeleteAccount}>
                        Supprimer mon compte
                      </button>
                    )}
                    {deleteStep === 1 && (
                      <div className="delete-confirm-box">
                        <p className="delete-warning">Cette action est irréversible. Toutes tes leçons, révisions et données seront supprimées définitivement.</p>
                        <button className="delete-account-btn delete-account-btn--confirm" onClick={handleDeleteAccount} disabled={deleting}>
                          {deleting ? 'Suppression…' : 'Confirmer la suppression'}
                        </button>
                        <button className="delete-cancel-btn" onClick={() => setDeleteStep(0)}>Annuler</button>
                      </div>
                    )}
                    {deleteStep === 2 && (
                      <div className="delete-confirm-box">
                        <p className="delete-warning">Entre ton mot de passe pour confirmer la suppression définitive de ton compte.</p>
                        <input className="sheet-input" type="password" value={deletePwd} onChange={e => setDeletePwd(e.target.value)} placeholder="Mot de passe actuel" />
                        {deleteError && <p className="sheet-error">{deleteError}</p>}
                        <button className="delete-account-btn delete-account-btn--confirm" onClick={handleDeleteAccount} disabled={deleting || !deletePwd}>
                          {deleting ? 'Suppression…' : 'Supprimer définitivement'}
                        </button>
                        <button className="delete-cancel-btn" onClick={() => setDeleteStep(0)}>Annuler</button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      <BottomNav active="profile" />
      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
