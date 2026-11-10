import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

const auth = vi.hoisted(() => ({}))
const service = vi.hoisted(() => ({ lienPourParent: vi.fn() }))
const stats = vi.hoisted(() => ({ track: vi.fn() }))
const mesure = vi.hoisted(() => ({ mesurer: vi.fn() }))
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('../../services/consentService', async importOriginal => ({
  ...(await importOriginal()),
  lienPourParent: (...a) => service.lienPourParent(...a),
}))
vi.mock('../../services/firebaseConfig', () => ({ auth: {}, db: {} }))
vi.mock('../../services/statsService', () => stats)
vi.mock('../../services/mesure', () => mesure)

const { LienParent } = await import('../LienParent')
const LIEN = 'https://app.revizapp.fr/api/approve-consent?uid=abc&e=1&s=sig'
const BOUTON = { name: /Lui envoyer un lien/ }

let partage
let presse
beforeEach(() => {
  Object.assign(auth, { refreshGate: vi.fn(async () => {}) })
  service.lienPourParent = vi.fn(async () => ({ ok: true, lien: LIEN }))
  stats.track.mockClear(); mesure.mesurer.mockClear()
  partage = vi.fn(async () => {})
  presse = vi.fn(async () => {})
  Object.defineProperty(navigator, 'share', { value: partage, configurable: true, writable: true })
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: presse }, configurable: true })
})
afterEach(() => { delete navigator.share })

// Le lien est demandé dès l'affichage : on attend qu'il soit là avant de toucher le bouton.
const lienPret = () => waitFor(() => expect(service.lienPourParent).toHaveBeenCalledTimes(1)).then(() => act(async () => {}))

