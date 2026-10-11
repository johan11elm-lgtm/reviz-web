import { Link } from 'react-router-dom';
import { THEMES } from '../utils/themes';
import './RevizPlus.css';

const CLE = 'reviz-essai-theme-vu';

/** La carte « Essaie un thème Réviz+ » a-t-elle déjà été vue ou fermée ? */
export function essaiThemeVu() {
  try { return localStorage.getItem(CLE) === '1'; } catch { return true; }
}

function marquerVu() {
  try { localStorage.setItem(CLE, '1'); } catch { /* stockage indisponible */ }
}

/** Mini vignette d'un thème : fond, carte héros en dégradé, point d'accent. */
export function ThemeVignette({ preview, className = '' }) {
  return (
    <span className={['rp-vignette', className].filter(Boolean).join(' ')} style={{ background: preview.app }} aria-hidden="true">
      <span className="rp-vignette-hero" style={{ background: `linear-gradient(135deg, ${preview.hero[0]}, ${preview.hero[1]})` }} />
      <span className="rp-vignette-card" style={{ background: preview.card }}>
        <span className="rp-vignette-dot" style={{ background: preview.accent }} />
      </span>
    </span>
  );
}

/**
 * Carte d'accueil, une seule fois : propose d'essayer un thème Réviz+.
 * Disparaît au premier clic (lien ou croix).
 */
export function ThemeEssai({ onClose }) {
  const premium = THEMES.filter(t => t.premium);
  const fermer = () => { marquerVu(); onClose(); };
  return (
    <div className="rv-card rp-essai">
      <Link to="/reglages#themes" className="rp-essai-lien" onClick={() => { marquerVu(); onClose(); }}>
        <span className="rp-essai-vignettes">
          {premium.map(t => <ThemeVignette key={t.id} preview={t.preview} />)}
        </span>
        <span className="rp-essai-texte">
          <span className="rp-essai-titre">Essaie un thème Réviz+</span>
          <span className="rp-essai-sous">{premium.map(t => t.label).join(', ')}</span>
        </span>
        <span className="rp-essai-fleche" aria-hidden="true">›</span>
      </Link>
      <button type="button" className="rp-essai-fermer" onClick={fermer} aria-label="Masquer">✕</button>
    </div>
  );
}
