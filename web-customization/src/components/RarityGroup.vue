<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../lib/i18n'
import { RARITY_COLOR, type Rarity } from '../lib/rarity'

// Группа одной редкости: заголовок-кнопка (цветная точка, название, сколько предметов; у предметов — «открыто/всего») и сворачиваемое
// содержимое. Содержимое только скрывается (v-show), не удаляется: кнопки «Применить»/«Купить» и состояние карточек не теряются.
const props = defineProps<{ id: string; rarity: Rarity; total: number; owned?: number | null; collapsed: boolean }>()
const emit = defineEmits<{ toggle: [] }>()

const label = computed(() => t(('cust_rarity_' + props.rarity) as never))
const counter = computed(() => (props.owned == null ? String(props.total) : props.owned + '/' + props.total))
const aria = computed(() => t('cust_rarity_toggle').replace('{rarity}', label.value).replace('{n}', counter.value))
</script>

<template>
  <section class="mb-3" :data-rarity="rarity" :data-collapsed="collapsed" :data-testid="'rarity-' + id">
    <button type="button" class="rg-head" :aria-expanded="!collapsed" :aria-controls="'rg-' + id" :aria-label="aria" data-testid="rarity-toggle" @click="emit('toggle')">
      <span class="rg-dot" :style="{ background: RARITY_COLOR[rarity] }" aria-hidden="true"></span>
      <span class="rg-name">{{ label }}</span>
      <span class="rg-count" data-testid="rarity-count">{{ counter }}</span>
      <svg class="rg-chevron" :class="{ 'rg-chevron--open': !collapsed }" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>
    <div v-show="!collapsed" :id="'rg-' + id" class="mt-1.5" data-testid="rarity-body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
/* Заголовок группы: сброс системного вида кнопки (на странице у <button> общий акцентный стиль), фокус виден. */
.rg-head {
  all: unset;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  min-height: 2.25rem;
  padding: 0.25rem 0.15rem;
  cursor: pointer;
  color: var(--text);
  border-bottom: 1px solid var(--border);
}
.rg-head:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 6px;
}
.rg-dot {
  flex: none;
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 50%;
}
.rg-name {
  font-size: 0.9rem;
  font-weight: 600;
}
.rg-count {
  font-size: 0.8rem;
  color: var(--text-dim);
}
.rg-chevron {
  margin-left: auto;
  flex: none;
  color: var(--text-dim);
  transform: rotate(-90deg);
}
.rg-chevron--open {
  transform: none;
}
</style>
