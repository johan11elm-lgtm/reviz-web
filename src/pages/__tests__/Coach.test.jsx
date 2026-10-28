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
vi.mock('../../services/historyService', () => ({ loadLessons: () => lessons.list, restoreLesson: () => true }))
const screenSize = vi.hoisted(() => ({ desktop: false }))
vi.mock('../../hooks/useMediaQuery', () => ({ useIsDesktop: () => screenSize.desktop }))
// Ce que les cartes de l'agent déclenchent (le code habituel de l'appli).
const appli = vi.hoisted(() => ({ ajouter: vi.fn(), ouvrir: vi.fn() }))
vi.mock('../../services/agendaService', () => ({ ajouterControle: appli.ajouter }))
vi.mock('../../services/controleChapitres', () => ({ ouvrirChapitreDuControle: appli.ouvrir }))
vi.mock('../../services/erreursService', () => ({ erreursRecentes: () => [{ lessonId: 'prog-x', titre: 'X', matiere: 'maths', questions: ['Q ?'], at: 1 }] }))
vi.mock('../../services/statsService', () => ({ track: vi.fn() }))

const { default: Coach } = await import('../Coach')

const renderAt = (path) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/coach" element={<Coach />} />
      <Route path="/scan" element={<p>Page scan</p>} />
      <Route path="/flashcards" element={<p>Page flashcards</p>} />
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

  it('téléphone, clavier ouvert : la page prend la zone visible, la barre de saisie reste au-dessus du clavier', () => {
    const ecouteurs = {}
    const vv = { height: 844, offsetTop: 0, addEventListener: (t, f) => { ecouteurs[t] = f }, removeEventListener: () => {} }
    const avant = { vv: window.visualViewport, mm: window.matchMedia, h: window.innerHeight }
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: vv })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844 })
    window.matchMedia = q => ({ matches: q.includes('max-width: 430px'), media: q, addEventListener() {}, removeEventListener() {} })
    try {
      const { container } = renderAt('/coach?lesson=l1')
      const page = container.querySelector('.ia-page')
      expect(page.style.getPropertyValue('--ia-hauteur')).toBe('844px')
      expect(page.hasAttribute('data-clavier')).toBe(false)
      // Le clavier s'ouvre : Safari décale la zone visible de 120 px et n'en montre plus que 380 ; comme sur
      // iPhone, window.innerHeight rétrécit aussi (seule la racine garde la hauteur de la page).
      Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: 844 })
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 380 })
      Object.assign(vv, { height: 380, offsetTop: 120 })
      act(() => ecouteurs.resize())
      expect(page.style.getPropertyValue('--ia-hauteur')).toBe('380px')
      expect(page.style.getPropertyValue('--ia-haut')).toBe('120px')
      expect(page.hasAttribute('data-clavier')).toBe(true)
      // La barre de saisie est dans la page (dans le flux), pas fixée ailleurs.
      expect(page.contains(container.querySelector('.ia-pied--tel'))).toBe(true)
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844 })
      Object.assign(vv, { height: 844, offsetTop: 0 }) // clavier fermé
      act(() => ecouteurs.resize())
      expect(page.style.getPropertyValue('--ia-hauteur')).toBe('844px')
      expect(page.hasAttribute('data-clavier')).toBe(false)
    } finally {
      Object.defineProperty(window, 'visualViewport', { configurable: true, value: avant.vv })
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: avant.h })
      window.matchMedia = avant.mm
      delete document.documentElement.clientHeight
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

  it('sans ?lesson : Réviz IA sur toutes les matières ; la pastille passe à une leçon et revient', () => {
    lessons.list = [DEUX[0]]
    renderAt('/coach')
    expect(screen.getByLabelText('Ta question à Réviz IA')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Toutes mes matières. Choisir une leçon' }))
    const choix = screen.getByRole('dialog', { name: 'Sur quelle leçon ?' })
    expect(within(choix).getByRole('button', { name: /Toutes mes matières/ })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(within(choix).getByRole('button', { name: /Théorème de Pythagore/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Leçon : Théorème de Pythagore. Changer de leçon' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Toutes mes matières/ }))
    expect(screen.getByLabelText('Ta question à Réviz IA')).toBeInTheDocument()
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

  it('aucune leçon : Réviz IA s’ouvre quand même, sur toutes les matières', () => {
    lessons.list = []
    renderAt('/coach')
    expect(screen.getByRole('heading', { name: /Salut Léa\. On révise quoi/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Je fais quoi/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Toutes mes matières/ })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /J'ai un contrôle/ }))
    expect(screen.getByLabelText('Ta question à Réviz IA')).toHaveValue("J'ai un contrôle de ")
  })

  it('agent : dit ce qu’il regarde, puis ses cartes ; Ajouter note le contrôle, Commencer ouvre la révision', async () => {
    const controle = { type: 'controle', matiere: 'svt', date: '2026-11-10', jour: 'mardi 10 novembre', titre: 'Le volcanisme', chapitres: [{ id: 'volcanisme', titre: 'Le volcanisme' }], classe: '4ème', programme: 'SVT', resume: 'r1' }
    const revision = { type: 'revision', format: 'flashcards', chapitre: { id: 'theoreme-de-pythagore', titre: 'Pythagore' }, classe: '4ème', programme: 'Maths', titre: 'Flashcards', sous: 'Pythagore', resume: 'r2' }
    let finir
    chat.send.mockImplementation(({ onOutil }) => new Promise(r => { onOutil('Je regarde ton agenda…'); finir = () => r({ text: 'Je te prépare tout ça.', cartes: [controle, revision] }) }))
    appli.ajouter.mockResolvedValue({})
    appli.ouvrir.mockResolvedValue()
    renderAt('/coach')
    fireEvent.change(screen.getByLabelText('Ta question à Réviz IA'), { target: { value: 'contrôle de svt mardi sur les volcans' } })
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer la question' }))
    expect(screen.getByText('Je regarde ton agenda…')).toBeInTheDocument()
    expect(chat.send.mock.calls[0][0]).toMatchObject({ lessonId: null, erreurs: [{ lessonId: 'prog-x' }] })
    await act(async () => finir())

    expect(screen.getByText('Contrôle de SVT')).toBeInTheDocument()
    expect(screen.getByText('Mardi 10 novembre · Le volcanisme')).toBeInTheDocument()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Ajouter à l’agenda : Contrôle de SVT, mardi 10 novembre' })))
    expect(appli.ajouter).toHaveBeenCalledWith(expect.anything(), { matiere: 'svt', titre: 'Le volcanisme', date: '2026-11-10', chapitres: controle.chapitres, classe: '4ème', programme: 'SVT' })
    expect(screen.getByRole('link', { name: 'Ajouté · voir mon plan' })).toHaveAttribute('href', '/agenda')

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Commencer : Flashcards, Pythagore' })))
    expect(appli.ouvrir).toHaveBeenCalledWith({ classe: '4ème', programme: 'Maths' }, revision.chapitre)
    expect(screen.getByText('Page flashcards')).toBeInTheDocument()
  })
})
