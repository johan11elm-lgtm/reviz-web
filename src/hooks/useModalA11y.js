import { useEffect, useRef } from 'react'

// Sélecteur des éléments focusables à l'intérieur d'une modale.
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Accessibilité des modales (WCAG 2.1.2 / 4.1.2) :
 * - Escape ferme la modale
 * - piège de focus (Tab/Shift+Tab cyclent à l'intérieur)
 * - focus initial sur le 1er élément focusable
 * - restauration du focus sur l'élément précédent à la fermeture
 *
 * @param {() => void} onClose appelé sur Escape
 * @param {boolean} [active=true] pour les panneaux montés en permanence
 *   (ex. Drawer animé en CSS) : ne piège le focus que quand ils sont ouverts
 * @returns ref à poser sur le conteneur de la modale (role="dialog")
 */
export function useModalA11y(onClose, active = true) {
  const ref = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!active) return
    const node = ref.current
    const previouslyFocused = document.activeElement

    const focusables = node ? node.querySelectorAll(FOCUSABLE) : []
    ;(focusables[0] || node)?.focus?.()

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current?.()
        return
      }
      if (e.key !== 'Tab' || !node) return
      // Le sélecteur exclut déjà disabled / tabindex=-1. Pas de filtre offsetParent
      // (null sur les éléments d'un conteneur position:fixed → exclusion erronée).
      const items = Array.from(node.querySelectorAll(FOCUSABLE))
      if (items.length === 0) { e.preventDefault(); return }
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      previouslyFocused?.focus?.()
    }
  }, [active])

  return ref
}
