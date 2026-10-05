<script setup lang="ts">
import { ref } from 'vue'
import { t } from '../lib/i18n'
import { NAME_MAX, cleanProfileName } from '../lib/profileName'

// Мягкая плашка «Укажите имя» (BACKLOG 841): у тех, кто зарегистрировался раньше без имени. Без неё друзья видят «Пользователь xxxxxxxx».
const emit = defineEmits<{ save: [name: string] }>()
const name = ref('')
const error = ref(false)
function onSave() {
  const clean = cleanProfileName(name.value)
  if (!clean) {
    error.value = true
    return
  }
  emit('save', clean)
}
</script>

<template>
  <div class="card mb-4 rounded-lg border p-3.5" style="border-color: var(--accent)" data-testid="name-nudge">
    <p class="m-0 text-sm font-medium">{{ t('comm_name_nudge_title') }}</p>
    <p class="dim mb-2 mt-0.5 text-xs">{{ t('comm_name_nudge_hint') }}</p>
    <div class="flex flex-wrap gap-2">
      <input v-model="name" type="text" :maxlength="NAME_MAX" autocomplete="name" :placeholder="t('comm_name_nudge_placeholder')" class="min-w-[10rem] flex-1" data-testid="name-nudge-input" @input="error = false" @keydown.enter.prevent="onSave" />
      <button class="flex-shrink-0 px-3 py-1 text-sm" data-testid="name-nudge-save" @click="onSave">{{ t('save') }}</button>
    </div>
    <p v-if="error" class="mb-0 mt-1.5 text-xs" style="color: var(--danger)" data-testid="name-nudge-error">{{ t('comm_name_required') }}</p>
  </div>
</template>
