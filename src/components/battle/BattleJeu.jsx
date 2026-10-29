import { couleurDe } from './couleurs';
import { BattleMascot } from '../BattleMascot';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import {
  CHRONO_MS, QUESTIONS_PAR_PARTIE, REVELATION_MS, ROUNDS, finDuRound, formaterAura, formaterTemps, joueursDe,
} from '../../utils/battle';
import { nbsp } from '../../utils/typography';
import { bonneReponseDuel } from '../../utils/exercicesChapitre';
import { texteDeChoix } from '../../utils/battleJeux';
import { FORMATS, NOMS_FORMATS } from '../../pages/exercices/formats';
// Les mini-jeux gardent leur style des exercices en jeu (cartes, cases, couleurs juste/faux).
import '../../pages/Exercices.css';

const POSE_PAR_ISSUE = { gagne: 'aura', juste: 'garde', erreur: 'moinsaura', absent: 'moinsaura' };
const LIBELLE_POINT = {
  hote: "gagné par l'hôte", invite: "gagné par l'invité", egal: 'égalité', nul: 'personne', encours: 'en cours', avenir: 'à venir',
};
const nomRound = n => (n === QUESTIONS_PAR_PARTIE ? 'Mort subite' : `Round ${n}`);
const roleDe = (salon, id) => (id === salon.hote.uid ? 'hote' : 'invite');

const Coche = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);

/**
 * La partie en cours : selon la phase, le décompte, le mini-jeu du round ou sa révélation.
 * Depuis le 29/10, chaque round est un mini-jeu des exercices en jeu (utils/battleJeux.js).
 */
export function BattleJeu({ salon, role, uid, phase, partie, maintenant, exercices, chapitre, mesReponses, onRepondre }) {
  if (phase.type === 'annonce') return <Annonce salon={salon} phase={phase} maintenant={maintenant} chapitre={chapitre} />;
  if (phase.type === 'question') {
    return (
      <Question
        salon={salon} uid={uid} role={role} phase={phase} maintenant={maintenant} partie={partie} chapitre={chapitre}
        ex={exercices[phase.n - 1]}
        maReponse={mesReponses[phase.n] ?? salon.rounds?.[phase.n]?.reponses?.[uid]?.choix}
        onRepondre={onRepondre}
      />
    );
  }
  return <Revelation salon={salon} uid={uid} role={role} n={phase.n} partie={partie} exercices={exercices} maintenant={maintenant} />;
}

/** Les points de rounds : couleur du gagnant, anneau orange sur le round en cours. */
export function PointsRounds({ salon, partie, phase }) {
  const [hote, invite] = joueursDe(salon);
  const nbPoints = partie?.rounds.some(r => r.mortSubite) || phase.n === QUESTIONS_PAR_PARTIE ? QUESTIONS_PAR_PARTIE : ROUNDS;
  const enCours = phase.type === 'question' || phase.type === 'annonce' || phase.type === 'revelation' ? phase.n : null;
  function etat(n) {
    const r = partie?.rounds.find(x => x.n === n);
    if (!r) return n === enCours ? 'encours' : 'avenir';
    const gagnants = [hote, invite].filter(u => r.issues[u] === 'gagne');
    if (gagnants.length === 2) return 'egal';
    if (gagnants[0] === hote) return 'hote';
    if (gagnants[0] === invite) return 'invite';
    return 'nul';
  }
  return (
    <ol className="bt-points" aria-label="Rounds">
      {Array.from({ length: nbPoints }, (_, i) => {
        const e = etat(i + 1);
        return <li key={i} className={`is-${e}${i + 1 === QUESTIONS_PAR_PARTIE ? ' is-mort' : ''}`} aria-label={`${nomRound(i + 1)} : ${LIBELLE_POINT[e]}`} />;
      })}
    </ol>
  );
}

function Annonce({ salon, phase, maintenant, chapitre }) {
  const isDesktop = useIsDesktop();
  const decompte = phase.n === 1;
  const secondes = phase.depart ? Math.min(3, Math.max(1, Math.ceil((phase.depart - maintenant) / 1000))) : 3;
  const titre = decompte ? 'Prêts ?' : nomRound(phase.n);
  return (
    <div className="bt-annonce" aria-live="polite">
      <span className="bt-sur">{chapitre.matiere} · {chapitre.titre}</span>
      <h1 className="bt-annonce-titre">{titre}</h1>
      {phase.n === QUESTIONS_PAR_PARTIE && <p className="bt-txt">Égalité après {ROUNDS} rounds : ce mini-jeu départage.</p>}
      <span className="bt-annonce-rond" key={decompte ? secondes : phase.n}>{decompte ? secondes : phase.n}</span>
      {decompte && (
        <span className="bt-annonce-progres" aria-hidden="true">
          {[3, 2, 1].map(s => <i key={s} className={s === secondes ? 'is-actif' : ''} />)}
        </span>
      )}
      <div className="bt-annonce-joueurs" aria-hidden="true">
        <span><BattleMascot pose="garde" couleur="encre" size={isDesktop ? 260 : 170} alt="" /><b>{salon.hote.prenom}</b></span>
        <span><BattleMascot pose="garde" couleur="rouge" size={isDesktop ? 260 : 170} alt="" /><b>{salon.invite.prenom}</b></span>
      </div>
    </div>
  );
}

