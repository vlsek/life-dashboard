<script setup lang="ts">
import { langName } from '../lib/vocab'
import { t } from '../lib/i18n'
import type { VocabWord } from '../lib/types'
import Icon from './Icon.vue'

// Строка слова (44.7): слово и перевод на первой линии, пример — под ними; действия справа, красная корзина — только при наведении/фокусе.
// Раньше слова лежали в таблице из пяти колонок и на телефоне уезжали за край экрана.
defineProps<{ word: VocabWord; showLang: boolean }>()
defineEmits<{ toggle: [w: VocabWord]; edit: [w: VocabWord]; remove: [id: string] }>()
</script>

<template>
  <li class="flex items-start gap-3 border-b px-3 py-3 last:border-0" style="border-color: var(--border)" data-test="word-row">
    <input type="checkbox" class="mt-1 shrink-0" :checked="word.learned" :aria-label="word.word" @change="$emit('toggle', word)" />
    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span class="font-semibold" :class="{ 'line-through': word.learned }" :style="word.learned ? 'color: var(--text-dim)' : ''">{{ word.word }}</span>
        <span
          v-if="showLang"
          class="rounded-lg border px-1.5 py-0.5 text-[0.65rem] leading-none"
          style="border-color: var(--border); color: var(--text-dim)"
          :title="langName(word.lang || 'en')"
        >
          {{ (word.lang || 'en').toUpperCase() }}
        </span>
        <span class="text-sm">{{ word.translation || '—' }}</span>
      </div>
      <p v-if="word.example" class="m-0 mt-1 text-[0.85em] italic" style="color: var(--text-dim)" data-test="word-example">{{ word.example }}</p>
    </div>
    <span class="flex shrink-0 whitespace-nowrap opacity-70 transition-opacity focus-within:opacity-100 hover:opacity-100">
      <button type="button" class="rounded p-1.5" style="color: var(--text-dim)" :aria-label="t('eng_edit_word')" data-test="word-edit" @click="$emit('edit', word)"><Icon name="edit" /></button>
      <button type="button" class="word-del rounded p-1.5" style="color: var(--text-dim)" :aria-label="t('eng_delete_word')" data-test="word-delete" @click="$emit('remove', word.id)"><Icon name="trash" /></button>
    </span>
  </li>
</template>

<style scoped>
.word-del:hover, .word-del:focus-visible { color: var(--danger, #e05555) !important; }
</style>
