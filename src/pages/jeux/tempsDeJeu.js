/**
 * Le temps des Réviz Games (23/10) : un temps qui s'arrête quand la page passe en arrière-plan
 * (onglet changé, écran verrouillé, appli iOS quittée) et repart au retour, sans rien perdre.
 *
 * Sans cela, le chrono d'un tour continuait pendant l'absence (l'élève revenait sur « Temps écoulé »),
 * les fruits du ninja, les taupes et les parts de pizza avaient avancé d'un coup, et les enchaînements
 * à base de setTimeout (verdict, réaction de Réviz, tour suivant) s'exécutaient dans le vide.
 *
 * - tempsJeu(t) : le temps en ms, comme performance.now() mais sans les durées passées en arrière-plan.
 *   À utiliser pour tout ce qui se calcule par différence d'instants (début d'un tour, vol d'une boule,
 *   animation) ; `t` : un horodatage de requestAnimationFrame à convertir.
 * - minuterie(f, ms) / annuler(m) : un setTimeout qui se gèle en arrière-plan et reprend avec le temps
 *   qu'il lui restait.
 * - surArrierePlan(f) : f(true) quand la page passe en arrière-plan, f(false) au retour ; renvoie de
 *   quoi se désabonner.
 */
const cache = () => typeof document !== 'undefined' && document.visibilityState === 'hidden';
let fond = cache(); // la page est en arrière-plan
let depuisFond = 0; // l'instant (performance.now) où elle y est passée
let dureeFond = 0; // le temps total déjà passé en arrière-plan
const actives = new Set(); // les minuteries en cours
const abonnes = new Set();

export const enArrierePlan = () => fond;

export function tempsJeu(t = performance.now()) {
  return (fond ? Math.min(t, depuisFond) : t) - dureeFond;
}

function armer(m) {
  if (fond) return;
  m.id = setTimeout(() => { actives.delete(m); m.f(); }, Math.max(0, m.fin - tempsJeu()));
}

/** Comme setTimeout, mais le compte à rebours s'arrête en arrière-plan. Renvoie la minuterie (pour annuler). */
export function minuterie(f, ms) {
  const m = { f, fin: tempsJeu() + ms, id: null };
  actives.add(m);
  armer(m);
  return m;
}

export function annuler(m) {
  if (!m) return;
  clearTimeout(m.id);
  actives.delete(m);
}

export function surArrierePlan(f) {
  abonnes.add(f);
  return () => abonnes.delete(f);
}

function changer() {
  const maintenant = performance.now();
  const hors = cache();
  if (hors === fond) return;
  if (hors) {
    depuisFond = maintenant;
    fond = true;
    for (const m of actives) { clearTimeout(m.id); m.id = null; }
  } else {
    dureeFond += maintenant - depuisFond;
    fond = false;
    for (const m of [...actives]) armer(m);
  }
  for (const f of [...abonnes]) f(fond);
}
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', changer);
