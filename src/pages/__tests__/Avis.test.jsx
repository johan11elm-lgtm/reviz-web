import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const apiFetch = vi.fn()
vi.mock('../../services/apiClient', () => ({ apiFetch: (...a) => apiFetch(...a), IS_NATIVE: false }))

const { default: Avis } = await import('../Avis')

const renderAvis = (url = '/avis') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Avis />
    </MemoryRouter>
  )

const envoyer = () => fireEvent.click(screen.getByRole('button', { name: /Envoyer mon avis/i }))

beforeEach(() => apiFetch.mockReset())

describe('<Avis />', () => {
  it('demande qui répond, puis au moins une réponse, avant d\'envoyer', () => {
    renderAvis()
    expect(screen.getByRole('heading', { name: 'Votre avis' })).toBeInTheDocument()
    envoyer()
    expect(screen.getByRole('alert')).toHaveTextContent(/qui vous êtes/i)
    fireEvent.click(screen.getByLabelText('Parent'))
    envoyer()
    expect(screen.getByRole('alert')).toHaveTextContent(/au moins une question/i)
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('présélectionne « Enseignant·e » quand on arrive par l’affiche', () => {
    renderAvis('/avis?src=affiche-profs')
    expect(screen.getByLabelText('Enseignant·e')).toBeChecked()
    expect(screen.getByRole('link', { name: /Découvrir l'appli/ })).toHaveAttribute('href', '/profs')
  })

  it('propose la matière seulement aux enseignants', () => {
    renderAvis()
    expect(screen.queryByLabelText(/Votre matière/i)).toBeNull()
    fireEvent.click(screen.getByLabelText('Enseignant·e'))
    expect(screen.getByLabelText(/Votre matière/i)).toBeInTheDocument()
  })

  it('envoie l\'avis avec la provenance de l\'affiche et remercie', async () => {
    apiFetch.mockResolvedValue({ ok: true })
    renderAvis('/avis?src=affiche-profs')
    fireEvent.click(screen.getByLabelText('Enseignant·e'))
    fireEvent.change(screen.getByLabelText(/Votre matière/i), { target: { value: 'SVT' } })
    fireEvent.click(screen.getByLabelText('Peut-être'))
    fireEvent.change(screen.getByLabelText(/Ce qui manque/i), { target: { value: 'Une erreur en 5e' } })
    envoyer()
    expect(await screen.findByText(/bien arrivé/i)).toBeInTheDocument()
    const [url, init] = apiFetch.mock.calls[0]
    expect(url).toBe('/api/avis')
    expect(JSON.parse(init.body)).toMatchObject({
      profil: 'enseignant', discipline: 'SVT', conseil: 'peut-etre',
      manque: 'Une erreur en 5e', source: 'affiche-profs', site: '',
    })
  })

  it('garde la saisie et explique quand le serveur refuse', async () => {
    apiFetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'EMAIL' }) })
    renderAvis()
    fireEvent.click(screen.getByLabelText('Élève'))
    fireEvent.change(screen.getByLabelText(/Ce qui vous plaît/i), { target: { value: 'Les quiz' } })
    envoyer()
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/e-mail/i))
    expect(screen.getByLabelText(/Ce qui vous plaît/i)).toHaveValue('Les quiz')
  })
})
