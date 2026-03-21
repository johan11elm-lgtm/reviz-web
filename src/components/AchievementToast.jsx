import { useState, useEffect } from 'react';
import './AchievementToast.css';

export function AchievementToast({ badge, onDone }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 300);
    }, 3000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className={`achievement-toast${visible ? ' achievement-toast--visible' : ''}`}>
      <span className="achievement-emoji">{badge.emoji}</span>
      <div className="achievement-info">
        <span className="achievement-label">Badge débloqué !</span>
        <span className="achievement-name">{badge.label}</span>
      </div>
    </div>
  );
}
