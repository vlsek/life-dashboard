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
      const rules = region.split('\n').filter((l) => /\{ border-style: var\(--border-style\); \}|\{ font-family: var\(--font-heading\)/.test(l))
      expect(rules.length, f).toBeGreaterThanOrEqual(2)
      for (const l of rules) for (const sel of l.split('{')[0].split(',')) expect(sel.trim(), f).toMatch(/^html\.theme-emerald /)
    }
  })
  it('при prefers-reduced-motion анимации темы мгновенные (только у Tailwind-страниц)', () => {
    for (const d of pilots) expect(read(d + '/src/style.css')).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*html\.theme-emerald \{\s*--default-transition-duration: 0s;/)
  })
  it('блоки характера есть только у больших тем (emerald, moonlight) — остальные темы не переопределены', () => {
    for (const f of files) {
      const region = read(f).match(REGION)![0]
      expect([...region.matchAll(/\/\* большая тема: (\w+) \*\//g)].map((m) => m[1]), f).toEqual(['emerald', 'moonlight'])
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
