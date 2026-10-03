<script setup lang="ts">
import { initials } from '../lib/leaderboardView'
// Аватар: картинка или круг с инициалами в цвете акцента.
defineProps<{ name: string | null; url: string | null; size?: number }>()
</script>

<template>
  <img v-if="url" :src="url" class="flex-shrink-0 rounded-full object-cover" :style="{ width: (size ?? 32) + 'px', height: (size ?? 32) + 'px' }" alt="" />
  <span
    v-else
    class="flex flex-shrink-0 items-center justify-center rounded-full font-medium"
    :style="{ width: (size ?? 32) + 'px', height: (size ?? 32) + 'px', fontSize: Math.round((size ?? 32) * 0.36) + 'px', background: 'var(--accent)', color: 'var(--on-accent, #fff)', opacity: 0.9 }"
    aria-hidden="true"
  >{{ initials(name) }}</span>
</template>
