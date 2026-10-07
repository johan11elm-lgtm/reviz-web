import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBattle } from '../hooks/useBattle';
import { PageHeader } from '../components/PageHeader';
import { Mascot } from '../components/Mascot';
import { BattleMascot } from '../components/BattleMascot';
import { BattleSalon } from '../components/battle/BattleSalon';
import { BattleRegles } from '../components/battle/BattleRegles';
import { BattleJeu } from '../components/battle/BattleJeu';
import { BattleFin } from '../components/battle/BattleFin';
import { ChampPrenom } from '../components/battle/ChampPrenom';
import { prenomInvite, retenirPrenomInvite } from '../services/battleConnexion';
import { nettoyerPrenom, normaliserCode } from '../utils/battle';
import './Battle.css';

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
  const { currentUser } = useAuth();
  // Compte ou mode essai : le prénom est connu. Sinon, l'invité le donne en rejoignant.
  const prenomConnu = currentUser?.displayName || '';
  const [prenom, setPrenom] = useState(() => prenomConnu || prenomInvite());
  const [revancheEnCours, setRevancheEnCours] = useState(false);
  const versRevanche = useCallback(nouveau => navigate(`/battle/${nouveau}`, { replace: true }), [navigate]);
  const battle = useBattle(code, { prenom, onRevanche: versRevanche });
  const { etat, salon, role, uid, phase, partie, maintenant, chapitre, mesReponses, erreurAction, actions, avecCompte, compte } = battle;

  const enJeu = phase.type === 'annonce' || phase.type === 'question' || phase.type === 'revelation';

  async function quitter() {
    if (role === 'hote' || role === 'invite') await actions.quitter();
    navigate('/', { replace: true });
  }

  async function revanche() {
    setRevancheEnCours(true);
    if (!(await actions.revanche())) setRevancheEnCours(false);
  }

  let corps;
  if (!code || etat === 'introuvable') {
    corps = (
      <EtatVide
        pose="search"
        titre="Partie introuvable"
        texte="Le code n’existe pas, la partie a déjà commencé avec quelqu’un d’autre, ou le salon a été fermé."
        action="Entrer un autre code"
        onAction={() => navigate('/battle', { replace: true })}
      />
    );
  } else if (etat === 'deconnecte') {
    corps = <EtatVide pose="confused" titre="Connexion impossible" texte="La partie n’a pas pu se connecter. Vérifie ta connexion internet et réessaie." action="Réessayer" onAction={() => navigate(0)} />;
  } else if (etat === 'chapitre') {
    corps = <EtatVide pose="confused" titre="Chapitre indisponible" texte="Les questions de ce chapitre n’ont pas pu être chargées. Vérifie ta connexion." action="Réessayer" onAction={() => navigate(0)} />;
  } else if (etat === 'chargement' || !chapitre || (role !== 'spectateur' && salon.invite && !partie)) {
    corps = <div className="battle-chargement" role="status"><span className="battle-spinner" aria-hidden="true" />Chargement de la partie…</div>;
  } else if (role === 'spectateur') {
    corps = (
      <div className="battle-invitation">
        <BattleMascot pose="garde" couleur="encre" size={180} priority alt="" aria-hidden="true" />
        <h2 className="battle-invitation-titre">{salon.hote.prenom} te défie</h2>
        <p className="battle-invitation-chapitre">{chapitre.titre} · {chapitre.matiere}</p>
        <BattleRegles />
        <div className="battle-actions">
          {!prenomConnu && <ChampPrenom valeur={prenom} onChange={setPrenom} />}
          <button
            type="button"
            className="rv-btn-cta rv-btn-cta--full"
            disabled={!nettoyerPrenom(prenom)}
            onClick={() => { if (!prenomConnu) retenirPrenomInvite(nettoyerPrenom(prenom)); actions.rejoindre(); }}
          >
            <span>Rejoindre la battle</span>
            <span className="rv-btn-cta-arrow" aria-hidden="true">→</span>
          </button>
          {erreurAction && <p className="battle-erreur" role="alert">Impossible de rejoindre : la partie est peut-être déjà complète.</p>}
        </div>
      </div>
    );
  } else if (phase.type === 'salon') {
    corps = <BattleSalon code={code} salon={salon} role={role} chapitre={chapitre} onLancer={actions.lancer} onQuitter={quitter} />;
  } else if (enJeu) {
    corps = (
      <BattleJeu
        salon={salon} role={role} uid={uid} phase={phase} partie={partie} maintenant={maintenant}
        quiz={chapitre.quiz} mesReponses={mesReponses} onRepondre={actions.repondre}
      />
    );
  } else {
    corps = (
      <BattleFin
        salon={salon} role={role} uid={uid} partie={partie} quiz={chapitre.quiz}
        onRevanche={revanche} revancheEnCours={revancheEnCours} onAccueil={() => navigate('/', { replace: true })}
        avecCompte={avecCompte} compte={compte}
      />
    );
  }

  return (
    <div className={`app battle-page${enJeu ? ' battle-page--jeu' : ''}`}>
      <PageHeader
        variant="back"
        title={chapitre && !enJeu ? 'Battle' : undefined}
        sub={chapitre && !enJeu ? chapitre.titre : undefined}
        onBack={enJeu ? quitter : () => (phase.type === 'salon' ? quitter() : navigate('/', { replace: true }))}
      />
      <div className="content battle-content">{corps}</div>
    </div>
  );
}

function EtatVide({ pose, titre, texte, action, onAction }) {
  return (
    <div className="rv-empty-state battle-vide">
      <Mascot pose={pose} size={140} className="rv-empty-state-mascot" alt="" aria-hidden="true" />
      <h2 className="rv-empty-state-title">{titre}</h2>
      <p className="rv-empty-state-sub">{texte}</p>
      <button type="button" className="rv-btn-cta" onClick={onAction}>{action}</button>
    </div>
  );
}
