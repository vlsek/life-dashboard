<script setup lang="ts">
import { computed } from 'vue'
import GradeBadge from './GradeBadge.vue'
import { gradeOf } from '../lib/grade'
import { achievementTitle } from '../lib/achievementText'
import { closestLocked, recentUnlocked, remaining } from '../lib/showcase'
import { t } from '../lib/i18n'
import type { AchievementState, Unlocked } from '../lib/achievements'

// Витрина над списком (BACKLOG 44.12, срез 2): «Недавно открытые» и «Ближе всего к открытию» (с оставшимся числом до цели).
const props = defineProps<{ states: AchievementState[]; unlocked: Unlocked }>()
const recent = computed(() => recentUnlocked(props.states, props.unlocked))
const next = computed(() => closestLocked(props.states, props.unlocked))
</script>

<template>
  <div v-if="recent.length || next.length" class="mb-5 grid gap-3 sm:grid-cols-2" data-testid="achievements-showcase">
    <section v-if="recent.length" class="rounded-xl border p-3" style="background: var(--bg-card); border-color: var(--border)" data-testid="showcase-recent">
      <h2 class="mb-2 text-sm font-medium">{{ t('ach_recent_title') }}</h2>
      <ul class="flex flex-col gap-2">
        <li v-for="s in recent" :key="s.def.key" class="flex items-center gap-2" data-testid="showcase-item" :data-key="s.def.key">
          <GradeBadge :grade="gradeOf(s.def.key)" :icon="s.def.icon" :unlocked="true" :size="32" />
          <span class="text-sm leading-tight">{{ achievementTitle(s.def) }}</span>
        </li>
      </ul>
    </section>
    <section v-if="next.length" class="rounded-xl border p-3" style="background: var(--bg-card); border-color: var(--border)" data-testid="showcase-next">
      <h2 class="mb-2 text-sm font-medium">{{ t('ach_next_title') }}</h2>
      <ul class="flex flex-col gap-2">
        <li v-for="s in next" :key="s.def.key" class="flex items-center gap-2" data-testid="showcase-item" :data-key="s.def.key">
          <GradeBadge :grade="gradeOf(s.def.key)" :icon="s.def.icon" :unlocked="false" :size="32" />
          <span class="flex-1 text-sm leading-tight">{{ achievementTitle(s.def) }}</span>
          <span class="dim text-xs" data-testid="showcase-left">{{ t('ach_left').replace('{n}', String(remaining(s))) }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>
