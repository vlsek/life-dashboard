<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AppShell from './components/AppShell.vue'
import BalanceCard from './components/BalanceCard.vue'
import ItemForm from './components/ItemForm.vue'
import ShopCard from './components/ShopCard.vue'
import ShopFilters from './components/ShopFilters.vue'
import ShopIdea from './components/ShopIdea.vue'
import ShopRow from './components/ShopRow.vue'
import NextGoalHero from './components/NextGoalHero.vue'
import ArchivedRow from './components/ArchivedRow.vue'
import { sparksMode } from './lib/sparks'
import { dailyRate } from './lib/priceScale'
import ViewSwitch from './components/ViewSwitch.vue'
import { useShop } from './lib/useShop'
import { t } from './lib/i18n'
import { filterCounts, filterItems, savingGoal, splitItems, type ShopFilter } from './lib/shopGroups'
import { loadShopView, saveShopView } from './lib/shopView'
import { loadIdeaSeen } from './lib/shopIdea'
import { markHintSeen } from './lib/pageHints'
import type { ShopItem, ShopItemFormInput } from './lib/types'
import EmojiText from './components/EmojiText.vue'
import Icon from './components/Icon.vue'
import { confirmDialog } from './lib/confirmDialog'

const { auth, items, archived, balance, createdAt, error, init, addItem, updateItem, buyItem, transferArchived, deleteItem, uploadImage } = useShop()
onMounted(init)
// Первый заход: полное описание идеи уже показывает плашка «Лавка наград» — общую подсказку страницы заранее считаем увиденной (она остаётся за значком «i»), чтобы две плашки не стояли друг над другом
if (!loadIdeaSeen()) markHintSeen('shop')

// Вид страницы (BACKLOG 392): «Витрина» или «Список с копилкой», запоминается на устройстве.
const view = ref(loadShopView())
watch(view, saveShopView)
const filter = ref<ShopFilter>('all')
const boughtOpen = ref(false)
const archiveOpen = ref(false)
// пока в магазине пусто, архив раскрыт сам — иначе человек после перехода видит пустую страницу и не знает, куда делись вещи
const archiveShown = computed(() => archiveOpen.value || items.value.length === 0)
// Ошибка действия (покупка/перенос): в режиме огоньков БД не даст потратить больше накопленного — показываем понятный текст
const actionError = ref<string | null>(null)
// Подтверждение покупки (67.2): короткая плашка «Куплено: …», сама исчезает через 4 с
const justBought = ref<string | null>(null)
let boughtTimer: ReturnType<typeof setTimeout> | undefined
async function onBuy(id: string) {
  actionError.value = null
  const name = items.value.find((i) => i.id === id)?.name ?? null
  try {
    await buyItem(id)
    justBought.value = name
    clearTimeout(boughtTimer)
    boughtTimer = setTimeout(() => (justBought.value = null), 4000)
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : String(e)
  }
}
async function onTransfer(id: string, sparks: number) {
  actionError.value = null
  try {
    await transferArchived(id, sparks)
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : String(e)
  }
}

