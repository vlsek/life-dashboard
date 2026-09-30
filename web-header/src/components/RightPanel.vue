<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { getLang, t } from '../lib/i18n'
import { isCloseSwipe, isOpenSwipe, type Point } from '../lib/edgeSwipe'
import WaterGlass from './WaterGlass.vue'
import WaterSavedAnim from './WaterSavedAnim.vue'
import ProgressGauge from './ProgressGauge.vue'

// Выдвижная правая панель (BACKLOG 6.2): спидометры дня/недели и стакан воды с быстрым добавлением. Открывается
// свайпом от правого края или кнопкой в шапке; закрывается свайпом вправо, тапом по затемнению, Esc или крестиком.
export interface GaugeData {
  basePct: number
  bonusPct: number
  totalPct: number
  detail: string
}
const props = defineProps<{
  open: boolean
  day: GaugeData | null
  week: GaugeData | null
  water: { todayMl: number; normMl: number } | null
  savedTick: number
}>()
const emit = defineEmits<{ 'update:open': [boolean]; 'open-summary': [kind: 'day' | 'week']; 'open-water': []; 'add-water': [ml: number] }>()

const unit = computed(() => (getLang() === 'en' ? 'ml' : 'мл'))
const waterPct = computed(() => (props.water && props.water.normMl > 0 ? Math.min(100, Math.round((props.water.todayMl / props.water.normMl) * 100)) : 0))

// --- жесты ---
let start: Point | null = null
const point = (e: TouchEvent): Point => ({ x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY })
function onTouchStart(e: TouchEvent) {
  if (e.touches.length !== 1) return (start = null)
  start = { x: e.touches[0].clientX, y: e.touches[0].clientY }
}
function onTouchEnd(e: TouchEvent) {
  if (!start || !e.changedTouches.length) return
  const end = point(e)
  if (!props.open && isOpenSwipe(start, end, window.innerWidth)) emit('update:open', true)
  else if (props.open && isCloseSwipe(start, end)) emit('update:open', false)
  start = null
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) emit('update:open', false)
}
onMounted(() => {
  document.addEventListener('touchstart', onTouchStart, { passive: true })
  document.addEventListener('touchend', onTouchEnd, { passive: true })
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('touchstart', onTouchStart)
  document.removeEventListener('touchend', onTouchEnd)
  document.removeEventListener('keydown', onKey)
})

// пока панель открыта, страница под ней не должна прокручиваться
watch(
  () => props.open,
  (v) => {
    document.documentElement.style.overflow = v ? 'hidden' : ''
  },
)
onBeforeUnmount(() => (document.documentElement.style.overflow = ''))
</script>

<template>
  <div v-if="open" class="gh-panel-backdrop" data-test="panel-backdrop" @click="emit('update:open', false)"></div>
  <aside class="gh-panel" :class="{ 'gh-panel-open': open }" role="dialog" :aria-label="t('hdr_panel_title')" :aria-hidden="!open" data-test="right-panel">
    <div class="gh-row" style="margin-bottom: 12px">
      <h3 style="flex: 1; margin: 0">{{ t('hdr_panel_title') }}</h3>
      <button type="button" class="gh-btn gh-btn-icon" data-test="panel-close" :aria-label="t('close')" @click="emit('update:open', false)">✕</button>
    </div>

    <div class="gh-gauges">
      <ProgressGauge v-if="day" kind="day" v-bind="day" :label="t('dash_day_progress_label')" @click="emit('open-summary', 'day')" />
      <ProgressGauge v-if="week" kind="week" v-bind="week" :label="t('dash_week_progress_label')" @click="emit('open-summary', 'week')" />
    </div>
    <p v-if="!day && !week" class="gh-dim" data-test="panel-empty">{{ t('hdr_panel_no_progress') }}</p>

    <section v-if="water" class="gh-panel-water" data-test="panel-water">
      <WaterSavedAnim :tick="savedTick" />
      <h4>💧 {{ t('dash_water_modal_title') }}</h4>
      <div class="gh-row" style="gap: 14px">
        <WaterGlass plain :scale="2.2" :today-ml="water.todayMl" :norm-ml="water.normMl" :title="t('hdr_panel_water_open')" @click="emit('open-water')" />
        <div>
          <div style="font-size: 20px; font-weight: 700">{{ water.todayMl }} / {{ water.normMl }} {{ unit }}</div>
          <div class="gh-dim">{{ waterPct }}%</div>
        </div>
      </div>
      <div class="gh-wrap" style="margin-top: 10px">
        <button type="button" class="gh-btn" data-test="panel-add-200" @click="emit('add-water', 200)">+ 200 {{ unit }}</button>
        <button type="button" class="gh-btn" data-test="panel-add-500" @click="emit('add-water', 500)">+ 500 {{ unit }}</button>
        <button type="button" class="gh-btn" data-test="panel-water-details" @click="emit('open-water')">{{ t('hdr_panel_details') }}</button>
      </div>
    </section>
  </aside>
</template>
