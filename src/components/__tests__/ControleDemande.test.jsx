import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { jourIso, ajouterJours } from '../../utils/agenda'

const auth = vi.hoisted(() => ({}))
const agenda = vi.hoisted(() => ({ local: { controles: [] }, distant: { controles: [] }, marquer: null }))
const cible = vi.hoisted(() => ({ fn: null }))
const naviguer = vi.hoisted(() => ({ fn: null }))
const mesure = vi.hoisted(() => ({ fn: null }))
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('react-router-dom', () => ({ useNavigate: () => naviguer.fn }))
vi.mock('../../services/agendaService', () => ({
  agendaLocal: () => agenda.local,
  chargerAgenda: async () => agenda.distant,
  marquerEtape: (...a) => agenda.marquer(...a),
}))
vi.mock('../../services/controleChapitres', () => ({
  chapitreAReviser: c => c.chapitres?.[0] ?? null,
  cibleRevision: (...a) => cible.fn(...a),
}))
vi.mock('../../services/mesure', () => ({ mesurer: (...a) => mesure.fn(...a) }))
// La feuille d'ajout de l'agenda a ses propres tests : ici, un bouton qui enregistre le contrôle.
vi.mock('../AjoutControle', () => ({
  AjoutControle: ({ initial, onSaved, onClose }) => (
    <div role="dialog" aria-label="Ajouter un contrôle">
      <span>matière : {initial.matiere}</span>
      <button type="button" onClick={() => onSaved({ controles: [...agenda.local.controles, agenda.nouveau(initial.matiere)] })}>Ajouter</button>
      <button type="button" onClick={onClose}>Fermer</button>
    </div>
  ),
}))

const { ControleDemande } = await import('../ControleDemande')
const { lireDemandes, noterDemandeControle, ESPACEMENT_MS } = await import('../../utils/demandeControle')

const APRES = <p>Je te rappelle demain ?</p>
// Espaces insécables avant « ? » et « : », comme partout dans l'app (utils/typography.js).
const QUESTION = 'Ton prochain contrôle, c’est en quoi\u00a0?'
const rendre = (lieu = 'fin_accueil') => render(<ControleDemande lieu={lieu} apres={APRES} />)
const dans = n => ajouterJours(jourIso(), n)

beforeEach(() => {
  localStorage.clear()
  Object.assign(auth, { currentUser: { uid: 'u1' }, isGuest: false })
  agenda.local = { controles: [] }
  agenda.distant = { controles: [] }
  agenda.marquer = vi.fn(async () => ({}))
  agenda.nouveau = matiere => ({ id: 'c1', matiere, titre: 'Théorème de Thalès', date: dans(3), cree: jourIso(), chapitres: [{ id: 'thales', titre: 'Théorème de Thalès' }] })
  cible.fn = vi.fn(async () => '/analyse')
  naviguer.fn = vi.fn()
  mesure.fn = vi.fn()
})

