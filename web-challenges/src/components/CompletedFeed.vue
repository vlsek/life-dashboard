<script setup lang="ts">
import { computed } from 'vue'
import EmojiText from './EmojiText.vue'
import { t } from '../lib/i18n'
import { localDateOfTimestamp, todayStr } from '../lib/date'
import { doneSummary, nextLadderStep } from '../lib/challengeDone'
import type { Challenge, ChallengeEntry } from '../lib/types'

// Лента завершённых (BACKLOG 44.6, срез 3): карточка на челлендж — итог, дата, новые сверху; сверху — сколько завершено и сколько осталось до
// следующего достижения лесенки «Челленджи» (1/5/10/25, награды идут через неё — BACKLOG 642).
const props = defineProps<{ items: Challenge[]; entriesFor: (ch: Challenge) => ChallengeEntry[] }>()

const doneDate = (ch: Challenge): string => (ch.completed_at ? localDateOfTimestamp(ch.completed_at) : '') || ch.start_date
const fmtRu = (iso: string): string => {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}
const rows = computed(() =>
  props.items
    .map((ch) => ({ ch, date: doneDate(ch), summary: doneSummary(ch, props.entriesFor(ch), todayStr()) }))
    .sort((a, b) => b.date.localeCompare(a.date)),
)
const next = computed(() => nextLadderStep(props.items.length))
const countText = computed(() => {
  const head = t('ch_feed_count').replace('{n}', String(props.items.length))
  const tail = next.value ? t('ch_feed_next').replace('{left}', String(next.value.left)).replace('{step}', String(next.value.step)) : t('ch_feed_all')
  return head + ' · ' + tail
})
const summaryText = (s: (typeof rows.value)[number]['summary']): string =>
  s.kind === 'days' ? `${t('ch_done_days')} ${s.done} ${t('ch_done_of')} ${s.total}` : `${t('ch_done_count')} ${s.count} ${t('ch_done_of')} ${s.target}${s.itemWord ? ' ' + s.itemWord : ''}`
</script>

<template>
  <div data-testid="completed-feed">
    <p v-if="items.length > 0" class="dim mb-2 mt-0 text-sm" data-testid="feed-count">{{ countText }}</p>
    <div v-for="r in rows" :key="r.ch.id" class="card mb-2" data-testid="feed-card">
      <div class="flex flex-wrap items-baseline gap-x-2">
        <strong class="flex-1"><EmojiText :text="`${r.ch.icon} ${r.ch.title}`" /></strong>
        <span class="dim text-sm" data-testid="feed-date">{{ fmtRu(r.date) }}</span>
      </div>
      <div class="dim mt-0.5 text-sm" data-testid="feed-summary">{{ summaryText(r.summary) }}</div>
    </div>
  </div>
</template>
