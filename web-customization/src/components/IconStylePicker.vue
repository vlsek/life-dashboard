<script setup lang="ts">
import { ref } from 'vue'
import { ICON_PATHS } from '../lib/icons'
import { ICON_DUOTONE_OPACITY, ICON_SHADOW, ICON_STYLES, ICON_STYLE_RULES, readIconStyle, writeIconStyle, type IconStyle } from '../lib/iconStyle'
import { t } from '../lib/i18n'

// Выбор стиля иконок (BACKLOG 44.18г): пять бесплатных карточек. Предпросмотр — те же значения (ICON_STYLE_RULES), что в CSS страниц, на пяти разных иконках.
// Выбор применяется сразу (атрибут на <html>), запоминается в localStorage `icon_style`.
const current = ref<IconStyle>(readIconStyle())
const saved = ref(true)
const label = (v: IconStyle): string => t(('cust_iconstyle_' + v) as never)
const choose = (v: IconStyle) => {
  saved.value = writeIconStyle(v)
  if (saved.value) current.value = v
}
const SAMPLE = ['home', 'goals', 'dumbbell', 'droplet', 'star'] as const
const attrs = (v: IconStyle) => {
  const r = v === 'outline' ? {} : ICON_STYLE_RULES[v]
  return {
    'stroke-width': ('strokeWidth' in r && r.strokeWidth) || 1.9,
    'stroke-linecap': ('linecap' in r && r.linecap) || 'round',
    'stroke-linejoin': ('linejoin' in r && r.linejoin) || 'round',
    style: 'shadow' in r && r.shadow ? `filter: ${ICON_SHADOW}` : 'duotone' in r && r.duotone ? `--duo: ${ICON_DUOTONE_OPACITY}` : undefined,
    class: 'duotone' in r && r.duotone ? 'iconstyle-duo' : undefined,
  }
}
</script>

<template>
  <div data-testid="iconstyle-picker">
    <p class="dim mb-2 text-xs">{{ t('cust_sec_iconstyle_hint') }}</p>
    <p v-if="!saved" class="mb-2 text-xs" style="color: var(--danger, #e5484d)" role="alert" data-testid="iconstyle-save-error">{{ t('cust_splash_save_error') }}</p>
    <div class="grid gap-2.5" style="grid-template-columns: repeat(auto-fill, minmax(min(11rem, 100%), 1fr))">
      <div
        v-for="v in ICON_STYLES"
        :key="v"
        class="flex flex-col gap-2 rounded-xl border p-3"
        :style="{ background: 'var(--bg-card)', borderColor: current === v ? 'var(--accent)' : 'var(--border)' }"
        :data-testid="'iconstyle-' + v"
        :data-active="current === v"
      >
        <div class="flex items-center justify-between gap-1" style="color: var(--text)" data-testid="iconstyle-preview">
          <svg v-for="n in SAMPLE" :key="n" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" aria-hidden="true" v-bind="attrs(v)" v-html="(ICON_PATHS as Record<string, string>)[n]"></svg>
        </div>
        <p class="m-0 text-sm font-medium">{{ label(v) }}</p>
        <button
          type="button"
          class="secondary px-2 py-1 text-sm"
          :disabled="current === v"
          :aria-pressed="current === v"
          :aria-label="label(v) + ': ' + (current === v ? t('cust_splash_selected') : t('cust_splash_choose'))"
          data-testid="iconstyle-choose"
          @click="choose(v)"
        >
          {{ current === v ? t('cust_splash_selected') : t('cust_splash_choose') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* предпросмотр «Дуотона»: та же заливка только замкнутых фигур, что в style.css страниц (ICON_FILL_TARGETS) */
.iconstyle-duo :deep(:is(circle, ellipse, rect, polygon, path[d$='z' i])) {
  fill: currentColor;
  fill-opacity: var(--duo);
}
</style>