describe('<LienParent />', () => {
  it('le lien est préparé à l’affichage : au toucher, le partage part sans nouvel appel au serveur', async () => {
    render(<LienParent lieu="inscription" />)
    await lienPret()
    expect(partage).not.toHaveBeenCalled()
    // Le serveur ne répond plus : le partage s'ouvre quand même, avec le lien déjà reçu.
    service.lienPourParent = vi.fn(async () => { throw new Error('HORS_LIGNE') })
    fireEvent.click(screen.getByRole('button', BOUTON))
    await waitFor(() => expect(partage).toHaveBeenCalledWith(expect.objectContaining({ url: LIEN })))
    expect(service.lienPourParent).not.toHaveBeenCalled()
  })

  it('mode strict (effet rejoué) : une seule demande au serveur', async () => {
    const { StrictMode } = await import('react')
    render(<StrictMode><LienParent lieu="inscription" /></StrictMode>)
    await lienPret()
    await act(async () => {})
    expect(service.lienPourParent).toHaveBeenCalledTimes(1)
  })

  it('lien pas encore reçu au moment du toucher : il est demandé, puis partagé', async () => {
    let rendre
    service.lienPourParent = vi.fn(() => new Promise(r => { rendre = r }))
    render(<LienParent lieu="inscription" />)
    fireEvent.click(screen.getByRole('button', { name: /Lui envoyer un lien|Un instant/ }))
    expect(screen.getByRole('button', { name: /Un instant/ })).toBeDisabled()
    await act(async () => { rendre({ ok: true, lien: LIEN }) })
    await waitFor(() => expect(partage).toHaveBeenCalledWith(expect.objectContaining({ url: LIEN })))
  })

  it('téléphone : crée le lien, ouvre le partage avec un message tout prêt, puis confirme', async () => {
    const onEnvoye = vi.fn()
    render(<LienParent lieu="inscription" onEnvoye={onEnvoye} />)
    await lienPret()
    expect(screen.getByRole('button', BOUTON)).toHaveTextContent('Si tu ne connais pas son adresse')
    fireEvent.click(screen.getByRole('button', BOUTON))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Ton parent n’a plus qu’à ouvrir le lien'))
    expect(service.lienPourParent).toHaveBeenCalledWith(null)
    const envoi = partage.mock.calls[0][0]
    expect(envoi.url).toBe(LIEN)
    expect(envoi.text).toMatch(/moins de 15 ans/)
    expect(envoi.text).toMatch(/accord d'un parent/)
    expect(onEnvoye).toHaveBeenCalledTimes(1)
    expect(stats.track).toHaveBeenCalledWith('consent_lien')
    expect(mesure.mesurer).toHaveBeenCalledWith('consent_lien', { etape: 'partage', lieu: 'inscription' })
    // Il peut le renvoyer (autre parent, mauvaise conversation).
    fireEvent.click(screen.getByRole('button', { name: 'Renvoyer le lien' }))
    await waitFor(() => expect(partage).toHaveBeenCalledTimes(2))
    expect(service.lienPourParent).toHaveBeenCalledTimes(1)
  })

  it('avec un score : le message le dit, et le lien le porte', async () => {
    render(<LienParent lieu="fin_seance" resultat={{ score: 8, total: 10 }} />)
    await lienPret()
    fireEvent.click(screen.getByRole('button', BOUTON))
    await waitFor(() => expect(partage).toHaveBeenCalled())
    expect(service.lienPourParent).toHaveBeenCalledWith({ score: 8, total: 10 })
    expect(partage.mock.calls[0][0].text).toMatch(/8\/10 à un quiz/)
  })

  it('partage annulé : rien n’est compté comme envoyé, le lien reste à copier ou à partager', async () => {
    partage.mockRejectedValue(Object.assign(new Error('annulé'), { name: 'AbortError' }))
    const onEnvoye = vi.fn()
    render(<LienParent lieu="accord" onEnvoye={onEnvoye} />)
    await lienPret()
    fireEvent.click(screen.getByRole('button', BOUTON))
    await waitFor(() => expect(screen.getByLabelText('Lien à envoyer à ton parent')).toHaveValue(LIEN))
    expect(onEnvoye).not.toHaveBeenCalled()
    expect(stats.track).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Copier le message' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Partager' })).toBeInTheDocument()
  })

  it('ordinateur (pas de partage) : le lien s’affiche, « Copier le message » copie le texte et le lien', async () => {
    delete navigator.share
    const onEnvoye = vi.fn()
    render(<LienParent lieu="accord" onEnvoye={onEnvoye} />)
    await lienPret()
    fireEvent.click(screen.getByRole('button', BOUTON))
    await waitFor(() => expect(screen.getByLabelText('Lien à envoyer à ton parent')).toHaveValue(LIEN))
    expect(screen.queryByRole('button', { name: 'Partager' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Copier le message' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Message copié'))
    expect(presse.mock.calls[0][0]).toMatch(/^Coucou, je révise mes cours avec Réviz\..* https:\/\/app\.revizapp\.fr\/api\/approve-consent/)
    expect(onEnvoye).toHaveBeenCalledTimes(1)
    expect(mesure.mesurer).toHaveBeenCalledWith('consent_lien', { etape: 'copie', lieu: 'accord' })
  })

  it('le serveur ne répond pas : un message, et on peut réessayer', async () => {
    service.lienPourParent = vi.fn(async () => { throw new Error('LIEN_INDISPONIBLE') })
    render(<LienParent lieu="accord" />)
    await lienPret()
    expect(screen.queryByRole('alert')).toBeNull() // l'échec de la préparation reste silencieux
    fireEvent.click(screen.getByRole('button', BOUTON))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('n’a pas pu être créé'))
    expect(partage).not.toHaveBeenCalled()
    expect(screen.getByRole('button', BOUTON)).toBeEnabled()
  })

  it('accord déjà donné entre-temps : pas de lien, l’accès est relu', async () => {
    service.lienPourParent = vi.fn(async () => ({ ok: true, alreadyApproved: true }))
    render(<LienParent lieu="accord" />)
    await waitFor(() => expect(auth.refreshGate).toHaveBeenCalled())
    expect(partage).not.toHaveBeenCalled()
  })
})
