// -------------------------------------------------------
// Réviz — Connexions qui passent par le serveur
// Une seule route (limite de fonctions Vercel) pour deux usages :
//
// POST /api/auth { action: 'natif', idToken }
//   App iOS, Microsoft : Firebase refuse les jetons Microsoft dans
//   signInWithCredential côté JS. L'app se connecte côté natif, envoie
//   son jeton d'identité Firebase, et reçoit un jeton personnalisé pour
//   ouvrir la même session dans le SDK JS (signInWithCustomToken).
//
// GET /api/auth?action=tiktok        → redirige vers TikTok (Login Kit)
// GET /api/auth?code=…&state=…       → retour de TikTok (redirect_uri)
//   TikTok n'est pas un fournisseur Firebase : on vérifie le code, on
//   crée/retrouve le compte `tiktok:<open_id>`, puis on renvoie sur
//   /connexion#tiktok=<jeton personnalisé>.
// -------------------------------------------------------
import { randomBytes, timingSafeEqual } from 'node:crypto'
import { getAuthAdmin } from './_firebaseAdmin.js'

export const config = { maxDuration: 30 }

const BASE_URL = process.env.APP_URL || 'https://app.revizapp.fr'
const REDIRECT_URI = `${BASE_URL}/api/auth`
// Connexion native trop ancienne → on refuse (jeton rejoué).
const FRAICHEUR_MAX_S = 5 * 60
const COOKIE_STATE = 'reviz_tiktok_state'

function safeEqual(a, b) {
  const ab = Buffer.from(String(a))
  const bb = Buffer.from(String(b))
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

function lireCookie(req, nom) {
  const brut = req.headers?.cookie ?? ''
  for (const part of brut.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === nom) return decodeURIComponent(v.join('='))
  }
  return null
}

function rediriger(res, url) {
  res.statusCode = 302
  res.setHeader('Location', url)
  res.setHeader('Cache-Control', 'no-store')
  return res.end()
}

const retourConnexion = (fragment) => `${BASE_URL}/connexion#${fragment}`

// --- App native : jeton Firebase natif → jeton personnalisé ---
async function sessionNative(req, res) {
  const { idToken } = req.body ?? {}
  if (!idToken) return res.status(401).json({ error: 'Unauthorized' })
  let decoded
  try {
    decoded = await getAuthAdmin().verifyIdToken(idToken, true)
  } catch {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  if (decoded.firebase?.sign_in_provider !== 'microsoft.com') {
    return res.status(403).json({ error: 'PROVIDER' })
  }
  if (Date.now() / 1000 - decoded.auth_time > FRAICHEUR_MAX_S) {
    return res.status(401).json({ error: 'STALE' })
  }
  try {
    const customToken = await getAuthAdmin().createCustomToken(decoded.uid)
    return res.status(200).json({ customToken })
  } catch (err) {
    console.error('[auth] natif', err?.message)
    return res.status(500).json({ error: 'SERVER' })
  }
}

// --- TikTok : départ ---
function tiktokDepart(res) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY
  if (!clientKey) return rediriger(res, retourConnexion('tiktok_erreur=config'))
  const state = randomBytes(24).toString('hex')
  res.setHeader('Set-Cookie',
    `${COOKIE_STATE}=${state}; Path=/api/auth; Max-Age=600; HttpOnly; Secure; SameSite=Lax`)
  const url = new URL('https://www.tiktok.com/v2/auth/authorize/')
  url.search = new URLSearchParams({
    client_key: clientKey,
    scope: 'user.info.basic',
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    state,
  }).toString()
  return rediriger(res, url.toString())
}

// --- TikTok : retour ---
async function tiktokRetour(req, res) {
  const { code, state, error } = req.query ?? {}
  const attendu = lireCookie(req, COOKIE_STATE)
  res.setHeader('Set-Cookie', `${COOKIE_STATE}=; Path=/api/auth; Max-Age=0; HttpOnly; Secure; SameSite=Lax`)
  if (error) return rediriger(res, retourConnexion('tiktok_erreur=annule'))
  if (!code || !state || !attendu || !safeEqual(state, attendu)) {
    return rediriger(res, retourConnexion('tiktok_erreur=state'))
  }

  try {
    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY,
        client_secret: process.env.TIKTOK_CLIENT_SECRET,
        code: String(code),
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
      }),
    })
    const jeton = await tokenRes.json()
    if (!tokenRes.ok || !jeton.access_token || !jeton.open_id) throw new Error('TOKEN')

    const infoRes = await fetch(
      'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name',
      { headers: { Authorization: `Bearer ${jeton.access_token}` } },
    )
    const info = await infoRes.json().catch(() => ({}))
    const displayName = info?.data?.user?.display_name?.slice(0, 40) || undefined

    const uid = `tiktok:${jeton.open_id}`
    const authAdmin = getAuthAdmin()
    try {
      await authAdmin.getUser(uid)
    } catch (err) {
      if (err?.code !== 'auth/user-not-found') throw err
      await authAdmin.createUser({ uid, displayName })
    }
    const customToken = await authAdmin.createCustomToken(uid, { provider: 'tiktok' })
    return rediriger(res, retourConnexion(`tiktok=${encodeURIComponent(customToken)}`))
  } catch (err) {
    console.error('[auth] TikTok', err?.message)
    return rediriger(res, retourConnexion('tiktok_erreur=serveur'))
  }
}

export default async function handler(req, res) {
  if (req.method === 'POST' && req.body?.action === 'natif') return sessionNative(req, res)
  if (req.method === 'GET') {
    const q = req.query ?? {}
    if (q.code || q.error) return tiktokRetour(req, res)
    if (q.action === 'tiktok') return tiktokDepart(res)
  }
  return res.status(405).end()
}
