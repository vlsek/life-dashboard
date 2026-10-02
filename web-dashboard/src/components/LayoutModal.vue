<script setup lang="ts">
import EmojiText from './EmojiText.vue'
import { computed, ref } from 'vue'
import BlockOrderList from './BlockOrderList.vue'
import { t } from '../lib/i18n'
import type { DashboardBlockKey, LayoutItem } from '../lib/layout'
import { celebrationsEnabled, setCelebrationsEnabled } from '../lib/useStreakCelebration'
import { setMotionOff, systemReducedMotion, userMotionOff } from '../lib/motion'

const props = defineProps<{ initial: LayoutItem[]; error?: string }>()
const emit = defineEmits<{ close: []; save: [LayoutItem[]] }>()

const local = ref<LayoutItem[]>(props.initial.map((i) => ({ ...i })))

// Поздравления за серии (BACKLOG 13): пока нет «Глобальных настроек» — выключатель живёт здесь, применяется сразу (localStorage)
const celebrate = ref(celebrationsEnabled())
function onCelebrate(e: Event) {
  celebrate.value = (e.target as HTMLInputElement).checked
  setCelebrationsEnabled(celebrate.value)
}

// «Отключить все анимации» (BACKLOG 16, 14:02): применяется сразу. Если анимации уже выключены системной
// настройкой «уменьшить движение», переключатель включён и заблокирован — с пояснением, где это менять.
const systemReduced = systemReducedMotion()
const motionOff = ref(userMotionOff() || systemReduced)
function onMotion(e: Event) {
  motionOff.value = (e.target as HTMLInputElement).checked
  setMotionOff(motionOff.value)
}

const labels = computed<Record<DashboardBlockKey, { title: string; desc: string }>>(() => ({
  profile: { title: t('dash_block_profile'), desc: t('dash_layout_desc_profile') },
  charts: { title: t('dash_charts_h2'), desc: t('dash_layout_desc_charts') },
  daily: { title: t('dash_block_daily'), desc: t('dash_layout_desc_daily') },
}))
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="emit('close')">
    <div class="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border p-5" style="background: var(--bg-card); border-color: var(--border); color: var(--text)" data-test="layout-modal">
      <h3 class="mb-1 text-lg font-bold"><EmojiText :text="t('dash_layout_modal_title')" /></h3>
      <p class="dim mb-3 text-sm">{{ t('dash_layout_hint') }}</p>

      <BlockOrderList v-model="local" :labels="labels" />

      <div class="mt-3">
        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" :checked="celebrate" data-test="celebrate-toggle" @change="onCelebrate" />
          {{ t('dash_celebrate_setting') }}
        </label>
        <p class="dim mt-1 text-xs">{{ t('dash_celebrate_setting_hint') }}</p>
      </div>

      <div class="mt-3">
        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" :checked="motionOff" :disabled="systemReduced" data-test="motion-toggle" @change="onMotion" />
          {{ t('motion_off_setting') }}
        </label>
        <p class="dim mt-1 text-xs" data-test="motion-hint">{{ systemReduced ? t('motion_off_system_hint') : t('motion_off_setting_hint') }}</p>
      </div>

      <p v-if="error" class="mt-2 text-sm" style="color: #d6336c" data-test="layout-error">{{ t('dash_layout_save_error') }}{{ error }}</p>

      <div class="mt-4 flex justify-end gap-2">
        <button type="button" class="rounded-lg border px-4 py-2 text-sm" style="border-color: var(--border); background: var(--bg); color: var(--text)" @click="emit('close')">{{ t('cancel') }}</button>
        <button type="button" class="rounded-lg px-4 py-2 text-sm" style="background: var(--accent); color: var(--accent-text)" data-test="save" @click="emit('save', local)">{{ t('save') }}</button>
      </div>
    </div>
  </div>
</template>
