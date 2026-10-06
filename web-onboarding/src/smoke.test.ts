import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const getSession = vi.fn()
const profileMaybeSingle = vi.fn()
const upsert = vi.fn()
const insert = vi.fn()
const selectEq = vi.fn()
vi.mock('./lib/supabase', () => ({
  sb: {
    auth: { getSession: (...a: unknown[]) => getSession(...a) },
    from: (table: string) => ({
      select: () => ({ eq: (...a: unknown[]) => Object.assign(Promise.resolve(selectEq(table, ...a)), { maybeSingle: (...b: unknown[]) => profileMaybeSingle(...b) }) }),
      upsert: (...a: unknown[]) => upsert(table, ...a),
      insert: (...a: unknown[]) => insert(table, ...a),
    }),
    storage: undefined,
  },
}))

import { ANIMALS } from './lib/animalAvatars'
import App from './App.vue'

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  localStorage.setItem('site_lang', 'en')
  // по умолчанию вошли через Google: имя предзаполнено, поле «Имя» не мешает старым сценариям
  getSession.mockResolvedValue({ data: { session: { user: { id: 'u1', user_metadata: { full_name: 'Test User', picture: 'https://lh3.googleusercontent.com/a/x' } } } } })
  profileMaybeSingle.mockResolvedValue({ data: { onboarded: false } })
  upsert.mockReturnValue({ select: async () => ({ data: [] }) })
  insert.mockImplementation(() => Object.assign(Promise.resolve({ error: null }), { select: async () => ({ data: [{ id: 'p1', name: 'Weight' }] }) }))
  selectEq.mockReturnValue({ data: [] })
})

describe('onboarding page (step-by-step)', () => {
  const click = async (w: ReturnType<typeof mount>, sel: string) => {
    await w.find(sel).trigger('click')
    await flushPromises()
  }
  const next = async (w: ReturnType<typeof mount>) => {
    await w.find('form').trigger('submit')
    await flushPromises()
  }
  // обходит шаги до «метрик» для сценария goals
  const toMetrics = async (w: ReturnType<typeof mount>) => {
    await next(w) // usecase -> about
    await next(w) // about -> priority
    await next(w) // priority -> metrics
  }

  it('starts on the first step with a progress counter, not on a long form', async () => {
    const w = mount(App)
    await flushPromises()
    expect(w.text()).toContain('A couple of questions to start')
    expect(w.find('[data-test="step-usecase"]').exists()).toBe(true)
    expect(w.find('[data-test="step-counter"]').text()).toBe('Step 1 of 4')
    expect(w.find('[data-test="back"]').exists()).toBe(false)
    expect(w.text()).not.toContain('Height (cm)')
  })

  it('goes through the steps with Next / Back', async () => {
    const w = mount(App)
    await flushPromises()
    await next(w)
    expect(w.find('[data-test="step-about"]').exists()).toBe(true)
    expect(w.text()).toContain('Height (cm)')
    await next(w)
    expect(w.find('[data-test="step-priority"]').exists()).toBe(true)
    await click(w, '[data-test="back"]')
    expect(w.find('[data-test="step-about"]').exists()).toBe(true)
  })

  it('planner: only two steps, no height/weight, finishes after "about you" with no metrics and no body parameters', async () => {
    upsert.mockReturnValue(Promise.resolve({ error: null }))
    const w = mount(App)
    await flushPromises()
    await click(w, '[data-test="usecase-planner"]')
    expect(w.find('[data-test="step-counter"]').text()).toBe('Step 1 of 2')
    await next(w)
    expect(w.text()).not.toContain('Height (cm)')
    expect(w.find('[data-test="next"]').text()).toContain('Done')
    await next(w)
    expect(upsert).toHaveBeenCalledWith('profiles', expect.objectContaining({ user_id: 'u1', onboarded: true }))
    // раскладка Дашборда: графики метрик скрыты
    expect(upsert).toHaveBeenCalledWith('profiles', expect.objectContaining({ dashboard_layout: expect.arrayContaining([{ key: 'charts', visible: false }]) }))
    expect(insert.mock.calls.some((c) => c[0] === 'body_parameters')).toBe(false)
    expect(insert.mock.calls.some((c) => c[0] === 'metrics')).toBe(false)
  })

  it('metrics step: only the metrics recommended for the goal are pre-checked; the rest are hidden until asked', async () => {
    const w = mount(App)
    await flushPromises()
    await toMetrics(w)
    expect(w.find('[data-test="step-metrics"]').exists()).toBe(true)
    const checked = w.findAll('[data-test="metrics-recommended"] input:checked').map((i) => i.attributes('data-metric'))
    expect(checked).toEqual(['water', 'calories', 'workout', 'steps']) // цель по умолчанию — «похудеть»
    expect(w.find('[data-test="metrics-other"]').exists()).toBe(false)
    await click(w, '[data-test="metrics-other-toggle"]')
    const other = w.findAll('[data-test="metrics-other"] input')
    expect(other.map((i) => i.attributes('data-metric'))).toEqual(['pushups', 'study', 'mood'])
    expect(other.every((i) => !(i.element as HTMLInputElement).checked)).toBe(true)
  })

  it('finishing creates only the selected metrics and only the body parameters the goal needs', async () => {
    upsert.mockReturnValue(Promise.resolve({ error: null }))
    const w = mount(App)
    await flushPromises()
    await toMetrics(w)
    await w.find('[data-metric="calories"]').setValue(false)
    await next(w) // Done
    const metricsCall = insert.mock.calls.find((c) => c[0] === 'metrics')!
    expect((metricsCall[1] as { name: string }[]).map((r) => r.name)).toEqual(['Water', 'Workout', 'Steps'])
    const bodyCall = insert.mock.calls.find((c) => c[0] === 'body_parameters')!
    expect((bodyCall[1] as { name: string }[]).map((r) => r.name)).toEqual(['Weight', '% fat', 'Muscle mass'])
  })

  it('changing the goal re-picks the recommendations until the user touches a checkbox', async () => {
    const w = mount(App)
    await flushPromises()
    await next(w)
    await next(w)
    await w.find('[data-test="step-priority"] select').setValue('learn_skill')
    await next(w)
    expect(w.findAll('[data-test="metrics-recommended"] input:checked').map((i) => i.attributes('data-metric'))).toEqual(['study', 'mood'])
  })

  it('rejects a birthdate in the future before leaving the step and before calling Supabase', async () => {
    const w = mount(App)
    await flushPromises()
    await next(w)
    await w.find('input[type=date]').setValue('2999-01-01')
    await next(w)
    expect(w.text()).toContain('Date of birth must be between')
    expect(w.find('[data-test="step-about"]').exists()).toBe(true)
    expect(upsert).not.toHaveBeenCalled()
  })

  it('skip marks onboarded and seeds just two starter metrics, not all six', async () => {
    upsert.mockReturnValue(Promise.resolve({ error: null }))
    const w = mount(App)
    await flushPromises()
    await click(w, '[data-test="skip"]')
    expect(upsert).toHaveBeenCalledWith('profiles', expect.objectContaining({ user_id: 'u1', onboarded: true }))
    const metricsCall = insert.mock.calls.find((c) => c[0] === 'metrics')!
    expect((metricsCall[1] as { name: string }[]).map((r) => r.name)).toEqual(['Water', 'Workout'])
  })
})

