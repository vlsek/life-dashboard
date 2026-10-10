<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AppShell from './components/AppShell.vue'
import ItemCard from './components/ItemCard.vue'
import Icon from './components/Icon.vue'
import ThemeCard from './components/ThemeCard.vue'
import ThemeUnlockModal from './components/ThemeUnlockModal.vue'
import SplashPicker from './components/SplashPicker.vue'
import RarityGroup from './components/RarityGroup.vue'
import VisibilityChips from './components/VisibilityChips.vue'
import { groupOfItem, groupOfTheme, useVisibility, type VisGroup } from './lib/useVisibility'
import { useCollapsed } from './lib/useCollapsed'
import SectionGroup from './components/SectionGroup.vue'
import { itemGroups, themeGroups } from './lib/rarity'
import { useFavoriteThemes } from './lib/useFavoriteThemes'
import { useCustomization } from './lib/useCustomization'
import { CATEGORY_ORDER, ITEMS } from './lib/customization'
import { t } from './lib/i18n'
import { THEME_UNLOCK, type ThemeKey } from './lib/theme'

const { auth, balance, achievements, apiMissing, loading, error, actionError, busyKey, statusOf, init, buy, choose } = useCustomization()
onMounted(init)

// Темы: до 4 «любимых» попадают в выпадающий список тем бокового меню (решение владельца 2026-10-04). С v3.42 шесть тем — награды за
// достижения (решение владельца 2026-10-06): закрытая тема видна с образцом, но не применяется, пока не получено достижение.
const themes = useFavoriteThemes()
// Список открытых тем обновляем ТОЛЬКО после успешной загрузки достижений (иначе пустой список до загрузки закрыл бы заслуженное).
watch(
  [loading, achievements],
  () => {
    if (auth.value.status === 'ready' && !loading.value && !error.value) themes.setUnlocksFromAchievements(achievements.value)
  },
  { immediate: true },
)
const unlockText = (k: ThemeKey): string => {
  const ach = THEME_UNLOCK[k]
  return ach ? t('cust_theme_reward_for').replace('{name}', t(('cust_ach_' + ach) as never)) : ''
}
const themeOwned = (keys: ThemeKey[]): number => keys.filter((k) => !themes.isLocked(k)).length

// Редкость (BACKLOG 39): и темы, и предметы разложены по группам «обычные … легендарные»; каждая группа сворачивается, состояние помним.
const { isCollapsed, toggle } = useCollapsed()
const unlockFor = ref<ThemeKey | null>(null) // тема, для которой открыто окно «как получить» (BACKLOG 49.10)
const themeBuckets = themeGroups()

// Раздел на категорию предметов (рамки аватарки …) → группы по редкости; «открыто» считаем по статусу предмета.
const categories = computed(() =>
  CATEGORY_ORDER.map((category) => {
    const groups = itemGroups(ITEMS.filter((i) => i.category === category)).map((g) => ({
      ...g,
      owned: g.items.filter((i) => ['owned', 'selected'].includes(statusOf(i.key))).length,
    }))
    // Счётчик раздела «открыто/всего» (BACKLOG 51.3) — по всей витрине раздела, как и у групп редкости (фильтр видимости его не меняет)
    return { category, groups, total: groups.reduce((n, g) => n + g.items.length, 0), owned: groups.reduce((n, g) => n + g.owned, 0) }
  }).filter((c) => c.groups.length),
)
const themeTotal = themeBuckets.reduce((n, g) => n + g.items.length, 0)
const themeOwnedTotal = computed(() => themeBuckets.reduce((n, g) => n + themeOwned(g.items), 0))

// Переключатель видимости (BACKLOG 47.1): каждая тема и предмет — ровно в одной группе; прячем только показ карточек, а счётчики
// «открыто/всего» у групп редкости остаются честными (по всей витрине).
const vis = useVisibility()
const themeGroup = (k: ThemeKey): VisGroup => groupOfTheme(themes.isLocked(k))
const visibleCategories = computed(() =>
  categories.value
    .map((c) => ({ ...c, groups: c.groups.map((g) => ({ ...g, shown: g.items.filter((i) => vis.isVisible(groupOfItem(i, statusOf(i.key)))) })).filter((g) => g.shown.length) }))
    .filter((c) => c.groups.length),
)
const visibleThemeBuckets = computed(() => themeBuckets.map((g) => ({ ...g, shown: g.items.filter((k) => vis.isVisible(themeGroup(k))) })).filter((g) => g.shown.length))
const visCounts = computed(() => {
  const n: Record<VisGroup, number> = { owned: 0, achievement: 0, coins: 0 }
  for (const g of themeBuckets) for (const k of g.items) n[themeGroup(k)]++
  for (const c of categories.value) for (const g of c.groups) for (const i of g.items) n[groupOfItem(i, statusOf(i.key))]++
  return n
})
const nothingShown = computed(() => !visibleThemeBuckets.value.length && !visibleCategories.value.length)
</script>

