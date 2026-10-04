<script setup lang="ts">
import EmojiText from './EmojiText.vue'
import { computed, ref } from 'vue'
import VariationCombo from './VariationCombo.vue'
import MetricIcon from './MetricIcon.vue'
import Icon from './Icon.vue'
import MetricStreakBadge from './MetricStreakBadge.vue'
import type { MetricStreakInfo } from '../lib/metricStreaks'
import RecordBadge from './RecordBadge.vue'
import type { RecordInfo } from '../lib/records'
import CollapseChevron from './CollapseChevron.vue'
import { vCollapse } from '../lib/collapseMotion'
import { t } from '../lib/i18n'
import { newSet, parseReps, parseTime, parseVariation, removeSet, setsSummary, updateSet, variationLabels } from '../lib/setsBlock'
import type { SetRow } from '../lib/setsBlock'
import type { Metric } from '../lib/types'

// Портировано из renderSetsMetric() в dashboard.js. Презентационный компонент: сам ничего не
// сохраняет, а на каждую правку отдаёт новый список подходов через change (родитель пишет в БД).
const props = defineProps<{ metric: Metric; sets: SetRow[]; streak?: MetricStreakInfo | null; record?: RecordInfo | null }>()
const emit = defineEmits<{
  change: [sets: SetRow[]]
  remember: [text: string]
  forget: [label: string]
}>()

// если за день уже что-то есть — сразу развёрнуто, иначе свёрнуто
const open = ref(props.sets.length > 0)
const summary = computed(() => setsSummary(props.sets))
const labels = computed(() => variationLabels(props.metric))

function add() {
  open.value = true
  emit('change', [...props.sets, newSet()])
}
function onReps(i: number, e: Event) {
  emit('change', updateSet(props.sets, i, { reps: parseReps((e.target as HTMLInputElement).value) }))
}
function onTime(i: number, e: Event) {
  emit('change', updateSet(props.sets, i, { time: parseTime((e.target as HTMLInputElement).value) }))
}
function onVariation(i: number, text: string) {
  emit('change', updateSet(props.sets, i, { variation: parseVariation(text) }))
  emit('remember', text)
}
</script>

<template>
  <div class="card mb-3.5" :data-metric-id="metric.id">
    <div class="flex items-center gap-2">
      <strong><MetricIcon :icon="metric.icon" /> {{ metric.name }}</strong><MetricStreakBadge v-if="streak" :info="streak" />
      <button type="button" class="secondary ml-auto" style="padding: 4px 8px; line-height: 0" :aria-expanded="open" :title="open ? t('dash_collapse_btn') : t('dash_expand_btn')" data-test="sets-toggle" @click="open = !open"><CollapseChevron :collapsed="!open" /></button>
    </div>

    <div class="dim mt-1 text-sm">
      <template v-if="summary">{{ summary.count }} {{ t('dash_sets_word') }} · {{ summary.reps }} {{ t('dash_sets_reps_word') }}</template>
      <template v-else>{{ t('dash_sets_empty') }}</template>
    </div>
    <RecordBadge v-if="record" kind="metrics" :record="record" :unit="' ' + t('dash_sets_reps_word')" class="mt-0.5" />

    <div v-collapse="open" class="mt-2">
      <div v-if="sets.length > 0" class="overflow-x-auto">
        <table class="sets-table w-full text-sm" data-test="sets-table">
          <tbody>
            <tr v-for="(s, i) in sets" :key="i" class="align-middle" data-test="set-row">
              <td class="py-1 pr-2">{{ i + 1 }}</td>
              <td class="py-1 pr-2">
                <input type="time" :value="s.time ?? ''" :title="t('sets_time_title')" style="width: 96px" @change="onTime(i, $event)" />
              </td>
              <td class="py-1 pr-2">
                <input type="number" step="any" :value="s.reps ?? ''" :placeholder="t('dash_sets_reps_placeholder')" style="width: 70px" @change="onReps(i, $event)" />
              </td>
              <td class="py-1 pr-2">
                <VariationCombo :model-value="s.variation" :labels="labels" @commit="onVariation(i, $event)" @forget="emit('forget', $event)" />
              </td>
              <td class="py-1">
                <button type="button" class="danger" style="padding: 2px 8px" @click="emit('change', removeSet(sets, i))"><Icon name="x" /></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <button type="button" class="secondary" @click="add"><EmojiText :text="t('dash_sets_add_btn')" /></button>
    </div>
  </div>
</template>
