import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useModalA11y } from '../../hooks/useModalA11y';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { BattleMascot } from '../BattleMascot';
import { track } from '../../services/statsService';
import { AURA, CHRONO_MS, ROUNDS, formaterAura } from '../../utils/battle';
import { nbsp } from '../../utils/typography';
import './AnnonceBattle.css';

const cle = uid => `reviz-annonce-battle-${uid}`;

/** La popup « Nouveau : la Battle » a-t-elle déjà été vue par cet élève ? */
export function annonceBattleVue(uid) {
  try { return localStorage.getItem(cle(uid)) === '1'; } catch { return true; }
}

function marquerVue(uid) {
  try { localStorage.setItem(cle(uid), '1'); } catch { /* stockage indisponible */ }
}

/**
 * Popup de lancement de la Battle (handoff Claude Design du 22/10), montrée une fois à
 * l'ouverture de Home : arène lavande avec les deux poses de garde face à face, les règles en
 * trois points. Feuille du bas sur téléphone, fenêtre centrée sur ordinateur.
 */
export function BattleAnnonce({ uid, onClose }) {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const fermer = () => { marquerVue(uid); onClose(); };
  const ref = useModalA11y(fermer);
  const regles = [
    'Partage un code : ton adversaire rejoint la partie.',
    `${ROUNDS} questions, ${CHRONO_MS / 1000} s chacune. Le plus rapide parmi les bonnes réponses gagne le round.`,
    `Round gagné : ${formaterAura(AURA.roundGagne)}. Erreur : ${formaterAura(AURA.erreur)}. Victoire : ${formaterAura(AURA.victoire)}.`,
  ];

  return createPortal(
    <div className="ban-voile" onClick={fermer}>
      <div className={`ban-feuille${isDesktop ? ' ban-feuille--fenetre' : ''}`} ref={ref} role="dialog" aria-modal="true" aria-labelledby="ban-titre" onClick={e => e.stopPropagation()}>
        {!isDesktop && <span className="ban-poignee" aria-hidden="true" />}
        {isDesktop && <button type="button" className="ban-fermer" onClick={fermer} aria-label="Fermer"><Croix /></button>}
        <div className="ban-arene" aria-hidden="true">
          <span className="ban-nouveau">Nouveau</span>
          <BattleMascot pose="garde" couleur="encre" size={isDesktop ? 170 : 140} priority alt="" />
          <span className="ban-vs">VS</span>
          <BattleMascot pose="garde" couleur="rouge" size={isDesktop ? 170 : 140} priority alt="" className="ban-miroir" />
        </div>
        <h2 className="ban-titre" id="ban-titre">La Battle</h2>
        <p className="ban-texte">Défie quelqu’un en direct sur un chapitre de ton programme, et gagne de l’aura.</p>
        <ol className="ban-regles">
          {regles.map((r, i) => <li key={i}><span className={`ban-num ban-num--${i}`} aria-hidden="true">{i + 1}</span>{nbsp(r)}</li>)}
        </ol>
        <div className="ban-actions">
          <button type="button" className="ban-btn" onClick={() => { marquerVue(uid); track('battle_annonce_cta'); navigate('/battle'); }}>Lancer une battle</button>
          <button type="button" className="ban-plus-tard" onClick={fermer}>Plus tard</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const Croix = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
);
