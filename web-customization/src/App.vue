<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import EmojiText from './components/EmojiText.vue'
import AppShell from './components/AppShell.vue'
import ItemCard from './components/ItemCard.vue'
import Icon from './components/Icon.vue'
import ThemeCard from './components/ThemeCard.vue'
import ThemeUnlockModal from './components/ThemeUnlockModal.vue'
import SplashPicker from './components/SplashPicker.vue'
import ChartMarkerPicker from './components/ChartMarkerPicker.vue'
import StreakFlamePicker from './components/StreakFlamePicker.vue'
import WaterAnimPicker from './components/WaterAnimPicker.vue'
import BodyModelPicker from './components/BodyModelPicker.vue'
import RarityGroup from './components/RarityGroup.vue'
import VisibilityChips from './components/VisibilityChips.vue'
import { FREE_SECTIONS, FREE_SECTIONS_TOTAL, groupOfItem, groupOfTheme, useVisibility, type FreeSection, type VisGroup } from './lib/useVisibility'
import { useCollapsed } from './lib/useCollapsed'
import SectionGroup from './components/SectionGroup.vue'
import CurrentSelection from './components/CurrentSelection.vue'
import { selectionRows } from './lib/currentSelection'
import { readSplashChoice } from './lib/splashVariant'
import { readStreakFlameVariant } from './lib/streakFlameVariant'
import { getWaterAnimChoice } from './lib/waterAnim'
import { readBodyModelChoice } from './lib/bodyModel'
import { readChartMarker } from './lib/chartMarker'
import { readChartAnim, readChartForecast, readChartGoalZone, readChartKind, readChartLine, readChartSparks } from './lib/chartLine'
import { itemGroups, themeGroups } from './lib/rarity'
import { useFavoriteThemes } from './lib/useFavoriteThemes'
import { useCustomization } from './lib/useCustomization'
import { CATEGORY_ORDER, ITEMS } from './lib/customization'
import { t } from './lib/i18n'
import { ALL_TAB, groupCounts, groupOfSection, groupsFor, migrateStoredTab, readTab, resolveTab, showsSection, writeTab } from './lib/pageTabs'
import { THEME_UNLOCK, type ThemeKey } from './lib/theme'

const { auth, balance, achievements, apiMissing, loading, error, actionError, busyKey, selected, statusOf, init, buy, choose } = useCustomization()
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
  const n: Record<VisGroup, number> = { owned: FREE_SECTIONS_TOTAL, achievement: 0, coins: 0 } // бесплатные выборы — всегда «Получено»
  for (const g of themeBuckets) for (const k of g.items) n[themeGroup(k)]++
  for (const c of categories.value) for (const g of c.groups) for (const i of g.items) n[groupOfItem(i, statusOf(i.key))]++
  return n
})
const freeShown = computed(() => vis.isVisible('owned')) // бесплатные разделы-выборы (61.7) показываем вместе с «Получено»
const nothingShown = computed(() => !visibleThemeBuckets.value.length && !visibleCategories.value.length && !freeShown.value)

// Вкладки (BACKLOG 54.7): по вкладке на раздел витрины; список строится из самих разделов, так что новый раздел получает вкладку сам.
const tabChoice = ref<string | null>(migrateStoredTab(readTab()))
// 59.1 срез 1: вкладки — группы по задаче; группа есть, пока в ней виден хоть один раздел (новый раздел без группы идёт в «Прочее»)
const sectionIds = computed(() => [
  ...(visibleThemeBuckets.value.length ? ['themes'] : []),
  ...(freeShown.value ? (Object.keys(FREE_SECTIONS) as FreeSection[]) : []),
  ...visibleCategories.value.map((c) => c.category as string),
])
// Счётчик «открыто/всего» на вкладке группы: темы и предметы — по статусу, бесплатные выборы — всегда полные (как у их разделов)
const counts = computed(() =>
  groupCounts([
    ...(visibleThemeBuckets.value.length ? [{ id: 'themes', owned: themeOwnedTotal.value, total: themeTotal }] : []),
    ...(freeShown.value ? (Object.keys(FREE_SECTIONS) as FreeSection[]).map((id) => ({ id: id as string, owned: FREE_SECTIONS[id], total: FREE_SECTIONS[id] })) : []),
    ...visibleCategories.value.map((c) => ({ id: c.category as string, owned: c.owned, total: c.total })),
  ]),
)
const tabList = computed(() =>
  groupsFor(sectionIds.value).map((g) => {
    const c = counts.value[g]
    return { id: g as string, label: t(('cust_grp_' + g) as never), count: c ? c.owned + '/' + c.total : '' }
  }),
)
const tab = computed(() => resolveTab(tabChoice.value, tabList.value.map((x) => x.id)))
function setTab(id: string) {
  tabChoice.value = id
  writeTab(id)
}
const shownCategories = computed(() => visibleCategories.value.filter((c) => showsSection(tab.value, c.category)))

