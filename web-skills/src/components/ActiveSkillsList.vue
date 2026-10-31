<script setup lang="ts">
import { computed } from 'vue'
import CollapsibleSection from './CollapsibleSection.vue'
import SkillCard from './SkillCard.vue'
import { groupByCategory } from '../lib/skillsView'
import { t } from '../lib/i18n'
import type { Skill } from '../lib/types'

// Навыки «в процессе» (BACKLOG 44.4 срез 2, миграция 112): если у навыков есть категории — секции по категориям (именованные по алфавиту, «Без категории» последней),
// каждая сворачивается и запоминает состояние на устройстве; если категорий нет (или колонки нет) — прежний плоский список, ничего не меняется.
// skills приходят уже отфильтрованными и отсортированными (поиск/сортировка живут в App.vue и действуют внутри каждой секции).
const props = defineProps<{ skills: Skill[] }>()
const emit = defineEmits<{ bump: [Skill, 1 | -1]; mastered: [Skill]; edit: [Skill]; delete: [Skill] }>()
const groups = computed(() => groupByCategory(props.skills))
const flat = computed(() => groups.value.length === 1 && groups.value[0].category === null)
// Идентификатор секции для запоминания состояния: название категории без регистра (в нём может быть любой текст).
const sid = (c: string | null) => 'cat-' + (c === null ? '_none' : encodeURIComponent(c.toLowerCase()))
</script>

<template>
  <div v-if="flat" class="flex flex-col gap-2" data-test="skills-flat">
    <SkillCard v-for="s in skills" :key="s.id" :skill="s" @bump="emit('bump', s, $event)" @mastered="emit('mastered', s)" @edit="emit('edit', s)" @delete="emit('delete', s)" />
  </div>
  <div v-else data-test="skills-by-category">
    <CollapsibleSection v-for="g in groups" :id="sid(g.category)" :key="sid(g.category)" :title="g.category ?? t('skills_no_category')" :count="g.skills.length">
      <div class="flex flex-col gap-2">
        <SkillCard v-for="s in g.skills" :key="s.id" :skill="s" @bump="emit('bump', s, $event)" @mastered="emit('mastered', s)" @edit="emit('edit', s)" @delete="emit('delete', s)" />
      </div>
    </CollapsibleSection>
  </div>
</template>
