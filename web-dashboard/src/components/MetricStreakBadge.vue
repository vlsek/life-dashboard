<script setup lang="ts">
import { computed } from 'vue'
import Icon from './Icon.vue'
import StreakFlame from './StreakFlame.vue'
import { streakFlameTier } from '../lib/streakFlameTier'
import { t } from '../lib/i18n'
import type { MetricStreakInfo } from '../lib/metricStreaks'

// BACKLOG 18.5: огонёк и число дней серии рядом с названием метрики. Горит акцентом темы, если сегодня уже
// засчитано; если нет — приглушён (серия ещё не оборвалась, но сегодня надо успеть). Для недельных расписаний
// («N раз в неделю») число — это недели подряд, с подписью «нед.».
const props = defineProps<{ info: MetricStreakInfo }>()
const text = computed(() => (props.info.unit === 'w' ? `${props.info.streak} ${t('dash_streak_unit_weeks')}` : String(props.info.streak)))
// От 7 дней подряд (не недельные серии) и засчитано сегодня — живое пламя, как у главного стрика; иначе статичный огонёк.
const live = computed(() => props.info.todayCounted && props.info.unit !== 'w' && streakFlameTier(props.info.streak) > 0)
const title = computed(() => (props.info.todayCounted ? '' : t('dash_streak_not_done_today')))
</script>

<template>
  <span
    class="metric-streak"
    :class="{ unlit: info.streak > 0 && !info.todayCounted, 'score-only': info.streak <= 0 }"
    :title="title"
    :data-test="info.streak > 0 ? 'metric-streak' : 'metric-score-only'"
  >
    <template v-if="info.streak > 0">
      <StreakFlame v-if="live" lit :days="info.streak" :size="16" />
      <Icon v-else name="flame" extra-style="width: 0.95em; height: 0.95em; vertical-align: -0.12em" /><span class="n">{{ text }}</span>
    </template>
    <span v-if="info.score != null" class="habit-score" :title="t('dash_habit_score_title')" data-test="habit-score">{{ info.score }}%</span>
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
.habit-score {
  margin-left: 4px;
  font-weight: 500;
  opacity: 0.9;
}
.metric-streak.score-only {
  margin-left: 6px;
  color: var(--text-dim);
  background: transparent;
  border: 1px solid var(--border);
}
.metric-streak.score-only .habit-score {
  margin-left: 0;
}
</style>
