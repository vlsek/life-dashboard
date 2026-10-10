<script setup lang="ts">
import { computed, ref } from 'vue'
import { ANIMALS, animalAvatarUrl, animalLabel } from '../lib/animalAvatars'
import { getLang, t } from '../lib/i18n'

// Окно «Выбрать аватарку» в «Аккаунте» (BACKLOG 44.17): 20 животных, фото Google (если вошли через Google) или своё фото.
// current — текущий avatar_url (совпавшее подсвечивается). Сохранение делает родитель; окно закрывается им же после успеха.
const props = defineProps<{ current: string | null; googleAvatar: string | null; error?: string | null; busy?: boolean }>()
const emit = defineEmits<{ close: []; pick: [key: string]; google: []; upload: [file: File] }>()

const items = computed(() => ANIMALS.map((a) => ({ key: a.key, label: animalLabel(a, getLang()), url: animalAvatarUrl(a.key)! })))
const fileInput = ref<HTMLInputElement | null>(null)
function onFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) emit('upload', f)
  if (fileInput.value) fileInput.value.value = ''
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(0, 0, 0, 0.55)" data-test="avatar-modal" @click.self="emit('close')" @keydown.esc="emit('close')">
    <div class="w-full max-w-md rounded-xl border p-4" style="border-color: var(--border); background: var(--bg-card)" role="dialog" aria-modal="true" :aria-label="t('acc_avatar_title')">
      <h3 class="mb-2 font-bold">{{ t('acc_avatar_title') }}</h3>
      <p class="mb-1.5 mt-0 text-sm">{{ t('acc_avatar_animals') }}</p>
      <div class="flex flex-wrap gap-2" role="radiogroup" :aria-label="t('acc_avatar_animals')">
        <button
          v-if="props.googleAvatar"
          type="button"
          class="avatar-opt"
          :class="{ 'avatar-opt--on': props.current === props.googleAvatar }"
          role="radio"
          :aria-checked="props.current === props.googleAvatar"
          :aria-label="t('acc_avatar_google')"
          :title="t('acc_avatar_google')"
          :disabled="props.busy"
          data-test="avatar-google"
          @click="emit('google')"
        ><img :src="props.googleAvatar" alt="" /></button>
        <button
          v-for="a in items"
          :key="a.key"
          type="button"
          class="avatar-opt"
          :class="{ 'avatar-opt--on': props.current === a.url }"
          role="radio"
          :aria-checked="props.current === a.url"
          :aria-label="a.label"
          :title="a.label"
          :disabled="props.busy"
          :data-test="'avatar-' + a.key"
          @click="emit('pick', a.key)"
        ><img :src="a.url" alt="" /></button>
      </div>
      <p class="mb-0 mt-1.5 text-xs" style="color: var(--text-dim)">{{ props.googleAvatar ? t('acc_avatar_hint_google') : t('acc_avatar_hint') }}</p>
      <p v-if="props.error" class="mt-2 text-sm" style="color: var(--danger)" data-test="avatar-error">{{ props.error }}</p>
      <input ref="fileInput" type="file" accept="image/*" class="hidden" data-test="avatar-input" @change="onFile" />
      <div class="mt-3 flex justify-end gap-2">
        <button type="button" class="rounded-lg border px-3 py-1.5 text-sm" style="border-color: var(--border); color: var(--text)" :disabled="props.busy" data-test="avatar-upload" @click="fileInput?.click()">{{ t('acc_avatar_upload') }}</button>
        <button type="button" class="rounded-lg border px-3 py-1.5 text-sm" style="border-color: var(--border); color: var(--text)" data-test="avatar-close" @click="emit('close')">{{ t('close') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.avatar-opt { width: 44px; height: 44px; padding: 0; border-radius: 9999px; border: 2px solid transparent; background: transparent; cursor: pointer; overflow: hidden; flex: none; }
.avatar-opt img { width: 100%; height: 100%; border-radius: 9999px; object-fit: cover; display: block; }
.avatar-opt:hover { border-color: var(--border); }
.avatar-opt:disabled { opacity: 0.6; cursor: default; }
.avatar-opt--on { border-color: var(--accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 30%, transparent); }
.avatar-opt:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
</style>
