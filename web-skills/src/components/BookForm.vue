<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { t } from '../lib/i18n'
import type { BookFormInput } from '../lib/types'

const props = defineProps<{ isEdit: boolean; initial: BookFormInput }>()
const emit = defineEmits<{ close: []; save: [BookFormInput] }>()

const title = ref(props.initial.title)
const author = ref(props.initial.author)
const points = ref(props.initial.points)

const titleInput = ref<HTMLInputElement | null>(null)
onMounted(() => titleInput.value?.focus())

function onSubmit() {
  if (!title.value.trim()) return
  emit('save', { title: title.value, author: author.value, points: Number(points.value) || 0 })
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="emit('close')">
    <div class="w-full max-w-sm rounded-2xl border p-5" style="background: var(--bg-card); border-color: var(--border); color: var(--text)">
      <h3 class="mb-3 text-lg font-bold">{{ isEdit ? t('skills_book_edit_title') : t('skills_book_new_title') }}</h3>

      <form class="flex flex-col gap-3" @submit.prevent="onSubmit">
        <label class="flex flex-col gap-1 text-sm">
          {{ t('skills_book_field_title') }}
          <input ref="titleInput" v-model="title" type="text" required class="modal-input" />
        </label>

        <label class="flex flex-col gap-1 text-sm">
          {{ t('skills_book_field_author') }}
          <input v-model="author" type="text" class="modal-input" />
        </label>

        <label class="flex flex-col gap-1 text-sm">
          {{ t('skills_book_field_points') }}
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
