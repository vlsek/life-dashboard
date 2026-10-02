<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppShell from './components/AppShell.vue'
import ItemForm from './components/ItemForm.vue'
import ItemProgressBar from './components/ItemProgressBar.vue'
import Icon from './components/Icon.vue'
import { useShop } from './lib/useShop'
import { t } from './lib/i18n'
import type { ShopItem, ShopItemFormInput } from './lib/types'
import CoinIcon from './components/CoinIcon.vue'
import EmojiText from './components/EmojiText.vue'

const { auth, items, balance, error, init, addItem, updateItem, buyItem, deleteItem, uploadImage } = useShop()
onMounted(init)

function fmtRu(iso: string | null): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

const formTarget = ref<ShopItem | 'new' | null>(null)

async function onSaveForm(res: ShopItemFormInput) {
  const target = formTarget.value
  if (target === 'new') await addItem((auth.value as { userId: string }).userId, res)
  else if (target) await updateItem(target.id, res)
  formTarget.value = null
}

async function onDelete(item: ShopItem) {
  if (!confirm(t('shop_confirm_delete'))) return
  await deleteItem(item.id)
}

async function onUpload(file: File): Promise<string | null> {
  return uploadImage((auth.value as { userId: string }).userId, file)
}
</script>

<template>
  <AppShell :user-email="auth.status === 'ready' ? auth.userEmail : null" />

  <main class="mx-auto max-w-4xl px-4 pb-16 pt-4">
    <h1 class="mb-1 text-xl font-semibold"><EmojiText :text="t('shop_h1')" /></h1>
    <p class="dim mb-3 text-sm">{{ t('shop_intro') }}</p>

    <div class="card mb-3 rounded-lg border p-3.5" style="border-color: var(--border)">
      <template v-if="balance">
        <strong class="text-lg"><EmojiText :text="t('dash_balance_label')" /> {{ balance.balance }} {{ t('shop_points_word') }}</strong>
        <div class="dim mt-1 text-sm">{{ t('shop_total_earned') }} {{ balance.total }} · {{ t('shop_total_spent') }} {{ balance.spent }}</div>
      </template>
      <span v-else class="dim">{{ t('loading_ellipsis') }}</span>
    </div>

    <button class="mb-4 rounded-lg px-3 py-1.5 text-sm" @click="formTarget = 'new'"><EmojiText :text="t('shop_add_item_btn')" /></button>

    <p v-if="error" class="dim">{{ t('comm_load_error') }} {{ error }}</p>
    <p v-else-if="items.length === 0" class="dim">{{ t('shop_list_empty') }}</p>

    <div v-else class="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3">
      <div v-for="item in items" :key="item.id" class="card rounded-lg border p-3.5" style="border-color: var(--border)">
        <img v-if="item.image_url" :src="item.image_url" class="mb-2.5 h-30 w-full rounded-lg object-cover" style="height: 120px" />

        <div class="mb-1 font-semibold" :class="{ 'line-through opacity-50': item.redeemed }">
          <a v-if="item.link" :href="item.link" target="_blank" style="color: inherit" class="inline-flex items-center gap-1">
            {{ item.name }} <Icon name="link" />
          </a>
          <template v-else>{{ item.name }}</template>
        </div>
        <div class="dim inline-flex items-center gap-1">{{ item.cost }} <CoinIcon /></div>
        <ItemProgressBar v-if="!item.redeemed && balance" :cost="item.cost" :balance="balance.balance" />

        <div class="mt-2">
          <span v-if="item.redeemed"><EmojiText :text="t('shop_bought_prefix')" /> {{ item.redeemed_date ? fmtRu(item.redeemed_date) : '' }}</span>
          <button v-else-if="balance && balance.balance >= item.cost" @click="buyItem(item.id)"><EmojiText :text="t('shop_buy_btn')" /></button>
          <button v-else disabled>{{ t('shop_not_enough') }} {{ balance ? item.cost - balance.balance : item.cost }} 🪙</button>
        </div>

        <div class="mt-2 whitespace-nowrap">
          <button class="secondary mr-1 px-2" @click="formTarget = item"><Icon name="edit" /></button>
          <button class="danger px-2" @click="onDelete(item)"><Icon name="trash" /></button>
        </div>
      </div>
    </div>

    <ItemForm v-if="formTarget" :existing="formTarget === 'new' ? null : formTarget" :upload-image="onUpload" @close="formTarget = null" @save="onSaveForm" />
  </main>
</template>
