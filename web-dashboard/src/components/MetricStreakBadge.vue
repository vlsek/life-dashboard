<script setup lang="ts">
import { computed } from 'vue'
import Icon from './Icon.vue'
import { t } from '../lib/i18n'
import type { MetricStreakInfo } from '../lib/metricStreaks'

// BACKLOG 18.5: огонёк и число дней серии рядом с названием метрики. Горит акцентом темы, если сегодня уже
// засчитано; если нет — приглушён (серия ещё не оборвалась, но сегодня надо успеть). Для недельных расписаний
// («N раз в неделю») число — это недели подряд, с подписью «нед.».
const props = defineProps<{ info: MetricStreakInfo }>()
const text = computed(() => (props.info.unit === 'w' ? `${props.info.streak} ${t('dash_streak_unit_weeks')}` : String(props.info.streak)))
const title = computed(() => (props.info.todayCounted ? '' : t('dash_streak_not_done_today')))
</script>

<template>
  <span class="metric-streak" :class="{ unlit: !info.todayCounted }" :title="title" data-test="metric-streak">
    <Icon name="flame" extra-style="width: 0.95em; height: 0.95em; vertical-align: -0.12em" /><span class="n">{{ text }}</span>
  </span>
</template>

<style scoped>
.metric-streak {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: 6px;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 0.78em;
  font-weight: 600;
  line-height: 1.5;
  white-space: nowrap;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 14%, transparent);
}
.metric-streak.unlit {
  color: var(--text-dim);
  background: transparent;
  border: 1px solid var(--border);
  opacity: 0.85;
}
</style>
