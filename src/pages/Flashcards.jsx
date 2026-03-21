import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { recordRevision } from '../services/revisionService'
import { getDueCards, updateCardState } from '../services/srsService'
import './Flashcards.css'

// ---- DONNÉES : localStorage (IA) > mock ----
function getFlashcards() {
  try {
    const ai = JSON.parse(localStorage.getItem('reviz-ai-data') || 'null')
    if (ai?.flashcards?.length > 0) return ai.flashcards
  } catch { /* ignore */ }
  return [
    { front: "Qu'énonce le théorème de Pythagore ?", back: "Dans un triangle rectangle, le carré de l'hypoténuse est égal à la somme des carrés des deux autres côtés : a² + b² = c²" },
    { front: "Qu'est-ce que l'hypoténuse ?", back: "Le côté opposé à l'angle droit dans un triangle rectangle. C'est le côté le plus long." },
    { front: "Si a = 3 et b = 4, quelle est la valeur de c ?", back: "c = √(3² + 4²) = √(9 + 16) = √25 = 5. C'est le triangle 3-4-5 !" },
    { front: "Dans quel type de triangle s'applique Pythagore ?", back: "Uniquement dans un triangle rectangle, c'est-à-dire possédant un angle de 90°." },
    { front: "Comment trouver un côté si on connaît l'hypoténuse ?", back: "On isole le côté : a = √(c² - b²). On soustrait le carré du côté connu du carré de l'hypoténuse." },
    { front: "Qu'est-ce que la réciproque du théorème ?", back: "Si a² + b² = c², alors le triangle est rectangle. Elle permet de vérifier si un triangle est rectangle." },
    { front: "Un triangle a des côtés 5, 12 et 13. Est-il rectangle ?", back: "Oui ! 5² + 12² = 25 + 144 = 169 = 13². La réciproque confirme qu'il est rectangle." },
    { front: "Hypoténuse d'un triangle rectangle isocèle de côté 1 ?", back: "c = √(1² + 1²) = √2 ≈ 1,414. C'est une valeur remarquable à connaître." },
  ]
}

function getLessonId() {
  try { return JSON.parse(localStorage.getItem('reviz-ai-data') || 'null')?.lessonId ?? 'default' } catch { return 'default' }
}

