<script setup lang="ts">
// Вариант «Пульс» (BACKLOG 56.1, срез 2): светящийся центр и два круга, расходящиеся от него волнами.
// Чистый SVG + CSS (style.css, блок splash-more; цвет — акцент темы, «уменьшить движение» и «Отключить анимации» учтены там же).
// Статичная копия для index.html — .pre-pulse (scripts/apply_splash_more.py); фигуры должны совпадать (проверяет splashLoader.test.ts).
</script>

<template>
  <svg class="splash-pulse" viewBox="0 0 64 64" width="80" height="80" aria-hidden="true">
    <circle class="pl-ring" cx="32" cy="32" r="10" />
    <circle class="pl-ring pl-r2" cx="32" cy="32" r="10" />
    <circle class="pl-core" cx="32" cy="32" r="5" />
  </svg>
</template>
