<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../lib/i18n'
import { frameClass, frameShadow } from '../lib/frames'
import { RARITY_COLOR, rarityOfItem } from '../lib/rarity'
import { priceOf, shortBy, type CustomItem, type ItemStatus } from '../lib/customization'
import Icon from './Icon.vue'
import CollapsePreview from './CollapsePreview.vue'
import WeekGaugePreview from './WeekGaugePreview.vue'
import DayGaugePreview from './DayGaugePreview.vue'
import WaterSavedAnim from './WaterSavedAnim.vue'
import { WATER_ITEMS } from '../lib/waterAnim'
import { parseWeekGauge } from '../lib/weekGauge'
import WaterGlassPreview from './WaterGlassPreview.vue'
import { BY_ITEM } from '../lib/waterGlass'

// Карточка предмета кастомизации: превью (круг-аватар с рамкой), название, условие/цена и одно действие по статусу.
const props = defineProps<{ item: CustomItem; status: ItemStatus; balance: number | null; busy: boolean; disabled: boolean; debug?: boolean; tried?: boolean }>()
const emit = defineEmits<{ buy: []; choose: []; unchoose: []; tryon: []; untryon: [] }>()

const rarity = computed(() => rarityOfItem(props.item.key))
const name = computed(() => t(('cust_item_' + props.item.key) as never))
const price = computed(() => priceOf(props.item))
const missing = computed(() => shortBy(props.item, props.balance))
const isCollapseStyle = computed(() => props.item.category === 'collapse_style')
const isWeekGauge = computed(() => props.item.category === 'week_gauge')
const isDayGauge = computed(() => props.item.category === 'day_gauge')
const isWaterGlass = computed(() => props.item.category === 'water_glass')
const isWaterAnim = computed(() => props.item.category === 'water_anim')
const weekPreviewVariant = computed(() => {
  const s = parseWeekGauge(props.item.key) // вид — из реестра предметов (lib/weekGauge.ts); «семиугольник» в предметах недели не бывает
  return s === 'heptagon' ? 'classic' : s
})
const waterVariant = computed(() => WATER_ITEMS[props.item.key] ?? 'rain') // вид анимации — из реестра предметов (lib/waterAnim.ts)
const reward = computed(() => (props.item.achievement ? t(('cust_ach_' + props.item.achievement) as never) : ''))
</script>

