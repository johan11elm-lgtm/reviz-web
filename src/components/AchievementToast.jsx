import { Mascot } from './Mascot';
import { useState, useEffect } from 'react';
import './AchievementToast.css';

export function AchievementToast({ badge, onDone }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    // 5s : temps de lecture suffisant, notamment via lecteur d'écran.
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 300);
    }, 5000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      className={`achievement-toast${visible ? ' achievement-toast--visible' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="achievement-rond" aria-hidden="true"><Mascot pose={badge.pose} size={52} alt="" aria-hidden="true" /></span>
      <span className="achievement-info">
        <span className="achievement-label">Badge débloqué</span>
        <span className="achievement-name">{badge.label}</span>
      </span>
    </div>
  );
}
