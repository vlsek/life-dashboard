<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../lib/i18n'
import { THEME_KEYS, type ThemeKey } from '../lib/theme'
import { THEME_PREVIEW } from '../lib/themePreview'
import EmojiText from './EmojiText.vue'

// Карточка темы: превью (цвета самой темы, независимо от выбранной сейчас), название, «Применить» и сердечко «любимая».
const props = defineProps<{ themeKey: ThemeKey; active: boolean; favorite: boolean; canToggle: boolean }>()
const emit = defineEmits<{ apply: []; toggleFavorite: [] }>()

const pv = computed(() => THEME_PREVIEW[props.themeKey])
const label = computed(() => t(THEME_KEYS[props.themeKey] as never))
const favLabel = computed(() => (props.favorite ? t('cust_theme_fav_remove') : props.canToggle ? t('cust_theme_fav_add') : t('cust_theme_fav_limit')))
</script>

<template>
  <div
    class="flex flex-col gap-2 rounded-xl border p-3"
    :style="{ background: 'var(--bg-card)', borderColor: active ? 'var(--accent)' : 'var(--border)' }"
    :data-testid="'theme-' + themeKey"
    :data-active="active"
    :data-favorite="favorite"
  >
    <!-- Образец темы (BACKLOG 944): мини-диаграмма в основных цветах самой темы — карточка, акцент (кольцо прогресса),
         успех и вода (столбики), текст (подписи). Цвета берутся из THEME_PREVIEW, а не из выбранной сейчас темы. -->
    <svg viewBox="0 0 120 56" class="w-full rounded-lg" :style="{ background: pv.bg, border: '1px solid ' + pv.card }" role="img" :aria-label="label" data-testid="theme-preview">
      <rect x="6" y="6" width="108" height="44" rx="6" :fill="pv.card" />
      <circle cx="32" cy="28" r="13" fill="none" :stroke="pv.text" stroke-opacity="0.18" stroke-width="5" />
      <circle cx="32" cy="28" r="13" fill="none" :stroke="pv.accent" stroke-width="5" stroke-linecap="round" stroke-dasharray="52 82" transform="rotate(-90 32 28)" data-testid="preview-ring" />
      <rect x="58" y="30" width="9" height="14" rx="2" :fill="pv.water" data-testid="preview-bar" />
      <rect x="71" y="22" width="9" height="22" rx="2" :fill="pv.success" data-testid="preview-bar" />
      <rect x="84" y="14" width="9" height="30" rx="2" :fill="pv.accent" data-testid="preview-bar" />
      <rect x="58" y="10" width="26" height="3" rx="1.5" :fill="pv.text" fill-opacity="0.75" />
    </svg>
    <div class="flex items-center justify-between gap-1">
      <p class="m-0 text-sm font-medium"><EmojiText :text="label" /></p>
      <button
        type="button"
        class="secondary px-1.5 py-1"
        :style="{ color: favorite ? 'var(--accent)' : 'var(--text-dim)', opacity: !favorite && !canToggle ? 0.45 : 1 }"
        :aria-pressed="favorite"
        :aria-label="favLabel"
        :title="favLabel"
        :disabled="!canToggle"
        data-testid="fav"
        @click="emit('toggleFavorite')"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" :fill="favorite ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 20.4l-1.3-1.2C6 14.9 3 12.2 3 8.9 3 6.3 5 4.3 7.6 4.3c1.5 0 2.9.7 3.8 1.8l.6.8.6-.8c.9-1.1 2.3-1.8 3.8-1.8C19 4.3 21 6.3 21 8.9c0 3.3-3 6-7.7 10.3L12 20.4z" />
        </svg>
      </button>
    </div>
    <button v-if="!active" type="button" class="px-3 py-1 text-sm" data-testid="apply" @click="emit('apply')">{{ t('cust_theme_apply') }}</button>
    <p v-else class="dim m-0 text-center text-xs" data-testid="applied">{{ t('cust_theme_active') }}</p>
  </div>
</template>
