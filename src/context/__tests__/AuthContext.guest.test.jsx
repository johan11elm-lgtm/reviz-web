import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'

// ── Firebase entièrement simulé (même recette que AuthContext.test.jsx) ──
const fb = vi.hoisted(() => ({
  listeners: [],
  auth: { currentUser: null, authStateReady: vi.fn(async () => {}) },
  getDoc: vi.fn(),
  setDoc: vi.fn(async () => {}),
}))
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (auth, cb) => { fb.listeners.push(cb); return () => {} },
  createUserWithEmailAndPassword: vi.fn(), signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(async () => {}), updateProfile: vi.fn(), updateEmail: vi.fn(),
  updatePassword: vi.fn(), reauthenticateWithCredential: vi.fn(),
  EmailAuthProvider: { credential: vi.fn() }, sendPasswordResetEmail: vi.fn(),
  sendEmailVerification: vi.fn(), GoogleAuthProvider: class { static credential() {} },
  signInWithPopup: vi.fn(), signInWithCredential: vi.fn(), deleteUser: vi.fn(),
  OAuthProvider: class {}, signInWithCustomToken: vi.fn(), revokeAccessToken: vi.fn(),
}))
vi.mock('firebase/firestore', () => ({
  getDoc: (...a) => fb.getDoc(...a),
  setDoc: (...a) => fb.setDoc(...a),
  doc: (db, ...path) => path.join('/'),
  collection: vi.fn(), getDocs: vi.fn(), deleteDoc: vi.fn(), query: vi.fn(), orderBy: vi.fn(),
}))
vi.mock('../../services/firebaseConfig', () => ({ auth: fb.auth, db: {} }))
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }))

import { AuthProvider, useAuth } from '../AuthContext'
import { startGuest, readGuest } from '../../services/guestService'

const level = { cycle: 'college', classe: '3ème' }
const snap = (data) => ({ exists: () => data != null, data: () => data })

function Probe() {
  const { currentUser, isGuest, loading, getUserLevel, loginAsGuest, logout } = useAuth()
  return (
    <div>
      <div data-testid="probe">
        {`user=${currentUser?.displayName ?? 'none'} uid=${currentUser?.uid ?? '-'} guest=${isGuest} loading=${loading} classe=${getUserLevel()?.classe ?? '-'}`}
      </div>
      <button type="button" onClick={() => loginAsGuest({ prenom: 'Léa', level })}>essai</button>
      <button type="button" onClick={() => logout()}>logout</button>
    </div>
  )
}
const probe = () => screen.getByTestId('probe').textContent
const renderProvider = () => render(<AuthProvider><Probe /></AuthProvider>)
const resolveAuth = (user) => act(async () => { await fb.listeners.at(-1)(user) })

beforeEach(() => {
  localStorage.clear()
  fb.listeners.length = 0
  fb.getDoc.mockReset()
  fb.getDoc.mockImplementation(() => Promise.resolve(snap(null)))
  fb.setDoc.mockClear()
  fb.auth.currentUser = null
})

describe('<AuthProvider /> — mode essai', () => {
  it('un invité enregistré est rendu tout de suite et reste après « personne » côté Firebase', async () => {
    startGuest({ prenom: 'Léa', level })
    renderProvider()
    expect(probe()).toContain('user=Léa')
    expect(probe()).toContain('guest=true')
    expect(probe()).toContain('classe=3ème')
    await resolveAuth(null)
    expect(probe()).toContain('user=Léa')
    expect(probe()).toContain('guest=true')
    expect(probe()).toContain('loading=false')
    // Un invité n'est jamais mis en cache de session
    expect(localStorage.getItem('reviz-session')).toBeNull()
  })

  it('loginAsGuest démarre la session, logout la termine', async () => {
    renderProvider()
    await resolveAuth(null)
    expect(probe()).toContain('user=none')
    await act(async () => { screen.getByText('essai').click() })
    expect(probe()).toContain('user=Léa')
    expect(probe()).toContain('guest=true')
    expect(readGuest()?.prenom).toBe('Léa')
    await act(async () => { screen.getByText('logout').click() })
    expect(probe()).toContain('user=none')
    expect(probe()).toContain('guest=false')
    expect(readGuest()).toBeNull()
  })

  it('quand un vrai compte se connecte, la progression de l’invité suit et l’invité disparaît', async () => {
    const g = startGuest({ prenom: 'Léa', level })
    localStorage.setItem(`reviz-lessons-${g.uid}`, JSON.stringify([{ id: 'prog-thales', metadata: { title: 'Thalès' } }]))
    localStorage.setItem(`reviz-revisions-${g.uid}`, JSON.stringify([{ id: 'r1', type: 'quiz', lessonId: 'prog-thales', revisedAt: 1 }]))
    renderProvider()
    const user = {
      uid: 'u1', displayName: 'Léa', email: 'l@example.com', emailVerified: true,
      providerData: [{ providerId: 'password' }], getIdToken: vi.fn(async () => 'tok'),
    }
    fb.auth.currentUser = user
    await resolveAuth(user)
    expect(probe()).toContain('uid=u1')
    expect(probe()).toContain('guest=false')
    expect(probe()).toContain('classe=3ème')
    expect(readGuest()).toBeNull()
    expect(JSON.parse(localStorage.getItem('reviz-lessons-u1'))[0].id).toBe('prog-thales')
    const paths = fb.setDoc.mock.calls.map(c => c[0])
    expect(paths).toContain('users/u1/lessons/prog-thales')
    expect(paths).toContain('users/u1/revisions/r1')
  })

  it('un compte dont le navigateur ignore la classe la retrouve dans son profil Firestore', async () => {
    fb.getDoc.mockImplementation((path) => Promise.resolve(
      snap(path.endsWith('/consent') ? null : { level: { cycle: 'college', classe: '4ème' }, plan: 'free' })
    ))
    renderProvider()
    const user = {
      uid: 'u2', displayName: 'Noé', email: 'n@example.com', emailVerified: true,
      providerData: [{ providerId: 'password' }], getIdToken: vi.fn(async () => 'tok'),
    }
    fb.auth.currentUser = user
    await resolveAuth(user)
    expect(probe()).toContain('classe=4ème')
    expect(JSON.parse(localStorage.getItem('reviz-level-u2'))).toEqual({ cycle: 'college', classe: '4ème' })
  })
})
