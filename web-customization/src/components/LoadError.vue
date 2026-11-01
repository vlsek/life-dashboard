<script setup lang="ts">
import { ref } from 'vue'
import { t } from '../lib/i18n'

// BACKLOG 74.3: ошибка загрузки с кнопкой «Повторить». Копия в каждом пилоте (scripts/apply_load_error.py — править там).
// message — уже понятный текст (через friendlyError), в слот можно добавить подсказку («— попробуй позже»).
// retry — перезагрузка данных; пока она идёт, кнопка занята, чтобы не плодить запросы.
const props = defineProps<{ message?: string; retry: () => unknown }>()
const busy = ref(false)
async function onRetry() {
  if (busy.value) return
  busy.value = true
  try {
    await props.retry()
  } finally {
    busy.value = false
  }
}
const offline = () => typeof navigator !== 'undefined' && navigator.onLine === false
</script>

<template>
  <div class="mb-3 flex flex-col items-start gap-2" role="alert" data-testid="load-error">
    <p class="dim m-0">{{ t('comm_load_error') }} {{ message }} <slot /></p>
    <p v-if="offline()" class="dim m-0 text-sm" data-testid="load-error-offline">{{ t('load_offline') }}</p>
    <button type="button" class="secondary min-h-11 px-4" :disabled="busy" data-testid="load-retry" @click="onRetry">{{ t('load_retry') }}</button>
  </div>
</template>
