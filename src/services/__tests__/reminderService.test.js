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

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
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

  it('planifie un rappel quotidien 18h30 et persiste la préférence', async () => {
    const svc = await loadService()
    const res = await svc.enableReminder(2)
    expect(res.ok).toBe(true)
    expect(svc.isReminderEnabled()).toBe(true)
    const arg = mockNotif.schedule.mock.calls[0][0].notifications[0]
    expect(arg.schedule.on).toEqual({ hour: svc.REMINDER_HOUR, minute: svc.REMINDER_MINUTE })
    expect(arg.body).toContain('2 cartes')
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
