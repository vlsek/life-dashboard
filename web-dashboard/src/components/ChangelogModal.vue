<script setup lang="ts">
import EmojiText from './EmojiText.vue'
import { onMounted, ref } from 'vue'
import { getLang, t } from '../lib/i18n'
import { loadVersionInfo, type ChangelogEntry } from '../lib/version'

// Портировано из showChangelogModal() в config.js — открывается по клику на номер версии
// в сайдбаре (AppShell.vue). Данные общие для всех пилотов, см. lib/version.ts.
const emit = defineEmits<{ close: [] }>()
const entries = ref<ChangelogEntry[]>([])
const loaded = ref(false)
const error = ref(false)

onMounted(async () => {
  try {
    const info = await loadVersionInfo()
    entries.value = getLang() === 'ru' ? info.ru : info.en
  } catch {
    error.value = true
  } finally {
    loaded.value = true
  }
})
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal" data-test="changelog-modal">
      <h3><EmojiText :text="t('changelog_title')" /></h3>
      <p v-if="loaded && (error || entries.length === 0)" class="dim">{{ t('changelog_empty') }}</p>
      <template v-for="e in entries" :key="e.version">
        <h4 class="mb-1.5 mt-4 text-sm font-semibold">v{{ e.version }}{{ e.date ? ' — ' + e.date : '' }}</h4>
        <ul class="dim m-0 pl-5 text-sm">
          <li v-for="(c, i) in e.changes" :key="i">{{ c }}</li>
        </ul>
      </template>
      <div class="modal-actions">
        <button type="button" class="secondary" @click="emit('close')">{{ t('close') }}</button>
      </div>
    </div>
  </div>
</template>
