import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RecordsModal from './RecordsModal.vue'
import type { Exercise } from '../lib/types'

const ex = (g: string[] | null) => ({ id: 'e1', user_id: 'u', name: g && g.length ? 'Жим лёжа' : 'Qwerty xyz', category: null, tracks_weight: true, value_label: null, unit: 'кг', suggested_scheme: null, muscle_groups: g, created_at: '2026-01-01' } as unknown as Exercise)
const open = (g: string[] | null) => mount(RecordsModal, { props: { exercise: ex(g), entries: [], unit: 'кг' } })

describe('RecordsModal: карта мышц на вкладке «О нём» (69.12)', () => {
  it('закрашены мышцы упражнения', async () => {
    const w = open(['chest', 'triceps'])
    await w.find('[data-testid="rec-tab-about"]').trigger('click')
    const done = w.findAll('[data-testid="about-body"] [data-state="done"]')
    expect(done.length).toBeGreaterThan(0)
    expect(new Set(done.map((n) => n.attributes('data-muscle')))).toEqual(new Set(['chest', 'triceps']))
  })
  it('когда мышц нет — карты нет, есть пояснение', async () => {
    const w = open([])
    await w.find('[data-testid="rec-tab-about"]').trigger('click')
    expect(w.find('[data-testid="about-body"]').exists()).toBe(false)
  })
})
