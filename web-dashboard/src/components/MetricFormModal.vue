<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import IconPicker from './IconPicker.vue'
import { t } from '../lib/i18n'
import { WEEK_ORDER, clearedForBoolean, emptyForm, fieldsEnabledForForm, formFromMetric } from '../lib/metricsManager'
import type { MetricFormValues } from '../lib/metricsManager'
import type { MetricCategory } from '../lib/useMetricsManager'
import type { Metric } from '../lib/types'
import { stripEmoji } from '../lib/emojiText'

// Портировано из openMetricFormModal() в dashboard.js.
const props = defineProps<{ existing: Metric | null; categories: MetricCategory[]; error?: string | null; plannedSetsAvailable?: boolean }>()
const emit = defineEmits<{ close: []; save: [form: MetricFormValues] }>()

const form = ref<MetricFormValues>(props.existing ? formFromMetric(props.existing) : emptyForm())
const enabled = computed(() => fieldsEnabledForForm(form.value))
const weekdayNames = computed(() => t('dash_weekdays_short').split(','))
// Миграция 041: поле «подходов в день» показываем только если колонка есть (у метрики есть ключ planned_sets_log или он есть у других)
const plannedSetsShown = computed(() => (props.existing ? 'planned_sets_log' in props.existing : !!props.plannedSetsAvailable) && enabled.value.plannedSets)

// Смена типа на boolean очищает цель/единицу/варианты, как в оригинале
watch(
  () => form.value.type,
  (type) => {
    if (type === 'boolean') form.value = clearedForBoolean(form.value)
    // «просто записывать значение» есть только у числовой метрики
    if (type !== 'number' && form.value.trackOnly) form.value.trackOnly = false
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

      <!-- «Одной из первых»: переключатель режима. При «да» цель, расписание и серия неактивны (BACKLOG 14, 11:15) -->
      <div v-if="enabled.trackOnlyAvailable" class="mt-2" data-test="track-only-block">
        <label class="flex items-center gap-2 text-sm">
          <input v-model="form.trackOnly" type="checkbox" data-test="track-only" />
          {{ t('dash_metric_track_only') }}
        </label>
        <p class="dim mt-1 text-xs">{{ t('dash_metric_track_only_hint') }}</p>
      </div>

      <label class="mt-2 block text-sm" :style="dim(enabled.goal)">{{ t('dash_metric_field_goal_dir') }}</label>
      <select v-model="form.goalDirection" class="w-full" :disabled="!enabled.goal" :style="dim(enabled.goal)">
        <option value="at_least">{{ t('dash_goal_dir_at_least') }}</option>
        <option value="at_most">{{ t('dash_goal_dir_at_most') }}</option>
      </select>

      <label class="mt-2 block text-sm" :style="dim(enabled.goal)">{{ t('dash_metric_field_goal_value') }}</label>
      <input v-model.number="form.goalValue" type="number" class="w-full" :disabled="!enabled.goal" :style="dim(enabled.goal)" />

      <label class="mt-2 block text-sm" :style="dim(enabled.unit)">{{ t('dash_metric_field_unit') }}</label>
      <input v-model="form.unit" type="text" class="w-full" :disabled="!enabled.unit" :style="dim(enabled.unit)" />

      <label class="mt-2 block text-sm" :style="dim(enabled.options)">
        {{ form.type === 'sets' ? t('dash_metric_field_variations') : t('dash_metric_field_options') }}
      </label>
      <input v-model="form.optionsRaw" type="text" class="w-full" :disabled="!enabled.options" :style="dim(enabled.options)" />

      <label class="mt-2 block text-sm" :style="dim(enabled.inputMode)">{{ t('dash_metric_field_input_mode') }}</label>
      <select v-model="form.inputMode" class="w-full" :disabled="!enabled.inputMode" :style="dim(enabled.inputMode)">
        <option value="set">{{ t('dash_metric_input_mode_set') }}</option>
        <option value="add">{{ t('dash_metric_input_mode_add') }}</option>
      </select>

      <template v-if="plannedSetsShown">
        <label class="mt-2 block text-sm">{{ t('dash_metric_planned_sets') }}</label>
        <input :value="form.plannedSets" type="number" min="1" max="50" step="1" inputmode="numeric" class="w-full" data-test="planned-sets" @input="form.plannedSets = ($event.target as HTMLInputElement).value" />
        <p class="dim mt-1 text-xs">{{ t('dash_metric_planned_sets_hint') }}</p>
      </template>

      <label class="mt-2 block text-sm" :style="dim(enabled.schedule)">{{ t('dash_metric_field_schedule') }}</label>
      <select v-model="form.scheduleKind" class="w-full" :disabled="!enabled.schedule" :style="dim(enabled.schedule)">
        <option value="daily">{{ t('dash_schedule_daily') }}</option>
        <option value="days">{{ t('dash_schedule_days') }}</option>
        <option value="weekly">{{ t('dash_schedule_weekly') }}</option>
        <option value="at_most">{{ t('dash_schedule_at_most') }}</option>
      </select>

      <div v-if="enabled.schedule && form.scheduleKind === 'days'" class="mt-2">
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

      <template v-if="enabled.schedule && form.scheduleKind === 'weekly'">
        <label class="mt-2 block text-sm">{{ t('dash_schedule_weekly_label') }}</label>
        <input v-model.number="form.weeklyMin" type="number" min="1" max="7" class="w-full" />
      </template>
      <template v-if="enabled.schedule && form.scheduleKind === 'at_most'">
        <label class="mt-2 block text-sm">{{ t('dash_schedule_at_most_label') }}</label>
        <input v-model.number="form.atMostMax" type="number" min="0" max="7" class="w-full" />
      </template>

      <label class="mt-2 block text-sm">{{ t('dash_metric_field_category') }}</label>
      <select v-model="form.categoryId" class="w-full">
        <option value="">{{ t('dash_category_none') }}</option>
        <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.label_ru }} / {{ c.label_en }}</option>
        <option value="__new__">{{ stripEmoji(t('dash_category_new')) }}</option>
      </select>
      <template v-if="form.categoryId === '__new__'">
        <label class="mt-2 block text-sm">{{ t('dash_new_category_prompt') }}</label>
        <input v-model="form.newCategory" type="text" class="w-full" maxlength="60" data-test="new-category-input" />
      </template>

      <label class="mt-2 flex items-center gap-2 text-sm" :style="dim(enabled.countStreak)">
        <input
          type="checkbox"
          data-test="count-streak"
          :checked="enabled.countStreak ? form.countStreak : false"
          :disabled="!enabled.countStreak"
          @change="form.countStreak = ($event.target as HTMLInputElement).checked"
        />
        {{ t('dash_metric_count_streak') }}
      </label>
      <p class="dim mt-1 text-xs">{{ t('dash_metric_count_streak_hint') }}</p>

      <label class="mt-2 block text-sm" :style="dim(enabled.streakImport && form.countStreak)">{{ t('dash_streak_import_field') }}</label>
      <input
        v-model="form.streakImportDays"
        type="number"
        min="0"
        class="w-full"
        data-test="streak-import"
        :disabled="!(enabled.streakImport && form.countStreak)"
        :style="dim(enabled.streakImport && form.countStreak)"
      />
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
