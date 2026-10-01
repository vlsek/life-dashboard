<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import LangThemeBar from './components/LangThemeBar.vue'
import { useOnboarding } from './lib/useOnboarding'
import { goalOptions, metricGroups, metricDescription, recommendedKeys, selectedMetrics, dayProgressSettingsFor, starterMetrics, bodyParamKeysFor, layoutFor, stepsFor } from './lib/onboardingData'
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
const busy = ref(false)
const errorMsg = ref('')
const today = todayStr()

// Мастер по шагам (BACKLOG 8.3): сценарий -> о себе -> приоритет -> метрики. «Ежедневнику» — только первые два.
const stepIdx = ref(0)
const steps = computed(() => stepsFor(usecase.value))
const step = computed(() => steps.value[Math.min(stepIdx.value, steps.value.length - 1)])
const isLast = computed(() => stepIdx.value >= steps.value.length - 1)
const isPlanner = computed(() => usecase.value === 'planner')
const stepCounter = computed(() => t('onb_step_counter').replace('{n}', String(stepIdx.value + 1)).replace('{m}', String(steps.value.length)))

// Метрики: по цели предвыбраны только рекомендованные, остальные — по желанию. Пока человек сам ничего не
// трогал, при смене цели выбор пересчитывается.
const selectedKeys = ref<Set<string>>(new Set(recommendedKeys(goalType.value)))
const selectionTouched = ref(false)
watch(goalType, (g) => {
  if (!selectionTouched.value) selectedKeys.value = new Set(recommendedKeys(g))
})
const groups = computed(() => metricGroups(usecase.value, lang, goalType.value))
const otherOpen = ref(false)
const descLabels = { bool: t('onb_metric_bool'), multiselect: t('onb_metric_multiselect'), lessThan: t('onb_metric_less_than'), atLeast: t('onb_metric_at_least') }

function toggleMetric(key: string, checked: boolean) {
  selectionTouched.value = true
  const next = new Set(selectedKeys.value)
  if (checked) next.add(key)
  else next.delete(key)
  selectedKeys.value = next
}

const bodyParamLabels = { weight: t('onb_body_param_weight'), fat: t('onb_body_param_fat'), muscle: t('onb_body_param_muscle'), water: t('onb_body_param_water'), kg: t('onb_kg_unit') }

function saveDayProgressSettings(u: Usecase) {
  try {
    localStorage.setItem('day_progress_settings', JSON.stringify(dayProgressSettingsFor(u)))
  } catch {
    /* не критично */
  }
}

function birthdateOk(): boolean {
  if (birthdate.value && (birthdate.value < '1900-01-01' || birthdate.value > today)) {
    errorMsg.value = t('dash_birthdate_range_error')
    return false
  }
  errorMsg.value = ''
  return true
}

function goBack() {
  errorMsg.value = ''
  if (stepIdx.value > 0) stepIdx.value -= 1
}

async function onNext() {
  if (auth.value.status !== 'ready') return
  if (step.value === 'about' && !birthdateOk()) return
  if (!isLast.value) {
    errorMsg.value = ''
    stepIdx.value += 1
    return
  }
  await onSubmit()
}

