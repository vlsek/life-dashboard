<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppShell from './components/AppShell.vue'
import Icon from './components/Icon.vue'
import ProfileModal from './components/ProfileModal.vue'
import CategorySection from './components/CategorySection.vue'
import PersonChip from './components/PersonChip.vue'
import { useCommunity } from './lib/useCommunity'
import { leaderboardRows, medalIndex, todayRows, friendDisplayName, normalizeDisplayName } from './lib/community'
import { splitRequests } from './lib/friends'
import { t } from './lib/i18n'
import type { Scope } from './lib/types'
import EmojiText from './components/EmojiText.vue'

const {
  auth, friendIds, followProfiles, acceptedProfiles, requests, friendsApi,
  leaderboard, leaderboardError, today, todayError, profile,
  init, unfollow, follow, sendFriendRequest, respondToRequest, removeFriend, saveProfile,
} = useCommunity()
onMounted(init)

const scope = ref<Scope>('everyone')
const searchQuery = ref('')
const followBusy = ref(false)
const followMsg = ref<{ text: string; error: boolean } | null>(null)

const myId = computed(() => (auth.value.status === 'ready' ? auth.value.userId : ''))
const visibleLeaderboard = computed(() => leaderboardRows(leaderboard.value, myId.value, scope.value, friendIds.value))
const visibleToday = computed(() => todayRows(today.value, myId.value, scope.value, friendIds.value))
const incomingRequests = computed(() => splitRequests(requests.value).incoming)
const outgoingRequests = computed(() => splitRequests(requests.value).outgoing)
const hasAnyFriendItems = computed(() => requests.value.length + acceptedProfiles.value.length + followProfiles.value.length > 0)

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
  if (!query) {
    followMsg.value = { text: t('comm_enter_query'), error: true }
    return
  }
  followBusy.value = true
  followMsg.value = null
  const isEmail = query.includes('@')
  let res: Awaited<ReturnType<typeof follow>>
  try {
    res = await follow(auth.value.userId, query)
  } catch (err) {
    res = { ok: false, reason: 'error', message: err instanceof Error ? err.message : String(err) }
  } finally {
    followBusy.value = false
  }
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

async function onAddFriend() {
  if (auth.value.status !== 'ready') return
  const query = searchQuery.value.trim()
  if (!query) {
    followMsg.value = { text: t('comm_enter_query'), error: true }
    return
  }
  followBusy.value = true
  followMsg.value = null
  const isEmail = query.includes('@')
  let res: Awaited<ReturnType<typeof sendFriendRequest>>
  try {
    res = await sendFriendRequest(auth.value.userId, query)
  } catch (err) {
    res = { ok: false, reason: 'error', message: err instanceof Error ? err.message : String(err) }
  } finally {
    followBusy.value = false
  }
  if (res.ok) {
    searchQuery.value = ''
    const key = res.outcome === 'friends' ? 'comm_friend_now_friends_toast' : res.outcome === 'already' ? 'comm_friend_already_toast' : 'comm_friend_request_sent_toast'
    followMsg.value = { text: t(key), error: false }
  } else if (res.reason === 'thats_you') {
    followMsg.value = { text: t('comm_thats_you'), error: true }
  } else if (res.reason === 'not_found') {
    followMsg.value = { text: isEmail ? t('comm_user_not_found_email') : t('comm_user_not_found_name'), error: true }
  } else {
    followMsg.value = { text: t('comm_friend_error') + (res.message ?? ''), error: true }
  }
}

async function onRespond(requestId: string, accept: boolean) {
  followMsg.value = null
  try {
    await respondToRequest(requestId, accept)
    if (accept) followMsg.value = { text: t('comm_friend_now_friends_toast'), error: false }
  } catch (err) {
    followMsg.value = { text: t('comm_friend_action_error') + (err instanceof Error ? err.message : String(err)), error: true }
  }
}

