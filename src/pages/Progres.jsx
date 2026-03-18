import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { loadLessons, syncFromFirestore } from '../services/historyService';
import { loadRevisions, syncRevisionsFromFirestore } from '../services/revisionService';
import { Drawer } from '../components/Drawer';
import { BottomNav } from '../components/BottomNav';
import './Progres.css';

// ─── Constantes ────────────────────────────────────────────────────
const XP_PAR_LECON  = 100;
const XP_PAR_NIVEAU = 500;

const SUBJECT_MAP = {
  'maths':    { color: 'orange', dot: '#FF6B00', emoji: '📐' },
  'français': { color: 'pink',   dot: '#EC4899', emoji: '📖' },
  'histoire': { color: 'indigo', dot: '#6366F1', emoji: '🌍' },
  'géo':      { color: 'indigo', dot: '#6366F1', emoji: '🌍' },
  'svt':      { color: 'green',  dot: '#22C55E', emoji: '🧬' },
  'physique': { color: 'blue',   dot: '#3B82F6', emoji: '⚛️' },
  'chimie':   { color: 'blue',   dot: '#3B82F6', emoji: '🧪' },
  'techno':   { color: 'cyan',   dot: '#06B6D4', emoji: '⚙️' },
  'anglais':  { color: 'yellow', dot: '#EAB308', emoji: '🗣️' },
  'espagnol': { color: 'yellow', dot: '#EAB308', emoji: '💬' },
  'langues':  { color: 'yellow', dot: '#EAB308', emoji: '🌐' },
  'latin':    { color: 'yellow', dot: '#EAB308', emoji: '🏛️' },
  'arts':     { color: 'purple', dot: '#A855F7', emoji: '🎨' },
};

function subjectInfo(s) {
  const key = Object.keys(SUBJECT_MAP).find(k => s?.toLowerCase().includes(k)) ?? null;
  return SUBJECT_MAP[key] ?? { color: 'indigo', dot: '#6366F1', emoji: '📚' };
}

