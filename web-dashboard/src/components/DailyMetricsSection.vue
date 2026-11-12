<script setup lang="ts">
import { pointsSummary } from '../lib/collapseSummaries'
import EmojiText from './EmojiText.vue'
import BooleanMetricRow from './BooleanMetricRow.vue'
import MultiselectMetric from './MultiselectMetric.vue'
import NumberMetricField from './NumberMetricField.vue'
import SetsSection from './SetsSection.vue'
import PlannedSection from './PlannedSection.vue'
import SectionHeading from './SectionHeading.vue'
import MetricsManagerSection from './MetricsManagerSection.vue'
import SavedTick from './SavedTick.vue'
import DateStepper from './DateStepper.vue'
import { vCollapse } from '../lib/collapseMotion'
import UsefulTodayList from './UsefulTodayList.vue'
import TodayRemaining from './TodayRemaining.vue'
import MetricQuickActions from './MetricQuickActions.vue'
import DayReflection from './DayReflection.vue'
import { useDayReflection } from '../lib/useDayReflection'
import { createLongPress, longPressBind } from '../lib/longPress'
import { quickActions, skipMetricDay, type QuickActionId } from '../lib/metricQuickActions'
import { remainingToday, PLAN_ROW_PREFIX } from '../lib/todayRemaining'
import { PLAN_SNAPSHOT, requestPlanMark, requestPlanSnapshot, type PlanSnapshot, type PlanSnapshotItem } from '../lib/planBridge'
import { useDailyMetrics } from '../lib/useDailyMetrics'
import { useMetricRecords } from '../lib/useMetricRecords'
import { isRemaining } from '../lib/daily'
import { addDaysIso, todayStr } from '../lib/date'
import { t } from '../lib/i18n'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { MetricStreakInfo } from '../lib/metricStreaks'
import type { Metric } from '../lib/types'

// Блок «Дневные метрики» (порт renderDay() из dashboard.js): листание дней, поля boolean/
// number/multiselect с автосохранением, «Подходы» и «Цели на сегодня» встроены сюда же с той
// же выбранной датой (оба сами по себе — SetsSection/PlannedSection, только получают date),
// «Что полезного сделал за день», «Сохранить день» и «Баллы за день». Пересчёт стриков/колец —
// не отсюда напрямую: composable шлёт notifyDataChanged(), useDashboard.ts сам слушает.
// Единственная точка подключения в App.vue (заменяет собой прежние отдельные
// <SetsSection>/<PlannedSection> без даты).
const date = ref(todayStr())
const {
  booleans, numbers, multiselects, pending, items, score, error, loaded, saving, flashed,
  load, setBoolean, setNote, setNumber, addToNumber, addLinkedReps, fixTotal, toggleOpt, addItem, removeItem, saveDay, notes,
} = useDailyMetrics()

const props = defineProps<{ userId: string | null; metricStreaks?: Record<string, MetricStreakInfo> }>()
// metricsChanged — после правки списка метрик (шестерёнка в заголовке) родитель перечитывает данные Дашборда
const emit = defineEmits<{ metricsChanged: [] }>()
// После добавления/правки/удаления метрики перечитываем СВОЙ список (BACKLOG 40: «новые метрики не появляются без обновления страницы»),
// даём «Подходам» сигнал перечитать свой, затем сообщаем родителю (общие данные Дашборда и графики).
const rev = ref(0)
async function onMetricsChanged() {
  rev.value++
  if (props.userId) {
    await load(props.userId, date.value)
    void initRecords(props.userId)
  }
  emit('metricsChanged')
}
// Рекорды числовых метрик и подходов за всё время (BACKLOG раздел 28) — под названием в плашке; выключаются в «Настроить Дашборд»
const { records: metricRecords, sparks: metricSparks, init: initRecords } = useMetricRecords()
watch(
  () => props.userId,
  (uid) => {
    if (uid) void initRecords(uid)
  },
  { immediate: true },
)
watch(
  () => [props.userId, date.value] as const,
  ([uid, d]) => {
    if (uid) load(uid, d)
  },
  { immediate: true },
)

