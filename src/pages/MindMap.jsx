import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { recordRevision } from '../services/revisionService'
import './Mindmap.css'

// ---- DONNÉES : localStorage (IA) > mock ----
function getMindmapData() {
  try {
    const ai = JSON.parse(localStorage.getItem('reviz-ai-data') || 'null')
    if (ai?.mindmap?.branches?.length === 4) return {
      title:    ai.metadata?.title || 'Carte mentale',
      center:   ai.metadata?.title || 'Concept',
      xp:       25,
      branches: ai.mindmap.branches,
    }
  } catch { /* ignore */ }
  return {
    title: "Théorème de Pythagore",
    center: "Pythagore",
    xp: 25,
    branches: [
      {
        id: "definition",
        label: "Définition",
        emoji: "📖",
        color: "#6366F1",
        bgLight: "#EEF2FF", colorLight: "#4338CA",
        bgDark:  "#1E1B4B", colorDark:  "#A5B4FC",
        position: "top-left",
        detail: "Dans tout triangle rectangle, le carré de l'hypoténuse est égal à la somme des carrés des deux autres côtés.",
        children: ["a² + b² = c²", "Triangle rectangle", "Angle droit 90°"],
      },
      {
        id: "elements",
        label: "Éléments",
        emoji: "📏",
        color: "#FF6B00",
        bgLight: "#FFF4E6", colorLight: "#C05621",
        bgDark:  "#2D1F0A", colorDark:  "#FBD38D",
        position: "top-right",
        detail: "L'hypoténuse est le côté le plus long, toujours face à l'angle droit. Les deux autres côtés sont notés a et b.",
        children: ["Hypoténuse (c)", "Côté a", "Côté b"],
      },
      {
        id: "reciproque",
        label: "Réciproque",
        emoji: "🔄",
        color: "#22C55E",
        bgLight: "#F0FDF4", colorLight: "#15803D",
        bgDark:  "#0D2818", colorDark:  "#4ADE80",
        position: "bottom-left",
        detail: "Si a² + b² = c² est vérifié, alors le triangle est nécessairement rectangle. Utile pour prouver qu'un angle est droit.",
        children: ["Si a²+b²=c²", "→ rectangle", "Ex : 3, 4, 5 ✓"],
      },
      {
        id: "applications",
        label: "Applications",
        emoji: "💡",
        color: "#A855F7",
        bgLight: "#FAF5FF", colorLight: "#7E22CE",
        bgDark:  "#2E1065", colorDark:  "#D8B4FE",
        position: "bottom-right",
        detail: "On utilise ce théorème pour calculer des distances, vérifier des angles droits en construction, et résoudre des problèmes géométriques.",
        children: ["Calcul distances", "Architecture", "Triangles remarquables"],
      },
    ],
  }
}

function getPositions(W, H) {
  const cx = W / 2
  const cy = H / 2
  return {
    'top-left':     { x: Math.round(W * 0.18), y: Math.round(H * 0.20) },
    'top-right':    { x: Math.round(W * 0.82), y: Math.round(H * 0.20) },
    'bottom-left':  { x: Math.round(W * 0.18), y: Math.round(H * 0.65) },
    'bottom-right': { x: Math.round(W * 0.82), y: Math.round(H * 0.65) },
    // fallback for old top/right/bottom/left positions
    top:    { x: cx,                   y: Math.round(H * 0.18) },
    right:  { x: Math.round(W * 0.82), y: cy },
    bottom: { x: cx,                   y: Math.round(H * 0.75) },
    left:   { x: Math.round(W * 0.18), y: cy },
  }
}

