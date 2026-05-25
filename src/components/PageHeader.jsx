import { useNavigate } from 'react-router-dom';

const ChevronBackIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const BellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

const SparkleLogo = () => (
  <svg className="rv-brand-sparkle" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path
      d="M16 0 C16.6 5.6 17.6 8.4 20.4 11.2 23.2 14 26 15 32 16 26 17 23.2 18 20.4 20.8 17.6 23.6 16.6 26.4 16 32 15.4 26.4 14.4 23.6 11.6 20.8 8.8 18 6 17 0 16 6 15 8.8 14 11.6 11.2 14.4 8.4 15.4 5.6 16 0Z"
      fill="url(#rvSparkleGrad)"
    />
    <defs>
      <linearGradient id="rvSparkleGrad" x1="2" y1="4" x2="30" y2="30" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFB347" />
        <stop offset="55%" stopColor="#FF8A3D" />
        <stop offset="100%" stopColor="#FF5A1F" />
      </linearGradient>
    </defs>
  </svg>
);

/**
 * PageHeader — top header of a page. Composes .rv-page-header / .rv-brand-title / .rv-bell-btn classes.
 *
 * Variants:
 * - "brand"      : brand title "réviz✦" on the left + right slot (defaults to bell if onBell)
 * - "back"       : back button + title centered + optional right slot
 * - "title-only" : title (+ optional sub) on the left + optional right slot
 *
 * @param {object} props
 * @param {'brand'|'back'|'title-only'} [props.variant='title-only']
 * @param {string} [props.title]              — title text (ignored for "brand")
 * @param {string} [props.sub]                — optional sub-title under title
 * @param {React.ReactNode} [props.right]     — right-side custom slot (overrides default bell)
 * @param {React.ReactNode} [props.left]      — left-side custom slot (overrides default)
 * @param {function} [props.onBack]           — back handler (default: navigate(-1))
 * @param {function} [props.onBell]           — bell click handler (if defined, shows bell on the right)
 * @param {string} [props.className]
 */
export function PageHeader({
  variant = 'title-only',
  title,
  sub,
  right,
  left,
  onBack,
  onBell,
  className = '',
}) {
  const navigate = useNavigate();
  const handleBack = onBack ?? (() => navigate(-1));

  const classes = ['rv-page-header', className].filter(Boolean).join(' ');

  const titleBlock = title ? (
    <div>
      <h1 className="rv-page-title">{title}</h1>
      {sub && <div className="rv-page-title-sub">{sub}</div>}
    </div>
  ) : null;

  const defaultLeft = (() => {
    if (variant === 'brand') {
      return (
        <h1 className="rv-brand-title">
          réviz<SparkleLogo />
        </h1>
      );
    }
    if (variant === 'back') {
      return (
        <button
          type="button"
          className="rv-bell-btn"
          onClick={handleBack}
          aria-label="Retour"
        >
          <ChevronBackIcon />
        </button>
      );
    }
    return titleBlock;
  })();

  const defaultRight = onBell ? (
    <button
      type="button"
      className="rv-bell-btn"
      onClick={onBell}
      aria-label="Ouvrir le menu"
    >
      <BellIcon />
    </button>
  ) : null;

  const showCenterTitle = variant === 'back' && title;

  return (
    <div className={classes}>
      <div className="rv-page-header__left">{left ?? defaultLeft}</div>
      {showCenterTitle && (
        <div className="rv-page-header__center">{titleBlock}</div>
      )}
      <div className="rv-page-header__right">{right ?? defaultRight}</div>
    </div>
  );
}
