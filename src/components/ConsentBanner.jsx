import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  needsAnalyticsChoice,
  setAnalyticsConsent,
  onAnalyticsConsentChange,
} from '../services/analyticsService';
import './ConsentBanner.css';

// Pages sans barre de navigation en bas : la bannière descend au ras de l'écran.
const NO_NAV_PREFIXES = ['/welcome', '/connexion', '/inscription', '/consent-pending', '/finish-setup', '/verify-email', '/onboarding'];

/**
 * Bannière de consentement à la mesure d'audience (CNIL).
 * - N'apparaît que si aucun choix n'est enregistré et que la mesure est configurée.
 * - Deux boutons de même poids : refuser est aussi simple qu'accepter.
 * - Ne bloque pas la page (pas de modale) ; masquée sur les pages légales
 *   pour laisser lire la politique de confidentialité.
 * - Le choix se change ensuite dans Réglages.
 */
export function ConsentBanner() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(() => needsAnalyticsChoice());

  useEffect(() => onAnalyticsConsentChange(() => setVisible(needsAnalyticsChoice())), []);

  if (!visible || pathname.startsWith('/legal')) return null;

  const choose = (granted) => {
    setAnalyticsConsent(granted);
    setVisible(false);
  };

  const low = NO_NAV_PREFIXES.some(p => pathname.startsWith(p));

  return (
    <section
      className={`consent-banner${low ? ' consent-banner--low' : ''}`}
      role="region"
      aria-labelledby="consent-banner-title"
    >
      <p className="consent-banner-title" id="consent-banner-title">Nous aider à améliorer Réviz ?</p>
      <p className="consent-banner-text">
        Avec ton accord, on compte les pages visitées pour voir ce qui est utile. Pas de pub, pas de revente, et tu peux changer d'avis dans Réglages.{' '}
        <Link to="/legal/confidentialite" className="consent-banner-link">En savoir plus</Link>
      </p>
      <div className="consent-banner-btns">
        <button type="button" className="consent-banner-btn consent-banner-btn--deny" onClick={() => choose(false)}>
          Refuser
        </button>
        <button type="button" className="consent-banner-btn consent-banner-btn--accept" onClick={() => choose(true)}>
          Accepter
        </button>
      </div>
    </section>
  );
}
