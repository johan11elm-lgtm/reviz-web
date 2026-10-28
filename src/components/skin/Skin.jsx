import { Link } from 'react-router-dom';
import './Skin.css';

/*
 * Briques du skin de l'app (28/10, d'après la landing refaite façon Nomad) : le logo
 * autocollant, les blocs de couleur arrondis, les titres à deux graisses et le bouton
 * pilule à pastille fléchée. Les écrans les composent ; la logique des pages ne change pas.
 */

/** Contour blanc arrondi de `r` px autour du mot : des ombres sans flou tout autour. */
function contour(r) {
  const ombres = [];
  for (const rayon of [r, r * 0.6]) {
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      ombres.push(`${(rayon * Math.cos(a)).toFixed(2)}px ${(rayon * Math.sin(a)).toFixed(2)}px 0 #fff`);
    }
  }
  return ombres.join(', ');
}
const CONTOUR = contour(4);

/** Le logo en autocollant : « réviz » en encre et la pastille à tête de Réviz, cernés de blanc. */
export function LogoReviz({ className = '' }) {
  return (
    <span className={`sk-logo ${className}`}>
      <span className="sk-logo-mot" style={{ textShadow: CONTOUR }}>réviz</span>
      <img className="sk-logo-pastille" src="/logo/pastille.png" width="128" height="128" alt="" />
    </span>
  );
}

/** Section en bloc de couleur arrondi (lavande, pêche, ciel, menthe, encre ou blanc). */
export function Bloc({ fond = 'blanc', as: Balise = 'section', className = '', children, ...rest }) {
  return (
    <Balise className={`sk-bloc sk-bloc--${fond} ${className}`} {...rest}>
      {children}
    </Balise>
  );
}

/** Titre à deux graisses : une partie fine, une partie grasse, une fin fine éventuelle. */
export function TitreDeux({ as: Balise = 'h2', leger, fort, apres, className = '', ...rest }) {
  return (
    <Balise className={`sk-titre ${className}`} {...rest}>
      {leger && <span className="sk-titre-leger">{leger} </span>}
      <span className="sk-titre-fort">{fort}</span>
      {apres && <span className="sk-titre-leger"> {apres}</span>}
    </Balise>
  );
}

const Fleche = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 17 17 7M8 7h9v9" />
  </svg>
);

/**
 * Bouton pilule à pastille fléchée (teinte encre, blanc ou contour). Lien si `to`,
 * bouton sinon.
 */
export function BoutonFleche({ to, onClick, teinte = 'encre', compact = false, className = '', children, ...rest }) {
  const classes = `sk-bouton sk-bouton--${teinte}${compact ? ' sk-bouton--compact' : ''} ${className}`;
  const contenu = (
    <>
      <span className="sk-bouton-txt">{children}</span>
      <span className="sk-bouton-pastille"><Fleche /></span>
    </>
  );
  return to
    ? <Link to={to} className={classes} onClick={onClick} {...rest}>{contenu}</Link>
    : <button type="button" className={classes} onClick={onClick} {...rest}>{contenu}</button>;
}

/** Intertitre de liste : flèche vers le bas et capitales (« ↓ Contenus gratuits »). */
export function Surtitre({ children, className = '', ...rest }) {
  return (
    <h2 className={`sk-surtitre ${className}`} {...rest}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 5v14M6 13l6 6 6-6" />
      </svg>
      {children}
    </h2>
  );
}
