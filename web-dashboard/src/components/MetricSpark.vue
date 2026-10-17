<script setup lang="ts">
import { computed } from 'vue'
import { readChartSparkStyle } from '../lib/chartLine'
import { SPARK_H, SPARK_W, sparkInner } from '../lib/sparkline'
import { t } from '../lib/i18n'

// Мини-график за 7 дней в плашке числовой метрики (55.2). Декоративный: смысл — в подписи для скринридера (min/max/последнее).
// Вид (срез 7д): линия (по умолчанию) / область / столбики / точки — `localStorage.chart_spark_style`, выбирается в «Кастомизации»; рисует sparkInner().
const props = defineProps<{ values: (number | null)[]; unit?: string }>()
const style = readChartSparkStyle()
const inner = computed(() => sparkInner(props.values, style))
const label = computed(() => {
  const have = props.values.filter((v): v is number => v !== null)
  if (have.length < 2) return ''
  const u = props.unit ? ' ' + props.unit : ''
  return t('dash_spark_label') + ': ' + t('chart_sum_min') + ' ' + Math.min(...have) + u + ', ' + t('chart_sum_max') + ' ' + Math.max(...have) + u + ', ' + t('chart_sum_last') + ' ' + have[have.length - 1] + u
})
</script>

<template>
  <svg v-if="inner" class="metric-spark" :class="'spark-' + style" :viewBox="`0 0 ${SPARK_W} ${SPARK_H}`" :width="SPARK_W" :height="SPARK_H" role="img" :aria-label="label" data-test="metric-spark" v-html="inner"></svg>
</template>

<style scoped>
.metric-spark { display: block; margin-top: 2px; max-width: 100%; opacity: 0.85; }
</style>
