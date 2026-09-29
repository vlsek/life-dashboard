<script setup lang="ts">
import { t } from '../lib/i18n'

const emit = defineEmits<{ dismiss: [] }>()
</script>

<template>
  <div class="mb-4 rounded-xl border p-3.5 text-sm" style="border-color: var(--border); background: var(--bg-card)" data-testid="warmup-reminder">
    <div class="mb-1 font-bold">{{ t('workouts_warmup_title') }}</div>
    <p class="m-0 mb-2" style="color: var(--text-dim)">{{ t('workouts_warmup_text') }}</p>
    <button
      type="button"
      class="rounded-lg border px-3 py-1.5 text-sm"
      style="border-color: var(--border); background: var(--bg); color: var(--text)"
      @click="emit('dismiss')"
    >
      {{ t('workouts_warmup_ok') }}
    </button>
  </div>
</template>
