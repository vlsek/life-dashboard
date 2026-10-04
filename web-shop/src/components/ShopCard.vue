<script setup lang="ts">
import { t } from '../lib/i18n'
import { fmtDateRu } from '../lib/shopGroups'
import type { ShopItem } from '../lib/types'
import CoinIcon from './CoinIcon.vue'
import EmojiText from './EmojiText.vue'
import Icon from './Icon.vue'
import ItemProgressBar from './ItemProgressBar.vue'

// Карточка товара для вида «Витрина».
defineProps<{ item: ShopItem; balance: number | null }>()
const emit = defineEmits<{ buy: [id: string]; edit: [item: ShopItem]; remove: [item: ShopItem] }>()
</script>

<template>
  <div class="card flex flex-col rounded-xl border p-3.5" style="border-color: var(--border)" :class="{ 'opacity-70': item.redeemed }" data-testid="shop-card">
    <img v-if="item.image_url" :src="item.image_url" class="mb-2.5 w-full rounded-lg object-cover" style="height: 120px" alt="" />
    <div v-else class="mb-2.5 flex w-full items-center justify-center rounded-lg text-3xl" style="height: 72px; background: var(--bg); color: var(--accent)" aria-hidden="true">
      <Icon name="gift" />
    </div>

    <div class="mb-1 font-semibold" :class="{ 'line-through opacity-60': item.redeemed }">
      <a v-if="item.link" :href="item.link" target="_blank" rel="noopener" style="color: inherit" class="inline-flex items-center gap-1">{{ item.name }} <Icon name="link" /></a>
      <template v-else>{{ item.name }}</template>
    </div>
    <div class="inline-flex items-center gap-1 font-medium">{{ item.cost }} <CoinIcon /></div>
    <ItemProgressBar v-if="!item.redeemed && balance !== null" :cost="item.cost" :balance="balance" />

    <div class="mt-2">
      <span v-if="item.redeemed" class="dim text-sm"><EmojiText :text="t('shop_bought_prefix')" /> {{ fmtDateRu(item.redeemed_date) }}</span>
      <button v-else-if="balance !== null && balance >= item.cost" data-testid="buy-btn" @click="emit('buy', item.id)"><EmojiText :text="t('shop_buy_btn')" /></button>
      <button v-else disabled>{{ t('shop_not_enough') }} {{ balance !== null ? item.cost - balance : item.cost }} <CoinIcon /></button>
    </div>

    <div class="mt-auto whitespace-nowrap pt-2">
      <button class="secondary mr-1 px-2" :aria-label="t('shop_edit_title')" data-testid="edit-btn" @click="emit('edit', item)"><Icon name="edit" /></button>
      <button class="danger px-2" data-testid="delete-btn" @click="emit('remove', item)"><Icon name="trash" /></button>
    </div>
  </div>
</template>
