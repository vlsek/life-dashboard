<script setup lang="ts">
import { computed, ref } from 'vue'
import { useVocab } from './lib/useVocab'
import { getLangFilter, langName, setLangFilter, setLastLang } from './lib/vocab'
import { t } from './lib/i18n'
import AppShell from './components/AppShell.vue'
import WordForm from './components/WordForm.vue'
import Icon from './components/Icon.vue'
import type { VocabWord, WordFormInput } from './lib/types'

const { auth, words, error, addWord, editWord, deleteWord, toggleLearned } = useVocab()

const filter = ref(getLangFilter())
function setFilter(code: string) {
  filter.value = code
  setLangFilter(code)
}

// Счётчик слов по языку — тот же расчёт, что и в render() из english.js, плюс сброс
// фильтра на "все", если ранее выбранный язык больше не встречается ни в одном слове.
const langCounts = computed(() => {
  const counts: Record<string, number> = {}
  for (const w of words.value) {
    const l = w.lang || 'en'
    counts[l] = (counts[l] || 0) + 1
  }
  return counts
})
const effectiveFilter = computed(() => {
  if (filter.value !== 'all' && !langCounts.value[filter.value]) {
    setFilter('all')
    return 'all'
  }
  return filter.value
})
const filterChips = computed(() => {
  const codes = Object.keys(langCounts.value)
  if (codes.length <= 1) return []
  return [
    { code: 'all', label: t('eng_filter_all'), count: words.value.length },
    ...codes.map((c) => ({ code: c, label: langName(c), count: langCounts.value[c] })),
  ]
})

const filteredWords = computed(() =>
  words.value.filter((w) => effectiveFilter.value === 'all' || (w.lang || 'en') === effectiveFilter.value),
)
const activeWords = computed(() => filteredWords.value.filter((w) => !w.learned))
const doneWords = computed(() => filteredWords.value.filter((w) => w.learned))

const formOpen = ref(false)
const editing = ref<VocabWord | null>(null)
function openAdd() {
  editing.value = null
  formOpen.value = true
}
function openEdit(w: VocabWord) {
  editing.value = w
  formOpen.value = true
}
const formInitial = computed<WordFormInput>(() => ({
  word: editing.value?.word ?? '',
  translation: editing.value?.translation ?? null,
  example: editing.value?.example ?? null,
  lang: editing.value?.lang || 'en',
  translateTo: 'ru',
}))

const saveError = ref('')
async function onSave(res: WordFormInput) {
  if (auth.value.status !== 'ready') return
  setLastLang(res.lang)
  try {
    if (editing.value) await editWord(editing.value, res)
    else await addWord(auth.value.userId, res)
    formOpen.value = false
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    const hint = /lang/i.test(msg) ? ' — ' + t('eng_lang_migration_hint') : ''
    saveError.value = t('dash_save_error_generic') + msg + hint
  }
}

async function onDelete(id: string) {
  if (!confirm(t('eng_confirm_delete'))) return
  try {
    await deleteWord(id)
  } catch (e) {
    saveError.value = t('dash_delete_error_generic') + (e instanceof Error ? e.message : String(e))
  }
}
</script>

