<script setup lang="ts">
import { watch } from 'vue'
import SetsCard from './SetsCard.vue'
import VariationRecords from './VariationRecords.vue'
import { useSets } from '../lib/useSets'
import { useVariationRecords } from '../lib/useVariationRecords'
import { todayStr } from '../lib/date'
import { t } from '../lib/i18n'
import type { MetricStreakInfo } from '../lib/metricStreaks'
import type { RecordInfo } from '../lib/records'

// Единственная точка подключения блока «Подходы» в App.vue: сама грузит метрики типа sets и
// значения за дату (по умолчанию сегодня) и автосохраняет каждую правку. Навигацию по дням
// добавит блок 6 (дневные метрики), передав сюда date.
const props = withDefaults(defineProps<{ userId: string | null; date?: string; metricStreaks?: Record<string, MetricStreakInfo>; records?: Record<string, RecordInfo>; reloadKey?: number }>(), { date: () => todayStr() })

const { metrics, setsByMetric, error, loaded, flashed, load, saveSets, rememberVariation, forgetVariation } = useSets()

// reloadKey растёт, когда список метрик изменили (шестерёнка «Ежедневных метрик», BACKLOG 40): новый тип «подходы» должен появиться без обновления страницы
watch(
  () => [props.userId, props.date, props.reloadKey] as const,
  ([uid, date]) => {
    if (uid) load(uid, date)
  },
  { immediate: true },
)

// Рекорд за один подход по каждой особенности (BACKLOG раздел 28): вся история грузится один раз на набор метрик (смена даты её не перезапрашивает),
// а подходы показанного дня обновляют рекорд сразу.
const { records: variationRecords, init: initVariationRecords, observe: observeVariations } = useVariationRecords()
watch(
  () => [props.userId, metrics.value.map((m) => m.id).join(',')] as const,
  ([uid, ids]) => {
    if (uid && ids) void initVariationRecords(uid, ids.split(','))
  },
  { immediate: true },
)
watch(
  setsByMetric,
  (all) => {
    for (const m of metrics.value) observeVariations(m.id, props.date, all[m.id])
  },
  { deep: true },
)
</script>

<template>
  <div v-if="loaded && (metrics.length > 0 || error)">
    <p v-if="error" class="mb-2 text-sm" style="color: var(--danger)">{{ error }}</p>
    <template v-for="m in metrics" :key="m.id">
    <SetsCard
      :metric="m"
      :sets="setsByMetric[m.id] || []"
      :streak="props.metricStreaks?.[m.id]"
      :record="props.records?.[m.id]"
      :saved="!!flashed[m.id]"
      @change="saveSets(m, $event)"
      @remember="rememberVariation(m, $event)"
      @forget="forgetVariation(m, $event)"
    />
    <VariationRecords :records="variationRecords[m.id]" />
    </template>
  </div>
  <span v-else-if="!loaded" class="dim text-sm">{{ t('loading_ellipsis') }}</span>
</template>
