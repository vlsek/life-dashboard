<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { t } from '../lib/i18n'

// Подтверждение выхода (BACKLOG 18, «Выйти — с подтверждением»): защита от случайного нажатия.
// «Отмена», Esc и клик по фону закрывают окно; фокус сразу на «Отмене» — случайный Enter не выходит.
const emit = defineEmits<{ confirm: []; cancel: [] }>()

const cancelBtn = ref<HTMLButtonElement | null>(null)
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('cancel')
}
onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  cancelBtn.value?.focus()
})
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="modal-backdrop no-edge-swipe" @click.self="emit('cancel')">
    <div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="logout-confirm-title" data-test="logout-confirm">
      <h3 id="logout-confirm-title">{{ t('logout_confirm_title') }}</h3>
      <p class="dim text-sm">{{ t('logout_confirm_text') }}</p>
      <div class="modal-actions">
        <button ref="cancelBtn" type="button" class="secondary" data-test="logout-cancel" @click="emit('cancel')">{{ t('cancel') }}</button>
        <button type="button" data-test="logout-confirm-btn" @click="emit('confirm')">{{ t('logout') }}</button>
      </div>
    </div>
  </div>
</template>
