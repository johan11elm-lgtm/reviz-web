// -------------------------------------------------------
// Réviz — La recherche de l'accueil (docs/plan-reviz-ia-agent.md, étape 3)
//
// Pendant que l'élève tape : « Demander à Réviz IA » en premier (la question part
// telle quelle à Réviz IA sans leçon, qui connaît ses contrôles et ses erreurs),
// puis les chapitres de son programme et ses cours scannés qui correspondent,
// trouvés comme les trouve Réviz IA (chercherChapitres). Entrée : Réviz IA.
// -------------------------------------------------------
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EtoileIA } from './BottomNav'
import { openChapter } from '../services/programmeService'
import { restoreLesson } from '../services/historyService'
import { track } from '../services/statsService'
import { chercherChapitres } from '../utils/agent'

const Loupe = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
)

// Ce qu'on peut demander, écrit dans le champ vide comme si quelqu'un le tapait (idée de Johan, 29/10).
export const EXEMPLES_RECHERCHE = [
  'J’ai un contrôle demain, aide-moi à réviser',
  'Fais-moi réciter le théorème de Pythagore',
  'Programme mon contrôle de SVT de mardi',
  'Explique-moi la photosynthèse simplement',
  'Je fais quoi ce soir ?',
  'Fais-moi refaire mes erreurs',
]

/**
 * Le texte d'exemple du champ : il se tape lettre à lettre, reste un instant, s'efface, puis le
 * suivant. À l'arrêt (champ touché, ou mouvement réduit demandé), un exemple entier.
 */
function useExempleQuiSeTape(exemples, actif) {
  const [etat, setEtat] = useState({ i: 0, n: exemples[0].length })
  useEffect(() => {
    if (!actif) return undefined
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      const t = setInterval(() => setEtat(e => ({ i: (e.i + 1) % exemples.length, n: Infinity })), 3500)
      return () => clearInterval(t)
    }
    let { i } = etat, n = 0, efface = false, t
    const pas = () => {
      const long = exemples[i].length
      if (!efface && n < long) { n += 1; t = setTimeout(pas, n === long ? 1800 : 45) }
      else if (!efface) { efface = true; t = setTimeout(pas, 22) }
      else if (n > 0) { n -= 1; t = setTimeout(pas, n === 0 ? 350 : 22) }
      else { efface = false; i = (i + 1) % exemples.length; t = setTimeout(pas, 45) }
      setEtat({ i, n })
    }
    t = setTimeout(pas, 600)
    return () => clearTimeout(t)
  }, [actif])
  const ex = exemples[etat.i]
  return actif ? ex.slice(0, etat.n) : ex
}

/**
 * @param {string} classe     la classe du programme affiché à l'accueil (« 4ème »)
 * @param {object} catalogue  son index (loadCatalogue), null tant qu'il charge
 * @param {object[]} lecons   les leçons de l'élève (loadLessons)
 */
export function RechercheAccueil({ classe, catalogue, lecons = [] }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [ouvert, setOuvert] = useState(false)
  const [focus, setFocus] = useState(false)
  const [erreur, setErreur] = useState('')
  const texte = q.trim()
  const exemple = useExempleQuiSeTape(EXEMPLES_RECHERCHE, !q && !focus)
  const resultats = texte.length >= 2
    ? chercherChapitres({ catalogue, lecons: lecons.map(l => ({ id: l.id, titre: l.metadata?.title ?? 'Leçon', matiere: l.metadata?.subject ?? '' })), recherche: texte, max: 5 })
    : []

  function demander() {
    if (!texte) return
    track('recherche_accueil', { vers: 'ia' })
    navigate('/coach', { state: { question: texte, envoyer: true } })
  }
  async function ouvrir(r) {
    track('recherche_accueil', { vers: r.type === 'programme' ? 'programme' : 'scan' })
    try {
      if (r.type === 'programme') await openChapter(classe, r.programme, { id: r.id, titre: r.titre })
      else if (!restoreLesson(r.id)) throw new Error('COURS_EFFACE')
      navigate('/analyse')
    } catch {
      setErreur('Ce chapitre ne s’ouvre pas pour le moment. Retrouve-le dans ton programme.')
    }
  }

  // Sur iPhone, toucher un bouton de la liste retire le focus du champ sans le donner au bouton
  // (relatedTarget vide) : fermer aussitôt la liste au blur faisait disparaître le bouton avant le
  // clic (Johan, 29/10). La liste garde donc le focus dans le champ, et la fermeture attend un peu.
  const fermeture = useRef(null)
  useEffect(() => () => clearTimeout(fermeture.current), [])
  const garderFocus = e => e.preventDefault()

  return (
    <form
      className="nm-recherche nm-recherche--champ"
      role="search"
      onSubmit={e => { e.preventDefault(); demander() }}
      onBlur={e => {
        if (e.currentTarget.contains(e.relatedTarget)) return
        clearTimeout(fermeture.current)
        fermeture.current = setTimeout(() => setOuvert(false), 250)
      }}
    >
      <Loupe />
      <input
        type="search"
        value={q}
        onChange={e => { setQ(e.target.value); setOuvert(true); setErreur('') }}
        onFocus={() => { clearTimeout(fermeture.current); setOuvert(true); setFocus(true) }}
        onBlur={() => setFocus(false)}
        onKeyDown={e => { if (e.key === 'Escape') setOuvert(false) }}
        placeholder={exemple}
        aria-label="Chercher un chapitre ou demander à Réviz IA"
        enterKeyHint="search"
        autoComplete="off"
      />
      {ouvert && texte && (
        <div className="nm-recherche-liste" onPointerDown={garderFocus} onMouseDown={garderFocus}>
          <button type="button" className="nm-recherche-item nm-recherche-item--ia" onClick={demander}>
            <EtoileIA id="rv-ia-recherche" size={22} />
            <span><b>Demander à Réviz IA</b><small>« {texte} »</small></span>
          </button>
          {resultats.map(r => (
            <button key={`${r.type}-${r.id}`} type="button" className="nm-recherche-item" onClick={() => ouvrir(r)}>
              <span><b>{r.titre}</b><small>{r.type === 'programme' ? r.programme : 'Ton cours scanné'}</small></span>
            </button>
          ))}
          {erreur && <p className="nm-recherche-erreur" role="alert">{erreur}</p>}
        </div>
      )}
    </form>
  )
}
