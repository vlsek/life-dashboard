import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import {
  INSTALL_DISMISS_DAYS,
  INSTALL_DISMISS_KEY,
  dismissInstall,
  installAvailable,
  isInstallDismissed,
  promptInstall,
} from './lib/install'

// beforeinstallprompt шлём вручную, как браузер
function fireInstallEvent() {
  const prompt = vi.fn(() => Promise.resolve())
  const ev = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt, userChoice: Promise.resolve({ outcome: 'accepted' }) })
  window.dispatchEvent(ev)
  return { ev, prompt }
}

beforeEach(async () => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  installAvailable.value = false
  window.dispatchEvent(new Event('appinstalled')) // сбросить возможный «захваченный» prompt из прошлого теста
  vi.unstubAllGlobals()
})

describe('lib/install', () => {
  it('beforeinstallprompt перехватывается: стандартная мини-панель браузера отменяется, installAvailable=true', () => {
    expect(installAvailable.value).toBe(false)
    const { ev } = fireInstallEvent()
    expect(ev.defaultPrevented).toBe(true)
    expect(installAvailable.value).toBe(true)
  })

  it('promptInstall вызывает нативный prompt, возвращает true и сбрасывает доступность (событие одноразовое)', async () => {
    const { prompt } = fireInstallEvent()
    expect(await promptInstall()).toBe(true)
    expect(prompt).toHaveBeenCalledTimes(1)
    expect(installAvailable.value).toBe(false)
    expect(await promptInstall()).toBe(false) // второй раз нечего показывать
  })

  it('без события promptInstall возвращает false', async () => {
    expect(await promptInstall()).toBe(false)
  })

  it('appinstalled сбрасывает доступность', () => {
    fireInstallEvent()
    window.dispatchEvent(new Event('appinstalled'))
    expect(installAvailable.value).toBe(false)
  })

  it('закрытие запоминается на 14 дней: через 13 — ещё скрыто, через 15 — снова можно показывать; мусор игнорируется', () => {
    const t0 = 1_700_000_000_000
    expect(isInstallDismissed(t0)).toBe(false)
    dismissInstall(t0)
    expect(localStorage.getItem(INSTALL_DISMISS_KEY)).toBe(String(t0))
    expect(isInstallDismissed(t0 + 13 * 86_400_000)).toBe(true)
    expect(isInstallDismissed(t0 + (INSTALL_DISMISS_DAYS + 1) * 86_400_000)).toBe(false)
    localStorage.setItem(INSTALL_DISMISS_KEY, 'abc')
    expect(isInstallDismissed(t0)).toBe(false)
  })
})

describe('InstallBanner', () => {
  const mk = async () => {
    vi.resetModules() // plashka читает standalone/iOS один раз при создании
    const { default: InstallBanner } = await import('./components/InstallBanner.vue')
    const lib = await import('./lib/install')
    return { w: mount(InstallBanner), lib }
  }

  it('не видна, пока браузер не прислал beforeinstallprompt', async () => {
    const { w } = await mk()
    expect(w.find('[data-test="install-banner"]').exists()).toBe(false)
  })

  it('после beforeinstallprompt появляется; «Установить» вызывает нативный диалог и плашка исчезает', async () => {
    const { w } = await mk()
    const { prompt } = fireInstallEvent()
    await flushPromises()
    expect(w.text()).toContain('Установите приложение')
    await w.find('[data-test="install-btn"]').trigger('click')
    await flushPromises()
    expect(prompt).toHaveBeenCalledTimes(1)
    expect(w.find('[data-test="install-banner"]').exists()).toBe(false)
  })

  it('крестик прячет плашку и запоминает закрытие', async () => {
    const { w } = await mk()
    fireInstallEvent()
    await flushPromises()
    await w.find('[data-test="install-dismiss"]').trigger('click')
    expect(w.find('[data-test="install-banner"]').exists()).toBe(false)
    expect(Number(localStorage.getItem(INSTALL_DISMISS_KEY))).toBeGreaterThan(0)
  })

  it('недавно закрытая плашка не показывается даже при beforeinstallprompt', async () => {
    dismissInstall()
    const { w } = await mk()
    fireInstallEvent()
    await flushPromises()
    expect(w.find('[data-test="install-banner"]').exists()).toBe(false)
  })

  it('уже установленное приложение (standalone) — плашки нет', async () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('standalone'), media: q, addEventListener() {}, removeEventListener() {} }))
    const { w } = await mk()
    fireInstallEvent()
    await flushPromises()
    expect(w.find('[data-test="install-banner"]').exists()).toBe(false)
  })

  it('iOS: события нет, но плашка есть; «Установить» показывает инструкцию «Поделиться → На экран Домой»', async () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' })
    const { w } = await mk()
    expect(w.find('[data-test="install-banner"]').exists()).toBe(true)
    expect(w.find('[data-test="install-ios-hint"]').exists()).toBe(false)
    await w.find('[data-test="install-btn"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-test="install-ios-hint"]').text()).toContain('Поделиться')
  })
})

describe('InstallBanner: заголовок и пояснение не слипаются (BACKLOG 25, 🐞 «Install the appIt opens…»)', () => {
  const mk = async (lang: string) => {
    localStorage.setItem('site_lang', lang)
    vi.resetModules()
    const { default: InstallBanner } = await import('./components/InstallBanner.vue')
    const w = mount(InstallBanner)
    fireInstallEvent()
    await flushPromises()
    return w
  }

  it('заголовок и пояснение — разные блочные элементы (display:block), а не склеенный текст в одной строке', async () => {
    for (const lang of ['ru', 'en']) {
      const w = await mk(lang)
      const title = w.find('[data-test="install-title"]')
      const text = w.find('[data-test="install-text"]')
      expect(title.exists() && text.exists(), lang).toBe(true)
      expect(title.element).not.toBe(text.element)
      expect(title.classes(), lang).toContain('block')
      expect(text.classes(), lang).toContain('block')
      expect(title.text().length).toBeGreaterThan(3)
      expect(text.text().length).toBeGreaterThan(10)
    }
  })

  it('порядок: сначала заголовок, ниже пояснение; тексты на нужном языке', async () => {
    const w = await mk('en')
    const kids = w.find('[data-test="install-title"]').element.parentElement!.children
    expect(kids[0].getAttribute('data-test')).toBe('install-title')
    expect(kids[1].getAttribute('data-test')).toBe('install-text')
    expect(kids[0].textContent).toBe('Install the app')
    expect(kids[1].textContent).toContain('It opens as a separate app')
  })

  it('пояснение не начинается с пробела (больше не полагаемся на пробел между span-ами)', async () => {
    const w = await mk('ru')
    expect(w.find('[data-test="install-text"]').element.textContent!.startsWith(' ')).toBe(false)
  })
})
