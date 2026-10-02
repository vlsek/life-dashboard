<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getLang, t, type DictKey } from '../lib/i18n'
import { moveBlock, toggleBlock, type DashboardBlockKey, type LayoutItem } from '../lib/layout'
import { useLayout } from '../lib/useLayout'
import { THEME_KEYS, celebrationsEnabled, getTheme, setCelebrationsEnabled, setLangAndReload, setMotionOff, setTheme, setWaterRemindersEnabled, systemReducedMotion, userMotionOff, waterRemindersEnabled, type ThemeKey } from '../lib/prefs'

// «Глобальные настройки» (BACKLOG 6.2): единое окно со всеми настройками, которые раньше были разбросаны по страницам
// (язык/тема — в боковом меню, анимации и поздравления — в окне раскладки Дашборда, прогресс — в окне прогресса...).
// Что можно применить сразу — применяется сразу (как и на страницах); сложные окна (прогресс, вода) открываются отсюда.
const props = defineProps<{ userId: string }>()
const emit = defineEmits<{ close: []; 'open-progress-settings': []; 'open-water': [] }>()

const lang = getLang()
const theme = ref<ThemeKey>(getTheme())
const systemReduced = systemReducedMotion()
const motionOff = ref(userMotionOff() || systemReduced)
const celebrate = ref(celebrationsEnabled())
const waterReminders = ref(waterRemindersEnabled())

const { layout, loaded, saveError, load, save } = useLayout()
const local = ref<LayoutItem[]>([])
const layoutSaved = ref(false)
onMounted(async () => {
  await load(props.userId)
  local.value = layout.value.map((i) => ({ ...i }))
})

const BLOCKS: Record<DashboardBlockKey, DictKey> = { profile: 'dash_block_profile', charts: 'dash_charts_h2', daily: 'dash_block_daily' }

function onTheme(e: Event) {
  theme.value = (e.target as HTMLSelectElement).value as ThemeKey
  setTheme(theme.value)
}
function onMotion(e: Event) {
  motionOff.value = (e.target as HTMLInputElement).checked
  setMotionOff(motionOff.value)
}
function onCelebrate(e: Event) {
  celebrate.value = (e.target as HTMLInputElement).checked
  setCelebrationsEnabled(celebrate.value)
}
function onWaterReminders(e: Event) {
  waterReminders.value = (e.target as HTMLInputElement).checked
  setWaterRemindersEnabled(waterReminders.value)
}
// раскладка блоков сохраняется сразу при каждом изменении (как и остальные настройки здесь)
async function changeLayout(next: LayoutItem[]) {
  layoutSaved.value = false
  const prev = local.value
  local.value = next
  if (await save(props.userId, next)) layoutSaved.value = true
  else local.value = prev
}
</script>

<template>
  <div class="gh-backdrop" @click.self="emit('close')">
    <div class="gh-modal" data-test="settings-global">
      <h3>⚙️ {{ t('hdr_settings_title') }}</h3>
      <p class="gh-dim" style="margin: 0 0 12px; font-size: 12px">{{ t('hdr_settings_applied') }}</p>

      <h4>{{ t('hdr_settings_appearance') }}</h4>
      <div class="gh-field">
        <span class="gh-dim" style="font-size: 12px">{{ t('hdr_settings_language') }}</span>
        <div class="gh-wrap">
          <button v-for="l in ['ru', 'en'] as const" :key="l" type="button" class="gh-btn" :class="{ 'gh-btn-primary': lang === l }" :data-test="'lang-' + l" :aria-pressed="lang === l" @click="lang !== l && setLangAndReload(l)">{{ l.toUpperCase() }}</button>
        </div>
      </div>
      <label class="gh-field">
        <span class="gh-dim" style="font-size: 12px">{{ t('hdr_settings_theme') }}</span>
        <select class="gh-input" :value="theme" data-test="theme-select" @change="onTheme">
          <option v-for="(labelKey, key) in THEME_KEYS" :key="key" :value="key">{{ t(labelKey as DictKey) }}</option>
        </select>
      </label>

      <h4 style="margin-top: 16px">{{ t('hdr_settings_effects') }}</h4>
      <label class="gh-check">
        <input type="checkbox" :checked="motionOff" :disabled="systemReduced" data-test="motion-off" @change="onMotion" />
        {{ t('motion_off_setting') }}
      </label>
      <p class="gh-dim" style="margin: 2px 0 8px 24px; font-size: 12px">{{ systemReduced ? t('motion_off_system_hint') : t('motion_off_setting_hint') }}</p>
      <label class="gh-check">
        <input type="checkbox" :checked="celebrate" data-test="celebrate" @change="onCelebrate" />
        {{ t('dash_celebrate_setting') }}
      </label>
      <p class="gh-dim" style="margin: 2px 0 8px 24px; font-size: 12px">{{ t('dash_celebrate_setting_hint') }}</p>
      <label class="gh-check">
        <input type="checkbox" :checked="waterReminders" data-test="water-reminders" @change="onWaterReminders" />
        {{ t('water_reminders_setting') }}
      </label>
      <p class="gh-dim" style="margin: 2px 0 0 24px; font-size: 12px">{{ t('water_reminders_setting_hint') }}</p>

      <h4 style="margin-top: 16px">{{ t('hdr_settings_progress') }}</h4>
      <button type="button" class="gh-btn" data-test="open-progress" @click="emit('open-progress-settings')">{{ t('hdr_settings_progress_btn') }}</button>

      <h4 style="margin-top: 16px">{{ t('hdr_settings_dashboard') }}</h4>
      <p class="gh-dim" style="margin: 0 0 4px; font-size: 12px">{{ t('dash_layout_hint') }}</p>
      <ul v-if="loaded" class="gh-list" data-test="layout-list">
        <li v-for="(item, i) in local" :key="item.key" data-test="layout-row">
          <span :style="{ opacity: item.visible ? 1 : 0.5 }">{{ t(BLOCKS[item.key]) }}</span>
          <button type="button" class="gh-btn gh-btn-icon" data-test="up" :disabled="i === 0" @click="changeLayout(moveBlock(local, i, -1))">↑</button>
          <button type="button" class="gh-btn gh-btn-icon" data-test="down" :disabled="i === local.length - 1" @click="changeLayout(moveBlock(local, i, 1))">↓</button>
          <button type="button" class="gh-btn gh-btn-icon" data-test="toggle" :title="item.visible ? t('dash_layout_hide') : t('dash_layout_show')" @click="changeLayout(toggleBlock(local, i))">{{ item.visible ? '👁' : '🚫' }}</button>
        </li>
      </ul>
      <p v-if="layoutSaved" style="color: var(--accent, #6c8cff); margin: 0" data-test="layout-saved">✓ {{ t('hdr_settings_layout_saved') }}</p>
      <p v-if="saveError" style="color: #d6336c; margin: 0" data-test="layout-error">{{ t('dash_layout_save_error') }}{{ saveError }}</p>

      <h4 style="margin-top: 16px">💧 {{ t('hdr_settings_water') }}</h4>
      <button type="button" class="gh-btn" data-test="open-water" @click="emit('open-water')">{{ t('hdr_settings_water_btn') }}</button>

      <h4 style="margin-top: 16px">{{ t('hdr_settings_account') }}</h4>
      <a href="/account/" class="gh-btn" style="display: inline-block; text-decoration: none" data-test="account-link">{{ t('hdr_settings_account_link') }}</a>

      <div class="gh-actions"><button type="button" class="gh-btn gh-btn-primary" @click="emit('close')">{{ t('close') }}</button></div>
    </div>
  </div>
</template>
