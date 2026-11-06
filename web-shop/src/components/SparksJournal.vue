<script setup lang="ts">
import { computed, ref } from 'vue'
import { t } from '../lib/i18n'
import { buildJournal, fmtDay, ymd, type JournalSource, type Purchase } from '../lib/sparksJournal'

// «Откуда мои огоньки» (BACKLOG 78.5): раскрывающийся журнал за 30 дней. Данные грузятся при первом раскрытии, не при открытии магазина.
const props = defineProps<{ load: () => Promise<JournalSource>; purchases: Purchase[]; balance: number | null; today?: string }>()
const open = ref(false)
const loading = ref(false)
const failed = ref(false)
const source = ref<JournalSource | null>(null)

async function fetchJournal() {
  loading.value = true
  failed.value = false
  try {
    source.value = await props.load()
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}
function toggle() {
  open.value = !open.value
  if (open.value && !source.value && !loading.value) void fetchJournal()
}
const journal = computed(() => (source.value ? buildJournal(source.value, props.purchases, props.today ?? ymd(new Date())) : null))
const cap = computed(() => source.value?.cap ?? null)
</script>

<template>
  <section class="card mb-3 rounded-xl border px-3.5 py-2" style="border-color: var(--border)" data-testid="sparks-journal">
    <button type="button" class="secondary flex min-h-6 w-full items-center justify-between border-0 bg-transparent p-0 text-left text-sm" :aria-expanded="open" data-testid="journal-toggle" @click="toggle">
      <span>{{ t('shop_journal_title') }}</span>
      <span aria-hidden="true">{{ open ? '▾' : '▸' }}</span>
    </button>
    <div v-if="open" class="mt-2 text-sm" data-testid="journal-body">
      <p v-if="loading" class="dim m-0" role="status" data-testid="journal-loading">{{ t('load_loading') }}</p>
      <p v-else-if="failed" class="m-0" style="color: var(--danger)" role="alert" data-testid="journal-error">
        {{ t('shop_journal_error') }} <button type="button" class="secondary" data-testid="journal-retry" @click="fetchJournal">{{ t('shop_journal_retry') }}</button>
      </p>
      <template v-else-if="journal">
        <p class="m-0" data-testid="journal-summary">
          {{ t('shop_journal_earned') }}: <b>+{{ journal.earned }}</b> · {{ t('shop_journal_spent') }}: <b>−{{ journal.spent }}</b><template v-if="balance != null"> · {{ t('shop_journal_balance') }}: <b>{{ balance }}</b></template>
        </p>
        <p class="dim mb-2 mt-1 text-xs" data-testid="journal-note">{{ cap ? t('shop_journal_cap').replace('{n}', String(cap)) : t('shop_journal_cap_none') }}</p>
        <p v-if="journal.days.length === 0" class="dim m-0" data-testid="journal-empty">{{ t('shop_journal_empty') }}</p>
        <ul v-else class="m-0 list-none p-0">
          <li v-for="d in journal.days" :key="d.day" class="border-t py-1.5" style="border-color: var(--border)" data-testid="journal-day">
            <div class="flex flex-wrap items-baseline gap-x-2">
              <b>{{ fmtDay(d.day) }}</b>
              <span v-if="d.earned" data-testid="journal-day-earned">+{{ d.earned }}</span>
              <span v-if="d.spent" data-testid="journal-day-spent">−{{ d.spent }}</span>
              <span v-if="d.capped" class="dim text-xs" data-testid="journal-day-capped">{{ t('shop_journal_capped') }}</span>
            </div>
            <div v-if="d.from.length" class="dim text-xs">{{ d.from.map((f) => (f.name ?? t('shop_journal_deleted')) + (f.amount > 1 ? ' ×' + f.amount : '')).join(', ') }}</div>
            <div v-if="d.bought.length" class="dim text-xs">{{ t('shop_journal_bought') }}: {{ d.bought.map((b) => b.name + ' (−' + b.cost + ')').join(', ') }}</div>
          </li>
        </ul>
      </template>
    </div>
  </section>
</template>
