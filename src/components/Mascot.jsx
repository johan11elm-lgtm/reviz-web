import './Mascot.css';

/**
 * Available mascot poses. Each maps to a file in /public/mascot/.
 */
export const MASCOT_POSES = {
  reading:     { num: 1,  alt: 'Cerveau qui lit un livre' },
  flashcard:   { num: 2,  alt: 'Cerveau présentant une flashcard' },
  celebration: { num: 3,  alt: 'Cerveau qui fête la victoire' },
  sleeping:    { num: 4,  alt: 'Cerveau endormi' },
  thinking:    { num: 5,  alt: 'Cerveau en pleine réflexion' },
  writing:     { num: 6,  alt: 'Cerveau qui prend des notes' },
  trophy:      { num: 7,  alt: 'Cerveau avec un trophée' },
  confused:    { num: 8,  alt: 'Cerveau confus' },
  hello:       { num: 9,  alt: 'Cerveau qui dit bonjour' },
  scan:        { num: 11, alt: 'Cerveau qui scanne avec un téléphone' },
  fire:        { num: 12, alt: 'Cerveau en feu, motivé' },
  graduation:  { num: 13, alt: 'Cerveau diplômé' },
  sad:         { num: 14, alt: 'Cerveau triste' },
  search:      { num: 15, alt: 'Cerveau avec une loupe' },
  pointing:    { num: 16, alt: 'Cerveau qui pointe du doigt' },
};

/**
 * Build the asset URL for a given pose, picking the smallest variant
 * that still looks crisp at the requested rendered size (accounting for DPR).
 */
function getMascotSrc(pose, size) {
  const meta = MASCOT_POSES[pose];
  if (!meta) return null;
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 2;
  const targetPx = size * dpr;
  // Variants available: @256, @512, full 1024.
  let variant = '';
  if (targetPx <= 256) variant = '@256';
  else if (targetPx <= 512) variant = '@512';
  // Otherwise: full 1024 (no suffix)
  const baseName = `pose-${meta.num}-${pose}`;
  return `/mascot/${baseName}${variant}.png`;
}

/**
 * Réviz brand mascot — a cute brain character in various poses.
 *
 * @param {object} props
 * @param {keyof typeof MASCOT_POSES} props.pose       — required, the pose name
 * @param {number} [props.size=256]                    — rendered size in px (square)
 * @param {boolean} [props.glow=false]                 — apply the signature orange glow
 * @param {number} [props.glowIntensity=0.55]          — 0–1, glow opacity
 * @param {number} [props.glowRadius]                  — px, defaults to size * 0.1
 * @param {boolean} [props.priority=false]             — eager-load (above-the-fold)
 * @param {boolean} [props.animate=false]              — gentle floating animation
 * @param {string}  [props.alt]                        — override default alt text
 * @param {string}  [props.className]                  — extra classes on the wrapper
 * @param {object}  [props.style]                      — inline styles merged with size
 */
export function Mascot({
  pose,
  size = 256,
  glow = false,
  glowIntensity = 0.55,
  glowRadius,
  priority = false,
  animate = false,
  alt,
  className = '',
  style,
  ...rest
}) {
  const meta = MASCOT_POSES[pose];
  if (!meta) {
    if (import.meta.env?.DEV) {
      console.warn(`<Mascot pose="${pose}"> — unknown pose. Available:`, Object.keys(MASCOT_POSES));
    }
    return null;
  }

  const src = getMascotSrc(pose, size);
  const radius = glowRadius ?? Math.round(size * 0.1);

  const mergedStyle = {
    width: size,
    height: size,
    '--mascot-glow-radius': `${radius}px`,
    '--mascot-glow-intensity': glowIntensity,
    ...style,
  };

  const classes = [
    'mascot',
    glow && 'mascot--glow',
    animate && 'mascot--animate',
    className,
  ].filter(Boolean).join(' ');

  return (
    <img
      src={src}
      alt={alt ?? meta.alt}
      width={size}
      height={size}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchpriority={priority ? 'high' : 'auto'}
      draggable={false}
      className={classes}
      style={mergedStyle}
      {...rest}
    />
  );
}
