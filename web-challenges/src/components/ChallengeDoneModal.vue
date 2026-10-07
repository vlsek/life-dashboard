<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../lib/i18n'
import type { DictKey } from '../lib/i18n'
import { ladderStep, type DoneSummary } from '../lib/challengeDone'
import type { Challenge } from '../lib/types'
import EmojiText from './EmojiText.vue'
import Icon from './Icon.vue'

// Поздравление с завершением челленджа (BACKLOG 642): кубок с кольцами-вспышками, итог, номер по счёту и — если число завершённых
// совпало с шагом лесенки достижений — сообщение об открытом достижении. Анимация гасится reduced-motion и data-motion=off.
const props = defineProps<{ challenge: Challenge; summary: DoneSummary; doneCount: number }>()
const emit = defineEmits<{ close: [] }>()

const step = computed(() => ladderStep(props.doneCount))
const summaryText = computed(() =>
  props.summary.kind === 'days'
    ? `${t('ch_done_days')} ${props.summary.done} ${t('ch_done_of')} ${props.summary.total}`
    : `${t('ch_done_count')} ${props.summary.count} ${t('ch_done_of')} ${props.summary.target}${props.summary.itemWord ? ' ' + props.summary.itemWord : ''}`,
)
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal cd-card text-center" style="max-width: 22rem" role="dialog" aria-modal="true" :aria-label="t('ch_done_title')" data-test="challenge-done">
      <div class="cd-trophy-wrap">
        <span class="cd-ring" aria-hidden="true"></span>
        <span class="cd-ring cd-ring-2" aria-hidden="true"></span>
        <span class="cd-trophy" aria-hidden="true"><Icon name="trophy" /></span>
      </div>
      <h3 class="mb-1">{{ t('ch_done_title') }}</h3>
      <p class="mb-2 text-lg font-medium" data-test="done-title"><EmojiText :text="`${challenge.icon} ${challenge.title}`" /></p>
      <p class="mb-1 text-sm" data-test="done-summary">{{ summaryText }}</p>
      <p class="dim mb-3 text-sm" data-test="done-nth">{{ t('ch_done_nth_pre') }} {{ doneCount }}{{ t('ch_done_nth_post') }}</p>
      <p v-if="step" class="mb-3 text-sm" style="color: var(--accent)" data-test="done-achievement">
        {{ t('ch_done_ach_pre') }} «{{ t(('ch_done_ach_' + step) as DictKey) }}».
        <a href="/achievements/" class="underline" data-test="done-achievements-link">{{ t('ch_done_ach_link') }}</a>
      </p>
      <button data-test="done-close" @click="emit('close')">{{ t('ch_done_close') }}</button>
    </div>
  </div>
</template>
