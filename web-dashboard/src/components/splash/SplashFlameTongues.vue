<script setup lang="ts">
// Вариант «Три языка» (BACKLOG 16, просьба владельца 2026-10-10: вернуть старое пламя из трёх языков + искры):
// три языка пламени + светлая сердцевина, у каждого своя скорость и фаза (качание и «лижущие» движения вверх),
// над ними поднимаются искры. Чистый SVG + CSS (style.css, .splash-tongues; общее свечение, «уменьшить движение»
// и «Отключить анимации» идут через .splash-live). Статичная копия для index.html — .pre-tongues
// (scripts/apply_splash_tongues.py); контуры должны совпадать (проверяет splashLoader.test.ts).
</script>

<template>
  <svg class="splash-live splash-tongues" viewBox="0 0 64 64" width="80" height="80" aria-hidden="true">
    <path class="tongue tongue-l" d="M17 22C20 31 11 36 11 44C11 52 18 57 25 57C18 52 22 44 24 38C21 33 18 29 17 22Z" />
    <path class="tongue tongue-r" d="M47 22C44 31 53 36 53 44C53 52 46 57 39 57C46 52 42 44 40 38C43 33 46 29 47 22Z" />
    <path class="tongue tongue-c" d="M32 3C34 13 46 21 46 37C46 49 40 58 32 58C24 58 18 49 18 37C18 29 24 25 26 17C28 21 30 21 31 15C31.5 10 31.8 7 32 3Z" />
    <path class="tongue tongue-core" d="M32 30C33 36 40 40 40 47C40 53 36 58 32 58C28 58 24 53 24 47C24 40 31 36 32 30Z" />
    <circle class="spark" cx="25" cy="14" r="1.3" style="--dx: -5px; --d: 2.1s; --o: 0s" />
    <circle class="spark" cx="34" cy="10" r="1.1" style="--dx: 3px; --d: 1.7s; --o: -0.6s" />
    <circle class="spark" cx="41" cy="16" r="1.4" style="--dx: 6px; --d: 2.4s; --o: -1.2s" />
    <circle class="spark" cx="30" cy="12" r="0.9" style="--dx: -2px; --d: 1.9s; --o: -1.7s" />
  </svg>
</template>
