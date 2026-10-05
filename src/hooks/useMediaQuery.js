import { useEffect, useState } from 'react';

/**
 * Suit une media query CSS (ex. '(min-width: 1024px)'). Rend false là où
 * matchMedia n'existe pas (tests, rendu serveur), donc l'app se comporte
 * comme sur mobile par défaut.
 */
export function useMediaQuery(query) {
  const read = () => (
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false
  );
  const [matches, setMatches] = useState(read);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mq = window.matchMedia(query);
    const onChange = e => setMatches(e.matches);
    setMatches(mq.matches);
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, [query]);

  return matches;
}

// Ordinateur = grand écran hors app native (la classe .native est posée par main.jsx).
export function useIsDesktop() {
  const wide = useMediaQuery('(min-width: 1024px)');
  const native = typeof document !== 'undefined' && document.documentElement.classList.contains('native');
  return wide && !native;
}
