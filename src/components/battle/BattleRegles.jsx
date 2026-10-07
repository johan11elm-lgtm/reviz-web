import { UsersIcon, BoltIcon, SparkIcon } from '../Icons';
import { AURA, CHRONO_MS, ROUNDS, formaterAura } from '../../utils/battle';
import { nbsp } from '../../utils/typography';

/** Les règles en trois lignes : salon, annonce, accueil de la Battle. */
export function BattleRegles({ partage = false }) {
  return (
    <ul className="battle-regles">
      {partage && (
        <li><UsersIcon /><span>{nbsp('Partage un code : ton adversaire rejoint la partie.')}</span></li>
      )}
      <li>
        <BoltIcon />
        <span>{nbsp(`${ROUNDS} questions, ${CHRONO_MS / 1000} s chacune. Le plus rapide parmi les bonnes réponses gagne le round.`)}</span>
      </li>
      <li>
        <SparkIcon />
        <span>{nbsp(`Round gagné : ${formaterAura(AURA.roundGagne)}. Erreur : ${formaterAura(AURA.erreur)}. Victoire : ${formaterAura(AURA.victoire)}.`)}</span>
      </li>
    </ul>
  );
}
