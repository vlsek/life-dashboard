<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { sb } from './lib/supabase'
import { getLang, t } from './lib/i18n'
import { progressPercent } from './lib/progress'
import { todayStr } from './lib/date'
import { dayRingTarget, weekRingTarget } from './lib/ringPlacement'
import { useHeaderProgress } from './lib/useHeaderProgress'
import { useWater } from './lib/useWater'
import { ensureTrackWater, trackWater } from './lib/waterTracking'
import { useMuscles } from './lib/useMuscles'
import DayWeekBadge from './components/DayWeekBadge.vue'
import WaterGlass from './components/WaterGlass.vue'
import WaterModal from './components/WaterModal.vue'
import ProgressSummaryModal from './components/ProgressSummaryModal.vue'
import ProgressSettingsModal from './components/ProgressSettingsModal.vue'
import RightPanel, { type GaugeData } from './components/RightPanel.vue'
import SettingsModal from './components/SettingsModal.vue'
import FavoriteHeart from './components/FavoriteHeart.vue'
import SidebarTop from './components/SidebarTop.vue'
import PointsFloat from './components/PointsFloat.vue'
import { useSidebarProfile } from './lib/sidebarProfile'
import { sidebarProgress } from './lib/prefs'
import { syncUnlockedThemes } from './lib/syncUnlockedThemes'
import { pageKeyFor, readFavorites, saveFavoritesToProfile, syncFavoritesFromProfile, toggleFavorite, writeFavorites } from './lib/favorites'

// panelOnly — режим для Дашборда: своя шапка (стакан, кольца) там уже есть, поэтому бандл даёт только правую панель.
const props = defineProps<{ panelOnly?: boolean }>()

// Глобальный хедер (BACKLOG 2.3): стакан воды + кольца дня/недели в #topbar-right на любой странице, кроме Дашборда
// (там свои). Без сессии — молчим (страница сама отправит на вход). Ничего не показываем, пока не загрузились данные,
// чтобы шапка не «прыгала».
const userId = ref<string | null>(null)
const userEmail = ref<string | null>(null)
const sideProfile = useSidebarProfile()
// Левое меню (BACKLOG 6.2): блок профиля рисуем в #sidebar-top, который AppShell ставит первым в <nav>; нет якоря — ничего не делаем
const sidebarTarget = ref<HTMLElement | null>(null)
const ready = ref(false)

const { day, week, weekDays, summaries, settings, init: initProgress, saveSettings } = useHeaderProgress()
const { metric, normMl, autoNormMl, weightKg, heightCm, saveHeight, todayMl, loaded: waterLoaded, error: waterError, saveError, init: initWater, addMl, setTotal, undoLast, removeLogEntry, canUndo, dayLog, loadDayLog, getMlForDate, saveGoal, resetGoalToAuto } = useWater()

onMounted(async () => {
  const { data } = await sb.auth.getSession()
  const uid = data.session?.user.id
  if (!uid) return
  userId.value = uid
  userEmail.value = data.session?.user.email ?? null
  sidebarTarget.value = document.getElementById('sidebar-top')
  void sideProfile.load(uid, data.session?.user)
  void syncUnlockedThemes(uid) // какие темы-награды открыты (замок тем, v3.42)
  void ensureTrackWater(uid) // «Отслеживать воду» (BACKLOG 932): сначала из кэша устройства — стакан не мигает
  await Promise.all([initProgress(uid), initWater(uid), syncFavoritesFromProfile(uid).then((l) => (favorites.value = l))])
  ready.value = true
})

const has = (p: { total: number; bonusPct: number } | null) => !!p && (p.total > 0 || p.bonusPct > 0)
// На других страницах кольца показываем всегда, когда они не выключены (место «аватарка/профиль» — только у Дашборда).
const showDay = computed(() => dayRingTarget(settings.value.dayPlace, has(day.value)) !== null)
const showWeek = computed(() => weekRingTarget(settings.value.weekPlace, has(week.value)) !== null)

