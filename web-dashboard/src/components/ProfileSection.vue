<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Icon from './Icon.vue'
import MetricIcon from './MetricIcon.vue'
import BirthdateModal from './BirthdateModal.vue'
import BodyParamFormModal from './BodyParamFormModal.vue'
import BodyParamsModal from './BodyParamsModal.vue'
import PointsLogModal from './PointsLogModal.vue'
import AvatarProgress from './AvatarProgress.vue'
import ProgressRing from './ProgressRing.vue'
import StreakFlame from './StreakFlame.vue'
import type { RingData } from '../lib/ringPlacement'
import type { StreakItem } from '../lib/streaks'
import { useProfile } from '../lib/useProfile'
import { BODY_VALUES_CHANGED } from '../lib/useCharts'
import { calcAge, formatAge, formatDelta, unitSuffix, type BodyParam, type BodyParamForm } from '../lib/profile'
import { getLang, t } from '../lib/i18n'
import CoinIcon from './CoinIcon.vue'

// Единственная точка подключения блока «Профиль» в App.vue: аватар (загрузка фото), возраст
// (дата рождения), динамика параметров тела, баланс баллов, управление параметрами тела.
// Кольцо дня вокруг аватарки и кольцо недели показываем здесь (данные приходят из App.vue).
// Стрик — компактный бейдж прямо в этой строке (портировано из streakBadgeHostEl в
// loadProfileInner()): в App.vue раньше был отдельным разделом внизу страницы, что не совпадало
// с ванильным сайтом. topStreak/streakCount приходят из App.vue (там же общий список стриков
// для модалки со всеми сериями); клик по бейджу поднимает show-streaks.
// day — кольцо вокруг аватарки, week — кольцо недели в строке профиля (null — не показывать);
// шестерёнка и клики по кольцам поднимают событие progress-settings.
const props = defineProps<{
  userId: string | null
  day?: RingData | null
  week?: RingData | null
  topStreak?: StreakItem | null
  streakCount?: number
}>()
// 'progress-settings' = клик по кольцу/шестерёнке: 'day' — дневное (у аватарки), 'week' — недельное; App.vue открывает сводку
const emit = defineEmits<{ 'progress-settings': [kind: 'day' | 'week']; 'show-streaks': [] }>()

function streakLabel(item: StreakItem): string {
  if (item.kind === 'perfect_days') return t('dash_streak_perfect_days')
  if (item.kind === 'note_filled') return t('dash_streak_note_filled')
  return item.metric?.name ?? ''
}
const streakTitle = computed(() => {
  const top = props.topStreak
  if (!top) return ''
  return top.todayCounted ? ((props.streakCount ?? 0) > 1 ? `${streakLabel(top)} — ${t('dash_streak_more_hint')}` : streakLabel(top)) : t('dash_streak_at_risk_warning')
})
const { profile, params, stats, balance, loaded, error, init, uploadAvatar, saveBirthdate, addParam, updateParam, deleteParam, refreshValues } = useProfile()

watch(
  () => props.userId,
  (uid) => {
    if (uid) init(uid)
  },
  { immediate: true },
)

// Значение параметра тела поправили из графика — обновляем цифры в профиле.
const onBodyValues = (e: Event) => {
  if ((e as CustomEvent).detail?.source !== 'profile') refreshValues()
}
onMounted(() => window.addEventListener(BODY_VALUES_CHANGED, onBodyValues))
onBeforeUnmount(() => window.removeEventListener(BODY_VALUES_CHANGED, onBodyValues))

const fileInput = ref<HTMLInputElement | null>(null)
const showBirthdate = ref(false)
const showParams = ref(false)
const showPoints = ref(false)
const formFor = ref<BodyParam | 'new' | null>(null)
const modalError = ref<string | null>(null)

const age = computed(() => (profile.value?.birthdate ? formatAge(calcAge(profile.value.birthdate), getLang()) : null))
const toneColor = { success: 'var(--success)', danger: 'var(--danger)', neutral: 'var(--text)' } as const

async function onFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) await uploadAvatar(f)
  if (fileInput.value) fileInput.value.value = ''
}

async function onSaveBirthdate(value: string) {
  modalError.value = await saveBirthdate(value)
  if (!modalError.value) showBirthdate.value = false
}

async function onSaveParam(form: BodyParamForm) {
  const err = formFor.value === 'new' ? await addParam(form) : await updateParam((formFor.value as BodyParam).id, form)
  modalError.value = err
  if (!err) formFor.value = null
}

