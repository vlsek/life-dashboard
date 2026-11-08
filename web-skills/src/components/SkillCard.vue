<script setup lang="ts">
import { computed } from 'vue'
import CoinIcon from './CoinIcon.vue'
import Icon from './Icon.vue'
import { skillPercent } from '../lib/skills'
import { normalizeChecklist } from '../lib/skillChecklist'
import { t } from '../lib/i18n'
import type { Skill } from '../lib/types'

// Карточка навыка (BACKLOG 22, 11:58 «Навыки: старые прогресс-бары»): вместо строки таблицы с текстовой полоской «█░».
// Современный прогресс-бар (скруглённый, цвет акцента темы, плавное заполнение — как у товаров магазина), «N%», шаги −/+,
// круглая отметка «освоено» и иконка баллов-монеты вместо эмодзи ⭐. Логика (bumpProgress/toggleMastered) снаружи, без изменений.
const props = defineProps<{ skill: Skill }>()
const emit = defineEmits<{ bump: [dir: 1 | -1]; mastered: []; edit: []; delete: []; item: [index: number] }>()
const checklist = computed(() => normalizeChecklist(props.skill.checklist)) // этапы (77.12): есть — процент по ним, кнопок −/+ нет

const pct = computed(() => skillPercent(props.skill.progress))
const step = computed(() => props.skill.step ?? 10)
const iconBtn = 'display:inline-flex;align-items:center;justify-content:center;width:2rem;height:2rem;padding:0;border-radius:0.5rem;background:transparent;'
</script>

<template>
  <article class="relative rounded-xl border p-3" style="border-color: var(--border); background: var(--bg-card)" data-test="skill-card">
    <div class="flex items-start gap-3">
      <button
        type="button"
        role="checkbox"
        :aria-checked="false"
        :aria-label="t('skills_mark_mastered_aria')"
        class="skill-check mt-0.5 shrink-0"
        data-test="skill-mastered"
        @click="emit('mastered')"
      ></button>

      <div class="min-w-0 flex-1">
        <!-- отступ справа только у заголовка: под кнопками действий (в углу карточки); полоса прогресса и нижняя строка идут на всю ширину (аудит 576, как в карточке цели 58.8) -->
        <h4 class="skill-title m-0 break-words text-base font-medium" data-test="skill-name">{{ skill.name }}</h4>

        <div class="mt-2 flex items-center gap-2">
          <div
            class="h-2 min-w-0 flex-1 overflow-hidden rounded-full"
            style="background: var(--border)"
            role="progressbar"
            :aria-valuenow="pct"
            aria-valuemin="0"
            aria-valuemax="100"
            data-test="skill-bar"
          >
            <div class="h-full rounded-full" :style="{ width: pct + '%', background: 'var(--accent)', transition: 'width 0.4s ease' }" data-test="skill-bar-fill" />
          </div>
          <span class="dim whitespace-nowrap text-xs" data-test="skill-percent">{{ pct }}%</span>
        </div>

        <ul v-if="checklist.length" class="m-0 mt-2 list-none p-0" data-test="skill-checklist">
          <li v-for="(it, i) in checklist" :key="i">
            <button type="button" role="checkbox" :aria-checked="it.done" class="flex w-full items-center gap-2 border-0 bg-transparent p-1 text-left text-sm" style="background: transparent; color: var(--text)" data-test="skill-checklist-item" @click="emit('item', i)">
              <span class="skill-check shrink-0" :class="{ 'skill-check-on': it.done }" aria-hidden="true"></span>
              <span :style="it.done ? 'color: var(--text-dim); text-decoration: line-through' : ''">{{ it.name }}</span>
            </button>
          </li>
        </ul>

        <div class="mt-2 flex items-center gap-1.5" data-test="skill-footer">
          <template v-if="!checklist.length">
            <button type="button" class="secondary px-2 text-xs" :aria-label="t('skills_step_down_aria')" data-test="skill-down" @click="emit('bump', -1)">−{{ step }}%</button>
            <button type="button" class="secondary px-2 text-xs" :aria-label="t('skills_step_up_aria')" data-test="skill-up" @click="emit('bump', 1)">+{{ step }}%</button>
          </template>
          <span class="ml-auto inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs" style="border-color: var(--border)" data-test="skill-points">
            {{ skill.points ?? 10 }} <CoinIcon />
          </span>
        </div>
      </div>

      <div class="skill-actions flex gap-0.5" data-test="skill-actions">
        <button type="button" class="secondary" :style="iconBtn" :title="t('skills_edit_aria')" :aria-label="t('skills_edit_aria')" data-test="skill-edit" @click="emit('edit')"><Icon name="edit" /></button>
        <button type="button" class="danger" :style="iconBtn" :title="t('skills_delete_aria')" :aria-label="t('skills_delete_aria')" data-test="skill-delete" @click="emit('delete')"><Icon name="trash" /></button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.skill-actions {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
}
.skill-title {
  padding-right: 4.4rem;
  min-height: 1.9rem; /* не ниже кнопок действий в углу */
}
.skill-check {
  width: 1.65rem;
  height: 1.65rem;
  padding: 0;
  border-radius: 9999px;
  border: 2px solid var(--border);
  background: transparent;
  cursor: pointer;
}
.skill-check-on {
  background: var(--accent);
  border-color: var(--accent);
}
[data-test='skill-checklist-item'] .skill-check {
  width: 1.25rem;
  height: 1.25rem;
}
</style>
