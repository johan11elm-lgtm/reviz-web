import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { fermerVersFiche, versExercice } from '../utils/navigation'
import { recordRevision, markRevisionDone, loadRevisions } from '../services/revisionService'
import { getDueCards, updateCardState } from '../services/srsService'
import { Pantin } from '../components/Pantin'
import { BulleReviz } from '../components/reviz/BulleReviz'
import { RouteSerie as Route } from '../components/reviz/RouteSerie'
import { MissingLessonState } from '../components/MissingLessonState'
import { FormatFeedback } from '../components/FormatFeedback'
import { nbsp } from '../utils/typography'
import { useIsDesktop } from '../hooks/useMediaQuery'
import { teinteMatiere, varsTeinte } from '../utils/teinteMatiere'
import './Flashcards.css'
import { mesurer } from '../services/mesure'
import { useAuth } from '../context/AuthContext'
import { useCombo } from '../hooks/useCombo'
import { PastilleCombo, BilanXp } from '../components/xp/Xp'
import { gainDeSeance } from '../services/xpService'
import { xpSeance } from '../utils/xp'

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

// Taille du texte selon sa longueur : une question ou une réponse courte s'affiche en très grand.
function tailleQuestion(t = '') { return t.length <= 50 ? 'xl' : t.length <= 100 ? 'l' : 'm' }
function tailleReponse(t = '') { return t.length <= 24 ? 'xxl' : t.length <= 70 ? 'xl' : t.length <= 140 ? 'l' : 'm' }

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

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`
const NOTE_SRS = { sais: 'got', presque: 'presque', revoir: 'again' }
const NOTE_TXT = { sais: 'Je sais', presque: 'Presque', revoir: 'À revoir' }
const REACTION = {
  sais: ['Bien vu.', 'Celle-là, tu la tiens.'],
  presque: ['Presque.', 'Elle revient dans quelques jours.'],
  revoir: ['Pas grave.', 'Elle revient demain, en priorité.'],
}
const SORTIE = { sais: 'droite', revoir: 'gauche', presque: 'bas' }

const Croix = ({ taille = 20 }) => (
  <svg viewBox="0 0 24 24" width={taille} height={taille} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
)
const RetourFleche = ({ taille = 14 }) => (
  <svg viewBox="0 0 24 24" width={taille} height={taille} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></svg>
)
const Rotation = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" /><path d="M3 21v-5h5" /></svg>
)
const Fleche = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
)
const Etoile = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z" /></svg>
)

/**
 * Série de flashcards (handoff Claude Design du 21/10) : un jeu en plein écran. La série du jour
 * mélange les cartes à revoir aujourd'hui et les nouvelles (répétition espacée) ; on retourne la
 * carte, puis on se note (À revoir / Presque / Je sais), au bouton, en glissant la carte ou au
 * clavier. Fin de série, et un écran calme quand il n'y a rien à revoir.
 */
function FlashcardsSession() {
  const isDesktop = useIsDesktop()
  const navigate = useNavigate()
  const location = useLocation()
  useEffect(() => { recordRevision('flashcards'); mesurer('format_ouvert', { format: 'flashcards' }) }, [])
  const uid = useAuth()?.currentUser?.uid ?? null
  const combo = useCombo({ sonFaute: false })
  const [gain, setGain] = useState(null)
  const lessonId = useMemo(() => getLessonId(), [])
  const lessonTitle = useMemo(() => getLessonTitle(), [])
  const matiere = useMemo(() => getLessonSubject(), [])
  const toutes = useMemo(() => getDueCards(lessonId, getFlashcards()), [lessonId])
  const nbQuestions = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('reviz-ai-data') || 'null')?.quiz?.length ?? 0 } catch { return 0 }
  }, [])
  const teinte = teinteMatiere(matiere)

  // La série du jour : cartes dues aujourd'hui et nouvelles (isDue compte aussi les jamais vues).
  const duJour = useMemo(() => toutes.filter(c => c.isDue).map(c => ({ ...c, nouvelle: !c.reps && !c.nextReview })), [toutes])
  const [serie, setSerie] = useState(duJour)
  const [ecran, setEcran] = useState(duJour.length ? 'serie' : 'rien')
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [notes, setNotes] = useState(() => duJour.map(() => null))
  const [reaction, setReaction] = useState(null)
  const [sortie, setSortie] = useState(null)
  const [arrivee, setArrivee] = useState(false)
  const [dx, setDx] = useState(0)
  const [glisse, setGlisse] = useState(false)
  const depart = useRef(null)

  const carte = serie[idx]
  const nbDues = serie.filter(c => !c.nouvelle).length
  const nbNouvelles = serie.length - nbDues
  const precedente = idx > 0 ? notes[idx - 1] : null

  function lancer(cartes) {
    combo.remettre()
    setGain(null)
    setSerie(cartes)
    setNotes(cartes.map(() => null))
    setIdx(0)
    setFlipped(false)
    setReaction(null)
    setEcran('serie')
  }

  function noter(note) {
    if (!flipped || sortie || !carte) return
    updateCardState(lessonId, carte.index, NOTE_SRS[note])
    const notees = notes.map((x, i) => (i === idx ? note : x))
    setNotes(notees)
    // Combo : « Je sais » le fait monter, « À revoir » le casse, « Presque » le laisse.
    if (note === 'sais') combo.bonne()
    else if (note === 'revoir') combo.faute()
    setReaction(note)
    setSortie(SORTIE[note])
    setDx(0)
    setTimeout(() => {
      setSortie(null)
      if (idx + 1 >= serie.length) {
        const sues = notees.filter(n => n && n !== 'revoir').length
        const { max, paliers } = combo.instantane()
        const g = gainDeSeance(uid, xpSeance({ bonnes: sues, total: serie.length, paliers, cartes: true }))
        markRevisionDone('flashcards', { xp: g.xp, bonnes: sues, cartes: serie.length, comboMax: max })
        setGain(g)
        setEcran('fin')
        return
      }
      // La carte suivante part de la pile, sans transition, puis vient au centre.
      setArrivee(true)
      setFlipped(false)
      setIdx(i => i + 1)
      requestAnimationFrame(() => requestAnimationFrame(() => setArrivee(false)))
    }, 320)
  }
  const retourner = () => { if (!sortie) setFlipped(f => !f) }

  // Clavier (ordinateur) : Espace retourne ; ←, ↓, → notent quand le verso est visible.
  useEffect(() => {
    if (ecran !== 'serie') return undefined
    function onKey(e) {
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); retourner() }
      else if (flipped && e.key === 'ArrowLeft') { e.preventDefault(); noter('revoir') }
      else if (flipped && e.key === 'ArrowDown') { e.preventDefault(); noter('presque') }
      else if (flipped && e.key === 'ArrowRight') { e.preventDefault(); noter('sais') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Glisser la carte (verso visible) : à gauche « À revoir », à droite « Je sais ».
  const seuil = isDesktop ? 120 : 90
  const onPointerDown = e => {
    depart.current = { x: e.clientX, moved: false }
    if (flipped) { setGlisse(true); e.currentTarget.setPointerCapture?.(e.pointerId) }
  }
  const onPointerMove = e => {
    if (!depart.current || !flipped) return
    const d = e.clientX - depart.current.x
    if (Math.abs(d) > 5) depart.current.moved = true
    setDx(d)
  }
  const onPointerUp = () => {
    const d = dx, bouge = depart.current?.moved
    depart.current = null
    setGlisse(false)
    if (flipped && Math.abs(d) > seuil) { noter(d > 0 ? 'sais' : 'revoir'); return }
    setDx(0)
    if (!bouge) retourner()
  }

  // Ce que dit Réviz.
  const lignes = ecran === 'fin'
    ? (() => {
        const sues = notes.filter(n => n === 'sais').length, autres = notes.length - sues
        return [`${sues} ${sues > 1 ? 'cartes sues' : 'carte sue'} sur ${notes.length}.`, autres ? `${autres > 1 ? `Les ${autres} autres reviennent` : 'L’autre revient'} bientôt.` : 'Tout est su, bravo.']
      })()
    : ecran === 'rien' ? ['Rien à revoir aujourd’hui.', 'Tu es à jour sur ce chapitre.']
    : reaction ? REACTION[reaction]
    : [nbDues && nbNouvelles ? `${nbDues} à revoir, ${pluriel(nbNouvelles, 'nouvelle')}.` : nbDues ? `${pluriel(nbDues, 'carte')} à revoir.` : `${nbNouvelles} ${nbNouvelles > 1 ? 'nouvelles cartes' : 'nouvelle carte'}.`,
       'Prends ton temps sur chaque carte.']
  const pantin = useRef(null)
  const [parle, setParle] = useState(false)
  const texte = lignes.join('\n')
  useEffect(() => { if (parle) pantin.current?.dire(texte) }, [texte, parle])
  useEffect(() => {
    if (reaction === 'sais') pantin.current?.expression('fier')
    else if (reaction === 'revoir') pantin.current?.expression('content')
  }, [reaction, idx])
  useEffect(() => {
    let t
    const essai = () => { t = setTimeout(() => (document.hidden ? essai() : setParle(true)), 4000) }
    essai()
    return () => clearTimeout(t)
  }, [])

  const fermer = () => fermerVersFiche(navigate, location)
  const boutonFermer = isDesktop
    ? <button type="button" className="fc-fermer fc-fermer--pilule" onClick={fermer}><Croix taille={18} />Fermer</button>
    : <button type="button" className="fc-fermer" onClick={fermer} aria-label="Fermer"><Croix /></button>
  const deco = (
    <>
      <span className="fc-decors" aria-hidden="true">
        <span className="fc-deco fc-deco--a" />
        <span className="fc-deco fc-deco--b" />
        <span className="fc-deco fc-deco--c" />
        <span className="fc-point" />
      </span>
      <span className="fc-grain" aria-hidden="true" />
    </>
  )
  const reviz = (taille, pointe = 'bas', expression = 'content', entree) => (
    <div className={`fc-reviz fc-reviz--${pointe}`}>
      {pointe === 'bas' && <BulleReviz key={texte} lignes={lignes} parle={parle} className="fc-bulle" pointe="bas" />}
      <Pantin
        ref={pantin}
        size={taille}
        expression={expression}
        entree={entree}
        repli={null}
        onEntree={() => setParle(true)}
        onClick={() => pantin.current?.geste('saut')}
        label="Réviz, ta mascotte"
      />
      {pointe === 'gauche' && <BulleReviz key={texte} lignes={lignes} parle={parle} className="fc-bulle" pointe="gauche" />}
    </div>
  )

  // ── Rien à revoir ──
  if (ecran === 'rien') {
    const prochaine = toutes.reduce((m, c) => (c.nextReview && (!m || c.nextReview < m) ? c.nextReview : m), null)
    const jour = prochaine ? new Date(prochaine) : null
    const memeJour = jour ? toutes.filter(c => c.nextReview && new Date(c.nextReview).toDateString() === jour.toDateString()).length : 0
    return (
      <div className={`app app--no-halo flashcards-page fc-page fc-page--calme${isDesktop ? ' app--large fc-page--large' : ''}`} style={varsTeinte(teinte)}>
        {deco}
        <div className="fc-ecran fc-ecran--centre">
          <div className="fc-haut-gauche">{boutonFermer}</div>
          {reviz(isDesktop ? 260 : 200, 'bas', 'reflechit')}
          {jour && (
            <div className="fc-date-carte">
              <span className="fc-date-rond"><b>{jour.getDate()}</b>{jour.toLocaleDateString('fr-FR', { month: 'short' })}</span>
              <span className="fc-date-txt">
                <span className="fc-date-surtitre">Prochaine révision</span>
                <b>{jour.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, c => c.toUpperCase())}</b>
                <span>{pluriel(memeJour, 'carte')} prévue{memeJour > 1 ? 's' : ''}</span>
              </span>
            </div>
          )}
          <div className="fc-fin-actions">
            <button type="button" className="fc-btn fc-btn--blanc" onClick={() => lancer(toutes.map(c => ({ ...c, nouvelle: false })))}>Revoir quand même</button>
            <button type="button" className="fc-lien" onClick={fermer}>Retour au chapitre</button>
          </div>
        </div>
      </div>
    )
  }

  // ── Fin de série ──
  if (ecran === 'fin') {
    const sues = notes.filter(n => n === 'sais').length
    const aRevoir = serie.filter((_, i) => notes[i] !== 'sais')
    const nouvelles = serie.filter(c => c.nouvelle).length
    const quizFait = loadRevisions().some(r => r.lessonId === lessonId && r.type === 'quiz')
    return (
      <div className={`app app--no-halo flashcards-page fc-page fc-page--fin${isDesktop ? ' app--large fc-page--large' : ''}`} style={varsTeinte(teinte)}>
        {deco}
        <div className="fc-ecran fc-ecran--fin">
          <div className="fc-haut-gauche">{boutonFermer}</div>
          <div className="fc-fin-tete">
            <span className="fc-surtitre">{matiere ? `${matiere} · ` : ''}Flashcards</span>
            <h1 className="fc-fin-titre">Série terminée</h1>
            <span className="fc-xp">+{gain?.xp ?? 0} XP</span>
          </div>
          {reviz(isDesktop ? 220 : 170, 'bas', aRevoir.length ? 'content' : 'fier', aRevoir.length ? 'coucou' : 'saut')}
          <div className="fc-stats">
            <div className="fc-stats-ligne">
              <span><b className="fc-vert">{sues}</b>sues</span>
              <span><b className="fc-orange">{aRevoir.length}</b>à revoir</span>
              <span><b>{nouvelles}</b>{nouvelles > 1 ? 'nouvelles' : 'nouvelle'}</span>
            </div>
            <Route notes={notes} idx={-1} grand={isDesktop} recap />
            {aRevoir.length > 0 && <p className="fc-priorite"><RetourFleche taille={16} />Les cartes à revoir reviendront en priorité.</p>}
          </div>
          <BilanXp gain={gain} uid={uid} />
          <div className="fc-fin-actions fc-fin-actions--deux">
            <button type="button" className="fc-btn fc-btn--orange" onClick={() => versExercice(navigate, location, '/quiz')}>
              {quizFait ? 'Refaire le quiz' : 'Passer au quiz'}{nbQuestions ? ` · ${pluriel(nbQuestions, 'question')}` : ''}<Fleche />
            </button>
            {aRevoir.length > 0 && (
              <button type="button" className="fc-btn fc-btn--blanc" onClick={() => lancer(aRevoir.map(c => ({ ...c, nouvelle: false })))}>
                Refaire les cartes à revoir ({aRevoir.length})
              </button>
            )}
          </div>
          <FormatFeedback format="flashcards" question="Ces cartes t'ont aidé ?" />
          <button type="button" className="fc-lien" onClick={fermer}>Retour au chapitre</button>
        </div>
      </div>
    )
  }

  // ── Série ──
  const pile = Math.min(2, serie.length - idx - 1)
  const transform = sortie === 'droite' ? 'translateX(480px) rotate(20deg)'
    : sortie === 'gauche' ? 'translateX(-480px) rotate(-20deg)'
    : sortie === 'bas' ? 'translateY(520px) rotate(4deg)'
    : arrivee ? 'translate(10px,14px) rotate(5deg) scale(.96)'
    : dx ? `translateX(${dx}px) rotate(${dx / 18}deg)` : 'none'
  const tampon = Math.max(0, Math.min(1, (Math.abs(dx) - 20) / 70))
  const enTete = (
    <div className="fc-tete">
      <span className="fc-tete-titre">{isDesktop && matiere ? `${matiere} · ` : ''}{lessonTitle}</span>
      <PastilleCombo combo={combo.combo} casse={combo.casse} palier={combo.palier} />
      <span className="fc-tete-compte" aria-live="polite">Carte {idx + 1} sur {serie.length}</span>
    </div>
  )
  const scene = (
    <div className="fc-scene">
      {pile >= 2 && <span className="fc-pile fc-pile--2" aria-hidden="true" />}
      {pile >= 1 && <span className="fc-pile fc-pile--1" aria-hidden="true" />}
      <div
        className={`fc-carte${glisse ? ' fc-carte--glisse' : ''}${arrivee ? ' fc-carte--arrivee' : ''}${sortie ? ' fc-carte--sortie' : ''}`}
        style={{ transform }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { depart.current = null; setGlisse(false); setDx(0) }}
      >
        <div className={`fc-carte-int${flipped ? ' is-verso' : ''}`}>
          <button type="button" className="fc-face fc-face--recto" onClick={e => e.preventDefault()} aria-label={`${carte.front}. Retourner la carte`} tabIndex={flipped ? -1 : 0}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); retourner() } }}>
            <span className="fc-face-haut">
              <span className={`fc-etiquette${carte.nouvelle ? ' fc-etiquette--nouvelle' : ''}`}>{carte.nouvelle ? 'Nouvelle' : 'À revoir aujourd’hui'}</span>
              <span className="fc-face-coin">Question</span>
            </span>
            <span className={`fc-question fc-taille--${tailleQuestion(carte.front)}`}>{nbsp(carte.front)}</span>
            <span className="fc-face-bas">
              <span className="fc-ia"><Etoile />Généré par IA</span>
              <span className="fc-astuce">{isDesktop ? 'Clique ou appuie sur Espace' : 'Touche pour retourner'}</span>
            </span>
          </button>
          <div className="fc-face fc-face--verso" aria-hidden={!flipped}>
            <span className="fc-face-haut">
              <span className="fc-etiquette fc-etiquette--nouvelle">Réponse</span>
              <span className="fc-face-coin fc-face-coin--rappel">{carte.front}</span>
            </span>
            <span className={`fc-reponse fc-taille--${tailleReponse(carte.back)}`}>{nbsp(carte.back)}</span>
            <span className="fc-face-bas">
              <span className="fc-ia"><Etoile />Généré par IA</span>
              <span className="fc-astuce fc-astuce--doux">{isDesktop ? '← à revoir · ↓ presque · → je sais' : 'Glisse à gauche : à revoir · à droite : je sais'}</span>
            </span>
          </div>
        </div>
        {flipped && <span className="fc-tampon fc-tampon--sais" style={{ opacity: dx > 0 ? tampon : 0 }} aria-hidden="true">Je sais</span>}
        {flipped && <span className="fc-tampon fc-tampon--revoir" style={{ opacity: dx < 0 ? tampon : 0 }} aria-hidden="true">À revoir</span>}
      </div>
    </div>
  )
  const actions = (
    <div className="fc-actions">
      {!flipped ? (
        <button type="button" className="fc-btn fc-btn--encre" onClick={retourner}>
          <Rotation />Voir la réponse{isDesktop && <kbd>Espace</kbd>}
        </button>
      ) : (
        <div className="fc-notes">
          <button type="button" className="fc-btn fc-btn--orange" onClick={() => noter('revoir')}>{isDesktop && <kbd>←</kbd>}À revoir</button>
          <button type="button" className="fc-btn fc-btn--blanc" onClick={() => noter('presque')}>{isDesktop && <kbd>↓</kbd>}Presque</button>
          <button type="button" className="fc-btn fc-btn--vert" onClick={() => noter('sais')}>{isDesktop && <kbd>→</kbd>}Je sais</button>
        </div>
      )}
      <p className={`fc-precedente${precedente ? '' : ' fc-precedente--vide'}`}>
        {precedente && <><i className={`fc-precedente-point fc-precedente-point--${precedente}`} />Carte précédente : {NOTE_TXT[precedente]}</>}
      </p>
    </div>
  )

  // Série façon app Nomad (29/10) : barre de progression orange au lieu de la route, la carte au
  // centre, sans Réviz pendant la série (il revient à la fin).
  const barre = (
    <div className="fc-barre-ligne">
      {boutonFermer}
      <span className="fc-barre" aria-hidden="true"><i style={{ width: `${Math.max(idx / serie.length * 100, 3)}%` }} /></span>
    </div>
  )

  return (
    <div className={`app app--no-halo flashcards-page fc-page fc-page--serie${isDesktop ? ' app--large fc-page--large' : ''}`}>
      {isDesktop ? (
        <div className="fc-ecran fc-ecran--serie">
          <div className="fc-plateau fc-plateau--nomad">
            <div className="fc-col-centre">{barre}{enTete}{scene}{actions}</div>
            <aside className="fc-col-droite">
              <div className="fc-infos">
                <span className="fc-infos-titre">Cette série</span>
                {nbDues > 0 && <span className="fc-infos-ligne"><i className="fc-pt fc-pt--peche" />{nbDues} à revoir aujourd’hui</span>}
                {nbNouvelles > 0 && <span className="fc-infos-ligne"><i className="fc-pt fc-pt--lavande" />{pluriel(nbNouvelles, 'nouvelle')}</span>}
                <span className="fc-infos-titre fc-infos-titre--2">Raccourcis</span>
                <span className="fc-touche"><kbd>Espace</kbd>Retourner</span>
                <span className="fc-touche"><kbd>←</kbd>À revoir</span>
                <span className="fc-touche"><kbd>↓</kbd>Presque</span>
                <span className="fc-touche"><kbd>→</kbd>Je sais</span>
              </div>
            </aside>
          </div>
        </div>
      ) : (
        <div className="fc-ecran fc-ecran--serie">
          {barre}
          {enTete}
          {scene}
          {actions}
        </div>
      )}
    </div>
  )
}
