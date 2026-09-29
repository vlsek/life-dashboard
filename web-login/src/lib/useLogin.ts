import { ref } from 'vue'
import { sb } from './supabase'
import { describeError } from './auth'
import { postAuthTarget, ROUTES } from './routes'
import { t } from './i18n'

export type Mode = 'login' | 'register'

const labels = () => ({ unknownError: t('login_unknown_error'), errorCode: t('login_error_code'), unknownErrorConsole: t('login_unknown_error_console') })

// Порт логики login.js: вход по паролю, регистрация, вход через Google, и общий
// redirectAfterAuth() — онбординг пройден → дашборд, иначе → онбординг.
export function useLogin() {
  const mode = ref<Mode>('login')
  const email = ref('')
  const password = ref('')
  const msg = ref('')
  const busy = ref(false)

  async function redirectAfterAuth() {
    const { data } = await sb.auth.getSession()
    const session = data.session
    if (!session) return
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
    msg.value = ''
  }

  async function submit() {
    msg.value = t('login_please_wait')
    const e = email.value.trim()
    const p = password.value
    if (!e || !p) {
      msg.value = t('login_fill_fields')
      return
    }
    busy.value = true
    try {
      if (mode.value === 'login') {
        const { error } = await sb.auth.signInWithPassword({ email: e, password: p })
        if (error) {
          msg.value = t('login_error_prefix') + describeError(error, labels())
          return
        }
        await redirectAfterAuth()
      } else {
        const { data, error } = await sb.auth.signUp({ email: e, password: p })
        if (error) {
          msg.value = t('login_error_prefix') + describeError(error, labels())
          return
        }
        if (data.session) window.location.href = ROUTES.onboarding
        else msg.value = t('login_signup_check_email')
      }
    } catch (err) {
      msg.value = t('login_network_error_prefix') + describeError(err, labels())
    } finally {
      busy.value = false
    }
  }

  async function signInWithGoogle() {
    msg.value = t('login_please_wait')
    // ВАЖНО: этот адрес должен быть в списке разрешённых Redirect URLs проекта Supabase
    // (Authentication → URL Configuration), иначе Supabase вернёт на Site URL.
    const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + ROUTES.login } })
    if (error) msg.value = t('login_error_prefix') + describeError(error, labels())
    // при успехе браузер сразу уходит на Google; возврат обработает checkExistingSession()
  }

  return { mode, email, password, msg, busy, setMode, submit, signInWithGoogle, checkExistingSession }
}
