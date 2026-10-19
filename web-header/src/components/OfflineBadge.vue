<script setup lang="ts">
import { computed, ref } from 'vue'
import { t, type DictKey } from '../lib/i18n'
import { badgeKind, type OutboxView } from '../lib/outboxClient'

// Плашка офлайн-очереди (BACKLOG 66.4): облачко в шапке с числом ожидающих записей; по нажатию — список, у отклонённых сервером «Повторить/Удалить».
const props = defineProps<{ view: OutboxView }>()
const open = ref(false)
const kind = computed(() => badgeKind(props.view.status.value, props.view.online.value))
const count = computed(() => (kind.value === 'error' ? props.view.status.value.failed : props.view.status.value.pending))
const title = computed(() => {
  if (kind.value === 'error') return t('off_badge_error').replace('{n}', String(count.value))
  if (kind.value === 'pending') return t('off_badge_pending').replace('{n}', String(count.value))
  return t('off_badge_offline')
})
const waiting = computed(() => props.view.entries.value.filter((e) => e.status === 'pending'))
const failed = computed(() => props.view.entries.value.filter((e) => e.status === 'failed'))
function label(table: string): string {
  const key = `off_kind_${table}` as DictKey
  const v = t(key)
  return v === key ? table : v
}
function dateOf(key: string): string {
  const m = /\d{4}-\d{2}-\d{2}/.exec(key)
  return m ? m[0] : ''
}
</script>

<template>
  <button v-if="kind" type="button" class="gh-badge gh-off" :class="`gh-off-${kind}`" data-test="offline-badge" :title="title" :aria-label="title" @click="open = true">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 9.5a4 4 0 0 1-.5 8.5Z" />
      <path v-if="kind === 'offline'" d="M4 4l16 16" />
    </svg>
    <span v-if="count > 0" class="gh-off-n" data-test="offline-count">{{ count }}</span>
  </button>
  <div v-if="open" class="gh-backdrop" data-test="offline-modal" @click.self="open = false">
    <div class="gh-modal" role="dialog" aria-modal="true">
      <h3>{{ t('off_title') }}</h3>
      <p class="gh-dim">{{ t('off_intro') }}</p>
      <p v-if="!waiting.length && !failed.length" data-test="offline-empty">{{ t('off_empty') }}</p>
      <template v-if="failed.length">
        <h4>{{ t('off_failed') }}</h4>
        <ul class="gh-list">
          <li v-for="e in failed" :key="e.id" class="gh-off-item" data-test="offline-failed">
            <div>{{ label(e.table) }} <span class="gh-dim">{{ dateOf(e.key) }}</span></div>
            <div class="gh-dim gh-off-err">{{ e.lastError }}</div>
            <div class="gh-row">
              <button type="button" class="gh-btn" data-test="offline-retry" @click="view.retry(e.id)">{{ t('off_retry') }}</button>
              <button type="button" class="gh-btn" data-test="offline-discard" @click="view.discard(e.id)">{{ t('off_discard') }}</button>
            </div>
          </li>
        </ul>
      </template>
      <template v-if="waiting.length">
        <h4>{{ t('off_waiting') }}</h4>
        <ul class="gh-list">
          <li v-for="e in waiting" :key="e.id" data-test="offline-waiting">{{ label(e.table) }} <span class="gh-dim">{{ dateOf(e.key) }}</span></li>
        </ul>
      </template>
      <div class="gh-actions"><button type="button" class="gh-btn gh-btn-primary" data-test="offline-close" @click="open = false">{{ t('off_close') }}</button></div>
    </div>
  </div>
</template>
