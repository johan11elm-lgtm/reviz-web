import { PageIntro } from '../components/PageIntro'
import { RefreshIcon, ChatIcon, CheckIcon, XIcon } from '../components/Icons'
import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { recordRevision } from '../services/revisionService'
import { PageHeader } from '../components/PageHeader'
import { Mascot } from '../components/Mascot'
import { MissingLessonState } from '../components/MissingLessonState'
import { FormatFeedback } from '../components/FormatFeedback'
import { CoachChat, CoachHeaderButton } from '../components/CoachChat'
import { nbsp } from '../utils/typography'
import { track } from '../services/statsService'
import './Quiz.css'

// ---- DONNÉES : localStorage (IA) > état vide (mock réservé au dev) ----
function getQuestions() {
  try {
    const ai = JSON.parse(localStorage.getItem('reviz-ai-data') || 'null')
    if (ai?.quiz?.length > 0) return ai.quiz
  } catch { /* ignore */ }
  // En prod, pas de leçon = état vide honnête — jamais le mock « Pythagore ».
  if (!import.meta.env.DEV) return null
  return [
    { question: "Dans un triangle rectangle, quel est le côté opposé à l'angle droit ?", choices: ["Le côté adjacent", "L'hypoténuse", "La médiane", "Le côté opposé"], correct: 1, explanation: "L'hypoténuse est toujours le côté le plus long, situé en face de l'angle droit." },
    { question: "Quelle est la formule du théorème de Pythagore ?", choices: ["a + b = c", "a² - b² = c²", "a² + b² = c²", "2a + 2b = c"], correct: 2, explanation: "Le carré de l'hypoténuse (c) est égal à la somme des carrés des deux autres côtés (a et b)." },
    { question: "Dans un triangle rectangle de côtés 3 et 4, quelle est la longueur de l'hypoténuse ?", choices: ["7", "5", "6", "√7"], correct: 1, explanation: "√(3² + 4²) = √(9 + 16) = √25 = 5. C'est le fameux triangle 3-4-5 !" },
    { question: "Le théorème de Pythagore s'applique à quel type de triangle ?", choices: ["Rectangle seulement", "Isocèle seulement", "Équilatéral seulement", "Tous les triangles"], correct: 0, explanation: "Le théorème ne s'applique qu'aux triangles rectangles, qui possèdent un angle de 90°." },
    { question: "Un triangle a des côtés 5, 12 et 13. Est-il rectangle ?", choices: ["Oui, car 5² + 12² = 13²", "Non, car 5 + 12 ≠ 13", "Oui, car c'est le plus grand", "Impossible à savoir"], correct: 0, explanation: "25 + 144 = 169 = 13². La réciproque du théorème confirme qu'il est bien rectangle." },
    { question: "Si l'hypoténuse vaut 10 et un côté vaut 6, quelle est la longueur de l'autre côté ?", choices: ["4", "6", "8", "√136"], correct: 2, explanation: "a = √(10² - 6²) = √(100 - 36) = √64 = 8." },
    { question: "Quelle est la valeur de c si a = 5 et b = 12 ?", choices: ["17", "√119", "√61", "13"], correct: 3, explanation: "c = √(5² + 12²) = √(25 + 144) = √169 = 13." },
    { question: "À quoi sert la réciproque du théorème de Pythagore ?", choices: ["Vérifier si un triangle est rectangle", "Calculer l'aire d'un triangle", "Trouver les angles", "Calculer le périmètre"], correct: 0, explanation: "Si a² + b² = c², alors le triangle est nécessairement rectangle en C." },
  ]
}

const LETTERS = ['A', 'B', 'C', 'D']

function getLessonTitle(fallback = 'Ta leçon') {
  try { return JSON.parse(localStorage.getItem('reviz-ai-data') || 'null')?.metadata?.title || fallback }
  catch { return fallback }
}

