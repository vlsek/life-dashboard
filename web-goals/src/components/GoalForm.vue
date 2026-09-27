<script setup lang="ts">
import { ref } from 'vue'
import { t } from '../lib/i18n'
import type { Difficulty, GoalFormInput } from '../lib/types'

const props = defineProps<{ isEdit: boolean; initial: GoalFormInput }>()
const emit = defineEmits<{ close: []; save: [res: GoalFormInput] }>()

const name = ref(props.initial.name)
const points = ref(props.initial.points)
const category = ref(props.initial.category)
const stages = ref(props.initial.stages)
const difficulty = ref<Difficulty>(props.initial.difficulty)
const deadline = ref(props.initial.deadline)

function save() {
  if (!name.value.trim()) return
  emit('save', {
    name: name.value,
    points: points.value,
    category: category.value,
    stages: stages.value,
    difficulty: difficulty.value,
    deadline: deadline.value,
  })
}
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal">
      <h3>{{ props.isEdit ? t('goals_edit_title') : t('goals_new_title') }}</h3>

      <label class="mt-2 block text-sm">{{ t('goals_field_name') }}</label>
      <input v-model="name" type="text" class="w-full" />

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

      <div class="modal-actions">
        <button class="secondary" @click="emit('close')">{{ t('cancel') }}</button>
        <button @click="save">{{ t('save') }}</button>
      </div>
    </div>
  </div>
</template>