function ring(p: NonNullable<typeof day.value>, label: string) {
  const pct = progressPercent(p)
  return {
    basePct: p.total > 0 ? p.done / p.total : 0,
    bonusPct: p.bonusPct,
    totalPct: pct,
    title: `${label}: ${pct}% (${p.done}/${p.total}${p.bonusPct > 0 ? ' +' + p.bonusPct + '%' : ''})`,
  }
}
const dayRing = computed(() => (day.value && showDay.value ? ring(day.value, t('dash_day_progress_label')) : null))
const weekRing = computed(() => (week.value && showWeek.value ? { ...ring(week.value, t('dash_week_progress_label')), shape: settings.value.weekShape, days: weekDays.value } : null))

const unitLabel = computed(() => (getLang() === 'en' ? 'ml' : 'мл'))
// «Отслеживать воду» выключено (BACKLOG 932) — ни стакана, ни блока воды в правой панели, ни окна воды
const waterVisible = computed(() => trackWater.value && waterLoaded.value && !waterError.value && !!metric.value)

const waterOpen = ref(false)
watch(trackWater, (on) => {
  if (!on) waterOpen.value = false // выключили, пока окно воды было открыто
})
const panelOpen = ref(false)
const globalSettingsOpen = ref(false)
// «Избранное»: сердечко есть только на страницах из бокового меню (не на Дашборде/служебных); на Дашборде бандл лишь синхронизирует список
const favorites = ref<string[]>(readFavorites())
const pageKey = pageKeyFor(location.pathname)
const isFavorite = computed(() => !!pageKey && favorites.value.includes(pageKey))
function onToggleFavorite() {
  if (!pageKey || !userId.value) return
  const next = toggleFavorite(favorites.value, pageKey)
  favorites.value = next
  writeFavorites(next)
  void saveFavoritesToProfile(userId.value, next)
}
const muscles = useMuscles()
// карта мышц грузится лениво: при каждом открытии панели (подходы могли добавить на другой странице)
watch(panelOpen, (open) => {
  if (open && userId.value) void muscles.load(userId.value)
})
const panelMuscles = computed(() => (muscles.loaded.value && muscles.hasExercises.value ? { done: muscles.done.value, last: muscles.last.value } : null))
const summaryKind = ref<'day' | 'week' | null>(null)
const settingsOpen = ref(false)

// «Записалось» — только после подтверждённой записи (см. useWater.addMl: null при ошибке БД)
const savedTick = ref(0)
const goalSavedTick = ref(0)
const goalSavedMsg = ref<'manual' | 'auto' | 'height'>('manual')
async function onAdd(ml: number, dateStr: string, drankAt?: number) {
  if ((await addMl(ml, dateStr, drankAt)) !== null) savedTick.value++
}
// Отмена последнего добавления и правка суммы за день (BACKLOG 12): та же «записалось»-анимация после подтверждённой записи
async function onUndo(dateStr: string) {
  const v = await undoLast(dateStr)
  if (v !== null) savedTick.value++
  return v
}
// «Крестик» у записи журнала (BACKLOG 23:17) и «Отменить последнее» в правой шторке (BACKLOG 08:55): та же «записалось»-анимация
async function onRemoveEntry(dateStr: string, id: string) {
  const v = await removeLogEntry(dateStr, id)
  if (v !== null) savedTick.value++
  return v
}
const panelCanUndoWater = computed(() => canUndo(todayStr(), todayMl.value))
async function onPanelUndoWater() {
  await onUndo(todayStr())
}
async function onSetTotal(ml: number, dateStr: string) {
  const v = await setTotal(ml, dateStr)
  if (v !== null) savedTick.value++
  return v
}
async function onSaveGoal(ml: number) {
  if (await saveGoal(ml)) {
    goalSavedMsg.value = 'manual'
    goalSavedTick.value++
  }
}
async function onSaveHeight(cm: number) {
  if (await saveHeight(cm)) {
    goalSavedMsg.value = 'height'
    goalSavedTick.value++
  }
}
async function onResetGoal() {
  if (await resetGoalToAuto()) {
    goalSavedMsg.value = 'auto'
    goalSavedTick.value++
  }
}
// Данные для спидометров панели: панель показывает и день, и неделю, если они не выключены настройкой «Кружок … : выключить»
const gauge = (p: NonNullable<typeof day.value>): GaugeData => {
  const r = ring(p, '')
  return { basePct: r.basePct, bonusPct: r.bonusPct, totalPct: r.totalPct, detail: `${p.done}/${p.total}${p.bonusPct > 0 ? ' +' + p.bonusPct + '% ⭐' : ''}` }
}
const panelDay = computed(() => (day.value && showDay.value ? gauge(day.value) : null))
const panelWeek = computed(() => (week.value && showWeek.value ? { ...gauge(week.value), shape: settings.value.weekShape, days: weekDays.value } : null))
const panelWater = computed(() => (waterVisible.value ? { todayMl: todayMl.value, normMl: normMl.value } : null))
async function onPanelAddWater(ml: number) {
  await onAdd(ml, todayStr())
}

