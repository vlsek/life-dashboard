import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { applyTemplate, cleanTemplateName, itemsFromPlan, toPlanTemplate, MAX_TEMPLATE_ITEMS } from './lib/planTemplates'
import PlanTemplatesModal from './components/PlanTemplatesModal.vue'
import { todayStr } from './lib/date'

// Шаблоны дня (BACKLOG 75.12, миграция 115)
const h = vi.hoisted(() => ({
  noteData: null as any,
  upserts: [] as any[],
  templates: [] as any[],
  tableMissing: false,
  inserts: [] as any[],
  insertError: null as null | { code?: string; message: string },
  deleted: [] as string[],
  deleteError: false,
}))
vi.mock('./lib/supabase', () => ({
  sb: {
    from: (table: string) => {
      let op = 'select'
      const chain: any = {
        select: () => chain,
        eq: (_c: string, v: string) => {
          if (op === 'delete') {
            if (h.deleteError) return Promise.resolve({ error: { message: 'boom' } })
            h.deleted.push(v)
            h.templates = h.templates.filter((t) => t.id !== v)
            return Promise.resolve({ error: null })
          }
          return chain
        },
        gte: () => chain,
        lt: () => chain,
        order: () => chain,
        single: () => (h.insertError ? Promise.resolve({ data: null, error: h.insertError }) : Promise.resolve({ data: h.templates[h.templates.length - 1], error: null })),
        maybeSingle: () => Promise.resolve({ data: table === 'daily_notes' ? h.noteData : null, error: null }),
        then: (res: (v: unknown) => unknown) => {
          if (table === 'plan_templates') return Promise.resolve(h.tableMissing ? { data: null, error: { message: 'relation does not exist', code: '42P01' } } : { data: h.templates, error: null }).then(res)
          return Promise.resolve({ data: [], error: null }).then(res)
        },
        insert: (row: any) => {
          op = 'insert'
          h.inserts.push(row)
          if (!h.insertError) h.templates.push({ id: 't' + h.templates.length, name: row.name, items: row.items })
          return chain
        },
        delete: () => ((op = 'delete'), chain),
        upsert: (row: unknown) => (h.upserts.push(row), Promise.resolve({ error: null })),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      }
      return chain
    },
  },
}))
import PlannedSection from './components/PlannedSection.vue'

describe('itemsFromPlan: что попадает в шаблон', () => {
  it('свои пункты с временем и бонусом; цели, повторяющиеся и пустые — нет; отметка о выполнении не сохраняется', () => {
    const plan = [
      { type: 'custom', text: '  Планёрка ', time: '09:30', done: true },
      { type: 'goal', text: 'Цель' },
      { type: 'custom', text: 'Зарядка', repeat: 'r1' },
      { type: 'custom', text: '   ' },
      { text: 'Прогулка', bonus: true },
    ]
    expect(itemsFromPlan(plan)).toEqual([{ text: 'Планёрка', time: '09:30' }, { text: 'Прогулка', bonus: true }])
  })
  it('повторы по тексту и времени убираются; не больше 30; кривое время отбрасывается', () => {
    expect(itemsFromPlan([{ text: 'А' }, { text: 'А' }, { text: 'А', time: '10:00' }, { text: 'Б', time: '25:99' }])).toEqual([{ text: 'А' }, { text: 'А', time: '10:00' }, { text: 'Б' }])
    const many = Array.from({ length: 40 }, (_, i) => ({ text: 'п' + i }))
    expect(itemsFromPlan(many)).toHaveLength(MAX_TEMPLATE_ITEMS)
  })
})

describe('cleanTemplateName / toPlanTemplate', () => {
  it('название: без лишних пробелов, 1–40 символов', () => {
    expect(cleanTemplateName('  Рабочий   день ')).toBe('Рабочий день')
    expect(cleanTemplateName('   ')).toBeNull()
    expect(cleanTemplateName('я'.repeat(41))).toBeNull()
    expect(cleanTemplateName('я'.repeat(40))).toHaveLength(40)
  })
  it('строка из базы: битое отбрасываем, шаблон без пунктов — null', () => {
    expect(toPlanTemplate({ id: 'a', name: 'Н', items: [{ text: 'X', time: '09:00', bonus: true }, 'мусор', { text: '' }, { text: 'Y', time: 'плохо' }] })).toEqual({ id: 'a', name: 'Н', items: [{ text: 'X', time: '09:00', bonus: true }, { text: 'Y' }] })
    expect(toPlanTemplate({ id: 'a', name: 'Н', items: [] })).toBeNull()
    expect(toPlanTemplate({ id: 'a', name: 'Н', items: 'не массив' })).toBeNull()
    expect(toPlanTemplate(null)).toBeNull()
  })
})

