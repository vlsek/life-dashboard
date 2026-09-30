<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../lib/i18n'
import { itemProgress } from '../lib/shopProgress'

const props = defineProps<{ cost: number; balance: number }>()
const p = computed(() => itemProgress(props.cost, props.balance))
</script>

<template>
  <div class="mt-2" data-testid="item-progress">
    <div
      class="h-1.5 w-full overflow-hidden rounded-full"
      style="background: var(--border)"
      role="progressbar"
      :aria-valuenow="p.pct"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <div class="h-full rounded-full" :style="{ width: p.pct + '%', background: 'var(--accent)', transition: 'width 0.4s ease' }" />
    </div>
    <div class="dim mt-0.5 text-xs" :style="p.canBuy ? 'color: var(--accent); font-weight: 600' : ''" data-testid="item-progress-label">
      {{ p.canBuy ? t('shop_progress_ready') : p.pct + '%' }}
    </div>
  </div>
</template>
