<script setup lang="ts">
import { computed, ref } from 'vue'
import { t } from '../lib/i18n'
import { friendlyError } from '../lib/friendlyError'
import { matchCategory, pointsForDifficulty, type Difficulty, type GoalFormInput } from '../lib/newGoal'

// BACKLOG раздел 38: новая цель с главной — ТО ЖЕ окно, что в «Целях» (копия web-goals/src/components/GoalForm.vue для добавления; поля, порядок и
// подписи те же, ключи goals_*). submit — запись цели + постановка в план (родитель); ошибка показывается ПОД полями, форма остаётся открытой,
// введённое не пропадает; пока идёт запись, «Сохранить» заблокирована — двойной тап не создаёт две цели.
const props = withDefaults(defineProps<{ submit: (res: GoalFormInput) => Promise<void>; categories?: string[]; noCategoryLabels?: string[] }>(), { categories: () => [], noCategoryLabels: () => [] })
const emit = defineEmits<{ close: [] }>()

const name = ref('')
const NEW = '\u0000new'
const categoryChoice = ref<string>(matchCategory('', props.categories, props.noCategoryLabels) ?? '')
const newCategory = ref('')
const category = computed(() => (categoryChoice.value === NEW ? newCategory.value.trim() : categoryChoice.value))
const stages = ref(1)
const difficulty = ref<Difficulty>(null)
const deadline = ref('')
// Баллы не вводятся, а следуют за сложностью (BACKLOG разделы 35/40) — как в «Целях».
const shownPoints = computed(() => pointsForDifficulty(difficulty.value))

const saving = ref(false)
const nameMissing = ref(false)
const submitError = ref<string | null>(null)
const errorText = computed(() => (nameMissing.value ? t('goals_form_name_required') : submitError.value))

async function save() {
  if (saving.value) return
  if (!name.value.trim()) {
    nameMissing.value = true
    return
  }
  nameMissing.value = false
  submitError.value = null
  saving.value = true
  try {
    await props.submit({
      name: name.value,
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
      <h3>{{ t('goals_new_title') }}</h3>

      <label class="mt-2 block text-sm">{{ t('goals_field_name') }}</label>
      <input v-model="name" type="text" class="w-full" :aria-invalid="nameMissing" data-test="new-goal-name" @input="nameMissing = false" />

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
      <p class="dim mt-1 text-xs" data-test="goal-points-auto">{{ t('goals_points_auto').replace('{n}', String(shownPoints)) }}</p>

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
