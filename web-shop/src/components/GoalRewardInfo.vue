<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../lib/i18n'
import type { ShopItem } from '../lib/types'
import EmojiText from './EmojiText.vue'

// BACKLOG 68.2: вместо цены — «🎯 за цель», название цели и полоса этапов «3 из 5» (макет docs/mockups/shop_goal_reward.html).
const props = defineProps<{ reward: NonNullable<ShopItem['reward']> }>()
const pct = computed(() => (props.reward.progress ? Math.round((props.reward.progress.done / props.reward.progress.total) * 100) : 0))
</script>

<template>
  <div data-testid="reward-info">
    <div class="inline-flex items-center gap-1 text-sm font-medium"><EmojiText :text="t('shop_reward_badge')" /></div>
    <div v-if="reward.goalName" class="dim truncate text-xs" data-testid="reward-goal">{{ reward.goalName }}</div>
    <template v-if="reward.status !== 'claimed' && reward.progress">
      <div class="mt-1 h-1.5 w-full overflow-hidden rounded-full" style="background: var(--border)" role="progressbar" :aria-valuenow="pct" aria-valuemin="0" aria-valuemax="100">
        <div class="h-full rounded-full" :style="{ width: pct + '%', background: reward.status === 'ready' ? 'var(--hist-ok, var(--accent))' : 'var(--accent)' }" />
      </div>
      <div class="dim mt-0.5 text-xs" data-testid="reward-progress">{{ reward.status === 'ready' ? t('shop_reward_done') : t('shop_reward_progress').replace('{a}', String(reward.progress.done)).replace('{b}', String(reward.progress.total)) }}</div>
    </template>
  </div>
</template>
