<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { t, type DictKey } from '../lib/i18n'
import { MUSCLE_IDS, getMuscleOverride, ruleForExercise, type MuscleId } from '../lib/muscles'
import { defaultWeightUnit, isWeightUnit, rememberWeightUnit } from '../lib/weightUnit'
import { valueLabelOptions } from '../lib/valueLabels'
import Icon from './Icon.vue'
import type { Exercise, ExerciseFormInput } from '../lib/types'
import { stripEmoji } from '../lib/emojiText'
import { capFirst } from '../lib/exerciseNames'
import { VARIANT_BASES, applyVariant, baseForName, baseName, detectVariant, typicalDefaults, variantText } from '../lib/exerciseVariants'
import { getLang } from '../lib/i18n'

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
// «Что считаем?» (BACKLOG 18): выбор из списка (повторения, секунды, минуты, км, метры, раунды) + «Другое…» со своим словом.
// Текущее значение упражнения, если его нет среди готовых, остаётся отдельным пунктом списка.
const OTHER_LABEL = '__other__'
const startLabel = props.existing?.value_label?.trim() || t('workouts_default_value_label')
const labelOptions = valueLabelOptions(startLabel)
const labelChoice = ref(startLabel)
const customLabel = ref('')
const chosenLabel = computed(() => (labelChoice.value === OTHER_LABEL ? customLabel.value.trim() : labelChoice.value) || t('workouts_default_value_label'))
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
// Группы мышц (BACKLOG 22 «12:33»): по умолчанию пусто — работает автоматическое распознавание по названию; отметка
// задаёт свою привязку для карты мышц (хранится по названию на устройстве, см. lib/muscles.ts). Нужна для упражнений вне справочника.
const muscles = ref<MuscleId[]>(props.existing ? (getMuscleOverride(props.existing.name) ?? []) : [])
function toggleMuscle(m: MuscleId) {
  muscles.value = muscles.value.includes(m) ? muscles.value.filter((x) => x !== m) : [...muscles.value, m]
}
const muscleLabel = (m: MuscleId) => t(`workouts_muscle_${m}` as DictKey)
const autoMuscles = computed(() => ruleForExercise(name.value)?.muscles ?? [])
const muscleHint = computed(() => {
  if (muscles.value.length) return t('workouts_muscles_pick_custom')
  if (autoMuscles.value.length) return t('workouts_muscles_pick_auto') + ' ' + autoMuscles.value.map(muscleLabel).join(', ')
  return name.value.trim() ? t('workouts_muscles_pick_none') : ''
})

