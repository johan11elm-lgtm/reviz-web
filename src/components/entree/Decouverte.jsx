import { Mascot } from '../Mascot';
import { intituleControle, jourEnClair, joursEntre, jourIso } from '../../utils/agenda';
import { planRevision } from '../../utils/planRevision';

// Les questions de Réviz, partagées par l'entrée sans compte (pages/Commencer.jsx) et la
// découverte après l'inscription (pages/Onboarding.jsx). Modèle : l'onboarding « Knowie » de
// Knowunity (REA-KNOWUNITY-2026-11-11.md, section 9).

export const BLOCAGES = [
  { id: 'quoi', label: 'Savoir quoi réviser', reponse: ['Je te dis quoi faire chaque jour.', 'Une étape à la fois, jusqu’au contrôle.'] },
  { id: 'retenir', label: 'Retenir mes leçons', reponse: ['On mise sur les flashcards et les exercices.', 'C’est ce qui fait retenir, pas la relecture.'] },
  { id: 'comprendre', label: 'Comprendre le cours', reponse: ['Quand tu bloques, Réviz IA t’explique.', 'Pas à pas, sans faire à ta place.'] },
  { id: 'stress', label: 'Le stress des contrôles', reponse: ['On s’entraîne comme le jour J.', 'Le contrôle te semblera familier.'] },
  { id: 'motivation', label: 'M’y mettre', reponse: ['Des séances de 5 minutes.', 'Le plus dur, c’est de commencer : on commence petit.'] },
];

export const OBJECTIFS = [
  { id: 'moyenne', label: 'Avoir la moyenne', niveau: 'Facile', aide: 'Un premier cap, à ta portée.' },
  { id: 'progresser', label: 'Gagner 2 ou 3 points', niveau: 'Faisable', aide: 'Un vrai défi, et réaliste.' },
  { id: 'haut', label: 'Viser 16 et plus', niveau: 'Ambitieux', aide: 'On vise juste et on commence tôt.' },
];

export const minuscule = t => t.charAt(0).toLowerCase() + t.slice(1);

/** « demain », « jeudi 13 novembre » : le jour du contrôle, dit simplement. */
export function quand(date) {
  const n = joursEntre(jourIso(), date);
  return n <= 0 ? 'aujourd’hui' : n === 1 ? 'demain' : jourEnClair(date);
}

/** Une question, une réponse : de grandes cases, comme une conversation. */
export function Choix({ nom, options, valeur, onChange, etiquette = false }) {
  return (
    <div className="onb-choix" role="radiogroup" aria-label={nom}>
      {options.map(o => (
        <button key={o.id} type="button" role="radio" aria-checked={valeur === o.id}
          className={`onb-option${valeur === o.id ? ' is-choisie' : ''}`} onClick={() => onChange(o.id)}>
          <span className="onb-option-texte">{o.label}</span>
          {etiquette && <span className={`onb-option-niveau onb-option-niveau--${o.id}`}>{o.niveau}</span>}
        </button>
      ))}
    </div>
  );
}

/** « C'est prêt » : le plan de départ, une ligne par réponse. `controle` : objet de l'agenda, ou null. */
export function PlanDepart({ controle, blocage, objectif }) {
  const choixBlocage = BLOCAGES.find(b => b.id === blocage);
  const choixObjectif = OBJECTIFS.find(o => o.id === objectif);
  return (
    <ul className="onb-plan" aria-label="Ton plan de départ">
      <li>
        <span className="onb-plan-rond onb-plan-rond--lavande" aria-hidden="true"><Mascot pose="pointing" size={34} alt="" /></span>
        <div>
          <b>{controle ? `${intituleControle(controle)} ${quand(controle.date)}` : 'Pas encore de contrôle noté'}</b>
          <span>{controle ? `Plan de révision en ${planRevision(controle).length} étapes d’ici là.` : 'Note-le dans l’agenda dès que tu le connais : le plan se fait tout seul.'}</span>
        </div>
      </li>
      {choixBlocage && (
        <li>
          <span className="onb-plan-rond onb-plan-rond--peche" aria-hidden="true"><Mascot pose="thinking" size={34} alt="" /></span>
          <div><b>{choixBlocage.label}</b><span>{choixBlocage.reponse[0]}</span></div>
        </li>
      )}
      {choixObjectif && (
        <li>
          <span className="onb-plan-rond onb-plan-rond--menthe" aria-hidden="true"><Mascot pose="celebration" size={34} alt="" /></span>
          <div><b>{choixObjectif.label}</b><span>Objectif {choixObjectif.niveau.toLowerCase()}. On fait le point après chaque séance.</span></div>
        </li>
      )}
    </ul>
  );
}
