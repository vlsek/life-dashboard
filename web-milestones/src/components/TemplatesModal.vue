<script setup lang="ts">
import { getLang, t } from '../lib/i18n'
import { TEMPLATE_CATEGORY_LABEL, templatesByCategory, type MilestoneTemplate } from '../lib/milestoneTemplates'

// Каталог шаблонов вех (BACKLOG 44.9): выбираете шаблон — открывается форма с заполненными полями.
const props = defineProps<{ have: ReadonlySet<string> }>()
const emit = defineEmits<{ pick: [MilestoneTemplate]; close: [] }>()
const lang = getLang() === 'en' ? 'en' : 'ru'
const groups = templatesByCategory()
const intervalText = (tpl: MilestoneTemplate) => {
  const u = tpl.unit === 'month' ? t('ms_unit_short_month') : tpl.unit === 'year' ? t('ms_unit_short_year') : tpl.unit === 'week' ? t('ms_unit_short_week') : t('ms_unit_short_day')
  return `${t('ms_every')} ${tpl.value} ${u}`
}
const added = (tpl: MilestoneTemplate) => props.have.has(tpl[lang].name.toLowerCase())
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="emit('close')">
    <div class="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border p-5" style="background: var(--bg-card); border-color: var(--border); color: var(--text)" data-test="templates-modal">
      <div class="mb-1 flex items-center justify-between">
        <h3 class="text-lg font-bold">{{ t('ms_tpl_title') }}</h3>
        <button type="button" class="secondary" :aria-label="t('ms_tpl_close')" @click="emit('close')">✕</button>
      </div>
      <p class="dim mb-3 text-sm">{{ t('ms_tpl_intro') }}</p>
      <section v-for="[cat, list] in groups" :key="cat" class="mb-4" :data-test="'tpl-cat-' + cat">
        <h4 class="mb-1 font-medium">{{ TEMPLATE_CATEGORY_LABEL[cat][lang] }}</h4>
        <p v-if="cat === 'health'" class="mb-2 text-xs" style="color: var(--accent)" data-test="tpl-health-note">{{ t('ms_tpl_health_note') }}</p>
        <ul class="m-0 list-none p-0">
          <li v-for="tpl in list" :key="tpl.id" class="flex items-start gap-2 border-t py-2" style="border-color: var(--border)" data-test="tpl-item">
            <div class="min-w-0 flex-1">
              <div>{{ tpl[lang].name }}</div>
              <div class="dim text-xs">{{ intervalText(tpl) }}<template v-if="tpl.km"> · {{ tpl.km.toLocaleString() }} {{ t('ms_km') }}</template></div>
              <div v-if="tpl[lang].note" class="dim text-xs">{{ tpl[lang].note }}</div>
            </div>
            <span v-if="added(tpl)" class="dim whitespace-nowrap text-xs" data-test="tpl-have">✓ {{ t('ms_tpl_have') }}</span>
            <button v-else type="button" class="secondary whitespace-nowrap" data-test="tpl-pick" @click="emit('pick', tpl)">{{ t('ms_tpl_add') }}</button>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
