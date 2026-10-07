import { Link } from 'react-router-dom';
import { BattleJoueur } from './BattleJoueur';
import { joueursDe } from '../../utils/battle';
import { nbsp } from '../../utils/typography';

const LETTRES = ['A', 'B', 'C', 'D'];
// Au moins 3 rounds d'écart : le gagnant fait le 6-7.
const ECART_SIX_SEVEN = 3;

/**
 * Fin de partie : le résultat vu par ce joueur, l'aura de la partie, la
 * correction, et la revanche (lancée par l'hôte, rejointe automatiquement).
 */
export function BattleFin({ salon, role, uid, partie, quiz, onRevanche, onAccueil, revancheEnCours, avecCompte, compte }) {
  const [hote, invite] = joueursDe(salon);
  const adversaire = role === 'hote' ? salon.invite : salon.hote;
  if (!adversaire) {
    // Le salon a été abandonné avant l'arrivée d'un adversaire.
    return null;
  }
  const { issue, vainqueur, scores, aura, rounds } = partie;
  const jeGagne = vainqueur === uid;
  const ecart = Math.abs(scores[hote] - scores[invite]);

  const titre = issue === 'forfait'
    ? (jeGagne ? `${adversaire.prenom} a quitté la partie` : 'Tu as quitté la partie')
    : issue === 'egalite' ? 'Égalité'
    : jeGagne ? 'Tu gagnes la battle' : `${adversaire.prenom} gagne la battle`;
  const sous = issue === 'forfait'
    ? (rounds.length ? 'Victoire par forfait.' : 'La partie n’a pas pu commencer.')
    : `${scores[hote]} – ${scores[invite]}`;

  const pose = cle => {
    if (issue === 'egalite' || !vainqueur) return 'garde';
    if (cle !== vainqueur) return 'gg';
    return issue === 'victoire' && ecart >= ECART_SIX_SEVEN ? 'sixseven' : 'champion';
  };

  return (
    <div className="battle-fin">
      <h2 className="battle-fin-titre">{titre}</h2>
      <p className="battle-fin-sous">{sous}</p>

      <div className="battle-versus battle-versus--fin">
        <BattleJoueur joueur={salon.hote} role="hote" moi={role === 'hote'} pose={pose(hote)} taille={136} aura={aura[hote]} glow={vainqueur === hote} />
        <BattleJoueur joueur={salon.invite} role="invite" moi={role === 'invite'} pose={pose(invite)} taille={136} aura={aura[invite]} glow={vainqueur === invite} />
      </div>

      <AuraRangee avecCompte={avecCompte} resultat={compte?.[uid]} />

      {rounds.length > 0 && (
        <details className="rv-card rv-card--padded battle-fin-correction">
          <summary>Voir la correction</summary>
          <ol>
            {rounds.map(r => {
              const q = quiz[r.question];
              const gagnants = [salon.hote, salon.invite].filter(j => r.issues[j.uid] === 'gagne');
              return (
                <li key={r.n}>
                  <p className="battle-fin-question">{nbsp(q.question)}</p>
                  <p className="battle-fin-reponse">{LETTRES[q.correct]}. {nbsp(q.choices[q.correct])}</p>
                  <p className="battle-fin-gagnant">
                    {r.mortSubite ? 'Mort subite · ' : `Round ${r.n} · `}
                    {gagnants.length ? gagnants.map(j => j.prenom).join(' et ') : 'personne'}
                  </p>
                </li>
              );
            })}
          </ol>
        </details>
      )}

      <div className="battle-actions">
        {role === 'hote' ? (
          <button type="button" className="rv-btn-cta rv-btn-cta--full" onClick={onRevanche} disabled={revancheEnCours}>
            <span>{revancheEnCours ? 'Création…' : 'Revanche'}</span>
            <span className="rv-btn-cta-arrow" aria-hidden="true">→</span>
          </button>
        ) : (
          <p className="battle-aide">Si {salon.hote.prenom} lance une revanche, tu la rejoins automatiquement.</p>
        )}
        <button type="button" className="rv-btn-cta rv-btn-cta--full rv-btn-cta--ghost rv-btn-cta--center" onClick={onAccueil}>
          Retour à l'accueil
        </button>
      </div>
    </div>
  );
}

/** Ce que le serveur a fait de l'aura de la partie (api/battle-fin.js). */
function AuraRangee({ avecCompte, resultat }) {
  if (!avecCompte || resultat?.sansCompte) {
    return (
      <div className="rv-card rv-card--padded battle-fin-compte">
        <p>Sans compte, ton aura n’est pas gardée.</p>
        <Link className="rv-btn-cta rv-btn-cta--full" to="/inscription">
          <span>Créer mon compte gratuit</span>
          <span className="rv-btn-cta-arrow" aria-hidden="true">→</span>
        </Link>
      </div>
    );
  }
  if (!resultat) return <p className="battle-aide" role="status">Enregistrement de ton aura…</p>;
  if (!resultat.comptee) {
    return <p className="battle-aide" role="status">Partie amicale : assez de parties comptées aujourd’hui, ton aura ne bouge pas.</p>;
  }
  return <p className="battle-fin-total" role="status">Ton aura : <strong>{resultat.aura}</strong></p>;
}

