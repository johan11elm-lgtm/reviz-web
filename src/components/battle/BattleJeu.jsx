import { useEffect } from 'react';
import { BattleJoueur } from './BattleJoueur';
import {
  CHRONO_MS, ROUNDS, QUESTIONS_PAR_PARTIE, formaterAura, formaterTemps, joueursDe,
} from '../../utils/battle';
import { nbsp } from '../../utils/typography';

const LETTRES = ['A', 'B', 'C', 'D'];
const POSE_PAR_ISSUE = { gagne: 'aura', juste: 'garde', erreur: 'moinsaura', absent: 'moinsaura' };

const nomRound = n => (n === QUESTIONS_PAR_PARTIE ? 'Mort subite' : `Round ${n}`);

/**
 * La partie en cours : le score en haut, puis selon la phase le décompte,
 * la question ou la révélation du round.
 */
export function BattleJeu({ salon, role, uid, phase, partie, maintenant, quiz, mesReponses, onRepondre }) {
  const adversaire = role === 'hote' ? salon.invite : salon.hote;
  return (
    <div className="battle-jeu">
      <BattleScore salon={salon} uid={uid} partie={partie} phase={phase} />
      {phase.type === 'annonce' && <Annonce phase={phase} maintenant={maintenant} />}
      {phase.type === 'question' && (
        <Question
          salon={salon} uid={uid} adversaire={adversaire} phase={phase} maintenant={maintenant}
          quiz={quiz} maReponse={mesReponses[phase.n] ?? salon.rounds?.[phase.n]?.reponses?.[uid]?.choix}
          onRepondre={onRepondre}
        />
      )}
      {phase.type === 'revelation' && (
        <Revelation salon={salon} uid={uid} adversaire={adversaire} n={phase.n} partie={partie} quiz={quiz} />
      )}
    </div>
  );
}

function BattleScore({ salon, uid, partie, phase }) {
  const [hote, invite] = joueursDe(salon);
  const nbPoints = partie?.rounds.some(r => r.mortSubite) || phase.n === QUESTIONS_PAR_PARTIE ? QUESTIONS_PAR_PARTIE : ROUNDS;
  const enCours = phase.type === 'question' || phase.type === 'annonce' ? phase.n : null;

  function etatPoint(n) {
    const r = partie?.rounds.find(x => x.n === n);
    if (!r) return n === enCours ? 'encours' : 'avenir';
    const gagnants = [hote, invite].filter(u => r.issues[u] === 'gagne');
    if (gagnants.length === 2) return 'egal';
    if (gagnants[0] === hote) return 'encre';
    if (gagnants[0] === invite) return 'rouge';
    return 'nul';
  }

  const joueur = (j, cle, couleur) => (
    <div className={`battle-score-joueur battle-score-joueur--${couleur}`}>
      <span className="battle-score-nom">{j.prenom}{j.uid === uid && <span className="battle-joueur-moi"> · toi</span>}</span>
      <span className="battle-score-points">{partie?.scores[cle] ?? 0}</span>
      <span className="battle-score-aura">{formaterAura(partie?.aura[cle] ?? 0)}</span>
    </div>
  );

  return (
    <div className="battle-score" role="group" aria-label="Score">
      {joueur(salon.hote, hote, 'encre')}
      <ol className="battle-points" aria-label="Rounds">
        {Array.from({ length: nbPoints }, (_, i) => {
          const etat = etatPoint(i + 1);
          return <li key={i} className={`battle-point battle-point--${etat}`} aria-label={`${nomRound(i + 1)} : ${LIBELLE_POINT[etat]}`} />;
        })}
      </ol>
      {joueur(salon.invite, invite, 'rouge')}
    </div>
  );
}

const LIBELLE_POINT = {
  encre: "gagné par l'hôte", rouge: "gagné par l'invité", egal: 'égalité', nul: 'personne', encours: 'en cours', avenir: 'à venir',
};

function Annonce({ phase, maintenant }) {
  const secondes = phase.depart ? Math.max(1, Math.ceil((phase.depart - maintenant) / 1000)) : null;
  return (
    <div className="battle-annonce" aria-live="polite">
      <span className="battle-annonce-titre">{nomRound(phase.n)}</span>
      {phase.n === 1 && secondes && <span className="battle-annonce-decompte" key={secondes}>{secondes}</span>}
      {phase.n === QUESTIONS_PAR_PARTIE && <span className="battle-annonce-sous">Égalité : une dernière question pour vous départager.</span>}
    </div>
  );
}

