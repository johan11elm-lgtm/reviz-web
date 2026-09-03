import { PageIntro } from '../components/PageIntro'
import { ChatIcon, MindmapIcon } from '../components/Icons'
import { useState, useRef, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { recordRevision } from '../services/revisionService'
import { BRANCH_COLORS, BRANCH_POSITIONS } from '../utils/aiPrompts'
import { PageHeader } from '../components/PageHeader'
import { Mascot } from '../components/Mascot'
import { MissingLessonState } from '../components/MissingLessonState'
import { FormatFeedback } from '../components/FormatFeedback'
import { CoachChat, CoachHeaderButton } from '../components/CoachChat'
import { nbsp } from '../utils/typography'
import './Mindmap.css'

// ── Données ───────────────────────────────────────────────────────
// Normalisation défensive : aiService._parseResult() garantit déjà cette
// forme pour les nouveaux scans, mais reviz-ai-data peut contenir des
// données antérieures au durcissement (children non-tableau, emoji nul,
// position inconnue) — on ne fait donc jamais confiance au localStorage.
function normalizeBranches(rawBranches) {
  if (!Array.isArray(rawBranches)) return []
  return rawBranches
    .filter(b => b && typeof b.label === 'string' && b.label.trim())
    .slice(0, BRANCH_POSITIONS.length)
    .map((b, i) => ({
      ...b,
      id:       (typeof b.id === 'string' && b.id.trim()) ? b.id : `branche-${i}`,
      label:    nbsp(b.label.trim()),
      emoji:    (typeof b.emoji === 'string' && b.emoji.trim()) ? b.emoji : '📌',
      detail:   typeof b.detail === 'string' ? nbsp(b.detail) : '',
      children: Array.isArray(b.children) ? b.children.filter(c => typeof c === 'string' && c.trim()) : [],
      position: BRANCH_POSITIONS[i],
      ...BRANCH_COLORS[i % BRANCH_COLORS.length],
    }))
}

function getMindmapData() {
  try {
    const ai = JSON.parse(localStorage.getItem('reviz-ai-data') || 'null')
    const branches = normalizeBranches(ai?.mindmap?.branches)
    if (branches.length >= 2) {
      return {
        title:    ai.metadata?.title || 'Carte mentale',
        center:   ai.metadata?.title || 'Concept',
        subject:  ai.metadata?.subject || '',
        xp:       25,
        branches,
      }
    }
  } catch { /* ignore */ }
  // En prod, pas de leçon = état vide honnête — jamais le mock « Pythagore ».
  if (!import.meta.env.DEV) return null
  return {
    title: 'Théorème de Pythagore',
    center: 'Pythagore',
    subject: 'Maths',
    xp: 25,
    branches: [
      { id: 'definition', label: 'Définition', emoji: '📖', detail: 'Dans tout triangle rectangle, le carré de l\'hypoténuse est égal à la somme des carrés des deux autres côtés.', children: ['a² + b² = c²', 'Triangle rectangle', 'Angle droit 90°'], position: 'top-left',    ...BRANCH_COLORS[0] },
      { id: 'elements',   label: 'Éléments',   emoji: '📏', detail: 'L\'hypoténuse est le côté le plus long, toujours face à l\'angle droit.', children: ['Hypoténuse (c)', 'Côté a', 'Côté b'], position: 'top-right',   ...BRANCH_COLORS[1] },
      { id: 'reciproque', label: 'Réciproque', emoji: '🔄', detail: 'Si a² + b² = c² est vérifié, alors le triangle est nécessairement rectangle.', children: ['Si a²+b²=c²', '→ rectangle', 'Ex : 3-4-5'], position: 'bottom-left', ...BRANCH_COLORS[2] },
      { id: 'applications', label: 'Applications', emoji: '💡', detail: 'On utilise ce théorème pour calculer des distances et vérifier des angles droits.', children: ['Calcul distances', 'Architecture', 'Géométrie'], position: 'bottom-right', ...BRANCH_COLORS[3] },
    ],
  }
}

// ── Positions relatives au canvas ─────────────────────────────────
// Les % sont bornés pour que les cartes-branches (~150px de large) restent
// entières dans le canvas, au-dessus du hint bas et sous le bord haut.
function getPositions(W, H) {
  const cx = W / 2, cy = H / 2
  const xLeft   = Math.max(Math.round(W * 0.24), 92)
  const xRight  = Math.min(Math.round(W * 0.76), W - 92)
  const yTop    = Math.max(Math.round(H * 0.18), 56)
  const yBottom = Math.min(Math.round(H * 0.78), H - 84)
  return {
    'top-left':     { x: xLeft,  y: yTop },
    'top-right':    { x: xRight, y: yTop },
    'bottom-left':  { x: xLeft,  y: yBottom },
    'bottom-right': { x: xRight, y: yBottom },
    // fallbacks (données legacy)
    top:    { x: cx,     y: Math.max(Math.round(H * 0.14), 52) },
    right:  { x: xRight, y: cy },
    bottom: { x: cx,     y: Math.min(Math.round(H * 0.82), H - 64) },
    left:   { x: xLeft,  y: cy },
  }
}

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6L9 17l-5-5" />
  </svg>
)

