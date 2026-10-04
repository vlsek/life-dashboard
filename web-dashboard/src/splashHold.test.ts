import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в splashLoader.test.ts).
import { readdirSync, readFileSync } from 'node:fs'

// Удержание заставки до полной загрузки страницы (BACKLOG «Огонёк пропадает, а страница ещё не загрузилась»;
// ответ владельца 2026-10-04: пока страница не загрузится ЦЕЛИКОМ). Канонический скрипт — scripts/splash-hold.snippet.html.
const snippet: string = readFileSync('../scripts/splash-hold.snippet.html', 'utf-8')
const scriptCode = snippet.slice(snippet.indexOf('<script>') + 8, snippet.indexOf('</script>'))

function setupPage() {
  document.documentElement.removeAttribute('data-motion')
  document.body.innerHTML = '<div id="app"><div class="pre-splash"><svg class="pre-flame"></svg></div></div>'
}
const run = () => new Function(scriptCode)()
const overlay = () => document.querySelector('[data-test="pre-overlay"]') as HTMLElement | null
const mountApp = () => {
  document.querySelector('#app')!.innerHTML = '<main>готово</main>'
}
const setReadyState = (v: string) => Object.defineProperty(document, 'readyState', { value: v, configurable: true })

describe('splash-hold: поведение', () => {
  let nativeFetch: typeof window.fetch
  beforeEach(() => {
    vi.useFakeTimers()
    nativeFetch = vi.fn(() => Promise.resolve(new Response('{}'))) as unknown as typeof window.fetch
    window.fetch = nativeFetch
    setReadyState('complete')
    setupPage()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('сразу ставит копию заставки поверх страницы, не трогая оригинал внутри #app', () => {
    run()
    const ov = overlay()!
    expect(ov).not.toBeNull()
    expect(ov.classList.contains('pre-splash')).toBe(true)
    expect(ov.classList.contains('pre-overlay')).toBe(true)
    expect(ov.getAttribute('aria-hidden')).toBe('true')
    expect(ov.querySelector('svg.pre-flame')).not.toBeNull()
    expect(document.querySelectorAll('.pre-splash')).toHaveLength(2)
  })

  it('пока Vue не смонтировался — не снимает, даже через несколько секунд', () => {
    run()
    vi.advanceTimersByTime(5000)
    expect(overlay()!.classList.contains('pre-out')).toBe(false)
  })

  it('смонтировалась + документ загружен + 500 мс тишины -> затухает и удаляется', () => {
    run()
    mountApp()
    vi.advanceTimersByTime(300)
    expect(overlay()!.classList.contains('pre-out')).toBe(false)
    vi.advanceTimersByTime(400)
    expect(overlay()!.classList.contains('pre-out')).toBe(true)
    vi.advanceTimersByTime(400)
    expect(overlay()).toBeNull()
  })

  it('держит, пока документ не загружен целиком (readyState != complete)', () => {
    setReadyState('interactive')
    run()
    mountApp()
    vi.advanceTimersByTime(3000)
    expect(overlay()!.classList.contains('pre-out')).toBe(false)
    setReadyState('complete')
    vi.advanceTimersByTime(150) // тишина уже накопилась, ждём только следующий тик проверки
    expect(overlay()!.classList.contains('pre-out')).toBe(true)
  })

  it('держит, пока идёт запрос, и отсчитывает 500 мс тишины с его завершения', async () => {
    let finish!: () => void
    window.fetch = vi.fn(() => new Promise<Response>((res) => (finish = () => res(new Response('{}'))))) as unknown as typeof window.fetch
    run()
    mountApp()
    void window.fetch('/rest/v1/metrics')
    vi.advanceTimersByTime(3000)
    expect(overlay()!.classList.contains('pre-out')).toBe(false)
    finish()
    await vi.advanceTimersByTimeAsync(300)
    expect(overlay()!.classList.contains('pre-out')).toBe(false)
    await vi.advanceTimersByTimeAsync(400)
    expect(overlay()!.classList.contains('pre-out')).toBe(true)
  })

  it('новый запрос в «тишину» сбрасывает ожидание (блоки подгружаются цепочкой)', async () => {
    run()
    mountApp()
    await vi.advanceTimersByTimeAsync(400)
    await window.fetch('/second')
    await vi.advanceTimersByTimeAsync(400)
    expect(overlay()!.classList.contains('pre-out')).toBe(false)
    await vi.advanceTimersByTimeAsync(300)
    expect(overlay()!.classList.contains('pre-out')).toBe(true)
  })

  it('страховка: если запрос завис, через 8 секунд заставка всё равно уходит', () => {
    window.fetch = vi.fn(() => new Promise<Response>(() => {})) as unknown as typeof window.fetch
    run()
    mountApp()
    void window.fetch('/hangs')
    vi.advanceTimersByTime(7800)
    expect(overlay()!.classList.contains('pre-out')).toBe(false)
    vi.advanceTimersByTime(400)
    expect(overlay()!.classList.contains('pre-out')).toBe(true)
  })

  it('возвращает настоящий fetch после снятия и не ломает результат запросов', async () => {
    run()
    expect(window.fetch).not.toBe(nativeFetch)
    const res = await window.fetch('/x')
    expect(await res.text()).toBe('{}')
    mountApp()
    await vi.advanceTimersByTimeAsync(1200)
    expect(window.fetch).toBe(nativeFetch)
  })

  it('«отключить все анимации»: без затухания, убирается сразу', () => {
    document.documentElement.setAttribute('data-motion', 'off')
    run()
    mountApp()
    vi.advanceTimersByTime(650)
    expect(overlay()).toBeNull()
  })

  it('на странице без заставки ничего не делает', () => {
    document.body.innerHTML = '<div id="app"></div>'
    expect(() => run()).not.toThrow()
    expect(overlay()).toBeNull()
  })
})

describe('splash-hold: один и тот же скрипт на всех страницах', () => {
  const pages: string[] = readdirSync('..').filter((d: string) => d.startsWith('web-') && existsIndex(d))
  function existsIndex(d: string): boolean {
    try {
      readFileSync(`../${d}/index.html`, 'utf-8')
      return true
    } catch {
      return false
    }
  }
  const block = (html: string) => {
    const a = html.indexOf('<!-- splash-hold:start')
    const b = html.indexOf('<!-- splash-hold:end -->')
    return a >= 0 && b > a ? html.slice(a, b + '<!-- splash-hold:end -->'.length) : ''
  }
  const canonical = snippet.trim()

  it('нашлись все 15 страниц пилота', () => {
    expect(pages.length).toBeGreaterThanOrEqual(15)
  })

  it.each(pages)('%s: блок совпадает с каноническим, стоит после #app и до main.ts, заставка внутри #app есть', (dir: string) => {
    const html: string = readFileSync(`../${dir}/index.html`, 'utf-8')
    expect(block(html)).toBe(canonical)
    expect(html.match(/splash-hold:start/g)).toHaveLength(1)
    expect(html.indexOf('class="pre-splash"')).toBeLessThan(html.indexOf('<!-- splash-hold:start'))
    expect(html.indexOf('<!-- splash-hold:start')).toBeLessThan(html.indexOf('src="/src/main.ts"'))
  })
})
