// Интервальный таймер «работа/отдых × N» и секундомер (BACKLOG 69.16, срез 1).
// Чистая логика без DOM: время считаем по часам (Date.now), а не по числу тиков,
// поэтому свёрнутая вкладка или засыпающий экран не сбивают отсчёт.
type Store = Pick<Storage, 'getItem' | 'setItem'>

export interface IntervalConfig { work: number; rest: number; rounds: number }
export const INTERVAL_STORE_KEY = 'workouts.intervalTimer.v1'
export const INTERVAL_DEFAULT: IntervalConfig = { work: 30, rest: 15, rounds: 8 }
export const WORK_MAX = 3600
export const REST_MAX_SEC = 3600
export const ROUNDS_MAX = 99
export const WARMUP_SECONDS = 5 // обратный отсчёт перед первым раундом

const clamp = (n: unknown, lo: number, hi: number, fallback: number): number => {
  const v = Math.round(Number(n))
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback
}

// Нормализуем любой ввод: работа ≥ 1 с, отдых может быть 0, раундов 1…99.
export function normalizeInterval(c: Partial<IntervalConfig> | null | undefined): IntervalConfig {
  return {
    work: clamp(c?.work, 1, WORK_MAX, INTERVAL_DEFAULT.work),
    rest: clamp(c?.rest, 0, REST_MAX_SEC, INTERVAL_DEFAULT.rest),
    rounds: clamp(c?.rounds, 1, ROUNDS_MAX, INTERVAL_DEFAULT.rounds),
  }
}

export type PhaseKind = 'warmup' | 'work' | 'rest'
export interface Phase { kind: PhaseKind; round: number; seconds: number }

// Разминка-отсчёт → (работа → отдых) × N; после последней работы отдыха нет.
export function buildPhases(cfg: IntervalConfig, warmup = WARMUP_SECONDS): Phase[] {
  const c = normalizeInterval(cfg)
  const out: Phase[] = []
  if (warmup > 0) out.push({ kind: 'warmup', round: 0, seconds: warmup })
  for (let r = 1; r <= c.rounds; r++) {
    out.push({ kind: 'work', round: r, seconds: c.work })
    if (r < c.rounds && c.rest > 0) out.push({ kind: 'rest', round: r, seconds: c.rest })
  }
  return out
}

export const totalSeconds = (phases: Phase[]): number => phases.reduce((s, p) => s + p.seconds, 0)

export interface PhaseNow { index: number; phase: Phase | null; left: number; done: boolean; elapsed: number }

// Где мы через elapsedMs после старта. done — всё отработано.
export function phaseAt(phases: Phase[], elapsedMs: number): PhaseNow {
  const e = Math.max(0, elapsedMs)
  let acc = 0
  for (let i = 0; i < phases.length; i++) {
    const end = acc + phases[i].seconds * 1000
    if (e < end) return { index: i, phase: phases[i], left: Math.ceil((end - e) / 1000), done: false, elapsed: e }
    acc = end
  }
  return { index: phases.length, phase: null, left: 0, done: true, elapsed: e }
}

// Пауза: храним накопленное время и момент последнего запуска.
export interface Clock { acc: number; startedAt: number | null }
export const clockStart = (c: Clock, now: number): Clock => (c.startedAt == null ? { acc: c.acc, startedAt: now } : c)
export const clockPause = (c: Clock, now: number): Clock => (c.startedAt == null ? c : { acc: c.acc + (now - c.startedAt), startedAt: null })
export const clockElapsed = (c: Clock, now: number): number => c.acc + (c.startedAt == null ? 0 : Math.max(0, now - c.startedAt))
export const CLOCK_ZERO: Clock = { acc: 0, startedAt: null }

// «м:сс» (или «ч:мм:сс» от часа); для секундомера с десятыми — fmtStopwatch.
export function fmtClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  return `${h > 0 ? h + ':' : ''}${mm}:${String(r).padStart(2, '0')}`
}
export function fmtStopwatch(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 100))
  return `${fmtClock(t / 10)}.${t % 10}`
}

// Круги секундомера: время круга = разница с прошлой отсечкой.
export interface Lap { n: number; split: number; total: number }
export function addLap(laps: Lap[], totalMs: number): Lap[] {
  const prev = laps.length ? laps[0].total : 0
  const total = Math.max(prev, Math.round(totalMs))
  return [{ n: laps.length + 1, split: total - prev, total }, ...laps] // новые сверху
}

export function readInterval(store: Store): IntervalConfig {
  try {
    const raw = store.getItem(INTERVAL_STORE_KEY)
    return raw ? normalizeInterval(JSON.parse(raw) as Partial<IntervalConfig>) : { ...INTERVAL_DEFAULT }
  } catch { return { ...INTERVAL_DEFAULT } }
}
export function writeInterval(c: IntervalConfig, store: Store): void {
  try { store.setItem(INTERVAL_STORE_KEY, JSON.stringify(normalizeInterval(c))) } catch { /* настройка не критична */ }
}
