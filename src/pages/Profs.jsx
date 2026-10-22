import { Link, useSearchParams } from 'react-router-dom';
import { Mascot } from '../components/Mascot';
import { Pantin } from '../components/Pantin';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { TEINTES, varsTeinte } from '../utils/teinteMatiere';
import { AVIS_PROFS_URL, CLASSES_DECOUVERTE, SOURCES_PROFS } from '../services/decouverteService';
import '../components/reviz/HerosMatiere.css';
import './Profs.css';

// Pastels des classes, dans l'ordre 6e, 5e, 4e, 3e.
const TEINTES_CLASSES = ['lavande', 'peche', 'rose', 'menthe'];

/**
 * Page d'arrivée du QR code de l'affiche « salle des profs » (handoff Claude Design du 22/10) :
 * la plupart des enseignants n'ont jamais ouvert l'app, on leur propose donc de la découvrir
 * (une classe, en mode essai, comme un élève) ou de donner directement leur avis.
 * Publique, sans Firebase côté client ni barre de navigation de l'app.
 */
export default function Profs() {
  const isDesktop = useIsDesktop();
  // Provenance du QR (affiche de la salle des profs, demi-page du CDI…) : on la
  // transmet au formulaire d'avis pour savoir d'où viennent les retours.
  const [params] = useSearchParams();
  const src = params.get('src');
  const avisUrl = SOURCES_PROFS.includes(src) ? `/avis?src=${src}` : AVIS_PROFS_URL;

  const sousTitre = (
    <p className="pr-sous">
      Le programme du collège, chapitre par chapitre : flashcards, quiz, résumés et cartes mentales.
    </p>
  );
  const reviz = <Pantin expression="content" entree="coucou" size={isDesktop ? 400 : 160} repli={null} className="pr-reviz" />;

  const racine = `app app--no-halo ch-page pr-page${isDesktop ? ' app--large ch-page--large pr-page--large' : ''}`;
  return (
    <div className={racine} style={varsTeinte(TEINTES.lavande)}>
      <div className="content pr-defile">
        <header className="ch-hero pr-hero">
          <span className="ch-grain" aria-hidden="true" />
          <span className="pr-deco pr-deco--a" aria-hidden="true" />
          <span className="pr-point" aria-hidden="true" />
          <Link to="/" className="pr-logo" aria-label="Réviz, accueil">Réviz</Link>
          <div className="pr-hero-corps">
            <div className="pr-hero-textes">
              <span className="pr-sur">Pour les enseignants</span>
              <h1 className="pr-titre">Réviz, pour vos élèves</h1>
              {isDesktop ? sousTitre : <div className="pr-hero-rangee">{sousTitre}{reviz}</div>}
            </div>
            {isDesktop && reviz}
          </div>
        </header>

        <main className="pr-colonne">
          <section className="pr-carte" aria-labelledby="pr-decouvrir">
            <span className="pr-icone pr-icone--peche" aria-hidden="true">
              <Mascot pose="reading" size={isDesktop ? 56 : 52} alt="" aria-hidden="true" />
            </span>
            <h2 id="pr-decouvrir" className="pr-carte-titre">Découvrir l'appli</h2>
            <p className="pr-carte-texte">
              Choisissez une classe : vous voyez ses chapitres comme un élève, sans créer de compte.
            </p>
            <div className="pr-classes pr-action">
              {CLASSES_DECOUVERTE.map((c, i) => {
                const nom = c.replace('ème', 'e');
                return (
                  <Link
                    key={c}
                    to={`/essai?prof=1&classe=${encodeURIComponent(c)}`}
                    className={`pr-classe pr-classe--${TEINTES_CLASSES[i % TEINTES_CLASSES.length]}`}
                  >
                    {nom}
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="pr-carte" aria-labelledby="pr-avis">
            <span className="pr-icone pr-icone--lavande" aria-hidden="true">
              <Mascot pose="writing" size={isDesktop ? 56 : 52} alt="" aria-hidden="true" />
            </span>
            <h2 id="pr-avis" className="pr-carte-titre">Donner mon avis</h2>
            <p className="pr-carte-texte">
              Une erreur repérée, une idée, une réserve : deux minutes suffisent.
            </p>
            <Link to={avisUrl} className="pr-btn pr-action" aria-label="Donner mon avis : ouvrir le formulaire">Ouvrir le formulaire</Link>
          </section>

          <p className="pr-note">
            Pendant la découverte, « Donner mon avis » reste à portée de main.
          </p>
        </main>
      </div>
    </div>
  );
}
