<script setup lang="ts">
import EmojiText from './EmojiText.vue'
import { computed, ref } from 'vue'
import BlockOrderList from './BlockOrderList.vue'
import { t } from '../lib/i18n'
import { withSavingsWidget, type DashboardBlockKey, type LayoutItem } from '../lib/layout'
import type { ShopOption } from '../lib/savingsWidget'
import { celebrationsEnabled, setCelebrationsEnabled } from '../lib/useStreakCelebration'
import { setMotionOff, systemReducedMotion, userMotionOff } from '../lib/motion'

const props = defineProps<{ initial: LayoutItem[]; error?: string; shopItems?: ShopOption[] }>()
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
  widgets: { title: t('dash_block_widgets'), desc: t('dash_layout_desc_widgets') },
}))

// Виджеты на главной (BACKLOG 9, решение владельца: выбор галочками в этом окне). Сейчас один — «Коплю на товар»: галочка + выбор товара.
const savingsId = computed(() => local.value.find((i) => i.key === 'widgets')?.widgets?.savings ?? '')
const savingsOn = computed(() => savingsId.value !== '')
const options = computed(() => props.shopItems ?? [])
function onSavingsToggle(e: Event) {
  const on = (e.target as HTMLInputElement).checked
  local.value = withSavingsWidget(local.value, on ? (options.value[0]?.id ?? null) : null)
}
function onSavingsPick(e: Event) {
  const id = (e.target as HTMLSelectElement).value
  local.value = withSavingsWidget(local.value, id || null)
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="emit('close')">
    <div class="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border p-5" style="background: var(--bg-card); border-color: var(--border); color: var(--text)" data-test="layout-modal">
      <h3 class="mb-1 text-lg font-bold"><EmojiText :text="t('dash_layout_modal_title')" /></h3>
      <p class="dim mb-3 text-sm">{{ t('dash_layout_hint') }}</p>

      <BlockOrderList v-model="local" :labels="labels" />

      <div class="mt-4" data-test="widgets-setting">
        <div class="text-sm font-medium">{{ t('dash_widgets_setting') }}</div>
        <p class="dim mb-1 text-xs">{{ t('dash_widgets_setting_hint') }}</p>
        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" :checked="savingsOn" :disabled="!savingsOn && options.length === 0" data-test="savings-toggle" @change="onSavingsToggle" />
          {{ t('dash_widget_savings') }}
        </label>
        <p v-if="!savingsOn && options.length === 0" class="dim mt-1 text-xs" data-test="savings-none">{{ t('dash_widget_savings_none') }} <a href="/shop/" style="color: var(--accent)">{{ t('dash_widget_savings_shop') }}</a></p>
        <label v-if="savingsOn" class="mt-2 flex items-center gap-2 text-sm">
          <span class="dim flex-none">{{ t('dash_widget_savings_pick') }}</span>
          <select class="min-w-0 flex-1 rounded-lg border px-2 py-1.5" style="border-color: var(--border); background: var(--bg); color: var(--text)" :value="savingsId" data-test="savings-pick" @change="onSavingsPick">
            <option v-if="!options.some((o) => o.id === savingsId)" :value="savingsId" disabled>{{ t('dash_widget_savings_choose') }}</option>
            <option v-for="o in options" :key="o.id" :value="o.id">{{ o.name }} · {{ o.cost }}</option>
          </select>
        </label>
      </div>

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
