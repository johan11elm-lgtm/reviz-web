import { Link } from 'react-router-dom';
import './Bandeau.css';

const Coche = () => (
  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);

/**
 * Bandeau d'accueil (handoff Claude Design du 22/10) : carte blanche fine, rond pastel avec un
 * point, « Titre · suite », action en pilule encre. Sur téléphone, le texte passe à la ligne
 * sans jamais être coupé ; sur ordinateur, une ligne. Un seul bandeau à la fois (voir Home.css).
 * @param {'menthe'|'lavande'|'peche'|'rose'} teinte
 * @param {{ to?: string, onClick?: Function, label: string, etat?: ''|'envoi'|'envoye' }} action
 */
export function Bandeau({ teinte, titre, suite, action, className = '' }) {
  let bouton = null;
  if (action?.etat === 'envoye') {
    bouton = <span className="bd-action bd-action--fait"><span aria-hidden="true"><Coche /></span>Renvoyé</span>;
  } else if (action?.to) {
    bouton = <Link to={action.to} className="bd-action">{action.label}</Link>;
  } else if (action) {
    bouton = (
      <button type="button" className={`bd-action${action.etat === 'envoi' ? ' bd-action--envoi' : ''}`} onClick={action.onClick} disabled={action.etat === 'envoi'}>
        {action.etat === 'envoi' ? 'Envoi…' : action.label}
      </button>
    );
  }
  return (
    <div className={`bd bd--${teinte} ${className}`.trim()} role="status">
      <span className="bd-rond" aria-hidden="true"><i /></span>
      <span className="bd-texte">{titre && <b>{titre}</b>}{titre && suite && ' · '}{suite}</span>
      {bouton}
    </div>
  );
}
