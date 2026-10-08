import { describe, it, expect } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Profs from '../Profs'

const renderPage = (url = '/profs') => render(<MemoryRouter initialEntries={[url]}><Profs /></MemoryRouter>)

describe('<Profs /> — arrivée par l’affiche de la salle des profs', () => {
  it('propose de découvrir une classe du collège, en mode essai', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /Découvrir l'appli/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '4e' })).toHaveAttribute('href', '/essai?prof=1&classe=4%C3%A8me')
    expect(screen.getAllByRole('link', { name: /^[3-6]e$/ })).toHaveLength(4)
  })

  it('ou de donner directement son avis, provenance affiche', () => {
    renderPage()
    expect(screen.getByRole('link', { name: /Donner mon avis/ })).toHaveAttribute('href', '/avis?src=affiche-profs')
  })

  it('transmet la provenance du QR au formulaire d’avis, et ignore une provenance inconnue', () => {
    renderPage('/profs?src=affiche-cdi')
    expect(screen.getByRole('link', { name: /Donner mon avis/ })).toHaveAttribute('href', '/avis?src=affiche-cdi')
    cleanup()
    renderPage('/profs?src=mouchard')
    expect(screen.getByRole('link', { name: /Donner mon avis/ })).toHaveAttribute('href', '/avis?src=affiche-profs')
  })
})
