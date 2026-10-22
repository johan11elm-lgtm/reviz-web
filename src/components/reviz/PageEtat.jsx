import { Link } from 'react-router-dom';
import { Pantin } from '../Pantin';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { TEINTES, varsTeinte } from '../../utils/teinteMatiere';
import './HerosMatiere.css';
import './PageEtat.css';

/**
 * Page d'état plein écran (gabarit de la 404, handoff Claude Design du 22/10) : héros pastel avec
 * grain et Réviz animé, surtitre, titre, une phrase et un ou deux boutons. Sert à la page
 * introuvable, à « Aucune leçon chargée » et au « Crée ton compte » du mode essai.
 * Téléphone : texte et boutons sous le héros ; ordinateur : tout dans le héros, Réviz à droite.
 *
 * @param {'lavande'|'peche'} [teinte='lavande']
 * @param {string} [sur]        surtitre en petites capitales
 * @param {string} titre
 * @param {string} texte
 * @param {string} [expression] humeur de Réviz (voir Pantin)
 * @param {Array<{ label: string, to?: string, onClick?: Function }>} actions  la 1re est le bouton orange
 * @param {Function} [onRetour] bouton retour à la place du logo
 */
export function PageEtat({ teinte = 'lavande', sur, titre, texte, expression = 'content', actions = [], onRetour, className = '' }) {
  const isDesktop = useIsDesktop();
  const suite = (
    <>
      <p className="pe-texte">{texte}</p>
      <div className="pe-actions">
        {actions.map((a, i) => {
          const cls = `pe-btn${i > 0 ? ' pe-btn--second' : ''}`;
          return a.to
            ? <Link key={a.label} to={a.to} className={cls} onClick={a.onClick}>{a.label}</Link>
            : <button key={a.label} type="button" className={cls} onClick={a.onClick}>{a.label}</button>;
        })}
      </div>
    </>
  );
  const racine = ['app app--no-halo ch-page pe-page', isDesktop && 'app--large ch-page--large pe-page--large', className].filter(Boolean).join(' ');
  return (
    <div className={racine} style={varsTeinte(TEINTES[teinte] ?? TEINTES.lavande)}>
      <div className="content pe-defile">
        <header className="ch-hero pe-hero">
          <span className="ch-grain" aria-hidden="true" />
          <span className="pe-deco pe-deco--a" aria-hidden="true" />
          <span className="pe-deco pe-deco--b" aria-hidden="true" />
          <span className="pe-point" aria-hidden="true" />
          {onRetour
            ? <button type="button" className="ch-retour pe-retour" onClick={onRetour}><Chevron />Retour</button>
            : <Link to="/" className="pe-logo" aria-label="Réviz, accueil">Réviz</Link>}
          <div className="pe-corps">
            <div className="pe-textes">
              {sur && <span className="pe-sur">{sur}</span>}
              <h1 className="pe-titre">{titre}</h1>
              {isDesktop && suite}
            </div>
            <Pantin expression={expression} size={isDesktop ? 430 : 260} repli={null} className="pe-reviz" />
          </div>
        </header>
        {!isDesktop && <main className="pe-bas">{suite}</main>}
      </div>
    </div>
  );
}

const Chevron = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
);
