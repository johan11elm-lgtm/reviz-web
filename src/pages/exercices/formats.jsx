// -------------------------------------------------------
// Réviz — les formats des exercices en jeu (29/10)
// Un même cadre pour tous (relevé chez BrainQraft) : la consigne, Réviz et sa
// bulle, la zone de jeu, « Valider », puis la feuille de correction du quiz.
// Pas de chrono : on peut changer d'avis tant qu'on n'a pas validé. Tout se
// joue au toucher ; sur ordinateur, la carte des 4 coins se glisse aussi.
// Les données viennent de utils/exercicesChapitre.js.
// -------------------------------------------------------
import { useEffect, useState } from 'react'
import { Mascot } from '../../components/Mascot'
import { nbsp } from '../../utils/typography'

const LETTRES = ['A', 'B', 'C', 'D']

/** Nom de chaque format, affiché au-dessus de l'exercice et dans le récap. */
export const NOMS_FORMATS = {
  coins: '4 coins', intrus: 'Intrus', indices: 'Trois indices', definition: 'Définition',
  paires: 'Paires', ordre: 'Chronologie', annee: 'Année', qcm: 'Quiz',
}

/**
 * Le cadre commun. La feuille de correction est posée par la page, juste après, une fois l'exercice
 * validé. `sansValider` : le format se valide seul (les paires, une fois toutes trouvées).
 */
export function CadreExercice({ ex, children, peutValider, onValider, verdict, sansValider = false, grand = false }) {
  return (
    <section className={`ex-cadre ex-cadre--${ex.type}`} aria-labelledby={`ex-consigne-${ex.id}`}>
      <h1 id={`ex-consigne-${ex.id}`} className="ex-consigne">{nbsp(ex.consigne)}</h1>
      <div className="ex-reviz">
        <span className="ex-reviz-emote" aria-hidden="true"><Mascot pose={ex.pose} size={grand ? 64 : 52} alt="" /></span>
        <p className="ex-bulle">{nbsp(ex.bulle)}</p>
      </div>
      <div className="ex-zone">{children}</div>
      {!verdict && !sansValider && (
        <button type="button" className="ex-valider" disabled={!peutValider} onClick={onValider}>Valider</button>
      )}
    </section>
  )
}

/** État d'une case une fois l'exercice corrigé : la bonne en turquoise, le mauvais choix en rose. */
const etatCase = ({ choisi, bonne, verdict }) => (!verdict ? (choisi ? 'is-choisi' : '') : bonne ? 'is-juste' : choisi ? 'is-faux' : 'is-terne')

// ── Choix simples : QCM, Définition, Trois indices ──

function ListeChoix({ choix, sel, bonne, verdict, onChoisir, lettres = true, colonnes = false }) {
  return (
    <div className={`ex-choix${colonnes ? ' ex-choix--duo' : ''}`} role="group" aria-label="Réponses">
      {choix.map((c, i) => (
        <button key={i} type="button" className={`ex-choix-btn ${etatCase({ choisi: sel === i, bonne: i === bonne, verdict })}`}
          aria-pressed={sel === i} disabled={!!verdict} onClick={() => onChoisir(i)}>
          {lettres && <span className="ex-lettre" aria-hidden="true">{LETTRES[i]}</span>}
          <span className="ex-choix-txt">{nbsp(c)}</span>
        </button>
      ))}
    </div>
  )
}

export function Qcm({ ex, verdict, onValider, grand }) {
  const [sel, setSel] = useState(null)
  return (
    <CadreExercice ex={ex} verdict={verdict} grand={grand} peutValider={sel !== null} onValider={() => onValider(sel === ex.bonne)}>
      <ListeChoix choix={ex.choix} sel={sel} bonne={ex.bonne} verdict={verdict} onChoisir={setSel} />
    </CadreExercice>
  )
}

export function Definition({ ex, verdict, onValider, grand }) {
  const [sel, setSel] = useState(null)
  return (
    <CadreExercice ex={ex} verdict={verdict} grand={grand} peutValider={sel !== null} onValider={() => onValider(sel === ex.bonne)}>
      <ListeChoix choix={ex.choix} sel={sel} bonne={ex.bonne} verdict={verdict} onChoisir={setSel} lettres={false} colonnes />
    </CadreExercice>
  )
}

export function Indices({ ex, verdict, onValider, grand }) {
  const [sel, setSel] = useState(null)
  const pose = sel === null ? null : ex.choix[sel]
  return (
    <CadreExercice ex={ex} verdict={verdict} grand={grand} peutValider={sel !== null} onValider={() => onValider(sel === ex.bonne)}>
      <div className="ex-arbre">
        <span className={`ex-arbre-tete ${pose ? (verdict ? (verdict === 'juste' ? 'is-juste' : 'is-faux') : 'is-pose') : ''}`} aria-live="polite">
          {pose ? nbsp(pose) : '?'}
        </span>
        <span className="ex-arbre-tronc" aria-hidden="true" />
        <ul className="ex-arbre-indices" aria-label="Les trois indices">
          {ex.indices.map((t, i) => <li key={i}><span className="ex-indice-num" aria-hidden="true">{i + 1}</span>{nbsp(t)}</li>)}
        </ul>
      </div>
      <ListeChoix choix={ex.choix} sel={sel} bonne={ex.bonne} verdict={verdict} onChoisir={setSel} />
    </CadreExercice>
  )
}

