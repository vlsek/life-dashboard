<script setup lang="ts">
import Avatar from './Avatar.vue'
import Icon from './Icon.vue'
import EmojiText from './EmojiText.vue'
import { formatPoints } from '../lib/leaderboardView'
import { t } from '../lib/i18n'
// Шапка раздела: я — аватар, имя, серия, баллы и место (в выбранном периоде).
defineProps<{ name: string | null; avatarUrl: string | null; points: number | null; streak: number; rank: number | null }>()
defineEmits<{ edit: [] }>()
</script>

<template>
  <div class="card mb-4 flex items-center gap-3.5 rounded-lg border p-3.5" style="border-color: var(--border)" data-testid="profile-header">
    <Avatar :name="name" :url="avatarUrl" :size="52" />
    <div class="min-w-0 flex-1">
      <p class="m-0 truncate font-medium">{{ name || t('comm_you') }}</p>
      <p v-if="points !== null" class="dim m-0 text-sm">
        <span v-if="streak > 0" :title="t('comm_perfect_streak_title')"><Icon name="flame" /> {{ streak }} · </span>
        {{ formatPoints(points) }} <Icon name="star" />
        <span v-if="rank !== null"> · {{ t('comm_rank_word') }} #{{ rank }}</span>
      </p>
    </div>
    <button class="secondary" @click="$emit('edit')"><EmojiText :text="t('comm_public_profile_btn')" /></button>
  </div>
</template>