<template>
  <AppShell :user-email="auth.status === 'ready' ? auth.userEmail : null" />

  <main class="mx-auto max-w-3xl px-4 pb-16 pt-4">
    <h1 class="mb-1 text-xl font-semibold">{{ t('cust_title') }}</h1>
    <p class="dim mb-2 text-sm">{{ t('cust_intro') }}</p>
    <p class="dim mb-4 text-xs" data-testid="rarity-hint">{{ t('cust_rarity_hint') }}</p>

    <p v-if="auth.status === 'loading' || (auth.status === 'ready' && loading)" class="dim">…</p>

    <template v-else-if="auth.status === 'ready'">
      <p v-if="error" class="dim">{{ t('cust_select_error') }}{{ error }}</p>

      <template v-else>
        <div class="mb-4 flex items-baseline justify-between rounded-xl border p-3" style="background: var(--bg-card); border-color: var(--border)" data-testid="balance">
          <span class="text-sm">{{ t('cust_balance') }}</span>
          <span class="font-semibold">
            <template v-if="balance != null">{{ balance }} <Icon name="coin" /></template>
            <template v-else><span class="dim text-sm">{{ t('cust_balance_unknown') }}</span></template>
          </span>
        </div>

        <p v-if="apiMissing" class="mb-4 text-sm" style="color: var(--danger)" data-testid="need-migration">{{ t('cust_need_migration') }}</p>
        <p v-if="actionError" class="mb-3 text-sm" style="color: var(--danger)" data-testid="action-error">{{ actionError }}</p>

        <VisibilityChips :state="vis.state.value" :counts="visCounts" @toggle="vis.toggle" />
        <p v-if="nothingShown" class="dim mb-4 text-sm" data-testid="vis-empty">{{ vis.noneVisible.value ? t('cust_vis_empty_none') : t('cust_vis_empty') }}</p>

        <SectionGroup v-if="visibleThemeBuckets.length" id="themes" :title="t('cust_sec_themes')" :total="themeTotal" :owned="themeOwnedTotal" :collapsed="isCollapsed('section:themes')" @toggle="toggle('section:themes')">
          <p class="dim mb-1 text-xs">{{ t('cust_sec_themes_hint') }}</p>
          <p class="dim mb-2 text-xs" data-testid="fav-count">{{ t('cust_theme_fav_count').replace('{n}', String(themes.favorites.value.length)).replace('{max}', String(themes.max)) }}</p>
          <RarityGroup v-for="g in visibleThemeBuckets" :key="g.rarity" :id="'themes:' + g.rarity" :rarity="g.rarity" :total="g.items.length" :owned="themeOwned(g.items)" :collapsed="isCollapsed('themes:' + g.rarity)" @toggle="toggle('themes:' + g.rarity)">
            <div class="grid gap-2.5" style="grid-template-columns: repeat(auto-fill, minmax(min(9.5rem, 100%), 1fr))">
              <ThemeCard
                v-for="k in g.shown"
                :key="k"
                :theme-key="k"
                :active="themes.current.value === k"
                :favorite="themes.isFavorite(k)"
                :can-toggle="themes.canToggle(k)"
                :locked="themes.isLocked(k)"
                :unlock-text="unlockText(k)"
                @apply="themes.apply(k)"
                @show-unlock="unlockFor = k"
                @toggle-favorite="themes.toggleFavorite(k)"
              />
            </div>
          </RarityGroup>
        </SectionGroup>

        <!-- Заставка загрузки (BACKLOG 16, срез 2): 4 бесплатных варианта, выбор в localStorage -->
        <SectionGroup id="splash" :title="t('cust_sec_splash')" :total="4" :owned="4" :collapsed="isCollapsed('section:splash')" @toggle="toggle('section:splash')">
          <SplashPicker />
        </SectionGroup>

        <SectionGroup v-for="c in visibleCategories" :key="c.category" :id="c.category" :title="t(('cust_cat_' + c.category) as never)" :total="c.total" :owned="c.owned" :collapsed="isCollapsed('section:' + c.category)" @toggle="toggle('section:' + c.category)">
          <p class="dim mb-2 text-xs">{{ t('cust_cat_hint') }}</p>
          <RarityGroup
            v-for="g in c.groups"
            :key="g.rarity"
            :id="c.category + ':' + g.rarity"
            :rarity="g.rarity"
            :total="g.items.length"
            :owned="g.owned"
            :collapsed="isCollapsed(c.category + ':' + g.rarity)"
            @toggle="toggle(c.category + ':' + g.rarity)"
          >
            <div class="grid gap-2.5" style="grid-template-columns: repeat(auto-fill, minmax(min(9.5rem, 100%), 1fr))">
              <ItemCard
                v-for="it in g.shown"
                :key="it.key"
                :item="it"
                :status="statusOf(it.key)"
                :balance="balance"
                :busy="busyKey === it.key"
                :disabled="apiMissing || !!busyKey"
                @buy="buy(it.key)"
                @choose="choose(it.category, it.key)"
                @unchoose="choose(it.category, null)"
              />
            </div>
          </RarityGroup>
        </SectionGroup>

        <p class="dim text-xs">{{ t('cust_soon') }}</p>
      </template>
    </template>
    <ThemeUnlockModal v-if="unlockFor" :theme-key="unlockFor" @close="unlockFor = null" />
  </main>
</template>
