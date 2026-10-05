import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'

// ── Firebase entièrement simulé ────────────────────────────────────────
// `configLoaded` passe à true dès que quelqu'un importe firebaseConfig :
// c'est la preuve que Firebase a été tiré (ou non) par la route rendue.
const fb = vi.hoisted(() => ({
  configLoaded: false,
  listeners: [],
  auth: { currentUser: null, authStateReady: vi.fn(async () => {}) },
}))
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (auth, cb) => { fb.listeners.push(cb); return () => {} },
  createUserWithEmailAndPassword: vi.fn(), signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(async () => {}), updateProfile: vi.fn(), updateEmail: vi.fn(),
  updatePassword: vi.fn(), reauthenticateWithCredential: vi.fn(),
  EmailAuthProvider: { credential: vi.fn() }, sendPasswordResetEmail: vi.fn(),
  sendEmailVerification: vi.fn(), GoogleAuthProvider: class { static credential() {} },
  signInWithPopup: vi.fn(), signInWithCredential: vi.fn(), deleteUser: vi.fn(),
}))
vi.mock('firebase/firestore', () => ({
  getDoc: vi.fn(async () => ({ exists: () => false, data: () => null })),
  doc: (db, ...path) => path.join('/'),
  collection: vi.fn(), getDocs: vi.fn(), deleteDoc: vi.fn(), setDoc: vi.fn(),
  addDoc: vi.fn(), serverTimestamp: vi.fn(), query: vi.fn(), orderBy: vi.fn(),
}))
vi.mock('../services/firebaseConfig', () => {
  fb.configLoaded = true
  return { auth: fb.auth, db: {} }
})
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }))

import App from '../App'

describe('<App />', () => {
  beforeEach(() => {
    localStorage.clear()
    fb.listeners.length = 0
  })

  it('renders the welcome page at /welcome — sans charger Firebase', () => {
    window.history.replaceState({}, '', '/welcome')
    render(<App />)
    expect(screen.getByText(/Révise mieux/i)).toBeInTheDocument()
    // La page publique ne tire ni AuthContext ni Firebase.
    expect(fb.configLoaded).toBe(false)
    expect(fb.listeners).toHaveLength(0)
  })

  it('affiche la première étape de /inscription — sans charger Firebase', async () => {
    window.history.replaceState({}, '', '/inscription')
    render(<App />)
    // La page est en chunk à part (lazy) : on attend son premier écran…
    expect(await screen.findByText('Quel est ton prénom ?')).toBeInTheDocument()
    // …qui n'a tiré ni AuthContext ni Firebase (chargés à la création du compte).
    expect(fb.configLoaded).toBe(false)
    expect(fb.listeners).toHaveLength(0)
  })

  it('charge le cœur connecté (Firebase) hors des pages publiques', async () => {
    window.history.replaceState({}, '', '/connexion')
    render(<App />)
    // Le chunk AuthShell arrive, AuthProvider s'abonne à Firebase…
    await waitFor(() => expect(fb.listeners).toHaveLength(1))
    expect(fb.configLoaded).toBe(true)
    // …et une fois la session tranchée (personne), la page Connexion s'affiche.
    await act(async () => { await fb.listeners.at(-1)(null) })
    expect(await screen.findByRole('button', { name: /^Se connecter$/ })).toBeInTheDocument()
  })
})