/**
 * Le mini-jeu du round : les deux joueurs, le minuteur, puis le mini-jeu dans son cadre habituel.
 * Une seule réponse : « Valider » (ou le geste du mini-jeu) l'envoie et la verrouille. Le joueur voit
 * tout de suite si c'est juste ; le choix de l'adversaire n'apparaît qu'à la révélation.
 */
function Question({ salon, uid, role, phase, maintenant, partie, chapitre, ex, maReponse, onRepondre }) {
  const isDesktop = useIsDesktop();
  const adversaire = role === 'hote' ? salon.invite : salon.hote;
  const restant = Math.max(0, phase.fin - maintenant);
  const tempsEcoule = restant === 0;
  const aRepondu = maReponse !== undefined;
  const advARepondu = !!salon.rounds?.[phase.n]?.reponses?.[adversaire.uid];
  const bloque = aRepondu || tempsEcoule;
  const mortSubite = phase.n === QUESTIONS_PAR_PARTIE;
  const egalite = partie?.scores?.[salon.hote.uid] ?? 0;
  const verdict = aRepondu ? (maReponse === bonneReponseDuel(ex) ? 'juste' : 'faux') : tempsEcoule ? 'faux' : null;
  const Format = FORMATS[ex.type];

  const etatAdv = advARepondu ? `${adversaire.prenom} a répondu` : `En attente de ${adversaire.prenom}…`;
  const etatDe = j => (j.uid === uid
    ? (aRepondu ? 'Réponse envoyée' : tempsEcoule ? 'Temps écoulé' : 'À toi de jouer')
    : (advARepondu ? `${j.prenom} a répondu` : 'Réfléchit…'));

  const panneau = j => {
    const r = roleDe(salon, j.uid);
    const moi = j.uid === uid;
    const etat = etatDe(j);
    return (
      <div className={`bt-panneau bt-panneau--${r}`}>
        <BattleMascot pose="garde" couleur={couleurDe(r)} size={200} alt="" aria-hidden="true" />
        <b>{j.prenom}</b>
        <span className="bt-panneau-role">{moi ? 'Toi' : 'Adversaire'}</span>
        <span className="bt-pastille-aura">{formaterAura(partie?.aura?.[j.uid] ?? 0)}</span>
        <span className={`bt-panneau-etat${!moi && advARepondu ? ' is-repondu' : ''}`} aria-live={moi ? undefined : 'polite'}>{etat}</span>
      </div>
    );
  };
  const puce = j => {
    const r = roleDe(salon, j.uid);
    return (
      <span className={`bt-puce-joueur bt-puce-joueur--${r}`}>
        <BattleMascot pose="garde" couleur={couleurDe(r)} size={44} alt="" aria-hidden="true" />
        <span><b>{j.prenom}{j.uid === uid && <span className="bt-cache"> (toi)</span>}</b>{formaterAura(partie?.aura?.[j.uid] ?? 0)}</span>
      </span>
    );
  };

  const jeu = (
    <>
      {mortSubite && <p className="bt-txt bt-mort-texte">{egalite} – {egalite} après {ROUNDS} rounds. Ce mini-jeu départage.</p>}
      <div className={`bt-duel-tete${mortSubite ? ' is-mort' : ''}`}>
        <span className="bt-sur">{NOMS_FORMATS[ex.type]} · {mortSubite ? 'Mort subite' : `Mini-jeu ${phase.n}`}{isDesktop ? ` · ${chapitre.titre}` : ''}</span>
        <div className="bt-minuteur" aria-hidden="true">
          <span className="bt-minuteur-piste"><i style={{ width: `${(restant / CHRONO_MS) * 100}%` }} /></span>
          <b>{Math.ceil(restant / 1000)} s</b>
        </div>
      </div>
      <span className="bt-cache" role="timer">{Math.ceil(restant / 1000)} secondes</span>
      <div className={`ex-page bt-duel${aRepondu ? ' is-repondu' : ''}`}>
        <Format
          key={ex.id} ex={ex} verdict={verdict} grand={isDesktop}
          onValider={(_, d) => { if (!bloque && Number.isInteger(d?.choix)) onRepondre(phase.n, d.choix); }}
        />
      </div>
    </>
  );

  if (isDesktop) {
    return (
      <div className="bt-jeu bt-jeu--large">
        {panneau(salon.hote)}
        <div className="bt-jeu-centre">
          {jeu}
          <p className="bt-note" aria-live="polite">{aRepondu ? etatAdv : tempsEcoule ? 'Temps écoulé' : 'Une seule réponse : le plus rapide des deux qui a juste gagne le round.'}</p>
        </div>
        {panneau(salon.invite)}
      </div>
    );
  }
  return (
    <div className="bt-jeu">
      <div className="bt-puces">{puce(salon.hote)}{puce(salon.invite)}</div>
      {jeu}
      <div className="bt-jeu-pied" aria-live="polite">
        {aRepondu || advARepondu ? (
          <div className="bt-carte bt-attente">
            <BattleMascot pose="garde" couleur={couleurDe(role === 'hote' ? 'invite' : 'hote')} size={40} alt="" aria-hidden="true" />
            <b>{etatAdv}</b>
            {!advARepondu && <span className="bt-points-attente" aria-hidden="true"><i /><i /><i /></span>}
          </div>
        ) : <p className="bt-note">{tempsEcoule ? 'Temps écoulé' : 'Une seule réponse : le plus rapide des deux qui a juste gagne.'}</p>}
      </div>
    </div>
  );
}

