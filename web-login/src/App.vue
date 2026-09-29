<script setup lang="ts">
import { onMounted } from 'vue'
import LangThemeBar from './components/LangThemeBar.vue'
import PasswordInput from './components/PasswordInput.vue'
import { useLogin } from './lib/useLogin'
import { ROUTES } from './lib/routes'
import { t } from './lib/i18n'

const { mode, email, password, msg, busy, setMode, submit, signInWithGoogle, checkExistingSession } = useLogin()
onMounted(checkExistingSession)

const tabStyle = (active: boolean) => ({
  borderBottom: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
  color: active ? 'var(--text)' : 'var(--text-dim)',
})
</script>

<template>
  <main class="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-8">
    <LangThemeBar />
    <h1 class="mb-4 text-center text-2xl font-semibold">{{ t('login_title') }}</h1>

    <div class="w-full max-w-[360px] rounded-lg border p-4" style="border-color: var(--border); background: var(--bg-card)">
      <div class="mb-4 flex">
        <button type="button" class="flex-1 bg-transparent py-2" :style="tabStyle(mode === 'login')" @click="setMode('login')">{{ t('tab_login') }}</button>
        <button type="button" class="flex-1 bg-transparent py-2" :style="tabStyle(mode === 'register')" @click="setMode('register')">{{ t('tab_register') }}</button>
      </div>

      <form @submit.prevent="submit">
        <label class="block text-sm">
          {{ t('email_label') }}
          <input
            v-model="email"
            type="email"
            autocomplete="email"
            class="mt-1 w-full rounded-lg border px-2.5 py-1.5"
            style="border-color: var(--border); background: var(--bg); color: var(--text)"
          />
        </label>
        <label class="mt-3 block text-sm">
          {{ t('password_label') }}
          <div class="mt-1"><PasswordInput v-model="password" /></div>
        </label>
        <button type="submit" class="mt-4 w-full rounded-lg py-2" :disabled="busy">{{ mode === 'login' ? t('login_btn') : t('register_btn') }}</button>
      </form>

      <div class="my-3.5 flex items-center gap-2 text-sm" style="color: var(--text-dim)">
        <span class="h-px flex-1" style="background: var(--border)"></span>
        {{ t('login_or_divider') }}
        <span class="h-px flex-1" style="background: var(--border)"></span>
      </div>

      <button
        type="button"
        class="flex w-full items-center justify-center gap-2.5 rounded-lg border bg-transparent py-2"
        style="border-color: var(--border); color: var(--text)"
        @click="signInWithGoogle"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.68-3.87 2.68-6.62z" />
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z" />
          <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z" />
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A8.6 8.6 0 0 0 9 0 9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
        </svg>
        {{ t('login_google_btn') }}
      </button>

      <p class="mt-2.5 text-sm" style="color: var(--text-dim)">{{ msg }}</p>
    </div>

    <p class="mt-5"><a :href="ROUTES.portfolio" class="text-sm" style="color: var(--text-dim)">{{ t('back_to_portfolio') }}</a></p>
  </main>
</template>
