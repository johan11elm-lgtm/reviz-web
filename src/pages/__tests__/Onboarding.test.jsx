// Découverte façon « Knowie » (11/11) : bonjour, puis trois questions (le prochain contrôle, ce qui
// bloque, la note visée) auxquelles Réviz répond dans son titre, puis « C'est prêt » et la séance
// d'accueil. La classe est déjà connue (demandée au 1er écran si absente). « Passer » à tout moment
// sauf sur le dernier écran.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const nav = vi.hoisted(() => vi.fn())
const auth = vi.hoisted(() => ({ level: { cycle: 'college', classe: '3ème' }, setUserLevel: vi.fn() }))
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => nav,
}))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { uid: 'u1', displayName: 'Léa Martin' },
    getUserLevel: () => auth.level,
    setUserLevel: auth.setUserLevel,
  }),
}))

// Le pantin charge ses calques par le réseau : hors sujet ici.
vi.mock('../../components/Pantin', () => ({ Pantin: () => null }))
// La feuille de l'agenda a ses propres tests : ici, un bouton qui « enregistre » un contrôle de maths dans 3 jours.
const dans3jours = vi.hoisted(() => {
  const d = new Date(); d.setDate(d.getDate() + 3)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})
vi.mock('../../components/AjoutControle', () => ({
  AjoutControle: ({ initial, onSaved }) => (
    <div role="dialog" aria-label="Ajouter un contrôle">
      <span>{initial.matiere}</span>
      <button type="button" onClick={() => onSaved({ controles: [{ id: 'c1', matiere: initial.matiere, date: dans3jours, titre: 'Thalès', chapitres: [] }] })}>Ajouter</button>
    </div>
  ),
}))

const { default: Onboarding } = await import('../Onboarding')

const ecrire = () => render(<MemoryRouter><Onboarding /></MemoryRouter>)
const bouton = name => screen.getByRole('button', { name })
const titre = () => screen.getByRole('heading', { level: 1 }).textContent
// Les espaces avant « ? » sont insécables à l'écran.
const sans = t => t.replace(/ /g, ' ')

function jusquAuControle() { fireEvent.click(bouton('C’est parti')) }
function noterMaths() {
  fireEvent.click(bouton('Maths'))
  fireEvent.click(bouton('Ajouter'))
}
function jusquAuPlan() {
  jusquAuControle()
  noterMaths()
  fireEvent.click(bouton('Continuer'))
  fireEvent.click(screen.getByRole('radio', { name: 'Retenir mes leçons' }))
  fireEvent.click(bouton('Continuer'))
  fireEvent.click(screen.getByRole('radio', { name: /Gagner 2 ou 3 points/ }))
  fireEvent.click(bouton('Continuer'))
}

