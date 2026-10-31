<script setup lang="ts">
import { getLang, t } from '../lib/i18n'
import { HOTKEY_PAGES, hotkeysHelpOpen } from '../lib/hotkeys'

// Шпаргалка по горячим клавишам (BACKLOG 79.8, срез 1); открывается по «?», закрывается по «?», Esc, клику по фону.
const lang = getLang() === 'en' ? 'en' : 'ru'
</script>

<template>
  <div v-if="hotkeysHelpOpen" class="gh-backdrop" @click.self="hotkeysHelpOpen = false">
    <div class="gh-modal" role="dialog" aria-modal="true" data-test="hotkeys-modal">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px">
        <h3 style="margin: 0">{{ t('hk_title') }}</h3>
        <button type="button" :aria-label="t('hk_close')" data-test="hotkeys-close" @click="hotkeysHelpOpen = false">✕</button>
      </div>
      <p class="gh-dim" style="margin: 0 0 10px; font-size: 12px">{{ t('hk_hint') }}</p>
      <ul style="list-style: none; margin: 0; padding: 0; columns: 2; column-gap: 16px">
        <li v-for="p in HOTKEY_PAGES" :key="p.letter" data-test="hotkeys-row" style="padding: 3px 0; break-inside: avoid">
          <kbd>g</kbd> <kbd>{{ p.letter }}</kbd> — {{ p[lang] }}
        </li>
      </ul>
      <p style="margin: 10px 0 0"><kbd>?</kbd> — {{ t('hk_toggle') }}</p>
    </div>
  </div>
</template>
