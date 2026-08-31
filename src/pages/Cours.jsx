import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Drawer } from '../components/Drawer';
import { BottomNav } from '../components/BottomNav';
import { ConfirmModal } from '../components/ConfirmModal';
import { PageHeader } from '../components/PageHeader';
import { Mascot } from '../components/Mascot';
import { loadLessons, restoreLesson, deleteLesson, syncFromFirestore } from '../services/historyService';
import { countDueCards } from '../services/srsService';
import { subjectInfo, subjectKey, subjectMascot } from '../utils/subjects';
import './Cours.css';

// Map subject.color → DS tone (5 available: violet/orange/green/pink/red)
const SUBJECT_TONE = {
  orange: 'orange',
  yellow: 'orange',
  indigo: 'violet',
  blue:   'violet',
  purple: 'violet',
  green:  'green',
  cyan:   'green',
  pink:   'pink',
  red:    'red',
};

function formatDate(ts) {
  const d = new Date(ts), now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function buildSubjectsFromHistory(rawLessons) {
  if (rawLessons.length === 0) return [];
  const map = {};
  rawLessons.forEach(l => {
    const name  = l.metadata.subject || 'Autre';
    const key   = subjectKey(name) || name.toLowerCase().replace(/\s+/g, '-');
    const info  = subjectInfo(name);
    if (!map[name]) map[name] = { id: key, name, ...info, lessons: [] };
    map[name].lessons.push(l);
  });
  return Object.values(map);
}

export default function Cours() {
  const [drawerOpen, setDrawerOpen]         = useState(false);
  const [activeFilter, setActiveFilter]     = useState('toutes');
  const [searchQuery, setSearchQuery]       = useState('');
  const [allLessons, setAllLessons]         = useState(() => loadLessons());
  const [lessonToDelete, setLessonToDelete] = useState(null);
  const [isSyncing, setIsSyncing]           = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    syncFromFirestore()
      .then(lessons => setAllLessons(lessons))
      .finally(() => setIsSyncing(false));
  }, []);

  const { currentUser } = useAuth();
  const initiale = currentUser?.displayName?.[0]?.toUpperCase() ?? '?';

  function handleDelete(id) {
    deleteLesson(id);
    setAllLessons(loadLessons());
    setActiveFilter('toutes');
  }

  const subjects = buildSubjectsFromHistory(allLessons);
  const filters  = [
    { id: 'toutes', label: 'Toutes' },
    ...subjects.map(s => ({ id: s.id, label: s.name, emoji: s.emoji })),
  ];

  const q = searchQuery.toLowerCase().trim();

  const visibleSubjects = subjects
    .filter(s => activeFilter === 'toutes' || s.id === activeFilter)
    .map(s => ({
      ...s,
      visibleLessons: s.lessons.filter(l =>
        !q ||
        l.metadata.title.toLowerCase().includes(q) ||
        (l.metadata.excerpt || '').toLowerCase().includes(q)
      ),
    }))
    .filter(s => s.visibleLessons.length > 0);

  const totalVisible = visibleSubjects.reduce((acc, s) => acc + s.visibleLessons.length, 0);
  const hasLessons = allLessons.length > 0;
  // « Pas encore synchronisé » ≠ « vraiment vide » : sur un nouvel appareil le
  // cache local est vide alors que Firestore a des leçons → skeleton, pas empty-state.
  const showSkeleton = isSyncing && !hasLessons;

  // Compte total de cartes à revoir (toutes matières)
  const dueCards = useMemo(() => {
    return allLessons.reduce((sum, l) => sum + countDueCards(l.id, l.flashcardsCount ?? 0), 0);
  }, [allLessons]);

  // Featured "À reprendre" — dernière leçon récente (< 14 jours)
  const lastLesson = allLessons[0] ?? null;
  const lastLessonAge = lastLesson
    ? (Date.now() - new Date(lastLesson.scannedAt).getTime()) / 86400000
    : Infinity;
  const showResume = lastLesson && lastLessonAge < 14;
  const lastSubjectTone = lastLesson
    ? (SUBJECT_TONE[subjectInfo(lastLesson.metadata.subject).color] ?? 'violet')
    : 'violet';
  const lastEmoji = lastLesson ? subjectInfo(lastLesson.metadata.subject).emoji : '📚';
  const lastDue = lastLesson ? countDueCards(lastLesson.id, lastLesson.flashcardsCount ?? 0) : 0;

  // Hero narratif — Réviz guide l'utilisateur (ton pratique)
  const subjectCount = subjects.length;
  const prenom = currentUser?.displayName?.split(' ')[0] ?? 'toi';
  const heroPhrase = dueCards > 0
    ? `J'ai rangé ici toutes les leçons que tu as scannées. Les 🔥 sont à revoir.`
    : `J'ai rangé ici toutes les leçons que tu as scannées.`;

  // Collapse/expand par matière — tout fermé par défaut, l'user ouvre ce qu'il veut
  const [expandedSubjects, setExpandedSubjects] = useState(new Set());
  function toggleSubject(id) {
    setExpandedSubjects(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const avatarBtn = (
    <button
      type="button"
      className="cours-avatar-btn"
      onClick={() => setDrawerOpen(true)}
      aria-label="Ouvrir le menu"
    >
      {initiale}
    </button>
  );

  return (
    <div className="app cours-page">

      <PageHeader
        variant="title-only"
        title={hasLessons ? undefined : 'Mes cours'}
        right={avatarBtn}
      />

      {hasLessons && (
        <div className="cours-hero-wrap">
          <div className="cours-narrator-hero">
            <div className="cours-narrator-glow" aria-hidden="true" />
            <div className="cours-narrator-content">
              <h1 className="cours-narrator-title">Mes cours</h1>
              <div className="rv-speech-bubble rv-speech-bubble--pointer-right cours-narrator-bubble">
                {heroPhrase}
              </div>
            </div>
            <Mascot
              pose="reading"
              size={180}
              glow
              priority
              className="cours-narrator-mascot"
              alt=""
              aria-hidden="true"
            />
          </div>
        </div>
      )}

      {/* Search */}
      {!showSkeleton && (
      <div className="cours-search-wrap">
        <div className="rv-card rv-card--tight cours-search">
          <span className="cours-search-icon" aria-hidden="true">🔍</span>
          <input
            className="cours-search-input"
            type="text"
            placeholder="Rechercher une leçon..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            aria-label="Rechercher une leçon"
          />
          {searchQuery && (
            <button
              type="button"
              className="cours-search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Effacer la recherche"
            >✕</button>
          )}
        </div>
      </div>
      )}

      {/* Filters */}
      {subjects.length > 1 && (
        <div className="cours-filters-wrap">
          <div className="cours-filters">
            {filters.map(f => (
              <button
                type="button"
                key={f.id}
                className={`cours-filter-chip${activeFilter === f.id ? ' cours-filter-chip--active' : ''}`}
                onClick={() => setActiveFilter(f.id)}
              >
                {f.emoji && f.id !== 'toutes' && <span className="cours-chip-emoji" aria-hidden="true">{f.emoji}</span>}
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Featured "À reprendre" — Réviz propose la dernière leçon */}
      {showResume && (
        <div className="cours-resume-wrap">
          <div className="rv-card rv-card--padded cours-resume-card">
            <div className="cours-resume-top">
              <Mascot
                pose={subjectMascot(lastLesson.metadata.subject)}
                size={140}
                glow
                priority
                className="cours-resume-mascot"
                alt=""
                aria-hidden="true"
              />
              <div className="cours-resume-body">
                <div className="rv-speech-bubble rv-speech-bubble--pointer-left cours-resume-bubble">
                  On reprend ta dernière leçon ?
                </div>
                <div className="cours-resume-info">
                  <span className={`rv-icon-square rv-icon-square--${lastSubjectTone} cours-resume-icon`}>
                    {lastEmoji}
                  </span>
                  <div className="cours-resume-text">
                    <span className="cours-resume-title">{lastLesson.metadata.title}</span>
                    <span className="cours-resume-meta">
                      {lastLesson.metadata.subject} · {formatDate(lastLesson.scannedAt)}
                      {lastDue > 0 && (
                        <span className="cours-resume-due"> · 🔥 {lastDue} à revoir</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="rv-btn-cta rv-btn-cta--full cours-resume-cta"
              onClick={() => { restoreLesson(lastLesson.id); navigate('/analyse'); }}
            >
              <span>Continuer</span>
              <span className="rv-btn-cta-arrow" aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="content cours-content">
        {showSkeleton ? (
          <div className="cours-skeleton" role="status" aria-label="Synchronisation de tes leçons…">
            {[0, 1].map(i => (
              <div key={i} className="cours-skeleton-section" aria-hidden="true">
                <div className="cours-skeleton-header">
                  <div className="rv-skeleton rv-skeleton--icon" />
                  <div className="cours-skeleton-lines">
                    <div className="rv-skeleton rv-skeleton--title" />
                    <div className="rv-skeleton rv-skeleton--text" />
                  </div>
                </div>
                <div className="rv-card rv-card--padded cours-skeleton-card">
                  <div className="rv-skeleton rv-skeleton--icon" />
                  <div className="cours-skeleton-lines">
                    <div className="rv-skeleton rv-skeleton--title" />
                    <div className="rv-skeleton rv-skeleton--text" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : visibleSubjects.length === 0 ? (
          <div className="rv-empty-state cours-empty-state">
            <Mascot
              pose={q ? 'search' : 'reading'}
              size={q ? 180 : 220}
              glow
              animate={!q}
              priority
              className="rv-empty-state-mascot"
              alt=""
              aria-hidden="true"
            />
            <h2 className="rv-empty-state-title">
              {q
                ? 'Aucun résultat'
                : hasLessons
                  ? 'Rien dans cette matière'
                  : 'Allez, on scanne ?'}
            </h2>
            <div className="rv-speech-bubble rv-speech-bubble--pointer-top-center cours-empty-bubble">
              {q
                ? "Essaie un autre mot-clé — ou efface la recherche."
                : hasLessons
                  ? "Choisis une autre matière, je suis prêt·e."
                  : "Ta première leçon est à un scan d'ici. Je m'occupe du reste."}
            </div>
            {!hasLessons && (
              <button
                type="button"
                className="rv-btn-cta"
                onClick={() => navigate('/scan')}
              >
                <span>📸 Scanner une leçon</span>
                <span className="rv-btn-cta-arrow" aria-hidden="true">→</span>
              </button>
            )}
          </div>
        ) : (
          visibleSubjects.map(subject => {
            const tone = SUBJECT_TONE[subject.color] ?? 'violet';
            const subjectDue = subject.visibleLessons.reduce(
              (sum, l) => sum + countDueCards(l.id, l.flashcardsCount ?? 0),
              0
            );
            const isCollapsed = !expandedSubjects.has(subject.id);
            return (
              <div
                key={subject.id}
                className={`cours-subject-section${isCollapsed ? ' cours-subject-section--collapsed' : ''}`}
              >

                <button
                  type="button"
                  className="cours-subject-header"
                  onClick={() => toggleSubject(subject.id)}
                  aria-expanded={!isCollapsed}
                  aria-controls={`cours-subject-list-${subject.id}`}
                >
                  <div className={`rv-icon-square rv-icon-square--xl rv-icon-square--${tone} cours-subject-icon`}>
                    {subject.emoji}
                  </div>
                  <div className="cours-subject-info">
                    <span className="cours-subject-name">{subject.name}</span>
                    <span className="cours-subject-meta">
                      {subject.visibleLessons.length} leçon{subject.visibleLessons.length > 1 ? 's' : ''}
                      {subjectDue > 0 && ` · ${subjectDue} à revoir`}
                    </span>
                  </div>
                  {subjectDue > 0 && (
                    <span className="rv-pill rv-pill--orange cours-subject-due-pill">
                      🔥 {subjectDue}
                    </span>
                  )}
                  <svg
                    className="cours-subject-chevron"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                <div
                  id={`cours-subject-list-${subject.id}`}
                  className={`cours-subject-list${isCollapsed ? ' cours-subject-list--hidden' : ''}`}
                >
                {subject.visibleLessons.map(lesson => {
                  const fcTotal = lesson.flashcardsCount ?? 0;
                  const fcDue   = fcTotal > 0 ? countDueCards(lesson.id, fcTotal) : 0;
                  const qzTotal = lesson.quizCount ?? 0;
                  return (
                    <div
                      key={lesson.id}
                      role="button"
                      tabIndex={0}
                      className="rv-card rv-card--link rv-card--padded cours-lesson-card"
                      onClick={() => { restoreLesson(lesson.id); navigate('/analyse'); }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          restoreLesson(lesson.id);
                          navigate('/analyse');
                        }
                      }}
                    >
                      <div className="cours-lesson-main">
                        <div className={`rv-icon-square rv-icon-square--xl rv-icon-square--${tone}`}>
                          {subject.emoji}
                        </div>
                        <div className="cours-lesson-body">
                          <div className="cours-lesson-top">
                            <h3 className="cours-lesson-title">{lesson.metadata.title}</h3>
                            <button
                              type="button"
                              className="cours-delete-btn"
                              onClick={e => { e.stopPropagation(); setLessonToDelete(lesson); }}
                              aria-label="Supprimer la leçon"
                            >✕</button>
                          </div>
                          {lesson.metadata.excerpt && (
                            <p className="cours-lesson-excerpt">{lesson.metadata.excerpt}</p>
                          )}
                          <div className="cours-lesson-meta">
                            <span className="cours-lesson-meta-date">{formatDate(lesson.scannedAt)}</span>
                            {fcTotal > 0 && (
                              <span className="cours-lesson-meta-item">
                                <span aria-hidden="true">🃏</span> {fcTotal}
                              </span>
                            )}
                            {qzTotal > 0 && (
                              <span className="cours-lesson-meta-item">
                                <span aria-hidden="true">❓</span> {qzTotal}
                              </span>
                            )}
                            {fcDue > 0 && (
                              <span className="rv-pill rv-pill--orange cours-lesson-due-pill">
                                🔥 {fcDue} à revoir
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            );
          })
        )}
      </div>

      <BottomNav active="cours" />
      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      {lessonToDelete && (
        <ConfirmModal
          lessonTitle={lessonToDelete.metadata.title}
          onConfirm={() => { handleDelete(lessonToDelete.id); setLessonToDelete(null); }}
          onCancel={() => setLessonToDelete(null)}
        />
      )}
    </div>
  );
}