async function onRemoveParam(p: BodyParam) {
  if (!window.confirm(t('dash_body_param_delete_confirm').replace('{name}', p.name))) return
  const err = await deleteParam(p.id)
  if (err) error.value = err
}

function openForm(p: BodyParam | 'new') {
  modalError.value = null
  formFor.value = p
}
</script>

<template>
  <section v-if="loaded" class="mb-4 flex flex-col gap-2 rounded-lg border p-3" style="border-color: var(--border); background: var(--bg-card)">
    <!-- Строка 1 (BACKLOG 7.2): главное — аватар с кольцом дня, кольцо недели, возраст; справа стрик и баллы.
         На очень узком экране правая группа переносится под левую, но не ломает остальное. -->
    <div class="flex w-full flex-wrap items-center gap-x-3 gap-y-2" data-test="profile-top-row">
      <AvatarProgress :avatar-url="profile?.avatar_url" :ring="day ?? null" @pick="fileInput?.click()" @settings="emit('progress-settings', 'day')" />
      <input ref="fileInput" type="file" accept="image/*" class="hidden" data-test="avatar-input" @change="onFile" />

      <ProgressRing
        v-if="week"
        :base-pct="week.basePct"
        :bonus-pct="week.bonusPct"
        :total-pct="week.totalPct"
        :title="week.title"
        :label="t('dash_week_progress_label')"
        :size="48"
        @click="emit('progress-settings', 'week')"
      />

      <div class="flex items-center gap-1">
        <template v-if="age">
          <Icon name="cake" extra-style="margin-right:0.3em;" />{{ age }}
          <button type="button" class="secondary px-1.5 py-px text-xs" @click="showBirthdate = true"><Icon name="edit" /></button>
        </template>
        <button v-else type="button" class="secondary" @click="showBirthdate = true">{{ t('dash_set_birthdate_btn') }}</button>
      </div>

      <div class="ml-auto flex shrink-0 items-center gap-2" data-test="profile-score-group">
        <button
          v-if="topStreak"
          type="button"
          data-test="streak-badge"
          class="flex items-center gap-1 font-bold"
          :class="{ 'streak-unlit': !topStreak.todayCounted }"
          style="background: transparent; border: none; padding: 0; cursor: pointer; color: inherit"
          :title="streakTitle"
          @click="emit('show-streaks')"
        >
          <StreakFlame :lit="topStreak.todayCounted" />
          {{ topStreak.streak }}{{ topStreak.unit === 'w' ? ' ' + t('dash_streak_unit_weeks') : '' }}
        </button>

        <button
          v-if="balance != null"
          type="button"
          data-test="balance-btn"
          class="flex items-center gap-1 font-bold"
          :title="t('dash_balance_click_hint')"
          style="background: transparent; border: none; padding: 0; cursor: pointer; color: inherit"
          @click="showPoints = true"
        >
          <CoinIcon /> {{ balance }}
        </button>
      </div>
    </div>

    <!-- Строка 2: параметры тела — сколько бы их ни было, переносятся по ширине; длинное название не выталкивает вёрстку. -->
    <div class="flex w-full flex-wrap items-center gap-x-4 gap-y-1 text-sm" data-test="profile-params-row">
      <div v-for="s in stats" :key="s.param.id" class="min-w-0 max-w-full break-words" data-test="param-stat">
        <MetricIcon :icon="s.param.icon" extra-style="margin-right:0.3em;" />{{ s.param.name }}: {{ s.latest }}{{ unitSuffix(s.param.unit) }}
        <span v-if="formatDelta(s.sinceFirst)" :style="{ color: toneColor[s.tone] }">({{ formatDelta(s.sinceFirst) }}{{ unitSuffix(s.param.unit) }})</span>
      </div>

      <button type="button" class="secondary shrink-0 px-2 text-xs" :title="t('dash_body_params_title')" data-test="params-btn" @click="showParams = true"><Icon name="ruler" /></button>
    </div>

    <p v-if="error" class="w-full text-sm" style="color: var(--danger)">{{ error }}</p>
  </section>

  <BirthdateModal v-if="showBirthdate" :initial="profile?.birthdate ?? null" :error="modalError" @close="showBirthdate = false" @save="onSaveBirthdate" />
  <PointsLogModal v-if="showPoints && userId" :user-id="userId" :balance="balance" @close="showPoints = false" />
  <BodyParamsModal v-if="showParams" :params="params" @close="showParams = false" @add="openForm('new')" @edit="openForm" @remove="onRemoveParam" />
  <BodyParamFormModal v-if="formFor" :existing="formFor === 'new' ? null : formFor" :error="modalError" @close="formFor = null" @save="onSaveParam" />
</template>
