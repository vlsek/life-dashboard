<script setup lang="ts">
import { computed } from 'vue'
import { ICON_PATHS, type IconName } from '../lib/icons'

// Порт iconSvg(name, extraStyle) из config.js как Vue-компонент: v-html на путях
// иконки. Как и в оригинале, при неизвестном имени рисует пустоту, а не падает.
const props = defineProps<{ name: string; extraStyle?: string }>()

const body = computed(() => (ICON_PATHS as Record<string, string>)[props.name as IconName] || '')
</script>

<template>
  <svg
    v-if="body"
    class="icon inline-block h-[1em] w-[1em] shrink-0 align-[-0.15em]"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.9"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    :style="extraStyle"
    v-html="body"
  ></svg>
</template>
