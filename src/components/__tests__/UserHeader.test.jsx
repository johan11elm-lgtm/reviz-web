import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { UserHeader } from '../UserHeader'

function Location() {
  const { pathname } = useLocation()
  return <div data-testid="loc">{pathname}</div>
}
const setup = (props = {}) => render(
  <MemoryRouter initialEntries={['/']}>
    <UserHeader prenom="Johan" level={3} xpInLvl={120} fillPct={24} {...props} />
    <Location />
  </MemoryRouter>
)

describe('<UserHeader />', () => {
  it('affiche prénom, niveau, badge et barre d’XP accessible', () => {
    setup()
    expect(screen.getByText('Johan')).toBeInTheDocument()
    expect(screen.getByText('Niveau 3')).toBeInTheDocument()
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '120')
    expect(bar).toHaveAttribute('aria-valuemax', '500')
    expect(bar.firstChild).toHaveStyle({ width: '24%' })
  })

  it('l’avatar mène au profil', () => {
    setup()
    fireEvent.click(screen.getByRole('link', { name: /profil/i }))
    expect(screen.getByTestId('loc')).toHaveTextContent('/profil')
  })

  it('la couronne mène aux réglages, libellé selon l’abonnement', () => {
    setup()
    const btn = screen.getByRole('button', { name: /Découvrir Réviz\+/ })
    fireEvent.click(btn)
    expect(screen.getByTestId('loc')).toHaveTextContent('/reglages')
  })

  it('couronne active en Réviz+', () => {
    setup({ isPremium: true })
    expect(screen.getByRole('button', { name: /Réviz\+ actif/ })).toHaveClass('rv-user-premium-btn--active')
  })

  it('le bouton coach n’apparaît qu’avec onCoach', () => {
    setup()
    expect(screen.queryByRole('button', { name: /coach/i })).toBeNull()
    const onCoach = vi.fn()
    setup({ onCoach })
    fireEvent.click(screen.getByRole('button', { name: /coach/i }))
    expect(onCoach).toHaveBeenCalledTimes(1)
  })
})