<template>
  <AppShell :user-email="auth.status === 'ready' ? auth.userEmail : null" />
  <main class="mx-auto max-w-2xl px-4 pb-16 pt-6">
    <h1 class="mb-1 text-xl font-bold">{{ t('eng_h1') }}</h1>
    <p class="mb-4 text-sm" style="color: var(--text-dim)">{{ t('eng_intro') }}</p>

    <div v-if="auth.status === 'loading' || auth.status === 'redirecting'" class="text-sm" style="color: var(--text-dim)">
      {{ t('loading_ellipsis') }}
    </div>

    <template v-else>
      <p v-if="error" class="mb-3 text-sm" style="color: var(--text-dim)">{{ t('dash_save_error_generic') }}{{ error }}</p>
      <p v-if="saveError" class="mb-3 text-sm" style="color: var(--text-dim)">{{ saveError }}</p>

      <div v-if="filterChips.length" class="mb-3 flex flex-wrap gap-1.5">
        <button
          v-for="chip in filterChips"
          :key="chip.code"
          type="button"
          class="rounded-full border px-3 py-1 text-xs"
          :style="{
            borderColor: 'var(--border)',
            background: effectiveFilter === chip.code ? 'var(--accent)' : 'var(--bg-card)',
            color: effectiveFilter === chip.code ? 'var(--accent-text)' : 'var(--text)',
          }"
          @click="setFilter(chip.code)"
        >
          {{ chip.label }} · {{ chip.count }}
        </button>
      </div>

      <div class="mb-4 flex justify-between rounded-xl border p-4 text-sm" style="border-color: var(--border); background: var(--bg-card)">
        <div>{{ t('eng_learning_label') }} {{ activeWords.length }}</div>
        <div>{{ t('eng_learned_label') }} {{ doneWords.length }}</div>
        <div class="font-bold">{{ t('eng_total_label') }} {{ filteredWords.length }}</div>
      </div>

      <button
        type="button"
        class="mb-5 rounded-lg px-4 py-2 text-sm font-medium"
        style="background: var(--accent); color: var(--accent-text)"
        @click="openAdd"
      >
        {{ t('eng_add_word_btn') }}
      </button>

      <h3 class="mb-2 font-bold">{{ t('eng_learning_h3') }}</h3>
      <p v-if="activeWords.length === 0" class="mb-5 text-sm" style="color: var(--text-dim)">{{ t('eng_nothing_to_learn') }}</p>
      <div v-else class="mb-5 overflow-x-auto rounded-xl border" style="border-color: var(--border)">
        <table class="w-full text-sm">
          <tbody>
            <tr v-for="w in activeWords" :key="w.id" class="border-b last:border-0" style="border-color: var(--border)">
              <td class="w-[1%] px-3 py-2">
                <input type="checkbox" :checked="w.learned" @change="toggleLearned(w)" />
              </td>
              <td class="px-3 py-2 font-semibold">
                {{ w.word }}
                <span
                  v-if="effectiveFilter === 'all'"
                  class="ml-1.5 rounded-lg border px-1.5 py-0.5 align-middle text-[0.65em]"
                  style="border-color: var(--border); color: var(--text-dim)"
                  :title="langName(w.lang || 'en')"
                >
                  {{ (w.lang || 'en').toUpperCase() }}
                </span>
              </td>
              <td class="px-3 py-2">{{ w.translation || '—' }}</td>
              <td class="px-3 py-2 text-[0.85em]" style="color: var(--text-dim)">{{ w.example }}</td>
              <td class="whitespace-nowrap px-3 py-2 text-right">
                <button type="button" class="mr-1 rounded p-1" style="color: var(--text-dim)" @click="openEdit(w)">
                  <Icon name="edit" />
                </button>
                <button type="button" class="rounded p-1" style="color: var(--danger, #e05555)" @click="onDelete(w.id)">
                  <Icon name="trash" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 class="mb-2 font-bold">{{ t('eng_learned_h2') }}</h2>
      <p v-if="doneWords.length === 0" class="text-sm" style="color: var(--text-dim)">{{ t('eng_nothing_learned') }}</p>
      <div v-else class="overflow-x-auto rounded-xl border" style="border-color: var(--border)">
        <table class="w-full text-sm">
          <tbody>
            <tr v-for="w in doneWords" :key="w.id" class="border-b last:border-0" style="border-color: var(--border)">
              <td class="w-[1%] px-3 py-2">
                <input type="checkbox" :checked="w.learned" @change="toggleLearned(w)" />
              </td>
              <td class="px-3 py-2 font-semibold line-through" style="color: var(--text-dim)">
                {{ w.word }}
                <span
                  v-if="effectiveFilter === 'all'"
                  class="ml-1.5 rounded-lg border px-1.5 py-0.5 align-middle text-[0.65em] no-underline"
                  style="border-color: var(--border)"
                  :title="langName(w.lang || 'en')"
                >
                  {{ (w.lang || 'en').toUpperCase() }}
                </span>
              </td>
              <td class="px-3 py-2">{{ w.translation || '—' }}</td>
              <td class="px-3 py-2 text-[0.85em]" style="color: var(--text-dim)">{{ w.example }}</td>
              <td class="whitespace-nowrap px-3 py-2 text-right">
                <button type="button" class="mr-1 rounded p-1" style="color: var(--text-dim)" @click="openEdit(w)">
                  <Icon name="edit" />
                </button>
                <button type="button" class="rounded p-1" style="color: var(--danger, #e05555)" @click="onDelete(w.id)">
                  <Icon name="trash" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </main>

  <WordForm v-if="formOpen" :is-edit="!!editing" :initial="formInitial" @close="formOpen = false" @save="onSave" />
</template>
