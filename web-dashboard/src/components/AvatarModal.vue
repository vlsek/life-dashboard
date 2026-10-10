<script setup lang="ts">
import { computed } from 'vue'
import { ANIMALS, animalAvatarUrl, animalLabel } from '../lib/animalAvatars'
import { getLang, t } from '../lib/i18n'

// Окно «Выбрать аватарку» (BACKLOG раздел 29, срез 2): 20 нарисованных животных или своё фото.
// current — текущий avatar_url (если это data-URI животного, оно подсвечивается). Сохранение делает родитель.
const props = defineProps<{ current: string | null | undefined; error?: string | null }>()
const emit = defineEmits<{ close: []; pick: [key: string]; upload: [] }>()

const items = computed(() => ANIMALS.map((a) => ({ key: a.key, label: animalLabel(a, getLang()), url: animalAvatarUrl(a.key)! })))
</script>

<template>
  <div class="modal-backdrop" data-test="avatar-modal" @click.self="emit('close')" @keydown.esc="emit('close')">
    <div class="modal">
      <h3>{{ t('dash_avatar_title') }}</h3>
      <p class="mb-1.5 mt-2 text-sm">{{ t('dash_avatar_animals') }}</p>
      <div class="flex flex-wrap gap-2" role="radiogroup" :aria-label="t('dash_avatar_animals')">
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
          :data-test="'avatar-' + a.key"
          @click="emit('pick', a.key)"
        ><img :src="a.url" alt="" /></button>
      </div>
      <p class="dim mb-0 mt-1.5 text-xs">{{ t('dash_avatar_hint') }}</p>
      <p v-if="props.error" class="mt-2 text-sm" style="color: var(--danger)">{{ props.error }}</p>
      <div class="modal-actions">
        <button type="button" class="secondary" data-test="avatar-upload" @click="emit('upload')">{{ t('dash_avatar_upload') }}</button>
        <button type="button" class="secondary" data-test="avatar-close" @click="emit('close')">{{ t('close') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.avatar-opt { width: 44px; height: 44px; padding: 0; border-radius: 9999px; border: 2px solid transparent; background: transparent; cursor: pointer; overflow: hidden; flex: none; min-height: 0; }
.avatar-opt img { width: 100%; height: 100%; border-radius: 9999px; object-fit: cover; display: block; }
.avatar-opt:hover { border-color: var(--border); }
.avatar-opt--on { border-color: var(--accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 30%, transparent); }
.avatar-opt:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
</style>
