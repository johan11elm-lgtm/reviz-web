import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Drawer } from '../components/Drawer';
import { BottomNav } from '../components/BottomNav';
import { ConfirmModal } from '../components/ConfirmModal';
import { loadLessons, restoreLesson, deleteLesson, syncFromFirestore } from '../services/historyService';
import { countDueCards } from '../services/srsService';
import './Cours.css';

// -------------------------------------------------------------------
// Helpers matières
// -------------------------------------------------------------------
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

function subjectKey(s) {
  return Object.keys(SUBJECT_MAP).find(k => s?.toLowerCase().includes(k)) ?? null;
}
function subjectInfo(s) {
  return SUBJECT_MAP[subjectKey(s)] ?? { color: 'indigo', dot: '#6366F1', emoji: '📚' };
}

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
  const navigate = useNavigate();

  useEffect(() => {
    syncFromFirestore().then(lessons => setAllLessons(lessons));
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

  return (
    <div className="app">
      {/* Header */}
      <div className="header">
        <div className="header-left">
          <span className="header-title">Mes cours</span>
          {allLessons.length > 0 && (
            <span className="header-count">{totalVisible} leçon{totalVisible > 1 ? 's' : ''}</span>
          )}
        </div>
        <div className="header-avatar" onClick={() => setDrawerOpen(true)}>{initiale}</div>
      </div>

      {/* Search */}
      <div className="search-wrap">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            type="text"
            placeholder="Rechercher une leçon..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="search-clear" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>
      </div>

      {/* Filters */}
      {subjects.length > 1 && (
        <div className="filters-wrap">
          <div className="filters">
            {filters.map(f => (
              <div
                key={f.id}
                className={`filter-chip${activeFilter === f.id ? ' active' : ''}`}
                onClick={() => setActiveFilter(f.id)}
              >
                {f.emoji && f.id !== 'toutes' && <span className="chip-emoji">{f.emoji}</span>}
                {f.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="content">
        {visibleSubjects.length === 0 ? (
          <div className="empty-cours">
            <span>{q ? '🔍' : '📚'}</span>
            <p>
              {q
                ? 'Aucune leçon ne correspond à ta recherche'
                : allLessons.length === 0
                  ? 'Scanne ta première leçon\npour la retrouver ici'
                  : 'Aucune leçon dans cette matière'}
            </p>
            {allLessons.length === 0 && (
              <button className="empty-scan-btn" onClick={() => navigate('/scan')}>
                📸 Scanner une leçon
              </button>
            )}
          </div>
        ) : (
          visibleSubjects.map(subject => (
            <div key={subject.id} className="subject-section">

              {/* En-tête matière */}
              <div className="subject-header">
                <div className="subject-label">
                  <div className="subject-dot" style={{ background: subject.dot }} />
                  <span className="subject-name">{subject.name}</span>
                </div>
                <span className="subject-num">
                  {subject.visibleLessons.length} leçon{subject.visibleLessons.length > 1 ? 's' : ''}
                </span>
              </div>

              {/* Cartes leçons */}
              {subject.visibleLessons.map(lesson => (
                <div
                  key={lesson.id}
                  className="lesson-card"
                  onClick={() => { restoreLesson(lesson.id); navigate('/analyse'); }}
                >
                  {/* Icone + infos */}
                  <div className="lesson-main">
                    <div className={`lesson-icon ${subject.color}`}>
                      {subject.emoji}
                    </div>
                    <div className="lesson-body">
                      <div className="lesson-top">
                        <span className="lesson-title">{lesson.metadata.title}</span>
                        <div className="lesson-top-right">
                          <span className="lesson-date">{formatDate(lesson.scannedAt)}</span>
                          <button
                            className="delete-btn"
                            onClick={e => { e.stopPropagation(); setLessonToDelete(lesson); }}
                            aria-label="Supprimer"
                          >✕</button>
                        </div>
                      </div>
                      {lesson.metadata.excerpt ? (
                        <p className="lesson-excerpt">{lesson.metadata.excerpt}</p>
                      ) : null}
                    </div>
                  </div>

                  {/* Actions rapides */}
                  <div className="lesson-actions">
                    {lesson.flashcardsCount > 0 && (() => {
                      const due = countDueCards(lesson.id, lesson.flashcardsCount);
                      return (
                        <button
                          className="lesson-action-btn"
                          onClick={e => { e.stopPropagation(); restoreLesson(lesson.id); navigate('/flashcards'); }}
                        >
                          🃏 Flashcards{due > 0 && due < lesson.flashcardsCount ? <span className="due-badge">{due}</span> : null}
                        </button>
                      );
                    })()}
                    {lesson.quizCount > 0 && (
                      <button
                        className="lesson-action-btn"
                        onClick={e => { e.stopPropagation(); restoreLesson(lesson.id); navigate('/quiz'); }}
                      >
                        ❓ Quiz
                      </button>
                    )}
                    <button
                      className="lesson-action-btn lesson-action-btn--ghost"
                      onClick={e => { e.stopPropagation(); restoreLesson(lesson.id); navigate('/analyse'); }}
                    >
                      Voir tout →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))
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
