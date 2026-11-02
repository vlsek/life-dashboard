<script setup lang="ts">
import { watch } from 'vue'
import { useInsights } from '../lib/useInsights'
import { t } from '../lib/i18n'

// «Что замечено» (BACKLOG 75.7): появляется только при ≥30 днях оценок и заметной разнице; всегда с пометкой «корреляция ≠ причина».
const props = defineProps<{ userId: string | null }>()
const { water, load } = useInsights()
watch(() => props.userId, (u) => { if (u) void load(u) }, { immediate: true })
</script>

<template>
  <section v-if="water" class="mb-3 rounded-lg border p-3 text-sm" style="border-color: var(--border); background: var(--bg-card)" data-testid="insights">
    <div class="mb-1 font-medium">{{ t('dash_insight_title') }}</div>
    <p class="m-0" data-testid="insight-water">
      {{ t(water.diff > 0 ? 'dash_insight_water_up' : 'dash_insight_water_down').replace('{a}', String(water.withAvg)).replace('{b}', String(water.withoutAvg)).replace('{n}', String(water.nWith)).replace('{m}', String(water.nWithout)) }}
    </p>
    <p class="dim m-0 mt-1 text-xs">{{ t('dash_insight_note') }}</p>
  </section>
</template>
