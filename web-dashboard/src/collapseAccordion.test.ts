import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'

// «Аккордеон» (BACKLOG 498): раскрыли один блок — остальные сворачиваются; при базовом шевроне блоки независимы.
const h2 = vi.hoisted(() => ({ result: { data: { customization: { collapse_style: 'collapse_accordion' } }, error: null } as { data: unknown; error: unknown } }))
vi.mock('./lib/supabase', () => ({
  sb: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => h2.result }) }) }) },
}))

import SectionHeading from './components/SectionHeading.vue'
import { collapseStyle, lastOpened, loadCollapseStyle } from './lib/useCollapseStyle'
import { COLLAPSE_STYLE_CACHE_KEY } from './lib/collapseStyle'

// Три блока рядом, как на Дашборде; состояние каждого доступно тесту.
function mountBlocks() {
  const state = { a: ref(false), b: ref(false), c: ref(false) }
  const Host = defineComponent({
    setup: () => () =>
      h('div', (['a', 'b', 'c'] as const).map((k) =>
        h(SectionHeading, { key: k, title: k.toUpperCase(), storageKey: 'acc_' + k, collapsed: state[k].value, 'onUpdate:collapsed': (v: boolean) => (state[k].value = v) }),
      )),
  })
  const w = mount(Host)
  return { w, state, head: (i: number) => w.findAll('[data-test="collapse-toggle"]')[i] }
}

beforeEach(() => {
  localStorage.clear()
  collapseStyle.value = 'chevron'
  lastOpened.value = null
})

describe('аккордеон на секциях', () => {
  it('базовый шеврон: блоки независимы — раскрытие одного не трогает остальные', async () => {
    const { w, state, head } = mountBlocks()
    await nextTick()
    await head(0).trigger('click') // a свернули
    await head(1).trigger('click') // b свернули
    await head(0).trigger('click') // a раскрыли
    expect([state.a.value, state.b.value, state.c.value]).toEqual([false, true, false])
    w.unmount()
  })

  it('аккордеон: раскрыли один — остальные развёрнутые сворачиваются, раскрытый остаётся', async () => {
    collapseStyle.value = 'accordion'
    const { w, state, head } = mountBlocks()
    await nextTick()
    await head(0).trigger('click') // a свернули (раскрытия не было — остальные не трогаем)
    expect([state.a.value, state.b.value, state.c.value]).toEqual([true, false, false])
    await head(0).trigger('click') // a раскрыли → b и c сворачиваются
    await nextTick()
    expect([state.a.value, state.b.value, state.c.value]).toEqual([false, true, true])
    await head(1).trigger('click') // b раскрыли → a сворачивается, c остаётся свёрнутым
    await nextTick()
    expect([state.a.value, state.b.value, state.c.value]).toEqual([true, false, true])
    w.unmount()
  })

  it('аккордеон: свёрнутое состояние запоминается — после перезагрузки страницы то же', async () => {
    collapseStyle.value = 'accordion'
    const { w, head } = mountBlocks()
    await nextTick()
    await head(0).trigger('click')
    await head(0).trigger('click')
    await nextTick()
    expect(localStorage.getItem('dash_collapsed:acc_b')).toBe('1')
    expect(localStorage.getItem('dash_collapsed:acc_c')).toBe('1')
    expect(localStorage.getItem('dash_collapsed:acc_a')).toBe('0')
    w.unmount()
  })

  it('аккордеон: сворачивание блока не раскрывает и не сворачивает соседей', async () => {
    collapseStyle.value = 'accordion'
    const { w, state, head } = mountBlocks()
    await nextTick()
    await head(2).trigger('click') // c свернули
    expect([state.a.value, state.b.value, state.c.value]).toEqual([false, false, true])
    w.unmount()
  })

  it('переключили стиль обратно на шеврон — аккордеон перестаёт работать сразу', async () => {
    collapseStyle.value = 'accordion'
    const { w, state, head } = mountBlocks()
    await nextTick()
    collapseStyle.value = 'chevron'
    await head(0).trigger('click')
    await head(0).trigger('click')
    await nextTick()
    expect([state.a.value, state.b.value, state.c.value]).toEqual([false, false, false])
    w.unmount()
  })
})

describe('loadCollapseStyle: выбор из профиля', () => {
  it('куплен и надет «аккордеон» → стиль и кэш обновились', async () => {
    h2.result = { data: { customization: { collapse_style: 'collapse_accordion' } }, error: null }
    await loadCollapseStyle('u1')
    expect(collapseStyle.value).toBe('accordion')
    expect(localStorage.getItem(COLLAPSE_STYLE_CACHE_KEY)).toBe('accordion')
  })
  it('сняли предмет (нет ключа) → базовый шеврон, кэш очищен', async () => {
    localStorage.setItem(COLLAPSE_STYLE_CACHE_KEY, 'accordion')
    collapseStyle.value = 'accordion'
    h2.result = { data: { customization: { avatar_frame: 'frame_neon' } }, error: null }
    await loadCollapseStyle('u1')
    expect(collapseStyle.value).toBe('chevron')
    expect(localStorage.getItem(COLLAPSE_STYLE_CACHE_KEY)).toBeNull()
  })
  it('ошибка запроса (нет колонки/сеть) — остаётся то, что было из кэша', async () => {
    collapseStyle.value = 'accordion'
    h2.result = { data: null, error: { message: 'boom' } }
    await loadCollapseStyle('u1')
    expect(collapseStyle.value).toBe('accordion')
  })
})
