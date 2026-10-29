import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ThemeCard from './ThemeCard.vue'

// BACKLOG 81.1: сердечко «в избранное» вылезало за рамки карточки темы (длинное название + редкость + кнопка в одну строку без переноса).
// Геометрию в jsdom не измерить (её проверяли в Chromium), поэтому страж — классы, которые держат кнопку внутри: перенос строки и кнопка, что не сжимается.
describe('ThemeCard: сердечко не выходит за карточку (81.1)', () => {
  const mk = () => mount(ThemeCard, { props: { themeKey: 'velvet' as never, active: false, favorite: false, canToggle: true, showRarity: true } })
  it('строка «название · редкость · сердечко» переносится, а не растягивает карточку', () => {
    const head = mk().get('[data-testid="theme-head"]')
    expect(head.classes()).toContain('flex-wrap')
  })
  it('название может сжиматься и переноситься по словам, кнопка — нет', () => {
    const w = mk()
    expect(w.get('[data-testid="theme-head"] p').classes()).toEqual(expect.arrayContaining(['min-w-0', 'break-words']))
    expect(w.get('[data-testid="fav"]').classes()).toContain('shrink-0')
  })
})
