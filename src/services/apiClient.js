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
      // Content-Type par défaut dès qu'un corps est présent : sans cet
      // en-tête, la couche native iOS ignore silencieusement le corps.
      headers: {
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers || {}),
      },
      // Corps transmis tel quel (string) : le natif l'accepte directement,
      // et un JSON.parse casserait tout corps non-JSON.
      data: init.body,
      responseType: 'text',
      // Un seul timeout : iOS prend le premier fourni (connect ?? read),
      // donc connect+read ensemble ramèneraient le budget à 30 s.
      connectTimeout: 120000,
    })
  } catch (err) {
    const message = err?.message || ''
    // Timeout natif → AbortError, pour que les services affichent
    // TIMEOUT et non NETWORK_ERROR (cf. aiService/chatService)
    if (err?.code === -1001 || /timed out/i.test(message)) {
      const abortErr = new Error(message || 'TIMEOUT')
      abortErr.name = 'AbortError'
      throw abortErr
    }
    // Aligne les échecs réseau natifs sur le contrat de fetch (TypeError)
    throw new TypeError(message || 'NETWORK_ERROR')
  }

  const status = res.status >= 200 && res.status <= 599 ? res.status : 599
  const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data ?? '')
  return new Response([204, 205, 304].includes(status) ? null : body, {
    status,
    headers: res.headers || {},
  })
}
