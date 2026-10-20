<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
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
import IconStylePicker from './components/IconStylePicker.vue'
import RarityGroup from './components/RarityGroup.vue'
import VisibilityChips from './components/VisibilityChips.vue'
import { FREE_SECTIONS, FREE_SECTIONS_TOTAL, allVisible, groupOfItem, groupOfTheme, useVisibility, type FreeSection, type VisGroup } from './lib/useVisibility'
import { useCollapsed } from './lib/useCollapsed'
import SectionGroup from './components/SectionGroup.vue'
import SlotCell from './components/SlotCell.vue'
import LooksPanel from './components/LooksPanel.vue'
import { MAX_LOOKS, captureLook, deleteLook, freeLookId, loadLooks, planApply, renameLook, saveLook, type Look } from './lib/looks'
import SlotToolbar from './components/SlotToolbar.vue'
import { matchesQuery, modeOfVis, sortSlotItems, visOfMode, type SlotMode, type SlotSort } from './lib/slotView'
import { selectionRows } from './lib/currentSelection'
import { readSplashChoice } from './lib/splashVariant'
import { readStreakFlameVariant } from './lib/streakFlameVariant'
import { getWaterAnimChoice } from './lib/waterAnim'
import { readBodyModelChoice } from './lib/bodyModel'
import { readChartMarker } from './lib/chartMarker'
import { readIconStyle } from './lib/iconStyle'
import { readChartAnim, readChartForecast, readChartGoalZone, readChartKind, readChartLine, readChartSparks } from './lib/chartLine'
import { itemGroups, rarityOfItem, rarityOfTheme, themeGroups } from './lib/rarity'
import { useFavoriteThemes } from './lib/useFavoriteThemes'
import { useCustomization } from './lib/useCustomization'
import { CATEGORY_ORDER, ITEMS, itemByKey, priceOf } from './lib/customization'
import { t } from './lib/i18n'
import { SLOTS, childSlots, freeTotal, topSlots } from './lib/slots'
import { GROUP_ORDER } from './lib/pageTabs'
import { SLOT_ALL, readSlot, writeSlot } from './lib/slotNav'
import { stripEmoji } from './lib/emojiText'
import { THEME_KEYS, THEME_UNLOCK, type ThemeKey } from './lib/theme'

const { auth, balance, achievements, apiMissing, loading, error, actionError, busyKey, selected, unlocked, debug, tried, statusOf, init, buy, choose, applyAll, tryOn, untryOn, resetTryOn } = useCustomization()
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

// Витрина слотов (BACKLOG 64.1, срез 2; вместо вкладок-групп 54.7/59.1): без выбора — ячейки слотов с тем, что надето; нажатие открывает один слот,
// «Всё одним списком» — прежняя лента всех разделов. Состояние — в адресе (`#slot=…`), «Назад» возвращает на витрину.
const openSlot = ref<string>(readSlot())
const syncSlot = () => (openSlot.value = readSlot())
onMounted(() => window.addEventListener('hashchange', syncSlot))
onBeforeUnmount(() => window.removeEventListener('hashchange', syncSlot))
const inSlot = computed(() => openSlot.value !== '')
// слот-«ребёнок» (базовые анимации воды) открывается вместе с родителем — один экран «Анимация воды»
const isOpen = (id: string): boolean => openSlot.value === SLOT_ALL || openSlot.value === id || SLOTS.find((x) => x.id === id)?.parent === openSlot.value
function open(id: string) {
  writeSlot(id)
  syncSlot()
  window.scrollTo?.({ top: 0 })
}
function closeSlot() {
  writeSlot('')
  openSlot.value = ''
}
const shownCategories = computed(() => visibleCategories.value.filter((c) => isOpen(c.category)))

