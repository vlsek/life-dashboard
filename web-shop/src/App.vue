<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AppShell from './components/AppShell.vue'
import BalanceCard from './components/BalanceCard.vue'
import ItemForm from './components/ItemForm.vue'
import ShopCard from './components/ShopCard.vue'
import ShopFilters from './components/ShopFilters.vue'
import ShopIdea from './components/ShopIdea.vue'
import ShopRow from './components/ShopRow.vue'
import ViewSwitch from './components/ViewSwitch.vue'
import { useShop } from './lib/useShop'
import { t } from './lib/i18n'
import { filterCounts, filterItems, savingGoal, splitItems, type ShopFilter } from './lib/shopGroups'
import { loadShopView, saveShopView } from './lib/shopView'
import type { ShopItem, ShopItemFormInput } from './lib/types'
import EmojiText from './components/EmojiText.vue'
import { confirmDialog } from './lib/confirmDialog'

const { auth, items, balance, error, init, addItem, updateItem, buyItem, deleteItem, uploadImage } = useShop()
onMounted(init)

// Вид страницы (BACKLOG 392): «Витрина» или «Список с копилкой», запоминается на устройстве.
const view = ref(loadShopView())
watch(view, saveShopView)
const filter = ref<ShopFilter>('all')
const boughtOpen = ref(false)

const have = computed(() => balance.value?.balance ?? null)
const counts = computed(() => filterCounts(items.value, have.value))
const shown = computed(() => filterItems(items.value, have.value, filter.value))
const groups = computed(() => splitItems(items.value, have.value))
const goal = computed(() => savingGoal(items.value, have.value))

const formTarget = ref<ShopItem | 'new' | null>(null)

async function onSaveForm(res: ShopItemFormInput) {
  const target = formTarget.value
  if (target === 'new') await addItem((auth.value as { userId: string }).userId, res)
  else if (target) await updateItem(target.id, res)
  formTarget.value = null
}

async function onDelete(item: ShopItem) {
  if (!(await confirmDialog(t('shop_confirm_delete')))) return
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
    <ShopIdea />

    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <button class="rounded-lg px-3 py-1.5 text-sm" data-testid="add-item" @click="formTarget = 'new'"><EmojiText :text="t('shop_add_item_btn')" /></button>
      <ViewSwitch v-model="view" />
    </div>

    <BalanceCard :balance="balance" :variant="view" :goal="goal" />

    <p v-if="error" class="dim">{{ t('comm_load_error') }} {{ error }}</p>
    <p v-else-if="items.length === 0" class="dim">{{ t('shop_list_empty') }}</p>

    <!-- Витрина: чипы-фильтры и сетка карточек -->
    <template v-else-if="view === 'grid'">
      <ShopFilters v-model="filter" :counts="counts" />
      <p v-if="shown.length === 0" class="dim text-sm" data-testid="empty-filter">{{ filter === 'affordable' ? t('shop_empty_affordable') : t('shop_empty_filter') }}</p>
      <div v-else class="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3" data-testid="grid-view">
        <ShopCard v-for="item in shown" :key="item.id" :item="item" :balance="have" @buy="buyItem" @edit="formTarget = $event" @remove="onDelete" />
      </div>
    </template>

    <!-- Список с копилкой: «можно купить сейчас», «копится», свёрнутые «мои покупки» -->
    <div v-else class="flex flex-col gap-4" data-testid="list-view">
      <section v-if="groups.affordable.length" data-testid="section-affordable">
        <h2 class="dim mb-1.5 text-sm font-medium">{{ t('shop_section_affordable') }}</h2>
        <div class="flex flex-col gap-1.5">
          <ShopRow v-for="item in groups.affordable" :key="item.id" :item="item" :balance="have" @buy="buyItem" @edit="formTarget = $event" @remove="onDelete" />
        </div>
      </section>
      <section v-if="groups.saving.length" data-testid="section-saving">
        <h2 class="dim mb-1.5 text-sm font-medium">{{ t('shop_section_saving') }}</h2>
        <div class="flex flex-col gap-1.5">
          <ShopRow v-for="item in groups.saving" :key="item.id" :item="item" :balance="have" @buy="buyItem" @edit="formTarget = $event" @remove="onDelete" />
        </div>
      </section>
      <p v-if="!groups.affordable.length && !groups.saving.length" class="dim text-sm">{{ t('shop_empty_filter') }}</p>
      <section v-if="groups.bought.length" data-testid="section-bought">
        <button
          type="button"
          class="secondary flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm"
          :aria-expanded="boughtOpen"
          data-testid="bought-toggle"
          @click="boughtOpen = !boughtOpen"
        >
          <span>{{ t('shop_section_bought') }} ({{ groups.bought.length }})</span>
          <span aria-hidden="true">{{ boughtOpen ? '▴' : '▾' }}</span>
        </button>
        <div v-if="boughtOpen" class="mt-1.5 flex flex-col gap-1.5">
          <ShopRow v-for="item in groups.bought" :key="item.id" :item="item" :balance="have" @buy="buyItem" @edit="formTarget = $event" @remove="onDelete" />
        </div>
      </section>
    </div>

    <ItemForm v-if="formTarget" :existing="formTarget === 'new' ? null : formTarget" :upload-image="onUpload" @close="formTarget = null" @save="onSaveForm" />
  </main>
</template>
