import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { recordRevision } from '../services/revisionService'
import { getDueCards, updateCardState } from '../services/srsService'
import { PageHeader } from '../components/PageHeader'
import { Mascot } from '../components/Mascot'
import { MissingLessonState } from '../components/MissingLessonState'
import { FormatFeedback } from '../components/FormatFeedback'
import { CoachChat, CoachHeaderButton } from '../components/CoachChat'
import { nbsp } from '../utils/typography'
import './Flashcards.css'

// ---- DONNÉES : localStorage (IA) > état vide (mock réservé au dev) ----
function getFlashcards() {
  try {
    const ai = JSON.parse(localStorage.getItem('reviz-ai-data') || 'null')
    if (ai?.flashcards?.length > 0) return ai.flashcards
  } catch { /* ignore */ }
  // En prod, pas de leçon = état vide honnête — jamais le mock « Pythagore »
  // affiché sous badge « Généré par IA ».
  if (!import.meta.env.DEV) return null
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
  // Source de vérité partagée avec saveLesson/restoreLesson (historyService) et
  // countDueCards côté Home/Cours. NE PAS lire reviz-ai-data.lessonId : ce champ
  // n'est jamais écrit → toutes les leçons collisionnaient sous la clé 'default'.
  return localStorage.getItem('reviz-current-lesson-id') ?? 'default'
}

function getLessonTitle(fallback = 'Ta leçon') {
  try { return JSON.parse(localStorage.getItem('reviz-ai-data') || 'null')?.metadata?.title || fallback }
  catch { return fallback }
}

export default function Flashcards() {
  // Décision stable pour toute la vie du composant (rules-of-hooks safe).
  const [hasData] = useState(() => getFlashcards() !== null)
  if (!hasData) return <MissingLessonState title="Flashcards" />
  return <FlashcardsSession />
}

