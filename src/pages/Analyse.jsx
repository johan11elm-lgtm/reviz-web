import { ResumeIcon, FlashcardsIcon, MindmapIcon, QuizIcon } from '../components/Icons';
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BottomNav } from '../components/BottomNav';
import { Mascot } from '../components/Mascot';
import { analyseLesson, analyseImage, popPendingAnalysis } from '../services/aiService';
import { LESSON_TEXT_MAX_LABEL } from '../utils/lessonText';
import { isProgrammeLessonId, chapterState, CHAPTER_STATE_LABEL } from '../utils/programme';
import { countDueCards, getCardState } from '../services/srsService';
import { loadRevisions } from '../services/revisionService';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { saveLesson } from '../services/historyService';
import { PremiumModal } from '../components/PremiumModal';
import { MissingLessonState } from '../components/MissingLessonState';
import { CoachEntryCard } from '../components/CoachChat';
import { getScanStatus } from '../services/scanLimitService';
import { track, scanErrorCode } from '../services/statsService';
import { subjectInfo, subjectMascot } from '../utils/subjects';
import { resumeReadingMinutes } from '../utils/resume';
import { nextStep } from '../utils/nextStep';
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
    keyPoints:       data.resume?.keyPoints ?? [],
    resumeMinutes:   resumeReadingMinutes(data.resume),
  };
}

/** Avancement de l'élève sur la leçon (cartes vues, à revoir, séances). */
function lessonProgress(lessonId, total) {
  // seenDue : cartes déjà vues et arrivées à échéance (countDueCards compte
  // aussi les jamais vues, d'où ce second compte pour « Revois tes cartes »).
  let seen = 0, seenDue = 0;
  const now = Date.now();
  for (let i = 0; i < total; i++) {
    const card = getCardState(lessonId, i);
    if (!card) continue;
    seen++;
    if (!card.nextReview || card.nextReview <= now) seenDue++;
  }
  const due = countDueCards(lessonId, total);
  const sessions = loadRevisions().filter(r => r.lessonId === lessonId);
  return {
    seen,
    due,
    seenDue,
    sessions: sessions.length,
    last: sessions[0]?.revisedAt ?? null,
    state: chapterState({ lesson: true, dueCards: due, reviewedCards: seen }),
  };
}

function formatDay(ts) {
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return 'hier';
  return `il y a ${days} jours`;
}

// ─── Formats de révision ─────────────────────────────────────────────
// Refonte du 20/10 : chaque format a sa mascotte sur un aplat pastel.
const formats = [
  { id: 'resume',     pose: 'reading',   fond: '#DCF5E6', name: 'Résumé',        to: '/resume',     getCount: l => l.resumeMinutes ?? 2, unit: 'min' },
  { id: 'flashcards', pose: 'flashcard', fond: '#E4E0FA', name: 'Flashcards',    to: '/flashcards', getCount: l => l.flashcardsCount, unit: 'cartes' },
  { id: 'mindmap',    pose: 'writing',   fond: '#FFE0EA', name: 'Carte mentale', to: '/mindmap',    getCount: () => null,             unit: null },
  { id: 'quiz',       pose: 'quiz',      fond: '#FFE6D2', name: 'Quiz',          to: '/quiz',       getCount: l => l.quizCount,       unit: 'questions' },
];