function Revelation({ salon, uid, role, n, partie, exercices, maintenant }) {
  const isDesktop = useIsDesktop();
  const round = partie?.rounds.find(r => r.n === n);
  const ex = exercices[n - 1];
  if (!round) return null;
  const joueurs = joueursDe(salon);
  const adversaire = role === 'hote' ? salon.invite : salon.hote;
  const reponses = salon.rounds?.[n]?.reponses ?? {};
  const deuxGagnants = joueurs.every(j => round.issues[j] === 'gagne');
  const titre = deuxGagnants ? 'Égalité parfaite'
    : round.gagnant === uid ? 'Tu gagnes le round'
    : round.gagnant === adversaire.uid ? `${adversaire.prenom} gagne le round`
    : 'Personne ne marque';
  const finRevelation = finDuRound(salon.rounds?.[n], joueurs) + REVELATION_MS;
  const secondes = Math.max(1, Math.ceil((finRevelation - maintenant) / 1000));
  const dernier = partie.terminee && n === partie.rounds.at(-1)?.n;
  const gagnant = round.gagnant ? (round.gagnant === salon.hote.uid ? salon.hote : salon.invite) : null;

  const detail = j => {
    const issue = round.issues[j.uid];
    if (issue === 'absent') return 'Pas de réponse';
    if (issue === 'erreur') return 'Faux';
    const ms = reponses[j.uid]?.ms;
    if (issue === 'juste' && gagnant && ms !== undefined) {
      const ecart = ms - (reponses[gagnant.uid]?.ms ?? ms);
      return `Juste, ${formaterTemps(ecart)} après ${gagnant.uid === uid ? 'toi' : gagnant.prenom}`;
    }
    return ms !== undefined ? `Juste en ${formaterTemps(ms)}` : 'Juste';
  };
  const carte = j => {
    const r = roleDe(salon, j.uid);
    const issue = round.issues[j.uid];
    const delta = round.aura[j.uid];
    return (
      <div className={`bt-rev-joueur bt-rev-joueur--${r}${issue === 'gagne' && !deuxGagnants ? ' is-gagnant' : ''}`}>
        {issue === 'gagne' && !deuxGagnants && <span className="bt-etiquette">Round gagné</span>}
        <BattleMascot pose={POSE_PAR_ISSUE[issue]} couleur={couleurDe(r)} size={isDesktop ? 200 : 118} alt="" aria-hidden="true" />
        <b>{j.prenom}{j.uid === uid && <span className="bt-cache"> (toi)</span>}</b>
        <span className="bt-rev-detail">{detail(j)}</span>
        {texteDeChoix(ex, reponses[j.uid]?.choix) && <span className="bt-rev-reponse">« {nbsp(texteDeChoix(ex, reponses[j.uid]?.choix))} »</span>}
        <span className={`bt-pastille-aura is-${delta > 0 ? 'plus' : delta < 0 ? 'moins' : 'zero'}`}>{formaterAura(delta)}</span>
      </div>
    );
  };
  const bonne = (
    <div className="bt-carte bt-bonne">
      <span className="bt-bonne-coche" aria-hidden="true"><Coche /></span>
      <div>
        <span className="bt-sur bt-sur--vert">{NOMS_FORMATS[ex.type]} · Bonne réponse</span>
        <b>{nbsp(ex.aRetenir.bonne)}</b>
        {ex.explication && <p>{nbsp(ex.explication)}</p>}
      </div>
    </div>
  );
  const suite = <p className="bt-note" aria-live="off">{dernier ? `Résultat dans ${secondes} s` : `Round suivant dans ${secondes} s`}</p>;

  if (isDesktop) {
    return (
      <div className="bt-jeu bt-jeu--large bt-revelation">
        {carte(salon.hote)}
        <div className="bt-jeu-centre">
          <h1 className="bt-rev-titre" aria-live="polite">{titre}</h1>
          {bonne}
          {suite}
        </div>
        {carte(salon.invite)}
      </div>
    );
  }
  return (
    <div className="bt-revelation">
      <span className="bt-sur">{n === QUESTIONS_PAR_PARTIE ? 'Mort subite' : `Round ${n} sur ${ROUNDS}`}</span>
      <h1 className="bt-rev-titre" aria-live="polite">{titre}</h1>
      <div className="bt-rev-duo">{carte(salon.hote)}{carte(salon.invite)}</div>
      {bonne}
      {suite}
    </div>
  );
}
