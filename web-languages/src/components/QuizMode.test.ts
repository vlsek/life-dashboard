import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import QuizMode from './QuizMode.vue'
import type { VocabWord } from '../lib/types'

const w = (id: string, word: string, translation: string | null): VocabWord => ({ id, user_id: 'u', word, translation, example: null, lang: 'en', learned: false, created_at: '2026-10-01' })
const words = [w('1', 'cat', 'кот'), w('2', 'dog', 'пёс'), w('3', 'bird', 'птица'), w('4', 'fish', 'рыба'), w('5', 'cow', 'корова')]
const mk = (mode: 'choice' | 'type', list = words) => mount(QuizMode, { props: { words: list, mode } })
const prompt = (x: ReturnType<typeof mk>) => x.get('[data-test="quiz-prompt"]').text()
const answerOf = (p: string) => words.find((v) => v.word === p)!.translation as string

beforeEach(() => localStorage.clear())

describe('QuizMode: выбор', () => {
  it('4 варианта, среди них верный; верный клик — «верно», счёт растёт, переход дальше', async () => {
    const x = mk('choice')
    const opts = x.findAll('[data-test="quiz-option"]')
    expect(opts).toHaveLength(4)
    const right = opts.find((o) => o.text() === answerOf(prompt(x)))!
    await right.trigger('click')
    expect(x.get('[data-test="quiz-feedback"]').attributes('data-result')).toBe('exact')
    expect(x.findAll('[data-test="quiz-option"]').every((o) => o.attributes('disabled') !== undefined)).toBe(true)
    await x.get('[data-test="quiz-next"]').trigger('click')
    expect(x.get('[data-test="quiz-position"]').text()).toContain('2 /')
    x.unmount()
  })
  it('прохождение сессии: ошибка попадает в список, итог «N из M»', async () => {
    const x = mk('choice')
    const total = 5
    for (let i = 0; i < total; i++) {
      const opts = x.findAll('[data-test="quiz-option"]')
      const right = opts.find((o) => o.text() === answerOf(prompt(x)))!
      const wrong = opts.find((o) => o.text() !== answerOf(prompt(x)))!
      await (i === 0 ? wrong : right).trigger('click') // первый вопрос — с ошибкой
      await x.get('[data-test="quiz-next"]').trigger('click')
    }
    expect(x.get('[data-test="quiz-score"]').text()).toMatch(/4/)
    expect(x.get('[data-test="quiz-score"]').text()).toMatch(/5/)
    expect(x.findAll('[data-test="quiz-mistake"]')).toHaveLength(1)
    await x.get('[data-test="quiz-again"]').trigger('click')
    expect(x.find('[data-test="quiz-score"]').exists()).toBe(false)
    expect(x.get('[data-test="quiz-position"]').text()).toContain('1 /')
    x.unmount()
  })
  it('обратное направление: вопрос — перевод, ответ — слово', async () => {
    const x = mk('choice')
    await x.get('[data-test="quiz-dir-reverse"]').trigger('click')
    const p = prompt(x)
    const expected = words.find((v) => v.translation === p)!.word
    expect(x.findAll('[data-test="quiz-option"]').map((o) => o.text())).toContain(expected)
    x.unmount()
  })
  it('мало слов: меньше двух разных ответов — подсказка вместо вопроса', () => {
    const x = mk('choice', [w('1', 'cat', 'кот')])
    expect(x.find('[data-test="quiz-unavailable"]').exists()).toBe(true)
    expect(x.find('[data-test="quiz-prompt"]').exists()).toBe(false)
    x.unmount()
  })
  it('слова без перевода в вопросы не попадают', () => {
    const x = mk('choice', [w('1', 'cat', 'кот'), w('2', 'dog', null), w('3', 'bird', 'птица')])
    expect(x.find('[data-test="quiz-position"]').text()).toContain('/ 2')
    x.unmount()
  })
})

describe('QuizMode: ввод', () => {
  const one = [w('1', 'cat', 'Кот')]
  it('мягкая проверка: другой регистр засчитывается с пометкой, верный ответ показывается', async () => {
    const x = mk('type', one)
    await x.get('[data-test="quiz-input"]').setValue('кот')
    await x.get('form').trigger('submit')
    expect(x.get('[data-test="quiz-feedback"]').attributes('data-result')).toBe('soft')
    expect(x.get('[data-test="quiz-feedback"]').text()).toContain('Кот')
    x.unmount()
  })
  it('точный ответ — «exact»; ошибка — «wrong» и верный ответ в подсказке; после ответа поле заблокировано', async () => {
    const x = mk('type', one)
    await x.get('[data-test="quiz-input"]').setValue('собака')
    await x.get('form').trigger('submit')
    expect(x.get('[data-test="quiz-feedback"]').attributes('data-result')).toBe('wrong')
    expect(x.get('[data-test="quiz-feedback"]').text()).toContain('Кот')
    expect(x.get('[data-test="quiz-input"]').attributes('disabled')).toBeDefined()
    await x.get('[data-test="quiz-next"]').trigger('click')
    expect(x.get('[data-test="quiz-score"]').text()).toMatch(/0/)
    x.unmount()
  })
  it('пустой ввод проверить нельзя', async () => {
    const x = mk('type', one)
    expect(x.get('[data-test="quiz-check"]').attributes('disabled')).toBeDefined()
    await x.get('form').trigger('submit')
    expect(x.find('[data-test="quiz-feedback"]').exists()).toBe(false)
    x.unmount()
  })
})
