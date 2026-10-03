<script setup lang="ts">
import EmojiText from './components/EmojiText.vue'
import { onMounted, ref, computed } from 'vue'
import AppShell from './components/AppShell.vue'
import StreakFlame from './components/StreakFlame.vue'
import MetricIcon from './components/MetricIcon.vue'
import WaterSection from './components/WaterSection.vue'
import ChartsSection from './components/ChartsSection.vue'
import MetricsManagerSection from './components/MetricsManagerSection.vue'
import HeaderProgressBadge from './components/HeaderProgressBadge.vue'
import { dayRingTarget, weekRingTarget } from './lib/ringPlacement'
import type { RingData } from './lib/ringPlacement'
import ProgressSettingsModal from './components/ProgressSettingsModal.vue'
import ProgressSummaryModal from './components/ProgressSummaryModal.vue'
import ReminderBanners from './components/ReminderBanners.vue'
import EveningReminderBanner from './components/EveningReminderBanner.vue'
import WaterReminderBanner from './components/WaterReminderBanner.vue'
import SplashLoader from './components/SplashLoader.vue'
import PointsFloat from './components/PointsFloat.vue'
import StreakMilestoneModal from './components/StreakMilestoneModal.vue'
import PlanReminderBanner from './components/PlanReminderBanner.vue'
import InstallBanner from './components/InstallBanner.vue'
import ProfileSection from './components/ProfileSection.vue'
import DailyMetricsSection from './components/DailyMetricsSection.vue'
import LayoutModal from './components/LayoutModal.vue'
import BlockDragHandle from './components/BlockDragHandle.vue'
import BlockDragOverlay from './components/BlockDragOverlay.vue'
import Icon from './components/Icon.vue'
import SectionHeading from './components/SectionHeading.vue'
import { vCollapse } from './lib/collapseMotion'
import { useReminders } from './lib/useReminders'
import { useEveningReminder } from './lib/useEveningReminder'
import { useWaterReminder } from './lib/useWaterReminder'
import { usePlanReminders } from './lib/usePlanReminders'
import { useDashboard } from './lib/useDashboard'
import { useStreakCelebration } from './lib/useStreakCelebration'
import { useLayout } from './lib/useLayout'
import { useBlockDrag } from './lib/blockDrag'
import type { LayoutItem } from './lib/layout'
import { progressPercent } from './lib/progress'
import { t } from './lib/i18n'
import type { StreakItem } from './lib/streaks'
import { metricStreakMap } from './lib/metricStreaks'
import type { DayProgressSettings } from './lib/progressSettings'
import { stripEmoji } from './lib/emojiText'

// Дашборд переносится по частям (см. ROADMAP.md, тикет B-dashboard) — самая большая и
// сложная страница сайта, над ней параллельно работают несколько агентов, каждый блок — свой
// компонент + свой lib/composable (чтобы не сталкиваться при мерже, см. COORDINATION.md).
// Дневные метрики (boolean/number/multiselect) встраивают в себя «Подходы» и «Цели на сегодня»
// с общей выбранной датой (см. DailyMetricsSection.vue). Раскладка блоков (показать/скрыть/переставить) —
// lib/layout.ts + useLayout.ts + LayoutModal.vue, колонка profiles.dashboard_layout общая с классикой.

const { auth, streaks, dayProgress, weekProgress, summaries, progressSettings, loadError, init, saveProgressSettings } = useDashboard()
// Поздравление за серию (BACKLOG 13): один раз на порог 5/10/30/…, выключается в плашке или в ⚙ «Настроить Дашборд»
const { pending: milestone, close: closeMilestone, disable: disableMilestone } = useStreakCelebration(
  () => (auth.value.status === 'ready' ? auth.value.userId : null),
  streaks,
)
const { items: eveningItems, visible: eveningVisible, load: loadEveningReminder, dismiss: dismissEveningReminder } = useEveningReminder()
const { visible: waterReminderVisible, ml: waterReminderMl, goal: waterReminderGoal, load: loadWaterReminder, dismiss: dismissWaterReminder } = useWaterReminder()
const { layout, loaded: layoutLoaded, saveError: layoutError, load: loadLayout, save: saveLayout } = useLayout()
const { visible: planReminders, load: loadPlanReminders, dismiss: dismissPlanReminder } = usePlanReminders()
const { milestonesReminder, weekendReminderVisible, loadMilestonesReminder, dismissMilestonesReminder, checkWeekendReminder, dismissWeekendReminder } = useReminders()
onMounted(async () => {
  await init()
  if (auth.value.status === 'ready') {
    await loadLayout(auth.value.userId)
    await loadMilestonesReminder(auth.value.userId)
    void loadEveningReminder(auth.value.userId)
    void loadWaterReminder(auth.value.userId)
    void loadPlanReminders(auth.value.userId)
    if (weekProgress.value) checkWeekendReminder(progressPercent(weekProgress.value))
  }
})