describe('<Onboarding />', () => {
  beforeEach(() => {
    localStorage.clear()
    nav.mockClear()
    auth.level = { cycle: 'college', classe: '3ème' }
  })

  it('Réviz se présente, salue par le prénom, sans barre de progression', () => {
    ecrire()
    expect(sans(titre())).toContain("Salut Léa, moi c'est Réviz.")
    expect(sans(titre())).toContain('Trois petites questions d’abord.')
    expect(screen.queryByLabelText(/Étape \d sur/)).not.toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  })

  it('profil sans classe : la classe se choisit au premier écran puis s’enregistre', () => {
    auth.level = null
    auth.setUserLevel.mockClear()
    ecrire()
    jusquAuControle()
    expect(screen.getByRole('alert')).toHaveTextContent('Choisis ta classe.')
    fireEvent.click(screen.getByRole('radio', { name: '5e' }))
    jusquAuControle()
    expect(auth.setUserLevel).toHaveBeenCalledWith({ cycle: 'college', classe: '5ème' })
    expect(sans(titre())).toContain('Ton prochain contrôle, c’est en quoi ?')
  })

  it('le contrôle : la matière ouvre la feuille de l’agenda, puis Réviz confirme', () => {
    ecrire()
    jusquAuControle()
    expect(screen.getByLabelText('Étape 1 sur 3')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Matière du contrôle' }).querySelectorAll('button')).toHaveLength(8)
    fireEvent.click(bouton('Maths'))
    expect(screen.getByRole('dialog', { name: 'Ajouter un contrôle' })).toHaveTextContent('maths')
    fireEvent.click(bouton('Ajouter'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(sans(titre())).toMatch(/^Noté : contrôle de maths [a-z]+ \d+ [a-zéû]+\./)
    expect(screen.getByText(/plan de révision en \d étapes/)).toBeInTheDocument()
    // On peut se raviser.
    fireEvent.click(bouton('Changer de contrôle'))
    expect(screen.getByRole('group', { name: 'Matière du contrôle' })).toBeInTheDocument()
  })

  it('pas de contrôle prévu : on passe à la question suivante, sans reproche', () => {
    ecrire()
    jusquAuControle()
    fireEvent.click(bouton('Pas de contrôle prévu'))
    expect(screen.getByLabelText('Étape 2 sur 3')).toBeInTheDocument()
    expect(sans(titre())).toContain('Pas de souci, tu le noteras plus tard.')
  })

  it('ce qui bloque : Réviz répond au choix, et on ne continue qu’après avoir choisi', () => {
    ecrire()
    jusquAuControle()
    noterMaths()
    fireEvent.click(bouton('Continuer'))
    expect(sans(titre())).toContain('Qu’est-ce qui te bloque le plus ?')
    expect(bouton('Continuer')).toBeDisabled()
    fireEvent.click(screen.getByRole('radio', { name: 'Le stress des contrôles' }))
    expect(screen.getByRole('radio', { name: 'Le stress des contrôles' })).toHaveAttribute('aria-checked', 'true')
    expect(titre()).toContain('On s’entraîne comme le jour J.')
    expect(bouton('Continuer')).toBeEnabled()
  })

  it('la note visée : nommée par matière, rangée en facile, faisable ou ambitieux', () => {
    ecrire()
    jusquAuControle()
    noterMaths()
    fireEvent.click(bouton('Continuer'))
    fireEvent.click(screen.getByRole('radio', { name: 'M’y mettre' }))
    fireEvent.click(bouton('Continuer'))
    expect(screen.getByLabelText('Étape 3 sur 3')).toBeInTheDocument()
    expect(sans(titre())).toContain('Tu vises quelle note en maths ?')
    expect(screen.getAllByRole('radio').map(r => r.textContent)).toEqual([
      'Avoir la moyenneFacile', 'Gagner 2 ou 3 pointsFaisable', 'Viser 16 et plusAmbitieux',
    ])
    fireEvent.click(screen.getByRole('radio', { name: /Viser 16 et plus/ }))
    expect(sans(titre())).toContain('Objectif ambitieux. On vise juste et on commence tôt.')
  })

  it('« C’est prêt » : le plan de départ reprend les trois réponses, puis la séance d’accueil', () => {
    ecrire()
    jusquAuPlan()
    expect(sans(titre())).toContain('C’est prêt, Léa.')
    expect(screen.queryByLabelText(/Étape \d sur/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Passer' })).not.toBeInTheDocument()
    const plan = screen.getByRole('list', { name: 'Ton plan de départ' })
    expect(plan).toHaveTextContent(/Contrôle de maths/)
    expect(plan).toHaveTextContent('Retenir mes leçons')
    expect(plan).toHaveTextContent('Gagner 2 ou 3 points')
    expect(screen.getByText(/3\squestions faciles/)).toBeInTheDocument()
    fireEvent.click(bouton('C’est parti'))
    expect(localStorage.getItem('reviz-onboarded-u1')).toBe('1')
    expect(JSON.parse(localStorage.getItem('reviz-entree-u1'))).toEqual({ controle: 'c1', blocage: 'retenir', objectif: 'progresser' })
    expect(nav).toHaveBeenCalledWith('/exercices?premiere=1', { replace: true })
  })

  it('au collège : on peut aussi choisir un chapitre soi-même', () => {
    ecrire()
    jusquAuPlan()
    fireEvent.click(bouton('ou choisir un chapitre de 3e'))
    expect(nav).toHaveBeenCalledWith('/programme', { replace: true })
  })

  it('« Passer » marque l’onboarding vu et renvoie à l’accueil', () => {
    ecrire()
    fireEvent.click(bouton('Passer'))
    expect(localStorage.getItem('reviz-onboarded-u1')).toBe('1')
    expect(nav).toHaveBeenCalledWith('/', { replace: true })
  })

  it('au lycée : le scan d’abord, le programme de 3ème en second', () => {
    auth.level = { cycle: 'lycee', classe: 'Terminale', specialites: ['Maths'] }
    ecrire()
    jusquAuPlan()
    expect(screen.getByRole('button', { name: /voir le programme de 3e/ })).toBeInTheDocument()
    fireEvent.click(bouton(/Scanner ma première leçon/))
    expect(nav).toHaveBeenCalledWith('/scan', { replace: true })
  })

  it('déjà vu : renvoie à l’accueil sans rien afficher de plus', () => {
    localStorage.setItem('reviz-onboarded-u1', '1')
    ecrire()
    expect(nav).toHaveBeenCalledWith('/', { replace: true })
  })
})

describe('découverte : réponses données avant le compte (pages/Commencer.jsx)', () => {
  it('rangées sur le compte, puis la séance d’accueil, sans reposer les questions', async () => {
    const { waitFor } = await import('@testing-library/react')
    const agenda = await import('../../services/agendaService')
    const ajout = vi.spyOn(agenda, 'ajouterControle').mockResolvedValue({ controles: [] })
    localStorage.clear()
    nav.mockClear()
    localStorage.setItem('reviz-entree-attente', JSON.stringify({ le: Date.now(), prenom: 'Léa', classe: '3ème', controle: { matiere: 'maths', titre: 'Thalès', date: dans3jours, chapitres: [] }, blocage: 'retenir', objectif: 'haut', fini: true }))
    ecrire()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Bienvenue, Léa.')
    await waitFor(() => expect(nav).toHaveBeenCalledWith('/exercices?premiere=1', { replace: true }))
    expect(ajout).toHaveBeenCalledWith(expect.objectContaining({ uid: 'u1' }), expect.objectContaining({ matiere: 'maths', date: dans3jours }))
    expect(JSON.parse(localStorage.getItem('reviz-entree-u1'))).toEqual({ controle: 'note', blocage: 'retenir', objectif: 'haut' })
    expect(localStorage.getItem('reviz-onboarded-u1')).toBe('1')
    expect(localStorage.getItem('reviz-entree-attente')).toBeNull()
    ajout.mockRestore()
  })
  it('des réponses pas finies (abandon en route) : la découverte habituelle', () => {
    localStorage.clear()
    localStorage.setItem('reviz-entree-attente', JSON.stringify({ le: Date.now(), prenom: 'Léa', classe: '3ème' }))
    ecrire()
    expect(screen.getByRole('button', { name: 'C’est parti' })).toBeInTheDocument()
  })
})
