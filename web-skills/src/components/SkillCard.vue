<script setup lang="ts">
import { computed } from 'vue'
import CoinIcon from './CoinIcon.vue'
import Icon from './Icon.vue'
import { skillPercent } from '../lib/skills'
import { t } from '../lib/i18n'
import type { Skill } from '../lib/types'

// Карточка навыка (BACKLOG 22, 11:58 «Навыки: старые прогресс-бары»): вместо строки таблицы с текстовой полоской «█░».
// Современный прогресс-бар (скруглённый, цвет акцента темы, плавное заполнение — как у товаров магазина), «N%», шаги −/+,
// круглая отметка «освоено» и иконка баллов-монеты вместо эмодзи ⭐. Логика (bumpProgress/toggleMastered) снаружи, без изменений.
const props = defineProps<{ skill: Skill }>()
const emit = defineEmits<{ bump: [dir: 1 | -1]; mastered: []; edit: []; delete: [] }>()

const pct = computed(() => skillPercent(props.skill.progress))
const step = computed(() => props.skill.step ?? 10)
const iconBtn = 'display:inline-flex;align-items:center;justify-content:center;width:2rem;height:2rem;padding:0;border-radius:0.5rem;background:transparent;'
</script>

<template>
  <article class="rounded-xl border p-3" style="border-color: var(--border); background: var(--bg-card)" data-test="skill-card">
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
        <div class="flex items-start justify-between gap-2">
          <h4 class="m-0 break-words text-base font-medium" data-test="skill-name">{{ skill.name }}</h4>
          <span class="inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs" style="border-color: var(--border)" data-test="skill-points">
            {{ skill.points ?? 10 }} <CoinIcon />
          </span>
        </div>

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

        <div class="mt-2 flex gap-1.5">
          <button type="button" class="secondary px-2 text-xs" :aria-label="t('skills_step_down_aria')" data-test="skill-down" @click="emit('bump', -1)">−{{ step }}%</button>
          <button type="button" class="secondary px-2 text-xs" :aria-label="t('skills_step_up_aria')" data-test="skill-up" @click="emit('bump', 1)">+{{ step }}%</button>
        </div>
      </div>

      <div class="flex shrink-0 gap-0.5">
        <button type="button" class="secondary" :style="iconBtn" :title="t('skills_edit_aria')" :aria-label="t('skills_edit_aria')" data-test="skill-edit" @click="emit('edit')"><Icon name="edit" /></button>
        <button type="button" class="danger" :style="iconBtn" :title="t('skills_delete_aria')" :aria-label="t('skills_delete_aria')" data-test="skill-delete" @click="emit('delete')"><Icon name="trash" /></button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.skill-check {
  width: 1.65rem;
  height: 1.65rem;
  padding: 0;
  border-radius: 9999px;
  border: 2px solid var(--border);
  background: transparent;
  cursor: pointer;
}
</style>
