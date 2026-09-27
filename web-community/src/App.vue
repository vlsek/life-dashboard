<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppShell from './components/AppShell.vue'
import Icon from './components/Icon.vue'
import ProfileModal from './components/ProfileModal.vue'
import { useCommunity } from './lib/useCommunity'
import { leaderboardRows, medalIndex, todayRows, friendDisplayName, normalizeDisplayName } from './lib/community'
import { t, getLang } from './lib/i18n'
import type { Scope } from './lib/types'

const { auth, friendIds, friendProfiles, leaderboard, leaderboardError, today, todayError, profile, init, unfollow, follow, saveProfile } = useCommunity()
onMounted(init)

const scope = ref<Scope>('everyone')
const searchQuery = ref('')
const followBusy = ref(false)
const followMsg = ref<{ text: string; error: boolean } | null>(null)

const myId = computed(() => (auth.value.status === 'ready' ? auth.value.userId : ''))
const visibleLeaderboard = computed(() => leaderboardRows(leaderboard.value, myId.value, scope.value, friendIds.value))
const visibleToday = computed(() => todayRows(today.value, myId.value, scope.value, friendIds.value))

const medalColors = ['#e0b23c', '#b9c2cc', '#c98a4e']

async function onUnfollow(followedId: string) {
  if (auth.value.status !== 'ready') return
  try {
    await unfollow(auth.value.userId, followedId)
  } catch (err) {
    followMsg.value = { text: t('dash_delete_error_generic') + (err instanceof Error ? err.message : String(err)), error: true }
  }
}

async function onFollow() {
  if (auth.value.status !== 'ready') return
  const query = searchQuery.value.trim()
  if (!query) return
  followBusy.value = true
  followMsg.value = null
  const isEmail = query.includes('@')
  const res = await follow(auth.value.userId, query)
  followBusy.value = false
  if (res.ok) {
    searchQuery.value = ''
    followMsg.value = { text: t('comm_follow_added_toast'), error: false }
  } else if (res.reason === 'thats_you') {
    followMsg.value = { text: t('comm_thats_you'), error: true }
  } else if (res.reason === 'not_found') {
    followMsg.value = { text: isEmail ? t('comm_user_not_found_email') : t('comm_user_not_found_name'), error: true }
  } else {
    followMsg.value = { text: t('comm_follow_error') + (res.message ?? ''), error: true }
  }
}

const showProfileModal = ref(false)
async function onSaveProfile(name: string, visible: boolean) {
  if (auth.value.status !== 'ready') return
  try {
    await saveProfile(auth.value.userId, normalizeDisplayName(name), visible)
  } catch (err) {
    followMsg.value = { text: t('dash_save_error_generic') + (err instanceof Error ? err.message : String(err)), error: true }
  }
  showProfileModal.value = false
}
</script>