export default function Flashcards() {
  useEffect(() => { recordRevision('flashcards') }, [])
  const lessonId   = useMemo(() => getLessonId(), [])
  const rawCards   = getFlashcards()
  const flashcards = useMemo(() => getDueCards(lessonId, rawCards), [lessonId])
  const [current, setCurrent]     = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [gotCount, setGotCount]   = useState(0)
  const [againCount, setAgainCount] = useState(0)
  const [showEnd, setShowEnd]     = useState(false)
  const [animDir, setAnimDir]     = useState(null) // 'got' | 'again'

  const card = flashcards[current]

  function flipCard() { setIsFlipped(prev => !prev) }

  function nextCard(dir) {
    setAnimDir(dir)
    setTimeout(() => {
      const nextIndex = current + 1
      if (nextIndex >= flashcards.length) {
        setShowEnd(true)
      } else {
        setCurrent(nextIndex)
        setIsFlipped(false)
      }
      setAnimDir(null)
    }, 280)
  }

  function handleGot() {
    updateCardState(lessonId, flashcards[current].index ?? current, 'got')
    setGotCount(p => p + 1)
    nextCard('got')
  }
  function handleAgain() {
    updateCardState(lessonId, flashcards[current].index ?? current, 'again')
    setAgainCount(p => p + 1)
    nextCard('again')
  }

  function restartDeck() {
    setCurrent(0); setIsFlipped(false)
    setGotCount(0); setAgainCount(0)
    setShowEnd(false); setAnimDir(null)
  }

  const [shareDone, setShareDone] = useState(false)
  async function handleShare() {
    const title = (() => {
      try { return JSON.parse(localStorage.getItem('reviz-ai-data') || 'null')?.metadata?.title || 'Flashcards' } catch { return 'Flashcards' }
    })()
    const text = flashcards.map((c, i) => `${i + 1}. ${c.front}\n→ ${c.back}`).join('\n\n')
      + '\n\n---\nGénéré avec Réviz'
    try {
      if (navigator.share) {
        await navigator.share({ title, text })
      } else {
        await navigator.clipboard.writeText(text)
        setShareDone(true)
        setTimeout(() => setShareDone(false), 2500)
      }
    } catch { /* annulé */ }
  }

  const xp = gotCount * 5

  return (
    <div className="app">

      {/* ── Écran de fin ── */}
      {showEnd && (
        <div className="end-screen">
          <span className="end-emoji">🎉</span>
          <span className="end-title">Session terminée !</span>
          <p className="end-sub">Tu as parcouru toutes les cartes !</p>
          <div className="end-stats">
            <div className="end-stat">
              <span className="end-stat-value" style={{ color: '#22C55E' }}>{gotCount}</span>
              <span className="end-stat-label">Maîtrisées</span>
            </div>
            <div className="end-stat-divider" />
            <div className="end-stat">
              <span className="end-stat-value" style={{ color: '#EF4444' }}>{againCount}</span>
              <span className="end-stat-label">À revoir</span>
            </div>
            <div className="end-stat-divider" />
            <div className="end-stat">
              <span className="end-stat-value">{flashcards.length}</span>
              <span className="end-stat-label">Total</span>
            </div>
          </div>
          <div className="xp-badge">+{xp} XP gagnés !</div>
          <button className="end-btn primary" onClick={restartDeck}>🔄 Recommencer</button>
          <button className="end-btn" onClick={handleShare}>{shareDone ? '✓ Copié !' : '↗ Partager les cartes'}</button>
          <Link className="end-btn" to="/analyse">← Retour aux formats</Link>
        </div>
      )}

      {/* ── Header ── */}
      <div className="header">
        <Link className="back-btn" to="/analyse">←</Link>
        <div className="header-center">
          <span className="header-title">Flashcards</span>
          <div className="progress-dots">
            {flashcards.map((_, i) => (
              <span
                key={i}
                className={`progress-dot${i < current ? ' done' : i === current ? ' active' : ''}`}
              />
            ))}
          </div>
        </div>
        <div className="header-counter">{current + 1}<span>/{flashcards.length}</span></div>
      </div>

      <div style={{ textAlign: 'center', padding: '4px 0 0' }}><span className="ai-badge">✦ Généré par IA</span></div>

      {/* ── Zone carte ── */}
      <div className="card-area">

        {/* Stack de cartes */}
        <div className={`card-stack-wrap${animDir ? ` anim-${animDir}` : ''}`}>
          <div className="card-stack-bg s2" />
          <div className="card-stack-bg s1" />

          <div className="flip-wrap" onClick={flipCard}>
            <div className={`flip-card${isFlipped ? ' flipped' : ''}`}>

              {/* Recto */}
              <div className="flip-face flip-front">
                <span className="face-tag">Question</span>
                <span className="face-text">{card.front}</span>
                {!isFlipped && (
                  <span className="face-hint">👆 Appuie pour révéler</span>
                )}
              </div>

              {/* Verso */}
              <div className="flip-face flip-back">
                <span className="face-tag">Réponse</span>
                <span className="face-text">{card.back}</span>
              </div>

            </div>
          </div>
        </div>

        {/* Indicateur */}
        <p className="tap-hint">
          {isFlipped ? "Tu t'en souviens ?" : "Lis, puis retourne la carte"}
        </p>

        {/* Boutons d'action */}
        <div className={`actions${isFlipped ? ' visible' : ''}`}>
          <button className="action-btn btn-again" onClick={handleAgain}>
            <span className="btn-icon">✕</span>
            <span>À revoir</span>
          </button>
          <button className="action-btn btn-got" onClick={handleGot}>
            <span className="btn-icon">✓</span>
            <span>Maîtrisé</span>
          </button>
        </div>

      </div>
    </div>
  )
}
