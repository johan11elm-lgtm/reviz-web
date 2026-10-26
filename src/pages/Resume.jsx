import { RefreshIcon, CheckIcon, XIcon } from '../components/Icons'
import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { fermerVersFiche, versExercice } from '../utils/navigation'
import { recordRevision, loadRevisions } from '../services/revisionService'
import { updateCardState, getCardState, countDueCards } from '../services/srsService'
import { Mascot } from '../components/Mascot'
import { MissingLessonState } from '../components/MissingLessonState'
import { FormatFeedback } from '../components/FormatFeedback'
import { CoachChat } from '../components/CoachChat'
import { BottomNav } from '../components/BottomNav'
import { Pantin } from '../components/Pantin'
import { BulleReviz } from '../components/reviz/BulleReviz'
import { Parcours } from '../components/reviz/Parcours'
import { useAuth } from '../context/AuthContext'
import { useIsDesktop } from '../hooks/useMediaQuery'
import { teinteMatiere, varsTeinte } from '../utils/teinteMatiere'
import { nbsp } from '../utils/typography'
import { resumeReadingMinutes, splitOnTerms, pickCheckCards } from '../utils/resume'
import { parseIllustrations } from '../utils/lessonSchema'
import { illustrationsAJour } from '../services/programmeService'
import { Illustration } from '../components/Illustration'
import '../components/reviz/HerosMatiere.css'
import './Resume.css'
import { mesurer } from '../services/mesure'

// ---- DONNÉES : localStorage (IA) > état vide (mock réservé au dev) ----
function getResumeData() {
  try {
    const ai = JSON.parse(localStorage.getItem('reviz-ai-data') || 'null')
    if (ai?.resume) return {
      ...ai.resume,
      title:       ai.metadata?.title   || 'Leçon',
      subject:     ai.metadata?.subject || 'Cours',
      readingTime: resumeReadingMinutes(ai.resume),
      checks:      pickCheckCards(ai.flashcards),
      nbCartes:    ai.flashcards?.length ?? 0,
      nbQuestions: ai.quiz?.length ?? 0,
      illustrations: parseIllustrations(ai.illustrations),
      xp: 30,
    }
  } catch { /* ignore */ }
  // En prod, pas de leçon = état vide honnête — jamais le mock « Pythagore ».
  if (!import.meta.env.DEV) return null
  return {
    title: "Théorème de Pythagore",
    subject: "Maths",
    readingTime: 3,
    nbCartes: 8,
    nbQuestions: 7,
    intro: "Dans un triangle rectangle, il existe une relation fondamentale entre les longueurs de ses côtés. Ce théorème est l'un des plus utilisés en géométrie.",
    keyPoints: [
      "L'hypoténuse est le côté opposé à l'angle droit",
      "La relation fondamentale : a² + b² = c²",
      "La réciproque permet de vérifier si un triangle est rectangle",
    ],
    sections: [
      {
        title: "Le triangle rectangle",
        content: "Un triangle rectangle possède exactement un angle de 90° (angle droit). Le côté opposé à cet angle droit s'appelle l'hypoténuse — c'est toujours le côté le plus long. Les deux autres côtés sont notés a et b.",
        exemple: null,
      },
      {
        title: "Le théorème de Pythagore",
        content: "Dans un triangle rectangle de côtés a, b et c (c étant l'hypoténuse) :",
        formula: "a² + b² = c²",
        formulaCaption: "Somme des carrés des deux côtés = carré de l'hypoténuse",
      },
      {
        title: "Calcul pratique",
        content: "Trouver l'hypoténuse : c = √(a² + b²)\nTrouver un côté : a = √(c² − b²)\n\nExemple — triangle 3-4-5 :\n3² + 4² = 9 + 16 = 25 = 5² ✓",
      },
      {
        title: "La réciproque",
        content: "Si dans un triangle on vérifie que a² + b² = c² (c étant le plus grand côté), alors ce triangle est nécessairement rectangle, avec l'angle droit face au côté c.",
        exemple: "Triangle de côtés 6, 8 et 10 : 6² + 8² = 36 + 64 = 100 = 10², il est rectangle.",
      },
    ],
    methode: {
      titre: "Comment calculer une longueur avec Pythagore",
      etapes: [
        "Vérifier que le triangle est rectangle et repérer l'hypoténuse.",
        "Écrire l'égalité de Pythagore avec les noms des côtés.",
        "Remplacer par les longueurs connues et calculer.",
        "Prendre la racine carrée et donner l'unité.",
      ],
    },
    pieges: [
      "N'applique pas le théorème à un triangle qui n'est pas rectangle : vérifie d'abord l'angle droit.",
      "L'hypoténuse est toujours seule de son côté de l'égalité : c² = a² + b², jamais a² = b² + c² au hasard.",
    ],
    checks: [
      { front: "Comment s'appelle le côté opposé à l'angle droit ?", back: "L'hypoténuse, toujours le plus long côté." },
      { front: "Que dit le théorème de Pythagore ?", back: "Dans un triangle rectangle, a² + b² = c², c étant l'hypoténuse." },
      { front: "À quoi sert la réciproque ?", back: "À prouver qu'un triangle est rectangle." },
    ],
    keyTerms: [
      { term: "Hypoténuse", def: "Côté opposé à l'angle droit. Toujours le plus long." },
      { term: "Triangle rectangle", def: "Triangle possédant exactement un angle de 90°." },
      { term: "Réciproque", def: "Si a² + b² = c², le triangle est rectangle." },
      { term: "Racine carrée (√)", def: "L'inverse du carré. √25 = 5 car 5² = 25." },
    ],
    xp: 30,
  }
}

