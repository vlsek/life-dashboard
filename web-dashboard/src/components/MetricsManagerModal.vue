<script setup lang="ts">
import { ref } from 'vue'
import MetricFormModal from './MetricFormModal.vue'
import MetricIcon from './MetricIcon.vue'
import Icon from './Icon.vue'
import { t } from '../lib/i18n'
import { goalSummary, scheduleSummary } from '../lib/metricsManager'
import type { MetricFormValues } from '../lib/metricsManager'
import type { MetricCategory } from '../lib/useMetricsManager'
import type { Metric } from '../lib/types'

// Портировано из openMetricsManagerModal() в dashboard.js: список метрик с правкой/удалением
// и кнопкой добавления; форма открывается поверх.
defineProps<{ metrics: Metric[]; categories: MetricCategory[]; error: string | null }>()
const emit = defineEmits<{
  close: []
  add: [form: MetricFormValues, done: (ok: boolean) => void]
  edit: [m: Metric, form: MetricFormValues, done: (ok: boolean) => void]
  remove: [m: Metric]
}>()

const formOpen = ref(false)
const editing = ref<Metric | null>(null)

function openAdd() {
  editing.value = null
  formOpen.value = true
}
function openEdit(m: Metric) {
  editing.value = m
  formOpen.value = true
}
function onSave(form: MetricFormValues) {
  const done = (ok: boolean) => {
    if (ok) formOpen.value = false
  }
  if (editing.value) emit('edit', editing.value, form, done)
  else emit('add', form, done)
}

const weekdayNames = () => t('dash_weekdays_short').split(',')
function summary(m: Metric): string {
  const goal = goalSummary(m, t('dash_metric_goal_bool'), t('dash_metric_goal_multiselect'))
  const sched = scheduleSummary(m.schedule, weekdayNames(), t('dash_schedule_weekly_short'), t('dash_schedule_at_most_short'))
  return sched ? `${goal} · ${sched}` : goal
}
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal" style="max-width: 30rem">
      <h3>{{ t('dash_metrics_manager_title') }}</h3>

      <p v-if="metrics.length === 0" class="dim">{{ t('dash_metrics_manager_empty') }}</p>
      <table v-else class="w-full text-sm">
        <tbody>
          <tr v-for="m in metrics" :key="m.id" class="align-middle">
            <td class="py-1 pr-2"><MetricIcon :icon="m.icon" /> {{ m.name }}</td>
            <td class="dim py-1 pr-2 text-xs">{{ summary(m) }}</td>
            <td class="whitespace-nowrap py-1 text-right">
              <button class="secondary mr-1 px-2 py-0.5" @click="openEdit(m)"><Icon name="edit" /></button>
              <button class="danger px-2 py-0.5" @click="emit('remove', m)"><Icon name="trash" /></button>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-if="error && !formOpen" class="mt-2 text-sm" style="color: var(--danger)">{{ error }}</p>

      <div class="modal-actions">
        <button @click="openAdd">{{ t('dash_add_metric_btn') }}</button>
        <button class="secondary" @click="emit('close')">{{ t('dash_close_btn') }}</button>
      </div>

      <MetricFormModal v-if="formOpen" :existing="editing" :categories="categories" :error="error" @close="formOpen = false" @save="onSave" />
    </div>
  </div>
</template>
