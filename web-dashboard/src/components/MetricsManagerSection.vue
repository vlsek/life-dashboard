<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import MetricsManagerModal from './MetricsManagerModal.vue'
import Icon from './Icon.vue'
import { useMetricsManager } from '../lib/useMetricsManager'
import { t } from '../lib/i18n'
import { withoutWater } from '../lib/metricsManager'
import type { MetricFormValues } from '../lib/metricsManager'
import type { Metric } from '../lib/types'

// Единственная точка подключения блока «Управление метриками» в App.vue: кнопка + модалка.
// onChanged — родитель может перечитать данные дашборда после правки метрик.
const props = defineProps<{ userId: string | null }>()
const emit = defineEmits<{ changed: [] }>()

const { metrics, categories, error, load, addMetric, editMetric, deleteMetric } = useMetricsManager(() => emit('changed'))
const open = ref(false)
// вода — отдельный блок, в менеджере метрик её нет (BACKLOG 7.1)
const listed = computed(() => withoutWater(metrics.value))

async function openModal() {
  if (props.userId) await load(props.userId)
  open.value = true
}
watch(
  () => props.userId,
  (uid) => {
    if (uid) load(uid)
  },
  { immediate: true },
)

async function onAdd(form: MetricFormValues, done: (ok: boolean) => void) {
  done(await addMetric(form))
}
async function onEdit(m: Metric, form: MetricFormValues, done: (ok: boolean) => void) {
  done(await editMetric(m, form))
}
</script>

<template>
  <button type="button" class="secondary inline-flex items-center gap-1.5" @click="openModal">
    <Icon name="gear" /> {{ t('dash_metrics_manager_title') }}
  </button>
  <MetricsManagerModal
    v-if="open"
    :metrics="listed"
    :categories="categories"
    :error="error"
    @close="open = false"
    @add="onAdd"
    @edit="onEdit"
    @remove="deleteMetric"
  />
</template>
