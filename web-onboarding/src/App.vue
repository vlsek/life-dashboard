<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import LangThemeBar from './components/LangThemeBar.vue'
import { useOnboarding } from './lib/useOnboarding'
import { goalOptions, baseMetrics, goalMetrics, metricDescription, selectedMetrics, dayProgressSettingsFor } from './lib/onboardingData'
import { todayStr } from './lib/date'
import { t, getLang } from './lib/i18n'
import type { GoalType, Usecase } from './lib/types'

const { auth, init, complete, skip } = useOnboarding()
onMounted(init)

const lang = getLang()
const usecase = ref<Usecase>('goals')
const gender = ref<'male' | 'female'>('male')
const birthdate = ref('')
const height = ref('')
const weight = ref('')
const goalType = ref<GoalType>('lose_weight')
const skillsRaw = ref('')
const metricsOpen = ref(false)
const uncheckedKeys = reactive(new Set<string>())
const busy = ref(false)
const errorMsg = ref('')
const today = todayStr()

const isPlanner = computed(() => usecase.value === 'planner')
const candidates = computed(() => [...baseMetrics(lang), ...(usecase.value === 'planner' ? [] : goalMetrics(lang, goalType.value))])
const descLabels = { bool: t('onb_metric_bool'), multiselect: t('onb_metric_multiselect'), lessThan: t('onb_metric_less_than'), atLeast: t('onb_metric_at_least') }

function toggleMetric(key: string, checked: boolean) {
  if (checked) uncheckedKeys.delete(key)
  else uncheckedKeys.add(key)
}

const bodyParamLabels = { weight: t('onb_body_param_weight'), fat: t('onb_body_param_fat'), muscle: t('onb_body_param_muscle'), water: t('onb_body_param_water'), kg: t('onb_kg_unit') }

function saveDayProgressSettings(u: Usecase) {
  try {
    localStorage.setItem('day_progress_settings', JSON.stringify(dayProgressSettingsFor(u)))
  } catch {
    /* не критично */
  }
}

async function onSubmit() {
  if (auth.value.status !== 'ready') return
  if (birthdate.value && (birthdate.value < '1900-01-01' || birthdate.value > today)) {
    errorMsg.value = t('dash_birthdate_range_error')
    return
  }
  errorMsg.value = ''
  busy.value = true
  saveDayProgressSettings(usecase.value)
  const answers = {
    gender: gender.value,
    birthdate: birthdate.value || null,
    height: isPlanner.value ? null : height.value ? parseFloat(height.value) : null,
    weight: isPlanner.value ? null : weight.value ? parseFloat(weight.value) : null,
    goal_type: isPlanner.value ? null : goalType.value,
    skills_raw: isPlanner.value ? '' : skillsRaw.value,
    selectedMetrics: selectedMetrics(usecase.value, lang, goalType.value, uncheckedKeys),
  }
  const res = await complete(auth.value.userId, answers, bodyParamLabels)
  if (!res.ok) {
    errorMsg.value = t('onb_save_form_error') + res.error.message + '\n\n' + t('onb_migration_hint_001b')
    busy.value = false
    return
  }
  if (res.seedError) errorMsg.value = t('onb_form_saved_metrics_failed') + res.seedError.message
  window.location.href = '/dashboard/'
}

async function onSkip() {
  if (auth.value.status !== 'ready') return
  busy.value = true
  errorMsg.value = ''
  saveDayProgressSettings('both')
  const res = await skip(auth.value.userId, baseMetrics(lang))
  if (!res.ok) {
    errorMsg.value = t('dash_save_error_generic') + res.error.message + '\n\n' + t('onb_migration_hint_001')
    busy.value = false
    return
  }
  if (res.seedError) errorMsg.value = t('onb_profile_saved_metrics_failed') + res.seedError.message
  window.location.href = '/dashboard/'
}
</script>

<template>
  <main class="mx-auto max-w-[440px] px-4 py-8">
    <LangThemeBar />
    <h1 class="mb-1.5 text-2xl font-semibold">{{ t('onb_h1') }}</h1>
    <p class="dim mb-4">{{ t('onb_intro') }}</p>

    <div v-if="auth.status !== 'ready'" class="card rounded-lg border p-4" style="border-color: var(--border)">{{ t('loading_ellipsis') }}</div>

    <form v-else class="card rounded-lg border p-4" style="border-color: var(--border); background: var(--bg-card)" @submit.prevent="onSubmit">
      <label class="mb-3.5 block">
        {{ t('onb_field_usecase') }}
        <select v-model="usecase" class="mt-1 w-full">
          <option value="goals">{{ t('onb_usecase_goals') }}</option>
          <option value="planner">{{ t('onb_usecase_planner') }}</option>
          <option value="both">{{ t('onb_usecase_both') }}</option>
        </select>
      </label>

      <label class="mb-3.5 block">
        {{ t('onb_field_gender') }}
        <select v-model="gender" class="mt-1 w-full">
          <option value="male">{{ t('onb_gender_male') }}</option>
          <option value="female">{{ t('onb_gender_female') }}</option>
        </select>
      </label>

      <label class="mb-3.5 block">
        {{ t('dash_birthdate_title') }}
        <input v-model="birthdate" type="date" min="1900-01-01" :max="today" class="mt-1 w-full" />
      </label>

      <template v-if="!isPlanner">
        <label class="mb-3.5 block">
          {{ t('onb_field_height') }}
          <input v-model="height" type="number" :placeholder="t('onb_height_placeholder')" class="mt-1 w-full" />
        </label>
        <label class="mb-3.5 block">
          {{ t('onb_field_weight') }}
          <input v-model="weight" type="number" step="0.1" :placeholder="t('onb_weight_placeholder')" class="mt-1 w-full" />
        </label>
        <label class="mb-3.5 block">
          {{ t('onb_field_priority') }}
          <select v-model="goalType" class="mt-1 w-full">
            <option v-for="g in goalOptions(lang)" :key="g.value" :value="g.value">{{ g.label }}</option>
          </select>
        </label>

        <label v-if="goalType === 'learn_skill'" class="mb-3.5 block">
          {{ t('onb_skills_label') }}
          <input v-model="skillsRaw" type="text" :placeholder="t('onb_skills_placeholder')" class="mt-1 w-full" />
        </label>

        <button type="button" class="secondary mb-2.5 w-full" @click="metricsOpen = !metricsOpen">
          {{ metricsOpen ? t('onb_metrics_toggle_hide') : t('onb_metrics_toggle_show') }}
        </button>
        <div v-if="metricsOpen" class="mb-3.5 rounded-lg border p-2.5" style="border-color: var(--border)">
          <label v-for="m in candidates" :key="m.key" class="mb-2 flex items-start gap-2 font-normal">
            <input type="checkbox" class="mt-0.5" :checked="!uncheckedKeys.has(m.key)" @change="toggleMetric(m.key, ($event.target as HTMLInputElement).checked)" />
            <span>{{ m.icon }} <strong>{{ m.name }}</strong> <span class="dim text-sm">— {{ metricDescription(m, descLabels) }}</span></span>
          </label>
        </div>
      </template>

      <button type="submit" class="w-full" :disabled="busy">{{ busy ? t('onb_submitting') : t('onb_submit_btn') }}</button>
      <button type="button" class="secondary mt-2 w-full" :disabled="busy" @click="onSkip">{{ t('onb_skip_btn') }}</button>

      <p v-if="errorMsg" class="mt-2.5 whitespace-pre-line text-sm" style="color: var(--danger)">{{ errorMsg }}</p>
    </form>
  </main>
</template>
