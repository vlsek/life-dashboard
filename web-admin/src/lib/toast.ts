import { ref } from 'vue'

// Порт showToast() из config.js (актуальная версия — контейнер #toast-container, а не
// более старая мёртвая перегрузка чуть выше неё в том же файле). Здесь — реактивное
// состояние, которое рисует Toast.vue, вместо ручной сборки DOM.
export type ToastType = 'success' | 'error'
interface ToastState {
  message: string
  type: ToastType
  id: number
}

export const toast = ref<ToastState | null>(null)

let nextId = 0
let hideTimer: ReturnType<typeof setTimeout> | null = null

export function showToast(message: string, type: ToastType = 'success') {
  if (hideTimer) clearTimeout(hideTimer)
  const id = ++nextId
  toast.value = { message, type, id }
  hideTimer = setTimeout(() => {
    if (toast.value?.id === id) toast.value = null
  }, 2200)
}
