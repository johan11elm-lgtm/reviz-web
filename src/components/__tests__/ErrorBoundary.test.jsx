import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { _reinitialiser } from '../../utils/rechargement'
import { ErrorBoundary } from '../ErrorBoundary'

const Plante = ({ message }) => { throw new TypeError(message) }
const MSG_CHUNK = 'Failed to fetch dynamically imported module: https://app.revizapp.fr/assets/Jeux-ancien.js'

let recharger
beforeEach(() => {
  _reinitialiser()
  recharger = vi.fn()
  vi.spyOn(window, 'location', 'get').mockReturnValue({ reload: recharger, href: '' })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => { vi.restoreAllMocks(); _reinitialiser() })

describe('<ErrorBoundary />', () => {
  it('une erreur ordinaire affiche « Oups », sans recharger', () => {
    render(<ErrorBoundary><Plante message="Cannot read properties of undefined" /></ErrorBoundary>)
    expect(screen.getByRole('alert')).toHaveTextContent('Oups')
    expect(recharger).not.toHaveBeenCalled()
  })

  it('un chunk disparu recharge une fois, sans écran « Oups »', () => {
    const { container } = render(<ErrorBoundary><Plante message={MSG_CHUNK} /></ErrorBoundary>)
    expect(recharger).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(container).toBeEmptyDOMElement()
  })

  it('reconnaît le message de Safari', () => {
    render(<ErrorBoundary><Plante message="Importing a module script failed." /></ErrorBoundary>)
    expect(recharger).toHaveBeenCalledTimes(1)
  })

  it('si le rechargement a déjà été tenté, montre « Oups » au lieu de boucler', () => {
    sessionStorage.setItem('reviz-rechargement', String(Date.now()))
    render(<ErrorBoundary><Plante message={MSG_CHUNK} /></ErrorBoundary>)
    expect(recharger).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('Oups')
  })
})
