<script setup lang="ts">
// Вариант «Эквалайзер» (BACKLOG 56.1, срез 2): пять столбиков, прыгающих вверх-вниз вразнобой.
// Чистый SVG + CSS (style.css, блок splash-more; цвет — акцент темы, «уменьшить движение» и «Отключить анимации» учтены там же).
// Статичная копия для index.html — .pre-bars (scripts/apply_splash_more.py); фигуры должны совпадать (проверяет splashLoader.test.ts).
</script>

<template>
  <svg class="splash-bars" viewBox="0 0 64 64" width="80" height="80" aria-hidden="true">
    <rect class="eq-b eq-b-1" x="6.5" y="14" width="7" height="36" rx="3.5" />
    <rect class="eq-b eq-b-2" x="18" y="14" width="7" height="36" rx="3.5" />
    <rect class="eq-b eq-b-3" x="29.5" y="14" width="7" height="36" rx="3.5" />
    <rect class="eq-b eq-b-4" x="41" y="14" width="7" height="36" rx="3.5" />
    <rect class="eq-b eq-b-5" x="52.5" y="14" width="7" height="36" rx="3.5" />
  </svg>
</template>