// Aplat du héros selon la matière (mêmes tons que l'accueil).
function aplatMatiere(subject = '') {
  const s = subject.toLowerCase();
  if (/math/.test(s)) return ['#FFB37A', '#FFC596'];
  if (/fran|philo/.test(s)) return ['#C9C2F2', '#D8D2F7'];
  if (/hist|géo|geo|emc/.test(s)) return ['#FFC9A8', '#FFDAC4'];
  if (/svt|bio|vie/.test(s)) return ['#B9E8C9', '#D3F1DD'];
  if (/phys|chim|techno|nsi/.test(s)) return ['#FFC2D4', '#FFD6E2'];
  if (/angl|espa|allem|langue|lv/.test(s)) return ['#C9C2F2', '#D8D2F7'];
  return ['#FFB37A', '#FFC596'];
}

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
  const navigate   = useNavigate();
  const isDesktop  = useIsDesktop();
  const { getUserLevel, isGuest } = useAuth();
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
        track('scan_reussi', { source: 'texte' });
      })
      .catch(err => {
        setError(err.message);
        setIsLoading(false);
        track('scan_erreur', { code: scanErrorCode(err?.message), source: 'texte' });
      });
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
        track('scan_reussi', { source: 'photo' });
      })
      .catch(err => {
        setError(err.message);
        setIsLoading(false);
        track('scan_erreur', { code: scanErrorCode(err?.message), source: 'photo' });
      });
  }

  function useMockFallback() {
    const timer = setTimeout(() => { setLesson(mockLesson); setIsLoading(false); }, 2000);
    return () => clearTimeout(timer);
  }

  const displayLesson = lesson || mockLesson;
  // Id de la leçon courante — posé par saveLesson() / restoreLesson().
  // Absent sur le mock dev : le coach n'a alors pas de contexte serveur.
  const coachLessonId = localStorage.getItem('reviz-current-lesson-id');
  // Chapitre du programme (pas de scan) : textes adaptés.
  const fromProgramme = isProgrammeLessonId(coachLessonId);

  const errorMessages = {
    NON_SCOLAIRE:    { title: "Ça n'a pas l'air d'une leçon", sub: "Réviz ne marche qu'avec des cours et des leçons. Scanne une vraie leçon pour lancer ta séance." },
    RATE_LIMIT:      { title: 'Trop de scans d\'un coup', sub: 'Patiente un petit moment, puis réessaie.' },
    NETWORK_ERROR:   { title: 'Pas de connexion', sub: 'Vérifie ta connexion internet et réessaie.' },
    TIMEOUT:         { title: 'Ça a pris trop de temps', sub: 'Vérifie ta connexion et réessaie.' },
    UNAUTHORIZED:    { title: 'Reconnecte-toi', sub: 'Connexion expirée — reconnecte-toi puis réessaie.' },
    EMAIL_NOT_VERIFIED: { title: 'Confirme ton email d\'abord', sub: 'Pour scanner tes leçons, clique sur le lien qu\'on t\'a envoyé par email. Ça prend 10 secondes, promis !', cta: { label: 'Vérifier mon email', to: '/verify-email' } },
    TEXT_TOO_LONG:   { title: 'Leçon trop longue', sub: `Réviz lit jusqu'à ${LESSON_TEXT_MAX_LABEL} caractères d'un coup. Raccourcis ton texte, ou découpe ta leçon en deux scans.`, cta: { label: 'Modifier mon texte', to: '/scan?mode=texte' } },
    IMAGE_TOO_LARGE: { title: 'Photo trop lourde', sub: 'Rapproche-toi de ta leçon et reprends la photo, ou recadre-la avant de réessayer.' },
    INVALID_JSON:    { title: 'Oups, ça a coincé', sub: 'Réviz n\'a pas réussi à lire cette leçon. Réessaie de la scanner.' },
    EMPTY_RESPONSE:  { title: 'Oups, ça a coincé', sub: 'Réviz n\'a pas réussi à lire cette leçon. Réessaie de la scanner.' },
    MISSING_API_KEY: { title: 'Oups, ça a coincé', sub: 'Réessaie dans un moment.' },
    INVALID_API_KEY: { title: 'Oups, ça a coincé', sub: 'Réessaie dans un moment.' },
  };
  const errInfo = errorMessages[error] ?? { title: 'Oups, ça a coincé', sub: 'Vérifie ta connexion et réessaie.' };

  // ── Blocs de la page (le téléphone les empile, l'ordinateur les répartit) ──
  const excerptCard = (
    <>
      {/* Résumé / excerpt */}
      {displayLesson.excerpt && (
        <div className="rv-card rv-card--padded analyse-excerpt-card">
          <span className="rv-eyebrow">{fromProgramme ? "L'essentiel du chapitre" : 'En bref'}</span>
          <p className="analyse-excerpt-text">{displayLesson.excerpt}</p>
        </div>
      )}
    </>
  );
  const coachCard = (
    <>
      {/* Coach de révision — chat contextuel sur la leçon (Firestore requis
          pour le contexte serveur → pas de coach sur le mock dev sans id). */}
      {lesson && coachLessonId && !isGuest && (
        <CoachEntryCard onClick={() => navigate(`/coach?lesson=${coachLessonId}`)} />
      )}
    </>
  );
  const formatGrid = (
    <div className="anl-formats">
      {formats.map(f => {
        const count = f.getCount(displayLesson);
        return (
          <Link key={f.id} to={f.to} className="anl-format">
            <span className="anl-format-rond" style={{ background: f.fond }} aria-hidden="true">
              <Mascot pose={f.pose} size={isDesktop ? 76 : 58} alt="" />
            </span>
            <span className="anl-format-txt">
              <span className="anl-format-nom">{f.name}</span>
              <span className="anl-format-meta">{count !== null ? `${count} ${f.unit}` : "Vue d'ensemble"}</span>
            </span>
          </Link>
        );
      })}
    </div>
  );

  // Avancement de l'élève : la carte « Ta prochaine étape » (et, sur
  // ordinateur, le détail dans « Ton avancement »).
  const avancement = lesson && coachLessonId
    ? lessonProgress(coachLessonId, displayLesson.flashcardsCount ?? 0)
    : null;
  const lessonRevisions = coachLessonId ? loadRevisions().filter(r => r.lessonId === coachLessonId) : [];
  const step = nextStep(displayLesson, avancement, type => lessonRevisions.some(r => r.type === type));
  const total = displayLesson.flashcardsCount ?? 0;
  const nextCard = (
    <Link to={step.to} className="rv-next">
      <span className="rv-eyebrow">Ta prochaine étape</span>
      <span className="rv-next-title">{step.title}</span>
      <span className="rv-next-sub">{step.sub}</span>
      {avancement && avancement.seen > 0 && total > 0 && (
        <span className="rv-next-progress">
          <span className="rv-next-progress-row">
            <span>{avancement.seen} / {total} cartes vues</span>
            {avancement.seenDue > 0 && <span>{avancement.seenDue} à revoir</span>}
          </span>
          <span className="rv-next-bar" aria-hidden="true">
            <span style={{ width: `${Math.round(avancement.seen / total * 100)}%` }} />
          </span>
        </span>
      )}
      <span className="rv-next-action">
        {step.action}
        <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
  const formatsSection = (
    <>
      <h2 className="anl-titre2">Choisis ton format</h2>
      {formatGrid}
    </>
  );

  // Héros : aplat de la matière, titre, état, mascotte de la matière.
  const [aplat, bulle] = aplatMatiere(displayLesson.subject);
  const etat = avancement
    ? (avancement.due > 0 && avancement.seen > 0 ? `${avancement.due} à travailler` : CHAPTER_STATE_LABEL[avancement.state])
    : null;
  const retour = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate(fromProgramme ? '/programme' : '/cours'));
  const boutonRetour = (
    <button type="button" className="anl-retour" onClick={retour} aria-label="Retour">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
    </button>
  );
  const hero = (
    <div className="anl-hero" style={{ background: aplat, '--anl-bulle': bulle }}>
      <span className="anl-bulle anl-bulle--a" aria-hidden="true" />
      <span className="anl-bulle anl-bulle--b" aria-hidden="true" />
      <span className="anl-grain" aria-hidden="true" />
      {!isDesktop && <div className="anl-hero-haut">{boutonRetour}</div>}
      <Mascot pose={subjectMascot(displayLesson.subject)} size={isDesktop ? 300 : 220} priority alt="" aria-hidden="true" className="anl-hero-mascotte" />
      <div className="anl-hero-txt">
        <span className="anl-surtitre">{displayLesson.subject} · {fromProgramme ? 'Programme' : 'Leçon scannée'}</span>
        <h1 className={`anl-titre${displayLesson.title.length > 24 ? ' anl-titre--long' : ''}`}>{displayLesson.title}</h1>
        {etat && <span className="anl-etat">{etat}</span>}
        {isDesktop && (
          <>
            <span className="anl-flex" />
            <Link to={step.to} className="anl-cta">{step.action}</Link>
          </>
        )}
      </div>
    </div>
  );

  if (noLesson) return <MissingLessonState title="Ta leçon" />;

  return (
    <div className="app app--no-halo analyse-page">

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

      <div className={`content analyse-content anl-content${(isLoading || error) ? ' analyse-content--hidden' : ''}`}>
        {isDesktop ? (
          <div className="anl-desk">
            <div className="anl-desk-gauche">
              <div className="anl-fil">
                {boutonRetour}
                <span>{fromProgramme ? 'Programme' : 'Mes leçons'} › {displayLesson.subject}{fromProgramme && userLevel?.classe ? ` › ${userLevel.classe.replace('ème', 'e')}` : ''}</span>
              </div>
              {hero}
              {formatsSection}
              {coachCard}
            </div>
            <aside className="anl-desk-droite">
              <div className="anl-carte">
                <h2 className="anl-titre2">L'essentiel</h2>
                {displayLesson.keyPoints?.length > 0 ? (
                  <ul className="anl-points">
                    {displayLesson.keyPoints.map(k => <li key={k}>{k}</li>)}
                  </ul>
                ) : displayLesson.excerpt && <p className="anl-extrait">{displayLesson.excerpt}</p>}
                {avancement && (
                  <div className="anl-avancement">
                    <div className="anl-avancement-ligne"><span>Cartes vues</span><b>{avancement.seen} / {displayLesson.flashcardsCount}</b></div>
                    <span className="anl-barre" aria-hidden="true">
                      <span style={{ width: `${displayLesson.flashcardsCount ? Math.round(avancement.seen / displayLesson.flashcardsCount * 100) : 0}%` }} />
                    </span>
                    <div className="anl-avancement-ligne"><span>À travailler aujourd'hui</span><b>{avancement.due} carte{avancement.due > 1 ? 's' : ''}</b></div>
                    <div className="anl-avancement-ligne"><span>Séances</span><b>{avancement.sessions}{avancement.last ? ` · la dernière ${formatDay(avancement.last)}` : ''}</b></div>
                  </div>
                )}
              </div>
            </aside>
          </div>
        ) : (
          <>
            {hero}
            <div className="anl-pile">
              {formatsSection}
              {nextCard}
              {coachCard}
              {excerptCard}
            </div>
          </>
        )}
      </div>

      <BottomNav />
      {showPremium && <PremiumModal onClose={() => navigate('/scan')} />}
    </div>
  );
}
