import { mascotVariant } from './Mascot';
import './Mascot.css';
import './BattleMascot.css';

/**
 * Mascottes réservées à la Battle (série b) : le cerveau au bandeau de combat.
 * Chaque pose existe en deux couleurs de bandeau, une par joueur : encre pour
 * l'hôte, rouge pour l'invité. Assets dans /mascot/battle/, produits par
 * scripts/import-battle-mascots.mjs. Ne pas les utiliser hors de la Battle :
 * le reste de l'app passe par <Mascot> et MASCOT_POSES.
 */
export const BATTLE_POSES = {
  garde:     { num: 'b1', alt: 'Cerveau en garde, poings levés' },
  aura:      { num: 'b2', alt: 'Cerveau bras croisés, sûr de lui' },
  moinsaura: { num: 'b3', alt: 'Cerveau gêné qui se cache les yeux' },
  champion:  { num: 'b4', alt: 'Cerveau qui brandit une ceinture de champion' },
  gg:        { num: 'b5', alt: 'Cerveau bon perdant qui tend la main' },
  // Le 6-7 : deux images alternées (main gauche haute, puis main droite haute).
  sixseven:  { num: 'b6', alt: 'Cerveau qui fait la balance avec ses mains', frames: ['a', 'b'] },
};

export const BATTLE_COULEURS = ['encre', 'rouge'];

export function battleMascotBase(pose, couleur, variant, frame) {
  const name = frame ? `${pose}-${frame}` : pose;
  return `/mascot/battle/pose-${BATTLE_POSES[pose].num}-${name}-${couleur}${variant}`;
}

/**
 * @param {object} props
 * @param {keyof typeof BATTLE_POSES} props.pose
 * @param {'encre'|'rouge'} [props.couleur='encre'] — couleur du bandeau (hôte / invité)
 * @param {number}  [props.size=256]               — taille rendue en px (carré)
 * @param {boolean} [props.glow=false]             — halo de la mascotte (l'aura)
 * @param {number}  [props.glowIntensity=0.55]     — 0–1
 * @param {number}  [props.glowRadius]             — px, size * 0.1 par défaut
 * @param {boolean} [props.priority=false]         — chargement immédiat
 * @param {string}  [props.alt]
 * @param {string}  [props.className]
 * @param {object}  [props.style]
 */
export function BattleMascot({
  pose,
  couleur = 'encre',
  size = 256,
  glow = false,
  glowIntensity = 0.55,
  glowRadius,
  priority = false,
  alt,
  className = '',
  style,
  ...rest
}) {
  const meta = BATTLE_POSES[pose];
  if (!meta || !BATTLE_COULEURS.includes(couleur)) {
    if (import.meta.env?.DEV) {
      console.warn(`<BattleMascot pose="${pose}" couleur="${couleur}"> — inconnu.`, Object.keys(BATTLE_POSES), BATTLE_COULEURS);
    }
    return null;
  }

  const variant = mascotVariant(size);
  const imgStyle = {
    width: size,
    height: size,
    '--mascot-glow-radius': `${glowRadius ?? Math.round(size * 0.1)}px`,
    '--mascot-glow-intensity': glowIntensity,
  };
  const imgClass = ['mascot', glow && 'mascot--glow'].filter(Boolean).join(' ');

  const image = (frame, props) => {
    const base = battleMascotBase(pose, couleur, variant, frame);
    return (
      <picture key={frame ?? pose} style={{ display: 'contents' }}>
        <source srcSet={`${base}.webp`} type="image/webp" />
        <img
          src={`${base}.png`}
          width={size}
          height={size}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchpriority={priority ? 'high' : 'auto'}
          draggable={false}
          {...props}
        />
      </picture>
    );
  };

  if (!meta.frames) {
    return image(null, {
      alt: alt ?? meta.alt,
      className: [imgClass, className].filter(Boolean).join(' '),
      style: { ...imgStyle, ...style },
      ...rest,
    });
  }

  // Images décoratives empilées : c'est le conteneur qui porte le texte alternatif.
  return (
    <span
      role="img"
      aria-label={alt ?? meta.alt}
      className={['battle-67', className].filter(Boolean).join(' ')}
      style={{ width: size, height: size, ...style }}
      {...rest}
    >
      {meta.frames.map(frame => image(frame, {
        alt: '',
        className: `${imgClass} battle-67__${frame}`,
        style: imgStyle,
      }))}
    </span>
  );
}
