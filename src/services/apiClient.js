// -------------------------------------------------------
// Réviz — Client API (proxy Vercel)
// Web : fetch same-origin classique ('/api/...').
// App native (Capacitor) : URL absolue (VITE_API_BASE) via la
// couche HTTP native (CapacitorHttp), qui n'est pas soumise au
// CORS — aucune en-tête à ajouter côté serveur.
// -------------------------------------------------------
import { Capacitor, CapacitorHttp } from '@capacitor/core'

export const IS_NATIVE = Capacitor.isNativePlatform()

const API_BASE = import.meta.env.VITE_API_BASE || ''

export function apiUrl(path) {
  return /^https?:/i.test(path) ? path : API_BASE + path
}

/**
 * Remplaçant de fetch() pour les appels /api/* : même signature,
 * retourne une Response standard — seul le transport change en natif.
 * En natif, `init.signal` est ignoré (timeouts natifs à la place) et
 * la réponse arrive en un bloc (pas de streaming progressif).
 */
export async function apiFetch(path, init = {}) {
  const url = apiUrl(path)
  if (!IS_NATIVE) return fetch(url, init)

  let res
  try {
    res = await CapacitorHttp.request({
      url,
      method: init.method || 'GET',
      headers: init.headers || {},
      data: init.body !== undefined ? JSON.parse(init.body) : undefined,
      responseType: 'text',
      connectTimeout: 30000,
      readTimeout: 120000,
    })
  } catch (err) {
    // Aligne les échecs réseau natifs sur le contrat de fetch (TypeError)
    throw new TypeError(err?.message || 'NETWORK_ERROR')
  }

  const status = res.status >= 200 && res.status <= 599 ? res.status : 599
  const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data ?? '')
  return new Response([204, 205, 304].includes(status) ? null : body, {
    status,
    headers: res.headers || {},
  })
}
