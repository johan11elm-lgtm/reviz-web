// -------------------------------------------------------
// Réviz — l'XP, le combo et les quêtes à l'écran (29/10)
//   PastilleCombo : ×3 dans la barre du haut d'un quiz, « Combo cassé » sur une erreur.
//   BilanXp       : fin de séance — XP gagnée ligne par ligne, niveau, quêtes à récupérer.
//   BlocQuetes    : accueil — la quête du jour et les trois de la semaine.
// Couleurs de l'app façon Nomad : cartes blanches, turquoise pour l'avancée, orange vif pour la récompense.
// -------------------------------------------------------
import { useEffect, useRef, useState, useCallback } from 'react'
import { loadRevisions } from '../../services/revisionService'
import { lireReclamees, recupererQuete, EVENEMENT_QUETES } from '../../services/quetesService'
import { quetesDuMoment, aRecuperer } from '../../utils/quetes'
import { XP_PAR_NIVEAU } from '../../utils/gamification'
import { BAREME } from '../../utils/xp'
import { jouerSon, rafaleXp } from '../../utils/sons'
import './xp.css'

const Eclair = ({ taille = 14 }) => (
  <svg viewBox="0 0 24 24" width={taille} height={taille} fill="currentColor" aria-hidden="true"><path d="M13.5 2 4 13.5h6.5L9 22l10-12h-6.6z" /></svg>
)
const Coche = ({ taille = 12 }) => (
  <svg viewBox="0 0 24 24" width={taille} height={taille} fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
)

/** Le combo en cours, à côté du score. Rien en dessous de 2. */
export function PastilleCombo({ combo, casse, palier }) {
  if (casse) return <span className="xp-combo xp-combo--casse" role="status">Combo cassé</span>
  if (combo < 2) return null
  return (
    <span key={combo} className={`xp-combo${palier ? ' xp-combo--palier' : ''}`} role="status" aria-label={`Combo : ${combo} bonnes réponses d’affilée`}>
      <Eclair />×{combo}
      {palier && <small>+{BAREME.palierCombo} XP</small>}
    </span>
  )
}

/** Les quêtes du moment, relues quand une récompense est récupérée ou qu'on revient sur l'app. */
export function useQuetes(uid) {
  const lire = useCallback(() => quetesDuMoment(loadRevisions(), lireReclamees(uid)), [uid])
  const [quetes, setQuetes] = useState(lire)
  useEffect(() => {
    const maj = () => setQuetes(lire())
    maj()
    window.addEventListener(EVENEMENT_QUETES, maj)
    document.addEventListener('visibilitychange', maj)
    return () => { window.removeEventListener(EVENEMENT_QUETES, maj); document.removeEventListener('visibilitychange', maj) }
  }, [lire])
  const recuperer = useCallback(async q => {
    const ok = await recupererQuete(uid, q)
    if (ok) jouerSon('quete')
    return ok
  }, [uid])
  return { quetes, recuperer }
}

function LigneQuete({ q, onRecuperer, grande = false }) {
  const [vient, setVient] = useState(false)
  const pct = Math.round((q.progression / q.cible) * 100)
  const recup = async () => { if (await onRecuperer(q)) setVient(true) }
  return (
    <div className={`xp-quete${grande ? ' xp-quete--jour' : ''}${q.faite ? ' is-faite' : ''}${q.recuperee ? ' is-recuperee' : ''}`}>
      <div className="xp-quete-txt">
        <span className="xp-quete-titre">{q.titre}</span>
        <span className="xp-quete-barre" role="progressbar" aria-label={`${q.titre} : ${q.progression} sur ${q.cible}`}
          aria-valuemin={0} aria-valuemax={q.cible} aria-valuenow={q.progression}>
          <i style={{ width: `${Math.max(pct, q.progression ? 6 : 0)}%` }} />
        </span>
        <span className="xp-quete-compte">{q.progression} / {q.cible}</span>
      </div>
      {q.recuperee ? (
        <span className={`xp-recompense is-prise${vient ? ' is-vient' : ''}`}><Coche />{vient ? `+${q.xp} XP` : 'Récupérée'}</span>
      ) : q.faite ? (
        <button type="button" className="xp-recuperer" onClick={recup}>Récupérer +{q.xp} XP</button>
      ) : (
        <span className="xp-recompense">+{q.xp} XP</span>
      )}
    </div>
  )
}

