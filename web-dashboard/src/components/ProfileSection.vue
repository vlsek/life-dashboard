<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Icon from './Icon.vue'
import MetricIcon from './MetricIcon.vue'
import BirthdateModal from './BirthdateModal.vue'
import BodyParamFormModal from './BodyParamFormModal.vue'
import BodyParamsModal from './BodyParamsModal.vue'
import { useProfile } from '../lib/useProfile'
import { calcAge, formatAge, formatDelta, unitSuffix, type BodyParam, type BodyParamForm } from '../lib/profile'
import { getLang, t } from '../lib/i18n'

// Единственная точка подключения блока «Профиль» в App.vue: аватар (загрузка фото), возраст
// (дата рождения), динамика параметров тела, баланс баллов, управление параметрами тела.
// Кольца дня/недели и стрик остаются в App.vue (перенесены раньше, другим агентом).
const props = defineProps<{ userId: string | null }>()
const { profile, params, stats, balance, loaded, error, init, uploadAvatar, saveBirthdate, addParam, updateParam, deleteParam } = useProfile()

watch(
  () => props.userId,
  (uid) => {
    if (uid) init(uid)
  },
  { immediate: true },
)

const fileInput = ref<HTMLInputElement | null>(null)
const showBirthdate = ref(false)
const showParams = ref(false)
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
  <section v-if="loaded" class="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border p-3" style="border-color: var(--border); background: var(--bg-card)">
    <button type="button" class="relative h-11 w-11 shrink-0 rounded-full p-0" :title="t('dash_photo_btn')" style="background: transparent; border: 0" @click="fileInput?.click()">
      <img v-if="profile?.avatar_url" :src="profile.avatar_url" alt="" class="h-11 w-11 rounded-full border-2 object-cover" style="border-color: var(--border); background: var(--bg)" />
      <span v-else class="flex h-11 w-11 items-center justify-center rounded-full border-2 text-xl" style="border-color: var(--border); background: var(--bg)"><Icon name="user" /></span>
    </button>
    <input ref="fileInput" type="file" accept="image/*" class="hidden" data-test="avatar-input" @change="onFile" />

    <div class="flex items-center gap-1">
      <template v-if="age">
        <Icon name="cake" extra-style="margin-right:0.3em;" />{{ age }}
        <button type="button" class="secondary px-1.5 py-px text-xs" @click="showBirthdate = true"><Icon name="edit" /></button>
      </template>
      <button v-else type="button" class="secondary" @click="showBirthdate = true">{{ t('dash_set_birthdate_btn') }}</button>
    </div>

    <div v-for="s in stats" :key="s.param.id" data-test="param-stat">
      <MetricIcon :icon="s.param.icon" extra-style="margin-right:0.3em;" />{{ s.param.name }}: {{ s.latest }}{{ unitSuffix(s.param.unit) }}
      <span v-if="formatDelta(s.sinceFirst)" :style="{ color: toneColor[s.tone] }">({{ formatDelta(s.sinceFirst) }}{{ unitSuffix(s.param.unit) }})</span>
    </div>

    <button type="button" class="secondary px-2 text-xs" :title="t('dash_body_params_title')" data-test="params-btn" @click="showParams = true"><Icon name="ruler" /></button>

    <a v-if="balance != null" href="/shop-vue/" class="ml-auto font-bold" :title="t('dash_balance_click_hint')" style="color: inherit; text-decoration: none"><Icon name="coin" /> {{ balance }}</a>

    <p v-if="error" class="w-full text-sm" style="color: var(--danger)">{{ error }}</p>
  </section>

  <BirthdateModal v-if="showBirthdate" :initial="profile?.birthdate ?? null" :error="modalError" @close="showBirthdate = false" @save="onSaveBirthdate" />
  <BodyParamsModal v-if="showParams" :params="params" @close="showParams = false" @add="openForm('new')" @edit="openForm" @remove="onRemoveParam" />
  <BodyParamFormModal v-if="formFor" :existing="formFor === 'new' ? null : formFor" :error="modalError" @close="formFor = null" @save="onSaveParam" />
</template>