// Оценка и заметка дня (BACKLOG 75.3, миграция 114): грузятся с днём, пишутся вместе с «Сохранить день»
const reflectError = ref(false)
const reflection = useDayReflection()
watch(
  () => [props.userId, date.value] as const,
  ([uid, d]) => {
    if (uid) void reflection.load(uid, d)
  },
  { immediate: true },
)
const savedMsg = ref(false)
async function onSaveDay() {
  const ok1 = await saveDay()
  const ok2 = props.userId ? await reflection.save(props.userId, date.value) : true
  const ok = ok1 && ok2
  if (!ok2) reflectError.value = true
  else reflectError.value = false
  if (ok) {
    savedMsg.value = true
    setTimeout(() => (savedMsg.value = false), 2000)
  }
}

const collapsed = ref(false)
// «Карточка со сводкой» (BACKLOG 498 срез 3): «Баллы N / M» — те же баллы за день, что внутри блока
const dailySummary = computed(() => pointsSummary(score.value.points, score.value.total))
const numberValue = (id: string) => pending.value[id] as number | undefined

// Быстрые действия на плашке (BACKLOG 75.9, срез 1): удержание / правый клик / Shift+F10 на плашке ИЛИ видимая кнопка ⋯ — открывают полосу
// действий под плашкой (одна открытая за раз). Жест — ускоритель, кнопка и клавиатура — полноценный путь.
const qaOpen = ref<string | null>(null)
const qaError = ref('')
const qaBusy = ref(false)
const allMetrics = computed(() => [...numbers.value, ...booleans.value, ...multiselects.value])
const metricById = (id: string) => allMetrics.value.find((m) => m.id === id)
function actionsOf(m: Metric): QuickActionId[] {
  const today = todayStr()
  return quickActions(m, { date: date.value, today, yesterday: addDaysIso(today, -1), value: pending.value[m.id] })
}
function openQa(m: Metric) {
  if (actionsOf(m).length === 0) return
  qaError.value = ''
  qaOpen.value = m.id
}
function closeQa(refocus = true) {
  const id = qaOpen.value
  qaOpen.value = null
  qaError.value = ''
  if (refocus && id) void nextTick(() => document.querySelector<HTMLElement>(`[data-qa-toggle="${CSS.escape(id)}"]`)?.focus())
}
const longPresses = new Map<string, ReturnType<typeof createLongPress>>()
function plateBind(m: Metric) {
  let lp = longPresses.get(m.id)
  if (!lp) {
    lp = createLongPress({ onTrigger: () => { const cur = metricById(m.id); if (cur) openQa(cur) } })
    longPresses.set(m.id, lp)
  }
  return longPressBind(lp)
}
onBeforeUnmount(() => longPresses.forEach((lp) => lp.cancel()))
const focusIn = (id: string, sel: string) => nextTick(() => document.querySelector<HTMLElement>(`[data-metric-id="${CSS.escape(id)}"] ${sel}`)?.focus())
async function onQaAct(m: Metric, a: QuickActionId) {
  if (a === 'skip') {
    if (qaBusy.value) return
    qaBusy.value = true
    qaError.value = ''
    const err = await skipMetricDay(m, date.value)
    qaBusy.value = false
    if (err) {
      qaError.value = err
      return
    }
    closeQa(false)
    await onMetricsChanged() // перечитать СВОЙ список (в нём теперь skipped_days) и сообщить родителю: серии, кольца, баллы
    return
  }
  closeQa(false)
  void focusIn(m.id, a === 'note' ? '[data-test="metric-note"]' : 'input:not([type=checkbox])')
}
// «Осталось на сегодня» (BACKLOG 75.2): метрики + свои пункты плана (срез 2). Только для сегодняшнего дня; булева и пункт плана закрываются
// тут же, числовая — переход к плашке. План читаем из снимка, который публикует PlannedSection (мост planBridge), — второй копии плана нет.
const planSnap = ref<PlanSnapshot | null>(null)
function onPlanSnapshot(e: Event) {
  planSnap.value = (e as CustomEvent<PlanSnapshot>).detail
}
onMounted(() => {
  window.addEventListener(PLAN_SNAPSHOT, onPlanSnapshot)
  requestPlanSnapshot()
})
onBeforeUnmount(() => window.removeEventListener(PLAN_SNAPSHOT, onPlanSnapshot))
const planItems = computed<PlanSnapshotItem[]>(() => (planSnap.value && planSnap.value.date === date.value ? planSnap.value.items : []))
const remainingRows = computed(() =>
  date.value === todayStr() ? remainingToday([...numbers.value, ...booleans.value, ...multiselects.value], pending.value, date.value, planItems.value) : [],
)
function onRemainingDone(id: string) {
  if (id.startsWith(PLAN_ROW_PREFIX)) {
    const it = planItems.value.find((x) => PLAN_ROW_PREFIX + x.index === id)
    if (it) requestPlanMark(date.value, it.index, it.text, !!it.goal)
    return
  }
  const m = booleans.value.find((x) => x.id === id)
  if (m) void setBoolean(m, true)
}
function onRemainingJump(id: string) {
  const el = document.querySelector(`[data-metric-id="${CSS.escape(id)}"]`)
  const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  el?.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'center' })
}
const selectedOf = (id: string) => (Array.isArray(pending.value[id]) ? (pending.value[id] as string[]) : [])
</script>

