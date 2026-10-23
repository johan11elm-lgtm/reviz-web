import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

// Les jeux eux-mêmes sont remplacés par des maquettes : ici on teste la page qui les enchaîne (chrono,
// fin de manche, partie du jour, croix), pas le moteur de chaque jeu.
vi.mock('../../services/firebaseConfig', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({ doc: () => ({}), updateDoc: async () => {}, getDoc: async () => ({ data: () => ({}) }), arrayUnion: () => ({}) }))
vi.mock('../../services/statsService', () => ({ track: () => {} }))
const mesurer = vi.fn()
vi.mock('../../services/mesure', () => ({ mesurer: (...a) => mesurer(...a) }))
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ getUserLevel: () => ({ classe: '6ème' }), currentUser: { uid: 'u1' } }) }))
vi.mock('../../services/programmeService', () => ({ loadCatalogue: async () => ({ matieres: [] }), loadChapterContent: async () => ({}) }))
vi.mock('../../components/Pantin', () => ({ Pantin: () => null, prechargerMoteurPantin: async () => {} }))
vi.mock('../../components/reviz/BulleReviz', () => ({ BulleReviz: () => null }))
vi.mock('../../utils/bruitages', () => ({ jouer: () => {}, sonActif: () => false, bruitagesActifs: () => {}, contexteAudio: () => null }))
vi.mock('../../services/partieDuJourService', async importOriginal => {
  const m = await importOriginal()
  return { ...m, synchroniserStats: async () => {}, avecHasardDuJour: vi.fn((_f, jour) => [{ type: 'ninja', niveau: 0, duree: 10, apercu: 0, titre: 'T', annonce: 'A', sous: 'S', jourTire: jour }]), enregistrerPartieDuJour: vi.fn(m.enregistrerPartieDuJour) }
})
vi.mock('../jeux/HubJeux', () => ({
  JEUX_HUB: [],
  HubJeux: ({ jour, onJouer, onFermer }) => (
    <div>
      <output data-testid="hub">{jour.jour}|{jour.record}</output>
      <button onClick={onFermer}>Fermer le hub</button>
      <button onClick={() => onJouer('jour')}>Jouer la partie du jour</button>
      <button onClick={() => onJouer('ninja')}>Jouer le ninja</button>
    </div>
  ),
}))
vi.mock('../jeux/CarteDebut', () => ({
  CarteDebut: ({ onDemarrer }) => <button onClick={onDemarrer}>Démarrer</button>,
}))
const manchesNinja = () => [0, 1, 2].map(niveau => ({ type: 'ninja', niveau, duree: 10, apercu: 0, titre: `T${niveau}`, annonce: 'A', sous: 'S' }))
vi.mock('../jeux/Ninja', () => ({
  mancheNinja: (_t, niveau) => ({ type: 'ninja', niveau, duree: 10, apercu: 0 }),
  partieNinja: () => manchesNinja(),
  TEMPO_NINJA: () => 132,
  PlateauNinja: ({ idx, phase, expire, onBon, onTermine, fermer, score }) => (
    <div>
      <output data-testid="ninja">{`${idx}|${phase}|${expire}|${score}`}</output>
      <button onClick={() => onBon()}>bonne</button>
      <button onClick={() => onTermine([{ jeu: 'ninja', theme: 'x', question: 'q', donnee: null, bonne: 'b', explication: 'e' }])}>terminer</button>
      {fermer}
    </div>
  ),
}))

const { enregistrerPartieDuJour, avecHasardDuJour } = await import('../../services/partieDuJourService')
const Jeux = (await import('../Jeux')).default

const visibilite = etat => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => etat })
  act(() => { document.dispatchEvent(new Event('visibilitychange')) })
}
// Par petits pas : React doit pouvoir poser les minuteries des effets entre deux échéances (une seule grosse
// avance sauterait les enchaînements).
const avancer = ms => { for (let t = 0; t < ms; t += 50) act(() => { vi.advanceTimersByTime(Math.min(50, ms - t)) }) }
const cliquer = nom => act(() => { fireEvent.click(nom === 'Fermer' ? screen.getByLabelText('Fermer') : screen.getByText(nom)) })
const etat = () => screen.getByTestId('ninja').textContent

