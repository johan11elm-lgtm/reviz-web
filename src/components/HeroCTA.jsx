import { Link } from 'react-router-dom';
import { Mascot } from './Mascot';

/**
 * HeroCTA — large hero card with gradient bg, glow, mascotte, eyebrow/title/sub, action pill.
 * Consumes .rv-hero-cta classes from src/styles/components/hero.css.
 *
 * @param {object} props
 * @param {'violet'|'orange'} [props.tone='violet']    — gradient tone
 * @param {string} [props.mascot]                      — mascotte pose name (omit to hide)
 * @param {number} [props.mascotSize=200]              — mascotte rendered size (CSS forces 200/172 mobile)
 * @param {boolean} [props.compact=false]              — shorter height variant
 * @param {string} [props.eyebrow]                     — uppercase label above the title
 * @param {string} props.title                         — main title (required)
 * @param {string} [props.sub]                         — secondary text
 * @param {string} [props.action]                      — action button label (shown only if provided)
 * @param {string} [props.to]                          — react-router Link target (uses Link if set)
 * @param {function} [props.onClick]                   — onClick fallback if no `to`
 * @param {string} [props.className]                   — extra classes
 * @param {string} [props.ariaLabel]                   — accessible label override
 */
export function HeroCTA({
  tone = 'violet',
  mascot,
  mascotSize = 200,
  compact = false,
  eyebrow,
  title,
  sub,
  action,
  to,
  onClick,
  className = '',
  ariaLabel,
}) {
  const classes = [
    'rv-hero-cta',
    `rv-hero-cta--${tone}`,
    compact && 'rv-hero-cta--compact',
    className,
  ].filter(Boolean).join(' ');

  const content = (
    <>
      <div className="rv-hero-glow" aria-hidden="true" />
      <div className="rv-hero-text">
        {eyebrow && <span className="rv-hero-eyebrow">{eyebrow}</span>}
        <h2 className="rv-hero-title">{title}</h2>
        {sub && <p className="rv-hero-sub">{sub}</p>}
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
