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
      <path class="flame-layer layer-outer" d="M32 3C34 13 46 21 46 37C46 49 40 58 32 58C24 58 18 49 18 37C18 29 24 25 26 17C28 21 30 21 31 15C31.5 10 31.8 7 32 3Z" />
      <path class="flame-layer layer-mid" d="M32 3C34 13 46 21 46 37C46 49 40 58 32 58C24 58 18 49 18 37C18 29 24 25 26 17C28 21 30 21 31 15C31.5 10 31.8 7 32 3Z" />
      <path class="flame-layer layer-core" d="M32 30C33 36 40 40 40 47C40 53 36 58 32 58C28 58 24 53 24 47C24 40 31 36 32 30Z" />
    </g>
    <circle v-if="sparks" class="spark" cx="25" cy="14" r="1.3" style="--dx: -5px; --d: 2.1s; --o: 0s" />
    <circle v-if="sparks" class="spark" cx="34" cy="10" r="1.1" style="--dx: 3px; --d: 1.7s; --o: -0.6s" />
    <circle v-if="sparks" class="spark" cx="41" cy="16" r="1.4" style="--dx: 6px; --d: 2.4s; --o: -1.2s" />
    <circle v-if="sparks" class="spark" cx="30" cy="12" r="0.9" style="--dx: -2px; --d: 1.9s; --o: -1.7s" />
  </svg>
</template>
