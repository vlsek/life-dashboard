<script setup lang="ts">
import BooleanMetricRow from './BooleanMetricRow.vue'
import MultiselectMetric from './MultiselectMetric.vue'
import NumberMetricField from './NumberMetricField.vue'
import SetsSection from './SetsSection.vue'
import PlannedSection from './PlannedSection.vue'
import SectionHeading from './SectionHeading.vue'
import { vCollapse } from '../lib/collapseMotion'
import UsefulTodayList from './UsefulTodayList.vue'
import { useDailyMetrics } from '../lib/useDailyMetrics'
import { dayLabel, isRemaining, shiftDate } from '../lib/daily'
import { todayStr } from '../lib/date'
import { getLang, t } from '../lib/i18n'
import { ref, watch } from 'vue'

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

const props = defineProps<{ userId: string | null }>()
watch(
  () => [props.userId, date.value] as const,
  ([uid, d]) => {
    if (uid) load(uid, d)
  },
  { immediate: true },
)

function go(delta: number) {
  date.value = shiftDate(date.value, delta)
}

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
    <SectionHeading v-model:collapsed="collapsed" :title="t('dash_daily_h2')" storage-key="daily" />

    <div v-collapse="!collapsed">
    <div class="day-nav">
      <button type="button" class="secondary" @click="go(-1)">{{ t('prev_day') }}</button>
      <strong>{{ dayLabel(date, getLang()) }}</strong>
      <button type="button" class="secondary" :disabled="date === todayStr()" @click="date = todayStr()">{{ t('today_btn') }}</button>
      <button type="button" class="secondary" @click="go(1)">{{ t('next_day') }}</button>
    </div>

    <div class="card">
      <p v-if="error" class="mb-2 text-sm" style="color: var(--danger)">{{ error }}</p>
      <p v-if="!loaded" class="dim text-sm">{{ t('loading_ellipsis') }}</p>

      <template v-else>
        <div v-if="numbers.length > 0" class="field-grid">
          <NumberMetricField
            v-for="m in numbers"
            :key="date + m.id"
            :metric="m"
            :value="numberValue(m.id)"
            :flashed="!!flashed[m.id]"
            :remaining="isRemaining(m, date, pending[m.id])"
            @set="setNumber(m, $event)"
            @add="addToNumber(m, $event)"
            @fix="fixTotal(m, $event)"
          />
        </div>

        <BooleanMetricRow
          v-for="m in booleans"
          :key="date + m.id"
          :metric="m"
          :checked="!!pending[m.id]"
          :remaining="isRemaining(m, date, pending[m.id])"
          @toggle="setBoolean(m, $event)"
        />

        <MultiselectMetric
          v-for="m in multiselects"
          :key="date + m.id"
          :metric="m"
          :selected="selectedOf(m.id)"
          :remaining="isRemaining(m, date, pending[m.id])"
          @toggle="toggleOpt(m, $event)"
        />

        <UsefulTodayList :items="items" @add="addItem" @remove="removeItem" />

        <div class="flex items-center gap-3">
          <button type="button" :disabled="saving" @click="onSaveDay">{{ saving ? t('dash_saving_btn') : t('dash_save_day_btn') }}</button>
          <span v-if="savedMsg" class="text-sm" style="color: var(--success)">{{ t('dash_day_saved_toast') }}</span>
        </div>

        <div class="mt-3 rounded-lg border p-3" style="border-color: var(--border)">
          <strong>{{ t('dash_score_label') }} {{ score.points }} / {{ score.total }}</strong>
        </div>
      </template>
    </div>

    <div class="mt-4">
      <SetsSection :user-id="userId" :date="date" />
    </div>
    </div>
    <PlannedSection :user-id="userId" :date="date" />
  </section>
</template>

<style scoped>
.day-nav {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
}
.day-nav strong { margin-right: auto; }
.field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}
</style>