async function onSubmit() {
  if (auth.value.status !== 'ready') return
  if (!birthdateOk()) {
    stepIdx.value = steps.value.indexOf('about')
    return
  }
  busy.value = true
  saveDayProgressSettings(usecase.value)
  const goal = isPlanner.value ? null : goalType.value
  const answers = {
    gender: gender.value,
    birthdate: birthdate.value || null,
    height: isPlanner.value ? null : height.value ? parseFloat(height.value) : null,
    weight: isPlanner.value ? null : weight.value ? parseFloat(weight.value) : null,
    goal_type: goal,
    skills_raw: isPlanner.value ? '' : skillsRaw.value,
    selectedMetrics: selectedMetrics(usecase.value, lang, goalType.value, selectedKeys.value),
    bodyParamKeys: bodyParamKeysFor(usecase.value, goal),
    layout: layoutFor(usecase.value),
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
  const res = await skip(auth.value.userId, starterMetrics(lang))
  if (!res.ok) {
    errorMsg.value = t('dash_save_error_generic') + res.error.message + '\n\n' + t('onb_migration_hint_001')
    busy.value = false
    return
  }
  if (res.seedError) errorMsg.value = t('onb_profile_saved_metrics_failed') + res.seedError.message
  window.location.href = '/dashboard/'
}

const usecaseCards: { value: Usecase; title: 'onb_usecase_goals' | 'onb_usecase_planner' | 'onb_usecase_both'; desc: 'onb_usecase_goals_desc' | 'onb_usecase_planner_desc' | 'onb_usecase_both_desc' }[] = [
  { value: 'goals', title: 'onb_usecase_goals', desc: 'onb_usecase_goals_desc' },
  { value: 'planner', title: 'onb_usecase_planner', desc: 'onb_usecase_planner_desc' },
  { value: 'both', title: 'onb_usecase_both', desc: 'onb_usecase_both_desc' },
]
</script>

<template>
  <main class="mx-auto max-w-[440px] px-4 py-8">
    <LangThemeBar />
    <h1 class="mb-1.5 text-2xl font-semibold">{{ t('onb_h1') }}</h1>
    <p class="dim mb-4">{{ t('onb_intro') }}</p>

    <div v-if="auth.status !== 'ready'" class="card rounded-lg border p-4" style="border-color: var(--border)">{{ t('loading_ellipsis') }}</div>

    <form v-else class="card rounded-lg border p-4" style="border-color: var(--border); background: var(--bg-card)" @submit.prevent="onNext">
      <div class="mb-3.5 flex items-center gap-1.5" data-test="step-progress">
        <span
          v-for="(_, i) in steps"
          :key="i"
          class="h-1.5 flex-1 rounded-full"
          :style="{ background: i <= stepIdx ? 'var(--accent)' : 'var(--border)' }"
        ></span>
        <span class="dim ml-1 whitespace-nowrap text-xs" data-test="step-counter">{{ stepCounter }}</span>
      </div>

      <!-- Шаг 1: сценарий -->
      <fieldset v-if="step === 'usecase'" class="mb-3.5 border-0 p-0" data-test="step-usecase">
        <legend class="mb-2 p-0">{{ t('onb_field_usecase') }}</legend>
        <button
          v-for="c in usecaseCards"
          :key="c.value"
          type="button"
          :data-test="`usecase-${c.value}`"
          :aria-pressed="usecase === c.value"
          class="mb-2 block w-full rounded-lg border p-3 text-left"
          :style="{
            borderColor: usecase === c.value ? 'var(--accent)' : 'var(--border)',
            borderWidth: usecase === c.value ? '2px' : '1px',
            background: 'var(--bg)',
            color: 'var(--text)',
          }"
          @click="usecase = c.value"
        >
          <strong class="block">{{ t(c.title) }}</strong>
          <span class="dim text-sm">{{ t(c.desc) }}</span>
        </button>
      </fieldset>

      <!-- Шаг 2: о себе -->
      <div v-else-if="step === 'about'" data-test="step-about">
        <p class="dim mb-3 text-sm">{{ t('onb_step_about_hint') }}</p>
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
        </template>
      </div>

      <!-- Шаг 3: приоритет -->
      <div v-else-if="step === 'priority'" data-test="step-priority">
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
      </div>

      <!-- Шаг 4: метрики (рекомендованные под цель — сразу, остальные — по желанию) -->
      <div v-else-if="step === 'metrics'" data-test="step-metrics">
        <p class="mb-1 font-medium">{{ t('onb_step_metrics_title') }}</p>
        <p class="dim mb-3 text-sm">{{ t('onb_metrics_hint') }}</p>
        <p class="dim mb-1.5 text-xs uppercase tracking-wide">{{ t('onb_metrics_recommended') }}</p>
        <div class="mb-3 rounded-lg border p-2.5" style="border-color: var(--border)" data-test="metrics-recommended">
          <label v-for="m in groups.recommended" :key="m.key" class="mb-2 flex items-start gap-2 font-normal last:mb-0">
            <input type="checkbox" class="mt-0.5" :data-metric="m.key" :checked="selectedKeys.has(m.key)" @change="toggleMetric(m.key, ($event.target as HTMLInputElement).checked)" />
            <span>{{ m.icon }} <strong>{{ m.name }}</strong> <span class="dim text-sm">— {{ metricDescription(m, descLabels) }}</span></span>
          </label>
        </div>
        <template v-if="groups.other.length">
          <button type="button" class="secondary mb-2.5 w-full" data-test="metrics-other-toggle" @click="otherOpen = !otherOpen">
            {{ otherOpen ? t('onb_metrics_other_hide') : t('onb_metrics_other_show').replace('{n}', String(groups.other.length)) }}
          </button>
          <div v-if="otherOpen" class="mb-3 rounded-lg border p-2.5" style="border-color: var(--border)" data-test="metrics-other">
            <label v-for="m in groups.other" :key="m.key" class="mb-2 flex items-start gap-2 font-normal last:mb-0">
              <input type="checkbox" class="mt-0.5" :data-metric="m.key" :checked="selectedKeys.has(m.key)" @change="toggleMetric(m.key, ($event.target as HTMLInputElement).checked)" />
              <span>{{ m.icon }} <strong>{{ m.name }}</strong> <span class="dim text-sm">— {{ metricDescription(m, descLabels) }}</span></span>
            </label>
          </div>
        </template>
      </div>

      <div class="mt-4 flex gap-2">
        <button v-if="stepIdx > 0" type="button" class="secondary" :disabled="busy" data-test="back" @click="goBack">{{ t('onb_back') }}</button>
        <button type="submit" class="flex-1" :disabled="busy" data-test="next">
          {{ busy ? t('onb_submitting') : isLast ? t('onb_submit_btn') : t('onb_next') }}
        </button>
      </div>
      <button type="button" class="secondary mt-2 w-full" :disabled="busy" data-test="skip" @click="onSkip">{{ t('onb_skip_btn') }}</button>

      <p v-if="errorMsg" class="mt-2.5 whitespace-pre-line text-sm" style="color: var(--danger)">{{ errorMsg }}</p>
    </form>
    <p class="mt-3 text-center"><a href="/legacy/onboarding.html" class="text-[0.7em]" style="color: var(--text-dim); opacity: 0.55" data-test="legacy-link">legacy-onboarding</a></p>
  </main>
</template>
