<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../lib/i18n'

// Раздел страницы «Кастомизация» (Темы, Рамки, Стаканы …; BACKLOG 51.3): заголовок-кнопка со счётчиком «открыто/всего» и
// сворачиваемое содержимое. Содержимое только скрывается (v-show): кнопки «Применить»/«Купить», группы редкости и их состояние не теряются.
const props = defineProps<{ id: string; title: string; total: number; owned: number; collapsed: boolean }>()
const emit = defineEmits<{ toggle: [] }>()

const counter = computed(() => props.owned + '/' + props.total)
const aria = computed(() => t('cust_section_toggle').replace('{name}', props.title).replace('{n}', counter.value))
</script>

<template>
  <section class="mb-6" :data-section="id" :data-collapsed="collapsed">
    <h2 class="text-base font-medium">
      <button type="button" class="sg-head" :aria-expanded="!collapsed" :aria-controls="'sg-' + id" :aria-label="aria" data-testid="section-toggle" @click="emit('toggle')">
        <span class="sg-name">{{ title }}</span>
        <span class="sg-count" data-testid="section-count">{{ counter }}</span>
        <svg class="sg-chevron" :class="{ 'sg-chevron--open': !collapsed }" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
    </h2>
    <div v-show="!collapsed" :id="'sg-' + id" class="mt-1.5" data-testid="section-body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
/* Сброс системного вида кнопки (на странице у <button> общий акцентный стиль); фокус виден. */
.sg-head {
  all: unset;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  min-height: 2.5rem;
  padding: 0.25rem 0.15rem;
  cursor: pointer;
  color: var(--text);
  font-size: 1rem;
  font-weight: 600;
}
.sg-head:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 6px;
}
.sg-count {
  font-size: 0.8rem;
  font-weight: 400;
  color: var(--text-dim);
}
.sg-chevron {
  margin-left: auto;
  flex: none;
  color: var(--text-dim);
  transform: rotate(-90deg);
  transition: transform 0.15s ease;
}
.sg-chevron--open {
  transform: rotate(0deg);
}
[data-motion='off'] .sg-chevron {
  transition: none;
}
@media (prefers-reduced-motion: reduce) {
  .sg-chevron {
    transition: none;
  }
}
</style>
