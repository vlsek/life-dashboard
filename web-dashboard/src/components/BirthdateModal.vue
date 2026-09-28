<script setup lang="ts">
import { ref } from 'vue'
import { t } from '../lib/i18n'
import { todayStr } from '../lib/date'
import { MIN_BIRTHDATE } from '../lib/profile'

// Портировано из openBirthdateModal() в dashboard.js. Ошибку диапазона показывает родитель
// (сохранение возвращает текст ошибки) — окно остаётся открытым, пока сохранение не удалось.
const props = defineProps<{ initial: string | null; error?: string | null }>()
const emit = defineEmits<{ close: []; save: [value: string] }>()
const value = ref(props.initial ?? '')
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal">
      <h3>{{ t('dash_birthdate_title') }}</h3>
      <input v-model="value" type="date" class="mt-2 w-full" :min="MIN_BIRTHDATE" :max="todayStr()" />
      <p v-if="props.error" class="mt-2 text-sm" style="color: var(--danger)">{{ props.error }}</p>
      <div class="modal-actions">
        <button type="button" class="secondary" @click="emit('close')">{{ t('cancel') }}</button>
        <button type="button" @click="emit('save', value)">{{ t('save') }}</button>
      </div>
    </div>
  </div>
</template>
