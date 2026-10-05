<script setup lang="ts">
import { watch } from 'vue'
import SetsCard from './SetsCard.vue'
import { useSets } from '../lib/useSets'
import { todayStr } from '../lib/date'
import { t } from '../lib/i18n'
import type { MetricStreakInfo } from '../lib/metricStreaks'
import type { RecordInfo } from '../lib/records'

// Единственная точка подключения блока «Подходы» в App.vue: сама грузит метрики типа sets и
// значения за дату (по умолчанию сегодня) и автосохраняет каждую правку. Навигацию по дням
// добавит блок 6 (дневные метрики), передав сюда date.
const props = withDefaults(defineProps<{ userId: string | null; date?: string; metricStreaks?: Record<string, MetricStreakInfo>; records?: Record<string, RecordInfo> }>(), { date: () => todayStr() })

const { metrics, setsByMetric, error, loaded, flashed, load, saveSets, rememberVariation, forgetVariation } = useSets()

watch(
  () => [props.userId, props.date] as const,
  ([uid, date]) => {
    if (uid) load(uid, date)
  },
  { immediate: true },
)
</script>

<template>
  <div v-if="loaded && (metrics.length > 0 || error)">
    <p v-if="error" class="mb-2 text-sm" style="color: var(--danger)">{{ error }}</p>
    <SetsCard
      v-for="m in metrics"
      :key="m.id"
      :metric="m"
      :sets="setsByMetric[m.id] || []"
      :streak="props.metricStreaks?.[m.id]"
      :record="props.records?.[m.id]"
      :saved="!!flashed[m.id]"
      @change="saveSets(m, $event)"
      @remember="rememberVariation(m, $event)"
      @forget="forgetVariation(m, $event)"
    />
  </div>
  <span v-else-if="!loaded" class="dim text-sm">{{ t('loading_ellipsis') }}</span>
</template>
