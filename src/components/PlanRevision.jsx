import { Mascot } from './Mascot';
import { planRevision, etatPreparation, planOuvert, quandEtape } from '../utils/planRevision';
import './PlanRevision.css';

/**
 * Le plan de révision d'un contrôle (Réviz+) : trois étapes datées, J-5 flashcards, J-3 quiz
 * sur les points ratés, J-1 contrôle blanc, et où en est l'élève (« Prêt », « En bonne voie »,
 * « Pas encore prêt »). Sans Réviz+, seul le plan du premier contrôle noté est ouvert en entier ;
 * pour les suivants, la première étape seulement, et de quoi débloquer le reste.
 */
export function PlanRevision({ controle, agenda, hasRevizPlus, onLancer, onDebloquer, className = '' }) {
  const etapes = planRevision(controle);
  const etat = etatPreparation(controle, etapes);
  const ouvert = planOuvert(controle, agenda, hasRevizPlus);
  return (
    <section className={`pr ${className}`} aria-label={`Plan de révision : ${etat.label}`}>
      <div className="pr-tete">
        <span className="pr-titre">Ton plan de révision</span>
        <span className={`pr-etat pr-etat--${etat.id}`}>{etat.label}</span>
      </div>
      <ol className="pr-etapes">
        {etapes.map((e, i) => {
          const ferme = !ouvert && i > 0;
          const aFaire = !ferme && !e.fait && e.etat === 'aujourdhui';
          return (
            <li key={e.id} className={`pr-etape pr-etape--${e.etat}${ferme ? ' pr-etape--ferme' : ''}`}>
              <span className="pr-rond">
                <Mascot pose={e.pose} size={38} alt="" aria-hidden="true" />
                {e.fait && <span className="pr-coche" aria-hidden="true">✓</span>}
              </span>
              <span className="pr-txt">
                <b>{e.quoi}</b>
                <span>{ferme ? `J-${ETAPE_J[e.id]} · avec Réviz+` : `${quandEtape(e)}${e.fait ? '' : ` · ${e.detail}`}`}</span>
              </span>
              {aFaire && <button type="button" className="pr-go" onClick={() => onLancer(e)}>C’est parti</button>}
            </li>
          );
        })}
      </ol>
      {!ouvert && (
        <button type="button" className="pr-debloquer" onClick={onDebloquer}>Débloque ton plan avec Réviz+</button>
      )}
    </section>
  );
}

const ETAPE_J = { flash: 5, quiz: 3, blanc: 1 };
