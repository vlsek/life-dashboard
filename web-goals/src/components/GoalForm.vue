<script setup lang="ts">
import { computed, ref } from 'vue'
import { t } from '../lib/i18n'
import { friendlyError } from '../lib/friendlyError'
import type { Difficulty, GoalFormInput } from '../lib/types'

// submit — запись цели (родитель добавляет/правит и закрывает форму при успехе). Ошибка записи показывается ПОД полями (форма остаётся
// открытой, введённое не пропадает); пока идёт запись, «Сохранить» заблокирована — двойной тап не создаёт две цели.
const props = defineProps<{ isEdit: boolean; initial: GoalFormInput; submit: (res: GoalFormInput) => Promise<void> }>()
const emit = defineEmits<{ close: [] }>()

const name = ref(props.initial.name)
const points = ref(props.initial.points)
const category = ref(props.initial.category)
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
      <input v-model="category" type="text" class="w-full" />

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
