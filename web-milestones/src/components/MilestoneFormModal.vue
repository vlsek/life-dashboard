<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { todayStr } from '../lib/date'
import { t } from '../lib/i18n'
import type { IntervalUnit, Milestone, MilestoneFormInput } from '../lib/types'

const props = defineProps<{ existing: Milestone | null }>()
const emit = defineEmits<{ submit: [MilestoneFormInput]; close: [] }>()

// Поля 1:1 с openMilestoneForm() в milestones.js.
const name = ref(props.existing?.name ?? '')
const category = ref(props.existing?.category ?? '')
const last_date = ref(props.existing?.last_date ?? '')
const interval_value = ref(props.existing?.interval_value ?? 0)
const interval_unit = ref<IntervalUnit>(props.existing?.interval_unit ?? 'month')
const due_date = ref(props.existing?.due_date ?? '')
const last_km = ref(props.existing?.last_km ?? 0)
const interval_km = ref(props.existing?.interval_km ?? 0)
const note = ref(props.existing?.note ?? '')

const today = todayStr()
const nameInput = ref<HTMLInputElement | null>(null)
onMounted(() => nameInput.value?.focus())

const units: IntervalUnit[] = ['day', 'week', 'month', 'year']
const unitLabel: Record<IntervalUnit, string> = {
  day: t('ms_unit_day'),
  week: t('ms_unit_week'),
  month: t('ms_unit_month'),
  year: t('ms_unit_year'),
}

function onSubmit() {
  if (!name.value.trim()) return
  const res: MilestoneFormInput = {
    name: name.value,
    category: category.value,
    last_date: last_date.value,
    interval_value: Number(interval_value.value) || 0,
    interval_unit: interval_unit.value,
    due_date: due_date.value,
    last_km: Number(last_km.value) || 0,
    interval_km: Number(interval_km.value) || 0,
    note: note.value,
  }
  emit('submit', res)
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="emit('close')">
    <div class="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border p-5" style="background: var(--bg-card); border-color: var(--border); color: var(--text)">
      <h3 class="mb-3 text-lg font-bold">{{ existing ? t('ms_edit_title') : t('ms_new_title') }}</h3>

      <form class="flex flex-col gap-3" @submit.prevent="onSubmit">
        <label class="flex flex-col gap-1 text-sm">
          {{ t('ms_field_name') }}
          <input ref="nameInput" v-model="name" type="text" required class="modal-input" />
        </label>

        <label class="flex flex-col gap-1 text-sm">
          {{ t('ms_field_category') }}
          <input v-model="category" type="text" class="modal-input" />
        </label>

        <label class="flex flex-col gap-1 text-sm">
          {{ t('ms_field_last_date') }}
          <input v-model="last_date" type="date" :max="today" class="modal-input" />
        </label>

        <div class="grid grid-cols-2 gap-3">
          <label class="flex flex-col gap-1 text-sm">
            {{ t('ms_field_interval') }}
            <input v-model.number="interval_value" type="number" min="0" class="modal-input" />
          </label>
          <label class="flex flex-col gap-1 text-sm">
            {{ t('ms_field_unit') }}
            <select v-model="interval_unit" class="modal-input">
              <option v-for="u in units" :key="u" :value="u">{{ unitLabel[u] }}</option>
            </select>
          </label>
        </div>

        <label class="flex flex-col gap-1 text-sm">
          {{ t('ms_field_due') }}
          <input v-model="due_date" type="date" class="modal-input" />
        </label>

        <div class="grid grid-cols-2 gap-3">
          <label class="flex flex-col gap-1 text-sm">
            {{ t('ms_field_last_km') }}
            <input v-model.number="last_km" type="number" min="0" class="modal-input" />
          </label>
          <label class="flex flex-col gap-1 text-sm">
            {{ t('ms_field_interval_km') }}
            <input v-model.number="interval_km" type="number" min="0" class="modal-input" />
          </label>
        </div>

        <label class="flex flex-col gap-1 text-sm">
          {{ t('ms_field_note') }}
          <input v-model="note" type="text" class="modal-input" />
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
          <button
            type="submit"
            class="rounded-lg px-4 py-2 text-sm"
            style="background: var(--accent); color: var(--accent-text)"
          >
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
