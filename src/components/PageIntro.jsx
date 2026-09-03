import { Mascot } from './Mascot';

/**
 * PageIntro — ouverture de page façon Home : titre noir Geist + sous-titre
 * utile à gauche, mascotte posée à droite, sans carte colorée (le halo de
 * page fait le fond). Compose .rv-page-intro (headers.css) et reprend les
 * classes .rv-greeting-* du greeting de la Home.
 *
 * @param {object} props
 * @param {string} props.title
 * @param {string} [props.sub]
 * @param {string} [props.mascot]          — pose de mascotte (omise : pas d'illustration)
 * @param {number} [props.mascotSize=156]
 * @param {string} [props.className]
 * @param {React.ReactNode} [props.children] — bloc optionnel sous le sous-titre (barre d'XP…)
 */
export function PageIntro({ title, sub, mascot, mascotSize = 156, className = '', children }) {
  const classes = ['rv-page-intro', className].filter(Boolean).join(' ');
  return (
    <div className={classes}>
      <div className="rv-page-intro-text">
        <h1 className="rv-greeting-title rv-page-intro-title">{title}</h1>
        {sub && <p className="rv-greeting-sub rv-page-intro-sub">{sub}</p>}
        {children}
      </div>
      {mascot && (
        <Mascot
          pose={mascot}
          size={mascotSize}
          priority
          className="rv-page-intro-mascot"
          alt=""
          aria-hidden="true"
        />
      )}
    </div>
  );
}
