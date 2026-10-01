// Порт SVG-иконок из config.js (ICON_PATHS — все 120, ICON_KEYWORDS/METRIC_ICON_CHOICES —
// 90 в подборке пикера, EMOJI_TO_SVG — 70) на TypeScript, вместе с iconSvg, iconSearchMatches,
// metricIconKey. Тексты путей скопированы дословно из оригинала и сверены байт-в-байт —
// это чистый перенос данных и функций, без DOM (сборка Vue-разметки — в Icon.vue/IconPicker.vue).
//
// B2 из ROADMAP: этот модуль сейчас дублируется в lib/ каждого пилота (как date.ts,
// i18n.ts, theme.ts), а не вынесен в общий пакет/npm-воркспейс — см. обсуждение
// с пользователем про физическую изоляцию пилотов (у каждого свой package.json).

export const ICON_PATHS = {
  home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-6h4v6"/>',
  goals: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
  skills: '<circle cx="12" cy="9" r="5.5"/><path d="M8.5 13.5L7 21l5-3 5 3-1.5-7.5"/>',
  workouts: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
  challenges: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
  english:
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c3 3 3 15 0 18"/><path d="M12 3c-3 3-3 15 0 18"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  shop: '<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  community:
    '<circle cx="9" cy="8.5" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><circle cx="17" cy="9.5" r="2.4"/><path d="M17 14.5c2.4 0 4 1.7 4 4"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"/>',
  edit: '<path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19l-4 1z"/><path d="M14.5 6.5l3 3"/>',
  trash: '<path d="M4 7h16"/><path d="M9 7V4.5h6V7"/><path d="M6.5 7l1 13h9l1-13"/><path d="M10 11v6M14 11v6"/>',
  gear: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  coin: '<circle cx="12" cy="12" r="9" fill="currentColor" fill-opacity="0.2"/><circle cx="12" cy="12" r="5"/>',
  flame:
    '<g transform="scale(0.75)" stroke-width="2.4"><path d="M16 2c1 5-3 6-3 10a3 3 0 0 0 6 0c2 1 3 4 3 7a9 9 0 1 1-18 0c0-6 4-9 6-13 1-2 2-3 6-4z" fill="currentColor" fill-opacity="0.25"/></g>',
  droplet: '<path d="M12 3.5c3.5 4.5 6 7.3 6 10.5a6 6 0 0 1-12 0c0-3.2 2.5-6 6-10.5z"/>',
  download: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 20h14"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.8"/><path d="M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7.5h.01"/>',
  milestones: '<path d="M12 3v18"/><path d="M12 5h7l2 2.5-2 2.5h-7"/><path d="M12 12H5l-2 2.5L5 17h7"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
  eyeoff:
    '<path d="M3 3l18 18"/><path d="M10.6 6a9 9 0 0 1 1.4-.1c6 0 9.5 6.1 9.5 6.1a16 16 0 0 1-3 3.6M6.6 6.9A16 16 0 0 0 2.5 12S6 18.5 12 18.5a9 9 0 0 0 3.4-.7"/><path d="M9.9 9.9a2.8 2.8 0 0 0 4 4"/>',
  cake: '<path d="M4 20h16v-6H4z"/><path d="M4 16.5c2 1.3 4 1.3 6 0s4-1.3 6 0c1.4.9 2.7 1 4 .3"/><path d="M12 9.5V13"/><path d="M12 5c1.1 1 1.1 2.2 0 3.2-1.1-1-1.1-2.2 0-3.2z"/>',
  alert: '<path d="M12 4l9.5 16.5h-19L12 4z"/><path d="M12 10v4.5"/><path d="M12 17.5h.01"/>',
  history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.5 4.5v4h4"/><path d="M12 7.5V12l3 2"/>',
  chevron_left: '<path d="M15 5l-7 7 7 7"/>',
  chevron_right: '<path d="M9 5l7 7-7 7"/>',
  pushup:
    '<circle cx="19" cy="8.2" r="1.7"/><path d="M17.2 10.8L6.5 15.2"/><path d="M16.2 11.4V18.5"/><path d="M6.5 15.2L4.8 18.5"/><path d="M2.5 19.5h19"/>',
  pullup:
    '<path d="M3 4.5h18"/><path d="M8 4.5l1.8 6.5"/><path d="M16 4.5l-1.8 6.5"/><circle cx="12" cy="8.3" r="1.6"/><path d="M12 10.6v6.2"/><path d="M12 16.8l-2.2 4.2"/><path d="M12 16.8l2.2 4.2"/>',
  squat:
    '<circle cx="9.8" cy="4.3" r="1.7"/><path d="M10.4 6.9L8.6 12.4"/><path d="M8.6 12.4h7v6.6"/><path d="M15.6 19h3.6"/><path d="M10 9.2l7.4-.6"/>',
  run: '<circle cx="15.5" cy="4.3" r="1.7"/><path d="M14 7.6l-3.2 5 3.4 2.6-1.2 5.2"/><path d="M10.8 12.6L7.2 16"/><path d="M13.6 9.6l3.6 1.6"/><path d="M12.4 10.4L8.8 9"/>',
  walk: '<circle cx="12" cy="4.3" r="1.7"/><path d="M12 7.5V13"/><path d="M12 13l-2.6 7"/><path d="M12 13l2.6 2.4.8 4.6"/><path d="M12 9.2l-3 3"/><path d="M12 9.2l3 2.6"/>',
  bike: '<circle cx="6" cy="16.5" r="3.6"/><circle cx="18" cy="16.5" r="3.6"/><path d="M6 16.5l4.3-7h4.6l3.1 7"/><path d="M10.3 9.5l2.6 7H6"/><path d="M14.9 9.5L14 7h2.2"/><path d="M8.6 7.3h3"/>',
  swim: '<circle cx="16.5" cy="7" r="1.7"/><path d="M4.5 12l4-2.4 4.4 2.2 2.6-2.6"/><path d="M2.8 16.2q2.3-1.9 4.6 0t4.6 0 4.6 0 4.6 0"/><path d="M2.8 20q2.3-1.9 4.6 0t4.6 0 4.6 0 4.6 0"/>',
  yoga: '<circle cx="12" cy="5" r="1.8"/><path d="M12 7.6v4.6"/><path d="M12 9.4L8 12.4 5.8 10.6"/><path d="M12 9.4l4 3 2.2-1.8"/><path d="M4.5 17.6c3.4 2.6 11.6 2.6 15 0"/><path d="M8 15.2c2.4 1.6 5.6 1.6 8 0"/>',
  sleep:
    '<path d="M19.5 14.6A8 8 0 1 1 9.4 4.5a6.4 6.4 0 0 0 10.1 10.1z"/><path d="M15 4.5h3.2L15 8h3.2"/>',
  apple:
    '<path d="M12 8C9.4 6 5 7.6 5.3 12.4c.3 4 2.8 7.8 5.2 7.8.9 0 1.1-.5 1.5-.5s.6.5 1.5.5c2.4 0 4.9-3.8 5.2-7.8C18.9 7.6 14.6 6 12 8z"/><path d="M12 8c0-2.2 1-3.7 2.8-4.3"/>',
  meal: '<path d="M6.5 3v7.5"/><path d="M4 3v5a2.5 2.5 0 0 0 5 0V3"/><path d="M6.5 10.5V21"/><path d="M17 3c-2.2 1.6-3.2 4-3.2 7 0 2 1 3 3.2 3V21"/>',
  coffee:
    '<path d="M5 9.5h11v4.5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V9.5z"/><path d="M16 10.8h1.4a2.4 2.4 0 0 1 0 4.8H16"/><path d="M9 3.6c-.8 1 .8 1.6 0 2.8M12.6 3.6c-.8 1 .8 1.6 0 2.8"/>',
  study:
    '<path d="M2.5 9.5L12 5l9.5 4.5L12 14 2.5 9.5z"/><path d="M6.5 11.9V16c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3v-4.1"/><path d="M21.5 9.5V15"/>',
  code: '<path d="M8.5 7l-5 5 5 5"/><path d="M15.5 7l5 5-5 5"/><path d="M13.6 5.5l-3.2 13"/>',
  pill: '<g transform="rotate(-40 12 12)"><rect x="2.8" y="8.4" width="18.4" height="7.2" rx="3.6"/><path d="M12 8.4v7.2"/></g>',
  scale: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.2"/><path d="M8 10.5a4.6 4.2 0 0 1 8 0"/><path d="M12 12.6l1.8-2.2"/>',
  heart:
    '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/>',
  pulse: '<path d="M2.5 12H7l2.2-5.5 4.2 11 2.3-5.5h5.8"/>',
  music: '<path d="M9 17.5V5.5l10-2v12"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7"/>',
  wallet:
    '<path d="M17 6.5H5A2 2 0 0 0 3 8.5v9a2 2 0 0 0 2 2h14a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 19 8.5H5.5"/><path d="M17 6.5V5A1.5 1.5 0 0 0 15.5 3.5H6"/><circle cx="16.2" cy="13.8" r="1.1" fill="currentColor"/>',
  sparkles:
    '<path d="M11 3.5l1.9 5 5 1.9-5 1.9-1.9 5-1.9-5-5-1.9 5-1.9 1.9-5z"/><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z"/>',
  phone: '<rect x="7" y="3" width="10" height="18" rx="2.4"/><path d="M11 18h2"/>',
  leaf: '<path d="M5 19C5 10.5 9.5 5.5 19.5 4.5 19.5 14.5 14.5 19.5 6.5 19.5"/><path d="M5 19.5L13 11.5"/>',
  tooth:
    '<path d="M8 4.5c-2.6 0-4 2-4 4.3 0 2.5 1.5 3.7 1.7 6.2.2 2.3.6 4.5 2.1 4.5 1.4 0 1.4-3.5 4.2-3.5s2.8 3.5 4.2 3.5c1.5 0 1.9-2.2 2.1-4.5.2-2.5 1.7-3.7 1.7-6.2 0-2.3-1.4-4.3-4-4.3-1.7 0-2.6.9-4 .9S9.7 4.5 8 4.5z"/>',
  clock: '<circle cx="12" cy="13" r="8"/><path d="M12 8.8V13l2.6 1.6"/><path d="M9.5 2.8h5"/>',
  mountain: '<path d="M3 19.5l6.2-11 4 6.6 2.5-3.8 5.3 8.2H3z"/>',
  car: '<rect x="3.2" y="12.8" width="17.6" height="5.2" rx="1.6"/><path d="M5.2 12.8l1.6-4.3a2 2 0 0 1 1.9-1.3h6.6a2 2 0 0 1 1.9 1.3l1.6 4.3"/><circle cx="7.5" cy="18" r="1.6"/><circle cx="16.5" cy="18" r="1.6"/>',
  zap: '<path d="M13.2 2.5L5 13.5h6.2l-1 8 8.3-11h-6.3l1-8z"/>',
  smile:
    '<circle cx="12" cy="12" r="9"/><path d="M8.3 14.2c1 1.6 2.3 2.4 3.7 2.4s2.7-.8 3.7-2.4"/><path d="M9 9.6h.01M15 9.6h.01"/>',
  ruler: '<path d="M3.5 15.5L15.5 3.5l5 5-12 12-5-5z"/><path d="M7 12l2 2M10 9l2 2M13 6l2 2"/>',
  pin: '<path d="M9 3.5h6l-1 5 3 3.5H7l3-3.5-1-5z"/><path d="M12 12v8.5"/>',
  medical: '<path d="M9 4h6v5h5v6h-5v5H9v-5H4V9h5V4z"/>',
  refresh: '<path d="M4 12a8 8 0 0 1 14-5.2M20 12a8 8 0 0 1-14 5.2"/><path d="M18 3.5V7h-3.5"/><path d="M6 20.5V17h3.5"/>',
  link: '<path d="M9.5 14.5L14.5 9.5"/><path d="M11 6.5l1.4-1.4a3.5 3.5 0 0 1 5 5L16 11.5"/><path d="M13 17.5l-1.4 1.4a3.5 3.5 0 0 1-5-5L8 12.5"/>',
  brain:
    '<path d="M9.5 4.5a3 3 0 0 0-3 3 3 3 0 0 0-2 2.8 3 3 0 0 0 1.2 2.4 3 3 0 0 0 .8 4.3 3 3 0 0 0 5 1.5V5.5a2 2 0 0 0-2-1z"/><path d="M14.5 4.5a3 3 0 0 1 3 3 3 3 0 0 1 2 2.8 3 3 0 0 1-1.2 2.4 3 3 0 0 1-.8 4.3 3 3 0 0 1-5 1.5V5.5a2 2 0 0 1 2-1z"/>',
  dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
  stretch:
    '<circle cx="12" cy="4" r="1.7"/><path d="M12 6.6v6"/><path d="M12 8.5l-6 2.5"/><path d="M12 8.5l6 2.5"/><path d="M12 12.6l-3 7"/><path d="M12 12.6l3 7"/>',
  boxing:
    '<path d="M13.5 4.5c2.5 0 4.5 2 4.5 4.5 0 1-.3 1.8-.9 2.6l-3.4 4.4a2 2 0 0 1-1.6.8H8.5a2.5 2.5 0 0 1-2.5-2.5v-3A6.5 6.5 0 0 1 13.5 4.5z"/><path d="M8.5 9.2v5.1"/><path d="M6 19.5c1-2 2.5-2.5 4-2.5"/>',
  jumprope:
    '<path d="M4 20c3-8 6-14 8-16M20 20c-3-8-6-14-8-16"/><circle cx="5" cy="20.5" r="1.3"/><circle cx="19" cy="20.5" r="1.3"/><circle cx="12" cy="3.5" r="1.6"/>',
  plate: '<circle cx="12" cy="12" r="9.2"/><circle cx="12" cy="12" r="4"/>',
  treadmill:
    '<rect x="3" y="15" width="14" height="3.2" rx="1.4"/><path d="M17 12.5V19"/><path d="M17 12.5l3.5-1.5"/><circle cx="8.5" cy="6" r="1.7"/><path d="M8.5 8.5v4l-2.5 3"/><path d="M8.5 10.5l3 1.5 1 4"/>',
  ski: '<path d="M2.5 20l6-13.5"/><path d="M11.5 20l6-13.5"/><path d="M4 16.5h4.5M13 16.5h4.5"/><path d="M4.5 5.5l14 5"/>',
  bandage:
    '<rect x="3.5" y="9.5" width="17" height="5" rx="2.5" transform="rotate(-30 12 12)"/><path d="M9.5 8l1.6 3.2M14.6 12.6l1.6 3.2" transform="rotate(-30 12 12)"/>',
  thermometer:
    '<path d="M12 3.5a2 2 0 0 0-2 2v9.6a4 4 0 1 0 4 0V5.5a2 2 0 0 0-2-2z"/><path d="M12 8.5v6.6"/><circle cx="12" cy="17.5" r="1.6" fill="currentColor"/>',
  lungs:
    '<path d="M12 3v9"/><path d="M12 9c-1-2-2.5-2.5-4-2-2 .6-3.5 2.8-3.5 6 0 3 1.5 5 3 5 1.3 0 1.8-1 2-2.3l1.5-6.7"/><path d="M12 9c1-2 2.5-2.5 4-2 2 .6 3.5 2.8 3.5 6 0 3-1.5 5-3 5-1.3 0-1.8-1-2-2.3L12.5 9"/>',
  tea: '<path d="M4.5 9.5h11v4.5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V9.5z"/><path d="M15.5 10.8h1.4a2.4 2.4 0 0 1 0 4.8h-1.4"/><path d="M7 5.5c1.3.8 1.3 1.7 0 2.5M11 5.5c1.3.8 1.3 1.7 0 2.5"/>',
  bottle:
    '<path d="M10 2.5h4v2.8l1.5 2V19a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2V7.3l1.5-2V2.5z"/><path d="M8.5 12.5h7"/>',
  pizza:
    '<path d="M12 3.5l9 16.5H3l9-16.5z"/><circle cx="12" cy="11" r="1" fill="currentColor"/><circle cx="9.5" cy="15" r="1" fill="currentColor"/><circle cx="14.5" cy="15.5" r="1" fill="currentColor"/>',
  salad:
    '<path d="M3.5 12.5a8.5 6.5 0 0 0 17 0z"/><path d="M12 12.5V7"/><path d="M12 7c-1.5-1.5-1.5-3-1-4.5 1.8.3 2.8 1.6 3 3"/><path d="M8 12.2l-1-3M16 12.2l1-3"/>',
  bread: '<path d="M4 12.5c0-4.5 3.5-8 8-8s8 3.5 8 8-1 6-8 6-8-1.5-8-6z"/><path d="M8 9.5v5M12 8.5v6.5M16 9.5v5"/>',
  bed: '<path d="M2.5 19.5V9.5a2 2 0 0 1 2-2h15a2 2 0 0 1 2 2v10"/><path d="M2.5 15.5h19"/><path d="M6 13v-3.2A1.3 1.3 0 0 1 7.3 8.5h3.4A1.3 1.3 0 0 1 12 9.8V13"/>',
  broom:
    '<path d="M13 3l7 7-2.5 2.5L10 5z"/><path d="M10.5 5.5l-8 8"/><path d="M2 21c1-4 3-5.5 6-6.5"/><path d="M2 21c2-2 3-1 5-2.5"/><path d="M2 21c1.5-2.5 1-4 3-6"/>',
  laundry:
    '<circle cx="12" cy="13" r="6"/><path d="M9 13a3 3 0 0 0 5 2.2"/><path d="M6 4.5h.01M9 4.5h.01"/><rect x="3.5" y="2.5" width="17" height="19" rx="2.5"/>',
  trash2: '<path d="M4 7h16"/><path d="M9 7V4.5h6V7"/><path d="M6.5 7l1 13h9l1-13"/><path d="M10 11v6M14 11v6"/>',
  wrench: '<path d="M14.5 3a5 5 0 0 0-6.8 5.9L3 13.6l2.4 2.4 4.7-4.7A5 5 0 0 0 16 8.5l-3-.5-.5-3z"/>',
  piggybank:
    '<path d="M4.5 13a6 5 0 0 1 6-5.2h4a4.5 4.5 0 0 1 4 2.4l2 .3v3l-2 .5a5 5 0 0 1-1.2 2l.4 2.5h-2.7l-.3-1.5h-3.4l-.3 1.5H8.3l.4-2.5A6 5 0 0 1 4.5 13z"/><path d="M8 9.3V7.5M15.5 10h.01"/>',
  card: '<rect x="2.5" y="5.5" width="19" height="13" rx="2.2"/><path d="M2.5 9.5h19"/><path d="M6 14.5h4"/>',
  receipt:
    '<path d="M6 3.5h12v17l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5v-17z"/><path d="M9 8h6M9 11.5h6M9 15h4"/>',
  gift: '<rect x="3.5" y="9.5" width="17" height="10" rx="1.6"/><path d="M3.5 9.5h17v3.5h-17z"/><path d="M12 9.5v10"/><path d="M12 9.5C10.5 6 7 6.2 7 8.3c0 1 1 1.2 2 1.2h3zM12 9.5c1.5-3.5 5-3.3 5-1.2 0 1-1 1.2-2 1.2h-3z"/>',
  party:
    '<path d="M4 20.5L14.5 3.5l5 5-17 11z"/><path d="M9.5 12.5l3 3"/><circle cx="18" cy="4" r="1" fill="currentColor"/><circle cx="21" cy="8" r="1" fill="currentColor"/><circle cx="15" cy="2.5" r="1" fill="currentColor"/>',
  tree: '<path d="M12 21v-7"/><path d="M12 14c-3 0-5.5-2.2-5.5-5S9 4 12 4s5.5 2.2 5.5 5-2.5 5-5.5 5z"/><path d="M12 4c-1.6 0-3 1.4-3 3.5"/>',
  cloud:
    '<path d="M7 18.5a4.2 4.2 0 0 1-.5-8.4 5.5 5.5 0 0 1 10.6-2 4 4 0 0 1 1.4 7.8"/><path d="M7 18.5h11"/>',
  rain: '<path d="M7 14.5a4.2 4.2 0 0 1-.5-8.4 5.5 5.5 0 0 1 10.6-2 4 4 0 0 1 1.4 7.8"/><path d="M8 17.5l-1.2 3M12 17.5l-1.2 3M16 17.5l-1.2 3"/>',
  snow: '<path d="M7 12.5a4.2 4.2 0 0 1-.5-8.4 5.5 5.5 0 0 1 10.6-2 4 4 0 0 1 1.4 7.8"/><path d="M12 15v6M9.5 17l5 2M14.5 17l-5 2"/>',
  flower:
    '<circle cx="12" cy="12" r="2.2"/><circle cx="12" cy="6.5" r="2.4"/><circle cx="17.5" cy="12" r="2.4"/><circle cx="12" cy="17.5" r="2.4"/><circle cx="6.5" cy="12" r="2.4"/><path d="M12 19.5V22"/>',
  plane: '<path d="M2.5 13.5l19-6.5-6.5 19-2.5-8-8-2.5z"/><path d="M12.5 13.5l-4 4"/>',
  suitcase:
    '<rect x="3" y="7.5" width="18" height="12.5" rx="2"/><path d="M9 7.5V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2.5"/><path d="M3 13h18"/>',
  train:
    '<rect x="5.5" y="3.5" width="13" height="13" rx="4"/><circle cx="9" cy="13" r="1" fill="currentColor"/><circle cx="15" cy="13" r="1" fill="currentColor"/><path d="M8 20.5l2-3M16 20.5l-2-3"/><path d="M5.5 8.5h13"/>',
  laptop: '<rect x="3.5" y="4.5" width="17" height="11" rx="1.5"/><path d="M2 19.5h20"/><path d="M9 19.5l1-4h4l1 4"/>',
  camera:
    '<rect x="2.5" y="7" width="19" height="13" rx="2.2"/><path d="M8 7l1.5-3h5L16 7"/><circle cx="12" cy="13.5" r="4"/>',
  headphones:
    '<path d="M4 15v-2.5a8 8 0 0 1 16 0V15"/><rect x="2.5" y="13.5" width="4" height="6" rx="1.6"/><rect x="17.5" y="13.5" width="4" height="6" rx="1.6"/>',
  gamepad:
    '<rect x="2.5" y="8" width="19" height="10" rx="5"/><path d="M7 11v4M5 13h4"/><circle cx="16" cy="12" r="1" fill="currentColor"/><circle cx="18.5" cy="14.5" r="1" fill="currentColor"/>',
  tv: '<rect x="3" y="5" width="18" height="12.5" rx="1.8"/><path d="M8 20.5h8"/>',
  hourglass:
    '<path d="M6.5 3.5h11M6.5 20.5h11"/><path d="M7.5 3.5v3.2a4.5 4.5 0 0 0 2.2 3.9L12 12l2.3-1.4a4.5 4.5 0 0 0 2.2-3.9V3.5"/><path d="M7.5 20.5v-3.2a4.5 4.5 0 0 1 2.2-3.9L12 12l2.3 1.4a4.5 4.5 0 0 1 2.2 3.9v3.2"/>',
  paintbrush:
    '<path d="M4.5 19.5c-1.5-3 0-5 2-5s3 1.7 2 3.5-2.5 2.5-4 1.5z"/><path d="M8.5 14L18 4.5a1.8 1.8 0 0 1 2.5 2.5L11 16.5"/>',
  guitar:
    '<circle cx="8" cy="16" r="4.5"/><circle cx="8" cy="16" r="1.6"/><path d="M10.5 12.5L18 5"/><path d="M17 4l3 3-1.5 1.5-3-3z"/>',
  paw: '<circle cx="7" cy="8.5" r="1.8"/><circle cx="12" cy="6.5" r="1.8"/><circle cx="17" cy="8.5" r="1.8"/><path d="M12 11.5c-3.3 0-5.5 2.2-5.5 4.5s2 3.5 5.5 3.5 5.5-1.2 5.5-3.5-2.2-4.5-5.5-4.5z"/>',
  fish: '<path d="M2.5 12c3.5-4.5 9-5.5 13-3.8 2 .9 4 2.3 6 3.8-2 1.5-4 2.9-6 3.8-4 1.7-9.5.7-13-3.8z"/><circle cx="7.5" cy="11" r="0.9" fill="currentColor"/><path d="M21.5 12l-2.3-2.7M21.5 12l-2.3 2.7"/>',
  bird: '<path d="M2.5 13.5c2.7-5 8-6.5 12-4.8 1.2.5 2.2 1.3 3 2.3-1 .2-1.9.1-2.7-.3-.5 3.5-3.5 6-7.3 6.3.9-1.2 1.3-2.2 1.2-3.1-2.4.3-4.7-.1-6.2-.4z"/><circle cx="14.5" cy="10" r="0.8" fill="currentColor"/>',
  briefcase:
    '<rect x="2.5" y="7.5" width="19" height="12" rx="2"/><path d="M8.5 7.5V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5v2"/><path d="M2.5 13h19"/>',
  checklist:
    '<path d="M4 6.5l1.5 1.5L8 5.5"/><path d="M4 12.5l1.5 1.5L8 11.5"/><path d="M4 18.5l1.5 1.5L8 17.5"/><path d="M11 6.5h9M11 12.5h9M11 18.5h9"/>',
  done: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
  star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9 6.8 19.7l1-5.9L3.5 9.7l5.9-.8L12 3.5z"/>',
  book: '<path d="M12 6c-2-1.5-5-2-8-1.5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-13c-3-.5-6 0-8 1.5z"/><path d="M12 6v13"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="18" r="1" fill="currentColor"/>',
  chart: '<path d="M4 4v16h16"/><path d="M8 15l4-5 3 3 5-6"/>',
  note: '<path d="M6 3.5h9l4 4V20.5H6z"/><path d="M14.5 3.5V8H19"/><path d="M9 12.5h6M9 16h6"/>',
  trophy:
    '<path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M8 6H5v1.5A3 3 0 0 0 8 10.5M16 6h3v1.5a3 3 0 0 1-3 3"/><path d="M12 13v4M8.5 20h7M10 17h4v3h-4z"/>',
  medal: '<circle cx="12" cy="14.5" r="5.5"/><path d="M8.5 10L7 3.5h4l1 3 1-3h4L15.5 10"/>',
  lock: '<rect x="5" y="11" width="14" height="9.5" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
} as const

