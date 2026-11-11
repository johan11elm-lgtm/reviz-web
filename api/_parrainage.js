// -------------------------------------------------------
// Réviz — Parrainage (11/11, repris de Knowunity : REA-KNOWUNITY-2026-11-11.md)
//
// « Invite un ami de ta classe : 3 jours de Réviz+ pour vous deux. » Chaque élève
// a un code (6 caractères, sans 0/O ni 1/I/L). Son lien porte ?parrain=CODE ; le
// nouvel élève qui crée son compte avec ce lien (ou tape le code dans « Moi »)
// reçoit PARRAINAGE_JOURS jours de Réviz+, et le parrain aussi.
//
// Garde-fous : un code par compte ; pas son propre code ; un seul parrainage par
// compte, dans les PARRAINAGE_DELAI_JOURS jours après sa création ; le parrain est
// récompensé pour MAX_FILLEULS_RECOMPENSES amis au plus. Un abonné qui parraine ne
// gagne pas de jours (il paie déjà), son ami si.
//
// Stockage, écrit par le serveur seul (?op=parrainage dans api/track.js) :
// - users/{uid}.essaiPlus.parrainage = { code, fin, filleuls, utiliseLe } : sous
//   essaiPlus, que les règles Firestore interdisent déjà à l'app d'écrire. Aucune
//   règle à changer, et un élève ne peut pas s'offrir de jours.
// - parrainages/{CODE} = { uid, creeLe } : pour retrouver le parrain (lu par le
//   serveur seul : la règle par défaut ferme cette collection à l'app).
// Les jours offerts s'ajoutent à la fin la plus lointaine (essai ou parrainage) :
// ils ne se perdent pas pendant un essai en cours. Ils ne consomment pas l'essai de
// 7 jours (api/_essaiPlus.js), qui reste à prendre.
// Importé par l'API ET par l'app : une seule source de vérité.
// -------------------------------------------------------

export const PARRAINAGE_JOURS = 3
export const PARRAINAGE_MS = PARRAINAGE_JOURS * 24 * 60 * 60 * 1000
export const PARRAINAGE_DELAI_JOURS = 7
export const MAX_FILLEULS_RECOMPENSES = 10
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const CODE_RE = /^[A-HJKMNP-Z2-9]{6}$/

/** « ab-c 12d » → « ABC12D » : ce que l'élève tape, remis au propre (null si ce n'est pas un code). */
export function normaliserCode(saisie) {
  if (typeof saisie !== 'string') return null
  const code = saisie.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return CODE_RE.test(code) ? code : null
}

export function tirerCode(hasard = Math.random) {
  let code = ''
  for (let i = 0; i < 6; i++) code += ALPHABET[Math.floor(hasard() * ALPHABET.length)]
  return code
}

/** Le lien à partager (l'app garde le code jusqu'à la création du compte). */
export function lienParrainage(code, origine = 'https://app.revizapp.fr') {
  return `${origine}/?parrain=${code}`
}

/** users/{uid}.essaiPlus.parrainage, ou {}. */
export function parrainageDuProfil(profil) {
  const p = profil?.essaiPlus?.parrainage
  return p && typeof p === 'object' ? p : {}
}

/** Fin des jours de Réviz+ offerts par parrainage (ms), ou null. */
export function finParrainage(profil) {
  const fin = parrainageDuProfil(profil).fin
  return Number.isFinite(fin) ? fin : null
}

function finOfferteLaPlusLointaine(profil, maintenant) {
  const fins = [profil?.essaiPlus?.fin, finParrainage(profil)].filter(Number.isFinite)
  return Math.max(maintenant, ...fins)
}

async function uidDuJeton(req, auth) {
  const idToken = req.body?.idToken
  if (!idToken) return null
  try { return (await auth.verifyIdToken(idToken)).uid } catch { return null }
}

/**
 * ?op=parrainage (POST, jeton Firebase), selon body.action :
 * - 'code' : le code de l'élève (créé à la première demande).
 *   200 { code, filleuls, fin }.
 * - 'utiliser' { code } : l'élève utilise le code d'un ami.
 *   200 { fin } ; 400 CODE_INVALIDE ; 404 CODE_INCONNU ; 409 SOI_MEME | DEJA_PARRAINE | TROP_TARD.
 * 401 sans jeton valable.
 */
