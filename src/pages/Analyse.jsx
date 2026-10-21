import { ResumeIcon, FlashcardsIcon, MindmapIcon, QuizIcon } from '../components/Icons';
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BottomNav } from '../components/BottomNav';
import { Mascot } from '../components/Mascot';
import { analyseLesson, analyseImage, popPendingAnalysis } from '../services/aiService';
import { LESSON_TEXT_MAX_LABEL } from '../utils/lessonText';
import { isProgrammeLessonId, chapterState } from '../utils/programme';
import { countDueCards, getCardState } from '../services/srsService';
import { loadRevisions, quizScore } from '../services/revisionService';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { saveLesson } from '../services/historyService';
import { PremiumModal } from '../components/PremiumModal';
import { MissingLessonState } from '../components/MissingLessonState';
import { Pantin } from '../components/Pantin';
import { BulleReviz } from '../components/reviz/BulleReviz';
import { Parcours } from '../components/reviz/Parcours';
import { teinteMatiere, varsTeinte as variablesTeinte } from '../utils/teinteMatiere';
import { getScanStatus } from '../services/scanLimitService';
import { track, scanErrorCode } from '../services/statsService';
import { subjectInfo, subjectMascot } from '../utils/subjects';
import { resumeReadingMinutes } from '../utils/resume';
import { nextStep } from '../utils/nextStep';
import '../components/reviz/HerosMatiere.css';
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

