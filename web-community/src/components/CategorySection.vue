<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import ChartBlock from './ChartBlock.vue'
import PeriodPicker from './PeriodPicker.vue'
import Icon from './Icon.vue'
import { useCategories } from '../lib/useCategories'
import { categoryRows, categoryChartPoints, defaultGoalSum, categoryLabel, modeValue, myCategoryPlace, initialCategoryKey, loadCategoryKey, saveCategoryKey } from '../lib/category'
import { loadPeriodState, savePeriodState, type PeriodState } from '../lib/chart'
import { t } from '../lib/i18n'
import type { CategoryMode, CategoryRange, Scope } from '../lib/types'
import EmojiText from './EmojiText.vue'
import Avatar from './Avatar.vue'
import { friendlyError } from '../lib/friendlyError'

const props = defineProps<{ userId: string; scope: Scope; friendIds: Set<string> }>()

const { categories, rows, rowsLoading, error, own, currentCategory, loadCategories, loadLeaderboard, loadOwn, linkMetric, reset } = useCategories()

const catKey = ref('')
const range = ref<CategoryRange>('all')
const mode = ref<CategoryMode>('value')
const linkTarget = ref('')
const linkMsg = ref<{ text: string; error: boolean } | null>(null)

const rangeButtons: [CategoryRange, string][] = [
  ['week', 'period_week'],
  ['last_week', 'period_last_week'],
  ['month', 'period_month'],
  ['all', 'period_all'],
]
const modeButtons: [CategoryMode, string][] = [
  ['value', 'comm_mode_value'],
  ['points', 'comm_mode_points'],
  ['streak', 'comm_mode_streak'],
]

// Личный график — свой период, отдельный от пресетов таблицы (как в оригинале)
const period = reactive<PeriodState>(loadPeriodState('dash_period_community', { range: 'days10', from: null, to: null }))
function onPeriodChange(next: PeriodState) {
  Object.assign(period, next)
  savePeriodState('dash_period_community', period)
}

const visibleRows = computed(() => categoryRows(rows.value, props.userId, props.scope, props.friendIds, mode.value))
const myPlace = computed(() => myCategoryPlace(visibleRows.value, props.userId))
const hintKey = computed(() => (mode.value === 'streak' ? 'comm_mode_hint_streak' : mode.value === 'points' ? 'comm_mode_hint_points' : 'comm_mode_hint_value'))
// Главное значение строки: сумма / баллы / серия — зависит от выбранного режима (остальные — мелким под именем)
function mainValue(row: Parameters<typeof modeValue>[0]): string {
  const v = modeValue(row, mode.value)
  return mode.value === 'streak' ? (v > 0 ? t('comm_streak_days').replace('{n}', String(v)) : '—') : String(v)
}

const chartPoints = computed(() => (own.value.status === 'ready' ? categoryChartPoints(own.value.values, period.range, period.from, period.to) : []))
const chartGoal = computed(() => (own.value.status === 'ready' ? defaultGoalSum(own.value.metrics) : null))

// Метрика в выпадашке привязки: эмодзи-иконка показывается, svg:-иконки (нет компонента
// MetricIcon в этой папке) — нет, остаётся название.
function metricLabel(m: { name: string; icon: string | null; category_id: string | null }): string {
  const icon = m.icon && !m.icon.startsWith('svg:') ? m.icon + ' ' : ''
  return icon + m.name + (m.category_id ? ` (${t('comm_already_linked')})` : '')
}

async function refresh() {
  if (!catKey.value) {
    reset()
    return
  }
  await Promise.all([loadLeaderboard(catKey.value, range.value), loadOwn(props.userId, catKey.value)])
  if (own.value.status === 'unlinked') linkTarget.value = own.value.candidates[0]?.id ?? ''
}

async function onLink() {
  if (!currentCategory.value || !linkTarget.value) return
  try {
    await linkMetric(linkTarget.value, currentCategory.value.id)
    linkMsg.value = { text: t('comm_link_success_toast'), error: false }
    await refresh()
  } catch (err) {
    linkMsg.value = { text: t('comm_link_error') + friendlyError(err, 'save'), error: true }
  }
}

function pickRange(r: CategoryRange) {
  range.value = r
  refresh()
}

function onCategoryChange() {
  saveCategoryKey(catKey.value)
  refresh()
}

// Сразу открыта запомненная (или первая) категория — не пустой экран «выбери категорию»
onMounted(async () => {
  await loadCategories()
  catKey.value = initialCategoryKey(categories.value, loadCategoryKey())
  if (catKey.value) await refresh()
})
</script>