describe('имя профиля обязательно (BACKLOG 841) и подтягивается из Google (BACKLOG 766)', () => {
  const next = async (w: ReturnType<typeof mount>) => {
    await w.find('form').trigger('submit')
    await flushPromises()
  }
  const noGoogle = () => getSession.mockResolvedValue({ data: { session: { user: { id: 'u1', user_metadata: {} } } } })

  it('вход через Google: поле предзаполнено именем из аккаунта и подписано; можно сменить', async () => {
    const w = mount(App)
    await flushPromises()
    expect((w.find('[data-test="name-input"]').element as HTMLInputElement).value).toBe('Test User')
    expect(w.find('[data-test="name-from-google"]').exists()).toBe(true)
    await w.find('[data-test="name-input"]').setValue('Аня')
    expect(w.find('[data-test="name-from-google"]').exists()).toBe(false)
  })

  it('без Google имя пустое: «Далее» не пускает дальше и просит имя', async () => {
    noGoogle()
    const w = mount(App)
    await flushPromises()
    expect((w.find('[data-test="name-input"]').element as HTMLInputElement).value).toBe('')
    await next(w)
    expect(w.find('[data-test="step-usecase"]').exists()).toBe(true)
    expect(w.text()).toContain('Enter a name')
    await w.find('[data-test="name-input"]').setValue('   ')
    await next(w)
    expect(w.find('[data-test="step-usecase"]').exists()).toBe(true)
    await w.find('[data-test="name-input"]').setValue('Аня')
    await next(w)
    expect(w.find('[data-test="step-about"]').exists()).toBe(true)
  })

  it('«Пропустить» без имени тоже не работает и в базу ничего не пишет', async () => {
    noGoogle()
    const w = mount(App)
    await flushPromises()
    await w.find('[data-test="skip"]').trigger('click')
    await flushPromises()
    expect(upsert).not.toHaveBeenCalled()
    expect(w.text()).toContain('Enter a name')
  })

  it('«Пропустить» с именем сохраняет display_name и аватарку из Google', async () => {
    upsert.mockReturnValue(Promise.resolve({ error: null }))
    const w = mount(App)
    await flushPromises()
    await w.find('[data-test="name-input"]').setValue('  Аня   Иванова ')
    await w.find('[data-test="skip"]').trigger('click')
    await flushPromises()
    expect(upsert).toHaveBeenCalledWith('profiles', { user_id: 'u1', display_name: 'Аня Иванова', avatar_url: 'https://lh3.googleusercontent.com/a/x', onboarded: true })
  })

  it('полное прохождение: имя уходит в профиль вместе с анкетой', async () => {
    upsert.mockReturnValue(Promise.resolve({ error: null }))
    const w = mount(App)
    await flushPromises()
    await w.find('[data-test="usecase-planner"]').trigger('click')
    await next(w) // usecase -> about
    await next(w) // Done
    expect(upsert).toHaveBeenCalledWith('profiles', expect.objectContaining({ user_id: 'u1', display_name: 'Test User', onboarded: true }))
  })

  it('своё сохранённое имя приоритетнее Google, а своя аватарка не затирается', async () => {
    profileMaybeSingle.mockResolvedValue({ data: { onboarded: false, display_name: 'Моё имя', avatar_url: 'https://example.com/mine.png' } })
    upsert.mockReturnValue(Promise.resolve({ error: null }))
    const w = mount(App)
    await flushPromises()
    expect((w.find('[data-test="name-input"]').element as HTMLInputElement).value).toBe('Моё имя')
    expect(w.find('[data-test="name-from-google"]').exists()).toBe(false)
    await w.find('[data-test="skip"]').trigger('click')
    await flushPromises()
    expect(upsert).toHaveBeenCalledWith('profiles', { user_id: 'u1', display_name: 'Моё имя', onboarded: true })
  })
})

