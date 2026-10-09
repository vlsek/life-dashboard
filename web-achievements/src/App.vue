<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AppShell from './components/AppShell.vue'
import AchievementCard from './components/AchievementCard.vue'
import AchievementUnlockedModal from './components/AchievementUnlockedModal.vue'
import AchievementShowcase from './components/AchievementShowcase.vue'
import CollapseChevron from './components/CollapseChevron.vue'
import { useAchievements } from './lib/useAchievements'
import { groupStates, isUnlocked } from './lib/achievements'
import { groupTitle } from './lib/achievementText'
import { filterGroups, type GradeFilter } from './lib/showcase'
import { RARITIES, RARITY_COLOR } from './lib/rewards'
import { t } from './lib/i18n'
import type { DictKey } from './lib/i18n'

const { auth, states, unlocked, newlyUnlocked, mode, error, loading, init } = useAchievements()
onMounted(init)

// Поздравление показываем один раз: после закрытия список очищается (в хранилище достижение уже записано, повторно не придёт).
const celebrate = ref<string[]>([])
watch(newlyUnlocked, (keys) => (celebrate.value = [...keys]), { immediate: true })
const celebrateStates = computed(() => states.value.filter((s) => celebrate.value.includes(s.def.key)))

// Фильтр по грейду (BACKLOG 44.12, срез 2): при выбранном грейде показываем только подходящие карточки, группы раскрыты сами
const gradeFilter = ref<GradeFilter>('all')
const groups = computed(() => filterGroups(groupStates(states.value, unlocked.value), unlocked.value, gradeFilter.value))

// Категории по умолчанию СВЁРНУТЫ (BACKLOG 38, решение владельца 2026-10-05); раскрытое не запоминаем — при каждом заходе снова свёрнуто.
const expanded = ref<Set<string>>(new Set())
const isOpen = (group: string) => gradeFilter.value !== 'all' || expanded.value.has(group)
function toggle(group: string) {
  const next = new Set(expanded.value)
  if (next.has(group)) next.delete(group)
  else next.add(group)
  expanded.value = next
}
const total = computed(() => states.value.length)
const openCount = computed(() => states.value.filter((s) => isUnlocked(s.def.key, unlocked.value)).length)
const overallPercent = computed(() => (total.value ? Math.round((openCount.value / total.value) * 100) : 0))
</script>

<template>
  <AppShell :user-email="auth.status === 'ready' ? auth.userEmail : null" />

  <main class="mx-auto max-w-3xl px-4 pb-16 pt-4">
    <h1 class="mb-1 text-xl font-semibold">{{ t('ach_title') }}</h1>
    <p class="dim mb-4 text-sm">{{ t('ach_intro') }}</p>

    <p v-if="auth.status === 'loading' || (auth.status === 'ready' && loading && !states.length)" class="dim">…</p>

    <template v-else-if="auth.status === 'ready'">
      <p v-if="error" class="dim">{{ t('comm_load_error') }} {{ error }}</p>

      <template v-else>
        <div class="mb-5 rounded-xl border p-3" style="background: var(--bg-card); border-color: var(--border)" data-testid="achievements-summary">
          <div class="flex items-baseline justify-between">
            <span class="text-sm">{{ t('ach_unlocked_count') }}</span>
            <span class="font-semibold" data-testid="achievements-count">{{ openCount }} / {{ total }}</span>
          </div>
          <div class="mt-2 h-2 w-full overflow-hidden rounded-full" style="background: color-mix(in srgb, var(--text-dim) 25%, transparent)">
            <div class="h-full rounded-full" :style="{ width: overallPercent + '%', background: 'var(--accent)' }"></div>
          </div>
        </div>

        <AchievementShowcase :states="states" :unlocked="unlocked" />

        <div class="mb-4 flex flex-wrap items-center gap-2" role="group" :aria-label="t('ach_filter_label')" data-testid="grade-filter">
          <button type="button" class="grade-chip rounded-full border px-3 py-1 text-xs" :class="{ 'grade-chip-on': gradeFilter === 'all' }" :aria-pressed="gradeFilter === 'all'" data-testid="grade-chip" data-grade="all" @click="gradeFilter = 'all'">{{ t('ach_filter_all') }}</button>
          <button v-for="r in RARITIES" :key="r" type="button" class="grade-chip flex items-center gap-1 rounded-full border px-3 py-1 text-xs" :class="{ 'grade-chip-on': gradeFilter === r }" :aria-pressed="gradeFilter === r" data-testid="grade-chip" :data-grade="r" @click="gradeFilter = r">
            <span class="inline-block h-2 w-2 rounded-full" :style="{ background: RARITY_COLOR[r] }" aria-hidden="true"></span>{{ t(('ach_grade_' + r) as DictKey) }}
          </button>
        </div>
        <p v-if="!groups.length" class="dim text-sm" data-testid="grade-filter-empty">{{ t('ach_filter_empty') }}</p>

        <section v-for="g in groups" :key="g.group" class="mb-4" :data-group="g.group" :data-open="String(isOpen(g.group))">
          <button type="button" class="collapse-head mb-2 flex items-center gap-2 text-base font-medium" :aria-expanded="isOpen(g.group)" :aria-controls="'grp-' + g.group" data-testid="group-toggle" @click="toggle(g.group)">
            <CollapseChevron :collapsed="!isOpen(g.group)" />
            <span class="flex-1">{{ groupTitle(g.group) }}</span>
            <span class="dim text-xs">{{ g.unlockedCount }} / {{ g.items.length }}</span>
          </button>
          <div v-if="isOpen(g.group)" :id="'grp-' + g.group" class="grid grid-cols-2 gap-3 sm:grid-cols-3" data-testid="group-body">
            <AchievementCard
              v-for="s in g.items"
              :key="s.def.key"
              :state="s"
              :unlocked="isUnlocked(s.def.key, unlocked)"
              :unlocked-at="unlocked[s.def.key] ?? null"
            />
          </div>
        </section>

        <p v-if="mode === 'local'" class="dim mt-2 text-xs" data-testid="achievements-local-note">{{ t('ach_local_note') }}</p>
      </template>
    </template>
  </main>

  <AchievementUnlockedModal v-if="!error && celebrateStates.length" :states="celebrateStates" @close="celebrate = []" />
</template>

<style scoped>
.grade-chip {
  background: var(--bg-card);
  border-color: var(--border);
  color: var(--text);
}
.grade-chip-on {
  border-color: var(--accent);
  box-shadow: inset 0 0 0 1px var(--accent);
}
</style>
