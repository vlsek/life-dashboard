<script setup lang="ts">
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
import { useDailyMetrics } from '../lib/useDailyMetrics'
import { useMetricRecords } from '../lib/useMetricRecords'
import { isRemaining } from '../lib/daily'
import { todayStr } from '../lib/date'
import { t } from '../lib/i18n'
import { ref, watch } from 'vue'
import type { MetricStreakInfo } from '../lib/metricStreaks'
import { stripEmoji } from '../lib/emojiText'

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
  load, setBoolean, setNumber, addToNumber, fixTotal, toggleOpt, addItem, removeItem, saveDay,
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
const { records: metricRecords, init: initRecords } = useMetricRecords()
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

const savedMsg = ref(false)
async function onSaveDay() {
  const ok = await saveDay()
  if (ok) {
    savedMsg.value = true
    setTimeout(() => (savedMsg.value = false), 2000)
  }
}

const collapsed = ref(false)
const numberValue = (id: string) => pending.value[id] as number | undefined
const selectedOf = (id: string) => (Array.isArray(pending.value[id]) ? (pending.value[id] as string[]) : [])
</script>

<template>
  <section class="mb-5">
    <SectionHeading v-model:collapsed="collapsed" :title="stripEmoji(t('dash_daily_h2'))" storage-key="daily">
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
        <!-- BACKLOG 23 (13:25): каждый параметр — в своей мини-плашке, иначе несколько подряд сливаются в одну массу -->
        <div v-if="numbers.length > 0" class="field-grid">
          <div v-for="m in numbers" :key="date + m.id" class="metric-plate" :class="{ 'metric-plate-saved': !!flashed[m.id] }" data-test="metric-plate">
            <SavedTick :show="!!flashed[m.id]" />
            <NumberMetricField
              :metric="m"
              :value="numberValue(m.id)"
              :flashed="!!flashed[m.id]"
              :remaining="isRemaining(m, date, pending[m.id])"
              :streak="props.metricStreaks?.[m.id]"
              :record="metricRecords[m.id]"
              @set="setNumber(m, $event)"
              @add="addToNumber(m, $event)"
              @fix="fixTotal(m, $event)"
            />
          </div>
        </div>

        <div v-for="m in booleans" :key="date + m.id" class="metric-plate metric-plate-stack" :class="{ 'metric-plate-saved': !!flashed[m.id] }" data-test="metric-plate">
          <SavedTick :show="!!flashed[m.id]" />
          <BooleanMetricRow
            :metric="m"
            :checked="!!pending[m.id]"
            :remaining="isRemaining(m, date, pending[m.id])"
            :streak="props.metricStreaks?.[m.id]"
            @toggle="setBoolean(m, $event)"
          />
        </div>

        <div v-for="m in multiselects" :key="date + m.id" class="metric-plate metric-plate-stack" :class="{ 'metric-plate-saved': !!flashed[m.id] }" data-test="metric-plate">
          <SavedTick :show="!!flashed[m.id]" />
          <MultiselectMetric
            :metric="m"
            :selected="selectedOf(m.id)"
            :remaining="isRemaining(m, date, pending[m.id])"
            :streak="props.metricStreaks?.[m.id]"
            @toggle="toggleOpt(m, $event)"
          />
        </div>

      </template>
    </div>

    <div class="mt-4">
      <SetsSection :user-id="userId" :date="date" :metric-streaks="props.metricStreaks" :records="metricRecords" :reload-key="rev" />
    </div>

    <!-- BACKLOG раздел 34: «Сохранить день» — в самом низу, после самой нижней метрики («Подходы»), а не посередине — так очевидно, что это
         последний шаг. Подходы пишутся своими кнопками сразу и на эту кнопку не влияют. Итог дня («Баллы») стоит рядом с ней. -->
    <div v-if="loaded" class="mt-4" data-test="save-day-bar">
      <div class="flex items-center gap-3">
        <button type="button" :disabled="saving" data-test="save-day" @click="onSaveDay">{{ saving ? t('dash_saving_btn') : t('dash_save_day_btn') }}</button>
        <span v-if="savedMsg" class="text-sm" style="color: var(--success)">{{ t('dash_day_saved_toast') }}</span>
      </div>

      <div class="mt-3 rounded-lg border p-3" style="border-color: var(--border)">
        <strong><EmojiText :text="t('dash_score_label')" /> {{ score.points }} / {{ score.total }}</strong>
      </div>
    </div>

    <!-- BACKLOG 23:00: «Что полезного сделал за день» — свёрнутым по умолчанию и в самом низу блока ежедневных метрик.
         Пункты пишутся сразу при добавлении (persistItems), поэтому отдельно от кнопки «Сохранить день» это безопасно. -->
    <UsefulTodayList v-if="loaded" :items="items" @add="addItem" @remove="removeItem" />
    </div>
    <PlannedSection v-model:date="date" :user-id="userId" switchable />
  </section>
</template>

<style scoped>
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