// ── 4 coins : la carte au centre, à poser dans le bon coin ──

export function Coins({ ex, verdict, onValider, grand }) {
  const [sel, setSel] = useState(null)
  const [survol, setSurvol] = useState(null)
  const glisser = grand && !verdict
  return (
    <CadreExercice ex={ex} verdict={verdict} grand={grand} peutValider={sel !== null} onValider={() => onValider(sel === ex.bonne)}>
      <div className="ex-coins">
        {ex.coins.map((nom, i) => (
          <button key={i} type="button"
            className={`ex-coin ex-coin--${i} ${etatCase({ choisi: sel === i, bonne: i === ex.bonne, verdict })}${survol === i ? ' is-survol' : ''}`}
            aria-pressed={sel === i} disabled={!!verdict} onClick={() => setSel(i)}
            onDragOver={glisser ? e => { e.preventDefault(); setSurvol(i) } : undefined}
            onDragLeave={glisser ? () => setSurvol(null) : undefined}
            onDrop={glisser ? e => { e.preventDefault(); setSurvol(null); setSel(i) } : undefined}>
            <span className="ex-coin-nom">{nbsp(nom)}</span>
          </button>
        ))}
        <span className={`ex-carte-coin${sel !== null ? ` is-pose is-pose--${sel}` : ''}${verdict ? ` is-${verdict}` : ''}`}
          draggable={glisser} onDragStart={glisser ? e => { e.dataTransfer.setData('text/plain', 'carte'); e.dataTransfer.effectAllowed = 'move' } : undefined}
          aria-label={`Carte à ranger : ${ex.carte}`}>
          {nbsp(ex.carte)}
        </span>
      </div>
      {grand && !verdict && <p className="ex-aide">Glisse la carte dans un coin, ou clique sur le coin.</p>}
    </CadreExercice>
  )
}

// ── Intrus : quatre cartes, on retourne l'intruse ──

export function Intrus({ ex, verdict, onValider, grand }) {
  const [sel, setSel] = useState(null)
  return (
    <CadreExercice ex={ex} verdict={verdict} grand={grand} peutValider={sel !== null} onValider={() => onValider(sel === ex.bonne)}>
      <div className="ex-cartes" role="group" aria-label={`Cartes sur le thème ${ex.theme}`}>
        {ex.cartes.map((c, i) => (
          <button key={i} type="button" className={`ex-carte ${etatCase({ choisi: sel === i, bonne: i === ex.bonne, verdict })}`}
            aria-pressed={sel === i} disabled={!!verdict} onClick={() => setSel(i)} style={{ '--i': i }}>
            {(sel === i || (verdict && i === ex.bonne)) && <span className="ex-carte-tag">Intrus</span>}
            <span className="ex-carte-txt">{nbsp(c)}</span>
          </button>
        ))}
      </div>
    </CadreExercice>
  )
}

// ── Paires : un mot, puis sa définition. Juste s'il n'y a eu aucune erreur ──

export function Paires({ ex, verdict, onValider, grand }) {
  const [terme, setTerme] = useState(null)
  const [trouvees, setTrouvees] = useState([])
  const [rate, setRate] = useState(null) // [terme, définition] faux, rougis un instant
  const [erreurs, setErreurs] = useState(0)
  const fini = trouvees.length === ex.paires.length
  useEffect(() => {
    if (!rate) return undefined
    const t = setTimeout(() => setRate(null), 700)
    return () => clearTimeout(t)
  }, [rate])
  useEffect(() => { if (fini && !verdict) onValider(erreurs === 0, { erreurs }) }, [fini]) // eslint-disable-line react-hooks/exhaustive-deps
  function choisirDefinition(d) {
    if (terme === null || verdict || rate || trouvees.includes(d)) return
    if (d === terme) setTrouvees(t => [...t, d])
    else { setErreurs(n => n + 1); setRate([terme, d]) }
    setTerme(null)
  }
  const etat = (i, cote) => (trouvees.includes(i) ? 'is-juste' : rate && rate[cote === 'g' ? 0 : 1] === i ? 'is-faux' : cote === 'g' && terme === i ? 'is-choisi' : '')
  return (
    <CadreExercice ex={ex} verdict={verdict} grand={grand} sansValider>
      <div className="ex-paires">
        <div className="ex-paires-col" role="group" aria-label="Mots">
          {ex.ordreTermes.map(i => (
            <button key={i} type="button" className={`ex-paire ex-paire--mot ${etat(i, 'g')}`} aria-pressed={terme === i}
              disabled={trouvees.includes(i) || !!verdict} onClick={() => setTerme(t => (t === i ? null : i))}>
              {trouvees.includes(i) && <span className="ex-paire-num" aria-hidden="true">{trouvees.indexOf(i) + 1}</span>}
              {nbsp(ex.paires[i].terme)}
            </button>
          ))}
        </div>
        <div className="ex-paires-col" role="group" aria-label="Définitions">
          {ex.ordreDefinitions.map(i => (
            <button key={i} type="button" className={`ex-paire ex-paire--def ${etat(i, 'd')}`}
              disabled={trouvees.includes(i) || !!verdict} onClick={() => choisirDefinition(i)}>
              {trouvees.includes(i) && <span className="ex-paire-num" aria-hidden="true">{trouvees.indexOf(i) + 1}</span>}
              {nbsp(ex.paires[i].definition)}
            </button>
          ))}
        </div>
      </div>
      {!verdict && <p className="ex-aide" aria-live="polite">{terme === null ? 'Touche d’abord un mot.' : 'Et maintenant, sa définition.'}{erreurs > 0 ? ` · ${erreurs} erreur${erreurs > 1 ? 's' : ''}` : ''}</p>}
    </CadreExercice>
  )
}

