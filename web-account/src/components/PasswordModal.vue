<script setup lang="ts">
import { computed, ref } from 'vue'
import PasswordInput from './PasswordInput.vue'
import { t } from '../lib/i18n'
import { submitPasswordChange, type PasswordChangeFailure } from '../lib/passwordChange'

// Отдельное окно смены пароля (BACKLOG 11): текущий пароль → новый → повтор. Аккаунту без пароля
// (вход только через Google) поле «текущий» не показывается — он задаёт первый пароль.
const props = defineProps<{ email: string | null; hasPassword: boolean }>()
const emit = defineEmits<{ close: []; changed: [] }>()

const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const message = ref('')
const busy = ref(false)

const MESSAGES = {
  old_required: 'acc_old_password_required',
  too_short: 'acc_password_too_short',
  mismatch: 'acc_passwords_mismatch',
  same_as_old: 'acc_password_same_as_old',
  wrong_old: 'acc_old_password_wrong',
} as const satisfies Record<Exclude<PasswordChangeFailure, 'error'>, string>

const title = computed(() => t('acc_change_password_h3'))

async function submit() {
  if (busy.value) return
  busy.value = true
  message.value = t('dash_saving_btn')
  const res = await submitPasswordChange({
    email: props.email,
    hasPassword: props.hasPassword,
    oldPassword: oldPassword.value,
    newPassword: newPassword.value,
    confirmPassword: confirmPassword.value,
  })
  busy.value = false
  if (res.ok) {
    message.value = ''
    emit('changed')
    return
  }
  message.value = res.reason === 'error' ? t('acc_error_prefix') + (res.message ?? '') : t(MESSAGES[res.reason])
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="emit('close')">
    <div class="w-full max-w-sm rounded-2xl border p-5" style="background: var(--bg-card); border-color: var(--border); color: var(--text)" data-test="password-modal">
      <h3 class="mb-3 text-lg font-bold">{{ title }}</h3>

      <p v-if="!hasPassword" class="mb-3 text-sm" style="color: var(--text-dim)" data-test="no-password-hint">{{ t('acc_password_none_hint') }}</p>
      <label v-else class="block text-sm">
        <span>{{ t('acc_old_password_label') }}</span>
        <PasswordInput v-model="oldPassword" class="mt-1" data-test="old-password" />
      </label>

      <label class="mt-3 block text-sm">
        <span>{{ t('acc_new_password_label') }}</span>
        <PasswordInput v-model="newPassword" class="mt-1" data-test="new-password" />
      </label>
      <label class="mt-3 block text-sm">
        <span>{{ t('acc_confirm_password_label') }}</span>
        <PasswordInput v-model="confirmPassword" class="mt-1" data-test="confirm-password" />
      </label>

      <p v-if="message" class="mt-2.5 text-sm" style="color: var(--text-dim)" data-test="password-msg">{{ message }}</p>

      <div class="mt-4 flex justify-end gap-2">
        <button type="button" class="rounded-lg border px-4 py-2 text-sm" style="border-color: var(--border); background: var(--bg); color: var(--text)" @click="emit('close')">{{ t('cancel') }}</button>
        <button type="button" class="rounded-lg px-4 py-2 text-sm font-medium" style="background: var(--accent); color: var(--accent-text)" :disabled="busy" data-test="submit" @click="submit">{{ t('acc_change_password_btn') }}</button>
      </div>
    </div>
  </div>
</template>
