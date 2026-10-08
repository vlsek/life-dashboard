<script setup lang="ts">
import EmojiText from './EmojiText.vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { getLang, t, type DictKey } from '../lib/i18n'
import type { DashboardBlockKey, LayoutItem } from '../lib/layout'
import BlockOrderList from './BlockOrderList.vue'
import { UNLOCKED_THEMES_EVENT, isThemeLocked } from '../lib/themeUnlock'
import WaterSavedAnim from './WaterSavedAnim.vue'
import { WATER_ANIMS, getWaterAnim, sanitizeWaterAnim, setWaterAnim, type WaterAnim } from '../lib/waterAnim'
import { useLayout } from '../lib/useLayout'
import { friendlyError } from '../lib/friendlyError'
import { ensureTrackWater, saveTrackWater, trackWater } from '../lib/waterTracking'
import { THEME_KEYS, celebrationsEnabled, setSidebarProgress, sidebarProgress, getTheme, setCelebrationsEnabled, setLangAndReload, setMotionOff, setTheme, setWaterRemindersEnabled, systemReducedMotion, userMotionOff, waterRemindersEnabled, type ThemeKey } from '../lib/prefs'

// «Глобальные настройки» (BACKLOG 6.2): единое окно со всеми настройками, которые раньше были разбросаны по страницам
// (язык/тема — в боковом меню, анимации и поздравления — в окне раскладки Дашборда, прогресс — в окне прогресса...).
// Что можно применить сразу — применяется сразу (как и на страницах); сложные окна (прогресс, вода) открываются отсюда.
const props = defineProps<{ userId: string }>()
const emit = defineEmits<{ close: []; 'open-progress-settings': []; 'open-water': [] }>()

const lang = getLang()
const theme = ref<ThemeKey>(getTheme())
// Список тем: закрытые темы-награды (ещё не заслуженные) не показываем; уже включённая тема остаётся в списке всегда (отнимать её нельзя).
// Анимация «записалось» при добавлении воды (BACKLOG 44.21): выбор варианта и кнопка «Показать» (проиграть сразу, не добавляя воду).
const waterAnim = ref<WaterAnim>(getWaterAnim())
const animPreviewTick = ref(0)
const onWaterAnim = (e: Event) => {
  waterAnim.value = sanitizeWaterAnim((e.target as HTMLSelectElement).value)
  setWaterAnim(waterAnim.value)
  animPreviewTick.value++ // сразу показываем выбранную
}
const unlockTick = ref(0)
const themeOptions = computed(() => {
  void unlockTick.value
  return (Object.keys(THEME_KEYS) as ThemeKey[]).filter((k) => k === theme.value || !isThemeLocked(k))
})
const onUnlockedThemes = () => unlockTick.value++
onMounted(() => window.addEventListener(UNLOCKED_THEMES_EVENT, onUnlockedThemes))
onUnmounted(() => window.removeEventListener(UNLOCKED_THEMES_EVENT, onUnlockedThemes))
const systemReduced = systemReducedMotion()
const motionOff = ref(userMotionOff() || systemReduced)
const celebrate = ref(celebrationsEnabled())
const waterReminders = ref(waterRemindersEnabled())
// «Отслеживать воду» (BACKLOG 932): флаг в профиле; при выключении прячутся стакан, окно воды, напоминания и учёт воды в кольцах/сериях (прошлое остаётся)
const waterSaving = ref(false)
const waterToggleError = ref<string | null>(null)
async function onTrackWater(e: Event) {
  const input = e.target as HTMLInputElement
  const next = input.checked
  waterToggleError.value = null
  waterSaving.value = true
  const res = await saveTrackWater(props.userId, next)
  waterSaving.value = false
  if (!res.ok) {
    input.checked = !next // не записалось — выключатель возвращается, объясняем причину
    waterToggleError.value = friendlyError(res.error, 'save')
  }
}
onMounted(() => void ensureTrackWater(props.userId))

const { layout, loaded, saveError, load, save } = useLayout()
const local = ref<LayoutItem[]>([])
const layoutSaved = ref(false)
onMounted(async () => {
  await load(props.userId)
  local.value = layout.value.map((i) => ({ ...i }))
})

