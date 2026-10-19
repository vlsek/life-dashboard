<script setup lang="ts">
import { computed, ref } from 'vue'
import { t } from '../lib/i18n'
import { friendlyError } from '../lib/friendlyError'
import type { Difficulty, GoalFormInitial, GoalFormInput } from '../lib/types'
import { matchCategory } from '../lib/categories'
import { pointsAfterEdit } from '../lib/goals'
import { parseWeight, validateWeight, type WeightMode } from '../lib/weightGoal'
import { HORIZON_KEYS, effectiveHorizon, horizonOptions, type Horizon } from '../lib/horizons'

// submit — запись цели (родитель добавляет/правит и закрывает форму при успехе). Ошибка записи показывается ПОД полями (форма остаётся
// открытой, введённое не пропадает); пока идёт запись, «Сохранить» заблокирована — двойной тап не создаёт две цели.
const props = withDefaults(defineProps<{ isEdit: boolean; initial: GoalFormInitial; submit: (res: GoalFormInput) => Promise<void>; categories?: string[]; noCategoryLabels?: string[]; horizonColumn?: boolean; weightColumn?: boolean; currentWeight?: number | null }>(), { categories: () => [], noCategoryLabels: () => [], horizonColumn: false, weightColumn: false, currentWeight: null })
const emit = defineEmits<{ close: [] }>()

const name = ref(props.initial.name)
// Категория: выбор из СВОИХ категорий (BACKLOG раздел 35) + «Новая категория…» + «Без категории». Если у редактируемой цели категории нет
// в списке (старые данные), она показывается как новая — в поле, текст не теряется.
const NEW = '\u0000new'
const picked = matchCategory(props.initial.category, props.categories, props.noCategoryLabels)
const categoryChoice = ref<string>(picked === null ? NEW : picked)
const newCategory = ref(picked === null ? props.initial.category.trim() : '')
const category = computed(() => (categoryChoice.value === NEW ? newCategory.value.trim() : categoryChoice.value))
const stages = ref(props.initial.stages)
const difficulty = ref<Difficulty>(props.initial.difficulty)
const deadline = ref(props.initial.deadline)
// Горизонт (BACKLOG 1048+1050): у старой цели выводится из срока; «В ближайшее время»/«В ближайший месяц» — только если в базе есть колонка (миграция 084).
const options = computed(() => horizonOptions(props.horizonColumn))
const horizon = ref<Horizon>(effectiveHorizon({ deadline: props.initial.deadline, horizon: props.initial.horizon }))
const dateMissing = ref(false)
// Вид цели (BACKLOG 1085): обычная / «Сбросить вес» / «Набрать вес» (только если в базе есть колонки, миграция 085; у уже весовой цели — всегда).
// Старт по умолчанию — последний вес тела; цель — в нужную сторону от старта.
type Kind = 'plain' | WeightMode
const kind = ref<Kind>(props.initial.weightMode ?? 'plain')
const showKinds = computed(() => props.weightColumn || !!props.initial.weightMode)
const fmtKg = (n: number | null | undefined): string => (n === null || n === undefined ? '' : String(n).replace('.', ','))
const weightStart = ref(fmtKg(props.initial.weightStart ?? props.currentWeight))
const weightTarget = ref(fmtKg(props.initial.weightTarget))
const weightError = ref<string | null>(null)
// Баллы не вводятся, а следуют за сложностью (BACKLOG разделы 35/40); у старой цели с другими баллами они остаются, пока сложность не сменят.
const shownPoints = computed(() => pointsAfterEdit(difficulty.value, { points: props.initial.points, difficulty: props.initial.difficulty }))

const saving = ref(false)
const nameMissing = ref(false)
const submitError = ref<string | null>(null)
const errorText = computed(() => (nameMissing.value ? t('goals_form_name_required') : dateMissing.value ? t('goals_form_date_required') : weightError.value ?? submitError.value))

