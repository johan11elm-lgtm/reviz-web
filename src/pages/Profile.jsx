import { PageIntro } from '../components/PageIntro';
import { GuestBanner } from '../components/GuestBanner';
import { UserIcon, FlameIcon, BookIcon, BoltIcon, ChatIcon, CheckIcon } from '../components/Icons';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loadLessons, syncFromFirestore } from '../services/historyService';
import { loadRevisions, syncRevisionsFromFirestore } from '../services/revisionService';
import { BottomNav } from '../components/BottomNav';
import { LevelSelector } from '../components/LevelSelector';
import { PageHeader } from '../components/PageHeader';
import { Mascot } from '../components/Mascot';
import { BattleMascot } from '../components/BattleMascot';
import { getUserProfile } from '../services/userProfileService';
import { computeStreak, computeLevel, computeBadges, XP_PAR_NIVEAU } from '../utils/gamification';
import { formatLevelLabel } from '../utils/levels';
import { useIsDesktop } from '../hooks/useMediaQuery';
import './Profile.css';
import { RevizPlusCard } from '../components/RevizPlus';

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

// Icônes neutres : ce sont des liens, pas des états (docs/design-grammaire.md §5).
const ACCOUNT_ITEMS = [
  { id: 'profil',   icon: <UserIcon />, label: 'Modifier le profil' },
  { id: 'reglages', icon: <GearIcon />, label: 'Réglages' },
  { id: 'avis',     icon: <ChatIcon />, label: 'Donner mon avis' },
];

const SHEET_TITLES = {
  profil: 'Modifier le profil',
};

// Badge le plus proche d'être débloqué (part de l'objectif déjà faite,
// puis ce qu'il reste à faire) ; null quand tout est débloqué.
function nextBadge(badges) {
  return badges
    .filter(b => b.locked)
    .sort((a, b) => (b.current / b.target - a.current / a.target) || ((a.target - a.current) - (b.target - b.current)))[0] ?? null;
}

// Tuile de badge : mascotte sur un disque (chaud quand obtenu, neutre sinon),
// coche verte une fois obtenu, mini-barre de progression tant qu'il manque.
function BadgeTile({ badge: b, onOpen, desktop }) {
  const pct = Math.min(100, Math.round(b.current / b.target * 100));
  const title = b.locked ? `${b.label} : ${b.hint} (${b.current} / ${b.target})` : `${b.label} : obtenu`;
  const art = (
    <span className="pf-badge-art" aria-hidden="true">
      <Mascot pose={b.pose} size={desktop ? 48 : 40} alt="" aria-hidden="true" />
      {!b.locked && <span className="pf-badge-check"><CheckIcon /></span>}
    </span>
  );
  if (desktop) {
    return (
      <li className={`pf-badge pf-desk-badge${b.locked ? ' pf-badge--locked' : ''}`} title={title}>
        {art}
        <span className="pf-badge-label pf-desk-badge-label">{b.label}</span>
        <span className="pf-desk-badge-hint">{b.hint}</span>
        {b.locked
          ? <span className="pf-desk-badge-state">{b.current} / {b.target}</span>
          : <span className="pf-desk-badge-state pf-desk-badge-state--ok"><CheckIcon /> Obtenu</span>}
        {b.locked && (
          <span className="rv-bar rv-bar--thin rv-bar--neutral-bg pf-badge-bar" aria-hidden="true">
            <span className="rv-bar-fill rv-bar-fill--orange" style={{ width: `${pct}%` }} />
          </span>
        )}
      </li>
    );
  }
  return (
    <button
      type="button"
      className={`pf-badge${b.locked ? ' pf-badge--locked' : ''}`}
      onClick={() => onOpen(b)}
      aria-label={title}
    >
      {art}
      <span className="pf-badge-label">{b.label}</span>
      {b.locked && (
        <span className="rv-bar rv-bar--thin rv-bar--neutral-bg pf-badge-bar" aria-hidden="true">
          <span className="rv-bar-fill rv-bar-fill--orange" style={{ width: `${pct}%` }} />
        </span>
      )}
    </button>
  );
}

function NextBadgeCard({ next }) {
  const pct = Math.round(next.current / next.target * 100);
  return (
    <div className="rv-card rv-card--padded pf-next">
      <span className="pf-next-mascot"><Mascot pose={next.pose} size={56} glow glowIntensity={0.35} alt="" aria-hidden="true" /></span>
      <span className="pf-next-text">
        <span className="pf-desk-label pf-next-kicker">Prochain badge</span>
        <span className="pf-next-name">{next.label}</span>
        <span className="pf-next-hint">{next.hint}</span>
      </span>
      <div className="pf-next-progress">
        <div
          className="rv-bar rv-bar--tall"
          role="progressbar"
          aria-label={`${next.label} : ${next.current} sur ${next.target}`}
          aria-valuemin={0}
          aria-valuemax={next.target}
          aria-valuenow={next.current}
        >
          <div className="rv-bar-fill rv-bar-fill--orange" style={{ width: `${pct}%` }} />
        </div>
        <span className="pf-next-count">{next.current} / {next.target}</span>
      </div>
    </div>
  );
}

