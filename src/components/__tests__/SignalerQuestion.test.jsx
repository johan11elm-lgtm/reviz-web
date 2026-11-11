// « Signaler » sous la correction d'un exercice ou d'une question de quiz (11/11).
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const envoi = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('../../services/signalementService', () => ({ signalerReponse: envoi }))

const { SignalerReponse } = await import('../SignalerReponse')

describe('<SignalerReponse type="exercice" />', () => {
  it('propose les raisons d’une question et envoie le type et le format', async () => {
    render(<SignalerReponse type="exercice" format="intrus" reponse='{"consigne":"Trouve l’intrus"}' question="Trouve l’intrus" lessonId="ch1" />)
    fireEvent.click(screen.getByRole('button', { name: /Signaler/ }))
    expect(screen.getByRole('dialog', { name: 'Signaler cette question' })).toBeInTheDocument()
    expect(screen.getAllByRole('radio').map(r => r.textContent)).toEqual([
      'La question n’est pas claire', 'Plusieurs réponses sont justes', 'La correction est fausse',
      'Ce n’est pas dans mon programme', 'C’est beaucoup trop dur', 'Autre chose',
    ])
    fireEvent.click(screen.getByRole('radio', { name: 'Plusieurs réponses sont justes' }))
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }))
    expect(await screen.findByText('Merci, on relit cette question.')).toBeInTheDocument()
    expect(envoi).toHaveBeenCalledWith(expect.objectContaining({ type: 'exercice', format: 'intrus', raison: 'plusieurs', lessonId: 'ch1', question: 'Trouve l’intrus' }))
  })
  it('Réviz IA garde ses raisons et son texte', () => {
    render(<SignalerReponse reponse="2 + 2 = 5" />)
    fireEvent.click(screen.getByRole('button', { name: /Signaler/ }))
    expect(screen.getByRole('dialog', { name: 'Signaler cette réponse' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'C’est choquant ou déplacé' })).toBeInTheDocument()
  })
})
