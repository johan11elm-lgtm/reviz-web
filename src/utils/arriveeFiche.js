// -------------------------------------------------------
// Réviz — Chapitre d'arrivée (11/11, repris de Knowunity : REA-KNOWUNITY-2026-11-11.md)
// Un élève arrive par une fiche publique (revizapp.fr/fiches/…, Google ou ChatGPT) : le lien
// porte ?classe&matiere&chapitre (Essai.jsx). On garde ce chapitre sur l'appareil 7 jours :
// s'il crée un compte, la découverte lui propose de reprendre ce chapitre plutôt que la séance
// d'accueil générique.
// -------------------------------------------------------
const CLE = 'reviz-arrivee'
const DUREE_MS = 7 * 24 * 60 * 60 * 1000
const SLUG = /^[a-z0-9-]{1,80}$/

export function noterArrivee({ classe, matiere, chapitre }, maintenant = Date.now()) {
  if (!classe || !SLUG.test(matiere ?? '') || !SLUG.test(chapitre ?? '')) return
  try { localStorage.setItem(CLE, JSON.stringify({ classe, matiere, chapitre, t: maintenant })) } catch { /* stockage indisponible */ }
}

/** Le chapitre d'arrivée encore frais, pour cette classe ; sinon null. */
export function arriveeRecente(classe, maintenant = Date.now()) {
  try {
    const a = JSON.parse(localStorage.getItem(CLE) || 'null')
    if (!a || !Number.isFinite(a.t) || maintenant - a.t > DUREE_MS) return null
    if (classe && a.classe !== classe) return null
    if (!SLUG.test(a.matiere ?? '') || !SLUG.test(a.chapitre ?? '')) return null
    return { classe: a.classe, matiere: a.matiere, chapitre: a.chapitre }
  } catch {
    return null
  }
}

export function oublierArrivee() {
  try { localStorage.removeItem(CLE) } catch { /* rien */ }
}