const have = computed(() => balance.value?.balance ?? null)
const counts = computed(() => filterCounts(items.value, have.value))
const shown = computed(() => filterItems(items.value, have.value, filter.value))
const groups = computed(() => splitItems(items.value, have.value))
const goal = computed(() => savingGoal(items.value, have.value))
const rate = computed(() => dailyRate(balance.value?.total, createdAt.value, sparksMode.value))

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
    <h1 class="mb-1 text-xl font-semibold"><EmojiText :text="sparksMode ? t('shop_h1_sparks') : t('shop_h1')" /></h1>
    <ShopIdea />

    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <button class="rounded-lg px-3 py-1.5 text-sm" data-testid="add-item" @click="formTarget = 'new'"><EmojiText :text="t('shop_add_item_btn')" /></button>
      <ViewSwitch v-model="view" />
    </div>

    <BalanceCard :balance="balance" :variant="view === 'list' ? 'list' : view === 'focus' ? 'compact' : 'grid'" :goal="goal" />

    <p v-if="justBought" class="goal-pop bought-toast relative mb-2 rounded-xl border px-3 py-2 text-sm font-medium" style="border-color: var(--accent)" role="status" data-testid="bought-toast"><span class="bought-burst" aria-hidden="true" data-testid="bought-burst"><i v-for="n in 6" :key="n" :style="{ '--a': n * 60 + 'deg' }" /></span><EmojiText :text="t('shop_bought_toast')" /> {{ justBought }}</p>
    <p v-if="actionError" class="mb-2 text-sm" style="color: var(--danger)" role="alert" data-testid="action-error">{{ actionError }}</p>
    <p v-if="error" class="dim">{{ t('comm_load_error') }} {{ error }}</p>
    <div v-else-if="items.length === 0" class="card flex flex-col items-center gap-2 rounded-2xl border p-6 text-center" style="border-color: var(--border)" data-testid="shop-empty">
      <span class="text-4xl" style="color: var(--accent)" aria-hidden="true"><Icon name="gift" /></span>
      <p class="m-0 font-semibold">{{ t('shop_empty_title') }}</p>
      <p class="dim m-0 text-sm">{{ t('shop_list_empty') }}</p>
      <button class="mt-1 rounded-lg px-4 py-2 text-sm" data-testid="empty-add" @click="formTarget = 'new'"><EmojiText :text="t('shop_add_item_btn')" /></button>
    </div>

    <!-- Цель (67.2): карточка ближайшей награды, чипы и строки с прогрессом -->
    <template v-else-if="view === 'focus'">
      <NextGoalHero :goal="goal" :balance="have" :rate="rate" :ready-count="groups.affordable.length" />
      <ShopFilters v-model="filter" :counts="counts" />
      <p v-if="shown.length === 0" class="dim text-sm" data-testid="empty-filter">{{ filter === 'affordable' ? (sparksMode ? t('shop_empty_affordable_sparks') : t('shop_empty_affordable')) : t('shop_empty_filter') }}</p>
      <div v-else class="flex flex-col gap-1.5" data-testid="focus-view">
        <ShopRow v-for="item in shown" :key="item.id" :item="item" :balance="have" @buy="onBuy" @edit="formTarget = $event" @remove="onDelete" />
      </div>
    </template>

    <!-- Витрина: чипы-фильтры и сетка карточек -->
    <template v-else-if="view === 'grid'">
      <ShopFilters v-model="filter" :counts="counts" />
      <p v-if="shown.length === 0" class="dim text-sm" data-testid="empty-filter">{{ filter === 'affordable' ? (sparksMode ? t('shop_empty_affordable_sparks') : t('shop_empty_affordable')) : t('shop_empty_filter') }}</p>
      <div v-else class="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3" data-testid="grid-view">
        <ShopCard v-for="item in shown" :key="item.id" :item="item" :balance="have" @buy="onBuy" @edit="formTarget = $event" @remove="onDelete" />
      </div>
    </template>

    <!-- Список с копилкой: «можно купить сейчас», «копится», свёрнутые «мои покупки» -->
    <div v-else class="flex flex-col gap-4" data-testid="list-view">
      <section v-if="groups.affordable.length" data-testid="section-affordable">
        <h2 class="dim mb-1.5 text-sm font-medium"><EmojiText :text="t('shop_section_affordable')" /></h2>
        <div class="flex flex-col gap-1.5">
          <ShopRow v-for="item in groups.affordable" :key="item.id" :item="item" :balance="have" @buy="onBuy" @edit="formTarget = $event" @remove="onDelete" />
        </div>
      </section>
      <section v-if="groups.saving.length" data-testid="section-saving">
        <h2 class="dim mb-1.5 text-sm font-medium"><EmojiText :text="t('shop_section_saving')" /></h2>
        <div class="flex flex-col gap-1.5">
          <ShopRow v-for="item in groups.saving" :key="item.id" :item="item" :balance="have" @buy="onBuy" @edit="formTarget = $event" @remove="onDelete" />
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
          <ShopRow v-for="item in groups.bought" :key="item.id" :item="item" :balance="have" @buy="onBuy" @edit="formTarget = $event" @remove="onDelete" />
        </div>
      </section>
    </div>

    <!-- Архив (миграция 057): старые вещи с ценой в монетах; задать цену в огоньках — вернуть в магазин. Не удаляются. -->
    <section v-if="sparksMode && archived.length" class="mt-4" data-testid="archive-section">
      <button
        type="button"
        class="secondary flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm"
        :aria-expanded="archiveShown"
        data-testid="archive-toggle"
        @click="archiveOpen = !archiveOpen"
      >
        <span>{{ t('shop_archive_title') }} ({{ archived.length }})</span>
        <span aria-hidden="true">{{ archiveShown ? '▴' : '▾' }}</span>
      </button>
      <div v-if="archiveShown" class="mt-1.5 flex flex-col gap-1.5">
        <p class="dim m-0 text-sm">{{ t('shop_archive_hint') }}</p>
        <ArchivedRow v-for="a in archived" :key="a.id" :item="a" @transfer="onTransfer" />
      </div>
    </section>

    <ItemForm v-if="formTarget" :existing="formTarget === 'new' ? null : formTarget" :daily-rate="dailyRate(balance?.total, createdAt, sparksMode)" :upload-image="onUpload" @close="formTarget = null" @save="onSaveForm" />
  </main>
</template>
