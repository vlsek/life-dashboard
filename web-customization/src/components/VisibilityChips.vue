<script setup lang="ts">
import { t } from '../lib/i18n'
import { VIS_GROUPS, type VisGroup, type Visibility } from '../lib/useVisibility'

// Три переключателя над витриной: «Получено / За достижения / За монеты» (BACKLOG 47.1). Нажатая кнопка (aria-pressed) — группа видна.
// Рядом с названием — сколько предметов и тем в группе (по всей витрине, а не только по видимому).
defineProps<{ state: Visibility; counts: Record<VisGroup, number> }>()
const emit = defineEmits<{ toggle: [group: VisGroup] }>()
</script>

<template>
  <div class="mb-4" data-testid="visibility">
    <div class="dim mb-1 text-xs">{{ t('cust_vis_title') }}</div>
    <div class="flex flex-wrap gap-2" role="group" :aria-label="t('cust_vis_title')">
      <button
        v-for="g in VIS_GROUPS"
        :key="g"
        type="button"
        class="vis-chip"
        :class="{ 'vis-chip--on': state[g] }"
        :aria-pressed="state[g]"
        :data-testid="'vis-' + g"
        @click="emit('toggle', g)"
      >
        <span aria-hidden="true">{{ state[g] ? '✓' : '○' }}</span>
        <span>{{ t(('cust_vis_' + g) as never) }}</span>
        <span class="vis-count" data-testid="vis-count">{{ counts[g] }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Сброс системного вида кнопки (на странице у <button> общий акцентный стиль): чип с рамкой, включённый — в цвет акцента. */
.vis-chip {
  all: unset;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 2.25rem;
  padding: 0.2rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg-card);
  color: var(--text);
  font-size: 0.85rem;
  cursor: pointer;
  opacity: 0.7;
}
.vis-chip--on {
  border-color: var(--accent);
  opacity: 1;
}
.vis-chip:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.vis-count {
  font-size: 0.75rem;
  opacity: 0.75;
}
</style>