const showAllStreaks = ref(false)
const showProgressSettings = ref(false)
const summaryKind = ref<'day' | 'week' | null>(null)
const showLayoutModal = ref(false)
// Перетаскивание блоков прямо на главной (пожелание владельца, 2026-10-03): ручка ☰ в заголовке каждого видимого блока, поверх страницы
// на время жеста — компактные карточки блоков (lib/blockDrag.ts, BlockDragOverlay.vue). Порядок меняется на экране сразу,
// запись в БД — следом; при сбое записи возвращаем прежний порядок и показываем ошибку.
const blockMoveError = ref('')
async function onBlockMove(next: LayoutItem[]) {
  if (auth.value.status !== 'ready') return
  const prev = layout.value
  blockMoveError.value = ''
  layout.value = next
  if (!(await saveLayout(auth.value.userId, next))) {
    layout.value = prev
    blockMoveError.value = layoutError.value
  }
}
const { drag: blockDrag, onDown: dragDown, onMove: dragMove, onUp: dragUp, onCancel: dragCancel, onKey: dragKey } = useBlockDrag(() => layout.value, onBlockMove)
const visibleBlockCount = computed(() => layout.value.filter((i: LayoutItem) => i.visible).length)
const blockTitles = computed<Record<string, string>>(() => ({ profile: t('dash_block_profile'), charts: t('dash_charts_h2'), daily: t('dash_block_daily') }))
const dragItems = computed(() => layout.value.filter((i: LayoutItem) => i.visible).map((i: LayoutItem) => ({ key: i.key, title: blockTitles.value[i.key] })))
const profileCollapsed = ref(false)
const chartsCollapsed = ref(false)
// пока ни один график не построен (нет данных/мало данных) — блок «Графики» свёрнут по умолчанию (BACKLOG 17); явный выбор пользователя сильнее
const chartsState = ref<{ loaded: boolean; hasChart: boolean }>({ loaded: false, hasChart: false })
const chartsDefaultCollapsed = computed(() => chartsState.value.loaded && !chartsState.value.hasChart)
const topStreak = computed<StreakItem | null>(() => streaks.value[0] ?? null)
// огонёк и число дней серии у каждой метрики в «Дневных метриках» (BACKLOG 18.5)
const metricStreaks = computed(() => metricStreakMap(streaks.value))

function streakLabel(item: StreakItem): string {
  if (item.kind === 'perfect_days') return t('dash_streak_perfect_days')
  if (item.kind === 'note_filled') return t('dash_streak_note_filled')
  return item.metric?.name ?? ''
}

const dayPct = computed(() => (dayProgress.value ? progressPercent(dayProgress.value) : 0))
const dayBase = computed(() => (dayProgress.value && dayProgress.value.total > 0 ? dayProgress.value.done / dayProgress.value.total : 0))
const dayTitle = computed(() => {
  const p = dayProgress.value
  if (!p) return ''
  return `${t('dash_day_progress_label')}: ${dayPct.value}% (${p.done}/${p.total}${p.bonusPct > 0 ? ' +' + p.bonusPct + '% ⭐' : ''})`
})

const weekPct = computed(() => (weekProgress.value ? progressPercent(weekProgress.value) : 0))
const weekBase = computed(() => (weekProgress.value && weekProgress.value.total > 0 ? weekProgress.value.done / weekProgress.value.total : 0))
const weekTitle = computed(() => {
  const p = weekProgress.value
  if (!p) return ''
  return `${t('dash_week_progress_label')}: ${weekPct.value}% (${p.done}/${p.total}${p.bonusPct > 0 ? ' +' + p.bonusPct + '% ⭐' : ''})`
})

