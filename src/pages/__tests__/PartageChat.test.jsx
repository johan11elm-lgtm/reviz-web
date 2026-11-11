// /partage/:id (11/11) : la conversation partagée, lisible sans compte, et l'invitation à essayer.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const api = vi.hoisted(() => ({ fetch: vi.fn() }))
vi.mock('../../services/apiClient', () => ({ IS_NATIVE: false, apiFetch: api.fetch }))
const { default: PartageChat } = await import('../PartageChat')
const ouvrir = () => render(<MemoryRouter initialEntries={['/partage/abcdefghij12']}><Routes><Route path="/partage/:id" element={<PartageChat />} /></Routes></MemoryRouter>)

describe('/partage/:id', () => {
  beforeEach(() => api.fetch.mockReset())
  it('montre la conversation et invite à essayer Réviz', async () => {
    api.fetch.mockResolvedValue({ ok: true, json: async () => ({ titre: 'Le théorème de Thalès', messages: [{ role: 'user', content: 'C’est quoi ?' }, { role: 'assistant', content: 'Un **théorème** sur les longueurs.' }], creeLe: 1 }) })
    ouvrir()
    expect(await screen.findByText('C’est quoi ?')).toBeInTheDocument()
    expect(screen.getByText('théorème').tagName).toBe('STRONG')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Le théorème de Thalès')
    expect(screen.getByRole('link', { name: 'Essayer Réviz gratuitement' })).toHaveAttribute('href', '/welcome')
    expect(api.fetch).toHaveBeenCalledWith('/api/track?op=partage&id=abcdefghij12')
    expect(document.querySelector('meta[name="robots"]')?.content).toBe('noindex')
  })
  it('lien expiré : on le dit', async () => {
    api.fetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'INTROUVABLE' }) })
    ouvrir()
    expect(await screen.findByRole('alert')).toHaveTextContent('n’est plus disponible')
  })
})
