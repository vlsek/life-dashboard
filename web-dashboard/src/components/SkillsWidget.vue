<script setup lang="ts">
import { watch } from 'vue'
import CoinIcon from './CoinIcon.vue'
import { t } from '../lib/i18n'
import { useSkillsWidget, type SkillsWidgetState } from '../lib/useSkillsWidget'

// Виджет «Навыки»: карточка на каждый выбранный навык — название, полоса прогресса, «+шаг%» (и «−шаг%» на случай ошибки),
// на 100% — «освоено» и очки. Состояние наверх (`state`): блок «Виджеты» виден, пока хотя бы один виджет готов.
const props = defineProps<{ userId: string; ids: string[] }>()
const emit = defineEmits<{ state: [SkillsWidgetState] }>()

const { state, skills, error, busy, load, bump } = useSkillsWidget()
watch(() => [props.userId, props.ids.join(',')], () => void load(props.userId, props.ids), { immediate: true })
watch(state, (s) => emit('state', s), { immediate: true })
const btn = 'display:inline-flex;align-items:center;justify-content:center;min-width:3rem;height:2rem;padding:0 0.5rem;border-radius:0.5rem;font-size:0.75rem;'
</script>

<template>
  <div v-if="state === 'ready'" class="rounded-2xl border p-3.5" style="border-color: var(--border); background: var(--bg-card)" data-test="skills-widget">
    <div class="mb-2 flex items-center gap-2">
      <span class="dim text-xs">{{ t('dash_widget_skills') }}</span>
      <a href="/skills/" class="ml-auto text-xs" style="color: var(--accent)" data-test="skills-link">{{ t('dash_widget_skills_all') }}</a>
    </div>
    <div class="flex flex-col gap-3">
      <article v-for="s in skills" :key="s.id" data-test="skills-item">
        <div class="mb-1 flex items-center gap-2">
          <span class="min-w-0 flex-1 truncate font-medium" data-test="skills-name">{{ s.name }}</span>
          <span v-if="s.mastered" class="inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs" style="border-color: var(--accent); color: var(--accent)" data-test="skills-mastered">
            {{ t('dash_widget_skills_mastered') }} · {{ s.points ?? 10 }} <CoinIcon />
          </span>
        </div>
        <div class="flex items-center gap-2">
          <div class="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full" style="background: var(--bg)" role="progressbar" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="s.progress" data-test="skills-bar">
            <div class="h-full rounded-full" :style="{ width: s.progress + '%', background: 'var(--accent)', transition: 'width 0.4s ease' }" data-test="skills-fill"></div>
          </div>
          <span class="dim w-9 flex-none text-right text-xs" data-test="skills-percent">{{ s.progress }}%</span>
        </div>
        <div class="mt-1.5 flex gap-1.5">
          <button type="button" class="secondary" :style="btn" :disabled="busy.has(s.id) || s.progress <= 0" :aria-label="t('dash_widget_skills_down_aria').replace('{name}', s.name)" data-test="skills-down" @click="bump(s.id, -1)">−{{ s.step }}%</button>
          <button type="button" :style="btn + 'background: var(--accent); color: var(--accent-text); border: none;'" :disabled="busy.has(s.id) || s.progress >= 100" :aria-label="t('dash_widget_skills_up_aria').replace('{name}', s.name)" data-test="skills-up" @click="bump(s.id, 1)">+{{ s.step }}%</button>
        </div>
      </article>
    </div>
    <p v-if="error" class="mt-2 text-xs" style="color: #d6336c" data-test="skills-error">{{ error }}</p>
  </div>
</template>
