import { BattleMascot } from '../BattleMascot';
import { formaterAura } from '../../utils/battle';

/** Couleur de bandeau d'un joueur : encre pour l'hôte, rouge pour l'invité. */
export const couleurDe = role => (role === 'invite' ? 'rouge' : 'encre');

/**
 * Un joueur de la Battle : sa mascotte (bandeau à sa couleur), son prénom,
 * et éventuellement son aura de la partie.
 * @param {object} props
 * @param {{ prenom: string, present?: boolean }|null} props.joueur — null : place libre
 * @param {'hote'|'invite'} props.role
 * @param {boolean} [props.moi]
 * @param {string} [props.pose='garde']
 * @param {number} [props.taille=96]
 * @param {number} [props.aura]
 * @param {boolean} [props.glow]
 * @param {React.ReactNode} [props.children] — ligne sous le prénom
 */
export function BattleJoueur({ joueur, role, moi = false, pose = 'garde', taille = 96, aura, glow = false, children }) {
  const couleur = couleurDe(role);
  if (!joueur) {
    return (
      <div className={`battle-joueur battle-joueur--${couleur} battle-joueur--libre`}>
        <div className="battle-joueur-place" style={{ width: taille, height: taille }} aria-hidden="true">?</div>
        <span className="battle-joueur-nom">En attente…</span>
      </div>
    );
  }
  return (
    <div className={`battle-joueur battle-joueur--${couleur}${joueur.present === false ? ' battle-joueur--absent' : ''}`}>
      <BattleMascot pose={pose} couleur={couleur} size={taille} glow={glow} glowIntensity={0.7} alt="" aria-hidden="true" />
      <span className="battle-joueur-nom">
        {joueur.prenom}{moi && <span className="battle-joueur-moi"> · toi</span>}
      </span>
      {aura !== undefined && <span className="battle-joueur-aura">{formaterAura(aura)}</span>}
      {children}
    </div>
  );
}