<template>
  <AppShell :user-email="auth.status === 'ready' ? auth.userEmail : null" />

  <main class="mx-auto max-w-3xl px-4 pb-16 pt-4">
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-xl font-semibold">{{ t('comm_h1') }}</h1>
      <button class="secondary" @click="showProfileModal = true">{{ t('comm_public_profile_btn') }}</button>
    </div>

    <div class="card mb-5 rounded-lg border p-3.5 text-sm" style="border-color: var(--border)">
      <p class="dim m-0">{{ t('comm_privacy_1') }}</p>
    </div>

    <template v-if="auth.status === 'ready'">
      <!-- Друзья -->
      <h2 class="mb-2 text-lg font-medium">{{ t('comm_friends_h2') }}</h2>
      <div class="card mb-5 rounded-lg border p-3.5" style="border-color: var(--border)">
        <p v-if="friendProfiles.length === 0" class="dim mb-3">{{ t('comm_no_follows') }}</p>
        <div v-else class="mb-3 flex flex-wrap gap-2.5">
          <div v-for="p in friendProfiles" :key="p.user_id" class="flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-sm" style="border-color: var(--border)">
            <img v-if="p.avatar_url" :src="p.avatar_url" class="h-6.5 w-6.5 rounded-full object-cover" style="width: 26px; height: 26px" />
            <span>{{ friendDisplayName(p, t('comm_no_name')) }}</span>
            <button class="secondary px-1.5 py-0" @click="onUnfollow(p.user_id)"><Icon name="x" /></button>
          </div>
        </div>
        <div class="flex gap-2">
          <input v-model="searchQuery" type="text" class="flex-1" :placeholder="t('comm_search_placeholder')" @keydown.enter.prevent="onFollow" />
          <button :disabled="followBusy" @click="onFollow">{{ t('comm_follow_btn') }}</button>
        </div>
        <p v-if="followMsg" class="mt-1.5 text-xs" :style="{ color: followMsg.error ? 'var(--danger)' : 'inherit' }">{{ followMsg.text }}</p>
      </div>

      <!-- Лидерборд -->
      <h2 class="mb-2 text-lg font-medium">{{ t('comm_leaderboard_h2') }}</h2>
      <div class="mb-2.5 flex gap-2">
        <button :class="{ secondary: scope !== 'everyone' }" @click="scope = 'everyone'">{{ t('comm_scope_everyone') }}</button>
        <button :class="{ secondary: scope !== 'friends' }" @click="scope = 'friends'">{{ t('comm_scope_friends') }}</button>
      </div>
      <div class="card mb-5 rounded-lg border p-3.5" style="border-color: var(--border)">
        <p v-if="leaderboardError" class="dim">{{ t('comm_load_error') }} {{ leaderboardError }}</p>
        <p v-else-if="visibleLeaderboard.length === 0" class="dim">{{ t('comm_empty') }}</p>
        <table v-else class="w-full">
          <tbody>
            <tr v-for="(row, i) in visibleLeaderboard" :key="row.user_id">
              <td class="w-8">
                <span v-if="medalIndex(i) !== null" :style="{ color: medalColors[i] }"><Icon name="medal" /></span>
                <span v-else class="dim text-sm">#{{ i + 1 }}</span>
              </td>
              <td class="w-10"><img v-if="row.avatar_url" :src="row.avatar_url" class="h-8 w-8 rounded-full object-cover" /></td>
              <td :style="row.user_id === myId ? 'font-weight:bold;color:var(--accent)' : ''">
                {{ row.display_name }}
                <span v-if="row.perfect_streak > 0" class="dim ml-1 text-xs" :title="`${t('comm_perfect_streak_title')} ${row.perfect_streak}`">
                  <Icon name="flame" />{{ row.perfect_streak }}
                </span>
              </td>
              <td class="text-right">{{ row.total_points }} <Icon name="star" /></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Сегодня -->
      <h2 class="mb-2 text-lg font-medium">{{ t('comm_today_h2') }}</h2>
      <div class="card rounded-lg border p-3.5" style="border-color: var(--border)">
        <p v-if="todayError" class="dim">{{ t('comm_load_error') }} {{ todayError }}</p>
        <p v-else-if="visibleToday.length === 0" class="dim">{{ t('comm_empty') }}</p>
        <div v-for="row in visibleToday" :key="row.user_id" class="flex gap-3 border-b py-2.5 last:border-0" style="border-color: var(--border)">
          <img v-if="row.avatar_url" :src="row.avatar_url" class="h-10 w-10 flex-shrink-0 rounded-full object-cover" />
          <div>
            <strong :style="row.user_id === myId ? 'color:var(--accent)' : ''">{{ row.display_name }}</strong>
            <span class="dim"> — {{ row.today_points }} ⭐ {{ t('comm_today_word') }}</span>
            <ul v-if="row.items && row.items.length" class="mt-1.5 list-disc pl-4 opacity-85">
              <li v-for="(it, idx) in row.items" :key="idx">{{ it }}</li>
            </ul>
            <p v-else-if="row.notes" class="mt-1.5 opacity-85">{{ row.notes }}</p>
          </div>
        </div>
      </div>

      <!-- TODO(следующая итерация): "Сравнение по активностям" (category leaderboard +
           личный график прогресса) зависит от инфраструктуры графиков дашборда
           (renderChartBlock/periodBounds/openPeriodModal), которой ещё нет ни в одном
           пилоте — переносить вместе с ней, не раньше. Пока — просто ссылка на ванильную
           страницу, где раздел работает как обычно. -->
      <p class="dim mt-5 text-sm">
        📊 <a href="/community.html#category-select" style="color: inherit; text-decoration: underline">{{ getLang() === 'ru' ? 'Сравнение по активностям' : 'Compare by activity' }}</a>
        {{ getLang() === 'ru' ? '— пока на ванильной странице.' : "— still on the classic page for now." }}
      </p>
    </template>

    <ProfileModal v-if="showProfileModal && profile" :initial="profile" @close="showProfileModal = false" @save="onSaveProfile" />
  </main>
</template>
