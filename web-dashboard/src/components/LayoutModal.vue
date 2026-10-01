<script setup lang="ts">
import { ref } from 'vue'
import Icon from './Icon.vue'
import { t } from '../lib/i18n'
import { moveBlock, toggleBlock, type DashboardBlockKey, type LayoutItem } from '../lib/layout'
import { celebrationsEnabled, setCelebrationsEnabled } from '../lib/useStreakCelebration'

const props = defineProps<{ initial: LayoutItem[]; error?: string }>()
const emit = defineEmits<{ close: []; save: [LayoutItem[]] }>()

const local = ref<LayoutItem[]>(props.initial.map((i) => ({ ...i })))

// Поздравления за серии (BACKLOG 13): пока нет «Глобальных настроек» — выключатель живёт здесь, применяется сразу (localStorage)
const celebrate = ref(celebrationsEnabled())
function onCelebrate(e: Event) {
  celebrate.value = (e.target as HTMLInputElement).checked
  setCelebrationsEnabled(celebrate.value)
}

function label(key: DashboardBlockKey): string {
  return { profile: t('dash_block_profile'), charts: t('dash_charts_h2'), daily: t('dash_block_daily') }[key]
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="emit('close')">
    <div class="w-full max-w-sm rounded-2xl border p-5" style="background: var(--bg-card); border-color: var(--border); color: var(--text)" data-test="layout-modal">
      <h3 class="mb-1 text-lg font-bold">{{ t('dash_layout_modal_title') }}</h3>
      <p class="dim mb-3 text-sm">{{ t('dash_layout_hint') }}</p>

      <div>
        <div v-for="(item, i) in local" :key="item.key" class="flex items-center gap-1.5 border-b py-1.5" style="border-color: var(--border)" data-test="layout-row">
          <span class="flex-1" :style="{ opacity: item.visible ? 1 : 0.5 }">{{ label(item.key) }}</span>
          <button type="button" class="rounded-lg border px-2.5 py-1 text-sm" style="border-color: var(--border); background: var(--bg); color: var(--text)" data-test="up" :disabled="i === 0" @click="local = moveBlock(local, i, -1)">↑</button>
          <button type="button" class="rounded-lg border px-2.5 py-1 text-sm" style="border-color: var(--border); background: var(--bg); color: var(--text)" data-test="down" :disabled="i === local.length - 1" @click="local = moveBlock(local, i, 1)">↓</button>
          <button type="button" class="rounded-lg border px-2.5 py-1" style="border-color: var(--border); background: var(--bg); color: var(--text)" data-test="toggle" :title="item.visible ? t('dash_layout_hide') : t('dash_layout_show')" @click="local = toggleBlock(local, i)">
            <Icon :name="item.visible ? 'eye' : 'eyeoff'" />
          </button>
        </div>
      </div>

      <div class="mt-3">
        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" :checked="celebrate" data-test="celebrate-toggle" @change="onCelebrate" />
          {{ t('dash_celebrate_setting') }}
        </label>
        <p class="dim mt-1 text-xs">{{ t('dash_celebrate_setting_hint') }}</p>
      </div>

      <p v-if="error" class="mt-2 text-sm" style="color: #d6336c" data-test="layout-error">{{ t('dash_layout_save_error') }}{{ error }}</p>

      <div class="mt-4 flex justify-end gap-2">
        <button type="button" class="rounded-lg border px-4 py-2 text-sm" style="border-color: var(--border); background: var(--bg); color: var(--text)" @click="emit('close')">{{ t('cancel') }}</button>
        <button type="button" class="rounded-lg px-4 py-2 text-sm" style="background: var(--accent); color: var(--accent-text)" data-test="save" @click="emit('save', local)">{{ t('save') }}</button>
      </div>
    </div>
  </div>
</template>
