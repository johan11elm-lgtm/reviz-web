import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loadLessons, syncFromFirestore } from '../services/historyService';
import { loadRevisions, syncRevisionsFromFirestore } from '../services/revisionService';
import { BottomNav } from '../components/BottomNav';
import { PageHeader } from '../components/PageHeader';
import { Mascot } from '../components/Mascot';
import { computeStreak, computeLevel, XP_PAR_NIVEAU } from '../utils/gamification';
import { subjectInfo } from '../utils/subjects';
import './Progres.css';

// ─── Constantes ─────────────────────────────────────────────────────
const FORMAT_INFO = {
  flashcards: { label: 'Flashcards',    emoji: '🃏', color: 'var(--accent-violet)' },
  quiz:       { label: 'Quiz',           emoji: '❓', color: 'var(--accent-orange)' },
  resume:     { label: 'Résumé',        emoji: '📝', color: 'var(--accent-green)' },
  mindmap:    { label: 'Carte mentale', emoji: '🧠', color: 'var(--accent-pink)' },
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

// ─── Composant ───────────────────────────────────────────────────────
export default function Progres() {
  const navigate = useNavigate();
  const [allLessons,   setAllLessons]   = useState(() => loadLessons());
  const [allRevisions, setAllRevisions] = useState(() => loadRevisions());
  const [isSyncing,    setIsSyncing]    = useState(true);

  const { currentUser } = useAuth();
  const prenom = currentUser?.displayName?.split(' ')[0] ?? 'toi';

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

  return (
    <div className="app progres-page">

      <PageHeader variant="title-only" />

      <div className="pg-content">

        {/* Hero narratif — Réviz commente la progression */}
        <div className="pg-narrator-hero">
          <div className="pg-narrator-glow" aria-hidden="true" />
          <div className="pg-narrator-content">
            <h1 className="pg-narrator-title">Mes progrès</h1>
            <div className="rv-speech-bubble rv-speech-bubble--pointer-right pg-narrator-bubble">
              {hero.phrase}
            </div>
          </div>
          <Mascot
            pose={hero.mascot}
            size={180}
            glow
            priority
            className="pg-narrator-mascot"
            alt=""
            aria-hidden="true"
          />
        </div>

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
              <div className="pg-level-badge">Niv. {level}</div>
              <span className="pg-level-total">{xpTotal} XP</span>
            </div>
            <div className="rv-bar pg-level-bar">
              <div className="rv-bar-fill rv-bar-fill--violet" style={{ width: fillPct + '%' }} />
            </div>
            <div className="pg-level-next">
              <strong>{xpInLvl}</strong> / {XP_PAR_NIVEAU} XP
            </div>
          </div>
        </div>

        {/* 2. Streak hero — mascotte fire à droite */}
        <div className="pg-streak-card">
          <div className="pg-streak-body">
            <div className="pg-streak-block">
              <div className="pg-streak-label">Série en cours</div>
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
        <h2 className="pg-section-title">📅 Ton activité</h2>
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
        <h2 className="pg-section-title">📊 Tes chiffres</h2>
        <div className="pg-stats-grid">
          <div className="rv-card pg-stat-card">
            <div className="rv-icon-square rv-icon-square--xl rv-icon-square--violet">📚</div>
            <span className="pg-stat-value">{allLessons.length}</span>
            <span className="pg-stat-label">Leçons scannées</span>
          </div>
          <div className="rv-card pg-stat-card">
            <div className="rv-icon-square rv-icon-square--xl rv-icon-square--green">⚡</div>
            <span className="pg-stat-value">{allRevisions.length}</span>
            <span className="pg-stat-label">Révisions totales</span>
          </div>
          <div className="rv-card pg-stat-card pg-stat-card--accent">
            <div className="rv-icon-square rv-icon-square--xl rv-icon-square--orange">📅</div>
            <span className="pg-stat-value">{activeDays}</span>
            <span className="pg-stat-label">Jours actifs</span>
          </div>
        </div>

        {/* 5. Graphe semaine avec mascotte signature */}
        <h2 className="pg-section-title">📈 Cette semaine</h2>
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
                  {isNewRecord && <span className="pg-chart-record">🏆 record !</span>}
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
          <>
            <h2 className="pg-section-title">🎨 Par format</h2>
            <div className="rv-card pg-format-card">
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

        {/* 8. Répartition par matière */}
        {subjectBreakdown.length > 0 && (
          <>
            <h2 className="pg-section-title">📚 Par matière</h2>
            <div className="rv-card pg-subject-card">
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

      <BottomNav />
    </div>
  );
}
