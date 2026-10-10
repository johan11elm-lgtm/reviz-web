import { PageIntro } from '../components/PageIntro';
import { FlashcardsIcon, QuizIcon, ResumeIcon, MindmapIcon, BookIcon, BoltIcon, CalendarIcon, TrophyIcon, FlameIcon } from '../components/Icons';
import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loadLessons, restoreLesson, syncFromFirestore } from '../services/historyService';
import { loadRevisions, syncRevisionsFromFirestore } from '../services/revisionService';
import { loadCatalogue, chapterProgress } from '../services/programmeService';
import { summarizeCards } from '../services/srsService';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { hasProgramme, isProgrammeLessonId, PROGRAMME_FALLBACK } from '../utils/programme';
import { BottomNav } from '../components/BottomNav';
import { PageHeader } from '../components/PageHeader';
import { Mascot } from '../components/Mascot';
import { computeStreak, computeLevel, XP_PAR_NIVEAU } from '../utils/gamification';
import { subjectInfo, subjectMascot } from '../utils/subjects';
import './Progres.css';

// ─── Constantes ─────────────────────────────────────────────────────
const FORMAT_INFO = {
  flashcards: { label: 'Flashcards',    icon: <FlashcardsIcon />, color: 'var(--accent-violet)' },
  quiz:       { label: 'Quiz',           icon: <QuizIcon />,       color: 'var(--accent-orange)' },
  resume:     { label: 'Résumé',        icon: <ResumeIcon />,     color: 'var(--accent-green)' },
  mindmap:    { label: 'Carte mentale', icon: <MindmapIcon />,    color: 'var(--accent-pink)' },
};

