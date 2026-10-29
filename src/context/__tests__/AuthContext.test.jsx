import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'

// ── Firebase entièrement simulé ────────────────────────────────────────
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
// La mesure des retours est testée à part (retourService.test.js).
vi.mock('../../services/retourService', () => ({ noterOuverture: () => {} }));
vi.mock('firebase/firestore', () => ({
  getDoc: (...a) => fb.getDoc(...a),
  doc: (db, ...path) => path.join('/'),
  collection: vi.fn(), getDocs: vi.fn(), deleteDoc: vi.fn(), setDoc: (...a) => fb.setDoc(...a),
  serverTimestamp: () => 'maintenant',
}))
vi.mock('../../services/firebaseConfig', () => ({ auth: fb.auth, db: {} }))
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }))

import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth'
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
    fb.setDoc.mockClear()
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

  it('mineur dont le parent n\'a pas encore été prévenu → bloqué, et mémorisé tel quel', async () => {
    mockFirestore({ profile: { plan: 'free', birthDate: '2015-01-01' }, consent: { status: 'pending' } })
    renderProvider()
    await resolveAuth(johan)
    expect(screen.getByTestId('probe')).toHaveTextContent('blocked=true')
    await waitFor(() => expect(cacheOf()).toMatchObject({ consentBlocked: true, consentStatus: 'a-demander' }))
  })

  it('mineur dont le parent a reçu l\'email → accès ouvert pendant l\'attente', async () => {
    mockFirestore({
      profile: { plan: 'free', birthDate: '2015-01-01' },
      consent: { status: 'pending', parentEmail: 'p@f.fr', createdAt: Date.now(), firstRequestedAt: Date.now() },
    })
    renderProvider()
    await resolveAuth(johan)
    expect(screen.getByTestId('probe')).toHaveTextContent('blocked=false')
    await waitFor(() => expect(cacheOf()).toMatchObject({ consentBlocked: false, consentStatus: 'en-attente' }))
  })

  it('mineur dont le parent a refusé → bloqué', async () => {
    mockFirestore({ profile: { plan: 'free', birthDate: '2015-01-01' }, consent: { status: 'refused', parentEmail: 'p@f.fr' } })
    renderProvider()
    await resolveAuth(johan)
    expect(screen.getByTestId('probe')).toHaveTextContent('blocked=true')
  })

  it('lecture Firestore en échec → fail-open (pas de blocage), session quand même mémorisée', async () => {
    fb.getDoc.mockRejectedValue(new Error('offline'))
    renderProvider()
    await resolveAuth(johan)
    expect(screen.getByTestId('probe')).toHaveTextContent('user=Johan cache=0 premium=false blocked=false loading=false')
    await waitFor(() => expect(cacheOf().uid).toBe('u1'))
  })

  it.each([
    ['google.com', [{ providerId: 'google.com' }]],
    ['apple.com', [{ providerId: 'apple.com' }]],
    ['microsoft.com', [{ providerId: 'microsoft.com' }]],
    ['TikTok (jeton personnalisé)', []],
  ])('compte %s sans date de naissance → doit finir l’inscription', async (_, providerData) => {
    mockFirestore({ profile: null })
    renderProvider()
    await resolveAuth({ ...johan, providerData })
    await waitFor(() => expect(cacheOf().needsProfileSetup).toBe(true))
  })

  it.each([
    ['fiche réduite au lien vers l’essai', { essaiId: 'guest-1' }],
    ['pas de fiche', null],
  ])('compte e-mail sans date de naissance (%s) → fin d’inscription à la prochaine ouverture', async (_, profile) => {
    mockFirestore({ profile })
    renderProvider()
    await resolveAuth(johan)
    await waitFor(() => expect(cacheOf().needsProfileSetup).toBe(true))
  })

  it('lecture du profil ratée → pas renvoyé vers la fin d’inscription', async () => {
    fb.getDoc.mockImplementation((path) =>
      (path.endsWith('/consent') ? Promise.resolve(snap(null)) : Promise.reject(new Error('offline'))))
    renderProvider()
    await resolveAuth(johan)
    await waitFor(() => expect(cacheOf().uid).toBe('u1'))
    expect(cacheOf().needsProfileSetup).toBe(false)
  })

  it('pendant l’inscription par e-mail → pas de fin d’inscription, même si la fiche est encore vide', async () => {
    // Firebase annonce le compte pendant sa création, avant que le profil soit écrit.
    mockFirestore({ profile: { essaiId: 'guest-1' } })
    vi.mocked(createUserWithEmailAndPassword).mockImplementation(async () => {
      await fb.listeners.at(-1)(johan)
      return { user: johan }
    })
    vi.mocked(sendEmailVerification).mockResolvedValue()
    let api
    function Capture() {
      api = useAuth()
      return <div data-testid="needs">{`needs=${api.needsProfileSetup}`}</div>
    }
    render(<AuthProvider><Capture /></AuthProvider>)
    await resolveAuth(null)
    await act(async () => {
      await api.signup('Johan', 'j@example.com', 'motdepasse123', quatrieme, '2000-01-01')
    })
    expect(screen.getByTestId('needs')).toHaveTextContent('needs=false')
    expect(fb.setDoc).toHaveBeenCalledWith('users/u1', expect.objectContaining({ prenom: 'Johan', birthDate: '2000-01-01' }), { merge: true })
  })

  // Essais devenus comptes du 26 au 29/10 : fiche réduite au lien vers l'essai.
  const quatrieme = { cycle: 'college', classe: '4ème', specialites: [] }
  const ecrituresProfil = () => fb.setDoc.mock.calls.filter(([chemin]) => chemin === 'users/u1')

  it('profil resté vide → complété par le prénom du compte et la classe de ce navigateur', async () => {
    localStorage.setItem('reviz-level-u1', JSON.stringify(quatrieme))
    mockFirestore({ profile: { essaiId: 'guest-1' } })
    renderProvider()
    await resolveAuth(johan)
    expect(ecrituresProfil()).toEqual([['users/u1', { prenom: 'Johan', level: quatrieme }, { merge: true }]])
  })

  it('profil rempli → rien n’est réécrit, même si ce navigateur connaît une autre classe', async () => {
    localStorage.setItem('reviz-level-u1', JSON.stringify(quatrieme))
    mockFirestore({ profile: { prenom: 'Jo', level: { cycle: 'college', classe: '3ème' }, birthDate: '2000-01-01' } })
    renderProvider()
    await resolveAuth(johan)
    await waitFor(() => expect(cacheOf().uid).toBe('u1'))
    expect(ecrituresProfil()).toEqual([])
  })

  it('naissance perdue mais trace de consentement → traité en mineur (délai pour l’e-mail du parent)', async () => {
    mockFirestore({ profile: { essaiId: 'guest-1' }, consent: { status: 'pending', createdAt: Date.now() } })
    renderProvider()
    await resolveAuth(johan)
    expect(screen.getByTestId('probe')).toHaveTextContent('blocked=false')
    await waitFor(() => expect(cacheOf()).toMatchObject({ consentBlocked: false, consentStatus: 'a-fournir' }))
  })

  it('naissance perdue, parent qui a refusé → bloqué', async () => {
    mockFirestore({ profile: { essaiId: 'guest-1' }, consent: { status: 'refused', parentEmail: 'p@f.fr' } })
    renderProvider()
    await resolveAuth(johan)
    expect(screen.getByTestId('probe')).toHaveTextContent('blocked=true')
  })

  it('pas de fiche (ou lecture ratée) → aucune fiche créée à la place de l’inscription', async () => {
    localStorage.setItem('reviz-level-u1', JSON.stringify(quatrieme))
    mockFirestore({ profile: null })
    renderProvider()
    await resolveAuth(johan)
    await waitFor(() => expect(cacheOf().uid).toBe('u1'))
    expect(ecrituresProfil()).toEqual([])
  })
})
