import { Link } from 'react-router-dom';
import { THEMES } from '../utils/themes';
import './ThemeEssai.css';

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
    <span className={['te-vignette', className].filter(Boolean).join(' ')} style={{ background: preview.app }} aria-hidden="true">
      <span className="te-vignette-hero" style={{ background: `linear-gradient(135deg, ${preview.hero[0]}, ${preview.hero[1]})` }} />
      <span className="te-vignette-carte" style={{ background: preview.card }}>
        <span className="te-vignette-point" style={{ background: preview.accent }} />
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
    <div className="te-carte">
      <Link to="/reglages#themes" className="te-lien" onClick={fermer}>
        <span className="te-vignettes">
          {premium.map(t => <ThemeVignette key={t.id} preview={t.preview} />)}
        </span>
        <span className="te-texte">
          <span className="te-titre">Essaie un thème Réviz+</span>
          <span className="te-sous">{premium.map(t => t.label).join(', ')}</span>
        </span>
        <span className="te-fleche" aria-hidden="true"><Fleche /></span>
      </Link>
      <button type="button" className="te-fermer" onClick={fermer} aria-label="Masquer"><Croix /></button>
    </div>
  );
}

const Fleche = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" /></svg>
);
const Croix = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
);
