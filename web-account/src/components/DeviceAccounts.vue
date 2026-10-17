<script setup lang="ts">
import { computed, ref } from 'vue'
import { MAX_ACCOUNTS, listAccounts, prepareAdd, switchTo } from '../../../shared/accounts/accounts'
import { t } from '../lib/i18n'

// «Записи на этом устройстве» (BACKLOG 1081): тот же список, что в боковом меню, но на странице «Аккаунт». До 3 записей; переключение — с перезагрузкой.
const accounts = ref(listAccounts())
const full = computed(() => accounts.value.length >= MAX_ACCOUNTS)
function enter(id: string) {
  if (switchTo(id)) location.reload()
}
function add() {
  if (prepareAdd()) location.href = '/login/?add=1'
}
</script>

<template>
  <div class="mt-4 rounded-xl border p-4" style="border-color: var(--border); background: var(--bg-card)" data-test="device-accounts">
    <h3 class="mb-1 font-bold">{{ t('acc_device_h3') }} <span class="text-sm font-normal" style="color: var(--text-dim)" data-test="device-count">{{ accounts.length }}/{{ MAX_ACCOUNTS }}</span></h3>
    <p class="mb-3 text-sm" style="color: var(--text-dim)">{{ t('acc_device_hint') }}</p>
    <ul class="mb-3 space-y-1.5">
      <li v-for="a in accounts" :key="a.id" class="flex items-center justify-between gap-2 text-sm">
        <span class="min-w-0 break-all" :style="{ fontWeight: a.active ? 600 : 400 }" :data-test="a.active ? 'device-active' : 'device-other'">{{ a.active ? '● ' : '○ ' }}{{ a.email || t('acc_device_no_email') }}</span>
        <button v-if="!a.active" type="button" class="shrink-0 rounded-lg border px-3 py-1" style="border-color: var(--border); color: var(--text)" :data-test="'device-switch-' + a.id" @click="enter(a.id)">{{ t('acc_device_switch') }}</button>
        <span v-else class="shrink-0 text-xs" style="color: var(--text-dim)">{{ t('acc_device_current') }}</span>
      </li>
    </ul>
    <button v-if="!full" type="button" class="rounded-lg px-4 py-2 text-sm font-medium" style="background: var(--accent); color: var(--accent-text)" data-test="device-add" @click="add">＋ {{ t('acc_device_add') }}</button>
    <p v-else class="text-sm" style="color: var(--text-dim)" data-test="device-full">{{ t('acc_device_full') }}</p>
  </div>
</template>
