import { useEffect, useState } from 'react';
import { tempsLettres } from '../Pantin';
import './BulleReviz.css';

/**
 * Ce que dit Réviz, dans sa bulle blanche (accueil, Programme…). Une idée par ligne : la
 * première porte la phrase, la suivante la complète plus doucement. Le texte est tapé lettre
 * par lettre au rythme de sa bouche (tempsLettres, même minutage que Pantin.dire) ; le texte
 * entier est posé dès le départ, lettres à venir invisibles : la bulle ne change pas de taille.
 *
 * @param {string[]} lignes   deux lignes au plus
 * @param {boolean} [parle=true]  false : bulle cachée (Réviz n'est pas encore là)
 * @param {boolean} [sortie]  la bulle s'efface avant la phrase suivante
 * @param {Function} [onClick] la bulle devient un bouton (label : ce qu'il lance)
 * @param {'bas'|'droite'|'gauche'} [pointe='bas'] côté de la pointe, vers Réviz
 * @param {boolean} [grande]  version ordinateur, en grand
 */
export function BulleReviz({ lignes, parle = true, sortie = false, onClick, label = '', pointe = 'bas', grande = false, className = '' }) {
  const texte = lignes.join('\n');
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!parle) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setN(texte.length); return; }
    setN(0);
    const temps = tempsLettres(texte);
    const t0 = performance.now();
    let id;
    const tic = () => {
      const t = (performance.now() - t0) / 1000;
      let i = 0;
      while (i < temps.length && temps[i] <= t) i++;
      setN(i);
      if (i < temps.length) id = requestAnimationFrame(tic);
    };
    id = requestAnimationFrame(tic);
    return () => cancelAnimationFrame(id);
  }, [texte, parle]);

  // Chaque ligne avance avec la frappe ; le saut de ligne compte pour une lettre (son temps de pause).
  let debut = 0;
  const contenu = lignes.map((l, i) => {
    const lettres = [...l];
    const vues = Math.max(0, Math.min(lettres.length, n - debut));
    debut += lettres.length + 1;
    return (
      <span key={i} className="rv-bulle-ligne" aria-hidden="true">
        {lettres.slice(0, vues).join('')}
        <span className="rv-bulle-reste">{lettres.slice(vues).join('')}</span>
      </span>
    );
  });
  const classes = ['rv-bulle', parle && !sortie && 'rv-bulle--la', pointe === 'droite' && 'rv-bulle--droite', pointe === 'gauche' && 'rv-bulle--gauche', grande && 'rv-bulle--grande', className]
    .filter(Boolean).join(' ');
  return (
    <div className={classes}>
      {onClick ? (
        <button type="button" className="rv-bulle-txt" onClick={onClick} aria-label={`${lignes.join(' ')} ${label}`.trim()} tabIndex={parle ? 0 : -1}>
          {contenu}
        </button>
      ) : (
        <p className="rv-bulle-txt">
          <span className="rv-bulle-sr">{lignes.join(' ')}</span>
          {contenu}
        </p>
      )}
    </div>
  );
}