<template>
  <section class="mb-5">
    <SectionHeading v-model:collapsed="collapsed" :title="t('dash_daily_h2')" storage-key="daily" :summary="dailySummary">
      <!-- BACKLOG 38 (апд37): шестерёнка настроек метрик — справа от заголовка (раньше — отдельная кнопка «Метрики дня» над блоком);
           за ней — ручка перетаскивания блока, если родитель передал слот -->
      <template #actions>
        <span class="flex items-center gap-2">
          <MetricsManagerSection icon :user-id="userId" @changed="onMetricsChanged" />
          <slot name="actions" />
        </span>
      </template>
    </SectionHeading>

    <div v-collapse="!collapsed">
    <DateStepper v-model="date" />

    <div class="card">
      <p v-if="error" class="mb-2 text-sm" style="color: var(--danger)">{{ error }}</p>
      <p v-if="!loaded" class="dim text-sm">{{ t('loading_ellipsis') }}</p>

      <template v-else>
        <!-- Метрик нет совсем (пропустили онбординг или всё удалили): вместо пустой полосы — подсказка и кнопка «Метрики дня». -->
        <div v-if="allMetrics.length === 0" class="py-2 text-center" data-test="daily-empty">
          <p class="m-0 mb-1 text-3xl" aria-hidden="true">📊</p>
          <p class="m-0 mb-1 font-semibold">{{ t('dash_daily_empty_title') }}</p>
          <p class="dim m-0 mb-3 text-sm">{{ t('dash_daily_empty_hint') }}</p>
          <MetricsManagerSection :user-id="userId" @changed="onMetricsChanged" />
        </div>
        <TodayRemaining v-if="remainingRows.length > 0" :rows="remainingRows" @done="onRemainingDone" @jump="onRemainingJump" />

        <!-- BACKLOG 23 (13:25): каждый параметр — в своей мини-плашке, иначе несколько подряд сливаются в одну массу -->
        <div v-if="numbers.length > 0" class="field-grid">
          <div v-for="m in numbers" :key="date + m.id" class="metric-plate" :class="{ 'metric-plate-saved': !!flashed[m.id], 'qa-has': actionsOf(m).length > 0 }" v-bind="plateBind(m)" data-test="metric-plate">
            <button v-if="actionsOf(m).length > 0" type="button" class="qa-toggle secondary" :aria-label="t('qa_open') + ': ' + m.name" :aria-expanded="qaOpen === m.id" :data-qa-toggle="m.id" data-test="qa-toggle" @click="qaOpen === m.id ? closeQa() : openQa(m)">⋯</button>
            <SavedTick :show="!!flashed[m.id]" />
            <NumberMetricField
              :metric="m"
              :value="numberValue(m.id)"
              :flashed="!!flashed[m.id]"
              :remaining="isRemaining(m, date, pending[m.id])"
              :streak="props.metricStreaks?.[m.id]"
              :record="metricRecords[m.id]"
              :spark="metricSparks[m.id]"
              @set="setNumber(m, $event)"
              @add="addToNumber(m, $event)"
              @fix="fixTotal(m, $event)"
              @quick-add="addLinkedReps(m, $event)"
            />
            <MetricQuickActions v-if="qaOpen === m.id" :name="m.name" :actions="actionsOf(m)" :error="qaError" :busy="qaBusy" @act="onQaAct(m, $event)" @close="closeQa()" />
          </div>
        </div>

        <div v-for="m in booleans" :key="date + m.id" class="metric-plate metric-plate-stack" :class="{ 'metric-plate-saved': !!flashed[m.id], 'qa-has': actionsOf(m).length > 0 }" v-bind="plateBind(m)" data-test="metric-plate">
            <button v-if="actionsOf(m).length > 0" type="button" class="qa-toggle secondary" :aria-label="t('qa_open') + ': ' + m.name" :aria-expanded="qaOpen === m.id" :data-qa-toggle="m.id" data-test="qa-toggle" @click="qaOpen === m.id ? closeQa() : openQa(m)">⋯</button>
          <SavedTick :show="!!flashed[m.id]" />
          <BooleanMetricRow
            :metric="m"
            :checked="!!pending[m.id]"
            :remaining="isRemaining(m, date, pending[m.id])"
            :streak="props.metricStreaks?.[m.id]"
            :note="notes[m.id] ?? ''"
            @toggle="setBoolean(m, $event)"
            @note="setNote(m, $event)"
          />
          <MetricQuickActions v-if="qaOpen === m.id" :name="m.name" :actions="actionsOf(m)" :error="qaError" :busy="qaBusy" @act="onQaAct(m, $event)" @close="closeQa()" />
        </div>

        <div v-for="m in multiselects" :key="date + m.id" class="metric-plate metric-plate-stack" :class="{ 'metric-plate-saved': !!flashed[m.id], 'qa-has': actionsOf(m).length > 0 }" v-bind="plateBind(m)" data-test="metric-plate">
            <button v-if="actionsOf(m).length > 0" type="button" class="qa-toggle secondary" :aria-label="t('qa_open') + ': ' + m.name" :aria-expanded="qaOpen === m.id" :data-qa-toggle="m.id" data-test="qa-toggle" @click="qaOpen === m.id ? closeQa() : openQa(m)">⋯</button>
          <SavedTick :show="!!flashed[m.id]" />
          <MultiselectMetric
            :metric="m"
            :selected="selectedOf(m.id)"
            :remaining="isRemaining(m, date, pending[m.id])"
            :streak="props.metricStreaks?.[m.id]"
            @toggle="toggleOpt(m, $event)"
          />
          <MetricQuickActions v-if="qaOpen === m.id" :name="m.name" :actions="actionsOf(m)" :error="qaError" :busy="qaBusy" @act="onQaAct(m, $event)" @close="closeQa()" />
        </div>

      </template>
    </div>

    <div class="mt-4">
      <SetsSection :user-id="userId" :date="date" :metric-streaks="props.metricStreaks" :records="metricRecords" :sparks="metricSparks" :reload-key="rev" />
    </div>

    <!-- BACKLOG раздел 34: «Сохранить день» — в самом низу, после самой нижней метрики («Подходы»), а не посередине — так очевидно, что это
         последний шаг. Подходы пишутся своими кнопками сразу и на эту кнопку не влияют. Итог дня («Баллы») стоит рядом с ней. -->
    <DayReflection v-if="loaded && reflection.supported.value" v-model:mood="reflection.mood.value" v-model:note="reflection.note.value" />

    <div v-if="loaded" class="mt-4" data-test="save-day-bar">
      <div class="save-row">
        <button type="button" class="save-day-btn" :disabled="saving" data-test="save-day" @click="onSaveDay">{{ saving ? t('dash_saving_btn') : t('dash_save_day_btn') }}</button>
        <span class="score-pill"><EmojiText :text="t('dash_score_label')" /> <strong>{{ score.points }} / {{ score.total }}</strong></span>
      </div>
      <p v-if="savedMsg" class="m-0 mt-2 text-sm" style="color: var(--success)">{{ t('dash_day_saved_toast') }}</p>
      <p v-if="reflectError" class="m-0 mt-2 text-sm" style="color: var(--danger, #c0392b)" role="alert" data-test="reflect-error">{{ t('dash_reflect_error') }}</p>
    </div>

    <!-- BACKLOG 23:00: «Что полезного сделал за день» — свёрнутым по умолчанию и в самом низу блока ежедневных метрик.
         Пункты пишутся сразу при добавлении (persistItems), поэтому отдельно от кнопки «Сохранить день» это безопасно. -->
    <UsefulTodayList v-if="loaded" :items="items" @add="addItem" @remove="removeItem" />
    </div>
    <PlannedSection v-model:date="date" :user-id="userId" switchable />
  </section>
