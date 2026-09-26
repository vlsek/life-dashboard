<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthAndData } from './lib/useHistoryData'
import { addDaysIso, fmtDate, mondayOf, parseIso } from './lib/date'
import { dayStats, hasData, weekStats } from './lib/stats'
import type { HistoryContext } from './lib/stats'
import { locale, t } from './lib/i18n'
import DayDetailModal from './components/DayDetailModal.vue'
import AppShell from './components/AppShell.vue'

const { auth, ctx, error } = useAuthAndData()

const now = new Date()
const viewYear = ref(now.getFullYear())
const viewMonth = ref(now.getMonth()) // 0..11

const weekdayNames = t('dash_weekdays_short').split(',')

const monthTitle = computed(() => {
  const d = new Date(viewYear.value, viewMonth.value, 1)
  const s = d.toLocaleDateString(locale(), { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
})

const isCurrentMonth = computed(() => viewYear.value === now.getFullYear() && viewMonth.value === now.getMonth())
const nextDisabled = computed(
  () => isCurrentMonth.value || viewYear.value > now.getFullYear() || (viewYear.value === now.getFullYear() && viewMonth.value >= now.getMonth()),
)

function shiftMonth(delta: number) {
  const d = new Date(viewYear.value, viewMonth.value + delta, 1)
  if (d.getFullYear() > now.getFullYear() || (d.getFullYear() === now.getFullYear() && d.getMonth() > now.getMonth())) return
  viewYear.value = d.getFullYear()
  viewMonth.value = d.getMonth()
}
function goToday() {
  viewYear.value = now.getFullYear()
  viewMonth.value = now.getMonth()
}

interface DayCell {
  key: string
  dateStr: string | null
  dayNum: number | null
  isToday: boolean
  isFuture: boolean
  hasStats: boolean
  hasNoData: boolean
  pct: number
  fill: number
  over: boolean
}

const monthGrid = computed(() => {
  const c = ctx.value
  const rows: DayCell[][] = []
  if (!c) return { rows, weekPct: new Map<number, number | null>(), avg: null as number | null, perfect: 0, trackedDays: 0 }

  const first = new Date(viewYear.value, viewMonth.value, 1)
  const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate()
  const lead = (first.getDay() + 6) % 7
  const totalCells = Math.ceil((lead + daysInMonth) / 7) * 7

  let pctSum = 0
  let pctDays = 0
  let perfect = 0
  const weekPct = new Map<number, number | null>() // индекс строки -> % недели (или null)
  let row: DayCell[] = []

  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - lead + 1
    if (dayNum < 1 || dayNum > daysInMonth) {
      row.push({ key: `e${i}`, dateStr: null, dayNum: null, isToday: false, isFuture: false, hasStats: false, hasNoData: false, pct: 0, fill: 0, over: false })
    } else {
      const dateStr = fmtDate(new Date(viewYear.value, viewMonth.value, dayNum))
      const future = dateStr > c.today
      const data = hasData(c, dateStr)
      const st = data ? dayStats(c, dateStr) : null
      const show = !!st && (st.total > 0 || st.bonusPct > 0)
      const fill = show ? Math.max(0, Math.min(100, st!.pct)) : 0
      if (show) {
        pctSum += Math.min(100, st!.pct)
        pctDays++
        if (st!.pct >= 100) perfect++
      }
      row.push({
        key: dateStr,
        dateStr,
        dayNum,
        isToday: dateStr === c.today,
        isFuture: future,
        hasStats: show,
        hasNoData: !data && !future,
        pct: show ? st!.pct : 0,
        fill,
        over: show && st!.pct > 100,
      })
    }

    if (i % 7 === 6) {
      const monday = fmtDate(new Date(viewYear.value, viewMonth.value, i - 6 - lead + 1))
      const ws = weekStats(c, monday)
      weekPct.set(rows.length, ws && (ws.total > 0 || ws.bonusPct > 0) ? ws.pct : null)
      rows.push(row)
      row = []
    }
  }

  return { rows, weekPct, avg: pctDays > 0 ? Math.round(pctSum / pctDays) : null, perfect, trackedDays: pctDays }
})

const recentWeeks = computed(() => {
  const c = ctx.value
  const items: { label: string; pct: number }[] = []
  if (!c) return items
  let monday = mondayOf(c.today)
  for (let i = 0; i < 8; i++) {
    const ws = weekStats(c, monday)
    if (ws && (ws.total > 0 || ws.bonusPct > 0)) {
      const end = addDaysIso(monday, 6)
      const fmt = (iso: string) => parseIso(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'short' })
      items.push({ label: `${fmt(monday)} – ${fmt(end)}`, pct: ws.pct })
    }
    monday = addDaysIso(monday, -7)
  }
  return items
})