function RotatePrompt() {
  return (
    <div className="rotate-overlay">
      <div className="rotate-icon">📱</div>
      <div className="rotate-title">Tournez votre téléphone</div>
      <p className="rotate-sub">La carte mentale s'affiche en mode paysage</p>
    </div>
  )
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
  const [visitedIds, setVisitedIds]         = useState(() => new Set())
  const [allExplored, setAllExplored]       = useState(false)
  const [showEnd, setShowEnd]               = useState(false)
  const [dims, setDims]                     = useState({ W: window.innerWidth, H: window.innerHeight })
  const [isPortrait, setIsPortrait]         = useState(() => window.innerWidth < 500 && window.innerHeight > window.innerWidth)
  const INIT_SCALE = 1
  const [scale, setScale]   = useState(INIT_SCALE)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)

  // Orientation lock + listen (compatible iOS)
  useEffect(() => {
    screen.orientation?.lock?.('landscape').catch(() => {})

    function updateOrientation() {
      // Petit délai pour laisser iOS mettre à jour innerWidth/innerHeight
      setTimeout(() => {
        const W = window.innerWidth, H = window.innerHeight
        setIsPortrait(W < 768 && H > W)
        setDims({ W, H })
      }, 100)
    }

    // matchMedia : Chrome/Android
    const mq = window.matchMedia('(orientation: portrait)')
    mq.addEventListener?.('change', updateOrientation)
    mq.addListener?.((e) => { if (!mq.addEventListener) updateOrientation() })

    // orientationchange : iOS Safari/Chrome
    window.addEventListener('orientationchange', updateOrientation)
    window.addEventListener('resize', updateOrientation)

    return () => {
      mq.removeEventListener?.('change', updateOrientation)
      window.removeEventListener('orientationchange', updateOrientation)
      window.removeEventListener('resize', updateOrientation)
      screen.orientation?.unlock?.()
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
    if (selectedBranch === id) { setSelectedBranch(null); setOffset({ x: 0, y: 0 }); return }
    const branch = mindmapData.branches.find(b => b.id === id)
    const next = new Set([...visitedIds, id])
    setVisitedIds(next)
    setSelectedBranch(id)
    if (next.size === mindmapData.branches.length) setAllExplored(true)
    // Auto-pan : remonte le canvas si branche du bas pour rester visible au-dessus du sheet
    if (branch?.position?.includes('bottom')) {
      const pos = getPositions(W, H)[branch.position]
      const SHEET_H = 210
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

  function handlePointerUp() {
    pointerStart.current = null
    setIsDragging(false)
  }

  function handleTouchStart(e) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastPinch.current = { dist: Math.hypot(dx, dy), scale }
      pointerStart.current = null
    } else if (e.touches.length === 1) {
      // Fallback pan via touch pour iOS
      const t = e.touches[0]
      pointerStart.current = { px: t.clientX, py: t.clientY, ox: offset.x, oy: offset.y }
    }
  }

  function handleTouchMove(e) {
    if (e.touches.length === 2 && lastPinch.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.hypot(dx, dy)
      setScale(Math.min(2.5, Math.max(0.35,
        lastPinch.current.scale * (dist / lastPinch.current.dist)
      )))
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

  function handleTouchEnd() {
    lastPinch.current = null
    pointerStart.current = null
    setIsDragging(false)
  }

  function resetView() {
    setScale(INIT_SCALE)
    setOffset({ x: 0, y: 0 })
  }

  function restartMindmap() {
    setVisitedIds(new Set())
    setSelectedBranch(null)
    setAllExplored(false)
    setShowEnd(false)
    resetView()
  }

  const { W, H } = dims
  const isViewMoved  = Math.abs(offset.x) > 5 || Math.abs(offset.y) > 5 || Math.abs(scale - INIT_SCALE) > 0.05
  const positions    = getPositions(W, H)
  const cx           = W / 2
  const cy           = H / 2
  const activeBranch = mindmapData.branches.find(b => b.id === selectedBranch)
  const totalChildren = mindmapData.branches.reduce((acc, b) => acc + b.children.length, 0)

  return createPortal(
    <div className="mindmap-fullscreen">

      {/* ── Overlay portrait ── */}
      {isPortrait && <RotatePrompt />}

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

      {/* ── Canvas interactif ── */}
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
        {/* Hint */}
        {!activeBranch && (
          <div className="canvas-hint">
            <span className="canvas-hint-icon">👆</span>
            <span className="canvas-hint-text">Appuie sur une branche</span>
          </div>
        )}

        {/* Reset */}
        {isViewMoved && (
          <button
            className="mindmap-reset"
            onPointerDown={e => e.stopPropagation()}
            onClick={resetView}
          >↺</button>
        )}

        {/* Monde transformable */}
        <div
          className="mindmap-world"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
        >
          {/* SVG lignes bezier */}
          <svg className="mindmap-svg">
            {mindmapData.branches.map(branch => {
              const pos        = positions[branch.position]
              if (!pos) return null
              const isSelected = selectedBranch === branch.id
              const isVisited  = visitedIds.has(branch.id)
              const hasSelect  = selectedBranch !== null
              const opacity    = hasSelect
                ? (isSelected ? 1 : 0.08)
                : (isVisited ? 0.55 : 0.2)
              // Bezier control point: midpoint between center and node
              const cpx = (cx + pos.x) / 2
              const cpy = (cy + pos.y) / 2
              const d = `M ${cx} ${cy} Q ${cpx} ${cpy} ${pos.x} ${pos.y}`
              return (
                <path
                  key={branch.id}
                  d={d}
                  stroke={isDark ? branch.colorDark : branch.color}
                  strokeWidth={isSelected ? 3 : 2}
                  fill="none"
                  opacity={opacity}
                  strokeLinecap="round"
                />
              )
            })}
          </svg>

          {/* Nœud central */}
          <div className="center-node">
            <span className="cn-emoji">📐</span>
            <span className="cn-label">
              {mindmapData.center.split('\n').map((line, i, arr) => (
                <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
              ))}
            </span>
          </div>

          {/* Branches */}
          {mindmapData.branches.map(branch => {
            const pos        = positions[branch.position]
            if (!pos) return null
            const isSelected = selectedBranch === branch.id
            const isVisited  = visitedIds.has(branch.id)
            return (
              <div
                key={branch.id}
                className={`branch-node${isSelected ? ' selected' : ''}${isVisited ? ' visited' : ''}`}
                style={{
                  left: pos.x,
                  top:  pos.y,
                  background: isDark ? branch.bgDark  : branch.bgLight,
                  color:      isDark ? branch.colorDark : branch.colorLight,
                  '--branch-color': branch.color,
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

      {/* ── Bottom sheet détail ── */}
      <div className={`detail-sheet${activeBranch ? ' detail-sheet--open' : ''}`}>
        <div className="sheet-handle" onClick={() => setSelectedBranch(null)} />
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
