import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { recordRevision } from '../services/revisionService'
import './Quiz.css'

// ---- DONNÉES : localStorage (IA) > mock ----
function getQuestions() {
  try {
    const ai = JSON.parse(localStorage.getItem('reviz-ai-data') || 'null')
    if (ai?.quiz?.length > 0) return ai.quiz
  } catch { /* ignore */ }
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
  if (pct >= 0.9) return { emoji: '🏆', title: 'Excellent !',   sub: 'Tu maîtrises parfaitement ce sujet !' }
  if (pct >= 0.7) return { emoji: '🎉', title: 'Très bien !',   sub: 'Encore un petit effort et tu seras au top !' }
  if (pct >= 0.5) return { emoji: '💪', title: 'Pas mal !',     sub: 'Relis tes notes et réessaie !' }
  return           { emoji: '📚', title: 'À travailler…',       sub: 'Révise la leçon et retente le quiz !' }
}

/* ── Confetti ── */
const CONFETTI_COLORS = ['#FF6B00','#FFB347','#6C63FF','#22C55E','#FF3B7F','#00C07F','#FDE047']
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
    <div className="confetti-wrap" aria-hidden="true">
      {pieces.map(p => (
        <div
          key={p.id}
          className="confetti-piece"
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
  useEffect(() => { recordRevision('quiz') }, [])
  const questions = getQuestions()

  const [current, setCurrent]             = useState(0)
  const [score, setScore]                 = useState(0)
  const [answered, setAnswered]           = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [showEnd, setShowEnd]             = useState(false)
  const [animKey, setAnimKey]             = useState(0)   // force re-mount pour animation

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
    if (!answered) return 'choice-btn'
    if (i === q.correct)                        return 'choice-btn correct'
    if (i === selectedIndex && i !== q.correct) return 'choice-btn wrong'
    return 'choice-btn neutral'
  }

  const endContent = getEndContent(score, questions.length)

  return (
    <div className="app">

      {/* ── Confetti ── */}
      {showConfetti && <Confetti />}

      {/* ── Écran de fin ── */}
      {showEnd && (
        <div className="end-screen end-anim">
          <span className="end-emoji">{endContent.emoji}</span>
          <span className="end-title">{endContent.title}</span>
          <p className="end-sub">{endContent.sub}</p>
          <div className="score-ring">
            <span className="score-big">{displayScore}/{questions.length}</span>
            <span className="score-small">score</span>
          </div>
          <div className="xp-badge">+{xp} XP gagnés !</div>
          <button className="end-btn primary" onClick={restartQuiz}>🔄 Recommencer</button>
          <Link className="end-btn" to="/analyse">← Retour aux formats</Link>
        </div>
      )}

      {/* ── Header ── */}
      <div className="header">
        <Link className="back-btn" to="/analyse">←</Link>
        <div className="header-center">
          <span className="header-title">Quiz</span>
          {/* Barre de progression */}
          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="progress-label">{current + 1} / {questions.length}</span>
        </div>
        <div className="score-pill">
          <span className="score-pill-icon">✓</span>
          <span>{score}</span>
        </div>
      </div>

      {/* ── Contenu ── */}
      <div className="content">

        <div style={{ textAlign: 'center', padding: '0 0 4px' }}><span className="ai-badge">✦ Généré par IA</span></div>

        {/* Question — re-mount via key pour déclencher animation */}
        <div className="question-card" key={animKey}>
          <div className="question-num">Question {current + 1}</div>
          <div className="question-text">{q.question}</div>
        </div>

        {/* Choix */}
        <div className="choices" key={`choices-${animKey}`}>
          {q.choices.map((choice, i) => (
            <button
              key={i}
              className={getChoiceClass(i)}
              onClick={() => selectAnswer(i)}
              disabled={answered}
              style={{ animationDelay: `${i * 25}ms` }}
            >
              <span className="choice-letter">{LETTERS[i]}</span>
              <span className="choice-text">{choice}</span>
            </button>
          ))}
        </div>

      </div>

      {/* ── Panel de feedback ── */}
      <div className={`feedback-panel${answered ? ' visible' : ''}${answered ? (isCorrect ? ' panel-correct' : ' panel-wrong') : ''}`}>
        <div className="panel-row">
          <div className={`panel-icon${isCorrect ? ' icon-correct' : ' icon-wrong'}`}>
            {isCorrect ? '✓' : '✕'}
          </div>
          <div className="panel-label">
            {isCorrect ? 'Bonne réponse !' : 'Mauvaise réponse.'}
          </div>
        </div>
        <p className="panel-explanation">{q.explanation}</p>
        <button className="next-btn" onClick={nextQuestion}>
          {isLast ? 'Voir mon résultat →' : 'Question suivante →'}
        </button>
      </div>

    </div>
  )
}
