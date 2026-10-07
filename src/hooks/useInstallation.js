import { useEffect, useState } from 'react';
import { IS_NATIVE } from '../services/apiClient';
import {
  detecterPlateforme,
  navigateurIntegre,
  estInstallee,
  installationDirectePossible,
  suivreInstallation,
} from '../utils/installation';

/**
 * Où en est l'élève pour installer Réviz : son appareil, un éventuel
 * navigateur intégré (TikTok, Instagram…), l'app déjà installée, et la
 * possibilité d'installer en un geste (Chrome, Edge).
 * `aProposer` est faux dans l'app iOS native et dans l'app déjà installée.
 */
export function useInstallation() {
  const [directe, setDirecte] = useState(installationDirectePossible);
  useEffect(() => suivreInstallation(() => setDirecte(installationDirectePossible())), []);

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const tactile = typeof navigator !== 'undefined' ? navigator.maxTouchPoints : 0;
  const installee = estInstallee();

  return {
    plateforme: detecterPlateforme(ua, tactile),
    integre: navigateurIntegre(ua),
    installee,
    directe,
    aProposer: !IS_NATIVE && !installee,
  };
}
