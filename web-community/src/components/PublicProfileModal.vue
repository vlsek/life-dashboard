<script setup lang="ts">
import Avatar from './Avatar.vue'
import Icon from './Icon.vue'
import { badgeDef } from '../lib/badges'
import { formatPoints } from '../lib/leaderboardView'
import { onMounted, ref, computed } from 'vue'
import OfferGoalForm from './OfferGoalForm.vue'
import { t } from '../lib/i18n'
import { daysSince, fetchFriendSummary, fmtSummaryDate, type FriendSummary } from '../lib/friendSummary'

// Раскрытый профиль (BACKLOG 395): ВСЕ открытые достижения человека — в ленте он показывает только выбранные (до 5).
// Данные приходят из RPC get_public_badges (миграция 047): только для тех, кто виден в лидерборде («публичный профиль»);
// у скрытого профиля достижений нет — показываем пояснение, а не пустую сетку.
const props = defineProps<{ name: string; avatarUrl: string | null; frame?: string | null; keys: string[]; points: number | null; streak: number; userId?: string | null; isFriend?: boolean }>()
const emit = defineEmits<{ close: [] }>()
const title = (key: string) => t(('comm_badge_' + key) as never)

// Сводка по другу и по себе (BACKLOG 41 «8:51», миграция 056): даты, баллы за неделю/всё время, серия, цели, активные дни, любимое упражнение.
// Для не-друзей из рейтинга запрос не делаем (сервер всё равно откажет). Нет миграции — блока просто нет, окно как раньше.
const summary = ref<FriendSummary | null>(null)
const summaryState = ref<'idle' | 'loading' | 'ok' | 'error' | 'unsupported'>('idle')
onMounted(async () => {
  if (!props.userId || !props.isFriend) return
  summaryState.value = 'loading'
  const res = await fetchFriendSummary(props.userId)
  if (res.status === 'ok') {
    summary.value = res.data
    summaryState.value = 'ok'
  } else summaryState.value = res.status
})
// Предложить другу цель или задачу (миграция 063): только друзьям; после отправки форма закрывается и показывается подтверждение.
const offerOpen = ref(false)
const offerSent = ref(false)
function onOfferSent() {
  offerOpen.value = false
  offerSent.value = true
}
const dates = computed(() => {
  const s = summary.value
  if (!s) return []
  const out: string[] = []
  const reg = fmtSummaryDate(s.registered_at)
  if (reg) {
    const d = daysSince(s.registered_at)
    out.push(t('comm_summary_registered').replace('{date}', reg) + (d !== null ? ' · ' + t('comm_summary_days').replace('{n}', String(d)) : ''))
  }
  const fr = fmtSummaryDate(s.friends_since)
  if (fr) out.push(t('comm_summary_friends_since').replace('{date}', fr))
  return out
})
const tiles = computed(() => {
  const s = summary.value
  if (!s || s.hidden) return []
  const fmt = (n: number) => String(Math.round(n * 10) / 10)
  const out: { key: string; label: string; value: string }[] = []
  if (s.points_week !== undefined) out.push({ key: 'week', label: t('comm_summary_points_week'), value: fmt(s.points_week) })
  if (s.points_total !== undefined) out.push({ key: 'total', label: t('comm_summary_points_total'), value: fmt(s.points_total) })
  if (s.perfect_streak !== undefined) out.push({ key: 'streak', label: t('comm_summary_streak'), value: String(s.perfect_streak) })
  if (s.goals_done !== undefined) out.push({ key: 'goals', label: t('comm_summary_goals'), value: String(s.goals_done) })
  if (s.active_days_30 !== undefined) out.push({ key: 'active', label: t('comm_summary_active'), value: String(s.active_days_30) })
  if (s.favorite_exercise) out.push({ key: 'exercise', label: t('comm_summary_exercise'), value: s.favorite_exercise })
  return out
})
</script>

<template>
  <div class="modal-backdrop" data-testid="public-profile" @click.self="emit('close')">
    <div class="modal">
      <div class="flex items-center gap-3">
        <Avatar :name="name" :url="avatarUrl" :size="56" :frame="frame" />
        <div class="min-w-0 flex-1">
          <h3 class="m-0 truncate" data-testid="public-profile-name">{{ name }}</h3>
          <p v-if="points !== null" class="dim m-0 text-sm">
            <span v-if="streak > 0"><Icon name="flame" />{{ streak }} · </span>{{ formatPoints(points) }} <Icon name="star" />
          </p>
        </div>
      </div>

      <p v-if="summaryState === 'loading'" class="dim m-0 mt-3 text-sm" data-testid="friend-summary-loading">{{ t('comm_summary_loading') }}</p>
      <p v-else-if="summaryState === 'error'" class="dim m-0 mt-3 text-sm" data-testid="friend-summary-error">{{ t('comm_summary_error') }}</p>
      <template v-else-if="summaryState === 'ok' && summary">
        <div v-if="dates.length" class="mt-3 text-sm" data-testid="friend-summary-dates">
          <p v-for="d in dates" :key="d" class="dim m-0">{{ d }}</p>
        </div>
        <p v-if="summary.hidden" class="dim m-0 mt-2 text-sm" data-testid="friend-summary-hidden">{{ t('comm_summary_hidden') }}</p>
        <div v-else-if="tiles.length" class="mt-3 grid gap-2" style="grid-template-columns: repeat(auto-fill, minmax(130px, 1fr))" data-testid="friend-summary-stats">
          <div v-for="tile in tiles" :key="tile.key" class="min-w-0 rounded-lg border px-3 py-2" style="border-color: var(--border)" :data-testid="'summary-' + tile.key">
            <div class="truncate text-lg font-semibold">{{ tile.value }}</div>
            <div class="dim text-xs">{{ tile.label }}</div>
          </div>
        </div>
      </template>

      <template v-if="isFriend && userId">
        <p v-if="offerSent" class="m-0 mt-3 text-sm" data-testid="offer-sent">{{ t('comm_offer_sent') }}</p>
        <button v-if="!offerOpen" type="button" class="secondary mt-3" data-testid="offer-open" @click="((offerOpen = true), (offerSent = false))">{{ t('comm_offer_btn') }}</button>
        <OfferGoalForm v-else :friend-id="userId" :friend-name="name" @sent="onOfferSent" @cancel="offerOpen = false" />
      </template>

      <h4 class="mb-1 mt-4 text-sm font-medium">{{ t('comm_badges_title') }}<span v-if="keys.length" class="dim font-normal"> · {{ t('comm_profile_unlocked') }} {{ keys.length }}</span></h4>
      <p v-if="keys.length === 0" class="dim m-0 text-sm" data-testid="public-profile-empty">{{ t('comm_profile_no_badges') }}</p>
      <div v-else class="grid gap-1.5" style="grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); max-height: 50vh; overflow-y: auto" data-testid="public-profile-badges">
        <div v-for="k in keys" :key="k" class="flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm" style="border-color: var(--border)" data-testid="public-badge">
          <span class="inline-flex flex-shrink-0 items-center justify-center rounded-full" :style="{ width: '24px', height: '24px', fontSize: '14px', background: 'var(--bg-input, rgba(127,127,127,.15))', color: 'var(--accent)' }"><Icon :name="badgeDef(k)?.icon ?? 'trophy'" /></span>
          <span class="min-w-0 truncate">{{ title(k) }}</span>
        </div>
      </div>

      <div class="modal-actions">
        <button class="secondary" data-testid="public-profile-close" @click="emit('close')">{{ t('close') }}</button>
      </div>
    </div>
  </div>
</template>
