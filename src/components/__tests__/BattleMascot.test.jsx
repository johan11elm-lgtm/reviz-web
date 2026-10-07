import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { BattleMascot, BATTLE_POSES, BATTLE_COULEURS, battleMascotBase } from '../BattleMascot'
import { MASCOT_POSES } from '../Mascot'

describe('<BattleMascot />', () => {
  it('affiche la pose en encre par défaut, WebP + PNG', () => {
    const { container } = render(<BattleMascot pose="aura" size={120} />)
    const img = screen.getByAltText('Cerveau bras croisés, sûr de lui')
    expect(img).toHaveAttribute('src', '/mascot/battle/pose-b2-aura-encre@256.png')
    expect(container.querySelector('source')).toHaveAttribute('srcset', '/mascot/battle/pose-b2-aura-encre@256.webp')
    expect(img).toHaveClass('mascot')
  })

  it('prend le bandeau rouge et la grande variante quand on le demande', () => {
    render(<BattleMascot pose="moinsaura" couleur="rouge" size={300} glow />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', '/mascot/battle/pose-b3-moinsaura-rouge@512.png')
    expect(img).toHaveClass('mascot--glow')
  })

  it('anime le 6-7 avec deux images décoratives sous un seul libellé', () => {
    render(<BattleMascot pose="sixseven" couleur="rouge" size={160} />)
    const conteneur = screen.getByRole('img', { name: 'Cerveau qui fait la balance avec ses mains' })
    const images = conteneur.querySelectorAll('img')
    expect(images).toHaveLength(2)
    expect(images[0]).toHaveAttribute('src', '/mascot/battle/pose-b6-sixseven-a-rouge@256.png')
    expect(images[0]).toHaveClass('battle-67__a')
    expect(images[1]).toHaveAttribute('src', '/mascot/battle/pose-b6-sixseven-b-rouge@256.png')
    expect(images[1]).toHaveClass('battle-67__b')
    images.forEach(img => expect(img).toHaveAttribute('alt', ''))
  })

  it('ne rend rien pour une pose ou une couleur inconnue', () => {
    expect(render(<BattleMascot pose="hello" />).container).toBeEmptyDOMElement()
    expect(render(<BattleMascot pose="garde" couleur="orange" />).container).toBeEmptyDOMElement()
  })

  it('chaque pose, image et couleur a ses fichiers dans public/', () => {
    for (const [pose, meta] of Object.entries(BATTLE_POSES)) {
      for (const frame of meta.frames ?? [null]) {
        for (const couleur of BATTLE_COULEURS) {
          for (const variant of ['@256', '@512']) {
            for (const ext of ['png', 'webp']) {
              const fichier = path.resolve('public' + battleMascotBase(pose, couleur, variant, frame) + '.' + ext)
              expect(existsSync(fichier), fichier).toBe(true)
            }
          }
        }
      }
    }
  })

  it('reste hors du catalogue général des mascottes', () => {
    expect(Object.values(MASCOT_POSES).some(m => String(m.num).startsWith('b'))).toBe(false)
  })
})
