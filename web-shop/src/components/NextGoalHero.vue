<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../lib/i18n'
import { itemProgress } from '../lib/shopProgress'
import type { ShopItem } from '../lib/types'
import CoinIcon from './CoinIcon.vue'
import Icon from './Icon.vue'

// Вид «Цель» (BACKLOG 67.2, макет A): крупная карточка ближайшей награды, на которую копим.
// Сколько осталось и «≈ N дн. в вашем темпе» — по среднему заработку в день (dailyRate).
const props = defineProps<{ goal: ShopItem | null; balance: number | null; rate: number; readyCount: number }>()
const p = computed(() => (props.goal && props.balance !== null ? itemProgress(props.goal.cost, props.balance) : null))
const days = computed(() => (p.value && props.rate > 0 ? Math.max(1, Math.ceil(p.value.missing / props.rate)) : null))
</script>

<template>
  <div v-if="goal && p" class="card mb-3 rounded-2xl border p-4" style="border-color: var(--border)" data-testid="goal-hero">
    <div class="dim text-xs font-medium uppercase tracking-wide">{{ t('shop_goal_next') }}</div>
    <div class="mt-2 flex items-center gap-3">
      <img v-if="goal.image_url" :src="goal.image_url" class="h-14 w-14 shrink-0 rounded-xl object-cover" alt="" />
      <div v-else class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-2xl" style="background: var(--bg); color: var(--accent)" aria-hidden="true"><Icon name="gift" /></div>
      <div class="min-w-0 flex-1">
        <div class="truncate text-lg font-semibold" data-testid="goal-hero-name">{{ goal.name }}</div>
        <div class="dim inline-flex items-center gap-1 text-sm">{{ goal.cost }} <CoinIcon :force-coin="goal.legacy_coins" /> · {{ t('shop_left') }} {{ p.missing }}</div>
      </div>
    </div>
    <div class="mt-3 h-2.5 w-full overflow-hidden rounded-full" style="background: var(--border)" role="progressbar" :aria-valuenow="p.pct" aria-valuemin="0" aria-valuemax="100" data-testid="goal-hero-bar">
      <div class="h-full rounded-full" :style="{ width: p.pct + '%', background: 'var(--accent)', transition: 'width 0.4s ease' }" />
    </div>
    <div class="dim mt-1.5 flex justify-between text-xs">
      <span>{{ balance }} {{ t('shop_goal_of') }} {{ goal.cost }}</span>
      <span v-if="days" data-testid="goal-hero-days">{{ t('shop_goal_days').replace('{n}', String(days)) }}</span>
    </div>
  </div>
  <div v-else-if="readyCount > 0" class="card mb-3 rounded-2xl border p-4 text-sm font-medium" style="border-color: var(--border)" data-testid="goal-hero-ready">{{ t('shop_goal_all_ready') }}</div>
</template>
