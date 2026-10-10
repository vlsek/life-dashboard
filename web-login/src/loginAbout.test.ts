import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// BACKLOG 49.7: на странице входа есть сворачиваемый блок «О проекте» со ссылкой на резюме (шапки там нет).
vi.mock('./lib/supabase', () => ({ sb: { auth: { getSession: vi.fn(async () => ({ data: { session: null } })), signInWithPassword: vi.fn(), signUp: vi.fn(), signInWithOAuth: vi.fn() } } }))

beforeEach(() => {
  vi.resetModules()
  localStorage.clear()
})

describe('страница входа: «О проекте»', () => {
  it.each([['ru', 'О проекте', 'DevOps'], ['en', 'About the project', 'DevOps']])('%s: блок есть, свёрнут, содержит резюме', async (lang, title, word) => {
    localStorage.setItem('site_lang', lang)
    const { default: App } = await import('./App.vue')
    const w = mount(App)
    const d = w.get('[data-test="login-about"]')
    expect(d.attributes('open')).toBeUndefined()
    expect(w.get('[data-test="login-about-toggle"]').text()).toBe(title)
    expect(d.text()).toContain(word)
    expect(w.get('[data-test="login-about-resume"]').attributes('href')).toBe('https://portfolio.orneryhero.workers.dev/')
  })
})
