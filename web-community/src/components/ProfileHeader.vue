<script setup lang="ts">
import Avatar from './Avatar.vue'
import Icon from './Icon.vue'
import BadgeStrip from './BadgeStrip.vue'
import { formatPoints } from '../lib/leaderboardView'
import { t } from '../lib/i18n'
// Шапка раздела: я — аватар, имя, серия, баллы и место (в выбранном периоде).
defineProps<{ name: string | null; avatarUrl: string | null; points: number | null; streak: number; rank: number | null; badges?: string[]; frame?: string | null }>()
defineEmits<{ edit: [] }>()
</script>

<template>
  <div class="card mb-4 flex min-w-0 items-center gap-3 rounded-lg border p-3" style="border-color: var(--border)" data-testid="profile-header">
    <Avatar :name="name" :url="avatarUrl" :size="48" :frame="frame" />
    <div class="min-w-0 flex-1">
      <p class="m-0 truncate font-medium">{{ name || t('comm_you') }}</p>
      <BadgeStrip v-if="badges?.length" :keys="badges" :max="5" :size="20" class="mt-0.5" />
      <p v-if="points !== null" class="dim m-0 text-sm">
        <span v-if="streak > 0" :title="t('comm_perfect_streak_title')"><Icon name="flame" /> {{ streak }} · </span>
        {{ formatPoints(points) }} <Icon name="star" />
        <span v-if="rank !== null"> · {{ t('comm_rank_word') }} #{{ rank }}</span>
      </p>
    </div>
    <button class="secondary flex-shrink-0 px-2 py-1 text-sm" :title="t('comm_public_profile_btn').replace(/^\S+\s/u, '')" :aria-label="t('comm_profile_short')" data-testid="profile-edit" @click="$emit('edit')"><Icon name="gear" /> {{ t('comm_profile_short') }}</button>
  </div>
</template>
