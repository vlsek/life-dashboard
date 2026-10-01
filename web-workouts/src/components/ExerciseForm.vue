<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { t } from '../lib/i18n'
import { defaultWeightUnit, isWeightUnit, rememberWeightUnit } from '../lib/weightUnit'
import Icon from './Icon.vue'
import type { Exercise, ExerciseFormInput } from '../lib/types'

// Порт openExerciseFormModal() из workouts.js: имя, категория (фиксированный список +
// "своя категория" текстом), вести вес да/нет, подпись значения, единица, доп. флаги
// длительности и билатеральности (Л/П).
const props = defineProps<{ existing: Exercise | null }>()
const emit = defineEmits<{ close: []; save: [ExerciseFormInput] }>()

const KNOWN_CATS = ['upper', 'lower', 'fullbody', 'custom']
const currentCat = props.existing?.category ?? ''
const isLegacyCustom = !!currentCat && !KNOWN_CATS.includes(currentCat)

const name = ref(props.existing?.name ?? '')
const catSelect = ref(isLegacyCustom ? '__new__' : currentCat)
const newCatName = ref(isLegacyCustom ? currentCat : '')
const tracksWeight = ref<'yes' | 'no'>((props.existing?.tracks_weight ?? true) ? 'yes' : 'no')
const valueLabel = ref(props.existing?.value_label ?? t('workouts_default_value_label'))
// Единица веса (BACKLOG 18): у упражнения с весом по умолчанию «кг» (или последняя выбранная — запоминается), показана текстом,
// сменить можно карандашиком. У упражнения без веса единицу не спрашиваем и не пишем (см. lib/weightUnit.ts).
const OTHER = '__other__'
const startUnit = props.existing?.unit && isWeightUnit(props.existing.unit) ? props.existing.unit : props.existing?.tracks_weight === false ? defaultWeightUnit() : props.existing?.unit || defaultWeightUnit()
const unitPresets = Array.from(new Set([t('workouts_default_unit'), 'lb', startUnit]))
const editingUnit = ref(false)
const unitChoice = ref(unitPresets.includes(startUnit) ? startUnit : OTHER)
const customUnit = ref(unitPresets.includes(startUnit) ? '' : startUnit)
const chosenUnit = computed(() => (unitChoice.value === OTHER ? customUnit.value.trim() : unitChoice.value) || defaultWeightUnit())
const tracksDuration = ref(props.existing?.tracks_duration ?? false)
const bilateral = ref(props.existing?.bilateral ?? false)

const showNewCatInput = computed(() => catSelect.value === '__new__')

const nameInput = ref<HTMLInputElement | null>(null)
onMounted(() => nameInput.value?.focus())

function onSubmit() {
  if (!name.value.trim()) return
  const category = catSelect.value === '__new__' ? newCatName.value.trim() : catSelect.value
  // Без веса единицу веса не пишем (остаётся только прежняя НЕвесовая единица, если была); с весом — выбранная, и запоминаем её.
  const keptRepUnit = props.existing?.unit && !isWeightUnit(props.existing.unit) ? props.existing.unit : ''
  const unitOut = tracksWeight.value === 'yes' ? chosenUnit.value : keptRepUnit
  if (tracksWeight.value === 'yes') rememberWeightUnit(unitOut)
  emit('save', {
    name: name.value.trim(),
    category,
    tracks_weight: tracksWeight.value,
    value_label: valueLabel.value,
    unit: unitOut,
    tracks_duration: tracksDuration.value,
    bilateral: bilateral.value,
  })
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="emit('close')">
    <div class="w-full max-w-sm rounded-2xl border p-5" style="background: var(--bg-card); border-color: var(--border); color: var(--text)">
      <h3 class="mb-3 text-lg font-bold">{{ existing ? t('workouts_edit_exercise') : t('workouts_new_exercise') }}</h3>

      <form class="flex flex-col gap-3" @submit.prevent="onSubmit">
        <label class="flex flex-col gap-1 text-sm">
          {{ t('workouts_field_name') }}
          <input ref="nameInput" v-model="name" type="text" required class="modal-input" />
        </label>

        <label class="flex flex-col gap-1 text-sm">
          {{ t('workouts_field_category') }}
          <select v-model="catSelect" class="modal-input">
            <option value="">{{ t('workouts_cat_none') }}</option>
            <option value="upper">{{ t('workouts_cat_upper') }}</option>
            <option value="lower">{{ t('workouts_cat_lower') }}</option>
            <option value="fullbody">{{ t('workouts_cat_fullbody') }}</option>
            <option value="custom">{{ t('workouts_cat_custom') }}</option>
            <option value="__new__">{{ t('workouts_cat_add_new') }}</option>
          </select>
        </label>
        <label v-if="showNewCatInput" class="flex flex-col gap-1 text-sm">
          {{ t('workouts_cat_new_name_label') }}
          <input v-model="newCatName" type="text" class="modal-input" />
        </label>

        <label class="flex flex-col gap-1 text-sm">
          {{ t('workouts_field_tracks_weight') }}
          <select v-model="tracksWeight" class="modal-input">
            <option value="yes">{{ t('workouts_tracks_weight_yes') }}</option>
            <option value="no">{{ t('workouts_tracks_weight_no') }}</option>
          </select>
        </label>

        <label class="flex flex-col gap-1 text-sm">
          {{ t('workouts_field_value_label') }}
          <input v-model="valueLabel" type="text" class="modal-input" />
        </label>

        <label class="flex items-center gap-2 text-sm">
          <input v-model="tracksDuration" type="checkbox" />
          {{ t('workouts_field_tracks_duration') }}
        </label>
        <p class="-mt-2 text-xs" style="color: var(--text-dim)">{{ t('workouts_field_tracks_duration_hint') }}</p>

        <label class="flex items-center gap-2 text-sm">
          <input v-model="bilateral" type="checkbox" />
          {{ t('workouts_field_bilateral') }}
        </label>
        <p class="-mt-2 text-xs" style="color: var(--text-dim)">{{ t('workouts_field_bilateral_hint') }}</p>

        <div v-if="tracksWeight === 'yes'" class="flex flex-col gap-1 text-sm" data-testid="unit-row">
          {{ t('workouts_weight_unit_label') }}
          <div v-if="!editingUnit" class="flex items-center gap-2">
            <span class="font-medium" data-testid="unit-value">{{ chosenUnit }}</span>
            <button
              type="button"
              class="rounded-lg border px-2 py-1"
              style="border-color: var(--border); background: var(--bg); color: var(--text)"
              :title="t('workouts_weight_unit_edit')"
              :aria-label="t('workouts_weight_unit_edit')"
              data-testid="unit-edit"
              @click="editingUnit = true"
            >
              <Icon name="edit" />
            </button>
          </div>
          <div v-else class="flex flex-wrap items-center gap-2">
            <select v-model="unitChoice" class="modal-input" data-testid="unit-select">
              <option v-for="u in unitPresets" :key="u" :value="u">{{ u }}</option>
              <option :value="OTHER">{{ t('workouts_weight_unit_other') }}</option>
            </select>
            <input v-if="unitChoice === OTHER" v-model="customUnit" type="text" maxlength="8" class="modal-input" style="width: 96px" data-testid="unit-custom" />
          </div>
        </div>
        <p v-else class="-mt-1 text-xs" style="color: var(--text-dim)" data-testid="unit-no-weight-hint">{{ t('workouts_reps_no_weight_hint') }}</p>

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
