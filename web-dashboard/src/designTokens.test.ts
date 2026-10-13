// @ts-ignore — в проекте нет типов node; vitest выполняется в node (как в themes.test.ts)
import { execSync } from 'node:child_process'
// @ts-ignore — то же
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// BACKLOG 50.1а «Большие темы — срез 0»: токены ОФОРМЛЕНИЯ (не цвета). Значения по умолчанию = прежний вид сайта, поэтому у людей ничего не меняется;
// «большая тема» потом переопределяет их. Блок `design-tokens` генерирует scripts/apply_themes.py во все style.css пилотов и в корневой.
const read = (p: string): string => readFileSync('../' + p, 'utf-8')
const pilots = readdirSync('..').filter((d: string) => /^web-/.test(d) && existsSync('../' + d + '/src/lib/theme.ts'))
const files = [...pilots.map((d: string) => d + '/src/style.css'), 'style.css']
const REGION = /\/\* design-tokens:start[^*]*\*\/[\s\S]*?\/\* design-tokens:end \*\//

const TOKENS = ['--radius-card', '--radius-modal', '--radius-control', '--shadow-card', '--shadow-active', '--blur-glass', '--bg-pattern', '--bg-pattern-size', '--border-style', '--card-accent', '--font-heading']
const DEFAULTS: Record<string, string> = {
  '--shadow-card': 'none',
  '--shadow-active': 'none',
  '--blur-glass': 'none',
  '--bg-pattern': 'none',
  '--bg-pattern-size': 'auto',
  '--border-style': 'solid',
  '--card-accent': 'none',
  '--font-heading': 'inherit',
}
const decl = (css: string, name: string): string | null => {
  const m = css.match(new RegExp(name + ':\\s*([^;]+);'))
  return m ? m[1].trim() : null
}

describe('токены оформления: блок есть везде', () => {
  it('охвачены все пилоты и корень', () => {
    expect(pilots.length).toBeGreaterThanOrEqual(16)
    expect(files).toContain('style.css')
  })
  for (const f of files) {
    it(f + ': все токены заданы, значения по умолчанию нейтральны', () => {
      const m = read(f).match(REGION)
      expect(m, 'нет блока design-tokens').not.toBeNull()
      const block = m![0]
      for (const t of TOKENS) expect(decl(block, t), t).not.toBeNull()
      for (const [k, v] of Object.entries(DEFAULTS)) expect(decl(block, k), k).toBe(v)
    })
  }
  it('у Tailwind-страниц скругления — переменные Tailwind с запасным значением, равным прежним 0.75rem/0.5rem; в корне — прежние 12px/8px', () => {
    for (const d of pilots) {
      const b = read(d + '/src/style.css').match(REGION)![0]
      expect(decl(b, '--radius-card'), d).toBe('var(--radius-xl, 0.75rem)')
      expect(decl(b, '--radius-modal'), d).toBe('var(--radius-xl, 0.75rem)')
      expect(decl(b, '--radius-control'), d).toBe('var(--radius-lg, 0.5rem)')
    }
    const root = read('style.css').match(REGION)![0]
    expect([decl(root, '--radius-card'), decl(root, '--radius-modal'), decl(root, '--radius-control')]).toEqual(['12px', '12px', '8px'])
  })
})

describe('общие классы читают токены', () => {
  const rule = (css: string, head: RegExp): string | null => {
    const m = css.match(head)
    return m ? m[0] : null
  }
  for (const f of files) {
    const css = read(f)
    const card = rule(css, /\n\.card \{[^}]*\}/)
    if (card) {
      it(f + ': .card — токен скругления и тени, без прежнего литерала', () => {
        expect(card).toContain('border-radius: var(--radius-card)')
        expect(card).toContain('box-shadow: var(--shadow-card)')
        expect(card).not.toMatch(/border-radius:\s*(12px|0\.75rem)/)
      })
    }
    const modal = rule(css, /\n\.modal \{[^}]*\}/)
    if (modal) {
      it(f + ': .modal — токен скругления и тени', () => {
        expect(modal).toContain('border-radius: var(--radius-modal)')
        expect(modal).toContain('box-shadow: var(--shadow-card)')
      })
    }
    const btn = rule(css, /@layer base \{\s*button \{[^}]*\}/) || rule(css, /\nbutton \{[^}]*\}/)
    if (btn) {
      it(f + ': базовая кнопка — токен скругления', () => {
        expect(btn).toContain('border-radius: var(--radius-control)')
      })
    }
  }
  it('в пилотах, где эти классы есть, раскатка дошла минимум до трёх страниц (страж от «пропал в раскатке»)', () => {
    const n = files.filter((f) => read(f).includes('var(--radius-card)')).length
    expect(n).toBeGreaterThanOrEqual(3)
  })
})

describe('раскатка', () => {
  it('apply_themes.py идемпотентен: повторный запуск ничего не меняет (и значит, токены не правили руками мимо генератора)', () => {
    const out = execSync('python3 scripts/apply_themes.py', { cwd: '..', encoding: 'utf-8' })
    expect(out).toContain('изменено файлов: 0')
  })
})

