import { createContext, useContext, useState, useEffect } from 'react'
import { themeAffiche, modeInitial, estSombre } from '../utils/themes'

const ThemeContext = createContext()

const requeteSombre = () => typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('reviz-theme') || 'light'
  )
  // Clair / Sombre / Auto, à part du thème (un thème Réviz+ reste choisi quand on passe en sombre).
  const [mode, setMode] = useState(
    () => modeInitial(localStorage.getItem('reviz-mode'), localStorage.getItem('reviz-theme'))
  )
  const [appareilSombre, setAppareilSombre] = useState(() => !!requeteSombre()?.matches)

  useEffect(() => {
    const q = requeteSombre()
    if (!q) return
    const suivre = e => setAppareilSombre(e.matches)
    q.addEventListener?.('change', suivre)
    return () => q.removeEventListener?.('change', suivre)
  }, [])

  const isDark = estSombre(mode, appareilSombre)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeAffiche(theme, isDark))
    localStorage.setItem('reviz-theme', theme)
    localStorage.setItem('reviz-mode', mode)
  }, [theme, mode, isDark])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, mode, setMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
