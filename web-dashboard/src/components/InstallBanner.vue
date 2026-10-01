<script setup lang="ts">
import { computed, ref } from 'vue'
import Icon from './Icon.vue'
import { t } from '../lib/i18n'
import { dismissInstall, installAvailable, isIOSDevice, isInstallDismissed, isStandaloneApp, promptInstall } from '../lib/install'

// Закрывающаяся плашка «Установить приложение» (BACKLOG п.2). Видна, если приложение ещё не установлено
// (не standalone), плашку не закрывали последние 14 дней и есть что предложить: нативный диалог браузера
// (`beforeinstallprompt`) или инструкция для iOS. Крестик прячет на 14 дней.
const dismissed = ref(isInstallDismissed())
const iosHint = ref(false)
const ios = isIOSDevice()
const standalone = isStandaloneApp()

const visible = computed(() => !standalone && !dismissed.value && (installAvailable.value || ios))

async function onInstall() {
  const shown = await promptInstall()
  if (!shown && ios) iosHint.value = true // на iOS нативного диалога нет — показываем, что нажать вручную
}
function close() {
  dismissInstall()
  dismissed.value = true
}
</script>

<template>
  <div v-if="visible" class="mb-3 rounded-lg border p-2.5" data-test="install-banner" style="border-color: var(--border); border-left: 3px solid var(--accent); background: var(--bg-card)">
    <div class="flex items-center gap-2.5">
      <div class="flex-1 text-sm">
        <strong>{{ t('install_banner_title') }}</strong>
        <span class="dim"> {{ t('install_banner_text') }}</span>
      </div>
      <button type="button" data-test="install-btn" @click="onInstall">{{ t('install_banner_btn') }}</button>
      <button type="button" class="secondary px-2" data-test="install-dismiss" :aria-label="t('dash_close_btn')" @click="close"><Icon name="x" /></button>
    </div>
    <p v-if="iosHint" class="dim mt-2 text-sm" data-test="install-ios-hint">{{ t('install_banner_ios') }}</p>
  </div>
</template>
