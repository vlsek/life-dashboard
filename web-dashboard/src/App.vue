<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import AppShell from './components/AppShell.vue'
import Icon from './components/Icon.vue'
import MetricIcon from './components/MetricIcon.vue'
import WaterSection from './components/WaterSection.vue'
import ChartsSection from './components/ChartsSection.vue'
import { useDashboard } from './lib/useDashboard'
import { t } from './lib/i18n'
import type { StreakItem } from './lib/streaks'

// Дашборд переносится по частям (см. ROADMAP.md, тикет B-dashboard) — самая большая и
// сложная страница сайта, с живыми пересчётами (стрики, дневной/недельный прогресс, вода,
// подходы). Этот файл — первая итерация: только блок стриков, портированный вместе с тестами
// (lib/streaks.ts). Остальное — графики, дневные метрики, вода, недельный/дневной прогресс,
// план на день — переносится следующими итерациями, порядок см. в ROADMAP.md.

const { auth, streaks, streaksError, init } = useDashboard()
onMounted(init)

const showAllStreaks = ref(false)
const topStreak = computed<StreakItem | null>(() => streaks.value[0] ?? null)

function streakLabel(item: StreakItem): string {
  if (item.kind === 'perfect_days') return t('dash_streak_perfect_days')
  if (item.kind === 'note_filled') return t('dash_streak_note_filled')
  return item.metric?.name ?? ''
}
</script>

<template>
  <AppShell :user-email="auth.status === 'ready' ? auth.userEmail : null" />

  <main class="mx-auto max-w-3xl px-4 pb-16 pt-4">
    <h1 class="mb-3 text-xl font-semibold">{{ t('dash_h1') }}</h1>

    <div class="mb-5 rounded-lg border p-3 text-sm" style="border-color: var(--border); background: var(--bg-card)">
      <p class="dim">{{ t('dash_wip_notice') }}</p>
      <a href="/dashboard.html" class="mt-1 inline-block" style="color: var(--accent)">{{ t('dash_wip_link') }}</a>
    </div>

    <p v-if="auth.status === 'loading'" class="dim">{{ t('loading_ellipsis') }}</p>

    <template v-else-if="auth.status === 'ready'">
      <div class="mb-4">
        <WaterSection :user-id="auth.userId" />
      </div>

      <h2 class="mb-2 text-lg font-semibold">{{ t('dash_charts_h2') }}</h2>
      <div class="mb-5">
        <ChartsSection :user-id="auth.userId" />
      </div>

      <p v-if="streaksError" class="dim">{{ t('comm_load_error') }} {{ streaksError }}</p>

      <template v-else-if="streaks.length > 0">
        <h2 class="mb-2 text-lg font-semibold">{{ t('dash_streaks_h2') }}</h2>

        <!-- Компактный бейдж — как в шапке профиля на ванильном сайте; клик показывает все стрики -->
        <button
          type="button"
          class="mb-3 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-bold"
          :class="{ 'streak-unlit': topStreak && !topStreak.todayCounted }"
          style="border-color: var(--border)"
          :title="topStreak?.todayCounted ? (streaks.length > 1 ? `${streakLabel(topStreak)} — ${t('dash_streak_more_hint')}` : streakLabel(topStreak)) : t('dash_streak_at_risk_warning')"
          @click="showAllStreaks = true"
        >
          <Icon name="flame" />
          {{ topStreak?.streak }}{{ topStreak?.unit === 'w' ? ' ' + t('dash_streak_unit_weeks') : '' }}
        </button>

        <div v-if="showAllStreaks" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="showAllStreaks = false">
          <div class="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border p-5" style="background: var(--bg-card); border-color: var(--border); color: var(--text)">
            <h3 class="mb-3 text-lg font-bold">{{ t('dash_streaks_h2') }}</h3>

            <p
              v-if="streaks.some((i) => !i.todayCounted)"
              class="mb-3 rounded-lg border p-2 text-sm"
              style="background: rgba(214, 51, 108, 0.12); border-color: #d6336c"
            >
              {{ t('dash_streak_at_risk_warning') }}
            </p>

            <div class="flex flex-wrap gap-2.5">
              <div
                v-for="(item, i) in streaks"
                :key="i"
                class="rounded-lg border p-2.5"
                :style="{ borderColor: item.todayCounted ? 'var(--border)' : '#d6336c' }"
              >
                <div class="flex items-center gap-1 text-lg font-bold">
                  {{ item.streak }}{{ item.unit === 'w' ? ' ' + t('dash_streak_unit_weeks') : '' }}
                  <Icon name="flame" />
                </div>
                <div class="dim flex items-center gap-1 text-xs">
                  <MetricIcon v-if="item.kind === 'metric'" :icon="item.metric?.icon" />
                  {{ streakLabel(item) }}{{ item.todayCounted ? '' : ' · ' + t('dash_streak_not_done_today') }}
                </div>
              </div>
            </div>

            <div class="mt-4 flex justify-end">
              <button
                type="button"
                class="rounded-lg border px-4 py-2 text-sm"
                style="border-color: var(--border); background: var(--bg); color: var(--text)"
                @click="showAllStreaks = false"
              >
                {{ t('dash_close_btn') }}
              </button>
            </div>
          </div>
        </div>
      </template>
    </template>
  </main>
</template>

<style scoped>
.streak-unlit {
  opacity: 0.55;
}
</style>
