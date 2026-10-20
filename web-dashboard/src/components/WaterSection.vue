<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import WaterModal from './WaterModal.vue'
import GlassSvg from './GlassSvg.vue'
import { useWater } from '../lib/useWater'
import { getLang, t } from '../lib/i18n'
import { onWaterAddRequest } from '../lib/waterQuickAdd'
import { todayStr } from '../lib/date'

// Единственная точка подключения блока «Вода» в App.vue — сама сеть спрятана здесь, чтобы у
// App.vue было минимум изменений при параллельном переносе других блоков дашборда (см.
// ROADMAP.md). Портировано из renderWaterBadge() в dashboard.js: значок стакана — иконка в
// шапке (#topbar-right через Teleport, как HeaderProgressBadge.vue), а не отдельный блок в теле
// страницы с текстовой подписью — так было на пилоте раньше и расходилось с ванильным сайтом.
const props = defineProps<{ userId: string | null }>()

const { metric, normMl, autoNormMl, weightKg, heightCm, saveHeight, todayMl, loaded, error, saveError, init, addMl, setTotal, undoLast, removeLogEntry, canUndo, dayLog, loadDayLog, getMlForDate, saveGoal, resetGoalToAuto, createWaterMetric } = useWater()

watch(
  () => props.userId,
  (uid) => {
    if (uid) init(uid)
  },
  { immediate: true },
)

// цель Teleport должна уже быть в DOM — включаем бейдж после монтирования (как в HeaderProgressBadge)
const ready = ref(false)
onMounted(() => (ready.value = !!document.getElementById('topbar-right')))

const modalOpen = ref(false)

async function onSetupClick() {
  await createWaterMetric()
  modalOpen.value = true
}

// Анимация «записалось» — только после подтверждённой записи в БД (addMl вернул значение, а не null)
const savedTick = ref(0)
const goalSavedTick = ref(0)
const goalSavedMsg = ref<'manual' | 'auto' | 'height'>('manual')
async function onAdd(ml: number, dateStr: string, drankAt?: number) {
  if ((await addMl(ml, dateStr, drankAt)) !== null) savedTick.value++
}
// Быстрое добавление из напоминания о воде (BACKLOG 67.1): плашка шлёт событие, запись — обычным путём (стакан, баллы, «Отменить», офлайн-очередь)
let offQuickAdd: (() => void) | null = null
onMounted(() => { offQuickAdd = onWaterAddRequest((ml) => { void onAdd(ml, todayStr()) }) })
onBeforeUnmount(() => offQuickAdd?.())
// Отмена последнего добавления и правка суммы за день (BACKLOG 12): та же «записалось»-анимация после подтверждённой записи
async function onUndo(dateStr: string) {
  const v = await undoLast(dateStr)
  if (v !== null) savedTick.value++
  return v
}
// «Крестик» у записи журнала (BACKLOG 23:17): та же «записалось»-анимация после подтверждённой записи
async function onRemoveEntry(dateStr: string, id: string) {
  const v = await removeLogEntry(dateStr, id)
  if (v !== null) savedTick.value++
  return v
}
async function onSetTotal(ml: number, dateStr: string) {
  const v = await setTotal(ml, dateStr)
  if (v !== null) savedTick.value++
  return v
}
async function onSaveGoal(ml: number) {
  if (await saveGoal(ml)) {
    goalSavedMsg.value = 'manual'
    goalSavedTick.value++
  }
}
async function onSaveHeight(cm: number) {
  if (await saveHeight(cm)) {
    goalSavedMsg.value = 'height'
    goalSavedTick.value++
  }
}
async function onResetGoal() {
  if (await resetGoalToAuto()) {
    goalSavedMsg.value = 'auto'
    goalSavedTick.value++
  }
}

const unitLabel = computed(() => (getLang() === 'en' ? 'ml' : 'мл'))
const GLASS_OUTLINE = 'M4.6 5.3h14.8l-1.5 17.8q-.25 3.2-3.4 3.2h-5q-3.15 0-3.4-3.2L4.6 5.3z'
</script>

<template>
  <Teleport v-if="ready && loaded && !error" to="#topbar-right">
    <button
      v-if="!metric"
      type="button"
      data-test="water-setup-btn"
      class="relative shrink-0 p-0"
      style="background: transparent; border: none; width: 32px; height: 32px; min-height: 0; display: flex; align-items: center; justify-content: center"
      :title="t('dash_water_setup_prompt')"
      @click="onSetupClick"
    >
      <svg width="20" height="20" viewBox="0 0 24 30" aria-hidden="true">
        <path :d="GLASS_OUTLINE" fill="none" style="stroke: var(--water-line)" stroke-width="1.6" stroke-linejoin="round" />
        <ellipse cx="12" cy="5.3" rx="7.4" ry="1.25" fill="none" style="stroke: var(--water-line)" stroke-width="1.4" />
      </svg>
    </button>

    <button
      v-else
      type="button"
      data-test="water-badge"
      class="relative shrink-0 p-0"
      style="background: transparent; border: none; width: 32px; height: 32px; min-height: 0; display: flex; align-items: center; justify-content: center"
      :title="`${todayMl} / ${normMl} ${unitLabel}`"
      @click="modalOpen = true"
    >
      <GlassSvg :today-ml="todayMl" :norm-ml="normMl" :width="24" :height="30" base-class="water-glass" full-class="water-glass-full" sheen-class="glass-sheen" />
    </button>
  </Teleport>

  <WaterModal
    v-if="modalOpen && metric"
    :metric="metric"
    :current-ml="todayMl"
    :norm-ml="normMl"
    :auto-norm-ml="autoNormMl"
    :weight-kg="weightKg"
    :get-ml-for-date="getMlForDate"
    :saved-tick="savedTick"
    :goal-saved-tick="goalSavedTick"
    :save-error="saveError"
    :can-undo="canUndo"
    :undo-last="onUndo"
    :remove-entry="onRemoveEntry"
    :set-total="onSetTotal"
    :day-log="dayLog"
    :load-day-log="loadDayLog"
    @close="modalOpen = false"
    @add="onAdd"
    :goal-saved-msg="goalSavedMsg"
    :height-cm="heightCm"
    @save-height="onSaveHeight"
    @save-goal="onSaveGoal"
    @reset-goal="onResetGoal"
  />
</template>