</template>

<style scoped>
/* «Сохранить день» (58.6): крупная акцентная кнопка с мягкой тенью вместо плоской; итог дня — таблеткой рядом, на телефоне кнопка во всю ширину */
.save-row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 12px; }
.save-day-btn { flex: 1 1 12rem; min-height: 46px; padding: 0 22px; border: 0; border-radius: 14px; font-weight: 600; font-size: 1rem; letter-spacing: 0.01em; box-shadow: 0 6px 16px color-mix(in srgb, var(--accent) 32%, transparent); transition: transform 0.12s, box-shadow 0.12s; }
.save-day-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 20px color-mix(in srgb, var(--accent) 40%, transparent); }
.save-day-btn:active:not(:disabled) { transform: translateY(0); box-shadow: 0 3px 8px color-mix(in srgb, var(--accent) 30%, transparent); }
.score-pill :deep(.icon) { margin-inline-end: 0.15em; }
.score-pill { display: inline-flex; align-items: center; gap: 6px; min-height: 46px; padding: 0 16px; border: 1px solid color-mix(in srgb, var(--text) 14%, var(--border)); border-radius: 14px; background: color-mix(in srgb, var(--text) 5%, var(--bg-card)); white-space: nowrap; }
@media (prefers-reduced-motion: reduce) { .save-day-btn { transition: none; } }
/* Подложка у вложенных карточек (BACKLOG 16, 13:18): «Подходы» — это .card внутри внешнего .card блока,
   с тем же фоном, и сливались с ним. Вложенная карточка чуть темнее/светлее фона блока (смесь с цветом
   текста темы — читается и на светлых, и на тёмных темах) + собственная рамка и скругление. */