<template>
  <section>
    <h2 class="mb-1 text-lg font-medium"><EmojiText :text="t('comm_category_h2')" /></h2>
    <p class="dim mb-2 text-sm">{{ t('comm_category_intro') }}</p>

    <select v-model="catKey" class="mb-3 w-full" data-testid="category-select" @change="onCategoryChange">
      <option value="">{{ t('comm_select_category') }}</option>
      <option v-for="c in categories" :key="c.key" :value="c.key">{{ categoryLabel(c) }}</option>
    </select>

    <div class="card rounded-lg border p-3.5" style="border-color: var(--border)">
      <p v-if="!catKey" class="dim">{{ t('comm_pick_category_above') }}</p>

      <template v-else>
        <div class="mb-2 flex flex-wrap gap-1.5" data-testid="category-ranges">
          <button v-for="[key, label] in rangeButtons" :key="key" :class="{ secondary: range !== key }" @click="pickRange(key)">{{ t(label as any) }}</button>
        </div>
        <div class="mb-1 flex flex-wrap gap-1.5" data-testid="category-modes">
          <button v-for="[key, label] in modeButtons" :key="key" :class="{ secondary: mode !== key }" @click="mode = key">{{ t(label as any) }}</button>
        </div>
        <p class="dim mb-2.5 text-xs" data-testid="category-mode-hint">{{ t(hintKey as any) }}</p>

        <p v-if="rowsLoading" class="dim">…</p>
        <p v-else-if="error" class="dim">{{ t('comm_load_error') }} {{ error }}</p>
        <p v-else-if="visibleRows.length === 0" class="dim">{{ t('comm_nobody_tracking') }}</p>
        <template v-else>
          <p v-if="myPlace" class="mb-2 text-sm font-medium" style="color: var(--accent)" data-testid="category-my-place">{{ t('comm_my_place').replace('{n}', String(myPlace.rank)).replace('{m}', String(myPlace.total)) }}</p>
          <div>
            <div v-for="(row, i) in visibleRows" :key="row.user_id" class="flex items-center gap-3 border-b py-2 last:border-0" style="border-color: var(--border)" data-testid="category-row">
              <span class="dim w-7 text-sm">#{{ i + 1 }}</span>
              <Avatar :name="row.display_name" :url="row.avatar_url" :size="32" />
              <div class="min-w-0 flex-1">
                <div class="truncate" :style="row.user_id === userId ? 'font-weight:bold;color:var(--accent)' : ''">{{ row.display_name }}</div>
                <div class="dim text-xs">{{ row.total_value }} · {{ row.category_points }} <Icon name="star" /> · <Icon name="flame" /> {{ row.category_streak > 0 ? row.category_streak : '—' }}</div>
              </div>
              <span class="font-medium" data-testid="category-main-value">{{ mainValue(row) }}</span>
            </div>
          </div>
        </template>
      </template>
    </div>

    <!-- Личный график / привязка своей метрики -->
    <div v-if="catKey && own.status !== 'idle'" class="card mt-2.5 rounded-lg border p-3.5" style="border-color: var(--border)">
      <template v-if="own.status === 'ready'">
        <div class="mb-2 flex items-center gap-2">
          <strong><EmojiText :text="t('comm_your_progress_chart')" /></strong>
        </div>
        <div class="mb-2.5"><PeriodPicker :state="period" @change="onPeriodChange" /></div>
        <ChartBlock :points="chartPoints" color="var(--accent)" :goal-value="chartGoal" :goal-label="chartGoal != null ? `${t('chart_goal_label')} ${chartGoal}` : null" />
      </template>

      <template v-else-if="own.status === 'unlinked' && currentCategory">
        <p class="dim">{{ t('comm_no_own_metric_1') }} «{{ currentCategory.label_ru }}» {{ t('comm_no_own_metric_2') }}</p>
        <div v-if="own.candidates.length" class="mt-2 flex flex-wrap items-center gap-2">
          <select v-model="linkTarget">
            <option v-for="m in own.candidates" :key="m.id" :value="m.id">{{ metricLabel(m) }}</option>
          </select>
          <button @click="onLink"><EmojiText :text="t('comm_link_btn')" /></button>
        </div>
        <p v-else class="dim mt-2"><EmojiText :text="t('comm_no_number_metrics')" /></p>
        <p v-if="linkMsg" class="mt-1.5 text-xs" :style="{ color: linkMsg.error ? 'var(--danger)' : 'inherit' }">{{ linkMsg.text }}</p>
      </template>
    </div>
  </section>
</template>
