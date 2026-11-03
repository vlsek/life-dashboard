// Звук окончания отдыха (BACKLOG 69.5): короткие тройные «пик» через Web Audio, без файлов. Включается настройкой на устройстве (по умолчанию выключен).
export const REST_SOUND_KEY = 'workouts.restSound.v1'
type Store = Pick<Storage, 'getItem' | 'setItem'>
export const readRestSound = (s: Store): boolean => { try { return s.getItem(REST_SOUND_KEY) === '1' } catch { return false } }
export const writeRestSound = (on: boolean, s: Store): void => { try { s.setItem(REST_SOUND_KEY, on ? '1' : '0') } catch { /* не критично */ } }

interface Osc { type: string; frequency: { value: number }; connect: (n: unknown) => void; start: (t?: number) => void; stop: (t?: number) => void }
interface Gain { gain: { value: number; setValueAtTime?: (v: number, t: number) => void; exponentialRampToValueAtTime?: (v: number, t: number) => void }; connect: (n: unknown) => void }
export interface AudioLike { currentTime: number; destination: unknown; createOscillator: () => Osc; createGain: () => Gain }
export const BEEP_TIMES = [0, 0.22, 0.44] as const

// Возвращает число пиков, которые запланированы (0 — звука нет/ошибка)
export function playRestBeep(ctx: AudioLike | null | undefined): number {
  if (!ctx) return 0
  try {
    for (const dt of BEEP_TIMES) {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.type = 'sine'; o.frequency.value = 880; g.gain.value = 0.15
      o.connect(g); g.connect(ctx.destination)
      o.start(ctx.currentTime + dt); o.stop(ctx.currentTime + dt + 0.12)
    }
    return BEEP_TIMES.length
  } catch { return 0 }
}
let shared: AudioLike | null | undefined
export function defaultAudio(): AudioLike | null {
  if (shared !== undefined) return shared
  try {
    const C = (globalThis as { AudioContext?: new () => AudioLike; webkitAudioContext?: new () => AudioLike }).AudioContext ?? (globalThis as { webkitAudioContext?: new () => AudioLike }).webkitAudioContext
    shared = C ? new C() : null
  } catch { shared = null }
  return shared
}
