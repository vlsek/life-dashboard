<script setup lang="ts">
// Шеврон сворачивания: указывает вниз у развёрнутого блока и плавно поворачивается вправо у свёрнутого.
// Поворот и цвет — в style.css (.collapse-chevron); при prefers-reduced-motion анимация отключается.
import { collapseStyle } from '../lib/useCollapseStyle'
defineProps<{ collapsed: boolean }>()
</script>

<template>
  <svg
    class="collapse-chevron"
    :data-marker="collapseStyle"
    :data-collapsed="String(collapsed)"
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    stroke-width="2.2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="collapseStyle === 'plus'">
      <path d="M6 12h12" />
      <path v-if="collapsed" d="M12 6v12" />
    </template>
    <path v-else-if="collapseStyle === 'caret'" d="M7 10h10l-5 6z" fill="currentColor" stroke-width="1.4" />
    <template v-else-if="collapseStyle === 'dot'">
      <circle cx="12" cy="12" r="5" :fill="collapsed ? 'none' : 'currentColor'" />
    </template>
    <template v-else-if="collapseStyle === 'double'">
      <path d="M6 6l6 6 6-6" />
      <path d="M6 12l6 6 6-6" />
    </template>
    <rect v-else-if="collapseStyle === 'square'" x="6.5" y="6.5" width="11" height="11" rx="2.5" :fill="collapsed ? 'none' : 'currentColor'" />
    <template v-else-if="collapseStyle === 'burger'">
      <path d="M5 8h14" />
      <path d="M5 16h14" />
      <path v-if="collapsed" d="M5 12h14" />
    </template>
    <path v-else-if="collapseStyle === 'arrow'" d="M12 5v14M6 13l6 6 6-6" />
    <template v-else-if="collapseStyle === 'ring'">
      <circle cx="12" cy="12" r="7" />
      <circle v-if="collapsed" cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
    </template>
    <path v-else-if="collapseStyle === 'diamond'" d="M12 4l7 8-7 8-7-8z" :fill="collapsed ? 'none' : 'currentColor'" stroke-width="1.6" />
    <path v-else-if="collapseStyle === 'star'" d="M12 4l2.4 5 5.4.7-4 3.8 1 5.4L12 16.2 7.2 18.9l1-5.4-4-3.8 5.4-.7z" :fill="collapsed ? 'none' : 'currentColor'" stroke-width="1.6" />
    <path v-else d="M6 9l6 6 6-6" />
  </svg>
</template>