<template>
  <div class="flex flex-col items-center gap-2 rounded-xl border p-3 text-center" 
    :style="{ background: 'var(--bg-card)', borderColor: 'var(--border)', boxShadow: 'inset 0 3px 0 ' + RARITY_COLOR[rarity] }"
    :data-testid="'item-' + item.key"
    :data-status="status"
    :data-rarity="rarity"
  >
    <span v-if="isCollapseStyle" :style="{ opacity: status === 'locked' || status === 'short' ? 0.55 : 1, color: 'var(--text)' }" data-testid="collapse-preview">
      <CollapsePreview :variant="item.key === 'collapse_summary' ? 'summary' : item.key === 'collapse_plus' ? 'plus' : item.key === 'collapse_caret' ? 'caret' : item.key === 'collapse_dot' ? 'dot' : item.key === 'collapse_double' ? 'double' : item.key === 'collapse_square' ? 'square' : item.key === 'collapse_burger' ? 'burger' : 'accordion'" />
    </span>
    <span v-else-if="isWeekGauge" :style="{ opacity: status === 'locked' || status === 'short' ? 0.55 : 1, color: 'var(--text)' }" data-testid="week-gauge-preview">
      <WeekGaugePreview :variant="weekPreviewVariant" />
    </span>
    <span v-else-if="isDayGauge" :style="{ opacity: status === 'locked' || status === 'short' ? 0.55 : 1, color: 'var(--text)' }" data-testid="day-gauge-preview">
      <DayGaugePreview :variant="item.key === 'day_glow' ? 'glow' : item.key === 'day_ticks' ? 'ticks' : item.key === 'day_gradient' ? 'gradient' : item.key === 'day_thick' ? 'thick' : item.key === 'day_rainbow' ? 'rainbow' : item.key === 'day_thin' ? 'thin' : item.key === 'day_sunset' ? 'sunset' : 'dashed'" />
    </span>
    <span v-else-if="isWaterAnim" :style="{ opacity: status === 'locked' || status === 'short' ? 0.55 : 1, color: 'var(--text)' }" data-testid="water-anim-preview">
      <WaterSavedAnim :tick="0" inline loop :demo="waterVariant" />
    </span>
    <span v-else-if="isWaterGlass" :style="{ opacity: status === 'locked' || status === 'short' ? 0.55 : 1, color: 'var(--text)' }" data-testid="water-glass-preview">
      <WaterGlassPreview :style-key="BY_ITEM[item.key] ?? 'glass'" />
    </span>
    <span
      v-else
      class="flex h-14 w-14 items-center justify-center rounded-full text-lg font-medium"
      :class="frameClass(item.key)"
      :style="{ background: 'var(--accent)', color: 'var(--accent-text, #fff)', boxShadow: frameShadow(item.key), opacity: status === 'locked' || status === 'short' ? 0.55 : 1 }"
      aria-hidden="true"
    >A</span>
    <p class="m-0 text-sm font-medium">{{ name }}</p>
    <p v-if="isCollapseStyle || isWeekGauge || isDayGauge || isWaterAnim || isWaterGlass" class="dim m-0 text-xs" data-testid="item-desc">{{ t(('cust_item_' + item.key + '_desc') as never) }}</p>
    <p v-if="frameClass(item.key)" class="dim m-0 text-xs" data-testid="animated">{{ t('cust_animated') }}</p>
    <p v-if="item.source === 'achievement'" class="dim m-0 text-xs"><Icon name="medal" /> {{ t('cust_reward_for') }} «{{ reward }}»</p>
    <p v-else-if="status === 'owned' || status === 'selected'" class="dim m-0 text-xs">{{ t('cust_owned') }}</p>

    <button v-if="status === 'buyable'" class="px-3 py-1 text-sm" :disabled="disabled || busy" data-testid="buy" @click="emit('buy')">{{ t('cust_buy').replace('{n}', String(price)) }} <Icon name="coin" /></button>
    <button v-else-if="status === 'short'" class="secondary px-3 py-1 text-sm" disabled data-testid="short">{{ missing != null ? t('cust_short').replace('{n}', String(missing)) : t('cust_buy').replace('{n}', String(price)) }}</button>
    <button v-else-if="status === 'owned'" class="px-3 py-1 text-sm" :disabled="disabled || busy" data-testid="choose" @click="emit('choose')">{{ t('cust_select') }}</button>
    <button v-else-if="status === 'selected'" class="secondary px-3 py-1 text-sm" :disabled="disabled || busy" data-testid="unchoose" @click="emit('unchoose')">{{ t('cust_selected') }} · {{ t('cust_unselect') }}</button>
    <span v-else class="dim text-xs" data-testid="locked">{{ t('cust_locked') }}</span>
    <!-- Режим отладки (47.6 срез 5b): закрытый/платный предмет можно ПРИМЕРИТЬ — только на этом устройстве, ничего не сохраняется -->
    <template v-if="debug && (status === 'locked' || status === 'short' || status === 'buyable')">
      <button v-if="!tried" class="secondary px-3 py-1 text-sm" :disabled="disabled" data-testid="tryon" @click="emit('tryon')">{{ t('cust_tryon') }}</button>
      <button v-else class="secondary px-3 py-1 text-sm" data-testid="untryon" @click="emit('untryon')">{{ t('cust_tryon_off') }}</button>
      <p v-if="tried" class="dim m-0 text-xs" data-testid="tryon-note">{{ t('cust_tryon_note') }}</p>
    </template>
  </div>
</template>
