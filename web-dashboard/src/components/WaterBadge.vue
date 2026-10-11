<script setup lang="ts">
import { computed } from 'vue'
import GlassSvg from './GlassSvg.vue'
import { getLang } from '../lib/i18n'

// Портировано из renderWaterBadge() в dashboard.js — тот же SVG-стакан (округлый контур,
// заливка волной по проценту от нормы), но как реактивный компонент вместо ручного innerHTML.
defineProps<{ currentMl: number; normMl: number }>()
const emit = defineEmits<{ click: [] }>()

const unitLabel = computed(() => (getLang() === 'en' ? 'ml' : 'мл'))
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-bold"
    style="background: transparent; color: var(--text); border-color: var(--border)"
    :title="`${currentMl} / ${normMl} ${unitLabel}`"
    @click="emit('click')"
  >
    <GlassSvg :today-ml="currentMl" :norm-ml="normMl" :width="20" :height="25" base-class="water-glass" full-class="water-glass-full" sheen-class="glass-sheen" />
    {{ currentMl }} / {{ normMl }} {{ unitLabel }}
  </button>
</template>
