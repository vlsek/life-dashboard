<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { cardAt, nextIndex, positionLabel, wrapIndex } from '../lib/flashcards'
import { t } from '../lib/i18n'
import type { VocabWord } from '../lib/types'

// «Повторение» (BACKLOG 44.7, срез 3): слово крупно → тап показывает перевод и пример → «Выучил» или «Дальше». Ничего не сохраняет сам:
// «Выучил» отдаёт слово родителю (он отмечает его выученным, как галочка в списке).
const props = defineProps<{ words: VocabWord[] }>()
const emit = defineEmits<{ learned: [word: VocabWord] }>()

const index = ref(0)
const revealed = ref(false)
const word = computed(() => cardAt(props.words, index.value))
const position = computed(() => positionLabel(index.value, props.words.length))

// Список сменился (вкладка языка, слово выучено): индекс подгоняем под новый размер, перевод закрываем
watch(
  () => props.words.map((w) => w.id).join(','),
  () => {
    index.value = wrapIndex(index.value, props.words.length)
    revealed.value = false
  },
)

function next() {
  index.value = nextIndex(index.value, props.words.length)
  revealed.value = false
}
function know() {
  if (word.value) emit('learned', word.value) // слово уйдёт из списка, а индекс останется — на его месте встанет следующее
}
</script>

<template>
  <section v-if="word" class="mb-4 rounded-xl border p-4" style="border-color: var(--border); background: var(--bg-card)" data-test="flashcard">
    <div class="mb-1 flex items-baseline justify-between text-xs" style="color: var(--text-dim)">
      <span>{{ t('eng_fc_title') }}</span>
      <span data-test="fc-position">{{ position }}</span>
    </div>
    <button type="button" class="block w-full border-0 bg-transparent p-2 text-center" style="color: var(--text)" :aria-expanded="revealed" :aria-label="t('eng_fc_reveal')" data-test="fc-face" @click="revealed = !revealed">
      <span class="block text-2xl font-bold" data-test="fc-word">{{ word.word }}</span>
      <span v-if="revealed" class="mt-2 block text-lg" data-test="fc-translation">{{ word.translation || '—' }}</span>
      <span v-if="revealed && word.example" class="mt-1 block text-sm" style="color: var(--text-dim)" data-test="fc-example">{{ word.example }}</span>
      <span v-if="!revealed" class="mt-2 block text-xs" style="color: var(--text-dim)">{{ t('eng_fc_tap') }}</span>
    </button>
    <div class="mt-2 flex justify-center gap-2">
      <button v-if="revealed" type="button" class="rounded-lg px-4 py-1.5 text-sm" style="background: var(--accent); color: var(--accent-text)" data-test="fc-know" @click="know">{{ t('eng_fc_know') }}</button>
      <button type="button" class="secondary rounded-lg border px-4 py-1.5 text-sm" style="border-color: var(--border)" data-test="fc-next" @click="next">{{ t('eng_fc_next') }}</button>
    </div>
  </section>
</template>