describe('аватарка при регистрации: фото из Google или одно из 20 животных (BACKLOG раздел 29)', () => {
  const animal = (key: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent((ANIMALS.find((a) => a.key === key) as { svg: string }).svg)}`

  it('на первом шаге есть выбор из 20 животных и фото Google; по умолчанию выбрано фото Google', async () => {
    const w = mount(App)
    await flushPromises()
    expect(w.find('[data-test="avatar-picker"]').exists()).toBe(true)
    expect(w.findAll('[data-test^="avatar-"]').filter((b) => b.attributes('role') === 'radio')).toHaveLength(21) // 20 + Google
    expect(w.find('[data-test="avatar-google"]').attributes('aria-checked')).toBe('true')
  })

  it('без Google выбора фото нет, только животные (20)', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: 'u1', user_metadata: {} } } } })
    const w = mount(App)
    await flushPromises()
    expect(w.find('[data-test="avatar-google"]').exists()).toBe(false)
    expect(w.findAll('[role="radio"]')).toHaveLength(20)
  })

  it('выбранное животное записывается в avatar_url вместо фото Google', async () => {
    upsert.mockReturnValue(Promise.resolve({ error: null }))
    const w = mount(App)
    await flushPromises()
    await w.find('[data-test="avatar-fox"]').trigger('click')
    expect(w.find('[data-test="avatar-fox"]').attributes('aria-checked')).toBe('true')
    expect(w.find('[data-test="avatar-google"]').attributes('aria-checked')).toBe('false')
    await w.find('[data-test="skip"]').trigger('click')
    await flushPromises()
    expect(upsert).toHaveBeenCalledWith('profiles', { user_id: 'u1', display_name: 'Test User', avatar_url: animal('fox'), onboarded: true })
  })

  it('повторный клик снимает выбор — возвращается фото Google', async () => {
    upsert.mockReturnValue(Promise.resolve({ error: null }))
    const w = mount(App)
    await flushPromises()
    await w.find('[data-test="avatar-owl"]').trigger('click')
    await w.find('[data-test="avatar-owl"]').trigger('click')
    expect(w.find('[data-test="avatar-google"]').attributes('aria-checked')).toBe('true')
    await w.find('[data-test="skip"]').trigger('click')
    await flushPromises()
    expect(upsert).toHaveBeenCalledWith('profiles', { user_id: 'u1', display_name: 'Test User', avatar_url: 'https://lh3.googleusercontent.com/a/x', onboarded: true })
  })

  it('без Google и без выбора аватарку не трогаем (avatar_url не пишется)', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: 'u1', user_metadata: { full_name: 'Аня' } } } } })
    upsert.mockReturnValue(Promise.resolve({ error: null }))
    const w = mount(App)
    await flushPromises()
    await w.find('[data-test="skip"]').trigger('click')
    await flushPromises()
    expect(upsert).toHaveBeenCalledWith('profiles', { user_id: 'u1', display_name: 'Аня', onboarded: true })
  })

  it('своя аватарка в профиле не затирается, пока человек не выбрал животное сам', async () => {
    profileMaybeSingle.mockResolvedValue({ data: { onboarded: false, display_name: 'Моё имя', avatar_url: 'https://example.com/mine.png' } })
    upsert.mockReturnValue(Promise.resolve({ error: null }))
    const w = mount(App)
    await flushPromises()
    expect(w.find('[data-test="avatar-google"]').exists()).toBe(false) // фото Google не предлагаем — своё уже есть
    await w.find('[data-test="avatar-panda"]').trigger('click')
    await w.find('[data-test="skip"]').trigger('click')
    await flushPromises()
    expect(upsert).toHaveBeenCalledWith('profiles', { user_id: 'u1', display_name: 'Моё имя', avatar_url: animal('panda'), onboarded: true })
  })
})

