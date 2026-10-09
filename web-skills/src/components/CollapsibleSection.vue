<script setup lang="ts">
import { ref } from 'vue'
import CollapseChevron from './CollapseChevron.vue'
import EmojiText from './EmojiText.vue'
import { vCollapse } from '../lib/collapseMotion'

// Сворачиваемая секция (BACKLOG 44.4): заголовок-кнопка с шевроном и счётчиком, тело сворачивается плавно (v-collapse,
// тело остаётся в DOM). Состояние запоминается на устройстве по `id`; сбой localStorage не критичен.
const props = withDefaults(defineProps<{ id: string; title: string; count?: number | null; defaultOpen?: boolean }>(), { count: null, defaultOpen: true })

const KEY = 'skills_section_' + props.id
function read(): boolean {
  try {
    const v = localStorage.getItem(KEY)
    return v === null ? props.defaultOpen : v === '1'
  } catch {
    return props.defaultOpen
  }
}
const open = ref(read())
function toggle() {
  open.value = !open.value
  try {
    localStorage.setItem(KEY, open.value ? '1' : '0')
  } catch {
    /* состояние секции не критично */
  }
}
</script>

<template>
  <section class="mb-5" :data-section="id" :data-open="String(open)">
    <button type="button" class="sec-head" :aria-expanded="open" :data-test="'section-toggle-' + id" @click="toggle">
      <h3 class="m-0 text-base font-medium"><EmojiText :text="title" /></h3>
      <span v-if="count !== null" class="sec-count" data-test="section-count">{{ count }}</span>
      <CollapseChevron :collapsed="!open" class="ml-auto" />
    </button>
    <div v-collapse="open" class="pt-2" :data-test="'section-body-' + id">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.sec-head {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  margin: 0 -6px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text);
  text-align: left;
  cursor: pointer;
}
.sec-head:hover {
  background: var(--bg-card);
}
.sec-head:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.sec-count {
  min-width: 1.4rem;
  padding: 0 0.45rem;
  border: 1px solid var(--border);
  border-radius: 9999px;
  color: var(--text-dim);
  font-size: 0.75rem;
  line-height: 1.4rem;
  text-align: center;
}
</style>
