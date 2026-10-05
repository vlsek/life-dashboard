<script setup lang="ts">
import { computed, ref } from 'vue'
import { t } from '../lib/i18n'
import { friendlyError } from '../lib/friendlyError'
import type { Difficulty, GoalFormInput } from '../lib/types'
import { matchCategory } from '../lib/categories'

// submit — запись цели (родитель добавляет/правит и закрывает форму при успехе). Ошибка записи показывается ПОД полями (форма остаётся
// открытой, введённое не пропадает); пока идёт запись, «Сохранить» заблокирована — двойной тап не создаёт две цели.
const props = withDefaults(defineProps<{ isEdit: boolean; initial: GoalFormInput; submit: (res: GoalFormInput) => Promise<void>; categories?: string[]; noCategoryLabels?: string[] }>(), { categories: () => [], noCategoryLabels: () => [] })
const emit = defineEmits<{ close: [] }>()

const name = ref(props.initial.name)
const points = ref(props.initial.points)
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

const saving = ref(false)
const nameMissing = ref(false)
const submitError = ref<string | null>(null)
const errorText = computed(() => (nameMissing.value ? t('goals_form_name_required') : submitError.value))

async function save() {
  if (saving.value) return
  if (!name.value.trim()) {
    nameMissing.value = true // не молчим: «Сохранить» без названия раньше просто ничего не делала
    return
  }
  nameMissing.value = false
  submitError.value = null
  saving.value = true
  try {
    await props.submit({
      name: name.value,
      points: points.value,
      category: category.value,
      stages: stages.value,
      difficulty: difficulty.value,
      deadline: deadline.value,
    })
  } catch (e) {
    submitError.value = friendlyError(e)
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

      <label class="mt-2 block text-sm">{{ t('goals_field_points') }}</label>
      <input v-model.number="points" type="number" class="w-full" />

      <label class="mt-2 block text-sm">{{ t('goals_field_category') }}</label>
      <select v-model="categoryChoice" class="w-full" data-test="goal-category-select">
        <option value="">{{ t('goals_no_category') }}</option>
        <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
        <option :value="NEW">{{ t('goals_cat_new') }}</option>
      </select>
      <input v-if="categoryChoice === NEW" v-model="newCategory" type="text" class="mt-1 w-full" :placeholder="t('goals_cat_new_placeholder')" maxlength="40" data-test="goal-category-new" />

      <label class="mt-2 block text-sm">{{ t('goals_field_stages') }}</label>
      <input v-model.number="stages" type="number" min="1" class="w-full" />

      <label class="mt-2 block text-sm">{{ t('goals_field_difficulty') }}</label>
      <select v-model="difficulty" class="w-full">
        <option :value="null">{{ t('goals_diff_none') }}</option>
        <option value="easy">{{ t('goals_diff_easy') }}</option>
        <option value="medium">{{ t('goals_diff_medium') }}</option>
        <option value="hard">{{ t('goals_diff_hard') }}</option>
      </select>

      <label class="mt-2 block text-sm">{{ t('goals_field_deadline') }}</label>
      <input v-model="deadline" type="date" class="w-full" />

      <p v-if="errorText" class="mt-3 text-sm" style="color: var(--danger)" role="alert" data-test="goal-form-error">{{ errorText }}</p>

      <div class="modal-actions">
        <button class="secondary" @click="emit('close')">{{ t('cancel') }}</button>
        <button :disabled="saving" data-test="goal-form-save" @click="save">{{ t('save') }}</button>
      </div>
    </div>
  </div>
</template>
