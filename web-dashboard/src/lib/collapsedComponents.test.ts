import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import SectionHeading from '../components/SectionHeading.vue'
import { COLLAPSED_PREFIX, hasStoredCollapsed, readCollapsed, writeCollapsed } from './collapsed'
import { t } from './i18n'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})

describe('collapsed storage (тот же ключ, что в классике)', () => {
  it('нет записи = развёрнуто; "1" = свёрнуто; "0" = развёрнуто', () => {
    expect(readCollapsed('charts')).toBe(false)
    localStorage.setItem('dash_collapsed:charts', '1')
    expect(readCollapsed('charts')).toBe(true)
    localStorage.setItem('dash_collapsed:charts', '0')
    expect(readCollapsed('charts')).toBe(false)
  })

  it('writeCollapsed пишет "1"/"0" под dash_collapsed:<ключ>', () => {
    writeCollapsed('daily', true)
    expect(localStorage.getItem(COLLAPSED_PREFIX + 'daily')).toBe('1')
    writeCollapsed('daily', false)
    expect(localStorage.getItem('dash_collapsed:daily')).toBe('0')
  })
})

function host(key: string) {
  const state = ref(false)
  const w = mount(
    defineComponent({
      setup: () => () =>
        h('div', [
          h(SectionHeading, { title: 'Заголовок', storageKey: key, collapsed: state.value, 'onUpdate:collapsed': (v: boolean) => (state.value = v) }),
          h('div', { 'data-test': 'body', style: { display: state.value ? 'none' : 'block' } }, 'тело'),
        ]),
    }),
  )
  return { w, state }
}

describe('SectionHeading', () => {
  const chevron = (w: ReturnType<typeof host>['w']) => w.find('.collapse-chevron').attributes('data-collapsed')

  it('по умолчанию развёрнуто: шеврон вниз, подсказка «Свернуть»', async () => {
    const { w, state } = host('profile')
    await w.vm.$nextTick()
    const btn = w.find('[data-test="collapse-toggle"]')
    expect(chevron(w)).toBe('false')
    expect(btn.attributes('aria-expanded')).toBe('true')
    expect(btn.attributes('title')).toBe(t('dash_collapse_btn'))
    expect(state.value).toBe(false)
    w.unmount()
  })

  it('клик сворачивает, запоминает в localStorage и меняет шеврон/подсказку; повторный клик разворачивает', async () => {
    const { w, state } = host('charts')
    const btn = () => w.find('[data-test="collapse-toggle"]')
    await btn().trigger('click')
    expect(state.value).toBe(true)
    expect(localStorage.getItem('dash_collapsed:charts')).toBe('1')
    expect(chevron(w)).toBe('true')
    expect(btn().attributes('aria-expanded')).toBe('false')
    expect(btn().attributes('title')).toBe(t('dash_expand_btn'))
    expect((w.find('[data-test="body"]').element as HTMLElement).style.display).toBe('none')
    await btn().trigger('click')
    expect(state.value).toBe(false)
    expect(localStorage.getItem('dash_collapsed:charts')).toBe('0')
    w.unmount()
  })

  it('при монтировании читает сохранённое состояние (свёрнуто из классики подхватывается)', async () => {
    localStorage.setItem('dash_collapsed:daily', '1')
    const { w, state } = host('daily')
    await w.vm.$nextTick()
    expect(state.value).toBe(true)
    expect(chevron(w)).toBe('true')
    w.unmount()
  })

  it('шапка кликабельна целиком, доступна с клавиатуры (Enter и Пробел), клик по заголовку тоже сворачивает', async () => {
    const { w, state } = host('profile')
    await w.vm.$nextTick()
    const head = w.find('[data-test="collapse-toggle"]')
    expect(head.attributes('role')).toBe('button')
    expect(head.attributes('tabindex')).toBe('0')
    await w.find('h2').trigger('click')
    expect(state.value).toBe(true)
    await head.trigger('keydown', { key: 'Enter' })
    expect(state.value).toBe(false)
    await head.trigger('keydown', { key: ' ' })
    expect(state.value).toBe(true)
    w.unmount()
  })
})

describe('SectionHeading: свёрнуто по умолчанию (BACKLOG 17)', () => {
  function hostDefault(key: string, def: boolean) {
    const state = ref(false)
    const dflt = ref(def)
    const w = mount(
      defineComponent({
        setup: () => () => h(SectionHeading, { title: 'Графики', storageKey: key, defaultCollapsed: dflt.value, collapsed: state.value, 'onUpdate:collapsed': (v: boolean) => (state.value = v) }),
      }),
    )
    return { w, state, dflt }
  }

  it('hasStoredCollapsed: false без записи, true после явного выбора', () => {
    expect(hasStoredCollapsed('charts')).toBe(false)
    writeCollapsed('charts', false)
    expect(hasStoredCollapsed('charts')).toBe(true)
  })

  it('без выбора пользователя defaultCollapsed сворачивает секцию, и меняется вслед за данными (появились данные → развернулась)', async () => {
    const { w, state, dflt } = hostDefault('charts', true)
    await w.vm.$nextTick()
    expect(state.value).toBe(true)
    dflt.value = false
    await w.vm.$nextTick()
    expect(state.value).toBe(false)
    w.unmount()
  })

  it('явный выбор пользователя сильнее: развернул сам — остаётся развёрнутой, даже если график не построен', async () => {
    localStorage.setItem('dash_collapsed:charts', '0')
    const { w, state, dflt } = hostDefault('charts', true)
    await w.vm.$nextTick()
    expect(state.value).toBe(false)
    dflt.value = true
    await w.vm.$nextTick()
    expect(state.value).toBe(false)
    w.unmount()
  })

  it('пользователь развернул свёрнутую по умолчанию секцию — выбор запоминается и дальше уже не перебивается', async () => {
    const { w, state, dflt } = hostDefault('charts', true)
    await w.vm.$nextTick()
    await w.find('[data-test="collapse-toggle"]').trigger('click')
    expect(state.value).toBe(false)
    expect(localStorage.getItem('dash_collapsed:charts')).toBe('0')
    dflt.value = false
    dflt.value = true
    await w.vm.$nextTick()
    expect(state.value).toBe(false)
    w.unmount()
  })
})
