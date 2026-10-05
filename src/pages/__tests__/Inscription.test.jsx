import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

// ── Firebase de l'inscription entièrement simulé ───────────────────────
// `loaded` passe à true quand services/signupActions est importé : c'est la
// preuve que la page affiche ses étapes sans tirer Firebase, et ne le charge
// qu'au moment voulu (préchauffage à la 2e étape, création du compte).
const fb = vi.hoisted(() => ({
  loaded: false,
  signup: vi.fn(async () => ({ uid: 'u1' })),
  loginWithGoogle: vi.fn(async () => ({ uid: 'g1' })),
  sendParentalConsent: vi.fn(async () => ({ ok: true })),
}))
vi.mock('../../services/signupActions.js', () => {
  fb.loaded = true
  return {
    signup: fb.signup,
    loginWithGoogle: fb.loginWithGoogle,
    sendParentalConsent: fb.sendParentalConsent,
    consentErrorMessage: (code) => `ERREUR:${code}`,
  }
})

import Inscription from '../Inscription'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/inscription']}>
      <Routes>
        <Route path="/inscription"     element={<Inscription />} />
        <Route path="/verify-email"    element={<p>page verify-email</p>} />
        <Route path="/consent-pending" element={<p>page consent-pending</p>} />
        <Route path="/"                element={<p>page home</p>} />
      </Routes>
    </MemoryRouter>
  )
}

const next = () => fireEvent.click(screen.getByRole('button', { name: /^Continuer$/ }))

// Remplit les 4 étapes du profil (prénom → date → cycle → classe) jusqu'à
// l'étape « compte », comme un élève.
async function reachAccountStep({ birthDate }) {
  fireEvent.change(screen.getByPlaceholderText('Lucas'), { target: { value: 'Lucas' } })
  next()
  expect(screen.getByText('Quand es-tu né·e ?')).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Ta date de naissance'), { target: { value: birthDate } })
  next()
  expect(screen.getByText('Où en es-tu ?')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /Collège/ }))
  // Les cartes avancent toutes seules après un court délai.
  await screen.findByText('Quelle classe ?')
  fireEvent.click(screen.getByRole('button', { name: '3ème' }))
  await screen.findByText('Crée ton compte')
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'lucas@exemple.com' } })
  fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'secret1' } })
  fireEvent.click(screen.getByRole('checkbox'))
}

describe('<Inscription /> — sans Firebase avant la création du compte', () => {
  beforeEach(() => {
    localStorage.clear()
    fb.signup.mockClear()
    fb.loginWithGoogle.mockClear()
    fb.sendParentalConsent.mockClear()
  })

  it('affiche la première étape sans charger Firebase', () => {
    renderPage()
    expect(screen.getByText('Quel est ton prénom ?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Continuer avec Google/ })).toBeInTheDocument()
    expect(fb.loaded).toBe(false)
  })

  it('refuse d’avancer sans prénom, toujours sans Firebase', () => {
    renderPage()
    next()
    expect(screen.getByText('Entre ton prénom.')).toBeInTheDocument()
    expect(fb.loaded).toBe(false)
  })

  it('préchauffe Firebase dès la deuxième étape (intention d’inscription)', async () => {
    renderPage()
    expect(fb.loaded).toBe(false)
    fireEvent.change(screen.getByPlaceholderText('Lucas'), { target: { value: 'Lucas' } })
    next()
    expect(screen.getByText('Quand es-tu né·e ?')).toBeInTheDocument()
    await waitFor(() => expect(fb.loaded).toBe(true))
  })

  it('≥ 15 ans : crée le compte à l’étape « compte » puis va vérifier l’email', async () => {
    renderPage()
    await reachAccountStep({ birthDate: '2008-01-01' })
    expect(fb.signup).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }))
    expect(await screen.findByText('page verify-email')).toBeInTheDocument()
    expect(fb.signup).toHaveBeenCalledWith(
      'Lucas', 'lucas@exemple.com', 'secret1',
      { cycle: 'college', classe: '3ème', specialites: [], filiere: null },
      '2008-01-01',
    )
  })

  it('< 15 ans : compte créé, puis étape parent, puis consentement en attente', async () => {
    renderPage()
    await reachAccountStep({ birthDate: '2014-01-01' })
    expect(screen.getByText(/Un email sera envoyé à ton parent/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }))
    expect(await screen.findByText('Autorisation parentale')).toBeInTheDocument()
    expect(fb.signup).toHaveBeenCalledTimes(1)
    fireEvent.change(screen.getByLabelText('Email de ton parent'), { target: { value: 'parent@exemple.com' } })
    fireEvent.click(screen.getByRole('button', { name: /Envoyer la demande/ }))
    expect(await screen.findByText('page consent-pending')).toBeInTheDocument()
    expect(fb.sendParentalConsent).toHaveBeenCalledWith('parent@exemple.com', 'Lucas')
  })

  it('affiche l’erreur Firebase traduite si la création échoue', async () => {
    fb.signup.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'auth/email-already-in-use' }))
    renderPage()
    await reachAccountStep({ birthDate: '2008-01-01' })
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }))
    expect(await screen.findByText('Cet email est déjà utilisé.')).toBeInTheDocument()
    expect(screen.queryByText('page verify-email')).not.toBeInTheDocument()
  })

  it('Google : connexion puis retour à l’accueil', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Continuer avec Google/ }))
    expect(await screen.findByText('page home')).toBeInTheDocument()
    expect(fb.loginWithGoogle).toHaveBeenCalledTimes(1)
  })
})
