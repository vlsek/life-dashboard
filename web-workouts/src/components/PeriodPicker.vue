<script setup lang="ts">
import { ref } from 'vue'
import { t } from '../lib/i18n'
import CustomPeriodModal from './CustomPeriodModal.vue'
import type { PeriodRange, PeriodState } from '../lib/chart'
import Icon from './Icon.vue'

const props = defineProps<{ state: PeriodState }>()
const emit = defineEmits<{ change: [state: PeriodState] }>()

const presets: [PeriodRange, string][] = [
  ['days10', 'period_10_days'],
  ['week', 'period_week'],
  ['last_week', 'period_last_week'],
  ['month', 'period_month'],
  ['all', 'period_all'],
]

const showCustom = ref(false)

function fmtRu(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

function pick(range: PeriodRange) {
  emit('change', { ...props.state, range })
}

function applyCustom(from: string | null, to: string | null) {
  showCustom.value = false
  emit('change', { range: 'custom', from, to })
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-1.5">
    <button v-for="[key, labelKey] in presets" :key="key" :class="{ secondary: state.range !== key }" class="px-2.5 py-1 text-sm" @click="pick(key)">
      {{ t(labelKey as any) }}
    </button>
    <button :class="{ secondary: state.range !== 'custom' }" class="px-2.5 py-1 text-sm" @click="showCustom = true">
      <template v-if="state.range === 'custom' && state.from"><Icon name="calendar" /> {{ fmtRu(state.from) }} – {{ state.to ? fmtRu(state.to) : '…' }}</template>
      <template v-else>{{ t('period_custom') }}</template>
    </button>

    <CustomPeriodModal v-if="showCustom" :initial-from="state.from" :initial-to="state.to" @close="showCustom = false" @apply="applyCustom" />
  </div>
</template>
