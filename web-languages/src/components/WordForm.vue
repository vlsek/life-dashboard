<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getLang, t } from '../lib/i18n'
import { autoTranslate, getLangFilter, getLastLang, translationTarget, VOCAB_LANGS } from '../lib/vocab'
import Icon from './Icon.vue'
import type { WordFormInput } from '../lib/types'

// Порт openWordModal() из english.js: выбор языка слова, выбор языка перевода (по
// умолчанию — язык интерфейса, или английский, если учишь именно его), поле слова с
// автопереводом по уходу с поля (и вручную по кнопке), пример использования.
const props = defineProps<{ isEdit: boolean; initial: WordFormInput }>()
const emit = defineEmits<{ close: []; save: [WordFormInput] }>()

const lang = ref(props.initial.lang)
const translateTo = ref(props.initial.translateTo)
const word = ref(props.initial.word)
const translation = ref(props.initial.translation || '')
const example = ref(props.initial.example || '')

const wordInput = ref<HTMLInputElement | null>(null)
onMounted(() => wordInput.value?.focus())

let autoFilled = false // чтобы не перетирать то, что человек уже сам поправил
const translating = ref(false)
const translateError = ref(false)

async function runTranslate() {
  if (!word.value.trim()) return
  translating.value = true
  translateError.value = false
  const result = await autoTranslate(word.value, lang.value, translateTo.value)
  translating.value = false
  if (result) {
    translation.value = result
    autoFilled = true
  } else {
    translateError.value = true
  }
}

function onLangChange() {
  translateTo.value = translationTarget(lang.value, getLang())
}
function onWordBlur() {
  if (!translation.value.trim() || autoFilled) runTranslate()
}
function onTranslationInput() {
  autoFilled = false
}

function onSubmit() {
  if (!word.value.trim()) return
  emit('save', {
    word: word.value.trim(),
    translation: translation.value.trim() || null,
    example: example.value.trim() || null,
    lang: lang.value,
    translateTo: translateTo.value,
  })
}

// Значения по умолчанию для новой записи, как в openWordModal(): язык — текущий фильтр,
// если он не "все", иначе последний использованный.
if (!props.isEdit) {
  const filterNow = getLangFilter()
  lang.value = filterNow !== 'all' ? filterNow : getLastLang()
  translateTo.value = translationTarget(lang.value, getLang())
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="emit('close')">
    <div class="w-full max-w-sm rounded-2xl border p-5" style="background: var(--bg-card); border-color: var(--border); color: var(--text)">
      <h3 class="mb-3 text-lg font-bold">{{ isEdit ? t('eng_edit_word') : t('eng_new_word') }}</h3>

      <form class="flex flex-col gap-3" @submit.prevent="onSubmit">
        <label class="flex flex-col gap-1 text-sm">
          {{ t('eng_field_lang') }}
          <select v-model="lang" class="modal-input" @change="onLangChange">
            <option v-for="[code, name] in VOCAB_LANGS" :key="code" :value="code">{{ name }}</option>
          </select>
        </label>

        <label class="flex flex-col gap-1 text-sm">
          {{ t('eng_field_translate_to') }}
          <select v-model="translateTo" class="modal-input">
            <option v-for="[code, name] in VOCAB_LANGS" :key="code" :value="code">{{ name }}</option>
          </select>
        </label>

        <label class="flex flex-col gap-1 text-sm">
          {{ t('eng_field_word') }}
          <input ref="wordInput" v-model="word" type="text" required class="modal-input" @blur="onWordBlur" />
        </label>

        <label class="flex flex-col gap-1 text-sm">
          {{ t('eng_field_translation') }}
          <div class="flex gap-1.5">
            <input v-model="translation" type="text" class="modal-input flex-1" @input="onTranslationInput" />
            <button
              type="button"
              :title="t('eng_translate_btn_title')"
              :disabled="translating"
              class="rounded-lg border px-2.5"
              style="border-color: var(--border); color: var(--text-dim)"
              :style="{ opacity: translating ? 0.5 : 1 }"
              @click="runTranslate"
            >
              <Icon name="refresh" />
            </button>
          </div>
          <p v-if="translateError" class="text-xs" style="color: var(--text-dim)">{{ t('eng_translate_error') }}</p>
        </label>

        <label class="flex flex-col gap-1 text-sm">
          {{ t('eng_field_example') }}
          <input v-model="example" type="text" class="modal-input" />
        </label>

        <div class="mt-2 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg border px-4 py-2 text-sm"
            style="border-color: var(--border); background: var(--bg); color: var(--text)"
            @click="emit('close')"
          >
            {{ t('cancel') }}
          </button>
          <button type="submit" class="rounded-lg px-4 py-2 text-sm" style="background: var(--accent); color: var(--accent-text)">
            {{ t('save') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.modal-input {
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  border-radius: 0.5rem;
  padding: 0.4rem 0.6rem;
}
</style>
