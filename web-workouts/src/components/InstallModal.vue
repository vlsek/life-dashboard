<script setup lang="ts">
import { isIOSDevice } from '../lib/install'
import { t } from '../lib/i18n'

defineEmits<{ close: [] }>()
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="$emit('close')">
    <div class="w-full max-w-md rounded-2xl border p-5" style="background: var(--bg-card); border-color: var(--border); color: var(--text)">
      <h3 class="mb-3 text-lg font-bold">{{ t('install_title') }}</h3>
      <p class="text-sm leading-relaxed">{{ isIOSDevice() ? t('install_ios_steps') : t('install_generic_steps') }}</p>
      <div class="mt-4 flex justify-end">
        <button
          type="button"
          class="rounded-lg border px-3 py-1.5 text-sm"
          style="border-color: var(--border); color: var(--text)"
          @click="$emit('close')"
        >
          {{ t('close') }}
        </button>
      </div>
    </div>
  </div>
</template>