.card :deep(.card) {
  background: color-mix(in srgb, var(--text) 5%, var(--bg-card));
  border: 1px solid color-mix(in srgb, var(--text) 14%, var(--border));
  border-radius: 10px;
  padding: 12px 14px;
}
.field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
  margin-bottom: 10px;
}
/* Мини-плашка параметра (BACKLOG 23, 13:25): чуть другой оттенок, чем у блока, своя тонкая рамка и скругление — параметры не
   сливаются; смесь с цветом текста темы читается и на светлых, и на тёмных темах (слабее, чем у вложенной карточки «Подходы»).
   Плашка — на обёртке, а не на корне компонента: у булевых/мультивыбора свой .metric-remaining с padding-left и акцентной полоской. */
.metric-plate {
  position: relative; /* для галочки «сохранено» в углу (SavedTick) */
  min-width: 0;
  padding: 10px 12px;
  background: color-mix(in srgb, var(--text) 4%, var(--bg-card));
  border: 1px solid color-mix(in srgb, var(--text) 11%, var(--border));
  border-radius: 10px;
}
.metric-plate-stack {
  margin-bottom: 8px;
}
/* Быстрые действия (BACKLOG 75.9): видимая кнопка ⋯ в углу плашки — путь без жеста (удержание на плашке открывает то же самое) */
.qa-has { padding-right: 40px; }
.qa-toggle { position: absolute; top: 4px; right: 4px; padding: 0; border: 0; background: transparent; color: var(--text-dim); font-weight: 700; line-height: 1; cursor: pointer; }
.qa-toggle:hover, .qa-toggle:focus-visible, .qa-toggle[aria-expanded='true'] { color: var(--accent); }
/* BACKLOG 23:25: после подтверждённой записи плашка коротко вспыхивает мягкой зелёной рамкой (вместе с галочкой в углу) */
.metric-plate-saved {
  animation: metric-plate-saved 0.9s ease-out;
}
@keyframes metric-plate-saved {
  0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--success) 55%, transparent); border-color: var(--success); }
  60% { box-shadow: 0 0 0 5px color-mix(in srgb, var(--success) 0%, transparent); border-color: var(--success); }
  100% { box-shadow: 0 0 0 0 transparent; }
}
@media (prefers-reduced-motion: reduce) {
  .metric-plate-saved { animation: none; border-color: var(--success); }
}
:global(html[data-motion='off']) .metric-plate-saved { animation: none; border-color: var(--success); }
/* у вложенных компонентов свои нижние отступы (для списка без плашек) — внутри плашки они лишние */
.metric-plate :deep(.row),
.metric-plate :deep(.wrap) {
  margin-bottom: 0;
}
</style>