// "off" или пусто (total=0 и bonus=0) — не показываем, как и в dashboard.js; иначе кольцо уходит
// либо в профиль (вокруг аватарки / в строку профиля), либо бейджем в шапку.
const hasDayData = computed(() => !!dayProgress.value && (dayProgress.value.total > 0 || dayProgress.value.bonusPct > 0))
const hasWeekData = computed(() => !!weekProgress.value && (weekProgress.value.total > 0 || weekProgress.value.bonusPct > 0))
const dayTarget = computed(() => dayRingTarget(progressSettings.value.dayPlace, hasDayData.value))
const weekTarget = computed(() => weekRingTarget(progressSettings.value.weekPlace, hasWeekData.value))
const dayRing = computed<RingData | null>(() =>
  hasDayData.value ? { basePct: dayBase.value, bonusPct: dayProgress.value!.bonusPct, totalPct: dayPct.value, title: dayTitle.value } : null,
)
const weekRing = computed<RingData | null>(() =>
  hasWeekData.value ? { basePct: weekBase.value, bonusPct: weekProgress.value!.bonusPct, totalPct: weekPct.value, title: weekTitle.value } : null,
)
// Если блок «Профиль» скрыт в раскладке, кольцам «вокруг аватарки»/«в профиле» некуда встать — показываем их бейджем в шапке.
const profileVisible = computed(() => layout.value.some((i: LayoutItem) => i.key === 'profile' && i.visible))
const dayRingProfile = computed(() => (dayTarget.value === 'avatar' && profileVisible.value ? dayRing.value : null))
const weekRingProfile = computed(() => (weekTarget.value === 'profile' && profileVisible.value ? weekRing.value : null))
const dayRingHeader = computed(() => (dayTarget.value === 'header' || (dayTarget.value === 'avatar' && !profileVisible.value) ? dayRing.value : null))
const weekRingHeader = computed(() => (weekTarget.value === 'header' || (weekTarget.value === 'profile' && !profileVisible.value) ? weekRing.value : null))

async function onSaveLayout(next: LayoutItem[]) {
  if (auth.value.status !== 'ready') return
  if (await saveLayout(auth.value.userId, next)) showLayoutModal.value = false
}

async function onSaveProgressSettings(s: DayProgressSettings) {
  showProgressSettings.value = false
  await saveProgressSettings(s)
}
</script>

