import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

const db = vi.hoisted(() => ({ layout: null as unknown, selectError: null as unknown, upsertError: null as unknown, upserts: [] as unknown[] }))
vi.mock('./supabase', () => ({
  sb: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { dashboard_layout: db.layout }, error: db.selectError }) }) }),
      upsert: (row: unknown) => {
        db.upserts.push(row)
        return Promise.resolve({ error: db.upsertError })
      },
    }),
  },
}))

import LayoutModal from '../components/LayoutModal.vue'
import { useLayout } from './useLayout'
import { t } from './i18n'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  db.layout = null
  db.selectError = null
  db.upsertError = null
  db.upserts = []
})

function setup() {
  let api!: ReturnType<typeof useLayout>
  mount(defineComponent({ setup() { api = useLayout(); return () => h('div') } }))
  return api
}

describe('useLayout', () => {
  it('load: нет сохранённой раскладки → по умолчанию; loaded=true', async () => {
    const api = setup()
    expect(api.loaded.value).toBe(false)
    await api.load('u1')
    expect(api.loaded.value).toBe(true)
    expect(api.layout.value.map((i) => i.key)).toEqual(['profile', 'charts', 'daily'])
  })

  it('load: читает сохранённый порядок и скрытые блоки (общий формат с классикой)', async () => {
    db.layout = [{ key: 'daily', visible: true }, { key: 'profile', visible: false }, { key: 'charts', visible: true }]
    const api = setup()
    await api.load('u1')
    expect(api.layout.value).toEqual([
      { key: 'daily', visible: true },
      { key: 'profile', visible: false },
      { key: 'charts', visible: true },
    ])
  })

  it('load: ошибка запроса (нет колонки) → раскладка по умолчанию, страница не ломается', async () => {
    db.selectError = { message: 'column does not exist' }
    db.layout = [{ key: 'charts', visible: false }]
    const api = setup()
    await api.load('u1')
    expect(api.loaded.value).toBe(true)
    expect(api.layout.value.every((i) => i.visible)).toBe(true)
  })

  it('save: upsert по user_id с dashboard_layout, при успехе обновляет layout', async () => {
    const api = setup()
    await api.load('u1')
    const next = [{ key: 'charts' as const, visible: true }, { key: 'profile' as const, visible: false }, { key: 'daily' as const, visible: true }]
    expect(await api.save('u1', next)).toBe(true)
    expect(db.upserts).toEqual([{ user_id: 'u1', dashboard_layout: next }])
    expect(api.layout.value).toEqual(next)
  })

  it('save: ошибка → false, saveError заполнен, layout не меняется', async () => {
    db.upsertError = { message: 'denied' }
    const api = setup()
    await api.load('u1')
    const before = api.layout.value
    expect(await api.save('u1', [{ key: 'charts', visible: false }, { key: 'profile', visible: true }, { key: 'daily', visible: true }])).toBe(false)
    expect(api.saveError.value).toBe('denied')
    expect(api.layout.value).toBe(before)
  })
})

describe('LayoutModal', () => {
  const initial = [
    { key: 'profile' as const, visible: true },
    { key: 'charts' as const, visible: true },
    { key: 'daily' as const, visible: true },
  ]

  it('три строки с подписями блоков; «вверх» у первого и «вниз» у последнего отключены', () => {
    const w = mount(LayoutModal, { props: { initial } })
    const rows = w.findAll('[data-test="layout-row"]')
    expect(rows.map((r) => r.find('.font-medium').text())).toEqual([t('dash_block_profile'), t('dash_charts_h2'), t('dash_block_daily')].map((x) => x.replace(/^\p{Extended_Pictographic}\uFE0F?\s*/u, '')))
    expect(rows[0].find('[data-test="up"]').attributes('disabled')).toBeDefined()
    expect(rows[2].find('[data-test="down"]').attributes('disabled')).toBeDefined()
    w.unmount()
  })

  it('«вниз», «скрыть» и «Сохранить» отдают новую раскладку; исходный проп не мутируется', async () => {
    const w = mount(LayoutModal, { props: { initial } })
    await w.findAll('[data-test="layout-row"]')[0].find('[data-test="down"]').trigger('click')
    await w.findAll('[data-test="layout-row"]')[2].find('[data-test="toggle"]').trigger('click')
    await w.find('[data-test="save"]').trigger('click')
    expect(w.emitted('save')![0][0]).toEqual([
      { key: 'charts', visible: true },
      { key: 'profile', visible: true },
      { key: 'daily', visible: false },
    ])
    expect(initial.map((i) => i.key)).toEqual(['profile', 'charts', 'daily'])
    expect(initial.every((i) => i.visible)).toBe(true)
    w.unmount()
  })

  it('«Отмена» закрывает без сохранения; ошибка сохранения показывается', async () => {
    const w = mount(LayoutModal, { props: { initial, error: 'denied' } })
    expect(w.find('[data-test="layout-error"]').text()).toContain('denied')
    await w.findAll('button').find((b) => b.text() === t('cancel'))!.trigger('click')
    expect(w.emitted('close')).toBeTruthy()
    expect(w.emitted('save')).toBeUndefined()
    w.unmount()
  })
})
