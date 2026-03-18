import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import Home        from './pages/Home'
import Profile     from './pages/Profile'
import Scan        from './pages/Scan'
import Cours       from './pages/Cours'
import Progres     from './pages/Progres'
import Analyse     from './pages/Analyse'
import Flashcards  from './pages/Flashcards'
import Quiz        from './pages/Quiz'
import Resume      from './pages/Resume'
import Mindmap     from './pages/MindMap'
import Welcome     from './pages/Welcome'
import Inscription from './pages/Inscription'
import Connexion   from './pages/Connexion'
import Onboarding  from './pages/Onboarding'

// Redirige vers /welcome si non connecté
function PrivateRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/welcome" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            {/* Routes publiques (accessibles sans compte) */}
            <Route path="/welcome"     element={<Welcome />} />
            <Route path="/inscription" element={<Inscription />} />
            <Route path="/connexion"   element={<Connexion />} />

            {/* Routes privées (redirige vers /welcome si non connecté) */}
            <Route path="/"            element={<PrivateRoute><Home /></PrivateRoute>} />
            <Route path="/onboarding"  element={<PrivateRoute><Onboarding /></PrivateRoute>} />
            <Route path="/cours"      element={<PrivateRoute><Cours /></PrivateRoute>} />
            <Route path="/progres"    element={<PrivateRoute><Progres /></PrivateRoute>} />
            <Route path="/profil"     element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/scan"       element={<PrivateRoute><Scan /></PrivateRoute>} />
            <Route path="/analyse"    element={<PrivateRoute><Analyse /></PrivateRoute>} />
            <Route path="/flashcards" element={<PrivateRoute><Flashcards /></PrivateRoute>} />
            <Route path="/quiz"       element={<PrivateRoute><Quiz /></PrivateRoute>} />
            <Route path="/resume"     element={<PrivateRoute><Resume /></PrivateRoute>} />
            <Route path="/mindmap"    element={<PrivateRoute><Mindmap /></PrivateRoute>} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  )
}