// Экран одного слота (64.1, срез 3): «Все · Мои · Магазин», поиск, сортировка, плоский список с редкостью на карточке. В «Всё одним списком» — прежняя лента.
const single = computed(() => inSlot.value && openSlot.value !== SLOT_ALL)
const slotDef = computed(() => SLOTS.find((x) => x.id === openSlot.value))
const hasToolbar = computed(() => single.value && (slotDef.value?.kind === 'themes' || slotDef.value?.kind === 'catalog'))
const query = ref('')
const sort = ref<SlotSort>('rarity')
const mode = computed<SlotMode>(() => modeOfVis(vis.state.value))
const modeModel = computed<SlotMode>({ get: () => mode.value, set: (m) => vis.set(visOfMode(m)) })
// Каждый слот открывается с чистого листа: «Все», без поиска, по редкости (иначе фильтр из прошлого слота прятал бы предметы без объяснения)
watch(openSlot, (id) => {
  if (id && id !== SLOT_ALL) {
    query.value = ''
    sort.value = 'rarity'
    vis.set(allVisible())
  }
}, { immediate: true })
const itemLabel = (key: string): string => stripEmoji(t(('cust_item_' + key) as never))
const themeLabel = (k: ThemeKey): string => stripEmoji(t(THEME_KEYS[k] as never))
const modeCounts = computed<Record<SlotMode, number>>(() => {
  const n: Record<VisGroup, number> = { owned: 0, achievement: 0, coins: 0 }
  if (slotDef.value?.kind === 'themes') for (const g of themeBuckets) for (const k of g.items) n[themeGroup(k)]++
  else if (slotDef.value?.kind === 'catalog') for (const c of categories.value) if (c.category === slotDef.value.id) for (const g of c.groups) for (const i of g.items) n[groupOfItem(i, statusOf(i.key))]++
  for (const ch of childSlots(openSlot.value)) n.owned += slotCounts.value[ch.id]?.total ?? 0 // вложенные «бесплатные» слоты целиком «мои» (например, базовые анимации воды)
  return { all: n.owned + n.achievement + n.coins, mine: n.owned, shop: n.achievement + n.coins }
})
const flatItems = computed(() => {
  const c = visibleCategories.value.find((x) => x.category === openSlot.value)
  if (!c) return []
  const list = c.groups.flatMap((g) => g.shown).filter((i) => matchesQuery(itemLabel(i.key), query.value))
  return sortSlotItems(list, sort.value, { rarity: (i) => rarityOfItem(i.key), price: (i) => priceOf(i) ?? 0, label: (i) => itemLabel(i.key) })
})
const flatThemes = computed(() => {
  const list = visibleThemeBuckets.value.flatMap((g) => g.shown).filter((k) => matchesQuery(themeLabel(k), query.value))
  return sortSlotItems(list, sort.value, { rarity: (k) => rarityOfTheme(k), label: themeLabel })
})
const slotEmpty = computed(() => hasToolbar.value && (slotDef.value?.kind === 'themes' ? !flatThemes.value.length : !flatItems.value.length))

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
    iconStyle: readIconStyle(),
    chart: { kind: readChartKind(), line: readChartLine(), anim: readChartAnim(), forecast: readChartForecast(), goalZone: readChartGoalZone(), sparks: readChartSparks() },
  })
})
// Ячейки витрины: по слоту — что надето сейчас (из «Сейчас выбрано»), «открыто/всего», подсветка «выбрано своё». Слот без видимого содержимого не показываем.
const slotCounts = computed<Record<string, { owned: number; total: number }>>(() => {
  const m: Record<string, { owned: number; total: number }> = { themes: { owned: themeOwnedTotal.value, total: themeTotal }, looks: { owned: looks.value.length, total: MAX_LOOKS } }
  for (const id of Object.keys(FREE_SECTIONS) as FreeSection[]) m[id] = { owned: FREE_SECTIONS[id], total: FREE_SECTIONS[id] }
  for (const c of categories.value) m[c.category] = { owned: c.owned, total: c.total }
  return m
})
const slotVisible = (id: string): boolean => (id === 'looks' ? true : id === 'themes' ? visibleThemeBuckets.value.length > 0 : id in FREE_SECTIONS ? freeShown.value : visibleCategories.value.some((c) => c.category === id))
const cells = computed(() =>
  GROUP_ORDER.map((g) => ({
    group: g as string,
    label: t(('cust_grp_' + g) as never),
    items: topSlots().filter((sl) => sl.group === g && [sl, ...childSlots(sl.id)].some((x) => slotVisible(x.id))).map((sl) => {
      const own = [sl, ...childSlots(sl.id)] // слот и вложенные в него (одна ячейка, одно число «открыто/всего»)
      const rs = nowRows.value.filter((r) => own.some((x) => x.id === r.section))
      const cs = own.map((x) => slotCounts.value[x.id]).filter(Boolean)
      const shown = rs.filter((r) => r.custom).length ? rs.filter((r) => r.custom) : rs.slice(0, 1) // у слота с вложенным показываем то, что выбрано своё, иначе первое значение
      return {
        id: sl.id,
        title: t(sl.titleKey as never),
        value: sl.kind === 'looks' ? (looks.value.length ? looks.value.map((l) => l.name).join(' · ') : t('cust_look_none')) : (own.length > 1 ? shown : rs).map((r) => [r.valueKey, ...(r.extraKeys ?? [])].map((k) => stripEmoji(t(k as never))).join(' · ')).join(' · '),
        count: cs.length ? cs.reduce((n, c) => n + c.owned, 0) + '/' + cs.reduce((n, c) => n + c.total, 0) : '',
        custom: rs.some((r) => r.custom),
      }
    }),
  })).filter((g) => g.items.length),
)
// «открыто/всего» открытого слота вместе с вложенными (у «Анимации воды» — базовые + дополнительные)
const openTotals = computed(() => {
  const own = [openSlot.value, ...childSlots(openSlot.value).map((x) => x.id)].map((id) => slotCounts.value[id]).filter(Boolean)
  return own.length ? { owned: own.reduce((n, c) => n + c.owned, 0), total: own.reduce((n, c) => n + c.total, 0) } : null
})
const openTitle = computed(() => (openSlot.value === SLOT_ALL ? t('cust_all_title') : stripEmoji(t((SLOTS.find((x) => x.id === openSlot.value)?.titleKey ?? 'cust_all_title') as never))))

