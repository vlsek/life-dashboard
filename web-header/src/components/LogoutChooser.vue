<script setup lang="ts">
import { ref } from 'vue'
import { listAccounts } from '../../../shared/accounts/accounts'
import { logoutEverywhere, logoutThis } from '../lib/accountsActions'
import { t } from '../lib/i18n'

// «Выйти», когда на устройстве несколько записей (BACKLOG 1081): из текущей или из всех. Окно показывает шапка по вызову logout() пилота.
const emit = defineEmits<{ close: [] }>()
const accounts = listAccounts()
const current = accounts.find((a) => a.active)
const busy = ref(false)
async function run(fn: () => Promise<void>) {
  if (busy.value) return
  busy.value = true
  await fn()
}
</script>

<template>
  <div class="gh-backdrop" data-test="logout-chooser" @click.self="emit('close')">
    <div class="gh-modal" role="dialog" aria-modal="true">
      <h3>{{ t('acc_logout_title') }}</h3>
      <p class="gh-dim">{{ t('acc_logout_text') }}</p>
      <div class="gh-acc-actions">
        <button type="button" class="gh-btn gh-btn-primary" :disabled="busy" data-test="logout-this" @click="run(() => logoutThis())">
          {{ t('acc_logout_this') }}<template v-if="current?.email"> — {{ current.email }}</template>
        </button>
        <button type="button" class="gh-btn" :disabled="busy" data-test="logout-all" @click="run(() => logoutEverywhere())">{{ t('acc_logout_all') }} ({{ accounts.length }})</button>
        <button type="button" class="gh-btn" :disabled="busy" data-test="logout-cancel" @click="emit('close')">{{ t('acc_cancel') }}</button>
      </div>
    </div>
  </div>
</template>