const Fleche = ({ taille = 18 }) => (
  <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
const Coche = ({ taille = 13 }) => (
  <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;
const POSE_ETAPE = { '/resume': 'reading', '/flashcards': 'flashcard', '/quiz': 'quiz' };

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

  // ── Où en est l'élève ──
  const total = displayLesson.flashcardsCount ?? 0;
  const avancement = lesson && coachLessonId ? lessonProgress(coachLessonId, total) : null;
  const lessonRevisions = coachLessonId ? loadRevisions().filter(r => r.lessonId === coachLessonId) : [];
  const aOuvert = type => lessonRevisions.some(r => r.type === type);
  const step = nextStep(displayLesson, avancement, aOuvert);
  // À découvrir : rien vu ni ouvert ; maîtrisé : toutes les cartes vues, aucune à revoir.
  const etat = !avancement || (avancement.seen === 0 && lessonRevisions.length === 0) ? 'decouvrir'
    : avancement.state === 'maitrise' ? 'maitrise' : 'encours';
  const sues = avancement ? avancement.seen - avancement.seenDue : 0;
  const aRevoir = avancement?.seenDue ?? 0;
  const pastille = etat === 'decouvrir' ? 'À découvrir'
    : etat === 'maitrise' ? 'Maîtrisé'
    : aRevoir > 0 ? `${pluriel(aRevoir, 'carte')} à travailler`
    : avancement.seen < total ? `${avancement.seen} / ${total} cartes vues` : 'Commencé';

  // Score au quiz (enregistré à la fin du quiz depuis le 21/10).
  const scoreQuiz = coachLessonId ? quizScore(coachLessonId) : null;
  // Ce que dit Réviz : où en est l'élève, et la prochaine action.
  const suite = { '/resume': 'On commence par le résumé ?', '/flashcards': aRevoir > 0 ? 'On revoit tes cartes ?' : 'On finit les flashcards ?', '/quiz': 'Place au quiz ?' }[step.to];
  const lignes = etat === 'decouvrir' ? ['Nouveau chapitre.', 'On commence par le résumé ?']
    : etat === 'maitrise' ? [scoreQuiz ? `${scoreQuiz.dernier.score} sur ${scoreQuiz.dernier.total} au quiz corrigé.` : 'Chapitre maîtrisé.', 'Une révision rapide dans une semaine.']
    : avancement.seen > 0 ? [`${avancement.seen} ${avancement.seen > 1 ? 'cartes' : 'carte'} sur ${total} déjà vues.`, suite]
    : ['Résumé lu.', suite];

  // Ton parcours : Résumé → Flashcards → Quiz.
  const cartesFaites = avancement && total > 0 && avancement.seen === total && aRevoir === 0;
  const faits = { resume: aOuvert('resume') || (avancement?.seen ?? 0) > 0, flashcards: !!cartesFaites, quiz: aOuvert('quiz') };
  const enCours = ['resume', 'flashcards', 'quiz'].find(id => `/${id}` === step.to && !faits[id]) ?? ['resume', 'flashcards', 'quiz'].find(id => !faits[id]);
  const statut = id => (faits[id] ? 'fait' : id === enCours ? 'cours' : 'afaire');
  const etapes = [
    { id: 'resume', nom: 'Résumé', pose: 'reading', to: '/resume', meta: faits.resume ? 'Lu' : `${displayLesson.resumeMinutes ?? 2} min` },
    { id: 'flashcards', nom: 'Flashcards', pose: 'flashcard', to: '/flashcards', meta: avancement?.seen ? `${avancement.seen} / ${total} vues` : pluriel(total, 'carte') },
    { id: 'quiz', nom: 'Quiz corrigé', pose: 'quiz', to: '/quiz', meta: scoreQuiz ? `${scoreQuiz.dernier.score} / ${scoreQuiz.dernier.total}` : faits.quiz ? 'Fait' : pluriel(displayLesson.quizCount ?? 0, 'question') },
  ].map(e => ({ ...e, statut: statut(e.id) }));
  const nbFaites = etapes.filter(e => e.statut === 'fait').length;
  const carteMentaleVue = aOuvert('mindmap');

  const teinte = teinteMatiere(displayLesson.subject);
  const varsTeinte = variablesTeinte(teinte);
  const retour = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate(fromProgramme ? '/programme' : '/cours'));
  const points = displayLesson.keyPoints?.length ? displayLesson.keyPoints : (displayLesson.excerpt ? [displayLesson.excerpt] : []);
  const [parle, setParle] = useState(false);
  const pantin = useRef(null);
  const texte = lignes.join('\n');
  useEffect(() => { if (parle) pantin.current?.dire(texte); }, [texte, parle]);
  // Si le moteur de Réviz ne charge pas, la bulle s'affiche quand même (page visible seulement).
  useEffect(() => {
    let t;
    const essai = () => { t = setTimeout(() => (document.hidden ? essai() : setParle(true)), 4000); };
    essai();
    return () => clearTimeout(t);
  }, []);
  const [question, setQuestion] = useState('');
  const demander = q => navigate(`/coach?lesson=${coachLessonId}`, { state: { question: q } });

  // ── Blocs de la page (le téléphone les empile, l'ordinateur les répartit) ──
  const boutonRetour = (
    <button type="button" className="ch-retour" onClick={retour}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
      {fromProgramme ? 'Programme' : 'Mes leçons'}
    </button>
  );
  const rondMatiere = (
    <span className="ch-matiere" aria-hidden="true"><Mascot pose={subjectMascot(displayLesson.subject)} size={isDesktop ? 92 : 56} alt="" /></span>
  );
  const titres = (
    <>
      <span className="ch-surtitre">{displayLesson.subject} · {fromProgramme ? 'Programme' : 'Leçon scannée'}</span>
      <h1 className="ch-titre">{displayLesson.title}</h1>
      {avancement && <span className={`ch-pastille ch-pastille--${etat}${etat === 'encours' && aRevoir > 0 ? ' ch-pastille--revoir' : ''}`}><i aria-hidden="true" />{pastille}</span>}
    </>
  );
  const reviz = (
    <div className="ch-reviz">
      <BulleReviz key={texte} lignes={lignes} parle={parle} className="ch-bulle" />
      <Pantin
        ref={pantin}
        size={isDesktop ? 320 : 220}
        expression={etat === 'maitrise' ? 'fier' : etat === 'encours' ? 'determine' : 'content'}
        repli={null}
        onEntree={() => setParle(true)}
        onClick={() => pantin.current?.geste('saut')}
        label="Réviz, ta mascotte"
      />
    </div>
  );
  const deco = (
    <>
      <span className="ch-deco ch-deco--a" aria-hidden="true" />
      <span className="ch-deco ch-deco--b" aria-hidden="true" />
      <span className="ch-deco ch-deco--c" aria-hidden="true" />
      {isDesktop && <span className="ch-deco ch-deco--d" aria-hidden="true" />}
      <span className="ch-point" aria-hidden="true" />
      <span className="ch-grain" aria-hidden="true" />
    </>
  );
  const hero = isDesktop ? (
    <div className="ch-hero">
      {deco}
      <div className="ch-hero-int">
        <div className="ch-haut">{boutonRetour}</div>
        <div className="ch-hero-grille">
          <div className="ch-hero-gauche">{rondMatiere}{titres}</div>
          {reviz}
        </div>
      </div>
    </div>
  ) : (
    <div className="ch-hero">
      {deco}
      <div className="ch-haut">{boutonRetour}{rondMatiere}</div>
      {titres}
      {reviz}
    </div>
  );

  const prochaine = (
    <div className="ch-etape-place">
      <Link to={step.to} className="ch-etape">
        <span className="ch-etape-haut">
          <span className="ch-etape-rond" aria-hidden="true"><Mascot pose={POSE_ETAPE[step.to] ?? 'reading'} size={isDesktop ? 60 : 52} alt="" /></span>
          <span className="ch-etape-txt">
            <span className="ch-etape-surtitre">Prochaine étape</span>
            <span className="ch-etape-titre">{step.title}</span>
            <span className="ch-etape-sous">{step.sub}</span>
          </span>
          {isDesktop
            ? <span className="ch-etape-cta">{step.action}<Fleche /></span>
            : <span className="ch-etape-go" aria-hidden="true"><Fleche /></span>}
        </span>
        {etat === 'encours' && total > 0 && total <= 16 && (
          <span className="ch-segments-bloc" aria-hidden="true">
            <span className="ch-segments">
              {Array.from({ length: total }, (_, i) => (
                <i key={i} className={i < sues ? 'ch-seg--sue' : i < sues + aRevoir ? 'ch-seg--revoir' : ''} />
              ))}
            </span>
            <span className="ch-legende">
              {sues > 0 && <span><i className="ch-seg--sue" />{pluriel(sues, 'sue')}</span>}
              {aRevoir > 0 && <span><i className="ch-seg--revoir" />{aRevoir} à revoir</span>}
              {total - sues - aRevoir > 0 && <span><i />{total - sues - aRevoir} à voir</span>}
            </span>
          </span>
        )}
      </Link>
    </div>
  );

  const blocParcours = (
    <section className="ch-bloc" aria-labelledby="ch-parcours">
      <div className="ch-tete">
        <h2 id="ch-parcours" className="ch-titre2">Ton parcours</h2>
        <span className="ch-compte">{nbFaites} / 3</span>
      </div>
      <Parcours etapes={etapes} grand={isDesktop} />
      <Link to="/mindmap" className="ch-pilule">
        <span className="ch-pilule-rond ch-pilule-rond--lavande" aria-hidden="true"><Mascot pose="thinking" size={46} alt="" /></span>
        <span className="ch-pilule-txt">
          <span className="ch-pilule-titre">Carte mentale</span>
          <span className="ch-pilule-sous">{isDesktop ? 'Tout le chapitre sur une page, à ouvrir quand tu veux' : 'Tout le chapitre sur une page'}</span>
        </span>
        {carteMentaleVue
          ? <span className="ch-pilule-coche" aria-label="vue"><Coche taille={14} /></span>
          : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6E675B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>}
      </Link>
    </section>
  );

  const blocEssentiel = points.length > 0 && (
    <section className="ch-bloc" aria-labelledby="ch-essentiel">
      <div className="ch-tete">
        <h2 id="ch-essentiel" className="ch-titre2">L’essentiel</h2>
        <span className="ch-pilule-rond" aria-hidden="true"><Mascot pose="writing" size={46} alt="" /></span>
      </div>
      <ol className="ch-points">
        {points.map((pt, i) => (
          <li key={i}><span className="ch-point-num">{i + 1}</span><span className="ch-point-txt">{pt}</span></li>
        ))}
      </ol>
    </section>
  );

  // Réviz IA : le coach passe par une API authentifiée, pas d'accès en mode essai.
  const iaDispo = lesson && coachLessonId && !isGuest;
  const suggestions = [
    displayLesson.keyPoints?.[0] && `Explique-moi autrement : ${displayLesson.keyPoints[0].replace(/\.$/, '')}`,
    'Donne-moi un exemple corrigé',
  ].filter(Boolean);
  const blocIA = iaDispo && (isDesktop ? (
    <section className="ch-ia-carte" aria-labelledby="ch-ia">
      <div className="ch-ia-tete">
        <span className="ch-ia-anneau" aria-hidden="true"><span><Mascot pose="coach" size={44} alt="" /></span></span>
        <span>
          <h2 id="ch-ia" className="ch-ia-titre">Une question ?</h2>
          <span className="ch-ia-sous">Réviz IA répond sur ce chapitre.</span>
        </span>
      </div>
      <div className="ch-ia-suggestions">
        {suggestions.map(q => <button key={q} type="button" className="ch-ia-suggestion" onClick={() => demander(q)}>{q}</button>)}
      </div>
      <form className="ch-ia-champ" onSubmit={e => { e.preventDefault(); if (question.trim()) demander(question.trim()); }}>
        <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Pose ta question…" aria-label="Ta question à Réviz IA" />
        <button type="submit" aria-label="Envoyer à Réviz IA" disabled={!question.trim()}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6" /></svg>
        </button>
      </form>
    </section>
  ) : (
    <Link to={`/coach?lesson=${coachLessonId}`} className="ch-pilule ch-pilule--ia">
      <span className="ch-ia-anneau" aria-hidden="true"><span><Mascot pose="coach" size={38} alt="" /></span></span>
      <span className="ch-pilule-txt">
        <span className="ch-pilule-titre">Poser une question à Réviz IA</span>
        <span className="ch-pilule-sous">Sur ce chapitre</span>
      </span>
      <span className="ch-ia-go" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M6 11l6-6 6 6" /></svg>
      </span>
    </Link>
  ));

  if (noLesson) return <MissingLessonState title="Ta leçon" />;

  return (
    <div className={`app app--no-halo analyse-page ch-page${isDesktop ? ' app--large ch-page--large' : ''}`}>

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

      <div className={`content analyse-content ch-defile${(isLoading || error) ? ' analyse-content--hidden' : ''}`} style={varsTeinte}>
        {hero}
        {prochaine}
        {isDesktop ? (
          <div className={`ch-grille${blocIA ? ' ch-grille--ia' : ''}`}>
            <div className="ch-col">{blocParcours}{blocEssentiel}</div>
            {blocIA && <aside className="ch-col">{blocIA}</aside>}
          </div>
        ) : (
          <div className="ch-pile">
            {blocParcours}
            {blocEssentiel}
            {blocIA}
          </div>
        )}
      </div>

      <BottomNav />
      {showPremium && <PremiumModal onClose={() => navigate('/scan')} />}
    </div>
  );
}
