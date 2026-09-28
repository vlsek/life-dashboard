<script setup lang="ts">
import { ref } from 'vue'
import { t } from '../lib/i18n'
import type { PlanGoal } from '../lib/planned'

// Выбор цели для плана дня — портировано из openModal(dash_planned_add_goal_title) в dashboard.js.
const props = defineProps<{ goals: PlanGoal[] }>()
const emit = defineEmits<{ close: []; pick: [name: string] }>()
const chosen = ref(props.goals[0]?.name ?? '')
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal">
      <h3>{{ t('dash_planned_add_goal_title') }}</h3>
      <label class="mt-2 block text-sm">{{ t('dash_planned_goal_field') }}</label>
      <select v-model="chosen" class="w-full" data-test="goal-select">
        <option v-for="g in goals" :key="g.id" :value="g.name">{{ g.name }}</option>
      </select>
      <div class="modal-actions">
        <button type="button" class="secondary" @click="emit('close')">{{ t('cancel') }}</button>
        <button type="button" data-test="ok" :disabled="!chosen" @click="emit('pick', chosen)">{{ t('save') }}</button>
      </div>
    </div>
  </div>
</template>