export async function routeParrainage(req, res, { db, auth, maintenant = Date.now(), hasard = Math.random }) {
  const uid = await uidDuJeton(req, auth)
  if (!uid) return res.status(401).json({ error: 'UNAUTHORIZED' })
  const action = req.body?.action
  if (action === 'code') return donnerCode(uid, res, { db, maintenant, hasard })
  if (action === 'utiliser') return utiliserCode(uid, req.body?.code, res, { db, auth, maintenant })
  return res.status(400).json({ error: 'ACTION' })
}

async function donnerCode(uid, res, { db, maintenant, hasard }) {
  const ref = db.collection('users').doc(uid)
  const resultat = await db.runTransaction(async tx => {
    const snap = await tx.get(ref)
    const profil = snap.exists ? snap.data() : null
    const p = parrainageDuProfil(profil)
    if (p.code) return { code: p.code, filleuls: p.filleuls ?? 0, fin: finParrainage(profil) }
    // Un code libre : 31^6 ≈ 900 millions de possibilités, une collision est rarissime.
    for (let essai = 0; essai < 5; essai++) {
      const code = tirerCode(hasard)
      const codeRef = db.collection('parrainages').doc(code)
      if ((await tx.get(codeRef)).exists) continue
      tx.set(codeRef, { uid, creeLe: maintenant })
      tx.set(ref, { essaiPlus: { parrainage: { code } } }, { merge: true })
      return { code, filleuls: 0, fin: null }
    }
    throw new Error('CODE_INTROUVABLE')
  })
  return res.status(200).json(resultat)
}

async function utiliserCode(uid, saisie, res, { db, auth, maintenant }) {
  const code = normaliserCode(saisie)
  if (!code) return res.status(400).json({ error: 'CODE_INVALIDE' })
  // Un seul parrainage, dans la semaine qui suit la création du compte.
  const cree = Date.parse((await auth.getUser(uid))?.metadata?.creationTime ?? '')
  if (!Number.isFinite(cree) || maintenant - cree > PARRAINAGE_DELAI_JOURS * 24 * 60 * 60 * 1000) {
    return res.status(409).json({ error: 'TROP_TARD' })
  }
  const resultat = await db.runTransaction(async tx => {
    const codeSnap = await tx.get(db.collection('parrainages').doc(code))
    if (!codeSnap.exists) return { status: 404, body: { error: 'CODE_INCONNU' } }
    const parrainUid = codeSnap.data()?.uid
    if (!parrainUid) return { status: 404, body: { error: 'CODE_INCONNU' } }
    if (parrainUid === uid) return { status: 409, body: { error: 'SOI_MEME' } }

    const filleulRef = db.collection('users').doc(uid)
    const parrainRef = db.collection('users').doc(parrainUid)
    const [filleulSnap, parrainSnap] = [await tx.get(filleulRef), await tx.get(parrainRef)]
    const filleul = filleulSnap.exists ? filleulSnap.data() : null
    const parrain = parrainSnap.exists ? parrainSnap.data() : null
    if (Number.isFinite(parrainageDuProfil(filleul).utiliseLe)) return { status: 409, body: { error: 'DEJA_PARRAINE' } }

    const finFilleul = finOfferteLaPlusLointaine(filleul, maintenant) + PARRAINAGE_MS
    tx.set(filleulRef, { essaiPlus: { parrainage: { fin: finFilleul, utiliseLe: maintenant } } }, { merge: true })

    const p = parrainageDuProfil(parrain)
    const filleuls = (p.filleuls ?? 0) + 1
    const recompense = parrain?.plan !== 'premium' && filleuls <= MAX_FILLEULS_RECOMPENSES
    const pourParrain = { filleuls, dernierFilleulLe: maintenant }
    if (recompense) pourParrain.fin = finOfferteLaPlusLointaine(parrain, maintenant) + PARRAINAGE_MS
    tx.set(parrainRef, { essaiPlus: { parrainage: pourParrain } }, { merge: true })
    return { status: 200, body: { fin: finFilleul } }
  })
  return res.status(resultat.status).json(resultat.body)
}