describe('<ControleDemande />', () => {
  it('demande la matière, ouvre la feuille déjà remplie, puis lance le premier pas du plan', async () => {
    rendre()
    expect(screen.getByRole('heading', { name: QUESTION })).toBeInTheDocument()
    // Une demande à la fois : le rappel attend.
    expect(screen.queryByText('Je te rappelle demain ?')).toBeNull()
    expect(lireDemandes('u1').fois).toBe(1)
    expect(mesure.fn).toHaveBeenCalledWith('controle_demande', { etape: 'vue', lieu: 'fin_accueil', essai: false })

    fireEvent.click(screen.getByRole('button', { name: 'Maths' }))
    expect(screen.getByRole('dialog', { name: 'Ajouter un contrôle' })).toHaveTextContent('matière : maths')
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }))

    expect(screen.getByRole('heading', { name: 'C’est noté' })).toBeInTheDocument()
    const carte = screen.getByRole('region', { name: 'C’est noté' })
    expect(carte).toHaveTextContent(/Contrôle de maths .*\. Ton plan de révision est prêt\. Premier pas\s: 5 minutes sur «\sThéorème de Thalès\s»\./)
    expect(screen.queryByRole('dialog')).toBeNull()
    // Contrôle noté : plus aucune demande ici (le rappel se proposera à l'ouverture de l'accueil),
    // et le compteur repart pour le contrôle suivant.
    expect(screen.queryByText('Je te rappelle demain ?')).toBeNull()
    expect(lireDemandes('u1').fois).toBe(0)
    expect(mesure.fn).toHaveBeenCalledWith('controle_demande', { etape: 'note', lieu: 'fin_accueil', essai: false, matiere: 'maths', jours: 3 })

    // Contrôle dans 3 jours : l'étape « flashcards » (J-5) tombe aujourd'hui, elle est notée lancée.
    fireEvent.click(screen.getByRole('button', { name: 'Commencer maintenant' }))
    await waitFor(() => expect(naviguer.fn).toHaveBeenCalledWith('/analyse', { replace: true }))
    expect(agenda.marquer).toHaveBeenCalledWith(auth.currentUser, 'c1', 'flash')
    expect(cible.fn).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1', matiere: 'maths' }))
  })

  it('contrôle encore loin : on prend de l’avance sans cocher d’étape', async () => {
    agenda.nouveau = matiere => ({ id: 'c2', matiere, titre: '', date: dans(12), cree: jourIso() })
    rendre()
    fireEvent.click(screen.getByRole('button', { name: 'SVT' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }))
    expect(screen.getByRole('region', { name: 'C’est noté' })).toHaveTextContent(/Contrôle de SVT .*\. Ton plan de révision est prêt\. Premier pas\s: 5 minutes maintenant\./)
    fireEvent.click(screen.getByRole('button', { name: 'Commencer maintenant' }))
    await waitFor(() => expect(naviguer.fn).toHaveBeenCalled())
    expect(agenda.marquer).not.toHaveBeenCalled()
  })

  it('« Pas de contrôle prévu » : la carte se retire et laisse la place au rappel', () => {
    rendre('fin_seance')
    fireEvent.click(screen.getByRole('button', { name: 'Pas de contrôle prévu' }))
    expect(screen.queryByRole('heading', { name: /Ton prochain contrôle/ })).toBeNull()
    expect(screen.getByText('Je te rappelle demain ?')).toBeInTheDocument()
    expect(mesure.fn).toHaveBeenCalledWith('controle_demande', { etape: 'non', lieu: 'fin_seance', essai: false })
  })

  it('un titre de chapitre à rallonge est coupé entre deux mots', () => {
    agenda.nouveau = matiere => ({ id: 'c3', matiere, titre: '', date: dans(6), cree: jourIso(), chapitres: [{ id: 'ville', titre: 'Se repérer en ville : l’impératif et les prépositions de lieu (getting around London)' }] })
    rendre()
    fireEvent.click(screen.getByRole('button', { name: 'Anglais' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }))
    expect(screen.getByRole('region', { name: 'C’est noté' })).toHaveTextContent(/5 minutes sur «\sSe repérer en ville\s: l’impératif et les…\s»\./)
  })

  it('« Autre matière » ouvre la feuille sur « autre »', () => {
    rendre()
    expect(screen.getByRole('group', { name: 'Matière du contrôle' }).querySelectorAll('button')).toHaveLength(8)
    fireEvent.click(screen.getByRole('button', { name: 'Autre matière' }))
    expect(screen.getByRole('dialog', { name: 'Ajouter un contrôle' })).toHaveTextContent('matière : autre')
  })

  it('fermer la feuille sans rien noter laisse la question en place', () => {
    rendre()
    fireEvent.click(screen.getByRole('button', { name: 'Histoire' }))
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('heading', { name: /Ton prochain contrôle/ })).toBeInTheDocument()
  })

  it('rien si un contrôle est déjà à venir, ni si on vient de demander', () => {
    agenda.local = { controles: [{ id: 'c0', matiere: 'maths', date: dans(2) }] }
    const { unmount } = rendre()
    expect(screen.queryByRole('heading', { name: /Ton prochain contrôle/ })).toBeNull()
    expect(screen.getByText('Je te rappelle demain ?')).toBeInTheDocument()
    expect(lireDemandes('u1').fois).toBe(0)
    unmount()

    agenda.local = { controles: [] }
    noterDemandeControle('u1', Date.now() - ESPACEMENT_MS + 60_000)
    rendre()
    expect(screen.queryByRole('heading', { name: /Ton prochain contrôle/ })).toBeNull()
    expect(screen.getByText('Je te rappelle demain ?')).toBeInTheDocument()
  })

  it('un contrôle noté sur un autre appareil : la demande se retire', async () => {
    agenda.distant = { controles: [{ id: 'c0', matiere: 'maths', date: dans(4) }] }
    rendre()
    await waitFor(() => expect(screen.queryByRole('heading', { name: /Ton prochain contrôle/ })).toBeNull())
    expect(screen.getByText('Je te rappelle demain ?')).toBeInTheDocument()
  })

  it('en essai : le contrôle est noté, et le compte se propose pour garder le plan', async () => {
    Object.assign(auth, { currentUser: { uid: 'guest-1', isGuest: true }, isGuest: true })
    // En essai, l'agenda ne vit que sur l'appareil : pas de lecture en ligne.
    agenda.distant = { controles: [{ id: 'c0', matiere: 'maths', date: dans(4) }] }
    rendre()
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: 'Anglais' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }))
    expect(screen.getByText('Crée ton compte gratuit pour garder ton plan.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon compte gratuit' }))
    expect(naviguer.fn).toHaveBeenCalledWith('/inscription')
    expect(mesure.fn).toHaveBeenCalledWith('essai_compte_cta', { lieu: 'controle' })
    expect(screen.getByRole('button', { name: 'Commencer maintenant' })).toBeInTheDocument()
  })
})
