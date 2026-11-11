// /parents (11/11) : le parent choisit, donne son adresse, part payer ; et le retour avec le code.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const api = vi.hoisted(() => ({ fetch: vi.fn() }))
vi.mock('../../services/apiClient', () => ({ IS_NATIVE: false, apiFetch: api.fetch }))
vi.mock('../../components/Pantin', () => ({ Pantin: () => null }))
vi.mock('../../../api/_lancement.js', async orig => ({ ...(await orig()), tarifFondateurOuvert: () => false }))

const { default: Parents } = await import('../Parents')
const { default: ParentsMerci } = await import('../ParentsMerci')
const reponse = (status, body) => ({ ok: status < 400, status, json: async () => body })

describe('/parents', () => {
  beforeEach(() => { api.fetch.mockReset(); vi.unstubAllGlobals() })

  it('présente Réviz+ aux parents, avec le prix à la semaine', () => {
    render(<MemoryRouter><Parents /></MemoryRouter>)
    expect(screen.getByRole('heading', { level: 1, name: 'Offrez Réviz+ à votre enfant' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /À l’année/ })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText(/Moins cher qu’un cours particulier/)).toBeInTheDocument()
    expect(screen.getAllByText(/0,94 € par semaine/).length).toBeGreaterThan(0)
  })
  it('refuse une adresse mal tapée, puis ouvre le paiement', async () => {
    const assign = vi.fn()
    const origine = window.location.origin
    vi.stubGlobal('location', { origin: origine, href: `${origine}/parents`, search: '', assign })
    api.fetch.mockResolvedValue(reponse(200, { url: 'https://checkout.stripe.com/c/x' }))
    render(<MemoryRouter><Parents /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('Votre adresse e-mail'), { target: { value: 'pas-une-adresse' } })
    fireEvent.click(screen.getByRole('button', { name: 'Offrir Réviz+' }))
    expect(screen.getByRole('alert')).toHaveTextContent('ne semble pas valable')
    expect(api.fetch).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('radio', { name: /Au mois/ }))
    fireEvent.change(screen.getByLabelText('Votre adresse e-mail'), { target: { value: 'parent@famille.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Offrir Réviz+' }))
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://checkout.stripe.com/c/x'))
    expect(JSON.parse(api.fetch.mock.calls[0][1].body)).toEqual({ action: 'caisse', formule: 'mensuel', email: 'parent@famille.test' })
    vi.unstubAllGlobals()
  })
  it('paiement annulé : on le dit', () => {
    render(<MemoryRouter initialEntries={['/parents?annule=1']}><Parents /></MemoryRouter>)
    expect(screen.getByRole('status')).toHaveTextContent('rien n’a été prélevé')
  })
  it('le retour de Stripe montre le code et le lien à envoyer', async () => {
    api.fetch.mockResolvedValue(reponse(200, { code: 'ABCDEFGH', formule: 'annuel', active: false }))
    render(<MemoryRouter initialEntries={['/parents/merci?session=cs_test_123']}><ParentsMerci /></MemoryRouter>)
    expect(await screen.findByText('ABCD-EFGH')).toBeInTheDocument()
    expect(screen.getByLabelText('Le lien à envoyer à votre enfant')).toHaveValue(`${window.location.origin}/?cadeau=ABCDEFGH`)
    expect(JSON.parse(api.fetch.mock.calls[0][1].body)).toEqual({ action: 'code', session: 'cs_test_123' })
  })
  it('paiement pas encore confirmé : le code arrivera par e-mail', async () => {
    api.fetch.mockResolvedValue(reponse(409, { error: 'PAS_PAYE' }))
    render(<MemoryRouter initialEntries={['/parents/merci?session=cs_test_123']}><ParentsMerci /></MemoryRouter>)
    expect(await screen.findByRole('alert')).toHaveTextContent('par e-mail')
  })
})
