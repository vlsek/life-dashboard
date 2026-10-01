<script setup lang="ts">
// Вариант «огненный круг»: кольцо с бегущим «хвостом кометы» (три дуги разной длины и прозрачности с
// общим передним краем), второе тонкое кольцо крутится навстречу, в центре — пульсирующий огонёк.
// Чистый SVG + CSS (style.css, .splash-ring). Статичная копия для index.html — .pre-ring.
</script>

<template>
  <svg class="splash-ring" viewBox="0 0 80 80" width="88" height="88" aria-hidden="true">
    <circle class="ring-base" cx="40" cy="40" r="30" />
    <g class="ring-spin">
      <circle class="arc arc-tail" cx="40" cy="40" r="30" />
      <circle class="arc arc-mid" cx="40" cy="40" r="30" />
      <circle class="arc arc-head" cx="40" cy="40" r="30" />
    </g>
    <circle class="ring-inner" cx="40" cy="40" r="22" />
    <g class="ring-flame" transform="translate(40 41) scale(0.5) translate(-16 -16) translate(3.3 0.7)">
      <path class="fl-outer" d="M16.5 0.5c1.2 5.3-3.2 6.8-3.5 11a3.2 3.2 0 0 0 6.4 0.2c2.1 1.1 3.1 4.3 3.1 7.5a9.5 10.5 0 1 1-19.5 0.3c-0.1-6.4 4.2-9.7 6.3-14 1.1-2.2 2.1-3.5 7.2-5z" />
      <path class="fl-inner" d="M16.3 11.2c.6 3.2-1.6 3.8-1.6 6a1.6 1.6 0 0 0 3.2 0c1.1 3.2-.5 7-3.7 7a5.3 5.3 0 0 1-5.3-5.4c0-3.7 3.2-5.3 5.3-9 .4-.7.9-1.3 2.1-2.6z" />
    </g>
  </svg>
</template>