function FlashcardsSession() {
  useEffect(() => { recordRevision('flashcards') }, [])
  const lessonId   = useMemo(() => getLessonId(), [])
  const rawCards   = getFlashcards()
  const flashcards = useMemo(() => getDueCards(lessonId, rawCards), [lessonId])
  const [current, setCurrent]       = useState(0)
  const [isFlipped, setIsFlipped]   = useState(false)
  const [gotCount, setGotCount]     = useState(0)
  const [againCount, setAgainCount] = useState(0)
  const [showEnd, setShowEnd]       = useState(false)
  const [animDir, setAnimDir]       = useState(null)  // 'got' | 'again'
  const [streak, setStreak]         = useState(0)     // bonnes réponses consécutives
  const [showStreakBadge, setShowStreakBadge] = useState(false)

  // Coach — uniquement sur une vraie leçon (le contexte serveur exige son id).
  const coachLessonId = useMemo(() => localStorage.getItem('reviz-current-lesson-id'), [])
  const lessonTitle   = useMemo(() => getLessonTitle(), [])
  const [coachOpen, setCoachOpen] = useState(false)

  const card = flashcards[current]

  // Auto-hide streak badge après 1.6s
  useEffect(() => {
    if (showStreakBadge) {
      const t = setTimeout(() => setShowStreakBadge(false), 1600)
      return () => clearTimeout(t)
    }
  }, [showStreakBadge, streak])

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
    const newStreak = streak + 1
    setStreak(newStreak)
    if (newStreak >= 2) setShowStreakBadge(true)
    nextCard('got')
  }
  function handleAgain() {
    updateCardState(lessonId, flashcards[current].index ?? current, 'again')
    setAgainCount(p => p + 1)
    setStreak(0)
    setShowStreakBadge(false)
    nextCard('again')
  }

  function restartDeck() {
    setCurrent(0); setIsFlipped(false)
    setGotCount(0); setAgainCount(0)
    setShowEnd(false); setAnimDir(null)
    setStreak(0); setShowStreakBadge(false)
  }

  const [shareDone, setShareDone] = useState(false)
  async function handleShare() {
    const title = getLessonTitle('Flashcards')
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

  const dots = (
    <div className="flashcards-progress-dots">
      {flashcards.map((_, i) => (
        <span
          key={i}
          className={`flashcards-progress-dot${i < current ? ' done' : i === current ? ' active' : ''}`}
        />
      ))}
    </div>
  )

  const counter = (
    <div className="flashcards-counter">
      {current + 1}<span>/{flashcards.length}</span>
    </div>
  )

  return (
    <div className="app flashcards-page">

      {/* ── Écran de fin ── */}
      {showEnd && (
        <div className="rv-end-screen flashcards-end-screen">
          <Mascot
            pose="celebration"
            size={240}
            glow
            animate
            priority
            className="rv-end-screen-mascot flashcards-end-mascot"
            alt=""
            aria-hidden="true"
          />
          <h2 className="rv-end-screen-title">Session terminée !</h2>
          <p className="rv-end-screen-sub">Tu as parcouru toutes les cartes !</p>
          <div className="flashcards-end-stats rv-card rv-card--padded">
            <div className="flashcards-end-stat">
              <span className="rv-stat-value rv-stat-value--md" style={{ color: 'var(--accent-green)' }}>{gotCount}</span>
              <span className="rv-stat-label">Maîtrisées</span>
            </div>
            <div className="rv-stat-separator" />
            <div className="flashcards-end-stat">
              <span className="rv-stat-value rv-stat-value--md" style={{ color: 'var(--accent-red)' }}>{againCount}</span>
              <span className="rv-stat-label">À revoir</span>
            </div>
            <div className="rv-stat-separator" />
            <div className="flashcards-end-stat">
              <span className="rv-stat-value rv-stat-value--md">{flashcards.length}</span>
              <span className="rv-stat-label">Total</span>
            </div>
          </div>
          <div className="flashcards-xp-badge">+{xp} XP gagnés !</div>
          <FormatFeedback format="flashcards" question="Ces cartes t'ont aidé ?" />
          <div className="rv-end-screen-actions">
            <button type="button" className="rv-btn-cta rv-btn-cta--full" onClick={restartDeck}>
              <span>🔄 Recommencer</span>
            </button>
            <button type="button" className="rv-btn-cta rv-btn-cta--full rv-btn-cta--ghost" onClick={handleShare}>
              {shareDone ? '✓ Copié !' : '↗ Partager les cartes'}
            </button>
            {coachLessonId && (
              <button type="button" className="rv-btn-cta rv-btn-cta--full rv-btn-cta--ghost" onClick={() => setCoachOpen(true)}>
                💬 Encore un doute ? Demande au coach
              </button>
            )}
            <Link className="rv-btn-cta rv-btn-cta--full rv-btn-cta--ghost" to="/analyse">
              ← Retour aux formats
            </Link>
          </div>
        </div>
      )}

      <PageHeader
        variant="back"
        title="Flashcards"
        sub={dots}
        right={coachLessonId
          ? <><CoachHeaderButton onClick={() => setCoachOpen(true)} />{counter}</>
          : counter}
      />

      <div className="flashcards-ai-row"><span className="ai-badge">✦ Généré par IA</span></div>

      {/* ── Streak badge (animé) ── */}
      {showStreakBadge && (
        <div className="flashcards-streak-badge" aria-live="polite">
          🔥 {streak} bonnes d'affilée
        </div>
      )}

      {/* ── Zone carte ── */}
      <div className="flashcards-card-area">

        <div className={`flashcards-stack-wrap${animDir ? ` flashcards-anim-${animDir}` : ''}`}>
          <div className="flashcards-stack-bg flashcards-stack-bg--s2" />
          <div className="flashcards-stack-bg flashcards-stack-bg--s1" />

          <div className="flashcards-flip-wrap" onClick={flipCard}>
            <div className={`flashcards-flip-card${isFlipped ? ' flipped' : ''}`}>

              {/* Recto — Réviz pose la question */}
              <div className="flashcards-flip-face flashcards-flip-front">
                <Mascot
                  pose="flashcard"
                  size={220}
                  glow
                  priority
                  className="flashcards-face-mascot"
                  alt=""
                  aria-hidden="true"
                />
                <span className="flashcards-face-tag">Question</span>
                <span className="flashcards-face-text">{nbsp(card.front)}</span>
                {!isFlipped && current === 0 && (
                  <span className="flashcards-face-hint">👆 Appuie pour révéler</span>
                )}
              </div>

              {/* Verso — Réviz donne la réponse */}
              <div className="flashcards-flip-face flashcards-flip-back">
                <Mascot
                  pose="pointing"
                  size={220}
                  glow
                  animate
                  priority
                  className="flashcards-face-mascot"
                  alt=""
                  aria-hidden="true"
                />
                <span className="flashcards-face-tag">Réponse</span>
                <span className="flashcards-face-text">{nbsp(card.back)}</span>
              </div>

            </div>
          </div>
        </div>

        <div className={`flashcards-actions${isFlipped ? ' visible' : ''}`}>
          <button type="button" className="flashcards-action-btn flashcards-btn-again" onClick={handleAgain}>
            <span className="flashcards-btn-icon">✕</span>
            <span>À revoir</span>
          </button>
          <button type="button" className="flashcards-action-btn flashcards-btn-got" onClick={handleGot}>
            <span className="flashcards-btn-icon">✓</span>
            <span>Maîtrisé</span>
          </button>
        </div>

      </div>

      {coachOpen && coachLessonId && (
        <CoachChat
          isOpen
          onClose={() => setCoachOpen(false)}
          lessonId={coachLessonId}
          lessonTitle={lessonTitle}
        />
      )}
    </div>
  )
}
