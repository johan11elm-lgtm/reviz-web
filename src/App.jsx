import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'

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

// Pages chargées immédiatement (auth flow critique)
import Welcome     from './pages/Welcome'
import Inscription from './pages/Inscription'
import Connexion   from './pages/Connexion'

// Pages lazy-loaded (code splitting)
const Home        = lazy(() => import('./pages/Home'))
const Profile     = lazy(() => import('./pages/Profile'))
const Scan        = lazy(() => import('./pages/Scan'))
const Cours       = lazy(() => import('./pages/Cours'))
const Progres     = lazy(() => import('./pages/Progres'))
const Analyse     = lazy(() => import('./pages/Analyse'))
const Flashcards  = lazy(() => import('./pages/Flashcards'))
const Quiz        = lazy(() => import('./pages/Quiz'))
const Resume      = lazy(() => import('./pages/Resume'))
const Mindmap     = lazy(() => import('./pages/MindMap'))
const Onboarding      = lazy(() => import('./pages/Onboarding'))
const VerifyEmail     = lazy(() => import('./pages/VerifyEmail'))
const Legal           = lazy(() => import('./pages/Legal'))
const Brevet          = lazy(() => import('./pages/Brevet'))
const ConsentPending  = lazy(() => import('./pages/ConsentPending'))

// Fallback minimal pendant le chargement
function LoadingFallback() {
  return (
    <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 24, height: 24, border: '3px solid var(--border)', borderTopColor: 'var(--text-primary)', borderRadius: '50%', animation: 'spin .6s linear infinite' }} />
    </div>
  )
}

// Redirige vers /welcome si non connecté, vers /consent-pending si en attente de consentement parental
function PrivateRoute({ children }) {
  const { currentUser, consentPending } = useAuth();
  if (!currentUser) return <Navigate to="/welcome" replace />;
  if (consentPending) return <Navigate to="/consent-pending" replace />;
  return children;
}

export default function App() {
  return (
    <ErrorBoundary>
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ScrollToTop />
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Routes publiques (accessibles sans compte) */}
              <Route path="/welcome"     element={<Welcome />} />
              <Route path="/inscription" element={<Inscription />} />
              <Route path="/connexion"   element={<Connexion />} />

              {/* Pages légales (accessibles sans compte) */}
              <Route path="/legal/:page" element={<Legal />} />

              <Route path="/verify-email"     element={<PrivateRoute><VerifyEmail /></PrivateRoute>} />
              <Route path="/consent-pending" element={<ConsentPending />} />

              {/* Routes privées (redirige vers /welcome si non connecté) */}
              <Route path="/"            element={<PrivateRoute><Home /></PrivateRoute>} />
              <Route path="/onboarding"  element={<PrivateRoute><Onboarding /></PrivateRoute>} />
              <Route path="/cours"       element={<PrivateRoute><Cours /></PrivateRoute>} />
              <Route path="/progres"     element={<PrivateRoute><Progres /></PrivateRoute>} />
              <Route path="/profil"      element={<PrivateRoute><Profile /></PrivateRoute>} />
              <Route path="/scan"        element={<PrivateRoute><Scan /></PrivateRoute>} />
              <Route path="/analyse"     element={<PrivateRoute><Analyse /></PrivateRoute>} />
              <Route path="/flashcards"  element={<PrivateRoute><Flashcards /></PrivateRoute>} />
              <Route path="/quiz"        element={<PrivateRoute><Quiz /></PrivateRoute>} />
              <Route path="/resume"      element={<PrivateRoute><Resume /></PrivateRoute>} />
              <Route path="/mindmap"     element={<PrivateRoute><Mindmap /></PrivateRoute>} />
              <Route path="/brevet"      element={<PrivateRoute><Brevet /></PrivateRoute>} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
    </ErrorBoundary>
  )
}
