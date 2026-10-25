<script setup lang="ts">
// «Выпитое записалось» (BACKLOG 11; BACKLOG 44.21 — современная анимация, ответ владельца 2026-10-07: старая «как из 2000-х»): в стакане поднимается
// живая вода (бегущая волна, пузырьки), в углу всплывает бейдж с галочкой. Запускается родителем через смену `tick` (после подтверждённой
// записи в БД), сама гаснет через ~1.4 с. Три варианта (lib/waterAnim.ts, выбор — «Настройки» шапки): wave — спокойный, по умолчанию; drops —
// капли падают в стакан; ripple — быстрый подъём и круги по воде. При prefers-reduced-motion и «Отключить анимации» — сразу итог без движения.
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getWaterAnim, type WaterAnim } from '../lib/waterAnim'

// demo — показать КОНКРЕТНЫЙ вариант (кнопка «Показать» в «Кастомизации», BACKLOG 57.2), не меняя сохранённый выбор.
// inline — маленький стакан прямо в плитке (не оверлей), не гаснет; loop — повторять анимацию по кругу (живой пример, 57.2 агента 3).
const props = defineProps<{ tick: number; demo?: WaterAnim; inline?: boolean; loop?: boolean }>()
const visible = ref(false)
const variant = ref<WaterAnim>(props.demo ?? getWaterAnim())
let timer: ReturnType<typeof setTimeout> | undefined
let loopTimer: ReturnType<typeof setInterval> | undefined

function play() {
  visible.value = false // перезапуск анимации при быстрых повторных нажатиях
  variant.value = props.demo ?? getWaterAnim() // выбор из «Настроек» действует сразу, без перезагрузки
  requestAnimationFrame(() => {
    visible.value = true
    clearTimeout(timer)
    if (!props.inline) timer = setTimeout(() => (visible.value = false), 1400)
  })
}
onMounted(() => {
  if (!props.inline) return
  play()
  if (props.loop) loopTimer = setInterval(() => { if (!document.hidden) play() }, 3200)
})
onBeforeUnmount(() => {
  clearTimeout(timer)
  clearInterval(loopTimer)
})

watch(
  () => props.tick,
  (v, old) => {
    if (v === old || v <= 0) return
    play()
  },
)

// свои id маски/градиента у каждого экземпляра: анимация есть и в окне воды, и в правой панели
let uid = 0
const sid = `water-saved-${++uid}-${Math.random().toString(36).slice(2, 7)}`
const GLASS = 'M4.6 5.3h14.8l-1.5 17.8q-.25 3.2-3.4 3.2h-5q-3.15 0-3.4-3.2L4.6 5.3z'
const WAVE = 'q3 -1.6 6 0 t6 0 t6 0 t6 0 t6 0 t6 0 t6 0 t6 0'
const WAVE_BACK = 'q3 1.4 6 0 t6 0 t6 0 t6 0 t6 0 t6 0 t6 0 t6 0'
</script>

