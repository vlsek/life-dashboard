import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
// @ts-ignore — node:fs для сверки с соседним пилотом
import { readFileSync } from 'node:fs'

// Окно «Идеальный день!» (BACKLOG раздел 36, владелец 2026-10-04): выдача достижения, прогресс, раз в день
const db = vi.hoisted(() => ({ stored: [] as string[], readError: null as unknown, writeError: null as unknown, writes: [] as { key: string; unlocked_at: string }[][] }))
vi.mock('./lib/supabase', () => ({
  sb: {
    from: () => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => Promise.resolve({ data: db.stored.map((key) => ({ key })), error: db.readError }),
        upsert: (rows: { key: string; unlocked_at: string }[]) => {
          if (!db.writeError) {
            db.writes.push(rows)
            for (const r of rows) if (!db.stored.includes(r.key)) db.stored.push(r.key) // «таблица» запоминает записанное
          }
          return Promise.resolve({ error: db.writeError })
        },
      }
      return chain
    },
  },
}))

import PerfectDayModal from './components/PerfectDayModal.vue'
import { PERFECT_DAY_TARGETS, perfectKey } from './lib/perfectDay'
import type { PerfectDayInfo } from './lib/perfectDay'
import { loadShownDate, usePerfectDay } from './lib/usePerfectDay'
import { loadUnlockedKeys, saveUnlockedKeys } from './lib/achievementKeys'

const info = (over: Partial<PerfectDayInfo> = {}): PerfectDayInfo => ({ date: '2026-10-05', todayPerfect: true, count: 1, ...over })

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  db.stored = []
  db.readError = null
  db.writeError = null
  db.writes = []
})

describe('пороги совпадают с реестром «Достижений»', () => {
  it('perfect_days_<порог> в web-achievements — те же 1/10/30/100 и счётчик perfectDays', () => {
    const src: string = readFileSync('../web-achievements/src/lib/achievements.ts', 'utf-8')
    const m = src.match(/makeLadder\('perfect_days', 'perfect', 'perfectDays', '[a-z]+', \[([0-9, ]+)\]\)/)
    expect(m, 'лесенка perfect_days в реестре достижений').not.toBeNull()
    expect(m![1].split(',').map((x) => Number(x.trim()))).toEqual([...PERFECT_DAY_TARGETS])
  })
  it('у каждого порога есть название на обоих языках и в словаре достижений, и в словаре дашборда', () => {
    const ach: string = readFileSync('../web-achievements/src/lib/i18n.ts', 'utf-8')
    const dash: string = readFileSync('src/lib/i18n.ts', 'utf-8')
    for (const t of PERFECT_DAY_TARGETS) {
      expect(ach.match(new RegExp('ach_t_perfect_days_' + t + ':', 'g'))!.length).toBe(2)
      expect(dash.match(new RegExp('dash_perfect_ach_' + t + ':', 'g'))!.length).toBe(2)
    }
  })
})

describe('хранилище достижений (копия формата страницы «Достижения»)', () => {
  it('читает ключи из таблицы и с устройства; нет таблицы — режим «на устройстве»', async () => {
    db.stored = ['first_metric']
    localStorage.setItem('achievements_unlocked_v1', JSON.stringify({ u1: { streak_5: null } }))
    const r = await loadUnlockedKeys('u1')
    expect(r.mode).toBe('db')
    expect([...r.keys].sort()).toEqual(['first_metric', 'streak_5'])
    db.readError = { message: 'relation "user_achievements" does not exist' }
    expect((await loadUnlockedKeys('u1')).mode).toBe('local')
  })
  it('пишет только новое в таблицу; при сбое записи — на устройство, существующее не перезаписывает', async () => {
    expect(await saveUnlockedKeys('u1', 'db', ['perfect_days_1'], '2026-10-05T10:00:00Z')).toBe('db')
    expect(db.writes[0]).toEqual([{ user_id: 'u1', key: 'perfect_days_1', unlocked_at: '2026-10-05T10:00:00Z' }])
    db.writeError = { message: 'rls' }
    localStorage.setItem('achievements_unlocked_v1', JSON.stringify({ u1: { perfect_days_1: '2026-01-01T00:00:00Z' } }))
    expect(await saveUnlockedKeys('u1', 'db', ['perfect_days_1', 'perfect_days_10'], '2026-10-05T10:00:00Z')).toBe('local')
    const saved = JSON.parse(localStorage.getItem('achievements_unlocked_v1')!)
    expect(saved.u1).toEqual({ perfect_days_1: '2026-01-01T00:00:00Z', perfect_days_10: '2026-10-05T10:00:00Z' })
    expect(await saveUnlockedKeys('u1', 'local', [], 'x')).toBe('local')
  })
})