export default function Profile() {
  const [showAllBadges, setShowAllBadges] = useState(false);
  const [badgeDetail, setBadgeDetail] = useState(null);
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();

  const { currentUser, getUserLevel, setUserLevel, updateDisplayName, isGuest, hasRevizPlus } = useAuth();
  const prenom   = currentUser?.displayName ?? '';
  const userLevel  = getUserLevel();
  const levelLabel = formatLevelLabel(userLevel);

  const [allLessons, setAllLessons]     = useState(() => loadLessons());
  const [allRevisions, setAllRevisions] = useState(() => loadRevisions());

  useEffect(() => {
    syncFromFirestore().then(setAllLessons);
    syncRevisionsFromFirestore().then(setAllRevisions);
  }, []);

  // Aura de la Battle : écrite par le serveur sur le profil (api/battle-fin.js).
  const [battle, setBattle] = useState(null);
  useEffect(() => {
    if (isGuest || !currentUser?.uid) return;
    getUserProfile(currentUser.uid)
      .then(p => setBattle({ aura: p?.aura ?? 0, jouees: p?.battles?.jouees ?? 0, gagnees: p?.battles?.gagnees ?? 0 }))
      .catch(() => {});
  }, [isGuest, currentUser?.uid]);

  const streak = computeStreak(allRevisions, 'revisedAt');
  const { level, xpInLvl, fillPct } = computeLevel(allLessons);
  const badges = computeBadges(allLessons, allRevisions, streak, level);
  const unlocked = badges.filter(b => !b.locked).length;
  const next = nextBadge(badges);
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

  function openBadge(b) {
    setBadgeDetail(b);
    setActiveSheet('badge');
  }

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
    if (id === 'avis') return navigate('/avis?src=profil');
    openSheet(id);
  }

  const sheetTitle = activeSheet === 'badge' ? (badgeDetail?.label ?? '') : (SHEET_TITLES[activeSheet] || '');
  const sheet = (
    <>
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
        aria-label={activeSheet ? sheetTitle : undefined}
      >
        <div className="rv-sheet-handle" />
        <header className="pf-sheet-header">
          <h2 className="pf-sheet-title">{sheetTitle}</h2>
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

          {activeSheet === 'badge' && badgeDetail && (
            <div className="pf-badge-detail">
              <span className={`pf-badge-art pf-badge-art--lg${badgeDetail.locked ? ' pf-badge-art--locked' : ''}`} aria-hidden="true">
                <Mascot pose={badgeDetail.pose} size={88} glow={!badgeDetail.locked} glowIntensity={0.4} alt="" aria-hidden="true" />
              </span>
              <p className="pf-badge-detail-hint">{badgeDetail.hint}</p>
              {badgeDetail.locked ? (
                <div className="pf-badge-detail-progress">
                  <div
                    className="rv-bar rv-bar--tall rv-bar--neutral-bg"
                    role="progressbar"
                    aria-label={`${badgeDetail.label} : ${badgeDetail.current} sur ${badgeDetail.target}`}
                    aria-valuemin={0}
                    aria-valuemax={badgeDetail.target}
                    aria-valuenow={badgeDetail.current}
                  >
                    <div className="rv-bar-fill rv-bar-fill--orange" style={{ width: `${Math.min(100, Math.round(badgeDetail.current / badgeDetail.target * 100))}%` }} />
                  </div>
                  <span className="pf-badge-detail-count">{badgeDetail.current} / {badgeDetail.target}</span>
                </div>
              ) : (
                <span className="rv-pill rv-pill--green pf-badge-detail-ok"><CheckIcon /> Obtenu</span>
              )}
            </div>
          )}

        </div>
      </aside>
    </>
  );

  // Ordinateur : identité en tête, trois cartes (chiffres, Battle, compte),
  // puis tous les badges avec ce qu'il faut faire pour les obtenir.
  if (isDesktop) {
    return (
      <div className="app profile-page">
        <div className="pf-content pf-desk">
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

          <div className="pf-desk-row">
            <section className="rv-card rv-card--padded pf-desk-card" aria-labelledby="pf-desk-chiffres">
              <div className="pf-desk-card-head">
                <h2 id="pf-desk-chiffres" className="pf-desk-label">Tes chiffres</h2>
                <Link to="/progres" className="pf-desk-more">Mes progrès ›</Link>
              </div>
              <div className="pf-desk-stats">
                <div className="pf-stat">
                  <span className="pf-stat-icon pf-stat-icon--orange" aria-hidden="true"><FlameIcon /></span>
                  <span className="pf-stat-value">{streak}</span>
                  <span className="pf-stat-label">{streak > 1 ? 'jours de suite' : 'jour de suite'}</span>
                </div>
                <div className="pf-stat">
                  <span className="pf-stat-icon pf-stat-icon--violet" aria-hidden="true"><BookIcon /></span>
                  <span className="pf-stat-value">{allLessons.length}</span>
                  <span className="pf-stat-label">{allLessons.length > 1 ? 'leçons' : 'leçon'}</span>
                </div>
                <div className="pf-stat">
                  <span className="pf-stat-icon pf-stat-icon--green" aria-hidden="true"><BoltIcon /></span>
                  <span className="pf-stat-value">{allRevisions.length}</span>
                  <span className="pf-stat-label">{allRevisions.length > 1 ? 'révisions' : 'révision'}</span>
                </div>
              </div>
            </section>

            <Link
              to="/battle"
              className="rv-card rv-card--padded rv-card--link pf-desk-card pf-desk-battle"
              aria-label={battle ? `Battle : ${battle.aura} aura` : 'Battle : défier quelqu\'un en direct'}
            >
              <span className="pf-desk-card-head">
                <span className="pf-desk-label">Battle</span>
                <span className="pf-desk-more" aria-hidden="true">›</span>
              </span>
              <span className="pf-desk-battle-body">
                <span className="pf-desk-battle-mascot"><BattleMascot pose={battle ? 'aura' : 'garde'} size={68} glow={!!battle} glowIntensity={0.6} alt="" aria-hidden="true" /></span>
                <span className="pf-desk-battle-text">
                  {battle ? (
                    <>
                      <span className="pf-desk-battle-value">{battle.aura} <small>aura</small></span>
                      <span className="pf-desk-battle-sub">
                        {battle.jouees
                          ? `${battle.jouees} battle${battle.jouees > 1 ? 's' : ''} · ${battle.gagnees} gagnée${battle.gagnees > 1 ? 's' : ''}`
                          : 'Pas encore de battle'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="pf-desk-battle-title">Défie quelqu'un</span>
                      <span className="pf-desk-battle-sub">En direct, sur un chapitre de ton programme</span>
                    </>
                  )}
                </span>
              </span>
            </Link>

            <section className="rv-card rv-card--padded pf-desk-card" aria-labelledby="pf-desk-compte">
              <div className="pf-desk-card-head">
                <h2 id="pf-desk-compte" className="pf-desk-label">Compte</h2>
              </div>
              <div className="pf-desk-compte">
                {ACCOUNT_ITEMS.filter(it => !isGuest || it.id !== 'profil').map(it => (
                  <button key={it.id} type="button" className="pf-desk-compte-row" onClick={() => onAccountClick(it.id)}>
                    <span className="rv-icon-square pf-account-icon" aria-hidden="true">{it.icon}</span>
                    <span className="pf-account-label">{it.label}</span>
                    <span className="pf-account-arrow" aria-hidden="true">›</span>
                  </button>
                ))}
              </div>
            </section>
          </div>

          {hasRevizPlus && !isGuest && <RevizPlusCard className="rp-card--wide" />}

          <section className="pf-desk-section" aria-labelledby="pf-desk-badges">
            <div className="pf-desk-head">
              <h2 id="pf-desk-badges" className="pf-desk-title">Badges</h2>
              <span className="pf-desk-head-note">{unlocked} sur {badges.length} obtenus</span>
            </div>
            {next && <NextBadgeCard next={next} />}
            <ul className="pf-desk-badges">
              {badges.map(b => <BadgeTile key={b.id} badge={b} desktop />)}
            </ul>
          </section>
        </div>

        {sheet}
      </div>
    );
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
        <GuestBanner />
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

        {hasRevizPlus && !isGuest && <RevizPlusCard />}

        {/* Badges */}
        {battle && (
          <Link to="/battle" className="rv-card rv-card--link pf-battle-card" aria-label={`Battle : ${battle.aura} aura`}>
            <BattleMascot pose="aura" size={64} glow glowIntensity={0.6} alt="" aria-hidden="true" />
            <span className="pf-battle-texte">
              <span className="pf-battle-aura">{battle.aura} aura</span>
              <span className="pf-battle-sous">
                {battle.jouees
                  ? `${battle.jouees} battle${battle.jouees > 1 ? 's' : ''} · ${battle.gagnees} gagnée${battle.gagnees > 1 ? 's' : ''}`
                  : 'Pas encore de battle'}
              </span>
            </span>
            <span className="pf-battle-fleche" aria-hidden="true">›</span>
          </Link>
        )}

        <section className="pf-section">
          <header className="pf-section-header">
            <h2 className="pf-section-title">Badges</h2>
            <span className="pf-badges-count">{unlocked}/{badges.length}</span>
          </header>
          {next && <NextBadgeCard next={next} />}
          <div className="pf-badges-grid">
            {(showAllBadges ? badges : badges.slice(0, 8)).map(b => (
              <BadgeTile key={b.id} badge={b} onOpen={openBadge} />
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
          {/* Des rangées dans une carte blanche (grammaire §4) */}
          <div className="rv-card rv-rows">
            {ACCOUNT_ITEMS.filter(it => !isGuest || it.id !== 'profil').map(it => (
              <button
                key={it.id}
                type="button"
                className="rv-row"
                onClick={() => onAccountClick(it.id)}
              >
                <span className="rv-row-avatar" aria-hidden="true">{it.icon}</span>
                <span className="rv-row-text"><span className="rv-row-title">{it.label}</span></span>
                <span className="rv-row-arrow" aria-hidden="true">›</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {sheet}

      <BottomNav />
    </div>
  );
}
