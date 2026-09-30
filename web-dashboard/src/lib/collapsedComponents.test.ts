import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import SectionHeading from '../components/SectionHeading.vue'
import { COLLAPSED_PREFIX, readCollapsed, writeCollapsed } from './collapsed'
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
