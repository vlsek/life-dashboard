<script setup lang="ts">
import SplashFlameLive from './splash/SplashFlameLive.vue'
import SplashFireRing from './splash/SplashFireRing.vue'
import { t } from '../lib/i18n'
import { readSplashVariant, type SplashVariant } from '../lib/splashVariants'

// Заставка на время фоновой подгрузки (BACKLOG 6.1 + 16): вариант выбирается реестром splashVariants.ts —
// «живое пламя» (по умолчанию), «огненный круг» или «классика» (контур с мерцанием, v1.70, не удалена).
// Предпросмотр: добавить ?splash=ring | flame | classic к адресу (запоминается). role="status" — скринридер
// читает подпись; при prefers-reduced-motion и html[data-motion="off"] анимации выключены (style.css).
// Статичная копия разметки лежит в index.html и видна до загрузки бандла — правишь здесь, поправь и там.
const props = defineProps<{ variant?: SplashVariant }>()
const variant: SplashVariant = props.variant ?? readSplashVariant()
</script>

<template>
  <div class="splash" role="status" aria-live="polite" :data-variant="variant" data-test="splash">
    <SplashFlameLive v-if="variant === 'flame'" />
    <SplashFireRing v-else-if="variant === 'ring'" />
    <svg v-else class="splash-flame" viewBox="0 0 32 32" width="72" height="72" aria-hidden="true">
      <g transform="translate(16 16) scale(1.04) translate(-16 -16) translate(3.3 0.7)">
        <path
          class="fl-outer"
          d="M16.5 0.5c1.2 5.3-3.2 6.8-3.5 11a3.2 3.2 0 0 0 6.4 0.2c2.1 1.1 3.1 4.3 3.1 7.5a9.5 10.5 0 1 1-19.5 0.3c-0.1-6.4 4.2-9.7 6.3-14 1.1-2.2 2.1-3.5 7.2-5z"
        />
        <path
          class="fl-inner"
          d="M16.3 11.2c.6 3.2-1.6 3.8-1.6 6a1.6 1.6 0 0 0 3.2 0c1.1 3.2-.5 7-3.7 7a5.3 5.3 0 0 1-5.3-5.4c0-3.7 3.2-5.3 5.3-9 .4-.7.9-1.3 2.1-2.6z"
        />
      </g>
    </svg>
    <p class="splash-text">{{ t('loading_ellipsis') }}</p>
  </div>
</template>
