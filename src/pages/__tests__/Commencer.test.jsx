// Entrée sans compte (11/11, façon app Knowunity) : Réviz pose ses questions d'abord, le compte vient
// à la fin. Les réponses attendent sur l'appareil (utils/entreeAttente.js).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const nav = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', async (importOriginal) => ({ ...(await importOriginal()), useNavigate: () => nav }))
const auth = vi.hoisted(() => ({ currentUser: null, isGuest: false }))
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }))
const mesure = vi.hoisted(() => ({ mesurer: vi.fn() }))
vi.mock('../../services/mesure', () => mesure)
const prog = vi.hoisted(() => ({ loadCatalogue: vi.fn() }))
vi.mock('../../services/programmeService', () => prog)
vi.mock('../../components/Pantin', () => ({ Pantin: () => null }))
const dans3jours = vi.hoisted(() => {
  const d = new Date(); d.setDate(d.getDate() + 3)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})
// La feuille de l'agenda : sans compte, elle rend le contrôle choisi au lieu de l'enregistrer.
vi.mock('../../components/AjoutControle', () => ({
  AjoutControle: ({ initial, sansCompte }) => (
    <div role="dialog" aria-label="Ajouter un contrôle">
      <span>{`classe ${sansCompte?.classe}`}</span>
      <button type="button" onClick={() => sansCompte.onChoisi({ matiere: initial.matiere, titre: 'Thalès', date: dans3jours, chapitres: [], classe: sansCompte.classe, programme: null })}>Ajouter</button>
    </div>
  ),
}))

const { default: Commencer } = await import('../Commencer')
const { lireEntree } = await import('../../utils/entreeAttente')

const ecrire = (url = '/commencer') => render(
  <MemoryRouter initialEntries={[url]}><Routes><Route path="/commencer" element={<Commencer />} /><Route path="/" element={<p>ACCUEIL</p>} /></Routes></MemoryRouter>
)
const bouton = name => screen.getByRole('button', { name })
const titre = () => screen.getByRole('heading', { level: 1 }).textContent.replace(/[\u00a0\u202f]/g, ' ')

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  nav.mockClear(); mesure.mesurer.mockClear(); localStorage.clear()
  auth.currentUser = null; auth.isGuest = false
  prog.loadCatalogue.mockReset().mockResolvedValue({ matieres: [{ slug: 'maths', matiere: 'Maths', chapitres: [{ id: 'thales', titre: 'Théorème de Thalès', pret: true }] }] })
})
afterEach(() => vi.useRealTimers())

describe('<Commencer /> — les questions avant le compte', () => {
  it('bonjour, prénom (Réviz répond pendant la frappe), classe, contrôle, blocage, note visée, puis le plan et le compte', () => {
    ecrire()
    expect(titre()).toContain('Salut, moi c’est Réviz.')
    fireEvent.click(bouton('C’est parti'))
    expect(titre()).toContain('Comment je t’appelle ?')
    fireEvent.click(bouton('Continuer'))
    expect(screen.getByRole('alert')).toHaveTextContent('Entre ton prénom.')
    fireEvent.change(screen.getByLabelText('Ton prénom'), { target: { value: 'Léa' } })
    expect(titre()).toContain('Enchanté, Léa !')
    fireEvent.click(bouton('Continuer'))

    expect(bouton('Continuer')).toBeDisabled()
    fireEvent.click(screen.getByRole('radio', { name: '3e' }))
    expect(titre()).toContain('La 3e, l’année du brevet.')
    fireEvent.click(bouton('Continuer'))

    fireEvent.click(bouton('Maths'))
    expect(screen.getByText('classe 3ème')).toBeInTheDocument()
    fireEvent.click(bouton('Ajouter'))
    expect(titre()).toContain('Noté : contrôle de maths')
    fireEvent.click(bouton('Continuer'))
    fireEvent.click(screen.getByRole('radio', { name: 'Retenir mes leçons' }))
    fireEvent.click(bouton('Continuer'))
    fireEvent.click(screen.getByRole('radio', { name: /Gagner 2 ou 3 points/ }))
    fireEvent.click(bouton('Continuer'))

    // Le chargement, ligne à ligne, puis « C'est prêt ».
    expect(titre()).toContain('Je prépare ton plan, Léa.')
    expect(screen.getByText(/Je cale le plan sur ton contrôle de maths/)).toBeInTheDocument()
    act(() => { vi.advanceTimersByTime(5000) })
    expect(titre()).toContain('C’est prêt, Léa.')
    expect(screen.getByRole('list', { name: 'Ton plan de départ' })).toHaveTextContent('Contrôle de maths')
    expect(lireEntree()).toMatchObject({ prenom: 'Léa', classe: '3ème', blocage: 'retenir', objectif: 'progresser', fini: true, controle: { matiere: 'maths', date: dans3jours } })

    fireEvent.click(bouton('Créer mon compte'))
    expect(nav).toHaveBeenCalledWith('/inscription')
    expect(mesure.mesurer).toHaveBeenCalledWith('entree_compte', { etape: 'clic', controle: 'note' })
    // Rien n'est parti au serveur : seulement des mesures, sans prénom.
    expect(JSON.stringify(mesure.mesurer.mock.calls)).not.toContain('Léa')
  })

  it('venu d’une fiche : la classe est connue (pas d’écran), le chapitre est gardé et annoncé', async () => {
    ecrire('/commencer?classe=3%C3%A8me&matiere=maths&chapitre=thales&via=fiche')
    fireEvent.click(bouton('C’est parti'))
    fireEvent.change(screen.getByLabelText('Ton prénom'), { target: { value: 'Tom' } })
    fireEvent.click(bouton('Continuer'))
    expect(titre()).toContain('Ton prochain contrôle, c’est en quoi ?')
    fireEvent.click(bouton('Pas de contrôle prévu'))
    fireEvent.click(screen.getByRole('radio', { name: 'M’y mettre' }))
    fireEvent.click(bouton('Continuer'))
    fireEvent.click(screen.getByRole('radio', { name: /Avoir la moyenne/ }))
    fireEvent.click(bouton('Continuer'))
    act(() => { vi.advanceTimersByTime(5000) })
    expect(await screen.findByText('Théorème de Thalès')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('reviz-arrivee'))).toMatchObject({ classe: '3ème', matiere: 'maths', chapitre: 'thales' })
    expect(lireEntree()).toMatchObject({ classe: '3ème', controle: 'aucun', fini: true })
    expect(mesure.mesurer).toHaveBeenCalledWith('entree_vue', { etape: 'bonjour', via: 'fiche', fiche: true })
  })

  it('plan déjà prêt (retour depuis l’inscription) : « C’est prêt » directement', () => {
    localStorage.setItem('reviz-entree-attente', JSON.stringify({ le: Date.now(), prenom: 'Léa', classe: '4ème', controle: 'aucun', blocage: 'quoi', objectif: 'haut', fini: true }))
    ecrire()
    expect(titre()).toContain('C’est prêt, Léa.')
  })

  it('un compte déjà connecté va à l’accueil', () => {
    auth.currentUser = { uid: 'u1' }
    ecrire()
    expect(screen.getByText('ACCUEIL')).toBeInTheDocument()
  })
})
