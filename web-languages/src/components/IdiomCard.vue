<script setup lang="ts">
import { computed, ref } from 'vue'
import { getLang, t } from '../lib/i18n'
import { dayNumber, idiomOfDay, idiomToWord } from '../lib/idioms'
import { langName } from '../lib/vocab'

// «Идиома дня» (BACKLOG 44.7): вшитая подборка пословиц и идиом выбранного языка; «Другая» листает по кругу, «В мои слова» добавляет в словарь.
const props = defineProps<{ lang: string; have: ReadonlySet<string>; busy?: boolean }>()
const emit = defineEmits<{ add: [payload: { word: string; translation: string; example: string | null; lang: string }] }>()

const offset = ref(0)
const today = dayNumber(new Date())
const idiom = computed(() => idiomOfDay(props.lang, today, offset.value))
const uiLang = getLang()
const shown = computed(() => (idiom.value ? idiomToWord(idiom.value, uiLang) : null))
const added = computed(() => !!idiom.value && props.have.has(idiom.value.text.toLowerCase()))

function add() {
  if (!idiom.value || !shown.value || added.value) return
  emit('add', { ...shown.value, lang: props.lang })
}
</script>

<template>
  <section v-if="idiom && shown" class="idiom-card mb-4 rounded-xl border p-4" data-test="idiom-card" :aria-label="t('idiom_title')">
    <div class="idiom-head">
      <span class="idiom-title">{{ t('idiom_title') }} · {{ langName(lang) }}</span>
      <button type="button" class="idiom-other" data-test="idiom-next" @click="offset++">{{ t('idiom_next') }}</button>
    </div>
    <p class="idiom-text" data-test="idiom-text" :lang="lang">«{{ idiom.text }}»</p>
    <p class="idiom-tr" data-test="idiom-translation">{{ shown.translation }}</p>
    <p v-if="shown.example" class="idiom-ex">{{ shown.example }}</p>
    <button v-if="!added" type="button" class="idiom-add" data-test="idiom-add" :disabled="busy" @click="add">{{ t('idiom_add') }}</button>
    <span v-else class="idiom-have" data-test="idiom-have">✓ {{ t('idiom_have') }}</span>
  </section>
</template>

<style scoped>
.idiom-card {
  border-color: var(--border);
  background: var(--bg-card);
}
.idiom-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.idiom-other {
  background: transparent;
  border: 0;
  color: var(--accent);
  font-size: 0.8rem;
  text-transform: none;
  letter-spacing: 0;
  cursor: pointer;
}
.idiom-text {
  margin: 0.5rem 0 0.2rem;
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.3;
  color: var(--text);
}
.idiom-tr {
  margin: 0;
  color: var(--text);
}
.idiom-ex {
  margin: 0.25rem 0 0;
  font-size: 0.85rem;
  color: var(--text-dim);
}
.idiom-add {
  margin-top: 0.75rem;
  border: 1px solid var(--accent);
  color: var(--accent);
  background: transparent;
  border-radius: 0.6rem;
  padding: 0.3rem 0.8rem;
  font-weight: 600;
  cursor: pointer;
}
.idiom-add:disabled {
  opacity: 0.6;
  cursor: default;
}
.idiom-have {
  display: inline-block;
  margin-top: 0.75rem;
  font-size: 0.85rem;
  color: var(--text-dim);
}
</style>
