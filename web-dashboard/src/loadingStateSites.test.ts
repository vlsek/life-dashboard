// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в dateTimeAllPilots.test.ts)
import { readFileSync } from 'node:fs'
// @ts-ignore — то же
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
declare const __dirname: string // есть в vitest (node); типов node в проекте нет

// BACKLOG 74.3/73.5 срез 3: «пока ничего нет» нельзя показывать, пока данные грузятся. Страж по ИСХОДНИКАМ пилотов:
// у каждого списка с «пустым» <p> есть флаг loaded в composable и строка «Загрузка…» (role=status) прямо перед пустым состоянием.
// Новый список с пустым состоянием — добавить сюда и в scripts/apply_loading_state.py (или сделать так же вручную, как магазин и сообщество).
const ROOT = resolve(__dirname, '..', '..')
const read = (f: string): string => readFileSync(resolve(ROOT, f), 'utf-8')

const COMPOSABLES = ['web-goals/src/lib/useGoals.ts', 'web-challenges/src/lib/useChallenges.ts', 'web-milestones/src/lib/useMilestones.ts', 'web-skills/src/lib/useSkills.ts', 'web-skills/src/lib/useBooks.ts']
const EMPTIES: Record<string, string[]> = {
  'web-goals/src/App.vue': ['active.length === 0', 'done.length === 0'],
  'web-challenges/src/App.vue': ['active.length === 0', 'completed.length === 0'],
  'web-milestones/src/App.vue': ['active.length === 0', 'done.length === 0'],
  'web-skills/src/App.vue': ['active.length === 0', 'mastered.length === 0', 'activeBooks.length === 0', 'doneBooks.length === 0'],
}
const HAND_MADE = [
  { app: 'web-shop/src/App.vue', empty: 'v-else-if="items.length === 0"', loading: 'data-testid="shop-loading"' },
  { app: 'web-community/src/App.vue', empty: 'v-else-if="visibleLeaderboard.length === 0"', loading: 'data-testid="comm-loading"' },
  { app: 'web-community/src/App.vue', empty: 'v-else-if="visibleToday.length === 0"', loading: 'data-testid="comm-today-loading"' },
]

describe('«Загрузка…» вместо ложной пустоты: исходники пилотов', () => {
  it('composable: флаг loaded создаётся, выставляется в finally и отдаётся наружу', () => {
    for (const f of COMPOSABLES) {
      const s = read(f)
      expect(s, f).toContain('const loaded = ref(false)')
      expect(s, f).toMatch(/finally \{\s*loaded\.value = true\s*\}/)
      expect(s, f).toMatch(/return \{[^}]*\bloaded\b/s)
    }
    for (const f of ['web-shop/src/lib/useShop.ts', 'web-community/src/lib/useCommunity.ts']) {
      const s = read(f)
      expect(s, f).toContain('const loaded = ref(false)')
      expect(s, f).toMatch(/finally \{\s*loaded\.value = true\s*\}/)
    }
  })

  it('App: перед каждым пустым состоянием — строка загрузки с role="status"', () => {
    for (const [f, conds] of Object.entries(EMPTIES)) {
      const s = read(f)
      for (const c of conds) {
        const m = new RegExp(`<p v-if="!\\w+" class="dim" role="status" data-testid="loading-[\\w]+">\\{\\{ t\\('load_loading'\\) \\}\\}</p>\\s*<p v-else-if="${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`).exec(s)
        expect(m, `${f}: ${c}`).not.toBeNull()
      }
    }
    for (const { app, empty, loading } of HAND_MADE) {
      const s = read(app)
      const i = s.indexOf(empty)
      expect(i, `${app}: ${empty}`).toBeGreaterThan(0)
      expect(s.slice(Math.max(0, i - 260), i), `${app}: ${empty}`).toContain(loading)
    }
  })

  it('ключ load_loading есть на двух языках в каждом пилоте', () => {
    for (const p of ['web-goals', 'web-challenges', 'web-milestones', 'web-skills', 'web-shop', 'web-community']) {
      expect((read(`${p}/src/lib/i18n.ts`).match(/load_loading:/g) || []).length, p).toBe(2)
    }
  })
})
