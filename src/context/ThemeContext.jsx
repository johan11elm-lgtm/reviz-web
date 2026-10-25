import { createContext, useContext, useState, useEffect } from 'react'
import { DARK_THEMES, themeAffiche } from '../utils/themes'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('reviz-theme') || 'light'
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeAffiche(theme))
    localStorage.setItem('reviz-theme', theme)
  }, [theme])

  // Bascule clair/sombre de base : quitte volontairement un éventuel
  // thème Réviz+ (comportement documenté du toggle « Mode sombre »).
  const toggleTheme = () => setTheme(t => DARK_THEMES.includes(t) ? 'light' : 'dark')
  const isDark = DARK_THEMES.includes(themeAffiche(theme))

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
