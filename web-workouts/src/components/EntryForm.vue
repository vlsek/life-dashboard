<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { t } from '../lib/i18n'
import { nowHHMM, todayStr } from '../lib/date'
import { cleanSets } from '../lib/workouts'
import Icon from './Icon.vue'
import type { EntryFormInput, Exercise, WorkoutEntry, WorkoutSet } from '../lib/types'

// Порт openEntryModal() из workouts.js: дата, динамический список подходов (повторы,
// вес, длительность, сторона Л/П, время), заметка. Новый подход для билатерального
// упражнения по умолчанию берёт противоположную сторону от предыдущего.
const props = defineProps<{ exercise: Exercise; existing: WorkoutEntry | null }>()
const emit = defineEmits<{ close: []; save: [EntryFormInput] }>()

function blankSet(): WorkoutSet {
  return { reps: null, weight: null, time: null, duration: null, side: null }
}

const date = ref(props.existing?.date ?? todayStr())
const notes = ref(props.existing?.notes ?? '')
const sets = ref<WorkoutSet[]>(props.existing?.sets?.length ? props.existing.sets.map((s) => ({ ...s })) : [blankSet()])

const dateInput = ref<HTMLInputElement | null>(null)
onMounted(() => dateInput.value?.focus())

function addSet() {
  const last = sets.value[sets.value.length - 1]
  const side = props.exercise.bilateral ? (last?.side === 'L' ? 'R' : last?.side === 'R' ? 'L' : 'L') : null
  sets.value.push({ reps: null, weight: null, time: nowHHMM(), duration: null, side })
}
function removeSet(i: number) {
  sets.value.splice(i, 1)
  if (sets.value.length === 0) sets.value.push(blankSet())
}
function toggleSide(s: WorkoutSet, side: 'L' | 'R') {
  s.side = s.side === side ? null : side
}

function onSubmit() {
  emit('save', { date: date.value || todayStr(), sets: cleanSets(sets.value), notes: notes.value.trim() || null })
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

          <div v-for="(s, i) in sets" :key="i" class="mb-1.5 flex flex-wrap items-center gap-1.5">
            <input
              v-model.number="s.reps"
              type="number"
              class="modal-input"
              :style="{ width: exercise.tracks_weight ? '80px' : '160px' }"
              :placeholder="exercise.tracks_weight ? t('workouts_reps_placeholder') : valueLabel()"
            />

            <div v-if="exercise.bilateral" class="flex overflow-hidden rounded-lg border" style="border-color: var(--border)">
              <button
                v-for="side in (['L', 'R'] as const)"
                :key="side"
                type="button"
                class="px-2.5 py-1.5 text-sm"
                :style="{
                  background: s.side === side ? 'var(--accent)' : 'var(--bg-card)',
                  color: s.side === side ? 'var(--accent-text)' : 'var(--text)',
                }"
                @click="toggleSide(s, side)"
              >
                {{ side === 'L' ? t('workouts_side_L') : t('workouts_side_R') }}
              </button>
            </div>

            <template v-if="exercise.tracks_duration">
              <span class="text-sm" style="color: var(--text-dim)">{{ t('workouts_duration_in') }}</span>
              <input
                v-model.number="s.duration"
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
                v-model.number="s.weight"
                type="number"
                step="0.5"
                class="modal-input"
                style="width: 110px"
                :placeholder="t('workouts_weight_placeholder') + ' (' + unitLabel() + ')'"
              />
            </template>

            <input v-model="s.time" type="time" class="modal-input" style="width: 96px" :title="t('sets_time_title')" />

            <button type="button" class="rounded-lg border px-2 py-1" style="border-color: var(--border); color: var(--danger, #e05555)" @click="removeSet(i)">
              <Icon name="x" />
            </button>
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
