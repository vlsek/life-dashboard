<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { CATALOG, EQUIPMENT_NAMES, EQUIPMENT_ORDER, GROUP_ORDER, type CatalogExercise, type Equipment } from '../../../shared/exercise-catalog/catalog'
import { getLang, t, type DictKey } from '../lib/i18n'
import type { BodyModel } from '../lib/bodyModel'
import type { MuscleId } from '../lib/muscles'
import MiniBody from './MiniBody.vue'

// BACKLOG 69.21 (этап 2): каталог основных упражнений зала по группам мышц. Данные — shared/exercise-catalog (70 упражнений, страж согласованности с картой мышц).
// Разделы свёрнуты и подписаны группой и числом упражнений; в карточке — мини-силуэт (главная мышца ярко, вторичные бледнее), оборудование, тип и подсказка по технике.
// «Добавить» не пишет в базу сам: родитель открывает обычную форму упражнения с подставленным названием.
const props = defineProps<{ mine: readonly string[]; model?: BodyModel }>()
const emit = defineEmits<{ add: [CatalogExercise] }>()

const lang = getLang()
const equipment = ref<Equipment | 'all'>('all')
const open = reactive(new Set<MuscleId>())
const norm = (s: string): string => s.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim()
const mineSet = computed(() => new Set(props.mine.map(norm)))
const isMine = (x: CatalogExercise): boolean => mineSet.value.has(norm(x.ru)) || mineSet.value.has(norm(x.en))
const nameOf = (x: CatalogExercise): string => (lang === 'ru' ? x.ru : x.en)
const cueOf = (x: CatalogExercise): string => (lang === 'ru' ? x.cueRu : x.cueEn)
const equipmentName = (eq: Equipment): string => EQUIPMENT_NAMES[eq][lang === 'ru' ? 'ru' : 'en']
const muscleName = (m: MuscleId): string => t(`workouts_muscle_${m}` as DictKey)

const sections = computed(() =>
  GROUP_ORDER.map((group) => ({ group, items: CATALOG.filter((x) => x.group === group && (equipment.value === 'all' || x.equipment === equipment.value)) })).filter((s) => s.items.length > 0),
)
// при выбранном оборудовании разделы раскрыты сразу — человек ищет конкретное, а не листает заголовки
const isOpen = (g: MuscleId): boolean => equipment.value !== 'all' || open.has(g)
function toggle(g: MuscleId) {
  if (open.has(g)) open.delete(g)
  else open.add(g)
}
</script>

<template>
  <section data-testid="catalog" class="pb-24 sm:pb-4">
    <p class="mb-3 text-sm" style="color: var(--text-dim)" data-testid="catalog-intro">{{ t('workouts_catalog_intro') }}</p>

    <div class="mb-3 flex flex-wrap gap-1.5" role="group" :aria-label="t('workouts_catalog_filter_label')" data-testid="catalog-equipment">
      <button
        v-for="eq in (['all', ...EQUIPMENT_ORDER] as const)"
        :key="eq"
        type="button"
        class="rounded-full border px-3 text-sm"
        style="min-height: 32px; background: transparent"
        :style="equipment === eq ? 'border-color: var(--accent); color: var(--accent)' : 'border-color: var(--border); color: var(--text-dim)'"
        :aria-pressed="equipment === eq"
        :data-testid="'catalog-eq-' + eq"
        @click="equipment = eq"
      >
        {{ eq === 'all' ? t('workouts_catalog_filter_all') : equipmentName(eq) }}
      </button>
    </div>

    <p v-if="sections.length === 0" class="text-sm" style="color: var(--text-dim)" data-testid="catalog-none">{{ t('workouts_catalog_none') }}</p>

    <div v-for="s in sections" :key="s.group" class="mb-2 rounded-xl border" style="border-color: var(--border); background: var(--bg-card)" :data-testid="'catalog-group-' + s.group">
      <button
        type="button"
        class="flex w-full items-center justify-between gap-2 border-0 px-3 text-left"
        style="min-height: 44px; background: transparent; color: var(--text)"
        :aria-expanded="isOpen(s.group)"
        :data-testid="'catalog-toggle-' + s.group"
        @click="toggle(s.group)"
      >
        <span class="font-semibold">{{ muscleName(s.group) }}</span>
        <span class="flex items-center gap-2 text-sm" style="color: var(--text-dim)">
          <span :data-testid="'catalog-count-' + s.group">{{ s.items.length }}</span>
          <span aria-hidden="true">{{ isOpen(s.group) ? '▾' : '▸' }}</span>
        </span>
      </button>

      <div v-if="isOpen(s.group)" class="grid grid-cols-1 gap-2 px-3 pb-3 sm:grid-cols-2" :data-testid="'catalog-list-' + s.group">
        <article v-for="x in s.items" :key="x.id" class="flex gap-3 rounded-lg border p-2.5" style="border-color: var(--border)" :data-testid="'catalog-card-' + x.id">
          <MiniBody :highlight="[x.group]" :soft="x.secondary" :model="model" :width="92" class="shrink-0" />
          <div class="min-w-0 flex-1">
            <div class="font-semibold" :data-testid="'catalog-name-' + x.id">{{ nameOf(x) }}</div>
            <div class="mt-1 flex flex-wrap gap-1 text-xs" style="color: var(--text-dim)">
              <span class="rounded-full border px-2" style="border-color: var(--border)" data-testid="catalog-equipment-chip">{{ equipmentName(x.equipment) }}</span>
              <span class="rounded-full border px-2" style="border-color: var(--border)" data-testid="catalog-kind-chip">{{ t(x.kind === 'compound' ? 'workouts_catalog_kind_compound' : 'workouts_catalog_kind_isolation') }}</span>
            </div>
            <p class="mb-1 mt-1.5 text-sm" style="color: var(--text-dim)" data-testid="catalog-cue">{{ cueOf(x) }}</p>
            <p v-if="x.secondary.length" class="m-0 text-xs" style="color: var(--text-dim)" data-testid="catalog-also">{{ t('workouts_catalog_also') }} {{ x.secondary.map(muscleName).join(', ') }}</p>
            <div class="mt-2">
              <span v-if="isMine(x)" class="text-sm" style="color: var(--accent)" data-testid="catalog-mine">✓ {{ t('workouts_catalog_mine') }}</span>
              <button v-else type="button" class="rounded-lg px-3 text-sm" style="min-height: 32px" :data-testid="'catalog-add-' + x.id" @click="emit('add', x)">{{ t('workouts_catalog_add') }}</button>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
