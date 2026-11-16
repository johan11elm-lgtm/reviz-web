// -------------------------------------------------------
// Réviz — Tests du service de rappels (notifications locales)
// -------------------------------------------------------
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockIsNative, mockNotif } = vi.hoisted(() => ({
  mockIsNative: vi.fn(() => true),
  mockNotif: {
    checkPermissions:   vi.fn(),
    requestPermissions: vi.fn(),
    schedule:           vi.fn(async () => {}),
    cancel:             vi.fn(async () => {}),
    getPending:         vi.fn(async () => ({ notifications: [] })),
  },
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: mockIsNative },
}))
vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: mockNotif,
}))

async function loadService() {
  vi.resetModules()
  return await import('../reminderService.js')
}

// Lundi 16/11/2026, 10 h (heure locale du test).
const LUNDI = new Date(2026, 10, 16, 10, 0)

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(LUNDI)
  mockNotif.getPending.mockResolvedValue({ notifications: [] })
  mockIsNative.mockReturnValue(true)
  mockNotif.checkPermissions.mockResolvedValue({ display: 'granted' })
  mockNotif.requestPermissions.mockResolvedValue({ display: 'granted' })
})

describe('reminderBody', () => {
  it('accorde le pluriel des cartes dues', async () => {
    const svc = await loadService()
    expect(svc.reminderBody(1)).toContain('1 carte t\'attend')
    expect(svc.reminderBody(3)).toContain('3 cartes t\'attendent')
    expect(svc.reminderBody(0)).toContain('Cinq minutes')
  })
})

describe('enableReminder', () => {
  it('refuse sur le web (unavailable), sans toucher au plugin', async () => {
    mockIsNative.mockReturnValue(false)
    const svc = await loadService()
    const res = await svc.enableReminder(2)
    expect(res).toEqual({ ok: false, reason: 'unavailable' })
    expect(mockNotif.schedule).not.toHaveBeenCalled()
  })

  it('pose le rappel de 18 h 30 sur les jours d’école de la semaine, et persiste la préférence', async () => {
    const svc = await loadService()
    const res = await svc.enableReminder(2)
    expect(res.ok).toBe(true)
    expect(svc.isReminderEnabled()).toBe(true)
    const notifs = mockNotif.schedule.mock.calls[0][0].notifications
    expect(notifs.map(n => n.schedule.at)).toEqual([16, 17, 18, 19, 20].map(j => new Date(2026, 10, j, 18, 30)))
    expect(notifs.map(n => n.id)).toEqual([1001, 1002, 1003, 1004, 1005])
    expect(notifs[0].body).toContain('2 cartes')
  })

  it('en fin de séance, rien ce soir : l’élève vient de réviser', async () => {
    const svc = await loadService()
    await svc.enableReminder(0, { faitAujourdhui: true })
    const notifs = mockNotif.schedule.mock.calls[0][0].notifications
    expect(notifs[0].schedule.at).toEqual(new Date(2026, 10, 17, 18, 30))
    expect(notifs).toHaveLength(4)
  })

  it('demande la permission si non accordée, puis planifie', async () => {
    mockNotif.checkPermissions.mockResolvedValue({ display: 'prompt' })
    const svc = await loadService()
    const res = await svc.enableReminder(0)
    expect(mockNotif.requestPermissions).toHaveBeenCalled()
    expect(res.ok).toBe(true)
  })

  it('signale le refus et laisse la préférence désactivée', async () => {
    mockNotif.checkPermissions.mockResolvedValue({ display: 'prompt' })
    mockNotif.requestPermissions.mockResolvedValue({ display: 'denied' })
    const svc = await loadService()
    const res = await svc.enableReminder(0)
    expect(res).toEqual({ ok: false, reason: 'denied' })
    expect(svc.isReminderEnabled()).toBe(false)
    expect(svc.rappelRefuse()).toBe(true)
    expect(mockNotif.schedule).not.toHaveBeenCalled()
  })
})

describe('disableReminder', () => {
  it('annule la notification et persiste la préférence', async () => {
    const svc = await loadService()
    await svc.enableReminder(0)
    await svc.disableReminder()
    expect(svc.isReminderEnabled()).toBe(false)
    expect(mockNotif.cancel).toHaveBeenCalled()
  })
})

describe('refreshReminder', () => {
  it('ne fait rien si le rappel est désactivé', async () => {
    const svc = await loadService()
    await svc.refreshReminder(4)
    expect(mockNotif.schedule).not.toHaveBeenCalled()
  })

  it('re-planifie avec le texte à jour quand activé et permission accordée', async () => {
    const svc = await loadService()
    await svc.enableReminder(0)
    mockNotif.schedule.mockClear()
    await svc.refreshReminder(5)
    expect(mockNotif.schedule).toHaveBeenCalledTimes(1)
    expect(mockNotif.schedule.mock.calls[0][0].notifications[0].body).toContain('5 cartes')
  })

  it('ne re-demande jamais la permission (silencieux si retirée)', async () => {
    const svc = await loadService()
    await svc.enableReminder(0)
    mockNotif.checkPermissions.mockResolvedValue({ display: 'denied' })
    mockNotif.schedule.mockClear()
    await svc.refreshReminder(2)
    expect(mockNotif.requestPermissions).toHaveBeenCalledTimes(0)
    expect(mockNotif.schedule).not.toHaveBeenCalled()
  })
})

