<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useVocab } from './lib/useVocab'
import { addableLangs, buildTabs, getLangFilter, getSavedTabs, langName, resolveActiveTab, setLangFilter, setLastLang, setSavedTabs } from './lib/vocab'
import { t } from './lib/i18n'
import AppShell from './components/AppShell.vue'
import WordForm from './components/WordForm.vue'
import DictionaryTabs from './components/DictionaryTabs.vue'
import IdiomCard from './components/IdiomCard.vue'
import ProgressRing from './components/ProgressRing.vue'
import { hasIdioms } from './lib/idioms'
import Icon from './components/Icon.vue'
import type { VocabWord, WordFormInput } from './lib/types'
import EmojiText from './components/EmojiText.vue'
import { confirmDialog } from './lib/confirmDialog'
import { errMsg } from './lib/errMsg'
import { friendlyError } from './lib/friendlyError'

const { auth, words, error, addWord, editWord, deleteWord, toggleLearned } = useVocab()

const filter = ref(getLangFilter())
function setFilter(code: string) {
  filter.value = code
  setLangFilter(code)
}

// Вкладки-словари: по одному на язык (BACKLOG 14). Порядок и пустые вкладки помним в localStorage.
const savedTabs = ref(getSavedTabs())
const tabs = computed(() => buildTabs(words.value, savedTabs.value))
// Когда слова появляются в языке, которого нет в сохранённом порядке, закрепляем его место — порядок не прыгает.
// Пока слова ещё не загрузились, ничего не пишем, чтобы не затереть сохранённые пустые вкладки.
watch(tabs, (list) => {
  if (auth.value.status !== 'ready') return
  const codes = list.map((tab) => tab.code)
  if (codes.length !== savedTabs.value.length || codes.some((c, i) => c !== savedTabs.value[i])) {
    savedTabs.value = codes
    setSavedTabs(codes)
  }
})
const effectiveFilter = computed(() => resolveActiveTab(filter.value, tabs.value))
const addable = computed(() => addableLangs(tabs.value))

function onAddTab(code: string) {
  if (!savedTabs.value.includes(code)) {
    savedTabs.value = [...savedTabs.value, code]
    setSavedTabs(savedTabs.value)
  }
  setFilter(code)
}
function onRemoveTab(code: string) {
  // Удалить можно только пустой словарь — слова не пропадают.
  if (tabs.value.find((tab) => tab.code === code)?.count) return
  savedTabs.value = savedTabs.value.filter((c) => c !== code)
  setSavedTabs(savedTabs.value)
  setFilter('all')
}

const filteredWords = computed(() =>
  words.value.filter((w) => effectiveFilter.value === 'all' || (w.lang || 'en') === effectiveFilter.value),
)
const activeWords = computed(() => filteredWords.value.filter((w) => !w.learned))
const doneWords = computed(() => filteredWords.value.filter((w) => w.learned))
const learnedPercent = computed(() => (filteredWords.value.length ? (doneWords.value.length / filteredWords.value.length) * 100 : 0))

// «Идиома дня» (44.7): на вкладке языка с подборкой — для него; на «Все» — для первого языка из вкладок, у которого она есть (иначе английский).
const idiomLang = computed(() => {
  if (effectiveFilter.value !== 'all') return hasIdioms(effectiveFilter.value) ? effectiveFilter.value : null
  return tabs.value.map((tab) => tab.code).find(hasIdioms) ?? 'en'
})
const haveIdioms = computed(() => new Set(words.value.filter((w) => (w.lang || 'en') === idiomLang.value).map((w) => w.word.trim().toLowerCase())))
async function onAddIdiom(p: { word: string; translation: string; example: string | null; lang: string }) {
  if (auth.value.status !== 'ready') return
  setLastLang(p.lang)
  try {
    await addWord(auth.value.userId, { word: p.word, translation: p.translation, example: p.example, lang: p.lang, translateTo: 'ru' })
  } catch (e) {
    saveError.value = friendlyError(e, 'save')
  }
}

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
    const hint = /lang/i.test(errMsg(e)) ? ' — ' + t('eng_lang_migration_hint') : '' // подсказка про миграцию — по сырому тексту, сам он не показывается
    saveError.value = friendlyError(e, 'save') + hint
  }
}

async function onDelete(id: string) {
  if (!(await confirmDialog(t('eng_confirm_delete')))) return
  try {
    await deleteWord(id)
  } catch (e) {
    saveError.value = friendlyError(e, 'delete')
  }
}
</script>

<template>
  <AppShell :user-email="auth.status === 'ready' ? auth.userEmail : null" />
  <main class="mx-auto max-w-2xl px-4 pb-16 pt-6">
    <h1 class="mb-1 text-xl font-bold"><EmojiText :text="t('eng_h1')" /></h1>
    <p class="mb-4 text-sm" style="color: var(--text-dim)">{{ t('eng_intro') }}</p>

    <div v-if="auth.status === 'loading' || auth.status === 'redirecting'" class="text-sm" style="color: var(--text-dim)">
      {{ t('loading_ellipsis') }}
    </div>

    <template v-else>
      <p v-if="error" class="mb-3 text-sm" style="color: var(--text-dim)">{{ t('dash_save_error_generic') }}{{ error }}</p>
      <p v-if="saveError" class="mb-3 text-sm" style="color: var(--text-dim)">{{ saveError }}</p>

      <DictionaryTabs
        :tabs="tabs"
        :active="effectiveFilter"
        :total-count="words.length"
        :addable="addable"
        @select="setFilter"
        @add="onAddTab"
        @remove="onRemoveTab"
      />
      <IdiomCard v-if="idiomLang" :lang="idiomLang" :have="haveIdioms" @add="onAddIdiom" />
      <p v-if="effectiveFilter !== 'all' && filteredWords.length === 0" class="mb-3 text-sm" style="color: var(--text-dim)" data-test="dictionary-empty">
        {{ t('eng_tab_empty') }}
      </p>

      <div class="mb-4 flex items-center gap-4 rounded-xl border p-4 text-sm" style="border-color: var(--border); background: var(--bg-card)" data-test="learn-stats">
        <ProgressRing :percent="learnedPercent" :size="64" :label="t('eng_learned_label')" />
        <div class="flex flex-1 flex-wrap justify-between gap-x-4 gap-y-1">
          <div><EmojiText :text="t('eng_learning_label')" /> {{ activeWords.length }}</div>
          <div><EmojiText :text="t('eng_learned_label')" /> {{ doneWords.length }}</div>
          <div class="font-bold">{{ t('eng_total_label') }} {{ filteredWords.length }}</div>
        </div>
      </div>

      <button
        type="button"
        class="mb-5 rounded-lg px-4 py-2 text-sm font-medium"
        style="background: var(--accent); color: var(--accent-text)"
        @click="openAdd"
      >
        <EmojiText :text="t('eng_add_word_btn')" />
      </button>

      <h3 class="mb-2 font-bold"><EmojiText :text="t('eng_learning_h3')" /></h3>
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

      <h2 class="mb-2 font-bold"><EmojiText :text="t('eng_learned_h2')" /></h2>
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
