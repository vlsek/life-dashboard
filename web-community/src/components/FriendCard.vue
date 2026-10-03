<script setup lang="ts">
import Avatar from './Avatar.vue'
import Icon from './Icon.vue'
import { formatPoints } from '../lib/leaderboardView'
import type { FriendStats } from '../lib/friendCards'
// Карточка человека в блоке «Друзья»: аватар, имя, пометка (заявка) или баллы/серия; слот — кнопки действий.
defineProps<{ name: string; avatarUrl: string | null; note?: string; stats?: FriendStats | null }>()
</script>

<template>
  <div class="flex items-center gap-2.5 rounded-lg border p-2.5" style="border-color: var(--border)" data-testid="friend-card">
    <Avatar :name="name" :url="avatarUrl" :size="40" />
    <div class="min-w-0 flex-1">
      <p class="m-0 truncate text-sm font-medium">{{ name }}</p>
      <p v-if="note" class="dim m-0 text-xs">{{ note }}</p>
      <p v-else-if="stats" class="dim m-0 text-xs">
        <span v-if="stats.streak > 0"><Icon name="flame" />{{ stats.streak }} · </span>{{ formatPoints(stats.points) }} <Icon name="star" />
      </p>
    </div>
    <div class="flex flex-shrink-0 gap-1.5"><slot /></div>
  </div>
</template>
