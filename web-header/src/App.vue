<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { sb } from './lib/supabase'
import { getLang, t } from './lib/i18n'
import { progressPercent } from './lib/progress'
import { dayRingTarget, weekRingTarget } from './lib/ringPlacement'
import { useHeaderProgress } from './lib/useHeaderProgress'
import { useWater } from './lib/useWater'
import DayWeekBadge from './components/DayWeekBadge.vue'
import WaterGlass from './components/WaterGlass.vue'
import WaterModal from './components/WaterModal.vue'
import ProgressSummaryModal from './components/ProgressSummaryModal.vue'
import ProgressSettingsModal from './components/ProgressSettingsModal.vue'

// Глобальный хедер (BACKLOG 2.3): стакан воды + кольца дня/недели в #topbar-right на любой странице, кроме Дашборда
// (там свои). Без сессии — молчим (страница сама отправит на вход). Ничего не показываем, пока не загрузились данные,
// чтобы шапка не «прыгала».
const userId = ref<string | null>(null)
const ready = ref(false)

const { day, week, summaries, settings, init: initProgress, saveSettings } = useHeaderProgress()
const { metric, normMl, autoNormMl, weightKg, todayMl, loaded: waterLoaded, error: waterError, saveError, init: initWater, addMl, getMlForDate, saveGoal } = useWater()

onMounted(async () => {
  const { data } = await sb.auth.getSession()
  const uid = data.session?.user.id
  if (!uid) return
  userId.value = uid
  await Promise.all([initProgress(uid), initWater(uid)])
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
    title: `${label}: ${pct}% (${p.done}/${p.total}${p.bonusPct > 0 ? ' +' + p.bonusPct + '% ⭐' : ''})`,
  }
}
const dayRing = computed(() => (day.value && showDay.value ? ring(day.value, t('dash_day_progress_label')) : null))
const weekRing = computed(() => (week.value && showWeek.value ? ring(week.value, t('dash_week_progress_label')) : null))

const unitLabel = computed(() => (getLang() === 'en' ? 'ml' : 'мл'))
const waterVisible = computed(() => waterLoaded.value && !waterError.value && !!metric.value)

const waterOpen = ref(false)
const summaryKind = ref<'day' | 'week' | null>(null)
const settingsOpen = ref(false)

// «Записалось» — только после подтверждённой записи (см. useWater.addMl: null при ошибке БД)
const savedTick = ref(0)
const goalSavedTick = ref(0)
async function onAdd(ml: number, dateStr: string) {
  if ((await addMl(ml, dateStr)) !== null) savedTick.value++
}
async function onSaveGoal(ml: number) {
  if (await saveGoal(ml)) goalSavedTick.value++
}
async function onSaveSettings(s: Parameters<typeof saveSettings>[0]) {
  await saveSettings(s)
  settingsOpen.value = false
}
</script>

<template>
  <div v-if="ready && userId" class="gh-root" data-test="header-widgets">
    <WaterGlass v-if="waterVisible" :today-ml="todayMl" :norm-ml="normMl" :title="`💧 ${todayMl} / ${normMl} ${unitLabel}`" @click="waterOpen = true" />
    <DayWeekBadge v-if="dayRing" kind="day" v-bind="dayRing" @click="summaryKind = 'day'" />
    <DayWeekBadge v-if="weekRing" kind="week" v-bind="weekRing" @click="summaryKind = 'week'" />

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
      :save-error="saveError"
      @close="waterOpen = false"
      @add="onAdd"
      @save-goal="onSaveGoal"
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