describe('applyTemplate: применение к дню', () => {
  const items = [{ text: 'Планёрка', time: '09:30' }, { text: 'Прогулка', bonus: true }, { text: 'Отчёт' }]
  it('добавляет в конец невыполненными, с временем и бонусом', () => {
    const r = applyTemplate([{ type: 'custom', text: 'Своё' }], items)
    expect(r.added).toBe(3)
    expect(r.list).toEqual([{ type: 'custom', text: 'Своё' }, { type: 'custom', text: 'Планёрка', time: '09:30' }, { type: 'custom', text: 'Прогулка', bonus: true }, { type: 'custom', text: 'Отчёт' }])
  })
  it('пункты, что уже есть (тот же текст и время, в том числе выполненные), не дублируются; другое время — другой пункт', () => {
    const plan = [{ type: 'custom', text: 'Планёрка', time: '09:30', done: true }, { type: 'custom', text: 'Отчёт', time: '12:00' }]
    const r = applyTemplate(plan, items)
    expect(r.skipped).toBe(1)
    expect(r.added).toBe(2)
    expect(r.list.filter((p) => p.text === 'Отчёт')).toHaveLength(2) // «Отчёт» без времени — не то же самое, что «Отчёт» в 12:00
  })
  it('повторное применение ничего не добавляет; цель с тем же названием не мешает', () => {
    const once = applyTemplate([{ type: 'goal', text: 'Отчёт' }], items)
    expect(once.added).toBe(3) // пункт-цель — не «свой» пункт
    const twice = applyTemplate(once.list, items)
    expect(twice.added).toBe(0)
    expect(twice.skipped).toBe(3)
    expect(twice.list).toEqual(once.list)
  })
  it('план не мутируется', () => {
    const plan = [{ type: 'custom', text: 'Своё' }]
    applyTemplate(plan, items)
    expect(plan).toEqual([{ type: 'custom', text: 'Своё' }])
  })
})

