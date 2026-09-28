<script setup lang="ts">
import { ref } from 'vue'
import { t } from '../lib/i18n'
import { fmtRu } from '../lib/date'
import type { CarryCandidate } from '../lib/planned'

// Незавершённое за последние дни — портировано из openCarryOverModal() в dashboard.js:
// все пункты отмечены заранее, снимаешь галочки с тех, что переносить не нужно.
const props = defineProps<{ candidates: CarryCandidate[] }>()
const emit = defineEmits<{ close: []; add: [texts: string[]] }>()
const checked = ref<boolean[]>(props.candidates.map(() => true))

function submit() {
  emit('add', props.candidates.filter((_, i) => checked.value[i]).map((c) => c.text))
}
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal">
      <h3>{{ t('dash_planned_carry_over_title') }}</h3>
      <label v-for="(c, i) in candidates" :key="c.text" class="flex items-center gap-2 py-1" style="font-weight: normal; color: var(--text)" data-test="candidate">
        <input v-model="checked[i]" type="checkbox" />
        <span class="flex-1">{{ c.text }}</span>
        <span class="dim text-xs">{{ fmtRu(c.date) }}</span>
      </label>
      <div class="modal-actions">
        <button type="button" class="secondary" @click="emit('close')">{{ t('cancel') }}</button>
        <button type="button" data-test="add" @click="submit">{{ t('dash_planned_carry_over_add_btn') }}</button>
      </div>
    </div>
  </div>
</template>
