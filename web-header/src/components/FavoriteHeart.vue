<script setup lang="ts">
import { t } from '../lib/i18n'

// Сердечко «в избранное» наверху страницы: пустое — страницы нет в избранном, залито цветом темы — есть. Контур не-избранного — цветом основного текста
// (раньше тускло-серый почти не был виден на части тем, и кнопка выглядела «пустым кружком», BACKLOG 🐞 14:40).
defineProps<{ active: boolean }>()
const emit = defineEmits<{ toggle: [] }>()
const PATH = 'M12 20.4l-1.3-1.2C6 14.9 3 12.2 3 8.9 3 6.3 5 4.3 7.6 4.3c1.5 0 2.9.7 3.8 1.8l.6.8.6-.8c.9-1.1 2.3-1.8 3.8-1.8C19 4.3 21 6.3 21 8.9c0 3.3-3 6-7.7 10.3L12 20.4z'
</script>

<template>
  <button
    type="button"
    class="gh-badge"
    data-test="favorite-heart"
    :aria-pressed="active"
    :title="active ? t('hdr_fav_remove') : t('hdr_fav_add')"
    :aria-label="active ? t('hdr_fav_remove') : t('hdr_fav_add')"
    @click="emit('toggle')"
  >
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" :data-state="active ? 'on' : 'off'">
      <path :d="PATH" stroke-width="2" stroke-linejoin="round" :style="{ fill: active ? 'var(--accent, #6c8cff)' : 'none', stroke: active ? 'var(--accent, #6c8cff)' : 'var(--text, #ddd)' }" />
    </svg>
  </button>
</template>
