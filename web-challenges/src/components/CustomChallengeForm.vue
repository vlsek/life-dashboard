<script setup lang="ts">
import { computed, ref } from 'vue'
import { t } from '../lib/i18n'
import { fieldsEnabledForType, formFromChallenge } from '../lib/challenges'
import type { Challenge, ChallengeType, CustomChallengeFormInput, SourceMetric } from '../lib/types'

// Без `challenge` — создание своего челленджа; с `challenge` — правка существующего (тип фиксирован).
const props = defineProps<{ challenge?: Challenge; metrics?: SourceMetric[] }>()
const emit = defineEmits<{ close: []; save: [res: CustomChallengeFormInput] }>()

const initial: CustomChallengeFormInput = props.challenge
  ? formFromChallenge(props.challenge)
  : { title: '', icon: '🏆', type: 'daily_fixed', duration: 30, dailyTarget: 0, startValue: 0, increment: 1, unit: '', targetCount: 10, itemLabel: '', sourceMetricId: '' }
const isEdit = computed(() => !!props.challenge)

const title = ref(initial.title)
const icon = ref(initial.icon)
const type = ref<ChallengeType>(initial.type)
const duration = ref(initial.duration)
const dailyTarget = ref(initial.dailyTarget)
const startValue = ref(initial.startValue)
const increment = ref(initial.increment)
const unit = ref(initial.unit)
const targetCount = ref(initial.targetCount)
const itemLabel = ref(initial.itemLabel)
const sourceMetricId = ref(initial.sourceMetricId ?? '')
// Источник значений — только для дневных челленджей и только если у человека есть подходящие метрики.
// Если выбранная ранее метрика пропала из списка (деактивирована), оставляем её в списке пустой строкой-подписью.
const sourceOptions = computed(() => props.metrics ?? [])
const showSource = computed(() => type.value.startsWith('daily') && (sourceOptions.value.length > 0 || !!sourceMetricId.value))

const enabled = computed(() => fieldsEnabledForType(type.value))

const typeOptions: { value: ChallengeType; labelKey: 'ch_type_daily_fixed' | 'ch_type_daily_progressive' | 'ch_type_daily_boolean' | 'ch_type_cumulative' }[] = [
  { value: 'daily_fixed', labelKey: 'ch_type_daily_fixed' },
  { value: 'daily_progressive', labelKey: 'ch_type_daily_progressive' },
  { value: 'daily_boolean', labelKey: 'ch_type_daily_boolean' },
  { value: 'cumulative_count', labelKey: 'ch_type_cumulative' },
]

function save() {
  if (!title.value.trim()) return
  emit('save', {
    title: title.value,
    icon: icon.value,
    type: type.value,
    duration: duration.value,
    dailyTarget: dailyTarget.value,
    startValue: startValue.value,
    increment: increment.value,
    unit: unit.value,
    targetCount: targetCount.value,
    itemLabel: itemLabel.value,
    sourceMetricId: type.value.startsWith('daily') ? sourceMetricId.value : '',
  })
}
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal">
      <h3>{{ isEdit ? t('ch_edit_title') : t('ch_custom_title') }}</h3>

      <label class="mt-2 block text-sm">{{ t('ch_field_title') }}</label>
      <input v-model="title" type="text" class="w-full" />

      <label class="mt-2 block text-sm">{{ t('ch_field_icon') }}</label>
      <input v-model="icon" type="text" class="w-full" />

      <label class="mt-2 block text-sm">{{ t('ch_field_type') }}</label>
      <select v-model="type" class="w-full" :disabled="isEdit" data-testid="type-select">
        <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">{{ t(opt.labelKey) }}</option>
      </select>
      <p v-if="isEdit" class="dim mt-1 text-xs" data-testid="type-locked-hint">{{ t('ch_edit_type_locked') }}</p>

      <label class="mt-2 block text-sm" :style="{ opacity: enabled.duration ? 1 : 0.4 }">{{ t('ch_field_duration') }}</label>
      <input v-model.number="duration" type="number" class="w-full" :disabled="!enabled.duration" :style="{ opacity: enabled.duration ? 1 : 0.4 }" />

      <label class="mt-2 block text-sm" :style="{ opacity: enabled.dailyTarget ? 1 : 0.4 }">{{ t('ch_field_daily_target') }}</label>
      <input v-model.number="dailyTarget" type="number" class="w-full" :disabled="!enabled.dailyTarget" :style="{ opacity: enabled.dailyTarget ? 1 : 0.4 }" />

      <label class="mt-2 block text-sm" :style="{ opacity: enabled.startValue ? 1 : 0.4 }">{{ t('ch_field_start_value') }}</label>
      <input v-model.number="startValue" type="number" class="w-full" :disabled="!enabled.startValue" :style="{ opacity: enabled.startValue ? 1 : 0.4 }" />

      <label class="mt-2 block text-sm" :style="{ opacity: enabled.increment ? 1 : 0.4 }">{{ t('ch_field_increment') }}</label>
      <input v-model.number="increment" type="number" class="w-full" :disabled="!enabled.increment" :style="{ opacity: enabled.increment ? 1 : 0.4 }" />

      <label class="mt-2 block text-sm" :style="{ opacity: enabled.unit ? 1 : 0.4 }">{{ t('ch_field_unit') }}</label>
      <input v-model="unit" type="text" class="w-full" :disabled="!enabled.unit" :style="{ opacity: enabled.unit ? 1 : 0.4 }" />

      <template v-if="showSource">
        <label class="mt-2 block text-sm">{{ t('ch_source_label') }}</label>
        <select v-model="sourceMetricId" class="w-full" data-testid="source-select">
          <option value="">{{ t('ch_source_manual') }}</option>
          <option v-for="m in sourceOptions" :key="m.id" :value="m.id">{{ m.icon ? m.icon + ' ' : '' }}{{ m.name }}{{ m.unit ? ' (' + m.unit + ')' : '' }}</option>
          <option v-if="sourceMetricId && !sourceOptions.some((m) => m.id === sourceMetricId)" :value="sourceMetricId">…</option>
        </select>
        <p class="dim mt-1 text-xs">{{ t('ch_source_hint') }}</p>
      </template>

      <label class="mt-2 block text-sm" :style="{ opacity: enabled.targetCount ? 1 : 0.4 }">{{ t('ch_field_target_count') }}</label>
      <input v-model.number="targetCount" type="number" class="w-full" :disabled="!enabled.targetCount" :style="{ opacity: enabled.targetCount ? 1 : 0.4 }" />

      <label class="mt-2 block text-sm" :style="{ opacity: enabled.itemLabel ? 1 : 0.4 }">{{ t('ch_field_item_label') }}</label>
      <input v-model="itemLabel" type="text" class="w-full" :disabled="!enabled.itemLabel" :style="{ opacity: enabled.itemLabel ? 1 : 0.4 }" />

      <div class="modal-actions">
        <button class="secondary" @click="emit('close')">{{ t('cancel') }}</button>
        <button @click="save">{{ t('save') }}</button>
      </div>
    </div>
  </div>
</template>