// Типовое упражнение и разновидность (BACKLOG 585): вместо ручного ввода — выбор из списка; разновидность — часть названия,
// при смене остальное написанное не стирается (lib/exerciseVariants.ts). Своё слово по-прежнему можно вписать в название.
const typical = computed(() => baseForName(name.value))
const variantIndex = computed(() => (typical.value ? detectVariant(name.value, typical.value) : -1))
const variantOptions = computed(() => (typical.value ? typical.value.variants.map((v, i) => ({ i, label: variantText(v, getLang()) })) : []))
// Автозаполнение (BACKLOG 1046): при выборе типового упражнения (и смене разновидности) в НОВОМ упражнении подставляем категорию,
// «с весом/без», «что считаем», длительность и Л/П — но только в поля, которые человек сам не менял (`touched`); дальше всё можно изменить.
// У существующего упражнения ничего не подставляем: правка не должна молча менять сохранённое.
const touched = reactive(new Set<string>())
const autofilled = ref(false)
const touch = (field: string) => touched.add(field)
function applyTypicalDefaults() {
  if (props.existing || !typical.value) return
  const d = typicalDefaults(typical.value, variantIndex.value)
  if (!touched.has('category')) catSelect.value = d.category
  if (!touched.has('weight')) tracksWeight.value = d.tracksWeight ? 'yes' : 'no'
  if (!touched.has('label')) labelChoice.value = t(d.label === 'seconds' ? 'workouts_value_preset_seconds' : 'workouts_value_preset_reps')
  if (!touched.has('duration')) tracksDuration.value = d.tracksDuration
  if (!touched.has('bilateral')) bilateral.value = d.bilateral
  autofilled.value = true
}
function onTypicalPick(e: Event) {
  const id = (e.target as HTMLSelectElement).value
  const b = VARIANT_BASES.find((x) => x.id === id)
  if (b) {
    name.value = baseName(b)
    applyTypicalDefaults()
  }
  ;(e.target as HTMLSelectElement).value = ''
  nameInput.value?.focus()
}
function onVariantPick(e: Event) {
  if (!typical.value) return
  const v = (e.target as HTMLSelectElement).value
  name.value = applyVariant(name.value, typical.value, v === '' ? -1 : Number(v))
  applyTypicalDefaults()
}

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
    name: capFirst(name.value),
    category,
    tracks_weight: tracksWeight.value,
    value_label: chosenLabel.value,
    unit: unitOut,
    tracks_duration: tracksDuration.value,
    bilateral: bilateral.value,
    muscles: muscles.value,
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

        <label v-if="!name.trim()" class="flex flex-col gap-1 text-sm" data-testid="typical-field">
          {{ t('workouts_typical_label') }}
          <select class="modal-input" data-testid="typical-select" @change="onTypicalPick">
            <option value="">{{ t('workouts_typical_choose') }}</option>
            <option v-for="b in VARIANT_BASES" :key="b.id" :value="b.id">{{ baseName(b) }}</option>
          </select>
        </label>

        <div v-if="typical" class="flex flex-col gap-1 text-sm" data-testid="variant-field">
          <label class="flex flex-col gap-1">
            {{ t('workouts_variant_label') }}
            <select :value="variantIndex < 0 ? '' : String(variantIndex)" class="modal-input" data-testid="variant-select" @change="onVariantPick">
              <option value="">{{ t('workouts_variant_none') }}</option>
              <option v-for="o in variantOptions" :key="o.i" :value="String(o.i)">{{ o.label }}</option>
            </select>
          </label>
          <p class="text-xs" style="color: var(--text-dim)" data-testid="variant-hint">{{ t('workouts_variant_hint') }}</p>
          <p v-if="autofilled && !existing" class="text-xs" style="color: var(--text-dim)" data-testid="typical-autofill-hint">{{ t('workouts_typical_filled') }}</p>
        </div>

        <label class="flex flex-col gap-1 text-sm">
          {{ t('workouts_field_category') }}
          <select v-model="catSelect" class="modal-input" data-testid="category-select" @change="touch('category')">
            <option value="">{{ t('workouts_cat_none') }}</option>
            <option value="upper">{{ stripEmoji(t('workouts_cat_upper')) }}</option>
            <option value="lower">{{ stripEmoji(t('workouts_cat_lower')) }}</option>
            <option value="fullbody">{{ stripEmoji(t('workouts_cat_fullbody')) }}</option>
            <option value="custom">{{ stripEmoji(t('workouts_cat_custom')) }}</option>
            <option value="__new__">{{ stripEmoji(t('workouts_cat_add_new')) }}</option>
          </select>
        </label>
        <label v-if="showNewCatInput" class="flex flex-col gap-1 text-sm">
          {{ t('workouts_cat_new_name_label') }}
          <input v-model="newCatName" type="text" class="modal-input" />
        </label>

        <label class="flex flex-col gap-1 text-sm">
          {{ t('workouts_field_tracks_weight') }}
          <select v-model="tracksWeight" class="modal-input" data-testid="tracks-weight-select" @change="touch('weight')">
            <option value="yes">{{ t('workouts_tracks_weight_yes') }}</option>
            <option value="no">{{ t('workouts_tracks_weight_no') }}</option>
          </select>
        </label>

        <label class="flex flex-col gap-1 text-sm">
          {{ t('workouts_field_value_label') }}
          <select v-model="labelChoice" class="modal-input" data-testid="value-label-select" @change="touch('label')">
            <option v-for="o in labelOptions" :key="o" :value="o">{{ o }}</option>
            <option :value="OTHER_LABEL">{{ t('workouts_value_other') }}</option>
          </select>
        </label>
        <input v-if="labelChoice === OTHER_LABEL" v-model="customLabel" type="text" maxlength="24" class="modal-input -mt-1" data-testid="value-label-custom" :placeholder="t('workouts_field_value_label')" />

        <label class="flex items-center gap-2 text-sm">
          <input v-model="tracksDuration" type="checkbox" data-testid="tracks-duration" @change="touch('duration')" />
          {{ t('workouts_field_tracks_duration') }}
        </label>
        <p class="-mt-2 text-xs" style="color: var(--text-dim)">{{ t('workouts_field_tracks_duration_hint') }}</p>

        <label class="flex items-center gap-2 text-sm">
          <input v-model="bilateral" type="checkbox" data-testid="bilateral" @change="touch('bilateral')" />
          {{ t('workouts_field_bilateral') }}
        </label>
        <p class="-mt-2 text-xs" style="color: var(--text-dim)">{{ t('workouts_field_bilateral_hint') }}</p>
        <div class="flex flex-col gap-1.5 text-sm" data-testid="muscles-field">
          <span>{{ t('workouts_muscles_pick_label') }}</span>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="m in MUSCLE_IDS"
              :key="m"
              type="button"
              class="rounded-full border px-2.5 py-1 text-xs"
              :style="
                muscles.includes(m)
                  ? 'border-color: var(--accent); background: var(--accent); color: var(--accent-text)'
                  : 'border-color: var(--border); background: var(--bg); color: var(--text)'
              "
              :aria-pressed="muscles.includes(m)"
              :data-testid="`muscle-${m}`"
              @click="toggleMuscle(m)"
            >
              {{ muscleLabel(m) }}
            </button>
          </div>
          <p v-if="muscleHint" class="text-xs" style="color: var(--text-dim)" data-testid="muscles-hint">{{ muscleHint }}</p>
          <button
            v-if="muscles.length"
            type="button"
            class="self-start text-xs underline"
            style="color: var(--text-dim)"
            data-testid="muscles-clear"
            @click="muscles = []"
          >
            {{ t('workouts_muscles_pick_clear') }}
          </button>
        </div>

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
