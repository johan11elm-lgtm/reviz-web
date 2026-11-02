// -------------------------------------------------------
// Réviz — Accord avant d'envoyer quoi que ce soit à l'IA
// Règle 5.1.2(i) de l'App Store : l'app doit dire quelles données partent
// chez un fournisseur d'IA tiers (Anthropic) et obtenir l'accord explicite
// de l'élève AVANT le premier envoi. Demandé dans l'app native seulement
// (le site garde son parcours ; VITE_ACCORD_IA=1 pour le tester sur le web).
// L'accord est retenu sur l'appareil et se retire dans les réglages.
// -------------------------------------------------------
import { Capacitor } from '@capacitor/core'

export const ACCORD_IA_REQUIS = Capacitor.isNativePlatform() || import.meta.env.VITE_ACCORD_IA === '1'

const CLE = 'reviz-accord-ia'

export function accordIADonne() {
  try { return localStorage.getItem(CLE) === '1' } catch { return false }
}

export function retirerAccordIA() {
  try { localStorage.removeItem(CLE) } catch { /* stockage indisponible */ }
}

function enregistrer() {
  try { localStorage.setItem(CLE, '1') } catch { /* stockage indisponible : on redemandera */ }
}

// Une seule feuille à la fois : les demandes simultanées (pré-lancement du scan
// puis écran d'analyse) attendent la même réponse.
let ecouteur = null
let enAttente = null

/** La feuille (<AccordIA/>, montée une fois dans App) s'abonne ici. */
export function ecouterDemandesAccordIA(fn) {
  ecouteur = fn
  return () => { if (ecouteur === fn) ecouteur = null }
}

/**
 * Résout true si l'élève est d'accord (déjà, ou à l'instant), false sinon.
 * Sans feuille montée (tests, page hors App), on n'envoie rien.
 */
export function demanderAccordIA() {
  if (!ACCORD_IA_REQUIS || accordIADonne()) return Promise.resolve(true)
  if (enAttente) return enAttente
  if (!ecouteur) return Promise.resolve(false)
  let repondre
  const demande = new Promise(resolve => { repondre = resolve })
  enAttente = demande
  ecouteur(oui => {
    if (oui) enregistrer()
    if (enAttente === demande) enAttente = null
    repondre(oui)
  })
  return demande
}

/** À appeler juste avant un envoi à l'IA : lève ACCORD_IA_REFUSE si l'élève dit non. */
export async function exigerAccordIA() {
  if (!(await demanderAccordIA())) throw new Error('ACCORD_IA_REFUSE')
}
