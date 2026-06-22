import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConfirmModal } from '../ConfirmModal'

function setup() {
  const onCancel = vi.fn()
  const onConfirm = vi.fn()
  render(<ConfirmModal lessonTitle="Théorème de Thalès" onConfirm={onConfirm} onCancel={onCancel} />)
  return { onCancel, onConfirm }
}

describe('<ConfirmModal /> — accessibilité', () => {
  it('expose role="dialog" + aria-modal + titre lié', () => {
    setup()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'confirm-modal-title')
    expect(document.getElementById('confirm-modal-title')).toHaveTextContent('Supprimer cette leçon ?')
  })

  it('Échap déclenche onCancel', () => {
    const { onCancel } = setup()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('met le focus initial sur le 1er bouton (Annuler, action sûre)', () => {
    setup()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Annuler' }))
  })

  it('piège le focus : Tab depuis le dernier bouton revient au premier', () => {
    setup()
    const cancel = screen.getByRole('button', { name: 'Annuler' })
    const del = screen.getByRole('button', { name: 'Supprimer' })
    del.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(cancel)
  })
})
