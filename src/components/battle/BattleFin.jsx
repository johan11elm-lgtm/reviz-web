import { useState } from 'react';
import { Link } from 'react-router-dom';
import { couleurDe } from './couleurs';
import { BattleMascot } from '../BattleMascot';
import { BulleReviz } from '../reviz/BulleReviz';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { AURA, joueursDe } from '../../utils/battle';
import { nbsp } from '../../utils/typography';
import { NOMS_FORMATS } from '../../pages/exercices/formats';
import { track } from '../../services/statsService';

// Au moins 3 rounds d'écart : le gagnant fait le 6-7.
const ECART_SIX_SEVEN = 3;
const EN_LETTRES = { 3: 'Trois', 4: 'Quatre', 5: 'Cinq' };
const signe = n => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

/** Le détail de l'aura de la partie d'un joueur : « 3 rounds +60 · 1 erreur −10 · victoire +30 ». */
function detailAura(partie, id) {
  const issues = partie.rounds.map(r => r.issues[id]);
  const gagnes = issues.filter(i => i === 'gagne').length;
  const erreurs = issues.filter(i => i === 'erreur' || i === 'absent').length;
  const parties = [];
  if (gagnes) parties.push(`${pluriel(gagnes, 'round')} ${signe(gagnes * AURA.roundGagne)}`);
  if (erreurs) parties.push(`${pluriel(erreurs, 'erreur')} ${signe(erreurs * AURA.erreur)}`);
  if (partie.bonus?.[id]) parties.push(`${partie.issue === 'egalite' ? 'égalité' : 'victoire'} ${signe(partie.bonus[id])}`);
  return parties.join(' · ') || 'Aucun point cette fois';
}

/**
 * Fin de partie : le résultat vu par ce joueur, le score, l'aura de la partie,
 * la revanche (lancée par l'hôte, rejointe automatiquement) et la correction.
 */
