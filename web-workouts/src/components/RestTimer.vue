<script setup lang="ts">
import { t } from '../lib/i18n'
import { formatElapsed } from '../lib/activeWorkout'
import { useRestTimer } from '../lib/useRestTimer'

// Плашка отдыха в липкой шапке экрана тренировки (внизу её перекрывали уведомления) (BACKLOG 69.5): обратный отсчёт, −15 / +15, «Пропустить». Запускает её отметка подхода в ActiveWorkout.vue.
const rest = useRestTimer()
</script>

<template>
  <div v-if="rest.state.value" class="mt-2 border-t pt-2" style="border-color: var(--border)" role="timer" data-testid="rest-timer">
    <div class="mx-auto flex max-w-3xl items-center gap-2">
      <button type="button" class="rounded-lg border px-3 py-2 text-sm" style="border-color: var(--border); min-height: 44px; min-width: 56px" data-testid="rest-minus" @click="rest.adjust(-15)">−15</button>
      <div class="min-w-0 flex-1 text-center">
        <div class="text-xs" style="color: var(--text-dim)">{{ t('aw_rest') }}</div>
        <div class="text-2xl font-bold tabular-nums" data-testid="rest-left">{{ formatElapsed(rest.left.value) }}</div>
        <div class="mt-1 h-1 w-full overflow-hidden rounded" style="background: var(--border)"><div class="h-1 rounded" :style="`width: ${Math.round(rest.progress.value * 100)}%; background: var(--accent)`"></div></div>
      </div>
      <button type="button" class="rounded-lg border px-3 py-2 text-sm" style="border-color: var(--border); min-height: 44px; min-width: 56px" data-testid="rest-plus" @click="rest.adjust(15)">+15</button>
      <button type="button" class="rounded-lg px-3 py-2 text-sm font-semibold" style="background: var(--accent); color: var(--accent-text); min-height: 44px" data-testid="rest-skip" @click="rest.skip()">{{ t('aw_rest_skip') }}</button>
    </div>
  </div>
</template>
