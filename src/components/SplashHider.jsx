import { useEffect } from 'react'
import { hideSplash } from '../services/splash'

// Retire l'écran de lancement natif une fois le premier écran réellement
// peint : deux frames après le montage, le rendu est visible sous le fondu.
// À placer uniquement dans un sous-arbre qui n'est monté qu'avec du contenu
// (les pages publiques et les routes authentifiées). Inerte sur le web.
export function SplashHider() {
  useEffect(() => {
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => { hideSplash() })
    })
    return () => cancelAnimationFrame(raf)
  }, [])
  return null
}
