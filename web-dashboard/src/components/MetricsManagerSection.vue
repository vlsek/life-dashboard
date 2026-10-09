<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import MetricsManagerModal from './MetricsManagerModal.vue'
import { useMetricsManager } from '../lib/useMetricsManager'
import { t } from '../lib/i18n'
import { withoutWater } from '../lib/metricsManager'
import { stripEmoji } from '../lib/emojiText'
import type { MetricFormValues } from '../lib/metricsManager'
import type { Metric } from '../lib/types'
import EmojiText from './EmojiText.vue'
import Icon from './Icon.vue'

// Единственная точка подключения блока «Управление метриками» в App.vue: кнопка + модалка.
// onChanged — родитель может перечитать данные дашборда после правки метрик.
// icon — компактная шестерёнка (в заголовке «Ежедневных метрик», BACKLOG 38); без неё — прежняя кнопка с подписью «Метрики дня»
const props = defineProps<{ userId: string | null; icon?: boolean }>()
const emit = defineEmits<{ changed: [] }>()

const { metrics, categories, exercises, error, load, addMetric, editMetric, deleteMetric } = useMetricsManager(() => emit('changed'))
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
  <button
    v-if="icon"
    type="button"
    class="secondary inline-flex items-center justify-center px-2 py-1"
    :title="stripEmoji(t('dash_metrics_manager_title'))"
    :aria-label="stripEmoji(t('dash_metrics_manager_title'))"
    data-test="metrics-manager-gear"
    @click="openModal"
  ><Icon name="gear" /></button>
  <button v-else type="button" class="secondary inline-flex items-center gap-1.5" @click="openModal">
    <EmojiText :text="t('dash_metrics_manager_title')" />
  </button>
  <MetricsManagerModal
    v-if="open"
    :metrics="listed"
    :categories="categories"
    :exercises="exercises"
    :error="error"
    @close="open = false"
    @add="onAdd"
    @edit="onEdit"
    @remove="deleteMetric"
  />
</template>
