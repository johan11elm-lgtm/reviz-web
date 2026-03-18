import { useState, useEffect } from 'react'
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

export default function Quiz() {
  useEffect(() => { recordRevision('quiz') }, [])
  const questions = getQuestions()

  const [current, setCurrent]           = useState(0)
  const [score, setScore]               = useState(0)
  const [answered, setAnswered]         = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [showEnd, setShowEnd]           = useState(false)

  const q          = questions[current]
  const isCorrect  = answered && selectedIndex === q.correct
  const isLast     = current === questions.length - 1

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
    }
  }

  function restartQuiz() {
    setCurrent(0); setScore(0)
    setAnswered(false); setSelectedIndex(null); setShowEnd(false)
  }

  function getChoiceClass(i) {
    if (!answered) return 'choice-btn'
    if (i === q.correct)                          return 'choice-btn correct'
    if (i === selectedIndex && i !== q.correct)   return 'choice-btn wrong'
    return 'choice-btn neutral'
  }

  const endContent = getEndContent(showEnd ? score : score, questions.length)
  const xp = score * 10

  return (
    <div className="app">

      {/* ── Écran de fin ── */}
      {showEnd && (
        <div className="end-screen">
          <span className="end-emoji">{endContent.emoji}</span>
          <span className="end-title">{endContent.title}</span>
          <p className="end-sub">{endContent.sub}</p>
          <div className="score-ring">
            <span className="score-big">{score}/{questions.length}</span>
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
          <div className="progress-dots">
            {questions.map((_, i) => (
              <span
                key={i}
                className={`progress-dot${i < current ? ' done' : i === current ? ' active' : ''}`}
              />
            ))}
          </div>
        </div>
        <div className="score-pill">
          <span className="score-pill-icon">✓</span>
          <span>{score}</span>
        </div>
      </div>

      {/* ── Contenu ── */}
      <div className="content">

        {/* Question */}
        <div className="question-card" key={current}>
          <div className="question-num">Question {current + 1}</div>
          <div className="question-text">{q.question}</div>
        </div>

        {/* Choix */}
        <div className="choices">
          {q.choices.map((choice, i) => (
            <button
              key={i}
              className={getChoiceClass(i)}
              onClick={() => selectAnswer(i)}
              disabled={answered}
            >
              <span className="choice-letter">{LETTERS[i]}</span>
              <span className="choice-text">{choice}</span>
            </button>
          ))}
        </div>

      </div>

      {/* ── Panel de feedback (slide depuis le bas) ── */}
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
