// « Explique à voix haute » (11/11) : dictée du navigateur, ou texte, puis Réviz IA corrige.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ExpliqueVoix, questionExplication } from '../ExpliqueVoix'

class FausseDictee {
  static derniere = null
  constructor() { FausseDictee.derniere = this }
  start() {}
  stop() { this.onend?.() }
  abort() {}
  dire(t, final = true) { this.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: t }], { isFinal: final })] }) }
}

describe('<ExpliqueVoix />', () => {
  afterEach(() => { delete window.webkitSpeechRecognition })

  it('la question demande ce qui est juste, ce qui manque et ce qui est faux', () => {
    const q = questionExplication('Le théorème de Thalès', ' Deux droites parallèles…  ')
    expect(q).toContain('« Le théorème de Thalès »')
    expect(q).toContain('« Deux droites parallèles… »')
    expect(q).toMatch(/ce qui est juste, ce qui manque et ce qui est faux/)
  })
  it('à voix haute : ce que dit l’élève s’écrit, puis part à Réviz IA', () => {
    window.webkitSpeechRecognition = FausseDictee
    const onEnvoyer = vi.fn()
    render(<ExpliqueVoix titre="Le théorème de Thalès" onEnvoyer={onEnvoyer} />)
    fireEvent.click(screen.getByRole('button', { name: /Explique-le à voix haute/ }))
    fireEvent.click(screen.getByRole('button', { name: /Parler/ }))
    expect(FausseDictee.derniere.lang).toBe('fr-FR')
    act(() => FausseDictee.derniere.dire('Si deux droites sont parallèles, les rapports sont égaux.'))
    expect(screen.getByLabelText('Ce que tu as retenu')).toHaveValue('Si deux droites sont parallèles, les rapports sont égaux.')
    fireEvent.click(screen.getByRole('button', { name: /J’ai fini de parler/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Demander à Réviz IA' }))
    expect(onEnvoyer).toHaveBeenCalledWith(expect.stringContaining('les rapports sont égaux'))
  })
  it('sans dictée : on l’écrit ; trop court, on demande d’en dire plus', () => {
    const onEnvoyer = vi.fn()
    render(<ExpliqueVoix titre="Pythagore" onEnvoyer={onEnvoyer} />)
    fireEvent.click(screen.getByRole('button', { name: /Explique-le à voix haute/ }))
    expect(screen.queryByRole('button', { name: /Parler/ })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Ce que tu as retenu'), { target: { value: 'carré' } })
    fireEvent.click(screen.getByRole('button', { name: 'Demander à Réviz IA' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Dis-en un peu plus')
    expect(onEnvoyer).not.toHaveBeenCalled()
  })
  it('micro refusé : on passe à l’écrit', () => {
    window.webkitSpeechRecognition = FausseDictee
    render(<ExpliqueVoix titre="Pythagore" onEnvoyer={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /Explique-le à voix haute/ }))
    fireEvent.click(screen.getByRole('button', { name: /Parler/ }))
    act(() => FausseDictee.derniere.onerror({ error: 'not-allowed' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Le micro est bloqué')
    expect(screen.getByLabelText('Ce que tu as retenu')).toHaveAttribute('placeholder', 'Écris-le en quelques phrases…')
  })
})