describe('usePerfectDay', () => {
  const run = async (i: PerfectDayInfo | null, userId: string | null = 'u1') => {
    const infoRef = ref<PerfectDayInfo | null>(i)
    const api = usePerfectDay(() => userId, infoRef)
    await flushPromises()
    return { api, infoRef }
  }

  it('первый идеальный день: окно с выданным достижением; ключ записан в хранилище; прогресс до следующего', async () => {
    const { api } = await run(info({ count: 1 }))
    expect(api.pending.value).toEqual({ count: 1, gained: 1, next: { target: 10, remaining: 9, pct: 10 } })
    expect(db.writes[0].map((r) => r.key)).toEqual(['perfect_days_1'])
  })

  it('достижение уже есть — окно только с прогрессом, запись в хранилище не идёт', async () => {
    db.stored = ['perfect_days_1']
    const { api } = await run(info({ count: 4 }))
    expect(api.pending.value).toEqual({ count: 4, gained: null, next: { target: 10, remaining: 6, pct: 40 } })
    expect(db.writes).toEqual([])
  })

  it('день не идеальный — ничего: ни окна, ни записи, ни отметки «показано»', async () => {
    const { api } = await run(info({ todayPerfect: false }))
    expect(api.pending.value).toBeNull()
    expect(loadShownDate('u1')).toBeNull()
    expect(db.writes).toEqual([])
  })

  it('один раз в день: после закрытия и повторного пересчёта окна нет; на следующий день — снова', async () => {
    const { api, infoRef } = await run(info({ count: 1 }))
    api.close()
    infoRef.value = info({ count: 1 }) // пересчёт в тот же день
    await flushPromises()
    expect(api.pending.value).toBeNull()
    expect(loadShownDate('u1')).toBe('2026-10-05')
    infoRef.value = info({ date: '2026-10-06', count: 2 })
    await flushPromises()
    expect(api.pending.value).not.toBeNull()
    expect(api.pending.value!.gained).toBeNull() // «первое» уже выдано накануне
  })

  it('день стал неидеальным и снова идеальным — второй раз не поздравляем', async () => {
    const { api, infoRef } = await run(info())
    api.close()
    infoRef.value = info({ todayPerfect: false, count: 0 })
    await flushPromises()
    infoRef.value = info()
    await flushPromises()
    expect(api.pending.value).toBeNull()
  })

  it('история большая, хранилище пустое: выдаются все пройденные ступени, в окне — высшая', async () => {
    const { api } = await run(info({ count: 45 }))
    expect(db.writes[0].map((r) => r.key)).toEqual(['perfect_days_1', 'perfect_days_10', 'perfect_days_30'])
    expect(api.pending.value).toEqual({ count: 45, gained: 30, next: { target: 100, remaining: 55, pct: 45 } })
  })

  it('все достижения получены — окно без полосы (pending.next = null)', async () => {
    db.stored = PERFECT_DAY_TARGETS.map(perfectKey)
    const { api } = await run(info({ count: 150 }))
    expect(api.pending.value).toEqual({ count: 150, gained: null, next: null })
  })

  it('поздравления выключены: окно не показывается, а достижение всё равно выдаётся', async () => {
    localStorage.setItem('streak_celebrations_off', '1')
    const { api } = await run(info({ count: 1 }))
    expect(api.pending.value).toBeNull()
    expect(db.writes[0].map((r) => r.key)).toEqual(['perfect_days_1'])
  })

  it('«Больше не показывать» выключает общие поздравления и закрывает окно', async () => {
    const { api } = await run(info())
    api.disable()
    expect(api.pending.value).toBeNull()
    expect(localStorage.getItem('streak_celebrations_off')).toBe('1')
  })

  it('нет пользователя или расчёта — ничего не происходит', async () => {
    expect((await run(info(), null)).api.pending.value).toBeNull()
    expect((await run(null)).api.pending.value).toBeNull()
  })

  it('таблицы достижений нет — выдача на устройство, окно показывается', async () => {
    db.readError = { message: 'relation "user_achievements" does not exist' }
    const { api } = await run(info({ count: 1 }))
    expect(api.pending.value!.gained).toBe(1)
    expect(JSON.parse(localStorage.getItem('achievements_unlocked_v1')!).u1.perfect_days_1).toMatch(/^2/)
  })
})

