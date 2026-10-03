<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AppShell from './components/AppShell.vue'
import DayModal from './components/DayModal.vue'
import { useCalendar } from './lib/useCalendar'
import { buildMonthGrid, doneCount } from './lib/calendar'
import { todayStr } from './lib/date'
import { t, getLang } from './lib/i18n'
import type { PlannedItem } from './lib/types'
import Icon from './components/Icon.vue'

const { auth, byDate, error, init, loadMonth, savePlanned } = useCalendar()

const viewDate = ref(new Date())
viewDate.value.setDate(1)

const WEEKDAYS = computed(() =>
  getLang() === 'en' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
)
const MONTH_NAMES = computed(() =>
  getLang() === 'en'
    ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    : ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'],
)
const monthLabel = computed(() => `${MONTH_NAMES.value[viewDate.value.getMonth()]} ${viewDate.value.getFullYear()}`)

const today = todayStr()
const grid = computed(() => buildMonthGrid(viewDate.value.getFullYear(), viewDate.value.getMonth(), byDate.value, today))

async function reloadMonth() {
  if (auth.value.status !== 'ready') return
  await loadMonth(auth.value.userId, viewDate.value.getFullYear(), viewDate.value.getMonth())
}

onMounted(async () => {
  await init()
  await reloadMonth()
})
watch(viewDate, reloadMonth, { deep: false })

function prevMonth() {
  const d = new Date(viewDate.value)
  d.setMonth(d.getMonth() - 1)
  viewDate.value = d
}
function nextMonth() {
  const d = new Date(viewDate.value)
  d.setMonth(d.getMonth() + 1)
  viewDate.value = d
}
function goToday() {
  const d = new Date()
  d.setDate(1)
  viewDate.value = d
}

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
    <!-- no-edge-swipe (левая шторка) и data-no-swipe (правая панель шапки): свайп по календарю не должен выдвигать боковые плашки (BACKLOG 25, 07:38) -->
    <div class="no-edge-swipe mb-3 flex items-center justify-between" data-no-swipe data-test="cal-head">
      <button class="secondary" @click="prevMonth">‹</button>
      <h1 class="text-lg font-semibold">{{ monthLabel }}</h1>
      <button class="secondary" @click="nextMonth">›</button>
    </div>
    <div class="mb-3 flex justify-center">
      <button class="secondary" @click="goToday">{{ t('cal_today_btn') }}</button>
    </div>

    <p v-if="auth.status === 'loading'" class="dim">…</p>
    <p v-else-if="error" class="dim">{{ t('comm_load_error') }} {{ error }}</p>

    <div v-else class="cal-grid no-edge-swipe grid grid-cols-7 gap-1" data-no-swipe data-test="cal-grid">
      <div v-for="w in WEEKDAYS" :key="w" class="cal-weekday text-center text-xs font-medium">{{ w }}</div>
      <template v-for="(cell, idx) in grid" :key="idx">
        <div v-if="!cell" class="cal-cell cal-empty"></div>
        <div
          v-else
          class="cal-cell relative cursor-pointer rounded border p-1.5"
          :class="{ 'cal-today border-2': cell.isToday }"
          @click="openDay(cell.dateStr)"
        >
          <div class="cal-num text-sm">{{ cell.day }}</div>
          <div v-if="cell.planned.length" class="cal-badge mt-1 text-xs">
            <template v-if="doneCount(cell.planned).done === doneCount(cell.planned).total"><Icon name="done" /></template>
            <template v-else><Icon name="pin" /> {{ doneCount(cell.planned).done }}/{{ doneCount(cell.planned).total }}</template>
          </div>
        </div>
      </template>
    </div>

    <DayModal
      v-if="openDate"
      :date-str="openDate"
      :initial="byDate[openDate] || []"
      @close="openDate = null"
      @save="onSaveDay"
    />
  </main>
</template>
