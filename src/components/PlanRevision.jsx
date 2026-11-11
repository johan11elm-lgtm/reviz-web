import { Mascot } from './Mascot';
import { planRevision, etatPreparation, planOuvert, quandEtape } from '../utils/planRevision';
import { noteEstimee, ecrireNote, objectifDeLaDecouverte, noteDeDepart, objectifNote } from '../utils/noteEstimee';
import { useAuth } from '../context/AuthContext';
import { loadRevisions } from '../services/revisionService';
import { nbsp } from '../utils/typography';
import './PlanRevision.css';

/**
 * Le plan de révision d'un contrôle (Réviz+) : trois étapes datées, J-5 flashcards, J-3 quiz
 * sur les points ratés, J-1 contrôle blanc, et où en est l'élève (« Prêt », « En bonne voie »,
 * « Pas encore prêt »). Sans Réviz+, seul le plan du premier contrôle noté est ouvert en entier ;
 * pour les suivants, la première étape seulement, et de quoi débloquer le reste.
 * Depuis le 11/11, la note estimée d'après les séances (utils/noteEstimee.js), et le chapitre à
 * revoir pour viser plus haut.
 */
export function PlanRevision({ controle, agenda, hasRevizPlus, onLancer, onDebloquer, className = '' }) {
  const etapes = planRevision(controle);
  const etat = etatPreparation(controle, etapes);
  const ouvert = planOuvert(controle, agenda, hasRevizPlus);
  const estimee = noteEstimee(controle, loadRevisions());
  // La note visée de la découverte, en face de la note estimée (11/11).
  const { currentUser } = useAuth() ?? {};
  const objectif = estimee ? objectifNote(objectifDeLaDecouverte(currentUser?.uid), estimee.note, noteDeDepart(controle.id, estimee.note)) : null;
  return (
    <section className={`pr ${className}`} aria-label={`Plan de révision : ${etat.label}`}>
      <div className="pr-tete">
        <span className="pr-titre">Ton plan de révision</span>
        <span className={`pr-etat pr-etat--${etat.id}`}>{etat.label}</span>
      </div>
      {estimee ? (
        <p className="pr-note">
          <span className="pr-note-chiffre"><b>{ecrireNote(estimee.note)}</b>/20</span>
          <span className="pr-note-txt">
            <b>Note estimée</b>
            <span>{nbsp(`D’après ${estimee.seances > 1 ? `tes ${estimee.seances} séances` : 'ta séance'}${estimee.blanc ? ', contrôle blanc compris' : ''}.`)}
              {estimee.conseil && <> {nbsp(`Revois « ${estimee.conseil.titre} » : tu peux viser ${ecrireNote(estimee.conseil.visee)}.`)}</>}</span>
            {objectif && (
              <span className={`pr-objectif${objectif.atteint ? ' is-atteint' : ''}`}>{nbsp(objectif.atteint
                ? `Objectif ${ecrireNote(objectif.cible)}/20 atteint. Garde le rythme.`
                : `Ton objectif : ${ecrireNote(objectif.cible)}/20. Encore ${ecrireNote(objectif.ecart)} point${objectif.ecart > 1 ? 's' : ''}.`)}</span>
            )}
          </span>
        </p>
      ) : (
        <p className="pr-note pr-note--vide">{nbsp('Fais une séance sur ce contrôle : je t’estime ta note.')}</p>
      )}
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
