<script setup lang="ts">

import { computed, ref } from 'vue'
import { useAuthAndData } from '../../web-history/src/lib/useHistoryData'
import { addDaysIso, fmtDate, mondayOf, parseIso } from '../../web-history/src/lib/date'
import { dayStats, hasData, weekStats } from '../../web-history/src/lib/stats'
import type { HistoryContext } from '../../web-history/src/lib/stats'
import { locale, t } from '../lib/i18n'
import DayDetailModal from './DayDetailModal.vue'
import EmojiText from './EmojiText.vue'

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
  <section class="pt-1">
    <h1 class="mb-1 text-xl font-bold"><EmojiText :text="t('hist_h1')" /></h1>
    <p class="mb-4 text-sm" style="color: var(--text-dim)">{{ t('hist_intro') }}</p>

    <p v-if="error" class="mb-3 text-sm" style="color: var(--danger)">{{ error }}</p>

    <div v-if="auth.status === 'loading' || auth.status === 'redirecting'" class="text-sm" style="color: var(--text-dim)">…</div>

    <template v-else-if="ctx">
      <template v-if="!ctx.firstDate">
        <p class="text-sm" style="color: var(--text-dim)">{{ t('hist_no_data') }}</p>
      </template>
