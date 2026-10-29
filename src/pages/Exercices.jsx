import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { fermerVersFiche, versExercice } from '../utils/navigation'
import { recordRevision, markRevisionDone } from '../services/revisionService'
import { Mascot } from '../components/Mascot'
import { Etincelles } from '../components/Etincelles'
import { MissingLessonState } from '../components/MissingLessonState'
import { CoachChat } from '../components/CoachChat'
import { useAuth } from '../context/AuthContext'
import { useIsDesktop } from '../hooks/useMediaQuery'
import { nbsp } from '../utils/typography'
import { construireSeance } from '../utils/exercicesChapitre'
import { FORMATS, NOMS_FORMATS } from './exercices/formats'
import { mesurer } from '../services/mesure'
import { useCombo } from '../hooks/useCombo'
import { PastilleCombo, BilanXp } from '../components/xp/Xp'
import { gainDeSeance } from '../services/xpService'
import { xpSeance } from '../utils/xp'
import { noterErreurs } from '../services/erreursService'
import { NB_QUESTIONS_PREMIERE } from '../utils/premiereRevision'
import { track } from '../services/statsService'
import { MontreParent } from '../components/MontreParent'
import { loadLessons } from '../services/historyService'
// Même écran de jeu que le quiz : fond, barre du haut, feuille de correction, écran de fin.
import './Flashcards.css'
import './Quiz.css'
import './Exercices.css'

const lireAi = () => { try { return JSON.parse(localStorage.getItem('reviz-ai-data') || 'null') } catch { return null } }

const Croix = ({ taille = 20 }) => (
  <svg viewBox="0 0 24 24" width={taille} height={taille} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
)
const Coche = ({ taille = 16 }) => (
  <svg viewBox="0 0 24 24" width={taille} height={taille} fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
)
const Fleche = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
)

export default function Exercices() {
  const location = useLocation()
  const [ai] = useState(lireAi)
  // ?graine=… rejoue une séance précise (tests, lien de démonstration) ; sinon une séance neuve.
  const [graine, setGraine] = useState(() => {
    const g = Number(new URLSearchParams(location.search).get('graine'))
    return Number.isFinite(g) && g > 0 ? g : Date.now()
  })
  // ?premiere=1 : la première révision, juste après l'inscription (Onboarding) : une séance courte.
  const [premiere] = useState(() => new URLSearchParams(location.search).get('premiere') === '1')
  const seance = useMemo(() => construireSeance(ai, { graine, ...(premiere ? { nombre: NB_QUESTIONS_PREMIERE } : {}) }), [ai, graine, premiere])
  if (!seance.length) {
    // Une leçon trop maigre pour une séance garde son quiz (la séance a remplacé le quiz le 29/10).
    if (ai?.quiz?.length) return <Navigate to={`/quiz?classique=1${premiere ? '&premiere=1' : ''}`} replace state={location.state} />
    return <MissingLessonState title="Exercices" />
  }
  // Une nouvelle séance repart de zéro (nouvelle graine, nouveaux exercices).
  return <Seance key={graine} ai={ai} seance={seance} premiere={premiere} nouvelle={() => setGraine(Date.now())} />
}

/**
 * Exercices en jeu (29/10) : une séance de 10 exercices tirés du chapitre, tous formats mélangés
 * (4 coins, Intrus, Trois indices, Définition, Paires, Chronologie, Année, Quiz, et ceux du bloc
 * relu quand le chapitre en a un : Trouve le nombre, Qui suis-je ?, Étiquette…). Même cadre pour
 * tous, puis la feuille de correction du quiz. En fin de séance, le score est enregistré (fiche
 * chapitre) avec les exercices à revoir.
 */