async function onSaveSettings(s: Parameters<typeof saveSettings>[0]) {
  await saveSettings(s)
  settingsOpen.value = false
}
</script>

<template>
  <div v-if="ready && userId" class="gh-root" data-test="header-widgets">
    <Teleport v-if="sidebarTarget" :to="sidebarTarget">
      <SidebarTop
        :display-name="sideProfile.displayName.value"
        :email="userEmail"
        :avatar-url="sideProfile.avatarUrl.value"
        :avatar-frame="sideProfile.avatarFrame.value"
        :show-progress="sidebarProgress"
        :day="dayRing"
        :week="weekRing"
        @open-summary="(k) => (summaryKind = k)"
      />
    </Teleport>
    <PointsFloat v-if="!props.panelOnly" />
    <FavoriteHeart v-if="pageKey && !props.panelOnly" :active="isFavorite" @toggle="onToggleFavorite" />
    <template v-if="!props.panelOnly">
      <WaterGlass v-if="waterVisible" :today-ml="todayMl" :norm-ml="normMl" :title="`${todayMl} / ${normMl} ${unitLabel}`" @click="waterOpen = true" />
      <DayWeekBadge v-if="dayRing" kind="day" v-bind="dayRing" @click="summaryKind = 'day'" />
      <DayWeekBadge v-if="weekRing" kind="week" v-bind="weekRing" @click="summaryKind = 'week'" />
    </template>
    <button type="button" class="gh-badge" data-test="panel-open" :title="t('hdr_panel_open')" :aria-label="t('hdr_panel_open')" @click="panelOpen = true">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim, #999)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="3.5" y="4.5" width="17" height="15" rx="2.2" />
        <path d="M14.5 4.5v15" />
      </svg>
    </button>

    <RightPanel
      v-model:open="panelOpen"
      :day="panelDay"
      :week="panelWeek"
      :water="panelWater"
      :can-undo-water="panelCanUndoWater"
      :saved-tick="savedTick"
      :muscles="panelMuscles"
      @open-summary="(k) => { panelOpen = false; summaryKind = k }"
      @open-water="waterOpen = true"
      @add-water="onPanelAddWater"
      @undo-water="onPanelUndoWater"
      @open-settings="panelOpen = false; globalSettingsOpen = true"
    />
    <SettingsModal
      v-if="globalSettingsOpen && userId"
      :user-id="userId"
      @close="globalSettingsOpen = false"
      @open-progress-settings="settingsOpen = true"
      @open-water="waterOpen = true"
    />

    <WaterModal
      v-if="waterOpen && metric"
      :metric="metric"
      :current-ml="todayMl"
      :norm-ml="normMl"
      :auto-norm-ml="autoNormMl"
      :weight-kg="weightKg"
      :get-ml-for-date="getMlForDate"
      :saved-tick="savedTick"
      :goal-saved-tick="goalSavedTick"
      :goal-saved-msg="goalSavedMsg"
      :height-cm="heightCm"
      @save-height="onSaveHeight"
      :save-error="saveError"
      :can-undo="canUndo"
      :undo-last="onUndo"
      :remove-entry="onRemoveEntry"
      :set-total="onSetTotal"
      :day-log="dayLog"
      :load-day-log="loadDayLog"
      @close="waterOpen = false"
      @add="onAdd"
      @save-goal="onSaveGoal"
      @reset-goal="onResetGoal"
    />
    <ProgressSummaryModal
      v-if="summaryKind && summaries"
      :kind="summaryKind"
      :summary="summaries[summaryKind]"
      @close="summaryKind = null"
      @settings="summaryKind = null; settingsOpen = true"
    />
    <ProgressSettingsModal v-if="settingsOpen" :initial="settings" @close="settingsOpen = false" @save="onSaveSettings" />
  </div>
</template>
