import { createContext, useContext, useState, useEffect } from 'react'
import { DARK_THEMES } from '../utils/themes'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('reviz-theme') || 'light'
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('reviz-theme', theme)
  }, [theme])

  // Bascule clair/sombre de base : quitte volontairement un éventuel
  // thème Réviz+ (comportement documenté du toggle « Mode sombre »).
  const toggleTheme = () => setTheme(t => DARK_THEMES.includes(t) ? 'light' : 'dark')
  const isDark = DARK_THEMES.includes(theme)

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
