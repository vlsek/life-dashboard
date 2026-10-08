<script setup lang="ts">
import { ref } from 'vue'
import CoinIcon from './CoinIcon.vue'
import { coinsToSparksSuggestion } from '../lib/sparks'
import { t } from '../lib/i18n'
import type { ShopItem } from '../lib/types'

// Старая вещь с ценой в монетах (архив, миграция 057): задать цену в огоньках — и вещь вернётся в магазин. Вещи не удаляются (решение владельца:
// сначала архив, удалять — когда переход полностью сделан). Цена по умолчанию — подсказка (1/8 от монет), её можно поправить.
const props = defineProps<{ item: ShopItem }>()
const emit = defineEmits<{ transfer: [id: string, sparks: number] }>()
const price = ref(coinsToSparksSuggestion(props.item.cost))
</script>

<template>
  <div class="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2" style="border-color: var(--border)" data-testid="archived-row">
    <span class="min-w-0 flex-1 truncate">{{ item.name }}</span>
    <span class="dim inline-flex items-center gap-1 text-sm">{{ t('shop_archive_old_price') }} {{ item.cost }} <CoinIcon force-coin /></span>
    <input v-model.number="price" type="number" min="1" class="w-20" data-testid="archived-price" />
    <button type="button" class="secondary rounded-lg px-3 py-1 text-sm" data-testid="archived-transfer" @click="emit('transfer', item.id, price)">{{ t('shop_archive_transfer_btn') }}</button>
  </div>
</template>
