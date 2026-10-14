<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppShell from './components/AppShell.vue'
import EmojiText from './components/EmojiText.vue'
import Icon from './components/Icon.vue'
import Toast from './components/Toast.vue'
import { confirmName, fmtDate, isSelf, nameCell } from './lib/admin'
import { confirmDialog } from './lib/confirmDialog'
import { t } from './lib/i18n'
import { showToast } from './lib/toast'
import type { AdminUser } from './lib/types'
import { useAdmin } from './lib/useAdmin'

const { auth, users, error, debug, loaded, init, setDebug, removeUser } = useAdmin()
onMounted(init)

const debugBusy = ref(false)

// Галочка «Режим отладки»: переключает сервер (set_debug_mode проверяет is_admin). Ошибка — галочку возвращаем назад и показываем тост.
async function onDebugChange(e: Event) {
  const box = e.target as HTMLInputElement
  const want = box.checked
  debugBusy.value = true
  const ok = await setDebug(want)
  debugBusy.value = false
  if (!ok) {
    box.checked = !want
    showToast(t('admin_debug_error'), 'error')
    return
  }
  showToast(t(want ? 'admin_debug_on_toast' : 'admin_debug_off_toast'))
}

async function onDelete(u: AdminUser) {
  const ok = await confirmDialog(t('admin_confirm_delete_1') + confirmName(u) + t('admin_confirm_delete_2'))
  if (!ok) return
  const err = await removeUser(u)
  if (err) {
    showToast(err, 'error')
    return
  }
  showToast(t('admin_user_deleted_toast'))
}
</script>

<template>
  <AppShell :user-email="auth.status === 'ready' ? auth.userEmail : null" />

  <main class="mx-auto max-w-3xl px-4 pb-16 pt-4">
    <h1 class="mb-4 text-xl font-semibold"><EmojiText :text="t('admin_h1')" /></h1>

    <p v-if="auth.status === 'loading' || (auth.status === 'ready' && !loaded)" class="dim" data-test="admin-loading">…</p>

    <template v-else-if="auth.status === 'ready'">
      <!-- Нет доступа (не админ или ошибка сервера): текст ошибки — человеческий (friendlyError), подсказка про is_admin — из словаря. -->
      <div v-if="error" class="card" data-test="admin-no-access">
        <p class="dim">{{ t('admin_no_access') }} {{ error }}</p>
        <!-- eslint-disable-next-line vue/no-v-html -- строка из собственного словаря (с тегом <code>), пользовательских данных тут нет -->
        <p class="dim" style="font-size: 0.85em; margin-top: 8px" v-html="t('admin_no_access_hint')"></p>
      </div>

      <template v-else>
        <div v-if="debug !== null" class="card mb-4" data-test="debug-card">
          <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-weight: 600">
            <input id="debug-mode-toggle" type="checkbox" :checked="debug" :disabled="debugBusy" @change="onDebugChange" />
            {{ t('admin_debug_title') }}
          </label>
          <p class="dim" style="font-size: 0.85em; margin: 6px 0 0">{{ t('admin_debug_hint') }}</p>
        </div>

        <div class="card">
          <div class="table-scroll overflow-x-auto" data-test="table-scroll">
            <table class="w-full" data-test="users-table">
              <thead>
                <tr>
                  <th class="text-left">{{ t('admin_th_name') }}</th>
                  <th class="text-left">{{ t('admin_th_email') }}</th>
                  <th class="text-left">{{ t('admin_th_admin') }}</th>
                  <th class="text-left">{{ t('admin_th_registered') }}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="u in users" :key="u.user_id" :data-test="'user-row-' + u.user_id">
                  <td :style="auth.status === 'ready' && isSelf(u, auth.userId) ? 'font-weight: bold; color: var(--accent)' : ''">{{ nameCell(u) }}</td>
                  <td>{{ u.email }}</td>
                  <td><Icon v-if="u.is_admin" name="done" extra-style="color: var(--accent)" /></td>
                  <td>{{ fmtDate(u.created_at) }}</td>
                  <td>
                    <span v-if="auth.status === 'ready' && isSelf(u, auth.userId)" class="dim" data-test="self-mark">{{ t('admin_thats_you') }}</span>
                    <button v-else type="button" class="danger" :data-test="'delete-' + u.user_id" @click="onDelete(u)">
                      <Icon name="trash" /> {{ t('admin_delete_btn') }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </template>
  </main>

  <Toast />
</template>