function rendre({ entrees = ['/jeux'], index } = {}) {
  return render(
    <MemoryRouter initialEntries={entrees} initialIndex={index}>
      <Routes>
        <Route path="/jeux" element={<Jeux />} />
        <Route path="/" element={<p>ACCUEIL</p>} />
        <Route path="/autre" element={<p>AUTRE</p>} />
      </Routes>
    </MemoryRouter>,
  )
}
// Du hub à la première manche : la carte de début, « Démarrer », la consigne (1,7 s + déroulé), puis le chrono part.
function jouer(bouton) {
  cliquer(bouton)
  cliquer('Démarrer')
  avancer(2400)
}

beforeEach(() => {
  localStorage.clear()
  mesurer.mockClear(); enregistrerPartieDuJour.mockClear(); avecHasardDuJour.mockClear()
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame'] })
  vi.setSystemTime(new Date('2026-10-23T12:00:00Z'))
  window.history.replaceState(null, '')
  visibilite('visible')
})
afterEach(() => { vi.useRealTimers(); visibilite('visible') })

describe('Réviz Games — la page', () => {
  it('une partie démarre : le tour 1 est en jeu', () => {
    rendre()
    jouer('Jouer le ninja')
    expect(etat()).toBe('0|jeu|false|0')
  })

  describe('3 — pause en arrière-plan', () => {
    it('le chrono du tour s’arrête quand la page est cachée et repart avec le temps qui restait', () => {
      rendre()
      jouer('Jouer le ninja')
      avancer(3000)
      visibilite('hidden')
      avancer(120_000)
      expect(etat()).toBe('0|jeu|false|0') // pas « Temps écoulé » pendant l'absence
      visibilite('visible')
      avancer(6700) // 150 ms de jeu avant la fin de la consigne + 3 s : il reste 6,85 s
      expect(etat()).toBe('0|jeu|false|0')
      avancer(200)
      expect(etat()).toBe('0|jeu|true|0') // les 10 s du tour sont écoulées au total
    })

    it('un tour qui démarre pendant l’absence attend le retour pour lancer son chrono', () => {
      rendre()
      cliquer('Jouer le ninja')
      cliquer('Démarrer')
      avancer(500)
      visibilite('hidden')
      avancer(60_000)
      expect(etat()).toMatch(/^0\|consigne/) // la consigne est gelée aussi
      visibilite('visible')
      avancer(2000)
      expect(etat()).toBe('0|jeu|false|0')
      avancer(9000)
      expect(etat()).toBe('0|jeu|false|0')
      avancer(1100)
      expect(etat()).toBe('0|jeu|true|0')
    })

    it('la transition entre deux tours ne se déroule pas dans le vide pendant l’absence', () => {
      rendre()
      jouer('Jouer le ninja')
      cliquer('terminer')
      avancer(300)
      visibilite('hidden')
      avancer(60_000)
      expect(etat()).toMatch(/^0\|jeu/) // le tour 2 n'est pas arrivé tout seul
      visibilite('visible')
      avancer(500 + 600 + 1600 + 7000 + 2400)
      expect(etat()).toMatch(/^1\|jeu/)
    })
  })

  describe('4 — la croix ne laisse rien derrière elle', () => {
    it('fermer juste après la fin d’un tour : ni transition, ni tour suivant, ni écran de fin', () => {
      rendre()
      jouer('Jouer le ninja')
      cliquer('terminer')
      avancer(100)
      cliquer('Fermer')
      expect(screen.getByTestId('hub')).toBeInTheDocument()
      avancer(30_000)
      expect(screen.getByTestId('hub')).toBeInTheDocument()
      expect(screen.queryByTestId('ninja')).toBeNull()
      expect(document.querySelector('.tj')).toBeNull()
      expect(mesurer).toHaveBeenCalledWith('partie_abandonnee', expect.objectContaining({ mode: 'ninja' }))
    })

    it('fermer pendant la transition, puis relancer : la partie repart du tour 1, sans voile de transition', () => {
      rendre()
      jouer('Jouer le ninja')
      cliquer('terminer')
      avancer(650 + 200) // la transition a commencé
      cliquer('Fermer')
      avancer(20_000)
      jouer('Jouer le ninja')
      expect(etat()).toBe('0|jeu|false|0')
      expect(document.querySelector('.tj')).toBeNull()
    })

    it('la partie du jour abandonnée après la dernière réponse n’est pas enregistrée', () => {
      rendre()
      jouer('Jouer la partie du jour')
      cliquer('bonne')
      cliquer('terminer') // dernière (seule) manche : l'écran de fin viendrait 650 ms après
      avancer(200)
      cliquer('Fermer')
      avancer(30_000)
      expect(enregistrerPartieDuJour).not.toHaveBeenCalled()
      expect(screen.getByTestId('hub')).toBeInTheDocument()
    })

    it('au contraire, finie jusqu’au bout, elle est enregistrée une fois', () => {
      rendre()
      jouer('Jouer la partie du jour')
      cliquer('bonne'); cliquer('bonne')
      cliquer('terminer')
      avancer(700)
      expect(enregistrerPartieDuJour).toHaveBeenCalledTimes(1)
      expect(enregistrerPartieDuJour.mock.calls[0].slice(0, 2)).toEqual(['u1', 200])
    })
  })

  describe('5 — la partie du jour', () => {
    it('a — tirée à 23 h 59, finie après minuit : elle compte pour le jour où elle a été tirée', () => {
      vi.setSystemTime(new Date('2026-10-23T21:59:30Z')) // 23 h 59 à Paris
      rendre()
      cliquer('Jouer la partie du jour')
      expect(avecHasardDuJour).toHaveBeenCalledWith(expect.any(Function), '2026-10-23')
      cliquer('Démarrer')
      avancer(2400)
      cliquer('bonne')
      vi.setSystemTime(new Date('2026-10-23T22:01:00Z')) // 0 h 01, le 24
      cliquer('terminer')
      avancer(700)
      expect(enregistrerPartieDuJour).toHaveBeenCalledWith('u1', 100, '2026-10-23')
    })

    it('b — au retour au premier plan, l’état du jour est recalculé (le hub passe au nouveau jour)', () => {
      rendre()
      expect(screen.getByTestId('hub').textContent).toBe('2026-10-23|0')
      visibilite('hidden')
      vi.setSystemTime(new Date('2026-10-24T08:00:00Z'))
      visibilite('visible')
      expect(screen.getByTestId('hub').textContent).toBe('2026-10-24|0')
    })

    it('c — le podium de la partie du jour affiche le record du hub, pas la clé locale des jeux', () => {
      localStorage.setItem('reviz-jeux-jour-u1', JSON.stringify({ jours: [], record: 800, scores: {} }))
      localStorage.setItem('reviz-jeux-record-jour', '300') // l'ancienne clé locale, périmée
      rendre()
      expect(screen.getByTestId('hub').textContent).toBe('2026-10-23|800')
      jouer('Jouer la partie du jour')
      cliquer('bonne'); cliquer('bonne')
      cliquer('terminer')
      avancer(700)
      expect(document.querySelector('.fp-meilleur').textContent).toMatch(/Meilleur\s*:\s*800/)
      expect(localStorage.getItem('reviz-jeux-record-jour')).toBe('300') // la clé locale n'est plus touchée
    })

    it('c — les autres modes gardent leur record local', () => {
      localStorage.setItem('reviz-jeux-record-ninja', '500')
      rendre()
      jouer('Jouer le ninja')
      for (let i = 0; i < 3; i++) {
        cliquer('bonne'); cliquer('bonne')
        cliquer('terminer')
        avancer(650 + 500 + 1600 + 7000 + 2400)
      }
      expect(document.querySelector('.fp-meilleur').textContent).toMatch(/Meilleur\s*:\s*600/)
      expect(localStorage.getItem('reviz-jeux-record-ninja')).toBe('600')
    })
  })

  describe('6 — la croix de l’écran des jeux', () => {
    it('avec une page avant dans l’app : retour à cette page', () => {
      rendre({ entrees: ['/autre', '/jeux'], index: 1 })
      cliquer('Fermer le hub')
      expect(screen.getByText('AUTRE')).toBeInTheDocument()
    })

    it('arrivé par un lien direct (rien avant) : l’accueil, pas la sortie de l’app', () => {
      rendre({ entrees: ['/jeux'] })
      cliquer('Fermer le hub')
      expect(screen.getByText('ACCUEIL')).toBeInTheDocument()
    })

    it('première entrée de l’historique du navigateur (idx 0) : l’accueil aussi', () => {
      window.history.replaceState({ idx: 0 }, '')
      rendre({ entrees: ['/autre', '/jeux'], index: 1 })
      cliquer('Fermer le hub')
      expect(screen.getByText('ACCUEIL')).toBeInTheDocument()
    })
  })
})
