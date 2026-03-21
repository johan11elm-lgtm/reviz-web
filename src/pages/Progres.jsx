import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { loadLessons, syncFromFirestore } from '../services/historyService';
import { loadRevisions, syncRevisionsFromFirestore } from '../services/revisionService';
import { Drawer } from '../components/Drawer';
import { BottomNav } from '../components/BottomNav';
import { computeStreak, computeLevel, XP_PAR_LECON, XP_PAR_NIVEAU } from '../utils/gamification';
import { subjectInfo } from '../utils/subjects';
import { getWeeklyChallenges } from '../services/challengeService';
import './Progres.css';

// ─── Constantes ─────────────────────────────────────────────────────
const FORMAT_INFO = {
  flashcards: { label: 'Flashcards',    emoji: '🃏', color: '#6366F1' },
  quiz:       { label: 'Quiz',           emoji: '❓', color: '#FF6B00' },
  resume:     { label: 'Résumé',        emoji: '📝', color: '#22C55E' },
  mindmap:    { label: 'Carte mentale', emoji: '🧠', color: '#A855F7' },
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

function computeWeekComparison(revisions) {
  const weekCounts = {};
  revisions.forEach(r => {
    const monday = getMondayOf(new Date(r.revisedAt));
    const key = monday.toISOString().split('T')[0];
    weekCounts[key] = (weekCounts[key] || 0) + 1;
  });
  const currentKey = getMondayOf(new Date()).toISOString().split('T')[0];
  const thisWeek = weekCounts[currentKey] || 0;
  const bestWeek = Object.values(weekCounts).length ? Math.max(...Object.values(weekCounts)) : 0;
  return { thisWeek, bestWeek };
}

function computeHeatmap(revisions) {
  const countByDay = {};
  revisions.forEach(r => {
    const key = new Date(r.revisedAt).toDateString();
    countByDay[key] = (countByDay[key] || 0) + 1;
  });
  const today = new Date();
  const startMonday = getMondayOf(today);
  startMonday.setDate(startMonday.getDate() - 28); // 4 semaines en arrière
  const cells = [];
  for (let i = 0; i < 35; i++) {
    const d = new Date(startMonday);
    d.setDate(startMonday.getDate() + i);
    const isFuture = d > today;
    const count = isFuture ? -1 : (countByDay[d.toDateString()] || 0);
    cells.push({ count, isToday: d.toDateString() === today.toDateString(), isFuture });
  }
  return cells;
}

function getHeatIntensity(count) {
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

// ─── Composant ───────────────────────────────────────────────────────
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

  const streak           = computeStreak(allRevisions, 'revisedAt');
  const bestStreak       = computeBestStreak(allRevisions, 'revisedAt');
  const { level, xpInLvl, xpTotal, fillPct } = computeLevel(allLessons);
  const activeDays       = computeActiveDays(allRevisions, 'revisedAt');
  const weekBars         = computeWeekBars(allRevisions);
  const weekComparison   = computeWeekComparison(allRevisions);
  const heatmap          = computeHeatmap(allRevisions);
  const subjectBreakdown = computeSubjectBreakdown(allLessons);
  const formatBreakdown  = computeFormatBreakdown(allRevisions);
  const challengeData    = getWeeklyChallenges();

  const monday            = getMondayOf(new Date());
  const revisionsThisWeek = allRevisions.filter(r => new Date(r.revisedAt) >= monday).length;
  const daysWithLesson    = new Set(
    allRevisions.filter(r => new Date(r.revisedAt) >= monday)
                .map(r => new Date(r.revisedAt).toDateString())
  ).size;
  const dailyGoal = parseInt(localStorage.getItem(`reviz-daily-goal-${currentUser?.uid}`) || '3');
  const todayRevisions = allRevisions.filter(r =>
    new Date(r.revisedAt).toDateString() === new Date().toDateString()
  ).length;
  const goalPct     = Math.round(daysWithLesson / 7 * 100);
  const daysLeft    = 7 - daysWithLesson;
  const goalBadge   = daysWithLesson >= 7 ? 'Objectif atteint 🎉' : daysWithLesson >= 4 ? 'En bonne voie ✓' : 'Continue !';
  const goalMessage = todayRevisions >= dailyGoal
    ? `Objectif du jour atteint (${todayRevisions}/${dailyGoal}) !`
    : `${todayRevisions}/${dailyGoal} révisions aujourd'hui`;

  const isNewRecord = weekComparison.bestWeek > 0 && weekComparison.thisWeek >= weekComparison.bestWeek;

  return (
    <div className="app">

      {/* Header */}
      <div className="pg-header">
        <span className="pg-header-title">Mes progrès</span>
        <div className="pg-header-avatar" onClick={() => setDrawerOpen(true)}>{initiale}</div>
      </div>

      <div className="pg-content">

        {/* 1. Streak hero */}
        <div className="pg-streak-card">
          <div className="pg-streak-block">
            <div className="pg-streak-label">Série en cours</div>
            <div className="pg-streak-value">{streak}</div>
            <div className="pg-streak-unit">{streak === 1 ? 'jour de suite' : 'jours de suite'} 🔥</div>
          </div>
          <div className="pg-streak-divider" />
          <div className="pg-streak-block pg-streak-block--right">
            <div className="pg-streak-label">Meilleur</div>
            <div className="pg-streak-value pg-streak-value--sm">{bestStreak}</div>
            <div className="pg-streak-unit">record 🏆</div>
          </div>
        </div>

        {/* 2. Level / XP */}
        <div className="pg-level-card">
          <div className="pg-level-left">
            <div className="pg-level-badge">Niv. {level}</div>
            <div className="pg-level-xp-text">{xpInLvl} / {XP_PAR_NIVEAU} XP</div>
          </div>
          <div className="pg-level-right">
            <div className="pg-level-total">{xpTotal} XP au total</div>
            <div className="pg-level-bar">
              <div className="pg-level-fill" style={{ width: fillPct + '%' }} />
            </div>
            <div className="pg-level-next">{XP_PAR_NIVEAU - xpInLvl} XP jusqu'au niveau {level + 1}</div>
          </div>
        </div>

        {/* 3. Heatmap */}
        <div className="pg-section-title">Activité</div>
        <div className="pg-heatmap-card">
          <div className="pg-heatmap-header">
            <span className="pg-heatmap-title">5 dernières semaines</span>
            <span className="pg-heatmap-sub">{activeDays} jours actifs</span>
          </div>
          <div className="pg-heatmap-day-labels">
            {['L','M','M','J','V','S','D'].map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div className="pg-heatmap-grid">
            {heatmap.map((cell, i) => (
              <div
                key={i}
                className={[
                  'pg-heatmap-cell',
                  `pg-heatmap-cell--${cell.isFuture ? 'future' : getHeatIntensity(cell.count)}`,
                  cell.isToday ? 'pg-heatmap-cell--today' : '',
                ].filter(Boolean).join(' ')}
              />
            ))}
          </div>
          <div className="pg-heatmap-legend">
            <span>Moins</span>
            <div className="pg-heatmap-legend-dots">
              {[0,1,2,3].map(i => (
                <div key={i} className={`pg-heatmap-cell pg-heatmap-cell--${i}`} style={{ width: 10, height: 10 }} />
              ))}
            </div>
            <span>Plus</span>
          </div>
        </div>

        {/* 4. Stats 3 cartes */}
        <div className="pg-section-title">Statistiques</div>
        <div className="pg-stats-grid">
          <div className="pg-stat-card">
            <span className="pg-stat-icon">📚</span>
            <span className="pg-stat-value">{allLessons.length}</span>
            <span className="pg-stat-label">Leçons scannées</span>
          </div>
          <div className="pg-stat-card">
            <span className="pg-stat-icon">⚡</span>
            <span className="pg-stat-value">{allRevisions.length}</span>
            <span className="pg-stat-label">Révisions totales</span>
          </div>
          <div className="pg-stat-card pg-stat-card--accent">
            <span className="pg-stat-icon">📅</span>
            <span className="pg-stat-value">{activeDays}</span>
            <span className="pg-stat-label">Jours actifs</span>
          </div>
        </div>

        {/* 5. Graphe semaine */}
        <div className="pg-section-title">Cette semaine</div>
        <div className="pg-chart-card">
          <div className="pg-chart-header">
            <span className="pg-chart-title">Révisions par jour</span>
            <span className="pg-chart-total"><span>{revisionsThisWeek}</span> révisions</span>
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

        {/* 6. Record semaine */}
        <div className={`pg-week-compare${isNewRecord ? ' pg-week-compare--record' : ''}`}>
          {isNewRecord && (
            <div className="pg-week-record-badge">🏆 Nouveau record !</div>
          )}
          <div className="pg-week-compare-row">
            <div className="pg-week-compare-item">
              <span className="pg-week-compare-label">Cette semaine</span>
              <span className="pg-week-compare-value">{weekComparison.thisWeek}</span>
              <span className="pg-week-compare-sub">révisions</span>
            </div>
            <div className="pg-week-compare-divider" />
            <div className="pg-week-compare-item">
              <span className="pg-week-compare-label">Meilleur</span>
              <span className="pg-week-compare-value">{weekComparison.bestWeek}</span>
              <span className="pg-week-compare-sub">record</span>
            </div>
          </div>
        </div>

        {/* 7. Objectif hebdo */}
        <div className="pg-goal-card">
          <div className="pg-goal-header">
            <span className="pg-goal-title">Réviser chaque jour</span>
            <span className="pg-goal-badge">{goalBadge}</span>
          </div>
          <div className="pg-goal-progress-row">
            <span className="pg-goal-count"><strong>{daysWithLesson}</strong> / 7 jours</span>
            <span className="pg-goal-pct">{goalPct}%</span>
          </div>
          <div className="pg-goal-bar">
            <div className="pg-goal-fill" style={{ width: goalPct + '%' }} />
          </div>
          <span className="pg-goal-sub">{goalMessage}</span>
        </div>

        {/* 7b. Défis de la semaine */}
        <div className="pg-section-title">Défis de la semaine</div>
        <div className="pg-challenges-card">
          {challengeData.challenges?.map(c => (
            <div key={c.id} className={`pg-challenge-row${c.completed ? ' pg-challenge--done' : ''}`}>
              <span className="pg-challenge-icon">{c.completed ? '✅' : '⏳'}</span>
              <div className="pg-challenge-info">
                <span className="pg-challenge-title">{c.title}</span>
                <div className="pg-challenge-bar-wrap">
                  <div className="pg-challenge-bar" style={{ width: Math.min(100, Math.round(c.current / c.target * 100)) + '%' }} />
                </div>
              </div>
              <span className="pg-challenge-count">{c.current}/{c.target}</span>
            </div>
          ))}
          {challengeData.previousWeek && (
            <div className="pg-challenge-prev">
              Semaine précédente : {challengeData.previousWeek.challenges?.filter(c => c.completed).length ?? 0}/3 complétés
            </div>
          )}
        </div>

        {/* 8. Répartition par format */}
        {formatBreakdown.some(f => f.count > 0) && (
          <>
            <div className="pg-section-title">Par format</div>
            <div className="pg-format-card">
              {formatBreakdown.map(f => (
                <div key={f.label} className="pg-format-row">
                  <div className="pg-format-left">
                    <span className="pg-format-emoji">{f.emoji}</span>
                    <span className="pg-format-label">{f.label}</span>
                  </div>
                  <div className="pg-format-bar-wrap">
                    <div className="pg-format-bar" style={{ width: f.pct + '%', background: f.color }} />
                  </div>
                  <span className="pg-format-count">{f.count}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 9. Répartition par matière */}
        {subjectBreakdown.length > 0 && (
          <>
            <div className="pg-section-title">Par matière</div>
            <div className="pg-subject-card">
              {subjectBreakdown.map(({ name, count, pct, info }) => (
                <div key={name} className="pg-subject-row">
                  <div className="pg-subject-left">
                    <span className="pg-subject-emoji">{info.emoji}</span>
                    <span className="pg-subject-name">{name}</span>
                  </div>
                  <div className="pg-subject-bar-wrap">
                    <div className="pg-subject-bar" style={{ width: pct + '%', background: info.dot }} />
                  </div>
                  <span className="pg-subject-count">{count}</span>
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
