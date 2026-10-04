<script setup lang="ts">
import { initials } from '../lib/leaderboardView'
import { frameShadow } from '../lib/customFrame'
// Аватар: картинка или круг с инициалами в цвете акцента.
defineProps<{ name: string | null; url: string | null; size?: number; frame?: string | null }>()
</script>

<template>
  <img v-if="url" :src="url" class="flex-shrink-0 rounded-full object-cover" :style="{ width: (size ?? 32) + 'px', height: (size ?? 32) + 'px', boxShadow: frameShadow(frame) }" alt="" />
  <span
    v-else
    class="flex flex-shrink-0 items-center justify-center rounded-full font-medium"
    :style="{ width: (size ?? 32) + 'px', height: (size ?? 32) + 'px', fontSize: Math.round((size ?? 32) * 0.36) + 'px', background: 'var(--accent)', color: 'var(--on-accent, #fff)', opacity: 0.9, boxShadow: frameShadow(frame) }"
    aria-hidden="true"
  >{{ initials(name) }}</span>
</template>
