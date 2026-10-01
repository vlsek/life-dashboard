<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import MetricIcon from './MetricIcon.vue'
import { t, type DictKey } from '../lib/i18n'
import { usePointsLog } from '../lib/usePointsLog'
import { parseIso } from '../lib/date'
import { RECENT_LIMIT, incomeRows, purchaseRows } from '../lib/pointsLog'
import type { LogRow, PointsEntry } from '../lib/pointsLog'
import { vCollapse } from '../lib/collapseMotion'
import CoinIcon from './CoinIcon.vue'

// Окно по клику на баллы в профиле (BACKLOG 7.1): за что начислено сегодня и за последние 7 дней.
// В магазин — только кнопкой отсюда, а не сразу по клику на баланс.
// BACKLOG 16 (17:02): по умолчанию — последние 5 источников прибытка, остальное и покупки разворачиваются вниз.
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

// Подпись дня строки: «Сегодня» / «Вчера» / «Пн 29.09» (по позиции дня в журнале: он идёт от сегодняшнего назад)
function dayLabel(date: string): string {
  const idx = log.value ? log.value.days.findIndex((d) => d.date === date) : -1
  if (idx === 0) return t('dash_points_today')
  if (idx === 1) return t('dash_points_yesterday')
  const dt = parseIso(date)
  const wd = t('dash_summary_weekdays').split(',')[dt.getDay()]
  return `${wd} ${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}`
}

const expanded = ref(false)
const income = computed<LogRow[]>(() => (log.value ? incomeRows(log.value) : []))
const purchases = computed<LogRow[]>(() => (log.value ? purchaseRows(log.value) : []))
const recent = computed(() => income.value.slice(0, RECENT_LIMIT))
const rest = computed(() => income.value.slice(RECENT_LIMIT))
// есть что разворачивать: ещё начисления за неделю или покупки
const canExpand = computed(() => rest.value.length > 0 || purchases.value.length > 0)
// типографский минус (как в итогах «потрачено −N»), а не дефис
const sign = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : String(n))
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

        <div class="overflow-y-auto" style="max-height: 55vh" data-test="points-list">
          <h4 class="mb-1 text-sm font-bold">{{ t('dash_points_recent_title') }}</h4>
          <p v-if="income.length === 0" class="dim text-xs" data-test="points-empty">{{ t('dash_points_nothing') }}</p>
          <ul v-else class="m-0 list-none p-0 text-sm" data-test="points-recent">
            <li v-for="(e, k) in recent" :key="'r' + k" class="flex items-center justify-between gap-2 py-0.5" data-test="points-row">
              <span class="min-w-0 flex-1 truncate">
                <MetricIcon v-if="e.kind === 'metric'" :icon="e.icon" />
                {{ e.label }}
                <span class="dim text-xs">· {{ dayLabel(e.date) }}<template v-if="e.kind !== 'metric'"> · {{ t(KIND[e.kind]) }}</template></span>
              </span>
              <span class="whitespace-nowrap" style="color: var(--success)">{{ sign(e.points) }}</span>
            </li>
          </ul>

          <div v-if="canExpand" v-collapse="expanded" data-test="points-more">
            <ul v-if="rest.length" class="m-0 list-none p-0 text-sm">
              <li v-for="(e, k) in rest" :key="'m' + k" class="flex items-center justify-between gap-2 py-0.5" data-test="points-row-more">
                <span class="min-w-0 flex-1 truncate">
                  <MetricIcon v-if="e.kind === 'metric'" :icon="e.icon" />
                  {{ e.label }}
                  <span class="dim text-xs">· {{ dayLabel(e.date) }}<template v-if="e.kind !== 'metric'"> · {{ t(KIND[e.kind]) }}</template></span>
                </span>
                <span class="whitespace-nowrap" style="color: var(--success)">{{ sign(e.points) }}</span>
              </li>
            </ul>
            <template v-if="purchases.length">
              <h4 class="mb-1 mt-2 text-sm font-bold">{{ t('dash_points_purchases') }}</h4>
              <ul class="m-0 list-none p-0 text-sm" data-test="points-purchases">
                <li v-for="(e, k) in purchases" :key="'p' + k" class="flex items-center justify-between gap-2 py-0.5">
                  <span class="min-w-0 flex-1 truncate">{{ e.label }} <span class="dim text-xs">· {{ dayLabel(e.date) }}</span></span>
                  <span class="whitespace-nowrap" style="color: var(--danger)">{{ sign(e.points) }}</span>
                </li>
              </ul>
            </template>
          </div>
        </div>

        <button
          v-if="canExpand"
          type="button"
          class="secondary mt-2 w-full text-sm"
          data-test="points-toggle"
          :aria-expanded="expanded"
          @click="expanded = !expanded"
        >
          {{ expanded ? t('dash_points_show_less') : t('dash_points_show_more') + (rest.length ? ` (${rest.length})` : '') }}
        </button>

        <p class="dim mt-2 text-xs">{{ t('dash_points_skills_note') }}</p>
      </template>

      <div class="modal-actions">
        <a href="/shop/" class="cursor-pointer rounded-lg px-3.5 py-1.5" style="background: var(--accent); color: var(--accent-text); text-decoration: none" data-test="points-shop-link">{{ t('dash_points_shop_btn') }}</a>
        <button class="secondary" @click="emit('close')">{{ t('dash_close_btn') }}</button>
      </div>
    </div>
  </div>
</template>