// «Образы» (64.1 срез 5b): сохранить текущий вид, надеть, переименовать, удалить. Надевание пишет выбор каталога одним запросом, тему и ключи пикеров —
// на устройство, и перезагружает страницу; сообщение переживает перезагрузку через sessionStorage.
const NOTE_KEY = 'cust_look_note'
const looks = ref<Look[]>(loadLooks(localStorage))
const looksBusy = ref(false)
const looksError = ref<string | null>(null)
const lookNote = ref<{ name: string; skipped: number } | null>(null)
try {
  const raw = sessionStorage.getItem(NOTE_KEY)
  if (raw) {
    sessionStorage.removeItem(NOTE_KEY)
    const v = JSON.parse(raw) as { name?: unknown; skipped?: unknown }
    if (typeof v.name === 'string') lookNote.value = { name: v.name, skipped: typeof v.skipped === 'number' ? v.skipped : 0 }
  }
} catch {
  /* сообщения не будет — образ всё равно надет */
}
const reloadLooks = () => (looks.value = loadLooks(localStorage))
function saveCurrentLook(name: string) {
  looksError.value = null
  const id = freeLookId(looks.value)
  if (!id) return
  const l = captureLook(id, name, { theme: themes.current.value, selected: selected.value }, (k) => localStorage.getItem(k))
  if (!saveLook(localStorage, l)) looksError.value = t('cust_look_save_fail')
  reloadLooks()
}
function renameLookTo(id: string, name: string) {
  renameLook(localStorage, id, name)
  reloadLooks()
}
function removeLook(id: string) {
  deleteLook(localStorage, id)
  reloadLooks()
}
async function wearLook(id: string) {
  const l = looks.value.find((x) => x.id === id)
  if (!l || looksBusy.value) return
  looksBusy.value = true
  looksError.value = null
  const plan = planApply(
    l,
    (c, k) => !!unlocked.value[k] && itemByKey(k)?.category === c,
    (th) => !themes.isLocked(th as ThemeKey),
  )
  const applied = await applyAll(plan.selected)
  if (applied === null) {
    looksBusy.value = false
    looksError.value = t('cust_look_wear_fail')
    return
  }
  if (plan.theme) themes.apply(plan.theme as ThemeKey)
  try {
    for (const [k, v] of Object.entries(plan.prefsSet)) localStorage.setItem(k, v)
    for (const k of plan.prefsRemove) localStorage.removeItem(k)
    sessionStorage.setItem(NOTE_KEY, JSON.stringify({ name: l.name, skipped: plan.skipped }))
  } catch {
    /* хранилище недоступно — выбор каталога и тема уже применены */
  }
  window.location.reload()
}
</script>

