<script setup lang="ts">
import { computed } from 'vue'
import { ICON_PATHS } from '../lib/icons'

// Урезанная копия web-dashboard/src/components/Icon.vue (в шапке нет Tailwind — размер задан в header.css, класс gh-icon).
const props = defineProps<{ name: string }>()
const body = computed(() => ICON_PATHS[props.name] || '')
</script>

<template>
  <svg v-if="body" class="gh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" v-html="body"></svg>
</template>
