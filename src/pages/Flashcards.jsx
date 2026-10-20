import { RefreshIcon, ChatIcon, FlameIcon } from '../components/Icons'
import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { recordRevision } from '../services/revisionService'
import { getDueCards, updateCardState, joursAvantRetour } from '../services/srsService'
import { useNavigate } from 'react-router-dom'
import { Pantin } from '../components/Pantin'
import { MissingLessonState } from '../components/MissingLessonState'
import { FormatFeedback } from '../components/FormatFeedback'
import { CoachChat, CoachHeaderButton } from '../components/CoachChat'
import { nbsp } from '../utils/typography'
import { useIsDesktop } from '../hooks/useMediaQuery'
import './Flashcards.css'
import { mesurer } from '../services/mesure'

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

function getLessonSubject() {
  try { return JSON.parse(localStorage.getItem('reviz-ai-data') || 'null')?.metadata?.subject || '' }
  catch { return '' }
}

// Taille du texte selon sa longueur : une réponse courte s'affiche en très grand.
function tailleQuestion(t = '') { return t.length <= 60 ? 'xl' : t.length <= 110 ? 'l' : 'm' }
function tailleReponse(t = '') { return t.length <= 28 ? 'xxl' : t.length <= 90 ? 'l' : 'm' }
const quand = j => (j <= 1 ? 'demain' : `dans ${j} jours`)

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
  const isDesktop  = useIsDesktop()
  useEffect(() => { recordRevision('flashcards'); mesurer('format_ouvert', { format: 'flashcards' }) }, [])
  const lessonId   = useMemo(() => getLessonId(), [])
  const rawCards   = getFlashcards()
  const flashcards = useMemo(() => getDueCards(lessonId, rawCards), [lessonId])
  const [current, setCurrent]       = useState(0)
  const navigate = useNavigate()
  const [precedente, setPrecedente] = useState(null) // réponse donnée à la carte d'avant
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
    setPrecedente(dir === 'got' ? 'Je sais' : 'À revoir')
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
  // Clavier (ordinateur) : Espace / Entrée retourne, ← « encore », → « acquis ».
  useEffect(() => {
    if (showEnd || coachOpen) return undefined
    function onKey(e) {
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flipCard() }
      else if (e.key === 'ArrowLeft' || e.key === '1') { e.preventDefault(); handleAgain() }
      else if (isFlipped && (e.key === 'ArrowDown' || e.key === '2')) { e.preventDefault(); handlePresque() }
      else if (e.key === 'ArrowRight' || e.key === '3') { e.preventDefault(); handleGot() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function handlePresque() {
    updateCardState(lessonId, flashcards[current].index ?? current, 'presque')
    setGotCount(p => p + 1)
    setStreak(0)
    setShowStreakBadge(false)
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

  const segments = (
    <div className="fc-segments" aria-hidden="true">
      {flashcards.map((_, i) => <span key={i} className={i <= current ? 'fc-seg fc-seg--fait' : 'fc-seg'} />)}
    </div>
  )
  const matiere = getLessonSubject()
  const idx = card ? (card.index ?? current) : 0
  const retour = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/analyse'))

  return (
    <div className={`app app--no-halo flashcards-page${isFlipped ? ' fc-page--verso' : ''}`}>

      {/* ── Écran de fin ── */}
      {showEnd && (
        <div className="rv-end-screen flashcards-end-screen">
          {/* Réviz en vrai : fier, il saute quand la série est finie. */}
          <Pantin
            size={240}
            expression={againCount === 0 ? 'fier' : 'content'}
            entree={againCount === 0 ? 'saut' : 'coucou'}
            repli="celebration"
            className="rv-end-screen-mascot flashcards-end-mascot"
          />
          <h2 className="rv-end-screen-title">Série terminée</h2>
          <p className="rv-end-screen-sub">
            {againCount === 0
              ? 'Toutes les cartes sont maîtrisées.'
              : `${againCount} carte${againCount > 1 ? 's' : ''} à revoir, elles reviendront en priorité.`}
          </p>
          <div className="flashcards-end-stats rv-card rv-card--padded">
            <div className="flashcards-end-stat">
              <span className="rv-stat-value rv-stat-value--md" style={{ color: 'var(--accent-green)' }}>{gotCount}</span>
              <span className="rv-stat-label">Maîtrisées</span>
            </div>
            <div className="rv-stat-separator" />
            <div className="flashcards-end-stat">
              <span className="rv-stat-value rv-stat-value--md" style={{ color: 'var(--accent-orange-ink)' }}>{againCount}</span>
              <span className="rv-stat-label">À revoir</span>
            </div>
            <div className="rv-stat-separator" />
            <div className="flashcards-end-stat">
              <span className="rv-stat-value rv-stat-value--md">{flashcards.length}</span>
              <span className="rv-stat-label">Total</span>
            </div>
          </div>
          <span className="rv-pill rv-pill--orange rv-end-xp">+{xp} XP</span>
          <FormatFeedback format="flashcards" question="Ces cartes t'ont aidé ?" />
          {/* Les cartes à revoir reviennent toutes seules (répétition espacée) :
              l'action principale est de revenir à la leçon, où « Ta prochaine
              étape » propose la suite. */}
          <div className="rv-end-screen-actions">
            <Link className="rv-btn-cta rv-btn-cta--full" to="/analyse">Retour à la leçon</Link>
            <button type="button" className="rv-btn-cta rv-btn-cta--full rv-btn-cta--ghost" onClick={restartDeck}>
              <span><RefreshIcon /> Recommencer</span>
            </button>
            <button type="button" className="rv-btn-cta rv-btn-cta--full rv-btn-cta--ghost" onClick={handleShare}>
              {shareDone ? '✓ Copié !' : '↗ Partager les cartes'}
            </button>
            {coachLessonId && (
              <button type="button" className="rv-btn-cta rv-btn-cta--full rv-btn-cta--ghost" onClick={() => setCoachOpen(true)}>
                <ChatIcon /> Encore un doute ? Demande au coach
              </button>
            )}
          </div>
        </div>
      )}

      {/* Refonte du 20/10 : la carte prend tout l'écran. Recto lilas, verso pêche, sans mascotte. */}
      <div className={`fc-scene${isFlipped ? ' fc-scene--verso' : ''}${animDir ? ` fc-scene--${animDir}` : ''}`}>
        <span className="fc-rond" aria-hidden="true" />
        <span className="fc-grain" aria-hidden="true" />
        <div className="fc-cadre">
          <div className="fc-haut">
            <button type="button" className="fc-rond-btn" onClick={retour} aria-label="Retour">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
            {segments}
            <span className="fc-compte" aria-label={`Carte ${current + 1} sur ${flashcards.length}`}>{current + 1} / {flashcards.length}</span>
            {coachLessonId && <CoachHeaderButton onClick={() => setCoachOpen(true)} />}
          </div>

          {showStreakBadge && (
            <div className="flashcards-streak-badge fc-serie" aria-live="polite">
              <FlameIcon /> {streak} bonnes d'affilée
            </div>
          )}

          <button type="button" className="fc-carte" onClick={flipCard} aria-label={isFlipped ? 'Revoir la question' : 'Retourner la carte'} key={`${current}-${isFlipped}`}>
            {!isFlipped ? (
              <>
                <span className="fc-surtitre">{matiere ? `${matiere} · ` : ''}{lessonTitle}</span>
                <span className={`fc-question fc-taille--${tailleQuestion(card.front)}`}>{nbsp(card.front)}</span>
                {current === 0 && <span className="fc-astuce">{isDesktop ? 'Clique ou appuie sur Espace pour retourner' : 'Touche la carte pour la retourner'}</span>}
              </>
            ) : (
              <>
                <span className="fc-surtitre fc-surtitre--verso">Réponse</span>
                <span className={`fc-reponse fc-taille--${tailleReponse(card.back)}`}>{nbsp(card.back)}</span>
                {precedente && <span className="fc-precedente">Carte précédente : {precedente === 'Je sais' ? '✓ ' : ''}{precedente}</span>}
              </>
            )}
          </button>

          <span className="ai-badge fc-ia">✦ Généré par IA</span>

          {!isFlipped ? (
            <div className="fc-recto-actions">
              <button type="button" className="fc-rond-action" onClick={handleAgain}>
                <span className="fc-rond-action-btn" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#C25407" strokeWidth="2.8" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </span>
                <span className="fc-rond-action-txt">À revoir</span>
              </button>
              <button type="button" className="fc-retourner" onClick={flipCard}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" /><path d="M3 21v-5h5" /></svg>
                Retourner
              </button>
              <button type="button" className="fc-rond-action" onClick={handleGot}>
                <span className="fc-rond-action-btn fc-rond-action-btn--ok" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
                </span>
                <span className="fc-rond-action-txt">Je sais</span>
              </button>
            </div>
          ) : (
            <div className="fc-verso-actions">
              <span className="fc-question-courte">Tu la savais ?</span>
              <div className="fc-notes">
                <button type="button" className="fc-note" onClick={handleAgain}>
                  <span className="fc-note-titre fc-note-titre--revoir">À revoir</span>
                  <span className="fc-note-quand">on repart de zéro</span>
                </button>
                <button type="button" className="fc-note" onClick={handlePresque}>
                  <span className="fc-note-titre">Presque</span>
                  <span className="fc-note-quand">{quand(joursAvantRetour(lessonId, idx, 'presque'))}</span>
                </button>
                <button type="button" className="fc-note fc-note--ok" onClick={handleGot}>
                  <span className="fc-note-titre">Je sais</span>
                  <span className="fc-note-quand">{quand(joursAvantRetour(lessonId, idx, 'got'))}</span>
                </button>
              </div>
            </div>
          )}
          <p className="fc-clavier" aria-hidden="true"><kbd>Espace</kbd> retourner · <kbd>←</kbd> à revoir · <kbd>↓</kbd> presque · <kbd>→</kbd> je sais</p>
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