<template>
  <Transition name="water-saved">
    <div v-if="visible" class="water-saved pointer-events-none" :class="{ 'water-saved-inline': inline }" :data-variant="variant" data-test="water-saved" :role="inline ? undefined : 'status'" :aria-live="inline ? undefined : 'polite'" :aria-hidden="inline ? 'true' : undefined">
      <svg width="72" height="90" viewBox="0 0 24 30" aria-hidden="true">
        <defs>
          <clipPath :id="`${sid}-clip`"><path :d="GLASS" /></clipPath>
          <linearGradient :id="`${sid}-grad`" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style="stop-color: var(--water-top)" />
            <stop offset="1" style="stop-color: var(--water-bottom)" />
          </linearGradient>
        </defs>
        <g :clip-path="`url(#${sid}-clip)`">
          <rect x="0" y="0" width="24" height="30" style="fill: var(--water-bottom); fill-opacity: 0.08" />
          <g class="water-saved-fill">
            <path class="ws-wave-back" :d="`M-12 11.2 ${WAVE_BACK} V34 H-12 Z`" :fill="`url(#${sid}-grad)`" />
            <path class="ws-wave" :d="`M-12 10.5 ${WAVE} V34 H-12 Z`" :fill="`url(#${sid}-grad)`" />
            <circle class="ws-bubble ws-b-1" cx="9" cy="23.5" r="0.7" fill="#fff" fill-opacity="0.6" />
            <circle class="ws-bubble ws-b-2" cx="13.4" cy="24.5" r="0.5" fill="#fff" fill-opacity="0.6" />
            <circle class="ws-bubble ws-b-3" cx="15.8" cy="23" r="0.8" fill="#fff" fill-opacity="0.6" />
            <circle class="ws-bubble ws-bx ws-b-4" cx="11.2" cy="24.8" r="0.6" fill="#fff" fill-opacity="0.6" />
            <circle class="ws-bubble ws-bx ws-b-5" cx="7.8" cy="22.2" r="0.45" fill="#fff" fill-opacity="0.6" />
            <circle class="ws-bubble ws-bx ws-b-6" cx="14.6" cy="25.4" r="0.55" fill="#fff" fill-opacity="0.6" />
          </g>
        </g>
        <rect class="ws-stream" x="11.1" y="-6" width="1.8" height="17" rx="0.9" style="fill: var(--water-top)" />
        <g class="ws-rain">
          <line v-for="(x, i) in [7, 9.6, 12, 14.4, 17]" :key="i" :class="`ws-rd ws-rd-${i + 1}`" :x1="x" y1="-4" :x2="x" y2="-1.6" style="stroke: var(--water-top)" stroke-width="0.7" stroke-linecap="round" />
        </g>
        <path class="ws-spark ws-s-1" d="M3.2 6.6l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5z" fill="#f7c63a" stroke="#d99a00" stroke-width="0.25" />
        <path class="ws-spark ws-s-2" d="M21 12.4l.45 1.3 1.3.45-1.3.45-.45 1.3-.45-1.3-1.3-.45 1.3-.45z" fill="#f7c63a" stroke="#d99a00" stroke-width="0.25" />
        <path class="ws-spark ws-s-3" d="M12 -4.6l.55 1.6 1.6.55-1.6.55-.55 1.6-.55-1.6-1.6-.55 1.6-.55z" fill="#f7c63a" stroke="#d99a00" stroke-width="0.25" />
        <path class="ws-spark ws-s-4" d="M20.6 1.6l.4 1.2 1.2.4-1.2.4-.4 1.2-.4-1.2-1.2-.4 1.2-.4z" fill="#f7c63a" stroke="#d99a00" stroke-width="0.25" />
        <ellipse class="ws-ripple" cx="12" cy="10.8" rx="5.5" ry="1.1" fill="none" style="stroke: var(--water-line)" stroke-width="0.5" />
        <ellipse class="ws-ripple ws-ripple-2" cx="12" cy="10.8" rx="5.5" ry="1.1" fill="none" style="stroke: var(--water-line)" stroke-width="0.4" />
        <path class="ws-drop ws-d-1" d="M9.4 -2.2q-1.1 1.7 0 2.7q1.1 -1 0 -2.7z" style="fill: var(--water-top)" />
        <path class="ws-drop ws-d-2" d="M12.6 -3.4q-1.3 2 0 3.2q1.3 -1.2 0 -3.2z" style="fill: var(--water-top)" />
        <path class="ws-drop ws-d-3" d="M15.4 -1.8q-1 1.5 0 2.4q1 -0.9 0 -2.4z" style="fill: var(--water-top)" />
        <path :d="GLASS" fill="none" style="stroke: var(--water-line)" stroke-width="1.2" stroke-linejoin="round" />
        <ellipse cx="12" cy="5.3" rx="7.4" ry="1.2" fill="none" style="stroke: var(--water-line)" stroke-width="0.9" />
        <path d="M7.6 9l0.8 11" stroke="#ffffff" stroke-opacity="0.28" stroke-width="1" stroke-linecap="round" />
        <g class="water-saved-badge">
          <circle cx="19.8" cy="5.4" r="3.5" style="fill: var(--water-bottom)" stroke="#fff" stroke-width="0.7" />
          <path class="water-saved-check" d="M18 5.5l1.3 1.4 2.3-2.8" fill="none" stroke="#fff" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" />
        </g>
      </svg>
    </div>
  </Transition>
