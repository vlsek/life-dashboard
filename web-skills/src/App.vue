<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AppShell from './components/AppShell.vue'
import SkillForm from './components/SkillForm.vue'
import SkillCard from './components/SkillCard.vue'
import CoinIcon from './components/CoinIcon.vue'
import Icon from './components/Icon.vue'
import BookForm from './components/BookForm.vue'
import PointsFloat from './components/PointsFloat.vue'
import { useSkills } from './lib/useSkills'
import { useBooks } from './lib/useBooks'
import { suggestionsFor } from './lib/skills'
import { t, getLang } from './lib/i18n'
import type { Skill, SkillFormInput, Book, BookFormInput } from './lib/types'
import EmojiText from './components/EmojiText.vue'

const { auth, items: skills, error: skillsError, init, addSkill, updateSkill, deleteSkill, bumpProgress, toggleMastered } = useSkills()
const { items: books, error: booksError, load: loadBooks, addBook, updateBook, deleteBook, toggleDone: toggleBookDone } = useBooks()

onMounted(init)
watch(auth, (v) => {
  if (v.status === 'ready') loadBooks(v.userId)
})

const active = computed(() => skills.value.filter((s) => !s.mastered))
const mastered = computed(() => skills.value.filter((s) => s.mastered))
const suggestions = computed(() => suggestionsFor(getLang(), new Set(skills.value.map((s) => s.name))))

const activeBooks = computed(() => books.value.filter((b) => b.status !== 'done'))
const doneBooks = computed(() => books.value.filter((b) => b.status === 'done'))

function fmtRu(iso: string | null): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

// ---- Форма навыка ----
const skillFormTarget = ref<Skill | 'new' | null>(null)
const skillFormPrefill = ref<string | null>(null) // имя из "быстрой идеи", если открыли форму оттуда
const skillFormInitial = computed<SkillFormInput>(() => {
  const s = skillFormTarget.value
  if (s && s !== 'new') return { name: s.name, step: s.step ?? 10, points: s.points ?? 10 }
  return { name: skillFormPrefill.value ?? '', step: 10, points: 10 }
})
function openAddSkill(prefillName?: string) {
  skillFormPrefill.value = prefillName ?? null
  skillFormTarget.value = 'new'
}
async function onSaveSkill(res: SkillFormInput) {
  const target = skillFormTarget.value
  skillFormTarget.value = null
  skillFormPrefill.value = null
  if (target === 'new') {
    if (auth.value.status !== 'ready') return
    await addSkill(auth.value.userId, res)
  } else if (target) {
    await updateSkill(target.id, res)
  }
}
async function onDeleteSkill(s: Skill) {
  if (!confirm(t('skills_confirm_delete'))) return
  await deleteSkill(s.id)
}

// ---- Форма книги ----
const bookFormTarget = ref<Book | 'new' | null>(null)
const bookFormInitial = computed<BookFormInput>(() => {
  const b = bookFormTarget.value
  if (b && b !== 'new') return { title: b.title, author: b.author ?? '', points: b.points ?? 10 }
  return { title: '', author: '', points: 10 }
})
async function onSaveBook(res: BookFormInput) {
  const target = bookFormTarget.value
  bookFormTarget.value = null
  if (target === 'new') {
    if (auth.value.status !== 'ready') return
    await addBook(auth.value.userId, res)
  } else if (target) {
    await updateBook(target.id, res)
  }
}
async function onDeleteBook(b: Book) {
  if (!confirm(t('skills_book_confirm_delete'))) return
  await deleteBook(b.id)
}
</script>

