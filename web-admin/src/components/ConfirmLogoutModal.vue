<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { getLang } from '../lib/i18n'

// Подтверждение выхода (BACKLOG 18, «Выйти — с подтверждением»): защита от случайного нажатия. Окно
// САМОДОСТАТОЧНОЕ — свои тексты (RU/EN по getLang) и scoped-стили на токенах темы, без правок i18n.ts/style.css
// страницы: у части страниц нет общих классов .modal-*. Образец с общими стилями — web-dashboard/.
// «Отмена», Esc и клик по фону закрывают окно; фокус сразу на «Отмене» — случайный Enter не выходит.
const emit = defineEmits<{ confirm: []; cancel: [] }>()

const TEXTS = {
  ru: { title: 'Точно выйти?', text: 'Чтобы снова увидеть свои данные, нужно будет войти заново.', cancel: 'Отмена', logout: 'Выйти' },
  en: { title: 'Log out?', text: 'You will need to sign in again to see your data.', cancel: 'Cancel', logout: 'Log out' },
} as const
const tx = TEXTS[getLang()]

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
  <div class="logout-backdrop no-edge-swipe" @click.self="emit('cancel')">
    <div class="logout-box" role="alertdialog" aria-modal="true" aria-labelledby="logout-confirm-title" data-test="logout-confirm">
      <h3 id="logout-confirm-title">{{ tx.title }}</h3>
      <p class="logout-text">{{ tx.text }}</p>
      <div class="logout-actions">
        <button ref="cancelBtn" type="button" class="logout-btn logout-btn-secondary" data-test="logout-cancel" @click="emit('cancel')">{{ tx.cancel }}</button>
        <button type="button" class="logout-btn logout-btn-primary" data-test="logout-confirm-btn" @click="emit('confirm')">{{ tx.logout }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.logout-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.55);
}
.logout-box {
  width: 100%;
  max-width: 360px;
  padding: 18px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg-card);
  color: var(--text);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}
.logout-box h3 {
  margin: 0 0 8px;
  font-size: 1.1em;
}
.logout-text {
  margin: 0 0 16px;
  font-size: 0.9em;
  color: var(--text-dim);
}
.logout-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.logout-btn {
  min-height: 40px;
  padding: 0 16px;
  border-radius: 10px;
  font: inherit;
  cursor: pointer;
}
.logout-btn-secondary {
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text);
}
.logout-btn-primary {
  border: 1px solid var(--accent);
  background: var(--accent);
  color: var(--accent-text);
}
</style>
