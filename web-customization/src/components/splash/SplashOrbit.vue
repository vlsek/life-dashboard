<script setup lang="ts">
// Вариант «Орбита» (BACKLOG 56.1, срез 1): мягко пульсирующий центр, два кольца-дорожки и точки, бегущие по ним в разные стороны.
// Чистый SVG + CSS (style.css, блок splash-orbit; цвет — акцент темы, «уменьшить движение» и «Отключить анимации» учтены там же).
// Статичная копия для index.html — .pre-orbit (scripts/apply_splash_orbit.py); фигуры должны совпадать (проверяет splashLoader.test.ts).
</script>

<template>
  <svg class="splash-orbit" viewBox="0 0 64 64" width="80" height="80" aria-hidden="true">
    <circle class="ob-track" cx="32" cy="32" r="22" />
    <circle class="ob-track" cx="32" cy="32" r="12" />
    <circle class="ob-core" cx="32" cy="32" r="4.5" />
    <g class="ob-o1">
      <circle class="ob-dot" cx="32" cy="10" r="3" />
      <circle class="ob-dot ob-dim" cx="51" cy="43" r="2.2" />
      <circle class="ob-dot ob-dim" cx="13" cy="43" r="1.6" />
    </g>
    <g class="ob-o2">
      <circle class="ob-dot ob-light" cx="32" cy="20" r="2" />
      <circle class="ob-dot ob-dim" cx="32" cy="44" r="1.4" />
    </g>
  </svg>
</template>
