<script setup lang="ts">
import EmojiText from './EmojiText.vue'
import { computed, reactive, ref } from 'vue'
import PeriodPicker from './PeriodPicker.vue'
import Icon from './Icon.vue'
import MetricIcon from './MetricIcon.vue'
import { t } from '../lib/i18n'
import { addableKeys, moveEntry, removeEntry, type ChartEntry, type ChartSeries } from '../lib/chartSeries'
import type { PeriodState } from '../lib/chart'

// Портировано из openChartsConfigModal() в dashboard.js: общий период, список выбранных графиков
// (цель-ориентир, порядок, удаление), добавление нового. Ничего не пишет сам — эмитит результат.
const props = defineProps<{ series: Record<string, ChartSeries>; entries: ChartEntry[]; period: PeriodState; error?: string | null }>()
const emit = defineEmits<{ close: []; save: [entries: ChartEntry[], period: PeriodState] }>()

const order = ref<ChartEntry[]>(props.entries.map((e) => ({ ...e })))
const localPeriod = reactive<PeriodState>({ ...props.period })
const toAdd = ref('')
const addable = computed(() => addableKeys(props.series, order.value))

function setGoal(entry: ChartEntry, raw: string) {
  entry.goal = raw === '' ? null : parseFloat(raw) || 0
}
function add() {
  const key = toAdd.value || addable.value[0]
  if (key && !order.value.some((e) => e.key === key)) order.value.push({ key, goal: null })
  toAdd.value = ''
}
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal">
      <h3><EmojiText :text="t('dash_charts_config_title')" /></h3>
      <p class="dim text-sm">{{ t('dash_charts_config_hint') }}</p>

      <div class="dim mt-3 mb-1 text-sm">{{ t('dash_charts_period_label') }}</div>
      <PeriodPicker :state="localPeriod" @change="Object.assign(localPeriod, $event)" />

      <hr class="my-3" style="border: none; border-top: 1px solid var(--border)" />
      <p class="dim mb-2 text-xs">{{ t('dash_charts_goal_hint') }}</p>

      <div v-for="(entry, i) in order" :key="entry.key" class="flex flex-wrap items-center gap-1.5 py-1" data-test="entry">
        <span class="min-w-28 flex-1"><MetricIcon v-if="series[entry.key]?.icon" :icon="series[entry.key].icon" extra-style="margin-right:0.35em;" />{{ series[entry.key]?.name ?? series[entry.key]?.label ?? entry.key }}</span>
        <input
          type="number"
          step="any"
          class="w-[4.5rem]"
          :placeholder="series[entry.key]?.defaultGoal != null ? String(series[entry.key].defaultGoal) : t('dash_charts_goal_placeholder')"
          :title="t('dash_charts_goal_field')"
          :value="entry.goal ?? ''"
          @change="setGoal(entry, ($event.target as HTMLInputElement).value)"
        />
        <button type="button" class="secondary px-2" data-test="up" @click="order = moveEntry(order, i, -1)">↑</button>
        <button type="button" class="secondary px-2" data-test="down" @click="order = moveEntry(order, i, 1)">↓</button>
        <button type="button" class="danger px-2" data-test="remove" @click="order = removeEntry(order, entry.key)"><Icon name="x" /></button>
      </div>

      <template v-if="addable.length">
        <label class="mt-3 block text-sm">{{ t('dash_charts_add_label') }}</label>
        <select v-model="toAdd" class="w-full" data-test="add-select">
          <option v-for="k in addable" :key="k" :value="k">{{ series[k].label }}</option>
        </select>
        <button type="button" class="secondary mt-2" data-test="add" @click="add">{{ t('add_btn') }}</button>
      </template>

      <p v-if="props.error" class="mt-2 text-sm whitespace-pre-line" style="color: var(--danger)">{{ props.error }}</p>
      <div class="modal-actions">
        <button type="button" class="secondary" @click="emit('close')">{{ t('cancel') }}</button>
        <button type="button" data-test="save" @click="emit('save', order, { ...localPeriod })">{{ t('save') }}</button>
      </div>
    </div>
  </div>
</template>
