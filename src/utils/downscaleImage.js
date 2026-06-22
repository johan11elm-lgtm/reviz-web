// -------------------------------------------------------
// Réviz — Réduction d'image avant envoi à l'IA (vision)
// Réduit le poids du payload (limite serverless ~4,5 Mo) ET le coût vision.
// Claude lit très bien jusqu'à ~1568px sur le grand côté.
// -------------------------------------------------------

const MAX_EDGE = 1568
const QUALITY = 0.85

/**
 * Redimensionne un data URL image en JPEG si nécessaire.
 * En cas d'échec (image illisible), renvoie l'original.
 * @returns {Promise<string>} data URL (image/jpeg)
 */
export function downscaleDataUrl(dataUrl, maxEdge = MAX_EDGE, quality = QUALITY) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const longEdge = Math.max(img.width, img.height)
      const scale = Math.min(1, maxEdge / longEdge)
      try {
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      } catch {
        resolve(dataUrl)
      }
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}
