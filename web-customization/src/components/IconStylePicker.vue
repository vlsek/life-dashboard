<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ICON_PATHS } from '../lib/icons'
import { ICON_STYLES, loadPackIcons, readIconStyle, writeIconStyle, type IconStyle, type PackIcons } from '../lib/iconStyle'
import { t } from '../lib/i18n'

// Выбор набора иконок (BACKLOG 44.18г, срез 3): четыре карточки — «Контур», «Заливка», «Дуотон», «Пиксели». Предпросмотр берёт НАСТОЯЩИЕ данные наборов
// (те же файлы, что подменщик в шапке), поэтому показывает именно то, что будет на страницах. Пока набор грузится (или нет сети) — «Контур» вместо него.
// Выбор применяется сразу, запоминается в localStorage `icon_style`.
const current = ref<IconStyle>(readIconStyle())
const saved = ref(true)
const label = (v: IconStyle): string => t(('cust_iconstyle_' + v) as never)
const choose = (v: IconStyle) => {
  saved.value = writeIconStyle(v)
  if (saved.value) current.value = v
}
const SAMPLE = ['home', 'goals', 'dumbbell', 'droplet', 'star'] as const
const loaded = reactive<Partial<Record<IconStyle, PackIcons>>>({})
onMounted(() => {
  for (const s of ICON_STYLES) {
    if (s === 'outline') continue
    loadPackIcons(s)
      .then((icons) => (loaded[s] = icons))
      .catch(() => {
        /* без сети остаётся «Контур» в карточке */
      })
  }
})
// Разметка иконки n в наборе v; нет набора/пары — «Контур» (как поступит и подменщик).
const view = (v: IconStyle, n: string) => {
  const e = v === 'outline' ? undefined : loaded[v]?.[n]
  if (!e) return { outline: true, vb: '0 0 24 24', html: (ICON_PATHS as Record<string, string>)[n] ?? '', attrs: {} as Record<string, string> }
  return { outline: false, vb: e.vb, html: e.h, attrs: e.a ?? {} }
}
</script>

<template>
  <div data-testid="iconstyle-picker">
    <p class="dim mb-2 text-xs">{{ t('cust_sec_iconstyle_hint') }}</p>
    <p v-if="!saved" class="mb-2 text-xs" style="color: var(--danger, #e5484d)" role="alert" data-testid="iconstyle-save-error">{{ t('cust_splash_save_error') }}</p>
    <div class="grid gap-2.5" style="grid-template-columns: repeat(auto-fill, minmax(min(11rem, 100%), 1fr))">
      <div
        v-for="v in ICON_STYLES"
        :key="v"
        class="flex flex-col gap-2 rounded-xl border p-3"
        :style="{ background: 'var(--bg-card)', borderColor: current === v ? 'var(--accent)' : 'var(--border)' }"
        :data-testid="'iconstyle-' + v"
        :data-active="current === v"
      >
        <div class="flex items-center justify-between gap-1" style="color: var(--text)" data-testid="iconstyle-preview">
          <!-- data-ip-skip: страничный подменщик не должен «исправлять» предпросмотр (иначе карточка «Контур» показала бы текущий набор) -->
          <svg
            v-for="n in SAMPLE"
            :key="n"
            data-ip-skip
            :data-pack="view(v, n).outline ? 'outline' : v"
            :viewBox="view(v, n).vb"
            width="26"
            height="26"
            :fill="view(v, n).outline ? 'none' : 'currentColor'"
            :stroke="view(v, n).outline ? 'currentColor' : undefined"
            :stroke-width="view(v, n).outline ? 1.9 : undefined"
            :stroke-linecap="view(v, n).outline ? 'round' : undefined"
            :stroke-linejoin="view(v, n).outline ? 'round' : undefined"
            aria-hidden="true"
            v-bind="view(v, n).attrs"
            v-html="view(v, n).html"
          ></svg>
        </div>
        <p class="m-0 text-sm font-medium">{{ label(v) }}</p>
        <button
          type="button"
          class="secondary px-2 py-1 text-sm"
          :disabled="current === v"
          :aria-pressed="current === v"
          :aria-label="label(v) + ': ' + (current === v ? t('cust_splash_selected') : t('cust_splash_choose'))"
          data-testid="iconstyle-choose"
          @click="choose(v)"
        >
          {{ current === v ? t('cust_splash_selected') : t('cust_splash_choose') }}
        </button>
      </div>
    </div>
  </div>
</template>
