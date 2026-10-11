<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { t } from '../lib/i18n'
import type { WatchItem } from '../lib/achievementWatcher'

// Поздравление «Новое достижение» на любой странице (BACKLOG 52.1 срез 2): карточка внизу по центру, при нескольких — списком, с наградой и кнопкой «Посмотреть».
// Сама не исчезает 20 секунд, чтобы успели прочитать; закрывается крестиком и Esc.
defineProps<{ items: WatchItem[] }>()
const emit = defineEmits<{ close: [] }>()

let timer: ReturnType<typeof setTimeout> | null = null
const onKey = (e: KeyboardEvent) => e.key === 'Escape' && emit('close')
onMounted(() => {
  timer = setTimeout(() => emit('close'), 20_000)
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="gh-achtoast" role="status" aria-live="polite" data-test="ach-toast">
    <button type="button" class="gh-achtoast-x" :aria-label="t('gh_achtoast_close')" data-test="ach-toast-close" @click="emit('close')">×</button>
    <div class="gh-achtoast-title">{{ items.length > 1 ? t('gh_achtoast_title_many') : t('gh_achtoast_title') }}</div>
    <ul class="gh-achtoast-list">
      <li v-for="it in items" :key="it.key" data-test="ach-toast-item">
        <span class="gh-achtoast-name">{{ it.title }}</span>
        <span v-if="it.reward" class="gh-achtoast-reward">{{ it.reward }}</span>
      </li>
    </ul>
    <a class="gh-achtoast-open" href="/achievements/" data-test="ach-toast-open">{{ t('gh_achtoast_open') }}</a>
  </div>
</template>
