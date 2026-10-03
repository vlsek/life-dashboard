<script setup lang="ts">
import Avatar from './Avatar.vue'
import { formatPoints, type PodiumSlot } from '../lib/leaderboardView'
// Подиум топ-3: первое место по центру и выше всех. Свою карточку обводим цветом акцента.
defineProps<{ slots: PodiumSlot[]; myId: string }>()
const medalColors = ['#e0b23c', '#b9c2cc', '#c98a4e']
const heights = [108, 84, 64]
</script>

<template>
  <div class="grid items-end gap-2.5" :style="{ gridTemplateColumns: `repeat(${slots.length}, minmax(0, 1fr))` }" data-testid="podium">
    <div v-for="s in slots" :key="s.row.user_id" class="text-center" :data-rank="s.rank">
      <div class="mb-1.5 flex justify-center">
        <Avatar :name="s.row.display_name" :url="s.row.avatar_url" :size="s.rank === 1 ? 52 : 44" :style="s.row.user_id === myId ? 'outline: 2px solid var(--accent); outline-offset: 2px' : ''" />
      </div>
      <p class="m-0 truncate text-sm font-medium" :style="s.row.user_id === myId ? 'color: var(--accent)' : ''">{{ s.row.display_name }}</p>
      <p class="dim m-0 mb-1.5 text-xs">{{ formatPoints(s.row.total_points) }}</p>
      <div
        class="dim flex items-start justify-center rounded-t-lg border pt-1.5 font-medium"
        :style="{ height: heights[s.rank - 1] + 'px', borderColor: 'var(--border)', borderTop: '3px solid ' + medalColors[s.rank - 1] }"
      >{{ s.rank }}</div>
    </div>
  </div>
</template>
