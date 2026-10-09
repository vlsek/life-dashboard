<script setup lang="ts">
import { computed } from 'vue'
import MetricIcon from './MetricIcon.vue'
import { t } from '../lib/i18n'
import { metricProgressLabel } from '../lib/evening'
import type { SkipItem } from '../lib/skipYesterday'

// Окно «вчера» (BACKLOG 47.3): метрики, не выполненные вчера. «Пропустить день» — день не учитывается, серия не рвётся; «Оставить» — всё как есть.
// Сверху те, чью серию вчерашний пробел оборвёт. Показывается раз в день при первом открытии, выключается в «Глобальных настройках».
const props = defineProps<{ items: SkipItem[]; error?: string }>()
const emit = defineEmits<{ skip: [id: string]; keep: [id: string]; close: [] }>()
const risky = computed(() => props.items.filter((i) => i.breaksStreak))
const plain = computed(() => props.items.filter((i) => !i.breaksStreak))
const streakText = (n: number) => t('skip_prompt_streak').replace('{n}', String(n))
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" data-test="skip-prompt" @click.self="emit('close')">
    <div class="w-full max-w-md rounded-2xl border p-5" style="background: var(--bg-card); border-color: var(--border); color: var(--text); max-height: 85vh; overflow-y: auto" role="dialog" aria-modal="true" :aria-label="t('skip_prompt_title')">
      <h3 class="m-0 mb-1 text-lg">{{ t('skip_prompt_title') }}</h3>
      <p class="dim mb-3 mt-0 text-sm">{{ t('skip_prompt_intro') }}</p>

      <template v-for="group in [{ key: 'risky', list: risky, title: 'skip_prompt_risky' }, { key: 'plain', list: plain, title: 'skip_prompt_plain' }]" :key="group.key">
        <template v-if="group.list.length">
          <h4 class="mb-1 mt-3 text-sm font-medium" :data-test="'skip-group-' + group.key">{{ t(group.title as never) }}</h4>
          <ul class="m-0 list-none p-0">
            <li v-for="it in group.list" :key="it.metric.id" class="flex flex-wrap items-center gap-2 border-b py-2 last:border-0" style="border-color: var(--border)" data-test="skip-item">
              <MetricIcon :icon="it.metric.icon" />
              <span class="min-w-0 flex-1">
                {{ it.metric.name }}
                <span v-if="metricProgressLabel(it.metric, it.value)" class="dim ml-1 text-xs">{{ metricProgressLabel(it.metric, it.value) }}</span>
                <span v-if="it.streakBefore > 0" class="dim ml-1 text-xs" data-test="skip-streak">· {{ streakText(it.streakBefore) }}</span>
              </span>
              <button type="button" class="rounded-lg px-2.5 py-1 text-sm" data-test="skip-btn" @click="emit('skip', it.metric.id)">{{ t('skip_prompt_skip_btn') }}</button>
              <button type="button" class="secondary rounded-lg px-2.5 py-1 text-sm" data-test="keep-btn" @click="emit('keep', it.metric.id)">{{ t('skip_prompt_keep_btn') }}</button>
            </li>
          </ul>
        </template>
      </template>

      <p v-if="error" class="mt-2 text-sm" style="color: var(--danger)" role="alert" data-test="skip-error">{{ t('skip_prompt_error') }}{{ error }}</p>
      <div class="mt-4 flex justify-end">
        <button type="button" class="secondary rounded-lg px-3 py-1.5 text-sm" data-test="skip-close" @click="emit('close')">{{ t('dash_close_btn') }}</button>
      </div>
    </div>
  </div>
</template>
