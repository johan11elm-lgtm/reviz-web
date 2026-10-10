import { useNavigate } from 'react-router-dom';
import { useModalA11y } from '../hooks/useModalA11y';
import { Mascot } from './Mascot';
import { CameraIcon, ChatIcon, SunIcon } from './Icons';
import { track } from '../services/statsService';
import { LANCEMENT_SCAN_LIMIT, LANCEMENT_CHAT_LIMIT } from '../../api/_lancement.js';
import './battle/BattleAnnonce.css';

const cle = uid => `reviz-annonce-revizplus-offert-${uid}`;

/** La popup « Réviz+ offert » a-t-elle déjà été vue par cet élève ? */
export function annonceRevizPlusVue(uid) {
  try { return localStorage.getItem(cle(uid)) === '1'; } catch { return true; }
}

function marquerVue(uid) {
  try { localStorage.setItem(cle(uid), '1'); } catch { /* stockage indisponible */ }
}

/**
 * Popup de lancement : Réviz+ offert à tout le monde, montrée une fois sur Home.
 * Même gabarit que la popup de la Battle.
 */
export function RevizPlusAnnonce({ uid, onClose }) {
  const navigate = useNavigate();
  const fermer = () => { marquerVue(uid); onClose(); };
  const ref = useModalA11y(fermer);

  return (
    <div className="battle-annonce-fond" onClick={fermer}>
      <div
        className="battle-annonce-carte"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="revizplus-annonce-titre"
        onClick={e => e.stopPropagation()}
      >
        <div className="battle-annonce-visuel" aria-hidden="true">
          <Mascot pose="levelup" size={124} alt="" aria-hidden="true" />
        </div>
        <span className="rv-pill rv-pill--orange battle-annonce-pill">Offert</span>
        <h2 className="battle-annonce-titre" id="revizplus-annonce-titre">Réviz+ est offert</h2>
        <p className="battle-annonce-sous">Pendant le lancement de Réviz, tout Réviz+ est gratuit pour toi. Rien à payer, rien à activer.</p>
        <ul className="battle-regles">
          <li><CameraIcon /><span>Jusqu’à {LANCEMENT_SCAN_LIMIT} leçons analysées par semaine, au lieu de 5</span></li>
          <li><ChatIcon /><span>Le coach, jusqu’à {LANCEMENT_CHAT_LIMIT} messages par jour</span></li>
          <li><SunIcon /><span>Tous les thèmes de couleur</span></li>
        </ul>
        <div className="battle-annonce-actions">
          <button type="button" className="rv-btn-cta rv-btn-cta--full" onClick={() => { marquerVue(uid); track('revizplus_offert_cta'); navigate('/scan'); }}>
            <span>Scanner une leçon</span>
            <span className="rv-btn-cta-arrow" aria-hidden="true">→</span>
          </button>
          <button type="button" className="rv-btn-cta rv-btn-cta--full rv-btn-cta--ghost rv-btn-cta--center" onClick={fermer}>
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}