</template>

<style scoped>
.water-saved {
  /* fixed, а не absolute внутри окна: окно воды выше 85vh и прокручивается — абсолютный оверлей оставался наверху прокручиваемой области,
     и при нажатии «+200 / +1000» ниже по окну стакан с анимацией был за пределами видимого (BACKLOG раздел 30, 🐞). По центру экрана виден всегда. */
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 70; /* выше затемнения окна (.modal-backdrop — 50) */
  pointer-events: none; /* не перехватывает нажатия, пока играет */
}
.water-saved svg {
  overflow: visible;
  filter: drop-shadow(0 6px 18px rgba(0, 0, 0, 0.22));
  background: color-mix(in srgb, var(--bg-card) 92%, transparent);
  border: 1px solid color-mix(in srgb, var(--water-line) 38%, transparent);
  border-radius: 22px;
  padding: 14px 18px;
  box-sizing: content-box;
}
/* БАЗОВЫЕ стили — это ИТОГОВОЕ состояние (вода на месте, бейдж виден): анимации только вводят его, поэтому при «Отключить анимации»
   (там animation: none !important) и prefers-reduced-motion человек видит готовую картинку. Пузырьки, капли и круги без анимации скрыты. */
.water-saved-fill {
  transform-origin: 50% 100%;
  animation: water-saved-rise 0.85s cubic-bezier(0.2, 0.9, 0.25, 1.04) both;
}
.ws-wave { animation: water-saved-drift 1.7s linear infinite; }
.ws-wave-back { opacity: 0.5; animation: water-saved-drift-back 2.3s linear infinite; }
.ws-bubble { opacity: 0; animation: water-saved-bubble 0.95s ease-out both; }
.ws-b-1 { animation-delay: 0.3s; }
.ws-b-2 { animation-delay: 0.45s; }
.ws-b-3 { animation-delay: 0.6s; }
.ws-ripple { opacity: 0; transform-box: fill-box; transform-origin: center; animation: water-saved-ripple 1s ease-out 0.55s both; }
.ws-ripple-2 { animation-delay: 0.75s; }
.ws-drop { opacity: 0; animation: water-saved-drop 0.5s ease-in both; }
.ws-d-1 { animation-delay: 0.05s; }
.ws-d-2 { animation-delay: 0.12s; }
.ws-d-3 { animation-delay: 0.19s; }
.water-saved-badge { transform-box: fill-box; transform-origin: center; animation: water-saved-pop 0.38s cubic-bezier(0.3, 1.6, 0.5, 1) 0.7s both; }
.water-saved-check {
  stroke-dasharray: 20;
  stroke-dashoffset: 20;
  animation: water-saved-draw 0.35s ease-out 0.85s forwards;
}
/* Варианты (выбор — lib/waterAnim.ts): wave — по умолчанию; в нём капель и второго круга нет */
.water-saved[data-variant='wave'] .ws-drop, .water-saved[data-variant='wave'] .ws-ripple-2 { display: none; }
/* drops: капли падают в стакан, вода поднимается следом */
.water-saved[data-variant='drops'] .ws-bubble, .water-saved[data-variant='drops'] .ws-ripple-2 { display: none; }
.water-saved[data-variant='drops'] .water-saved-fill { animation-delay: 0.35s; animation-duration: 0.55s; }
.water-saved[data-variant='drops'] .ws-ripple { animation-delay: 0.75s; }
.water-saved[data-variant='drops'] .water-saved-badge { animation-delay: 0.85s; }
.water-saved[data-variant='drops'] .water-saved-check { animation-delay: 1s; }
/* ripple: быстрый подъём и два круга по воде */
.water-saved[data-variant='ripple'] .ws-bubble, .water-saved[data-variant='ripple'] .ws-drop { display: none; }
.water-saved[data-variant='ripple'] .water-saved-fill { animation-duration: 0.45s; }
.water-saved[data-variant='ripple'] .ws-ripple { animation-delay: 0.3s; }
.water-saved[data-variant='ripple'] .ws-ripple-2 { animation-delay: 0.5s; }
.water-saved[data-variant='ripple'] .water-saved-badge { animation-delay: 0.5s; }
.water-saved[data-variant='ripple'] .water-saved-check { animation-delay: 0.65s; }
/* bubbles (54.8): пузырьки поднимаются со дна, вода набирается спокойно */
.ws-stream { display: none; opacity: 0; transform-box: fill-box; transform-origin: 50% 0; }
.ws-bx { display: none; }
.water-saved[data-variant='bubbles'] .ws-drop, .water-saved[data-variant='bubbles'] .ws-ripple-2 { display: none; }
.water-saved[data-variant='bubbles'] .ws-bx { display: initial; }
.water-saved[data-variant='bubbles'] .ws-bubble { animation-name: water-saved-bubble-up; animation-duration: 1.1s; }
.water-saved[data-variant='bubbles'] .ws-b-4 { animation-delay: 0.2s; }
.water-saved[data-variant='bubbles'] .ws-b-5 { animation-delay: 0.38s; }
.water-saved[data-variant='bubbles'] .ws-b-6 { animation-delay: 0.52s; }
.water-saved[data-variant='bubbles'] .water-saved-badge { animation-delay: 0.8s; }
.water-saved[data-variant='bubbles'] .water-saved-check { animation-delay: 0.95s; }
/* pour (54.8): сверху льётся струя, потом стакан наполняется */
.water-saved[data-variant='pour'] .ws-stream { display: initial; animation: water-saved-stream 0.9s ease-in-out both; }
.water-saved[data-variant='pour'] .ws-bubble, .water-saved[data-variant='pour'] .ws-drop, .water-saved[data-variant='pour'] .ws-ripple-2 { display: none; }
.water-saved[data-variant='pour'] .water-saved-fill { animation-delay: 0.25s; animation-duration: 0.7s; }
.water-saved[data-variant='pour'] .ws-ripple { animation-delay: 0.85s; }
.water-saved[data-variant='pour'] .water-saved-badge { animation-delay: 1s; }
.water-saved[data-variant='pour'] .water-saved-check { animation-delay: 1.15s; }
/* splash (54.8): резкий подъём и брызги в стороны */
.water-saved[data-variant='splash'] .ws-bubble { display: none; }
.water-saved[data-variant='splash'] .ws-drop { animation: water-saved-splash 0.7s ease-out both; animation-delay: 0.3s; }
.water-saved[data-variant='splash'] .ws-d-1 { --dx: -8px; }
.water-saved[data-variant='splash'] .ws-d-2 { --dx: 0px; }
.water-saved[data-variant='splash'] .ws-d-3 { --dx: 8px; }
.water-saved[data-variant='splash'] .water-saved-fill { animation-duration: 0.4s; }
.water-saved[data-variant='splash'] .ws-ripple { animation-delay: 0.3s; }
.water-saved[data-variant='splash'] .ws-ripple-2 { animation-delay: 0.45s; }
.water-saved[data-variant='splash'] .water-saved-badge { animation-delay: 0.6s; }
.water-saved[data-variant='splash'] .water-saved-check { animation-delay: 0.75s; }
/* rain (54.9, платный «Дождь»): пять струек падают на воду, вода набирается на фоне */
.ws-rd { display: none; opacity: 0; }
.ws-spark { display: none; opacity: 0; transform-box: fill-box; transform-origin: center; }
.water-saved[data-variant='rain'] .ws-rd { display: initial; animation: water-saved-rain 0.6s ease-in both; }
.water-saved[data-variant='rain'] .ws-rd-1 { animation-delay: 0.05s; }
.water-saved[data-variant='rain'] .ws-rd-2 { animation-delay: 0.2s; }
.water-saved[data-variant='rain'] .ws-rd-3 { animation-delay: 0.1s; }
.water-saved[data-variant='rain'] .ws-rd-4 { animation-delay: 0.3s; }
.water-saved[data-variant='rain'] .ws-rd-5 { animation-delay: 0.15s; }
.water-saved[data-variant='rain'] .ws-bubble, .water-saved[data-variant='rain'] .ws-drop, .water-saved[data-variant='rain'] .ws-ripple-2 { display: none; }
.water-saved[data-variant='rain'] .water-saved-fill { animation-delay: 0.3s; animation-duration: 0.7s; }
.water-saved[data-variant='rain'] .ws-ripple { animation-delay: 0.8s; }
.water-saved[data-variant='rain'] .water-saved-badge { animation-delay: 1s; }
.water-saved[data-variant='rain'] .water-saved-check { animation-delay: 1.15s; }
/* tide (54.9, платный «Прилив»): вода накатывает, перехлёстывает отметку и оседает; волна бежит быстрее */
.water-saved[data-variant='tide'] .ws-bubble, .water-saved[data-variant='tide'] .ws-drop, .water-saved[data-variant='tide'] .ws-ripple-2 { display: none; }
.water-saved[data-variant='tide'] .water-saved-fill { animation: water-saved-tide 1.1s ease-in-out both; }
.water-saved[data-variant='tide'] .ws-wave { animation-duration: 0.9s; }
.water-saved[data-variant='tide'] .ws-wave-back { animation-duration: 1.2s; }
.water-saved[data-variant='tide'] .ws-ripple { animation-delay: 0.95s; }
.water-saved[data-variant='tide'] .water-saved-badge { animation-delay: 1.05s; }
.water-saved[data-variant='tide'] .water-saved-check { animation-delay: 1.2s; }
/* sparkle (54.9, платный «Искры»): вода набирается и над ней вспыхивают искры */
.water-saved[data-variant='sparkle'] .ws-spark { display: initial; animation: water-saved-spark 0.7s ease-in-out both; }
.water-saved[data-variant='sparkle'] .ws-s-1 { animation-delay: 0.55s; }
.water-saved[data-variant='sparkle'] .ws-s-2 { animation-delay: 0.7s; }
.water-saved[data-variant='sparkle'] .ws-s-3 { animation-delay: 0.85s; }
.water-saved[data-variant='sparkle'] .ws-s-4 { animation-delay: 1s; }
.water-saved[data-variant='sparkle'] .ws-bubble, .water-saved[data-variant='sparkle'] .ws-drop, .water-saved[data-variant='sparkle'] .ws-ripple-2 { display: none; }
.water-saved[data-variant='sparkle'] .water-saved-badge { animation-delay: 0.9s; }
.water-saved[data-variant='sparkle'] .water-saved-check { animation-delay: 1.05s; }
/* sway (59.4, платный «Качка»): вода набирается, а стакан покачивается и успокаивается */
.water-saved[data-variant='sway'] .ws-bubble, .water-saved[data-variant='sway'] .ws-drop, .water-saved[data-variant='sway'] .ws-ripple-2 { display: none; }
.water-saved[data-variant='sway'] svg { transform-origin: 50% 100%; animation: water-saved-sway 1.5s ease-in-out both; }
.water-saved[data-variant='sway'] .water-saved-fill { animation-duration: 0.7s; }
.water-saved[data-variant='sway'] .ws-ripple { animation-delay: 0.6s; }
.water-saved[data-variant='sway'] .water-saved-badge { animation-delay: 1s; }
.water-saved[data-variant='sway'] .water-saved-check { animation-delay: 1.15s; }
/* glow (59.4, платный «Сияние»): вода набирается и стакан вспыхивает мягким свечением цвета воды */
.water-saved[data-variant='glow'] .ws-bubble, .water-saved[data-variant='glow'] .ws-drop, .water-saved[data-variant='glow'] .ws-ripple-2 { display: none; }
.water-saved[data-variant='glow'] svg { animation: water-saved-glow 1.5s ease-in-out both; }
.water-saved[data-variant='glow'] .ws-ripple { animation-delay: 0.6s; }
.water-saved[data-variant='glow'] .water-saved-badge { animation-delay: 0.9s; }
.water-saved[data-variant='glow'] .water-saved-check { animation-delay: 1.05s; }
/* bounce (59.4, платный «Прыжок»): вода набирается, а стакан подпрыгивает и приземляется с пружинкой */
.water-saved[data-variant='bounce'] .ws-bubble, .water-saved[data-variant='bounce'] .ws-drop, .water-saved[data-variant='bounce'] .ws-ripple-2 { display: none; }
.water-saved[data-variant='bounce'] svg { transform-origin: 50% 100%; animation: water-saved-bounce 1.3s cubic-bezier(0.3, 0.7, 0.4, 1) both; }
.water-saved[data-variant='bounce'] .water-saved-fill { animation-duration: 0.6s; }
.water-saved[data-variant='bounce'] .ws-ripple { animation-delay: 0.6s; }
.water-saved[data-variant='bounce'] .water-saved-badge { animation-delay: 0.9s; }
.water-saved[data-variant='bounce'] .water-saved-check { animation-delay: 1.05s; }
/* pulse (59.4, платный «Пульс»): вода набирается, а стакан дважды мягко «дышит» */
.water-saved[data-variant='pulse'] .ws-bubble, .water-saved[data-variant='pulse'] .ws-drop, .water-saved[data-variant='pulse'] .ws-ripple-2 { display: none; }
.water-saved[data-variant='pulse'] svg { transform-origin: 50% 50%; animation: water-saved-pulse 1.4s ease-in-out both; }
.water-saved[data-variant='pulse'] .ws-ripple { animation-delay: 0.6s; }
.water-saved[data-variant='pulse'] .water-saved-badge { animation-delay: 0.9s; }
.water-saved[data-variant='pulse'] .water-saved-check { animation-delay: 1.05s; }
/* tilt (платный «Наклон»): вода набирается, а стакан наклоняется, как при глотке, и возвращается */
.water-saved[data-variant='tilt'] .ws-bubble, .water-saved[data-variant='tilt'] .ws-drop, .water-saved[data-variant='tilt'] .ws-ripple-2 { display: none; }
.water-saved[data-variant='tilt'] svg { transform-origin: 50% 100%; animation: water-saved-tilt 1.3s ease-in-out both; }
.water-saved[data-variant='tilt'] .ws-ripple { animation-delay: 0.6s; }
.water-saved[data-variant='tilt'] .water-saved-badge { animation-delay: 0.9s; }
.water-saved[data-variant='tilt'] .water-saved-check { animation-delay: 1.05s; }
/* flash (платная «Вспышка»): вода набирается, а стакан коротко вспыхивает светом дважды */
.water-saved[data-variant='flash'] .ws-bubble, .water-saved[data-variant='flash'] .ws-drop, .water-saved[data-variant='flash'] .ws-ripple-2 { display: none; }
.water-saved[data-variant='flash'] svg { transform-origin: 50% 50%; animation: water-saved-flash 1.3s ease-in-out both; }
.water-saved[data-variant='flash'] .ws-ripple { animation-delay: 0.6s; }
.water-saved[data-variant='flash'] .water-saved-badge { animation-delay: 0.9s; }
.water-saved[data-variant='flash'] .water-saved-check { animation-delay: 1.05s; }
/* shake (платная «Дрожь»): вода набирается, а стакан быстро дрожит из стороны в сторону и успокаивается */
.water-saved[data-variant='shake'] .ws-bubble, .water-saved[data-variant='shake'] .ws-drop, .water-saved[data-variant='shake'] .ws-ripple-2 { display: none; }
.water-saved[data-variant='shake'] svg { transform-origin: 50% 100%; animation: water-saved-shake 1.2s ease-in-out both; }
.water-saved[data-variant='shake'] .ws-ripple { animation-delay: 0.6s; }
.water-saved[data-variant='shake'] .water-saved-badge { animation-delay: 0.9s; }
.water-saved[data-variant='shake'] .water-saved-check { animation-delay: 1.05s; }
/* drop (платное «Падение»): стакан падает сверху, мягко приземляется, и вода набирается */
.water-saved[data-variant='drop'] .ws-bubble, .water-saved[data-variant='drop'] .ws-drop, .water-saved[data-variant='drop'] .ws-ripple-2 { display: none; }
.water-saved[data-variant='drop'] svg { transform-origin: 50% 100%; animation: water-saved-drop 1.2s cubic-bezier(0.3, 0.8, 0.4, 1) both; }
.water-saved[data-variant='drop'] .ws-ripple { animation-delay: 0.6s; }
.water-saved[data-variant='drop'] .water-saved-badge { animation-delay: 0.9s; }
.water-saved[data-variant='drop'] .water-saved-check { animation-delay: 1.05s; }
/* spin (платная «Оборот»): стакан делает полный оборот, пока набирается вода */
.water-saved[data-variant='spin'] .ws-bubble, .water-saved[data-variant='spin'] .ws-drop, .water-saved[data-variant='spin'] .ws-ripple-2 { display: none; }
.water-saved[data-variant='spin'] svg { transform-origin: 50% 50%; animation: water-saved-spin 1.2s ease-in-out both; }
.water-saved[data-variant='spin'] .ws-ripple { animation-delay: 0.6s; }
.water-saved[data-variant='spin'] .water-saved-badge { animation-delay: 0.9s; }
.water-saved[data-variant='spin'] .water-saved-check { animation-delay: 1.05s; }
/* rise (платная «Всплытие»): стакан плавно всплывает снизу, и вода набирается */
.water-saved[data-variant='rise'] .ws-bubble, .water-saved[data-variant='rise'] .ws-drop, .water-saved[data-variant='rise'] .ws-ripple-2 { display: none; }
.water-saved[data-variant='rise'] svg { transform-origin: 50% 50%; animation: water-saved-rise 1.2s cubic-bezier(0.2, 0.7, 0.3, 1) both; }
.water-saved[data-variant='rise'] .ws-ripple { animation-delay: 0.6s; }
.water-saved[data-variant='rise'] .water-saved-badge { animation-delay: 0.9s; }
.water-saved[data-variant='rise'] .water-saved-check { animation-delay: 1.05s; }
/* Пример в плитке «Кастомизации» (BACKLOG 57.2): не оверлей, а маленький стакан, анимация повторяется */
.water-saved.water-saved-inline { position: relative; inset: auto; z-index: auto; display: inline-flex; }
.water-saved-inline svg { width: 44px; height: 55px; padding: 6px 8px; border-radius: 14px; box-shadow: none; filter: none; }
.water-saved-enter-active,
.water-saved-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.water-saved-enter-from,
.water-saved-leave-to {
  opacity: 0;
  transform: scale(0.92);
}
@keyframes water-saved-rise {
  from { transform: translateY(22px); }
  to { transform: translateY(0); }
}
@keyframes water-saved-drift {
  to { transform: translateX(-12px); }
}
@keyframes water-saved-drift-back {
  from { transform: translateX(-12px); }
  to { transform: translateX(0); }
}
@keyframes water-saved-bubble {
  0% { opacity: 0; transform: translateY(0); }
  25% { opacity: 0.7; }
  100% { opacity: 0; transform: translateY(-10px); }
}
@keyframes water-saved-ripple {
  0% { opacity: 0.75; transform: scale(0.35); }
  100% { opacity: 0; transform: scale(1.7); }
}
@keyframes water-saved-drop {
  0% { opacity: 0; transform: translateY(-2px); }
  20% { opacity: 1; }
  100% { opacity: 0; transform: translateY(15px); }
}
@keyframes water-saved-bubble-up {
  0% { opacity: 0; transform: translateY(0); }
  20% { opacity: 0.8; }
  100% { opacity: 0; transform: translateY(-14px); }
}
@keyframes water-saved-stream {
  0% { opacity: 1; transform: scaleY(0); }
  30% { opacity: 1; transform: scaleY(1); }
  80% { opacity: 1; transform: scaleY(1); }
  100% { opacity: 0; transform: scaleY(1); }
}
@keyframes water-saved-splash {
  0% { opacity: 0; transform: translate(0, 12px); }
  25% { opacity: 1; transform: translate(calc(var(--dx, 0px) * 0.5), 3px); }
  100% { opacity: 0; transform: translate(var(--dx, 0px), 14px); }
}
@keyframes water-saved-rain {
  0% { opacity: 0; transform: translateY(0); }
  15% { opacity: 1; }
  100% { opacity: 0; transform: translateY(14px); }
}
@keyframes water-saved-tide {
  0% { transform: translateY(22px); }
  60% { transform: translateY(-2.2px); }
  80% { transform: translateY(0.8px); }
  100% { transform: translateY(0); }
}
@keyframes water-saved-sway {
  0% { transform: rotate(0deg); }
  25% { transform: rotate(-7deg); }
  50% { transform: rotate(5deg); }
  72% { transform: rotate(-2.5deg); }
  100% { transform: rotate(0deg); }
}
@keyframes water-saved-glow {
  0% { filter: drop-shadow(0 6px 18px rgba(0, 0, 0, 0.22)); }
  45% { filter: drop-shadow(0 0 22px var(--water-line)) drop-shadow(0 0 8px var(--water-top)); }
  100% { filter: drop-shadow(0 6px 18px rgba(0, 0, 0, 0.22)); }
}
@keyframes water-saved-bounce {
  0% { transform: translateY(0) scale(1, 1); }
  20% { transform: translateY(-14px) scale(0.95, 1.06); }
  40% { transform: translateY(0) scale(1.08, 0.92); }
  60% { transform: translateY(-5px) scale(0.98, 1.03); }
  80% { transform: translateY(0) scale(1.03, 0.97); }
  100% { transform: translateY(0) scale(1, 1); }
}
@keyframes water-saved-pulse {
  0% { transform: scale(1); }
  25% { transform: scale(1.14); }
  50% { transform: scale(0.97); }
  75% { transform: scale(1.07); }
  100% { transform: scale(1); }
}
@keyframes water-saved-tilt {
  0% { transform: rotate(0deg); }
  35% { transform: rotate(-22deg); }
  60% { transform: rotate(-22deg); }
  100% { transform: rotate(0deg); }
}
@keyframes water-saved-flash {
  0% { filter: brightness(1); }
  20% { filter: brightness(1.9) saturate(1.3); }
  40% { filter: brightness(1); }
  60% { filter: brightness(1.7) saturate(1.2); }
  100% { filter: brightness(1); }
}
@keyframes water-saved-shake {
  0% { transform: translateX(0); }
  15% { transform: translateX(-5px) rotate(-3deg); }
  30% { transform: translateX(5px) rotate(3deg); }
  45% { transform: translateX(-4px) rotate(-2deg); }
  60% { transform: translateX(4px) rotate(2deg); }
  80% { transform: translateX(-1px); }
  100% { transform: translateX(0); }
}
@keyframes water-saved-drop {
  0% { transform: translateY(-34px); opacity: 0; }
  45% { transform: translateY(0) scale(1.06, 0.94); opacity: 1; }
  65% { transform: translateY(-6px) scale(0.98, 1.03); }
  85% { transform: translateY(0) scale(1.02, 0.98); }
  100% { transform: translateY(0) scale(1, 1); opacity: 1; }
}
@keyframes water-saved-spin {
  0% { transform: rotateY(0deg); }
  100% { transform: rotateY(360deg); }
}
@keyframes water-saved-rise {
  0% { transform: translateY(30px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
@keyframes water-saved-spark {
  0% { opacity: 0; transform: scale(0.2) rotate(0deg); }
  50% { opacity: 1; transform: scale(1) rotate(45deg); }
  100% { opacity: 0; transform: scale(0.2) rotate(90deg); }
}
@keyframes water-saved-pop {
  from { opacity: 0; transform: scale(0); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes water-saved-draw {
  to { stroke-dashoffset: 0; }
}
/* «Отключить все анимации» (html[data-motion='off']): показываем итог сразу — вода на месте, галочка нарисована */
html[data-motion='off'] .water-saved-fill { transform: none; }
html[data-motion='off'] .water-saved-check { stroke-dashoffset: 0; }
@media (prefers-reduced-motion: reduce) {
  .water-saved-fill, .ws-wave, .ws-wave-back, .water-saved-badge { animation: none; }
  .ws-bubble, .ws-drop, .ws-ripple { display: none; }
  .water-saved-check { animation: none; stroke-dashoffset: 0; }
  .water-saved-enter-active, .water-saved-leave-active { transition: opacity 0.2s ease; }
  .water-saved-enter-from, .water-saved-leave-to { transform: none; }
}
</style>
