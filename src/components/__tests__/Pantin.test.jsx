import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { Pantin, prechargerMoteurPantin } from '../Pantin'

// Ce fichier enchaîne, sur le même état de module, un échec de chargement du moteur puis un
// nouvel essai réussi. happy-dom ne charge pas les fichiers JS : on simule le réseau en
// interceptant l'ajout des balises <script> (src retiré pour que happy-dom ne s'en mêle pas ;
// la balise reste dans le document, comme dans un vrai navigateur qui a échoué).
const scripts = () => [...document.querySelectorAll('script[data-pantin]')]

function reseau(sortie) {
  const demandes = []
  const ajouter = document.head.appendChild.bind(document.head)
  vi.spyOn(document.head, 'appendChild').mockImplementation((s) => {
    if (s.tagName !== 'SCRIPT') return ajouter(s)
    demandes.push(s.getAttribute('src'))
    s.removeAttribute('src')
    ajouter(s)
    queueMicrotask(() => (sortie(s) === 'ok' ? s.onload() : s.onerror()))
    return s
  })
  return demandes
}

afterEach(() => vi.restoreAllMocks())

describe('<Pantin /> : moteur qui ne charge pas', () => {
  it('garde la mascotte de repli affichée, sans planter', async () => {
    reseau(() => 'ko')
    const { container } = render(<Pantin />)
    expect(container.querySelector('.pantin-repli')).not.toBeNull()
    await waitFor(() => expect(scripts()).toHaveLength(0), { timeout: 2000 })
    await new Promise(r => setTimeout(r, 50))
    expect(container.querySelector('.pantin-repli')).not.toBeNull()
  })

  it('un nouvel essai retélécharge le script au lieu d\'attendre indéfiniment', async () => {
    // 1er essai : le réseau lâche. La promesse est rejetée, aucune balise morte ne reste.
    reseau(() => 'ko')
    await expect(prechargerMoteurPantin()).rejects.toThrow(/n'a pas pu être chargé/)
    expect(scripts()).toHaveLength(0)

    // 2e essai : le réseau est revenu, chacun des 9 scripts se charge.
    vi.restoreAllMocks()
    const demandes = reseau(() => 'ok')
    await expect(prechargerMoteurPantin()).resolves.toBeDefined()
    expect(demandes).toHaveLength(9)
    expect(demandes[0]).toBe('/pantin/moteur/reviz-d1-pieces.js')
  })
})
