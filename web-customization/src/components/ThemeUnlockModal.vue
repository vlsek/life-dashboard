<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../lib/i18n'
import { THEME_KEYS, type ThemeKey } from '../lib/theme'
import { themeUnlockInfo } from '../lib/themeUnlockInfo'
import EmojiText from './EmojiText.vue'

// Окно «как получить закрытую тему» (BACKLOG 49.10, просьба владельца): название темы, условие и достижение; ведёт на страницу «Достижения».
const props = defineProps<{ themeKey: ThemeKey }>()
defineEmits<{ close: [] }>()
const info = computed(() => themeUnlockInfo(props.themeKey))
const title = computed(() => t(THEME_KEYS[props.themeKey] as never))
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" data-testid="theme-unlock-modal" @click.self="$emit('close')">
    <div class="w-full max-w-md rounded-2xl border p-5" role="dialog" aria-modal="true" style="background: var(--bg-card); border-color: var(--border); color: var(--text)">
      <h3 class="text-lg font-bold"><EmojiText :text="'🔒 ' + t('cust_theme_unlock_title').replace('{name}', title)" /></h3>
      <template v-if="info">
        <p class="mt-3 text-sm leading-relaxed" data-testid="unlock-intro">{{ t('cust_theme_unlock_intro') }}</p>
        <p class="mt-2 rounded-lg border px-3 py-2 text-sm font-medium" style="border-color: var(--accent)" data-testid="unlock-achievement">«{{ info.achievementName }}»</p>
        <p v-if="info.condition" class="mt-2 text-sm" data-testid="unlock-condition">{{ info.condition }}</p>
      </template>
      <p v-else class="mt-3 text-sm" data-testid="unlock-unknown">{{ t('cust_theme_unlock_unknown') }}</p>
      <div class="mt-4 flex flex-wrap justify-end gap-2">
        <a href="/achievements/" class="rounded-lg border px-3 py-1.5 text-sm font-medium" style="border-color: var(--accent); color: var(--accent)" data-testid="unlock-open-achievements">{{ t('cust_theme_unlock_open') }}</a>
        <button type="button" class="rounded-lg border px-3 py-1.5 text-sm" style="border-color: var(--border); color: var(--text)" data-testid="unlock-close" @click="$emit('close')">{{ t('close') }}</button>
      </div>
    </div>
  </div>
</template>
