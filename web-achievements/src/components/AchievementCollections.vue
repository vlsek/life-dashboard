<script setup lang="ts">
import { computed } from 'vue'
import GradeBadge from './GradeBadge.vue'
import EmojiText from './EmojiText.vue'
import { gradeOf } from '../lib/grade'
import { achievementTitle } from '../lib/achievementText'
import { collectionStates } from '../lib/collections'
import { t } from '../lib/i18n'
import type { DictKey } from '../lib/i18n'
import type { AchievementState, Unlocked } from '../lib/achievements'

// «Коллекции» (BACKLOG 78.6, срез 1): наборы из достижений разных разделов с полосой «N из M»; значок набора можно нажать — страница
// прокрутится к карточке достижения (то же, что в витрине, 81.2).
const props = defineProps<{ states: AchievementState[]; unlocked: Unlocked }>()
const emit = defineEmits<{ pick: [key: string] }>()
const cols = computed(() => collectionStates(props.states, props.unlocked).filter((c) => c.total > 0))
const completed = computed(() => cols.value.filter((c) => c.complete).length)
</script>

<template>
  <section v-if="cols.length" class="mb-5" data-testid="collections">
    <h2 class="mb-2 text-base font-medium"><EmojiText :text="t('ach_collections_title')" /> <span class="dim text-xs font-normal" data-testid="collections-done">{{ t('ach_col_sets_done').replace('{done}', String(completed)).replace('{total}', String(cols.length)) }}</span></h2>
    <div class="grid gap-3 sm:grid-cols-2">
      <article v-for="c in cols" :key="c.id" class="rounded-xl border p-3" :class="{ 'col-complete': c.complete }" style="background: var(--bg-card); border-color: var(--border)" data-testid="collection" :data-id="c.id" :data-done="c.done">
        <div class="flex items-baseline justify-between gap-2">
          <h3 class="m-0 text-sm font-medium">{{ t(('ach_col_' + c.id) as DictKey) }}</h3>
          <span class="dim text-xs" data-testid="collection-count">{{ t('ach_col_count').replace('{done}', String(c.done)).replace('{total}', String(c.total)) }}</span>
        </div>
        <div class="mt-2 h-1.5 w-full overflow-hidden rounded-full" style="background: color-mix(in srgb, var(--text-dim) 25%, transparent)" role="progressbar" :aria-label="t(('ach_col_' + c.id) as DictKey)" :aria-valuemin="0" :aria-valuemax="c.total" :aria-valuenow="c.done">
          <div class="h-full rounded-full" :style="{ width: (c.total ? (c.done / c.total) * 100 : 0) + '%', background: 'var(--accent)' }"></div>
        </div>
        <p v-if="c.complete" class="col-done-label m-0 mt-2 text-xs font-medium" data-testid="collection-complete">{{ t('ach_col_complete') }}</p>
        <ul class="m-0 mt-2 flex list-none flex-wrap gap-2 p-0">
          <li v-for="i in c.items" :key="i.state.def.key">
            <button type="button" class="col-pick" :title="achievementTitle(i.state.def)" :aria-label="achievementTitle(i.state.def) + ' — ' + (i.unlocked ? t('ach_col_open') : t('ach_col_locked'))" data-testid="collection-item" :data-key="i.state.def.key" :data-unlocked="String(i.unlocked)" @click="emit('pick', i.state.def.key)">
              <GradeBadge :grade="gradeOf(i.state.def.key)" :icon="i.state.def.icon" :unlocked="i.unlocked" :size="32" />
            </button>
          </li>
        </ul>
      </article>
    </div>
  </section>
</template>
