import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { recordRevision } from '../services/revisionService'
import './Mindmap.css'

// ── Palette de 4 couleurs (assignée par index) ────────────────────
const PALETTE = [
  { color: '#6366F1', bgLight: '#EEF2FF', colorLight: '#4338CA', bgDark: '#1E1B4B', colorDark: '#A5B4FC' },
  { color: '#FF6B00', bgLight: '#FFF4E6', colorLight: '#C05621', bgDark: '#2D1F0A', colorDark: '#FBD38D' },
  { color: '#22C55E', bgLight: '#F0FDF4', colorLight: '#15803D', bgDark: '#0D2818', colorDark: '#4ADE80' },
  { color: '#A855F7', bgLight: '#FAF5FF', colorLight: '#7E22CE', bgDark: '#2E1065', colorDark: '#D8B4FE' },
]

// ── Emoji par matière ────────────────────────────────────────────
const SUBJECT_EMOJI = {
  maths: '📐', français: '📖', anglais: '🗣️', histoire: '🏛️',
  géographie: '🌍', svt: '🧬', physique: '⚗️', philosophie: '🤔',
  ses: '📊', arts: '🎨',
}
function subjectEmoji(subject) {
  if (!subject) return '🧠'
  const key = Object.keys(SUBJECT_EMOJI).find(k => subject.toLowerCase().includes(k))
  return SUBJECT_EMOJI[key] ?? '📚'
}

// ── Données ───────────────────────────────────────────────────────
function getMindmapData() {
  try {
    const ai = JSON.parse(localStorage.getItem('reviz-ai-data') || 'null')
    if (ai?.mindmap?.branches?.length >= 2) {
      // Injecter couleurs par index
      const branches = ai.mindmap.branches.map((b, i) => ({
        ...b,
        ...PALETTE[i % PALETTE.length],
      }))
      return {
        title:    ai.metadata?.title || 'Carte mentale',
        center:   ai.metadata?.title || 'Concept',
        subject:  ai.metadata?.subject || '',
        xp:       25,
        branches,
      }
    }
  } catch { /* ignore */ }
  return {
    title: 'Théorème de Pythagore',
    center: 'Pythagore',
    subject: 'Maths',
    xp: 25,
    branches: [
      { id: 'definition', label: 'Définition', emoji: '📖', detail: 'Dans tout triangle rectangle, le carré de l\'hypoténuse est égal à la somme des carrés des deux autres côtés.', children: ['a² + b² = c²', 'Triangle rectangle', 'Angle droit 90°'], position: 'top-left',    ...PALETTE[0] },
      { id: 'elements',   label: 'Éléments',   emoji: '📏', detail: 'L\'hypoténuse est le côté le plus long, toujours face à l\'angle droit.', children: ['Hypoténuse (c)', 'Côté a', 'Côté b'], position: 'top-right',   ...PALETTE[1] },
      { id: 'reciproque', label: 'Réciproque', emoji: '🔄', detail: 'Si a² + b² = c² est vérifié, alors le triangle est nécessairement rectangle.', children: ['Si a²+b²=c²', '→ rectangle', 'Ex : 3-4-5'], position: 'bottom-left', ...PALETTE[2] },
      { id: 'applications', label: 'Applications', emoji: '💡', detail: 'On utilise ce théorème pour calculer des distances et vérifier des angles droits.', children: ['Calcul distances', 'Architecture', 'Géométrie'], position: 'bottom-right', ...PALETTE[3] },
    ],
  }
}

// ── Positions (portrait + paysage) ───────────────────────────────
function getPositions(W, H) {
  const cx = W / 2, cy = H / 2
  return {
    'top-left':     { x: Math.round(W * 0.20), y: Math.round(H * 0.22) },
    'top-right':    { x: Math.round(W * 0.80), y: Math.round(H * 0.22) },
    'bottom-left':  { x: Math.round(W * 0.20), y: Math.round(H * 0.72) },
    'bottom-right': { x: Math.round(W * 0.80), y: Math.round(H * 0.72) },
    // fallbacks
    top:    { x: cx,                   y: Math.round(H * 0.18) },
    right:  { x: Math.round(W * 0.82), y: cy },
    bottom: { x: cx,                   y: Math.round(H * 0.76) },
    left:   { x: Math.round(W * 0.18), y: cy },
  }
}

