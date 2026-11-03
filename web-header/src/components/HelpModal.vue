<script setup lang="ts">
// Справка с поиском (BACKLOG 79.10): общие темы и подсказки страниц; поиск по названию и тексту.
import { computed, nextTick, onMounted, ref } from 'vue'
import { getLang, t } from '../lib/i18n'
import { helpOpen } from '../lib/hotkeys'
import { helpTopics, searchHelp } from '../lib/help'

const lang = getLang() === 'en' ? 'en' : 'ru'
const topics = helpTopics(lang)
const q = ref('')
const found = computed(() => searchHelp(topics, q.value))
const input = ref<HTMLInputElement | null>(null)
onMounted(() => nextTick(() => input.value?.focus()))
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') helpOpen.value = false
}
</script>

<template>
  <div v-if="helpOpen" class="gh-backdrop" @click.self="helpOpen = false" @keydown="onKey">
    <div class="gh-modal" role="dialog" aria-modal="true" :aria-label="t('hdr_help_title')" data-test="help-modal" style="max-height: 85vh; overflow-y: auto">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px">
        <h3 style="margin: 0">{{ t('hdr_help_title') }}</h3>
        <button type="button" :aria-label="t('hdr_help_close')" data-test="help-close" @click="helpOpen = false">✕</button>
      </div>
      <input ref="input" v-model="q" type="search" class="gh-input" style="width: 100%; margin-bottom: 10px" :placeholder="t('hdr_help_search')" :aria-label="t('hdr_help_search')" data-test="help-search" />
      <p v-if="!found.length" class="gh-dim" data-test="help-empty">{{ t('hdr_help_empty') }}</p>
      <section v-for="topic in found" :key="topic.id" style="margin-bottom: 12px" :data-test="'help-topic-' + topic.id">
        <h4 style="margin: 0 0 4px">{{ topic.title }}</h4>
        <ul style="margin: 0 0 4px; padding-left: 18px; font-size: 13px">
          <li v-for="(p, i) in topic.paragraphs" :key="i">{{ p }}</li>
        </ul>
        <a v-if="topic.href" :href="topic.href" style="font-size: 13px">{{ t('hdr_help_open') }}</a>
      </section>
    </div>
  </div>
</template>