// ─── Calculs ────────────────────────────────────────────────────────
function computeStreak(items, dateKey = 'revisedAt') {
  if (!items.length) return 0;
  const days = new Set(items.map(l => new Date(l[dateKey]).toLocaleDateString('fr-FR')));
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

function computeLevel(lessons) {
  const xp      = lessons.length * XP_PAR_LECON;
  const level   = Math.floor(xp / XP_PAR_NIVEAU) + 1;
  const xpInLvl = xp % XP_PAR_NIVEAU;
  const fillPct = Math.round(xpInLvl / XP_PAR_NIVEAU * 100);
  return { level, xpInLvl, xpTotal: xp, fillPct };
}

function computeActiveDays(items, dateKey = 'revisedAt') {
  return new Set(items.map(r => new Date(r[dateKey]).toLocaleDateString('fr-FR'))).size;
}

function getMondayOfCurrentWeek() {
  const today = new Date();
  const dow   = today.getDay();
  const d     = new Date(today);
  d.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function computeWeekBars(revisions) {
  const today  = new Date();
  const monday = getMondayOfCurrentWeek();
  const jours  = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  return Array.from({ length: 7 }, (_, i) => {
    const d       = new Date(monday);
    d.setDate(monday.getDate() + i);
    const isToday  = d.toDateString() === today.toDateString();
    const isFuture = d > today;
    const count    = isFuture ? 0 : revisions.filter(r =>
      new Date(r.revisedAt).toDateString() === d.toDateString()
    ).length;
    return {
      day:    isToday ? 'Auj.' : jours[i],
      height: count === 0 ? 4 : Math.min(80, count * 24),
      type:   isToday ? 'today' : (count > 0 ? 'has-activity' : ''),
      count,
    };
  });
}

function computeSubjectBreakdown(lessons) {
  if (!lessons.length) return [];
  const map = {};
  lessons.forEach(l => {
    const name = l.metadata?.subject || 'Autre';
    map[name]  = (map[name] || 0) + 1;
  });
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const max     = entries[0]?.[1] ?? 1;
  return entries.map(([name, count]) => ({
    name,
    count,
    pct:  Math.round(count / max * 100),
    info: subjectInfo(name),
  }));
}

// ─── Composant ──────────────────────────────────────────────────────
export default function Progres() {
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [allLessons,   setAllLessons]   = useState(() => loadLessons());
  const [allRevisions, setAllRevisions] = useState(() => loadRevisions());

  const { currentUser } = useAuth();
  const initiale = currentUser?.displayName?.[0]?.toUpperCase() ?? '?';

  useEffect(() => {
    syncFromFirestore().then(setAllLessons);
    syncRevisionsFromFirestore().then(setAllRevisions);
  }, []);

  // Stats
  const streak              = computeStreak(allRevisions, 'revisedAt');
  const bestStreak          = computeBestStreak(allRevisions, 'revisedAt');
  const { level, xpInLvl, xpTotal, fillPct } = computeLevel(allLessons);
  const activeDays          = computeActiveDays(allRevisions, 'revisedAt');
  const weekBars            = computeWeekBars(allRevisions);
  const subjectBreakdown    = computeSubjectBreakdown(allLessons);

  const monday              = getMondayOfCurrentWeek();
  const revisionsThisWeek   = allRevisions.filter(r => new Date(r.revisedAt) >= monday).length;
  const daysWithLesson      = new Set(
    allRevisions.filter(r => new Date(r.revisedAt) >= monday)
                .map(r => new Date(r.revisedAt).toDateString())
  ).size;
  const goalPct     = Math.round(daysWithLesson / 7 * 100);
  const daysLeft    = 7 - daysWithLesson;
  const goalBadge   = daysWithLesson >= 7 ? 'Objectif atteint 🎉' : daysWithLesson >= 4 ? 'En bonne voie ✓' : 'Continue !';
  const goalMessage = daysWithLesson >= 7
    ? 'Félicitations, tu as révisé tous les jours !'
    : daysLeft === 1
    ? "Plus qu'1 jour pour atteindre ton objectif !"
    : `Plus que ${daysLeft} jours pour atteindre l'objectif !`;

  return (
    <div className="app">

      {/* Header */}
      <div className="header">
        <div className="header-left">
          <span className="header-title">Mes progrès</span>
        </div>
        <div className="header-avatar" onClick={() => setDrawerOpen(true)}>{initiale}</div>
      </div>

      {/* Content */}
      <div className="content">

        {/* ── Streak hero ── */}
        <div className="streak-card">
          <div className="streak-block">
            <div className="streak-label">Série en cours</div>
            <div className="streak-value">{streak}</div>
            <div className="streak-unit">{streak === 1 ? 'jour de suite' : 'jours de suite'} 🔥</div>
          </div>
          <div className="streak-divider" />
          <div className="streak-block streak-block--right">
            <div className="streak-label">Meilleur</div>
            <div className="streak-value streak-value--sm">{bestStreak}</div>
            <div className="streak-unit">record 🏆</div>
          </div>
        </div>

        {/* ── Niveau / XP ── */}
        <div className="level-card">
          <div className="level-left">
            <div className="level-badge">Niv. {level}</div>
            <div className="level-xp-text">{xpInLvl} / {XP_PAR_NIVEAU} XP</div>
          </div>
          <div className="level-right">
            <div className="level-total">{xpTotal} XP au total</div>
            <div className="level-bar">
              <div className="level-fill" style={{ width: fillPct + '%' }} />
            </div>
            <div className="level-next">{XP_PAR_NIVEAU - xpInLvl} XP jusqu'au niveau {level + 1}</div>
          </div>
        </div>

        {/* ── Stats grid ── */}
        <div className="section-title">Statistiques</div>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-card-icon">📚</span>
            <span className="stat-card-value">{allLessons.length}</span>
            <span className="stat-card-label">Leçons scannées</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-icon">🔄</span>
            <span className="stat-card-value">{allRevisions.length}</span>
            <span className="stat-card-label">Révisions totales</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-icon">📅</span>
            <span className="stat-card-value">{activeDays}</span>
            <span className="stat-card-label">Jours actifs</span>
          </div>
          <div className="stat-card stat-card--accent">
            <span className="stat-card-icon">⚡</span>
            <span className="stat-card-value">{xpTotal}</span>
            <span className="stat-card-label">XP total</span>
          </div>
        </div>

        {/* ── Activité hebdomadaire ── */}
        <div className="section-title">Cette semaine</div>
        <div className="chart-card">
          <div className="chart-header">
            <span className="chart-title">Révisions par jour</span>
            <span className="chart-total"><span>{revisionsThisWeek}</span> cette semaine</span>
          </div>
          <div className="bars-wrap">
            {weekBars.map((bar, i) => (
              <div key={i} className="bar-col">
                <div
                  className={`bar${bar.type ? ' ' + bar.type : ''}`}
                  style={{ height: bar.height + 'px' }}
                />
                <span className={`bar-day${bar.type === 'today' ? ' today' : ''}`}>{bar.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Objectif hebdo ── */}
        <div className="goal-card">
          <div className="goal-header">
            <span className="goal-title">Réviser chaque jour</span>
            <span className="goal-badge">{goalBadge}</span>
          </div>
          <div className="goal-progress-row">
            <span className="goal-count"><strong>{daysWithLesson}</strong> / 7 jours</span>
            <span className="goal-pct">{goalPct} %</span>
          </div>
          <div className="goal-bar">
            <div className="goal-fill" style={{ width: goalPct + '%' }} />
          </div>
          <span className="goal-sub">{goalMessage}</span>
        </div>

        {/* ── Répartition par matière ── */}
        {subjectBreakdown.length > 0 && (
          <>
            <div className="section-title">Par matière</div>
            <div className="subject-breakdown">
              {subjectBreakdown.map(({ name, count, pct, info }) => (
                <div key={name} className="subject-row">
                  <div className="subject-row-left">
                    <span className="subject-row-emoji">{info.emoji}</span>
                    <span className="subject-row-name">{name}</span>
                  </div>
                  <div className="subject-row-bar-wrap">
                    <div
                      className="subject-row-bar"
                      style={{ width: pct + '%', background: info.dot }}
                    />
                  </div>
                  <span className="subject-row-count">{count}</span>
                </div>
              ))}
            </div>
          </>
        )}

      </div>

      <BottomNav active="progres" />
      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
