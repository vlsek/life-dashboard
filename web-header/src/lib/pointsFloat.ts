// КОПИЯ web-dashboard/src/lib/pointsFloat.ts (BACKLOG 469, агент 2): слой «+N / −N с монетой» для воды из окна шапки. Менять ВМЕСТЕ
// с оригиналом. Имя события то же (`dashboard:points-float`): на Дашборде (panelOnly) шапка слой НЕ рисует, только шлёт событие —
// рисует слой самого Дашборда; на остальных страницах событие ловит слой шапки (components/PointsFloat.vue) — двойной анимации нет.
import { isMetricDone } from './metrics'
import type { Metric, MetricValue } from './types'

// Анимация «+N / −N с монетой» при получении/потере баллов (BACKLOG 14, 11:11, агент 4).
// Только чистая логика и канал событий, без Vue и сети: слушает событие компонент PointsFloat.vue (через usePointsFloat.ts),
// а «слать» его может любое место, где известно изменение баллов: сейчас — отметка метрики дня (useDailyMetrics) и
// подходы (useSets); позже сюда же подключится «+1 / +0,2 / +0,5 за подход» из раздела 13 — это тот же вызов
// emitPointsFloat(delta), менять механизм не придётся (дробные значения форматируются уже сейчас).
//
// Правило начисления — то же, что в balance.ts/pointsLog.ts: +1 за каждую выполненную метрику дня. Значит, метрика перешла
// «не выполнена → выполнена» = +1, обратно = −1, остальные переходы баллов не меняют (например, число 3 → 5 при цели 10).

export const POINTS_FLOAT = 'dashboard:points-float'

export interface PointsFloatDetail {
  delta: number
}

// Сколько баллов даёт/отнимает правка значения метрики. 0 — анимировать нечего.
export function pointsDelta(metric: Metric, before: MetricValue | undefined, after: MetricValue | undefined, dateStr?: string): number {
  const was = isMetricDone(metric, before ?? null, dateStr)
  const now = isMetricDone(metric, after ?? null, dateStr)
  if (was === now) return 0
  return now ? 1 : -1
}

// «+1» / «−1» (настоящий минус U+2212, а не дефис — он не склеивается с цифрой и одинаковой ширины с плюсом);
// дробные баллы — с локальным разделителем: «+0,2» (ru) / «+0.2» (en). Ноль и не-числа → пустая строка.
export function formatPointsDelta(delta: number, lang: string = 'en'): string {
  if (!Number.isFinite(delta) || delta === 0) return ''
  const abs = new Intl.NumberFormat(lang, { maximumFractionDigits: 2 }).format(Math.abs(delta))
  return (delta > 0 ? '+' : '\u2212') + abs
}

// Послать анимацию. Не бросает и ничего не делает при delta = 0 / NaN — вызывающему не нужно проверять самому.
export function emitPointsFloat(delta: number): void {
  if (!Number.isFinite(delta) || delta === 0 || typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<PointsFloatDetail>(POINTS_FLOAT, { detail: { delta } }))
}

export type MotionMode = 'full' | 'reduced' | 'off'

// Как двигаться. `<html data-motion="off">` — задел под будущий общий выключатель «отключить все анимации»
// (BACKLOG 14, 14:02): тогда «+N» не показываем совсем. prefers-reduced-motion — показываем коротко и без перемещения
// (только проявление/угасание), чтобы обратная связь «баллы пошли» не пропала.
export function motionMode(): MotionMode {
  try {
    if (typeof document !== 'undefined' && document.documentElement.dataset.motion === 'off') return 'off'
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return 'reduced'
  } catch {
    /* окружение без matchMedia/document — считаем, что движение разрешено */
  }
  return 'full'
}

export interface Point {
  x: number
  y: number
}

// Откуда всплывать: «при клике» — у места последнего касания/клика. Если с него прошло больше maxAgeMs (баллы пришли
// не от клика, например пересчёт после перезагрузки данных), точки нет — компонент покажет «+N» в запасном месте.
export const ORIGIN_MAX_AGE_MS = 4000

export function pickOrigin(last: { x: number; y: number; at: number } | null, now: number, maxAgeMs: number = ORIGIN_MAX_AGE_MS): Point | null {
  if (!last) return null
  const age = now - last.at
  if (age < 0 || age > maxAgeMs) return null
  return { x: last.x, y: last.y }
}

// Не вылезать за край экрана: центр подписи держим на расстоянии half от левого/правого края.
export function clampX(x: number, viewportWidth: number, half: number = 44): number {
  if (viewportWidth <= half * 2) return viewportWidth / 2
  return Math.min(Math.max(x, half), viewportWidth - half)
}
