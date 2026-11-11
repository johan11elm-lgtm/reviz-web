import { Link, Navigate } from 'react-router-dom';
import { BoutonInstaller } from '../components/InstallerApp';
import { EntreeEcran, LienTexte } from '../components/entree/Entree';
import { readGuest } from '../services/guestService';
import { readSessionCache } from '../services/sessionCache';
import { codeParrainEnAttente } from '../utils/parrainage';
import { codeCadeauEnAttente } from '../utils/cadeau';
import { PARRAINAGE_JOURS } from '../../api/_parrainage.js';
import './Welcome.entree.css';

// Bienvenue (handoff Claude Design du 22/10) : un écran court, plus une page vitrine.
// La présentation détaillée vit sur la landing (revizapp.fr).
export default function Welcome() {
  // Essai déjà commencé sur cet appareil (sans compte connecté) : on le reprend, au lieu de proposer
  // un nouvel essai qui repartirait de zéro (retour depuis Connexion, retour du téléphone…).
  if (readGuest() && !readSessionCache()) return <Navigate to="/" replace />;
  return (
    <EntreeEcran
      bulle={['Révise mieux.', 'Retiens plus.']}
      expression="content" geste="coucou" taille="grand" logo
      dessous={(
        <>
          <LienTexte to="/connexion">J’ai déjà un compte</LienTexte>
          <p className="en-mention">Gratuit pour commencer, sans carte bancaire.</p>
          <BoutonInstaller className="wlc-installer">Installer l’app sur ton appareil</BoutonInstaller>
          <p className="en-mention wlc-legal">
            <Link to="/legal/mentions-legales">Mentions légales</Link>
            <span aria-hidden="true"> · </span>
            <Link to="/legal/cgu">CGU</Link>
            <span aria-hidden="true"> · </span>
            <Link to="/legal/confidentialite">Confidentialité</Link>
            <span aria-hidden="true"> · </span>
            <Link to="/avis?src=accueil">Donner un avis</Link>
          </p>
        </>
      )}
    >
      <p className="en-texte en-texte--doux">
        Tes leçons deviennent des flashcards, des quiz et des résumés. Et le programme de la 6e à la 3e t’attend déjà.
      </p>
      {/* Arrivé par le lien d'un ami (api/_parrainage.js) : le cadeau l'attend à la création du compte. */}
      {/* Un parent a offert Réviz+ (api/_cadeau.js) : il s'active en créant le compte. */}
      {codeCadeauEnAttente() ? (
        <p className="en-texte wlc-parrain"><b>Un parent t’offre Réviz+</b> : crée ton compte gratuit, il s’active tout seul.</p>
      ) : codeParrainEnAttente() && (
        <p className="en-texte wlc-parrain"><b>Invité par un ami</b> : {PARRAINAGE_JOURS}&nbsp;jours de Réviz+ offerts en créant ton compte.</p>
      )}
      {/* 11/11 : plus d'essai sans compte. Réviz pose ses questions, le compte vient à la fin (pages/Commencer.jsx). */}
      <Link to="/commencer" className="en-btn">Commencer gratuitement</Link>
    </EntreeEcran>
  );
}
