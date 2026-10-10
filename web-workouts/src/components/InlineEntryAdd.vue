<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { t } from '../lib/i18n'
import { nowHHMM, todayStr } from '../lib/date'
import { defaultWeightUnit } from '../lib/weightUnit'
import { blankInlineForm, buildInlineEntry, inlineFields } from '../lib/inlineEntry'
import type { EntryFormInput, Exercise } from '../lib/types'

// Встроенная строка «Добавить запись» в карточке упражнения (BACKLOG 44.5ж): повторы / вес / длительность на сегодня, время подставляется.
// Окно (EntryForm) остаётся для «Подробно…»: другая дата, несколько подходов, заметка.
const props = defineProps<{ exercise: Exercise }>()
const emit = defineEmits<{ save: [EntryFormInput, (ok: boolean) => void]; detail: []; cancel: [] }>()

const form = ref(blankInlineForm())
const busy = ref(false)
const fields = inlineFields(props.exercise)
const repsInput = ref<HTMLInputElement | null>(null)
onMounted(() => repsInput.value?.focus())

const valueLabel = () => props.exercise.value_label || t('workouts_default_value_label')
const unitLabel = () => props.exercise.unit || defaultWeightUnit()

function onSubmit() {
  if (busy.value) return
  const res = buildInlineEntry(props.exercise, form.value, todayStr(), nowHHMM())
  if (!res) return
  busy.value = true
  emit('save', res, (ok) => {
    busy.value = false
    if (ok) form.value = blankInlineForm()
  })
}
</script>

<template>
  <form class="mb-2 flex flex-wrap items-center gap-1.5 rounded-lg border p-2" style="border-color: var(--border); background: var(--bg)" data-testid="inline-entry" @submit.prevent="onSubmit" @keydown.esc="emit('cancel')">
    <input
      ref="repsInput"
      v-model.number="form.reps"
      type="number"
      inputmode="decimal"
      class="inline-input"
      :style="{ width: exercise.tracks_weight ? '80px' : '150px' }"
      :placeholder="exercise.tracks_weight ? t('workouts_reps_placeholder') : valueLabel()"
      data-testid="inline-reps"
    />
    <template v-if="fields.duration">
      <span class="text-sm" style="color: var(--text-dim)">{{ t('workouts_duration_in') }}</span>
      <input v-model.number="form.duration" type="number" min="0" inputmode="decimal" class="inline-input" style="width: 90px" :placeholder="t('workouts_duration_placeholder')" data-testid="inline-duration" />
    </template>
    <template v-if="fields.weight">
      <span class="text-sm" style="color: var(--text-dim)">×</span>
      <input v-model.number="form.weight" type="number" step="0.5" inputmode="decimal" class="inline-input" style="width: 100px" :placeholder="t('workouts_weight_placeholder') + ' (' + unitLabel() + ')'" data-testid="inline-weight" />
    </template>
    <button type="submit" class="rounded-lg px-3 py-1.5 text-sm" style="background: var(--accent); color: var(--accent-text)" :disabled="busy" data-testid="inline-save">
      {{ t('workouts_inline_add') }}
    </button>
    <button type="button" class="rounded-lg border px-2.5 py-1.5 text-sm" style="border-color: var(--border); background: var(--bg); color: var(--text-dim)" data-testid="inline-detail" @click="emit('detail')">
      {{ t('workouts_inline_detail') }}
    </button>
    <button type="button" class="rounded-lg border px-2.5 py-1.5 text-sm" style="border-color: var(--border); background: var(--bg); color: var(--text-dim)" :aria-label="t('cancel')" data-testid="inline-cancel" @click="emit('cancel')">✕</button>
  </form>
</template>

<style scoped>
.inline-input {
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text);
  border-radius: 0.5rem;
  padding: 0.4rem 0.6rem;
}
</style>
