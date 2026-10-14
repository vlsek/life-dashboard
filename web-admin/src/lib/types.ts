// Строка из rpc admin_list_users (миграция 009_admin.sql): профиль + e-mail из auth.users. Порт структуры, которую читал admin.js.
export interface AdminUser {
  user_id: string
  email: string
  display_name: string | null
  is_admin: boolean
  created_at: string | null
}
