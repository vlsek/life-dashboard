<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getLang } from '../lib/i18n'
import { PAGE_HINT_LABELS, hasSeenHint, hintFor, markHintSeen } from '../lib/pageHints'

// Значок «i» в верхней панели + подсказка страницы (BACKLOG 49.4). При первом входе подсказка раскрывается сама (один раз на устройстве),
// дальше — по значку. `suppress` — когда поверх уже открыт тур «Как пользоваться»: тогда сама не открываем и не считаем увиденной.
const props = defineProps<{ page: string; suppress?: boolean }>()
const open = ref(false)
const lang = getLang()
const hint = computed(() => hintFor(props.page, lang))
const labels = computed(() => PAGE_HINT_LABELS[lang === 'en' ? 'en' : 'ru'])

onMounted(() => {
  if (hint.value && !props.suppress && !hasSeenHint(props.page)) open.value = true
})

function close() {
  open.value = false
  markHintSeen(props.page)
}
function toggle() {
  if (open.value) close()
  else open.value = true
}
</script>

<template>
  <div v-if="hint" class="ph-wrap">
    <button type="button" class="ph-btn" :aria-expanded="open" :aria-label="labels.info" :title="labels.info" data-test="page-hint-btn" @click="toggle">i</button>
    <div v-if="open" class="ph-card" role="dialog" :aria-label="hint.title" data-test="page-hint">
      <strong class="ph-title">{{ hint.title }}</strong>
      <ul class="ph-list">
        <li v-for="(tip, i) in hint.tips" :key="i">{{ tip }}</li>
      </ul>
      <button type="button" class="ph-ok" data-test="page-hint-ok" @click="close">{{ labels.ok }}</button>
    </div>
  </div>
</template>

<style scoped>
.ph-wrap {
  position: relative;
}
.ph-btn {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 9999px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-dim);
  font: italic 700 0.85rem/1 Georgia, serif;
  cursor: pointer;
}
.ph-btn:hover,
.ph-btn[aria-expanded='true'] {
  color: var(--accent);
  border-color: var(--accent);
}
.ph-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.ph-card {
  position: absolute;
  right: 0;
  top: calc(100% + 0.5rem);
  z-index: 40;
  width: min(20rem, calc(100vw - 2rem));
  padding: 0.9rem 1rem;
  border-radius: 0.9rem;
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text);
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.25);
  font-size: 0.85rem;
  line-height: 1.4;
}
.ph-title {
  font-size: 0.95rem;
}
.ph-list {
  margin: 0.5rem 0 0.7rem;
  padding-left: 1.1rem;
  list-style: disc;
  color: var(--text-dim);
}
.ph-list li + li {
  margin-top: 0.3rem;
}
.ph-ok {
  border: 1px solid var(--accent);
  color: var(--accent);
  background: transparent;
  border-radius: 0.6rem;
  padding: 0.3rem 0.8rem;
  font-weight: 600;
  cursor: pointer;
}
</style>
