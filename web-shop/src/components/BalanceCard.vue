<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../lib/i18n'
import { itemProgress } from '../lib/shopProgress'
import type { ShopItem } from '../lib/types'
import CoinIcon from './CoinIcon.vue'
import EmojiText from './EmojiText.vue'
import { sparksMode } from '../lib/sparks'

// Баланс. В «Витрине» — крупное число и итоги; в «Списке» — число и полоса прогресса к ближайшей цели копилки.
const props = defineProps<{ balance: { total: number; spent: number; balance: number } | null; variant: 'grid' | 'list' | 'compact'; goal?: ShopItem | null }>()
const goalProgress = computed(() => (props.goal && props.balance ? itemProgress(props.goal.cost, props.balance.balance) : null))
</script>

<template>
  <div class="card mb-3 rounded-xl border px-3.5 py-2.5" style="border-color: var(--border)" data-testid="balance-card">
    <span v-if="!balance" class="dim">{{ t('loading_ellipsis') }}</span>

    <div v-else-if="variant === 'compact'" class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <span class="inline-flex items-center gap-1.5 text-lg font-semibold" data-testid="balance-value">{{ balance.balance }} <CoinIcon /></span>
      <span class="dim text-xs">{{ t('shop_total_earned') }} {{ balance.total }} · {{ t('shop_total_spent') }} {{ balance.spent }}</span>
    </div>

    <template v-else-if="variant === 'grid'">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div class="dim text-xs"><EmojiText :text="sparksMode ? t('shop_balance_label_sparks') : t('dash_balance_label')" /></div>
          <div class="inline-flex items-center gap-1.5 text-2xl font-semibold" data-testid="balance-value">{{ balance.balance }} <CoinIcon /></div>
        </div>
        <div class="dim text-right text-sm">
          <div>{{ t('shop_total_earned') }} {{ balance.total }}</div>
          <div>{{ t('shop_total_spent') }} {{ balance.spent }}</div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="flex items-center gap-4">
        <div class="relative h-20 w-20 shrink-0" data-testid="balance-ring">
          <svg viewBox="0 0 88 88" class="h-full w-full" aria-hidden="true">
            <circle cx="44" cy="44" r="38" fill="none" stroke="var(--border)" stroke-width="10" />
            <circle cx="44" cy="44" r="38" fill="none" stroke="var(--accent)" stroke-width="10" stroke-linecap="round" stroke-dasharray="239" :stroke-dashoffset="239 - (239 * (goalProgress?.pct ?? 0)) / 100" transform="rotate(-90 44 44)" />
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <strong class="text-lg leading-none" data-testid="balance-value">{{ balance.balance }}</strong>
            <span class="dim text-[11px]">{{ sparksMode ? t('shop_sparks_word') : t('shop_points_word') }}</span>
          </div>
        </div>
        <div class="min-w-0 flex-1">
          <div v-if="goal" class="text-sm font-semibold" data-testid="goal-label">{{ t('shop_saving_for') }} {{ goal.name }}, {{ goal.cost }}</div>
          <div v-if="goalProgress" class="mt-2 h-2 w-full overflow-hidden rounded-full" style="background: var(--border)" role="progressbar" :aria-valuenow="goalProgress.pct" aria-valuemin="0" aria-valuemax="100" data-testid="goal-bar">
            <div class="h-full rounded-full" :style="{ width: goalProgress.pct + '%', background: 'var(--accent)', transition: 'width 0.4s ease' }" />
          </div>
          <div class="dim mt-1.5 text-xs">{{ t('shop_total_earned') }} {{ balance.total }} · {{ t('shop_total_spent') }} {{ balance.spent }}</div>
        </div>
      </div>
    </template>
  </div>
</template>
