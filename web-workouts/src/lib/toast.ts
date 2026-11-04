import { ref } from 'vue'

// Порт showToast() из config.js (актуальная версия — контейнер #toast-container, а не
// более старая мёртвая перегрузка чуть выше неё в том же файле). Здесь — реактивное
// состояние, которое рисует Toast.vue, вместо ручной сборки DOM.
export type ToastType = 'success' | 'error'
export interface ToastAction { label: string; run: () => void }
interface ToastState {
  message: string
  type: ToastType
  id: number
  action?: ToastAction // необязательная кнопка («Отменить»); тост с кнопкой висит дольше
}

export const toast = ref<ToastState | null>(null)

let nextId = 0
let hideTimer: ReturnType<typeof setTimeout> | null = null

export function showToast(message: string, type: ToastType = 'success', opts: { action?: ToastAction; ms?: number } = {}) {
  if (hideTimer) clearTimeout(hideTimer)
  const id = ++nextId
  toast.value = { message, type, id, action: opts.action }
  hideTimer = setTimeout(() => {
    if (toast.value?.id === id) toast.value = null
  }, opts.ms ?? (opts.action ? 7000 : 2200))
}

export function runToastAction() {
  const a = toast.value?.action
  toast.value = null
  if (hideTimer) clearTimeout(hideTimer)
  a?.run()
}