export type IconName = keyof typeof ICON_PATHS

export function iconSvgMarkup(name: string, extraStyle = ''): string {
  const body = (ICON_PATHS as Record<string, string>)[name]
  if (!body) return ''
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extraStyle ? ` style="${extraStyle}"` : ''}>${body}</svg>`
}

// Известные эмодзи → их SVG-аналог. Метрики, у которых в данных лежит один из этих
// эмодзи (а не "svg:<имя>"), тоже рисуются иконкой — без правки самих данных.
export const EMOJI_TO_SVG: Record<string, IconName> = {
  '💧': 'droplet',
  '💦': 'droplet',
  '💪': 'dumbbell',
  '🏋': 'dumbbell',
  '🚶': 'walk',
  '🏃': 'run',
  '🚴': 'bike',
  '🚲': 'bike',
  '🏊': 'swim',
  '🧘': 'yoga',
  '😴': 'sleep',
  '💤': 'sleep',
  '🛌': 'sleep',
  '🌙': 'sleep',
  '🍎': 'apple',
  '🍏': 'apple',
  '🥗': 'apple',
  '🍽': 'meal',
  '🍴': 'meal',
  '🥩': 'meal',
  '🍗': 'meal',
  '☕': 'coffee',
  '📚': 'book',
  '📖': 'book',
  '🎓': 'study',
  '💻': 'code',
  '💊': 'pill',
  '⚖': 'scale',
  '❤': 'heart',
  '♥': 'heart',
  '🫀': 'heart',
  '💓': 'pulse',
  '💗': 'pulse',
  '🎵': 'music',
  '🎧': 'music',
  '☀': 'sun',
  '🌞': 'sun',
  '💰': 'wallet',
  '💵': 'wallet',
  '✨': 'sparkles',
  '📱': 'phone',
  '🌿': 'leaf',
  '🌱': 'leaf',
  '🦷': 'tooth',
  '⏱': 'clock',
  '⏰': 'clock',
  '🕐': 'clock',
  '🏔': 'mountain',
  '⛰': 'mountain',
  '🚗': 'car',
  '⚡': 'zap',
  '😊': 'smile',
  '🙂': 'smile',
  '😀': 'smile',
  '📏': 'ruler',
  '📌': 'pin',
  '🔥': 'flame',
  '🎯': 'goals',
  '✅': 'done',
  '📈': 'chart',
  '📊': 'chart',
  '🗓': 'calendar',
  '📅': 'calendar',
  '⭐': 'star',
  '🏆': 'trophy',
  '🧠': 'brain',
  '✏': 'edit',
  '📝': 'note',
  '🏠': 'home',
  '🩺': 'medical',
}

// Ключевые слова для поиска иконки метрики (рус/eng), включая синонимы.
export const ICON_KEYWORDS: Partial<Record<IconName, string>> = {
  pushup: 'отжимания push up press',
  pullup: 'подтягивания pull up bar',
  squat: 'приседания squat legs',
  dumbbell: 'гантели вес силовая strength weight gym',
  run: 'бег running jog cardio',
  walk: 'ходьба прогулка walking steps',
  bike: 'велосипед cycling bicycle',
  swim: 'плавание swimming pool',
  yoga: 'йога растяжка stretching',
  mountain: 'горы поход hiking trekking outdoors',
  heart: 'сердце любовь health love',
  pulse: 'пульс давление heart rate cardio',
  droplet: 'вода капля water hydration',
  scale: 'весы вес взвешивание weight measure',
  apple: 'яблоко еда фрукт food fruit diet',
  meal: 'еда обед ужин завтрак food meal dinner lunch',
  coffee: 'кофе напиток drink caffeine',
  sleep: 'сон отдых спать rest nap',
  pill: 'таблетки лекарство medicine drug supplement',
  medical: 'медицина аптечка врач health cross',
  tooth: 'зубы стоматолог dental teeth',
  book: 'книга чтение reading learn',
  study: 'учёба образование study school university',
  brain: 'мозг мышление ум mind think memory',
  code: 'код программирование programming dev',
  note: 'заметка текст note write',
  music: 'музыка песня music song',
  sun: 'солнце свет утро sun light morning',
  leaf: 'растение природа зелёный plant nature eco',
  smile: 'улыбка настроение happy mood',
  zap: 'энергия молния скорость energy speed fast',
  flame: 'огонь стрик fire streak',
  clock: 'время часы time',
  wallet: 'деньги финансы кошелёк money finance budget',
  car: 'машина авто транспорт car drive',
  phone: 'телефон звонок phone call',
  sparkles: 'блеск магия sparkle special',
  goals: 'цель мишень target aim',
  star: 'звезда баллы бонус star points bonus',
  trophy: 'кубок победа приз trophy win award',
  ruler: 'линейка измерение measure size',
  pin: 'метка место pin location marker',
  calendar: 'календарь дата calendar date',
  home: 'дом квартира home house apartment',
  stretch: 'растяжка гибкость stretching flexibility',
  boxing: 'бокс единоборства boxing fight punch',
  jumprope: 'скакалка прыжки jump rope skipping',
  plate: 'блин штанга диск plate barbell',
  treadmill: 'беговая дорожка treadmill',
  ski: 'лыжи зимний спорт skiing winter',
  bandage: 'пластырь травма первая помощь bandage injury first aid',
  thermometer: 'температура градусник fever thermometer',
  eye: 'глаза зрение eye vision sight',
  lungs: 'дыхание лёгкие breathing breath lungs',
  tea: 'чай напиток tea drink',
  bottle: 'бутылка вода питьё bottle drink water',
  pizza: 'пицца еда fastfood pizza food',
  salad: 'салат овощи здоровое питание salad veggies healthy',
  bread: 'хлеб выпечка bread bakery',
  bed: 'кровать постель сон bed sleep',
  broom: 'уборка чистота cleaning chores broom',
  laundry: 'стирка бельё laundry washing',
  trash2: 'мусор выброс trash garbage bin',
  wrench: 'ремонт инструмент repair tool fix',
  piggybank: 'копилка сбережения savings piggy bank',
  card: 'карта оплата банк card payment bank',
  receipt: 'чек квитанция receipt bill',
  gift: 'подарок праздник gift present',
  party: 'праздник вечеринка party celebration',
  tree: 'дерево природа tree nature',
  cloud: 'облако погода cloud weather',
  rain: 'дождь погода rain weather',
  snow: 'снег зима winter snow',
  flower: 'цветок растение flower plant',
  plane: 'самолёт путешествие полёт plane travel flight',
  suitcase: 'чемодан путешествие багаж suitcase travel luggage',
  train: 'поезд транспорт train',
  laptop: 'ноутбук работа компьютер laptop work computer',
  camera: 'камера фото photo camera',
  headphones: 'наушники музыка звук headphones audio',
  gamepad: 'игры геймпад games controller',
  tv: 'телевизор экран tv screen',
  hourglass: 'песочные часы время ожидание hourglass time wait',
  paintbrush: 'рисование творчество art painting brush',
  guitar: 'гитара музыка инструмент guitar music instrument',
  paw: 'питомец животное pet animal paw',
  fish: 'рыба аквариум fish',
  bird: 'птица bird',
  briefcase: 'работа офис карьера work office career job',
  checklist: 'список задачи todo checklist tasks',
}

// Порядок и набор иконок, показываемых в сетке IconPicker — подмножество ICON_PATHS
// (без чисто навигационных/служебных иконок вроде x, gear, chevron_*).
export const METRIC_ICON_CHOICES: IconName[] = [
  'pushup', 'pullup', 'squat', 'dumbbell', 'run', 'walk', 'bike', 'swim', 'yoga', 'mountain',
  'heart', 'pulse', 'droplet', 'scale', 'apple', 'meal', 'coffee', 'sleep', 'pill', 'medical',
  'tooth', 'book', 'study', 'brain', 'code', 'note', 'music', 'sun', 'leaf', 'smile',
  'zap', 'flame', 'clock', 'wallet', 'car', 'phone', 'sparkles', 'goals', 'star', 'trophy',
  'ruler', 'pin', 'calendar', 'home', 'stretch', 'boxing', 'jumprope', 'plate', 'treadmill', 'ski',
  'bandage', 'thermometer', 'eye', 'lungs', 'tea', 'bottle', 'pizza', 'salad', 'bread', 'bed',
  'broom', 'laundry', 'trash2', 'wrench', 'piggybank', 'card', 'receipt', 'gift', 'party', 'tree',
  'cloud', 'rain', 'snow', 'flower', 'plane', 'suitcase', 'train', 'laptop', 'camera', 'headphones',
  'gamepad', 'tv', 'hourglass', 'paintbrush', 'guitar', 'paw', 'fish', 'bird', 'briefcase', 'checklist',
]

// Поиск: регистр и «ё/е» не важны; запрос из нескольких слов — КАЖДОЕ слово должно найтись в имени или
// ключевых словах иконки («бег лёгкая» ≠ «бег вода»). Пустой запрос подходит всему.
function normalizeQuery(s: string): string {
  return s.toLowerCase().replace(/ё/g, 'е')
}
export function iconSearchMatches(name: IconName, query: string): boolean {
  const words = normalizeQuery(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const hay = normalizeQuery(name + ' ' + (ICON_KEYWORDS[name] || ''))
  return words.every((w) => hay.includes(w))
}

// «Редкие иконки скрыты по умолчанию» (BACKLOG 1.3): без запроса пикер показывает только подборку
// POPULAR_ICONS; остальные — по вкладкам-категориям и во «Всех». Поиск идёт по всему архиву
// (METRIC_ICON_CHOICES). Подборка и категории — подмножества METRIC_ICON_CHOICES: каждая иконка
// пикера входит РОВНО в одну категорию (проверяет тест icons.test.ts).
export const POPULAR_ICONS: IconName[] = [
  'pushup', 'pullup', 'squat', 'dumbbell', 'run', 'walk', 'bike', 'swim', 'yoga', 'heart',
  'droplet', 'scale', 'sleep', 'apple', 'coffee', 'book', 'study', 'code', 'music', 'flame',
]

export interface IconCategory {
  key: string
  ru: string
  en: string
  icons: IconName[]
}

export const ICON_CATEGORIES: IconCategory[] = [
  { key: 'sport', ru: 'Спорт', en: 'Sport', icons: ['pushup', 'pullup', 'squat', 'dumbbell', 'run', 'walk', 'bike', 'swim', 'yoga', 'mountain', 'stretch', 'boxing', 'jumprope', 'plate', 'treadmill', 'ski'] },
  { key: 'health', ru: 'Здоровье', en: 'Health', icons: ['heart', 'pulse', 'droplet', 'scale', 'pill', 'medical', 'tooth', 'bandage', 'thermometer', 'eye', 'lungs', 'sleep', 'bed', 'smile', 'brain'] },
  { key: 'food', ru: 'Еда', en: 'Food', icons: ['apple', 'meal', 'coffee', 'tea', 'bottle', 'pizza', 'salad', 'bread'] },
  { key: 'work', ru: 'Учёба и работа', en: 'Study & work', icons: ['book', 'study', 'code', 'note', 'laptop', 'briefcase', 'checklist', 'hourglass', 'clock', 'calendar'] },
  { key: 'home', ru: 'Дом и деньги', en: 'Home & money', icons: ['home', 'broom', 'laundry', 'trash2', 'wrench', 'piggybank', 'wallet', 'card', 'receipt', 'gift', 'party', 'car', 'phone'] },
  { key: 'nature', ru: 'Природа и путешествия', en: 'Nature & travel', icons: ['sun', 'leaf', 'tree', 'cloud', 'rain', 'snow', 'flower', 'plane', 'suitcase', 'train', 'paw', 'fish', 'bird', 'pin'] },
  { key: 'creative', ru: 'Творчество и разное', en: 'Creative & other', icons: ['music', 'headphones', 'guitar', 'paintbrush', 'camera', 'gamepad', 'tv', 'sparkles', 'zap', 'flame', 'goals', 'star', 'trophy', 'ruler'] },
]

// Человекочитаемое название иконки для подсказки: первое слово ключевых слов на нужном языке
// (русское — кириллицей, английское — латиницей); если слов нужного алфавита нет — само имя.
export function iconLabel(name: IconName, lang: 'ru' | 'en'): string {
  const words = (ICON_KEYWORDS[name] || '').split(/\s+/).filter(Boolean)
  const pick = words.find((w) => (lang === 'ru' ? /[а-яё]/i.test(w) : /^[a-z]/i.test(w)))
  return pick || name
}

// Что показывать в пикере: непустой запрос — поиск по всему архиву (вкладка не важна); иначе содержимое
// вкладки: 'popular' (подборка), 'all' (все) или ключ категории.
export function iconsForPicker(query: string, tab: string): IconName[] {
  if (query.trim()) return METRIC_ICON_CHOICES.filter((n) => iconSearchMatches(n, query))
  if (tab === 'all') return METRIC_ICON_CHOICES
  if (tab === 'popular') return POPULAR_ICONS
  return ICON_CATEGORIES.find((c) => c.key === tab)?.icons ?? POPULAR_ICONS
}

// "svg:<имя>" или известный эмодзи → имя иконки в ICON_PATHS; иначе null (эмодзи
// рисуется как есть, текстом).
export function metricIconKey(icon: string | null | undefined): IconName | null {
  if (!icon) return null
  if (icon.startsWith('svg:')) {
    const k = icon.slice(4) as IconName
    return (ICON_PATHS as Record<string, string>)[k] ? k : null
  }
  const norm = icon.replace(/\uFE0F/g, '').replace(/\u200D[\u2640\u2642]/g, '').trim()
  return EMOJI_TO_SVG[norm] || null
}
