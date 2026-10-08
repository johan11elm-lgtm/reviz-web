import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ExpandIcon, XIcon } from './Icons'
import { useModalA11y } from '../hooks/useModalA11y'
import { nbsp } from '../utils/typography'
import { ILLUSTRATION_TYPES } from '../utils/lessonSchema'
import './Illustration.css'

// -------------------------------------------------------
// Réviz — Illustration d'un chapitre du programme (schéma, carte, figure,
// œuvre). Toujours sur une « feuille » blanche, quel que soit le thème, comme
// un document de manuel. Les SVG maison à légendes séparées sont insérés en
// ligne pour que le mode « Me tester » puisse cacher leurs étiquettes ; le
// reste passe par <img>. Les sources sont filtrées en amont
// (lessonSchema.parseIllustrations : /programme/illustrations/ uniquement).
// -------------------------------------------------------

const svgCache = new Map()
function chargerSvg(src) {
  if (!svgCache.has(src)) {
    const p = fetch(src)
      .then(r => { if (!r.ok) throw new Error('ILLUSTRATION_INDISPONIBLE'); return r.text() })
      .catch(err => { svgCache.delete(src); throw err })
    svgCache.set(src, p)
  }
  return svgCache.get(src)
}

/** Le dessin seul : SVG en ligne (légendes cachables) ou image. */
function Dessin({ illustration, testMode, onOuvrir }) {
  const enLigne = illustration.legendesMasquables
  const [svg, setSvg] = useState(null)
  const [echec, setEchec] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!enLigne) return
    let annule = false
    chargerSvg(illustration.src)
      .then(t => { if (!annule) setSvg(t) })
      .catch(() => { if (!annule) setEchec(true) })
    return () => { annule = true }
  }, [enLigne, illustration.src])

  // En mode test, chaque étiquette devient un bouton ; on repart de zéro à
  // chaque changement de mode.
  useEffect(() => {
    const node = ref.current
    if (!node || !svg) return
    node.querySelectorAll('.ill-legende').forEach(g => {
      g.classList.remove('is-revealed')
      if (testMode) {
        g.setAttribute('tabindex', '0')
        g.setAttribute('role', 'button')
        g.setAttribute('aria-label', 'Légende masquée : touche pour la révéler')
      } else {
        g.removeAttribute('tabindex')
        g.removeAttribute('role')
        g.removeAttribute('aria-label')
      }
    })
  }, [testMode, svg])

  function reveler(g) {
    g.classList.add('is-revealed')
    g.removeAttribute('aria-label')
  }
  function onClick(e) {
    if (!testMode) { onOuvrir?.(); return }
    const g = e.target.closest?.('.ill-legende')
    if (g) reveler(g)
  }
  function onKeyDown(e) {
    if (!testMode || (e.key !== 'Enter' && e.key !== ' ')) return
    const g = e.target.closest?.('.ill-legende')
    if (g) { e.preventDefault(); reveler(g) }
  }

  if (!enLigne || echec) {
    return (
      <img
        className="ill-image"
        src={illustration.src}
        alt={illustration.alt}
        loading="lazy"
        onClick={onOuvrir}
      />
    )
  }
  if (!svg) return <div className="ill-attente" aria-label={illustration.alt} role="img" />
  return (
    <div
      ref={ref}
      className={`ill-svg${testMode ? ' is-test' : ''}`}
      role={testMode ? 'group' : 'img'}
      aria-label={illustration.alt}
      onClick={onClick}
      onKeyDown={onKeyDown}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

export function Illustration({ illustration, testMode = false }) {
  const [plein, setPlein] = useState(false)
  const masquable = testMode && illustration.legendesMasquables
  const surtitre = ILLUSTRATION_TYPES[illustration.type]
  const image = !illustration.src.endsWith('.svg')
  return (
    <figure className={`ill-figure${image ? ' ill-figure--image' : ''}`}>
      <div className="ill-tete">
        <div className="ill-tete-texte">
          {surtitre && <span className="ill-surtitre">{surtitre}</span>}
          {illustration.titre && <p className="ill-titre">{nbsp(illustration.titre)}</p>}
        </div>
        <button
          type="button"
          className="ill-agrandir"
          onClick={() => setPlein(true)}
          aria-label="Agrandir l'illustration"
          title="Agrandir"
        >
          <ExpandIcon />
        </button>
      </div>
      <div className="ill-feuille">
        <Dessin illustration={illustration} testMode={masquable} onOuvrir={() => setPlein(true)} />
      </div>
      {masquable && <p className="ill-indice">Retrouve chaque légende, puis touche-la pour vérifier.</p>}
      {(illustration.legende || illustration.credit) && (
        <figcaption className="ill-legende-texte">
          {illustration.legende && nbsp(illustration.legende)}
          {illustration.credit && <span className="ill-credit">{illustration.credit}</span>}
        </figcaption>
      )}
      {plein && (
        <PleinEcran illustration={illustration} testMode={masquable} onClose={() => setPlein(false)} />
      )}
    </figure>
  )
}

const ZOOM_MIN = 1
const ZOOM_MAX = 4
const borne = (v, min, max) => Math.min(max, Math.max(min, v))

/** Plein écran : pincer pour zoomer, glisser pour se déplacer, boutons − / +. */
function PleinEcran({ illustration, testMode, onClose }) {
  const ref = useModalA11y(onClose)
  const vueRef = useRef(null)
  const [vue, setVue] = useState({ s: 1, x: 0, y: 0 })
  const vueCourante = useRef(vue)
  vueCourante.current = vue
  const pointeurs = useRef(new Map())
  const geste = useRef(null)

  // La page derrière ne défile plus tant que l'illustration est ouverte.
  useEffect(() => {
    const avant = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = avant }
  }, [])

  // Le dessin ne sort pas du cadre : déplacement limité à ce qui dépasse.
  function cadrer({ s, x, y }) {
    const r = vueRef.current?.getBoundingClientRect()
    const mx = r ? (r.width * (s - 1)) / 2 : 0
    const my = r ? (r.height * (s - 1)) / 2 : 0
    return { s, x: borne(x, -mx, mx), y: borne(y, -my, my) }
  }
  const zoomer = s => setVue(v => cadrer({ ...v, s: borne(s, ZOOM_MIN, ZOOM_MAX) }))

  function depart() {
    const pts = [...pointeurs.current.values()]
    const v = vueCourante.current
    if (pts.length >= 2) {
      return { type: 'pincer', d: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1, s: v.s }
    }
    if (pts.length === 1) return { type: 'glisser', px: pts[0].x, py: pts[0].y, x: v.x, y: v.y }
    return null
  }
  // Pas de setPointerCapture : il redirigerait le clic, et une légende masquée
  // ne se révélerait plus au toucher. La vue occupe tout l'écran, rien ne se perd.
  function onPointerDown(e) {
    pointeurs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    geste.current = depart()
  }
  function onPointerMove(e) {
    if (!pointeurs.current.has(e.pointerId)) return
    pointeurs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = geste.current
    const pts = [...pointeurs.current.values()]
    if (g?.type === 'pincer' && pts.length >= 2) {
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      zoomer(g.s * (d / g.d))
    } else if (g?.type === 'glisser' && pts.length === 1) {
      setVue(v => cadrer({ ...v, x: g.x + pts[0].x - g.px, y: g.y + pts[0].y - g.py }))
    }
  }
  function onPointerUp(e) {
    pointeurs.current.delete(e.pointerId)
    geste.current = depart()
  }
  function onWheel(e) {
    zoomer(vueCourante.current.s * Math.exp(-e.deltaY * 0.002))
  }

  return createPortal(
    <div
      className="ill-plein-ecran"
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={illustration.titre ?? illustration.legende ?? illustration.alt}
    >
      <div className="ill-pe-barre">
        <p className="ill-pe-titre">{nbsp(illustration.titre ?? illustration.legende ?? '')}</p>
        <button type="button" className="ill-pe-fermer" onClick={onClose} aria-label="Fermer">
          <XIcon />
        </button>
      </div>
      <div
        className="ill-pe-vue"
        ref={vueRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <div
          className="ill-pe-feuille"
          style={{ transform: `translate(${vue.x}px, ${vue.y}px) scale(${vue.s})` }}
        >
          <Dessin illustration={illustration} testMode={testMode} />
        </div>
      </div>
      <div className="ill-pe-zoom">
        <button type="button" onClick={() => zoomer(vue.s / 1.5)} disabled={vue.s <= ZOOM_MIN} aria-label="Dézoomer">−</button>
        <button type="button" onClick={() => setVue({ s: 1, x: 0, y: 0 })} disabled={vue.s === 1} className="ill-pe-taille">
          {Math.round(vue.s * 100)} %
        </button>
        <button type="button" onClick={() => zoomer(vue.s * 1.5)} disabled={vue.s >= ZOOM_MAX} aria-label="Zoomer">+</button>
      </div>
      {illustration.credit && <p className="ill-pe-credit">{illustration.credit}</p>}
    </div>,
    document.body,
  )
}
