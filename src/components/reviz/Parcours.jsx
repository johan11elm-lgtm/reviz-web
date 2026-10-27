import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mascot } from '../Mascot';
import './Parcours.css';

const Coche = ({ taille = 13 }) => (
  <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);

// Courbe qui passe par chaque point, points de contrôle à mi-chemin en x (comme Programme).
function courbe(pts) {
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], m = (x0 + x1) / 2;
    d += ` C${m} ${y0} ${m} ${y1} ${x1} ${y1}`;
  }
  return d;
}

/**
 * Ton parcours : Résumé → Flashcards → Quiz sur une petite route (fiche chapitre, fin du
 * Résumé…), chaque case avec la mascotte de son format (faite, en cours ou à faire). Chaque case
 * s'ouvre à tout moment. etapes : [{ id, nom, pose, to, meta, statut: 'fait'|'cours'|'afaire' }].
 * etat : l'état de navigation des liens (DEPUIS_FICHE) ; remplacer : depuis un exercice, la case
 * remplace l'écran au lieu de l'empiler (voir utils/navigation).
 */
export function Parcours({ etapes, grand, cases = [0.155, 0.5, 0.845], etat, remplacer = false }) {
  const boite = useRef(null);
  const [l, setL] = useState(grand ? 872 : 335);
  useLayoutEffect(() => {
    const el = boite.current;
    if (!el) return;
    const mesure = () => setL(el.clientWidth);
    mesure();
    const ro = new ResizeObserver(mesure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const D = grand
    ? { h: 230, ys: [74, 112, 74], route: 36, fait: 76, cours: 100, label: 160 }
    : { h: 214, ys: [62, 92, 62], route: 30, fait: 66, cours: 88, label: 110 };
  // Par défaut, les cases à 15,5 %, 50 % et 84,5 % de la largeur, comme dans la maquette.
  const pts = etapes.map((_, i) => [Math.round(l * cases[i]), D.ys[i]]);
  const dernierFait = etapes.reduce((a, e, i) => (e.statut === 'fait' ? i : a), -1);
  const route = courbe(pts);
  const faite = dernierFait > 0 ? courbe(pts.slice(0, dernierFait + 1)) : '';
  return (
    <div className={`ch-parcours${grand ? " ch-parcours--grand" : ""}`} ref={boite} style={{ height: D.h }}>
      <svg width={l} height={D.h} className="ch-route" aria-hidden="true">
        <path d={route} transform="translate(0 7)" fill="none" stroke="#A0501A" strokeOpacity=".10" strokeWidth={D.route} strokeLinecap="round" />
        <path d={route} fill="none" style={{ stroke: 'var(--rv-carte)' }} strokeWidth={D.route} strokeLinecap="round" />
        {faite && <path d={faite} fill="none" style={{ stroke: 'var(--rv-menthe)' }} strokeWidth={D.route} strokeLinecap="round" />}
        <path d={route} fill="none" style={{ stroke: 'var(--rv-marque)' }} strokeOpacity=".45" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" />
      </svg>
      {etapes.map((e, i) => {
        const [x, y] = pts[i];
        const taille = e.statut === 'cours' ? D.cours : D.fait;
        return (
          <div key={e.id}>
            <Link to={e.to} replace={remplacer} state={etat} className={`ch-case ch-case--${e.statut}`} style={{ left: x - taille / 2, top: y - taille / 2, width: taille, height: taille }}
              aria-label={`${e.nom} : ${e.meta}${e.statut === 'fait' ? ', fait' : ''}`}>
              <span className="ch-case-rond">
                <Mascot pose={e.pose} size={Math.round(taille * (e.statut === 'cours' ? 0.72 : 0.7))} alt="" aria-hidden="true" />
              </span>
              {e.statut === 'fait' && <span className="ch-case-coche"><Coche /></span>}
            </Link>
            <span className="ch-case-label" style={{ left: x - D.label / 2, top: y + taille / 2 + 10, width: D.label }} aria-hidden="true">
              <span className="ch-case-nom">{e.nom}</span>
              <span className={`ch-case-meta ch-case-meta--${e.statut}`}>{e.meta}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
