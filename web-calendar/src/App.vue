<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppShell from './components/AppShell.vue'
import DayModal from './components/DayModal.vue'
import { useCalendar } from './lib/useCalendar'
import { t } from './lib/i18n'
import type { PlannedItem } from './lib/types'
import HistoryView from './components/HistoryView.vue'

const { auth, byDate, deadlines, init, loadMonth, savePlanned } = useCalendar()

const initialView = new URLSearchParams(window.location.search).get('view') === 'history' ? 'history' : 'calendar'
const view = ref<'calendar' | 'history'>(initialView)
function setView(next: 'calendar' | 'history') {
  view.value = next
  const url = new URL(window.location.href)
  if (next === 'history') url.searchParams.set('view', 'history')
  else url.searchParams.delete('view')
  window.history.replaceState({}, '', url)
}

// Сетка вкладки «Календарь» — та же, что в «Истории» (HistoryView, mode="calendar", BACKLOG 44.8): сама листает месяцы и сообщает, какой месяц показан,
// а планы и дедлайны целей этого месяца подгружаются здесь (useCalendar).
const shownYear = ref(new Date().getFullYear())
const shownMonth = ref(new Date().getMonth())
async function reloadMonth() {
  if (auth.value.status !== 'ready') return
  await loadMonth(auth.value.userId, shownYear.value, shownMonth.value)
}
function onMonthChange(year: number, month: number) {
  shownYear.value = year
  shownMonth.value = month
  void reloadMonth()
}

onMounted(async () => {
  await init()
  await reloadMonth()
})

const openDate = ref<string | null>(null)
function openDay(dateStr: string) {
  openDate.value = dateStr
}
async function onSaveDay(items: PlannedItem[]) {
  if (auth.value.status !== 'ready' || !openDate.value) return
  await savePlanned(auth.value.userId, openDate.value, items)
  openDate.value = null
}
</script>

<template>
  <AppShell :user-email="auth.status === 'ready' ? auth.userEmail : null" />

  <main class="mx-auto max-w-3xl px-4 pb-16 pt-4">
    <div class="mb-4 flex rounded-xl border p-1" style="border-color: var(--border); background: var(--bg-card)" data-test="calendar-history-tabs">
      <button type="button" class="flex-1 rounded-lg px-3 py-2 text-sm font-medium" :style="{ background: view === 'calendar' ? 'var(--accent)' : 'transparent', color: view === 'calendar' ? 'var(--accent-text)' : 'var(--text)' }" data-test="calendar-tab" @click="setView('calendar')">{{ t('cal_title') }}</button>
      <button type="button" class="flex-1 rounded-lg px-3 py-2 text-sm font-medium" :style="{ background: view === 'history' ? 'var(--accent)' : 'transparent', color: view === 'history' ? 'var(--accent-text)' : 'var(--text)' }" data-test="history-tab" @click="setView('history')">{{ t('hist_title') }}</button>
    </div>

    <template v-if="view === 'history'">
      <HistoryView />
    </template>
    <template v-else>
    <!-- Сетка «Календаря» = сетка «Истории» (заливка дня по прогрессу, %, колонка недели, статистика месяца) + бейджи планов и дедлайнов целей;
         свайп по сетке и шапке месяца не выдвигает боковые плашки (внутри HistoryView — no-edge-swipe / data-no-swipe) -->
    <HistoryView mode="calendar" :planned="byDate" :deadlines="deadlines" data-test="calendar-grid-view" @select-day="openDay" @month-change="onMonthChange" />

    <DayModal
      v-if="openDate"
      :date-str="openDate"
      :initial="byDate[openDate] || []"
      :deadlines="deadlines[openDate] || []"
      @close="openDate = null"
      @save="onSaveDay"
    />
    </template>
  </main>
</template>