// Sous 70 %, l'action principale est de relire le résumé (le texte le dit) ;
// au-dessus, retour à la leçon, où « Ta prochaine étape » propose la suite.
// Jamais de mascotte triste : l'échec n'est pas puni (PRODUCT.md).
function getEndContent(score, total) {
  const pct = score / total
  if (pct >= 0.9) return { mascot: 'examen',      title: 'Excellent',      sub: 'Tu maîtrises ce chapitre.',             relire: false }
  if (pct >= 0.7) return { mascot: 'celebration', title: 'Très bien',      sub: 'Encore quelques points à revoir.',      relire: false }
  if (pct >= 0.5) return { mascot: 'muscu',       title: 'Pas mal',        sub: 'Relis le résumé, puis retente le quiz.', relire: true }
  return           { mascot: 'reading',           title: 'À retravailler', sub: 'Relis le résumé, puis retente le quiz.', relire: true }
}

/* ── Confetti — utilise les accents DS pour cohérence ── */
const CONFETTI_COLORS = ['#FF8A3D', '#FFB347', '#3B6FE8', '#34C77B', '#FF6B9A', '#FFB347']
function Confetti() {
  const pieces = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 1.2,
    duration: 1.8 + Math.random() * 1.4,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    size: 6 + Math.random() * 8,
    rotation: Math.random() * 360,
  }))
  return (
    <div className="quiz-confetti-wrap" aria-hidden="true">
      {pieces.map(p => (
        <div
          key={p.id}
          className="quiz-confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.5,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  )
}

/* ── Score count-up ── */
function useCountUp(target, active) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!active) return
    setCount(0)
    const steps = 30
    const step = target / steps
    let current = 0
    const id = setInterval(() => {
      current += step
      if (current >= target) { setCount(target); clearInterval(id) }
      else setCount(Math.floor(current))
    }, 40)
    return () => clearInterval(id)
  }, [target, active])
  return count
}

export default function Quiz() {
  // Décision stable pour toute la vie du composant (rules-of-hooks safe).
  const [hasData] = useState(() => getQuestions() !== null)
  if (!hasData) return <MissingLessonState title="Quiz" />
  return <QuizSession />
}

