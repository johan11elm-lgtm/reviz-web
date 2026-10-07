import { RefreshIcon, ChatIcon, StarIcon, AlertIcon, BookOpenIcon, TargetIcon, KeyIcon, CheckIcon, XIcon } from '../components/Icons'
import { useState, useRef, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { recordRevision } from '../services/revisionService'
import { updateCardState } from '../services/srsService'
import { PageHeader } from '../components/PageHeader'
import { PageIntro } from '../components/PageIntro'
import { Mascot } from '../components/Mascot'
import { MissingLessonState } from '../components/MissingLessonState'
import { FormatFeedback } from '../components/FormatFeedback'
import { CoachChat, CoachHeaderButton } from '../components/CoachChat'
import { subjectInfo as sharedSubjectInfo } from '../utils/subjects'
import { nbsp } from '../utils/typography'
import { resumeReadingMinutes, splitOnTerms, pickCheckCards } from '../utils/resume'
import './Resume.css'

function subjectInfo(s) {
  return sharedSubjectInfo(s);
}

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
      xp: 30,
    }
  } catch { /* ignore */ }
  // En prod, pas de leçon = état vide honnête — jamais le mock « Pythagore ».
  if (!import.meta.env.DEV) return null
  return {
    title: "Théorème de Pythagore",
    subject: "Maths",
    readingTime: 3,
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

function ResumeContent() {
  useEffect(() => { recordRevision('resume') }, [])
  const resumeData = getResumeData()
  const info = subjectInfo(resumeData.subject)
  // Rubriques récentes : absentes des leçons enregistrées avant octobre 2026.
  const methode = resumeData.methode?.etapes?.length ? resumeData.methode : null
  const pieges = Array.isArray(resumeData.pieges) ? resumeData.pieges : []
  const checks = Array.isArray(resumeData.checks) ? resumeData.checks : []

  // Mode « Me tester » : points à retenir et définitions masqués, révélés au toucher.
  const [testMode, setTestMode] = useState(false)
  const testToggle = (
    <button
      type="button"
      className={`resume-test-toggle${testMode ? ' is-on' : ''}`}
      aria-pressed={testMode}
      onClick={() => setTestMode(m => !m)}
    >
      {testMode ? 'Tout afficher' : 'Me tester'}
    </button>
  )

  const [scrollPct, setScrollPct] = useState(0)
  const [showEnd, setShowEnd]     = useState(false)
  const contentRef                = useRef(null)

  // Coach — uniquement sur une vraie leçon (le contexte serveur exige son id).
  const coachLessonId = useMemo(() => localStorage.getItem('reviz-current-lesson-id'), [])
  const [coachOpen, setCoachOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setScrollPct(max <= 0 ? 100 : (window.scrollY / max) * 100)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function restartResume() {
    setShowEnd(false)
    setScrollPct(0)
    window.scrollTo(0, 0)
  }

  const [shareDone, setShareDone] = useState(false)
  async function handleShare() {
    const text = `${resumeData.title} (${resumeData.subject})\n\n`
      + 'À retenir :\n'
      + resumeData.keyPoints.map(p => `• ${p}`).join('\n')
      + '\n\n---\nGénéré avec Réviz'
    try {
      if (navigator.share) {
        await navigator.share({ title: resumeData.title, text })
      } else {
        await navigator.clipboard.writeText(text)
        setShareDone(true)
        setTimeout(() => setShareDone(false), 2500)
      }
    } catch { /* annulé par l'utilisateur */ }
  }

  const shareBtn = (
    <button
      type="button"
      className="rv-bell-btn"
      onClick={handleShare}
      aria-label="Partager le résumé"
      title="Partager"
    >
      {shareDone ? '✓' : '↗'}
    </button>
  );

  return (
    <div className="app resume-page">

      {/* ── Écran de fin ── */}
      {showEnd && (
        <div className="rv-end-screen resume-end-screen">
          <Mascot
            pose="celebration"
            size={240}
            glow
            animate
            priority
            className="rv-end-screen-mascot"
            alt=""
            aria-hidden="true"
          />
          <h2 className="rv-end-screen-title">Leçon maîtrisée !</h2>
          <p className="rv-end-screen-sub">
            Tu as relu l'essentiel. La révision régulière, c'est la clé !
          </p>
          <div className="resume-end-stats rv-card rv-card--padded">
            <div className="resume-end-stat">
              <span className="rv-stat-value rv-stat-value--md" style={{ color: 'var(--accent-green)' }}>{resumeData.sections.length}</span>
              <span className="rv-stat-label">Sections</span>
            </div>
            <div className="rv-stat-separator" />
            <div className="resume-end-stat">
              <span className="rv-stat-value rv-stat-value--md" style={{ color: 'var(--accent-orange)' }}>{resumeData.keyTerms.length}</span>
              <span className="rv-stat-label">Termes</span>
            </div>
            <div className="rv-stat-separator" />
            <div className="resume-end-stat">
              <span className="rv-stat-value rv-stat-value--md" style={{ color: info.dot }}>{resumeData.readingTime}</span>
              <span className="rv-stat-label">min lues</span>
            </div>
          </div>
          <div className="resume-xp-badge">+{resumeData.xp} XP gagnés !</div>
          <FormatFeedback format="resume" question="Ce résumé t'a aidé ?" />
          <div className="rv-end-screen-actions">
            <button type="button" className="rv-btn-cta rv-btn-cta--full" onClick={restartResume}>
              <span><RefreshIcon /> Relire</span>
            </button>
            {coachLessonId && (
              <button type="button" className="rv-btn-cta rv-btn-cta--full rv-btn-cta--ghost" onClick={() => setCoachOpen(true)}>
                <ChatIcon /> Encore un doute ? Demande au coach
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
        right={coachLessonId
          ? <><CoachHeaderButton onClick={() => setCoachOpen(true)} />{shareBtn}</>
          : shareBtn}
      />

      {/* Barre de lecture liée au scroll */}
      <div className="resume-reading-bar" aria-hidden="true">
        <div
          className="resume-reading-fill"
          style={{ width: scrollPct + '%', background: info.dot }}
        />
      </div>

      {/* ── Contenu scrollable ── */}
      <div className="content resume-content" ref={contentRef}>

        {/* Intro façon Home — titre de la leçon, matière · temps de lecture, mascotte reading */}
        <PageIntro
          title={resumeData.title}
          sub={`${resumeData.subject} · ${resumeData.readingTime} min de lecture`}
          mascot="reading"
          mascotSize={140}
          className="resume-intro"
        />
        <div className="resume-ai-row">
          <span className="ai-badge">✦ Généré par IA</span>
        </div>

        {/* À retenir */}
        <div className="rv-callout rv-callout--violet resume-retenir">
          <div className="resume-retenir-head">
            <span className="rv-callout-label">
              <StarIcon /> À retenir
            </span>
            {testToggle}
          </div>
          <p className="resume-retenir-intro">{nbsp(resumeData.intro)}</p>
          {testMode && <p className="resume-test-hint">Récite chaque point, puis touche-le pour vérifier.</p>}
          <div className="resume-retenir-points">
            {resumeData.keyPoints.map((pt, i) => (
              <Cache key={`${i}-${testMode}`} hidden={testMode} className="resume-retenir-point" label={`Point ${i + 1}`}>
                <span className="resume-point-num">{i + 1}</span>
                <span className="resume-cache-text">{nbsp(pt)}</span>
              </Cache>
            ))}
          </div>
        </div>

        {/* Sections du cours */}
        <BlockLabel icon={<BookOpenIcon />} color={info.dot}>Le cours</BlockLabel>

        {resumeData.sections.map((section, i) => (
          <SectionCard key={i} index={i} section={section} keyTerms={resumeData.keyTerms} accent={info.dot} />
        ))}

        {/* Méthode : le savoir-faire du chapitre, en étapes */}
        {methode && (
          <>
            <BlockLabel icon={<TargetIcon />} color={info.dot}>La méthode</BlockLabel>
            <div className="rv-card rv-card--padded resume-methode">
              <h3 className="resume-section-heading">{nbsp(methode.titre)}</h3>
              <ol className="resume-methode-steps">
                {methode.etapes.map((etape, i) => (
                  <li key={i}>
                    <span className="resume-methode-num" style={{ background: info.dot }}>{i + 1}</span>
                    <span>{nbsp(etape)}</span>
                  </li>
                ))}
              </ol>
            </div>
          </>
        )}

        {/* Pièges : erreurs classiques et bon réflexe */}
        {pieges.length > 0 && (
          <>
            <BlockLabel icon={<AlertIcon />} color={info.dot}>Pièges à éviter</BlockLabel>
            <div className="rv-callout rv-callout--orange resume-pieges">
              {pieges.map((piege, i) => (
                <div className="resume-piege" key={i}>
                  <AlertIcon className="resume-piege-icon" />
                  <span>{nbsp(piege)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Vocabulaire (masquable en mode « Me tester ») */}
        <BlockLabel icon={<KeyIcon />} color={info.dot} right={testToggle}>Vocabulaire clé</BlockLabel>

        <div className="resume-terms-grid">
          {resumeData.keyTerms.map((item, i) => (
            <div className="rv-card rv-card--tight resume-term-card" key={i}>
              <div className="resume-term-name" style={{ color: info.dot }}>{item.term}</div>
              <Cache key={String(testMode)} hidden={testMode} className="resume-term-def" label={`Définition de ${item.term}`}>
                <span className="resume-cache-text">{item.def}</span>
              </Cache>
            </div>
          ))}
        </div>

        {/* Vérifie-toi : rappel actif sur trois flashcards, relié à la répétition espacée */}
        {checks.length > 0 && (
          <div className="rv-card rv-card--padded resume-checks">
            <div className="resume-checks-head">
              <Mascot pose="thinking" size={64} alt="" aria-hidden="true" />
              <div>
                <h3 className="resume-checks-title">Vérifie-toi</h3>
                <p className="resume-checks-sub">Réponds dans ta tête, puis regarde la réponse.</p>
              </div>
            </div>
            {checks.map(card => (
              <CheckCard key={card.index} card={card} lessonId={coachLessonId} />
            ))}
          </div>
        )}

        {/* CTA */}
        <button
          type="button"
          className="rv-btn-cta rv-btn-cta--full resume-cta"
          onClick={() => setShowEnd(true)}
        >
          <span>✓ J'ai tout lu !</span>
        </button>

      </div>

      {coachOpen && coachLessonId && (
        <CoachChat
          isOpen
          onClose={() => setCoachOpen(false)}
          lessonId={coachLessonId}
          lessonTitle={resumeData.title}
        />
      )}
    </div>
  )
}

function BlockLabel({ icon, color, right, children }) {
  return (
    <div className="resume-block-label">
      <span className="resume-block-label-text">
        <span className="resume-block-label-icon" style={{ color }}>{icon}</span>
        {children}
      </span>
      {right}
    </div>
  )
}

/**
 * Texte masqué tant qu'on ne l'a pas touché (mode « Me tester »).
 * Hors mode test, simple conteneur.
 */
function Cache({ hidden, className, label, children }) {
  const [revealed, setRevealed] = useState(false)
  if (!hidden || revealed) return <div className={className}>{children}</div>
  return (
    <button
      type="button"
      className={`${className} resume-cache is-hidden`}
      onClick={() => setRevealed(true)}
      aria-label={`${label} : masqué, touche pour révéler`}
    >
      <span aria-hidden="true" className="resume-cache-inner">{children}</span>
    </button>
  )
}

// « 1. Le triangle rectangle » → « Le triangle rectangle » : le numéro passe dans la pastille.
const sansNumero = titre => String(titre ?? '').replace(/^\s*\d+\s*[.)\-–]\s*/, '')

function SectionCard({ index, section, keyTerms, accent }) {
  const [openTerm, setOpenTerm] = useState(null)
  const termNames = keyTerms.map(t => t.term)
  const def = openTerm && keyTerms.find(t => t.term === openTerm)
  return (
    <div className="rv-card resume-section-card" style={{ '--resume-accent': accent }}>
      <div className="resume-section-head">
        <span className="resume-section-num" style={{ background: accent }}>{index + 1}</span>
        <h3 className="resume-section-heading">{nbsp(sansNumero(section.title))}</h3>
      </div>
      <div className="resume-section-body">
        {splitOnTerms(nbsp(section.content), termNames).map((seg, i) => (
          seg.term ? (
            <button
              key={i}
              type="button"
              className={`resume-term-mark${openTerm === seg.term ? ' is-open' : ''}`}
              aria-expanded={openTerm === seg.term}
              onClick={() => setOpenTerm(t => (t === seg.term ? null : seg.term))}
            >
              {seg.text}
            </button>
          ) : seg.text
        ))}
      </div>
      {def && (
        <div className="resume-term-pop" role="status">
          <div className="resume-term-pop-text">
            <strong style={{ color: accent }}>{def.term}</strong> : {nbsp(def.def)}
          </div>
          <button type="button" className="resume-term-pop-close" onClick={() => setOpenTerm(null)} aria-label="Fermer la définition">
            <XIcon />
          </button>
        </div>
      )}
      {section.formula && (
        <div className="rv-callout rv-callout--violet resume-formula-block">
          <div className="resume-formula-text">{section.formula}</div>
          <div className="resume-formula-caption">{section.formulaCaption}</div>
        </div>
      )}
      {section.exemple && (
        <div className="resume-exemple">
          <span className="resume-exemple-label">Exemple</span>
          <div className="resume-exemple-text">{nbsp(section.exemple)}</div>
        </div>
      )}
    </div>
  )
}

const VERDICTS = {
  got:   'Noté. Elle reviendra plus tard dans tes flashcards.',
  again: 'Noté. Elle reviendra dès demain dans tes flashcards.',
}

function CheckCard({ card, lessonId }) {
  const [shown, setShown] = useState(false)
  const [verdict, setVerdict] = useState(null)
  function grade(outcome) {
    updateCardState(lessonId, card.index, outcome)
    setVerdict(outcome)
  }
  return (
    <div className="resume-check">
      <div className="resume-check-question">{nbsp(card.front)}</div>
      {!shown ? (
        <button type="button" className="resume-check-reveal" onClick={() => setShown(true)}>
          Voir la réponse
        </button>
      ) : (
        <>
          <div className="resume-check-answer">{nbsp(card.back)}</div>
          {lessonId && !verdict && (
            <div className="resume-check-grade">
              <button type="button" className="resume-check-btn is-got" onClick={() => grade('got')}>
                <CheckIcon /> Je savais
              </button>
              <button type="button" className="resume-check-btn is-again" onClick={() => grade('again')}>
                <RefreshIcon /> À revoir
              </button>
            </div>
          )}
          {verdict && <p className={`resume-check-verdict is-${verdict}`} role="status">{VERDICTS[verdict]}</p>}
        </>
      )}
    </div>
  )
}
