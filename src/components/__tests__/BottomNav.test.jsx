import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { BottomNav } from '../BottomNav'

// happy-dom ne calcule pas de layout : on simule un conteneur de page qui
// défile verticalement (ou une rangée horizontale) en fixant ses mesures.
function makeScroller({ vertical = true, parent = document.body } = {}) {
  const el = document.createElement('div')
  let top = 0
  Object.defineProperty(el, 'scrollHeight', { value: vertical ? 2000 : 60, configurable: true })
  Object.defineProperty(el, 'clientHeight', { value: vertical ? 800 : 60, configurable: true })
  Object.defineProperty(el, 'scrollTop', { get: () => top, set: v => { top = v }, configurable: true })
  parent.appendChild(el)
  return el
}

function scrollTo(el, y) {
  el.scrollTop = y
  act(() => { el.dispatchEvent(new Event('scroll')) })
}

const setup = () => render(
  <MemoryRouter initialEntries={['/']}>
    <BottomNav />
  </MemoryRouter>
)
const isHidden = () => document.querySelector('.bottom-nav').classList.contains('bottom-nav--hidden')

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('<BottomNav /> — masquage au défilement', () => {
  it('se cache en défilant vers le bas, même si le conteneur apparaît après le montage (page lazy)', () => {
    setup()
    const page = makeScroller()
    expect(isHidden()).toBe(false)
    scrollTo(page, 40)
    expect(isHidden()).toBe(true)
  })

  it('réapparaît après 30 px de remontée, ou dès le haut de page', () => {
    setup()
    const page = makeScroller()
    scrollTo(page, 200)
    expect(isHidden()).toBe(true)
    scrollTo(page, 190)            // remontée de 10 px : pas encore
    expect(isHidden()).toBe(true)
    scrollTo(page, 160)            // 40 px cumulés : la nav revient
    expect(isHidden()).toBe(false)
    scrollTo(page, 300)
    expect(isHidden()).toBe(true)
    scrollTo(page, 4)              // retour en haut
    expect(isHidden()).toBe(false)
  })

  it('reste cachée pendant le rebond élastique en bas de page', () => {
    setup()
    const page = makeScroller()          // défilement maximal : 2000 - 800 = 1200
    scrollTo(page, 1200)
    expect(isHidden()).toBe(true)
    scrollTo(page, 1260)                 // dépassement (rubber band)
    scrollTo(page, 1200)                 // retour du rebond : pas une remontée
    expect(isHidden()).toBe(true)
    scrollTo(page, 1160)                 // vraie remontée de 40 px
    expect(isHidden()).toBe(false)
  })

  it('ignore les rangées horizontales et le défilement des feuilles (role="dialog")', () => {
    setup()
    const page = makeScroller()
    scrollTo(page, 200)
    expect(isHidden()).toBe(true)

    const row = makeScroller({ vertical: false })
    scrollTo(row, 0)               // une rangée de chips qui défile ne ré-affiche pas la nav
    expect(isHidden()).toBe(true)

    scrollTo(page, 0)
    expect(isHidden()).toBe(false)
    const sheet = document.createElement('div')
    sheet.setAttribute('role', 'dialog')
    document.body.appendChild(sheet)
    const sheetBody = makeScroller({ parent: sheet })
    scrollTo(sheetBody, 200)       // le fil du coach défile, la nav reste en place
    expect(isHidden()).toBe(false)
  })
})
