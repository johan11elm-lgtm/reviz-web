import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { InstallerModal, BoutonInstaller } from '../InstallerApp'
import { ecouterInstallation } from '../../utils/installation'

const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
  tiktok: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_41.2.0 BytedanceWebview/d8a21c6',
}

const surAppareil = ua => vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua)

beforeAll(() => ecouterInstallation())
afterEach(() => vi.restoreAllMocks())

describe('<InstallerModal />', () => {
  it("ouvre l'onglet de l'appareil de l'élève (iPhone)", () => {
    surAppareil(UA.iphone)
    render(<InstallerModal onClose={() => {}} />)
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'inst-titre')
    expect(screen.getByRole('tab', { name: /iPhone/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveTextContent("Sur l'écran d'accueil")
  })

  it('change de tutoriel quand on choisit un autre appareil', () => {
    surAppareil(UA.iphone)
    render(<InstallerModal onClose={() => {}} />)
    fireEvent.click(screen.getByRole('tab', { name: /Android/ }))
    expect(screen.getByRole('tabpanel')).toHaveTextContent("Installer l'application")
    fireEvent.click(screen.getByRole('tab', { name: /Ordinateur/ }))
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Chrome ou Edge')
  })

  it("prévient qu'on ne peut pas installer depuis le navigateur de TikTok", () => {
    surAppareil(UA.tiktok)
    render(<InstallerModal onClose={() => {}} />)
    expect(screen.getByRole('note')).toHaveTextContent('navigateur de TikTok')
  })

  it('Échap et « Fermer » referment la popup', () => {
    surAppareil(UA.iphone)
    const onClose = vi.fn()
    render(<InstallerModal onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('installe en un geste quand Chrome le propose (Android)', async () => {
    surAppareil(UA.android)
    render(<InstallerModal onClose={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Installer Réviz' })).toBeNull()

    const invitation = new Event('beforeinstallprompt')
    invitation.prompt = vi.fn(async () => {})
    invitation.userChoice = Promise.resolve({ outcome: 'accepted' })
    act(() => { window.dispatchEvent(invitation) })

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Installer Réviz' })) })
    expect(invitation.prompt).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('status')).toHaveTextContent('Réviz est installée')
  })
})

describe('<BoutonInstaller />', () => {
  it('ouvre la popup', () => {
    surAppareil(UA.iphone)
    render(<BoutonInstaller>Installer l'app</BoutonInstaller>)
    fireEvent.click(screen.getByRole('button', { name: "Installer l'app" }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it("ne s'affiche pas dans l'app déjà installée", () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(q => ({
      matches: q === '(display-mode: standalone)', media: q,
      addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
    }))
    const { container } = render(<BoutonInstaller />)
    expect(container).toBeEmptyDOMElement()
  })
})
