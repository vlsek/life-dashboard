// Напоминания в приложении Android (BACKLOG 66.9, срез 2): настройки хранятся на устройстве (localStorage `native_reminders`), в аккаунт не уходят —
// уведомления привязаны к телефону. Сами уведомления ставит `android-app/native-shell.js` (`__ldNative.applyReminders`); в браузере раздел скрыт.
export interface NativeReminders {
  water: { enabled: boolean; fromHour: number; toHour: number; everyHours: number }
  workout: { enabled: boolean; time: string; weekdays: number[] }
}

export const NATIVE_REMINDERS_KEY = 'native_reminders'
export const DEFAULT_NATIVE_REMINDERS: NativeReminders = {
  water: { enabled: false, fromHour: 9, toHour: 21, everyHours: 2 },
  workout: { enabled: false, time: '18:30', weekdays: [1, 3, 5] },
}

type Shell = { isNative?: boolean; applyReminders?: (s: NativeReminders) => Promise<boolean> }
const shell = (): Shell | undefined => (globalThis as { __ldNative?: Shell }).__ldNative

const int = (v: unknown, lo: number, hi: number, d: number): number => {
  const n = Math.floor(Number(v))
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d
}

// Приводит что угодно (битый JSON, старая версия) к допустимым настройкам.
export function sanitizeNativeReminders(raw: unknown): NativeReminders {
  const r = (raw && typeof raw === 'object' ? raw : {}) as { water?: Record<string, unknown>; workout?: Record<string, unknown> }
  const w = r.water ?? {}
  const k = r.workout ?? {}
  const d = DEFAULT_NATIVE_REMINDERS
  let from = int(w.fromHour, 0, 23, d.water.fromHour)
  let to = int(w.toHour, 0, 23, d.water.toHour)
  if (to < from) [from, to] = [to, from]
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(k.time ?? ''))
  const time = m && Number(m[1]) <= 23 && Number(m[2]) <= 59 ? `${m[1].padStart(2, '0')}:${m[2]}` : d.workout.time
  const days = Array.isArray(k.weekdays) ? [...new Set(k.weekdays.map(Number).filter((x) => Number.isInteger(x) && x >= 1 && x <= 7))].sort((a, b) => a - b) : d.workout.weekdays
  return {
    water: { enabled: w.enabled === true, fromHour: from, toHour: to, everyHours: int(w.everyHours, 1, 12, d.water.everyHours) },
    workout: { enabled: k.enabled === true, time, weekdays: days },
  }
}

export function loadNativeReminders(): NativeReminders {
  try {
    const s = localStorage.getItem(NATIVE_REMINDERS_KEY)
    return sanitizeNativeReminders(s ? JSON.parse(s) : null)
  } catch {
    return sanitizeNativeReminders(null)
  }
}

// Раздел показываем только внутри приложения, где оболочка умеет ставить уведомления.
export const nativeRemindersAvailable = (): boolean => shell()?.isNative === true && typeof shell()?.applyReminders === 'function'

// Сохраняет и просит оболочку пересоздать уведомления. false — разрешение не дали или не приложение (настройки при этом сохранены).
export async function saveAndApplyNativeReminders(next: NativeReminders): Promise<boolean> {
  const clean = sanitizeNativeReminders(next)
  try {
    localStorage.setItem(NATIVE_REMINDERS_KEY, JSON.stringify(clean))
  } catch {
    /* localStorage недоступен */
  }
  const apply = shell()?.applyReminders
  if (!nativeRemindersAvailable() || !apply) return false
  try {
    return await apply(clean)
  } catch {
    return false
  }
}