const blockLabels = computed<Record<DashboardBlockKey, { title: string; desc: string }>>(() => ({
  profile: { title: t('dash_block_profile'), desc: t('dash_layout_desc_profile') },
  charts: { title: t('dash_charts_h2'), desc: t('dash_layout_desc_charts') },
  daily: { title: t('dash_block_daily'), desc: t('dash_layout_desc_daily') },
  widgets: { title: t('dash_block_widgets'), desc: t('dash_layout_desc_widgets') },
}))

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
      <h3><EmojiText :text="'⚙️ ' + t('hdr_settings_title')" /></h3>
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
          <option v-for="key in themeOptions" :key="key" :value="key">{{ t(THEME_KEYS[key] as DictKey) }}</option>
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
      <template v-if="trackWater">
        <label class="gh-check">
          <input type="checkbox" :checked="waterReminders" data-test="water-reminders" @change="onWaterReminders" />
          {{ t('water_reminders_setting') }}
        </label>
        <p class="gh-dim" style="margin: 2px 0 8px 24px; font-size: 12px">{{ t('water_reminders_setting_hint') }}</p>
        <label class="gh-field">
          <span class="gh-dim" style="font-size: 12px">{{ t('hdr_water_anim') }}</span>
          <span style="display: flex; gap: 8px; align-items: center">
            <select class="gh-input" style="flex: 1" :value="waterAnim" data-test="water-anim-select" @change="onWaterAnim">
              <option v-for="a in WATER_ANIMS" :key="a" :value="a">{{ t(('hdr_water_anim_' + a) as DictKey) }}</option>
            </select>
            <button type="button" class="gh-btn" data-test="water-anim-preview" @click="animPreviewTick++">{{ t('hdr_water_anim_preview') }}</button>
          </span>
        </label>
        <p class="gh-dim" style="margin: 2px 0 0 0; font-size: 12px">{{ t('hdr_water_anim_hint') }}</p>
        <WaterSavedAnim :tick="animPreviewTick" />
      </template>

      <h4 style="margin-top: 16px">{{ t('hdr_settings_progress') }}</h4>
      <button type="button" class="gh-btn" data-test="open-progress" @click="emit('open-progress-settings')">{{ t('hdr_settings_progress_btn') }}</button>
      <label class="gh-check" style="margin-top: 10px">
        <input type="checkbox" :checked="sidebarProgress" data-test="sidebar-progress-toggle" @change="setSidebarProgress(($event.target as HTMLInputElement).checked)" />
        {{ t('hdr_settings_sidebar_progress') }}
      </label>

      <h4 style="margin-top: 16px">{{ t('hdr_settings_dashboard') }}</h4>
      <p class="gh-dim" style="margin: 0 0 4px; font-size: 12px">{{ t('dash_layout_hint') }}</p>
      <BlockOrderList v-if="loaded" :model-value="local" :labels="blockLabels" data-test="layout-list" @update:model-value="changeLayout" />
      <p v-if="layoutSaved" style="color: var(--accent, #6c8cff); margin: 0" data-test="layout-saved">✓ {{ t('hdr_settings_layout_saved') }}</p>
      <p v-if="saveError" style="color: #d6336c; margin: 0" data-test="layout-error">{{ saveError }}</p>

      <h4 style="margin-top: 16px"><EmojiText :text="'💧 ' + t('hdr_settings_water')" /></h4>
      <label class="gh-check">
        <input type="checkbox" :checked="trackWater" :disabled="waterSaving" data-test="track-water" @change="onTrackWater" />
        {{ t('water_tracking_setting') }}
      </label>
      <p class="gh-dim" style="margin: 2px 0 8px 24px; font-size: 12px">{{ t('water_tracking_setting_hint') }}</p>
      <p v-if="waterToggleError" style="color: #d6336c; margin: 0 0 8px" role="alert" data-test="track-water-error">{{ waterToggleError }}</p>
      <button v-if="trackWater" type="button" class="gh-btn" data-test="open-water" @click="emit('open-water')">{{ t('hdr_settings_water_btn') }}</button>

      <h4 style="margin-top: 16px">{{ t('hdr_settings_account') }}</h4>
      <a href="/account/" class="gh-btn" style="display: inline-block; text-decoration: none" data-test="account-link">{{ t('hdr_settings_account_link') }}</a>

      <div class="gh-actions"><button type="button" class="gh-btn gh-btn-primary" @click="emit('close')">{{ t('close') }}</button></div>
    </div>
  </div>
</template>
