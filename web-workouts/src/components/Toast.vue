<script setup lang="ts">
import { runToastAction, toast } from '../lib/toast'
</script>

<template>
  <Transition name="toast-fade">
    <div
      v-if="toast"
      class="fixed bottom-20 left-1/2 z-50 sm:bottom-6 rounded-lg border border-l-4 px-4 py-2.5 text-sm shadow-lg"
      style="transform: translateX(-50%)"
      :style="{
        background: 'var(--bg-card)',
        color: 'var(--text)',
        borderColor: 'var(--border)',
        borderLeftColor: toast.type === 'error' ? 'var(--danger)' : 'var(--success)',
      }"
    >
      {{ toast.message }}
      <button v-if="toast.action" type="button" class="ml-3 border-0 bg-transparent p-0 font-semibold" style="color: var(--accent, #4f8cff); min-height: 28px" data-testid="toast-action" @click="runToastAction">{{ toast.action.label }}</button>
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
