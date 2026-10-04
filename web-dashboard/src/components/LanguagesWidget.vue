<script setup lang="ts">
import { ref, watch } from 'vue'
import { t } from '../lib/i18n'
import { ALL_LANGS, langName, useLanguagesWidget, type LangWidgetState } from '../lib/useLanguagesWidget'

// Виджет «Изучение языков»: невыученные слова выбранного словаря. Видны первые 5 строк, дальше — прокрутка внутри виджета.
// Тап по слову показывает/скрывает перевод и пример; «Знаю» уводит слово вниз очереди (на этом устройстве), «Выучил» отмечает
// слово выученным в разделе Языков. Состояние наверх (`state`): блок «Виджеты» виден, пока хотя бы один виджет готов.
const props = defineProps<{ userId: string; lang: string }>()
const emit = defineEmits<{ state: [LangWidgetState] }>()

const ROW_H = 52 // px: высота строки; окно списка = 5 строк
const VISIBLE = 5

const { state, words, error, busy, load, know, learned } = useLanguagesWidget()
watch(() => [props.userId, props.lang], () => void load(props.userId, props.lang), { immediate: true })
watch(state, (s) => emit('state', s), { immediate: true })

const open = ref<Set<string>>(new Set())
function toggle(id: string) {
  const next = new Set(open.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  open.value = next
}
const btn = 'display:inline-flex;align-items:center;justify-content:center;height:2rem;padding:0 0.6rem;border-radius:0.5rem;font-size:0.75rem;white-space:nowrap;'
</script>

<template>
  <div v-if="state === 'ready'" class="rounded-2xl border p-3.5" style="border-color: var(--border); background: var(--bg-card)" data-test="lang-widget">
    <div class="mb-2 flex items-center gap-2">
      <span class="dim text-xs">{{ t('dash_widget_lang') }}<template v-if="lang !== ALL_LANGS"> · {{ langName(lang) }}</template></span>
      <span class="dim text-xs" data-test="lang-count">{{ t('dash_widget_lang_count').replace('{n}', String(words.length)) }}</span>
      <a href="/languages/" class="ml-auto text-xs" style="color: var(--accent)" data-test="lang-link">{{ t('dash_widget_lang_link') }}</a>
    </div>
    <ul class="m-0 list-none overflow-y-auto p-0" :style="{ maxHeight: ROW_H * VISIBLE + 'px' }" data-test="lang-list">
      <li v-for="w in words" :key="w.id" class="border-b last:border-b-0" style="border-color: var(--border)" data-test="lang-item">
        <div class="flex items-center gap-2 py-1.5" :style="{ minHeight: ROW_H + 'px' }">
          <button type="button" class="min-w-0 flex-1 text-left" style="background: transparent; border: none; padding: 0; color: var(--text)" :aria-expanded="open.has(w.id)" data-test="lang-word" @click="toggle(w.id)">
            <span class="block truncate font-medium">{{ w.word }}</span>
            <span v-if="lang === ALL_LANGS" class="dim text-xs" data-test="lang-tag">{{ langName(w.lang) }}</span>
          </button>
          <button type="button" class="secondary" :style="btn" :disabled="busy.has(w.id)" :aria-label="t('dash_widget_lang_know_aria').replace('{word}', w.word)" data-test="lang-know" @click="know(w.id)">{{ t('dash_widget_lang_know') }}</button>
          <button type="button" class="secondary" :style="btn" :disabled="busy.has(w.id)" :aria-label="t('dash_widget_lang_learned_aria').replace('{word}', w.word)" data-test="lang-learned" @click="learned(w.id)">{{ t('dash_widget_lang_learned') }}</button>
        </div>
        <div v-if="open.has(w.id)" class="pb-2 text-sm" data-test="lang-detail">
          <div data-test="lang-translation">{{ w.translation || t('dash_widget_lang_no_translation') }}</div>
          <div v-if="w.example" class="dim mt-0.5 text-xs" data-test="lang-example">{{ w.example }}</div>
        </div>
      </li>
    </ul>
    <p class="dim mt-1.5 text-xs">{{ t('dash_widget_lang_hint') }}</p>
    <p v-if="error" class="mt-1 text-xs" style="color: #d6336c" data-test="lang-error">{{ error }}</p>
  </div>
</template>
