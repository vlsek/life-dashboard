<script setup lang="ts">
import { computed, ref } from 'vue'
import { t } from '../lib/i18n'
import { BARS, DEFAULT_PLATES, formatPlates, parsePlates, plateSystem, platesPerSide, readPlates, writePlates } from '../lib/plates'

// Калькулятор блинов (BACKLOG 69.15, срез 1): целевой вес → блины на каждую сторону. Набор блинов — свой, помнится на устройстве.
const props = defineProps<{ unit: string; initial?: number | null }>()
const emit = defineEmits<{ close: [] }>()
const system = computed(() => plateSystem(props.unit))
const unitLabel = computed(() => (system.value === 'lb' ? 'lb' : t('workouts_default_unit')))
const target = ref(props.initial && props.initial > 0 ? String(props.initial) : '') // из активной тренировки — сразу рабочий вес упражнения
const bar = ref(BARS[system.value][0])
const plates = ref(readPlates(system.value))
const platesText = ref(formatPlates(plates.value))
const num = (v: number) => String(Math.round(v * 100) / 100).replace('.', ',')
const result = computed(() => platesPerSide(Number(String(target.value).replace(',', '.')), bar.value, plates.value))
const hasTarget = computed(() => Number(String(target.value).replace(',', '.')) > 0)
function onPlates() {
  const list = parsePlates(platesText.value)
  if (!list) return // пустое или негодное — оставляем прежний набор, текст не трогаем, пока человек печатает
  plates.value = list
  writePlates(system.value, list)
}
function resetPlates() {
  plates.value = [...DEFAULT_PLATES[system.value]]
  platesText.value = formatPlates(plates.value)
  writePlates(system.value, plates.value)
}
</script>

<template>
  <div class="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" style="background: rgba(0, 0, 0, 0.6)" data-testid="plates-modal" @click.self="emit('close')">
    <div class="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border p-5 sm:rounded-2xl" style="background: var(--bg-card); border-color: var(--border); color: var(--text)" role="dialog" aria-modal="true">
      <h2 class="mb-3 text-lg font-bold">{{ t('plates_title') }}</h2>
      <label class="mb-1 block text-sm" style="color: var(--text-dim)" for="plates-target">{{ t('plates_target') }}, {{ unitLabel }}</label>
      <input id="plates-target" v-model="target" type="text" inputmode="decimal" class="mb-3 w-full rounded-lg border px-3 py-2" style="border-color: var(--border); background: var(--bg); color: var(--text); min-height: 44px" data-testid="plates-target" />
      <div class="mb-3 flex items-center gap-2 text-sm">
        <span style="color: var(--text-dim)">{{ t('plates_bar') }}:</span>
        <button v-for="b in BARS[system]" :key="b" type="button" class="rounded-lg border px-3 py-1" :style="{ borderColor: 'var(--border)', background: bar === b ? 'var(--accent)' : 'var(--bg)', color: bar === b ? 'var(--accent-text)' : 'var(--text)', minHeight: '36px' }" :aria-pressed="bar === b" data-testid="plates-bar" @click="bar = b">{{ b }}</button>
      </div>
      <div v-if="hasTarget" class="mb-4 rounded-lg border p-3 text-sm" style="border-color: var(--border); background: var(--bg)" data-testid="plates-result">
        <p v-if="result.belowBar" class="m-0" data-testid="plates-below">{{ t('plates_below_bar') }}</p>
        <template v-else>
          <p class="m-0 mb-1 font-semibold">{{ t('plates_per_side') }}:</p>
          <p v-if="!result.perSide.length" class="m-0" data-testid="plates-bar-only">{{ t('plates_empty_side') }}</p>
          <ul v-else class="m-0 list-none p-0">
            <li v-for="p in result.perSide" :key="p.plate" data-testid="plates-row">{{ p.count }} × {{ num(p.plate) }}</li>
          </ul>
          <p class="m-0 mt-2" data-testid="plates-loaded">{{ t('plates_loaded') }}: <b>{{ num(result.loaded) }} {{ unitLabel }}</b></p>
          <p v-if="result.remainder > 0" class="m-0 mt-1" style="color: var(--danger, #d64545)" data-testid="plates-short">{{ t('plates_short').replace('{n}', `${num(result.remainder)} ${unitLabel}`) }}</p>
        </template>
      </div>
      <label class="mb-1 block text-sm" style="color: var(--text-dim)" for="plates-set">{{ t('plates_set') }}</label>
      <input id="plates-set" v-model="platesText" type="text" class="w-full rounded-lg border px-3 py-2" style="border-color: var(--border); background: var(--bg); color: var(--text); min-height: 44px" data-testid="plates-set" @input="onPlates" />
      <p class="m-0 mb-3 mt-1 text-xs" style="color: var(--text-dim)">{{ t('plates_set_hint') }}</p>
      <div class="flex items-center justify-between">
        <button type="button" class="border-0 bg-transparent p-0 text-sm" style="color: var(--accent); min-height: 36px" data-testid="plates-reset" @click="resetPlates">{{ t('plates_reset') }}</button>
        <button type="button" class="rounded-lg border px-4 py-2 text-sm" style="border-color: var(--border); background: var(--bg-card); color: var(--text); min-height: 44px" data-testid="plates-close" @click="emit('close')">{{ t('plates_close') }}</button>
      </div>
    </div>
  </div>
</template>
