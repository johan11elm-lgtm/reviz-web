import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary'
import { SplashHider } from './components/SplashHider'
import { ConsentBanner } from './components/ConsentBanner'
import { loadAuthShell } from './loadAuthShell'

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    ['.content', '.pg-content'].forEach(sel => {
      document.querySelector(sel)?.scrollTo(0, 0);
    });
  }, [pathname]);
  return null;
}

// Pages publiques (pas de Firebase nécessaire) — dans le chunk d'entrée.
import Welcome from './pages/Welcome'
const Legal = lazy(() => import('./pages/Legal'))

// Autres pages publiques (lazy, sans Firebase)
const Avis           = lazy(() => import('./pages/Avis'))
const Profs          = lazy(() => import('./pages/Profs'))
const Installer      = lazy(() => import('./pages/Installer'))

// Cœur connecté (AuthContext, Firebase, Home et toutes les pages privées) :
// un chunk à part, chargé seulement hors des pages publiques. Sur /welcome,
// un visiteur ne télécharge ni n'exécute Firebase. Hors pages publiques,
// main.jsx lance ce chargement dès le boot (avant même le premier render)
// pour ne pas allonger le démarrage optimiste des élèves connectés.
const AuthShell = lazy(loadAuthShell)

// Fallback minimal pendant le chargement
function LoadingFallback() {
  return (
    <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 24, height: 24, border: '3px solid var(--border)', borderTopColor: 'var(--text-primary)', borderRadius: '50%', animation: 'spin .6s linear infinite' }} />
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ScrollToTop />
        {/* Consentement à la mesure d'audience : hors Suspense et hors Auth,
            visible dès la première page, publique ou non. */}
        <ConsentBanner />
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Routes publiques — pas de Firebase chargé (cf. utils/publicRoutes.js) */}
            <Route path="/welcome"     element={<><SplashHider /><Welcome /></>} />
            <Route path="/legal/:page" element={<><SplashHider /><Legal /></>} />
            <Route path="/avis"        element={<><SplashHider /><Avis /></>} />
            <Route path="/profs"       element={<><SplashHider /><Profs /></>} />
            <Route path="/installer"   element={<><SplashHider /><Installer /></>} />

            {/* Toutes les autres routes — Firebase via AuthProvider, dans AuthShell */}
            <Route path="/*" element={<AuthShell />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
