import { ResumeIcon, FlashcardsIcon, MindmapIcon, QuizIcon } from '../components/Icons';
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BottomNav } from '../components/BottomNav';
import { PageHeader } from '../components/PageHeader';
import { PageIntro } from '../components/PageIntro';
import { Mascot } from '../components/Mascot';
import { analyseLesson, analyseImage, popPendingAnalysis } from '../services/aiService';
import { saveLesson } from '../services/historyService';
import { PremiumModal } from '../components/PremiumModal';
import { MissingLessonState } from '../components/MissingLessonState';
import { CoachChat, CoachEntryCard } from '../components/CoachChat';
import { getScanStatus } from '../services/scanLimitService';
import { subjectInfo, subjectMascot } from '../utils/subjects';
import './Analyse.css';

// ─── Mock de fallback ────────────────────────────────────────────────
const mockLesson = {
  title: 'Théorème de Pythagore',
  subject: 'Maths',
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
  { id: 'resume',     icon: <ResumeIcon />, name: 'Résumé',        tone: 'green',  to: '/resume',     getCount: () => 2,                unit: 'min' },
  { id: 'flashcards', icon: <FlashcardsIcon />, name: 'Flashcards',    tone: 'violet', to: '/flashcards', getCount: l => l.flashcardsCount, unit: 'cartes' },
  { id: 'mindmap',    icon: <MindmapIcon />, name: 'Carte mentale', tone: 'pink',   to: '/mindmap',    getCount: () => null,             unit: null },
  { id: 'quiz',       icon: <QuizIcon />, name: 'Quiz',          tone: 'orange', to: '/quiz',       getCount: l => l.quizCount,       unit: 'questions' },
];

// ─── Écran de chargement ─────────────────────────────────────────────
const STEPS = [
  { id: 'flashcards', icon: <FlashcardsIcon />, name: 'Flashcards',   tone: 'violet', doneAt: 20 },
  { id: 'quiz',       icon: <QuizIcon />, name: 'Quiz',          tone: 'orange', doneAt: 47 },
  { id: 'resume',     icon: <ResumeIcon />, name: 'Résumé',        tone: 'green',  doneAt: 67 },
  { id: 'mindmap',    icon: <MindmapIcon />, name: 'Carte mentale', tone: 'pink',   doneAt: 85 },
];

function getStepState(index, progress) {
  if (progress >= STEPS[index].doneAt) return 'done';
  const prevDone = index === 0 ? true : progress >= STEPS[index - 1].doneAt;
  return prevDone ? 'active' : 'pending';
}