// ── Chronologie : toucher les événements du plus ancien au plus récent ──

export function Chronologie({ ex, verdict, onValider, grand }) {
  const [ordre, setOrdre] = useState([]) // indices des événements, dans l'ordre touché
  const complet = ordre.length === ex.evenements.length
  const toucher = i => {
    if (verdict) return
    setOrdre(o => (o.includes(i) ? o.filter(x => x !== i) : [...o, i]))
  }
  const juste = complet && ordre.every((x, k) => x === ex.bonOrdre[k])
  return (
    <CadreExercice ex={ex} verdict={verdict} grand={grand} peutValider={complet} onValider={() => onValider(juste)}>
      <ol className="ex-frise" aria-label="Événements">
        {ex.evenements.map((e, i) => {
          const rang = ordre.indexOf(i)
          const bonRang = ex.bonOrdre.indexOf(i)
          const cls = !verdict ? (rang >= 0 ? 'is-choisi' : '') : rang === bonRang ? 'is-juste' : 'is-faux'
          return (
            <li key={i}>
              <button type="button" className={`ex-evenement ${cls}`} disabled={!!verdict} onClick={() => toucher(i)}
                aria-label={`${e.texte}${rang >= 0 ? `, placé en ${rang + 1}` : ''}`}>
                <span className="ex-rang" aria-hidden="true">{verdict ? bonRang + 1 : rang >= 0 ? rang + 1 : ''}</span>
                <span className="ex-evenement-txt">{nbsp(e.texte)}</span>
                {verdict && <span className="ex-evenement-date">{e.date}</span>}
              </button>
            </li>
          )
        })}
      </ol>
      {!verdict && ordre.length > 0 && <button type="button" className="ex-effacer" onClick={() => setOrdre([])}>Tout effacer</button>}
    </CadreExercice>
  )
}

// ── Année : un curseur sur une frise de 60 ans, avec − et + pour viser juste ──

export function Annee({ ex, verdict, onValider, grand }) {
  const milieu = Math.round((ex.min + ex.max) / 2 / 5) * 5
  const [valeur, setValeur] = useState(milieu)
  const [bouge, setBouge] = useState(false)
  const regler = v => { setBouge(true); setValeur(Math.min(ex.max, Math.max(ex.min, v))) }
  const pct = v => ((v - ex.min) / (ex.max - ex.min)) * 100
  return (
    <CadreExercice ex={ex} verdict={verdict} grand={grand} peutValider={bouge} onValider={() => onValider(valeur === ex.annee)}>
      <div className={`ex-annee${verdict ? ` is-${verdict}` : ''}`}>
        <output className="ex-annee-valeur" aria-live="polite">{valeur}</output>
        <div className="ex-annee-reglage">
          <button type="button" className="ex-annee-pas" onClick={() => regler(valeur - 1)} disabled={!!verdict} aria-label="Une année de moins">−</button>
          <div className="ex-annee-piste">
            <input type="range" min={ex.min} max={ex.max} step={1} value={valeur} disabled={!!verdict}
              onChange={e => regler(Number(e.target.value))} aria-label="Année" style={{ '--pct': `${pct(valeur)}%` }} />
            {verdict && <span className="ex-annee-repere" style={{ left: `${pct(ex.annee)}%` }} aria-hidden="true"><i />{ex.annee}</span>}
          </div>
          <button type="button" className="ex-annee-pas" onClick={() => regler(valeur + 1)} disabled={!!verdict} aria-label="Une année de plus">+</button>
        </div>
        <div className="ex-annee-bornes" aria-hidden="true"><span>{ex.min}</span><span>{ex.max}</span></div>
      </div>
    </CadreExercice>
  )
}

export const FORMATS = { coins: Coins, intrus: Intrus, indices: Indices, definition: Definition, paires: Paires, ordre: Chronologie, annee: Annee, qcm: Qcm }
