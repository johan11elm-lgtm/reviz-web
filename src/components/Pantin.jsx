import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { Mascot } from './Mascot';
import './Pantin.css';

/**
 * Réviz en pâte à modeler, animé : le vrai moteur du pantin 3D (celui de la démo).
 * Sources : assets-src/mascot-2d/rig-d1 (reviz-anim.js, reviz-rig.js) et argile3d/pantin3d
 * (reviz-rig3d.js, gestes3d/, pièces 2508 px). argile3d/exporter_app.py copie le moteur et les
 * pièces (WebP réduits) dans public/pantin/ ; on ne modifie rien ici à la main.
 *
 * Bras et jambes continus (grandes mains : coucou, bras en l'air, tête, menton, hanches), pieds
 * posés quand il se tasse, réactions (étoiles, cœurs, spirale dans les yeux, effets flottants,
 * larmes). Le moteur est chargé une seule fois, à la demande ; <Mascot> s'affiche en attendant.
 */
const BASE = '/pantin/';
const SCRIPTS = [
  'reviz-d1-pieces.js', 'reviz-rig.js', 'reviz-rig3d.js',
  'gestes3d/enlair.js', 'gestes3d/tempe.js', 'gestes3d/menton.js', 'gestes3d/hanche.js', 'gestes3d/reactions.js',
  'reviz-anim.js',
];

function chargerScript(src) {
  return new Promise((ok, ko) => {
    const deja = document.querySelector(`script[data-pantin="${src}"]`);
    if (deja) {
      if (deja.dataset.charge) ok();
      else { deja.addEventListener('load', ok); deja.addEventListener('error', ko); }
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = false;
    s.dataset.pantin = src;
    s.onload = () => { s.dataset.charge = '1'; ok(); };
    s.onerror = ko;
    document.head.appendChild(s);
  });
}

let moteur = null;
function chargerMoteur() {
  if (!moteur) {
    moteur = Promise.all([
      import('gsap').then(m => m.gsap),
      SCRIPTS.reduce((p, s) => p.then(() => chargerScript(BASE + 'moteur/' + s)), Promise.resolve()),
    ]).then(([gsap]) => gsap);
    moteur.catch(() => { moteur = null; });
  }
  return moteur;
}

// Humeurs de l'app -> expressions du moteur (les autres noms passent tels quels :
// content, fier, determine, reflechit, inquiet, endormi, et les réactions emerveille,
// amoureux, etourdi, idee, panique, question, surpris, pleure, enerve).
const ALIAS = { triste: 'decu', concentre: 'determine', fatigue: 'decu' };
const versMoteur = nom => ALIAS[nom] || nom || 'content';

// Un geste finit bras au repos : on revient ensuite à l'humeur tenue (fier : mains sur les hanches).
function jouerGeste(a, nom, humeur) {
  if (!a || a.calme || !a.GESTES[nom]) return;
  a.geste(nom)?.eventCallback('onComplete', () => a.expression(versMoteur(humeur())));
}

// Cadrage en px des calques (2508 px) : celui de l'ancien pantin, les pages en dépendent.
// Les effets au-dessus de la tête débordent (overflow visible).
const VUE = '180 330 2148 2148';

/**
 * @param {string} [expression='content']  humeur tenue (voir ALIAS)
 * @param {'coucou'|'saut'|string} [entree]  geste joué à l'apparition
 * @param {number} [size=240]
 * @param {string} [repli='hello'] pose de <Mascot> affichée pendant le chargement
 * ref : { geste(nom), expression(nom) }
 */
export const Pantin = forwardRef(function Pantin(
  { expression = 'content', entree, size = 240, repli = 'hello', className = '', onClick, label },
  ref,
) {
  const hote = useRef(null);
  const boite = useRef(null);
  const anim = useRef(null);
  const [pret, setPret] = useState(false);
  const exprRef = useRef(expression);
  exprRef.current = expression;
  const entreeRef = useRef(entree);

  useEffect(() => {
    let vivant = true;
    let a = null;
    let obs = null;
    const appels = [];
    const h = hote.current;
    chargerMoteur().then(async gsap => {
      if (!vivant || !h) return;
      const calme = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const rig = await window.RevizD1_3D.creer(h, { base: BASE, repereHD: true });
      if (!vivant) { h.replaceChildren(); return; }
      a = window.RevizAnim.creer(rig, { gsap, calme });
      anim.current = a;
      a.demarrerVie();
      a.expression(versMoteur(exprRef.current));
      // Hors de l'écran (page qui défile) : le pantin se met en pause, il ne coûte plus rien.
      if ('IntersectionObserver' in window && boite.current) {
        obs = new IntersectionObserver(([v]) => (v.isIntersecting ? a.reprendre() : a.pause()));
        obs.observe(boite.current);
      }
      const g = entreeRef.current;
      if (g) appels.push(gsap.delayedCall(0.35, () => jouerGeste(a, g, () => exprRef.current)));
      setPret(true);
    }).catch(() => {});
    return () => {
      vivant = false;
      obs?.disconnect();
      appels.forEach(c => c.kill());
      a?.detruire();
      anim.current = null;
      h?.replaceChildren();
    };
  }, []);

  useEffect(() => {
    if (pret) anim.current?.expression(versMoteur(expression));
  }, [expression, pret]);

  useImperativeHandle(ref, () => ({
    geste: nom => jouerGeste(anim.current, nom, () => exprRef.current),
    expression: nom => anim.current?.expression(versMoteur(nom)),
  }), []);

  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      ref={boite}
      type={onClick ? 'button' : undefined}
      className={`pantin${pret ? ' pantin--pret' : ''} ${className}`.trim()}
      style={{ width: size, height: size }}
      onClick={onClick}
      aria-label={onClick ? label : undefined}
      aria-hidden={onClick ? undefined : 'true'}
    >
      <svg viewBox={VUE} className="pantin-svg" aria-hidden="true">
        <g ref={hote} />
      </svg>
      {!pret && <Mascot pose={repli} size={size} priority alt="" aria-hidden="true" className="pantin-repli" />}
    </Tag>
  );
});