export function BattleFin({ salon, role, uid, partie, exercices, chapitre, onRevanche, onChapitre, revancheEnCours, avecCompte, compte }) {
  const isDesktop = useIsDesktop();
  const [correction, setCorrection] = useState(false);
  const adversaire = role === 'hote' ? salon.invite : salon.hote;
  // Le salon a été abandonné avant l'arrivée d'un adversaire.
  if (!adversaire || !role || role === 'spectateur') return null;
  const moi = role === 'hote' ? salon.hote : salon.invite;
  const [hote, invite] = joueursDe(salon);
  const { issue, vainqueur, scores, aura, rounds } = partie;
  const jeGagne = vainqueur === uid;
  const ecart = Math.abs(scores[hote] - scores[invite]);
  const grosse = issue === 'victoire' && ecart >= ECART_SIX_SEVEN;

  const pose = issue === 'egalite' || !vainqueur ? 'garde' : !jeGagne ? 'gg' : grosse ? 'sixseven' : 'champion';
  const [titre, bulle] = issue === 'forfait'
    ? (jeGagne
      ? ['Victoire', [`${adversaire.prenom} a quitté la partie.`, rounds.length ? 'Victoire par forfait.' : 'La partie n’a pas pu commencer.']]
      : ['Partie quittée', ['Tu as quitté la partie.', 'La revanche ?']])
    : issue === 'egalite' ? ['Égalité', ['Personne ne lâche rien.', 'La revanche ?']]
    : grosse && jeGagne ? ['Grosse victoire', [`${EN_LETTRES[ecart] ?? ecart} rounds d’écart.`, 'Le 6-7 est mérité.']]
    : jeGagne ? ['Victoire', ['Belle battle.', 'Juste et rapide.']]
    : ['GG', [ecart === 1 ? 'À un round près.' : 'Bien joué quand même.', 'La revanche ?']];

  const ligne = j => (
    <li key={j.uid}>
      <span><b>{j.prenom}{j.uid === uid ? ' · toi' : ''}</b><span>{detailAura(partie, j.uid)}</span></span>
      <em className={aura[j.uid] > 0 ? 'is-plus' : aura[j.uid] < 0 ? 'is-moins' : ''}>{signe(aura[j.uid])}</em>
    </li>
  );

  const contenu = (
    <>
      <div className="bt-carte bt-score" aria-label={`Score : ${moi.prenom} ${scores[uid]}, ${adversaire.prenom} ${scores[adversaire.uid]}`}>
        <span className={`bt-score-nom is-${role}`}>{moi.prenom}</span>
        <b>{scores[uid]} – {scores[adversaire.uid]}</b>
        <span className={`bt-score-nom is-${role === 'hote' ? 'invite' : 'hote'}`}>{adversaire.prenom}</span>
      </div>

      <h2 className="bt-h2">Aura de la partie</h2>
      <ul className="bt-carte bt-aura-partie">{ligne(moi)}{ligne(adversaire)}</ul>

      <AuraRangee avecCompte={avecCompte} resultat={compte?.[uid]} aura={aura[uid]} />

      <div className="bt-fin-actions">
        {role === 'hote'
          ? <button type="button" className="bt-btn" onClick={onRevanche} disabled={revancheEnCours}>{revancheEnCours ? 'Création…' : 'Rejouer'}</button>
          : <p className="bt-note bt-note--carte">Si {salon.hote.prenom} relance, tu rejoins la revanche automatiquement.</p>}
        <div className="bt-fin-secondaires">
          <button type="button" className="bt-btn bt-btn--blanc" onClick={onChapitre}>Changer de chapitre</button>
          {rounds.length > 0 && (
            <button type="button" className="bt-btn bt-btn--blanc" aria-expanded={correction} onClick={() => setCorrection(c => !c)}>
              {correction ? 'Masquer la correction' : 'Voir la correction'}
            </button>
          )}
        </div>
      </div>

      {correction && (
        <ol className="bt-carte bt-correction">
          {rounds.map(r => {
            const ex = exercices[r.n - 1];
            const gagnants = [salon.hote, salon.invite].filter(j => r.issues[j.uid] === 'gagne');
            return (
              <li key={r.n}>
                <span className="bt-sur">{r.mortSubite ? 'Mort subite' : `Round ${r.n}`} · {NOMS_FORMATS[ex.type]} · {gagnants.length ? gagnants.map(j => j.prenom).join(' et ') : 'personne'}</span>
                <p className="bt-correction-q">{nbsp(ex.aRetenir.question)}</p>
                <p className="bt-correction-r">{nbsp(ex.aRetenir.bonne)}</p>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );

  const scene = (
    <div className={`bt-fin-scene bt-fin-scene--${role}`}>
      <span className="bt-deco bt-deco--haut" aria-hidden="true" />
      <span className="bt-deco bt-deco--bas" aria-hidden="true" />
      {!isDesktop && (
        <div className="bt-fin-titres">
          <span className="bt-sur">{chapitre.matiere} · {chapitre.titre}</span>
          <h1 className="bt-fin-titre">{titre}</h1>
        </div>
      )}
      <BulleReviz lignes={bulle} pointe={isDesktop ? 'bas' : 'droite'} className="bt-fin-bulle" />
      <BattleMascot pose={pose} couleur={couleurDe(role)} size={isDesktop ? 520 : 210} priority alt="" aria-hidden="true" />
    </div>
  );

  if (isDesktop) {
    return (
      <div className="bt-fin bt-fin--large">
        <div className="bt-fin-colonne">
          <span className="bt-sur">{chapitre.matiere} · {chapitre.titre}</span>
          <h1 className="bt-fin-titre">{titre}</h1>
          {contenu}
        </div>
        {scene}
      </div>
    );
  }
  return <div className="bt-fin">{scene}<div className="bt-fin-contenu">{contenu}</div></div>;
}

/** Ce que le serveur a fait de l'aura de la partie (api/battle-fin.js). */
function AuraRangee({ avecCompte, resultat, aura }) {
  if (!avecCompte || resultat?.sansCompte) {
    return (
      <div className="bt-carte bt-compte">
        <b>{aura > 0 ? `Crée ton compte pour garder tes ${aura} aura` : 'Crée ton compte pour garder ton aura'}</b>
        <p>Sans compte, elle s’efface à la fermeture.</p>
        <Link className="bt-btn bt-btn--encre" to="/inscription" onClick={() => track('battle_compte_propose')}>Créer mon compte</Link>
      </div>
    );
  }
  if (!resultat) return <p className="bt-note" role="status">Enregistrement de ton aura…</p>;
  if (!resultat.comptee) {
    return <p className="bt-carte bt-amicale" role="status"><b>Partie amicale.</b> Tu as atteint la limite du jour : l’aura ne bouge pas pour cette partie.</p>;
  }
  return <p className="bt-note" role="status">Ton aura : <b>{resultat.aura}</b></p>;
}
