<script setup lang="ts">
import { computed } from 'vue'
import { SPARK_H, SPARK_W, sparkShape } from '../lib/sparkline'
import { t } from '../lib/i18n'

// Мини-график за 7 дней в плашке числовой метрики (55.2). Декоративный: смысл — в подписи для скринридера (min/max/последнее).
const props = defineProps<{ values: (number | null)[]; unit?: string }>()
const shape = computed(() => sparkShape(props.values))
const label = computed(() => {
  const have = props.values.filter((v): v is number => v !== null)
  if (have.length < 2) return ''
  const u = props.unit ? ' ' + props.unit : ''
  return t('dash_spark_label') + ': ' + t('chart_sum_min') + ' ' + Math.min(...have) + u + ', ' + t('chart_sum_max') + ' ' + Math.max(...have) + u + ', ' + t('chart_sum_last') + ' ' + have[have.length - 1] + u
})
</script>

<template>
  <svg v-if="shape" class="metric-spark" :viewBox="`0 0 ${SPARK_W} ${SPARK_H}`" :width="SPARK_W" :height="SPARK_H" role="img" :aria-label="label" data-test="metric-spark">
    <path :d="shape.d" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
    <circle v-if="shape.last" :cx="shape.last[0]" :cy="shape.last[1]" r="2" fill="var(--accent)" />
  </svg>
</template>

<style scoped>
.metric-spark { display: block; margin-top: 2px; max-width: 100%; opacity: 0.85; }
</style>
