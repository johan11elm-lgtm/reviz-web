import { Link, useSearchParams } from 'react-router-dom';
import { Mascot } from '../components/Mascot';
import { BookOpenIcon, ChatIcon } from '../components/Icons';
import { AVIS_PROFS_URL, CLASSES_DECOUVERTE, SOURCES_PROFS } from '../services/decouverteService';
import './Profs.css';

/**
 * Page d'arrivée du QR code de l'affiche « salle des profs » : la plupart
 * des enseignants n'ont jamais ouvert l'app, on leur propose donc de la
 * découvrir (une classe, en mode essai, comme un élève) ou de donner
 * directement leur avis. Publique, sans Firebase côté client.
 */
export default function Profs() {
  // Provenance du QR (affiche de la salle des profs, demi-page du CDI…) : on la
  // transmet au formulaire d'avis pour savoir d'où viennent les retours.
  const [params] = useSearchParams();
  const src = params.get('src');
  const avisUrl = SOURCES_PROFS.includes(src) ? `/avis?src=${src}` : AVIS_PROFS_URL;
  return (
    <div className="app profs-page">
      <nav className="profs-nav" aria-label="Navigation">
        <Link to="/" className="profs-logo" aria-label="Réviz, accueil">
          <Mascot pose="hello" size={28} priority alt="" aria-hidden="true" />
          <span>réviz</span>
        </Link>
      </nav>

      <div className="profs-scroll">
        <main className="profs-main">
          <div className="rv-page-intro profs-intro">
            <div className="rv-page-intro-text">
              <h1 className="rv-greeting-title rv-page-intro-title">Réviz, pour vos élèves</h1>
              <p className="rv-greeting-sub rv-page-intro-sub">
                Le programme du collège, chapitre par chapitre : flashcards, quiz, résumés et cartes mentales.
              </p>
            </div>
            <Mascot pose="reading" size={140} priority className="rv-page-intro-mascot" alt="" aria-hidden="true" />
          </div>

          <div className="profs-choix">
            <section className="rv-card profs-carte" aria-labelledby="profs-decouvrir">
              <span className="rv-icon-square rv-icon-square--xl rv-icon-square--violet" aria-hidden="true"><BookOpenIcon /></span>
              <h2 id="profs-decouvrir" className="profs-carte-titre">Découvrir l'appli</h2>
              <p className="profs-carte-texte">
                Choisissez une classe : vous voyez ses chapitres comme un élève, sans créer de compte.
              </p>
              <div className="profs-classes">
                {CLASSES_DECOUVERTE.map(c => (
                  <Link
                    key={c}
                    to={`/essai?prof=1&classe=${encodeURIComponent(c)}`}
                    className="profs-classe"
                  >
                    {c.replace('ème', 'e')}
                  </Link>
                ))}
              </div>
            </section>

            <Link to={avisUrl} className="rv-card profs-carte profs-carte--lien">
              <span className="rv-icon-square rv-icon-square--xl rv-icon-square--green" aria-hidden="true"><ChatIcon /></span>
              <span className="profs-carte-titre">Donner mon avis</span>
              <span className="profs-carte-texte">
                Une erreur repérée, une idée, une réserve : deux minutes suffisent.
              </span>
              <span className="profs-carte-cta">Ouvrir le formulaire <span aria-hidden="true">→</span></span>
            </Link>
          </div>

          <p className="profs-note">
            Pendant la découverte, « Donner mon avis » reste à portée de main.
          </p>
        </main>
      </div>
    </div>
  );
}
