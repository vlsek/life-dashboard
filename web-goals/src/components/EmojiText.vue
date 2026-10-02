<script setup lang="ts">
import { computed } from 'vue'
import Icon from './Icon.vue'
import { splitEmojiText } from '../lib/emojiText'

// Текст, в котором известные эмодзи нарисованы единым набором SVG-иконок (BACKLOG 1.3 «Замена эмодзи на SVG»):
// «📌 Планы» → [pin-иконка] Планы. Цвет иконки — цвет текста (currentColor), размер — 1em. Для скринридера иконка
// скрыта (aria-hidden в Icon), читается только текст. Неизвестные эмодзи остаются как есть.
const props = defineProps<{ text: string }>()
const segments = computed(() => splitEmojiText(props.text))
</script>

<template>
  <span class="emoji-text" data-test="emoji-text"
    ><template v-for="(s, i) in segments" :key="i"
      ><Icon v-if="s.kind === 'icon'" :name="s.name" class="emoji-text-icon" /><template v-else>{{ s.value }}</template></template
    ></span
  >
</template>

<style scoped>
.emoji-text-icon {
  margin-right: 0.35em;
}
.emoji-text-icon:last-child {
  margin-right: 0;
}
</style>
