import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { recordRevision, markRevisionDone, loadRevisions } from '../services/revisionService'
import { getCardState, countDueCards } from '../services/srsService'
import { Pantin } from '../components/Pantin'
import { Mascot } from '../components/Mascot'
import { BulleReviz } from '../components/reviz/BulleReviz'
import { RouteSerie } from '../components/reviz/RouteSerie'
import { MissingLessonState } from '../components/MissingLessonState'
import { FormatFeedback } from '../components/FormatFeedback'
import { CoachChat } from '../components/CoachChat'
import { useAuth } from '../context/AuthContext'
import { useIsDesktop } from '../hooks/useMediaQuery'
import { teinteMatiere, varsTeinte } from '../utils/teinteMatiere'
import { nbsp } from '../utils/typography'
import { track } from '../services/statsService'
// Les jeux en plein écran partagent leurs styles (fond, route, boutons à tranche) avec les Flashcards.
import './Flashcards.css'
import './Quiz.css'
import { mesurer } from '../services/mesure'

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

const LETTRES = ['A', 'B', 'C', 'D']
function getLessonTitle(fallback = 'Ta leçon') {
  try { return JSON.parse(localStorage.getItem('reviz-ai-data') || 'null')?.metadata?.title || fallback }
  catch { return fallback }
}
const lireAi = () => { try { return JSON.parse(localStorage.getItem('reviz-ai-data') || 'null') ?? {} } catch { return {} } }

// Ce que dit Réviz : avant de répondre, puis en alternance selon la réponse.
const AVANT = ['Lis bien les 4 réponses.', 'Une seule est juste.']
const JUSTE = [['Exact.', 'Tu tiens cette règle.'], ['Bien joué.', 'C’est la bonne réponse.'], ['Juste.', 'On garde ce rythme.']]
const FAUX = [['Pas cette fois.', 'Lis la correction, elle va t’aider.'], ['Presque.', 'Regarde la règle juste en dessous.']]

const Croix = ({ taille = 20 }) => (
  <svg viewBox="0 0 24 24" width={taille} height={taille} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
)
const Coche = ({ taille = 16 }) => (
  <svg viewBox="0 0 24 24" width={taille} height={taille} fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
)
const Fleche = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
)

export default function Quiz() {
  // Décision stable pour toute la vie du composant (rules-of-hooks safe).
  const [hasData] = useState(() => getQuestions() !== null)
  if (!hasData) return <MissingLessonState title="Quiz" />
  return <QuizSession />
}

/**
 * Quiz corrigé (handoff Claude Design du 21/10) : un jeu en plein écran. Toucher une réponse
 * valide ; la bonne passe en vert, la mauvaise choisie en orange, les autres se replient et la
 * correction apparaît (« Pourquoi ? » ouvre Réviz IA pré-rempli après une erreur). En fin de quiz,
 * le score est enregistré (fiche chapitre), avec le parcours et les questions à revoir.
 */
