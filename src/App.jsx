import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { resolveTheme } from './utils/themes'
import { ErrorBoundary } from './components/ErrorBoundary'
import { SplashHider } from './components/SplashHider'

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

// Pages publiques (pas de Firebase nécessaire)
import Welcome from './pages/Welcome'
// Home est le premier écran de tout élève connecté : chargée en dur pour
// que le démarrage optimiste (cache de session) peigne sans attendre un
// chunk ni re-rendre l'arbre après une suspension.
import Home from './pages/Home'

// Pages lazy-loaded
const Inscription    = lazy(() => import('./pages/Inscription'))
const Connexion      = lazy(() => import('./pages/Connexion'))
const Profile        = lazy(() => import('./pages/Profile'))
const Reglages       = lazy(() => import('./pages/Reglages'))
const Scan           = lazy(() => import('./pages/Scan'))
const Cours          = lazy(() => import('./pages/Cours'))
const Progres        = lazy(() => import('./pages/Progres'))
const Analyse        = lazy(() => import('./pages/Analyse'))
const Flashcards     = lazy(() => import('./pages/Flashcards'))
const Quiz           = lazy(() => import('./pages/Quiz'))
const Resume         = lazy(() => import('./pages/Resume'))
const Mindmap        = lazy(() => import('./pages/MindMap'))
const Onboarding     = lazy(() => import('./pages/Onboarding'))
const VerifyEmail    = lazy(() => import('./pages/VerifyEmail'))
const Legal          = lazy(() => import('./pages/Legal'))
const ConsentPending = lazy(() => import('./pages/ConsentPending'))
const FinishSetup    = lazy(() => import('./pages/FinishSetup'))
const NotFound       = lazy(() => import('./pages/NotFound'))
const UpgradeSuccess = lazy(() => import('./pages/UpgradeSuccess'))
const Coach          = lazy(() => import('./pages/Coach'))

// Fallback minimal pendant le chargement
function LoadingFallback() {
  return (
    <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 24, height: 24, border: '3px solid var(--border)', borderTopColor: 'var(--text-primary)', borderRadius: '50%', animation: 'spin .6s linear infinite' }} />
    </div>
  )
}

// Redirige vers /welcome si non connecté, vers /consent-pending si en attente
function PrivateRoute({ children }) {
  const { currentUser, consentBlocked, needsProfileSetup } = useAuth();
  if (!currentUser) return <Navigate to="/welcome" replace />;
  if (needsProfileSetup) return <Navigate to="/finish-setup" replace />;
  if (consentBlocked) return <Navigate to="/consent-pending" replace />;
  return children;
}

// Routes qui nécessitent Firebase Auth
function AuthRoutes() {
  return (
    <>
    <SplashHider />
    <Routes>
      <Route path="/inscription" element={<Inscription />} />
      <Route path="/connexion"   element={<Connexion />} />
      <Route path="/consent-pending" element={<ConsentPending />} />
      <Route path="/finish-setup" element={<FinishSetup />} />
      <Route path="/verify-email" element={<PrivateRoute><VerifyEmail /></PrivateRoute>} />
      <Route path="/"            element={<PrivateRoute><Home /></PrivateRoute>} />
      <Route path="/onboarding"  element={<PrivateRoute><Onboarding /></PrivateRoute>} />
      <Route path="/cours"       element={<PrivateRoute><Cours /></PrivateRoute>} />
      <Route path="/progres"     element={<PrivateRoute><Progres /></PrivateRoute>} />
      <Route path="/profil"      element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="/reglages"    element={<PrivateRoute><Reglages /></PrivateRoute>} />
      <Route path="/scan"        element={<PrivateRoute><Scan /></PrivateRoute>} />
      <Route path="/analyse"     element={<PrivateRoute><Analyse /></PrivateRoute>} />
      <Route path="/flashcards"  element={<PrivateRoute><Flashcards /></PrivateRoute>} />
      <Route path="/quiz"        element={<PrivateRoute><Quiz /></PrivateRoute>} />
      <Route path="/resume"      element={<PrivateRoute><Resume /></PrivateRoute>} />
      <Route path="/mindmap"     element={<PrivateRoute><Mindmap /></PrivateRoute>} />
      <Route path="/upgrade-success" element={<PrivateRoute><UpgradeSuccess /></PrivateRoute>} />
      <Route path="/coach"       element={<PrivateRoute><Coach /></PrivateRoute>} />
      <Route path="*"            element={<NotFound />} />
    </Routes>
    </>
  )
}

// Repli de thème : un thème Réviz+ persisté sans abonnement actif
// (expiré, déconnexion…) retombe silencieusement sur « Crème ».
function ThemeGate() {
  const { isPremium } = useAuth();
  const { theme, setTheme } = useTheme();
  useEffect(() => {
    const resolved = resolveTheme(theme, isPremium);
    if (resolved !== theme) setTheme(resolved);
  }, [theme, isPremium, setTheme]);
  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ScrollToTop />
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Routes publiques — pas de Firebase chargé */}
            <Route path="/welcome"     element={<><SplashHider /><Welcome /></>} />
            <Route path="/legal/:page" element={<><SplashHider /><Legal /></>} />

            {/* Toutes les autres routes — Firebase via AuthProvider */}
            <Route path="/*" element={
              <AuthProvider>
                <ThemeProvider>
                  <ThemeGate />
                  <AuthRoutes />
                </ThemeProvider>
              </AuthProvider>
            } />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
