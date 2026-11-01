<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { t } from '../lib/i18n'
import type { QuickActionId } from '../lib/metricQuickActions'

// Полоса быстрых действий под плашкой метрики (BACKLOG 75.9). Не всплывающее меню: полоса лежит в потоке плашки, поэтому не нужно ни
// позиционирования, ни ловушки фокуса. Фокус уходит на первую кнопку, Esc закрывает. «Пропустить день» — в два шага: пропуск нельзя
// откатить из интерфейса, поэтому случайное касание не должно его записывать.
const props = defineProps<{ name: string; actions: QuickActionId[]; error?: string; busy?: boolean }>()
const emit = defineEmits<{ act: [QuickActionId]; close: [] }>()

const confirming = ref(false)
const root = ref<HTMLElement | null>(null)
const focusFirst = () => nextTick(() => root.value?.querySelector<HTMLElement>('button')?.focus())
onMounted(focusFirst)
function askSkip() {
  confirming.value = true
  focusFirst()
}
function cancelSkip() {
  confirming.value = false
  focusFirst()
}
void props
</script>

<template>
  <div ref="root" class="qa" role="group" :aria-label="t('qa_title') + ': ' + name" data-test="qa-strip" @keydown.esc.stop="emit('close')">
    <template v-if="!confirming">
      <button v-if="actions.includes('skip')" type="button" class="secondary" data-test="qa-skip" @click="askSkip">{{ t('qa_skip') }}</button>
      <button v-if="actions.includes('note')" type="button" class="secondary" data-test="qa-note" @click="emit('act', 'note')">{{ t('qa_note') }}</button>
      <button v-if="actions.includes('value')" type="button" class="secondary" data-test="qa-value" @click="emit('act', 'value')">{{ t('qa_value') }}</button>
      <button type="button" class="secondary qa-close" :aria-label="t('qa_close')" data-test="qa-close" @click="emit('close')">×</button>
    </template>
    <template v-else>
      <span class="qa-confirm" role="alert" data-test="qa-confirm">{{ t('qa_skip_confirm') }}</span>
      <button type="button" class="secondary" :disabled="busy" data-test="qa-skip-yes" @click="emit('act', 'skip')">{{ t('qa_skip_yes') }}</button>
      <button type="button" class="secondary" :disabled="busy" data-test="qa-skip-no" @click="cancelSkip">{{ t('qa_cancel') }}</button>
    </template>
    <p v-if="error" class="qa-error" role="alert" data-test="qa-error">{{ error }}</p>
  </div>
</template>

<style scoped>
.qa { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--border); }
.qa-confirm { flex: 1 1 100%; }
.qa-error { flex: 1 1 100%; margin: 0; color: var(--danger); }
.qa-close { margin-left: auto; }
</style>
