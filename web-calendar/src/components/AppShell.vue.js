/// <reference types="../../../../../home/claude/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../home/claude/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import SplashFlameLive from './splash/SplashFlameLive.vue';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { getLang, setLang, t } from '../lib/i18n';
import { FAVORITE_THEMES_EVENT, UNLOCKED_THEMES_EVENT, getTheme, setTheme, THEME_KEYS, visibleThemes } from '../lib/theme';
import { logout } from '../lib/supabase';
import ConfirmLogoutModal from './ConfirmLogoutModal.vue';
import { loadVersionInfo } from '../lib/version';
import { handleInstallClick, isStandaloneApp } from '../lib/install';
import InstallModal from './InstallModal.vue';
import WelcomeTourModal from './WelcomeTourModal.vue';
import AboutModal from './AboutModal.vue';
import Icon from './Icon.vue';
import PageHint from './PageHint.vue';
import ChangelogModal from './ChangelogModal.vue';
const { defineProps, } = {};
const props = defineProps();
// «Установить приложение» / «Как пользоваться» / «О создателе» — модалки как в account/history/languages (BACKLOG 49.4, 49.7).
const showInSidebar = !isStandaloneApp();
const installModalOpen = ref(false);
const tourOpen = ref(false);
const aboutOpen = ref(false);
async function onInstallClick() {
    const shown = await handleInstallClick();
    if (!shown)
        installModalOpen.value = true;
}
function openInstall() {
    closeSidebar();
    onInstallClick();
}
function openTour() {
    closeSidebar();
    tourOpen.value = true;
}
function openAbout() {
    closeSidebar();
    aboutOpen.value = true;
}
// Тур «Как пользоваться» после онбординга (BACKLOG 49.4): онбординг ставит флаг tour_pending — показываем один раз на первой же странице.
try {
    if (localStorage.getItem('tour_pending')) {
        localStorage.removeItem('tour_pending');
        tourOpen.value = true;
    }
}
catch {
    /* localStorage недоступен — тур можно открыть из меню */
}
const pages = [
    { href: '/dashboard/', key: 'dashboard', labelKey: 'nav_dashboard', icon: 'home' },
    { href: '/goals/', key: 'goals', labelKey: 'nav_goals', icon: 'goals' },
    { href: '/skills/', key: 'skills', labelKey: 'nav_skills', icon: 'skills' },
    { href: '/workouts/', key: 'workouts', labelKey: 'nav_workouts', icon: 'workouts' },
    { href: '/challenges/', key: 'challenges', labelKey: 'nav_challenges', icon: 'challenges' },
    { href: '/languages/', key: 'english', labelKey: 'nav_english', icon: 'english' },
    { href: '/calendar/', key: 'calendar', labelKey: 'nav_calendar', icon: 'calendar' },
    { href: '/milestones/', key: 'milestones', labelKey: 'nav_milestones', icon: 'milestones' },
    { href: '/shop/', key: 'shop', labelKey: 'nav_shop', icon: 'shop' },
    { href: '/achievements/', key: 'achievements', labelKey: 'nav_achievements', icon: 'medal' },
    { href: '/customization/', key: 'customization', labelKey: 'nav_customization', icon: 'paintbrush' },
    { href: '/community/', key: 'community', labelKey: 'nav_community', icon: 'community' },
];
const active = 'calendar';
// «Избранное» — левое сердечко со списком быстрых ссылок — ТОЛЬКО на главной (BACKLOG 45.1); на остальных страницах — только правое сердечко «добавить страницу в избранное» из шапки
const isHome = String(active) === 'dashboard';
function plainLabel(key) {
    return t(key).replace(/^[^\p{L}\p{N}]+/u, '');
}
const sidebarOpen = ref(false);
const quickNavOpen = ref(false);
// «Избранное» (BACKLOG 6.2): список по шеврону показывает только избранные страницы. Состояние лежит в localStorage
// `favorite_pages` (JSON-массив ключей страниц) и меняется сердечком в шапке (бандл /header-widgets/, событие favorites:changed);
// синхронизацию с профилем делает тот же бандл — здесь только чтение.
function readFavorites() {
    try {
        const v = JSON.parse(localStorage.getItem('favorite_pages') || '[]');
        return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
    }
    catch {
        return [];
    }
}
const favorites = ref(readFavorites());
const syncFavorites = () => (favorites.value = readFavorites());
// Боковое меню (BACKLOG 6.2): основные страницы, затем разделитель и «История» в самом низу (перед «Аккаунтом»)
// «Кастомизация» — в самом низу меню, под разделителем, после «Истории» (решение владельца 2026-10-04: «в самый низ за черту»)
const BOTTOM_KEYS = ['customization'];
const sidebarPages = pages.filter((p) => !BOTTOM_KEYS.includes(p.key));
const bottomPages = BOTTOM_KEYS.map((k) => pages.find((p) => p.key === k)).filter((p) => !!p);
// BACKLOG 49.5 срез 2 «Меню новичка» (решение владельца 2026-10-29): первые 7 дней после регистрации в боковом меню — 6 главных пунктов и кнопка «Ещё»
// (открытая страница видна всегда); «Показать всё» на Дашборде (`dash_show_all`) или 7 дней — и меню полное. Дату регистрации кладёт в localStorage
// `account_created_at` бандл шапки (и сообщает событием `account-created-at`). Этот блок общий для всех AppShell.vue — менять ВМЕСТЕ (сверяет shellMenuNewbie.test.ts).
const NEWBIE_MENU_KEYS = ['dashboard', 'goals', 'skills', 'workouts', 'calendar', 'shop'];
function readCreatedAt() {
    try {
        return localStorage.getItem('account_created_at');
    }
    catch {
        return null;
    }
}
function readShowAll() {
    try {
        return localStorage.getItem('dash_show_all') === '1';
    }
    catch {
        return false;
    }
}
const createdAt = ref(readCreatedAt());
const syncCreatedAt = () => (createdAt.value = readCreatedAt());
const menuMore = ref(false);
const newbieMenu = computed(() => {
    const t0 = createdAt.value ? Date.parse(createdAt.value) : NaN;
    return Number.isFinite(t0) && t0 <= Date.now() + 3600_000 && Date.now() - t0 < 7 * 86400_000 && !readShowAll();
});
const shownSidebarPages = computed(() => (newbieMenu.value && !menuMore.value ? sidebarPages.filter((p) => NEWBIE_MENU_KEYS.includes(p.key) || p.key === active) : sidebarPages));
const hiddenMenuCount = computed(() => sidebarPages.length - shownSidebarPages.value.length);
onMounted(() => window.addEventListener('account-created-at', syncCreatedAt));
onUnmounted(() => window.removeEventListener('account-created-at', syncCreatedAt));
const quickPages = computed(() => pages.filter((p) => p.key !== 'dashboard' && favorites.value.includes(p.key)));
onMounted(() => window.addEventListener('favorites:changed', syncFavorites));
onUnmounted(() => window.removeEventListener('favorites:changed', syncFavorites));
// BACKLOG «При активном всплывающем окне нельзя вызывать левую и правую шторки»: пока на странице есть окно (свои — `.modal-backdrop`, окно
// выхода — `.logout-backdrop`, окна глобальной шапки — `.gh-backdrop`), шторки не открываются ни свайпом, ни кнопкой. Закрытие уже открытой
// шторки это не затрагивает. Селектор общий с `web-header/src/lib/edgeSwipe.ts` (правая шторка) — менять в обоих местах.
const MODAL_SELECTOR = '.modal-backdrop, .gh-backdrop, .logout-backdrop, .fixed.inset-0.z-50';
function isModalOpen() {
    return document.querySelector(MODAL_SELECTOR) !== null;
}
function openSidebar() {
    if (isModalOpen())
        return;
    sidebarOpen.value = true;
}
function closeSidebar() {
    sidebarOpen.value = false;
}
// Пока боковое меню открыто, страница под ним не прокручивается (BACKLOG 23:01). Блокировку делят левая шторка (здесь) и правая
// панель из бандла /header-widgets/: у каждой свой атрибут на <html>, прокрутка возвращается, когда сняты оба.
function applyScrollLock(side, on) {
    const root = document.documentElement;
    if (on)
        root.setAttribute('data-lock-' + side, '');
    else
        root.removeAttribute('data-lock-' + side);
    root.style.overflow = root.hasAttribute('data-lock-left') || root.hasAttribute('data-lock-right') ? 'hidden' : '';
}
watch(sidebarOpen, (open) => applyScrollLock('left', open));
onUnmounted(() => applyScrollLock('left', false));
const changelogOpen = ref(false);
const logoutConfirmOpen = ref(false); // «Точно выйти?» (BACKLOG 18)
const version = ref('');
onMounted(async () => {
    try {
        version.value = (await loadVersionInfo()).version;
    }
    catch {
        /* сайдбар остаётся без номера версии — не критично */
    }
});
const themeVal = ref(getTheme());
function onThemeChange(e) {
    const v = e.target.value;
    themeVal.value = v;
    setTheme(v);
}
// Список тем — только любимые (отмечаются в «Кастомизации», максимум 4); активная тема остаётся в списке всегда.
const favTick = ref(0);
const themeOptions = computed(() => {
    void favTick.value;
    return visibleThemes(themeVal.value);
});
const syncFavThemes = () => favTick.value++;
onMounted(() => {
    window.addEventListener(FAVORITE_THEMES_EVENT, syncFavThemes);
    window.addEventListener(UNLOCKED_THEMES_EVENT, syncFavThemes);
});
onUnmounted(() => {
    window.removeEventListener(FAVORITE_THEMES_EVENT, syncFavThemes);
    window.removeEventListener(UNLOCKED_THEMES_EVENT, syncFavThemes);
});
const lang = getLang();
// Свайп открытия/закрытия — тот же порог и та же "центральная зона" для открытия,
// что и в config.js (setupSidebarSwipe), только состояние живёт в ref, а не в classList.
let startX = 0;
let startY = 0;
let tracking = false;
let mode = null;
const SWIPE_THRESHOLD = 70;
const MAX_VERTICAL_DRIFT = 60;
const CENTER_ZONE_MIN = 0.15;
const CENTER_ZONE_MAX = 0.85;
function onTouchStart(e) {
    const touch = e.touches[0];
    if (sidebarOpen.value) {
        mode = 'close';
        startX = touch.clientX;
        startY = touch.clientY;
        tracking = true;
        return;
    }
    const target = e.target;
    if (target.closest('.no-edge-swipe') || isModalOpen()) {
        tracking = false;
        return;
    }
    const w = window.innerWidth;
    if (touch.clientX < w * CENTER_ZONE_MIN || touch.clientX > w * CENTER_ZONE_MAX) {
        tracking = false;
        return;
    }
    mode = 'open';
    startX = touch.clientX;
    startY = touch.clientY;
    tracking = true;
}
function onTouchMove(e) {
    if (!tracking)
        return;
    const touch = e.touches[0];
    const dx = touch.clientX - startX;
    const dy = Math.abs(touch.clientY - startY);
    if (dy > MAX_VERTICAL_DRIFT) {
        tracking = false;
        return;
    }
    if (mode === 'open' && dx > SWIPE_THRESHOLD) {
        sidebarOpen.value = true;
        tracking = false;
    }
    else if (mode === 'close' && dx < -SWIPE_THRESHOLD) {
        sidebarOpen.value = false;
        tracking = false;
    }
}
function onTouchEnd() {
    tracking = false;
}
// Esc закрывает быстрые ссылки в верхней панели (доступность: кнопка-раскрывашка с aria-expanded).
function onKeydown(e) {
    if (e.key === 'Escape')
        quickNavOpen.value = false;
}
onMounted(() => {
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('keydown', onKeydown);
});
onUnmounted(() => {
    document.removeEventListener('touchstart', onTouchStart);
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);
    document.removeEventListener('keydown', onKeydown);
});
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
void __VLS_ctx, __VLS_components, __VLS_intrinsics, __VLS_directives;
const __VLS_template = () => {
    __VLS_withDotValue(isHome, {});
    __VLS_withDotValue(quickNavOpen, {});
    __VLS_withDotValue(active, {});
    __VLS_withDotValue(quickPages, {});
    __VLS_withDotValue(sidebarOpen, {});
    __VLS_withDotValue(menuMore, {});
    __VLS_withDotValue(lang, {});
    __VLS_withDotValue(THEME_KEYS, {});
    __VLS_withDotValue(showInSidebar, {});
    __VLS_withDotValue(logoutConfirmOpen, {});
    __VLS_withDotValue(changelogOpen, {});
    __VLS_withDotValue(installModalOpen, {});
    __VLS_withDotValue(tourOpen, {});
    __VLS_withDotValue(aboutOpen, {});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "sticky top-0 z-20 flex items-center gap-2 border-b px-4 py-2.5" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['sticky']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-20']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-b']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (openSidebar) },
        type: "button",
        ...{ class: "rounded-lg border px-3 py-1.5 text-lg leading-none" },
        ...{ style: {} },
        'aria-label': (__VLS_unwrap(t, {})('nav_open_menu')),
    });
    /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['leading-none']} */ ;
    const __VLS_0 = Icon;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        // @ts-ignore
        name: "menu",
    }));
    const __VLS_2 = __VLS_1({
        name: "menu",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
        href: "/dashboard/",
        ...{ class: "flex h-10 w-10 items-center justify-center rounded-lg" },
        title: (plainLabel('nav_dashboard')),
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-10']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-10']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
    const __VLS_5 = SplashFlameLive;
    // @ts-ignore
    const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
        // @ts-ignore
        size: (30), sparks: (false), dataTest: "brand-flame",
    }));
    const __VLS_7 = __VLS_6({
        size: (30),
        sparks: (false),
        dataTest: "brand-flame",
    }, ...__VLS_functionalComponentArgsRest(__VLS_6));
    if (isHome.value) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    void $event;
                    if (!(isHome.value))
                        throw 0;
                    return (quickNavOpen.value = !quickNavOpen.value);
                    // @ts-ignore
                    [t, isHome, quickNavOpen, quickNavOpen,];
                } },
            type: "button",
            ...{ class: "qn-toggle" },
            ...{ class: ({ 'qn-open': quickNavOpen.value }) },
            'aria-label': (__VLS_unwrap(t, {})('nav_favorites')),
            title: (__VLS_unwrap(t, {})('nav_favorites')),
            'aria-expanded': (quickNavOpen.value),
            'aria-controls': "quick-nav",
            'data-testid': "quicknav-toggle",
        });
        /** @type {__VLS_StyleScopedClasses['qn-toggle']} */ ;
        /** @type {__VLS_StyleScopedClasses['qn-open']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
            viewBox: "0 0 24 24",
            width: "20",
            height: "20",
            fill: "none",
            stroke: "currentColor",
            'stroke-width': "1.9",
            'stroke-linejoin': "round",
            'aria-hidden': "true",
            'data-test': "qn-heart",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
            d: "M12 20.4l-1.3-1.2C6 14.9 3 12.2 3 8.9 3 6.3 5 4.3 7.6 4.3c1.5 0 2.9.7 3.8 1.8l.6.8.6-.8c.9-1.1 2.3-1.8 3.8-1.8C19 4.3 21 6.3 21 8.9c0 3.3-3 6-7.7 10.3L12 20.4z",
        });
        let __VLS_10;
        /** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
        Transition;
        // @ts-ignore
        const __VLS_11 = __VLS_asFunctionalComponent1(__VLS_10, new __VLS_10({
            // @ts-ignore
            name: "qn",
        }));
        const __VLS_12 = __VLS_11({
            name: "qn",
        }, ...__VLS_functionalComponentArgsRest(__VLS_11));
        var __VLS_13;
        const { default: __VLS_15 } = __VLS_nonNull(__VLS_13.slots);
        if (quickNavOpen.value) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                id: "quick-nav",
                ...{ class: "qn-list no-edge-swipe" },
                'data-testid': "quicknav-list",
            });
            /** @type {__VLS_StyleScopedClasses['qn-list']} */ ;
            /** @type {__VLS_StyleScopedClasses['no-edge-swipe']} */ ;
            const __VLS_16 = __VLS_tryAsConstant((quickPages.value));
            for (const [p] of __VLS_vFor(__VLS_nonNull(__VLS_16))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
                    key: (p.key),
                    href: (p.href),
                    ...{ class: "qn-chip" },
                    ...{ class: ({ 'qn-chip-active': p.key === active.value }) },
                });
                /** @type {__VLS_StyleScopedClasses['qn-chip']} */ ;
                /** @type {__VLS_StyleScopedClasses['qn-chip-active']} */ ;
                const __VLS_17 = Icon;
                // @ts-ignore
                const __VLS_18 = __VLS_asFunctionalComponent1(__VLS_17, new __VLS_17({
                    // @ts-ignore
                    name: (p.icon),
                }));
                const __VLS_19 = __VLS_18({
                    name: (p.icon),
                }, ...__VLS_functionalComponentArgsRest(__VLS_18));
                (plainLabel(p.labelKey));
                // @ts-ignore
                [t, t, quickNavOpen, quickNavOpen, quickNavOpen, quickPages, active,];
            }
            if (!quickPages.value.length) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "qn-empty" },
                    'data-testid': "quicknav-empty",
                });
                /** @type {__VLS_StyleScopedClasses['qn-empty']} */ ;
                (__VLS_unwrap(t, {})('nav_favorites_empty'));
            }
        }
        // @ts-ignore
        [t, quickPages,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "ml-auto flex items-center gap-1.5" },
        id: "topbar-right",
    });
    /** @type {__VLS_StyleScopedClasses['ml-auto']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-1.5']} */ ;
    const __VLS_22 = PageHint;
    // @ts-ignore
    const __VLS_23 = __VLS_asFunctionalComponent1(__VLS_22, new __VLS_22({
        // @ts-ignore
        page: "calendar", suppress: (tourOpen.value),
    }));
    const __VLS_24 = __VLS_23({
        page: "calendar",
        suppress: (tourOpen.value),
    }, ...__VLS_functionalComponentArgsRest(__VLS_23));
    if (sidebarOpen.value) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (closeSidebar) },
            ...{ onTouchmove: () => { } },
            ...{ class: "fixed inset-0 z-[29] bg-black/50" },
            ...{ style: {} },
            'data-testid': "sidebar-overlay",
        });
        /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
        /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['z-[29]']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-black/50']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.nav, __VLS_intrinsics.nav)({
        ...{ class: "fixed inset-y-0 left-0 z-30 flex w-72 max-w-[85vw] flex-col gap-1 overflow-y-auto border-r p-4 [&>*]:shrink-0 transition-transform duration-200" },
        ...{ class: (sidebarOpen.value ? 'translate-x-0' : '-translate-x-full') },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-y-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['left-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-30']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-72']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-[85vw]']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-r']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['[&>*]:shrink-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition-transform']} */ ;
    /** @type {__VLS_StyleScopedClasses['duration-200']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        id: "sidebar-top",
    });
    const __VLS_27 = __VLS_tryAsConstant((__VLS_unwrap(shownSidebarPages, {})));
    for (const [p] of __VLS_vFor(__VLS_nonNull(__VLS_27))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
            ...{ onClick: (closeSidebar) },
            key: (p.key),
            href: (p.href),
            ...{ class: "flex items-center gap-2.5 rounded-lg px-3 py-2.5" },
            ...{ style: ({ background: p.key === active.value ? 'var(--accent)' : 'transparent', color: p.key === active.value ? 'var(--accent-text)' : 'var(--text)' }) },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-2.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
        const __VLS_28 = Icon;
        // @ts-ignore
        const __VLS_29 = __VLS_asFunctionalComponent1(__VLS_28, new __VLS_28({
            // @ts-ignore
            name: (p.icon),
        }));
        const __VLS_30 = __VLS_29({
            name: (p.icon),
        }, ...__VLS_functionalComponentArgsRest(__VLS_29));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (plainLabel(p.labelKey));
        // @ts-ignore
        [active, active, tourOpen, sidebarOpen, sidebarOpen, shownSidebarPages,];
    }
    if (__VLS_unwrap(hiddenMenuCount, {}) > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    void $event;
                    if (!(__VLS_unwrap(hiddenMenuCount, {}) > 0))
                        throw 0;
                    return (menuMore.value = true);
                    // @ts-ignore
                    [hiddenMenuCount, menuMore,];
                } },
            type: "button",
            ...{ class: "secondary flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left" },
            'data-testid': "menu-more",
        });
        /** @type {__VLS_StyleScopedClasses['secondary']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-2.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-left']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (__VLS_unwrap(t, {})('nav_more_menu'));
        (__VLS_unwrap(hiddenMenuCount, {}));
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "my-1 border-t" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['my-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-t']} */ ;
    const __VLS_33 = __VLS_tryAsConstant((__VLS_unwrap(bottomPages, {})));
    for (const [p] of __VLS_vFor(__VLS_nonNull(__VLS_33))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
            ...{ onClick: (closeSidebar) },
            key: (p.key),
            href: (p.href),
            ...{ class: "flex items-center gap-2.5 rounded-lg px-3 py-2.5" },
            ...{ style: ({ background: p.key === active.value ? 'var(--accent)' : 'transparent', color: p.key === active.value ? 'var(--accent-text)' : 'var(--text)' }) },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-2.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
        const __VLS_34 = Icon;
        // @ts-ignore
        const __VLS_35 = __VLS_asFunctionalComponent1(__VLS_34, new __VLS_34({
            // @ts-ignore
            name: (p.icon),
        }));
        const __VLS_36 = __VLS_35({
            name: (p.icon),
        }, ...__VLS_functionalComponentArgsRest(__VLS_35));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (plainLabel(p.labelKey));
        // @ts-ignore
        [t, active, active, hiddenMenuCount, bottomPages,];
    }
    if (props.userEmail) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
            ...{ onClick: (closeSidebar) },
            href: "/account/",
            ...{ class: "flex items-center gap-2.5 rounded-lg px-3 py-2.5" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-2.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
        const __VLS_39 = Icon;
        // @ts-ignore
        const __VLS_40 = __VLS_asFunctionalComponent1(__VLS_39, new __VLS_39({
            // @ts-ignore
            name: "user",
        }));
        const __VLS_41 = __VLS_40({
            name: "user",
        }, ...__VLS_functionalComponentArgsRest(__VLS_40));
        (__VLS_unwrap(t, {})('nav_account_title'));
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "my-2 border-t" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['my-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-t']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex gap-1 px-1" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
    const __VLS_44 = __VLS_tryAsConstant(['en', 'ru']);
    for (const [l] of __VLS_vFor(__VLS_nonNull(__VLS_44))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    void $event;
                    return (__VLS_unwrap(setLang, {})(l));
                    // @ts-ignore
                    [t, setLang,];
                } },
            key: (l),
            type: "button",
            ...{ class: "flex-1 rounded-lg border py-1.5 text-sm" },
            ...{ style: ({
                    borderColor: 'var(--border)',
                    background: lang.value === l ? 'var(--accent)' : 'transparent',
                    color: lang.value === l ? 'var(--accent-text)' : 'var(--text)',
                }) },
        });
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        (l.toUpperCase());
        // @ts-ignore
        [lang, lang,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
        ...{ onChange: (onThemeChange) },
        ...{ class: "mx-1 mt-2 rounded-lg border px-2 py-1.5 text-sm" },
        ...{ style: {} },
        value: (__VLS_unwrap(themeVal, {})),
        'aria-label': (__VLS_unwrap(t, {})('theme_select_aria')),
    });
    /** @type {__VLS_StyleScopedClasses['mx-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    const __VLS_45 = __VLS_tryAsConstant((__VLS_unwrap(themeOptions, {})));
    for (const [key] of __VLS_vFor(__VLS_nonNull(__VLS_45))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            key: (key),
            value: (key),
        });
        (__VLS_unwrap(t, {})(THEME_KEYS.value[key]));
        // @ts-ignore
        [t, t, themeVal, themeOptions, THEME_KEYS,];
    }
    if (showInSidebar.value) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (openInstall) },
            type: "button",
            ...{ class: "mt-2 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm" },
            ...{ style: {} },
            'data-test': "nav-install",
        });
        /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-2.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-left']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        const __VLS_46 = Icon;
        // @ts-ignore
        const __VLS_47 = __VLS_asFunctionalComponent1(__VLS_46, new __VLS_46({
            // @ts-ignore
            name: "download",
        }));
        const __VLS_48 = __VLS_47({
            name: "download",
        }, ...__VLS_functionalComponentArgsRest(__VLS_47));
        (__VLS_unwrap(t, {})('nav_install_app'));
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (openTour) },
        type: "button",
        ...{ class: "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm" },
        ...{ style: {} },
        'data-test': "nav-tour",
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-2.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-left']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    const __VLS_51 = Icon;
    // @ts-ignore
    const __VLS_52 = __VLS_asFunctionalComponent1(__VLS_51, new __VLS_51({
        // @ts-ignore
        name: "help",
    }));
    const __VLS_53 = __VLS_52({
        name: "help",
    }, ...__VLS_functionalComponentArgsRest(__VLS_52));
    (__VLS_unwrap(t, {})('nav_tour'));
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (openAbout) },
        type: "button",
        ...{ class: "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm" },
        ...{ style: {} },
        'data-test': "nav-about",
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-2.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-left']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    const __VLS_56 = Icon;
    // @ts-ignore
    const __VLS_57 = __VLS_asFunctionalComponent1(__VLS_56, new __VLS_56({
        // @ts-ignore
        name: "info",
    }));
    const __VLS_58 = __VLS_57({
        name: "info",
    }, ...__VLS_functionalComponentArgsRest(__VLS_57));
    (__VLS_unwrap(t, {})('nav_about'));
    if (props.userEmail) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    void $event;
                    if (!(props.userEmail))
                        throw 0;
                    return (logoutConfirmOpen.value = true);
                    // @ts-ignore
                    [t, t, t, showInSidebar, logoutConfirmOpen,];
                } },
            type: "button",
            ...{ class: "mt-2 truncate rounded-lg border px-3 py-2 text-left text-sm" },
            ...{ style: {} },
            'data-test': "logout-btn",
        });
        /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-left']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        (__VLS_unwrap(t, {})('logout'));
        (props.userEmail);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                void $event;
                return (changelogOpen.value = true);
                // @ts-ignore
                [t, changelogOpen,];
            } },
        type: "button",
        ...{ class: "mt-2 rounded-lg px-3 py-1.5 text-center text-xs" },
        ...{ style: {} },
        'data-test': "version-btn",
    });
    /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (__VLS_unwrap(version, {}));
    if (changelogOpen.value) {
        const __VLS_61 = ChangelogModal;
        // @ts-ignore
        const __VLS_62 = __VLS_asFunctionalComponent1(__VLS_61, new __VLS_61({
            // @ts-ignore
            ...{ 'onClose': {} },
        }));
        const __VLS_63 = __VLS_62({
            ...{ 'onClose': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_62));
        let __VLS_66;
        const __VLS_67 = {
            /** @type {typeof __VLS_66.close} */
            onClose: (...[$event]) => {
                void $event;
                if (!(changelogOpen.value))
                    throw 0;
                return (changelogOpen.value = false);
                // @ts-ignore
                [changelogOpen, changelogOpen, version,];
            },
        };
        void __VLS_67;
        var __VLS_64;
        var __VLS_65;
    }
    if (installModalOpen.value) {
        const __VLS_68 = InstallModal;
        // @ts-ignore
        const __VLS_69 = __VLS_asFunctionalComponent1(__VLS_68, new __VLS_68({
            // @ts-ignore
            ...{ 'onClose': {} },
        }));
        const __VLS_70 = __VLS_69({
            ...{ 'onClose': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_69));
        let __VLS_73;
        const __VLS_74 = {
            /** @type {typeof __VLS_73.close} */
            onClose: (...[$event]) => {
                void $event;
                if (!(installModalOpen.value))
                    throw 0;
                return (installModalOpen.value = false);
                // @ts-ignore
                [installModalOpen, installModalOpen,];
            },
        };
        void __VLS_74;
        var __VLS_71;
        var __VLS_72;
    }
    if (tourOpen.value) {
        const __VLS_75 = WelcomeTourModal;
        // @ts-ignore
        const __VLS_76 = __VLS_asFunctionalComponent1(__VLS_75, new __VLS_75({
            // @ts-ignore
            ...{ 'onClose': {} },
        }));
        const __VLS_77 = __VLS_76({
            ...{ 'onClose': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_76));
        let __VLS_80;
        const __VLS_81 = {
            /** @type {typeof __VLS_80.close} */
            onClose: (...[$event]) => {
                void $event;
                if (!(tourOpen.value))
                    throw 0;
                return (tourOpen.value = false);
                // @ts-ignore
                [tourOpen, tourOpen,];
            },
        };
        void __VLS_81;
        var __VLS_78;
        var __VLS_79;
    }
    if (aboutOpen.value) {
        const __VLS_82 = AboutModal;
        // @ts-ignore
        const __VLS_83 = __VLS_asFunctionalComponent1(__VLS_82, new __VLS_82({
            // @ts-ignore
            ...{ 'onClose': {} },
        }));
        const __VLS_84 = __VLS_83({
            ...{ 'onClose': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_83));
        let __VLS_87;
        const __VLS_88 = {
            /** @type {typeof __VLS_87.close} */
            onClose: (...[$event]) => {
                void $event;
                if (!(aboutOpen.value))
                    throw 0;
                return (aboutOpen.value = false);
                // @ts-ignore
                [aboutOpen, aboutOpen,];
            },
        };
        void __VLS_88;
        var __VLS_85;
        var __VLS_86;
    }
    if (logoutConfirmOpen.value) {
        const __VLS_89 = ConfirmLogoutModal;
        // @ts-ignore
        const __VLS_90 = __VLS_asFunctionalComponent1(__VLS_89, new __VLS_89({
            // @ts-ignore
            ...{ 'onConfirm': {} }, ...{ 'onCancel': {} },
        }));
        const __VLS_91 = __VLS_90({
            ...{ 'onConfirm': {} },
            ...{ 'onCancel': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_90));
        let __VLS_94;
        const __VLS_95 = {
            /** @type {typeof __VLS_94.confirm} */
            onConfirm: (__VLS_unwrap(logout, {})),
        };
        void __VLS_95;
        const __VLS_96 = {
            /** @type {typeof __VLS_94.cancel} */
            onCancel: (...[$event]) => {
                void $event;
                if (!(logoutConfirmOpen.value))
                    throw 0;
                return (logoutConfirmOpen.value = false);
                // @ts-ignore
                [logoutConfirmOpen, logoutConfirmOpen, logout,];
            },
        };
        void __VLS_96;
        var __VLS_92;
        var __VLS_93;
    }
    // @ts-ignore
    [];
    return {};
};
void [__VLS_template];
const __VLS_export = (await import('vue')).defineComponent({
    __typeProps: {},
});
export default {};
