import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Resume from '../Resume'

const AI_DATA = {
  metadata: { title: 'La Révolution française', subject: 'Histoire' },
  flashcards: [
    { front: 'Q0', back: 'R0' },
    { front: 'Q1', back: 'R1' },
    { front: 'Q2', back: 'R2' },
    { front: 'Q3', back: 'R3' },
  ],
  resume: {
    intro: 'De 1789 à 1799, la monarchie absolue tombe.',
    keyPoints: ['14 juillet 1789 : prise de la Bastille', '26 août 1789 : DDHC'],
    sections: [
      { title: '1. 1789', content: 'Le tiers état conteste les privilèges.', exemple: 'Serment du Jeu de paume, 20 juin 1789.' },
      { title: '2. La République', content: 'La République est proclamée en 1792.', exemple: null },
    ],
    methode: { titre: 'Comment construire une frise', etapes: ['Tracer la flèche', 'Placer les dates'] },
    pieges: ['La prise de la Bastille ne met pas fin à la monarchie.'],
    keyTerms: [
      { term: 'tiers état', def: 'Ceux qui ne sont ni nobles ni clercs.' },
      { term: 'privilèges', def: 'Droits réservés à la noblesse et au clergé.' },
    ],
  },
}

const renderResume = () => render(<MemoryRouter><Resume /></MemoryRouter>)

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('reviz-ai-data', JSON.stringify(AI_DATA))
  localStorage.setItem('reviz-current-lesson-id', 'prog-revolution')
})

describe('<Resume /> — fiche enrichie', () => {
  it('affiche exemple, méthode et pièges, avec le numéro des sections en pastille', () => {
    renderResume()
    expect(screen.getByText('Serment du Jeu de paume, 20 juin 1789.')).toBeInTheDocument()
    expect(screen.getByText('Comment construire une frise')).toBeInTheDocument()
    expect(screen.getByText('Placer les dates')).toBeInTheDocument()
    expect(screen.getByText('La prise de la Bastille ne met pas fin à la monarchie.')).toBeInTheDocument()
    // « 1. 1789 » → titre « 1789 », le numéro passe dans la pastille
    expect(screen.getByRole('heading', { name: '1789' })).toBeInTheDocument()
  })

  it('reste lisible sur une leçon ancienne, sans les nouvelles rubriques', () => {
    const { methode, pieges, ...ancien } = AI_DATA.resume
    localStorage.setItem('reviz-ai-data', JSON.stringify({ ...AI_DATA, resume: ancien }))
    renderResume()
    expect(screen.queryByText('La méthode')).not.toBeInTheDocument()
    expect(screen.queryByText('Pièges à éviter')).not.toBeInTheDocument()
    expect(screen.getByText('Le cours')).toBeInTheDocument()
  })

  it('un terme du cours se touche et montre sa définition', () => {
    renderResume()
    fireEvent.click(screen.getByRole('button', { name: 'privilèges' }))
    expect(screen.getByRole('status')).toHaveTextContent('Droits réservés à la noblesse et au clergé.')
    fireEvent.click(screen.getByRole('button', { name: 'Fermer la définition' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('« Me tester » masque les points à retenir et les définitions jusqu\'au toucher', () => {
    renderResume()
    fireEvent.click(screen.getAllByRole('button', { name: 'Me tester' })[0])
    const point = screen.getByRole('button', { name: /Point 1 : masqué/ })
    expect(screen.getByRole('button', { name: /Définition de tiers état : masqué/ })).toBeInTheDocument()
    fireEvent.click(point)
    expect(screen.queryByRole('button', { name: /Point 1 : masqué/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Point 2 : masqué/ })).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Tout afficher' })[0])
    expect(screen.queryByRole('button', { name: /masqué/ })).not.toBeInTheDocument()
  })

  it('« Vérifie-toi » nourrit la répétition espacée des flashcards', () => {
    renderResume()
    // 4 cartes → début, milieu, fin : Q0, Q2, Q3
    expect(screen.getByText('Q0')).toBeInTheDocument()
    expect(screen.queryByText('Q1')).not.toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Voir la réponse' })[1])
    expect(screen.getByText('R2')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /À revoir/ }))
    const srs = JSON.parse(localStorage.getItem('reviz-srs') || '{}')
    expect(Object.keys(srs)).toEqual(['prog-revolution_2'])
    expect(screen.getByText(/dès demain dans tes flashcards/)).toBeInTheDocument()
  })
})

describe('<Resume /> — illustrations', () => {
  const avecFigures = illustrations =>
    localStorage.setItem('reviz-ai-data', JSON.stringify({ ...AI_DATA, illustrations }))
  const SVG = '<svg viewBox="0 0 10 10"><g class="ill-legende"><rect class="ill-fond"/><text>Aorte</text></g></svg>'

  afterEach(() => vi.unstubAllGlobals())

  it('affiche la figure dans sa section, avec légende et crédit', () => {
    avecFigures([{
      src: '/programme/illustrations/4eme/histoire/sacre.webp', alt: 'Le Sacre de Napoléon', ancre: 'resume.sections[1]',
      legende: 'Napoléon couronne Joséphine.', credit: 'Jacques-Louis David, 1807, musée du Louvre',
    }])
    renderResume()
    const img = screen.getByRole('img', { name: 'Le Sacre de Napoléon' })
    const section = img.closest('.resume-section-card')
    expect(within(section).getByText('La République est proclamée en 1792.')).toBeInTheDocument()
    expect(within(section).getByText('Jacques-Louis David, 1807, musée du Louvre')).toBeInTheDocument()
  })

  it('ignore une figure qui ne vient pas de nos fichiers', () => {
    avecFigures([{ src: 'https://exemple.com/x.png', alt: 'Piège', ancre: 'resume.sections[0]' }])
    renderResume()
    expect(screen.queryByRole('img', { name: 'Piège' })).not.toBeInTheDocument()
  })

  it('« Me tester » masque les légendes du schéma, révélées une à une au toucher', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => SVG })))
    avecFigures([{
      src: '/programme/illustrations/5eme/svt/coeur.svg', alt: 'Le cœur', ancre: 'resume.methode', legendesMasquables: true,
    }])
    renderResume()
    await screen.findByRole('img', { name: 'Le cœur' })
    fireEvent.click(screen.getAllByRole('button', { name: 'Me tester' })[0])
    const legende = screen.getByRole('button', { name: /Légende masquée/ })
    expect(screen.getByText(/Retrouve chaque légende/)).toBeInTheDocument()
    fireEvent.click(legende.querySelector('text'))
    expect(legende).toHaveClass('is-revealed')
    fireEvent.click(screen.getAllByRole('button', { name: 'Tout afficher' })[0])
    expect(legende).not.toHaveClass('is-revealed')
    expect(screen.queryByRole('button', { name: /Légende masquée/ })).not.toBeInTheDocument()
  })

  it('« Agrandir » ouvre le plein écran, « Fermer » le referme', () => {
    avecFigures([{ src: '/programme/illustrations/4eme/histoire/sacre.webp', alt: 'Le Sacre', ancre: 'resume.intro', legende: 'Le Sacre' }])
    renderResume()
    fireEvent.click(screen.getByRole('button', { name: "Agrandir l'illustration" }))
    const dialog = screen.getByRole('dialog', { name: 'Le Sacre' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Zoomer' }))
    expect(within(dialog).getByText('150 %')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Fermer' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
