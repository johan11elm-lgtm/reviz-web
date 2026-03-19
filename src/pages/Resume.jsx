import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { recordRevision } from '../services/revisionService'
import './Resume.css'

const SUBJECT_MAP = {
  'maths':    { dot: '#F97316', bg: '#FFF7ED', emoji: '📐' },
  'français': { dot: '#EC4899', bg: '#FDF2F8', emoji: '📖' },
  'histoire': { dot: '#6366F1', bg: '#EEF2FF', emoji: '🌍' },
  'géo':      { dot: '#6366F1', bg: '#EEF2FF', emoji: '🌍' },
  'svt':      { dot: '#22C55E', bg: '#F0FDF4', emoji: '🧬' },
  'physique': { dot: '#3B82F6', bg: '#EFF6FF', emoji: '⚛️' },
  'chimie':   { dot: '#3B82F6', bg: '#EFF6FF', emoji: '🧪' },
  'techno':   { dot: '#06B6D4', bg: '#ECFEFF', emoji: '⚙️' },
  'anglais':  { dot: '#EAB308', bg: '#FEFCE8', emoji: '🗣️' },
  'espagnol': { dot: '#EAB308', bg: '#FEFCE8', emoji: '💬' },
  'arts':     { dot: '#A855F7', bg: '#FAF5FF', emoji: '🎨' },
}

function subjectInfo(s) {
  const key = Object.keys(SUBJECT_MAP).find(k => s?.toLowerCase().includes(k))
  return SUBJECT_MAP[key] ?? { dot: '#6366F1', bg: '#EEF2FF', emoji: '📚' }
}

// ---- DONNÉES : localStorage (IA) > mock ----
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
  useEffect(() => { recordRevision('resume') }, [])
  const resumeData = getResumeData()
  const info = subjectInfo(resumeData.subject)

  const [scrollPct, setScrollPct] = useState(0)
  const [showEnd, setShowEnd]     = useState(false)
  const contentRef                = useRef(null)

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

  return (
    <div className="app">

      {/* ── Écran de fin ── */}
      {showEnd && (
        <div className="end-screen">
          <span className="end-emoji">✅</span>
          <span className="end-title">Leçon maîtrisée !</span>
          <p className="end-sub">Tu as relu l'essentiel. La révision régulière, c'est la clé !</p>
          <div className="end-stats">
            <div className="end-stat">
              <span className="end-stat-value" style={{ color: '#22C55E' }}>{resumeData.sections.length}</span>
              <span className="end-stat-label">Sections</span>
            </div>
            <div className="end-stat-divider" />
            <div className="end-stat">
              <span className="end-stat-value" style={{ color: '#FF6B00' }}>{resumeData.keyTerms.length}</span>
              <span className="end-stat-label">Termes</span>
            </div>
            <div className="end-stat-divider" />
            <div className="end-stat">
              <span className="end-stat-value" style={{ color: info.dot }}>{resumeData.readingTime}</span>
              <span className="end-stat-label">min lues</span>
            </div>
          </div>
          <div className="xp-badge">+{resumeData.xp} XP gagnés !</div>
          <button className="end-btn primary" onClick={restartResume}>🔄 Relire</button>
          <Link className="end-btn" to="/analyse">← Retour aux formats</Link>
        </div>
      )}

      {/* ── Header ── */}
      <div className="header">
        <Link className="back-btn" to="/analyse">←</Link>
        <div className="header-center">
          <span className="header-title">Résumé</span>
          <span className="read-time-chip">📖 {resumeData.readingTime} min de lecture</span>
        </div>
        <button className="share-btn" onClick={handleShare} title="Partager">
          {shareDone ? '✓' : '↗'}
        </button>
      </div>

      {/* Barre de lecture liée au scroll */}
      <div className="reading-bar">
        <div className="reading-fill" style={{ width: scrollPct + '%', background: info.dot }} />
      </div>

      {/* ── Contenu scrollable ── */}
      <div className="content" ref={contentRef}>

        {/* Hero : matière + titre */}
        <div className="resume-hero">
          <span className="subject-pill" style={{ background: info.bg, color: info.dot }}>
            {info.emoji} {resumeData.subject}
          </span>
          <h1 className="resume-title">{resumeData.title}</h1>
        </div>

        {/* À retenir */}
        <div className="retenir-card">
          <div className="retenir-header">
            <span className="retenir-icon">⭐</span>
            <span className="retenir-label">À retenir</span>
          </div>
          <p className="retenir-intro">{resumeData.intro}</p>
          <div className="retenir-points">
            {resumeData.keyPoints.map((pt, i) => (
              <div className="retenir-point" key={i}>
                <span className="point-num">{i + 1}</span>
                <span>{pt}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sections du cours */}
        <div className="block-label">Le cours</div>

        {resumeData.sections.map((section, i) => (
          <div className="section-card" key={i} style={{ '--accent': info.dot }}>
            <div className="section-accent" />
            <div className="section-inner">
              <div className="section-heading">{section.title}</div>
              <div className="section-body">{section.content}</div>
              {section.formula && (
                <div className="formula-block" style={{ background: info.bg, borderColor: info.dot + '33' }}>
                  <div className="formula-text" style={{ color: info.dot }}>{section.formula}</div>
                  <div className="formula-caption">{section.formulaCaption}</div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Vocabulaire */}
        <div className="block-label">Vocabulaire clé</div>

        <div className="terms-grid">
          {resumeData.keyTerms.map((item, i) => (
            <div className="term-card" key={i}>
              <div className="term-name" style={{ color: info.dot }}>{item.term}</div>
              <div className="term-def">{item.def}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button className="cta-btn" onClick={() => setShowEnd(true)}>
          ✓ J'ai tout lu !
        </button>

      </div>
    </div>
  )
}
