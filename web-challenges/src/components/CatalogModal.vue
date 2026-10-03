<script setup lang="ts">
import { challengeTemplates } from '../lib/templates'
import { t } from '../lib/i18n'
import type { ChallengeTemplate } from '../lib/types'
import EmojiText from './EmojiText.vue'

const emit = defineEmits<{ close: []; select: [tpl: ChallengeTemplate] }>()
const templates = challengeTemplates()
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal" style="max-width: 30rem">
      <h3><EmojiText :text="t('ch_catalog_title')" /></h3>

      <div
        v-for="tpl in templates"
        :key="tpl.id"
        class="card mb-2.5 cursor-pointer"
        @click="emit('select', tpl)"
      >
        <strong><EmojiText :text="`${tpl.icon} ${tpl.title}`" /></strong>
        <div class="dim mt-1 text-sm">{{ tpl.description }}</div>
      </div>

      <div class="modal-actions">
        <button class="secondary" @click="emit('close')">{{ t('dash_close_btn') }}</button>
      </div>
    </div>
  </div>
</template>