const selectedDate = ref<string | null>(null)

// Свайп по календарю — предыдущий/следующий месяц
let touchX: number | null = null
let touchY: number | null = null
function onTouchStart(e: TouchEvent) {
  touchX = e.touches[0].clientX
  touchY = e.touches[0].clientY
}
function onTouchEnd(e: TouchEvent) {
  if (touchX === null || touchY === null) return
  const dx = e.changedTouches[0].clientX - touchX
  const dy = e.changedTouches[0].clientY - touchY
  touchX = touchY = null
  if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return
  shiftMonth(dx < 0 ? 1 : -1)
}
</script>

<template>
  <AppShell :user-email="auth.status === 'ready' ? auth.userEmail : null" />
  <main class="mx-auto max-w-3xl px-4 pb-16 pt-6">
    <h1 class="mb-1 text-xl font-bold">{{ t('hist_h1') }}</h1>
    <p class="mb-4 text-sm" style="color: var(--text-dim)">{{ t('hist_intro') }}</p>

    <p v-if="error" class="mb-3 text-sm" style="color: var(--danger)">{{ error }}</p>

    <div v-if="auth.status === 'loading' || auth.status === 'redirecting'" class="text-sm" style="color: var(--text-dim)">…</div>

    <template v-else-if="ctx">
      <template v-if="!ctx.firstDate">
        <p class="text-sm" style="color: var(--text-dim)">{{ t('hist_no_data') }}</p>
      </template>

      <template v-else>
        <div class="mb-3 flex items-center gap-2">
          <button
            type="button"
            class="rounded-lg border px-2.5 py-1.5"
            style="border-color: var(--border); background: var(--bg-card); color: var(--text)"
            @click="shiftMonth(-1)"
          >
            ‹
          </button>
          <div class="flex-1 text-center font-bold">{{ monthTitle }}</div>
          <button
            type="button"
            class="rounded-lg border px-2.5 py-1.5 disabled:opacity-40"
            style="border-color: var(--border); background: var(--bg-card); color: var(--text)"
            :disabled="nextDisabled"
            @click="shiftMonth(1)"
          >
            ›
          </button>
          <button
            type="button"
            class="rounded-lg border px-3 py-1.5 text-sm"
            style="border-color: var(--border); background: var(--bg-card); color: var(--text)"
            @click="goToday"
          >
            {{ t('hist_today_btn') }}
          </button>
        </div>

        <div class="mb-3 grid grid-cols-3 gap-2">
          <div
            v-for="s in [
              [monthGrid.avg == null ? '—' : monthGrid.avg + '%', t('hist_stat_avg')],
              [String(monthGrid.perfect), t('hist_stat_perfect')],
              [String(monthGrid.trackedDays), t('hist_stat_days')],
            ]"
            :key="s[1]"
            class="rounded-xl border p-2 text-center"
            style="border-color: var(--border); background: var(--bg-card)"
          >
            <div class="text-xl font-bold">{{ s[0] }}</div>
            <div class="text-[0.7em]" style="color: var(--text-dim)">{{ s[1] }}</div>
          </div>
        </div>

        <div class="no-edge-swipe mb-2 flex flex-col gap-1" @touchstart="onTouchStart" @touchend="onTouchEnd">
          <div class="grid gap-1" style="grid-template-columns: repeat(7, minmax(0, 1fr)) minmax(0, 1.05fr)">
            <div v-for="n in weekdayNames" :key="n" class="py-0.5 text-center text-[0.72em]" style="color: var(--text-dim)">{{ n }}</div>
            <div class="py-0.5 text-center text-[0.72em]" style="color: var(--text-dim)">{{ t('hist_week_col') }}</div>
          </div>

          <div v-for="(row, ri) in monthGrid.rows" :key="ri" class="grid gap-1" style="grid-template-columns: repeat(7, minmax(0, 1fr)) minmax(0, 1.05fr)">
            <button
              v-for="cell in row"
              :key="cell.key"
              type="button"
              class="relative flex min-h-11 flex-col items-start justify-between overflow-hidden rounded-lg border p-1 text-left"
              :class="[
                cell.dateStr ? 'cursor-pointer' : 'cursor-default border-transparent',
                cell.isToday ? 'outline outline-2 -outline-offset-2' : '',
                cell.isFuture || cell.hasNoData ? 'opacity-50' : '',
                cell.over ? 'shadow-[inset_0_0_0_2px_#e0a93b]' : '',
              ]"
              :style="{
                aspectRatio: '1 / 1.1',
                borderColor: cell.dateStr ? 'var(--border)' : 'transparent',
                background: cell.hasStats
                  ? `linear-gradient(to top, var(--hist-ok) ${cell.fill}%, var(--bg-card) ${cell.fill}%)`
                  : 'var(--bg-card)',
                outlineColor: cell.isToday ? 'var(--accent)' : undefined,
                color: cell.hasStats && cell.fill >= 55 ? '#fff' : 'var(--text)',
                textShadow: cell.hasStats && cell.fill >= 55 ? '0 1px 2px rgba(0,0,0,0.4)' : undefined,
              }"
              :disabled="!cell.dateStr"
              @click="cell.dateStr && (selectedDate = cell.dateStr)"
            >
              <span v-if="cell.dayNum" class="text-[0.78em] font-semibold">{{ cell.dayNum }}</span>
              <span v-if="cell.hasStats" class="self-end text-[0.68em] font-semibold">{{ cell.pct }}%</span>
            </button>

            <div
              class="flex items-center justify-center rounded-lg border"
              :style="{
                borderColor: 'var(--border)',
                background:
                  monthGrid.weekPct.get(ri) != null
                    ? `linear-gradient(to top, var(--accent) ${Math.min(100, monthGrid.weekPct.get(ri)!)}%, var(--bg-card) ${Math.min(100, monthGrid.weekPct.get(ri)!)}%)`
                    : 'var(--bg-card)',
                color: monthGrid.weekPct.get(ri) != null && monthGrid.weekPct.get(ri)! >= 55 ? 'var(--accent-text)' : 'var(--text)',
              }"
            >
              <span v-if="monthGrid.weekPct.get(ri) != null" class="text-[0.68em] font-semibold">{{ monthGrid.weekPct.get(ri) }}%</span>
            </div>
          </div>
        </div>

        <h2 class="mb-2 mt-6 text-lg font-bold">{{ t('hist_weeks_h2') }}</h2>
        <p v-if="recentWeeks.length === 0" class="text-sm" style="color: var(--text-dim)">{{ t('hist_no_data') }}</p>
        <div v-for="w in recentWeeks" :key="w.label" class="my-2 flex items-center gap-2.5">
          <div class="w-[124px] shrink-0 text-sm">{{ w.label }}</div>
          <div class="h-2.5 flex-1 overflow-hidden rounded-md border" style="border-color: var(--border); background: var(--bg-card)">
            <div
              class="h-full rounded-md transition-[width]"
              :style="{ width: Math.min(100, w.pct) + '%', background: w.pct >= 100 ? 'var(--hist-ok)' : 'var(--accent)' }"
            ></div>
          </div>
          <div class="w-11 shrink-0 text-right text-sm font-semibold">{{ w.pct }}%</div>
        </div>
      </template>
    </template>

    <DayDetailModal v-if="selectedDate && ctx" :ctx="ctx as HistoryContext" :date-str="selectedDate" @close="selectedDate = null" />
  </main>
</template>
