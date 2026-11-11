// -------------------------------------------------------
// Réviz — Parrainage côté app (règles et serveur : api/_parrainage.js)
// Le lien d'un ami porte ?parrain=CODE : l'app garde le code sur l'appareil
// jusqu'à la création du compte, puis le serveur offre 3 jours de Réviz+ aux
// deux élèves. Le code attendu est oublié dès que le serveur a répondu (accepté
// ou refusé) ; il reste en cas de souci réseau, pour réessayer à la prochaine
// ouverture.
// -------------------------------------------------------
import { normaliserCode } from '../../api/_parrainage.js'

const CLE = 'reviz-parrain'

/** Garde le code du lien (?parrain=CODE) s'il y en a un. Renvoie le code gardé, ou null. */
export function capterCodeParrain(search = typeof window !== 'undefined' ? window.location.search : '') {
  let code = null
  try { code = normaliserCode(new URLSearchParams(search).get('parrain')) } catch { /* adresse illisible */ }
  if (!code) return null
  try { localStorage.setItem(CLE, code) } catch { /* stockage indisponible */ }
  return code
}

export function codeParrainEnAttente() {
  try { return normaliserCode(localStorage.getItem(CLE)) } catch { return null }
}

export function oublierCodeParrain() {
  try { localStorage.removeItem(CLE) } catch { /* rien */ }
}

/** Ce que l'élève a déjà vu de son parrainage, pour n'annoncer qu'une fois chaque bonne nouvelle. */
const cleVu = uid => `reviz-parrainage-vu-${uid}`
export function parrainageVu(uid) {
  try {
    const v = JSON.parse(localStorage.getItem(cleVu(uid)) || 'null')
    return { recu: !!v?.recu, filleuls: Number.isInteger(v?.filleuls) ? v.filleuls : 0 }
  } catch {
    return { recu: false, filleuls: 0 }
  }
}
export function noterParrainageVu(uid, vu) {
  try { localStorage.setItem(cleVu(uid), JSON.stringify(vu)) } catch { /* rien */ }
}

/** Message d'erreur pour la saisie d'un code. */
export function messageErreurParrainage(code) {
  switch (code) {
    case 'CODE_INVALIDE': return 'Un code, c’est 6 lettres et chiffres.'
    case 'CODE_INCONNU': return 'Ce code n’existe pas. Vérifie-le avec ton ami.'
    case 'SOI_MEME': return 'C’est ton propre code : envoie-le plutôt à un ami.'
    case 'DEJA_PARRAINE': return 'Tu as déjà utilisé le code d’un ami.'
    case 'TROP_TARD': return 'Un code d’ami s’utilise dans la semaine qui suit la création du compte.'
    default: return 'Le code n’a pas pu être vérifié. Réessaie dans un instant.'
  }
}