<template>
  <AppShell :user-email="auth.status === 'ready' ? auth.userEmail : null" />
  <PointsFloat />

  <main class="mx-auto max-w-3xl px-4 pb-16 pt-4">
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-xl font-semibold"><EmojiText :text="t('skills_h1')" /></h1>
      <button class="rounded-lg px-3 py-1.5 text-sm" style="background: var(--accent); color: var(--accent-text)" @click="openAddSkill()">
        <EmojiText :text="t('skills_add_btn')" />
      </button>
    </div>

    <p v-if="auth.status === 'loading'" class="dim">…</p>

    <template v-else-if="auth.status === 'ready'">
      <p v-if="skillsError" class="dim">{{ t('comm_load_error') }} {{ skillsError }}</p>

      <template v-else>
        <h3 class="mb-2 text-base font-medium"><EmojiText :text="t('skills_suggestions_h3')" /></h3>
        <div class="mb-5 flex flex-wrap gap-2">
          <p v-if="suggestions.length === 0" class="dim"><EmojiText :text="t('skills_all_suggestions_added')" /></p>
          <button
            v-for="s in suggestions"
            :key="s.name"
            type="button"
            class="rounded-full border px-3 py-1 text-sm"
            style="background: transparent; color: var(--text); border-color: var(--border)"
            @click="openAddSkill(s.name)"
          >
            {{ s.icon }} {{ s.name }} +
          </button>
        </div>

        <h3 class="mb-2 text-base font-medium">{{ t('skills_active_h3') }}</h3>
        <p v-if="active.length === 0" class="dim">{{ t('skills_none_active') }}</p>
        <div v-else class="mb-6 flex flex-col gap-2">
          <SkillCard
            v-for="s in active"
            :key="s.id"
            :skill="s"
            @bump="bumpProgress(s, $event)"
            @mastered="toggleMastered(s)"
            @edit="skillFormTarget = s"
            @delete="onDeleteSkill(s)"
          />
        </div>

        <h2 class="mb-2 text-base font-medium"><EmojiText :text="t('skills_mastered_h2')" /></h2>
        <p v-if="mastered.length === 0" class="dim">{{ t('skills_none_mastered') }}</p>
        <table v-else class="w-full">
          <tbody>
            <tr v-for="s in mastered" :key="s.id" class="align-top">
              <td class="done-text">{{ s.name }}</td>
              <td class="whitespace-nowrap px-2 text-xs">{{ s.points ?? 10 }} <CoinIcon /></td>
              <td class="whitespace-nowrap text-right">
                <button class="secondary icon-btn" :title="t('skills_edit_aria')" :aria-label="t('skills_edit_aria')" @click="skillFormTarget = s"><Icon name="edit" /></button>
                <button class="danger icon-btn ml-1" :title="t('skills_delete_aria')" :aria-label="t('skills_delete_aria')" @click="onDeleteSkill(s)"><Icon name="trash" /></button>
              </td>
            </tr>
          </tbody>
        </table>
      </template>

      <div class="my-6 border-t" style="border-color: var(--border)"></div>

      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-semibold"><EmojiText :text="t('skills_books_h2')" /></h2>
        <button class="rounded-lg px-3 py-1.5 text-sm" style="background: var(--accent); color: var(--accent-text)" @click="bookFormTarget = 'new'">
          <EmojiText :text="t('skills_add_book_btn')" />
        </button>
      </div>

      <p v-if="booksError" class="dim">{{ t('comm_load_error') }} {{ booksError }}</p>
      <template v-else>
        <h3 class="mb-2 text-base font-medium">{{ t('skills_books_to_read_h3') }}</h3>
        <p v-if="activeBooks.length === 0" class="dim">{{ t('skills_book_list_empty') }}</p>
        <table v-else class="mb-6 w-full">
          <tbody>
            <tr v-for="b in activeBooks" :key="b.id" class="align-top">
              <td class="px-1"><input type="checkbox" :checked="false" @change="toggleBookDone(b)" /></td>
              <td>{{ b.author ? `${b.title} — ${b.author}` : b.title }}</td>
              <td class="whitespace-nowrap px-2 text-xs">{{ b.points ?? 10 }} <CoinIcon /></td>
              <td class="whitespace-nowrap text-right">
                <button class="secondary icon-btn" :title="t('skills_edit_aria')" :aria-label="t('skills_edit_aria')" @click="bookFormTarget = b"><Icon name="edit" /></button>
                <button class="danger icon-btn ml-1" :title="t('skills_delete_aria')" :aria-label="t('skills_delete_aria')" @click="onDeleteBook(b)"><Icon name="trash" /></button>
              </td>
            </tr>
          </tbody>
        </table>

        <h3 class="mb-2 text-base font-medium"><EmojiText :text="t('skills_books_done_h3')" /></h3>
        <p v-if="doneBooks.length === 0" class="dim">{{ t('skills_book_none_read') }}</p>
        <table v-else class="w-full">
          <tbody>
            <tr v-for="b in doneBooks" :key="b.id" class="align-top">
              <td class="px-1"><input type="checkbox" :checked="true" @change="toggleBookDone(b)" /></td>
              <td class="done-text">{{ b.author ? `${b.title} — ${b.author}` : b.title }}</td>
              <td class="whitespace-nowrap px-2 text-xs">{{ b.points ?? 10 }} <CoinIcon /></td>
              <td class="dim whitespace-nowrap px-2 text-xs">{{ fmtRu(b.done_date) }}</td>
              <td class="whitespace-nowrap text-right">
                <button class="secondary icon-btn" :title="t('skills_edit_aria')" :aria-label="t('skills_edit_aria')" @click="bookFormTarget = b"><Icon name="edit" /></button>
                <button class="danger icon-btn ml-1" :title="t('skills_delete_aria')" :aria-label="t('skills_delete_aria')" @click="onDeleteBook(b)"><Icon name="trash" /></button>
              </td>
            </tr>
          </tbody>
        </table>
      </template>
    </template>

    <SkillForm v-if="skillFormTarget" :is-edit="skillFormTarget !== 'new'" :initial="skillFormInitial" @close="skillFormTarget = null" @save="onSaveSkill" />
    <BookForm v-if="bookFormTarget" :is-edit="bookFormTarget !== 'new'" :initial="bookFormInitial" @close="bookFormTarget = null" @save="onSaveBook" />
  </main>
</template>

<style scoped>
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border-radius: 0.5rem;
  background: transparent;
}
</style>
