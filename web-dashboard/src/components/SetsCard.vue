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
import SavedTick from './SavedTick.vue'
import { vCollapse } from '../lib/collapseMotion'
import { t } from '../lib/i18n'
import { parseQuickReps } from '../lib/linkedSets'
import { newSet, parseReps, parseTime, parseVariation, removeSet, setsSummary, updateSet, variationLabels } from '../lib/setsBlock'
import type { SetRow } from '../lib/setsBlock'
import type { Metric } from '../lib/types'

// Портировано из renderSetsMetric() в dashboard.js. Презентационный компонент: сам ничего не
// сохраняет, а на каждую правку отдаёт новый список подходов через change (родитель пишет в БД).
// saved — подходы только что записаны (подтверждённая запись): вспышка рамки карточки и галочка рядом с кнопкой сворачивания (BACKLOG 780/815)
const props = defineProps<{ metric: Metric; sets: SetRow[]; streak?: MetricStreakInfo | null; record?: RecordInfo | null; saved?: boolean }>()
const emit = defineEmits<{
  change: [sets: SetRow[]]
  remember: [text: string]
  forget: [label: string]
  quickAdd: [reps: number]
}>()

// если за день уже что-то есть — сразу развёрнуто, иначе свёрнуто
// Метрика ведётся из упражнения «Тренировок» (миграция 054): здесь только чтение, подходы вводятся один раз — в «Тренировках»
const linked = computed(() => !!props.metric.source_exercise_id)
const open = ref(props.sets.length > 0)
const summary = computed(() => setsSummary(props.sets))
const labels = computed(() => variationLabels(props.metric))

// Быстрый ввод для связанной метрики (BACKLOG 44.5а «насквозь»): подход уходит в «Тренировки», метрика пересчитывается оттуда
const quickReps = ref('')
const quickValid = computed(() => parseQuickReps(quickReps.value) !== null)
function quickAdd() {
  const n = parseQuickReps(quickReps.value)
  if (n === null) return
  emit('quickAdd', n)
  quickReps.value = ''
}

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
  <div class="card relative mb-3.5" :class="{ 'sets-saved': saved }" :data-metric-id="metric.id">
    <SavedTick :show="!!saved" class="sets-tick" />
    <div class="flex items-center gap-2">
      <strong><MetricIcon :icon="metric.icon" /> {{ metric.name }}</strong><MetricStreakBadge v-if="streak" :info="streak" />
      <button type="button" class="secondary ml-auto" style="padding: 4px 8px; line-height: 0" :aria-expanded="open" :title="open ? t('dash_collapse_btn') : t('dash_expand_btn')" data-test="sets-toggle" @click="open = !open"><CollapseChevron :collapsed="!open" /></button>
    </div>

    <div class="dim mt-1 text-sm">
      <template v-if="summary">{{ summary.count }} {{ t('dash_sets_word') }} · {{ summary.reps }} {{ t('dash_sets_reps_word') }}</template>
      <template v-else>{{ t('dash_sets_empty') }}</template>
    </div>
    <RecordBadge v-if="record" kind="metrics" :record="record" :unit="' ' + t('dash_sets_reps_word')" class="mt-0.5" />

    <div v-if="linked" v-collapse="open" class="mt-2" data-test="sets-linked">
      <div v-if="sets.length > 0" class="overflow-x-auto">
        <table class="sets-table w-full text-sm" data-test="sets-table-readonly">
          <tbody>
            <tr v-for="(s, i) in sets" :key="i" class="align-middle" data-test="set-row-readonly">
              <td class="dim pl-2 pr-1">{{ i + 1 }}</td>
              <td class="set-plate"><span class="dim">{{ s.time ?? '—' }}</span></td>
              <td class="set-plate"><strong>{{ s.reps ?? '—' }}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="mt-2 flex items-center gap-2" data-test="sets-quick">
        <input
          v-model="quickReps"
          type="number"
          step="any"
          min="0"
          inputmode="decimal"
          :placeholder="t('dash_linked_quick_placeholder')"
          style="width: 90px"
          data-test="sets-quick-reps"
          @keydown.enter.prevent="quickAdd"
        />
        <button type="button" :disabled="!quickValid" data-test="sets-quick-add" @click="quickAdd">{{ t('dash_linked_quick_add') }}</button>
      </div>
      <p class="dim mt-1 text-sm" data-test="sets-linked-hint">
        {{ t('dash_metric_linked_hint') }}
        <a href="/workouts/" class="underline" data-test="sets-linked-open">{{ t('dash_metric_linked_open') }}</a>
      </p>
    </div>
    <div v-else v-collapse="open" class="mt-2">
      <div v-if="sets.length > 0" class="overflow-x-auto">
        <table class="sets-table w-full text-sm" data-test="sets-table">
          <tbody>
            <tr v-for="(s, i) in sets" :key="i" class="align-middle" data-test="set-row">
              <td class="dim pl-2 pr-1">{{ i + 1 }}</td>
              <td class="set-plate" data-test="set-plate-time">
                <input type="time" :value="s.time ?? ''" :title="t('sets_time_title')" style="width: 96px" @change="onTime(i, $event)" />
              </td>
              <td class="set-plate" data-test="set-plate-reps">
                <input type="number" step="any" :value="s.reps ?? ''" :placeholder="t('dash_sets_reps_placeholder')" style="width: 70px" @change="onReps(i, $event)" />
              </td>
              <td class="set-plate" data-test="set-plate-variation">
                <VariationCombo :model-value="s.variation" :labels="labels" @commit="onVariation(i, $event)" @forget="emit('forget', $event)" />
              </td>
              <td>
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

<style scoped>
/* галочка — левее кнопки сворачивания, чтобы не закрывать её */
.card .sets-tick { top: 14px; right: 52px; }
.sets-saved { animation: sets-saved 0.9s ease-out; }
@keyframes sets-saved {
  0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--success) 55%, transparent); border-color: var(--success); }
  60% { box-shadow: 0 0 0 5px color-mix(in srgb, var(--success) 0%, transparent); border-color: var(--success); }
  100% { box-shadow: 0 0 0 0 transparent; }
}
@media (prefers-reduced-motion: reduce) {
  .sets-saved { animation: none; border-color: var(--success); }
}
:global(html[data-motion='off']) .sets-saved { animation: none; border-color: var(--success); }
</style>
