<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import IconPicker from './IconPicker.vue'
import { t } from '../lib/i18n'
import { WEEK_ORDER, clearedForBoolean, emptyForm, fieldsEnabledForType, formFromMetric } from '../lib/metricsManager'
import type { MetricFormValues } from '../lib/metricsManager'
import type { MetricCategory } from '../lib/useMetricsManager'
import type { Metric } from '../lib/types'

// Портировано из openMetricFormModal() в dashboard.js.
const props = defineProps<{ existing: Metric | null; categories: MetricCategory[]; error?: string | null }>()
const emit = defineEmits<{ close: []; save: [form: MetricFormValues] }>()

const form = ref<MetricFormValues>(props.existing ? formFromMetric(props.existing) : emptyForm())
const enabled = computed(() => fieldsEnabledForType(form.value.type))
const weekdayNames = computed(() => t('dash_weekdays_short').split(','))

// Смена типа на boolean очищает цель/единицу/варианты, как в оригинале
watch(
  () => form.value.type,
  (type) => {
    if (type === 'boolean') form.value = clearedForBoolean(form.value)
  },
)

function toggleDay(dow: number) {
  const s = new Set(form.value.days)
  if (s.has(dow)) s.delete(dow)
  else s.add(dow)
  form.value.days = [...s]
}

function save() {
  if (!form.value.name.trim()) return
  emit('save', form.value)
}

const dim = (on: boolean) => ({ opacity: on ? 1 : 0.4 })
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal">
      <h3>{{ existing ? t('dash_metric_form_title_edit') : t('dash_metric_form_title_new') }}</h3>

      <label class="mt-2 block text-sm">{{ t('dash_metric_field_name') }}</label>
      <input v-model="form.name" type="text" class="w-full" autofocus />

      <div class="dim mt-2 text-sm">{{ t('dash_metric_field_icon') }}</div>
      <IconPicker v-model="form.icon" />

      <label class="mt-2 block text-sm">{{ t('dash_metric_field_type') }}</label>
      <select v-model="form.type" class="w-full">
        <option value="number">{{ t('dash_metric_type_number') }}</option>
        <option value="boolean">{{ t('dash_metric_type_boolean') }}</option>
        <option value="multiselect">{{ t('dash_metric_type_multiselect') }}</option>
        <option value="sets">{{ t('dash_metric_type_sets') }}</option>
      </select>

      <label class="mt-2 block text-sm" :style="dim(enabled.goal)">{{ t('dash_metric_field_goal_dir') }}</label>
      <select v-model="form.goalDirection" class="w-full" :disabled="!enabled.goal" :style="dim(enabled.goal)">
        <option value="at_least">{{ t('dash_goal_dir_at_least') }}</option>
        <option value="at_most">{{ t('dash_goal_dir_at_most') }}</option>
      </select>

      <label class="mt-2 block text-sm" :style="dim(enabled.goal)">{{ t('dash_metric_field_goal_value') }}</label>
      <input v-model.number="form.goalValue" type="number" class="w-full" :disabled="!enabled.goal" :style="dim(enabled.goal)" />

      <label class="mt-2 block text-sm" :style="dim(enabled.goal)">{{ t('dash_metric_field_unit') }}</label>
      <input v-model="form.unit" type="text" class="w-full" :disabled="!enabled.goal" :style="dim(enabled.goal)" />

      <label class="mt-2 block text-sm" :style="dim(enabled.options)">
        {{ form.type === 'sets' ? t('dash_metric_field_variations') : t('dash_metric_field_options') }}
      </label>
      <input v-model="form.optionsRaw" type="text" class="w-full" :disabled="!enabled.options" :style="dim(enabled.options)" />

      <label class="mt-2 block text-sm" :style="dim(enabled.inputMode)">{{ t('dash_metric_field_input_mode') }}</label>
      <select v-model="form.inputMode" class="w-full" :disabled="!enabled.inputMode" :style="dim(enabled.inputMode)">
        <option value="set">{{ t('dash_metric_input_mode_set') }}</option>
        <option value="add">{{ t('dash_metric_input_mode_add') }}</option>
      </select>

      <label class="mt-2 block text-sm">{{ t('dash_metric_field_schedule') }}</label>
      <select v-model="form.scheduleKind" class="w-full">
        <option value="daily">{{ t('dash_schedule_daily') }}</option>
        <option value="days">{{ t('dash_schedule_days') }}</option>
        <option value="weekly">{{ t('dash_schedule_weekly') }}</option>
        <option value="at_most">{{ t('dash_schedule_at_most') }}</option>
      </select>

      <div v-if="form.scheduleKind === 'days'" class="mt-2">
        <div class="dim mb-1.5 text-xs">{{ t('dash_schedule_days_caption') }}</div>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="(dow, i) in WEEK_ORDER"
            :key="dow"
            type="button"
            :class="form.days.includes(dow) ? '' : 'secondary'"
            style="min-height: 0"
            @click="toggleDay(dow)"
          >
            {{ weekdayNames[i] }}
          </button>
        </div>
      </div>

      <template v-if="form.scheduleKind === 'weekly'">
        <label class="mt-2 block text-sm">{{ t('dash_schedule_weekly_label') }}</label>
        <input v-model.number="form.weeklyMin" type="number" min="1" max="7" class="w-full" />
      </template>
      <template v-if="form.scheduleKind === 'at_most'">
        <label class="mt-2 block text-sm">{{ t('dash_schedule_at_most_label') }}</label>
        <input v-model.number="form.atMostMax" type="number" min="0" max="7" class="w-full" />
      </template>

      <label class="mt-2 block text-sm">{{ t('dash_metric_field_category') }}</label>
      <select v-model="form.categoryId" class="w-full">
        <option value="">{{ t('dash_category_none') }}</option>
        <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.label_ru }} / {{ c.label_en }}</option>
        <option value="__new__">{{ t('dash_category_new') }}</option>
      </select>

      <label class="mt-2 block text-sm">{{ t('dash_streak_import_field') }}</label>
      <input v-model="form.streakImportDays" type="number" min="0" class="w-full" />
      <p class="dim mt-1 text-xs">
        {{ existing?.streak_import_date ? `${t('dash_streak_import_hint_set')} ${existing.streak_import_date.split('-').reverse().join('.')}` : t('dash_streak_import_hint_new') }}
      </p>

      <p v-if="error" class="mt-2 text-sm" style="color: var(--danger)">{{ error }}</p>

      <div class="modal-actions">
        <button class="secondary" @click="emit('close')">{{ t('cancel') }}</button>
        <button @click="save">{{ t('save') }}</button>
      </div>
    </div>
  </div>
</template>
