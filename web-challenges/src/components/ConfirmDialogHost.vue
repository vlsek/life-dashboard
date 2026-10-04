<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getLang } from '../lib/i18n'
import { confirmState, settleConfirm } from '../lib/confirmDialog'

// Окно подтверждения (замена нативных confirm()/alert(), BACKLOG 567). Самодостаточное, как ConfirmLogoutModal: свои тексты
// RU/EN по getLang и scoped-стили на токенах темы, без правок i18n.ts/style.css страницы.
// «Отмена», Esc и клик по фону = «нет»; фокус сразу на «Отмене» (у infoOnly — на «OK»), чтобы случайный Enter ничего не удалил.
const TEXTS = {
  ru: { cancel: 'Отмена', ok: 'Удалить', info: 'OK' },
  en: { cancel: 'Cancel', ok: 'Delete', info: 'OK' },
} as const

const req = computed(() => confirmState.current)
const tx = computed(() => TEXTS[getLang()])
const okText = computed(() => (req.value?.infoOnly ? tx.value.info : req.value?.okLabel || tx.value.ok))

const focusBtn = ref<HTMLButtonElement | null>(null)
watch(req, async (r) => {
  if (!r) return
  await nextTick()
  focusBtn.value?.focus()
})

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && confirmState.current) settleConfirm(false)
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div v-if="req" class="cd-backdrop no-edge-swipe" data-test="confirm-dialog-backdrop" @click.self="settleConfirm(false)">
    <div class="cd-box" role="alertdialog" aria-modal="true" aria-describedby="cd-text" data-test="confirm-dialog">
      <p id="cd-text" class="cd-text" data-test="confirm-dialog-text">{{ req.message }}</p>
      <div class="cd-actions">
        <button v-if="!req.infoOnly" ref="focusBtn" type="button" class="cd-btn cd-btn-secondary" data-test="confirm-dialog-cancel" @click="settleConfirm(false)">{{ tx.cancel }}</button>
        <button
          :ref="req.infoOnly ? 'focusBtn' : undefined"
          type="button"
          class="cd-btn cd-btn-primary"
          data-test="confirm-dialog-ok"
          @click="settleConfirm(true)"
        >
          {{ okText }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cd-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.55);
}
.cd-box {
  width: 100%;
  max-width: 360px;
  padding: 18px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg-card);
  color: var(--text);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}
.cd-text {
  margin: 0 0 16px;
  font-size: 1em;
}
.cd-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.cd-btn {
  min-height: 40px;
  padding: 0 16px;
  border-radius: 10px;
  font: inherit;
  cursor: pointer;
}
.cd-btn-secondary {
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text);
}
.cd-btn-primary {
  border: 1px solid var(--accent);
  background: var(--accent);
  color: var(--accent-text);
}
</style>