function Seance({ ai, seance, premiere, nouvelle }) {
  const isDesktop = useIsDesktop()
  const navigate = useNavigate()
  const location = useLocation()
  const { isGuest, currentUser } = useAuth()
  const uid = currentUser?.uid ?? null
  useEffect(() => { mesurer('format_ouvert', { format: 'exercices' }) }, [])
  const titre = ai?.metadata?.title || 'Ta leçon'
  const lessonId = useMemo(() => localStorage.getItem('reviz-current-lesson-id'), [])
  const iaDispo = !!lessonId && !isGuest

  const [idx, setIdx] = useState(0)
  const [resultats, setResultats] = useState(() => seance.map(() => null)) // { juste, erreurs? } par exercice
  const [fin, setFin] = useState(false)
  const [coach, setCoach] = useState(null)
  const ecran = useRef(null)
  const combo = useCombo()
  const [gain, setGain] = useState(null)

  const ex = seance[idx]
  const resultat = resultats[idx]
  const verdict = resultat ? (resultat.juste ? 'juste' : 'faux') : null
  const nbJustes = resultats.filter(r => r?.juste).length
  const nbFaits = resultats.filter(Boolean).length
  const derniere = idx === seance.length - 1

  function valider(juste, details = {}) {
    if (resultat) return
    setResultats(rs => rs.map((r, k) => (k === idx ? { juste, ...details } : r)))
    if (juste) combo.bonne()
    else combo.faute()
  }
  function suivante() {
    if (!resultat) return
    if (derniere) {
      const total = seance.length
      const { max, paliers } = combo.instantane()
      const g = gainDeSeance(uid, xpSeance({ bonnes: nbJustes, total, paliers }))
      recordRevision('exercices', { score: nbJustes, total, xp: g.xp, bonnes: nbJustes, comboMax: max })
      markRevisionDone('exercices', { score: nbJustes, total })
      // Les questions du quiz jouées dans la séance nourrissent « Refaire mes erreurs » et le défi.
      const qcms = seance.map((e, i) => ({ e, r: resultats[i] })).filter(x => x.e.type === 'qcm')
      if (qcms.length) noterErreurs(uid, lessonId, qcms.map(x => ({ question: x.e.bulle, correct: x.e.bonne })), qcms.map(x => x.r?.choix))
      setGain(g)
      mesurer('exercices_termines', { score: nbJustes, total })
      // La séance a remplacé le quiz : elle compte comme un quiz terminé dans les statistiques d'activation.
      track('quiz_termine', { source: lessonId?.startsWith('prog-') ? 'programme' : 'scan', format: 'exercices' })
      if (premiere) mesurer('premiere_revision', { etape: 'terminee', score: nbJustes, total })
      setFin(true)
      return
    }
    setIdx(i => i + 1)
    ecran.current?.scrollTo({ top: 0 })
  }

  // Ordinateur : Entrée passe à la suite une fois l'exercice corrigé.
  useEffect(() => {
    if (fin || coach || !resultat) return undefined
    function onKey(e) {
      if (e.key !== 'Enter' || (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(e.target.tagName))) return
      e.preventDefault()
      suivante()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // La première révision vient de l'inscription : elle se referme sur l'accueil.
  const fermer = () => (premiere ? navigate('/', { replace: true }) : fermerVersFiche(navigate, location))
  const boutonFermer = isDesktop
    ? <button type="button" className="fc-fermer fc-fermer--pilule" onClick={fermer}><Croix taille={18} />Fermer</button>
    : <button type="button" className="fc-fermer" onClick={fermer} aria-label="Fermer"><Croix /></button>
  const coachChat = coach && lessonId && (
    <CoachChat isOpen onClose={() => setCoach(null)} lessonId={lessonId} lessonTitle={titre} prefill={coach} />
  )
  const segments = (
    <span className="qz-segments" aria-hidden="true">
      {resultats.map((r, i) => <i key={i} className={r ? (r.juste ? 'is-juste' : 'is-faux') : ''} />)}
    </span>
  )

  // ── Fin de séance ──
  if (fin) {
    const pct = nbJustes / seance.length
    const erreurs = seance.map((e, i) => ({ e, i })).filter(({ i }) => !resultats[i]?.juste)
    const score = (
      <div className="qz-score-fin">
        <span className="qz-surtitre">Séance terminée</span>
        <span className="qz-score-grand">{nbJustes}<small> / {seance.length}</small></span>
        <span className="qz-score-legende">{nbJustes > 1 ? 'exercices réussis' : 'exercice réussi'}</span>
      </div>
    )
    const reviz = (
      <div className="ex-fin-reviz">
        <span className="ex-fin-emote rv-saut" aria-hidden="true"><Mascot pose={pct >= 0.8 ? 'trophy' : pct >= 0.5 ? 'celebration' : 'muscu'} size={isDesktop ? 150 : 110} alt="" /></span>
        <p className="ex-fin-phrase">{premiere
          ? `Ta première révision est faite. ${pct >= 0.6 ? 'Tu pars avec une longueur d’avance.' : 'Les erreurs, on les revoit ensemble.'}`
          : pct >= 0.8 ? 'Très belle séance. Ce chapitre rentre.' : pct >= 0.5 ? 'Bonne séance. Revois les erreurs, puis rejoue.' : 'On reprend ensemble : lis les corrections, puis rejoue.'}</p>
      </div>
    )
    const pastilles = (
      <div className="qz-pastilles">
        <span className="qz-enregistre"><i><Coche taille={12} /></i>{isDesktop ? 'Score enregistré sur la fiche chapitre' : 'Score enregistré'}</span>
      </div>
    )
    const bilan = <BilanXp gain={gain} uid={uid} />
    // « Montre ça à tes parents » (moins de 15 ans sans adresse de parent), comme à la fin du quiz.
    const lecon = lessonId ? loadLessons().find(l => l.id === lessonId) ?? null : null
    const montre = <MontreParent score={nbJustes} total={seance.length} lecon={lecon} />
    const recap = (
      <section className="qz-carte" aria-labelledby="ex-titre-seance">
        <div className="qz-carte-tete">
          <h2 id="ex-titre-seance" className="qz-titre2">Ta séance</h2>
          <span className="qz-parcours-compte">{seance.length} exercices</span>
        </div>
        {segments}
        <ul className="ex-recap-formats">
          {seance.map((e, i) => (
            <li key={e.id} className={resultats[i]?.juste ? 'is-juste' : 'is-faux'}>
              <i aria-hidden="true">{resultats[i]?.juste ? <Coche taille={11} /> : <Croix taille={11} />}</i>{NOMS_FORMATS[e.type]}
            </li>
          ))}
        </ul>
      </section>
    )
    const aRevoir = erreurs.length > 0 && (
      <section className="qz-revoir" aria-labelledby="ex-titre-revoir">
        <h2 id="ex-titre-revoir" className="qz-titre2">À revoir</h2>
        <div className="qz-revoir-liste">
          {erreurs.map(({ e, i }) => (
            <div key={e.id} className="qz-carte qz-erreur">
              <span className="qz-erreur-num">Exercice {i + 1} · {NOMS_FORMATS[e.type]}</span>
              <p className="qz-erreur-q">{nbsp(e.aRetenir.question)}</p>
              <div className="qz-erreur-pastilles"><span className="qz-pill qz-pill--juste">Bonne réponse : {e.aRetenir.bonne}</span></div>
              {e.explication && <p className="qz-erreur-correction">{nbsp(e.explication)}</p>}
            </div>
          ))}
        </div>
      </section>
    )
    const boutons = premiere ? (
      // La première révision mène à l'accueil, comme le quiz court d'avant.
      <div className="qz-fin-actions">
        <button type="button" className="fc-btn fc-btn--orange rv-bandes" onClick={fermer}>Continuer</button>
      </div>
    ) : (
      <div className="qz-fin-actions">
        <button type="button" className="fc-btn fc-btn--orange rv-bandes" onClick={nouvelle}>Nouvelle séance</button>
        <button type="button" className="fc-btn fc-btn--blanc rv-bandes rv-bandes--clair" onClick={() => versExercice(navigate, location, '/flashcards')}>Revoir les cartes</button>
      </div>
    )
    return (
      <div className={`app app--no-halo quiz-page fc-page qz-page qz-page--fin ex-page${isDesktop ? ' app--large fc-page--large qz-page--large' : ''}`}>
        <div className="fc-ecran qz-ecran-fin">
          <div className="fc-haut-gauche">{boutonFermer}</div>
          {isDesktop ? (
            <div className="qz-fin-grille">
              <div className="qz-fin-gauche">{score}{reviz}{pastilles}</div>
              <div className="qz-fin-droite">{bilan}{montre}{recap}{aRevoir}{boutons}<button type="button" className="fc-lien" onClick={fermer}>{premiere ? 'Retour à l’accueil' : 'Retour au chapitre'}</button></div>
            </div>
          ) : (
            <>
              {score}{reviz}{pastilles}{bilan}{montre}{recap}{aRevoir}{boutons}
              <button type="button" className="fc-lien" onClick={fermer}>{premiere ? 'Retour à l’accueil' : 'Retour au chapitre'}</button>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Exercice en cours ──
  const nbErreurs = resultat?.erreurs ?? 0
  const erreursTexte = `${nbErreurs} erreur${nbErreurs > 1 ? 's' : ''}`
  const verdictTexte = ex.type === 'paires'
    ? (resultat?.juste ? 'Toutes les paires, sans erreur' : `Paires trouvées, avec ${erreursTexte}`)
    : ex.type === 'memory'
    ? (nbErreurs === 0 ? 'Mémory sans erreur' : resultat?.juste ? `Mémory fini, avec ${erreursTexte}` : `Mémory fini, mais avec ${erreursTexte}`)
    : ex.type === 'classement'
    ? (resultat?.juste ? 'Tout est bien rangé' : `${nbErreurs} carte${nbErreurs > 1 ? 's' : ''} mal rangée${nbErreurs > 1 ? 's' : ''}`)
    : ex.type === 'selection'
    ? (resultat?.juste ? 'Toutes les bonnes cartes' : `${nbErreurs} carte${nbErreurs > 1 ? 's' : ''} de travers`)
    : ex.type === 'devinette' && resultat?.juste
    ? `Trouvé avec ${resultat.indices} indice${resultat.indices > 1 ? 's' : ''}`
    : verdict === 'juste' ? 'Bonne réponse' : 'Pas tout à fait'
  // Les formats à plusieurs éléments montrent la correction complète, pas une « bonne réponse ».
  const bonneSeule = !['paires', 'memory', 'classement'].includes(ex.type)
  const correction = verdict && (
    <div className={`qz-correction ex-correction${verdict === 'juste' ? ' is-juste' : ' is-faux'}`} role="status">
      <div className="qz-correction-haut">
        <span className="qz-correction-perso" aria-hidden="true">
          <span className={`qz-correction-reviz ${verdict === 'juste' ? 'rv-saut' : 'rv-secousse'}`}><Mascot pose={verdict === 'juste' ? 'celebration' : 'confused'} size={isDesktop ? 60 : 52} alt="" /></span>
          {verdict === 'juste' && <Etincelles r0={32} r1={46} />}
        </span>
        <span className="qz-verdict">{verdictTexte}</span>
      </div>
      {verdict === 'faux' && bonneSeule && <p className="ex-bonne">Bonne réponse : <b>{nbsp(ex.aRetenir.bonne)}</b></p>}
      {ex.explication && <p className="qz-correction-txt">{nbsp(ex.explication)}</p>}
      {verdict === 'faux' && iaDispo && (
        <button type="button" className="qz-pourquoi" onClick={() => setCoach(`J'ai raté cet exercice : « ${ex.consigne} — ${ex.bulle} ». La bonne réponse est « ${ex.aRetenir.bonne} ». Tu peux m'expliquer ?`)}>
          <span className="qz-ia-anneau" aria-hidden="true"><span><Mascot pose="coach" size={30} alt="" /></span></span>
          Pourquoi ? Demande à Réviz IA
        </button>
      )}
      <button type="button" className="qz-suivante rv-bandes" onClick={suivante}>
        {derniere ? 'Voir mon score' : 'Exercice suivant'}<Fleche />{isDesktop && <kbd>Entrée</kbd>}
      </button>
    </div>
  )
  const Format = FORMATS[ex.type]
  const exercice = <><Format key={ex.id} ex={ex} verdict={verdict} onValider={valider} grand={isDesktop} />{correction}</>
  const progression = (idx + (resultat ? 1 : 0)) / seance.length
  const barre = (
    <div className="qn-haut">
      {boutonFermer}
      <span className="qn-barre" aria-hidden="true"><i style={{ width: `${Math.max(progression * 100, 3)}%` }} /></span>
      <PastilleCombo combo={combo.combo} casse={combo.casse} palier={combo.palier} />
      <span className="qz-pastille-score" aria-label={`${nbJustes} exercices réussis sur ${nbFaits}`}>
        <i><Coche taille={12} /></i>{nbJustes} / {nbFaits}
      </span>
    </div>
  )
  const enTete = (
    <div className="qn-tete">
      <span className="qn-tete-titre">Exercices · {titre}</span>
      <span className="qn-tete-compte" aria-live="polite">{NOMS_FORMATS[ex.type]} · {idx + 1} sur {seance.length}</span>
    </div>
  )
  return (
    <div className={`app app--no-halo quiz-page fc-page qz-page qn-page ex-page${isDesktop ? ' app--large fc-page--large qn-page--large' : ''}`}>
      {isDesktop ? (
        <div className="qn-ecran" ref={ecran}>
          <div className="qn-colonne">{barre}{enTete}{exercice}</div>
          <aside className="qn-cote">
            <div className="qn-infos">
              <span className="qn-infos-titre">Score</span>
              <span className="qz-score-cours">{nbJustes} / {nbFaits || 0}</span>
              <span className="qz-score-sous">{nbJustes > 1 ? 'exercices réussis' : 'exercice réussi'}</span>
              {segments}
              <span className="qn-infos-titre qn-infos-titre--2">Raccourci</span>
              <span className="fc-touche"><kbd>Entrée</kbd>Exercice suivant</span>
            </div>
          </aside>
        </div>
      ) : (
        <div className="qn-ecran qz-ecran" ref={ecran}>{barre}{enTete}{exercice}</div>
      )}
      {coachChat}
    </div>
  )
}
