import { PageIntro } from '../components/PageIntro';
import { UserIcon, FlameIcon, BookIcon, BoltIcon } from '../components/Icons';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loadLessons, syncFromFirestore } from '../services/historyService';
import { loadRevisions, syncRevisionsFromFirestore } from '../services/revisionService';
import { BottomNav } from '../components/BottomNav';
import { LevelSelector } from '../components/LevelSelector';
import { PageHeader } from '../components/PageHeader';
import { Mascot } from '../components/Mascot';
import { computeStreak, computeLevel, computeBadges, XP_PAR_NIVEAU } from '../utils/gamification';
import { formatLevelLabel } from '../utils/levels';
import './Profile.css';

// Mascotte adaptative au niveau / streak / activité — pattern Progres `getHeroNarrative`.
function getProfileHero(level, streak, lessonsCount) {
  if (level >= 10)        return 'trophy';
  if (streak >= 7)        return 'fire';
  if (level >= 3)         return 'celebration';
  if (lessonsCount >= 1)  return 'reading';
  return 'hello';
}

// Icône engrenage (réglages) — trait 1.8, cohérente avec PageHeader
const GearIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.12-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.12 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.08a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.08a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.03Z" />
  </svg>
);

const ACCOUNT_ITEMS = [
  { id: 'profil',   icon: <UserIcon />, label: 'Modifier le profil', tone: 'violet' },
  { id: 'reglages', icon: <GearIcon />, label: 'Réglages',           tone: 'orange' },
];

const SHEET_TITLES = {
  profil: 'Modifier le profil',
};

export default function Profile() {
  const [showAllBadges, setShowAllBadges] = useState(false);
  const navigate = useNavigate();

  const { currentUser, getUserLevel, setUserLevel, updateDisplayName } = useAuth();
  const prenom   = currentUser?.displayName ?? '';
  const userLevel  = getUserLevel();
  const levelLabel = formatLevelLabel(userLevel);

  const [allLessons, setAllLessons]     = useState(() => loadLessons());
  const [allRevisions, setAllRevisions] = useState(() => loadRevisions());

  useEffect(() => {
    syncFromFirestore().then(setAllLessons);
    syncRevisionsFromFirestore().then(setAllRevisions);
  }, []);

  const streak = computeStreak(allRevisions, 'revisedAt');
  const { level, xpInLvl, fillPct } = computeLevel(allLessons);
  const badges = computeBadges(allLessons, allRevisions, streak, level);
  const unlocked = badges.filter(b => !b.locked).length;
  const heroPose = getProfileHero(level, streak, allLessons.length);


  const [activeSheet, setActiveSheet] = useState(null);
  const [editPrenom, setEditPrenom]   = useState('');
  const [editLevel, setEditLevel]     = useState({ cycle: null, classe: null, specialites: [], filiere: null });
  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState('');

  function openSheet(name) {
    if (name === 'profil') {
      setEditPrenom(prenom);
      setEditLevel(userLevel ?? { cycle: null, classe: null, specialites: [], filiere: null });
      setSaveError('');
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

  function onAccountClick(id) {
    if (id === 'reglages') return navigate('/reglages');
    openSheet(id);
  }

  return (
    <div className="app profile-page">
      <PageHeader
        variant="title-only"
        right={
          <button
            type="button"
            className="rv-bell-btn"
            onClick={() => navigate('/reglages')}
            aria-label="Réglages"
          >
            <GearIcon />
          </button>
        }
      />

      <div className="pf-content">
        {/* Intro façon Home — prénom en titre, niveau · classe, XP, mascotte à droite */}
        <PageIntro
          title={prenom || 'Toi'}
          sub={`Niveau ${level}${levelLabel ? ` · ${levelLabel}` : ''}`}
          mascot={heroPose}
          className="pf-intro"
        >
          <div className="pf-intro-xp">
            <div
              className="rv-bar rv-bar--tall pf-intro-bar"
              role="progressbar"
              aria-label={`${xpInLvl} XP sur ${XP_PAR_NIVEAU} pour passer au niveau ${level + 1}`}
              aria-valuemin={0}
              aria-valuemax={XP_PAR_NIVEAU}
              aria-valuenow={xpInLvl}
            >
              <div className="rv-bar-fill rv-bar-fill--orange" style={{ width: `${fillPct}%` }} />
            </div>
            <p className="pf-xp-sub">{xpInLvl} / {XP_PAR_NIVEAU} XP</p>
          </div>
        </PageIntro>

        {/* Stats — une seule carte, trois colonnes */}
        <section className="rv-card rv-card--padded pf-stats-card">
          <div className="pf-stat">
            <span className="pf-stat-icon pf-stat-icon--orange" aria-hidden="true"><FlameIcon /></span>
            <span className="pf-stat-value">{streak}</span>
            <span className="pf-stat-label">{streak > 1 ? 'jours de suite' : 'jour de suite'}</span>
          </div>
          <div className="pf-stat-sep" aria-hidden="true" />
          <div className="pf-stat">
            <span className="pf-stat-icon pf-stat-icon--violet" aria-hidden="true"><BookIcon /></span>
            <span className="pf-stat-value">{allLessons.length}</span>
            <span className="pf-stat-label">{allLessons.length > 1 ? 'leçons' : 'leçon'}</span>
          </div>
          <div className="pf-stat-sep" aria-hidden="true" />
          <div className="pf-stat">
            <span className="pf-stat-icon pf-stat-icon--green" aria-hidden="true"><BoltIcon /></span>
            <span className="pf-stat-value">{allRevisions.length}</span>
            <span className="pf-stat-label">{allRevisions.length > 1 ? 'révisions' : 'révision'}</span>
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
                <span className="pf-badge-emoji" aria-hidden="true"><Mascot pose={b.pose} size={46} alt="" aria-hidden="true" /></span>
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

        </div>
      </aside>

      <BottomNav />
    </div>
  );
}
