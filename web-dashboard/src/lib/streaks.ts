import { addDays, fmtDate, mondayOf } from './date'

// weekStartStr в config.js === mondayOf в date.ts (тот же понедельник недели), просто другое имя.
const weekStartStr = mondayOf

export function computeStreak(sortedDatesSet: Set<string>, fromDate: Date): number {
  let streak = 0
  const cursor = new Date(fromDate)
  while (sortedDatesSet.has(fmtDate(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

// Серия с пропуском "нерасчётных" дней: день из doneSet — +1, день, которого не должно быть
// по расписанию (isSkip), серию не рвёт и не считается, любой другой — обрыв. Для метрик без
// расписания isSkip всегда false — поведение как у computeStreak().
export function computeStreakSkipping(doneSet: Set<string>, isSkip: (d: string) => boolean, fromDate: Date): number {
  let streak = 0
  const cursor = new Date(fromDate)
  for (let i = 0; i < 3650; i++) {
    const d = fmtDate(cursor)
    if (doneSet.has(d)) streak++
    else if (!isSkip(d)) break
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export interface WeeklyStreakResult {
  streak: number
  atRisk: boolean
}

// Серия для метрики "не менее N раз в неделю": считается в неделях (пн-вс). Текущая неделя,
// пока норма не добрана, серию не рвёт — просто ещё не засчитана.
export function computeWeeklyStreak(doneDays: string[], min: number, todayDate: Date): WeeklyStreakResult {
  const counts: Record<string, number> = {}
  doneDays.forEach((d) => {
    const k = weekStartStr(d)
    counts[k] = (counts[k] || 0) + 1
  })
  const cur = new Date(weekStartStr(fmtDate(todayDate)) + 'T00:00:00')
  const curCount = counts[fmtDate(cur)] || 0
  let streak = curCount >= min ? 1 : 0
  for (let i = 0; i < 520; i++) {
    cur.setDate(cur.getDate() - 7)
    if ((counts[fmtDate(cur)] || 0) >= min) streak++
    else break
  }
  // под угрозой, если добрать норму можно только выполняя метрику каждый из оставшихся дней
  const needed = min - curCount
  const daysLeft = 7 - ((todayDate.getDay() + 6) % 7) // включая сегодня
  return { streak, atRisk: needed > 0 && needed >= daysLeft }
}

// Серия для метрики "не чаще N раз в неделю": в отличие от "не менее", превышение лимита нельзя
// отменить в течение недели, поэтому текущая неделя засчитывается предварительно, пока лимит не
// превышен, а прошлые недели — только если лимит не был превышен.
export function computeAtMostWeeklyStreak(
  doneCountByWeek: Record<string, number>,
  max: number,
  todayDate: Date,
  earliestWeekStart: string | null,
): WeeklyStreakResult {
  const cur = new Date(weekStartStr(fmtDate(todayDate)) + 'T00:00:00')
  const curCount = doneCountByWeek[fmtDate(cur)] || 0
  let streak = curCount <= max ? 1 : 0
  for (let i = 0; i < 520; i++) {
    cur.setDate(cur.getDate() - 7)
    // недостаток "не чаще": 0 обращений в непрослеженную неделю тоже "укладывается в лимит",
    // поэтому останавливаемся на границе самых ранних данных, а не когда встретим превышение
    if (earliestWeekStart && fmtDate(cur) < earliestWeekStart) break
    if ((doneCountByWeek[fmtDate(cur)] || 0) <= max) streak++
    else break
  }
  // под угрозой — лимит уже исчерпан или ещё одно выполнение его исчерпает
  return { streak, atRisk: curCount >= max }
}

export { weekStartStr }

// ---- Сборка списка стриков (computeStreakItems в dashboard.js) ----
// Разделено на чистую часть (принимает уже загруженные данные) — тестируется без сети — и
// тонкую async-обёртку в useDashboard.ts, которая делает запросы и icon/name достаёт из Metric
// напрямую (в отличие от dashboard.js, здесь не готовим HTML-строку — Vue сам рендерит <Icon>).
import { metricExpectedOn, metricSchedule, isMetricDone } from './metrics'
import type { Metric } from './types'

export interface StreakItem {
  kind: 'perfect_days' | 'note_filled' | 'metric'
  metric?: Metric // только для kind === 'metric'
  streak: number
  unit?: 'w'
  todayCounted: boolean
}

export function computeStreakItemsPure(
  metrics: Metric[],
  byDay: Record<string, Record<string, unknown>>,
  noteDays: Set<string>,
  today: Date,
): StreakItem[] {
  const todayStr3 = fmtDate(today)
  // Точка отсчёта у КАЖДОЙ серии своя (BACKLOG 22.1 🐞 «пунктир огонька пропал»): если серия сегодня уже засчитана — считаем
  // с сегодняшнего дня, если ещё нет — со вчерашнего, чтобы незавершённый день не обнулял серию раньше времени, а показывался как
  // «серия идёт, сегодня не готово» (пунктирный огонёк, красная рамка). Раньше точка отсчёта была общей — «сегодня есть хоть
  // какая-то запись» (byDay[today], как в старом dashboard.js): стоило внести, например, воду, и все ещё не выполненные сегодня
  // серии начинали считаться с сегодняшнего дня, обнулялись и пропадали из списка (а заметка, наоборот, недосчитывалась на день).
  const yesterday = addDays(today, -1)
  const startFor = (counted: boolean) => (counted ? today : yesterday)
  const earliestDate = Object.keys(byDay).length ? Object.keys(byDay).sort()[0] : todayStr3
  const earliestWeekStart = weekStartStr(earliestDate)

  const items: StreakItem[] = []

  // метрики с выключенным «считать серию» (миграция 031, например вес) ни в своей серии, ни в «идеальном дне» не участвуют
  metrics = (metrics || []).filter((m) => m.count_streak !== false)

  // серия "идеальный день" — выполнены все метрики, которые нужны в этот день по расписанию
  // (метрики "N раз в неделю" в идеальный день не входят; день без обязательных метрик серию не рвёт)
  if (metrics && metrics.length) {
    const expectedOn = (d: string) => metrics.filter((m) => metricExpectedOn(m, d))
    const perfectDays = new Set(
      Object.keys(byDay).filter((d) => {
        const exp = expectedOn(d)
        return exp.length > 0 && exp.every((m) => isMetricDone(m, byDay[d][m.id] as any))
      }),
    )
    const isSkip = (d: string) => expectedOn(d).length === 0
    const todayIsRest = isSkip(todayStr3) && !perfectDays.has(todayStr3)
    const todayCounted = perfectDays.has(todayStr3) || todayIsRest
    items.push({
      kind: 'perfect_days',
      streak: computeStreakSkipping(perfectDays, isSkip, startFor(todayCounted)),
      todayCounted,
    })
  }

  // серия по каждой метрике отдельно
  for (const m of metrics || []) {
    const doneDays = new Set(Object.keys(byDay).filter((d) => isMetricDone(m, byDay[d][m.id] as any)))
    const sched = metricSchedule(m)
    if (sched?.type === 'weekly') {
      const w = computeWeeklyStreak([...doneDays], sched.min, today)
      if (w.streak > 0) items.push({ kind: 'metric', metric: m, streak: w.streak, unit: 'w', todayCounted: !w.atRisk })
      continue
    }
    if (sched?.type === 'at_most') {
      const counts: Record<string, number> = {}
      doneDays.forEach((d) => {
        const k = weekStartStr(d)
        counts[k] = (counts[k] || 0) + 1
      })
      const w = computeAtMostWeeklyStreak(counts, sched.max, today, earliestWeekStart)
      if (w.streak > 0) items.push({ kind: 'metric', metric: m, streak: w.streak, unit: 'w', todayCounted: !w.atRisk })
      continue
    }
    const isSkip = (d: string) => !metricExpectedOn(m, d) && !doneDays.has(d)
    const todayCounted = doneDays.has(todayStr3) || !metricExpectedOn(m, todayStr3)
    const startFrom = startFor(todayCounted)
    let streak = computeStreakSkipping(doneDays, isSkip, startFrom)
    // Импортированный стрик (см. migrations/026): добавляется поверх посчитанного, только пока
    // посчитанный стрик без разрывов доходит до даты импорта — иначе они больше не непрерывны.
    if (m.streak_import_days && m.streak_import_days > 0 && m.streak_import_date) {
      const streakStart = fmtDate(addDays(startFrom, -(streak > 0 ? streak - 1 : 0)))
      if (streak > 0 && streakStart <= m.streak_import_date) streak += m.streak_import_days
    }
    if (streak > 0) items.push({ kind: 'metric', metric: m, streak, todayCounted })
  }

  // серия "заполнил заметку дня"
  const noteToday = noteDays.has(todayStr3)
  items.push({ kind: 'note_filled', streak: computeStreak(noteDays, startFor(noteToday)), todayCounted: noteToday })

  // серии в днях — выше, недельные (в неделях) — ниже: числа в разных единицах не сравниваем
  items.sort((a, b) => Number(a.unit === 'w') - Number(b.unit === 'w') || b.streak - a.streak)
  return items.filter((i) => i.streak > 0)
}
