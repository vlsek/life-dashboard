<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { t } from '../lib/i18n'
import type { VocabWord } from '../lib/types'
import { buildOptions, canChoose, checkTyped, pickSession, quizCards, type QuizCard, type QuizDirection, type TypedResult } from '../lib/quiz'

// Тренировка слов (BACKLOG 77.7, срез 1): «выбор» из четырёх или «ввод» перевода. Выученным слово здесь не помечается —
// оценка для интервального повторения появится вместе с 77.1; сейчас показываем только итог сессии.
const props = defineProps<{ words: VocabWord[]; mode: 'choice' | 'type' }>()

const direction = ref<QuizDirection>('forward')
const cards = computed(() => quizCards(props.words, direction.value))
const session = ref<QuizCard[]>([])
const index = ref(0)
const options = ref<string[]>([])
const typed = ref('')
const picked = ref<string | null>(null) // выбранный вариант (режим «выбор»)
const result = ref<TypedResult | null>(null) // итог текущего вопроса; null — ещё не отвечено
const mistakes = ref<QuizCard[]>([])
const correct = ref(0)
const finished = ref(false)

const available = computed(() => (props.mode === 'choice' ? canChoose(cards.value) : cards.value.length >= 1))
const card = computed(() => session.value[index.value] ?? null)

function prepare() {
  options.value = props.mode === 'choice' && card.value ? buildOptions(card.value, cards.value) : []
  typed.value = ''
  picked.value = null
  result.value = null
}
function start() {
  session.value = available.value ? pickSession(cards.value) : []
  index.value = 0
  correct.value = 0
  mistakes.value = []
  finished.value = false
  prepare()
}
function settle(r: TypedResult) {
  if (!card.value || result.value) return
  result.value = r
  if (r === 'wrong') mistakes.value.push(card.value)
  else correct.value++
}
function choose(opt: string) {
  if (result.value) return
  picked.value = opt
  settle(card.value && opt === card.value.answer ? 'exact' : 'wrong')
}
function submitTyped() {
  if (!card.value || result.value || !typed.value.trim()) return // Enter в пустом поле не должен засчитывать ошибку
  settle(checkTyped(typed.value, card.value.answer))
}
function next() {
  if (index.value + 1 >= session.value.length) {
    finished.value = true
    return
  }
  index.value++
  prepare()
}

// Сменили режим, направление или список слов — начинаем заново (идущая сессия устарела)
watch(() => [props.mode, direction.value, props.words.map((w) => w.id + (w.translation ?? '')).join('|')], start, { immediate: true })
</script>

<template>
  <section class="mb-4 rounded-xl border p-4" style="border-color: var(--border); background: var(--bg-card)" data-test="quiz">
    <div class="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-xs" style="color: var(--text-dim)">
      <span>{{ mode === 'choice' ? t('quiz_choice') : t('quiz_type') }}</span>
      <span class="flex gap-1" role="group" :aria-label="t('quiz_direction')">
        <button type="button" class="secondary rounded-lg border px-2 py-0.5" :aria-pressed="direction === 'forward'" data-test="quiz-dir-forward" @click="direction = 'forward'">{{ t('quiz_dir_forward') }}</button>
        <button type="button" class="secondary rounded-lg border px-2 py-0.5" :aria-pressed="direction === 'reverse'" data-test="quiz-dir-reverse" @click="direction = 'reverse'">{{ t('quiz_dir_reverse') }}</button>
      </span>
    </div>

    <p v-if="!available" class="m-0 text-sm" data-test="quiz-unavailable">{{ mode === 'choice' ? t('quiz_need_two') : t('quiz_need_one') }}</p>

    <template v-else-if="finished">
      <p class="m-0 text-lg font-bold" data-test="quiz-score">{{ t('quiz_score').replace('{n}', String(correct)).replace('{m}', String(session.length)) }}</p>
      <div v-if="mistakes.length" class="mt-2 text-sm" data-test="quiz-mistakes">
        <p class="m-0 mb-1" style="color: var(--text-dim)">{{ t('quiz_mistakes') }}</p>
        <div v-for="m in mistakes" :key="m.id" data-test="quiz-mistake">{{ m.prompt }} → <b>{{ m.answer }}</b></div>
      </div>
      <button type="button" class="mt-3 rounded-lg px-4 py-1.5 text-sm" style="background: var(--accent); color: var(--accent-text)" data-test="quiz-again" @click="start">{{ t('quiz_again') }}</button>
    </template>

    <template v-else-if="card">
      <div class="mb-1 text-xs" style="color: var(--text-dim)" data-test="quiz-position">{{ index + 1 }} / {{ session.length }}</div>
      <div class="py-2 text-center text-2xl font-bold" data-test="quiz-prompt">{{ card.prompt }}</div>

      <div v-if="mode === 'choice'" class="grid gap-2" role="group" :aria-label="t('quiz_options')">
        <button
          v-for="opt in options"
          :key="opt"
          type="button"
          class="secondary rounded-lg border px-3 py-2 text-left"
          :style="result && opt === card.answer ? 'border-color: var(--accent)' : result && opt === picked ? 'border-color: var(--danger)' : 'border-color: var(--border)'"
          :disabled="!!result"
          data-test="quiz-option"
          @click="choose(opt)"
        >{{ opt }}</button>
      </div>

      <form v-else class="flex gap-2" @submit.prevent="submitTyped">
        <input v-model="typed" type="text" class="flex-1" autocomplete="off" autocapitalize="off" :placeholder="t('quiz_type_ph')" :disabled="!!result" data-test="quiz-input" />
        <button type="submit" :disabled="!!result || !typed.trim()" data-test="quiz-check">{{ t('quiz_check') }}</button>
      </form>

      <p v-if="result" class="mt-2 mb-0 text-sm" role="status" :data-result="result" data-test="quiz-feedback">
        <template v-if="result === 'exact'">{{ t('quiz_right') }}</template>
        <template v-else-if="result === 'soft'">{{ t('quiz_soft') }}: <b>{{ card.answer }}</b></template>
        <template v-else>{{ t('quiz_wrong') }}: <b>{{ card.answer }}</b></template>
      </p>
      <button v-if="result" type="button" class="mt-2 rounded-lg px-4 py-1.5 text-sm" style="background: var(--accent); color: var(--accent-text)" data-test="quiz-next" @click="next">{{ index + 1 >= session.length ? t('quiz_finish') : t('quiz_next') }}</button>
    </template>
  </section>
</template>