// BACKLOG 50.1г: первая «большая тема» Emerald Obsidian — «характер» (скругление 2px, пунктир, моноширинные заголовки, Snappy) только под своим классом.
describe('большая тема emerald: характер', () => {
  const charBlock = (css: string): string => {
    const m = css.match(/\/\* большая тема: emerald \*\/\nhtml\.theme-emerald \{[^}]*\}/)
    expect(m, 'нет блока характера').not.toBeNull()
    return m![0]
  }
  for (const d of pilots) {
    it(d + ': 2px у всех радиусов Tailwind, пунктир, моноширинный шрифт, резкая анимация', () => {
      const b = charBlock(read(d + '/src/style.css'))
      for (const r of ['--radius-md', '--radius-lg', '--radius-xl', '--radius-2xl']) expect(decl(b, r), d + r).toBe('2px')
      expect(decl(b, '--border-style')).toBe('dashed')
      expect(decl(b, '--font-heading')).toContain('monospace')
      expect(decl(b, '--default-transition-timing-function')).toBe('cubic-bezier(0, 1, 0, 1)')
    })
  }
  it('корень (без Tailwind): те же скругления через токены', () => {
    const b = charBlock(read('style.css'))
    expect([decl(b, '--radius-card'), decl(b, '--radius-modal'), decl(b, '--radius-control')]).toEqual(['2px', '2px', '2px'])
    expect(decl(b, '--border-style')).toBe('dashed')
  })
  it('правила характера работают ТОЛЬКО под html.theme-emerald (остальные темы не затронуты)', () => {
    for (const f of files) {
      const region = read(f).match(REGION)![0]
      // такое же правило пунктира есть и у vintage — поэтому смотрим именно строки emerald и что в них нет чужих селекторов
      const rules = region.split('\n').filter((l) => l.startsWith('html.theme-emerald ') && l.includes('{ '))
      expect(rules.length, f).toBeGreaterThanOrEqual(2)
      for (const l of rules) for (const sel of l.split('{')[0].split(',')) expect(sel.trim(), f).toMatch(/^html\.theme-emerald /)
      expect(rules.some((l) => /\{ border-style: var\(--border-style\); \}/.test(l)), f).toBe(true)
      expect(rules.some((l) => /\{ font-family: var\(--font-heading\); letter-spacing/.test(l)), f).toBe(true)
    }
  })
  it('при prefers-reduced-motion анимации темы мгновенные (только у Tailwind-страниц)', () => {
    for (const d of pilots) expect(read(d + '/src/style.css')).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*html\.theme-emerald \{\s*--default-transition-duration: 0s;/)
  })
  it('блоки характера есть только у больших тем (emerald, moonlight, phosphor, nightfall, velvet, frost, alpine, matcha, cyberday, vintage, glass, meadow) — остальные темы не переопределены', () => {
    for (const f of files) {
      const region = read(f).match(REGION)![0]
      expect([...region.matchAll(/\/\* большая тема: (\w+) \*\//g)].map((m) => m[1]), f).toEqual(['emerald', 'moonlight', 'phosphor', 'nightfall', 'velvet', 'frost', 'alpine', 'matcha', 'cyberday', 'vintage', 'glass', 'meadow'])
    }
  })
})

// BACKLOG 50.1б: вторая «большая тема» Moonlight Synth — мягкие углы, неоновое свечение активного, сетка точек, пружинные анимации; при prefers-contrast: more свечение и сетка выключены.
describe('большая тема moonlight: характер', () => {
  const block = (css: string): string => {
    const m = css.match(/\/\* большая тема: moonlight \*\/\nhtml\.theme-moonlight \{[^}]*\}/)
    expect(m, 'нет блока характера').not.toBeNull()
    return m![0]
  }
  for (const d of pilots) {
    it(d + ': мягкие углы, свечение, сетка точек, пружинная анимация', () => {
      const b = block(read(d + '/src/style.css'))
      expect([decl(b, '--radius-md'), decl(b, '--radius-lg'), decl(b, '--radius-xl'), decl(b, '--radius-2xl')]).toEqual(['8px', '10px', '12px', '16px'])
      expect(decl(b, '--shadow-active')).toContain('0 0 12px')
      expect(decl(b, '--bg-pattern')).toContain('radial-gradient')
      expect(decl(b, '--bg-pattern-size')).toBe('22px 22px')
      expect(decl(b, '--default-transition-timing-function')).toBe('cubic-bezier(0.34, 1.56, 0.64, 1)')
    })
    it(d + ': при prefers-contrast: more свечение и сетка выключены; при prefers-reduced-motion — анимации мгновенные', () => {
      const css = read(d + '/src/style.css')
      expect(css).toMatch(/@media \(prefers-contrast: more\) \{\s*html\.theme-moonlight \{\s*--shadow-active: none;\s*--bg-pattern: none;/)
      expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*html\.theme-moonlight \{\s*--default-transition-duration: 0s;/)
    })
  }
  it('корень: углы и свечение через токены, сетка точек', () => {
    const b = block(read('style.css'))
    expect([decl(b, '--radius-card'), decl(b, '--radius-modal'), decl(b, '--radius-control')]).toEqual(['12px', '12px', '10px'])
    expect(decl(b, '--shadow-active')).toContain('0 0 12px')
    expect(decl(b, '--bg-pattern')).toContain('radial-gradient')
  })
  it('правила moonlight (сетка на body, свечение у кнопок с заливкой и отмеченных галочек) только под html.theme-moonlight', () => {
    for (const f of files) {
      const region = read(f).match(REGION)![0]
      const rules = region.split('\n').filter((l) => /^html\.theme-moonlight .*\{ (background-image: var\(--bg-pattern\)|box-shadow: var\(--shadow-active\))/.test(l))
      expect(rules.length, f).toBe(2)
      for (const l of rules) for (const sel of l.split('{')[0].split(',')) expect(sel.trim(), f).toMatch(/^html\.theme-moonlight /)
    }
  })
})

// BACKLOG 50.1е: третья «большая тема» Matrix Phosphor — острые углы 0px, моноширинный шрифт во всём интерфейсе, scanlines, Snappy; при prefers-contrast: more scanlines выключены.
describe('большая тема phosphor: характер', () => {
  const block = (css: string): string => {
    const m = css.match(/\/\* большая тема: phosphor \*\/\nhtml\.theme-phosphor \{[^}]*\}/)
    expect(m, 'нет блока характера').not.toBeNull()
    return m![0]
  }
  for (const d of pilots) {
    it(d + ': радиусы 0, моноширинный шрифт, scanlines, резкая анимация', () => {
      const css = read(d + '/src/style.css')
      const b = block(css)
      for (const r of ['--radius-md', '--radius-lg', '--radius-xl', '--radius-2xl']) expect(decl(b, r), d + r).toBe('0px')
      expect(decl(b, '--font-heading')).toContain('monospace')
      expect(decl(b, '--scanlines')).toContain('repeating-linear-gradient')
      expect(decl(b, '--default-transition-timing-function')).toBe('cubic-bezier(0, 1, 0, 1)')
      expect(css).toMatch(/@media \(prefers-contrast: more\) \{\s*html\.theme-phosphor \{\s*--scanlines: none;/)
      expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*html\.theme-phosphor \{\s*--default-transition-duration: 0s;/)
    })
  }
  it('корень: острые углы через токены, scanlines и шрифт', () => {
    const b = block(read('style.css'))
    expect([decl(b, '--radius-card'), decl(b, '--radius-modal'), decl(b, '--radius-control')]).toEqual(['0px', '0px', '0px'])
    expect(decl(b, '--scanlines')).toContain('repeating-linear-gradient')
    expect(decl(b, '--font-heading')).toContain('monospace')
  })
  it('слой scanlines не перехватывает нажатия и лежит поверх страницы; шрифт — на body и полях ввода; всё только под html.theme-phosphor', () => {
    for (const f of files) {
      const region = read(f).match(REGION)![0]
      const lines = region.split('\n').filter((l) => l.startsWith('html.theme-phosphor ') && /\{ (content:|font-family:)/.test(l))
      expect(lines.length, f).toBe(2)
      const scan = lines.find((l) => l.includes('body::after'))!
      expect(scan).toContain('pointer-events: none')
      expect(scan).toContain('position: fixed')
      const font = lines.find((l) => l.includes('textarea'))!
      for (const el of ['body', 'button', 'input', 'select', 'textarea']) expect(font, f).toContain('html.theme-phosphor ' + el)
    }
  })
})

// Список тёмной галочки теперь ведёт apply_themes.py (раньше вручную): у каждой темы, где белая галочка на акценте < 3:1, он есть — в пилотах и в шапке.
describe('тёмная галочка: список ведёт генератор', () => {
  it('phosphor (светло-зелёный акцент) в списке тёмной галочки во всех пилотах и в шапке', () => {
    for (const p of [...files.filter((f) => f !== 'style.css'), 'web-header/src/header.css']) expect(read(p), p).toContain("html.theme-phosphor input[type='checkbox']:checked")
  })
  it('moonlight (белая галочка 3.78:1 читается) в списке НЕ нужен', () => {
    const m = /((?:html\.theme-\w+ input\[type='checkbox'\]:checked,?\s*)+)\{[^}]*background-image/.exec(read('web-dashboard/src/style.css'))
    expect(m).not.toBeNull()
    const names = [...m![1].matchAll(/html\.theme-(\w+) input/g)].map((x) => x[1])
    expect(names).toContain('phosphor')
    expect(names).not.toContain('moonlight')
  })
})

// BACKLOG 50.1в: четвёртая «большая тема» Tokyo Nightfall — мягкие тени, скругление 8px, лавандовая подсветка активных пунктов, гладкие анимации.
describe('большая тема nightfall: характер', () => {
  const block = (css: string): string => {
    const m = css.match(/\/\* большая тема: nightfall \*\/\nhtml\.theme-nightfall \{[^}]*\}/)
    expect(m, 'нет блока характера').not.toBeNull()
    return m![0]
  }
  for (const d of pilots) {
    it(d + ': скругление 8px, мягкая тень карточек, лавандовое кольцо активного, гладкая анимация', () => {
      const css = read(d + '/src/style.css')
      const b = block(css)
      expect([decl(b, '--radius-md'), decl(b, '--radius-lg'), decl(b, '--radius-xl'), decl(b, '--radius-2xl')]).toEqual(['6px', '8px', '8px', '12px'])
      expect(decl(b, '--shadow-card')).toContain('0 8px 28px')
      expect(decl(b, '--shadow-active')).toContain('#bb9af7')
      expect(decl(b, '--default-transition-timing-function')).toBe('cubic-bezier(0.25, 0.8, 0.25, 1)')
      expect(css).toMatch(/@media \(prefers-contrast: more\) \{\s*html\.theme-nightfall \{\s*--shadow-card: none;\s*--shadow-active: 0 0 0 2px #bb9af7;/)
      expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*html\.theme-nightfall \{\s*--default-transition-duration: 0s;/)
    })
  }
  it('корень: 8px и те же тени через токены', () => {
    const b = block(read('style.css'))
    expect([decl(b, '--radius-card'), decl(b, '--radius-modal'), decl(b, '--radius-control')]).toEqual(['8px', '8px', '8px'])
    expect(decl(b, '--shadow-card')).toContain('0 8px 28px')
    expect(decl(b, '--shadow-active')).toContain('#bb9af7')
  })
  it('правила nightfall (тень карточек и подсветка активных пунктов) только под html.theme-nightfall', () => {
    for (const f of files) {
      const region = read(f).match(REGION)![0]
      const lines = region.split('\n').filter((l) => /^html\.theme-nightfall .*\{ box-shadow: var\(--shadow-(card|active)\); \}/.test(l))
      expect(lines.length, f).toBe(2)
      for (const l of lines) for (const sel of l.split('{')[0].split(',')) expect(sel.trim(), f).toMatch(/^html\.theme-nightfall /)
      const active = lines.find((l) => l.includes('aria-pressed'))!
      for (const a of ['aria-pressed="true"', 'aria-selected="true"', 'aria-checked="true"', 'aria-current="page"']) expect(active, f).toContain(a)
    }
  })
  it('цвета — «близнец» tokyonight, но граница заметнее (контраст к карточке выше), чтобы поля и кнопки читались', () => {
    const css = read('web-dashboard/src/style.css')
    const get = (key: string, name: string) => css.match(new RegExp('html\\.theme-' + key + ' \\{[^}]*--' + name + ':\\s*(#[0-9a-fA-F]{6})'))![1].toLowerCase()
    expect(get('nightfall', 'bg')).toBe(get('tokyonight', 'bg'))
    expect(get('nightfall', 'accent')).toBe(get('tokyonight', 'accent'))
    expect(get('nightfall', 'border')).not.toBe(get('tokyonight', 'border'))
  })
})

// BACKLOG 50.1д: пятая «большая тема» Velvet Dusk — без свечения и теней, крупные скругления 12–16px, плавные пружинные анимации.
describe('большая тема velvet: характер', () => {
  const block = (css: string): string => {
    const m = css.match(/\/\* большая тема: velvet \*\/\nhtml\.theme-velvet \{[^}]*\}/)
    expect(m, 'нет блока характера').not.toBeNull()
    return m![0]
  }
  for (const d of pilots) {
    it(d + ': крупные скругления, без теней и свечения, пружинная анимация', () => {
      const css = read(d + '/src/style.css')
      const b = block(css)
      expect([decl(b, '--radius-md'), decl(b, '--radius-lg'), decl(b, '--radius-xl'), decl(b, '--radius-2xl')]).toEqual(['10px', '12px', '16px', '20px'])
      expect(decl(b, '--shadow-card')).toBe('none')
      expect(decl(b, '--shadow-active')).toBe('none')
      expect(decl(b, '--default-transition-timing-function')).toBe('cubic-bezier(0.34, 1.56, 0.64, 1)')
      expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*html\.theme-velvet \{\s*--default-transition-duration: 0s;/)
    })
  }
  it('корень: 16/16/12 и без теней', () => {
    const b = block(read('style.css'))
    expect([decl(b, '--radius-card'), decl(b, '--radius-modal'), decl(b, '--radius-control')]).toEqual(['16px', '16px', '12px'])
    expect([decl(b, '--shadow-card'), decl(b, '--shadow-active')]).toEqual(['none', 'none'])
  })
  it('у velvet НЕТ правил оформления (ни свечения, ни теней, ни текстур): только токены', () => {
    for (const f of files) {
      const region = read(f).match(REGION)![0]
      expect(region.split('\n').filter((l) => l.startsWith('html.theme-velvet ') && l.includes('{ ')), f).toEqual([])
    }
  })
  it('персиковый акцент светлый: тёмная галочка у velvet в автосписке, текст на акценте тёмный', () => {
    const css = read('web-dashboard/src/style.css')
    const m = /((?:html\.theme-\w+ input\[type='checkbox'\]:checked,?\s*)+)\{[^}]*background-image/.exec(css)
    expect([...m![1].matchAll(/html\.theme-(\w+) input/g)].map((x) => x[1])).toContain('velvet')
  })
})

// BACKLOG 50.1ж: шестая «большая тема» Nord Frost — плоско (без теней), малые скругления, едва заметная матовая зернистость, гладкие анимации.
describe('большая тема frost: характер', () => {
  const block = (css: string): string => {
    const m = css.match(/\/\* большая тема: frost \*\/\nhtml\.theme-frost \{[^}]*\}/)
    expect(m, 'нет блока характера').not.toBeNull()
    return m![0]
  }
  for (const d of pilots) {
    it(d + ': малые скругления, без теней, зернистость data-URI, гладкая анимация', () => {
      const css = read(d + '/src/style.css')
      const b = block(css)
      expect([decl(b, '--radius-md'), decl(b, '--radius-lg'), decl(b, '--radius-xl'), decl(b, '--radius-2xl')]).toEqual(['4px', '6px', '8px', '10px'])
      expect([decl(b, '--shadow-card'), decl(b, '--shadow-active')]).toEqual(['none', 'none'])
      expect(decl(b, '--bg-pattern')).toContain('data:image/svg+xml')
      expect(decl(b, '--bg-pattern-size')).toBe('120px 120px')
      expect(decl(b, '--default-transition-timing-function')).toBe('cubic-bezier(0.4, 0, 0.2, 1)')
      expect(css).toMatch(/@media \(prefers-contrast: more\) \{\s*html\.theme-frost \{\s*--bg-pattern: none;/)
      expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*html\.theme-frost \{\s*--default-transition-duration: 0s;/)
    })
  }
  it('корень: 8/8/6, без теней, зернистость', () => {
    const b = block(read('style.css'))
    expect([decl(b, '--radius-card'), decl(b, '--radius-modal'), decl(b, '--radius-control')]).toEqual(['8px', '8px', '6px'])
    expect(decl(b, '--bg-pattern')).toContain('data:image/svg+xml')
  })
  it('тайл зернистости крошечный (< 2 КБ) и без «;» внутри — токен не ломается при разборе', () => {
    const b = block(read('web-dashboard/src/style.css'))
    const v = decl(b, '--bg-pattern')!
    expect(v.length).toBeLessThan(2048)
    expect(v).not.toContain(';')
  })
  it('правило одно: зернистость на body, только под html.theme-frost', () => {
    for (const f of files) {
      const region = read(f).match(REGION)![0]
      const lines = region.split('\n').filter((l) => l.startsWith('html.theme-frost ') && l.includes('{ '))
      expect(lines, f).toEqual(['html.theme-frost body { background-image: var(--bg-pattern); background-size: var(--bg-pattern-size); }'])
    }
  })
  it('красный алерта осветлён: контраст к карточке ≥ 3:1 (исходный Nord #bf616a давал 2.46:1), граница заметнее, чем у nord', () => {
    const css = read('web-dashboard/src/style.css')
    const get = (key: string, name: string) => css.match(new RegExp('html\\.theme-' + key + ' \\{[^}]*--' + name + ':\\s*(#[0-9a-fA-F]{6})'))![1].toLowerCase()
    const lum = (h: string) => {
      const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4))
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
    }
    const cr = (a: string, b: string) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05)
    expect(cr(get('frost', 'danger'), get('frost', 'bg-card'))).toBeGreaterThanOrEqual(3)
    expect(cr(get('frost', 'border'), get('frost', 'bg-card'))).toBeGreaterThan(cr(get('nord', 'border'), get('nord', 'bg-card')))
  })
})

// BACKLOG 57.7 (файл 1, тема 1): первая СВЕТЛАЯ большая тема Paper Alpine / Nord Light — плоско, без теней, малые скругления, гладкие анимации; правил оформления нет.
describe('большая тема alpine (светлая): характер', () => {
  const block = (css: string): string => {
    const m = css.match(/\/\* большая тема: alpine \*\/\nhtml\.theme-alpine \{[^}]*\}/)
    expect(m, 'нет блока характера').not.toBeNull()
    return m![0]
  }
  for (const d of pilots) {
    it(d + ': малые скругления, без теней, гладкая анимация', () => {
      const css = read(d + '/src/style.css')
      const b = block(css)
      expect([decl(b, '--radius-md'), decl(b, '--radius-lg'), decl(b, '--radius-xl'), decl(b, '--radius-2xl')]).toEqual(['4px', '6px', '8px', '10px'])
      expect([decl(b, '--shadow-card'), decl(b, '--shadow-active')]).toEqual(['none', 'none'])
      expect(decl(b, '--default-transition-timing-function')).toBe('cubic-bezier(0.4, 0, 0.2, 1)')
      expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*html\.theme-alpine \{\s*--default-transition-duration: 0s;/)
    })
  }
  it('корень: 8/8/6 и без теней', () => {
    const b = block(read('style.css'))
    expect([decl(b, '--radius-card'), decl(b, '--radius-modal'), decl(b, '--radius-control')]).toEqual(['8px', '8px', '6px'])
    expect([decl(b, '--shadow-card'), decl(b, '--shadow-active')]).toEqual(['none', 'none'])
  })
  it('правил оформления у alpine нет и под «Простое оформление» блока нет (нечего отключать)', () => {
    for (const f of files) {
      const region = read(f).match(REGION)![0]
      expect(region.split('\n').filter((l) => l.startsWith('html.theme-alpine ') && l.includes('{ ')), f).toEqual([])
      expect(region, f).not.toContain("html[data-simple='on'].theme-alpine")
    }
  })
  it('светлая: цвета (молочный фон, белые карточки, холодный акцент) и тёмный текст; белая галочка читается, в списке тёмной галочки темы нет', () => {
    const css = read('web-dashboard/src/style.css')
    const get = (name: string) => css.match(new RegExp('html\\.theme-alpine \\{[^}]*--' + name + ':\\s*(#[0-9a-fA-F]{6})'))![1].toLowerCase()
    expect([get('bg'), get('bg-card'), get('accent')]).toEqual(['#f8f9fc', '#ffffff', '#4c6f99'])
    const m = /((?:html\.theme-\w+ input\[type='checkbox'\]:checked,?\s*)+)\{[^}]*background-image/.exec(css)
    expect([...m![1].matchAll(/html\.theme-(\w+) input/g)].map((x) => x[1])).not.toContain('alpine')
  })
})

// BACKLOG 57.7 (файл 1, тема 2): светлая Matcha Latte — крупные скругления, «пушистые» тёплые тени карточек, гладкие анимации; «Простое оформление» тень убирает.
describe('большая тема matcha (светлая): характер', () => {
  const block = (css: string): string => {
    const m = css.match(/\/\* большая тема: matcha \*\/\nhtml\.theme-matcha \{[^}]*\}/)
    expect(m, 'нет блока характера').not.toBeNull()
    return m![0]
  }
  for (const d of pilots) {
    it(d + ': крупные скругления, рассеянная тёплая тень, гладкая анимация, отключение тени', () => {
      const css = read(d + '/src/style.css')
      const b = block(css)
      expect([decl(b, '--radius-md'), decl(b, '--radius-lg'), decl(b, '--radius-xl'), decl(b, '--radius-2xl')]).toEqual(['10px', '12px', '16px', '20px'])
      expect(decl(b, '--shadow-card')).toBe('0 8px 28px rgba(110, 96, 60, 0.14)')
      expect(decl(b, '--default-transition-timing-function')).toBe('cubic-bezier(0.25, 0.8, 0.25, 1)')
      expect(css).toMatch(/html\[data-simple='on'\]\.theme-matcha \{\s*--shadow-card: none;/)
      expect(css).toMatch(/@media \(prefers-contrast: more\) \{\s*html\.theme-matcha \{\s*--shadow-card: none;/)
      expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*html\.theme-matcha \{\s*--default-transition-duration: 0s;/)
    })
  }
  it('корень: 16/16/12 и та же тень', () => {
    const b = block(read('style.css'))
    expect([decl(b, '--radius-card'), decl(b, '--radius-modal'), decl(b, '--radius-control')]).toEqual(['16px', '16px', '12px'])
    expect(decl(b, '--shadow-card')).toBe('0 8px 28px rgba(110, 96, 60, 0.14)')
  })
  it('одно правило под html.theme-matcha: тень карточек (.card, .modal, инлайновый var(--bg-card))', () => {
    for (const f of files) {
      const region = read(f).match(REGION)![0]
      expect(region.split('\n').filter((l) => l.startsWith('html.theme-matcha ') && l.includes('{ ')), f).toEqual([
        'html.theme-matcha .card, html.theme-matcha .modal, html.theme-matcha [style*="var(--bg-card)"] { box-shadow: var(--shadow-card); }',
      ])
    }
  })
  it('светлая тёплая палитра: кремовый фон, тёплые белые карточки, чайно-зелёный акцент; белая галочка читается (в списке тёмной нет)', () => {
    const css = read('web-dashboard/src/style.css')
    const get = (name: string) => css.match(new RegExp('html\\.theme-matcha \\{[^}]*--' + name + ':\\s*(#[0-9a-fA-F]{6})'))![1].toLowerCase()
    expect([get('bg'), get('bg-card'), get('accent')]).toEqual(['#f4f4f0', '#fffefb', '#4f7a5c'])
    const m = /((?:html\.theme-\w+ input\[type='checkbox'\]:checked,?\s*)+)\{[^}]*background-image/.exec(css)
    expect([...m![1].matchAll(/html\.theme-(\w+) input/g)].map((x) => x[1])).not.toContain('matcha')
  })
})

// BACKLOG 57.7 (файл 1, тема 3): светлая Cyberpunk Day — жёсткие тени со смещением, острые углы 4px, моноширинные метки и кнопки, сетка точек, Snappy.
describe('большая тема cyberday (светлая): характер', () => {
  const block = (css: string): string => {
    const m = css.match(/\/\* большая тема: cyberday \*\/\nhtml\.theme-cyberday \{[^}]*\}/)
    expect(m, 'нет блока характера').not.toBeNull()
    return m![0]
  }
  for (const d of pilots) {
    it(d + ': жёсткие тени без размытия, острые углы, моноширинный шрифт, сетка, Snappy', () => {
      const css = read(d + '/src/style.css')
      const b = block(css)
      expect([decl(b, '--radius-md'), decl(b, '--radius-lg'), decl(b, '--radius-xl'), decl(b, '--radius-2xl')]).toEqual(['3px', '4px', '4px', '6px'])
      expect(decl(b, '--shadow-card')).toBe('3px 3px 0 #111111')
      expect(decl(b, '--shadow-active')).toBe('2px 2px 0 #111111')
      expect(decl(b, '--font-heading')).toContain('monospace')
      expect(decl(b, '--bg-pattern')).toContain('radial-gradient')
      expect(decl(b, '--default-transition-timing-function')).toBe('cubic-bezier(0, 1, 0, 1)')
      expect(css).toMatch(/html\[data-simple='on'\]\.theme-cyberday \{\s*--bg-pattern: none;/)
      expect(css).toMatch(/@media \(prefers-contrast: more\) \{\s*html\.theme-cyberday \{\s*--bg-pattern: none;/)
      expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*html\.theme-cyberday \{\s*--default-transition-duration: 0s;/)
    })
  }
  it('корень: углы 4px, те же жёсткие тени и шрифт', () => {
    const b = block(read('style.css'))
    expect([decl(b, '--radius-card'), decl(b, '--radius-modal'), decl(b, '--radius-control')]).toEqual(['4px', '4px', '4px'])
    expect(decl(b, '--shadow-card')).toBe('3px 3px 0 #111111')
    expect(decl(b, '--font-heading')).toContain('monospace')
  })
  it('тень у cyberday — настоящая «жёсткая»: смещение и НОЛЬ размытия (не расплывчатая)', () => {
    const b = block(read('web-dashboard/src/style.css'))
    for (const name of ['--shadow-card', '--shadow-active']) expect(decl(b, name), name).toMatch(/^-?\d+px -?\d+px 0 #[0-9a-f]{6}$/)
  })
  it('четыре правила только под html.theme-cyberday: сетка, тень карточек, тень кнопок с заливкой, моноширинный шрифт заголовков/меток/кнопок', () => {
    for (const f of files) {
      const region = read(f).match(REGION)![0]
      const lines = region.split('\n').filter((l) => l.startsWith('html.theme-cyberday ') && l.includes('{ '))
      expect(lines.length, f).toBe(4)
      for (const l of lines) for (const sel of l.split('{')[0].split(',')) expect(sel.trim(), f).toMatch(/^html\.theme-cyberday /)
      const font = lines.find((l) => l.includes('font-family'))!
      for (const el of ['h1', 'h2', 'h3', 'h4', 'label', 'button']) expect(font, f).toContain('html.theme-cyberday ' + el)
    }
  })
  it('светлая: серебристый фон, белые карточки, тёмная рамка, ультрамарин; белая галочка читается', () => {
    const css = read('web-dashboard/src/style.css')
    const get = (name: string) => css.match(new RegExp('html\\.theme-cyberday \\{[^}]*--' + name + ':\\s*(#[0-9a-fA-F]{6})'))![1].toLowerCase()
    expect([get('bg'), get('bg-card'), get('border'), get('accent')]).toEqual(['#eef0f4', '#ffffff', '#2b2f3a', '#2563eb'])
    const m = /((?:html\.theme-\w+ input\[type='checkbox'\]:checked,?\s*)+)\{[^}]*background-image/.exec(css)
    expect([...m![1].matchAll(/html\.theme-(\w+) input/g)].map((x) => x[1])).not.toContain('cyberday')
  })
})

// BACKLOG 57.7 (файл 1, тема 4): светлая Vintage Paper — пунктирные границы, КОНТУРНЫЕ кнопки без заливки, заголовки с засечками, острые углы, плоско.
describe('большая тема vintage (светлая): характер', () => {
  const block = (css: string): string => {
    const m = css.match(/\/\* большая тема: vintage \*\/\nhtml\.theme-vintage \{[^}]*\}/)
    expect(m, 'нет блока характера').not.toBeNull()
    return m![0]
  }
  for (const d of pilots) {
    it(d + ': острые углы, плоско, пунктир, шрифт с засечками, гладкая анимация', () => {
      const css = read(d + '/src/style.css')
      const b = block(css)
      expect([decl(b, '--radius-md'), decl(b, '--radius-lg'), decl(b, '--radius-xl'), decl(b, '--radius-2xl')]).toEqual(['2px', '2px', '3px', '4px'])
      expect([decl(b, '--shadow-card'), decl(b, '--shadow-active')]).toEqual(['none', 'none'])
      expect(decl(b, '--border-style')).toBe('dashed')
      expect(decl(b, '--font-heading')).toContain('serif')
      expect(decl(b, '--font-heading')).not.toContain('monospace')
      expect(decl(b, '--default-transition-timing-function')).toBe('cubic-bezier(0.4, 0, 0.2, 1)')
      expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*html\.theme-vintage \{\s*--default-transition-duration: 0s;/)
    })
  }
  it('корень: углы 3/3/2, пунктир и шрифт с засечками', () => {
    const b = block(read('style.css'))
    expect([decl(b, '--radius-card'), decl(b, '--radius-modal'), decl(b, '--radius-control')]).toEqual(['3px', '3px', '2px'])
    expect(decl(b, '--border-style')).toBe('dashed')
    expect(decl(b, '--font-heading')).toContain('serif')
  })
  it('три правила только под html.theme-vintage: пунктир карточек, шрифт заголовков, контурные кнопки (кольцо внутри, без смены размеров)', () => {
    for (const f of files) {
      const region = read(f).match(REGION)![0]
      const lines = region.split('\n').filter((l) => l.startsWith('html.theme-vintage ') && l.includes('{ '))
      expect(lines.length, f).toBe(3)
      for (const l of lines) for (const sel of l.split('{')[0].split(',')) expect(sel.trim(), f).toMatch(/^html\.theme-vintage /)
      const btn = lines.find((l) => l.includes('button'))!
      expect(btn, f).toContain('background: transparent')
      expect(btn, f).toContain('box-shadow: inset 0 0 0 1px var(--accent)')
      expect(btn, f).not.toMatch(/\bborder:/) // не border: — иначе кнопки изменят размер
      expect(btn, f).toContain(':not(.secondary):not(.danger):not(:disabled)')
      // 61.2: кнопка-заголовок «Какие достижения тут можно получить» лежит внутри рамки карточки — кольцо поверх рамки давало двойной рваный край
      expect(btn, f).toContain(':not(.gh-secach-head)')
    }
  })
  it('под «Простое оформление» и prefers-contrast блока нет: эффектов у темы нет, нечего отключать', () => {
    for (const f of files) {
      const region = read(f).match(REGION)![0]
      expect(region, f).not.toContain("html[data-simple='on'].theme-vintage")
      expect(region, f).not.toMatch(/prefers-contrast: more\) \{\s*html\.theme-vintage/)
    }
  })
  it('светлая: слоновая кость, тёплые плотные «страницы», чернильно-синий акцент, терракотовый для тревог; галочка белая', () => {
    const css = read('web-dashboard/src/style.css')
    const get = (name: string) => css.match(new RegExp('html\\.theme-vintage \\{[^}]*--' + name + ':\\s*(#[0-9a-fA-F]{6})'))![1].toLowerCase()
    expect([get('bg'), get('bg-card'), get('accent'), get('danger')]).toEqual(['#fbfbfa', '#ecebe4', '#1e293b', '#c2410c'])
    const m = /((?:html\.theme-\w+ input\[type='checkbox'\]:checked,?\s*)+)\{[^}]*background-image/.exec(css)
    expect([...m![1].matchAll(/html\.theme-(\w+) input/g)].map((x) => x[1])).not.toContain('vintage')
  })
})

// BACKLOG 57.7 (файл 1, тема 5): светлая Executive Glass — стеклянные полупрозрачные карточки с размытием; правило стекла под @supports, отключается тремя способами.
describe('большая тема glass (светлая): характер', () => {
  const block = (css: string): string => {
    const m = css.match(/\/\* большая тема: glass \*\/\nhtml\.theme-glass \{[^}]*\}/)
    expect(m, 'нет блока характера').not.toBeNull()
    return m![0]
  }
  for (const d of pilots) {
    it(d + ': размытие 12px, прозрачность 80%, световые пятна, тень средней жёсткости, скругления', () => {
      const css = read(d + '/src/style.css')
      const b = block(css)
      expect(decl(b, '--blur-glass')).toBe('blur(12px)')
      expect(decl(b, '--glass-alpha')).toBe('80%')
      expect(decl(b, '--bg-pattern')).toContain('radial-gradient')
      expect(decl(b, '--bg-pattern-size')).toBe('auto')
      expect(decl(b, '--shadow-card')).toBe('0 4px 16px rgba(31, 41, 51, 0.1)')
      expect([decl(b, '--radius-md'), decl(b, '--radius-lg'), decl(b, '--radius-xl'), decl(b, '--radius-2xl')]).toEqual(['8px', '10px', '14px', '18px'])
      expect(css).toMatch(/@media \(prefers-reduced-transparency: reduce\) \{\s*html\.theme-glass \{\s*--blur-glass: none;\s*--glass-alpha: 100%;/)
      expect(css).toMatch(/@media \(prefers-contrast: more\) \{\s*html\.theme-glass \{\s*--blur-glass: none;/)
    })
  }
  it('корень: те же блюр, прозрачность и пятна; скругления 14/14/10', () => {
    const b = block(read('style.css'))
    expect(decl(b, '--blur-glass')).toBe('blur(12px)')
    expect(decl(b, '--glass-alpha')).toBe('80%')
    expect([decl(b, '--radius-card'), decl(b, '--radius-modal'), decl(b, '--radius-control')]).toEqual(['14px', '14px', '10px'])
  })
  it('правило стекла стоит ПОД @supports (без поддержки — обычные непрозрачные карточки), с -webkit-, color-mix и запасным 100%', () => {
    for (const f of files) {
      const region = read(f).match(REGION)![0]
      const m = region.match(/@supports \(\(backdrop-filter: blur\(1px\)\) or \(-webkit-backdrop-filter: blur\(1px\)\)\) \{\n  (html\.theme-glass [^\n]*)\n\}/)
      expect(m, f).not.toBeNull()
      const rule = m![1]
      for (const sel of ['.card', '.modal', '[style*="var(--bg-card)"]']) expect(rule, f).toContain('html.theme-glass ' + sel)
      expect(rule, f).toContain('color-mix(in srgb, var(--bg-card) var(--glass-alpha, 100%), transparent) !important')
      expect(rule, f).toContain('backdrop-filter: var(--blur-glass)')
      // ручной `-webkit-` НЕЛЬЗЯ: сборка (Tailwind/lightningcss) сама добавляет префикс, а при ручном оставляла ТОЛЬКО префиксный вариант —
      // Chromium его не понимает, и размытия не было (нашли в Chromium при проверке v5.2x)
      expect(rule, f).not.toContain('-webkit-backdrop-filter')
      // вне @supports никакого backdrop-filter у glass нет
      const outside = region.replace(m![0], '')
      expect(outside.split('\n').filter((l) => l.startsWith('html.theme-glass ') && l.includes('backdrop-filter')), f).toEqual([])
    }
  })
  it('три способа отключить стекло дают одно и то же: «Простое оформление», высокий контраст, «уменьшить прозрачность» — размытие none и прозрачность 100%', () => {
    for (const f of files) {
      const region = read(f).match(REGION)![0]
      const simple = region.match(/html\[data-simple='on'\]\.theme-glass \{([^}]*)\}/)![1]
      const contrast = region.match(/prefers-contrast: more\) \{\s*html\.theme-glass \{([^}]*)\}/)![1]
      const transp = region.match(/prefers-reduced-transparency: reduce\) \{\s*html\.theme-glass \{([^}]*)\}/)![1]
      for (const blk of [simple, contrast, transp]) {
        expect(blk, f).toContain('--blur-glass: none;')
        expect(blk, f).toContain('--glass-alpha: 100%;')
      }
    }
  })
  it('микро-подъём кнопок при наведении использует длительность темы (при «уменьшить движение» = 0)', () => {
    for (const f of files) {
      const region = read(f).match(REGION)![0]
      expect(region, f).toContain('html.theme-glass button:not(:disabled):hover { transform: translateY(-1px); }')
      expect(region, f).toContain('transition: transform var(--default-transition-duration, 0.2s) ease')
    }
  })
  it('светлая: светло-серый фон, белая карточка (под стекло — цвет задан HEX для контраста), индиго-акцент и графитовый текст; белая галочка читается', () => {
    const css = read('web-dashboard/src/style.css')
    const get = (name: string) => css.match(new RegExp('html\\.theme-glass \\{[^}]*--' + name + ':\\s*(#[0-9a-fA-F]{6})'))![1].toLowerCase()
    expect([get('bg'), get('bg-card'), get('accent'), get('text')]).toEqual(['#f1f3f5', '#ffffff', '#4f46e5', '#1f2933'])
    const m = /((?:html\.theme-\w+ input\[type='checkbox'\]:checked,?\s*)+)\{[^}]*background-image/.exec(css)
    expect([...m![1].matchAll(/html\.theme-(\w+) input/g)].map((x) => x[1])).not.toContain('glass')
  })
})

// Страж по СОБРАННОМУ CSS: в бандлах пилотов правило стекла обязано содержать и обычный `backdrop-filter`, и `-webkit-` (иначе в Chrome/Firefox нет размытия).
describe('большая тема glass: собранный CSS', () => {
  for (const dir of ['dashboard', 'goals', 'workouts', 'shop', 'customization']) {
    it(dir + ': в бандле у стекла есть backdrop-filter и -webkit-backdrop-filter', () => {
      const assets = readdirSync('../' + dir + '/assets').filter((n: string) => n.endsWith('.css'))
      expect(assets.length).toBeGreaterThan(0)
      const css = assets.map((n: string) => read(dir + '/assets/' + n)).join('\n')
      const m = css.match(/html\.theme-glass \.card[^{]*\{[^}]*-webkit-backdrop-filter:var\(--blur-glass\)[^}]*\}/)
      expect(m, 'нет правила стекла').not.toBeNull()
      expect(m![0]).toMatch(/[{;]backdrop-filter:var\(--blur-glass\)/)
    })
  }
})

// BACKLOG 57.7 (файл 2, тема 1): тематическая светлая Summer Meadow — округлые формы 12px, лёгкие зеленоватые тени, солнечное пятно в углу фона, гладкие анимации.
describe('большая тема meadow (светлая тематическая): характер', () => {
  const block = (css: string): string => {
    const m = css.match(/\/\* большая тема: meadow \*\/\nhtml\.theme-meadow \{[^}]*\}/)
    expect(m, 'нет блока характера').not.toBeNull()
    return m![0]
  }
  for (const d of pilots) {
    it(d + ': округлые формы, лёгкая зеленоватая тень, солнечное пятно, гладкая анимация, отключения', () => {
      const css = read(d + '/src/style.css')
      const b = block(css)
      expect([decl(b, '--radius-md'), decl(b, '--radius-lg'), decl(b, '--radius-xl'), decl(b, '--radius-2xl')]).toEqual(['8px', '12px', '12px', '16px'])
      expect(decl(b, '--shadow-card')).toBe('0 2px 10px rgba(46, 125, 50, 0.1)')
      expect(decl(b, '--bg-pattern')).toContain('rgba(251, 192, 45')
      expect(decl(b, '--bg-pattern-size')).toBe('auto')
      expect(decl(b, '--default-transition-timing-function')).toBe('cubic-bezier(0.25, 0.8, 0.25, 1)')
      expect(css).toMatch(/html\[data-simple='on'\]\.theme-meadow \{\s*--bg-pattern: none;\s*--shadow-card: none;/)
      expect(css).toMatch(/@media \(prefers-contrast: more\) \{\s*html\.theme-meadow \{\s*--bg-pattern: none;\s*--shadow-card: none;/)
      expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*html\.theme-meadow \{\s*--default-transition-duration: 0s;/)
    })
  }
  it('корень: 12/12/12 и те же тень и пятно', () => {
    const b = block(read('style.css'))
    expect([decl(b, '--radius-card'), decl(b, '--radius-modal'), decl(b, '--radius-control')]).toEqual(['12px', '12px', '12px'])
    expect(decl(b, '--shadow-card')).toBe('0 2px 10px rgba(46, 125, 50, 0.1)')
  })
  it('два правила только под html.theme-meadow: пятно на body и тень карточек', () => {
    for (const f of files) {
      const region = read(f).match(REGION)![0]
      const lines = region.split('\n').filter((l) => l.startsWith('html.theme-meadow ') && l.includes('{ '))
      expect(lines.length, f).toBe(2)
      for (const l of lines) for (const sel of l.split('{')[0].split(',')) expect(sel.trim(), f).toMatch(/^html\.theme-meadow /)
    }
  })
  it('светлая зеленоватая палитра: молочный фон, белые карточки, травяной акцент; белый текст на акценте ≥ 4.5:1, галочка белая', () => {
    const css = read('web-dashboard/src/style.css')
    const get = (name: string) => css.match(new RegExp('html\\.theme-meadow \\{[^}]*--' + name + ':\\s*(#[0-9a-fA-F]{6})'))![1].toLowerCase()
    expect([get('bg'), get('bg-card'), get('accent')]).toEqual(['#f2f7f4', '#ffffff', '#2e7d32'])
    const m = /((?:html\.theme-\w+ input\[type='checkbox'\]:checked,?\s*)+)\{[^}]*background-image/.exec(css)
    expect([...m![1].matchAll(/html\.theme-(\w+) input/g)].map((x) => x[1])).not.toContain('meadow')
  })
})
