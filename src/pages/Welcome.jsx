import { Link, Navigate } from 'react-router-dom';
import { BoutonInstaller } from '../components/InstallerApp';
import { EntreeEcran, LienTexte } from '../components/entree/Entree';
import { readGuest } from '../services/guestService';
import { readSessionCache } from '../services/sessionCache';
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
      <Link to="/inscription" className="en-btn">Commencer gratuitement</Link>
      <Link to="/essai" className="en-btn-second">Essayer sans compte</Link>
    </EntreeEcran>
  );
}
