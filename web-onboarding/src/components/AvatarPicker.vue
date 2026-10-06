<script setup lang="ts">
import { computed } from 'vue'
import { ANIMALS, animalAvatarUrl, animalLabel } from '../lib/animalAvatars'
import { getLang, t } from '../lib/i18n'

// Выбор аватарки при регистрации (BACKLOG раздел 29): фото из Google (если вошли через Google) или одно из 20 животных; можно не выбирать —
// тогда круг с инициалами. modelValue — ключ выбранного животного (null — не выбрано).
const props = defineProps<{ modelValue: string | null; googleAvatar: string | null }>()
const emit = defineEmits<{ 'update:modelValue': [key: string | null] }>()

const lang = computed(() => getLang())
const items = computed(() => ANIMALS.map((a) => ({ key: a.key, label: animalLabel(a, lang.value), url: animalAvatarUrl(a.key)! })))
// Повторный клик по выбранному — снимает выбор (возврат к фото Google / инициалам)
const pick = (key: string) => emit('update:modelValue', props.modelValue === key ? null : key)
</script>

<template>
  <div class="mb-3.5" data-test="avatar-picker">
    <p class="mb-1.5 mt-0">{{ t('onb_field_avatar') }}</p>
    <div class="flex flex-wrap gap-2" role="radiogroup" :aria-label="t('onb_field_avatar')">
      <button
        v-if="googleAvatar"
        type="button"
        class="avatar-opt"
        :class="{ 'avatar-opt--on': modelValue === null }"
        role="radio"
        :aria-checked="modelValue === null"
        :aria-label="t('onb_avatar_google')"
        :title="t('onb_avatar_google')"
        data-test="avatar-google"
        @click="emit('update:modelValue', null)"
      ><img :src="googleAvatar" alt="" /></button>
      <button
        v-for="a in items"
        :key="a.key"
        type="button"
        class="avatar-opt"
        :class="{ 'avatar-opt--on': modelValue === a.key }"
        role="radio"
        :aria-checked="modelValue === a.key"
        :aria-label="a.label"
        :title="a.label"
        :data-test="'avatar-' + a.key"
        @click="pick(a.key)"
      ><img :src="a.url" alt="" /></button>
    </div>
    <p class="dim mb-0 mt-1.5 text-xs">{{ googleAvatar ? t('onb_avatar_hint_google') : t('onb_avatar_hint') }}</p>
  </div>
</template>

<style scoped>
.avatar-opt {
  width: 44px;
  height: 44px;
  padding: 0;
  border-radius: 9999px;
  border: 2px solid transparent;
  background: transparent;
  cursor: pointer;
  overflow: hidden;
  flex: none;
}
.avatar-opt img {
  width: 100%;
  height: 100%;
  border-radius: 9999px;
  object-fit: cover;
  display: block;
}
.avatar-opt:hover {
  border-color: var(--border);
}
.avatar-opt--on {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 30%, transparent);
}
.avatar-opt:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
</style>
