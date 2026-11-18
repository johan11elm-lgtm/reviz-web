// -------------------------------------------------------
// Réviz — App iOS : la page reprend sa place quand le clavier se ferme
//
// iOS décale toute la page pour montrer le champ sous le clavier et peut la laisser décalée une
// fois le clavier fermé : les touchers ne tombent plus sur ce qu'on voit et le défilement paraît
// bloqué (Johan, 18/11). Dans l'app, la page elle-même ne défile jamais (chaque écran défile dans
// son conteneur) : on la remet à zéro, avec .app (repli iOS 15, où overflow: clip n'existe pas).
// Réviz IA faisait déjà ça pour son fil (remettreLaPage dans pages/Coach.jsx).
// -------------------------------------------------------

/** Le clavier est-il ouvert ? (la zone visible a rétréci de plus de 40 px) */
export function clavierOuvert(win = window) {
  const vv = win.visualViewport
  if (!vv) return false
  const page = Math.max(win.innerHeight, win.document.documentElement.clientHeight)
  return page - vv.height - vv.offsetTop > 40
}

/** Remet la page et .app à zéro si le clavier est fermé. @returns {boolean} true si on a corrigé */
export function remettreEnPlace(win = window) {
  if (clavierOuvert(win)) return false
  const doc = win.document
  let corrige = false
  if (win.scrollY || doc.documentElement.scrollTop) { win.scrollTo(0, 0); corrige = true }
  const app = doc.querySelector('.app')
  if (app && (app.scrollTop || app.scrollLeft)) { app.scrollTop = 0; app.scrollLeft = 0; corrige = true }
  return corrige
}

/** À appeler une fois au démarrage de l'app native. */
export function garderLaPageEnPlace(win = window) {
  let t = null
  const plusTard = () => { clearTimeout(t); t = setTimeout(() => remettreEnPlace(win), 80) }
  win.document.addEventListener('focusout', plusTard, true)
  win.visualViewport?.addEventListener('resize', plusTard)
  return () => {
    clearTimeout(t)
    win.document.removeEventListener('focusout', plusTard, true)
    win.visualViewport?.removeEventListener('resize', plusTard)
  }
}