// «Сейчас выбрано» (61.6 срез 1). Мелкие выборы (заставка, вода, модель тела …) лежат в localStorage и меняются внутри своих карточек, поэтому
// сводку пересчитываем после любого клика по странице (`tick`), а не подписываемся на каждое хранилище по отдельности.
const tick = ref(0)
const bump = () => void nextTick(() => tick.value++)
const nowRows = computed(() => {
  void tick.value
  return selectionRows({
    theme: themes.current.value,
    selected: selected.value,
    splash: readSplashChoice(),
    streakFlame: readStreakFlameVariant(),
    waterAnim: getWaterAnimChoice(),
    bodyModel: readBodyModelChoice(),
    chartMarker: readChartMarker(),
    chart: { kind: readChartKind(), line: readChartLine(), anim: readChartAnim(), forecast: readChartForecast(), goalZone: readChartGoalZone(), sparks: readChartSparks() },
  })
})
// Тап по строке: открыть вкладку группы (если выбрана не «Все»), раскрыть раздел, прокрутить к нему
function goToSection(id: string) {
  if (tab.value !== ALL_TAB && tab.value !== groupOfSection(id)) setTab(groupOfSection(id))
  if (isCollapsed('section:' + id)) toggle('section:' + id)
  void nextTick(() => document.querySelector(`[data-section="${id}"]`)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }))
}
</script>

<template>
  <AppShell :user-email="auth.status === 'ready' ? auth.userEmail : null" />

  <main class="mx-auto max-w-3xl px-4 pb-16 pt-4" @click="bump">
    <h1 class="mb-1 text-xl font-semibold"><EmojiText :text="t('cust_title')" /></h1>
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

        <CurrentSelection :rows="nowRows" :collapsed="isCollapsed('section:now')" @toggle="toggle('section:now')" @go="goToSection" />

        <VisibilityChips :state="vis.state.value" :counts="visCounts" @toggle="vis.toggle" />
        <p v-if="nothingShown" class="dim mb-4 text-sm" data-testid="vis-empty">{{ vis.noneVisible.value ? t('cust_vis_empty_none') : t('cust_vis_empty') }}</p>

        <div class="cust-tabs-bar mb-4 flex gap-1.5 overflow-x-auto pb-1 pt-1" role="tablist" data-testid="cust-tabs">
          <button
            v-for="x in [...tabList, { id: ALL_TAB, label: t('cust_tab_all'), count: '' }]"
            :key="x.id"
            type="button"
            role="tab"
            class="shrink-0 rounded-full border px-3.5 py-1.5 text-sm"
            :aria-selected="tab === x.id"
            :style="tab === x.id ? 'border-color: var(--accent); color: var(--accent); background: transparent' : 'border-color: var(--border); color: var(--text-dim); background: transparent'"
            :data-testid="'cust-tab-' + x.id"
            @click="setTab(x.id)"
          >
            {{ x.label }}<span v-if="x.count" class="cust-tab-count" data-testid="tab-count">{{ x.count }}</span>
          </button>
        </div>

        <SectionGroup v-if="visibleThemeBuckets.length && showsSection(tab, 'themes')" id="themes" :title="t('cust_sec_themes')" :total="themeTotal" :owned="themeOwnedTotal" :collapsed="isCollapsed('section:themes')" @toggle="toggle('section:themes')">
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
        <!-- Маркеры графиков (BACKLOG 13:54): 4 бесплатных стиля, выбор в localStorage -->
        <SectionGroup v-if="freeShown && showsSection(tab, 'chart-markers')" id="chart-markers" :title="t('cust_sec_markers')" :total="4" :owned="4" :collapsed="isCollapsed('section:chart-markers')" @toggle="toggle('section:chart-markers')">
          <ChartMarkerPicker />
        </SectionGroup>

        <SectionGroup v-if="freeShown && showsSection(tab, 'splash')" id="splash" :title="t('cust_sec_splash')" :total="4" :owned="4" :collapsed="isCollapsed('section:splash')" @toggle="toggle('section:splash')">
          <SplashPicker />
        </SectionGroup>

        <!-- Огонёк серии (BACKLOG 44.18в, срез 1): 2 бесплатных варианта, выбор в localStorage -->
        <SectionGroup v-if="freeShown && showsSection(tab, 'streakflame')" id="streakflame" :title="t('cust_sec_streakflame')" :total="2" :owned="2" :collapsed="isCollapsed('section:streakflame')" @toggle="toggle('section:streakflame')">
          <StreakFlamePicker />
        </SectionGroup>

        <!-- Анимация воды (BACKLOG 54.8): «По теме» + 6 бесплатных вариантов, выбор в localStorage (общий с «Настройками» шапки) -->
        <SectionGroup v-if="freeShown && showsSection(tab, 'wateranim')" id="wateranim" :title="t('cust_sec_wateranim')" :total="7" :owned="7" :collapsed="isCollapsed('section:wateranim')" @toggle="toggle('section:wateranim')">
          <WaterAnimPicker />
        </SectionGroup>

        <!-- Модель тела карты мышц (BACKLOG 59.2 срез 2): «По полу» + 5 моделей, выбор в localStorage (общий с «Тренировками») -->
        <SectionGroup v-if="freeShown && showsSection(tab, 'bodymodel')" id="bodymodel" :title="t('cust_sec_bodymodel')" :total="5" :owned="5" :collapsed="isCollapsed('section:bodymodel')" @toggle="toggle('section:bodymodel')">
          <BodyModelPicker />
        </SectionGroup>

        <SectionGroup v-for="c in shownCategories" :key="c.category" :id="c.category" :title="t(('cust_cat_' + c.category) as never)" :total="c.total" :owned="c.owned" :collapsed="isCollapsed('section:' + c.category)" @toggle="toggle('section:' + c.category)">
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