function QuizSession() {
  useEffect(() => { recordRevision('quiz') }, [])
  const questions = getQuestions()

  const [current, setCurrent]             = useState(0)
  const [score, setScore]                 = useState(0)
  const [answered, setAnswered]           = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [showEnd, setShowEnd]             = useState(false)
  const [animKey, setAnimKey]             = useState(0)

  // Coach — uniquement sur une vraie leçon (le contexte serveur exige son id).
  const coachLessonId = useMemo(() => localStorage.getItem('reviz-current-lesson-id'), [])
  const lessonTitle   = useMemo(() => getLessonTitle(), [])
  const [coachOpen, setCoachOpen]       = useState(false)
  const [coachPrefill, setCoachPrefill] = useState('')

  function openCoach(prefill = '') {
    setCoachPrefill(prefill)
    setCoachOpen(true)
  }

  const q         = questions[current]
  const isCorrect = answered && selectedIndex === q.correct
  const isLast    = current === questions.length - 1
  const progress  = ((current + 1) / questions.length) * 100
  const showConfetti = showEnd && score / questions.length >= 0.8
  const displayScore = useCountUp(score, showEnd)
  const xp = score * 10

  function selectAnswer(index) {
    if (answered) return
    setAnswered(true)
    setSelectedIndex(index)
    if (index === q.correct) setScore(p => p + 1)
  }

  // Clavier (ordinateur) : 1-4 ou A-D répondent, Entrée / Espace passent.
  useEffect(() => {
    if (showEnd || coachOpen) return undefined
    function onKey(e) {
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      if (!answered) {
        const map = { 1: 0, 2: 1, 3: 2, 4: 3, a: 0, b: 1, c: 2, d: 3 }
        const i = map[String(e.key).toLowerCase()]
        if (i !== undefined && i < (questions[current]?.choices?.length ?? 0)) { e.preventDefault(); selectAnswer(i) }
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault(); nextQuestion()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function nextQuestion() {
    if (current + 1 >= questions.length) {
      setShowEnd(true)
      track('quiz_termine', { source: coachLessonId?.startsWith('prog-') ? 'programme' : 'scan' })
    } else {
      setCurrent(p => p + 1)
      setAnswered(false)
      setSelectedIndex(null)
      setAnimKey(p => p + 1)
    }
  }

  function restartQuiz() {
    setCurrent(0); setScore(0)
    setAnswered(false); setSelectedIndex(null)
    setShowEnd(false); setAnimKey(0)
  }

  function getChoiceClass(i) {
    if (!answered) return 'quiz-choice-btn'
    if (i === q.correct)                        return 'quiz-choice-btn quiz-choice-btn--correct'
    if (i === selectedIndex && i !== q.correct) return 'quiz-choice-btn quiz-choice-btn--wrong'
    return 'quiz-choice-btn quiz-choice-btn--neutral'
  }

  const endContent = getEndContent(score, questions.length)

  // Mascot narratrice — pose le sujet, puis réagit
  let mascotPose = 'thinking'
  if (answered) {
    mascotPose = isCorrect ? 'celebration' : 'sad'
  }

  // Barre de progression sous le sous-titre de l'intro (le compteur est dans le sous-titre)
  const subBar = (
    <div className="quiz-header-sub" role="progressbar" aria-label={`Question ${current + 1} sur ${questions.length}`} aria-valuemin={1} aria-valuemax={questions.length} aria-valuenow={current + 1}>
      <div className="rv-bar quiz-header-bar">
        <div className="rv-bar-fill rv-bar-fill--orange" style={{ width: `${progress}%` }} />
      </div>
    </div>
  )

  // Right slot = score-pill
  const scorePill = (
    <div className="rv-pill rv-pill--green quiz-score-pill">
      <span aria-hidden="true">✓</span>
      <span>{score}</span>
    </div>
  )

  return (
    <div className="app quiz-page">

      {showConfetti && <Confetti />}

      {/* ── Écran de fin ── */}
      {showEnd && (
        <div className="rv-end-screen quiz-end-screen">
          <Mascot
            pose={endContent.mascot}
            size={240}
            glow
            animate
            priority
            className="rv-end-screen-mascot"
            alt=""
            aria-hidden="true"
          />
          <h2 className="rv-end-screen-title">{endContent.title}</h2>
          <p className="rv-end-screen-sub">{endContent.sub}</p>
          <div className="rv-card rv-end-score">
            <div className="rv-end-score-head">
              <span className="rv-end-score-value">{displayScore}<small> / {questions.length}</small></span>
              <span className="rv-end-score-label">{displayScore > 1 ? 'bonnes réponses' : 'bonne réponse'}</span>
            </div>
            <div
              className="rv-bar rv-bar--tall rv-bar--neutral-bg rv-end-score-bar"
              role="progressbar"
              aria-label={`${score} bonnes réponses sur ${questions.length}`}
              aria-valuemin={0}
              aria-valuemax={questions.length}
              aria-valuenow={score}
            >
              <div className={`rv-bar-fill ${score / questions.length >= 0.7 ? 'rv-bar-fill--green' : 'rv-bar-fill--orange'}`} style={{ width: `${Math.round(displayScore / questions.length * 100)}%` }} />
            </div>
            <span className="rv-pill rv-pill--orange rv-end-xp">+{xp} XP</span>
          </div>
          <FormatFeedback format="quiz" question="Ces questions t'ont aidé ?" />
          <div className="rv-end-screen-actions">
            {endContent.relire ? (
              <Link className="rv-btn-cta rv-btn-cta--full" to="/resume">Relire le résumé</Link>
            ) : (
              <Link className="rv-btn-cta rv-btn-cta--full" to="/analyse">Retour à la leçon</Link>
            )}
            <button type="button" className="rv-btn-cta rv-btn-cta--full rv-btn-cta--ghost" onClick={restartQuiz}>
              <span><RefreshIcon /> Recommencer le quiz</span>
            </button>
            {coachLessonId && (
              <button type="button" className="rv-btn-cta rv-btn-cta--full rv-btn-cta--ghost" onClick={() => openCoach()}>
                <ChatIcon /> Encore un doute ? Demande au coach
              </button>
            )}
            {endContent.relire && (
              <Link className="rv-btn-cta rv-btn-cta--full rv-btn-cta--ghost" to="/analyse">Retour à la leçon</Link>
            )}
          </div>
        </div>
      )}

      <PageHeader
        variant="back"
        right={coachLessonId
          ? <><CoachHeaderButton onClick={() => openCoach()} />{scorePill}</>
          : scorePill}
      />

      {/* ── Contenu ── */}
      <div className="content quiz-content">

        {/* Intro façon Home — la mascotte narratrice, juste dessous, reste l'illustration */}
        <PageIntro title="Quiz" sub={`Question ${current + 1} sur ${questions.length} · ${lessonTitle}`} className="quiz-intro rv-page-intro--format">
          {subBar}
        </PageIntro>

        <div className="quiz-ai-row"><span className="ai-badge">✦ Généré par IA</span></div>

        {/* Mascotte narratrice — centrée et dominante, question dans la bulle dessous */}
        <div className="quiz-narrator" key={animKey}>
          <Mascot
            pose={mascotPose}
            size={200}
            glow
            animate
            priority
            className="quiz-narrator-mascot"
            alt=""
            aria-hidden="true"
          />
          <div className="rv-speech-bubble rv-speech-bubble--pointer-top-center quiz-narrator-bubble">
            <span className="quiz-narrator-question">{nbsp(q.question)}</span>
          </div>
        </div>

        {/* Choix */}
        <p className="quiz-kbd-hint" aria-hidden="true"><kbd>1</kbd>–<kbd>4</kbd> répondre · <kbd>Entrée</kbd> question suivante</p>
        <div className="quiz-choices" key={`choices-${animKey}`}>
          {q.choices.map((choice, i) => (
            <button
              type="button"
              key={i}
              className={getChoiceClass(i)}
              onClick={() => selectAnswer(i)}
              disabled={answered}
              aria-pressed={answered ? selectedIndex === i : undefined}
              style={{ animationDelay: `${i * 25}ms` }}
            >
              <span className="quiz-choice-letter">{LETTERS[i]}</span>
              <span className="quiz-choice-text">{choice}</span>
            </button>
          ))}
        </div>

      </div>

      {/* ── Panel de feedback (sheet partagée) — annoncé aux lecteurs d'écran.
             Masquée aussi sur l'écran de fin : la sheet (z-index 80) passerait
             sinon au-dessus de l'end screen (z-index 20). ── */}
      <div
        className={`rv-sheet--bottom quiz-feedback${!answered || showEnd ? ' rv-sheet--bottom-hidden' : ''}${isCorrect ? ' quiz-feedback--correct' : ' quiz-feedback--wrong'}`}
        role="status"
        aria-live="polite"
      >
        <div className="rv-sheet-handle" aria-hidden="true" />
        <div className="quiz-feedback-row">
          <div className={`rv-icon-square rv-icon-square--${isCorrect ? 'green' : 'red'} quiz-feedback-icon`}>
            {isCorrect ? <CheckIcon /> : <XIcon />}
          </div>
          <div className="quiz-feedback-label">
            {isCorrect ? 'Bonne réponse !' : 'Mauvaise réponse'}
          </div>
        </div>
        <p className="quiz-feedback-explanation">{nbsp(q.explanation)}</p>
        {answered && !isCorrect && coachLessonId && (
          <button
            type="button"
            className="quiz-coach-chip"
            onClick={() => openCoach(`Pourquoi la bonne réponse à “${q.question}” est “${q.choices[q.correct]}” ?`)}
          >
            <ChatIcon /> Demande au coach pourquoi
          </button>
        )}
        <button type="button" className="rv-btn-cta rv-btn-cta--full rv-btn-cta--center quiz-next-btn" onClick={nextQuestion}>
          <span>{isLast ? 'Voir mon résultat' : 'Question suivante'}</span>
          <span className="rv-btn-cta-arrow" aria-hidden="true">→</span>
        </button>
      </div>

      {coachOpen && coachLessonId && (
        <CoachChat
          isOpen
          onClose={() => setCoachOpen(false)}
          lessonId={coachLessonId}
          lessonTitle={lessonTitle}
          prefill={coachPrefill}
        />
      )}
    </div>
  )
}
