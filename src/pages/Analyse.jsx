import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Drawer } from '../components/Drawer';
import { BottomNav } from '../components/BottomNav';
import { analyseLesson, analyseImage, popPendingAnalysis } from '../services/aiService';
import { saveLesson, loadLessons } from '../services/historyService';
import { PremiumModal } from '../components/PremiumModal';
import './Analyse.css';

const LIMITE_FREE = 5;
const ADMIN_EMAILS = ['johan11elm@gmail.com'];

function isOverMonthlyLimit(userEmail) {
  if (userEmail && ADMIN_EMAILS.includes(userEmail)) return false;
  const lessons = loadLessons();
  const now = new Date();
  const thisMonth = lessons.filter(l => {
    const d = new Date(l.scannedAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  return thisMonth.length >= LIMITE_FREE;
}

// ─── Helpers matières ───────────────────────────────────────────────
const SUBJECT_MAP = {
  'maths':    { color: 'orange', dot: '#FF6B00', bg: '#FFF7ED', emoji: '📐' },
  'français': { color: 'pink',   dot: '#EC4899', bg: '#FDF2F8', emoji: '📖' },
  'histoire': { color: 'indigo', dot: '#6366F1', bg: '#EEF2FF', emoji: '🌍' },
  'géo':      { color: 'indigo', dot: '#6366F1', bg: '#EEF2FF', emoji: '🌍' },
  'svt':      { color: 'green',  dot: '#22C55E', bg: '#F0FDF4', emoji: '🧬' },
  'physique': { color: 'blue',   dot: '#3B82F6', bg: '#EFF6FF', emoji: '⚛️' },
  'chimie':   { color: 'blue',   dot: '#3B82F6', bg: '#EFF6FF', emoji: '🧪' },
  'techno':   { color: 'cyan',   dot: '#06B6D4', bg: '#ECFEFF', emoji: '⚙️' },
  'anglais':  { color: 'yellow', dot: '#EAB308', bg: '#FEFCE8', emoji: '🗣️' },
  'espagnol': { color: 'yellow', dot: '#EAB308', bg: '#FEFCE8', emoji: '💬' },
  'langues':  { color: 'yellow', dot: '#EAB308', bg: '#FEFCE8', emoji: '🌐' },
  'latin':    { color: 'yellow', dot: '#EAB308', bg: '#FEFCE8', emoji: '🏛️' },
  'arts':     { color: 'purple', dot: '#A855F7', bg: '#FAF5FF', emoji: '🎨' },
};

function subjectInfo(s) {
  const key = Object.keys(SUBJECT_MAP).find(k => s?.toLowerCase().includes(k)) ?? null;
  return SUBJECT_MAP[key] ?? { color: 'indigo', dot: '#6366F1', bg: '#EEF2FF', emoji: '📚' };
}

// ─── Mock de fallback ────────────────────────────────────────────────
const mockLesson = {
  title: 'Théorème de Pythagore',
  subject: 'Maths',
  emoji: '📐',
  dot: '#FF6B00',
  bg: '#FFF7ED',
  excerpt: "Dans un triangle rectangle, le carré de la longueur de l'hypoténuse est égal à la somme des carrés des deux autres côtés : a² + b² = c².",
  flashcardsCount: 8,
  quizCount: 10,
};

function buildLessonFromAiData(data) {
  const info = subjectInfo(data.metadata.subject);
  return {
    title:           data.metadata.title,
    subject:         data.metadata.subject,
    emoji:           info.emoji,
    dot:             info.dot,
    bg:              info.bg,
    excerpt:         data.metadata.excerpt,
    flashcardsCount: data.flashcards.length,
    quizCount:       data.quiz.length,
  };
}

// ─── Formats de révision ─────────────────────────────────────────────
const formats = [
  {
    id: 'resume',
    emoji: '📝',
    name: 'Résumé',
    iconBg: '#F0FDF4',
    accent: '#22C55E',
    to: '/resume',
    getCount: () => null,
    unit: null,
    desc: "Relis l'essentiel en 2 min",
  },
  {
    id: 'flashcards',
    emoji: '🃏',
    name: 'Flashcards',
    iconBg: '#EEF2FF',
    accent: '#6366F1',
    to: '/flashcards',
    getCount: l => l.flashcardsCount,
    unit: 'cartes',
    desc: 'Révise par répétition espacée',
  },
  {
    id: 'mindmap',
    emoji: '🧠',
    name: 'Carte mentale',
    iconBg: '#FAF5FF',
    accent: '#A855F7',
    to: '/mindmap',
    getCount: () => null,
    unit: null,
    desc: 'Visualise les concepts clés',
  },
  {
    id: 'quiz',
    emoji: '❓',
    name: 'Quiz',
    iconBg: '#FFF4E6',
    accent: '#FF6B00',
    to: '/quiz',
    getCount: l => l.quizCount,
    unit: 'questions',
    desc: 'Teste tes connaissances',
  },
];

// ─── Écran de chargement ─────────────────────────────────────────────
const STEPS = [
  { id: 'flashcards', emoji: '🃏', name: 'Flashcards',   iconBg: '#EEF2FF', accent: '#6366F1', doneAt: 20 },
  { id: 'quiz',       emoji: '❓', name: 'Quiz',          iconBg: '#FFF4E6', accent: '#FF6B00', doneAt: 47 },
  { id: 'resume',     emoji: '📝', name: 'Résumé',        iconBg: '#F0FDF4', accent: '#22C55E', doneAt: 67 },
  { id: 'mindmap',    emoji: '🧠', name: 'Carte mentale', iconBg: '#FAF5FF', accent: '#A855F7', doneAt: 85 },
];

function getStepState(index, progress) {
  if (progress >= STEPS[index].doneAt) return 'done';
  const prevDone = index === 0 ? true : progress >= STEPS[index - 1].doneAt;
  return prevDone ? 'active' : 'pending';
}

// ─── Composant ────────────────────────────────────────────────────────
export default function Analyse() {
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState(null);
  const [lesson, setLesson]           = useState(null);
  const [progress, setProgress]       = useState(0);
  const [showPremium, setShowPremium] = useState(false);
  const navigate   = useNavigate();
  const { currentUser } = useAuth();
  const initiale   = currentUser?.displayName?.[0]?.toUpperCase() ?? '?';
  const calledRef  = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;
    const aiData      = localStorage.getItem('reviz-ai-data');
    const lessonText  = localStorage.getItem('reviz-lesson-text');
    const capturedImg = localStorage.getItem('reviz-captured-image');

    if (aiData) {
      try {
        setLesson(buildLessonFromAiData(JSON.parse(aiData)));
        setIsLoading(false);
      } catch {
        localStorage.removeItem('reviz-ai-data');
        if (lessonText)  { callApi(lessonText); return; }
        if (capturedImg) { callApiImage(capturedImg); return; }
        useMockFallback();
      }
      return;
    }
    if (lessonText || capturedImg) {
      if (isOverMonthlyLimit(currentUser?.email)) {
        setShowPremium(true);
        setIsLoading(false);
        return;
      }
      if (lessonText)  { callApi(lessonText); return; }
      if (capturedImg) { callApiImage(capturedImg); return; }
    }
    useMockFallback();
  }, []);

  function callApi(text) {
    let lastUpdate = 0;
    const onProgress = chars => {
      const now = Date.now(), newP = Math.min(95, Math.round(chars / 30));
      if (now - lastUpdate > 150) { lastUpdate = now; setProgress(newP); }
    };
    const pending = popPendingAnalysis(onProgress);
    const promise = pending ?? analyseLesson(text, onProgress);
    promise
      .then(data => {
        localStorage.setItem('reviz-ai-data', JSON.stringify(data));
        saveLesson(data.metadata, data);
        setLesson(buildLessonFromAiData(data));
        setIsLoading(false);
      })
      .catch(err => { setError(err.message); setIsLoading(false); });
  }

  function callApiImage(imageDataUrl) {
    let lastUpdate = 0;
    const onProgress = chars => {
      const now = Date.now(), newP = Math.min(95, Math.round(chars / 30));
      if (now - lastUpdate > 150) { lastUpdate = now; setProgress(newP); }
    };
    const pending = popPendingAnalysis(onProgress);
    const promise = pending ?? analyseImage(imageDataUrl, onProgress);
    promise
      .then(data => {
        localStorage.setItem('reviz-ai-data', JSON.stringify(data));
        localStorage.removeItem('reviz-captured-image');
        saveLesson(data.metadata, data);
        setLesson(buildLessonFromAiData(data));
        setIsLoading(false);
      })
      .catch(err => { setError(err.message); setIsLoading(false); });
  }

  function useMockFallback() {
    const timer = setTimeout(() => { setLesson(mockLesson); setIsLoading(false); }, 2000);
    return () => clearTimeout(timer);
  }

  const displayLesson = lesson || mockLesson;
  const totalElements = displayLesson.flashcardsCount + displayLesson.quizCount;

  const errorMessages = {
    MISSING_API_KEY: 'Clé API manquante',
    INVALID_API_KEY: 'Clé API invalide',
    RATE_LIMIT:      'Trop de requêtes — réessaie dans un moment',
    NETWORK_ERROR:   'Pas de connexion internet',
    INVALID_JSON:    "L'IA a renvoyé une réponse inattendue",
  };

  return (
    <div className="app">

      {/* ── Écran de chargement ── */}
      {isLoading && (
        <div className="loading-screen">
          <div className="ls-top">
            <span className="ls-icon">✨</span>
            <div className="ls-title">Réviz prépare<br/>ta session</div>
          </div>
          <div className="ls-grid">
            {STEPS.map((step, i) => {
              const state = getStepState(i, progress);
              return (
                <div
                  key={step.id}
                  className={`ls-card ls-card--${state}`}
                  style={{ '--ls-bg': step.iconBg, '--ls-accent': step.accent }}
                >
                  {state === 'active' && <div className="ls-shimmer" />}
                  {state === 'done'   && <span className="ls-badge">✓</span>}
                  <span className="ls-emoji">{step.emoji}</span>
                  <span className="ls-name">{step.name}</span>
                </div>
              );
            })}
          </div>
          <div className={`ls-bar${progress > 0 ? ' ls-bar--visible' : ''}`}>
            <div className="ls-bar-fill" style={{ width: progress + '%' }} />
          </div>
        </div>
      )}

      {/* ── Écran d'erreur ── */}
      {error && !isLoading && (
        <div className="loading-screen">
          <span className="loading-icon">⚠️</span>
          <span className="loading-title">
            {errorMessages[error] ?? 'Erreur de connexion'}
          </span>
          <span className="loading-sub">Vérifie ta connexion ou ta clé API dans .env.local</span>
          <button className="error-retry-btn" onClick={() => navigate('/scan')}>
            ← Retour au scan
          </button>
        </div>
      )}

      {/* ── Header ── */}
      <div className="header">
        <button className="back-btn" onClick={() => navigate('/scan')}>←</button>
        <span className="header-title">Ta leçon</span>
        <div className="header-avatar" onClick={() => setDrawerOpen(true)}>{initiale}</div>
      </div>

      {/* ── Content ── */}
      <div className={`content${(isLoading || error) ? ' content-hidden' : ''}`}>

        {/* Hero leçon */}
        <div className="lesson-hero" style={{ background: displayLesson.bg }}>
          <div className="lesson-hero-icon">{displayLesson.emoji}</div>
          <div className="lesson-hero-body">
            <div className="lesson-hero-subject" style={{ color: displayLesson.dot }}>
              {displayLesson.subject}
            </div>
            <div className="lesson-hero-title">{displayLesson.title}</div>
            <div className="lesson-hero-chips">
              {displayLesson.flashcardsCount > 0 && (
                <span className="hero-chip">🃏 {displayLesson.flashcardsCount} cartes</span>
              )}
              {displayLesson.quizCount > 0 && (
                <span className="hero-chip">❓ {displayLesson.quizCount} questions</span>
              )}
              <span className="hero-chip">✨ {totalElements} éléments</span>
            </div>
          </div>
        </div>

        {/* Résumé / excerpt */}
        {displayLesson.excerpt && (
          <div className="lesson-excerpt-card">
            <div className="excerpt-label">Résumé détecté</div>
            <p className="excerpt-text">{displayLesson.excerpt}</p>
          </div>
        )}

        {/* Formats */}
        <div className="section-title">Comment veux-tu réviser ?</div>
        <div className="format-grid">
          {formats.map(f => {
            const count = f.getCount(displayLesson);
            return (
              <Link key={f.id} to={f.to} className="format-card">
                <div className="format-card-top">
                  <div className="format-icon-wrap" style={{ background: f.iconBg }}>
                    {f.emoji}
                  </div>
                  <span className="format-arrow" style={{ color: f.accent }}>›</span>
                </div>
                <div className="format-name">{f.name}</div>
                <div className="format-desc">{f.desc}</div>
                {count !== null && (
                  <div className="format-count-pill" style={{ background: f.iconBg, color: f.accent }}>
                    {count} {f.unit}
                  </div>
                )}
              </Link>
            );
          })}
        </div>

      </div>

      <BottomNav active="" />
      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      {showPremium && <PremiumModal onClose={() => navigate('/scan')} />}
    </div>
  );
}
