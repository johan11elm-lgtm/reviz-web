import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBattle } from '../hooks/useBattle';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { Mascot } from '../components/Mascot';
import { BattleMascot } from '../components/BattleMascot';
import { BattleSalon } from '../components/battle/BattleSalon';
import { BattleJeu, PointsRounds } from '../components/battle/BattleJeu';
import { BattleFin } from '../components/battle/BattleFin';
import { couleurDe } from '../components/battle/couleurs';
import { ChampPrenom } from '../components/battle/ChampPrenom';
import { prenomInvite, retenirPrenomInvite } from '../services/battleConnexion';
import { QUESTIONS_PAR_PARTIE, RETOUR_MS, ROUNDS, nettoyerPrenom, normaliserCode } from '../utils/battle';
import './Battle.css';

export const Croix = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
);

/**
 * Une partie de Battle (/battle/:code) : invitation, salon, rounds, fin.
 * Ouverte à tous : sans compte, l'élève joue en invité avec son prénom.
 * Le composant est remonté à chaque code (revanche) pour repartir à zéro.
 */
export default function Battle() {
  const { code: brut } = useParams();
  const code = normaliserCode(brut);
  return <Partie key={code ?? brut} code={code} />;
}

function Partie({ code }) {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const { currentUser } = useAuth();
  // Compte ou mode essai : le prénom est connu. Sinon, l'invité le donne en rejoignant.
  const prenomConnu = currentUser?.displayName || '';
  const [prenom, setPrenom] = useState(() => prenomConnu || prenomInvite());
  const [revancheEnCours, setRevancheEnCours] = useState(false);
  const [confirmeQuitter, setConfirmeQuitter] = useState(false);
  const versRevanche = useCallback(nouveau => navigate(`/battle/${nouveau}`, { replace: true }), [navigate]);
  const battle = useBattle(code, { prenom, onRevanche: versRevanche });
  const { etat, salon, role, uid, adversaire, phase, partie, maintenant, retourDans, chapitre, mesReponses, erreurAction, actions, avecCompte, compte } = battle;

  const enJeu = phase.type === 'annonce' || phase.type === 'question' || phase.type === 'revelation';
  const joueur = role === 'hote' || role === 'invite';

  async function quitter() {
    if (joueur) await actions.quitter();
    navigate('/', { replace: true });
  }

  async function revanche() {
    setRevancheEnCours(true);
    if (!(await actions.revanche())) setRevancheEnCours(false);
  }

  // Pendant la partie, la croix demande confirmation : partir, c'est perdre par forfait.
  const surCroix = enJeu && joueur ? () => setConfirmeQuitter(true)
    : phase.type === 'salon' && joueur ? quitter
    : () => navigate('/', { replace: true });

  let corps;
  let centre = null;
  let classe = '';
  if (!code || etat === 'introuvable') {
    corps = (
      <EtatVide pose="search" titre="Partie introuvable"
        texte="Le code n’existe pas, la partie a déjà commencé avec quelqu’un d’autre, ou le salon a été fermé."
        action="Entrer un autre code" onAction={() => navigate('/battle', { replace: true })} />
    );
  } else if (etat === 'deconnecte') {
    corps = <EtatVide pose="confused" titre="Connexion impossible" texte="La partie n’a pas pu se connecter. Vérifie ta connexion internet et réessaie." action="Réessayer" onAction={() => navigate(0)} />;
  } else if (etat === 'chapitre') {
    corps = <EtatVide pose="confused" titre="Chapitre indisponible" texte="Les questions de ce chapitre n’ont pas pu être chargées. Vérifie ta connexion." action="Réessayer" onAction={() => navigate(0)} />;
  } else if (etat === 'chargement' || !chapitre || (salon.invite && !chapitre.exercices) || (role !== 'spectateur' && salon.invite && !partie)) {
    corps = <p className="bt-chargement bt-milieu" role="status"><span className="bt-anneau" aria-hidden="true" />Chargement de la partie…</p>;
  } else if (role === 'spectateur') {
    classe = ' bt-page--invitation';
    corps = (
      <div className="bt-invitation">
        <span className="bt-deco bt-deco--invitation" aria-hidden="true" />
        <div className="bt-invitation-haut">
          <div className="bt-bulle-invitation">
            <h1>{salon.hote.prenom} t’invite au salon {code}.</h1>
            <span>{chapitre.matiere} · {chapitre.titre}</span>
          </div>
          <BattleMascot pose="garde" couleur="encre" size={isDesktop ? 220 : 170} priority alt="" aria-hidden="true" />
        </div>
        <form className="bt-carte bt-invitation-carte"
          onSubmit={e => { e.preventDefault(); if (!prenomConnu) retenirPrenomInvite(nettoyerPrenom(prenom)); actions.rejoindre(); }}>
          {prenomConnu
            ? <p className="bt-txt">Tu joues sous le nom de <b>{prenomConnu}</b>. {ROUNDS} rounds, 15 secondes par question.</p>
            : <ChampPrenom valeur={prenom} onChange={setPrenom} />}
          <button type="submit" className="bt-btn" disabled={!nettoyerPrenom(prenom)}>Entrer dans le salon</button>
          {erreurAction && <p className="bt-erreur" role="alert">Impossible de rejoindre : la partie est peut-être déjà complète.</p>}
        </form>
        {!currentUser && <p className="bt-lien-compte">J’ai déjà un compte · <Link to="/connexion">Me connecter</Link></p>}
      </div>
    );
  } else if (phase.type === 'salon') {
    classe = ' bt-page--salon';
    centre = <span className="bt-puce"><i aria-hidden="true" />{chapitre.matiere} · {chapitre.titre}</span>;
    corps = <BattleSalon code={code} salon={salon} role={role} chapitre={chapitre} onLancer={actions.lancer} />;
  } else if (enJeu) {
    classe = ` bt-page--jeu bt-page--${phase.type}`;
    const mortSubite = phase.n === QUESTIONS_PAR_PARTIE;
    centre = phase.type === 'annonce' && phase.n === 1 ? null : (
      <span className="bt-puce bt-puce--round">
        {mortSubite ? <b className="bt-mort-subite">Mort subite</b> : <>Round {phase.n} sur {ROUNDS}</>}
        <PointsRounds salon={salon} partie={partie} phase={phase} />
      </span>
    );
    corps = (
      <BattleJeu
        salon={salon} role={role} uid={uid} phase={phase} partie={partie} maintenant={maintenant}
        exercices={chapitre.exercices} chapitre={chapitre} mesReponses={mesReponses} onRepondre={actions.repondre}
      />
    );
  } else {
    classe = ' bt-page--fin';
    corps = (
      <BattleFin
        salon={salon} role={role} uid={uid} partie={partie} exercices={chapitre.exercices} chapitre={chapitre}
        onRevanche={revanche} revancheEnCours={revancheEnCours}
        onChapitre={() => navigate('/battle', { replace: true })}
        avecCompte={avecCompte} compte={compte}
      />
    );
  }

  const parti = enJeu && joueur && retourDans !== null;
  return (
    <div className={`app app--no-halo bt-page bt-page--partie${isDesktop ? ' app--large bt-page--large' : ''}${role === 'invite' ? ' bt-page--est-invite' : ''}${classe}`}>
      <div className="content bt-defile">
        <div className="bt-barre">
          <button type="button" className="bt-croix" onClick={surCroix} aria-label={enJeu ? 'Quitter la battle' : 'Fermer'}><Croix /></button>
          {centre}
        </div>
        {corps}
      </div>

      {parti && (
        <Feuille>
          <span className="bt-retour-anneau" style={{ '--part': retourDans / RETOUR_MS }} aria-hidden="true">
            <BattleMascot pose="garde" couleur={couleurDe(role === 'hote' ? 'invite' : 'hote')} size={96} alt="" />
          </span>
          <h2 id="bt-feuille-titre">{adversaire.prenom} a quitté la partie</h2>
          <p>Encore <b>{Math.ceil(retourDans / 1000)} s</b> pour revenir. Sinon, tu gagnes par forfait.</p>
          <button type="button" className="bt-btn bt-btn--blanc" onClick={quitter}>Quitter la battle</button>
        </Feuille>
      )}
      {confirmeQuitter && enJeu && !parti && (
        <Feuille onFermer={() => setConfirmeQuitter(false)}>
          <BattleMascot pose="moinsaura" couleur={couleurDe(role)} size={110} alt="" aria-hidden="true" />
          <h2 id="bt-feuille-titre">Quitter la battle ?</h2>
          <p>Si tu pars maintenant, {adversaire?.prenom ?? 'ton adversaire'} gagne par forfait.</p>
          <button type="button" className="bt-btn" onClick={() => setConfirmeQuitter(false)}>Continuer la partie</button>
          <button type="button" className="bt-btn bt-btn--blanc" onClick={quitter}>Quitter</button>
        </Feuille>
      )}
    </div>
  );
}

/** Feuille du bas sur un voile (adversaire parti, confirmation pour quitter). */
function Feuille({ onFermer, children }) {
  return (
    <div className="bt-voile" onClick={onFermer ? e => { if (e.target === e.currentTarget) onFermer(); } : undefined}>
      <div className="bt-feuille" role="dialog" aria-modal="true" aria-labelledby="bt-feuille-titre">
        <span className="bt-feuille-poignee" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}

function EtatVide({ pose, titre, texte, action, onAction }) {
  return (
    <div className="bt-vide bt-milieu">
      <Mascot pose={pose} size={150} alt="" aria-hidden="true" />
      <h1>{titre}</h1>
      <p>{texte}</p>
      <button type="button" className="bt-btn" onClick={onAction}>{action}</button>
    </div>
  );
}