export default function Mindmap() {
  useEffect(() => { recordRevision('mindmap') }, [])
  const mindmapData = getMindmapData()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

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
  const [dims, setDims]                     = useState({ W: window.innerWidth, H: window.innerHeight })
  const [mounted, setMounted]               = useState(false)
  const INIT_SCALE = 1
  const [scale, setScale]     = useState(INIT_SCALE)
  const [offset, setOffset]   = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)

  // Entrée en scène
  useEffect(() => { setTimeout(() => setMounted(true), 60) }, [])

  // Resize
  useEffect(() => {
    function onResize() {
      setTimeout(() => {
        setDims({ W: window.innerWidth, H: window.innerHeight })
      }, 100)
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
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
      const SHEET_H = 220
      const targetY = H - SHEET_H - 40
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
    const base = sheetDragStart.current.wasCollapsed ? 0 : 0
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
  const centerEmoji  = subjectEmoji(mindmapData.subject)

  return createPortal(
    <div className="mindmap-fullscreen">

      {/* ── Écran de fin ── */}
      {showEnd && (
        <div className="end-screen">
          <span className="end-emoji">🧠</span>
          <span className="end-title">Carte explorée !</span>
          <p className="end-sub">Tu as parcouru toutes les branches.</p>
          <div className="end-stats">
            <div className="end-stat">
              <span className="end-stat-value" style={{ color: '#A855F7' }}>{mindmapData.branches.length}</span>
              <span className="end-stat-label">Branches</span>
            </div>
            <div className="end-stat-divider" />
            <div className="end-stat">
              <span className="end-stat-value" style={{ color: '#6366F1' }}>{totalChildren}</span>
              <span className="end-stat-label">Notions</span>
            </div>
            <div className="end-stat-divider" />
            <div className="end-stat">
              <span className="end-stat-value" style={{ color: '#22C55E' }}>{mindmapData.xp}</span>
              <span className="end-stat-label">XP</span>
            </div>
          </div>
          <div className="xp-badge">+{mindmapData.xp} XP gagnés !</div>
          <button className="end-btn primary" onClick={restartMindmap}>🗺️ Revoir la carte</button>
          <Link className="end-btn" to="/analyse">← Retour aux formats</Link>
        </div>
      )}

      {/* ── Header flottant ── */}
      <div className="mindmap-header-float">
        <Link className="back-btn" to="/analyse">←</Link>
        <div className="header-center">
          <span className="header-title">Carte mentale</span>
          <div className="header-branch-dots">
            {mindmapData.branches.map(b => (
              <span
                key={b.id}
                className={`branch-progress-dot${visitedIds.has(b.id) ? ' visited' : ''}`}
                style={{ '--dot-color': b.color }}
              />
            ))}
          </div>
        </div>
        <button
          className="done-btn"
          style={{ opacity: allExplored ? 1 : 0.3, pointerEvents: allExplored ? 'auto' : 'none' }}
          onClick={() => setShowEnd(true)}
        >✓</button>
      </div>
      <div style={{ position: 'absolute', top: 56, left: 0, right: 0, textAlign: 'center', zIndex: 5, pointerEvents: 'none' }}><span className="ai-badge">✦ Généré par IA</span></div>

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
            <span className="canvas-hint-icon">👆</span>
            <span className="canvas-hint-text">Appuie sur une branche</span>
          </div>
        )}
        {isViewMoved && (
          <button
            className="mindmap-reset"
            onPointerDown={e => e.stopPropagation()}
            onClick={resetView}
          >↺</button>
        )}

        <div
          className="mindmap-world"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
        >
          {/* SVG lignes gradient */}
          <svg className="mindmap-svg">
            <defs>
              {mindmapData.branches.map(branch => (
                <linearGradient
                  key={branch.id}
                  id={`grad-${branch.id}`}
                  x1="0%" y1="0%" x2="100%" y2="0%"
                  gradientUnits="userSpaceOnUse"
                  x1={cx} y1={cy}
                  x2={positions[branch.position]?.x ?? cx}
                  y2={positions[branch.position]?.y ?? cy}
                >
                  <stop offset="0%"   stopColor={branch.color} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={branch.color} stopOpacity="0.9" />
                </linearGradient>
              ))}
            </defs>
            {mindmapData.branches.map(branch => {
              const pos = positions[branch.position]
              if (!pos) return null
              const isSelected = selectedBranch === branch.id
              const isVisited  = visitedIds.has(branch.id)
              const hasSelect  = selectedBranch !== null
              const opacity    = hasSelect
                ? (isSelected ? 1 : 0.07)
                : (isVisited ? 0.6 : 0.25)
              const cpx = (cx + pos.x) / 2
              const cpy = (cy + pos.y) / 2
              return (
                <path
                  key={branch.id}
                  d={`M ${cx} ${cy} Q ${cpx} ${cpy} ${pos.x} ${pos.y}`}
                  stroke={`url(#grad-${branch.id})`}
                  strokeWidth={isSelected ? 3.5 : 2.5}
                  fill="none"
                  opacity={opacity}
                  strokeLinecap="round"
                  style={{ transition: 'opacity 0.25s' }}
                />
              )
            })}
          </svg>

          {/* Nœud central */}
          <div className="center-node">
            <span className="cn-emoji">{centerEmoji}</span>
            <span className="cn-label">
              {mindmapData.center.split(' ').slice(0, 3).join(' ')}
            </span>
          </div>

          {/* Branches avec animation d'entrée staggerée */}
          {mindmapData.branches.map((branch, i) => {
            const pos = positions[branch.position]
            if (!pos) return null
            const isSelected = selectedBranch === branch.id
            const isVisited  = visitedIds.has(branch.id)
            return (
              <div
                key={branch.id}
                className={`branch-node${isSelected ? ' selected' : ''}${isVisited ? ' visited' : ''}${mounted ? ' branch-in' : ''}`}
                style={{
                  left: pos.x,
                  top:  pos.y,
                  background: isDark ? branch.bgDark   : branch.bgLight,
                  color:      isDark ? branch.colorDark : branch.colorLight,
                  '--branch-color': branch.color,
                  animationDelay: `${i * 100}ms`,
                }}
                onPointerDown={e => e.stopPropagation()}
                onClick={() => handleSelectBranch(branch.id)}
              >
                <span className="bn-emoji">{branch.emoji}</span>
                <span className="bn-label">{branch.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Bottom sheet ── */}
      <div
        className={`detail-sheet${activeBranch ? ' detail-sheet--open' : ''}${sheetCollapsed ? ' detail-sheet--collapsed' : ''}${sheetDragY !== 0 ? ' detail-sheet--dragging' : ''}`}
        style={sheetDragY !== 0 ? { transform: `translateY(${sheetCollapsed ? `calc(100% - 28px + ${sheetDragY}px)` : `${Math.max(0, sheetDragY)}px`})` } : {}}
      >
        <div
          className="sheet-handle"
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
        />
        {activeBranch && (
          <>
            <div className="detail-header">
              <span
                className="detail-emoji-wrap"
                style={{ background: isDark ? activeBranch.bgDark : activeBranch.bgLight }}
              >
                {activeBranch.emoji}
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
              <button className="detail-cta" onClick={() => setShowEnd(true)}>
                🧠 J'ai tout exploré !
              </button>
            )}
          </>
        )}
      </div>

    </div>,
    document.body
  )
}
