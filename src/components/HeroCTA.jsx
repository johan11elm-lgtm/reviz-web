import { Link } from 'react-router-dom';
import { Mascot } from './Mascot';

/**
 * HeroCTA — large hero card with gradient bg, glow, mascotte, eyebrow/title/sub, action pill.
 * Consumes .rv-hero-cta classes from src/styles/components/hero.css.
 *
 * @param {object} props
 * @param {'violet'|'orange'} [props.tone='violet']    — gradient tone
 * @param {string} [props.mascot]                      — mascotte pose name (omit to hide)
 * @param {number} [props.mascotSize=200]              — mascotte rendered size (CSS forces 168/150 mobile)
 * @param {boolean} [props.compact=false]              — shorter height variant
 * @param {boolean} [props.overlap=false]              — mascotte hors flux (absolue) : titre pleine
 *   largeur + hauteur pilotée par min-height. Titres courts uniquement.
 * @param {string} [props.eyebrow]                     — uppercase label above the title
 * @param {string} props.title                         — main title (required)
 * @param {string} [props.sub]                         — secondary text
 * @param {string} [props.action]                      — action button label (shown only if provided)
 * @param {string} [props.to]                          — react-router Link target (uses Link if set)
 * @param {function} [props.onClick]                   — onClick fallback if no `to`
 * @param {object} [props.secondary]                   — secondary full-width row at the bottom
 *   { label, title, icon, to?, onClick?, ariaLabel? } — `to` wins over `onClick`.
 *   When set, the card root becomes a <div> and primary/secondary are two
 *   distinct controls (no nested links).
 * @param {string} [props.className]                   — extra classes
 * @param {string} [props.ariaLabel]                   — accessible label override
 */
export function HeroCTA({
  tone = 'violet',
  mascot,
  mascotSize = 200,
  compact = false,
  overlap = false,
  eyebrow,
  title,
  sub,
  action,
  to,
  onClick,
  secondary,
  className = '',
  ariaLabel,
}) {
  const classes = [
    'rv-hero-cta',
    `rv-hero-cta--${tone}`,
    compact && 'rv-hero-cta--compact',
    overlap && 'rv-hero-cta--overlap',
    className,
  ].filter(Boolean).join(' ');

  const mainContent = (
    <>
      <div className="rv-hero-text">
        <div className="rv-hero-copy">
          {eyebrow && <span className="rv-hero-eyebrow">{eyebrow}</span>}
          <h2 className="rv-hero-title">{title}</h2>
          {sub && <p className="rv-hero-sub">{sub}</p>}
        </div>
        {action && (
          <span className="rv-hero-action">
            {action}
            <span className="rv-hero-action-arrow" aria-hidden="true">→</span>
          </span>
        )}
      </div>
      {mascot && (
        <Mascot
          pose={mascot}
          size={mascotSize}
          priority
          className="rv-hero-mascot"
          alt=""
          aria-hidden="true"
        />
      )}
    </>
  );

  const glow = <div className="rv-hero-glow" aria-hidden="true" />;

  // Avec action secondaire : la racine est un <div>, la zone principale et la
  // rangée secondaire sont deux contrôles distincts (pas de liens imbriqués).
  if (secondary) {
    const secondaryContent = (
      <>
        {secondary.icon && (
          <span className="rv-hero-secondary-icon" aria-hidden="true">{secondary.icon}</span>
        )}
        <span className="rv-hero-secondary-text">
          <span className="rv-hero-secondary-label">{secondary.label}</span>
          <span className="rv-hero-secondary-title">{secondary.title}</span>
        </span>
        <span className="rv-hero-secondary-arrow" aria-hidden="true">→</span>
      </>
    );

    return (
      <div className={classes}>
        {glow}
        {to ? (
          <Link to={to} className="rv-hero-main" aria-label={ariaLabel}>
            {mainContent}
          </Link>
        ) : (
          <button type="button" onClick={onClick} className="rv-hero-main" aria-label={ariaLabel}>
            {mainContent}
          </button>
        )}
        {secondary.to ? (
          <Link to={secondary.to} className="rv-hero-secondary" aria-label={secondary.ariaLabel}>
            {secondaryContent}
          </Link>
        ) : (
          <button
            type="button"
            onClick={secondary.onClick}
            className="rv-hero-secondary"
            aria-label={secondary.ariaLabel}
          >
            {secondaryContent}
          </button>
        )}
      </div>
    );
  }

  const content = (
    <>
      {glow}
      <div className="rv-hero-main">{mainContent}</div>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} aria-label={ariaLabel}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes} aria-label={ariaLabel}>
        {content}
      </button>
    );
  }

  return (
    <div className={classes} aria-label={ariaLabel}>
      {content}
    </div>
  );
}
