import { ThumbUpIcon, MehIcon, ThumbDownIcon } from './Icons';
import { useState } from 'react';
import { hasGivenFeedback, sendFormatFeedback } from '../services/feedbackService';
import './FormatFeedback.css';

const OPTIONS = [
  { rating: 'up',   icon: <ThumbUpIcon />,   label: 'Oui, utile' },
  { rating: 'meh',  icon: <MehIcon />,       label: 'Moyen' },
  { rating: 'down', icon: <ThumbDownIcon />, label: 'Pas terrible' },
];

/**
 * Micro-sondage utile / moyen / pas terrible sur un format généré par l'IA.
 * Un seul retour par (leçon, format) — masqué ensuite. L'envoi est
 * optimiste : l'élève voit toujours le merci, même hors-ligne.
 *
 * @param {'flashcards'|'quiz'|'resume'|'mindmap'} props.format
 * @param {string} [props.question]
 */
export function FormatFeedback({ format, question = 'Ce contenu t\'a aidé ?' }) {
  const [done, setDone] = useState(() => hasGivenFeedback(format));

  if (done === 'thanks') {
    return (
      <div className="format-feedback format-feedback--thanks" role="status">
        Merci pour ton retour !
      </div>
    );
  }
  if (done) return null; // déjà donné lors d'une session précédente : silence

  return (
    <div className="format-feedback">
      <span className="format-feedback-question">{question}</span>
      <div className="format-feedback-options">
        {OPTIONS.map(o => (
          <button
            key={o.rating}
            type="button"
            className="format-feedback-btn"
            aria-label={o.label}
            title={o.label}
            onClick={() => { sendFormatFeedback(format, o.rating); setDone('thanks'); }}
          >
            <span aria-hidden="true">{o.icon}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