async function onRemoveFriend(otherUserId: string) {
  followMsg.value = null
  try {
    await removeFriend(otherUserId)
  } catch (err) {
    followMsg.value = { text: t('comm_friend_action_error') + (err instanceof Error ? err.message : String(err)), error: true }
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
      <h1 class="text-xl font-semibold"><EmojiText :text="t('comm_h1')" /></h1>
      <button class="secondary" @click="showProfileModal = true"><EmojiText :text="t('comm_public_profile_btn')" /></button>
    </div>

    <div class="card mb-5 rounded-lg border p-3.5 text-sm" style="border-color: var(--border)">
      <p class="dim m-0">{{ t('comm_privacy_1') }}</p>
    </div>

    <template v-if="auth.status === 'ready'">
      <!-- Друзья -->
      <h2 class="mb-2 text-lg font-medium"><EmojiText :text="t('comm_friends_h2')" /></h2>
      <div class="card mb-5 rounded-lg border p-3.5" style="border-color: var(--border)">
        <p v-if="!hasAnyFriendItems" class="dim mb-3">{{ t('comm_no_follows') }}</p>

        <!-- Заявки в друзья (только если применена миграция 029) -->
        <div v-if="friendsApi && requests.length > 0" class="mb-3">
          <p class="dim mb-1.5 text-sm">{{ t('comm_requests_sub') }}</p>
          <div class="flex flex-wrap gap-2.5">
            <PersonChip v-for="r in incomingRequests" :key="r.id" :name="r.display_name" :avatar-url="r.avatar_url" :note="t('comm_friend_incoming_note')">
              <button class="px-2 py-0 text-sm" @click="onRespond(r.id, true)"><EmojiText :text="t('comm_friend_accept')" /></button>
              <button class="secondary px-2 py-0 text-sm" @click="onRespond(r.id, false)">{{ t('comm_friend_decline') }}</button>
            </PersonChip>
            <PersonChip v-for="r in outgoingRequests" :key="r.id" :name="r.display_name" :avatar-url="r.avatar_url" :note="t('comm_friend_outgoing_note')">
              <button class="secondary px-1.5 py-0" :title="t('comm_friend_cancel_title')" @click="onRemoveFriend(r.other_user_id)"><Icon name="x" /></button>
            </PersonChip>
          </div>
        </div>

        <div v-if="acceptedProfiles.length > 0" class="mb-3">
          <p class="dim mb-1.5 text-sm">{{ t('comm_friends_sub') }}</p>
          <div class="flex flex-wrap gap-2.5">
            <PersonChip v-for="p in acceptedProfiles" :key="p.user_id" :name="friendDisplayName(p, t('comm_no_name'))" :avatar-url="p.avatar_url">
              <button class="secondary px-1.5 py-0" :title="t('comm_friend_remove_title')" @click="onRemoveFriend(p.user_id)"><Icon name="x" /></button>
            </PersonChip>
          </div>
        </div>

        <div v-if="followProfiles.length > 0" class="mb-3">
          <p v-if="friendsApi" class="dim mb-1.5 text-sm">{{ t('comm_following_sub') }}</p>
          <div class="flex flex-wrap gap-2.5">
            <PersonChip v-for="p in followProfiles" :key="p.user_id" :name="friendDisplayName(p, t('comm_no_name'))" :avatar-url="p.avatar_url">
              <button class="secondary px-1.5 py-0" @click="onUnfollow(p.user_id)"><Icon name="x" /></button>
            </PersonChip>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <input v-model="searchQuery" type="text" class="flex-1" style="min-width: 10rem" :placeholder="t('comm_search_placeholder')" @keydown.enter.prevent="onFollow" />
          <button :disabled="followBusy" @click="onFollow"><EmojiText :text="t('comm_follow_btn')" /></button>
          <button v-if="friendsApi" :disabled="followBusy" @click="onAddFriend"><EmojiText :text="t('comm_friend_add_btn')" /></button>
        </div>
        <p v-if="followMsg" class="mt-1.5 text-xs" :style="{ color: followMsg.error ? 'var(--danger)' : 'inherit' }">{{ followMsg.text }}</p>
      </div>

      <!-- Лидерборд -->
      <h2 class="mb-2 text-lg font-medium"><EmojiText :text="t('comm_leaderboard_h2')" /></h2>
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
      <h2 class="mb-2 text-lg font-medium"><EmojiText :text="t('comm_today_h2')" /></h2>
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

      <!-- Сравнение по активности: свой композабл/компонент (useCategories.ts, CategorySection.vue),
           график — общая инфраструктура из web-dashboard/ (chart.ts, ChartBlock, PeriodPicker) -->
      <div class="mt-5">
        <CategorySection :user-id="auth.userId" :scope="scope" :friend-ids="friendIds" />
      </div>
    </template>

    <ProfileModal v-if="showProfileModal && profile" :initial="profile" @close="showProfileModal = false" @save="onSaveProfile" />
  </main>
</template>
