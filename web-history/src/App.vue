<script setup lang="ts">
import { onMounted } from 'vue'

onMounted(() => {
  const target = new URL('/calendar/', window.location.origin)
  target.searchParams.set('view', 'history')
  window.location.replace(target.toString())
})
</script>

<template>
  <main class="mx-auto max-w-3xl px-4 py-8 text-center">
    <p style="color: var(--text-dim)">…</p>
  </main>
</template>
