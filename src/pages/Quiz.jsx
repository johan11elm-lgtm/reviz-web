import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { recordRevision } from '../services/revisionService'
import { PageHeader } from '../components/PageHeader'
import { Mascot } from '../components/Mascot'
import { MissingLessonState } from '../components/MissingLessonState'
import { FormatFeedback } from '../components/FormatFeedback'
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

function getEndContent(score, total) {
  const pct = score / total
  if (pct >= 0.9) return { mascot: 'examen',      title: 'Excellent !',  sub: 'Tu maîtrises parfaitement ce sujet !' }
  if (pct >= 0.7) return { mascot: 'celebration', title: 'Très bien !',  sub: 'Encore un petit effort et tu seras au top !' }
  if (pct >= 0.5) return { mascot: 'muscu',       title: 'Pas mal !',    sub: 'Relis tes notes et réessaie !' }
  return           { mascot: 'sad',               title: 'À travailler', sub: 'Révise la leçon et retente le quiz !' }
}

/* ── Confetti — utilise les accents DS pour cohérence ── */
const CONFETTI_COLORS = ['#FF8A3D', '#FFB347', '#6B4EFF', '#34C77B', '#FF6B9A', '#FFB347']
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

  const q         = questions[current]
  const isCorrect = answered && selectedIndex === q.correct
  const isLast    = current === questions.length - 1
  const progress  = ((current + (answered ? 1 : 0)) / questions.length) * 100
  const showConfetti = showEnd && score / questions.length >= 0.8
  const displayScore = useCountUp(score, showEnd)
  const xp = score * 10

  function selectAnswer(index) {
    if (answered) return
    setAnswered(true)
    setSelectedIndex(index)
    if (index === q.correct) setScore(p => p + 1)
  }

  function nextQuestion() {
    if (current + 1 >= questions.length) {
      setShowEnd(true)
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

  // Sub du PageHeader = bar + counter
  const subBar = (
    <div className="quiz-header-sub">
      <div className="rv-bar quiz-header-bar">
        <div className="rv-bar-fill rv-bar-fill--orange" style={{ width: `${progress}%` }} />
      </div>
      <span className="quiz-header-counter">{current + 1}/{questions.length}</span>
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
          <div className="quiz-score-ring">
            <span className="quiz-score-big">{displayScore}/{questions.length}</span>
            <span className="quiz-score-small">score</span>
          </div>
          <div className="quiz-xp-badge">+{xp} XP gagnés !</div>
          <FormatFeedback format="quiz" question="Ces questions t'ont aidé ?" />
          <div className="rv-end-screen-actions">
            <button type="button" className="rv-btn-cta rv-btn-cta--full" onClick={restartQuiz}>
              <span>🔄 Recommencer</span>
            </button>
            <Link className="rv-btn-cta rv-btn-cta--full rv-btn-cta--ghost" to="/analyse">
              ← Retour aux formats
            </Link>
          </div>
        </div>
      )}

      <PageHeader
        variant="back"
        title="Quiz"
        sub={subBar}
        right={scorePill}
      />

      {/* ── Contenu ── */}
      <div className="content quiz-content">

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
            <span className="quiz-narrator-eyebrow">Question {current + 1}</span>
            <span className="quiz-narrator-question">{q.question}</span>
          </div>
        </div>

        {/* Choix */}
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

      {/* ── Panel de feedback (sheet partagée) — annoncé aux lecteurs d'écran ── */}
      <div
        className={`rv-sheet--bottom quiz-feedback${!answered ? ' rv-sheet--bottom-hidden' : ''}${isCorrect ? ' quiz-feedback--correct' : ' quiz-feedback--wrong'}`}
        role="status"
        aria-live="polite"
      >
        <div className="rv-sheet-handle" aria-hidden="true" />
        <div className="quiz-feedback-row">
          <div className={`rv-icon-square rv-icon-square--${isCorrect ? 'green' : 'red'} quiz-feedback-icon`}>
            {isCorrect ? '✓' : '✕'}
          </div>
          <div className="quiz-feedback-label">
            {isCorrect ? 'Bonne réponse !' : 'Mauvaise réponse'}
          </div>
        </div>
        <p className="quiz-feedback-explanation">{q.explanation}</p>
        <button type="button" className="rv-btn-cta rv-btn-cta--full quiz-next-btn" onClick={nextQuestion}>
          <span>{isLast ? 'Voir mon résultat' : 'Question suivante'}</span>
          <span className="rv-btn-cta-arrow" aria-hidden="true">→</span>
        </button>
      </div>

    </div>
  )
}
