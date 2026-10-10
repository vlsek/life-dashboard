import { ref } from 'vue'
import { sb } from './supabase'
import { friendlyError } from './friendlyError'
import { animalAvatarUrl } from './animalAvatars'
import { notifyAvatarChanged } from './avatarEvents'
import { t } from './i18n'

// Смена аватара в «Аккаунте» (BACKLOG 44.17): 20 животных (data-URI, без Storage), своё фото (бакет avatars, как на Дашборде) или фото Google.
// Каждое успешное сохранение сообщает новый адрес в канал avatarEvents — левое меню меняется сразу.
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024

// Путь файла в бакете avatars: одна «текущая» картинка на пользователя; расширение — только буквы/цифры, иначе jpg.
export function avatarPath(userId: string, fileName: string): string {
  const ext = fileName.includes('.') ? (fileName.split('.').pop() || '').toLowerCase() : ''
  return `${userId}/avatar.${/^[a-z0-9]{1,5}$/.test(ext) ? ext : 'jpg'}`
}

// Фото из Google-аккаунта (user_metadata.avatar_url / picture) — только по https, потом оно показывается как <img src>.
export function googleAvatarOf(user: { user_metadata?: Record<string, unknown> | null } | null | undefined): string | null {
  const m = (user?.user_metadata ?? {}) as Record<string, unknown>
  const pic = [m.avatar_url, m.picture].find((x): x is string => typeof x === 'string' && /^https:\/\/\S+$/i.test(x.trim()))
  return pic ? pic.trim() : null
}

export function useAvatar() {
  const avatarUrl = ref<string | null>(null)
  const googleAvatar = ref<string | null>(null)
  const error = ref<string | null>(null)
  const busy = ref(false)
  let userId = ''

  async function load(uid: string) {
    userId = uid
    try {
      const { data } = await sb.from('profiles').select('avatar_url').eq('user_id', uid).maybeSingle()
      avatarUrl.value = (data as { avatar_url?: string | null } | null)?.avatar_url || null
    } catch {
      avatarUrl.value = null
    }
    try {
      const { data } = await sb.auth.getUser()
      googleAvatar.value = googleAvatarOf(data?.user)
    } catch {
      googleAvatar.value = null
    }
  }

  async function save(url: string): Promise<boolean> {
    const { error: e } = await sb.from('profiles').upsert({ user_id: userId, avatar_url: url })
    if (e) {
      error.value = friendlyError(e)
      return false
    }
    avatarUrl.value = url
    notifyAvatarChanged({ avatar_url: url })
    return true
  }

  async function run(fn: () => Promise<boolean>): Promise<boolean> {
    if (busy.value || !userId) return false
    busy.value = true
    error.value = null
    try {
      return await fn()
    } finally {
      busy.value = false
    }
  }

  const setAnimal = (key: string) =>
    run(async () => {
      const url = animalAvatarUrl(key)
      return url ? save(url) : false
    })

  const setGoogle = () =>
    run(async () => {
      if (!googleAvatar.value) return false
      return save(googleAvatar.value)
    })

  const upload = (file: File) =>
    run(async () => {
      if (!file.type.startsWith('image/')) {
        error.value = t('acc_avatar_not_image')
        return false
      }
      if (file.size > MAX_PHOTO_BYTES) {
        error.value = t('acc_avatar_too_big')
        return false
      }
      const path = avatarPath(userId, file.name)
      const { error: upErr } = await sb.storage.from('avatars').upload(path, file, { upsert: true })
      if (upErr) {
        error.value = friendlyError(upErr, 'upload')
        return false
      }
      const { data } = sb.storage.from('avatars').getPublicUrl(path)
      return save(data.publicUrl + '?t=' + Date.now()) // ломаем кэш браузера при замене фото
    })

  return { avatarUrl, googleAvatar, error, busy, load, setAnimal, setGoogle, upload }
}
