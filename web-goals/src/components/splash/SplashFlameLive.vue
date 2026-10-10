<script setup lang="ts">
// Вариант «живое пламя» (v4.20): ОДНО пламя — единый контур, который плавно перетекает между тремя формами
// (CSS `d: path()` в style.css, .splash-live), два слоя глубины (внешний, средний) и светлая сердцевина;
// всё группой слегка качается (запасной вариант для браузеров без морфинга контура), над ним поднимаются искры.
// Чистый SVG + CSS, без библиотек. Статичная копия для index.html — .pre-live; контуры должны совпадать
// (проверяет splashLoader.test.ts). Тот же компонент оживляет логотип слева сверху в шапке (AppShell.vue):
// там size=30 и без искр. Генерируется scripts/apply_splash_flame.py — правь там.
withDefaults(defineProps<{ size?: number; sparks?: boolean }>(), { size: 80, sparks: true })
</script>

<template>
  <svg class="splash-live" :class="{ 'splash-live-sm': size < 48 }" viewBox="0 0 64 64" :width="size" :height="size" aria-hidden="true">
    <g class="flame-body">
      <path class="flame-layer layer-outer" d="M32 3C34.8 13 51.6 21 51.6 37C51.6 49 43.2 58 32 58C20.8 58 12.4 49 12.4 37C12.4 29 20.8 25 23.6 17C26.4 21 29.2 21 30.6 15C31.3 10 31.72 7 32 3Z" />
      <path class="flame-layer layer-mid" d="M32 3C34.8 13 51.6 21 51.6 37C51.6 49 43.2 58 32 58C20.8 58 12.4 49 12.4 37C12.4 29 20.8 25 23.6 17C26.4 21 29.2 21 30.6 15C31.3 10 31.72 7 32 3Z" />
      <path class="flame-layer layer-core" d="M32 30C33.4 36 43.2 40 43.2 47C43.2 53 37.6 58 32 58C26.4 58 20.8 53 20.8 47C20.8 40 30.6 36 32 30Z" />
    </g>
    <circle v-if="sparks" class="spark" cx="22.2" cy="14" r="1.3" style="--dx: -5px; --d: 2.1s; --o: 0s" />
    <circle v-if="sparks" class="spark" cx="34.8" cy="10" r="1.1" style="--dx: 3px; --d: 1.7s; --o: -0.6s" />
    <circle v-if="sparks" class="spark" cx="44.6" cy="16" r="1.4" style="--dx: 6px; --d: 2.4s; --o: -1.2s" />
    <circle v-if="sparks" class="spark" cx="29.2" cy="12" r="0.9" style="--dx: -2px; --d: 1.9s; --o: -1.7s" />
  </svg>
</template>
