<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../lib/i18n'
import { frameShadow } from '../lib/frames'
import { priceOf, shortBy, type CustomItem, type ItemStatus } from '../lib/customization'
import Icon from './Icon.vue'

// Карточка предмета кастомизации: превью (круг-аватар с рамкой), название, условие/цена и одно действие по статусу.
const props = defineProps<{ item: CustomItem; status: ItemStatus; balance: number | null; busy: boolean; disabled: boolean }>()
const emit = defineEmits<{ buy: []; choose: []; unchoose: [] }>()

const name = computed(() => t(('cust_item_' + props.item.key) as never))
const price = computed(() => priceOf(props.item))
const missing = computed(() => shortBy(props.item, props.balance))
const reward = computed(() => (props.item.achievement ? t(('cust_ach_' + props.item.achievement) as never) : ''))
</script>

<template>
  <div class="flex flex-col items-center gap-2 rounded-xl border p-3 text-center" style="background: var(--bg-card); border-color: var(--border)" :data-testid="'item-' + item.key" :data-status="status">
    <span
      class="flex h-14 w-14 items-center justify-center rounded-full text-lg font-medium"
      :style="{ background: 'var(--accent)', color: 'var(--accent-text, #fff)', boxShadow: frameShadow(item.key), opacity: status === 'locked' || status === 'short' ? 0.55 : 1 }"
      aria-hidden="true"
    >A</span>
    <p class="m-0 text-sm font-medium">{{ name }}</p>
    <p v-if="item.source === 'achievement'" class="dim m-0 text-xs"><Icon name="medal" /> {{ t('cust_reward_for') }} «{{ reward }}»</p>
    <p v-else-if="status === 'owned' || status === 'selected'" class="dim m-0 text-xs">{{ t('cust_owned') }}</p>

    <button v-if="status === 'buyable'" class="px-3 py-1 text-sm" :disabled="disabled || busy" data-testid="buy" @click="emit('buy')">{{ t('cust_buy').replace('{n}', String(price)) }} <Icon name="coin" /></button>
    <button v-else-if="status === 'short'" class="secondary px-3 py-1 text-sm" disabled data-testid="short">{{ missing != null ? t('cust_short').replace('{n}', String(missing)) : t('cust_buy').replace('{n}', String(price)) }}</button>
    <button v-else-if="status === 'owned'" class="px-3 py-1 text-sm" :disabled="disabled || busy" data-testid="choose" @click="emit('choose')">{{ t('cust_select') }}</button>
    <button v-else-if="status === 'selected'" class="secondary px-3 py-1 text-sm" :disabled="disabled || busy" data-testid="unchoose" @click="emit('unchoose')">{{ t('cust_selected') }} · {{ t('cust_unselect') }}</button>
    <span v-else class="dim text-xs" data-testid="locked">{{ t('cust_locked') }}</span>
  </div>
</template>
