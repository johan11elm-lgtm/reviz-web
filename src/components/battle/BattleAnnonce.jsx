import { useNavigate } from 'react-router-dom';
import { useModalA11y } from '../../hooks/useModalA11y';
import { BattleMascot } from '../BattleMascot';
import { BattleRegles } from './BattleRegles';
import { track } from '../../services/statsService';
import './BattleAnnonce.css';

const cle = uid => `reviz-annonce-battle-${uid}`;

/** La popup « Nouveau : la Battle » a-t-elle déjà été vue par cet élève ? */
export function annonceBattleVue(uid) {
  try { return localStorage.getItem(cle(uid)) === '1'; } catch { return true; }
}

function marquerVue(uid) {
  try { localStorage.setItem(cle(uid), '1'); } catch { /* stockage indisponible */ }
}

/**
 * Popup de lancement de la Battle, montrée une fois à l'ouverture de Home.
 */
export function BattleAnnonce({ uid, onClose }) {
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
        aria-labelledby="battle-annonce-titre"
        onClick={e => e.stopPropagation()}
      >
        <div className="battle-annonce-visuel" aria-hidden="true">
          <BattleMascot pose="aura" couleur="encre" size={124} glow glowIntensity={0.7} priority />
          <BattleMascot pose="sixseven" couleur="rouge" size={124} priority />
        </div>
        <span className="rv-pill rv-pill--orange battle-annonce-pill">Nouveau</span>
        <h2 className="battle-annonce-titre" id="battle-annonce-titre">La Battle</h2>
        <p className="battle-annonce-sous">Défie quelqu’un en direct sur un chapitre de ton programme, et gagne de l’aura.</p>
        <BattleRegles partage />
        <div className="battle-annonce-actions">
          <button type="button" className="rv-btn-cta rv-btn-cta--full" onClick={() => { marquerVue(uid); track('battle_annonce_cta'); navigate('/battle'); }}>
            <span>Lancer une battle</span>
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
