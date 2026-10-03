<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { getLang, t } from '../lib/i18n'
import { isCloseSwipe, isOpenSwipeFrom, isSwipeBlockedTarget, swipeZone, type Point, type SwipeZone } from '../lib/edgeSwipe'
import WaterGlass from './WaterGlass.vue'
import WaterSavedAnim from './WaterSavedAnim.vue'
import ProgressGauge from './ProgressGauge.vue'
import MuscleMiniMap from './MuscleMiniMap.vue'
import type { MuscleId } from '../lib/muscles'

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
  muscles?: { done: Set<MuscleId>; last: Partial<Record<MuscleId, string>> } | null // null/не передано — блока мышц нет (нет упражнений)
}>()
const emit = defineEmits<{ 'update:open': [boolean]; 'open-summary': [kind: 'day' | 'week']; 'open-water': []; 'add-water': [ml: number]; 'open-settings': [] }>()

const unit = computed(() => (getLang() === 'en' ? 'ml' : 'мл'))
const waterPct = computed(() => (props.water && props.water.normMl > 0 ? Math.min(100, Math.round((props.water.todayMl / props.water.normMl) * 100)) : 0))

// --- жесты ---
// Открытие решаем уже на touchmove, не дожидаясь touchend: когда браузер/система забирает жест (прокрутка, «назад»), touchend
// не приходит — приходит touchcancel, и жест «пропадал». Закрытие — на touchend (палец и так остаётся на панели).
let start: Point | null = null
let startOpenCandidate = false
let startZone: SwipeZone | null = null
const pt = (t: Touch): Point => ({ x: t.clientX, y: t.clientY })
function onTouchStart(e: TouchEvent) {
  if (e.touches.length !== 1) {
    start = null
    return
  }
  start = pt(e.touches[0])
  startZone = swipeZone(start, window.innerWidth)
  startOpenCandidate = !props.open && startZone !== null && !isSwipeBlockedTarget(e.target)
}
function onTouchMove(e: TouchEvent) {
  if (!start || !startOpenCandidate || props.open || !e.touches.length) return
  if (isOpenSwipeFrom(startZone, start, pt(e.touches[0]))) {
    startOpenCandidate = false
    start = null
    emit('update:open', true)
  }
}
function onTouchEnd(e: TouchEvent) {
  if (!start || !e.changedTouches.length) return
  const end = pt(e.changedTouches[0])
  if (props.open && isCloseSwipe(start, end)) emit('update:open', false)
  // запасной путь: если touchmove почему-то не дошёл (синтетические события, особые браузеры), решаем по touchend
  else if (!props.open && startOpenCandidate && isOpenSwipeFrom(startZone, start, end)) emit('update:open', true)
  start = null
  startOpenCandidate = false
}
function onTouchCancel() {
  start = null
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) emit('update:open', false)
}
onMounted(() => {
  document.addEventListener('touchstart', onTouchStart, { passive: true })
  document.addEventListener('touchmove', onTouchMove, { passive: true })
  document.addEventListener('touchend', onTouchEnd, { passive: true })
  document.addEventListener('touchcancel', onTouchCancel, { passive: true })
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('touchstart', onTouchStart)
  document.removeEventListener('touchmove', onTouchMove)
  document.removeEventListener('touchend', onTouchEnd)
  document.removeEventListener('touchcancel', onTouchCancel)
  document.removeEventListener('keydown', onKey)
})

// пока панель открыта, страница под ней не должна прокручиваться
// общая с левой шторкой блокировка: у каждой стороны свой атрибут на <html>, прокрутка возвращается, когда сняты оба
function applyScrollLock(on: boolean) {
  const root = document.documentElement
  if (on) root.setAttribute('data-lock-right', '')
  else root.removeAttribute('data-lock-right')
  root.style.overflow = root.hasAttribute('data-lock-left') || root.hasAttribute('data-lock-right') ? 'hidden' : ''
}
watch(
  () => props.open,
  (v) => applyScrollLock(v),
)
onBeforeUnmount(() => applyScrollLock(false))
</script>

<template>
  <div v-if="open" class="gh-panel-backdrop" data-test="panel-backdrop" @click="emit('update:open', false)"></div>
  <aside class="gh-panel" :class="{ 'gh-panel-open': open }" role="dialog" :aria-label="t('hdr_panel_title')" :aria-hidden="!open" data-test="right-panel">
    <div class="gh-row" style="margin-bottom: 12px">
      <h3 style="flex: 1; margin: 0">{{ t('hdr_panel_title') }}</h3>
      <button type="button" class="gh-btn gh-btn-icon" data-test="panel-settings" :title="t('hdr_settings_open')" :aria-label="t('hdr_settings_open')" @click="emit('open-settings')">⚙️</button>
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
    <section v-if="muscles" class="gh-panel-water" style="margin-top: 12px" data-test="panel-muscles">
      <h4>🏋️ {{ t('workouts_muscles_title') }}</h4>
      <MuscleMiniMap :done="muscles.done" :last="muscles.last" />
    </section>
  </aside>
</template>
