<script setup lang="ts">
import EmojiText from './EmojiText.vue'
import { computed, ref } from 'vue'
import BlockOrderList from './BlockOrderList.vue'
import { t } from '../lib/i18n'
import { MAX_WIDGET_SKILLS, withWidgetConfig, type DashboardBlockKey, type LayoutItem } from '../lib/layout'
import type { WidgetOptions } from '../lib/widgets'
import { celebrationsEnabled, setCelebrationsEnabled } from '../lib/useStreakCelebration'
import { setMotionOff, systemReducedMotion, userMotionOff } from '../lib/motion'

const props = defineProps<{ initial: LayoutItem[]; error?: string; widgetOptions?: WidgetOptions }>()
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

// Виджеты на главной (BACKLOG 388, решение владельца: выбор галочками в этом окне, новых кнопок не вводим).
// «Навыки» — галочка на виджет и галочки на навыки; «Коплю на товар» — галочка и выбор товара; «Изучение языков» — галочка и выбор набора слов.
const widgetsCfg = computed(() => local.value.find((i) => i.key === 'widgets')?.config)
const skillIds = computed(() => widgetsCfg.value?.skills ?? [])
const skillsOn = computed(() => skillIds.value.length > 0)
const skillOptions = computed(() => props.widgetOptions?.skills ?? [])
function onSkillsToggle(e: Event) {
  const on = (e.target as HTMLInputElement).checked
  const first = skillOptions.value.find((o) => !o.mastered) ?? skillOptions.value[0]
  local.value = withWidgetConfig(local.value, { skills: on && first ? [first.id] : [] })
}
function onSkillPick(id: string, e: Event) {
  const on = (e.target as HTMLInputElement).checked
  const next = on ? [...skillIds.value, id] : skillIds.value.filter((x) => x !== id)
  local.value = withWidgetConfig(local.value, { skills: next })
}
const skillLimitReached = computed(() => skillIds.value.length >= MAX_WIDGET_SKILLS)

const savingsId = computed(() => widgetsCfg.value?.savings ?? '')
const savingsOn = computed(() => savingsId.value !== '')
const shopOptions = computed(() => props.widgetOptions?.shop ?? [])
function onSavingsToggle(e: Event) {
  const on = (e.target as HTMLInputElement).checked
  local.value = withWidgetConfig(local.value, { savings: on ? (shopOptions.value[0]?.id ?? null) : null })
}
const langCode = computed(() => widgetsCfg.value?.languages ?? '')
const langOn = computed(() => langCode.value !== '')
const langOptions = computed(() => props.widgetOptions?.languages ?? [])
function onLangToggle(e: Event) {
  const on = (e.target as HTMLInputElement).checked
  local.value = withWidgetConfig(local.value, { languages: on && langOptions.value.length > 0 ? 'all' : null })
}
function onLangPick(e: Event) {
  local.value = withWidgetConfig(local.value, { languages: (e.target as HTMLSelectElement).value || null })
}
function onSavingsPick(e: Event) {
  local.value = withWidgetConfig(local.value, { savings: (e.target as HTMLSelectElement).value || null })
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
          <input type="checkbox" :checked="skillsOn" :disabled="!skillsOn && skillOptions.length === 0" data-test="skills-toggle" @change="onSkillsToggle" />
          {{ t('dash_widget_skills') }}
        </label>
        <p v-if="!skillsOn && skillOptions.length === 0" class="dim mt-1 text-xs" data-test="skills-none">{{ t('dash_widget_skills_none') }} <a href="/skills/" style="color: var(--accent)">{{ t('dash_widget_skills_all') }}</a></p>
        <div v-if="skillsOn" class="mt-1 ml-6 flex flex-col gap-1" data-test="skills-pick-list">
          <label v-for="o in skillOptions" :key="o.id" class="flex items-center gap-2 text-sm">
            <input type="checkbox" :checked="skillIds.includes(o.id)" :disabled="(o.mastered && !skillIds.includes(o.id)) || (skillLimitReached && !skillIds.includes(o.id))" data-test="skills-pick" :data-id="o.id" @change="onSkillPick(o.id, $event)" />
            <span class="min-w-0 truncate">{{ o.name }}</span>
            <span v-if="o.mastered" class="dim flex-none text-xs">{{ t('dash_widget_skills_mastered') }}</span>
          </label>
        </div>

        <label class="mt-2 flex items-center gap-2 text-sm">
          <input type="checkbox" :checked="savingsOn" :disabled="!savingsOn && shopOptions.length === 0" data-test="savings-toggle" @change="onSavingsToggle" />
          {{ t('dash_widget_savings') }}
        </label>
        <p v-if="!savingsOn && shopOptions.length === 0" class="dim mt-1 text-xs" data-test="savings-none">{{ t('dash_widget_savings_none') }} <a href="/shop/" style="color: var(--accent)">{{ t('dash_widget_savings_shop') }}</a></p>
        <label v-if="savingsOn" class="mt-2 flex items-center gap-2 text-sm">
          <span class="dim flex-none">{{ t('dash_widget_savings_pick') }}</span>
          <select class="min-w-0 flex-1 rounded-lg border px-2 py-1.5" style="border-color: var(--border); background: var(--bg); color: var(--text)" :value="savingsId" data-test="savings-pick" @change="onSavingsPick">
            <option v-if="!shopOptions.some((o) => o.id === savingsId)" :value="savingsId" disabled>{{ t('dash_widget_savings_choose') }}</option>
            <option v-for="o in shopOptions" :key="o.id" :value="o.id">{{ o.name }} · {{ o.cost }}</option>
          </select>
        </label>

        <label class="mt-2 flex items-center gap-2 text-sm">
          <input type="checkbox" :checked="langOn" :disabled="!langOn && langOptions.length === 0" data-test="lang-toggle" @change="onLangToggle" />
          {{ t('dash_widget_lang') }}
        </label>
        <p v-if="!langOn && langOptions.length === 0" class="dim mt-1 text-xs" data-test="lang-none">{{ t('dash_widget_lang_none') }} <a href="/languages/" style="color: var(--accent)">{{ t('dash_widget_lang_link') }}</a></p>
        <label v-if="langOn" class="mt-2 flex items-center gap-2 text-sm">
          <span class="dim flex-none">{{ t('dash_widget_lang_pick') }}</span>
          <select class="min-w-0 flex-1 rounded-lg border px-2 py-1.5" style="border-color: var(--border); background: var(--bg); color: var(--text)" :value="langCode" data-test="lang-pick" @change="onLangPick">
            <option value="all">{{ t('dash_widget_lang_all') }}</option>
            <option v-for="o in langOptions" :key="o.code" :value="o.code">{{ o.name }} · {{ o.count }}</option>
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
