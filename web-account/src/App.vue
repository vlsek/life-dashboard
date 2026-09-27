<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAuth } from './lib/useAuth'
import { sb } from './lib/supabase'
import { t } from './lib/i18n'
import { showToast } from './lib/toast'
import AppShell from './components/AppShell.vue'
import PasswordInput from './components/PasswordInput.vue'
import Icon from './components/Icon.vue'
import Toast from './components/Toast.vue'

// Порт account.js/account.html: смена пароля, смена почты, привязка Google-аккаунта.
// Данных, кроме сессии, странице не нужно — useAuth() вместо полного useAuthAndData().
const { auth } = useAuth()

const newPassword = ref('')
const confirmPassword = ref('')
const passwordMsg = ref('')
async function changePassword() {
  if (!newPassword.value || newPassword.value.length < 6) {
    passwordMsg.value = t('acc_password_too_short')
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    passwordMsg.value = t('acc_passwords_mismatch')
    return
  }
  passwordMsg.value = t('dash_saving_btn')
  const { error } = await sb.auth.updateUser({ password: newPassword.value })
  if (error) {
    passwordMsg.value = t('acc_error_prefix') + error.message
    return
  }
  passwordMsg.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  showToast(t('acc_password_changed_toast'))
}

const newEmail = ref('')
const emailMsg = ref('')
async function changeEmail() {
  const v = newEmail.value.trim()
  if (!v || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
    emailMsg.value = t('acc_email_invalid')
    return
  }
  if (auth.value.status === 'ready' && v === auth.value.userEmail) {
    emailMsg.value = t('acc_email_same')
    return
  }
  emailMsg.value = t('dash_saving_btn')
  const { error } = await sb.auth.updateUser({ email: v })
  if (error) {
    emailMsg.value = t('acc_error_prefix') + error.message
    return
  }
  emailMsg.value = ''
  newEmail.value = ''
  showToast(t('acc_email_change_requested_toast'))
}

// null = ещё не знаем, true/false = знаем. Порт refreshGoogleLinkStatus(); вызывается
// один раз, как только сессия готова (аналог вызова в конце IIFE в account.js).
const googleLinked = ref<boolean | null>(null)
const googleError = ref('')
async function refreshGoogleLinkStatus() {
  const { data, error } = await sb.auth.getUserIdentities()
  if (error) {
    googleError.value = t('acc_error_prefix') + error.message
    return
  }
  googleLinked.value = (data?.identities || []).some((i) => i.provider === 'google')
}
watch(
  auth,
  (v) => {
    if (v.status === 'ready') refreshGoogleLinkStatus()
  },
  { immediate: true },
)

async function linkGoogle() {
  const { error } = await sb.auth.linkIdentity({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/account-vue/' },
  })
  if (error) googleError.value = t('acc_error_prefix') + error.message
  // при успехе браузер уводит на Google и возвращает обратно на эту же страницу
}

// tIcon('acc_google_linked') в оригинале рисует ведущий эмодзи ✅ как SVG через отдельную
// карту LEADING_EMOJI_ICONS — тут не портировали всю эту машинерию ради одной строки,
// просто рисуем иконку 'done' и остаток текста без ведущего эмодзи.
const googleLinkedRest = computed(() => t('acc_google_linked').replace(/^\u2705\s*/, ''))
</script>

<template>
  <AppShell :user-email="auth.status === 'ready' ? auth.userEmail : null" />
  <main class="mx-auto max-w-xl px-4 pb-16 pt-6">
    <h1 class="mb-4 text-xl font-bold">{{ t('acc_h1') }}</h1>

    <div v-if="auth.status === 'loading' || auth.status === 'redirecting'" class="text-sm" style="color: var(--text-dim)">…</div>

    <template v-else>
      <div class="mb-4 rounded-xl border p-4" style="border-color: var(--border); background: var(--bg-card)">
        <h3 class="mb-3 font-bold">{{ t('acc_change_password_h3') }}</h3>
        <label class="block text-sm">
          <span>{{ t('acc_new_password_label') }}</span>
          <PasswordInput v-model="newPassword" class="mt-1" />
        </label>
        <label class="mt-3 block text-sm">
          <span>{{ t('acc_confirm_password_label') }}</span>
          <PasswordInput v-model="confirmPassword" class="mt-1" />
        </label>
        <button
          type="button"
          class="mt-4 rounded-lg px-4 py-2 text-sm font-medium"
          style="background: var(--accent); color: var(--accent-text)"
          @click="changePassword"
        >
          {{ t('acc_change_password_btn') }}
        </button>
        <p v-if="passwordMsg" class="mt-2.5 text-sm" style="color: var(--text-dim)">{{ passwordMsg }}</p>
      </div>

      <div class="mb-4 rounded-xl border p-4" style="border-color: var(--border); background: var(--bg-card)">
        <h3 class="mb-3 font-bold">{{ t('acc_change_email_h3') }}</h3>
        <p class="mb-3 text-sm" style="color: var(--text-dim)">
          {{ t('acc_current_email_label') }}: <span>{{ auth.status === 'ready' ? auth.userEmail : '' }}</span>
        </p>
        <label class="block text-sm">
          <span>{{ t('acc_new_email_label') }}</span>
          <input
            v-model="newEmail"
            type="email"
            class="mt-1 w-full rounded-lg border px-2.5 py-1.5 text-sm"
            style="border-color: var(--border); background: var(--bg); color: var(--text)"
          />
        </label>
        <button
          type="button"
          class="mt-4 rounded-lg px-4 py-2 text-sm font-medium"
          style="background: var(--accent); color: var(--accent-text)"
          @click="changeEmail"
        >
          {{ t('acc_change_email_btn') }}
        </button>
        <p v-if="emailMsg" class="mt-2.5 text-sm" style="color: var(--text-dim)">{{ emailMsg }}</p>
      </div>

      <div class="rounded-xl border p-4" style="border-color: var(--border); background: var(--bg-card)">
        <h3 class="mb-3 font-bold">{{ t('acc_google_h3') }}</h3>
        <p v-if="googleError" class="mb-3 text-sm" style="color: var(--text-dim)">{{ googleError }}</p>
        <p v-else-if="googleLinked === true" class="mb-3 flex items-center gap-1.5 text-sm" style="color: var(--text-dim)">
          <Icon name="done" extra-style="margin-right:0.15em" /> {{ googleLinkedRest }}
        </p>
        <template v-else-if="googleLinked === false">
          <p class="mb-3 text-sm" style="color: var(--text-dim)">{{ t('acc_google_not_linked') }}</p>
          <button
            type="button"
            class="rounded-lg border px-4 py-2 text-sm"
            style="border-color: var(--border); color: var(--text)"
            @click="linkGoogle"
          >
            {{ t('acc_link_google_btn') }}
          </button>
        </template>
      </div>
    </template>
  </main>
  <Toast />
</template>
