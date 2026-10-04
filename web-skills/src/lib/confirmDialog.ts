// Подтверждение действия в стиле сайта вместо нативных confirm()/alert() браузера (BACKLOG 567, «Аудит устаревшего оформления»).
// Использование: `if (!(await confirmDialog(t('…_confirm_delete')))) return`. Окно рисует ConfirmDialogHost.vue (стоит в AppShell).
// Без хоста на странице promise не разрешится — поэтому хост лежит в оболочке, которая есть у каждой страницы.
// ОДИНАКОВАЯ КОПИЯ в пилотах challenges, goals, languages, milestones, shop, skills — менять ВМЕСТЕ.
import { reactive } from 'vue'

export interface ConfirmOptions {
  okLabel?: string // подпись главной кнопки; по умолчанию «Удалить» / «Delete»
  infoOnly?: boolean // только сообщение и «OK», без «Отмены» (замена alert)
}

export interface ConfirmRequest extends ConfirmOptions {
  message: string
  resolve: (value: boolean) => void
}

export const confirmState = reactive<{ current: ConfirmRequest | null }>({ current: null })

export function confirmDialog(message: string, opts: ConfirmOptions = {}): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    // Новый запрос, пока висит прежний: прежний считается отменённым (два окна подряд не копятся).
    confirmState.current?.resolve(false)
    confirmState.current = { ...opts, message, resolve }
  })
}

export function settleConfirm(value: boolean): void {
  const cur = confirmState.current
  if (!cur) return
  confirmState.current = null
  cur.resolve(value)
}
