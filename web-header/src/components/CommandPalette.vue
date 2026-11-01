<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { getLang, t } from '../lib/i18n'
import { PALETTE_ITEMS, availableItems, filterPalette, type PaletteItem } from '../lib/palette'

// Командная палитра (BACKLOG 79.1, срез 1): ↑↓ — выбор, Enter — открыть, Esc или клик по фону — закрыть.
const props = withDefaults(defineProps<{ water?: boolean }>(), { water: false })
const emit = defineEmits<{ pick: [PaletteItem]; close: [] }>()
const lang = getLang() === 'en' ? 'en' : 'ru'
const query = ref('')
const active = ref(0)
const input = ref<HTMLInputElement | null>(null)
const results = computed(() => filterPalette(availableItems(PALETTE_ITEMS, { water: props.water }), query.value))
watch(query, () => (active.value = 0))
onMounted(() => nextTick(() => input.value?.focus()))

function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (results.value.length) active.value = (active.value + 1) % results.value.length
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (results.value.length) active.value = (active.value - 1 + results.value.length) % results.value.length
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const it = results.value[active.value]
    if (it) emit('pick', it)
  } else if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
  }
}
</script>

<template>
  <div class="gh-backdrop" style="align-items: flex-start; padding-top: 12vh" @click.self="emit('close')">
    <div class="gh-modal" role="dialog" aria-modal="true" :aria-label="t('pal_title')" data-test="palette">
      <input
        ref="input"
        v-model="query"
        type="text"
        role="combobox"
        aria-expanded="true"
        aria-controls="gh-palette-list"
        :aria-activedescendant="results[active] ? 'gh-pal-' + active : undefined"
        :placeholder="t('pal_placeholder')"
        autocomplete="off"
        style="width: 100%; box-sizing: border-box"
        data-test="palette-input"
        @keydown="onKey"
      />
      <ul id="gh-palette-list" role="listbox" style="list-style: none; margin: 8px 0 0; padding: 0; max-height: 50vh; overflow-y: auto">
        <li
          v-for="(it, i) in results"
          :id="'gh-pal-' + i"
          :key="it.id"
          role="option"
          :aria-selected="i === active"
          :style="{ padding: '6px 8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: '8px', background: i === active ? 'var(--border)' : 'transparent' }"
          data-test="palette-item"
          @mouseenter="active = i"
          @click="emit('pick', it)"
        >
          <span>{{ it[lang] }}</span>
          <span class="gh-dim" style="font-size: 12px">{{ it.kind === 'page' ? t('pal_kind_page') : t('pal_kind_action') }}<template v-if="it.hint"> · <kbd>{{ it.hint }}</kbd></template></span>
        </li>
        <li v-if="!results.length" class="gh-dim" style="padding: 6px 8px" data-test="palette-empty">{{ t('pal_empty') }}</li>
      </ul>
      <p class="gh-dim" style="margin: 8px 0 0; font-size: 12px">{{ t('pal_hint') }}</p>
    </div>
  </div>
</template>
