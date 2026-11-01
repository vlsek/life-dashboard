<script setup lang="ts">
import { t } from '../lib/i18n'

// Чип «Фильтр: <мышца> ✕» над списками «Упражнения» и «Журнал» (BACKLOG 70.4).
defineProps<{ name: string }>()
const emit = defineEmits<{ clear: [] }>()
</script>

<template>
  <div class="mb-3 mt-2 flex items-center gap-2" data-testid="muscle-filter-chip">
    <span class="rounded-full border px-3 py-1 text-xs" style="border-color: var(--accent); color: var(--accent)">{{ t('workouts_filter_label') }}: {{ name }}</span>
    <button type="button" class="rounded-lg border px-2 py-1 text-xs" style="border-color: var(--border); background: transparent; color: var(--text-dim)" :aria-label="t('workouts_filter_clear')" data-testid="muscle-filter-clear" @click="emit('clear')">✕ {{ t('workouts_filter_clear') }}</button>
  </div>
</template>
