import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const chat = vi.hoisted(() => ({ send: vi.fn() }))
vi.mock('../../services/chatService', () => ({ CHAT_MAX_MESSAGE_LENGTH: 1000, sendCoachMessage: chat.send }))
vi.mock('../../services/billingService', () => ({ startCheckout: vi.fn() }))
const auth = vi.hoisted(() => ({ plus: false }))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ isPremium: false, hasRevizPlus: auth.plus, currentUser: { displayName: 'Léa Martin' }, getUserLevel: () => ({ cycle: 'college', classe: '3ème' }) }),
}))
const lessons = vi.hoisted(() => ({ list: [] }))
vi.mock('../../services/historyService', () => ({ loadLessons: () => lessons.list }))
const screenSize = vi.hoisted(() => ({ desktop: false }))
vi.mock('../../hooks/useMediaQuery', () => ({ useIsDesktop: () => screenSize.desktop }))

const { default: Coach } = await import('../Coach')

const renderAt = (path) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/coach" element={<Coach />} />
      <Route path="/scan" element={<p>Page scan</p>} />
    </Routes>
  </MemoryRouter>
)
const DEUX = [
  { id: 'l1', metadata: { title: 'Théorème de Pythagore', subject: 'Maths' } },
  { id: 'l2', metadata: { title: 'La Révolution française, 1789-1799', subject: 'Histoire-géo' } },
]
const JOUR = new Date().toISOString().slice(0, 10)