export default function Mindmap() {
  // Décision stable pour toute la vie du composant (rules-of-hooks safe).
  const [hasData] = useState(() => getMindmapData() !== null)
  if (!hasData) return <MissingLessonState title="Carte mentale" />
  return <MindmapSession />
}

function MindmapSession() {
  useEffect(() => { recordRevision('mindmap') }, [])
  const mindmapData = getMindmapData()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const navigate = useNavigate()

  const canvasRef    = useRef(null)
  const pointerStart = useRef(null)
  const lastPinch    = useRef(null)

  const [selectedBranch, setSelectedBranch] = useState(null)
  const [sheetCollapsed, setSheetCollapsed] = useState(false)
  const [sheetDragY, setSheetDragY]         = useState(0)   // offset pendant le drag
  const sheetDragStart                      = useRef(null)  // { startY, wasCollapsed }
  const [visitedIds, setVisitedIds]         = useState(() => new Set())
  const [allExplored, setAllExplored]       = useState(false)
  const [showEnd, setShowEnd]               = useState(false)
  const [dims, setDims]                     = useState({ W: 480, H: 620 })
  const [mounted, setMounted]               = useState(false)
  const INIT_SCALE = 1
  const [scale, setScale]     = useState(INIT_SCALE)
  const [offset, setOffset]   = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)

  // Coach — uniquement sur une vraie leçon (le contexte serveur exige son id).
  const coachLessonId = useMemo(() => localStorage.getItem('reviz-current-lesson-id'), [])
  const [coachOpen, setCoachOpen] = useState(false)

  // Entrée en scène
  useEffect(() => { setTimeout(() => setMounted(true), 60) }, [])

  // Dimensions réelles du canvas (le layout vit dans le shell .app,
  // pas dans le viewport) — suit resize et rotation.
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const measure = () => setDims({ W: el.clientWidth, H: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Non-passive wheel zoom
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const onWheel = (e) => {
      e.preventDefault()
      setScale(s => Math.min(2.5, Math.max(0.35, s * (e.deltaY > 0 ? 0.92 : 1.08))))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  function handleSelectBranch(id) {
    if (selectedBranch === id) { setSheetCollapsed(c => !c); return }
    const branch = mindmapData.branches.find(b => b.id === id)
    const next = new Set([...visitedIds, id])
    setVisitedIds(next)
    setSelectedBranch(id)
    setSheetCollapsed(false)
    if (next.size === mindmapData.branches.length) setAllExplored(true)
    if (branch?.position?.includes('bottom')) {
      const pos = getPositions(W, H)[branch.position]
      const SHEET_H = 210
      const targetY = H - SHEET_H - 36
      const panY = -(pos.y - targetY)
      setOffset(o => ({ x: o.x, y: Math.min(0, panY) }))
    } else {
      setOffset(o => ({ x: o.x, y: 0 }))
    }
  }

  function handlePointerDown(e) {
    if (!e.isPrimary) return
    pointerStart.current = { px: e.clientX, py: e.clientY, ox: offset.x, oy: offset.y }
    canvasRef.current?.setPointerCapture(e.pointerId)
  }
  function handlePointerMove(e) {
    if (!pointerStart.current || !e.isPrimary) return
    const dx = e.clientX - pointerStart.current.px
    const dy = e.clientY - pointerStart.current.py
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      setIsDragging(true)
      setOffset({
        x: Math.max(-400, Math.min(400, pointerStart.current.ox + dx)),
        y: Math.max(-300, Math.min(300, pointerStart.current.oy + dy)),
      })
    }
  }
  function handlePointerUp() { pointerStart.current = null; setIsDragging(false) }

  function handleTouchStart(e) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastPinch.current = { dist: Math.hypot(dx, dy), scale }
      pointerStart.current = null
    } else if (e.touches.length === 1) {
      const t = e.touches[0]
      pointerStart.current = { px: t.clientX, py: t.clientY, ox: offset.x, oy: offset.y }
    }
  }
  function handleTouchMove(e) {
    if (e.touches.length === 2 && lastPinch.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.hypot(dx, dy)
      setScale(Math.min(2.5, Math.max(0.35, lastPinch.current.scale * (dist / lastPinch.current.dist))))
    } else if (e.touches.length === 1 && pointerStart.current) {
      const t = e.touches[0]
      const dx = t.clientX - pointerStart.current.px
      const dy = t.clientY - pointerStart.current.py
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        setIsDragging(true)
        setOffset({
          x: Math.max(-400, Math.min(400, pointerStart.current.ox + dx)),
          y: Math.max(-300, Math.min(300, pointerStart.current.oy + dy)),
        })
      }
    }
  }
  function handleTouchEnd() { lastPinch.current = null; pointerStart.current = null; setIsDragging(false) }

  function resetView() { setScale(INIT_SCALE); setOffset({ x: 0, y: 0 }) }
  function restartMindmap() {
    setVisitedIds(new Set()); setSelectedBranch(null)
    setSheetCollapsed(false); setSheetDragY(0)
    setAllExplored(false); setShowEnd(false); resetView()
  }

  // ── Drag poignée ──
  function onHandlePointerDown(e) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    sheetDragStart.current = { startY: e.clientY, wasCollapsed: sheetCollapsed }
  }
  function onHandlePointerMove(e) {
    if (!sheetDragStart.current) return
    e.stopPropagation()
    const dy = e.clientY - sheetDragStart.current.startY
    setSheetDragY(Math.max(-10, dy))
  }
  function onHandlePointerUp(e) {
    if (!sheetDragStart.current) return
    e.stopPropagation()
    const dy = e.clientY - sheetDragStart.current.startY
    // snap : si tiré vers le bas > 60px → collapse, sinon open
    if (sheetDragStart.current.wasCollapsed) {
      setSheetCollapsed(dy > -40 ? true : false)
    } else {
      setSheetCollapsed(dy > 60)
    }
    setSheetDragY(0)
    sheetDragStart.current = null
  }

  const { W, H } = dims
  const isViewMoved  = Math.abs(offset.x) > 5 || Math.abs(offset.y) > 5 || Math.abs(scale - INIT_SCALE) > 0.05
  const positions    = getPositions(W, H)
  const cx = W / 2, cy = H / 2
  const activeBranch = mindmapData.branches.find(b => b.id === selectedBranch)
  const totalChildren = mindmapData.branches.reduce((acc, b) => acc + b.children.length, 0)

  const progressDots = (
    <div className="rv-dots" aria-label={`${visitedIds.size} branche(s) explorée(s) sur ${mindmapData.branches.length}`}>
      {mindmapData.branches.map(b => (
        <span
          key={b.id}
          className="rv-dot"
          style={visitedIds.has(b.id) ? { background: isDark ? b.colorDark : b.color } : undefined}
        />
      ))}
    </div>
  )

  const doneButton = (
    <button
      type="button"
      className={`rv-bell-btn mindmap-done-btn${allExplored ? ' ready' : ''}`}
      disabled={!allExplored}
      onClick={() => setShowEnd(true)}
      aria-label="Terminer la carte mentale"
    >
      <CheckIcon />
    </button>
  )

  return (
    <div className="app mindmap-page">

      {/* ── Écran de fin (mêmes conventions que Flashcards / Quiz) ── */}
      {showEnd && (
        <div className="rv-end-screen mindmap-end-screen">
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
          <h2 className="rv-end-screen-title">Carte explorée !</h2>
          <p className="rv-end-screen-sub">Tu as parcouru toutes les branches de « {mindmapData.title} ».</p>
          <div className="mindmap-end-stats rv-card rv-card--padded">
            <div className="mindmap-end-stat">
              <span className="rv-stat-value rv-stat-value--md" style={{ color: 'var(--accent-violet)' }}>{mindmapData.branches.length}</span>
              <span className="rv-stat-label">Branches</span>
            </div>
            <div className="rv-stat-separator" />
            <div className="mindmap-end-stat">
              <span className="rv-stat-value rv-stat-value--md" style={{ color: 'var(--accent-orange)' }}>{totalChildren}</span>
              <span className="rv-stat-label">Notions</span>
            </div>
            <div className="rv-stat-separator" />
            <div className="mindmap-end-stat">
              <span className="rv-stat-value rv-stat-value--md" style={{ color: 'var(--accent-green-strong)' }}>+{mindmapData.xp}</span>
              <span className="rv-stat-label">XP</span>
            </div>
          </div>
          <div className="mindmap-xp-badge">+{mindmapData.xp} XP gagnés !</div>
          <FormatFeedback format="mindmap" question="Cette carte t'a aidé ?" />
          <div className="rv-end-screen-actions">
            <button type="button" className="rv-btn-cta rv-btn-cta--full" onClick={restartMindmap}>
              <span>Revoir la carte</span>
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
          ? <><CoachHeaderButton onClick={() => setCoachOpen(true)} />{doneButton}</>
          : doneButton}
        onBack={() => navigate('/analyse')}
      />

      {/* Intro façon Home — la carte, juste dessous, est l'illustration */}
      <PageIntro title="Carte mentale" sub={mindmapData.title} className="mindmap-intro">
        {progressDots}
      </PageIntro>

      <div className="mindmap-ai-row"><span className="ai-badge">✦ Généré par IA</span></div>

      {/* ── Canvas ── */}
      <div
        className="mindmap-canvas"
        ref={canvasRef}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {!activeBranch && (
          <div className="canvas-hint">
            <span className="canvas-hint-text">Appuie sur une branche</span>
          </div>
        )}
        {isViewMoved && (
          <button
            type="button"
            className="mindmap-reset"
            onPointerDown={e => e.stopPropagation()}
            onClick={resetView}
            aria-label="Recentrer la carte"
          >↺</button>
        )}

        <div
          className="mindmap-world"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
        >
          {/* SVG lignes gradient */}
          <svg className="mindmap-svg">
            <defs>
              {mindmapData.branches.map(branch => {
                // En dark mode, la teinte pleine manque de contraste sur le
                // fond sombre — on trace avec la variante claire (colorDark).
                const stroke = isDark ? branch.colorDark : branch.color
                return (
                  <linearGradient
                    key={branch.id}
                    id={`grad-${branch.id}`}
                    gradientUnits="userSpaceOnUse"
                    x1={cx} y1={cy}
                    x2={positions[branch.position]?.x ?? cx}
                    y2={positions[branch.position]?.y ?? cy}
                  >
                    <stop offset="0%"   stopColor={stroke} stopOpacity="0.55" />
                    <stop offset="100%" stopColor={stroke} stopOpacity="1" />
                  </linearGradient>
                )
              })}
            </defs>
            {mindmapData.branches.map((branch, i) => {
              const pos = positions[branch.position]
              if (!pos) return null
              const isSelected = selectedBranch === branch.id
              const isVisited  = visitedIds.has(branch.id)
              const hasSelect  = selectedBranch !== null
              const opacity    = hasSelect
                ? (isSelected ? 1 : 0.08)
                : (isVisited ? 0.85 : 0.5)
              const cpx = (cx + pos.x) / 2
              const cpy = (cy + pos.y) / 2
              return (
                <path
                  key={branch.id}
                  className={mounted ? 'mindmap-link mindmap-link--draw' : 'mindmap-link'}
                  d={`M ${cx} ${cy} Q ${cpx} ${cpy} ${pos.x} ${pos.y}`}
                  pathLength="1"
                  stroke={`url(#grad-${branch.id})`}
                  strokeWidth={isSelected ? 4 : 3}
                  fill="none"
                  opacity={opacity}
                  strokeLinecap="round"
                  style={{ transition: 'opacity 0.25s', animationDelay: `${80 + i * 90}ms` }}
                />
              )
            })}
          </svg>

          {/* Nœud central — la mascotte réfléchit, les idées rayonnent */}
          <div className={`center-node${mounted ? ' center-in' : ''}`}>
            <Mascot pose="thinking" size={52} alt="" aria-hidden="true" />
            <span className="cn-label">
              {mindmapData.center.split(' ').slice(0, 3).join(' ')}
            </span>
          </div>

          {/* Branches — cartes blanches avec animation d'entrée staggerée */}
          {mindmapData.branches.map((branch, i) => {
            const pos = positions[branch.position]
            if (!pos) return null
            const isSelected = selectedBranch === branch.id
            const isVisited  = visitedIds.has(branch.id)
            return (
              <button
                key={branch.id}
                type="button"
                className={`branch-node${isSelected ? ' selected' : ''}${isVisited ? ' visited' : ''}${mounted ? ' branch-in' : ''}`}
                aria-pressed={isSelected}
                style={{
                  left: pos.x,
                  top:  pos.y,
                  '--branch-color': isDark ? branch.colorDark : branch.color,
                  '--branch-bg':    isDark ? branch.bgDark    : branch.bgLight,
                  animationDelay: `${i * 90}ms`,
                }}
                onPointerDown={e => e.stopPropagation()}
                onClick={() => handleSelectBranch(branch.id)}
              >
                <span className="bn-label">{branch.label}</span>
                {isVisited && !isSelected && <span className="bn-visited-dot" aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Bottom sheet ── */}
      <div
        className={`detail-sheet${activeBranch ? ' detail-sheet--open' : ''}${sheetCollapsed ? ' detail-sheet--collapsed' : ''}${sheetDragY !== 0 ? ' detail-sheet--dragging' : ''}`}
        style={sheetDragY !== 0 ? { transform: `translateY(${sheetCollapsed ? `calc(100% - 30px + ${sheetDragY}px)` : `${Math.max(0, sheetDragY)}px`})` } : {}}
      >
        <div
          className="sheet-handle"
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
        >
          <span className="sheet-handle-bar" />
        </div>
        {activeBranch && (
          <div className="sheet-content">
            <div className="detail-header">
              <span
                className="detail-emoji-wrap"
                style={{ background: isDark ? activeBranch.bgDark : activeBranch.bgLight, color: isDark ? activeBranch.colorDark : activeBranch.colorLight }}
              >
                <MindmapIcon />
              </span>
              <div className="detail-info">
                <div
                  className="detail-title"
                  style={{ color: isDark ? activeBranch.colorDark : activeBranch.colorLight }}
                >
                  {activeBranch.label}
                </div>
                <div className="detail-text">{activeBranch.detail}</div>
              </div>
            </div>
            <div className="detail-chips">
              {activeBranch.children.map((child, i) => (
                <span
                  key={i}
                  className="chip"
                  style={{
                    background: isDark ? activeBranch.bgDark  : activeBranch.bgLight,
                    color:      isDark ? activeBranch.colorDark : activeBranch.colorLight,
                  }}
                >{child}</span>
              ))}
            </div>
            {allExplored && (
              <button type="button" className="rv-btn-cta rv-btn-cta--full detail-cta" onClick={() => setShowEnd(true)}>
                <span>J'ai tout exploré !</span>
              </button>
            )}
          </div>
        )}
      </div>

      {coachOpen && coachLessonId && (
        <CoachChat
          isOpen
          onClose={() => setCoachOpen(false)}
          lessonId={coachLessonId}
          lessonTitle={mindmapData.title}
        />
      )}
    </div>
  )
}
