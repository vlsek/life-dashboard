<script setup lang="ts">
import { computed } from 'vue'
import Icon from './Icon.vue'
import { locale, t } from '../lib/i18n'
import { achievementCondition, achievementTitle } from '../lib/achievementText'
import type { AchievementState } from '../lib/achievements'

// Одна карточка достижения: открытое — цветное (значок в акцентном кружке, дата), закрытое — тусклое (замок, условие, прогресс-бар).
const props = defineProps<{ state: AchievementState; unlocked: boolean; unlockedAt: string | null }>()

const title = computed(() => achievementTitle(props.state.def))
const condition = computed(() => achievementCondition(props.state.def))
const shownValue = computed(() => Math.min(props.state.value, props.state.def.target))
const percent = computed(() => Math.round(props.state.progress * 100))
const when = computed(() => {
  if (!props.unlocked) return ''
  if (!props.unlockedAt) return t('ach_unlocked_before')
  const d = new Date(props.unlockedAt)
  if (Number.isNaN(d.getTime())) return t('ach_unlocked_before')
  return `${t('ach_unlocked_on')} ${d.toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' })}`
})
</script>

<template>
  <div
    class="ach-card flex flex-col items-center rounded-xl border p-3 text-center"
    :class="unlocked ? 'ach-unlocked' : 'ach-locked'"
    :data-state="unlocked ? 'unlocked' : 'locked'"
    :data-key="state.def.key"
    data-testid="achievement-card"
  >
    <div class="ach-badge relative flex h-14 w-14 items-center justify-center rounded-full text-2xl">
      <Icon :name="state.def.icon" />
      <span v-if="!unlocked" class="ach-lock absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px]" aria-hidden="true"><Icon name="lock" /></span>
    </div>
    <div class="mt-2 text-sm font-medium leading-tight">{{ title }}</div>
    <div class="dim mt-1 text-xs leading-snug">{{ condition }}</div>

    <template v-if="unlocked">
      <div class="ach-when mt-2 text-xs" data-testid="achievement-when">{{ when }}</div>
    </template>
    <template v-else>
      <div
        class="ach-bar mt-2 h-1.5 w-full overflow-hidden rounded-full"
        role="progressbar"
        :aria-valuenow="shownValue"
        :aria-valuemin="0"
        :aria-valuemax="state.def.target"
        :aria-label="title"
      >
        <div class="ach-bar-fill h-full rounded-full" :style="{ width: percent + '%' }"></div>
      </div>
      <div class="dim mt-1 text-xs" data-testid="achievement-progress">{{ shownValue }} / {{ state.def.target }}</div>
    </template>
  </div>
</template>

<style scoped>
.ach-card {
  background: var(--bg-card);
  border-color: var(--border);
}
.ach-badge {
  border: 2px dashed var(--border);
  color: var(--text-dim);
}
.ach-lock {
  background: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-dim);
}
.ach-locked {
  opacity: 0.7;
}
.ach-unlocked {
  border-color: var(--accent);
}
.ach-unlocked .ach-badge {
  border: 2px solid var(--accent);
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 16%, transparent);
}
.ach-when {
  color: var(--accent);
}
.ach-bar {
  background: color-mix(in srgb, var(--text-dim) 25%, transparent);
}
.ach-bar-fill {
  background: var(--accent);
  transition: width 0.4s ease;
}
</style>
