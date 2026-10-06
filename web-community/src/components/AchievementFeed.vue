<script setup lang="ts">
import Avatar from './Avatar.vue'
import Icon from './Icon.vue'
import { badgeDef } from '../lib/badges'
import { feedAge } from '../lib/achievementFeed'
import { t } from '../lib/i18n'
import type { FeedRow } from '../lib/types'

// Лента достижений (BACKLOG 395): «кто что открыл» — только те значки, которые человек сам выбрал показывать (до 5).
// Клик по строке раскрывает профиль человека (все его достижения).
defineProps<{ rows: FeedRow[]; myId: string; frames?: Map<string, string> }>()
const emit = defineEmits<{ open: [userId: string] }>()
const title = (key: string) => t(('comm_badge_' + key) as never)
function when(iso: string): string {
  const a = feedAge(iso)
  if (a.kind === 'today') return t('comm_feed_today')
  if (a.kind === 'yesterday') return t('comm_feed_yesterday')
  return `${a.days} ${t('comm_feed_days_suffix')}`
}
</script>

<template>
  <div data-testid="achievement-feed">
    <p v-if="rows.length === 0" class="dim m-0" data-testid="feed-empty">{{ t('comm_feed_empty') }}</p>
    <div
      v-for="(r, i) in rows"
      :key="r.user_id + r.key"
      class="flex cursor-pointer items-center gap-3 border-b py-2.5 last:border-0"
      style="border-color: var(--border)"
      role="button"
      tabindex="0"
      data-testid="feed-row"
      :title="t('comm_profile_open')"
      @click="emit('open', r.user_id)"
      @keydown.enter="emit('open', r.user_id)"
    >
      <Avatar :name="r.display_name" :url="r.avatar_url" :size="36" :frame="frames?.get(r.user_id)" />
      <div class="min-w-0 flex-1">
        <p class="m-0 truncate text-sm">
          <strong :style="r.user_id === myId ? 'color: var(--accent)' : ''">{{ r.display_name || t('comm_no_name') }}</strong>
          <span class="dim"> · {{ t('comm_feed_got') }}</span>
        </p>
        <p class="m-0 flex items-center gap-1.5 text-sm" :data-testid="'feed-badge-' + r.key">
          <span class="inline-flex items-center justify-center rounded-full" :style="{ width: '20px', height: '20px', fontSize: '12px', background: 'var(--bg-input, rgba(127,127,127,.15))', color: 'var(--accent)' }"><Icon :name="badgeDef(r.key)?.icon ?? 'trophy'" /></span>
          <span class="truncate font-medium">{{ title(r.key) }}</span>
        </p>
      </div>
      <span class="dim flex-shrink-0 text-xs" :data-testid="'feed-when-' + i">{{ when(r.unlocked_at) }}</span>
    </div>
  </div>
</template>
