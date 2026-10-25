import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'

const setProvenance = vi.fn()
vi.mock('../../services/statsService', () => ({ setProvenance: (...a) => setProvenance(...a) }))

const { default: CodeVideo } = await import('../CodeVideo')

function Ici() {
  const l = useLocation()
  return <p data-testid="ici">{l.pathname + l.search}</p>
}

function ouvrir(chemin) {
  render(
    <MemoryRouter initialEntries={[chemin]}>
      <Routes>
        <Route path="/v/:code" element={<CodeVideo />} />
        <Route path="/essai" element={<Ici />} />
      </Routes>
    </MemoryRouter>,
  )
  return new URL(screen.getByTestId('ici').textContent, 'https://app.revizapp.fr')
}

describe('CodeVideo (/v/:code)', () => {
  it("ouvre l'essai du chapitre de la vidéo et retient la provenance", () => {
    const u = ouvrir('/v/X0')
    expect(u.pathname).toBe('/essai')
    expect(u.searchParams.get('v')).toBe('x0')
    expect(u.searchParams.get('chapitre')).toBe('seismes')
    expect(setProvenance).toHaveBeenLastCalledWith('reseaux', 'x0')
  })
  it("code inconnu : l'essai simple, provenance réseaux sans code", () => {
    const u = ouvrir('/v/zz99')
    expect(u.search).toBe('?via=reseaux')
    expect(setProvenance).toHaveBeenLastCalledWith('reseaux', null)
  })
})