function Question({ salon, uid, adversaire, phase, maintenant, quiz, maReponse, onRepondre }) {
  const q = quiz[salon.questions[phase.n - 1]];
  const restant = Math.max(0, phase.fin - maintenant);
  const tempsEcoule = restant === 0;
  const aRepondu = maReponse !== undefined;
  const advARepondu = !!salon.rounds?.[phase.n]?.reponses?.[adversaire.uid];
  const bloque = aRepondu || tempsEcoule;

  // Ordinateur : touches 1 à 4.
  useEffect(() => {
    if (bloque) return;
    const onKey = e => {
      const i = Number(e.key) - 1;
      if (i >= 0 && i < q.choices.length) onRepondre(phase.n, i);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [bloque, q, phase.n, onRepondre]);

  const statut = tempsEcoule && !aRepondu ? 'Temps écoulé'
    : aRepondu ? (advARepondu ? 'Vous avez répondu tous les deux' : `En attente de ${adversaire.prenom}…`)
    : advARepondu ? `${adversaire.prenom} a répondu` : '';

  return (
    <div className="battle-question">
      <div className="battle-chrono" aria-hidden="true">
        <div className="battle-chrono-barre" style={{ transform: `scaleX(${restant / CHRONO_MS})` }} />
      </div>
      <div className="battle-question-meta">
        <span>{nomRound(phase.n)}</span>
        <span>{Math.ceil(restant / 1000)} s</span>
      </div>
      <p className="battle-question-texte">{nbsp(q.question)}</p>
      <div className="battle-choix">
        {q.choices.map((choix, i) => (
          <button
            type="button"
            key={i}
            className={`battle-choix-btn${maReponse === i ? ' battle-choix-btn--choisi' : ''}`}
            onClick={() => onRepondre(phase.n, i)}
            disabled={bloque}
            aria-pressed={aRepondu ? maReponse === i : undefined}
          >
            <span className="battle-choix-lettre">{LETTRES[i]}</span>
            <span className="battle-choix-texte">{nbsp(choix)}</span>
          </button>
        ))}
      </div>
      <p className="battle-statut" aria-live="polite">{statut}</p>
    </div>
  );
}

function Revelation({ salon, uid, adversaire, n, partie, quiz }) {
  const round = partie?.rounds.find(r => r.n === n);
  const q = quiz[salon.questions[n - 1]];
  if (!round) return null;
  const [hote, invite] = joueursDe(salon);
  const deuxGagnants = round.issues[hote] === 'gagne' && round.issues[invite] === 'gagne';
  const titre = deuxGagnants ? 'Égalité parfaite'
    : round.gagnant === uid ? 'Tu gagnes le round'
    : round.gagnant === adversaire.uid ? `${adversaire.prenom} gagne le round`
    : 'Personne ne marque';

  const colonne = (joueur, role) => {
    const issue = round.issues[joueur.uid];
    const reponse = salon.rounds?.[n]?.reponses?.[joueur.uid];
    const detail = issue === 'absent' ? 'Pas de réponse'
      : issue === 'erreur' ? 'Faux'
      : `Juste · ${formaterTemps(reponse.ms)}`;
    const delta = round.aura[joueur.uid];
    return (
      <BattleJoueur joueur={joueur} role={role} moi={joueur.uid === uid} pose={POSE_PAR_ISSUE[issue]} taille={112} glow={issue === 'gagne'}>
        <span className="battle-joueur-detail">{detail}</span>
        <span className={`battle-delta battle-delta--${delta > 0 ? 'plus' : delta < 0 ? 'moins' : 'zero'}`}>{formaterAura(delta)}</span>
      </BattleJoueur>
    );
  };

  return (
    <div className="battle-revelation">
      <h2 className="battle-revelation-titre" aria-live="polite">
        {n === QUESTIONS_PAR_PARTIE && <span className="battle-revelation-sur">Mort subite · </span>}
        {titre}
      </h2>
      <div className="battle-versus battle-versus--revelation">
        {colonne(salon.hote, 'hote')}
        {colonne(salon.invite, 'invite')}
      </div>
      <div className="rv-card rv-card--padded battle-correction">
        <span className="battle-correction-label">Bonne réponse</span>
        <p className="battle-correction-reponse">{LETTRES[q.correct]}. {nbsp(q.choices[q.correct])}</p>
        {q.explanation && <p className="battle-correction-explication">{nbsp(q.explanation)}</p>}
      </div>
    </div>
  );
}
