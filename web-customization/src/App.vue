<script setup lang="ts">
import { computed, onMounted } from 'vue'
import AppShell from './components/AppShell.vue'
import ItemCard from './components/ItemCard.vue'
import Icon from './components/Icon.vue'
import ThemeCard from './components/ThemeCard.vue'
import { useFavoriteThemes } from './lib/useFavoriteThemes'
import { THEME_KEYS, type ThemeKey } from './lib/theme'
import { useCustomization } from './lib/useCustomization'
import { CATEGORY_ORDER, itemsOf } from './lib/customization'
import { t } from './lib/i18n'

const { auth, balance, apiMissing, loading, error, actionError, busyKey, statusOf, init, buy, choose } = useCustomization()
onMounted(init)

// Темы: все бесплатные, до 4 «любимых» попадают в выпадающий список тем бокового меню (решение владельца 2026-10-04)
const themes = useFavoriteThemes()
const themeKeys = Object.keys(THEME_KEYS) as ThemeKey[]

const sections = computed(() =>
  (['points', 'achievement'] as const).map((source) => ({
    source,
    categories: CATEGORY_ORDER.map((category) => ({ category, items: itemsOf(category, source) })).filter((c) => c.items.length),
  })),
)
</script>

<template>
  <AppShell :user-email="auth.status === 'ready' ? auth.userEmail : null" />

  <main class="mx-auto max-w-3xl px-4 pb-16 pt-4">
    <h1 class="mb-1 text-xl font-semibold">{{ t('cust_title') }}</h1>
    <p class="dim mb-4 text-sm">{{ t('cust_intro') }}</p>

    <p v-if="auth.status === 'loading' || (auth.status === 'ready' && loading)" class="dim">…</p>

    <template v-else-if="auth.status === 'ready'">
      <p v-if="error" class="dim">{{ t('cust_select_error') }}{{ error }}</p>

      <template v-else>
        <div class="mb-4 flex items-baseline justify-between rounded-xl border p-3" style="background: var(--bg-card); border-color: var(--border)" data-testid="balance">
          <span class="text-sm">{{ t('cust_balance') }}</span>
          <span class="font-semibold">
            <template v-if="balance != null">{{ balance }} <Icon name="coin" /></template>
            <template v-else><span class="dim text-sm">{{ t('cust_balance_unknown') }}</span></template>
          </span>
        </div>

        <p v-if="apiMissing" class="mb-4 text-sm" style="color: var(--danger)" data-testid="need-migration">{{ t('cust_need_migration') }}</p>
        <p v-if="actionError" class="mb-3 text-sm" style="color: var(--danger)" data-testid="action-error">{{ actionError }}</p>

        <section class="mb-6" data-section="themes">
          <h2 class="mb-0.5 text-base font-medium">{{ t('cust_sec_themes') }}</h2>
          <p class="dim mb-1 text-xs">{{ t('cust_sec_themes_hint') }}</p>
          <p class="dim mb-2 text-xs" data-testid="fav-count">{{ t('cust_theme_fav_count').replace('{n}', String(themes.favorites.value.length)).replace('{max}', String(themes.max)) }}</p>
          <div class="grid gap-2.5" style="grid-template-columns: repeat(auto-fill, minmax(min(9.5rem, 100%), 1fr))">
            <ThemeCard
              v-for="k in themeKeys"
              :key="k"
              :theme-key="k"
              :active="themes.current.value === k"
              :favorite="themes.isFavorite(k)"
              :can-toggle="themes.canToggle(k)"
              @apply="themes.apply(k)"
              @toggle-favorite="themes.toggleFavorite(k)"
            />
          </div>
        </section>

        <section v-for="s in sections" :key="s.source" class="mb-6" :data-section="s.source">
          <h2 class="mb-0.5 text-base font-medium">{{ s.source === 'points' ? t('cust_sec_points') : t('cust_sec_achievements') }}</h2>
          <p class="dim mb-2 text-xs">{{ s.source === 'points' ? t('cust_sec_points_hint') : t('cust_sec_achievements_hint') }}</p>
          <div v-for="c in s.categories" :key="c.category" class="mb-3">
            <p class="dim mb-1.5 text-sm">{{ t(('cust_cat_' + c.category) as never) }}</p>
            <div class="grid gap-2.5" style="grid-template-columns: repeat(auto-fill, minmax(min(9.5rem, 100%), 1fr))">
              <ItemCard
                v-for="it in c.items"
                :key="it.key"
                :item="it"
                :status="statusOf(it.key)"
                :balance="balance"
                :busy="busyKey === it.key"
                :disabled="apiMissing || !!busyKey"
                @buy="buy(it.key)"
                @choose="choose(it.category, it.key)"
                @unchoose="choose(it.category, null)"
              />
            </div>
          </div>
        </section>

        <p class="dim text-xs">{{ t('cust_soon') }}</p>
      </template>
    </template>
  </main>
</template>
