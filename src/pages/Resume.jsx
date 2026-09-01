import { useState, useRef, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { recordRevision } from '../services/revisionService'
import { PageHeader } from '../components/PageHeader'
import { HeroCTA } from '../components/HeroCTA'
import { Mascot } from '../components/Mascot'
import { MissingLessonState } from '../components/MissingLessonState'
import { FormatFeedback } from '../components/FormatFeedback'
import { CoachChat, CoachHeaderButton } from '../components/CoachChat'
import { subjectInfo as sharedSubjectInfo } from '../utils/subjects'
import { nbsp } from '../utils/typography'
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
      readingTime: Math.max(1, Math.round((ai.resume.sections?.length || 3) * 0.8)),
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
      },
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
    const text = `📚 ${resumeData.title} (${resumeData.subject})\n\n`
      + '⭐ À retenir :\n'
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
              <span>🔄 Relire</span>
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
        title="Résumé"
        sub={`📖 ${resumeData.readingTime} min de lecture`}
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

        {/* Hero présence — mascotte dominante style Home */}
        <div className="resume-ai-row">
          <span className="ai-badge">✦ Généré par IA</span>
        </div>
        <HeroCTA
          tone="orange"
          mascot="reading"
          eyebrow={`${info.emoji} ${resumeData.subject}`}
          title={resumeData.title}
          className="resume-hero-cta"
        />

        {/* À retenir */}
        <div className="rv-callout rv-callout--violet resume-retenir">
          <span className="rv-callout-label">
            <span aria-hidden="true">⭐</span> À retenir
          </span>
          <p className="resume-retenir-intro">{nbsp(resumeData.intro)}</p>
          <div className="resume-retenir-points">
            {resumeData.keyPoints.map((pt, i) => (
              <div className="resume-retenir-point" key={i}>
                <span className="resume-point-num">{i + 1}</span>
                <span>{nbsp(pt)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sections du cours */}
        <div className="resume-block-label">Le cours</div>

        {resumeData.sections.map((section, i) => (
          <div
            className="rv-card resume-section-card"
            key={i}
            style={{ '--resume-accent': info.dot }}
          >
            <div className="resume-section-accent" />
            <div className="resume-section-inner">
              <h3 className="resume-section-heading">{nbsp(section.title)}</h3>
              <div className="resume-section-body">{nbsp(section.content)}</div>
              {section.formula && (
                <div className="rv-callout rv-callout--violet resume-formula-block">
                  <div className="resume-formula-text">{section.formula}</div>
                  <div className="resume-formula-caption">{section.formulaCaption}</div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Vocabulaire */}
        <div className="resume-block-label">Vocabulaire clé</div>

        <div className="resume-terms-grid">
          {resumeData.keyTerms.map((item, i) => (
            <div className="rv-card rv-card--tight resume-term-card" key={i}>
              <div className="resume-term-name" style={{ color: info.dot }}>{item.term}</div>
              <div className="resume-term-def">{item.def}</div>
            </div>
          ))}
        </div>

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
