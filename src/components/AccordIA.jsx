import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useModalA11y } from '../hooks/useModalA11y';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { ecouterDemandesAccordIA } from '../utils/accordIA';
import { nbsp } from '../utils/typography';
import { Mascot } from './Mascot';
import './battle/AnnonceBattle.css';
import './AccordIA.css';

const ENVOYE = [
  'Ce que tu écris à Réviz IA, et le texte ou la photo des leçons que tu scannes.',
  'Ta classe et, pour Réviz IA, tes contrôles à venir et tes erreurs récentes.',
  'Jamais ton nom, ton e-mail ni ta date de naissance.',
];

/**
 * Feuille d'accord avant le premier envoi à l'IA (utils/accordIA.js), montée une fois dans App :
 * elle s'ouvre quand un service en fait la demande et lui rend la réponse de l'élève.
 * Même gabarit que les annonces de l'accueil (AnnonceBattle.css).
 */
export function AccordIA() {
  const [repondre, setRepondre] = useState(null);
  useEffect(() => ecouterDemandesAccordIA(fn => setRepondre(() => fn)), []);
  if (!repondre) return null;
  const fin = oui => { repondre(oui); setRepondre(null); };
  return <Feuille onOui={() => fin(true)} onNon={() => fin(false)} />;
}

function Feuille({ onOui, onNon }) {
  const isDesktop = useIsDesktop();
  const ref = useModalA11y(onNon);
  return createPortal(
    <div className="ban-voile" onClick={onNon}>
      <div className={`ban-feuille${isDesktop ? ' ban-feuille--fenetre' : ''}`} ref={ref} role="dialog" aria-modal="true" aria-labelledby="aia-titre" onClick={e => e.stopPropagation()}>
        {!isDesktop && <span className="ban-poignee" aria-hidden="true" />}
        <div className="aia-tete">
          <Mascot pose="coach" size={64} alt="" aria-hidden="true" />
          <h2 className="ban-titre aia-titre" id="aia-titre">Réviz IA et tes données</h2>
        </div>
        <p className="ban-texte">{nbsp('Pour te répondre et transformer tes leçons en fiches et en quiz, Réviz envoie quelques informations à Claude, l’intelligence artificielle de la société Anthropic (États-Unis).')}</p>
        <ol className="ban-regles">
          {ENVOYE.map((r, i) => <li key={i}><span className={`ban-num ban-num--${i}`} aria-hidden="true">{i + 1}</span>{nbsp(r)}</li>)}
        </ol>
        <p className="aia-note">
          {nbsp('Anthropic ne s’en sert pas pour entraîner son IA. Tu peux retirer ton accord à tout moment dans les réglages. ')}
          {/* Lire la politique vaut « pas maintenant » : la question reviendra au prochain envoi. */}
          <Link to="/legal/confidentialite" onClick={onNon}>Politique de confidentialité</Link>
        </p>
        <div className="ban-actions">
          <button type="button" className="ban-btn" onClick={onOui}>J’accepte</button>
          <button type="button" className="ban-plus-tard" onClick={onNon}>Pas maintenant</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
