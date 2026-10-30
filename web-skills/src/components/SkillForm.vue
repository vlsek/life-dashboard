<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { t } from '../lib/i18n'
import { matchCategory } from '../lib/skillsView'
import type { SkillFormInput } from '../lib/types'

// categoryEnabled — есть ли в базе колонка skills.category (миграция 112): без неё поле категории не показываем. categories — свои уже введённые категории (подсказка).
const props = withDefaults(defineProps<{ isEdit: boolean; initial: SkillFormInput; categories?: string[]; categoryEnabled?: boolean }>(), { categories: () => [], categoryEnabled: false })
const emit = defineEmits<{ close: []; save: [SkillFormInput] }>()

const name = ref(props.initial.name)
const step = ref(props.initial.step)
const points = ref(props.initial.points)
const category = ref(props.initial.category ?? '')

const nameInput = ref<HTMLInputElement | null>(null)
onMounted(() => nameInput.value?.focus())

function onSubmit() {
  if (!name.value.trim()) return
  // «выбор из своих»: совпало без учёта регистра с существующей категорией — берём её написание, чтобы «спорт» и «Спорт» не разъехались
  emit('save', { name: name.value, step: Number(step.value) || 0, points: Number(points.value) || 0, category: matchCategory(category.value, props.categories) ?? '' })
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="emit('close')">
    <div class="w-full max-w-sm rounded-2xl border p-5" style="background: var(--bg-card); border-color: var(--border); color: var(--text)">
      <h3 class="mb-3 text-lg font-bold">{{ isEdit ? t('skills_edit_title') : t('skills_new_title') }}</h3>

      <form class="flex flex-col gap-3" @submit.prevent="onSubmit">
        <label class="flex flex-col gap-1 text-sm">
          {{ t('skills_field_name') }}
          <input ref="nameInput" v-model="name" type="text" required class="modal-input" />
        </label>

        <label v-if="categoryEnabled" class="flex flex-col gap-1 text-sm">
          {{ t('skills_field_category') }}
          <input v-model="category" type="text" maxlength="40" list="skill-categories" class="modal-input" :placeholder="t('skills_category_ph')" data-test="skill-category" autocomplete="off" />
          <datalist id="skill-categories">
            <option v-for="c in categories" :key="c" :value="c" />
          </datalist>
        </label>

        <label class="flex flex-col gap-1 text-sm">
          {{ t('skills_field_step') }}
          <input v-model.number="step" type="number" min="1" max="100" class="modal-input" />
        </label>

        <label class="flex flex-col gap-1 text-sm">
          {{ t('skills_field_points') }}
          <input v-model.number="points" type="number" min="0" class="modal-input" />
        </label>

        <div class="mt-2 flex justify-end gap-2">
          <button type="button" class="rounded-lg border px-4 py-2 text-sm" style="border-color: var(--border); background: var(--bg); color: var(--text)" @click="emit('close')">
            {{ t('cancel') }}
          </button>
          <button type="submit" class="rounded-lg px-4 py-2 text-sm" style="background: var(--accent); color: var(--accent-text)">
            {{ t('save') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.modal-input {
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  border-radius: 0.5rem;
  padding: 0.4rem 0.6rem;
}
</style>
