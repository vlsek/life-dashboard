<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../lib/i18n'
import { fmtDateRu } from '../lib/shopGroups'
import { itemProgress } from '../lib/shopProgress'
import type { ShopItem } from '../lib/types'
import CoinIcon from './CoinIcon.vue'
import EmojiText from './EmojiText.vue'
import Icon from './Icon.vue'

// Строка товара для вида «Список с копилкой»: миниатюра, название, цена, прогресс (если копится), действие.
const props = defineProps<{ item: ShopItem; balance: number | null }>()
const emit = defineEmits<{ buy: [id: string]; edit: [item: ShopItem]; remove: [item: ShopItem] }>()
const p = computed(() => itemProgress(props.item.cost, props.balance ?? 0))
const saving = computed(() => !props.item.redeemed && !p.value.canBuy)
</script>

<template>
  <div class="card flex items-center gap-2.5 rounded-lg border px-3 py-2" style="border-color: var(--border)" data-testid="shop-row">
    <img v-if="item.image_url" :src="item.image_url" class="h-9 w-9 shrink-0 rounded-lg object-cover" alt="" />
    <div v-else class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xl" style="background: var(--bg); color: var(--accent)" aria-hidden="true">
      <Icon name="gift" />
    </div>

    <div class="min-w-0 flex-1">
      <div class="truncate text-sm font-semibold" :class="{ 'line-through opacity-60': item.redeemed }">
        <a v-if="item.link" :href="item.link" target="_blank" rel="noopener" style="color: inherit">{{ item.name }}</a>
        <template v-else>{{ item.name }}</template>
      </div>
      <div v-if="item.redeemed" class="dim text-xs"><EmojiText :text="t('shop_bought_prefix')" /> {{ fmtDateRu(item.redeemed_date) }}</div>
      <div v-else-if="saving" class="mt-1 h-1.5 w-full overflow-hidden rounded-full" style="background: var(--border)" role="progressbar" :aria-valuenow="p.pct" aria-valuemin="0" aria-valuemax="100">
        <div class="h-full rounded-full" :style="{ width: p.pct + '%', background: 'var(--accent)' }" />
      </div>
    </div>

    <div class="shrink-0 text-right">
      <div class="inline-flex items-center gap-1 text-sm font-medium">{{ item.cost }} <CoinIcon /></div>
      <div v-if="saving" class="dim text-xs" data-testid="row-left">{{ t('shop_left') }} {{ p.missing }}</div>
    </div>

    <button v-if="!item.redeemed && p.canBuy && balance !== null" class="shrink-0 px-3 py-1 text-sm" data-testid="buy-btn" @click="emit('buy', item.id)"><EmojiText :text="t('shop_buy_btn')" /></button>
    <span class="flex shrink-0 whitespace-nowrap">
      <button class="secondary mr-1 px-2" :aria-label="t('shop_edit_title')" data-testid="edit-btn" @click="emit('edit', item)"><Icon name="edit" /></button>
      <button class="danger px-2" data-testid="delete-btn" @click="emit('remove', item)"><Icon name="trash" /></button>
    </span>
  </div>
</template>