describe('PerfectDayModal', () => {
  const popup = (o: Record<string, unknown> = {}) => ({ count: 1, gained: null as number | null, next: { target: 10, remaining: 9, pct: 10 } as { target: number; remaining: number; pct: number } | null, ...o })

  it('поздравление, число идеальных дней, прогресс «до следующего»', () => {
    const w = mount(PerfectDayModal, { props: { popup: popup({ count: 4, next: { target: 10, remaining: 6, pct: 40 } }) } })
    expect(w.find('[data-test="perfect-title"]').text()).toBe('Идеальный день!')
    expect(w.find('[data-test="perfect-count"]').text()).toBe('Идеальных дней всего: 4')
    expect(w.find('[data-test="perfect-next-text"]').text()).toBe('До «Идеальный десяток» осталось: 6')
    expect(w.find('[data-test="perfect-bar"]').attributes('aria-valuenow')).toBe('40')
    expect(w.find('[data-test="perfect-fill"]').attributes('style')).toContain('width: 40%')
    expect(w.find('[data-test="perfect-progress"]').text()).toBe('4 из 10 идеальных дней')
    expect(w.find('[data-test="perfect-gained"]').exists()).toBe(false)
    w.unmount()
  })

  it('полученное достижение: блок «Получено достижение» с названием, рядом и прогресс дальше', () => {
    const w = mount(PerfectDayModal, { props: { popup: popup({ gained: 1 }) } })
    expect(w.find('[data-test="perfect-gained-name"]').text()).toBe('Идеальный старт')
    expect(w.find('[data-test="perfect-next"]').exists()).toBe(true)
    w.unmount()
  })

  it('все достижения получены — тёплая строка вместо полосы', () => {
    const w = mount(PerfectDayModal, { props: { popup: popup({ count: 150, next: null }) } })
    expect(w.find('[data-test="perfect-next"]').exists()).toBe(false)
    expect(w.find('[data-test="perfect-all"]').exists()).toBe(true)
    w.unmount()
  })

  it('если достижение только что получено и следующего нет — тёплой строки «все получены» нет, виден блок достижения', () => {
    const w = mount(PerfectDayModal, { props: { popup: popup({ count: 100, gained: 100, next: null }) } })
    expect(w.find('[data-test="perfect-gained-name"]').text()).toBe('Идеальная сотня')
    expect(w.find('[data-test="perfect-all"]').exists()).toBe(false)
    w.unmount()
  })

  it('закрытие кнопкой и по фону, «Больше не показывать», ссылка на страницу «Достижения»', async () => {
    const w = mount(PerfectDayModal, { props: { popup: popup() } })
    await w.find('[data-test="perfect-close"]').trigger('click')
    await w.find('[data-test="perfect-day-backdrop"]').trigger('click')
    await w.find('[data-test="perfect-disable"]').trigger('click')
    expect(w.emitted('close')).toHaveLength(2)
    expect(w.emitted('disable')).toHaveLength(1)
    expect(w.find('[data-test="perfect-link"]').attributes('href')).toBe('/achievements/')
    w.unmount()
  })

  it('клик внутри окна не закрывает его; английский интерфейс', async () => {
    localStorage.setItem('site_lang', 'en')
    const w = mount(PerfectDayModal, { props: { popup: popup({ gained: 1 }) } })
    await w.find('[data-test="perfect-day"]').trigger('click')
    expect(w.emitted('close')).toBeUndefined()
    expect(w.find('[data-test="perfect-title"]').text()).toBe('Perfect day!')
    expect(w.find('[data-test="perfect-gained-name"]').text()).toBe('Perfect start')
    expect(w.find('[data-test="perfect-next-text"]').text()).toBe('To "Perfect ten": 9 more')
    w.unmount()
  })
})

describe('App.vue: окно подключено', () => {
  const src: string = readFileSync('src/App.vue', 'utf-8')
  it('показывается после поздравления за серию (не одновременно) и привязано к расчёту дашборда', () => {
    expect(src).toContain('<PerfectDayModal v-else-if="perfectPopup"')
    expect(src).toContain('usePerfectDay(')
    expect(src).toMatch(/perfectInfo/)
  })
})