// ─── Calculs ─────────────────────────────────────────────────────────
function computeBestStreak(items, dateKey = 'revisedAt') {
  if (!items.length) return 0;
  const dayKeys = [...new Set(items.map(r => {
    const d = new Date(r[dateKey]);
    return `${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }))].sort();
  let best = 1, current = 1;
  for (let i = 1; i < dayKeys.length; i++) {
    const prev = new Date(dayKeys[i - 1]);
    const curr = new Date(dayKeys[i]);
    if ((curr - prev) / 86400000 === 1) { current++; best = Math.max(best, current); }
    else current = 1;
  }
  return best;
}

function computeActiveDays(items, dateKey = 'revisedAt') {
  return new Set(items.map(r => new Date(r[dateKey]).toLocaleDateString('fr-FR'))).size;
}

function getMondayOf(date) {
  const d = new Date(date);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function computeWeekBars(revisions) {
  const today  = new Date();
  const monday = getMondayOf(today);
  const jours  = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const bars = Array.from({ length: 7 }, (_, i) => {
    const d       = new Date(monday);
    d.setDate(monday.getDate() + i);
    const isToday  = d.toDateString() === today.toDateString();
    const isFuture = d > today;
    const count    = isFuture ? 0 : revisions.filter(r =>
      new Date(r.revisedAt).toDateString() === d.toDateString()
    ).length;
    return { day: isToday ? 'Auj.' : jours[i], count, isToday, isFuture };
  });
  const maxCount = Math.max(1, ...bars.map(b => b.count));
  return bars.map(b => ({
    ...b,
    height: b.count === 0 ? 4 : Math.max(14, Math.round(b.count / maxCount * 80)),
    type:   b.isToday ? 'today' : (b.count > 0 ? 'active' : ''),
  }));
}

function computeBestWeek(revisions) {
  const weekCounts = {};
  revisions.forEach(r => {
    const monday = getMondayOf(new Date(r.revisedAt));
    const key = monday.toISOString().split('T')[0];
    weekCounts[key] = (weekCounts[key] || 0) + 1;
  });
  return Object.values(weekCounts).length ? Math.max(...Object.values(weekCounts)) : 0;
}

// Vue "5 semaines" — chaque semaine en row, narrative pour les jeunes
function computeWeekRows(revisions) {
  const countByDay = {};
  revisions.forEach(r => {
    const key = new Date(r.revisedAt).toDateString();
    countByDay[key] = (countByDay[key] || 0) + 1;
  });
  const today = new Date();
  const startMonday = getMondayOf(today);
  startMonday.setDate(startMonday.getDate() - 28);
  const weeks = [];
  for (let w = 0; w < 5; w++) {
    const cells = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startMonday);
      date.setDate(startMonday.getDate() + w * 7 + d);
      const isFuture = date > today;
      const count = isFuture ? -1 : (countByDay[date.toDateString()] || 0);
      cells.push({ count, isToday: date.toDateString() === today.toDateString(), isFuture });
    }
    const activeDays = cells.filter(c => c.count > 0).length;
    const totalRevs = cells.reduce((sum, c) => sum + (c.count > 0 ? c.count : 0), 0);
    const label = w === 4 ? 'Cette semaine'
                : w === 3 ? 'Sem. dernière'
                : `Il y a ${4 - w} sem.`;
    weeks.push({ label, cells, activeDays, totalRevs });
  }
  return weeks;
}

function getActivityIntensity(count) {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  return 3;
}

function computeSubjectBreakdown(lessons) {
  if (!lessons.length) return [];
  const map = {};
  lessons.forEach(l => {
    const name = l.metadata?.subject || 'Autre';
    map[name] = (map[name] || 0) + 1;
  });
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const max = entries[0]?.[1] ?? 1;
  return entries.map(([name, count]) => ({
    name, count,
    pct:  Math.round(count / max * 100),
    info: subjectInfo(name),
  }));
}

function computeFormatBreakdown(revisions) {
  const counts = { flashcards: 0, quiz: 0, resume: 0, mindmap: 0 };
  revisions.forEach(r => { if (r.type in counts) counts[r.type]++; });
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  return Object.entries(FORMAT_INFO).map(([key, info]) => ({
    ...info,
    count: counts[key],
    pct:   Math.round(counts[key] / total * 100),
  })).sort((a, b) => b.count - a.count);
}

// Hero narratif : choisit pose + phrase selon l'état de progression
function getHeroNarrative({ streak, activeDays, isNewRecord, prenom }) {
  if (isNewRecord) {
    return { mascot: 'trophy', phrase: `Nouveau record cette semaine, ${prenom} !` };
  }
  if (streak >= 7) {
    return { mascot: 'fire', phrase: `${streak} jours d'affilée. T'es chaud.` };
  }
  if (streak >= 3) {
    return { mascot: 'celebration', phrase: `Belle série de ${streak} jours. Continue !` };
  }
  if (streak >= 1) {
    return { mascot: 'muscu', phrase: 'Régularité installée. On continue ?' };
  }
  if (activeDays >= 1) {
    return { mascot: 'retour', phrase: 'Tu as déjà commencé. Reprends ta série !' };
  }
  return { mascot: 'sleeping', phrase: 'Allez, on lance ta première séance.' };
}

// ─── Ordinateur ──────────────────────────────────────────────────────
// Calendrier d'activité sur un semestre : une colonne par semaine, une
// ligne par jour, mêmes intensités que la vue « 5 semaines » du téléphone.
const HEATMAP_SEMAINES = 26;
const JOURS_COURTS = ['Lun', '', 'Mer', '', 'Ven', '', ''];

function computeHeatmap(revisions, semaines = HEATMAP_SEMAINES) {
  const countByDay = {};
  revisions.forEach(r => {
    const key = new Date(r.revisedAt).toDateString();
    countByDay[key] = (countByDay[key] || 0) + 1;
  });
  const today = new Date();
  const start = getMondayOf(today);
  start.setDate(start.getDate() - (semaines - 1) * 7);
  const weeks = [];
  let prevMonth = null;
  for (let w = 0; w < semaines; w++) {
    const monday = new Date(start);
    monday.setDate(start.getDate() + w * 7);
    const days = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + d);
      const isFuture = date > today;
      days.push({
        date,
        count: isFuture ? -1 : (countByDay[date.toDateString()] || 0),
        isToday: date.toDateString() === today.toDateString(),
        isFuture,
      });
    }
    const month = monday.getMonth();
    weeks.push({ days, month: month !== prevMonth ? monday.toLocaleDateString('fr-FR', { month: 'short' }) : null });
    prevMonth = month;
  }
  // Le mois de la première colonne s'efface s'il touche le suivant.
  if (weeks[1]?.month || weeks[2]?.month) weeks[0].month = null;
  return weeks;
}

// Révisions par matière : la matière de la leçon révisée (scan ou chapitre).
function computeRevisionsBySubject(revisions, lessons) {
  const subjectOf = new Map(lessons.map(l => [l.id, l.metadata?.subject]));
  const map = {};
  revisions.forEach(r => {
    const name = subjectOf.get(r.lessonId);
    if (name) map[name] = (map[name] || 0) + 1;
  });
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const max = entries[0]?.[1] ?? 1;
  return entries.map(([name, count]) => ({ name, count, pct: Math.round(count / max * 100), info: subjectInfo(name) }));
}

function plural(n, one, many = one + 's') {
  return `${n} ${n > 1 ? many : one}`;
}

// ─── Composant ───────────────────────────────────────────────────────
export default function Progres() {
  const navigate = useNavigate();
  const [allLessons,   setAllLessons]   = useState(() => loadLessons());
  const [allRevisions, setAllRevisions] = useState(() => loadRevisions());
  const [isSyncing,    setIsSyncing]    = useState(true);

  const { currentUser, getUserLevel } = useAuth();
  const prenom = currentUser?.displayName?.split(' ')[0] ?? 'toi';
  const isDesktop = useIsDesktop();

  useEffect(() => {
    Promise.all([
      syncFromFirestore().then(setAllLessons),
      syncRevisionsFromFirestore().then(setAllRevisions),
    ]).finally(() => setIsSyncing(false));
  }, []);

  const streak           = computeStreak(allRevisions, 'revisedAt');
  const bestStreak       = computeBestStreak(allRevisions, 'revisedAt');
  const { level, xpInLvl, xpTotal, fillPct } = computeLevel(allLessons);
  const activeDays       = computeActiveDays(allRevisions, 'revisedAt');
  const weekBars         = computeWeekBars(allRevisions);
  const bestWeek         = computeBestWeek(allRevisions);
  const weekRows         = computeWeekRows(allRevisions);
  const subjectBreakdown = computeSubjectBreakdown(allLessons);
  const formatBreakdown  = computeFormatBreakdown(allRevisions);

  const monday            = getMondayOf(new Date());
  const revisionsThisWeek = allRevisions.filter(r => new Date(r.revisedAt) >= monday).length;
  const isNewRecord       = bestWeek > 0 && revisionsThisWeek >= bestWeek;

  const hero = getHeroNarrative({ streak, activeDays, isNewRecord, prenom });

  // « Pas encore synchronisé » ≠ « vraiment vide » : sur un nouvel appareil le
  // cache local est vide → skeleton plutôt que streak/XP à 0 qui sautent après.
  if (isSyncing && allLessons.length === 0 && allRevisions.length === 0) {
    return (
      <div className="app progres-page">
        <PageHeader variant="title-only" />
        <div className="pg-content">
          <div className="pg-skeleton" role="status" aria-label="Synchronisation de tes progrès…">
            <div className="rv-skeleton pg-skeleton-hero" aria-hidden="true" />
            <div className="rv-card rv-card--padded pg-skeleton-card" aria-hidden="true">
              <div className="rv-skeleton rv-skeleton--icon" />
              <div className="pg-skeleton-lines">
                <div className="rv-skeleton rv-skeleton--title" />
                <div className="rv-skeleton rv-skeleton--text" />
              </div>
            </div>
            <div className="pg-skeleton-grid" aria-hidden="true">
              {[0, 1, 2].map(i => (
                <div key={i} className="rv-card pg-skeleton-stat">
                  <div className="rv-skeleton rv-skeleton--icon" />
                  <div className="rv-skeleton rv-skeleton--title pg-skeleton-stat-line" />
                  <div className="rv-skeleton rv-skeleton--text pg-skeleton-stat-line" />
                </div>
              ))}
            </div>
            <div className="rv-skeleton pg-skeleton-block" aria-hidden="true" />
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  // Ordinateur : tableau de bord de progression (le téléphone garde son flux).
  if (isDesktop) {
    const userLevel = getUserLevel();
    const revisionsLastWeek = allRevisions.filter(r => {
      const t = new Date(r.revisedAt);
      return t < monday && t >= new Date(monday.getTime() - 7 * 86400000);
    }).length;
    return (
      <div className="app progres-page">
        <div className="pg-content pg-desk">
          <PageIntro title="Mes progrès" sub={hero.phrase} mascot={hero.mascot} className="pg-intro" />
          <ProgresDesk
            lessons={allLessons}
            revisions={allRevisions}
            classe={hasProgramme(userLevel) ? userLevel.classe : PROGRAMME_FALLBACK}
            streak={streak}
            bestStreak={bestStreak}
            level={level}
            xpInLvl={xpInLvl}
            xpTotal={xpTotal}
            fillPct={fillPct}
            weekBars={weekBars}
            bestWeek={bestWeek}
            revisionsThisWeek={revisionsThisWeek}
            revisionsLastWeek={revisionsLastWeek}
            isNewRecord={isNewRecord}
            formatBreakdown={formatBreakdown}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="app progres-page">

      <div className="pg-content">

        {/* Intro façon Home — Réviz commente la progression */}
        <PageIntro title="Mes progrès" sub={hero.phrase} mascot={hero.mascot} className="pg-intro" />

        {/* 1. Level / XP — mascotte graduation à gauche */}
        <div className="rv-card rv-card--padded pg-level-card">
          <Mascot
            pose="graduation"
            size={72}
            glow
            priority
            className="pg-level-mascot"
            alt=""
            aria-hidden="true"
          />
          <div className="pg-level-info">
            <div className="pg-level-top">
              <span className="pg-level-title">Niveau {level}</span>
              <span className="pg-level-total">{xpTotal} XP</span>
            </div>
            <div className="rv-bar pg-level-bar">
              <div className="rv-bar-fill rv-bar-fill--violet" style={{ width: fillPct + '%' }} />
            </div>
            <div className="pg-level-next">
              Encore <strong>{XP_PAR_NIVEAU - xpInLvl} XP</strong> pour le niveau {level + 1}
            </div>
          </div>
        </div>

        {/* 2. Streak hero — mascotte fire à droite */}
        <div className="rv-card pg-streak-card">
          <span className="pg-streak-flame" aria-hidden="true"><FlameIcon /></span>
          <div className="pg-streak-body">
            <div className="pg-streak-block">
              <div className="pg-streak-label">Série</div>
              <div className="pg-streak-value">{streak}</div>
              <div className="pg-streak-unit">{streak === 1 ? 'jour de suite' : 'jours de suite'}</div>
            </div>
            <div className="pg-streak-divider" />
            <div className="pg-streak-block pg-streak-block--right">
              <div className="pg-streak-label">Record</div>
              <div className="pg-streak-value pg-streak-value--sm">{bestStreak}</div>
              <div className="pg-streak-unit">{bestStreak === 1 ? 'jour' : 'jours'}</div>
            </div>
          </div>
          <Mascot
            pose="fire"
            size={110}
            priority
            className="pg-streak-mascot"
            alt=""
            aria-hidden="true"
          />
        </div>

        {/* 3. Activité — vue par semaine, claire pour les jeunes */}
        <h2 className="pg-section-title">Ton activité</h2>
        <div className="rv-card rv-card--padded pg-weeks-card">
          {allRevisions.length === 0 ? (
            <div className="pg-weeks-empty">
              <p className="pg-weeks-empty-title">Pas encore de révisions</p>
            </div>
          ) : (
            <>
              <div className="pg-weeks-summary">
                <span className="pg-weeks-summary-value">{activeDays}</span>
                <span className="pg-weeks-summary-text">
                  jour{activeDays > 1 ? 's' : ''} actif{activeDays > 1 ? 's' : ''} sur les 5 dernières semaines
                </span>
              </div>
              <div className="pg-weeks-list">
                {weekRows.map((week, i) => (
                  <div key={i} className="pg-week-row">
                    <span className="pg-week-label">{week.label}</span>
                    <div className="pg-week-dots" aria-label={`${week.activeDays} jours actifs`}>
                      {week.cells.map((cell, j) => (
                        <span
                          key={j}
                          className={[
                            'pg-week-dot',
                            `pg-week-dot--${cell.isFuture ? 'future' : getActivityIntensity(cell.count)}`,
                            cell.isToday ? 'pg-week-dot--today' : '',
                          ].filter(Boolean).join(' ')}
                        />
                      ))}
                    </div>
                    <span className="pg-week-count">{week.activeDays}/7</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 4. Stats synthétiques (3 cards avec icon-square) */}
        <h2 className="pg-section-title">Tes chiffres</h2>
        <div className="pg-stats-grid">
          <div className="rv-card pg-stat-card">
            <div className="rv-icon-square rv-icon-square--xl rv-icon-square--violet"><BookIcon /></div>
            <span className="pg-stat-value">{allLessons.length}</span>
            <span className="pg-stat-label">Leçons scannées</span>
          </div>
          <div className="rv-card pg-stat-card">
            <div className="rv-icon-square rv-icon-square--xl rv-icon-square--green"><BoltIcon /></div>
            <span className="pg-stat-value">{allRevisions.length}</span>
            <span className="pg-stat-label">Révisions totales</span>
          </div>
          <div className="rv-card pg-stat-card">
            <div className="rv-icon-square rv-icon-square--xl rv-icon-square--orange"><CalendarIcon /></div>
            <span className="pg-stat-value">{activeDays}</span>
            <span className="pg-stat-label">Jours actifs</span>
          </div>
        </div>

        {/* 5. Graphe semaine avec mascotte signature */}
        <h2 className="pg-section-title">Cette semaine</h2>
        <div className="rv-card rv-card--padded pg-chart-card">
          <div className="pg-chart-header">
            <div className="pg-chart-title-row">
              <Mascot
                pose="pointing"
                size={56}
                priority
                className="pg-chart-mascot"
                alt=""
                aria-hidden="true"
              />
              <div className="pg-chart-title-block">
                <span className="pg-chart-title">Révisions par jour</span>
                <span className="pg-chart-sub">
                  <strong>{revisionsThisWeek}</strong> cette semaine
                  {isNewRecord && <span className="pg-chart-record"><TrophyIcon /> record</span>}
                </span>
              </div>
            </div>
          </div>
          <div className="pg-bars-wrap">
            {weekBars.map((bar, i) => (
              <div key={i} className="pg-bar-col">
                <div className={`pg-bar${bar.type ? ' ' + bar.type : ''}`} style={{ height: bar.height + 'px' }} />
                <span className={`pg-bar-day${bar.type === 'today' ? ' today' : ''}`}>{bar.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 6. Répartition par format */}
        {formatBreakdown.some(f => f.count > 0) && (
          <div className="pg-breakdown">
            <h2 className="pg-section-title">Par format</h2>
            <div className="rv-card pg-format-card">
              {formatBreakdown.map(f => (
                <div key={f.label} className="pg-format-row">
                  <div className="pg-format-left">
                    <span className="pg-format-emoji">{f.icon}</span>
                    <span className="pg-format-label">{f.label}</span>
                  </div>
                  <div className="pg-format-bar-wrap">
                    <div className="pg-format-bar" style={{ width: f.pct + '%', background: f.color }} />
                  </div>
                  <span className="pg-format-count">{f.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 8. Répartition par matière */}
        {subjectBreakdown.length > 0 && (
          <div className="pg-breakdown">
            <h2 className="pg-section-title">Par matière</h2>
            <div className="rv-card pg-subject-card">
              {subjectBreakdown.map(({ name, count, pct, info }) => (
                <div key={name} className="pg-subject-row">
                  <div className="pg-subject-left">
                    <span className="pg-subject-emoji"><Mascot pose={info.mascot ?? 'reading'} size={26} alt="" aria-hidden="true" /></span>
                    <span className="pg-subject-name">{name}</span>
                  </div>
                  <div className="pg-subject-bar-wrap">
                    <div className="pg-subject-bar" style={{ width: pct + '%', background: info.dot }} />
                  </div>
                  <span className="pg-subject-count">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      <BottomNav />
    </div>
  );
}

// ─── Ordinateur : tableau de bord ────────────────────────────────────
// Série · niveau · semaine en tête, puis le programme et la mémoire (ce
// qu'il reste à faire), le calendrier du semestre, et les répartitions.
function ProgresDesk({
  lessons, revisions, classe, streak, bestStreak, level, xpInLvl, xpTotal, fillPct,
  weekBars, bestWeek, revisionsThisWeek, revisionsLastWeek, isNewRecord, formatBreakdown,
}) {
  const bySubject = useMemo(() => computeRevisionsBySubject(revisions, lessons), [revisions, lessons]);

  return (
    <>
      <div className="pg-desk-top">
        <div className="rv-card pg-streak-card pg-desk-streak">
          <span className="pg-streak-flame" aria-hidden="true"><FlameIcon /></span>
          <div className="pg-desk-streak-text">
            <span className="pg-streak-label">Série en cours</span>
            <span className="pg-streak-value">{streak} <small>{streak === 1 ? 'jour' : 'jours'}</small></span>
            <span className="pg-desk-streak-record">Record : {plural(bestStreak, 'jour')}</span>
          </div>
          <Mascot pose="fire" size={96} priority className="pg-streak-mascot" alt="" aria-hidden="true" />
        </div>

        <div className="rv-card rv-card--padded pg-desk-kpi">
          <div className="pg-desk-kpi-head">
            <span className="pg-desk-kpi-label">Niveau</span>
            <span className="pg-level-badge">Niv. {level}</span>
          </div>
          <span className="pg-desk-kpi-value">{xpTotal} <small>XP</small></span>
          <div
            className="rv-bar pg-level-bar"
            role="progressbar"
            aria-label={`${xpInLvl} XP sur ${XP_PAR_NIVEAU} pour passer au niveau ${level + 1}`}
            aria-valuemin={0}
            aria-valuemax={XP_PAR_NIVEAU}
            aria-valuenow={xpInLvl}
          >
            <div className="rv-bar-fill rv-bar-fill--violet" style={{ width: fillPct + '%' }} />
          </div>
          <span className="pg-desk-kpi-note">
            Encore {XP_PAR_NIVEAU - xpInLvl} XP pour le niveau {level + 1}. Chaque nouvelle leçon rapporte 100 XP.
          </span>
        </div>

        <div className="rv-card rv-card--padded pg-desk-kpi">
          <div className="pg-desk-kpi-head">
            <span className="pg-desk-kpi-label">Cette semaine</span>
            {isNewRecord && <span className="pg-chart-record"><TrophyIcon /> record</span>}
          </div>
          <span className="pg-desk-kpi-value">{revisionsThisWeek} <small>{revisionsThisWeek > 1 ? 'révisions' : 'révision'}</small></span>
          <div className="pg-bars-wrap pg-desk-bars" aria-hidden="true">
            {weekBars.map((bar, i) => (
              <div key={i} className="pg-bar-col">
                <div className={`pg-bar${bar.type ? ' ' + bar.type : ''}`} style={{ height: Math.round(bar.height * 0.5) + 'px' }} />
                <span className={`pg-bar-day${bar.type === 'today' ? ' today' : ''}`}>{bar.day}</span>
              </div>
            ))}
          </div>
          <span className="pg-desk-kpi-note">
            {revisionsLastWeek ? `La semaine dernière : ${plural(revisionsLastWeek, 'révision')}.` : 'Aucune révision la semaine dernière.'}
          </span>
        </div>
      </div>

      <div className="pg-desk-duo pg-desk-duo--programme">
        <ProgresProgramme classe={classe} lessons={lessons} />
        <ProgresMemoire lessons={lessons} />
      </div>

      <ProgresActivite revisions={revisions} lessons={lessons} bestWeek={bestWeek} />

      {formatBreakdown.some(f => f.count > 0) && (
        <div className={`pg-desk-duo${bySubject.length ? '' : ' pg-desk-duo--seul'}`}>
          <section className="pg-desk-section" aria-labelledby="pg-desk-formats">
            <h2 id="pg-desk-formats" className="pg-desk-title">Par format</h2>
            <div className="rv-card pg-format-card">
              {formatBreakdown.map(f => (
                <div key={f.label} className="pg-format-row">
                  <div className="pg-format-left">
                    <span className="pg-format-emoji">{f.icon}</span>
                    <span className="pg-format-label">{f.label}</span>
                  </div>
                  <div className="pg-format-bar-wrap">
                    <div className="pg-format-bar" style={{ width: f.pct + '%', background: f.color }} />
                  </div>
                  <span className="pg-format-count">{f.count}</span>
                </div>
              ))}
            </div>
          </section>
          {bySubject.length > 0 && (
            <section className="pg-desk-section" aria-labelledby="pg-desk-matieres">
              <h2 id="pg-desk-matieres" className="pg-desk-title">Révisions par matière</h2>
              <div className="rv-card pg-subject-card">
                {bySubject.map(({ name, count, pct, info }) => (
                  <div key={name} className="pg-subject-row">
                    <div className="pg-subject-left">
                      <span className="pg-subject-emoji"><Mascot pose={info.mascot ?? 'reading'} size={26} alt="" aria-hidden="true" /></span>
                      <span className="pg-subject-name">{name}</span>
                    </div>
                    <div className="pg-subject-bar-wrap">
                      <div className="pg-subject-bar" style={{ width: pct + '%', background: info.dot }} />
                    </div>
                    <span className="pg-subject-count">{count}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}

/**
 * Avancement dans Mon programme, matière par matière : une encoche par
 * chapitre, même code couleur que les tuiles et le chemin.
 */
function ProgresProgramme({ classe, lessons }) {
  const navigate = useNavigate();
  const [catalogue, setCatalogue] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    setCatalogue(null);
    setError(false);
    loadCatalogue(classe)
      .then(c => { if (alive) setCatalogue(c); })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [classe]);

  const matieres = useMemo(() => (catalogue?.matieres ?? []).map(m => {
    const items = m.chapitres.map(ch => ({ chapter: ch, ...chapterProgress(ch, lessons) }));
    return {
      ...m,
      items,
      commences: items.filter(i => i.state !== 'nouveau').length,
      maitrises: items.filter(i => i.state === 'maitrise').length,
      aRevoir: items.reduce((n, i) => n + (i.state === 'a-revoir' ? i.dueCards : 0), 0),
    };
  }), [catalogue, lessons]);
  const total = matieres.reduce((n, m) => n + m.items.length, 0);
  const commences = matieres.reduce((n, m) => n + m.commences, 0);
  const maitrises = matieres.reduce((n, m) => n + m.maitrises, 0);

  return (
    <section className="pg-desk-section" aria-labelledby="pg-desk-programme">
      <div className="pg-desk-head">
        <h2 id="pg-desk-programme" className="pg-desk-title">Mon programme</h2>
        <Link to="/programme" className="pg-desk-more">{classe}{total ? ` · ${total} chapitres` : ''} ›</Link>
      </div>
      <div className="rv-card rv-card--padded pg-prog-card">
        {error ? (
          <p className="pg-desk-empty">Le programme ne se charge pas pour le moment. Vérifie ta connexion.</p>
        ) : !catalogue ? (
          <div className="pg-prog-list" role="status" aria-label="Chargement du programme…">
            {[0, 1, 2, 3].map(i => <div key={i} className="rv-skeleton pg-prog-skeleton" aria-hidden="true" />)}
          </div>
        ) : (
          <>
            <div className="pg-prog-summary">
              <span className="pg-desk-big">{commences}</span>
              <span className="pg-desk-big-text">
                {commences > 1 ? 'chapitres commencés' : 'chapitre commencé'} sur {total}
                {maitrises > 0 && `, dont ${plural(maitrises, 'maîtrisé')}`}
              </span>
              <ul className="pg-legend" aria-label="Légende">
                <li><i className="pg-seg pg-seg--commence" />Commencé</li>
                <li><i className="pg-seg pg-seg--a-revoir" />À revoir</li>
                <li><i className="pg-seg pg-seg--maitrise" />Maîtrisé</li>
              </ul>
            </div>
            <div className="pg-prog-list">
              {matieres.map(m => {
                const n = m.items.length;
                const detail = m.maitrises ? `${m.maitrises} / ${n} maîtrisé${m.maitrises > 1 ? 's' : ''}`
                  : m.commences ? `${m.commences} / ${n} commencé${m.commences > 1 ? 's' : ''}`
                  : `${n} chapitre${n > 1 ? 's' : ''}`;
                return (
                  <button
                    key={m.slug}
                    type="button"
                    className="pg-prog-row"
                    onClick={() => navigate(`/programme/${m.slug}`)}
                    aria-label={`${m.matiere} : ${detail}${m.aRevoir ? `, ${plural(m.aRevoir, 'carte')} à revoir` : ''}`}
                  >
                    {/* <picture> en display: contents : on l'enveloppe pour qu'il reste une seule case de grille */}
                    <span className="pg-prog-mascot"><Mascot pose={subjectMascot(m.matiere)} size={38} alt="" aria-hidden="true" /></span>
                    <span className="pg-prog-main">
                      <span className="pg-prog-line">
                        <span className="pg-prog-name">{m.matiere}</span>
                        <span className="pg-prog-detail">{detail}</span>
                      </span>
                      <span className="pg-prog-strip" aria-hidden="true">
                        {m.items.map(it => (
                          <span key={it.chapter.id} className={`pg-seg pg-seg--${it.chapter.pret ? it.state : 'bientot'}`} />
                        ))}
                      </span>
                    </span>
                    <span className="pg-prog-status">
                      {m.aRevoir > 0 && <span className="rv-pill rv-pill--orange">{plural(m.aRevoir, 'carte')} à revoir</span>}
                    </span>
                    <span className="pg-prog-arrow" aria-hidden="true">›</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

/**
 * Ta mémoire : où en sont les flashcards de toutes les leçons ouvertes
 * (répétition espacée), et par où reprendre.
 */
function ProgresMemoire({ lessons }) {
  const navigate = useNavigate();
  const s = useMemo(() => summarizeCards(lessons), [lessons]);
  const prio = s.lecons.slice(0, 4);
  const pct = n => (s.total ? (n / s.total) * 100 : 0);

  function reviser(lesson) {
    restoreLesson(lesson.id);
    navigate('/flashcards');
  }

  return (
    <section className="pg-desk-section" aria-labelledby="pg-desk-memoire">
      <div className="pg-desk-head">
        <h2 id="pg-desk-memoire" className="pg-desk-title">Ta mémoire</h2>
      </div>
      <div className="rv-card rv-card--padded pg-mem-card">
        {s.total === 0 ? (
          <div className="pg-mem-empty">
            <Mascot pose="flashcard" size={88} alt="" aria-hidden="true" />
            <p className="pg-mem-empty-title">Pas encore de flashcards</p>
            <p className="pg-desk-empty">Ouvre un chapitre de ton programme : ses cartes arrivent ici, avec le moment de les revoir.</p>
            <Link to="/programme" className="rv-btn-cta rv-btn-cta--ghost rv-btn-cta--center">Mon programme</Link>
          </div>
        ) : (
          <>
            <div className="pg-mem-top">
              <span className="pg-desk-big">{s.dues}</span>
              <span className="pg-desk-big-text">{s.dues > 1 ? 'cartes à revoir' : 'carte à revoir'} aujourd'hui, sur {s.total}</span>
            </div>
            <div className="pg-mem-bar" aria-hidden="true">
              <span className="pg-mem-bar-seg pg-mem-bar-seg--memoire" style={{ width: pct(s.enMemoire) + '%' }} />
              <span className="pg-mem-bar-seg pg-mem-bar-seg--revoir" style={{ width: pct(s.aRevoir) + '%' }} />
              <span className="pg-mem-bar-seg pg-mem-bar-seg--nouvelles" style={{ width: pct(s.nouvelles) + '%' }} />
            </div>
            <ul className="pg-mem-legend">
              <li><i className="pg-mem-dot pg-mem-dot--memoire" />En mémoire<b>{s.enMemoire}</b></li>
              <li><i className="pg-mem-dot pg-mem-dot--revoir" />À revoir<b>{s.aRevoir}</b></li>
              <li><i className="pg-mem-dot pg-mem-dot--nouvelles" />Pas encore vues<b>{s.nouvelles}</b></li>
            </ul>

            {prio.length === 0 ? (
              <div className="pg-mem-done">
                <Mascot pose="celebration" size={56} alt="" aria-hidden="true" />
                <span>Tout est à jour. Les prochaines cartes reviendront au bon moment.</span>
              </div>
            ) : (
              <>
                <span className="pg-mem-sub">À revoir en priorité</span>
                <ul className="pg-mem-list">
                  {prio.map(({ lesson, dues }) => (
                    <li key={lesson.id}>
                      <button
                        type="button"
                        className="pg-mem-lesson"
                        onClick={() => reviser(lesson)}
                        aria-label={`Revoir ${plural(dues, 'carte')} de ${lesson.metadata?.title}`}
                      >
                        <Mascot pose={subjectMascot(lesson.metadata?.subject)} size={32} alt="" aria-hidden="true" />
                        <span className="pg-mem-lesson-text">
                          <span className="pg-mem-lesson-title">{lesson.metadata?.title}</span>
                          <span className="pg-mem-lesson-meta">{lesson.metadata?.subject}</span>
                        </span>
                        <span className="rv-pill rv-pill--orange">{dues}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <button type="button" className="rv-btn-cta rv-btn-cta--full pg-mem-cta" onClick={() => reviser(prio[0].lesson)}>
                  <span>Réviser maintenant</span>
                  <span className="rv-btn-cta-arrow" aria-hidden="true">→</span>
                </button>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}

/** Le semestre en un coup d'œil, et les chiffres qui vont avec. */
function ProgresActivite({ revisions, lessons, bestWeek }) {
  const weeks = useMemo(() => computeHeatmap(revisions), [revisions]);
  const joursActifs = weeks.reduce((n, w) => n + w.days.filter(d => d.count > 0).length, 0);
  const chapitres = lessons.filter(l => isProgrammeLessonId(l.id)).length;
  const scans = lessons.length - chapitres;
  const fmt = d => d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <section className="pg-desk-section" aria-labelledby="pg-desk-activite">
      <div className="pg-desk-head">
        <h2 id="pg-desk-activite" className="pg-desk-title">Ton activité</h2>
        <span className="pg-desk-head-note">Les 6 derniers mois</span>
      </div>
      <div className="rv-card rv-card--padded pg-act-card">
        <div className="pg-heat" role="img" aria-label={`${plural(joursActifs, 'jour actif', 'jours actifs')} sur les 6 derniers mois`}>
          <div className="pg-heat-days" aria-hidden="true">
            <span />
            {JOURS_COURTS.map((j, i) => <span key={i}>{j}</span>)}
          </div>
          {/* Sur un écran étroit, les semaines les plus anciennes sortent à gauche */}
          <div className="pg-heat-weeks">
            {weeks.map((w, i) => (
              <div key={i} className="pg-heat-week" aria-hidden="true">
                <span className="pg-heat-month">{w.month}</span>
                {w.days.map((d, j) => (
                  <span
                    key={j}
                    className={[
                      'pg-heat-cell',
                      `pg-week-dot--${d.isFuture ? 'future' : getActivityIntensity(d.count)}`,
                      d.isToday ? 'pg-heat-cell--today' : '',
                    ].filter(Boolean).join(' ')}
                    title={d.isFuture ? undefined : `${fmt(d.date)} : ${d.count ? plural(d.count, 'révision') : 'aucune révision'}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="pg-act-side">
          <div className="pg-act-stat"><span className="rv-icon-square rv-icon-square--orange" aria-hidden="true"><CalendarIcon /></span><b>{joursActifs}</b><span>{joursActifs > 1 ? 'jours actifs' : 'jour actif'}</span></div>
          <div className="pg-act-stat"><span className="rv-icon-square rv-icon-square--green" aria-hidden="true"><BoltIcon /></span><b>{revisions.length}</b><span>{revisions.length > 1 ? 'révisions' : 'révision'} en tout</span></div>
          <div className="pg-act-stat"><span className="rv-icon-square rv-icon-square--violet" aria-hidden="true"><BookIcon /></span><b>{lessons.length}</b><span>{lessons.length > 1 ? 'leçons ouvertes' : 'leçon ouverte'}{scans > 0 ? `, dont ${scans} scannée${scans > 1 ? 's' : ''}` : ''}</span></div>
          <div className="pg-act-stat"><span className="rv-icon-square rv-icon-square--orange" aria-hidden="true"><TrophyIcon /></span><b>{bestWeek}</b><span>meilleure semaine</span></div>
          <div className="pg-legend pg-act-legend" aria-hidden="true">
            Moins
            <i className="pg-heat-cell pg-week-dot--0" />
            <i className="pg-heat-cell pg-week-dot--1" />
            <i className="pg-heat-cell pg-week-dot--2" />
            <i className="pg-heat-cell pg-week-dot--3" />
            Plus
          </div>
        </div>
      </div>
    </section>
  );
}