/** Accueil : la quête du jour en grand, puis les trois de la semaine. */
export function BlocQuetes({ uid }) {
  const { quetes, recuperer } = useQuetes(uid)
  const { heures, minutes } = quetes.renouvellement.jour
  const jours = quetes.renouvellement.semaine
  return (
    <section className="xp-quetes" aria-labelledby="xp-quetes-titre">
      <div className="xp-quetes-tete">
        <h2 id="xp-quetes-titre" className="xp-quetes-h2">Tes quêtes</h2>
        <span className="xp-quetes-sous">Des petits objectifs, de l’XP à la clé</span>
      </div>
      <div className="xp-carte xp-carte--jour">
        <div className="xp-carte-tete">
          <span className="xp-surtitre">Quête du jour</span>
          <span className="xp-renouvelle">Nouvelle dans {heures ? `${heures} h ` : ''}{minutes} min</span>
        </div>
        <LigneQuete q={quetes.jour} onRecuperer={recuperer} grande />
      </div>
      <div className="xp-carte">
        <div className="xp-carte-tete">
          <span className="xp-surtitre">Quêtes de la semaine</span>
          <span className="xp-renouvelle">{jours > 1 ? `Nouvelles dans ${jours} j` : 'Nouvelles demain'}</span>
        </div>
        {quetes.semaine.map(q => <LigneQuete key={q.cle} q={q} onRecuperer={recuperer} />)}
      </div>
    </section>
  )
}

/** Fin de séance : ce que la séance a rapporté, le niveau, les quêtes prêtes à récupérer. */
export function BilanXp({ gain, uid }) {
  const { quetes, recuperer } = useQuetes(uid)
  const pretes = aRecuperer(quetes)
  const [prises, setPrises] = useState([])
  const recup = async q => { if (await recuperer(q)) setPrises(p => [...p, q.cle]) }
  // Le son du bilan : la fin de séance, l'XP qui défile quand « +XP » apparaît, puis le niveau s'il monte.
  // Une fois par séance (le mode strict de React rejoue les effets au montage).
  const sonne = useRef(null)
  useEffect(() => {
    if (!gain || sonne.current === gain) return
    sonne.current = gain
    jouerSon('fin')
    rafaleXp(8, 0.065, 0.9)
    if (gain.level > gain.niveauAvant) jouerSon('niveau', { dans: 1.6 })
  }, [gain])
  if (!gain) return null
  const monte = gain.level > gain.niveauAvant
  const visibles = [...pretes, ...[quetes.jour, ...quetes.semaine].filter(q => prises.includes(q.cle) && q.recuperee)]
  return (
    <section className="xp-bilan" aria-label="XP gagnée">
      <div className="xp-bilan-haut">
        <span className="xp-gain"><Eclair taille={18} />+{gain.xp} XP</span>
        {monte && <span className="xp-niveau-monte">Niveau {gain.level} atteint</span>}
      </div>
      {gain.lignes.length > 0 && (
        <ul className="xp-lignes">
          {gain.lignes.map(l => <li key={l.libelle}><span>{l.libelle}</span><b>+{l.xp}</b></li>)}
        </ul>
      )}
      {gain.plafonne && <p className="xp-plafond">Plafond du jour atteint : {gain.xp} XP comptées sur {gain.brut}. Les quêtes rapportent encore.</p>}
      <div className="xp-niveau">
        <span className="xp-niveau-txt"><b>Niveau {gain.level}</b><span>{gain.xpInLvl} / {XP_PAR_NIVEAU} XP</span></span>
        <span className="xp-niveau-barre" aria-hidden="true"><i style={{ width: `${Math.max(gain.fillPct, 2)}%` }} /></span>
      </div>
      {visibles.length > 0 && (
        <div className="xp-pretes">
          {visibles.map(q => (
            <div key={q.cle} className="xp-prete">
              <span className="xp-prete-txt"><span className="xp-surtitre">{q.cle.startsWith('j') ? 'Quête du jour accomplie' : 'Quête de la semaine accomplie'}</span><b>{q.titre}</b></span>
              {q.recuperee
                ? <span className="xp-recompense is-prise is-vient"><Coche />+{q.xp} XP</span>
                : <button type="button" className="xp-recuperer" onClick={() => recup(q)}>Récupérer +{q.xp} XP</button>}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
