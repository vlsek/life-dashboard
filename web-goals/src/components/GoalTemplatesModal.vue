<script setup lang="ts">
import { getLang, t } from '../lib/i18n'
import { TEMPLATE_GROUP_LABEL, templatesByGroup, type GoalTemplate } from '../lib/goalTemplates'

// Каталог шаблонов целей (BACKLOG 76.8): выбор шаблона открывает обычную форму с заполненными полями.
const props = defineProps<{ have: ReadonlySet<string> }>()
const emit = defineEmits<{ pick: [GoalTemplate]; close: [] }>()
const lang = getLang() === 'en' ? 'en' : 'ru'
const groups = templatesByGroup()
const added = (tpl: GoalTemplate) => props.have.has(tpl.ru.name.toLowerCase()) || props.have.has(tpl.en.name.toLowerCase()) // цель могли добавить на другом языке
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="emit('close')">
    <div class="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border p-5" style="background: var(--bg-card); border-color: var(--border); color: var(--text)" role="dialog" aria-modal="true" data-test="goal-templates-modal">
      <div class="mb-1 flex items-center justify-between">
        <h3 class="text-lg font-bold">{{ t('goals_tpl_title') }}</h3>
        <button type="button" class="secondary" :aria-label="t('goals_tpl_close')" data-test="goal-tpl-close" @click="emit('close')">✕</button>
      </div>
      <p class="dim mb-3 text-sm">{{ t('goals_tpl_intro') }}</p>
      <section v-for="[grp, list] in groups" :key="grp" class="mb-4" :data-test="'goal-tpl-group-' + grp">
        <h4 class="mb-1 font-medium">{{ TEMPLATE_GROUP_LABEL[grp][lang] }}</h4>
        <ul class="m-0 list-none p-0">
          <li v-for="tpl in list" :key="tpl.id" class="flex items-start gap-2 border-t py-2" style="border-color: var(--border)" data-test="goal-tpl-item">
            <div class="min-w-0 flex-1">
              <div>{{ tpl[lang].name }}</div>
              <div class="dim text-xs">{{ tpl.stages }} {{ t('goals_tpl_stages') }} · {{ t(('goals_diff_' + tpl.difficulty) as 'goals_diff_easy') }}</div>
            </div>
            <span v-if="added(tpl)" class="dim whitespace-nowrap text-xs" data-test="goal-tpl-have">✓ {{ t('goals_tpl_have') }}</span>
            <button v-else type="button" class="secondary whitespace-nowrap" data-test="goal-tpl-pick" @click="emit('pick', tpl)">{{ t('goals_tpl_add') }}</button>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
