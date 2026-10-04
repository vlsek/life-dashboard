<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import Icon from './Icon.vue'
import { t } from '../lib/i18n'
import { loadIdeaSeen, saveIdeaSeen } from '../lib/shopIdea'

// Описание идеи магазина. Первый заход — плашка с полным текстом и кнопкой «Понятно»; после неё (и при всех следующих заходах) —
// короткая строка под заголовком и значок ⓘ, открывающий окно с полным текстом. Окно закрывается кнопкой, фоном и Esc.
const seen = ref(loadIdeaSeen())
const open = ref(false)

function dismiss() {
  seen.value = true
  saveIdeaSeen()
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="mb-3">
    <!-- Первый заход: полный текст -->
    <section v-if="!seen" class="rounded-xl border p-4" style="background: var(--bg-card); border-color: var(--accent)" data-testid="idea-banner">
      <h2 class="mb-1 text-base font-semibold" data-testid="idea-banner-title">{{ t('shop_idea_title') }}</h2>
      <p class="text-sm" data-testid="idea-banner-text">{{ t('shop_idea_full') }}</p>
      <button type="button" class="mt-3 rounded-lg px-4 py-1.5 text-sm" data-testid="idea-dismiss" @click="dismiss">{{ t('shop_idea_got_it') }}</button>
    </section>

    <!-- Дальше: короткая строка + ⓘ -->
    <p v-else class="dim flex items-start gap-1.5 text-sm" data-testid="idea-short-line">
      <span data-testid="idea-short">{{ t('shop_idea_short') }}</span>
      <button
        type="button"
        class="secondary inline-flex shrink-0 items-center rounded-full border-0 bg-transparent p-0.5 text-base"
        style="color: var(--text-dim); background: transparent"
        :aria-label="t('shop_idea_how')"
        :title="t('shop_idea_how')"
        data-testid="idea-info"
        @click="open = true"
      >
        <Icon name="info" />
      </button>
    </p>

    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" data-testid="idea-backdrop" @click.self="open = false">
      <div class="w-full max-w-sm rounded-2xl border p-5" style="background: var(--bg-card); border-color: var(--border); color: var(--text)" role="dialog" aria-modal="true" :aria-label="t('shop_idea_title')" data-testid="idea-modal">
        <h2 class="mb-2 text-lg font-semibold" data-testid="idea-modal-title">{{ t('shop_idea_title') }}</h2>
        <p class="text-sm" data-testid="idea-modal-text">{{ t('shop_idea_full') }}</p>
        <button type="button" class="mt-4 w-full rounded-lg px-4 py-2" data-testid="idea-close" @click="open = false">{{ t('close') }}</button>
      </div>
    </div>
  </div>
</template>
