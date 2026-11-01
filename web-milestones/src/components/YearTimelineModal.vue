<script setup lang="ts">
// Лента вех на год (BACKLOG 76.10): прошедшие выполнения и будущие плановые даты по месяцам. Статус — значок и слово, не только цвет.
import { computed, nextTick, onMounted, ref } from 'vue'
import { locale, t } from '../lib/i18n'
import { buildYearTimeline, timelineTotals, type TimelineKind } from '../lib/timeline'
import type { Milestone } from '../lib/types'

const props = defineProps<{ items: Milestone[] }>()
const emit = defineEmits<{ close: [] }>()

const now = new Date()
const year = ref(now.getFullYear())
const months = computed(() => buildYearTimeline(props.items, year.value, now))
const totals = computed(() => timelineTotals(months.value))
const total = computed(() => totals.value.done + totals.value.planned + totals.value.overdue)
const monthName = (m: number) => new Date(2026, m, 1).toLocaleDateString(locale(), { month: 'long' })
const day = (iso: string) => String(Number(iso.slice(8, 10)))
const weekday = (iso: string) => new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))).toLocaleDateString(locale(), { weekday: 'short' })
const isCurrent = (m: number) => year.value === now.getFullYear() && m === now.getMonth()
const KIND: Record<TimelineKind, { icon: string; key: 'ms_tl_done' | 'ms_tl_planned' | 'ms_tl_overdue'; color: string }> = {
  done: { icon: '✓', key: 'ms_tl_done', color: 'var(--ok, #2f9e44)' },
  planned: { icon: '◷', key: 'ms_tl_planned', color: 'var(--text-dim)' },
  overdue: { icon: '!', key: 'ms_tl_overdue', color: 'var(--danger, #d6336c)' },
}

const root = ref<HTMLElement | null>(null)
onMounted(async () => {
  await nextTick()
  root.value?.querySelector<HTMLElement>('[data-current-month="true"]')?.scrollIntoView?.({ block: 'start' })
})
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="emit('close')">
    <div class="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-2xl border p-5" style="background: var(--bg-card); border-color: var(--border); color: var(--text)" role="dialog" aria-modal="true" :aria-label="t('ms_tl_title')" data-test="year-timeline" ref="root">
      <div class="mb-2 flex items-center justify-between gap-2">
        <button type="button" class="secondary px-2 py-1 text-sm" :aria-label="t('ms_tl_prev')" data-test="tl-prev" @click="year--">‹</button>
        <h3 class="m-0 text-lg font-bold" data-test="tl-year">{{ t('ms_tl_title') }} {{ year }}</h3>
        <button type="button" class="secondary px-2 py-1 text-sm" :aria-label="t('ms_tl_next')" data-test="tl-next" @click="year++">›</button>
      </div>
      <p class="dim mb-3 text-xs" data-test="tl-totals">{{ t('ms_tl_done') }}: {{ totals.done }} · {{ t('ms_tl_planned') }}: {{ totals.planned }} · {{ t('ms_tl_overdue') }}: {{ totals.overdue }}</p>
      <p v-if="total === 0" class="dim" data-test="tl-empty">{{ t('ms_tl_empty') }}</p>

      <section v-for="mo in months" :key="mo.month" class="mb-3" :data-current-month="isCurrent(mo.month)" :data-test="'tl-month-' + mo.month">
        <h4 class="m-0 mb-1 text-sm font-semibold capitalize" :style="{ color: isCurrent(mo.month) ? 'var(--accent)' : 'inherit' }">
          {{ monthName(mo.month) }}<span v-if="isCurrent(mo.month)" class="dim ml-2 text-xs font-normal">{{ t('ms_tl_now') }}</span>
        </h4>
        <p v-if="mo.events.length === 0" class="dim m-0 text-xs">—</p>
        <ul v-else class="m-0 list-none p-0">
          <li v-for="(e, i) in mo.events" :key="e.id + e.date + i" class="flex items-baseline gap-2 py-0.5 text-sm" :data-kind="e.kind">
            <span class="w-14 shrink-0 text-xs" style="color: var(--text-dim)">{{ day(e.date) }} {{ weekday(e.date) }}</span>
            <span class="shrink-0 text-xs font-semibold" :style="{ color: KIND[e.kind].color }" :title="t(KIND[e.kind].key)">{{ KIND[e.kind].icon }} {{ t(KIND[e.kind].key) }}</span>
            <span class="min-w-0 break-words">{{ e.name }}<span v-if="e.category" class="dim text-xs"> · {{ e.category }}</span></span>
          </li>
        </ul>
      </section>

      <p class="dim mb-3 text-xs">{{ t('ms_tl_km_hint') }}</p>
      <div class="flex justify-end">
        <button type="button" class="secondary rounded-lg px-4 py-2 text-sm" data-test="tl-close" @click="emit('close')">{{ t('close') }}</button>
      </div>
    </div>
  </div>
</template>
