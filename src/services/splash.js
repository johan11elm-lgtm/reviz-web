// -------------------------------------------------------
// Réviz — Écran de lancement natif (@capacitor/splash-screen)
//
// Le plugin est configuré en `launchAutoHide: false` : l'écran de
// lancement reste affiché par-dessus la WebView jusqu'à ce que l'app
// ait réellement peint son premier écran (voir <SplashHider />), puis
// se retire en fondu. Sur le web, ce module est inerte.
// -------------------------------------------------------
import { Capacitor } from '@capacitor/core'

let hidden = false

export async function hideSplash() {
  if (hidden) return
  hidden = true
  if (!Capacitor.isNativePlatform()) return
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide({ fadeOutDuration: 250 })
  } catch {
    /* plugin indisponible : l'écran de lancement s'est déjà retiré */
  }
}
