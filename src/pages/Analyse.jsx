import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Drawer } from '../components/Drawer';
import { BottomNav } from '../components/BottomNav';
import { PageHeader } from '../components/PageHeader';
import { HeroCTA } from '../components/HeroCTA';
import { Mascot } from '../components/Mascot';
import { analyseLesson, analyseImage, popPendingAnalysis } from '../services/aiService';
import { saveLesson } from '../services/historyService';
import { PremiumModal } from '../components/PremiumModal';
import { getScanStatus } from '../services/scanLimitService';
import { subjectInfo } from '../utils/subjects';
import './Analyse.css';

// ─── Mock de fallback ────────────────────────────────────────────────
const mockLesson = {
  title: 'Théorème de Pythagore',
  subject: 'Maths',
  emoji: '📐',
  dot: '#FF8A3D',
  bg: '#FFF7ED',
  color: 'orange',
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
    color:           info.color,
    excerpt:         data.metadata.excerpt,
    flashcardsCount: data.flashcards.length,
    quizCount:       data.quiz.length,
  };
}

// ─── Formats de révision ─────────────────────────────────────────────
const formats = [
  { id: 'resume',     emoji: '📝', name: 'Résumé',        tone: 'green',  to: '/resume',     getCount: () => null, unit: null, desc: "Relis l'essentiel en 2 min" },
  { id: 'flashcards', emoji: '🃏', name: 'Flashcards',    tone: 'violet', to: '/flashcards', getCount: l => l.flashcardsCount, unit: 'cartes',    desc: 'Révise par répétition espacée' },
  { id: 'mindmap',    emoji: '🧠', name: 'Carte mentale', tone: 'pink',   to: '/mindmap',    getCount: () => null,              unit: null,        desc: 'Visualise les concepts clés' },
  { id: 'quiz',       emoji: '❓', name: 'Quiz',          tone: 'orange', to: '/quiz',       getCount: l => l.quizCount,        unit: 'questions', desc: 'Teste tes connaissances' },
];

// ─── Écran de chargement ─────────────────────────────────────────────
const STEPS = [
  { id: 'flashcards', emoji: '🃏', name: 'Flashcards',   tone: 'violet', doneAt: 20 },
  { id: 'quiz',       emoji: '❓', name: 'Quiz',          tone: 'orange', doneAt: 47 },
  { id: 'resume',     emoji: '📝', name: 'Résumé',        tone: 'green',  doneAt: 67 },
  { id: 'mindmap',    emoji: '🧠', name: 'Carte mentale', tone: 'pink',   doneAt: 85 },
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
  const { currentUser, getUserLevel } = useAuth();
  const initiale   = currentUser?.displayName?.[0]?.toUpperCase() ?? '?';
  const userLevel  = getUserLevel();
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
      if (!getScanStatus().canScan) {
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
    const promise = pending ?? analyseLesson(text, onProgress, userLevel);
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
    const promise = pending ?? analyseImage(imageDataUrl, onProgress, userLevel);
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

  const avatarBtn = (
    <button
      type="button"
      className="analyse-avatar-btn"
      onClick={() => setDrawerOpen(true)}
      aria-label="Ouvrir le menu"
    >
      {initiale}
    </button>
  );

  return (
    <div className="app analyse-page">

      {/* ── Écran de chargement ── */}
      {isLoading && (
        <div className="analyse-loading-screen">
          <Mascot
            pose="thinking"
            size={180}
            glow
            animate
            priority
            alt=""
            aria-hidden="true"
          />
          <div className="analyse-ls-title">Réviz prépare<br/>ta session</div>
          <div className="analyse-ls-grid">
            {STEPS.map((step, i) => {
              const state = getStepState(i, progress);
              return (
                <div
                  key={step.id}
                  className={`analyse-ls-card analyse-ls-card--${state} analyse-ls-card--${step.tone}`}
                >
                  {state === 'active' && <div className="analyse-ls-shimmer" />}
                  {state === 'done'   && <span className="analyse-ls-badge">✓</span>}
                  <span className="analyse-ls-emoji">{step.emoji}</span>
                  <span className="analyse-ls-name">{step.name}</span>
                </div>
              );
            })}
          </div>
          <div className={`analyse-ls-bar${progress > 0 ? ' analyse-ls-bar--visible' : ''}`}>
            <div className="analyse-ls-bar-fill" style={{ width: progress + '%' }} />
          </div>
        </div>
      )}

      {/* ── Écran d'erreur ── */}
      {error && !isLoading && (
        <div className="analyse-loading-screen">
          <Mascot
            pose="confused"
            size={200}
            glow
            priority
            alt=""
            aria-hidden="true"
          />
          <div className="analyse-ls-title">
            {errorMessages[error] ?? 'Erreur de connexion'}
          </div>
          <p className="analyse-error-sub">
            Vérifie ta connexion ou ta clé API dans .env.local
          </p>
          <button
            type="button"
            className="rv-btn-cta rv-btn-cta--ghost"
            onClick={() => navigate('/scan')}
          >
            ← Retour au scan
          </button>
        </div>
      )}

      <PageHeader
        variant="back"
        title="Ta leçon"
        right={avatarBtn}
        onBack={() => navigate('/scan')}
      />

      {/* ── Content ── */}
      <div className={`content analyse-content${(isLoading || error) ? ' analyse-content--hidden' : ''}`}>

        {/* Hero présence — mascotte dominante style Home, parle direct à l'utilisateur */}
        <HeroCTA
          tone="orange"
          mascot="pointing"
          eyebrow={`${displayLesson.emoji} ${displayLesson.subject} • ${totalElements} éléments`}
          title={displayLesson.title}
          sub="Choisis ton format préféré — j'ai tout préparé."
          className="analyse-hero-cta"
        />

        {/* Résumé / excerpt */}
        {displayLesson.excerpt && (
          <div className="rv-card rv-card--padded analyse-excerpt-card">
            <div className="analyse-excerpt-label">Résumé détecté</div>
            <p className="analyse-excerpt-text">{displayLesson.excerpt}</p>
          </div>
        )}

        <div className="analyse-format-grid">
          {formats.map(f => {
            const count = f.getCount(displayLesson);
            return (
              <Link key={f.id} to={f.to} className="rv-card rv-card--link rv-card--padded analyse-format-card">
                <div className="analyse-format-card-top">
                  <div className={`rv-icon-square rv-icon-square--xl rv-icon-square--${f.tone}`}>
                    {f.emoji}
                  </div>
                  <span className={`analyse-format-arrow analyse-format-arrow--${f.tone}`}>›</span>
                </div>
                <div className="analyse-format-name">{f.name}</div>
                <div className="analyse-format-desc">{f.desc}</div>
                {count !== null && (
                  <div className={`rv-pill rv-pill--${f.tone} analyse-format-count`}>
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
