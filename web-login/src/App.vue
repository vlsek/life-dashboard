<script setup lang="ts">
import { onMounted } from 'vue'
import LangThemeBar from './components/LangThemeBar.vue'
import PasswordInput from './components/PasswordInput.vue'
import { useLogin } from './lib/useLogin'
import { t } from './lib/i18n'
import EmojiText from './components/EmojiText.vue'
import SplashFlameLive from './components/splash/SplashFlameLive.vue'
import SavedAccounts from './components/SavedAccounts.vue'

const { mode, email, password, msg, msgKind, busy, setMode, submit, signInWithGoogle, checkExistingSession } = useLogin()
onMounted(checkExistingSession)

</script>

<template>
  <main class="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-8">
    <LangThemeBar />
    <!-- Живое пламя в цвете акцента выбранной темы (BACKLOG 746): тот же компонент и стили, что у заставки и логотипа в шапке -->
    <SplashFlameLive :size="64" data-test="login-flame" class="mb-2" />
    <h1 class="mb-4 text-center text-2xl font-semibold"><EmojiText :text="t('login_title')" /></h1>

    <SavedAccounts />

    <div class="w-full max-w-[360px] rounded-lg border p-4" style="border-color: var(--border); background: var(--bg-card)">
      <!-- Переключатель «Вход / Регистрация» — сегментированный: активная вкладка выглядит нажатой кнопкой, а не просто подчёркнутым словом (BACKLOG 58.5) -->
      <div class="auth-tabs mb-4" role="tablist" :aria-label="t('login_title')">
        <button type="button" role="tab" class="auth-tab cursor-pointer" :class="{ 'auth-tab-on': mode === 'login' }" :aria-selected="mode === 'login'" data-test="tab-login" @click="setMode('login')">{{ t('tab_login') }}</button>
        <button type="button" role="tab" class="auth-tab cursor-pointer" :class="{ 'auth-tab-on': mode === 'register' }" :aria-selected="mode === 'register'" data-test="tab-register" @click="setMode('register')">{{ t('tab_register') }}</button>
      </div>

      <form @submit.prevent="submit">
        <label class="block">
          <span class="auth-label">{{ t('email_label') }}</span>
          <input
            v-model="email"
            type="email"
            autocomplete="email"
            class="auth-input mt-1.5 w-full"
            placeholder="name@example.com"
            inputmode="email"
            autocapitalize="off"
            data-test="login-email"
          />
        </label>
        <label class="mt-3.5 block">
          <span class="auth-label">{{ t('password_label') }}</span>
          <div class="mt-1.5"><PasswordInput v-model="password" :autocomplete="mode === 'register' ? 'new-password' : 'current-password'" /></div>
          <span v-if="mode === 'register'" class="auth-hint" data-test="password-hint">{{ t('password_hint_register') }}</span>
        </label>
        <!-- Сообщение (ошибка / «подождите» / «проверь почту») — прямо над кнопкой, где его видно, а не внизу карточки под Google -->
        <p v-if="msg" class="auth-msg" :class="'auth-msg-' + msgKind" :role="msgKind === 'error' ? 'alert' : 'status'" aria-live="polite" data-test="login-msg">{{ msg }}</p>
        <button
          type="submit"
          class="auth-btn mt-4 w-full cursor-pointer font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          style="background: var(--accent); color: var(--accent-text)"
          data-test="login-submit"
          :disabled="busy"
          :aria-busy="busy"
        >{{ mode === 'login' ? t('login_btn') : t('register_btn') }}</button>
      </form>

      <div class="my-3.5 flex items-center gap-2 text-sm" style="color: var(--text-dim)">
        <span class="h-px flex-1" style="background: var(--border)"></span>
        {{ t('login_or_divider') }}
        <span class="h-px flex-1" style="background: var(--border)"></span>
      </div>

      <button
        type="button"
        class="auth-btn flex w-full cursor-pointer items-center justify-center gap-2.5 border bg-transparent hover:opacity-90"
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

    </div>

    <details class="mt-3 w-full max-w-[360px] text-sm" data-test="login-about">
      <summary class="cursor-pointer text-center" style="color: var(--text-dim)" data-test="login-about-toggle">{{ t('login_about_title') }}</summary>
      <div class="mt-2 rounded-lg border p-3 leading-relaxed" style="border-color: var(--border); background: var(--bg-card)">
        <p>{{ t('login_about_text') }}</p>
        <p class="mt-2">
          <a href="https://portfolio.orneryhero.workers.dev/" target="_blank" rel="noopener" style="color: var(--accent)" data-test="login-about-resume">{{ t('login_about_resume') }}</a>
          · <a href="https://t.me/vsekorolev" target="_blank" rel="noopener" style="color: var(--accent)">Telegram</a>
        </p>
      </div>
    </details>

  </main>
</template>
