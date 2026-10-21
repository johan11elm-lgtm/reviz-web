import { Mascot } from '../Mascot';
import './CarteFonction.css';

const Fleche = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

/**
 * Carte d'une fonction de l'app (accueil, Programme…) : pastille mascotte, nom, une ligne,
 * rond orange avec une flèche. Toute la carte est le lien.
 *
 * @param {{ pose: string, fond: string, titre: string, sous: string }} carte
 * @param {boolean} [entree] elle monte en arrivant (accueil, quand Réviz la propose)
 * @param {boolean} [sortie] elle s'efface avant la suivante
 * @param {boolean} [grande] version ordinateur
 */
export function CarteFonction({ carte, onClick, entree = false, sortie = false, grande = false, className = '' }) {
  const classes = ['rv-fonction', entree && 'rv-fonction--entree', entree && !sortie && 'rv-fonction--la', grande && 'rv-fonction--grande', className]
    .filter(Boolean).join(' ');
  return (
    <button type="button" className={classes} onClick={onClick} tabIndex={sortie ? -1 : 0}>
      <span className="rv-fonction-rond" style={{ background: carte.fond }}>
        <Mascot pose={carte.pose} size={grande ? 56 : 46} alt="" aria-hidden="true" />
      </span>
      <span className="rv-fonction-txt">
        <span className="rv-fonction-titre">{carte.titre}</span>
        <span className="rv-fonction-sous">{carte.sous}</span>
      </span>
      <span className="rv-fonction-go" aria-hidden="true"><Fleche /></span>
    </button>
  );
}
