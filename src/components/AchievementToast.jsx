import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mascot } from './Mascot';
import './AchievementToast.css';

const DUREE = 5000; // 5 s : temps de lecture suffisant, notamment via lecteur d'écran.

const Croix = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
);
const Chevron = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
);

/**
 * Badge débloqué, façon app Nomad (29/10) : une carte marine qui descend du haut, la médaille du
 * badge (Réviz dans un anneau orange) qui apparaît avec un éclat, « Nouveau badge », son nom et ce
 * qui l'a débloqué ; un trait orange montre le temps qui reste. Un toucher ouvre Mes badges (Moi),
 * la croix la ferme ; sinon elle repart seule.
 */
export function AchievementToast({ badge, onDone }) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const fin = useRef(onDone);
  fin.current = onDone;
  const parti = useRef(false);
  const fermer = useCallback(() => {
    if (parti.current) return;
    parti.current = true;
    setVisible(false);
    setTimeout(() => fin.current?.(), 350);
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(fermer, DUREE);
    return () => { cancelAnimationFrame(raf); clearTimeout(timer); };
  }, [fermer]);

  return (
    <div className={`ach${visible ? ' ach--la' : ''}`} role="status" aria-live="polite" style={{ '--ach-duree': `${DUREE}ms` }}>
      <button type="button" className="ach-carte" onClick={() => { fermer(); navigate('/profil'); }}
        aria-label={`Nouveau badge : ${badge.label}${badge.hint ? `, ${badge.hint}` : ''}. Voir mes badges`}>
        <span className="ach-medaille" aria-hidden="true">
          <span className="ach-eclat" />
          <span className="ach-rond"><Mascot pose={badge.pose} size={58} alt="" /></span>
        </span>
        <span className="ach-txt" aria-hidden="true">
          <span className="ach-sur">Nouveau badge</span>
          <span className="ach-nom">{badge.label}</span>
          {badge.hint && <span className="ach-hint">{badge.hint}</span>}
        </span>
        <span className="ach-voir" aria-hidden="true"><Chevron /></span>
      </button>
      <button type="button" className="ach-fermer" onClick={fermer} aria-label="Fermer"><Croix /></button>
      <span className="ach-temps" aria-hidden="true" />
    </div>
  );
}
