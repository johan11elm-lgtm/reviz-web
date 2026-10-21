import { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { recordRevision } from '../services/revisionService'
import { BRANCH_COLORS, BRANCH_POSITIONS } from '../utils/aiPrompts'
import { Pantin } from '../components/Pantin'
import { Mascot } from '../components/Mascot'
import { BulleReviz } from '../components/reviz/BulleReviz'
import { MissingLessonState } from '../components/MissingLessonState'
import { FormatFeedback } from '../components/FormatFeedback'
import { nbsp } from '../utils/typography'
import { useIsDesktop } from '../hooks/useMediaQuery'
import { teinteMatiere, varsTeinte } from '../utils/teinteMatiere'
import '../components/reviz/HerosMatiere.css'
import './Mindmap.css'
import { mesurer } from '../services/mesure'

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
  // Cartes-branches de 156px : centrées à ~27 % / 73 % de la largeur, elles
  // occupent l'espace sans sortir du canvas ni chevaucher le nœud central.
  const xLeft   = Math.max(Math.round(W * 0.27), 100)
  const xRight  = Math.min(Math.round(W * 0.73), W - 100)
  const yTop    = Math.max(Math.round(H * 0.2), 70)
  const yBottom = Math.min(Math.round(H * 0.78), H - 92)
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

// Couleur de chaque branche : pastel, et teinte plus foncée pour la tranche et le pointillé.
const COULEURS = [
  { pastel: '#E4E0FA', fonce: '#C9C2F2' },
  { pastel: '#FFE6D2', fonce: '#FFC596' },
  { pastel: '#DCF5E6', fonce: '#A8E3C2' },
  { pastel: '#FFD9E4', fonce: '#F4B8CB' },
]
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`

const Chevron = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
)
const Croix = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
)
const Coche = ({ taille = 15 }) => (
  <svg viewBox="0 0 24 24" width={taille} height={taille} fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
)
const Fleche = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
)

/**
 * Place des branches (centres des ronds) et des routes, selon leur nombre (2 à 4).
 * Téléphone : sous la carte « Chapitre » (origine en haut au centre) ; ordinateur : autour du
 * rond central.
 */
function plan(n, l, grand) {
  if (grand) {
    const g = l * 132 / 840, d = l - g, c = [l / 2, 330]
    const coins = n === 2 ? [[g, 330], [d, 330]]
      : n === 3 ? [[g, 112], [d, 112], [c[0], 560]]
      : [[g, 112], [d, 112], [g, 528], [d, 528]]
    return { origine: c, centres: coins, h: 640, route: (x, y) => `M${c[0]} ${c[1]} C${(c[0] + x) / 2} ${c[1]}, ${(c[0] + x) / 2} ${y}, ${x} ${y}` }
  }
  const g = l * 0.245, d = l * 0.755, m = l / 2
  const centres = n === 2 ? [[g, 68], [d, 68]] : n === 3 ? [[g, 68], [d, 68], [m, 248]] : [[g, 68], [d, 68], [g, 248], [d, 248]]
  const o = [m, -70]
  // Les routes du bas passent dans le couloir entre les deux ronds du haut.
  return { origine: o, centres, h: 320, route: (x, y) => (y < 100
    ? `M${o[0]} ${o[1]} C${o[0]} 20, ${x} -10, ${x} ${y}`
    : `M${o[0]} ${o[1]} C${o[0]} 170, ${x} 150, ${x} ${y}`) }
}

/**
 * Carte mentale (handoff Claude Design du 21/10) : le chapitre au centre, 2 à 4 branches en ronds
 * reliés par des routes de plateau. On ouvre les branches une à une (panneau du bas sur téléphone,
 * panneau latéral sur ordinateur), avec un mode Teste-toi (idées floutées, révélées au toucher)
 * et un écran de fin calme.
 */
function MindmapSession() {
  useEffect(() => { recordRevision('mindmap'); mesurer('format_ouvert', { format: 'mindmap' }) }, [])
  const data = useMemo(() => getMindmapData(), [])
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const branches = data.branches
  const n = branches.length
  const teinte = teinteMatiere(data.subject)
  const nbCartes = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('reviz-ai-data') || 'null')?.flashcards?.length ?? 0 } catch { return 0 }
  }, [])

  const [vues, setVues] = useState(() => branches.map(() => false))
  const [ouverte, setOuverte] = useState(null)
  const [teste, setTeste] = useState(false)
  const [revelees, setRevelees] = useState(() => new Set())
  const [fin, setFin] = useState(false)
  const nbVues = vues.filter(Boolean).length

  function ouvrir(i) {
    setOuverte(i)
    setRevelees(new Set())
    setVues(v => v.map((x, k) => (k === i ? true : x)))
  }
  function suivante() {
    const reste = vues.map((v, k) => (!v && k !== ouverte ? k : -1)).filter(k => k >= 0)
    if (!reste.length) { setOuverte(null); setFin(true); return }
    ouvrir(reste[0])
  }
  function basculerTeste() { setTeste(t => !t); setRevelees(new Set()) }
  function revoir() { setFin(false); setOuverte(null) }

  // Ce que dit Réviz.
  const lignes = fin ? ['Tu as fait le tour du chapitre.', 'Reviens-y avant ton contrôle.']
    : [nbVues === 0 ? `${pluriel(n, 'branche')} à explorer.` : nbVues === n ? 'Tout est exploré.' : `Encore ${pluriel(n - nbVues, 'branche')}.`,
       teste ? 'Les idées sont cachées : retrouve-les.' : 'Commence par celle que tu veux.']
  const pantin = useRef(null)
  const [parle, setParle] = useState(false)
  const texte = lignes.join('\n')
  useEffect(() => { if (parle) pantin.current?.dire(texte) }, [texte, parle])
  useEffect(() => {
    let t
    const essai = () => { t = setTimeout(() => (document.hidden ? essai() : setParle(true)), 4000) }
    essai()
    return () => clearTimeout(t)
  }, [])
  const reviz = taille => (
    <div className="cm-reviz">
      <BulleReviz key={texte} lignes={lignes} parle={parle} className="cm-bulle" />
      <Pantin
        key={fin ? 'fin' : 'carte'}
        ref={pantin}
        size={taille}
        expression={fin ? 'fier' : 'reflechit'}
        entree={fin ? 'saut' : undefined}
        repli={null}
        onEntree={() => setParle(true)}
        onClick={() => pantin.current?.geste('saut')}
        label="Réviz, ta mascotte"
      />
    </div>
  )

  // La carte : routes puis ronds des branches.
  const boite = useRef(null)
  const [l, setL] = useState(isDesktop ? 840 : 375)
  useLayoutEffect(() => {
    const el = boite.current
    if (!el) return
    const mesure = () => setL(el.clientWidth)
    mesure()
    const ro = new ResizeObserver(mesure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [fin])
  // Ordinateur : la carte est dessinée entre 640 et 840 px de large, puis mise à l'échelle de sa colonne.
  const largeur = isDesktop ? Math.max(640, Math.min(840, l)) : l
  const echelle = isDesktop ? Math.min(1, l / largeur) : 1
  const P = plan(n, largeur, isDesktop)
  const taille = isDesktop ? 184 : 136
  const plateau = (
    <div className={`cm-plateau${isDesktop ? ' cm-plateau--grand' : ''}`} style={{ height: P.h * echelle }}>
      <div className="cm-plateau-int" style={isDesktop ? { width: largeur, height: P.h, transform: `scale(${echelle})` } : { height: P.h }}>
      <svg className="cm-routes" width={largeur} height={P.h} aria-hidden="true">
        {P.centres.map(([x, y], i) => (
          <g key={i}>
            <path d={P.route(x, y)} transform="translate(0 6)" fill="none" stroke="rgba(160,80,20,.08)" strokeWidth={isDesktop ? 30 : 22} strokeLinecap="round" />
            <path d={P.route(x, y)} fill="none" stroke="#fff" strokeWidth={isDesktop ? 30 : 22} strokeLinecap="round" />
            <path d={P.route(x, y)} fill="none" stroke={ouverte === i && isDesktop ? '#C25407' : COULEURS[i].fonce} strokeWidth={isDesktop ? 3.5 : 3}
              strokeDasharray={isDesktop ? '2 11' : '2 9'} strokeLinecap="round" />
          </g>
        ))}
      </svg>
      {isDesktop && (
        <div className="cm-centre" style={{ left: P.origine[0] - 110, top: P.origine[1] - 110 }}>
          <span className="cm-centre-surtitre">Chapitre</span>
          <span className="cm-centre-titre">{data.center}</span>
        </div>
      )}
      {branches.map((b, i) => {
        const [x, y] = P.centres[i]
        return (
          <button key={b.id} type="button" className={`cm-branche${ouverte === i ? ' is-ouverte' : ''}${vues[i] ? ' is-vue' : ''}`}
            style={{ left: x - taille / 2, top: y - taille / 2, width: taille, height: taille, '--cm-pastel': COULEURS[i].pastel, '--cm-fonce': COULEURS[i].fonce }}
            onClick={() => ouvrir(i)} aria-label={`${b.label}, ${pluriel(b.children.length, 'idée')}${vues[i] ? ', explorée' : ''}`}>
            {isDesktop && <span className="cm-branche-num">Branche {i + 1}</span>}
            <span className="cm-branche-nom">{b.label}</span>
            <span className="cm-branche-idees">{pluriel(b.children.length, 'idée')}</span>
            {vues[i] && <span className="cm-branche-coche" aria-hidden="true"><Coche /></span>}
          </button>
        )
      })}
      </div>
    </div>
  )

  // Le détail de la branche ouverte.
  const b = ouverte !== null ? branches[ouverte] : null
  const detail = b && (
    <div className="cm-detail" style={{ '--cm-pastel': COULEURS[ouverte].pastel, '--cm-fonce': COULEURS[ouverte].fonce }}>
      <div className="cm-detail-tete">
        {!isDesktop && <span className="cm-poignee" aria-hidden="true" />}
        <span className="cm-detail-surtitre">Branche {ouverte + 1} sur {n}{isDesktop ? ` · ${nbVues} / ${n} explorées` : ''}</span>
        <h2 className="cm-detail-nom">{b.label}</h2>
        <button type="button" className="cm-fermer" onClick={() => setOuverte(null)} aria-label="Fermer la branche"><Croix /></button>
      </div>
      <div className="cm-detail-corps">
        {b.detail && <p className="cm-explication">{b.detail}</p>}
        {b.children.length > 0 && (
          <>
            <div className="cm-idees-tete">
              <span className="cm-idees-titre">Idées clés</span>
              {teste && <span className="cm-indice">Touche pour révéler</span>}
            </div>
            <ul className="cm-idees">
              {b.children.map((idee, k) => {
                const cachee = teste && !revelees.has(k)
                return (
                  <li key={k}>
                    <button type="button" className={`cm-idee${cachee ? ' is-cachee' : ''}`} disabled={!cachee}
                      onClick={() => setRevelees(r => new Set(r).add(k))} aria-label={cachee ? `Idée ${k + 1} : masquée, touche pour révéler` : undefined}>
                      <i aria-hidden="true" /><span aria-hidden={cachee}>{nbsp(idee)}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
        {isDesktop && (
          <div className="cm-rappel">
            <Mascot pose="coach" size={52} alt="" aria-hidden="true" />
            <span>{lignes[0]}</span>
          </div>
        )}
        <button type="button" className="cm-btn cm-btn--orange" onClick={suivante}>
          {vues.every((v, k) => v || k === ouverte) ? 'Terminer la carte' : 'Branche suivante'}<Fleche />
        </button>
      </div>
    </div>
  )

  const interrupteur = (
    <span className={`cm-interrupteur${teste ? ' is-on' : ''}`} aria-hidden="true"><i /></span>
  )
  const actionsFin = (
    <div className="cm-fin-actions">
      {nbCartes > 0 && <button type="button" className="cm-btn cm-btn--orange" onClick={() => navigate('/flashcards')}>Passer aux flashcards · {pluriel(nbCartes, 'carte')}<Fleche /></button>}
      <button type="button" className="cm-btn cm-btn--blanc" onClick={revoir}>Revoir la carte</button>
      <button type="button" className="cm-lien" onClick={() => navigate('/analyse')}>Retour au chapitre</button>
    </div>
  )
  const segments = (
    <span className="cm-segments" aria-hidden="true">{vues.map((v, i) => <i key={i} className={v ? 'is-vue' : ''} />)}</span>
  )
  const retour = <button type="button" className="ch-retour cm-retour" onClick={() => navigate('/analyse')}><Chevron />{isDesktop ? 'Fiche chapitre' : ''}</button>
  const racine = `app app--no-halo ch-page mindmap-page cm-page${isDesktop ? ' app--large ch-page--large cm-page--large' : ''}`

  // ── Ordinateur ──
  if (isDesktop) {
    return (
      <div className={racine} style={varsTeinte(teinte)}>
        <div className="content cm-defile">
          <div className="ch-hero cm-hero">
            <span className="ch-deco ch-deco--a" aria-hidden="true" />
            <span className="ch-deco ch-deco--b" aria-hidden="true" />
            <span className="ch-point" aria-hidden="true" />
            <span className="ch-grain" aria-hidden="true" />
            <div className="cm-hero-int">
              <div className="ch-haut">{retour}</div>
              <span className="ch-surtitre">{data.subject ? `${data.subject} · ` : ''}Carte mentale</span>
              <h1 className="cm-titre">Tout le chapitre sur une page</h1>
            </div>
          </div>
          <div className="cm-scene">
            <div className="cm-carte-zone" ref={boite}>{plateau}</div>
            <aside className="cm-panneau">
              {fin ? (
                <div className="cm-panneau-fin">
                  <span className="cm-surtitre">{nbVues} / {n} branches</span>
                  <h2 className="cm-fin-titre">Carte explorée</h2>
                  {reviz(170)}
                  {actionsFin}
                </div>
              ) : b ? detail : (
                <div className="cm-panneau-accueil">
                  {reviz(190)}
                  {segments}
                  <span className="cm-compte">{nbVues} / {n} explorées</span>
                </div>
              )}
              <button type="button" className="cm-teste" role="switch" aria-checked={teste} aria-label="Teste-toi" onClick={basculerTeste}>
                <span className="cm-teste-txt">
                  <b>Teste-toi</b>
                  <span>{teste ? 'Les idées sont cachées. Touche pour révéler.' : 'Cache les idées pour t’entraîner.'}</span>
                </span>
                {interrupteur}
              </button>
            </aside>
          </div>
        </div>
      </div>
    )
  }

  // ── Téléphone ──
  if (fin) {
    return (
      <div className={`${racine} cm-page--fin`} style={varsTeinte(teinte)}>
        <div className="content cm-defile cm-fin">
          <div className="cm-ligne-haut">{retour}</div>
          <span className="cm-surtitre">{data.subject ? `${data.subject} · ` : ''}Carte mentale</span>
          <h1 className="cm-fin-titre">Carte explorée</h1>
          {reviz(150)}
          <div className="cm-fin-carte">
            {branches.map((br, i) => (
              <button key={br.id} type="button" className="cm-fin-branche" onClick={() => { setFin(false); ouvrir(i) }}>
                <span className="cm-fin-rond" style={{ background: COULEURS[i].pastel }}><Coche taille={14} /></span>
                <span>{br.label}</span>
              </button>
            ))}
          </div>
          {actionsFin}
          <FormatFeedback format="mindmap" question="Cette carte t'a aidé ?" />
        </div>
      </div>
    )
  }
  return (
    <div className={racine} style={varsTeinte(teinte)}>
      <div className="cm-ecran">
        <div className="ch-hero cm-hero">
          <span className="ch-deco ch-deco--a" aria-hidden="true" />
          <span className="ch-deco ch-deco--b" aria-hidden="true" />
          <span className="ch-point" aria-hidden="true" />
          <span className="ch-grain" aria-hidden="true" />
          <div className="cm-ligne-haut">
            {retour}
            <span className="cm-etat">
              <span className="cm-etat-titre">Carte mentale</span>
              <span className="cm-etat-ligne">{segments}{nbVues} / {n}</span>
            </span>
            <button type="button" className={`cm-pilule-teste${teste ? ' is-on' : ''}`} role="switch" aria-checked={teste} aria-label="Teste-toi" onClick={basculerTeste}>
              Teste-toi{interrupteur}
            </button>
          </div>
          {reviz(170)}
        </div>
        <div className="cm-chapitre">
          <span className="cm-centre-surtitre">Chapitre</span>
          <span className="cm-chapitre-titre">{data.center}</span>
        </div>
        <div ref={boite}>{plateau}</div>
      </div>
      {/* Panneau de la branche ouverte : il monte du bas, le voile le referme. */}
      <div className={`cm-voile${b ? ' is-la' : ''}`} onClick={() => setOuverte(null)} aria-hidden="true" />
      <div className={`cm-feuille${b ? ' is-la' : ''}`} role="dialog" aria-modal="true" aria-hidden={!b} aria-label={b ? b.label : undefined}>
        {detail}
      </div>
    </div>
  )
}