describe('planifierRappelLendemain', () => {
  it('pose une notification le lendemain à 18 h 30, avec le chapitre', async () => {
    const svc = await loadService()
    await svc.planifierRappelLendemain({ titre: 'Le théorème de Pythagore' }, new Date(2026, 9, 16, 21, 0))
    const [{ notifications: [n] }] = mockNotif.schedule.mock.calls[0]
    expect(n.id).toBe(4000)
    expect(n.schedule.at).toEqual(new Date(2026, 9, 17, 18, 30))
    expect(n.body).toContain('Pythagore')
  })

  it('ne demande jamais la permission, et annule quand l’élève est revenu', async () => {
    const svc = await loadService()
    mockNotif.checkPermissions.mockResolvedValue({ display: 'prompt' })
    await svc.planifierRappelLendemain({ titre: null })
    expect(mockNotif.requestPermissions).not.toHaveBeenCalled()
    expect(mockNotif.schedule).not.toHaveBeenCalled()
    await svc.planifierRappelLendemain(null)
    expect(mockNotif.cancel).toHaveBeenLastCalledWith({ notifications: [{ id: 4000 }] })
  })

  it('rien sur le web', async () => {
    mockIsNative.mockReturnValue(false)
    const svc = await loadService()
    await svc.planifierRappelLendemain({ titre: 'x' })
    expect(mockNotif.cancel).not.toHaveBeenCalled()
  })
})

describe('soirsDeRappel', () => {
  it('saute le week-end, les soirs passés et les soirs déjà pris', async () => {
    const svc = await loadService()
    // Vendredi 20/11 à 19 h : ce soir est passé, samedi et dimanche sautés, mardi pris.
    const soirs = svc.soirsDeRappel({ maintenant: new Date(2026, 10, 20, 19, 0), occupes: new Set(['2026-11-24']) })
    expect(soirs).toEqual([23, 25, 26].map(j => new Date(2026, 10, j, 18, 30)))
  })
})

describe('un seul rappel par soir', () => {
  it('le rappel du soir évite la veille d’un contrôle déjà posée', async () => {
    mockNotif.getPending.mockResolvedValue({ notifications: [
      { id: 2000, schedule: { at: new Date(2026, 10, 18, 18, 30).toISOString() } },
      { id: 1003, schedule: { at: new Date(2026, 10, 19, 18, 30).toISOString() } },
    ] })
    const svc = await loadService()
    await svc.enableReminder(0)
    const jours = mockNotif.schedule.mock.calls[0][0].notifications.map(n => n.schedule.at.getDate())
    expect(jours).toEqual([16, 17, 19, 20])
  })

  it('une révision du jour retire le rappel de ce soir', async () => {
    const svc = await loadService()
    await svc.enableReminder(0)
    mockNotif.schedule.mockClear()
    await svc.noterRevisionDuJour()
    const notifs = mockNotif.schedule.mock.calls[0][0].notifications
    expect(notifs[0].schedule.at).toEqual(new Date(2026, 10, 17, 18, 30))
    mockNotif.schedule.mockClear()
    await svc.noterRevisionDuJour()
    expect(mockNotif.schedule).not.toHaveBeenCalled()
  })

  it('pas de rappel activé : une révision ne pose rien', async () => {
    const svc = await loadService()
    await svc.noterRevisionDuJour()
    expect(mockNotif.schedule).not.toHaveBeenCalled()
  })
})

describe('rappel de fin de Réviz+ offert (16/11)', () => {
  it('se pose la veille du jour de fin, à 18 h 30', async () => {
    const { planifierRappelFinEssai } = await loadService()
    const fin = new Date(2026, 10, 19, 14, 0).getTime()
    await planifierRappelFinEssai(fin)
    expect(mockNotif.cancel).toHaveBeenCalledWith({ notifications: [{ id: 5000 }] })
    const n = mockNotif.schedule.mock.calls[0][0].notifications[0]
    expect(n).toMatchObject({ id: 5000, title: 'Dernier jour de Réviz+ offert' })
    expect(n.schedule.at).toEqual(new Date(2026, 10, 18, 18, 30))
  })

  it('annule seulement si la fin est nulle, passée ou si la veille est déjà passée', async () => {
    const { planifierRappelFinEssai } = await loadService()
    await planifierRappelFinEssai(null)
    await planifierRappelFinEssai(new Date(2026, 10, 16, 9, 0).getTime())
    await planifierRappelFinEssai(new Date(2026, 10, 16, 20, 0).getTime()) // veille = hier soir
    expect(mockNotif.cancel).toHaveBeenCalledTimes(3)
    expect(mockNotif.schedule).not.toHaveBeenCalled()
  })

  it('jamais de demande de permission', async () => {
    mockNotif.checkPermissions.mockResolvedValue({ display: 'prompt' })
    const { planifierRappelFinEssai } = await loadService()
    await planifierRappelFinEssai(new Date(2026, 10, 19, 14, 0).getTime())
    expect(mockNotif.requestPermissions).not.toHaveBeenCalled()
    expect(mockNotif.schedule).not.toHaveBeenCalled()
  })
})