// ─── Composant ────────────────────────────────────────────────────────
export default function Analyse() {
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState(null);
  const [lesson, setLesson]           = useState(null);
  const [progress, setProgress]       = useState(0);
  const [showPremium, setShowPremium] = useState(false);
  const [noLesson, setNoLesson]       = useState(false);
  const [coachOpen, setCoachOpen]     = useState(false);
  const navigate   = useNavigate();
  const { getUserLevel } = useAuth();
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
        showNoLesson();
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
    showNoLesson();
  }, []);

  // Aucune leçon ni scan en cours : état vide honnête en prod — le mock
  // « Pythagore » (avec badge IA) est réservé au dev.
  function showNoLesson() {
    if (import.meta.env.DEV) { useMockFallback(); return; }
    setNoLesson(true);
    setIsLoading(false);
  }

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
  // Id de la leçon courante — posé par saveLesson() / restoreLesson().
  // Absent sur le mock dev : le coach n'a alors pas de contexte serveur.
  const coachLessonId = localStorage.getItem('reviz-current-lesson-id');

  const errorMessages = {
    NON_SCOLAIRE:    { title: "Ça n'a pas l'air d'une leçon", sub: "Réviz ne marche qu'avec des cours et des leçons. Scanne une vraie leçon pour lancer ta séance." },
    RATE_LIMIT:      { title: 'Trop de scans d\'un coup', sub: 'Patiente un petit moment, puis réessaie.' },
    NETWORK_ERROR:   { title: 'Pas de connexion', sub: 'Vérifie ta connexion internet et réessaie.' },
    TIMEOUT:         { title: 'Ça a pris trop de temps', sub: 'Vérifie ta connexion et réessaie.' },
    UNAUTHORIZED:    { title: 'Reconnecte-toi', sub: 'Connexion expirée — reconnecte-toi puis réessaie.' },
    EMAIL_NOT_VERIFIED: { title: 'Confirme ton email d\'abord', sub: 'Pour scanner tes leçons, clique sur le lien qu\'on t\'a envoyé par email. Ça prend 10 secondes, promis !', cta: { label: 'Vérifier mon email', to: '/verify-email' } },
    IMAGE_TOO_LARGE: { title: 'Photo trop lourde', sub: 'Rapproche-toi de ta leçon et reprends la photo, ou recadre-la avant de réessayer.' },
    INVALID_JSON:    { title: 'Oups, ça a coincé', sub: 'Réviz n\'a pas réussi à lire cette leçon. Réessaie de la scanner.' },
    EMPTY_RESPONSE:  { title: 'Oups, ça a coincé', sub: 'Réviz n\'a pas réussi à lire cette leçon. Réessaie de la scanner.' },
    MISSING_API_KEY: { title: 'Oups, ça a coincé', sub: 'Réessaie dans un moment.' },
    INVALID_API_KEY: { title: 'Oups, ça a coincé', sub: 'Réessaie dans un moment.' },
  };
  const errInfo = errorMessages[error] ?? { title: 'Oups, ça a coincé', sub: 'Vérifie ta connexion et réessaie.' };

  if (noLesson) return <MissingLessonState title="Ta leçon" />;

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
          <div className="analyse-ls-title">Réviz prépare<br/>ta séance</div>
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
                  <span className="analyse-ls-emoji">{step.icon}</span>
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
            {errInfo.title}
          </div>
          <p className="analyse-error-sub">
            {errInfo.sub}
          </p>
          {errInfo.cta && (
            <button
              type="button"
              className="rv-btn-cta"
              onClick={() => navigate(errInfo.cta.to)}
            >
              {errInfo.cta.label}
            </button>
          )}
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
        // Retour contextuel : jamais vers la caméra quand on consulte une
        // leçon depuis Home/Cours (Scan démarre getUserMedia au mount).
        onBack={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/cours'))}
      />

      {/* ── Content ── */}
      <div className={`content analyse-content${(isLoading || error) ? ' analyse-content--hidden' : ''}`}>

        {/* Intro façon Home — titre de la leçon, matière, mascotte de la matière */}
        <PageIntro
          title={displayLesson.title}
          sub={`${displayLesson.subject} · choisis ton format`}
          mascot={subjectMascot(displayLesson.subject)}
          mascotSize={140}
          className="analyse-intro"
        />

        {/* Résumé / excerpt */}
        {displayLesson.excerpt && (
          <div className="rv-card rv-card--padded analyse-excerpt-card">
            <div className="analyse-excerpt-label">Résumé détecté</div>
            <p className="analyse-excerpt-text">{displayLesson.excerpt}</p>
          </div>
        )}

        {/* Coach de révision — chat contextuel sur la leçon (Firestore requis
            pour le contexte serveur → pas de coach sur le mock dev sans id). */}
        {lesson && coachLessonId && (
          <CoachEntryCard onClick={() => setCoachOpen(true)} />
        )}

        <div className="analyse-format-grid">
          {formats.map(f => {
            const count = f.getCount(displayLesson);
            return (
              <Link key={f.id} to={f.to} className="rv-card rv-card--link rv-card--padded analyse-format-card">
                <div className="analyse-format-card-top">
                  <div className={`rv-icon-square rv-icon-square--xl rv-icon-square--${f.tone}`}>
                    {f.icon}
                  </div>
                  <span className={`analyse-format-arrow analyse-format-arrow--${f.tone}`}>›</span>
                </div>
                <div className="analyse-format-name">{f.name}</div>
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

      <BottomNav />
      {showPremium && <PremiumModal onClose={() => navigate('/scan')} />}
      {coachOpen && coachLessonId && (
        <CoachChat
          isOpen
          onClose={() => setCoachOpen(false)}
          lessonId={coachLessonId}
          lessonTitle={displayLesson.title}
        />
      )}
    </div>
  );
}
