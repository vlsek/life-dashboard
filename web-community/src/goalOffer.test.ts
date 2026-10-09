import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// Миграция 063 (BACKLOG 41 «8:29», срез 2b): форма «Предложить другу цель / задачу» в окне профиля друга.
const h = vi.hoisted(() => ({
  calls: [] as { fn: string; args: Record<string, unknown> }[],
  error: null as null | { code?: string; message?: string },
  summaryError: { code: 'PGRST202', message: 'Could not find the function' } as null | { code?: string; message?: string },
}))
vi.mock('./lib/supabase', () => ({
  sb: {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      h.calls.push({ fn, args })
      if (fn === 'send_goal_invite') return { data: null, error: h.error }
      return { data: null, error: h.summaryError } // get_friend_summary: «нет функции» — окно как раньше
    },
  },
}))

import OfferGoalForm from './components/OfferGoalForm.vue'
import PublicProfileModal from './components/PublicProfileModal.vue'
import { classifyOfferError, offerArgs, validateOffer, type OfferInput } from './lib/goalOffer'

const input = (o: Partial<OfferInput> = {}): OfferInput => ({ kind: 'goal', name: '  Бегать  по утрам ', stages: 3, difficulty: 'hard', deadline: '2026-11-01', planDate: '2026-10-12', ...o })

beforeEach(() => {
  localStorage.setItem('site_lang', 'ru')
  h.calls = []
  h.error = null
})

describe('goalOffer: проверка и аргументы', () => {
  it('название обязательно и до 120; у задачи нужна дата', () => {
    expect(validateOffer(input({ name: '   ' }))).toBe('name')
    expect(validateOffer(input({ name: 'x'.repeat(121) }))).toBe('name')
    expect(validateOffer(input({ kind: 'task', planDate: '' }))).toBe('date')
    expect(validateOffer(input())).toBe(null)
    expect(validateOffer(input({ kind: 'task' }))).toBe(null)
  })
  it('цель: этапы/сложность/срок уходят, даты плана нет; название чистится', () => {
    expect(offerArgs('f1', input())).toEqual({ friend: 'f1', p_kind: 'goal', p_name: 'Бегать по утрам', p_stages: 3, p_difficulty: 'hard', p_deadline: '2026-11-01', p_plan_date: null })
  })
  it('задача: только дата плана; этапы 1, без сложности и срока', () => {
    expect(offerArgs('f1', input({ kind: 'task' }))).toEqual({ friend: 'f1', p_kind: 'task', p_name: 'Бегать по утрам', p_stages: 1, p_difficulty: null, p_deadline: null, p_plan_date: '2026-10-12' })
  })
  it('этапы зажаты в 1..20, пустая сложность и срок — null', () => {
    expect(offerArgs('f', input({ stages: 99 })).p_stages).toBe(20)
    expect(offerArgs('f', input({ stages: 0 })).p_stages).toBe(1)
    const a = offerArgs('f', input({ difficulty: '', deadline: '' }))
    expect(a.p_difficulty).toBeNull()
    expect(a.p_deadline).toBeNull()
  })
  it('разбор ошибок сервера', () => {
    expect(classifyOfferError({ code: '53400', message: 'recipient daily limit reached' }).status).toBe('recipient_limit')
    expect(classifyOfferError({ code: '53400', message: 'too many pending invites' }).status).toBe('pending_limit')
    expect(classifyOfferError({ code: '42501', message: 'not a friend' }).status).toBe('not_friend')
    expect(classifyOfferError({ code: 'PGRST202', message: 'Could not find the function' }).status).toBe('unsupported')
    const e = classifyOfferError({ message: 'TypeError: Failed to fetch https://x.supabase.co' })
    expect(e.status).toBe('error')
    expect(JSON.stringify(e)).not.toContain('supabase')
  })
})

describe('OfferGoalForm.vue', () => {
  const mountForm = () => mount(OfferGoalForm, { props: { friendId: 'f1', friendName: 'Аня' } })

  it('пустое название — подсказка, запрос не уходит', async () => {
    const w = mountForm()
    await w.find('[data-testid="offer-form"]').trigger('submit')
    expect(w.find('[data-testid="offer-problem"]').exists()).toBe(true)
    expect(h.calls).toHaveLength(0)
  })
  it('цель уходит в send_goal_invite и закрывает форму событием sent', async () => {
    const w = mountForm()
    expect(w.find('[data-testid="offer-title"]').text()).toContain('Аня')
    await w.find('[data-testid="offer-name"]').setValue('Читать')
    await w.find('[data-testid="offer-stages"]').setValue(4)
    await w.find('[data-testid="offer-difficulty"]').setValue('medium')
    await w.find('[data-testid="offer-form"]').trigger('submit')
    await flushPromises()
    const c = h.calls.find((x) => x.fn === 'send_goal_invite')
    expect(c?.args).toMatchObject({ friend: 'f1', p_kind: 'goal', p_name: 'Читать', p_stages: 4, p_difficulty: 'medium', p_plan_date: null })
    expect(w.emitted('sent')).toHaveLength(1)
  })
  it('задача: показывает поле дня вместо этапов', async () => {
    const w = mountForm()
    await w.find('[data-testid="offer-kind-task"]').setValue(true)
    expect(w.find('[data-testid="offer-date"]').exists()).toBe(true)
    expect(w.find('[data-testid="offer-stages"]').exists()).toBe(false)
    await w.find('[data-testid="offer-name"]').setValue('Позвонить маме')
    await w.find('[data-testid="offer-form"]').trigger('submit')
    await flushPromises()
    expect(h.calls.find((x) => x.fn === 'send_goal_invite')?.args).toMatchObject({ p_kind: 'task', p_deadline: null })
  })
  it('лимит получателя: понятный текст, форма остаётся', async () => {
    h.error = { code: '53400', message: 'recipient daily limit reached' }
    const w = mountForm()
    await w.find('[data-testid="offer-name"]').setValue('X')
    await w.find('[data-testid="offer-form"]').trigger('submit')
    await flushPromises()
    expect(w.find('[data-testid="offer-problem"]').text()).toContain('максимум')
    expect(w.emitted('sent')).toBeUndefined()
  })
})

describe('кнопка в окне профиля', () => {
  const base = { name: 'Аня', avatarUrl: null, keys: [], points: 10, streak: 0 }
  it('у друга есть кнопка; у не-друга и без userId — нет', async () => {
    const f = mount(PublicProfileModal, { props: { ...base, userId: 'f1', isFriend: true } })
    await flushPromises()
    expect(f.find('[data-testid="offer-open"]').exists()).toBe(true)
    const n = mount(PublicProfileModal, { props: { ...base, userId: 'f1', isFriend: false } })
    expect(n.find('[data-testid="offer-open"]').exists()).toBe(false)
    const m = mount(PublicProfileModal, { props: { ...base, isFriend: true } })
    expect(m.find('[data-testid="offer-open"]').exists()).toBe(false)
  })
  it('кнопка открывает форму; после отправки — подтверждение', async () => {
    const w = mount(PublicProfileModal, { props: { ...base, userId: 'f1', isFriend: true } })
    await flushPromises()
    await w.find('[data-testid="offer-open"]').trigger('click')
    expect(w.find('[data-testid="offer-form"]').exists()).toBe(true)
    await w.find('[data-testid="offer-name"]').setValue('Читать')
    await w.find('[data-testid="offer-form"]').trigger('submit')
    await flushPromises()
    expect(w.find('[data-testid="offer-form"]').exists()).toBe(false)
    expect(w.find('[data-testid="offer-sent"]').exists()).toBe(true)
  })
})
