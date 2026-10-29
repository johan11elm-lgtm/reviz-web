// -------------------------------------------------------
// Réviz — les formats des exercices en jeu (29/10)
// Un même cadre pour tous (relevé chez BrainQraft) : la consigne, Réviz et sa
// bulle, la zone de jeu, « Valider », puis la feuille de correction du quiz.
// Pas de chrono : on peut changer d'avis tant qu'on n'a pas validé. Tout se
// joue au toucher ; sur ordinateur, la carte des 4 coins se glisse aussi.
// Les données viennent de utils/exercicesChapitre.js.
// -------------------------------------------------------
import { useEffect, useRef, useState } from 'react'
import { Mascot } from '../../components/Mascot'
import { nbsp } from '../../utils/typography'

const LETTRES = ['A', 'B', 'C', 'D']

/** Nom de chaque format, affiché au-dessus de l'exercice et dans le récap. */
export const NOMS_FORMATS = {
  coins: '4 coins', intrus: 'Intrus', indices: 'Trois indices', definition: 'Définition',
  paires: 'Paires', ordre: 'Chronologie', annee: 'Année', qcm: 'Quiz',
  vraifaux: 'Vrai ou faux', phrase: 'Phrase à trous', memory: 'Mémory', classement: 'Classement',
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

// ── Glisser une carte à gauche ou à droite (Vrai ou faux, Classement) ──

const SEUIL = 80
/** Le doigt (ou la souris) emmène la carte ; lâchée au-delà de 80 px, elle part de ce côté. */
function useGlisser(onCote, actif) {
  const depart = useRef(null)
  const [dx, setDx] = useState(0)
  const fin = () => {
    if (depart.current === null) return
    depart.current = null
    if (Math.abs(dx) >= SEUIL) onCote(dx < 0 ? 'gauche' : 'droite')
    setDx(0)
  }
  const poignees = actif ? {
    onPointerDown: e => { depart.current = e.clientX; e.currentTarget.setPointerCapture?.(e.pointerId) },
    onPointerMove: e => { if (depart.current !== null) setDx(e.clientX - depart.current) },
    onPointerUp: fin,
    onPointerCancel: () => { depart.current = null; setDx(0) },
  } : {}
  return { dx, poignees }
}

const Fleche = ({ vers }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={vers === 'gauche' ? 'M19 12H5M11 6l-6 6 6 6' : 'M5 12h14M13 6l6 6-6 6'} />
  </svg>
)

// ── Vrai ou faux : une affirmation, à glisser à droite (vrai) ou à gauche (faux) ──

export function VraiFaux({ ex, verdict, onValider, grand }) {
  const [choix, setChoix] = useState(null) // true = vrai
  const repondre = v => { if (verdict || choix !== null) return; setChoix(v); onValider(v === ex.vrai) }
  const { dx, poignees } = useGlisser(cote => repondre(cote === 'droite'), !verdict && choix === null)
  const sortie = choix === null ? null : choix ? 'droite' : 'gauche'
  const penche = Math.max(-1, Math.min(1, dx / SEUIL))
  return (
    <CadreExercice ex={ex} verdict={verdict} grand={grand} sansValider>
      <div className="ex-vf">
        <div className={`ex-vf-carte${sortie ? ` is-sortie is-sortie--${sortie}` : ''}${verdict ? ` is-${verdict}` : ''}`}
          style={dx ? { transform: `translateX(${dx}px) rotate(${dx / 14}deg)` } : undefined} {...poignees}>
          <span className="ex-vf-tampon ex-vf-tampon--vrai" style={{ opacity: Math.max(0, penche) }} aria-hidden="true">Vrai</span>
          <span className="ex-vf-tampon ex-vf-tampon--faux" style={{ opacity: Math.max(0, -penche) }} aria-hidden="true">Faux</span>
          <span className="ex-vf-titre">{nbsp(ex.titre)}</span>
          <span className="ex-vf-affirmation">{nbsp(ex.affirmation)}</span>
        </div>
        <div className="ex-vf-boutons">
          <button type="button" className={`ex-vf-btn ex-vf-btn--faux${choix === false ? ' is-choisi' : ''}`} disabled={!!verdict} onClick={() => repondre(false)}>
            <Fleche vers="gauche" />Faux
          </button>
          <button type="button" className={`ex-vf-btn ex-vf-btn--vrai${choix === true ? ' is-choisi' : ''}`} disabled={!!verdict} onClick={() => repondre(true)}>
            Vrai<Fleche vers="droite" />
          </button>
        </div>
      </div>
    </CadreExercice>
  )
}

// ── Phrase à trous : un mot-clé manque, trois mots proposés ──

export function Phrase({ ex, verdict, onValider, grand }) {
  const [sel, setSel] = useState(null)
  const etatTrou = !verdict ? (sel === null ? 'vide' : 'pose') : sel === ex.bonne ? 'juste' : 'faux'
  return (
    <CadreExercice ex={ex} verdict={verdict} grand={grand} peutValider={sel !== null} onValider={() => onValider(sel === ex.bonne)}>
      <p className="ex-phrase">
        {nbsp(ex.avant)}
        <button type="button" className={`ex-trou is-${etatTrou}`} disabled={!!verdict || sel === null} onClick={() => setSel(null)}
          aria-label={sel === null ? 'Mot manquant' : `Mot placé : ${ex.mots[sel]}, toucher pour l’enlever`}>
          {sel === null ? '\u00a0' : ex.mots[sel]}
        </button>
        {nbsp(ex.apres)}
      </p>
      <div className="ex-banque" role="group" aria-label="Mots proposés">
        {ex.mots.map((m, i) => (
          <button key={i} type="button" className={`ex-mot ${etatCase({ choisi: sel === i, bonne: i === ex.bonne, verdict })}`}
            disabled={!!verdict} aria-pressed={sel === i} onClick={() => setSel(i)}>
            {m}
          </button>
        ))}
      </div>
    </CadreExercice>
  )
}

// ── Mémory : retourner deux cartes, un mot et sa définition ──

export function Memory({ ex, verdict, onValider, grand }) {
  const [ouvertes, setOuvertes] = useState([]) // indices retournés en ce moment (2 au plus)
  const [trouvees, setTrouvees] = useState([]) // numéros de paires trouvées
  const [erreurs, setErreurs] = useState(0)
  const fini = trouvees.length === 3
  useEffect(() => {
    if (ouvertes.length !== 2) return undefined
    const [a, b] = ouvertes.map(i => ex.cartes[i])
    if (a.paire === b.paire) {
      setTrouvees(t => [...t, a.paire])
      setOuvertes([])
      return undefined
    }
    const t = setTimeout(() => { setErreurs(n => n + 1); setOuvertes([]) }, 900)
    return () => clearTimeout(t)
  }, [ouvertes, ex.cartes])
  useEffect(() => { if (fini && !verdict) onValider(erreurs <= ex.erreursPermises, { erreurs }) }, [fini]) // eslint-disable-line react-hooks/exhaustive-deps
  const retourner = i => {
    if (verdict || ouvertes.length === 2 || ouvertes.includes(i) || trouvees.includes(ex.cartes[i].paire)) return
    setOuvertes(o => [...o, i])
  }
  const rate = ouvertes.length === 2 && ex.cartes[ouvertes[0]].paire !== ex.cartes[ouvertes[1]].paire
  return (
    <CadreExercice ex={ex} verdict={verdict} grand={grand} sansValider>
      <div className="ex-memo-grille">
        {ex.cartes.map((c, i) => {
          const trouvee = trouvees.includes(c.paire)
          const visible = trouvee || ouvertes.includes(i)
          return (
            <button key={i} type="button" className={`ex-memo${visible ? ' is-visible' : ''}${trouvee ? ' is-trouvee' : ''}${rate && ouvertes.includes(i) ? ' is-rate' : ''} ex-memo--${c.cote}`}
              disabled={!!verdict || trouvee} onClick={() => retourner(i)}
              aria-label={visible ? c.texte : `Carte ${i + 1}, face cachée`}>
              {visible ? (
                <>
                  {trouvee && <span className="ex-paire-num" aria-hidden="true">{trouvees.indexOf(c.paire) + 1}</span>}
                  <span className="ex-memo-txt">{nbsp(c.texte)}</span>
                </>
              ) : <span className="ex-memo-dos" aria-hidden="true">?</span>}
            </button>
          )
        })}
      </div>
      {!verdict && <p className="ex-aide" aria-live="polite">{trouvees.length} paire{trouvees.length > 1 ? 's' : ''} sur 3{erreurs ? ` · ${erreurs} erreur${erreurs > 1 ? 's' : ''}` : ''}</p>}
    </CadreExercice>
  )
}

// ── Classement : quatre cartes, à glisser vers l'une des deux branches ──

export function Classement({ ex, verdict, onValider, grand }) {
  const [rangees, setRangees] = useState([]) // pour chaque carte rangée : 0 (gauche) ou 1 (droite)
  const [part, setPart] = useState(null) // la carte qui s'envole : { cote, juste }
  const k = rangees.length
  const carte = ex.cartes[k]
  const ranger = cote => {
    if (verdict || part || !carte) return
    const dossier = cote === 'gauche' ? 0 : 1
    setPart({ cote, juste: dossier === carte.dossier })
    // Une seule carte en vol à la fois : `rangees` est à jour quand elle se pose.
    setTimeout(() => {
      const suite = [...rangees, dossier]
      setPart(null)
      setRangees(suite)
      if (suite.length === ex.cartes.length) {
        const fautes = suite.filter((d, i) => d !== ex.cartes[i].dossier).length
        onValider(fautes === 0, { erreurs: fautes })
      }
    }, 320)
  }
  const { dx, poignees } = useGlisser(ranger, !verdict && !part && !!carte)
  const colonne = d => (
    <div className={`ex-cl-col ex-cl-col--${d ? 'droite' : 'gauche'}`}>
      <span className="ex-cl-nom">{nbsp(ex.dossiers[d])}</span>
      <ul className="ex-cl-rangees" aria-label={`Rangées dans ${ex.dossiers[d]}`}>
        {rangees.map((r, i) => (r === d ? (
          <li key={i} className={ex.cartes[i].dossier === d ? 'is-juste' : 'is-faux'}>{nbsp(ex.cartes[i].texte)}</li>
        ) : null))}
      </ul>
    </div>
  )
  return (
    <CadreExercice ex={ex} verdict={verdict} grand={grand} sansValider>
      <div className="ex-cl">
        <div className="ex-cl-cols">{colonne(0)}{colonne(1)}</div>
        {carte && (
          <div className="ex-cl-pile">
            <span className="ex-cl-compte">Carte {k + 1} sur {ex.cartes.length}</span>
            <div className={`ex-cl-carte${part ? ` is-part is-part--${part.cote} is-${part.juste ? 'juste' : 'faux'}` : ''}`}
              style={dx && !part ? { transform: `translateX(${dx}px) rotate(${dx / 14}deg)` } : undefined} {...poignees}>
              {nbsp(carte.texte)}
            </div>
          </div>
        )}
        {carte && (
          <div className="ex-vf-boutons">
            <button type="button" className="ex-vf-btn ex-cl-btn" disabled={!!verdict || !!part} onClick={() => ranger('gauche')}>
              <Fleche vers="gauche" /><span>{nbsp(ex.dossiers[0])}</span>
            </button>
            <button type="button" className="ex-vf-btn ex-cl-btn" disabled={!!verdict || !!part} onClick={() => ranger('droite')}>
              <span>{nbsp(ex.dossiers[1])}</span><Fleche vers="droite" />
            </button>
          </div>
        )}
      </div>
    </CadreExercice>
  )
}

export const FORMATS = {
  coins: Coins, intrus: Intrus, indices: Indices, definition: Definition, paires: Paires, ordre: Chronologie, annee: Annee, qcm: Qcm,
  vraifaux: VraiFaux, phrase: Phrase, memory: Memory, classement: Classement,
}
