import { useEffect, useId, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { Mascot } from './Mascot';
import './Pantin.css';

/**
 * Réviz en pâte à modeler, animé (pantin 3D en calques).
 * Sources : assets-src/mascot-2d/rig-d1/argile3d/pantin3d (calques 2508 px,
 * anim.html = démo). L'app charge des WebP recadrés et réduits
 * (public/pantin3d, ~190 ko) ; le pantin garde les coordonnées d'origine.
 *
 * Les yeux vivent derrière le corps percé : globe + iris découpés par
 * l'ouverture de l'œil, paupières en quatre images, sourcils et bouches
 * (visèmes) par-dessus, bras qui pivotent à l'épaule.
 */
let manifeste = null;
function chargerManifeste() {
  if (!manifeste) {
    manifeste = Promise.all([
      fetch('/pantin3d/pantin3d.json').then(r => { if (!r.ok) throw new Error('pantin3d'); return r.json(); }),
      import('gsap').then(m => m.gsap),
    ]);
    manifeste.catch(() => { manifeste = null; });
  }
  return manifeste;
}

const BOUCHES = ['repos', 'A', 'EI', 'O', 'U', 'rire'];
const PAUPIERES = ['p25', 'p50', 'p75', 'p100'];
// Bouches sans image fiable : la plus proche (comme anim.html). bouche-MBP.webp
// est un morceau de bouche mal découpé (il restait invisible : « elle a pas de
// bouche ») ; lèvres fermées = le trait de repos.
const ALIAS = { FV: 'EI', L: 'A', cri: 'O', choc: 'O', triste: 'repos', MBP: 'repos' };

// Humeurs : la pose tenue, la vie tourne par-dessus.
const EXPRESSIONS = {
  neutre:    { sourcil: 0,    bouche: 'repos', ferme: 0,   penche: 0,  rx: 0,    ry: 0 },
  content:   { sourcil: 0.25, bouche: 'repos', ferme: 0,   penche: 0,  rx: 0,    ry: 0 },
  fier:      { sourcil: 0.7,  bouche: 'rire',  ferme: 0,   penche: -2, rx: 0,    ry: 0 },
  determine: { sourcil: -0.45, bouche: 'MBP',  ferme: 0.1, penche: 1,  rx: 0,    ry: 0 },
  reflechit: { sourcil: 0.5,  bouche: 'MBP',   ferme: 0,   penche: 2,  rx: -0.4, ry: -0.8 },
  inquiet:   { sourcil: 0.6,  bouche: 'U',     ferme: 0,   penche: -1, rx: 0,    ry: 0.2 },
  endormi:   { sourcil: -0.2, bouche: 'repos', ferme: 1,   penche: 5,  rx: 0,    ry: 0.3 },
};

const VUE = '180 330 2148 2148';

const Calque = forwardRef(function Calque({ c, ...rest }, ref) {
  if (!c) return null;
  return <image ref={ref} href={`/pantin3d/${c.href}`} x={c.x} y={c.y} width={c.w} height={c.h} {...rest} />;
});

/**
 * @param {keyof EXPRESSIONS} [expression='content']
 * @param {'coucou'|'saut'} [entree]  geste joué à l'apparition
 * @param {number} [size=240]
 * @param {string} [repli='hello'] pose de <Mascot> affichée pendant le chargement
 * ref : { geste(nom), expression(nom) }
 */
export const Pantin = forwardRef(function Pantin(
  { expression = 'content', entree, size = 240, repli = 'hello', className = '', onClick, label },
  ref,
) {
  const uid = useId().replace(/:/g, '');
  const [G, setG] = useState(null);
  const [pret, setPret] = useState(false);
  const refs = useRef({});
  const moteur = useRef(null);
  const exprRef = useRef(expression);
  exprRef.current = expression;
  const reg = nom => el => { refs.current[nom] = el; };

  useEffect(() => {
    let vivant = true;
    chargerManifeste().then(([g, gsap]) => { if (vivant) { setG(g); moteur.current = { gsap }; } }).catch(() => {});
    return () => { vivant = false; };
  }, []);

  // Une fois le SVG en place : état, rendu à chaque image, vie.
  useEffect(() => {
    if (!G || !moteur.current) return;
    const { gsap } = moteur.current;
    const R = refs.current;
    const calme = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const base = EXPRESSIONS[exprRef.current] || EXPRESSIONS.content;
    // vx/vy : regard de vie, ajouté au regard de l'expression ; cligne : clignement par-dessus la paupière tenue.
    const e = { ...base, vx: 0, vy: 0, cligne: 0, souffle: 0, saut: 0, ecrase: 0, brasD: 0, brasG: 0, vague: 0 };
    const sol = G.pieds;
    const [bgx, bgy] = G.attaches['bras-g'];
    const [bdx, bdy] = G.attaches['bras-d'];

    // Course de l'iris jusqu'au bord de l'ouverture, selon la direction (lancer de rayon, cf. anim.html).
    const course = {};
    for (const [cote, y] of Object.entries(G.yeux)) {
      const [ix, iy] = y.iris.centre, ir = y.iris.rayon, poly = y.ouverture;
      course[cote] = a => {
        const ux = Math.cos(a), uy = Math.sin(a);
        let best = Infinity;
        for (let i = 0; i < poly.length; i++) {
          const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length];
          const ex = x2 - x1, ey = y2 - y1, wx = x1 - ix, wy = y1 - iy, den = ux * ey - uy * ex;
          if (Math.abs(den) < 1e-9) continue;
          const t = (wx * ey - wy * ex) / den, s2 = (wx * uy - wy * ux) / den;
          if (t > 0 && s2 >= 0 && s2 <= 1) best = Math.min(best, t);
        }
        return Math.max(0, best - ir * 0.82);
      };
    }

    let derniere = '';
    function rendre() {
      const gx = e.rx + e.vx, gy = e.ry + e.vy;
      const m = Math.min(1, Math.hypot(gx, gy)), a = Math.atan2(gy, gx);
      for (const cote of Object.keys(G.yeux)) {
        const t = m > 1e-3 ? course[cote](a) * m : 0;
        R[`iris-${cote}`]?.setAttribute('transform', `translate(${(t * Math.cos(a)).toFixed(1)} ${(t * Math.sin(a)).toFixed(1)})`);
      }
      const f = Math.min(1, Math.max(e.ferme, e.cligne));
      const etape = f < 0.125 ? null : f < 0.375 ? 'p25' : f < 0.625 ? 'p50' : f < 0.875 ? 'p75' : 'p100';
      const bq = ALIAS[e.bouche] || e.bouche;
      const cle = `${etape}|${bq}`;
      if (cle !== derniere) {
        derniere = cle;
        for (const cote of Object.keys(G.yeux)) for (const p of PAUPIERES) R[`paup-${cote}-${p}`]?.setAttribute('opacity', p === etape ? 1 : 0);
        for (const b of BOUCHES) R[`bouche-${b}`]?.setAttribute('opacity', b === bq ? 1 : 0);
      }
      R.sourcils?.setAttribute('transform', `translate(0 ${(-e.sourcil * 26).toFixed(1)})`);
      R.brasD?.setAttribute('transform', `rotate(${(-(e.brasD + e.vague)).toFixed(2)} ${bdx} ${bdy})`);
      R.brasG?.setAttribute('transform', `rotate(${e.brasG.toFixed(2)} ${bgx} ${bgy})`);
      // Respiration, saut et écrasement léger, autour des pieds.
      const sy = (1 - e.ecrase) * (1 + 0.012 * e.souffle), sx = (1 + e.ecrase * 0.4) * (1 - 0.004 * e.souffle);
      R.perso?.setAttribute('transform',
        `translate(0 ${(-e.saut).toFixed(1)}) translate(1254 ${sol}) rotate(${e.penche.toFixed(2)}) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(-1254 ${-sol})`);
      const k = 1 / (1 + e.saut / 500);
      R.ombre?.setAttribute('rx', (620 * k).toFixed(1));
      R.ombre?.setAttribute('opacity', (0.4 + 0.6 * k).toFixed(2));
    }

    const tweens = [];
    const appels = [];
    const garder = t => { tweens.push(t); return t; };
    const plus = (s, f) => { const c = gsap.delayedCall(s, f); appels.push(c); return c; };
    const alea = (a, b) => a + Math.random() * (b - a);

    function cligner(n = 1) {
      const tl = gsap.timeline();
      for (let i = 0; i < n; i++) {
        const t0 = i * 0.23;
        [0.1, 0.35, 0.7, 1, 1, 0.63, 0.36, 0.19, 0.08, 0.02, 0].forEach((v, j) => tl.set(e, { cligne: v }, t0 + j / 60));
      }
      return garder(tl);
    }
    function boucleClignements() {
      plus(alea(2.8, 6.5), () => {
        if (e.ferme < 0.9) cligner(Math.random() < 0.2 ? 2 : 1);
        boucleClignements();
      });
    }
    function boucleRegard() {
      plus(alea(1.6, 4), () => {
        const loin = Math.random() < 0.35;
        garder(gsap.to(e, loin
          ? { vx: alea(-0.8, 0.8), vy: alea(-0.35, 0.25), duration: 0.09, ease: 'power2.out' }
          : { vx: 0, vy: 0, duration: 0.09, ease: 'power2.out' }));
        boucleRegard();
      });
    }

    const gestes = {
      coucou() {
        const tl = gsap.timeline();
        tl.to(e, { sourcil: '+=0.6', duration: 0.15, ease: 'back.out(2)' }, 0)
          .to(e, { ecrase: 0.04, duration: 0.1, ease: 'power2.out' }, 0)
          .to(e, { ecrase: -0.02, saut: 24, duration: 0.18, ease: 'power3.out' }, 0.1)
          .to(e, { ecrase: 0, saut: 0, duration: 0.2, ease: 'power2.in' }, 0.28)
          .to(e, { brasD: 22, duration: 0.2, ease: 'back.out(2)' }, 0.05)
          .to(e, { vague: 8, duration: 0.16, ease: 'sine.inOut', yoyo: true, repeat: 5 }, 0.25)
          .to(e, { brasD: 0, vague: 0, duration: 0.3, ease: 'power2.out' }, 1.25)
          .to(e, { sourcil: (EXPRESSIONS[exprRef.current] || base).sourcil, duration: 0.3 }, 0.9);
        return garder(tl);
      },
      saut() {
        const tl = gsap.timeline();
        const fin = EXPRESSIONS[exprRef.current] || base;
        tl.set(e, { bouche: 'rire' }, 0)
          .to(e, { ecrase: 0.05, duration: 0.1 }, 0)
          .to(e, { ecrase: -0.02, saut: 60, brasD: 25, brasG: 25, sourcil: 1, duration: 0.2, ease: 'power3.out' }, 0.1)
          .to(e, { ecrase: 0, saut: 0, duration: 0.22, ease: 'power2.in' }, 0.3)
          .to(e, { ecrase: 0.04, duration: 0.07 }, 0.52)
          .to(e, { ecrase: 0, brasD: 0, brasG: 0, sourcil: fin.sourcil, duration: 0.3, ease: 'power3.out' }, 0.59)
          .set(e, { bouche: fin.bouche }, 0.9);
        return garder(tl);
      },
    };

    function poser(nom) {
      const x = EXPRESSIONS[nom] || EXPRESSIONS.content;
      if (calme) { Object.assign(e, x); return; }
      const tl = gsap.timeline();
      if (x.ferme < 0.5) cligner();  // on cligne en changeant d'idée
      tl.to(e, { sourcil: x.sourcil, penche: x.penche, rx: x.rx, ry: x.ry, duration: 0.35, ease: 'power2.out' }, 0.05)
        .to(e, { ferme: x.ferme, duration: x.ferme > 0.5 ? 0.6 : 0.12, ease: 'sine.inOut' }, 0.05)
        .set(e, { bouche: x.bouche }, 0.12);
      garder(tl);
    }

    gsap.ticker.add(rendre);
    if (!calme) {
      garder(gsap.to(e, { souffle: 1, duration: base.ferme > 0.5 ? 2.6 : 1.7, ease: 'sine.inOut', yoyo: true, repeat: -1 }));
      boucleClignements();
      boucleRegard();
      if (entree && gestes[entree]) plus(0.35, () => gestes[entree]());
    }
    rendre();
    moteur.current = { gsap, poser, gestes: calme ? {} : gestes };
    setPret(true);

    return () => {
      gsap.ticker.remove(rendre);
      tweens.forEach(t => t.kill());
      appels.forEach(c => c.kill());
      moteur.current = { gsap };
    };
  }, [G]);

  useEffect(() => {
    if (pret) moteur.current?.poser?.(expression);
  }, [expression, pret]);

  useImperativeHandle(ref, () => ({
    geste: nom => moteur.current?.gestes?.[nom]?.(),
    expression: nom => moteur.current?.poser?.(nom),
  }), []);

  const Tag = onClick ? 'button' : 'div';
  const C = G?.calques;
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={`pantin${pret ? ' pantin--pret' : ''} ${className}`.trim()}
      style={{ width: size, height: size }}
      onClick={onClick}
      aria-label={onClick ? label : undefined}
      aria-hidden={onClick ? undefined : 'true'}
    >
      {G && (
        <svg viewBox={VUE} className="pantin-svg" aria-hidden="true">
          <defs>
            {Object.entries(G.yeux).map(([cote, y]) => (
              <clipPath key={cote} id={`${uid}-ouv-${cote}`}>
                <polygon points={y.ouverture.map(p => p.join(',')).join(' ')} />
              </clipPath>
            ))}
          </defs>
          <ellipse ref={reg('ombre')} cx="1254" cy={G.pieds} rx="620" ry="56" fill="rgba(120,80,40,0.12)" />
          <g ref={reg('perso')}>
            <g ref={reg('brasG')}><Calque c={C['bras-g']} /></g>
            <g ref={reg('brasD')}><Calque c={C['bras-d']} /></g>
            <Calque c={C.jambes} />
            {Object.entries(G.yeux).map(([cote, y]) => (
              <g key={cote} transform={`translate(${y.x} ${y.y})`}>
                <g clipPath={`url(#${uid}-ouv-${cote})`}>
                  <Calque c={y.calques.globe} />
                  <g ref={reg(`iris-${cote}`)}><Calque c={y.calques.iris} /></g>
                </g>
              </g>
            ))}
            <Calque c={C.corps} />
            <Calque c={C['sous-sourcils']} />
            {Object.entries(G.yeux).map(([cote, y]) => (
              <g key={cote} transform={`translate(${y.x} ${y.y})`}>
                {PAUPIERES.map(p => <Calque key={p} c={y.calques[`paupiere-${p}`]} ref={reg(`paup-${cote}-${p}`)} opacity="0" />)}
              </g>
            ))}
            <g ref={reg('sourcils')}><Calque c={C.sourcils} /></g>
            {BOUCHES.map(b => <Calque key={b} c={C[`bouche-${b}`]} ref={reg(`bouche-${b}`)} opacity={b === 'repos' ? 1 : 0} />)}
          </g>
        </svg>
      )}
      {!pret && <Mascot pose={repli} size={size} priority alt="" aria-hidden="true" className="pantin-repli" />}
    </Tag>
  );
});
