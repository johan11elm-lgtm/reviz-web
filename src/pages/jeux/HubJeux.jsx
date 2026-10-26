import { useEffect, useMemo, useState } from 'react';
import { etatPourLeJour } from '../../services/partieDuJourService';
import { jourParis } from '../../services/retourService';
import './HubJeux.css';

/**
 * L'écran des Réviz Games (23/10) : la partie du jour en grand (gratuite pour toujours, elle porte la
 * série et le record), la Partie rapide, puis les 6 jeux en vignettes illustrées (Réviz en costume
 * dans chaque monde, images générées : refonte-2026-11/games-mondes/hub/).
 *
 * jour : { jour, faite, score, serie, record } (services/partieDuJourService) ; onJouer(cle) lance
 * 'jour', 'melange' ou un jeu seul.
 */
export const JEUX_HUB = [
  { cle: 'magie', nom: 'Le tour de magie', sous: 'Retrouve les paires, il mélange', tag: 'Mémoire', teinte: '#3B2766' },
  { cle: 'lance', nom: 'Réviz lance', sous: 'Lance la boule dans le bon panier', tag: 'Vise juste', teinte: '#2D5E45' },
  { cle: 'buzzer', nom: 'Réviz se trompe ?', sous: 'Vrai ou faux : buzze ses bêtises', tag: 'Vrai ou faux', teinte: '#8E1F1A' },
  { cle: 'pizzeria', nom: 'La pizzeria !', sous: 'Sers la bonne fraction de pizza', tag: 'Fractions', teinte: '#9A3A12' },
  { cle: 'ninja', nom: 'Le ninja des fautes', sous: 'Tranche les mots mal écrits', tag: 'Orthographe', teinte: '#1B2450' },
  { cle: 'taupe', nom: 'Tape-taupe !', sous: 'Tape les taupes qui suivent la règle', tag: 'Calcul mental', teinte: '#3F6B1F' },
];

const Flamme = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="#FF8A3D" aria-hidden="true">
    <path d="M12 2c1 3.5 5 6 5 11a5 5 0 0 1-10 0c0-2.2 1-3.8 2.2-5 .2 1.6 1 2.6 2 3 0-3.3.4-6 .8-9z" />
  </svg>
);
const Coupe = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="#FFC24B" aria-hidden="true">
    <path d="M7 3h10v2h3v3a4 4 0 0 1-4 4h-.3A5 5 0 0 1 13 14.9V17h3v2H8v-2h3v-2.1A5 5 0 0 1 8.3 12H8a4 4 0 0 1-4-4V5h3zm-1 4v1a2 2 0 0 0 1.1 1.8A5 5 0 0 1 7 9V7zm11 0v2a5 5 0 0 1-.1.8A2 2 0 0 0 18 8V7z" />
  </svg>
);
const Fleche = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

const nombre = n => n.toLocaleString('fr-FR');
const dateDuJour = () => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' }).format(new Date());

export function HubJeux({ jour: jourRecu, onJouer, onFermer, isDesktop, boutonSon }) {
  // Un hub resté ouvert après minuit ne garde pas « Faite ! » : au retour au premier plan on recalcule le jour.
  const [aujourdhui, setAujourdhui] = useState(() => jourParis());
  useEffect(() => {
    const maj = () => { if (document.visibilityState === 'visible') setAujourdhui(jourParis()); };
    document.addEventListener('visibilitychange', maj);
    return () => document.removeEventListener('visibilitychange', maj);
  }, []);
  // Le plus récent des deux jours : un état reçu déjà calculé pour le lendemain n'est pas ramené à la veille.
  const jour = useMemo(() => etatPourLeJour(jourRecu, jourRecu?.jour > aujourdhui ? jourRecu.jour : aujourdhui), [jourRecu, aujourdhui]);
  const { faite, score, serie, record } = jour;
  return (
    <div className={`app app--no-halo hb-page${isDesktop ? ' hb-page--large' : ''}`}>
      <span className="hb-grain" aria-hidden="true" />
      <div className="hb-ecran">
        <header className="hb-haut">
          <button type="button" className="hb-rond" onClick={onFermer} aria-label="Fermer">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
          <div className="hb-titres">
            <span className="hb-surtitre">Réviz Games</span>
            <h1 className="hb-titre">On joue&nbsp;?</h1>
          </div>
          {boutonSon}
        </header>

        {/* La partie du jour : la même pour tout le monde aujourd'hui. */}
        <section className={`hb-jour${faite ? ' hb-jour--faite' : ''}`} aria-labelledby="hb-jour-titre">
          <img className="hb-jour-image" src="/jeux/hub/partie-du-jour.webp" alt="" />
          <span className="hb-jour-voile" aria-hidden="true" />
          <div className="hb-jour-pastilles">
            <span className="hb-pastille" aria-label={serie ? `Série : ${serie} jour${serie > 1 ? 's' : ''} de suite` : 'Pas encore de série'}>
              <Flamme />{serie ? `${serie} jour${serie > 1 ? 's' : ''} de suite` : 'Lance ta série'}
            </span>
            {record > 0 && <span className="hb-pastille" aria-label={`Record : ${nombre(record)}`}><Coupe />{nombre(record)}</span>}
          </div>
          <div className="hb-jour-bas">
            <span className="hb-jour-date">{dateDuJour()}</span>
            <h2 id="hb-jour-titre" className="hb-jour-titre">La partie du jour</h2>
            <p className="hb-jour-sous">
              {faite
                ? (score != null
                  ? <>Ton score&nbsp;: <b>{nombre(score)}</b>. Reviens demain pour ta série&nbsp;!</>
                  : 'Partie du jour faite. Reviens demain pour ta série\u00a0!')
                : 'Les 6 jeux, la même partie pour tout le monde aujourd’hui.'}
            </p>
            {/* Une seule fois par jour : faite, elle laisse la place à une Partie rapide. */}
            <button type="button" className={`hb-jouer${faite ? ' hb-jouer--doux' : ''}`} onClick={() => onJouer(faite ? 'melange' : 'jour')}>
              {faite ? 'Partie rapide' : 'Jouer'}<Fleche />
            </button>
          </div>
        </section>

        <button type="button" className="hb-rapide" onClick={() => onJouer('melange')}>
          <span className="hb-rapide-pile" aria-hidden="true">
            {['ninja', 'pizzeria', 'magie'].map(c => <img key={c} src={`/jeux/hub/${c}.webp`} alt="" />)}
          </span>
          <span className="hb-rapide-txt"><b>Partie rapide</b><span>Les 6 jeux au hasard, autant que tu veux</span></span>
          <span className="hb-rapide-go" aria-hidden="true"><Fleche /></span>
        </button>

        <h2 className="hb-section">Les jeux</h2>
        <ul className="hb-grille">
          {JEUX_HUB.map(j => (
            <li key={j.cle}>
              <button type="button" className="hb-jeu" style={{ '--teinte': j.teinte }} onClick={() => onJouer(j.cle)}>
                <span className="hb-jeu-image"><img src={`/jeux/hub/${j.cle}.webp`} alt="" loading="lazy" /></span>
                <span className="hb-jeu-tag">{j.tag}</span>
                <span className="hb-jeu-txt">
                  <b className="hb-jeu-nom">{j.nom}</b>
                  <span className="hb-jeu-sous">{j.sous}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="hb-pied">3 tours par jeu, de 15 secondes, de plus en plus rapides.</p>
      </div>
    </div>
  );
}
