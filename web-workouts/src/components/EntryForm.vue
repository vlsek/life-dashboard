<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { t } from '../lib/i18n'
import { nowHHMM, todayStr } from '../lib/date'
import { cleanSets } from '../lib/workouts'
import { CELL_ORDER, blankRow, fromRows, toRows } from '../lib/sides'
import type { CellKey, SetRow } from '../lib/sides'
import Icon from './Icon.vue'
import type { EntryFormInput, Exercise, WorkoutEntry } from '../lib/types'

// Порт openEntryModal() из workouts.js: дата, динамический список подходов (повторы,
// вес, длительность, время), заметка. Для билатеральных упражнений левая и правая сторона —
// ОДНА строка с двумя ячейками (в базе это по-прежнему два подхода со стороной L/R, см. lib/sides.ts).
const props = defineProps<{ exercise: Exercise; existing: WorkoutEntry | null }>()
const emit = defineEmits<{ close: []; save: [EntryFormInput] }>()

const date = ref(props.existing?.date ?? todayStr())
const notes = ref(props.existing?.notes ?? '')
const rows = ref<SetRow[]>(props.existing?.sets?.length ? toRows(props.existing.sets) : [blankRow(!!props.exercise.bilateral, nowHHMM())])

// «Утяжеление»: у упражнений с собственным весом доп. вес необязателен и включается галочкой.
// Если в существующей записи уже есть доп. вес — галочка стоит сразу.
const weighted = ref(
  !props.exercise.tracks_weight &&
    rows.value.some((r) => CELL_ORDER.some((k) => r.cells[k] && r.cells[k]!.weight != null && (r.cells[k]!.weight as unknown) !== '')),
)
const showWeight = () => props.exercise.tracks_weight || weighted.value

const dateInput = ref<HTMLInputElement | null>(null)
onMounted(() => dateInput.value?.focus())

function addSet() {
  rows.value.push(blankRow(!!props.exercise.bilateral, nowHHMM()))
}
function removeRow(i: number) {
  rows.value.splice(i, 1)
  if (rows.value.length === 0) rows.value.push(blankRow(!!props.exercise.bilateral))
}
const keysOf = (row: SetRow): CellKey[] => CELL_ORDER.filter((k) => row.cells[k])
const sideLabel = (k: CellKey) => (k === 'L' ? t('workouts_side_L') : t('workouts_side_R'))

function onSubmit() {
  // Без галочки «Утяжеление» доп. вес не сохраняем (иначе остался бы скрытый вес от прошлого включения).
  if (!showWeight()) rows.value.forEach((r) => CELL_ORDER.forEach((k) => r.cells[k] && (r.cells[k]!.weight = null)))
  emit('save', { date: date.value || todayStr(), sets: cleanSets(fromRows(rows.value)), notes: notes.value.trim() || null })
}

const valueLabel = () => props.exercise.value_label || t('workouts_default_value_label')
const unitLabel = () => props.exercise.unit || t('workouts_default_unit')
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="emit('close')">
    <div class="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border p-5" style="background: var(--bg-card); border-color: var(--border); color: var(--text)">
      <h3 class="mb-3 text-lg font-bold">
        {{ existing ? t('workouts_edit_entry') : t('workouts_new_entry') }} — {{ exercise.name }}
      </h3>

      <form class="flex flex-col gap-3" @submit.prevent="onSubmit">
        <label class="flex flex-col gap-1 text-sm">
          {{ t('workouts_field_date') }}
          <input ref="dateInput" v-model="date" type="date" :max="todayStr()" class="modal-input" />
        </label>

        <div>
          <div class="mb-1.5 text-sm" style="color: var(--text-dim)">
            {{ exercise.tracks_weight ? t('workouts_sets_label') : valueLabel() }}
          </div>

          <label v-if="!exercise.tracks_weight" class="mb-2 flex items-center gap-2 text-sm">
            <input v-model="weighted" type="checkbox" style="accent-color: var(--accent)" />
            {{ t('workouts_weighted_label') }}
          </label>

          <div
            v-for="(row, i) in rows"
            :key="i"
            class="mb-1.5"
            :class="keysOf(row).length > 1 ? 'flex flex-col gap-1.5 rounded-lg border p-2' : 'flex flex-wrap items-center gap-1.5'"
            :style="keysOf(row).length > 1 ? 'border-color: var(--border)' : ''"
            data-testid="set-row"
          >
            <div
              v-for="key in keysOf(row)"
              :key="key"
              :class="keysOf(row).length > 1 ? 'flex flex-wrap items-center gap-1.5' : 'contents'"
            >
              <span v-if="key !== 'P'" class="w-14 text-sm font-medium" style="color: var(--text-dim)">{{ sideLabel(key) }}</span>

              <input
                v-model.number="row.cells[key]!.reps"
                type="number"
                class="modal-input"
                :style="{ width: exercise.tracks_weight ? '80px' : '160px' }"
                :placeholder="exercise.tracks_weight ? t('workouts_reps_placeholder') : valueLabel()"
              />

              <template v-if="exercise.tracks_duration">
                <span class="text-sm" style="color: var(--text-dim)">{{ t('workouts_duration_in') }}</span>
                <input
                  v-model.number="row.cells[key]!.duration"
                  type="number"
                  min="0"
                  class="modal-input"
                  style="width: 90px"
                  :placeholder="t('workouts_duration_placeholder')"
                />
              </template>

              <template v-if="exercise.tracks_weight">
                <span class="text-sm" style="color: var(--text-dim)">×</span>
                <input
                  v-model.number="row.cells[key]!.weight"
                  type="number"
                  step="0.5"
                  class="modal-input"
                  style="width: 110px"
                  :placeholder="t('workouts_weight_placeholder') + ' (' + unitLabel() + ')'"
                />
              </template>
              <template v-else-if="weighted">
                <span class="text-sm" style="color: var(--text-dim)">+</span>
                <input
                  v-model.number="row.cells[key]!.weight"
                  type="number"
                  min="0"
                  step="0.5"
                  class="modal-input"
                  style="width: 110px"
                  :placeholder="t('workouts_extra_weight_placeholder') + ' (' + t('workouts_default_unit') + ')'"
                />
              </template>
            </div>

            <div class="flex items-center gap-1.5">
              <input v-model="row.time" type="time" class="modal-input" style="width: 96px" :title="t('sets_time_title')" />
              <button type="button" class="rounded-lg border px-2 py-1" style="border-color: var(--border); color: var(--danger, #e05555)" @click="removeRow(i)">
                <Icon name="x" />
              </button>
            </div>
          </div>

          <button
            type="button"
            class="mt-1 rounded-lg border px-3 py-1.5 text-sm"
            style="border-color: var(--border); background: var(--bg); color: var(--text)"
            @click="addSet"
          >
            {{ t('workouts_add_set_btn') }}
          </button>
        </div>

        <label class="flex flex-col gap-1 text-sm">
          {{ t('workouts_field_notes') }}
          <input v-model="notes" type="text" class="modal-input" />
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