function QuizSession() {
  const isDesktop = useIsDesktop()
  const navigate = useNavigate()
  const { isGuest } = useAuth()
  useEffect(() => { mesurer('format_ouvert', { format: 'quiz' }) }, [])
  const questions = useMemo(() => getQuestions(), [])
  const ai = useMemo(() => lireAi(), [])
  const lessonTitle = useMemo(() => getLessonTitle(), [])
  const matiere = ai.metadata?.subject || ''
  const teinte = teinteMatiere(matiere)
  const coachLessonId = useMemo(() => localStorage.getItem('reviz-current-lesson-id'), [])
  const iaDispo = !!coachLessonId && !isGuest

  const [idx, setIdx] = useState(0)
  const [reponses, setReponses] = useState(() => questions.map(() => null))
  const [fin, setFin] = useState(false)
  const [coach, setCoach] = useState(null) // question pré-remplie pour Réviz IA

  const q = questions[idx]
  const choix = reponses[idx]
  const repondu = choix !== null
  const juste = repondu && choix === q.correct
  const nbJustes = reponses.filter((r, i) => r !== null && r === questions[i].correct).length
  const nbRepondues = reponses.filter(r => r !== null).length
  const notes = reponses.map((r, i) => (r === null ? null : r === questions[i].correct ? 'juste' : 'faux'))
  const derniere = idx === questions.length - 1

  function repondre(i) {
    if (repondu || fin) return
    setReponses(rs => rs.map((r, k) => (k === idx ? i : r)))
  }
  function suivante() {
    if (!repondu) return
    if (derniere) {
      // Le quiz terminé compte comme fait, avec son score (fiche chapitre : « 6 / 7 au quiz »).
      recordRevision('quiz', { score: nbJustes, total: questions.length })
      markRevisionDone('quiz', { score: nbJustes, total: questions.length })
      track('quiz_termine', { source: coachLessonId?.startsWith('prog-') ? 'programme' : 'scan' })
      setFin(true)
      return
    }
    setIdx(i => i + 1)
  }
  function refaire() {
    setReponses(questions.map(() => null))
    setIdx(0)
    setFin(false)
  }
  const demanderPourquoi = () => {
    const bonne = q.choices[q.correct], prise = q.choices[choix]
    setCoach(`Pourquoi « ${prise} » est faux à la question « ${q.question} » ? La bonne réponse est « ${bonne} ».`)
  }

  // Clavier (ordinateur) : 1-4 ou A-D pour répondre, Entrée pour passer à la suite.
  useEffect(() => {
    if (fin || coach) return undefined
    function onKey(e) {
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      if (!repondu) {
        const i = { 1: 0, 2: 1, 3: 2, 4: 3, a: 0, b: 1, c: 2, d: 3 }[String(e.key).toLowerCase()]
        if (i !== undefined && i < q.choices.length) { e.preventDefault(); repondre(i) }
      } else if (e.key === 'Enter') { e.preventDefault(); suivante() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Ce que dit Réviz.
  const pct = nbJustes / questions.length
  const lignes = fin
    ? pct >= 0.8 ? ['Très beau score.', 'Ce chapitre est presque maîtrisé.']
      : pct >= 0.5 ? ['C’est un bon début.', 'Revois les erreurs, puis retente.']
      : ['On reprend ensemble.', 'Revois les erreurs, puis retente.']
    : !repondu ? AVANT
    : juste ? JUSTE[idx % JUSTE.length] : FAUX[idx % FAUX.length]
  const pantin = useRef(null)
  const [parle, setParle] = useState(false)
  const texte = lignes.join('\n')
  useEffect(() => { if (parle) pantin.current?.dire(texte) }, [texte, parle])
  useEffect(() => {
    if (!repondu || fin) return
    pantin.current?.expression(juste ? 'fier' : 'content')
  }, [repondu, juste, fin])
  useEffect(() => {
    let t
    const essai = () => { t = setTimeout(() => (document.hidden ? essai() : setParle(true)), 4000) }
    essai()
    return () => clearTimeout(t)
  }, [])

  const fermer = () => navigate('/analyse')
  const boutonFermer = isDesktop
    ? <button type="button" className="fc-fermer fc-fermer--pilule" onClick={fermer}><Croix taille={18} />Fermer</button>
    : <button type="button" className="fc-fermer" onClick={fermer} aria-label="Fermer"><Croix /></button>
  const deco = (
    <>
      <span className="fc-decors" aria-hidden="true">
        <span className="fc-deco fc-deco--a" />
        <span className="fc-deco fc-deco--b" />
        <span className="fc-point" />
      </span>
      <span className="fc-grain" aria-hidden="true" />
    </>
  )
  const reviz = (taille, expression = 'content', entree) => (
    <div className="qz-reviz">
      {fin && pct >= 0.8 && <span className="qz-anneaux" aria-hidden="true"><i /><i /><i /></span>}
      <BulleReviz key={texte} lignes={lignes} parle={parle} className="qz-bulle" />
      <Pantin
        key={fin ? 'fin' : 'jeu'}
        ref={pantin}
        size={taille}
        expression={expression}
        entree={entree}
        repli={null}
        onEntree={() => setParle(true)}
        onClick={() => pantin.current?.geste('saut')}
        label="Réviz, ta mascotte"
      />
    </div>
  )
  const coachChat = coach && coachLessonId && (
    <CoachChat isOpen onClose={() => setCoach(null)} lessonId={coachLessonId} lessonTitle={lessonTitle} prefill={coach} />
  )

  // ── Fin du quiz ──
  if (fin) {
    const total = ai.flashcards?.length ?? 0
    let vues = 0
    if (coachLessonId) for (let i = 0; i < total; i++) if (getCardState(coachLessonId, i)) vues++
    const cartesFaites = !!coachLessonId && total > 0 && vues === total && countDueCards(coachLessonId, total) === 0
    const resumeLu = !!coachLessonId && loadRevisions().some(r => r.lessonId === coachLessonId && r.type === 'resume')
    const etapes = [
      { id: 'resume', nom: 'Résumé', fait: resumeLu },
      { id: 'flashcards', nom: 'Flashcards', fait: cartesFaites },
      { id: 'quiz', nom: 'Quiz', fait: true },
    ]
    const nbFaites = etapes.filter(e => e.fait).length
    const erreurs = questions.map((qq, i) => ({ qq, i, r: reponses[i] })).filter(e => e.r !== e.qq.correct)
    const score = (
      <div className="qz-score-fin">
        <span className="qz-surtitre">Quiz terminé</span>
        <span className="qz-score-grand">{nbJustes}<small> / {questions.length}</small></span>
        <span className="qz-score-legende">{nbJustes > 1 ? 'bonnes réponses' : 'bonne réponse'}</span>
      </div>
    )
    const pastilles = (
      <div className="qz-pastilles">
        <span className="qz-xp">+{nbJustes * 10} XP</span>
        <span className="qz-enregistre"><i><Coche taille={12} /></i>{isDesktop ? 'Score enregistré sur la fiche chapitre' : 'Score enregistré'}</span>
      </div>
    )
    const parcours = (
      <section className="qz-carte" aria-labelledby="qz-titre-parcours">
        <div className="qz-carte-tete">
          <h2 id="qz-titre-parcours" className="qz-titre2">Ton parcours</h2>
          <span className={`qz-parcours-compte${nbFaites === 3 ? ' is-fini' : ''}`}>{nbFaites} / 3{nbFaites === 3 ? ' · chapitre terminé' : ''}</span>
        </div>
        <ol className="qz-etapes">
          {etapes.map(e => (
            <li key={e.id} className={e.fait ? 'is-fait' : ''}>
              <span className="qz-etape-rond">{e.fait ? <Coche taille={20} /> : null}</span>
              <span className="qz-etape-nom">{e.nom}</span>
            </li>
          ))}
        </ol>
        <span className="qz-sep" aria-hidden="true" />
        <span className="qz-reponses-titre">Tes réponses</span>
        <RouteSerie notes={notes} idx={-1} recap />
      </section>
    )
    const aRevoir = erreurs.length > 0 && (
      <section className="qz-revoir" aria-labelledby="qz-titre-revoir">
        <h2 id="qz-titre-revoir" className="qz-titre2">À revoir</h2>
        <div className="qz-revoir-liste">
          {erreurs.map(({ qq, i, r }) => (
            <div key={i} className="qz-carte qz-erreur">
              <span className="qz-erreur-num">Question {i + 1}</span>
              <p className="qz-erreur-q">{nbsp(qq.question)}</p>
              <div className="qz-erreur-pastilles">
                {r !== null && <span className="qz-pill qz-pill--faux">Ta réponse : {qq.choices[r]}</span>}
                <span className="qz-pill qz-pill--juste">Bonne réponse : {qq.choices[qq.correct]}</span>
              </div>
              {qq.explanation && <p className="qz-erreur-correction">{nbsp(qq.explanation)}</p>}
            </div>
          ))}
        </div>
      </section>
    )
    const boutons = (
      <div className="qz-fin-actions">
        <button type="button" className="fc-btn fc-btn--orange" onClick={refaire}>Refaire le quiz</button>
        {erreurs.length > 0 && total > 0 && (
          <button type="button" className="fc-btn fc-btn--blanc" onClick={() => navigate('/flashcards')}>Revoir les cartes</button>
        )}
      </div>
    )
    return (
      <div className={`app app--no-halo quiz-page fc-page qz-page qz-page--fin${isDesktop ? ' app--large fc-page--large qz-page--large' : ''}`} style={varsTeinte(teinte)}>
        {deco}
        <div className="fc-ecran qz-ecran-fin">
          <div className="fc-haut-gauche">{boutonFermer}</div>
          {isDesktop ? (
            <div className="qz-fin-grille">
              <div className="qz-fin-gauche">{score}{reviz(220, 'fier', 'saut')}{pastilles}</div>
              <div className="qz-fin-droite">{parcours}{aRevoir}{boutons}<FormatFeedback format="quiz" question="Ce quiz t'a aidé ?" /><button type="button" className="fc-lien" onClick={fermer}>Retour au chapitre</button></div>
            </div>
          ) : (
            <>
              {score}
              {reviz(170, 'fier', 'saut')}
              {pastilles}
              {parcours}
              {aRevoir}
              {boutons}
              <FormatFeedback format="quiz" question="Ce quiz t'a aidé ?" />
              <button type="button" className="fc-lien" onClick={fermer}>Retour au chapitre</button>
            </>
          )}
        </div>
        {coachChat}
      </div>
    )
  }

  // ── Question et correction ──
  const classeChoix = i => (!repondu ? '' : i === q.correct ? ' is-juste' : i === choix ? ' is-faux' : ' is-autre')
  const reponsesBloc = (
    <div className="qz-choix" role="group" aria-label="Réponses">
      {q.choices.map((c, i) => (
        <button key={i} type="button" className={`qz-choix-btn${classeChoix(i)}`} onClick={() => repondre(i)} disabled={repondu}
          aria-label={`${LETTRES[i]} : ${c}${repondu && i === q.correct ? ', bonne réponse' : ''}${repondu && i === choix && i !== q.correct ? ', ta réponse' : ''}`}>
          <span className="qz-lettre" aria-hidden="true">
            {repondu && i === q.correct ? <Coche /> : repondu && i === choix ? <Croix taille={16} /> : isDesktop ? i + 1 : LETTRES[i]}
          </span>
          <span className="qz-choix-txt">{nbsp(c)}</span>
          {repondu && (i === q.correct || i === choix) && (
            <span className="qz-choix-mention">{i === choix ? 'Ta réponse' : 'Bonne réponse'}</span>
          )}
        </button>
      ))}
    </div>
  )
  const correction = repondu && (
    <div className={`qz-correction${juste ? ' is-juste' : ' is-faux'}`} role="status">
      <div className="qz-correction-txt">
        <span className="qz-verdict">{juste ? 'Bonne réponse' : 'Pas tout à fait'}</span>
        {q.explanation && <p>{nbsp(q.explanation)}</p>}
      </div>
      {!juste && iaDispo && (
        <button type="button" className="qz-pourquoi" onClick={demanderPourquoi}>
          <span className="qz-ia-anneau" aria-hidden="true"><span><Mascot pose="coach" size={30} alt="" /></span></span>
          Pourquoi ? Demande à Réviz IA
        </button>
      )}
    </div>
  )
  const suivanteBtn = repondu && (
    <button type="button" className="fc-btn fc-btn--orange qz-suivante" onClick={suivante}>
      {derniere ? 'Voir mon score' : 'Question suivante'}<Fleche />{isDesktop && <kbd>Entrée</kbd>}
    </button>
  )
  const enTete = (
    <div className="fc-tete">
      <span className="fc-tete-titre">Quiz · {lessonTitle}</span>
      <span className="fc-tete-compte" aria-live="polite">Question {idx + 1} sur {questions.length}</span>
    </div>
  )
  const pastilleScore = (
    <span className="qz-pastille-score" aria-label={`${nbJustes} bonnes réponses sur ${nbRepondues}`}>
      <i><Coche taille={12} /></i>{nbJustes} / {nbRepondues}
    </span>
  )

  return (
    <div className={`app app--no-halo quiz-page fc-page qz-page${isDesktop ? ' app--large fc-page--large qz-page--large' : ''}`} style={varsTeinte(teinte)}>
      {deco}
      {isDesktop ? (
        <div className="fc-ecran fc-ecran--serie">
          <div className="fc-haut-gauche">{boutonFermer}</div>
          {enTete}
          <RouteSerie notes={notes} idx={idx} grand />
          <div className="qz-plateau">
            <div className="qz-col-gauche">{reviz(220)}</div>
            <div className="qz-col-centre">
              <h1 className="qz-question">{nbsp(q.question)}</h1>
              {reponsesBloc}
              {correction}
              {suivanteBtn}
            </div>
            <aside className="qz-col-droite">
              <div className="fc-infos">
                <span className="fc-infos-titre">Score</span>
                <span className="qz-score-cours">{nbJustes} / {nbRepondues || 0}</span>
                <span className="qz-score-sous">{nbJustes > 1 ? 'bonnes réponses' : 'bonne réponse'}</span>
                <span className="qz-segments" aria-hidden="true">{notes.map((n, i) => <i key={i} className={n ? `is-${n}` : ''} />)}</span>
                <span className="qz-score-sous">+{nbJustes * 10} XP pour l’instant</span>
                <span className="fc-infos-titre fc-infos-titre--2">Raccourcis</span>
                <span className="fc-touche"><kbd>1</kbd><kbd>4</kbd>Répondre</span>
                <span className="fc-touche"><kbd>Entrée</kbd>Question suivante</span>
              </div>
            </aside>
          </div>
        </div>
      ) : (
        <div className="fc-ecran qz-ecran">
          <div className="fc-ligne-haut">{boutonFermer}{enTete}{pastilleScore}</div>
          <RouteSerie notes={notes} idx={idx} />
          {reviz(130)}
          <h1 className="qz-question">{nbsp(q.question)}</h1>
          {reponsesBloc}
          {correction}
          {suivanteBtn}
        </div>
      )}
      {coachChat}
    </div>
  )
}
