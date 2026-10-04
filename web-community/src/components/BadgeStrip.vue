<script setup lang="ts">
import { computed } from 'vue'
import Icon from './Icon.vue'
import { badgeDef, topBadges } from '../lib/badges'
import { t } from '../lib/i18n'
// Полоска значков достижений: до `max` иконок (самые ценные), «+N» — сколько скрыто. Пусто — ничего не рисует.
const props = defineProps<{ keys?: string[]; max?: number; size?: number }>()
const view = computed(() => topBadges(props.keys, props.max ?? 3))
const title = (key: string) => t(('comm_badge_' + key) as never)
</script>

<template>
  <span v-if="view.shown.length" class="inline-flex items-center gap-0.5 align-middle" data-testid="badge-strip" :aria-label="t('comm_badges_title')">
    <span
      v-for="k in view.shown"
      :key="k"
      class="inline-flex items-center justify-center rounded-full"
      :style="{ width: (size ?? 18) + 'px', height: (size ?? 18) + 'px', background: 'var(--bg-input, rgba(127,127,127,.15))', color: 'var(--accent)', fontSize: Math.round((size ?? 18) * 0.62) + 'px' }"
      :title="title(k)"
      data-testid="badge"
    ><Icon :name="badgeDef(k)?.icon ?? 'trophy'" /></span>
    <span v-if="view.more" class="dim text-xs" data-testid="badge-more">+{{ view.more }}</span>
  </span>
</template>
