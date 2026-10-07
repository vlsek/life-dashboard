import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({ row: null as null | { favorite_pages?: unknown }, selectError: null as null | { message: string }, upsertError: null as null | { message: string }, upserts: [] as unknown[] }))
vi.mock('./supabase', () => ({
  sb: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: db.row, error: db.selectError }) }) }),
      upsert: (p: unknown) => {
        db.upserts.push(p)
        return Promise.resolve({ error: db.upsertError })
      },
    }),
  },
}))

import { FAVORITABLE_KEYS, FAVORITES_EVENT, normalizeFavorites, pageKeyFor, readFavorites, saveFavoritesToProfile, syncFavoritesFromProfile, toggleFavorite, writeFavorites } from './favorites'

beforeEach(() => {
  localStorage.clear()
  db.row = null
  db.selectError = null
  db.upsertError = null
  db.upserts = []
})

describe('pageKeyFor', () => {
  it('страницы меню → их ключи в AppShell (languages → english), с любым видом пути', () => {
    expect(pageKeyFor('/goals/')).toBe('goals')
    expect(pageKeyFor('/goals')).toBe('goals')
    expect(pageKeyFor('/goals/index.html')).toBe('goals')
    expect(pageKeyFor('/languages/')).toBe('english')
    expect(pageKeyFor('/shop/')).toBe('shop')
  })
  it('главная, «Достижения» и «Кастомизация» — тоже со своим сердечком (BACKLOG 44.15)', () => {
    expect(pageKeyFor('/dashboard/')).toBe('dashboard')
    expect(pageKeyFor('/achievements/')).toBe('achievements')
    expect(pageKeyFor('/customization/')).toBe('customization')
  })
  it('Аккаунт, служебные, «История» (убрана из меню, 44.14), legacy и неизвестные страницы — без сердечка', () => {
    for (const p of ['/account/', '/login/', '/onboarding/', '/admin.html', '/history/', '/legacy/goals.html', '/', '/nope/']) expect(pageKeyFor(p)).toBeNull()
  })
  it('ключи избранного = страницы бокового меню в порядке меню', () => {
    expect(FAVORITABLE_KEYS).toEqual(['dashboard', 'goals', 'skills', 'workouts', 'challenges', 'english', 'calendar', 'milestones', 'shop', 'achievements', 'customization', 'community'])
  })
})

describe('нормализация и переключение', () => {
  it('нормализация: только известные ключи, без дублей и мусора, в порядке бокового меню', () => {
    expect(normalizeFavorites(['shop', 'goals', 'goals', 'x', 5, null])).toEqual(['goals', 'shop'])
    expect(normalizeFavorites('goals')).toEqual([])
    expect(normalizeFavorites(null)).toEqual([])
  })
  it('toggleFavorite добавляет и убирает, не мутируя исходник', () => {
    const src = ['goals']
    expect(toggleFavorite(src, 'shop')).toEqual(['goals', 'shop'])
    expect(toggleFavorite(src, 'goals')).toEqual([])
    expect(src).toEqual(['goals'])
    expect(toggleFavorite([], 'dashboard')).toEqual(['dashboard']) // главная теперь избираемая (44.15)
    expect(toggleFavorite([], 'account')).toEqual([]) // не избираемая страница отсекается
    expect(toggleFavorite([], 'history')).toEqual([]) // «История» убрана из меню (44.14)
  })
})

describe('localStorage и событие', () => {
  it('writeFavorites пишет нормализованный список и будит AppShell событием favorites:changed', () => {
    const seen: unknown[] = []
    window.addEventListener(FAVORITES_EVENT, ((e: CustomEvent) => seen.push(e.detail)) as unknown as EventListener)
    writeFavorites(['shop', 'goals', 'bad'])
    expect(localStorage.getItem('favorite_pages')).toBe('["goals","shop"]')
    expect(seen.at(-1)).toEqual(['goals', 'shop'])
    expect(readFavorites()).toEqual(['goals', 'shop'])
  })
  it('битый JSON в localStorage → пустой список', () => {
    localStorage.setItem('favorite_pages', '{oops')
    expect(readFavorites()).toEqual([])
  })
})

describe('синхронизация с профилем (миграция 035)', () => {
  it('в профиле есть список → он главнее: пишется в localStorage', async () => {
    localStorage.setItem('favorite_pages', '["goals"]')
    db.row = { favorite_pages: ['shop', 'community'] }
    expect(await syncFavoritesFromProfile('u1')).toEqual(['shop', 'community'])
    expect(readFavorites()).toEqual(['shop', 'community'])
    expect(db.upserts).toEqual([])
  })
  it('в профиле пусто (null), а на устройстве уже выбрано — локальный список уезжает в профиль', async () => {
    localStorage.setItem('favorite_pages', '["goals","skills"]')
    db.row = { favorite_pages: null }
    expect(await syncFavoritesFromProfile('u1')).toEqual(['goals', 'skills'])
    expect(db.upserts).toEqual([{ user_id: 'u1', favorite_pages: ['goals', 'skills'] }])
  })
  it('колонки нет (ошибка запроса) — остаёмся на локальном списке и ничего не пишем', async () => {
    localStorage.setItem('favorite_pages', '["goals"]')
    db.selectError = { message: 'column "favorite_pages" does not exist' }
    expect(await syncFavoritesFromProfile('u1')).toEqual(['goals'])
    expect(db.upserts).toEqual([])
  })
  it('saveFavoritesToProfile: true при успехе, false при ошибке записи', async () => {
    expect(await saveFavoritesToProfile('u1', ['shop', 'bad'])).toBe(true)
    expect(db.upserts.at(-1)).toEqual({ user_id: 'u1', favorite_pages: ['shop'] })
    db.upsertError = { message: 'denied' }
    expect(await saveFavoritesToProfile('u1', ['shop'])).toBe(false)
  })
})
