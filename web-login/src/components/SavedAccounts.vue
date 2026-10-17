<script setup lang="ts">
import { computed } from 'vue'
import { listAccounts, loadStore, switchTo } from '../../../shared/accounts/accounts'
import { t } from '../lib/i18n'

// Записи, уже сохранённые на этом устройстве (BACKLOG 1081): «войти как …» одним нажатием; в режиме «Добавить запись» (?add=1) — ещё и «Отмена».
const params = new URLSearchParams(location.search)
const adding = params.get('add') === '1'
const accounts = computed(() => listAccounts())

function enter(id: string) {
  if (switchTo(id)) location.href = '/'
}
// Отмена добавления: вернуться в запись, из которой пришли (последняя снятая — её снимал prepareAdd)
function cancelAdd() {
  const newest = [...loadStore()].sort((a, b) => b.savedAt - a.savedAt)[0]
  if (newest && switchTo(newest.id)) location.href = '/'
}
</script>

<template>
  <div v-if="accounts.length || adding" class="mb-3 w-full max-w-[360px] rounded-lg border p-3 text-sm" style="border-color: var(--border); background: var(--bg-card)" data-test="saved-accounts">
    <p v-if="adding" class="mb-2" data-test="saved-adding">{{ t('acc_adding_hint') }}</p>
    <p v-if="accounts.length" class="mb-1.5" style="color: var(--text-dim)">{{ t('acc_saved_title') }}</p>
    <button
      v-for="a in accounts"
      :key="a.id"
      type="button"
      class="mb-1.5 block w-full cursor-pointer rounded-lg border px-3 py-2 text-left"
      style="border-color: var(--border); color: var(--text); background: transparent"
      :data-test="'saved-' + a.id"
      @click="enter(a.id)"
    >
      {{ t('acc_enter_as') }} {{ a.email || t('acc_no_email') }}
    </button>
    <button v-if="adding && accounts.length" type="button" class="mt-1 w-full cursor-pointer text-center underline" style="color: var(--text-dim)" data-test="saved-cancel" @click="cancelAdd">{{ t('acc_cancel_add') }}</button>
  </div>
</template>
