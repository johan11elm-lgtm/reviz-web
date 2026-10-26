import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useModalA11y } from '../../hooks/useModalA11y';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { mesurer } from '../../services/mesure';
import { nbsp } from '../../utils/typography';
import '../battle/AnnonceBattle.css';
import './JeuxAnnonce.css';

const cle = uid => `reviz-annonce-jeux-${uid}`;

/** La popup « Nouveau : Réviz Games » a-t-elle déjà été vue par cet élève ? */
export function annonceJeuxVue(uid) {
  try { return localStorage.getItem(cle(uid)) === '1'; } catch { return true; }
}

function marquerVue(uid) {
  try { localStorage.setItem(cle(uid), '1'); } catch { /* stockage indisponible */ }
}

/**
 * Popup de lancement de Réviz Games (sortie de la refonte, 26/10), montrée une fois à l'ouverture
 * de l'accueil, à la place de celle de la Battle : la scène de la partie du jour, les règles en
 * trois points. Même gabarit que l'ancienne annonce de la Battle (AnnonceBattle.css) : feuille du
 * bas sur téléphone, fenêtre centrée sur ordinateur.
 */
export function JeuxAnnonce({ uid, onClose }) {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const fermer = () => { marquerVue(uid); onClose(); };
  const ref = useModalA11y(fermer);
  const regles = [
    'Chaque jour, la partie du jour : les 6 jeux, la même partie pour tout le monde.',
    'Des mini-jeux de quelques secondes, de plus en plus rapides.',
    'À la fin, un récap de tes erreurs avec la bonne réponse.',
  ];

  return createPortal(
    <div className="ban-voile" onClick={fermer}>
      <div className={`ban-feuille${isDesktop ? ' ban-feuille--fenetre' : ''}`} ref={ref} role="dialog" aria-modal="true" aria-labelledby="jan-titre" onClick={e => e.stopPropagation()}>
        {!isDesktop && <span className="ban-poignee" aria-hidden="true" />}
        {isDesktop && <button type="button" className="ban-fermer" onClick={fermer} aria-label="Fermer"><Croix /></button>}
        <div className="ban-arene jan-arene" aria-hidden="true">
          <img className="jan-image" src="/jeux/hub/partie-du-jour.webp" alt="" />
          <span className="ban-nouveau">Nouveau</span>
        </div>
        <h2 className="ban-titre" id="jan-titre">Réviz Games</h2>
        <p className="ban-texte">Révise en jouant : Réviz fait le magicien, le pizzaïolo ou le ninja, et toi tu révises sans t’en rendre compte.</p>
        <ol className="ban-regles">
          {regles.map((r, i) => <li key={i}><span className={`ban-num ban-num--${i}`} aria-hidden="true">{i + 1}</span>{nbsp(r)}</li>)}
        </ol>
        <div className="ban-actions">
          <button type="button" className="ban-btn" onClick={() => { marquerVue(uid); mesurer('jeux_annonce_cta'); navigate('/jeux?depuis=accueil'); }}>Jouer à la partie du jour</button>
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
