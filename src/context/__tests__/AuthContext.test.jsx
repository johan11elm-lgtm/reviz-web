import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'

// ── Firebase entièrement simulé ────────────────────────────────────────
const fb = vi.hoisted(() => ({
  listeners: [],
  auth: { currentUser: null, authStateReady: vi.fn(async () => {}) },
  getDoc: vi.fn(),
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
  getDoc: (...a) => fb.getDoc(...a),
  doc: (db, ...path) => path.join('/'),
  collection: vi.fn(), getDocs: vi.fn(), deleteDoc: vi.fn(), setDoc: vi.fn(),
}))
vi.mock('../../services/firebaseConfig', () => ({ auth: fb.auth, db: {} }))
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }))

import { AuthProvider, useAuth } from '../AuthContext'

const snap = (data) => ({ exists: () => data != null, data: () => data })
// Réponses Firestore : profil + consentement, résolues à la demande.
function mockFirestore({ profile = null, consent = null } = {}) {
  fb.getDoc.mockImplementation((path) =>
    Promise.resolve(snap(path.endsWith('/consent') ? consent : profile)))
}

const johan = {
  uid: 'u1', displayName: 'Johan', email: 'j@example.com', emailVerified: true,
  providerData: [{ providerId: 'password' }], getIdToken: vi.fn(async () => 'tok'),
}

function Probe() {
  const { currentUser, isPremium, consentBlocked, loading } = useAuth()
  return (
    <div data-testid="probe">
      {`user=${currentUser?.displayName ?? 'none'} cache=${currentUser?.fromCache ? 1 : 0} premium=${isPremium} blocked=${consentBlocked} loading=${loading}`}
    </div>
  )
}
const renderProvider = () => render(<AuthProvider><Probe /></AuthProvider>)
const resolveAuth = (user) => act(async () => { await fb.listeners.at(-1)(user) })
const cacheOf = () => JSON.parse(localStorage.getItem('reviz-session'))

describe('<AuthProvider /> — démarrage optimiste', () => {
  beforeEach(() => {
    localStorage.clear()
    fb.listeners.length = 0
    fb.getDoc.mockReset()
    fb.auth.currentUser = null
  })

  it('sans cache : rien n’est rendu avant Firebase, puis session mémorisée', async () => {
    mockFirestore({ profile: { plan: 'premium', birthDate: '2000-01-01' } })
    renderProvider()
    expect(screen.queryByTestId('probe')).toBeNull()

    await resolveAuth(johan)
    expect(screen.getByTestId('probe')).toHaveTextContent('user=Johan cache=0 premium=true blocked=false loading=false')
    await waitFor(() => expect(cacheOf()).toMatchObject({ uid: 'u1', displayName: 'Johan', isPremium: true, consentBlocked: false }))
  })

  it('avec cache : rendu immédiat depuis le cache, puis remplacé par le vrai utilisateur', async () => {
    localStorage.setItem('reviz-session', JSON.stringify({
      v: 1, uid: 'u1', displayName: 'Johan', email: 'j@example.com', emailVerified: true,
      providerIds: ['password'], isPremium: true, consentBlocked: false, needsProfileSetup: false, savedAt: Date.now(),
    }))
    mockFirestore({ profile: { plan: 'free', birthDate: '2000-01-01' } })
    renderProvider()
    // Avant toute réponse Firebase : l'app est déjà là, avec l'état mémorisé.
    expect(screen.getByTestId('probe')).toHaveTextContent('user=Johan cache=1 premium=true blocked=false loading=true')

    await resolveAuth(johan)
    // Firestore a parlé : l'abonnement a expiré → premium retiré, cache mis à jour.
    expect(screen.getByTestId('probe')).toHaveTextContent('user=Johan cache=0 premium=false blocked=false loading=false')
    await waitFor(() => expect(cacheOf().isPremium).toBe(false))
  })

  it('avec cache : Firebase invalide la session → déconnecté, cache effacé', async () => {
    localStorage.setItem('reviz-session', JSON.stringify({
      v: 1, uid: 'u1', displayName: 'Johan', email: null, emailVerified: false,
      providerIds: [], isPremium: false, consentBlocked: false, needsProfileSetup: false, savedAt: Date.now(),
    }))
    renderProvider()
    expect(screen.getByTestId('probe')).toHaveTextContent('user=Johan cache=1')

    await resolveAuth(null)
    expect(screen.getByTestId('probe')).toHaveTextContent('user=none cache=0 premium=false blocked=false loading=false')
    expect(localStorage.getItem('reviz-session')).toBeNull()
    expect(fb.getDoc).not.toHaveBeenCalled()
  })

  it('cache d’un mineur bloqué : le blocage est appliqué dès le premier rendu', async () => {
    localStorage.setItem('reviz-session', JSON.stringify({
      v: 1, uid: 'u2', displayName: 'Léa', email: null, emailVerified: false,
      providerIds: [], isPremium: false, consentBlocked: true, needsProfileSetup: false, savedAt: Date.now(),
    }))
    renderProvider()
    expect(screen.getByTestId('probe')).toHaveTextContent('user=Léa cache=1 premium=false blocked=true')
  })

  it('gate : profil et consentement lus en parallèle (un seul aller-retour)', async () => {
    const pending = []
    fb.getDoc.mockImplementation(() => new Promise(resolve => pending.push(resolve)))
    renderProvider()
    let done = false
    act(() => { fb.listeners.at(-1)(johan).then(() => { done = true }) })
    // Les deux lectures sont parties avant qu'aucune n'ait répondu.
    await waitFor(() => expect(fb.getDoc).toHaveBeenCalledTimes(2))
    expect(done).toBe(false)
    await act(async () => {
      pending[0](snap({ plan: 'free', birthDate: '2015-01-01' }))
      pending[1](snap({ status: 'approved' }))
    })
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('blocked=false loading=false'))
  })

  it('mineur sans consentement approuvé → bloqué, et mémorisé tel quel', async () => {
    mockFirestore({ profile: { plan: 'free', birthDate: '2015-01-01' }, consent: { status: 'pending' } })
    renderProvider()
    await resolveAuth(johan)
    expect(screen.getByTestId('probe')).toHaveTextContent('blocked=true')
    await waitFor(() => expect(cacheOf().consentBlocked).toBe(true))
  })

  it('lecture Firestore en échec → fail-open (pas de blocage), session quand même mémorisée', async () => {
    fb.getDoc.mockRejectedValue(new Error('offline'))
    renderProvider()
    await resolveAuth(johan)
    expect(screen.getByTestId('probe')).toHaveTextContent('user=Johan cache=0 premium=false blocked=false loading=false')
    await waitFor(() => expect(cacheOf().uid).toBe('u1'))
  })
})
