<script setup lang="ts">
import { computed } from 'vue'
import { frameDecor } from '../lib/frameDecor'
// Обёртка аватара для рамок-орнаментов (BACKLOG 44.18з): у рамки с орнаментом вокруг аватара кладётся SVG (венок, лианы, вензель),
// у остальных рамок — просто сам аватар, разметка не меняется. Орнамент абсолютно позиционирован поверх бокса аватара и не влияет на вёрстку.
// КОПИЯ живёт в web-header, web-community и web-account — менять ВМЕСТЕ (страж frameDecor.test.ts).
const props = defineProps<{ frame?: string | null }>()
const decor = computed(() => frameDecor(props.frame))
</script>

<template>
  <span v-if="decor" class="fd-wrap" data-test="frame-decor-wrap" :data-frame="frame" style="position: relative; display: inline-flex; flex-shrink: 0; line-height: 0">
    <slot />
    <!-- eslint-disable-next-line vue/no-v-html -- разметка из собственного реестра (frameDecor.ts), пользовательских данных тут нет -->
    <svg class="fd-decor" viewBox="0 0 100 100" style="position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none" aria-hidden="true" data-test="frame-decor" v-html="decor"></svg>
  </span>
  <slot v-else />
</template>
