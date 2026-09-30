<script setup lang="ts">
import { onMounted } from 'vue'
import MetricIcon from './MetricIcon.vue'
import { t, type DictKey } from '../lib/i18n'
import { usePointsLog } from '../lib/usePointsLog'
import { parseIso } from '../lib/date'
import type { PointsDay, PointsEntry } from '../lib/pointsLog'
import CoinIcon from './CoinIcon.vue'

// Окно по клику на баллы в профиле (BACKLOG 7.1): за что начислено сегодня и за последние 7 дней.
// В магазин — только кнопкой отсюда, а не сразу по клику на баланс.
const props = defineProps<{ userId: string; balance: number | null }>()
const emit = defineEmits<{ close: [] }>()

const { log, error, loading, load } = usePointsLog(props.userId)
onMounted(load)

const KIND: Record<PointsEntry['kind'], DictKey> = {
  metric: 'dash_points_kind_metric',
  goal: 'dash_points_kind_goal',
  book: 'dash_points_kind_book',
  spent: 'dash_points_kind_spent',
}

function dayTitle(d: PointsDay, index: number): string {
  if (index === 0) return t('dash_points_today')
  if (index === 1) return t('dash_points_yesterday')
  const dt = parseIso(d.date)
  const wd = t('dash_summary_weekdays').split(',')[dt.getDay()]
  return `${wd} ${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}`
}
const sign = (n: number) => (n > 0 ? `+${n}` : String(n))
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal" style="max-width: 30rem" data-test="points-modal">
      <h3>{{ t('dash_points_title') }}</h3>

      <p v-if="balance != null" class="mb-2 flex items-center gap-1 font-bold">
        <CoinIcon /> {{ balance }} <span class="dim text-sm font-normal">— {{ t('dash_points_balance') }}</span>
      </p>

      <p v-if="loading && !log" class="dim text-sm">{{ t('dash_points_loading') }}</p>
      <p v-else-if="error" class="text-sm" style="color: var(--danger)">{{ error }}</p>

      <template v-if="log">
        <p class="mb-2 text-sm" data-test="points-totals">
          {{ t('dash_points_today') }}: <strong>{{ sign(log.earnedToday) }}</strong> ·
          {{ t('dash_points_week') }}: <strong>{{ sign(log.earnedWeek) }}</strong>
          <template v-if="log.spentWeek > 0"> · {{ t('dash_points_spent') }}: <strong>−{{ log.spentWeek }}</strong></template>
        </p>

        <div class="overflow-y-auto" style="max-height: 55vh">
          <section v-for="(d, i) in log.days" :key="d.date" class="mb-2" :data-day="d.date">
            <div class="flex items-center justify-between text-sm font-bold">
              <span>{{ dayTitle(d, i) }}</span>
              <span class="dim font-normal">{{ sign(d.earned - d.spent) }}</span>
            </div>
            <p v-if="d.entries.length === 0" class="dim text-xs">{{ t('dash_points_nothing') }}</p>
            <ul v-else class="m-0 list-none p-0 text-sm">
              <li v-for="(e, k) in d.entries" :key="k" class="flex items-center justify-between gap-2 py-0.5">
                <span class="min-w-0 flex-1 truncate">
                  <MetricIcon v-if="e.kind === 'metric'" :icon="e.icon" />
                  {{ e.label }}
                  <span v-if="e.kind !== 'metric'" class="dim text-xs">· {{ t(KIND[e.kind]) }}</span>
                </span>
                <span class="whitespace-nowrap" :style="{ color: e.points < 0 ? 'var(--danger)' : 'var(--success)' }">{{ sign(e.points) }}</span>
              </li>
            </ul>
          </section>
        </div>

        <p class="dim mt-2 text-xs">{{ t('dash_points_skills_note') }}</p>
      </template>

      <div class="modal-actions">
        <a href="/shop/" class="cursor-pointer rounded-lg px-3.5 py-1.5" style="background: var(--accent); color: var(--accent-text); text-decoration: none" data-test="points-shop-link">{{ t('dash_points_shop_btn') }}</a>
        <button class="secondary" @click="emit('close')">{{ t('dash_close_btn') }}</button>
      </div>
    </div>
  </div>
</template>
