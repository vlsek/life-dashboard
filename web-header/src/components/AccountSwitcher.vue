<script setup lang="ts">
import { ref } from 'vue'
import { MAX_ACCOUNTS } from '../../../shared/accounts/accounts'
import { accountsForUi, addAccount, switchAccount } from '../lib/accountsActions'
import { t } from '../lib/i18n'

// Записи на этом устройстве (BACKLOG 1081): строка под именем в боковом меню; список раскрывается по нажатию. Подпись записи — почта.
const open = ref(false)
const list = ref(accountsForUi())
function toggle() {
  list.value = accountsForUi()
  open.value = !open.value
}
</script>

<template>
  <div class="gh-acc" data-test="acc-switcher">
    <button type="button" class="gh-acc-toggle" :aria-expanded="open" data-test="acc-toggle" @click="toggle">
      <span>⇄ {{ t('acc_title') }}</span>
      <span class="gh-dim" data-test="acc-count">{{ list.length }}/{{ MAX_ACCOUNTS }}</span>
    </button>
    <ul v-if="open" class="gh-acc-list" data-test="acc-list">
      <li v-for="a in list" :key="a.id">
        <span v-if="a.active" class="gh-acc-item gh-acc-active" data-test="acc-active" :aria-current="true">● {{ a.email || t('acc_no_email') }}</span>
        <button v-else type="button" class="gh-acc-item" :data-test="'acc-switch-' + a.id" :title="t('acc_switch_to')" @click="switchAccount(a.id)">○ {{ a.email || t('acc_no_email') }}</button>
      </li>
      <li>
        <button v-if="list.length < MAX_ACCOUNTS" type="button" class="gh-acc-item" data-test="acc-add" @click="addAccount()">＋ {{ t('acc_add') }}</button>
        <span v-else class="gh-acc-item gh-dim" data-test="acc-full">{{ t('acc_full') }}</span>
      </li>
    </ul>
  </div>
</template>
