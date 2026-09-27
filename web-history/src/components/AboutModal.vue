<script setup lang="ts">
import { t } from '../lib/i18n'

defineEmits<{ close: [] }>()
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="$emit('close')">
    <div class="w-full max-w-md rounded-2xl border p-5" style="background: var(--bg-card); border-color: var(--border); color: var(--text)">
      <h3 class="text-lg font-bold">{{ t('about_title') }}</h3>

      <h4 class="mb-1.5 mt-3.5 font-semibold">{{ t('about_creator_title') }}</h4>
      <p class="text-sm leading-relaxed">{{ t('about_creator_text') }}</p>
      <p class="mt-2 text-sm">
        <a href="https://portfolio.orneryhero.workers.dev/" target="_blank" rel="noopener" style="color: var(--accent)">
          {{ t('about_portfolio_link') }}
        </a>
      </p>

      <p class="mt-4 text-sm leading-relaxed" style="color: var(--text-dim)">
        {{ t('about_feedback_intro') }}<br />
        Telegram: <a href="https://t.me/vsekorolev" target="_blank" rel="noopener" style="color: var(--accent)">@vsekorolev</a>
      </p>

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
