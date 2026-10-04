// -------------------------------------------------------
// Réviz — Cœur connecté (tout ce qui a besoin de Firebase)
// Chargé en différé par App.jsx : les pages publiques (/welcome, /legal)
// ne tirent ni Firebase ni AuthContext. Voir utils/publicRoutes.js.
// -------------------------------------------------------
import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, lazy } from 'react'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { resolveTheme } from './utils/themes'
import { SplashHider } from './components/SplashHider'
import { SideNav } from './components/SideNav'

// Home est le premier écran de tout élève connecté : chargée en dur dans ce
// chunk pour que le démarrage optimiste (cache de session) peigne sans
// attendre un chunk supplémentaire ni re-rendre l'arbre après une suspension.
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
const ConsentPending = lazy(() => import('./pages/ConsentPending'))
const FinishSetup    = lazy(() => import('./pages/FinishSetup'))
const NotFound       = lazy(() => import('./pages/NotFound'))
const UpgradeSuccess = lazy(() => import('./pages/UpgradeSuccess'))
const Coach          = lazy(() => import('./pages/Coach'))
const Programme      = lazy(() => import('./pages/Programme'))
const ProgrammeMatiere = lazy(() => import('./pages/ProgrammeMatiere'))
const Essai          = lazy(() => import('./pages/Essai'))
const BattleAccueil  = lazy(() => import('./pages/BattleAccueil'))
const Battle         = lazy(() => import('./pages/Battle'))

// Redirige vers /welcome si non connecté, vers /consent-pending si en attente
function PrivateRoute({ children }) {
  const { currentUser, consentBlocked, needsProfileSetup } = useAuth();
  if (!currentUser) return <Navigate to="/welcome" replace />;
  if (needsProfileSetup) return <Navigate to="/finish-setup" replace />;
  if (consentBlocked) return <Navigate to="/consent-pending" replace />;
  return children;
}

// La Battle s'ouvre aussi sans compte (invité anonyme) ; un compte connecté
// mais incomplet termine d'abord son inscription, comme ailleurs.
function BattleRoute({ children }) {
  const { currentUser, consentBlocked, needsProfileSetup } = useAuth();
  if (currentUser && needsProfileSetup) return <Navigate to="/finish-setup" replace />;
  if (currentUser && consentBlocked) return <Navigate to="/consent-pending" replace />;
  return children;
}

// Routes qui nécessitent Firebase Auth
function AuthRoutes() {
  return (
    <>
    <SplashHider />
    <SideNav />
    <Routes>
      <Route path="/inscription" element={<Inscription />} />
      <Route path="/connexion"   element={<Connexion />} />
      <Route path="/essai"       element={<Essai />} />
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
      <Route path="/programme"   element={<PrivateRoute><Programme /></PrivateRoute>} />
      <Route path="/programme/:matiere" element={<PrivateRoute><ProgrammeMatiere /></PrivateRoute>} />
      <Route path="/battle"      element={<BattleRoute><BattleAccueil /></BattleRoute>} />
      <Route path="/battle/:code" element={<BattleRoute><Battle /></BattleRoute>} />
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

export default function AuthShell() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ThemeGate />
        <AuthRoutes />
      </ThemeProvider>
    </AuthProvider>
  )
}
