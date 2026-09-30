<script setup lang="ts">
import { computed, onMounted } from 'vue'
import AppShell from './components/AppShell.vue'
import CatalogModal from './components/CatalogModal.vue'
import CustomChallengeForm from './components/CustomChallengeForm.vue'
import DailyChallengeCard from './components/DailyChallengeCard.vue'
import CumulativeChallengeCard from './components/CumulativeChallengeCard.vue'
import { useChallenges } from './lib/useChallenges'
import { t } from './lib/i18n'
import { ref } from 'vue'
import { localDateOfTimestamp, todayStr } from './lib/date'
import type { Challenge, ChallengeTemplate, CustomChallengeFormInput } from './lib/types'

const {
  auth,
  instances,
  entriesByChallenge,
  error,
  init,
  startFromTemplate,
  startCustom,
  upsertDailyEntry,
  addCumulativeEntry,
  deleteEntry,
  markCompleted,
  abandonChallenge,
} = useChallenges()
onMounted(init)

const active = computed(() => instances.value.filter((ch) => !ch.completed))
const completed = computed(() => instances.value.filter((ch) => ch.completed))

function entriesFor(ch: Challenge) {
  return entriesByChallenge.value[ch.id] || []
}

function fmtRu(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

const catalogOpen = ref(false)
const customFormOpen = ref(false)

async function onSelectTemplate(tpl: ChallengeTemplate) {
  await startFromTemplate(tpl)
  catalogOpen.value = false
}
async function onSaveCustom(res: CustomChallengeFormInput) {
  await startCustom(res)
  customFormOpen.value = false
}

async function onAbandon(ch: Challenge) {
  if (!confirm(t('ch_confirm_abandon'))) return
  await abandonChallenge(ch)
}
async function onDeleteEntry(id: string) {
  await deleteEntry(id)
}
async function onSetToday(challengeId: string, value: number) {
  await upsertDailyEntry(challengeId, todayStr(), value)
}
</script>

<template>
  <AppShell :user-email="auth.status === 'ready' ? auth.userEmail : null" />

  <main class="mx-auto max-w-3xl px-4 pb-16 pt-4">
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-xl font-semibold">{{ t('ch_h1') }}</h1>
    </div>
    <div class="mb-4 flex flex-wrap gap-2">
      <button @click="catalogOpen = true">{{ t('ch_catalog_btn') }}</button>
      <button class="secondary" @click="customFormOpen = true">{{ t('ch_custom_btn') }}</button>
    </div>

    <p v-if="auth.status === 'loading'" class="dim">…</p>

    <template v-else-if="auth.status === 'ready'">
      <h2 class="mb-2 mt-4 text-base font-medium">{{ t('ch_active_h2') }}</h2>
      <p v-if="error" class="dim">{{ t('comm_load_error') }} {{ error }} — {{ t('ch_migration_hint') }}</p>
      <template v-else>
        <p v-if="active.length === 0" class="dim">{{ t('ch_no_active') }}</p>
        <template v-for="ch in active" :key="ch.id">
          <CumulativeChallengeCard
            v-if="ch.type === 'cumulative_count'"
            :challenge="ch"
            :entries="entriesFor(ch)"
            @abandon="onAbandon"
            @mark-completed="markCompleted"
            @add-entry="addCumulativeEntry"
            @delete-entry="onDeleteEntry"
          />
          <DailyChallengeCard
            v-else
            :challenge="ch"
            :entries="entriesFor(ch)"
            @abandon="onAbandon"
            @mark-completed="markCompleted"
            @set-today="onSetToday"
          />
        </template>

        <h2 class="mb-2 mt-6 text-base font-medium">{{ t('ch_completed_h2') }}</h2>
        <p v-if="completed.length === 0" class="dim">{{ t('ch_no_completed') }}</p>
        <div v-for="ch in completed" :key="ch.id" class="card mb-2">
          <strong>{{ ch.icon }} {{ ch.title }}</strong>
          <span class="dim text-sm"> — {{ fmtRu((ch.completed_at ? localDateOfTimestamp(ch.completed_at) : '') || ch.start_date) }}</span>
        </div>
      </template>
    </template>

    <CatalogModal v-if="catalogOpen" @close="catalogOpen = false" @select="onSelectTemplate" />
    <CustomChallengeForm v-if="customFormOpen" @close="customFormOpen = false" @save="onSaveCustom" />
  </main>
</template>
