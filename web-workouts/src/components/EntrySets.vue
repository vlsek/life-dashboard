<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../lib/i18n'
import { CELL_ORDER, toRows } from '../lib/sides'
import type { CellKey } from '../lib/sides'
import { defaultWeightUnit } from '../lib/weightUnit'
import { removeRowAt, setCellValue, setRowTime } from '../lib/entrySets'
import type { CellField } from '../lib/entrySets'
import type { Exercise, WorkoutSet } from '../lib/types'
import Icon from './Icon.vue'

// Подходы сегодняшней записи строками (BACKLOG 62.3, просьба владельца «сделать как на главной, чтобы при + подход новая строка»).
// Компонент ничего не сохраняет: на каждую правку отдаёт новый список подходов (`change`), родитель пишет в базу; «+ подход» — событие `add`.
const props = defineProps<{ exercise: Exercise; sets: WorkoutSet[]; busy?: boolean }>()
const emit = defineEmits<{ change: [sets: WorkoutSet[]]; add: [] }>()

const rows = computed(() => toRows(props.sets))
const keysOf = (i: number): CellKey[] => CELL_ORDER.filter((k) => rows.value[i].cells[k])
const sideLabel = (k: CellKey) => (k === 'L' ? t('workouts_side_L') : t('workouts_side_R'))
const showWeight = (i: number, k: CellKey) => props.exercise.tracks_weight || rows.value[i].cells[k]?.weight != null
const unitLabel = () => props.exercise.unit || defaultWeightUnit()
const valueLabel = () => props.exercise.value_label || t('workouts_default_value_label')

function onCell(i: number, k: CellKey, field: CellField, e: Event) {
  const input = e.target as HTMLInputElement
  const next = setCellValue(props.sets, i, k, field, input.value)
  if (next) emit('change', next)
  else input.value = String(rows.value[i].cells[k]?.[field] ?? '') // пустые повторы или мусор — возвращаем прежнее значение
}
function onTime(i: number, e: Event) {
  const next = setRowTime(props.sets, i, (e.target as HTMLInputElement).value)
  if (next) emit('change', next)
}
function onRemove(i: number) {
  const next = removeRowAt(props.sets, i)
  if (next) emit('change', next)
}
</script>

<template>
  <div class="mt-1" data-testid="entry-sets">
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <tbody>
          <tr v-for="(_, i) in rows" :key="i" class="align-middle" data-testid="entry-set-row">
            <td class="pr-1.5" style="color: var(--text-dim)">{{ i + 1 }}</td>
            <td class="pr-1.5 pb-1">
              <input type="time" :value="rows[i].time ?? ''" :title="t('sets_time_title')" class="es-input" style="width: 96px" data-testid="entry-set-time" @change="onTime(i, $event)" />
            </td>
            <td class="pr-1.5 pb-1">
              <div v-for="k in keysOf(i)" :key="k" class="mb-1 flex flex-wrap items-center gap-1.5 last:mb-0">
                <span v-if="k !== 'P'" class="w-12 text-xs" style="color: var(--text-dim)">{{ sideLabel(k) }}</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  inputmode="decimal"
                  :value="rows[i].cells[k]!.reps ?? ''"
                  :placeholder="exercise.tracks_weight ? t('workouts_reps_placeholder') : valueLabel()"
                  class="es-input"
                  :style="{ width: exercise.tracks_weight ? '70px' : '110px' }"
                  data-testid="entry-set-reps"
                  @change="onCell(i, k, 'reps', $event)"
                />
                <template v-if="exercise.tracks_duration">
                  <input type="number" step="any" min="0" inputmode="decimal" :value="rows[i].cells[k]!.duration ?? ''" :placeholder="t('workouts_duration_placeholder')" class="es-input" style="width: 70px" data-testid="entry-set-duration" @change="onCell(i, k, 'duration', $event)" />
                </template>
                <template v-if="showWeight(i, k)">
                  <span style="color: var(--text-dim)">{{ exercise.tracks_weight ? '×' : '+' }}</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    inputmode="decimal"
                    :value="rows[i].cells[k]!.weight ?? ''"
                    :placeholder="(exercise.tracks_weight ? t('workouts_weight_placeholder') : t('workouts_extra_weight_placeholder')) + ' (' + unitLabel() + ')'"
                    class="es-input"
                    style="width: 100px"
                    data-testid="entry-set-weight"
                    @change="onCell(i, k, 'weight', $event)"
                  />
                </template>
              </div>
            </td>
            <td class="pb-1 text-right">
              <button
                v-if="rows.length > 1"
                type="button"
                class="rounded-lg border px-2 py-1"
                style="border-color: var(--border); color: var(--danger, #e05555)"
                :disabled="busy"
                :aria-label="t('workouts_set_remove_aria')"
                data-testid="entry-set-remove"
                @click="onRemove(i)"
              >
                <Icon name="x" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <button
      type="button"
      class="mt-1 rounded-lg border px-2.5 py-1 text-xs"
      style="border-color: var(--border); background: var(--bg); color: var(--text)"
      :disabled="busy"
      :aria-label="t('workouts_quick_add_set_aria')"
      data-testid="quick-add-set"
      @click="emit('add')"
    >
      {{ t('workouts_quick_add_set') }}
    </button>
  </div>
</template>

<style scoped>
.es-input {
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  border-radius: 0.5rem;
  padding: 0.3rem 0.5rem;
}
</style>
