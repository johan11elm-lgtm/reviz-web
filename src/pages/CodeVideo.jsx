import { Navigate, useParams } from 'react-router-dom'
import { CODES_VIDEO, lienEssai, normaliserCode } from '../utils/codesVideo'
import { setProvenance } from '../services/statsService'

/**
 * Adresse courte d'une vidéo : revizapp.fr/vf6 → app.revizapp.fr/v/vf6 → ici.
 * Retient la provenance (via + code) pour les événements qui suivent, puis
 * ouvre l'essai sans compte sur le chapitre de la vidéo (utils/codesVideo.js).
 */
export default function CodeVideo() {
  const { code } = useParams()
  const c = normaliserCode(code)
  const e = c ? CODES_VIDEO[c] : null
  setProvenance(e ? e.via : 'reseaux', e ? c : null)
  return <Navigate to={lienEssai(c)} replace />
}
