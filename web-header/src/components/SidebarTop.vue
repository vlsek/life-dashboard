<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../lib/i18n'
import { profileLabel } from '../lib/sidebarProfile'
import { frameClass, frameShadow } from '../lib/customFrame'
import type { WeekDaySegment } from '../lib/progress'
import type { WeekShape } from '../lib/progressSettings'
import DayWeekBadge from './DayWeekBadge.vue'

// Верх левого бокового меню (BACKLOG 6.2): аватар, имя, почта — ссылка на Аккаунт; по опции «Прогресс в меню»
// (BACKLOG 2.3) — кольца дня и недели с процентами (клик — сводка). Рисуется Teleport'ом в #sidebar-top из AppShell.
interface Ring { basePct: number; bonusPct: number; totalPct: number; title: string; shape?: WeekShape; days?: WeekDaySegment[] | null }
const props = defineProps<{ displayName: string | null; email: string | null; avatarUrl: string | null; avatarFrame?: string | null; showProgress: boolean; day: Ring | null; week: Ring | null }>()
const emit = defineEmits<{ 'open-summary': [kind: 'day' | 'week'] }>()
const label = computed(() => profileLabel(props.displayName, props.email))
</script>

<template>
  <div class="gh-side" data-test="sidebar-top">
    <a href="/account/" class="gh-side-user" data-test="sidebar-user" :title="t('nav_account_title')">
      <img v-if="avatarUrl" :src="avatarUrl" alt="" class="gh-side-avatar" :class="frameClass(avatarFrame)" :style="{ boxShadow: frameShadow(avatarFrame) }" data-test="sidebar-avatar" />
      <span v-else class="gh-side-avatar gh-side-initial" :class="frameClass(avatarFrame)" :style="{ boxShadow: frameShadow(avatarFrame) }" data-test="sidebar-initial">{{ label.initial }}</span>
      <span class="gh-side-text">
        <span class="gh-side-name" data-test="sidebar-name">{{ label.name }}</span>
        <span v-if="email && displayName" class="gh-dim gh-side-email">{{ email }}</span>
      </span>
    </a>
    <div v-if="showProgress && (day || week)" class="gh-side-progress" data-test="sidebar-progress">
      <div v-if="day" class="gh-side-ring">
        <DayWeekBadge kind="day" v-bind="day" @click="emit('open-summary', 'day')" />
        <span class="gh-dim">{{ t('dash_day_progress_label') }}</span>
      </div>
      <div v-if="week" class="gh-side-ring">
        <DayWeekBadge kind="week" v-bind="week" @click="emit('open-summary', 'week')" />
        <span class="gh-dim">{{ t('dash_week_progress_label') }}</span>
      </div>
    </div>
  </div>
</template>
