import { Link } from 'react-router-dom';
import { Pantin } from '../components/Pantin';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { TEINTES, varsTeinte } from '../utils/teinteMatiere';
import '../components/reviz/HerosMatiere.css';
import './NotFound.css';

/**
 * Page introuvable (handoff Claude Design du 22/10) : héros lavande avec grain, Réviz inquiet.
 * Téléphone : texte et bouton sous le héros ; ordinateur : tout dans le héros, Réviz à droite.
 */
export default function NotFound() {
  const isDesktop = useIsDesktop();
  const suite = (
    <>
      <p className="nf-texte">Cette page n'existe pas ou a changé d'adresse.</p>
      <Link to="/" className="nf-btn">Retour à l'accueil</Link>
    </>
  );
  const racine = `app app--no-halo ch-page nf-page${isDesktop ? ' app--large ch-page--large nf-page--large' : ''}`;
  return (
    <div className={racine} style={varsTeinte(TEINTES.lavande)}>
      <div className="content nf-defile">
        <header className="ch-hero nf-hero">
          <span className="ch-grain" aria-hidden="true" />
          <span className="nf-deco nf-deco--a" aria-hidden="true" />
          <span className="nf-deco nf-deco--b" aria-hidden="true" />
          <span className="nf-point" aria-hidden="true" />
          <Link to="/" className="nf-logo" aria-label="Réviz, accueil">Réviz</Link>
          <div className="nf-corps">
            <div className="nf-textes">
              <span className="nf-sur">Erreur 404</span>
              <h1 className="nf-titre">Page introuvable</h1>
              {isDesktop && suite}
            </div>
            <Pantin expression="inquiet" size={isDesktop ? 430 : 280} repli={null} className="nf-reviz" />
          </div>
        </header>
        {!isDesktop && <main className="nf-bas">{suite}</main>}
      </div>
    </div>
  );
}