async function save() {
  if (saving.value) return
  if (!name.value.trim()) {
    nameMissing.value = true // не молчим: «Сохранить» без названия раньше просто ничего не делала
    return
  }
  nameMissing.value = false
  if (horizon.value === 'day' && !deadline.value) {
    dateMissing.value = true // «В конкретный день» без даты не сохраняем молча
    return
  }
  dateMissing.value = false
  const wStart = kind.value === 'plain' ? null : parseWeight(weightStart.value)
  const wTarget = kind.value === 'plain' ? null : parseWeight(weightTarget.value)
  if (kind.value !== 'plain') {
    const check = validateWeight(kind.value, wStart, wTarget)
    if (check !== 'ok') {
      weightError.value = t(('goals_weight_err_' + check) as 'goals_weight_err_start')
      return
    }
  }
  weightError.value = null
  submitError.value = null
  saving.value = true
  try {
    await props.submit({
      name: name.value,
      category: category.value,
      stages: stages.value,
      difficulty: difficulty.value,
      deadline: horizon.value === 'day' ? deadline.value : '',
      horizon: horizon.value,
      ...(kind.value === 'plain' ? {} : { weightMode: kind.value, weightStart: wStart, weightTarget: wTarget }), // у обычной цели ключей веса нет — weightFields() сам обнулит вес в базе
    })
  } catch (e) {
    // горизонт «На неделю» без миграции 086: база отклоняет значение проверкой goals_horizon_check — говорим, что делать, а не «проверьте данные»
    const horizonMissing = /goals_horizon_check/.test(String((e as { message?: unknown } | null)?.message ?? ''))
    if (horizonMissing) console.warn('[goals] горизонт «На неделю» не сохранён — примени миграцию 086 в Supabase (SQL editor)')
    submitError.value = horizonMissing ? t('goals_horizon_need_086') : friendlyError(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal">
      <h3>{{ props.isEdit ? t('goals_edit_title') : t('goals_new_title') }}</h3>

      <label class="mt-2 block text-sm">{{ t('goals_field_name') }}</label>
      <input v-model="name" type="text" class="w-full" :aria-invalid="nameMissing" @input="nameMissing = false" />

      <label class="mt-2 block text-sm">{{ t('goals_field_category') }}</label>
      <select v-model="categoryChoice" class="w-full" data-test="goal-category-select">
        <option value="">{{ t('goals_no_category') }}</option>
        <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
        <option :value="NEW">{{ t('goals_cat_new') }}</option>
      </select>
      <input v-if="categoryChoice === NEW" v-model="newCategory" type="text" class="mt-1 w-full" :placeholder="t('goals_cat_new_placeholder')" maxlength="40" data-test="goal-category-new" />

      <template v-if="showKinds">
        <label class="mt-2 block text-sm">{{ t('goals_field_kind') }}</label>
        <select v-model="kind" class="w-full" data-test="goal-kind-select" @change="weightError = null">
          <option value="plain">{{ t('goals_kind_plain') }}</option>
          <option value="lose">{{ t('goals_kind_lose') }}</option>
          <option value="gain">{{ t('goals_kind_gain') }}</option>
        </select>
      </template>

      <template v-if="kind !== 'plain'">
        <label class="mt-2 block text-sm">{{ t('goals_weight_start') }}</label>
        <input v-model="weightStart" type="text" inputmode="decimal" class="w-full" data-test="goal-weight-start" @input="weightError = null" />
        <label class="mt-2 block text-sm">{{ t('goals_weight_target') }}</label>
        <input v-model="weightTarget" type="text" inputmode="decimal" class="w-full" data-test="goal-weight-target" @input="weightError = null" />
        <p class="dim mt-1 text-xs">{{ t('goals_weight_hint') }}</p>
      </template>
      <template v-else>
        <label class="mt-2 block text-sm">{{ t('goals_field_stages') }}</label>
        <input v-model.number="stages" type="number" min="1" class="w-full" />
      </template>

      <label class="mt-2 block text-sm">{{ t('goals_field_difficulty') }}</label>
      <select v-model="difficulty" class="w-full">
        <option :value="null">{{ t('goals_diff_none') }}</option>
        <option value="easy">{{ t('goals_diff_easy') }}</option>
        <option value="medium">{{ t('goals_diff_medium') }}</option>
        <option value="hard">{{ t('goals_diff_hard') }}</option>
      </select>
      <p class="dim mt-1 text-xs" data-test="goal-points-auto">{{ t('goals_points_auto').replace('{n}', String(shownPoints)) }}</p>

      <label class="mt-2 block text-sm">{{ t('goals_field_horizon') }}</label>
      <select v-model="horizon" class="w-full" data-test="goal-horizon-select" @change="dateMissing = false">
        <option v-for="h in options" :key="h" :value="h">{{ t(HORIZON_KEYS[h]) }}</option>
      </select>

      <template v-if="horizon === 'day'">
        <label class="mt-2 block text-sm">{{ t('goals_field_date') }}</label>
        <input v-model="deadline" type="date" class="w-full" data-test="goal-deadline" :aria-invalid="dateMissing" @input="dateMissing = false" />
      </template>

      <p v-if="errorText" class="mt-3 text-sm" style="color: var(--danger)" role="alert" data-test="goal-form-error">{{ errorText }}</p>

      <div class="modal-actions">
        <button class="secondary" @click="emit('close')">{{ t('cancel') }}</button>
        <button :disabled="saving" data-test="goal-form-save" @click="save">{{ t('save') }}</button>
      </div>
    </div>
  </div>
</template>