<template>
  <AppShell :user-email="auth.status === 'ready' ? auth.userEmail : null" />

  <main class="mx-auto max-w-3xl px-4 pb-16 pt-4" @click="bump">
    <h1 class="mb-1 text-xl font-semibold"><EmojiText :text="t('cust_title')" /></h1>
    <p class="dim mb-2 text-sm">{{ t('cust_intro') }}</p>
    <p v-if="openSlot === SLOT_ALL" class="dim mb-4 text-xs" data-testid="rarity-hint">{{ t('cust_rarity_hint') }}</p>

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
        <div v-if="debug" class="card mb-3 flex flex-wrap items-center gap-2 text-sm" data-testid="debug-banner">
          <span class="dim">{{ t('cust_debug_banner') }}</span>
          <button v-if="Object.keys(tried).length" type="button" class="secondary px-3 py-1 text-sm" data-testid="tryon-reset" @click="resetTryOn">{{ t('cust_tryon_reset') }}</button>
        </div>

        <p v-if="lookNote" class="mb-3 rounded-lg border p-2 text-sm" style="border-color: var(--accent); background: var(--bg-card)" role="status" data-testid="look-note">
          {{ t('cust_look_applied').replace('{name}', lookNote.name) }}<template v-if="lookNote.skipped"> {{ t('cust_look_skipped').replace('{n}', String(lookNote.skipped)) }}</template>
        </p>
        <!-- Витрина: ячейки слотов по группам (что надето сейчас, n/m); нажатие открывает слот -->
        <template v-if="!inSlot">
          <p class="dim mb-3 text-xs" data-testid="slots-hint">{{ t('cust_slots_hint') }}</p>
          <section v-for="g in cells" :key="g.group" class="mb-4" :data-group="g.group">
            <h2 class="mb-2 text-sm font-medium" style="color: var(--text-dim)" data-testid="slot-group-title">{{ g.label }}</h2>
            <div class="grid gap-2.5" style="grid-template-columns: repeat(auto-fill, minmax(min(10.5rem, 100%), 1fr))">
              <SlotCell v-for="c in g.items" :key="c.id" :id="c.id" :title="c.title" :value="c.value" :count="c.count" :custom="c.custom" @open="open" />
            </div>
          </section>
          <p v-if="!cells.length" class="dim mb-4 text-sm" data-testid="vis-empty">{{ vis.noneVisible.value ? t('cust_vis_empty_none') : t('cust_vis_empty') }}</p>
          <VisibilityChips :state="vis.state.value" :counts="visCounts" @toggle="vis.toggle" />
          <button type="button" class="secondary mb-4 px-3 py-1.5 text-sm" data-testid="slot-show-all" @click="open(SLOT_ALL)">{{ t('cust_show_all') }}</button>
        </template>

        <!-- Слот (или «Всё одним списком»): кнопка «Назад», фильтры видимости и сами разделы -->
        <template v-else>
          <div class="mb-3 flex items-center gap-3">
            <button type="button" class="secondary px-3 py-1.5 text-sm" data-testid="slot-back" @click="closeSlot">← {{ t('cust_back') }}</button>
            <h2 class="text-base font-medium" data-testid="slot-title">{{ openTitle }} <span v-if="openTotals" class="dim text-xs font-normal" data-testid="slot-title-count">{{ openTotals.owned }}/{{ openTotals.total }}</span></h2>
          </div>
          <SlotToolbar v-if="hasToolbar" v-model:mode="modeModel" v-model:query="query" v-model:sort="sort" :counts="modeCounts" :price-sort="slotDef?.kind === 'catalog'" />
          <VisibilityChips v-else-if="openSlot === SLOT_ALL" :state="vis.state.value" :counts="visCounts" @toggle="vis.toggle" />
          <p v-if="nothingShown && !hasToolbar" class="dim mb-4 text-sm" data-testid="vis-empty">{{ vis.noneVisible.value ? t('cust_vis_empty_none') : t('cust_vis_empty') }}</p>
          <p v-if="slotEmpty" class="dim mb-4 text-sm" data-testid="slot-empty">{{ query.trim() ? t('cust_search_empty') : t('cust_vis_empty') }}</p>
        </template>

        <SectionGroup :bare="single" v-if="isOpen('looks')" id="looks" :title="t('cust_sec_looks')" :total="MAX_LOOKS" :owned="looks.length" :collapsed="isCollapsed('section:looks')" @toggle="toggle('section:looks')">
          <LooksPanel :looks="looks" :busy="looksBusy" :error="looksError" @save="saveCurrentLook" @wear="wearLook" @rename="renameLookTo" @remove="removeLook" />
        </SectionGroup>

        <SectionGroup :bare="single" v-if="visibleThemeBuckets.length && isOpen('themes')" id="themes" :title="t('cust_sec_themes')" :total="themeTotal" :owned="themeOwnedTotal" :collapsed="isCollapsed('section:themes')" @toggle="toggle('section:themes')">
          <p class="dim mb-1 text-xs">{{ t('cust_sec_themes_hint') }}</p>
          <p class="dim mb-2 text-xs" data-testid="fav-count">{{ t('cust_theme_fav_count').replace('{n}', String(themes.favorites.value.length)).replace('{max}', String(themes.max)) }}</p>
          <div v-if="single" class="grid gap-2.5" style="grid-template-columns: repeat(auto-fill, minmax(min(9.5rem, 100%), 1fr))" data-testid="slot-grid">
            <ThemeCard
              v-for="k in flatThemes"
              :key="k"
              :theme-key="k"
              show-rarity
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
          <template v-else>
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
          </template>
        </SectionGroup>

        <!-- Заставка загрузки (BACKLOG 16, срез 2): 4 бесплатных варианта, выбор в localStorage -->
        <!-- Маркеры графиков (BACKLOG 13:54): 4 бесплатных стиля, выбор в localStorage -->
        <SectionGroup :bare="single" v-if="freeShown && isOpen('chart-markers')" id="chart-markers" :title="t('cust_sec_markers')" :total="freeTotal('chart-markers')" :owned="freeTotal('chart-markers')" :collapsed="isCollapsed('section:chart-markers')" @toggle="toggle('section:chart-markers')">
          <ChartMarkerPicker />
        </SectionGroup>

        <SectionGroup :bare="single" v-if="freeShown && isOpen('splash')" id="splash" :title="t('cust_sec_splash')" :total="freeTotal('splash')" :owned="freeTotal('splash')" :collapsed="isCollapsed('section:splash')" @toggle="toggle('section:splash')">
          <SplashPicker />
        </SectionGroup>

        <!-- Стиль иконок (BACKLOG 44.18г): 5 бесплатных стилей всех иконок, выбор в localStorage и сразу на <html> -->
        <SectionGroup :bare="single" v-if="freeShown && isOpen('iconstyle')" id="iconstyle" :title="t('cust_sec_iconstyle')" :total="freeTotal('iconstyle')" :owned="freeTotal('iconstyle')" :collapsed="isCollapsed('section:iconstyle')" @toggle="toggle('section:iconstyle')">
          <IconStylePicker />
        </SectionGroup>

        <!-- Огонёк серии (BACKLOG 44.18в, срез 1): 2 бесплатных варианта, выбор в localStorage -->
        <SectionGroup :bare="single" v-if="freeShown && isOpen('streakflame')" id="streakflame" :title="t('cust_sec_streakflame')" :total="freeTotal('streakflame')" :owned="freeTotal('streakflame')" :collapsed="isCollapsed('section:streakflame')" @toggle="toggle('section:streakflame')">
          <StreakFlamePicker />
        </SectionGroup>

        <!-- Анимация воды (BACKLOG 54.8): «По теме» + 6 бесплатных вариантов, выбор в localStorage (общий с «Настройками» шапки) -->
        <h3 v-if="single && openSlot === 'water_anim' && freeShown" class="mb-1 text-sm font-medium" style="color: var(--text-dim)" data-testid="water-base-title">{{ t('cust_water_base') }}</h3>
        <SectionGroup :bare="single" v-if="freeShown && isOpen('wateranim')" id="wateranim" :title="t('cust_sec_wateranim')" :total="freeTotal('wateranim')" :owned="freeTotal('wateranim')" :collapsed="isCollapsed('section:wateranim')" @toggle="toggle('section:wateranim')">
          <WaterAnimPicker />
        </SectionGroup>

        <!-- Модель тела карты мышц (BACKLOG 59.2 срез 2): «По полу» + 5 моделей, выбор в localStorage (общий с «Тренировками») -->
        <SectionGroup :bare="single" v-if="freeShown && isOpen('bodymodel')" id="bodymodel" :title="t('cust_sec_bodymodel')" :total="freeTotal('bodymodel')" :owned="freeTotal('bodymodel')" :collapsed="isCollapsed('section:bodymodel')" @toggle="toggle('section:bodymodel')">
          <BodyModelPicker />
        </SectionGroup>

        <SectionGroup :bare="single" v-for="c in shownCategories" :key="c.category" :id="c.category" :title="c.category === 'water_anim' && !single ? t('cust_cat_water_anim') + ' · ' + t('cust_water_extra') : t(('cust_cat_' + c.category) as never)" :total="c.total" :owned="c.owned" :collapsed="isCollapsed('section:' + c.category)" @toggle="toggle('section:' + c.category)">
          <h3 v-if="single && c.category === 'water_anim'" class="mb-1 mt-2 text-sm font-medium" style="color: var(--text-dim)" data-testid="water-extra-title">{{ t('cust_water_extra') }}</h3>
          <p class="dim mb-2 text-xs">{{ t('cust_cat_hint') }}</p>
          <div v-if="single" class="grid gap-2.5" style="grid-template-columns: repeat(auto-fill, minmax(min(9.5rem, 100%), 1fr))" data-testid="slot-grid">
            <ItemCard
              v-for="it in flatItems"
              :key="it.key"
              :item="it"
              show-rarity
              :status="statusOf(it.key)"
              :balance="balance"
              :busy="busyKey === it.key"
              :disabled="apiMissing || !!busyKey"
              :debug="debug"
              :tried="tried[it.category] === it.key"
              @buy="buy(it.key)"
              @tryon="tryOn(it.category, it.key)"
              @untryon="untryOn(it.category)"
              @choose="choose(it.category, it.key)"
              @unchoose="choose(it.category, null)"
            />
          </div>
          <template v-else>
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
                :debug="debug"
                :tried="tried[it.category] === it.key"
                @buy="buy(it.key)"
                @tryon="tryOn(it.category, it.key)"
                @untryon="untryOn(it.category)"
                @choose="choose(it.category, it.key)"
                @unchoose="choose(it.category, null)"
              />
            </div>
          </RarityGroup>
          </template>
        </SectionGroup>

        <p class="dim text-xs">{{ t('cust_soon') }}</p>
      </template>
    </template>
    <ThemeUnlockModal v-if="unlockFor" :theme-key="unlockFor" @close="unlockFor = null" />
  </main>
</template>