<template>
  <AppShell :user-email="auth.status === 'ready' ? auth.userEmail : null" />
  <PointsFloat />
  <BlockDragOverlay v-if="blockDrag" :items="dragItems" :drag="blockDrag" />

  <main class="mx-auto max-w-3xl px-4 pb-16 pt-4">
    <div class="mb-3 flex items-center gap-2">
      <h1 class="flex-1 text-xl font-semibold"><EmojiText :text="t('dash_h1')" /></h1>
      <button
        v-if="auth.status === 'ready'"
        type="button"
        class="rounded-lg border px-2.5 py-1.5"
        style="border-color: var(--border); background: var(--bg); color: var(--text)"
        data-test="customize-btn"
        :title="t('dash_customize_btn')"
        :aria-label="t('dash_customize_btn')"
        @click="showLayoutModal = true"
      >
        <Icon name="gear" />
      </button>
    </div>

    <SplashLoader v-if="auth.status === 'loading'" />

    <template v-else-if="auth.status === 'ready'">
      <ReminderBanners
        :milestones-reminder="milestonesReminder"
        :weekend-reminder-visible="weekendReminderVisible"
        :week-total-pct="weekProgress ? progressPercent(weekProgress) : 0"
        @dismiss-milestones="dismissMilestonesReminder"
        @dismiss-weekend="dismissWeekendReminder"
      />
      <InstallBanner />
      <PlanReminderBanner :items="planReminders" @dismiss="dismissPlanReminder" />
      <WaterReminderBanner v-if="waterReminderVisible" :ml="waterReminderMl" :goal="waterReminderGoal" @dismiss="dismissWaterReminder" />
      <EveningReminderBanner v-if="eveningVisible" :items="eveningItems" @dismiss="dismissEveningReminder" />

      <HeaderProgressBadge v-if="dayRingHeader" kind="day" v-bind="dayRingHeader" @click="summaryKind = 'day'" />
      <HeaderProgressBadge v-if="weekRingHeader" kind="week" v-bind="weekRingHeader" @click="summaryKind = 'week'" />
      <WaterSection :user-id="auth.userId" />

      <p v-if="blockMoveError" class="mb-2 text-sm" style="color: #d6336c" data-test="block-move-error">{{ t('dash_layout_save_error') }}{{ blockMoveError }}</p>

      <template v-if="layoutLoaded">
        <template v-for="item in layout" :key="item.key">
          <template v-if="item.visible">
            <template v-if="item.key === 'profile'">
              <SectionHeading v-model:collapsed="profileCollapsed" :title="stripEmoji(t('dash_block_profile'))" storage-key="profile">
                <template v-if="visibleBlockCount > 1" #actions>
                  <BlockDragHandle :block-key="'profile'" @down="dragDown" @move="dragMove" @up="dragUp" @cancel="dragCancel" @key="dragKey" />
                </template>
              </SectionHeading>
              <div v-collapse="!profileCollapsed">
                <ProfileSection
                  :user-id="auth.userId"
                  :day="dayRingProfile"
                  :week="weekRingProfile"
                  :top-streak="topStreak"
                  :streak-count="streaks.length"
                  @progress-settings="summaryKind = $event"
                  @show-streaks="showAllStreaks = true"
                />
              </div>
            </template>

            <template v-else-if="item.key === 'daily'">
              <div class="mb-4 flex flex-wrap items-center gap-2">
                <MetricsManagerSection :user-id="auth.userId" @changed="init" />
                <BlockDragHandle class="ml-auto" :block-key="'daily'" @down="dragDown" @move="dragMove" @up="dragUp" @cancel="dragCancel" @key="dragKey" v-if="visibleBlockCount > 1" />
              </div>
              <DailyMetricsSection :user-id="auth.userId" :metric-streaks="metricStreaks" />
            </template>

            <template v-else-if="item.key === 'charts'">
              <SectionHeading v-model:collapsed="chartsCollapsed" :title="stripEmoji(t('dash_charts_h2'))" storage-key="charts" :default-collapsed="chartsDefaultCollapsed">
                <template v-if="visibleBlockCount > 1" #actions>
                  <BlockDragHandle :block-key="'charts'" @down="dragDown" @move="dragMove" @up="dragUp" @cancel="dragCancel" @key="dragKey" />
                </template>
              </SectionHeading>
              <div v-collapse="!chartsCollapsed" class="mb-5">
                <ChartsSection :user-id="auth.userId" :metric-streaks="metricStreaks" @state="chartsState = $event" />
              </div>
            </template>
          </template>
        </template>
      </template>

      <p v-if="loadError" class="dim">{{ t('comm_load_error') }} {{ loadError }}</p>

      <template v-else>
        <template v-if="streaks.length > 0">
          <div v-if="showAllStreaks" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="showAllStreaks = false">
            <div class="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border p-5" style="background: var(--bg-card); border-color: var(--border); color: var(--text)">
              <h3 class="mb-3 text-lg font-bold"><EmojiText :text="t('dash_streaks_h2')" /></h3>

              <p
                v-if="streaks.some((i) => !i.todayCounted)"
                class="mb-3 rounded-lg border p-2 text-sm"
                style="background: rgba(214, 51, 108, 0.12); border-color: #d6336c"
              >
                <EmojiText :text="t('dash_streak_at_risk_warning')" />
              </p>

              <div class="flex flex-wrap gap-2.5">
                <div
                  v-for="(item, i) in streaks"
                  :key="i"
                  class="rounded-lg border p-2.5"
                  :style="{ borderColor: item.todayCounted ? 'var(--border)' : '#d6336c' }"
                >
                  <div class="flex items-center gap-1 text-lg font-bold">
                    {{ item.streak }}{{ item.unit === 'w' ? ' ' + t('dash_streak_unit_weeks') : '' }}
                    <StreakFlame :lit="item.todayCounted" />
                  </div>
                  <div class="dim flex items-center gap-1 text-xs">
                    <MetricIcon v-if="item.kind === 'metric'" :icon="item.metric?.icon" />
                    {{ streakLabel(item) }}{{ item.todayCounted ? '' : ' · ' + t('dash_streak_not_done_today') }}
                  </div>
                </div>
              </div>

              <div class="mt-4 flex justify-end">
                <button
                  type="button"
                  class="rounded-lg border px-4 py-2 text-sm"
                  style="border-color: var(--border); background: var(--bg); color: var(--text)"
                  @click="showAllStreaks = false"
                >
                  {{ t('dash_close_btn') }}
                </button>
              </div>
            </div>
          </div>
        </template>
      </template>
    </template>

    <LayoutModal v-if="showLayoutModal" :initial="layout" :error="layoutError" @close="showLayoutModal = false" @save="onSaveLayout" />
    <ProgressSummaryModal
      v-if="summaryKind && summaries"
      :kind="summaryKind"
      :summary="summaries[summaryKind]"
      @close="summaryKind = null"
      @settings="summaryKind = null; showProgressSettings = true"
    />
    <ProgressSettingsModal v-if="showProgressSettings" :initial="progressSettings" @close="showProgressSettings = false" @save="onSaveProgressSettings" />
    <StreakMilestoneModal v-if="milestone" :milestone="milestone" @close="closeMilestone" @disable="disableMilestone" />
  </main>
</template>

<style scoped>
.streak-unlit {
  opacity: 0.55;
}
</style>
