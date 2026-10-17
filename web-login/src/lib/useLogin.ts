import { ref } from 'vue'
import { sb } from './supabase'
import { authErrorText } from './authError'
import { postAuthTarget, ROUTES } from './routes'
import { t } from './i18n'
import { captureCurrent } from '../../../shared/accounts/accounts'

export type Mode = 'login' | 'register'
// Тип сообщения под формой (BACKLOG 58.5): ошибка — красным и сразу над кнопкой, остальное — спокойным цветом
export type MsgKind = 'info' | 'error' | 'ok'


// Порт логики login.js: вход по паролю, регистрация, вход через Google, и общий
// redirectAfterAuth() — онбординг пройден → дашборд, иначе → онбординг.
export function useLogin() {
  const mode = ref<Mode>('login')
  const email = ref('')
  const password = ref('')
  const msg = ref('')
  const msgKind = ref<MsgKind>('info')
  const say = (text: string, kind: MsgKind = 'info') => {
    msg.value = text
    msgKind.value = kind
  }
  const busy = ref(false)

  async function redirectAfterAuth() {
    const { data } = await sb.auth.getSession()
    const session = data.session
    if (!session) return
    captureCurrent() // BACKLOG 1081: новая запись сразу попадает в список записей устройства (страницу онбординга шапка пропускает)
    const { data: profile } = await sb.from('profiles').select('onboarded').eq('user_id', session.user.id).maybeSingle()
    window.location.href = postAuthTarget(profile)
  }

  // Вызывается при открытии страницы: если сессия уже есть (или мы вернулись из Google
  // OAuth) — сразу уходим, форма не нужна.
  async function checkExistingSession() {
    const { data } = await sb.auth.getSession()
    if (data.session) await redirectAfterAuth()
  }

  function setMode(next: Mode) {
    mode.value = next
    say('')
  }

  async function submit() {
    say(t('login_please_wait'))
    const e = email.value.trim()
    const p = password.value
    if (!e || !p) {
      say(t('login_fill_fields'), 'error')
      return
    }
    busy.value = true
    try {
      if (mode.value === 'login') {
        const { error } = await sb.auth.signInWithPassword({ email: e, password: p })
        if (error) {
          say(t('login_error_prefix') + authErrorText(error), 'error')
          return
        }
        await redirectAfterAuth()
      } else {
        const { data, error } = await sb.auth.signUp({ email: e, password: p })
        if (error) {
          say(t('login_error_prefix') + authErrorText(error), 'error')
          return
        }
        if (data.session) window.location.href = ROUTES.onboarding
        else say(t('login_signup_check_email'), 'ok')
      }
    } catch (err) {
      say(authErrorText(err), 'error')
    } finally {
      busy.value = false
    }
  }

  async function signInWithGoogle() {
    say(t('login_please_wait'))
    // ВАЖНО: этот адрес должен быть в списке разрешённых Redirect URLs проекта Supabase
    // (Authentication → URL Configuration), иначе Supabase вернёт на Site URL.
    const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + ROUTES.oauthReturn } })
    if (error) say(t('login_error_prefix') + authErrorText(error), 'error')
    // при успехе браузер сразу уходит на Google; возврат обработает checkExistingSession()
  }

  return { mode, email, password, msg, msgKind, busy, setMode, submit, signInWithGoogle, checkExistingSession }
}
