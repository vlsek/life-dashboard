<script setup lang="ts">
import { computed, watch } from 'vue'
import CoinIcon from './CoinIcon.vue'
import { t } from '../lib/i18n'
import { itemProgress, useSavingsWidget, type SavingsState } from '../lib/savingsWidget'

// Виджет «Коплю на товар»: название товара, полоса «баллы / цена», сколько осталось, ссылка в магазин.
// Состояние наверх (`state`): блок «Виджеты» показывается, только пока хотя бы один виджет в состоянии ready.
const props = defineProps<{ userId: string; itemId: string }>()
const emit = defineEmits<{ state: [SavingsState] }>()

const { state, item, balance, load } = useSavingsWidget()
watch(() => [props.userId, props.itemId], () => void load(props.userId, props.itemId), { immediate: true })
watch(state, (s) => emit('state', s), { immediate: true })

const progress = computed(() => (item.value ? itemProgress(item.value.cost, balance.value) : null))
const have = computed(() => Math.max(0, balance.value))
</script>

<template>
  <div v-if="state === 'ready' && item && progress" class="rounded-2xl border p-3.5" style="border-color: var(--border); background: var(--bg-card)" data-test="savings-widget">
    <div class="mb-1 flex items-center gap-2">
      <span class="dim text-xs">{{ t('dash_widget_savings') }}</span>
      <a href="/shop/" class="ml-auto text-xs" style="color: var(--accent)" data-test="savings-shop-link">{{ t('dash_widget_savings_shop') }}</a>
    </div>
    <div class="mb-2 truncate font-medium" data-test="savings-name">{{ item.name }}</div>
    <div
      class="h-2.5 w-full overflow-hidden rounded-full"
      style="background: var(--bg)"
      role="progressbar"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="progress.pct"
      data-test="savings-bar"
    >
      <div class="h-full rounded-full" :style="{ width: progress.pct + '%', background: 'var(--accent)', transition: 'width 0.4s ease' }" data-test="savings-fill"></div>
    </div>
    <div class="mt-1.5 flex items-center gap-1.5 text-sm">
      <CoinIcon />
      <span data-test="savings-numbers">{{ have }} / {{ item.cost }}</span>
      <span class="dim ml-auto text-xs" data-test="savings-note">{{ progress.canBuy ? t('dash_widget_savings_ready') : t('dash_widget_savings_missing').replace('{n}', String(progress.missing)) }}</span>
    </div>
  </div>
</template>