export default function Resume() {
  // Décision stable pour toute la vie du composant (rules-of-hooks safe).
  const [hasData] = useState(() => getResumeData() !== null)
  if (!hasData) return <MissingLessonState title="Résumé" />
  return <ResumeContent />
}

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`
const Horloge = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
)
const Chevron = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
)
const Fleche = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
)
const Exclamation = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C25407" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M12 5v9M12 19v.5" /></svg>
)

/**
 * Résumé d'un chapitre (handoff Claude Design du 21/10) : une page de lecture. Héros dans la
 * teinte de la matière avec Réviz, « Teste-toi » à cheval (points à retenir et définitions
 * cachés, révélés au toucher), puis l'intro, À retenir, les parties, la méthode, les pièges,
 * les mots clés et « Vérifie-toi ». « J'ai fini le résumé » le marque comme lu et ouvre
 * l'écran de fin (temps passé, XP, parcours, suite). Sur ordinateur : sommaire qui suit la
 * lecture à gauche, colonne de 680 px, À retenir et Mots clés à droite.
 */
function ResumeContent() {
  const navigate = useNavigate()
  const location = useLocation()
  const isDesktop = useIsDesktop()
  const { isGuest } = useAuth()
  useEffect(() => { mesurer('format_ouvert', { format: 'resume' }) }, [])
  const resumeData = useMemo(() => getResumeData(), [])
  // Rubriques récentes : absentes des leçons enregistrées avant octobre 2026.
  const methode = resumeData.methode?.etapes?.length ? resumeData.methode : null
  const pieges = Array.isArray(resumeData.pieges) ? resumeData.pieges : []
  const checks = Array.isArray(resumeData.checks) ? resumeData.checks : []
  const keyTerms = resumeData.keyTerms ?? []
  const sections = resumeData.sections ?? []
  const illustrations = useIllustrations(resumeData.illustrations ?? [])
  const figuresDe = ancre => illustrations.filter(ill => ill.ancre === ancre)
  const teinte = teinteMatiere(resumeData.subject)

  const coachLessonId = useMemo(() => localStorage.getItem('reviz-current-lesson-id'), [])
  const [coachOpen, setCoachOpen] = useState(false)
  const iaDispo = !!coachLessonId && !isGuest

  // Mode « Teste-toi » : points à retenir et définitions cachés, révélés au toucher.
  const [testMode, setTestMode] = useState(false)
  const basculerTest = () => setTestMode(m => !m)

  // Lecture : progression, partie en cours (sommaire), barre du haut sur téléphone.
  const defile = useRef(null)
  const [progress, setProgress] = useState(0)
  const [active, setActive] = useState(0)
  const [barre, setBarre] = useState(false)
  const debut = useRef(Date.now())
  const [fin, setFin] = useState(false)
  const [minutesLues, setMinutesLues] = useState(1)

  const sommaire = [
    { id: 'intro', label: 'Introduction' },
    ...sections.map((sec, i) => ({ id: `partie-${i}`, label: sansNumero(sec.title) })),
    methode && { id: 'methode', label: 'Méthode' },
    pieges.length > 0 && { id: 'pieges', label: 'Pièges' },
    checks.length > 0 && { id: 'verifie', label: 'Vérifie-toi' },
  ].filter(Boolean)

  function surDefilement() {
    const el = defile.current
    if (!el || fin) return
    const max = el.scrollHeight - el.clientHeight
    setProgress(max <= 0 ? 1 : Math.min(1, el.scrollTop / max))
    setBarre(el.scrollTop > 420)
    // La partie active : la dernière dont le haut passe au-dessus de 35 % de l'écran.
    const seuil = window.innerHeight * 0.35
    let i = 0
    sommaire.forEach((e, k) => {
      const bloc = document.getElementById(`rs-${e.id}`)
      if (bloc && bloc.getBoundingClientRect().top < seuil) i = k
    })
    setActive(i)
  }
  const allerA = id => {
    const el = defile.current, bloc = document.getElementById(`rs-${id}`)
    if (!el || !bloc) return
    el.scrollTo({ top: el.scrollTop + bloc.getBoundingClientRect().top - el.getBoundingClientRect().top - 40, behavior: 'smooth' })
  }

  function finir() {
    recordRevision('resume')
    setMinutesLues(Math.max(1, Math.round((Date.now() - debut.current) / 60000)))
    setFin(true)
    setBarre(false)
    defile.current?.scrollTo(0, 0)
  }
  function relire() {
    setFin(false)
    setProgress(0)
    setActive(0)
    debut.current = Date.now()
    defile.current?.scrollTo(0, 0)
  }
  const resteMin = Math.max(1, Math.ceil(resumeData.readingTime * (1 - progress)))

  // Ce que dit Réviz.
  const lignes = fin
    ? ['Bien joué, c’est lu.', 'Les flashcards vont t’aider à retenir.']
    : [`${pluriel(resumeData.readingTime, 'minute')}, ${pluriel(sections.length, 'partie')}.`,
       checks.length ? `${pluriel(checks.length, 'question')} t’attendent à la fin.` : 'Prends ton temps.']
  const [parle, setParle] = useState(false)
  const pantin = useRef(null)
  const texte = lignes.join('\n')
  useEffect(() => { if (parle) pantin.current?.dire(texte) }, [texte, parle])
  useEffect(() => {
    let t
    const essai = () => { t = setTimeout(() => (document.hidden ? essai() : setParle(true)), 4000) }
    essai()
    return () => clearTimeout(t)
  }, [])

  const retourFiche = () => fermerVersFiche(navigate, location)
  const boutonRetour = (
    <button type="button" className="rs-retour" onClick={retourFiche}><Chevron />Fiche chapitre</button>
  )
  const reviz = (
    <div className="rs-reviz">
      <BulleReviz key={texte} lignes={lignes} parle={parle} className="rs-bulle" />
      <Pantin
        key={fin ? 'fin' : 'lecture'}
        ref={pantin}
        size={isDesktop ? 320 : 220}
        expression={fin ? 'fier' : 'content'}
        entree={fin ? 'saut' : undefined}
        repli={null}
        onEntree={() => setParle(true)}
        onClick={() => pantin.current?.geste('saut')}
        label="Réviz, ta mascotte"
      />
    </div>
  )
  const deco = (
    <>
      <span className="ch-deco ch-deco--a" aria-hidden="true" />
      <span className="ch-deco ch-deco--b" aria-hidden="true" />
      <span className="ch-deco ch-deco--c" aria-hidden="true" />
      {isDesktop && <span className="ch-deco ch-deco--d" aria-hidden="true" />}
      <span className="ch-point" aria-hidden="true" />
      <span className="ch-grain" aria-hidden="true" />
    </>
  )

  // ── Teste-toi ──
  const interrupteur = (petit = false) => (
    <span className={`rs-interrupteur${testMode ? ' is-on' : ''}${petit ? ' rs-interrupteur--petit' : ''}`} aria-hidden="true"><i /></span>
  )
  const carteTeste = (
    <button type="button" className="rs-teste" role="switch" aria-checked={testMode} aria-label="Teste-toi" onClick={basculerTest}>
      <span className="rs-teste-rond" aria-hidden="true"><Mascot pose="thinking" size={isDesktop ? 40 : 48} alt="" /></span>
      <span className="rs-teste-txt">
        <span className="rs-teste-titre">Teste-toi</span>
        <span className="rs-teste-sous">{testMode ? 'Points clés et définitions cachés.' : 'Cache les points clés et les définitions.'}</span>
      </span>
      {interrupteur(isDesktop)}
    </button>
  )

  // ── Blocs de lecture ──
  const aRetenir = (
    <section className="rs-carte rs-retenir" aria-labelledby="rs-titre-retenir">
      <div className="rs-carte-tete">
        <h2 id="rs-titre-retenir" className="rs-carte-titre">À retenir</h2>
        {testMode && <span className="rs-indice">Touche pour révéler</span>}
      </div>
      <ol className="rs-points">
        {resumeData.keyPoints.map((pt, i) => (
          <li key={i}>
            <span className="rs-num">{i + 1}</span>
            <Cache key={`${i}-${testMode}`} hidden={testMode} className="rs-point-txt" label={`Point ${i + 1}`}>{nbsp(pt)}</Cache>
          </li>
        ))}
      </ol>
    </section>
  )
  const motsCles = keyTerms.length > 0 && (
    <section className="rs-carte rs-mots" aria-labelledby="rs-titre-mots">
      <div className="rs-carte-tete">
        <h2 id="rs-titre-mots" className="rs-carte-titre">Mots clés</h2>
        {testMode && <span className="rs-indice">Touche pour révéler</span>}
      </div>
      <dl className="rs-mots-liste">
        {keyTerms.map((item, i) => (
          <div key={i} className="rs-mot">
            <dt>{item.term}</dt>
            <Cache key={String(testMode)} hidden={testMode} className="rs-mot-def" label={`Définition de ${item.term}`} as="dd">{item.def}</Cache>
          </div>
        ))}
      </dl>
    </section>
  )

  const lecture = (
    <>
      <div id="rs-intro" className="rs-intro">
        <p>{nbsp(resumeData.intro)}</p>
        {figuresDe('resume.intro').map(ill => <Illustration key={ill.id} illustration={ill} testMode={testMode} />)}
      </div>
      {!isDesktop && aRetenir}
      {sections.map((section, i) => (
        <Partie key={i} index={i} section={section} keyTerms={keyTerms} illustrations={figuresDe(`resume.sections[${i}]`)} testMode={testMode} />
      ))}
      {methode && (
        <section id="rs-methode" className="rs-carte rs-methode" aria-labelledby="rs-titre-methode">
          <span className="rs-surtitre">Méthode</span>
          <h2 id="rs-titre-methode" className="rs-methode-titre">{nbsp(methode.titre)}</h2>
          {figuresDe('resume.methode').map(ill => <Illustration key={ill.id} illustration={ill} testMode={testMode} />)}
          <ol className="rs-etapes">
            {methode.etapes.map((etape, i) => (
              <li key={i}><span className="rs-etape-num">{i + 1}</span><span>{nbsp(etape)}</span></li>
            ))}
          </ol>
        </section>
      )}
      {pieges.length > 0 && (
        <section id="rs-pieges" className="rs-bloc" aria-labelledby="rs-titre-pieges">
          <h2 id="rs-titre-pieges" className="rs-titre2">Pièges à éviter</h2>
          <div className="rs-pieges">
            {pieges.map((piege, i) => (
              <div className="rs-piege" key={i}>
                <span className="rs-piege-rond"><Exclamation /></span>
                <span className="rs-piege-txt">{nbsp(piege)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      {!isDesktop && motsCles}
      {checks.length > 0 && (
        <section id="rs-verifie" className="rs-bloc" aria-labelledby="rs-titre-verifie">
          <h2 id="rs-titre-verifie" className="rs-titre2">Vérifie-toi</h2>
          <p className="rs-sous">Réponds dans ta tête, puis regarde.</p>
          <div className="rs-checks">
            {checks.map((card, i) => <CheckCard key={card.index ?? i} n={i + 1} card={card} lessonId={coachLessonId} />)}
          </div>
        </section>
      )}
      <section className="rs-finir">
        <span className="rs-finir-rond" aria-hidden="true"><Mascot pose="coach" size={isDesktop ? 66 : 70} alt="" /></span>
        <span className="rs-finir-txt">
          <span className="rs-finir-titre">Tu es arrivé au bout.</span>
          {isDesktop && <span className="rs-finir-sous">Valide ta lecture pour passer à la suite.</span>}
        </span>
        <button type="button" className="rs-cta" onClick={finir}>J’ai fini le résumé</button>
      </section>
    </>
  )

  // ── Écran de fin ──
  const total = resumeData.nbCartes
  let vues = 0, dues = 0
  if (coachLessonId) {
    for (let i = 0; i < total; i++) if (getCardState(coachLessonId, i)) vues++
    dues = countDueCards(coachLessonId, total)
  }
  const quizFait = !!coachLessonId && loadRevisions().some(r => r.lessonId === coachLessonId && r.type === 'quiz')
  const cartesFaites = total > 0 && vues === total && dues === 0
  const etapes = [
    { id: 'resume', nom: 'Résumé', pose: 'reading', to: '/resume', meta: 'Lu', statut: 'fait' },
    { id: 'flashcards', nom: 'Flashcards', pose: 'flashcard', to: '/flashcards', meta: vues ? `${vues} / ${total} vues` : pluriel(total, 'carte'), statut: cartesFaites ? 'fait' : 'cours' },
    { id: 'quiz', nom: 'Quiz corrigé', pose: 'quiz', to: '/quiz', meta: quizFait ? 'Fait' : pluriel(resumeData.nbQuestions, 'question'), statut: quizFait ? 'fait' : cartesFaites ? 'cours' : 'afaire' },
  ]
  const suite = cartesFaites && !quizFait
    ? { to: '/quiz', label: `Passer au quiz · ${pluriel(resumeData.nbQuestions, 'question')}` }
    : { to: '/flashcards', label: `Passer aux flashcards · ${pluriel(total, 'carte')}` }
  const ecranFin = (
    <div className="rs-fin">
      <div className="rs-stats">
        <span><b>{minutesLues} min</b>de lecture</span>
        <span><b className="rs-xp">+{resumeData.xp} XP</b>gagnés</span>
        <span><b>{sections.length} / {sections.length}</b>parties lues</span>
      </div>
      <section className="rs-bloc" aria-labelledby="rs-titre-parcours">
        <div className="rs-bloc-tete">
          <h2 id="rs-titre-parcours" className="rs-titre2">Ton parcours</h2>
          <span className="rs-compte">{etapes.filter(e => e.statut === 'fait').length} / 3</span>
        </div>
        <Parcours etapes={etapes} grand={isDesktop} cases={isDesktop ? [0.145, 0.5, 0.855] : undefined} remplacer etat={location.state} />
      </section>
      <div className="rs-fin-actions">
        <button type="button" className="rs-cta rs-cta--grand" onClick={() => versExercice(navigate, location, suite.to)}>{suite.label}<Fleche /></button>
        {iaDispo && (
          <button type="button" className="rs-ia" onClick={() => setCoachOpen(true)}>
            <span className="rs-ia-anneau" aria-hidden="true"><span><Mascot pose="coach" size={36} alt="" /></span></span>
            <span className="rs-ia-txt"><b>Une question ?</b>Demande à Réviz IA</span>
          </button>
        )}
      </div>
      <FormatFeedback format="resume" question="Ce résumé t'a aidé ?" />
      <button type="button" className="rs-relire" onClick={relire}><RefreshIcon /> Relire le résumé</button>
    </div>
  )

  const hero = (
    <div className={`ch-hero rs-hero${fin ? ' rs-hero--fin' : ''}`}>
      {deco}
      <div className="rs-hero-int">
        <div className="ch-haut">{boutonRetour}</div>
        <div className="rs-hero-grille">
          <div className="rs-hero-txt">
            <span className="ch-surtitre">{resumeData.subject} · Résumé</span>
            <h1 className="ch-titre rs-titre">{fin ? 'Résumé lu' : resumeData.title}</h1>
            {!fin && (
              <span className="rs-pastilles">
                <span className="rs-pastille"><Horloge />{resumeData.readingTime} min de lecture</span>
                <span className="rs-pastille">{pluriel(sections.length, 'partie')}</span>
                <span className="ai-badge rs-ia-badge">✦ Généré par IA</span>
              </span>
            )}
          </div>
          {reviz}
        </div>
      </div>
    </div>
  )

  return (
    <div className={`app app--no-halo ch-page resume-page rs-page${isDesktop ? ' app--large ch-page--large rs-page--large' : ''}`} style={varsTeinte(teinte)}>
      {/* Progression de lecture : une barre en haut (téléphone, après le héros), un trait (ordinateur) */}
      {!fin && (isDesktop ? (
        <div className="rs-trait" aria-hidden="true"><i style={{ width: `${progress * 100}%` }} /></div>
      ) : (
        <div className={`rs-barre${barre ? ' is-la' : ''}`} aria-hidden={!barre}>
          <div className="rs-barre-ligne">
            <button type="button" className="rs-barre-retour" onClick={retourFiche} aria-label="Fiche chapitre" tabIndex={barre ? 0 : -1}><Chevron /></button>
            <span className="rs-barre-txt"><b>{resumeData.title}</b>Encore {resteMin} min environ</span>
            <button type="button" className={`rs-barre-teste${testMode ? ' is-on' : ''}`} onClick={basculerTest} aria-pressed={testMode} tabIndex={barre ? 0 : -1}>Teste-toi</button>
          </div>
          <span className="rs-barre-progres"><i style={{ width: `${progress * 100}%` }} /></span>
        </div>
      ))}

      <div className="content rs-defile" ref={defile} onScroll={surDefilement}>
        {hero}
        {fin ? ecranFin : isDesktop ? (
          <div className="rs-grille">
            <aside className="rs-gauche">
              <nav className="rs-sommaire" aria-label="Sommaire du résumé">
                <div className="rs-sommaire-tete">
                  <span className="rs-sommaire-titre">Sommaire</span>
                  <span className="rs-sommaire-pct">{Math.round(progress * 100)} % lu</span>
                  <span className="rs-sommaire-reste">encore {resteMin} min</span>
                  <span className="rs-sommaire-barre"><i style={{ width: `${progress * 100}%` }} /></span>
                </div>
                <ol className="rs-sommaire-liste">
                  {sommaire.map((e, i) => (
                    <li key={e.id}>
                      <button type="button" className={`rs-entree${i < active ? ' rs-entree--lue' : i === active ? ' rs-entree--active' : ''}`} onClick={() => allerA(e.id)}
                        aria-current={i === active ? 'location' : undefined}>
                        <span className="rs-entree-case" aria-hidden="true">{i < active && <CheckIcon />}</span>
                        <span className="rs-entree-txt">{e.label}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </nav>
              {carteTeste}
            </aside>
            <div className="rs-lecture">{lecture}</div>
            <aside className="rs-droite">{aRetenir}{motsCles}</aside>
          </div>
        ) : (
          <>
            <div className="rs-teste-place">{carteTeste}</div>
            <div className="rs-lecture">{lecture}</div>
          </>
        )}
      </div>

      {!isDesktop && <BottomNav />}
      {coachOpen && coachLessonId && (
        <CoachChat isOpen onClose={() => setCoachOpen(false)} lessonId={coachLessonId} lessonTitle={resumeData.title} />
      )}
    </div>
  )
}

/**
 * Illustrations de la leçon. Pour un chapitre du programme, on relit celles du
 * fichier du chapitre : une figure ajoutée après la première ouverture
 * apparaît aussi, sans attendre que l'élève rouvre le chapitre.
 */
function useIllustrations(initiales) {
  const [liste, setListe] = useState(initiales)
  useEffect(() => {
    let annule = false
    illustrationsAJour()
      .then(l => { if (!annule && l) setListe(l) })
      .catch(() => { /* hors ligne : on garde celles de la copie */ })
    return () => { annule = true }
  }, [])
  return liste
}

/**
 * Texte flouté tant qu'on ne l'a pas touché (mode « Teste-toi »).
 * Hors mode test, simple conteneur.
 */
function Cache({ hidden, className, label, children, as: Balise = 'span' }) {
  const [revealed, setRevealed] = useState(false)
  if (!hidden || revealed) return <Balise className={className}>{children}</Balise>
  return (
    <Balise className={className}>
      <button type="button" className="rs-cache" onClick={() => setRevealed(true)} aria-label={`${label} : masqué, touche pour révéler`}>
        <span aria-hidden="true">{children}</span>
      </button>
    </Balise>
  )
}

// « 1. Le triangle rectangle » → « Le triangle rectangle » : le numéro passe dans le surtitre.
const sansNumero = titre => String(titre ?? '').replace(/^\s*\d+\s*[.)\-–]\s*/, '')

/** Une partie du cours : surtitre, titre, paragraphes (termes à toucher), figures, formule, exemple. */
function Partie({ index, section, keyTerms, illustrations = [], testMode = false }) {
  const [openTerm, setOpenTerm] = useState(null)
  const termNames = keyTerms.map(t => t.term)
  const def = openTerm && keyTerms.find(t => t.term === openTerm)
  const paras = String(section.content ?? '').split(/\n\s*\n/).filter(p => p.trim())
  return (
    <section id={`rs-partie-${index}`} className="rs-partie" aria-labelledby={`rs-titre-partie-${index}`}>
      <span className="rs-surtitre">Partie {index + 1}</span>
      <h2 id={`rs-titre-partie-${index}`} className="rs-partie-titre">{nbsp(sansNumero(section.title))}</h2>
      {paras.map((para, k) => (
        <p key={k} className="rs-texte">
          {splitOnTerms(nbsp(para), termNames).map((seg, i) => (
            seg.term ? (
              <button key={i} type="button" className={`rs-terme${openTerm === seg.term ? ' is-open' : ''}`} aria-expanded={openTerm === seg.term}
                onClick={() => setOpenTerm(t => (t === seg.term ? null : seg.term))}>
                {seg.text}
              </button>
            ) : seg.text
          ))}
        </p>
      ))}
      {def && (
        <div className="rs-terme-def" role="status">
          <span><strong>{def.term}</strong> : {nbsp(def.def)}</span>
          <button type="button" onClick={() => setOpenTerm(null)} aria-label="Fermer la définition"><XIcon /></button>
        </div>
      )}
      {illustrations.map(ill => <Illustration key={ill.id} illustration={ill} testMode={testMode} />)}
      {section.formula && (
        <div className="rs-formule">
          <div className={`rs-formule-txt${String(section.formula).length > 18 ? ' rs-formule-txt--long' : ''}`}>{section.formula}</div>
          {section.formulaCaption && <div className="rs-formule-legende">{section.formulaCaption}</div>}
        </div>
      )}
      {section.exemple && (
        <div className="rs-exemple">
          <span className="rs-exemple-etiquette">Exemple</span>
          <div className="rs-exemple-txt">{nbsp(section.exemple)}</div>
        </div>
      )}
    </section>
  )
}

const VERDICTS = {
  got:   'Noté. Elle reviendra plus tard dans tes flashcards.',
  again: 'Noté. Elle reviendra dès demain dans tes flashcards.',
}

/** Une question de « Vérifie-toi » : la réponse, puis « Je savais » / « À revoir » (répétition espacée). */
function CheckCard({ n, card, lessonId }) {
  const [shown, setShown] = useState(false)
  const [verdict, setVerdict] = useState(null)
  function grade(outcome) {
    updateCardState(lessonId, card.index, outcome)
    setVerdict(outcome)
  }
  return (
    <div className="rs-check">
      <div className="rs-check-haut">
        <span className="rs-num">{n}</span>
        <span className="rs-check-question">{nbsp(card.front)}</span>
        {!shown && <button type="button" className="rs-check-voir" onClick={() => setShown(true)}>Voir la réponse</button>}
      </div>
      {shown && (
        <div className="rs-check-reponse">
          <div className="rs-check-reponse-txt">{nbsp(card.back)}</div>
          {lessonId && !verdict && (
            <div className="rs-check-notes">
              <button type="button" className="rs-check-note is-got" onClick={() => grade('got')}><CheckIcon /> Je savais</button>
              <button type="button" className="rs-check-note is-again" onClick={() => grade('again')}><RefreshIcon /> À revoir</button>
            </div>
          )}
          {verdict && <p className={`rs-check-verdict is-${verdict}`} role="status">{VERDICTS[verdict]}</p>}
        </div>
      )}
    </div>
  )
}
