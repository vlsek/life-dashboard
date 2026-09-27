<script setup lang="ts">
import { toast } from '../lib/toast'
</script>

<template>
  <Transition name="toast-fade">
    <div
      v-if="toast"
      class="fixed bottom-6 left-1/2 z-50 rounded-lg border border-l-4 px-4 py-2.5 text-sm shadow-lg"
      style="transform: translateX(-50%)"
      :style="{
        background: 'var(--bg-card)',
        color: 'var(--text)',
        borderColor: 'var(--border)',
        borderLeftColor: toast.type === 'error' ? 'var(--danger)' : 'var(--success)',
      }"
    >
      {{ toast.message }}
    </div>
  </Transition>
</template>

<style scoped>
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.2s ease;
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
}
</style>