describe('PlanTemplatesModal.vue', () => {
  const tpls = [{ id: 'a', name: 'Рабочий день', items: [{ text: 'X' }, { text: 'Y' }] }]
  const mk = (o: Record<string, unknown> = {}) =>
    mount(PlanTemplatesModal, { props: { templates: tpls, savableCount: 2, save: vi.fn(async () => 'ok' as const), remove: vi.fn(async () => true), ...o } })
  beforeEach(() => {
    localStorage.setItem('site_lang', 'ru')
  })

  it('показывает шаблоны с числом пунктов; «Применить» отдаёт шаблон наверх', async () => {
    const w = mk()
    expect(w.get('[data-test="pt-row"]').text()).toContain('Рабочий день')
    expect(w.get('[data-test="pt-row"]').text()).toContain('2 пунктов')
    await w.get('[data-test="pt-apply"]').trigger('click')
    expect(w.emitted('apply')?.[0]).toEqual([tpls[0]])
  })
  it('пока шаблонов нет — подсказка', () => {
    expect(mk({ templates: [] }).find('[data-test="pt-empty"]').exists()).toBe(true)
  })
  it('удаление — в два шага: сначала подтверждение, и только «Удалить» вызывает remove', async () => {
    const remove = vi.fn(async () => true)
    const w = mk({ remove })
    await w.get('[data-test="pt-delete"]').trigger('click')
    expect(remove).not.toHaveBeenCalled()
    expect(w.find('[data-test="pt-confirm"]').exists()).toBe(true)
    await w.get('[data-test="pt-delete-no"]').trigger('click')
    expect(w.find('[data-test="pt-confirm"]').exists()).toBe(false)
    await w.get('[data-test="pt-delete"]').trigger('click')
    await w.get('[data-test="pt-delete-yes"]').trigger('click')
    await flushPromises()
    expect(remove).toHaveBeenCalledWith('a')
  })
  it('сохранение: пустое название — подсказка без вызова; нормальное — save с очищенным названием и поле очищается', async () => {
    const save = vi.fn(async () => 'ok' as const)
    const w = mk({ save })
    await w.get('[data-test="pt-save"]').trigger('click')
    expect(save).not.toHaveBeenCalled()
    expect(w.get('[data-test="pt-problem"]').text()).toContain('название')
    await w.get('[data-test="pt-name"]').setValue('  Выходной  ')
    await w.get('[data-test="pt-name"]').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(save).toHaveBeenCalledWith('Выходной')
    expect((w.get('[data-test="pt-name"]').element as HTMLInputElement).value).toBe('')
  })
  it('ответы «дубль» и «лимит» показываются понятным текстом', async () => {
    const w = mk({ save: vi.fn(async () => 'duplicate' as const) })
    await w.get('[data-test="pt-name"]').setValue('Рабочий день')
    await w.get('[data-test="pt-save"]').trigger('click')
    await flushPromises()
    expect(w.get('[data-test="pt-problem"]').text()).toBe('Шаблон с таким названием уже есть.')
    const w2 = mk({ save: vi.fn(async () => 'limit' as const) })
    await w2.get('[data-test="pt-name"]').setValue('Новый')
    await w2.get('[data-test="pt-save"]').trigger('click')
    await flushPromises()
    expect(w2.get('[data-test="pt-problem"]').text()).toContain('не больше 20')
  })
  it('в дне нечего сохранять — поле и кнопка заблокированы, объяснение рядом', () => {
    const w = mk({ savableCount: 0 })
    expect(w.find('[data-test="pt-no-items"]').exists()).toBe(true)
    expect((w.get('[data-test="pt-save"]').element as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('PlannedSection: шаблоны дня', () => {
  let w: VueWrapper | null = null
  const TODAY = todayStr()
  beforeEach(() => {
    localStorage.setItem('site_lang', 'ru')
    h.upserts = []
    h.inserts = []
    h.deleted = []
    h.insertError = null
    h.deleteError = false
    h.tableMissing = false
    h.templates = [{ id: 't0', name: 'Рабочий день', items: [{ text: 'Планёрка', time: '09:30' }, { text: 'Отчёт' }] }]
    h.noteData = { planned_goals: [{ type: 'custom', text: 'Отчёт' }, { type: 'goal', text: 'Цель' }] }
  })
  afterEach(() => {
    w?.unmount()
    w = null
    document.body.innerHTML = ''
  })
  async function mountSection() {
    w = mount(PlannedSection, { props: { userId: 'u1', date: TODAY }, attachTo: document.body })
    await flushPromises()
  }

  it('нет таблицы plan_templates (миграция не применена) — кнопки «Шаблоны дня» нет, «Планы» работают как раньше', async () => {
    h.tableMissing = true
    await mountSection()
    expect(w!.find('[data-test="templates-open"]').exists()).toBe(false)
    expect(w!.find('[data-test="item"]').exists()).toBe(true)
  })

  it('кнопка открывает окно; «Применить» дописывает недостающие пункты в план дня, существующие не дублирует, и сообщает', async () => {
    await mountSection()
    await w!.get('[data-test="templates-open"]').trigger('click')
    await w!.get('[data-test="pt-apply"]').trigger('click')
    await flushPromises()
    const saved = h.upserts[h.upserts.length - 1].planned_goals
    expect(saved.map((x: any) => x.text)).toEqual(['Отчёт', 'Цель', 'Планёрка'])
    expect(saved[2]).toEqual({ type: 'custom', text: 'Планёрка', time: '09:30' })
    expect(w!.find('[data-test="templates-modal"]').exists()).toBe(false)
    expect(w!.get('[data-test="notice"]').text()).toBe('Добавлено пунктов: 1 · уже были в плане: 1')
  })

  it('повторное применение: ничего не пишем, говорим, что всё уже есть', async () => {
    h.noteData = { planned_goals: [{ type: 'custom', text: 'Планёрка', time: '09:30' }, { type: 'custom', text: 'Отчёт' }] }
    await mountSection()
    await w!.get('[data-test="templates-open"]').trigger('click')
    await w!.get('[data-test="pt-apply"]').trigger('click')
    await flushPromises()
    expect(h.upserts).toHaveLength(0)
    expect(w!.get('[data-test="notice"]').text()).toBe('Все пункты этого шаблона уже есть в плане.')
  })

  it('«сохранить как шаблон» берёт только свои пункты дня (цель не сохраняется)', async () => {
    await mountSection()
    await w!.get('[data-test="templates-open"]').trigger('click')
    await w!.get('[data-test="pt-name"]').setValue('Мой день')
    await w!.get('[data-test="pt-save"]').trigger('click')
    await flushPromises()
    expect(h.inserts).toEqual([{ user_id: 'u1', name: 'Мой день', items: [{ text: 'Отчёт' }] }])
    expect(w!.findAll('[data-test="pt-row"]')).toHaveLength(2) // новый шаблон появился в списке
  })

  it('база ответила «такое название уже есть» (23505) — понятное сообщение, список не меняется', async () => {
    h.insertError = { code: '23505', message: 'dup' }
    await mountSection()
    await w!.get('[data-test="templates-open"]').trigger('click')
    await w!.get('[data-test="pt-name"]').setValue('Рабочий день')
    await w!.get('[data-test="pt-save"]').trigger('click')
    await flushPromises()
    expect(w!.get('[data-test="pt-problem"]').text()).toBe('Шаблон с таким названием уже есть.')
    expect(w!.findAll('[data-test="pt-row"]')).toHaveLength(1)
  })

  it('удаление шаблона: после подтверждения уходит из списка и из базы; ошибка базы возвращает его на место', async () => {
    await mountSection()
    await w!.get('[data-test="templates-open"]').trigger('click')
    h.deleteError = true
    await w!.get('[data-test="pt-delete"]').trigger('click')
    await w!.get('[data-test="pt-delete-yes"]').trigger('click')
    await flushPromises()
    expect(w!.findAll('[data-test="pt-row"]')).toHaveLength(1) // вернулся
    expect(w!.find('[data-test="pt-problem"]').exists()).toBe(true)
    h.deleteError = false
    await w!.get('[data-test="pt-delete"]').trigger('click')
    await w!.get('[data-test="pt-delete-yes"]').trigger('click')
    await flushPromises()
    expect(h.deleted).toEqual(['t0'])
    expect(w!.find('[data-test="pt-row"]').exists()).toBe(false)
  })
})