describe('<Coach /> — Réviz IA', () => {
  beforeEach(() => {
    sessionStorage.clear(); localStorage.clear()
    screenSize.desktop = false; auth.plus = false
    chat.send.mockReset()
    lessons.list = DEUX
  })

  it('téléphone : le fil réserve la hauteur réelle de la barre de saisie (la fin de la réponse ne passe pas dessous)', () => {
    const observes = []
    const RO = globalThis.ResizeObserver
    globalThis.ResizeObserver = class { constructor(f) { this.f = f } observe(el) { observes.push({ el, f: this.f }) } disconnect() {} }
    const hauteur = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(236)
    try {
      const { container } = renderAt('/coach?lesson=l1')
      const pied = container.querySelector('.ia-pied--tel')
      expect(observes.some(o => o.el === pied)).toBe(true)
      expect(container.querySelector('.ia-page').style.getPropertyValue('--ia-pied')).toBe('236px')
      hauteur.mockReturnValue(310) // le champ grandit
      act(() => observes.find(o => o.el === pied).f())
      expect(container.querySelector('.ia-page').style.getPropertyValue('--ia-pied')).toBe('310px')
    } finally {
      hauteur.mockRestore()
      globalThis.ResizeObserver = RO
    }
  })

  it('téléphone, clavier ouvert : la barre de saisie remonte au-dessus du clavier, puis redescend', () => {
    const ecouteurs = {}
    const vv = { height: 844, offsetTop: 0, addEventListener: (t, f) => { ecouteurs[t] = f }, removeEventListener: () => {} }
    const avant = { vv: window.visualViewport, mm: window.matchMedia, h: window.innerHeight }
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: vv })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844 })
    window.matchMedia = q => ({ matches: q.includes('max-width: 430px'), media: q, addEventListener() {}, removeEventListener() {} })
    try {
      const { container } = renderAt('/coach?lesson=l1')
      const page = container.querySelector('.ia-page')
      vv.height = 500 // le clavier prend 344 px
      act(() => ecouteurs.resize())
      expect(page.style.getPropertyValue('--ia-clavier')).toBe('344px')
      vv.height = 844 // clavier fermé
      act(() => ecouteurs.resize())
      expect(page.style.getPropertyValue('--ia-clavier')).toBe('0px')
    } finally {
      Object.defineProperty(window, 'visualViewport', { configurable: true, value: avant.vv })
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: avant.h })
      window.matchMedia = avant.mm
    }
  })

  it('accueil : salut, les 4 cartes de départ et la leçon attachée', () => {
    renderAt('/coach?lesson=l2')
    expect(screen.getByRole('heading', { name: /Salut Léa\. On révise quoi/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Explique-moi la Révolution française/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Prépare mon contrôle/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Leçon : La Révolution française, 1789-1799/ })).toBeInTheDocument()
    expect(screen.getByLabelText('Ta question sur la leçon')).toBeInTheDocument()
  })

  it('une carte envoie sa question, l’étoile réfléchit, puis la réponse et les relances', async () => {
    let finir
    chat.send.mockImplementation(({ onDelta }) => new Promise(r => { finir = () => { onDelta('L’hypoténuse'); r({ text: 'L’hypoténuse, c’est le côté **en face de l’angle droit**.' }) } }))
    renderAt('/coach?lesson=l1')
    fireEvent.click(screen.getByRole('button', { name: /Explique-moi Théorème de Pythagore/ }))
    expect(screen.getByText(/Explique-moi « Théorème de Pythagore »/)).toBeInTheDocument()
    expect(screen.getByText('Réviz réfléchit…')).toBeInTheDocument()
    expect(chat.send.mock.calls[0][0].lessonId).toBe('l1')
    await act(async () => finir())
    expect(screen.getByText('en face de l’angle droit').tagName).toBe('STRONG')
    expect(screen.getByRole('button', { name: 'Plus simple' })).toBeInTheDocument()
  })

  it('« Scanne ma leçon » mène au scan', () => {
    renderAt('/coach?lesson=l1')
    fireEvent.click(screen.getByRole('button', { name: /Scanne ma leçon/ }))
    expect(screen.getByText('Page scan')).toBeInTheDocument()
  })

  it('la pastille ouvre « Sur quelle leçon ? », un tap change de leçon', () => {
    renderAt('/coach?lesson=l1')
    fireEvent.click(screen.getByRole('button', { name: /^Leçon : Théorème de Pythagore/ }))
    const choix = screen.getByRole('dialog', { name: 'Sur quelle leçon ?' })
    expect(within(choix).getByText('Histoire-géo')).toBeInTheDocument()
    expect(within(choix).getByRole('button', { name: /Théorème de Pythagore/ })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(within(choix).getByRole('button', { name: /La Révolution française/ }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: /^Leçon : La Révolution française/ })).toBeInTheDocument()
  })

  it('une seule leçon : la pastille ne propose pas d’en changer', () => {
    lessons.list = [DEUX[0]]
    renderAt('/coach')
    expect(screen.getByRole('button', { name: 'Leçon : Théorème de Pythagore' })).toBeDisabled()
  })

  it('téléphone : l’horloge montre les discussions entamées, et « Nouvelle discussion » repart de l’accueil', () => {
    sessionStorage.setItem('reviz-coach-l2', JSON.stringify([
      { role: 'user', content: 'C’est quoi le Tiers état ?' },
      { role: 'assistant', content: 'Le **Tiers état** rassemble ceux qui ne sont ni nobles ni clergé.' },
    ]))
    renderAt('/coach?lesson=l2')
    expect(screen.getByText('C’est quoi le Tiers état ?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tes discussions' }))
    const sheet = screen.getByRole('dialog', { name: 'Tes discussions' })
    expect(within(sheet).getByText(/Réviz IA : Le Tiers état rassemble/)).toBeInTheDocument()
    fireEvent.click(within(sheet).getByRole('button', { name: /Nouvelle discussion/ }))
    expect(screen.getByRole('heading', { name: /On révise quoi/ })).toBeInTheDocument()
  })

  it('ordinateur : la colonne des discussions récentes', () => {
    screenSize.desktop = true
    sessionStorage.setItem('reviz-coach-l1', JSON.stringify([{ role: 'user', content: 'Bonjour' }, { role: 'assistant', content: 'Salut !' }]))
    renderAt('/coach?lesson=l2')
    const colonne = screen.getByRole('complementary', { name: 'Tes conversations' })
    fireEvent.click(within(colonne).getByRole('button', { name: 'Théorème de Pythagore' }))
    expect(screen.getByText('Bonjour')).toBeInTheDocument()
  })

  it('compteur gratuit sous le champ, puis la carte de limite à 0', () => {
    localStorage.setItem('reviz-coach-quota', JSON.stringify({ remaining: 6, limit: 7, jour: JOUR }))
    const { unmount } = renderAt('/coach?lesson=l1')
    expect(screen.getByText(/6 questions gratuites aujourd'hui · Réviz IA peut se tromper/)).toBeInTheDocument()
    unmount()
    localStorage.setItem('reviz-coach-quota', JSON.stringify({ remaining: 0, limit: 7, jour: JOUR }))
    renderAt('/coach?lesson=l1')
    expect(screen.getByText('Tu as utilisé tes 7 questions du jour.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Questions illimitées avec Réviz+' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Ta question sur la leçon')).toBeNull()
  })

  it('le serveur refuse (limite atteinte) : la question revient dans le champ… remplacé par la carte', async () => {
    chat.send.mockRejectedValue(new Error('CHAT_LIMIT'))
    renderAt('/coach?lesson=l1')
    fireEvent.change(screen.getByLabelText('Ta question sur la leçon'), { target: { value: 'Une question' } })
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Envoyer la question' })))
    expect(screen.getByText(/Tu as utilisé tes/)).toBeInTheDocument()
  })

  it('sans leçon : état vide, programme et scan proposés', () => {
    lessons.list = []
    renderAt('/coach')
    expect(screen.getByText(/Ouvre une leçon pour lui poser tes questions/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ouvrir mon programme' })).toHaveAttribute('href', '/programme')
    expect(screen.getByRole('link', { name: 'Scanner une leçon' })).toHaveAttribute('href', '/scan')
    expect(screen.queryByLabelText('Ta question sur la leçon')).toBeNull()
  })
})
