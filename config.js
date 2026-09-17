// ==== НАСТРОЙ ЭТИ ДВЕ СТРОКИ ПОСЛЕ СОЗДАНИЯ ПРОЕКТА В SUPABASE ====
const SUPABASE_URL = "https://haxmgtflegsfpxieaydv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_jvg_Y0JtOC66Edj1WbAgqg_n0LfjWAF";
// ===================================================================

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SITE_VERSION = "0.19";

// ==== История обновлений — короткая заметка на каждую версию, показывается по клику
// на номер версии в сайдбаре. Добавлять новую запись сверху на RU и EN при каждом бампе версии. ====
const CHANGELOG_RU = [
    { version: "0.19", date: "2026-09-17", changes: [
        "Верхняя навигация больше не сворачивается — все иконки разделов сразу видны, переносятся на вторую строку при нехватке места вместо скролла",
        "Почистили README в репозитории и убрали служебный файл для переноса контекста между чатами",
    ]},
    { version: "0.18", date: "2026-09-17", changes: [
        "Кнопка быстрой навигации теперь «»»» вместо многоточия",
        "Полный проход по переводу сайта: переключатель темы, сообщения входа/регистрации, единица веса по умолчанию в тренировках — теперь на двух языках",
        "История обновлений в сайдбаре тоже переведена на английский",
    ]},
    { version: "0.17", date: "2026-09-17", changes: [
        "Верхняя навигация переделана: в строке остался только домик, остальные разделы — в выезжающей вправо панели по кнопке »»»",
    ]},
    { version: "0.16", date: "2026-09-17", changes: [
        "Иконка ⚙️ вместо кнопки «Настроить дашборд» — просто рядом с заголовком, без фона",
        "Смена email в разделе «Аккаунт»",
        "Быстрая навигация эмодзи-иконками в верхней строке (🏠 — на главную, крупнее остальных)",
        "История обновлений по клику на номер версии в сайдбаре",
    ]},
];
const CHANGELOG_EN = [
    { version: "0.19", date: "2026-09-17", changes: [
        "Top navigation no longer collapses — all section icons are visible right away, wrapping to a second line instead of scrolling when space is tight",
        "Cleaned up the repo README and removed the internal chat-handoff file",
    ]},
    { version: "0.18", date: "2026-09-17", changes: [
        "Quick-nav toggle button is now \"»»»\" instead of an ellipsis",
        "Full pass on site translation: theme switcher, login/signup messages, default weight unit in workouts — now bilingual",
        "The sidebar's update history is now translated into English too",
    ]},
    { version: "0.17", date: "2026-09-17", changes: [
        "Top navigation redesigned: only the home icon stays in the bar, the other sections slide out in a panel via the »»» button",
    ]},
    { version: "0.16", date: "2026-09-17", changes: [
        "⚙️ icon instead of the \"Customize dashboard\" button — sits plainly next to the title, no background",
        "Email change added to the Account section",
        "Quick emoji navigation in the top bar (🏠 — home, larger than the rest)",
        "Update history available by clicking the version number in the sidebar",
    ]},
];
const CHANGELOG = getLang() === "en" ? CHANGELOG_EN : CHANGELOG_RU;

// Возвращает текущую сессию или null
async function getSession() {
    const { data } = await sb.auth.getSession();
    return data.session;
}

// Для защищённых страниц (дашборд/цели/навыки/магазин):
// если не залогинен — уводит на login.html
async function requireAuth() {
    const session = await getSession();
    if (!session) {
        window.location.href = "login.html";
        return null;
    }
    return session.user;
}

async function logout() {
    await sb.auth.signOut();
    window.location.href = "index.html";
}

function fmtDate(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

// DD.MM — для подписей на графиках, из строки "YYYY-MM-DD"
function fmtChartLabel(isoDateStr) {
    const parts = isoDateStr.split("-");
    return `${parts[2]}.${parts[1]}`;
}

// DD.MM.YYYY — для отображения дат (выполнено/куплено и т.д.)
function fmtRu(isoDateStr) {
    if (!isoDateStr) return "";
    const parts = isoDateStr.split("-");
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function todayStr() {
    return fmtDate(new Date());
}

// ---- Баллы ----

// Числовое значение метрики независимо от формата хранения — обычное число, или сумма
// reps по всем подходам (для типа "sets"). Совпадает по смыслу с SQL-функцией
// metric_numeric_value() в migrations/018 — держать логику одинаковой на клиенте и сервере.
function metricNumericValue(metric, value) {
    if (value == null) return null;
    if (metric.type === "sets" && Array.isArray(value)) {
        return value.reduce((sum, s) => sum + (s?.reps || 0), 0);
    }
    return typeof value === "number" ? value : null;
}

function isMetricDone(metric, value) {
    if (value === null || value === undefined) return false;
    if (metric.type === "boolean") return value === true;
    if (metric.type === "multiselect") return Array.isArray(value) && value.length > 0;
    if (metric.type === "number" || metric.type === "sets") {
        const numeric = metricNumericValue(metric, value);
        if (numeric == null) return false;
        const goal = metric.goal_value ?? 0;
        if (metric.goal_direction === "at_most") return numeric > 0 && numeric < goal;
        return numeric >= goal;
    }
    return false;
}

async function calcDailyPoints(userId, dateStr, metrics) {
    const { data: values } = await sb.from("daily_values").select("*").eq("user_id", userId).eq("date", dateStr);
    const byMetric = {};
    (values || []).forEach(v => byMetric[v.metric_id] = v.value);
    let points = 0;
    for (const m of metrics) {
        if (isMetricDone(m, byMetric[m.id])) points++;
    }
    return points;
}

async function calcTotalPoints(userId) {
    const { data: metrics } = await sb.from("metrics").select("*").eq("user_id", userId).eq("active", true);
    const { data: allValues } = await sb.from("daily_values").select("*").eq("user_id", userId);

    const byDay = {};
    (allValues || []).forEach(v => {
        byDay[v.date] = byDay[v.date] || {};
        byDay[v.date][v.metric_id] = v.value;
    });

    let dailyPoints = 0;
    for (const dateStr of Object.keys(byDay)) {
        for (const m of (metrics || [])) {
            if (isMetricDone(m, byDay[dateStr][m.id])) dailyPoints++;
        }
    }

    const { data: goals } = await sb.from("goals").select("*").eq("user_id", userId).eq("done", true);
    const goalPoints = (goals || []).reduce((sum, g) => sum + (g.points ?? 5), 0);

    const { data: skills } = await sb.from("skills").select("*").eq("user_id", userId).eq("mastered", true);
    const skillPoints = (skills || []).reduce((sum, s) => sum + (s.points ?? 10), 0);

    const { data: books } = await sb.from("books").select("*").eq("user_id", userId).eq("status", "done");
    const bookPoints = (books || []).reduce((sum, b) => sum + (b.points ?? 10), 0);

    return dailyPoints + goalPoints + skillPoints + bookPoints;
}

async function calcBalance(userId) {
    const total = await calcTotalPoints(userId);
    const { data: items } = await sb.from("shop_items").select("*").eq("user_id", userId).eq("redeemed", true);
    const spent = (items || []).reduce((sum, i) => sum + (i.cost ?? 0), 0);
    return { total, spent, balance: total - spent };
}

// ---- Навигация ----

function makeAvatarEl(url, size = 32) {
    if (url) {
        const img = document.createElement("img");
        img.src = url;
        img.style.cssText = `width:${size}px; height:${size}px; border-radius:50%; object-fit:cover; border:1px solid var(--border);`;
        return img;
    }
    const div = document.createElement("div");
    div.textContent = "👤";
    div.style.cssText = `width:${size}px; height:${size}px; border-radius:50%; background:var(--bg); border:1px solid var(--border); display:flex; align-items:center; justify-content:center; font-size:${size * 0.55}px;`;
    return div;
}

async function requireOnboarded(userId) {
    const { data: profile } = await sb.from("profiles").select("onboarded").eq("user_id", userId).maybeSingle();
    if (!profile?.onboarded) { window.location.href = "onboarding.html"; return false; }
    return true;
}

function showToast(message, type = "success") {
    document.querySelectorAll(".toast").forEach(el => el.remove());
    const toast = document.createElement("div");
    toast.className = "toast toast-" + type;
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("toast-show"));
    setTimeout(() => {
        toast.classList.remove("toast-show");
        setTimeout(() => toast.remove(), 300);
    }, 2200);
}

function showToast(message, type = "success") {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        container.className = "toast-container";
        document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    toast.className = "toast toast-" + type;
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("show"));
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 2200);
}

// Готовит точки для графика: заполняет пропущенные дни (null), и если точек много —
// укрупняет (берёт представительное значение из "корзины" дней), чтобы график не превращался
// в нечитаемую кашу на длинных периодах.
function prepareChartSeries(rawPoints, maxPoints = 24) {
    if (!rawPoints || rawPoints.length === 0) return [];
    const sorted = [...rawPoints].sort((a, b) => a.date.localeCompare(b.date));
    if (sorted.length === 1) return sorted;

    const dayMs = 86400000;
    const first = new Date(sorted[0].date + "T00:00:00");
    const last = new Date(sorted[sorted.length - 1].date + "T00:00:00");
    const totalDays = Math.round((last - first) / dayMs) + 1;

    const byDate = {};
    sorted.forEach(p => byDate[p.date] = p.y);

    let full = [];
    for (let i = 0; i < totalDays; i++) {
        const d = new Date(first.getTime() + i * dayMs);
        const key = fmtDate(d);
        full.push({ date: key, y: key in byDate ? byDate[key] : null });
    }

    if (full.length <= maxPoints) return full;

    // укрупняем: делим на корзины по несколько дней, берём последнее известное значение в корзине
    const bucketSize = Math.ceil(full.length / maxPoints);
    const bucketed = [];
    for (let i = 0; i < full.length; i += bucketSize) {
        const chunk = full.slice(i, i + bucketSize);
        const withValue = chunk.filter(p => p.y != null);
        const y = withValue.length ? withValue[withValue.length - 1].y : null;
        bucketed.push({ date: chunk[chunk.length - 1].date, y, bucketDays: chunk.length });
    }
    return bucketed;
}

function svgLineChart(points, opts = {}) {
    const w = opts.width || 620, h = opts.height || 160, pad = 34;
    const withValues = points.filter(p => p.y != null);
    if (withValues.length < 2) return null;

    const values = withValues.map(p => p.y);
    if (opts.goalValue != null) values.push(opts.goalValue); // расширяем диапазон, чтобы линия-ориентир была видна на графике
    let min = Math.min(...values), max = Math.max(...values);
    if (min === max) { min -= 1; max += 1; }
    const range = max - min;
    const stepX = (w - pad * 2) / (points.length - 1);

    const coords = points.map((p, i) => ({
        x: pad + i * stepX,
        y: p.y != null ? h - pad - ((p.y - min) / range) * (h - pad * 2) : null,
        label: p.date ? fmtChartLabel(p.date) : p.x,
        value: p.y
    }));

    let svg = `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}">`;
    const color = opts.color || "var(--accent)";

    // Линия-ориентир (например, норма калорий/цель по весу) — рисуем первой, под графиком
    if (opts.goalValue != null) {
        const gy = h - pad - ((opts.goalValue - min) / range) * (h - pad * 2);
        svg += `<line x1="${pad}" y1="${gy.toFixed(1)}" x2="${(w - pad).toFixed(1)}" y2="${gy.toFixed(1)}" stroke="var(--text-dim)" stroke-width="1.5" stroke-dasharray="5,4" opacity="0.85" />`;
        const goalText = opts.goalLabel || `${opts.goalValue}${opts.unit || ''}`;
        const goalTextY = gy < pad + 10 ? gy + 12 : gy - 5;
        svg += `<text x="${(w - pad).toFixed(1)}" y="${goalTextY.toFixed(1)}" font-size="10" fill="var(--text-dim)" text-anchor="end">${goalText}</text>`;
    }

    let lastReal = null, gapBetween = false;
    for (let i = 0; i < coords.length; i++) {
        const c = coords[i];
        if (c.y == null) { if (lastReal) gapBetween = true; continue; }
        if (lastReal) {
            const dash = gapBetween ? ` stroke-dasharray="5,4"` : "";
            svg += `<line x1="${lastReal.x.toFixed(1)}" y1="${lastReal.y.toFixed(1)}" x2="${c.x.toFixed(1)}" y2="${c.y.toFixed(1)}" stroke="${color}" stroke-width="2.5"${dash} opacity="${gapBetween ? 0.55 : 1}" />`;
        }
        lastReal = c;
        gapBetween = false;
    }

    const labelEvery = Math.max(1, Math.ceil(coords.filter(c => c.y != null).length / 12));
    let shown = 0;
    for (const c of coords) {
        if (c.y == null) continue;
        svg += `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="4" fill="${color}" />`;
        if (shown % labelEvery === 0) {
            svg += `<text x="${c.x.toFixed(1)}" y="${(c.y - 10).toFixed(1)}" font-size="11" fill="var(--text)" text-anchor="middle">${c.value}${opts.unit || ''}</text>`;
            svg += `<text x="${c.x.toFixed(1)}" y="${h - 8}" font-size="10" fill="var(--text-dim)" text-anchor="middle">${c.label}</text>`;
        }
        shown++;
    }
    svg += `</svg>`;
    return svg;
}

function renderChartBlock(container, title, points, opts) {
    if (title) {
        const h4 = document.createElement("h4");
        h4.textContent = title;
        h4.style.marginBottom = "6px";
        container.appendChild(h4);
    }
    const prepared = prepareChartSeries(points);
    const svg = svgLineChart(prepared, opts);
    if (svg) {
        const wrap = document.createElement("div");
        wrap.innerHTML = svg;
        container.appendChild(wrap);
        const withValues = prepared.filter(p => p.y != null);
        if (withValues.length < prepared.length) {
            const hint = document.createElement("p");
            hint.className = "dim";
            hint.style.cssText = "font-size:0.75em; margin:2px 0 0;";
            hint.textContent = t("chart_dashed_hint");
            container.appendChild(hint);
        }
    } else {
        const withValues = points.filter(p => p.y != null);
        const last = withValues.length ? `${t("chart_last_value")} ${withValues[withValues.length - 1].y}${opts.unit || ''}` : t("chart_no_data");
        const p = document.createElement("p");
        p.className = "dim";
        p.textContent = `${t("chart_not_enough_data")} ${last}`;
        container.appendChild(p);
    }
}

// возвращает [from, to] в формате "YYYY-MM-DD" (локальные даты) для периода
// customFrom/customTo — используются только когда rangeKey === "custom" (свой период)
function periodBounds(rangeKey, customFrom, customTo) {
    const today = new Date();
    const dow = (today.getDay() + 6) % 7; // 0 = понедельник
    const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - dow);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    if (rangeKey === "days10") {
        const start = new Date(today); start.setDate(today.getDate() - 9); // 10 дней включая сегодня
        return [fmtDate(start), fmtDate(today)];
    }
    if (rangeKey === "week") return [fmtDate(startOfWeek), fmtDate(today)];
    if (rangeKey === "last_week") {
        const startLastWeek = new Date(startOfWeek); startLastWeek.setDate(startOfWeek.getDate() - 7);
        const endLastWeek = new Date(startOfWeek); endLastWeek.setDate(startOfWeek.getDate() - 1);
        return [fmtDate(startLastWeek), fmtDate(endLastWeek)];
    }
    if (rangeKey === "month") return [fmtDate(startOfMonth), fmtDate(today)];
    if (rangeKey === "custom") return [customFrom || null, customTo || null];
    return [null, null]; // "all" — без ограничения
}

// Период графика запоминается в localStorage между сессиями (по умолчанию — последние 10 дней,
// чтобы графики с большой историей не выглядели нечитаемо густыми при каждом заходе).
function loadPeriodState(storageKey, fallback) {
    try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.range) return parsed;
        }
    } catch (e) { /* повреждённые данные в localStorage — просто используем дефолт */ }
    return fallback;
}
function savePeriodState(storageKey, state) {
    try { localStorage.setItem(storageKey, JSON.stringify({ range: state.range, from: state.from, to: state.to })); } catch (e) { /* localStorage недоступен — не критично */ }
}
// Оборачивает onChange/onApply, вызываемый из renderPeriodPicker/openPeriodModal, так чтобы
// каждое изменение периода сразу сохранялось — используется во всех местах с выбором периода.
function wrapPeriodPersist(storageKey, state, cb) {
    return () => { savePeriodState(storageKey, state); cb(); };
}

// рендерит панель выбора периода (пресеты + свой период с датами) и вызывает onChange(rangeKey, from, to)
// state — объект {range, from, to}, который вызывающий код хранит у себя и мутирует сюда же
function renderPeriodPicker(container, state, onChange) {
    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex; gap:6px; flex-wrap:wrap; align-items:center;";

    const presets = [["days10", t("period_10_days")], ["week", t("period_week")], ["last_week", t("period_last_week")], ["month", t("period_month")], ["all", t("period_all")]];
    presets.forEach(([key, label]) => {
        const btn = document.createElement("button");
        btn.className = state.range === key ? "" : "secondary";
        btn.textContent = label;
        btn.onclick = () => { state.range = key; onChange(); };
        wrap.appendChild(btn);
    });

    // "Свой период" — не инлайновые поля дат (они сжимались в кашу на телефоне),
    // а модалка, как и все остальные формы в приложении. Заодно кнопка сама
    // показывает уже выбранный диапазон, если он есть.
    const customBtn = document.createElement("button");
    customBtn.className = state.range === "custom" ? "" : "secondary";
    customBtn.textContent = (state.range === "custom" && state.from)
        ? `📅 ${fmtRu(state.from)} – ${state.to ? fmtRu(state.to) : "…"}`
        : t("period_custom");
    customBtn.onclick = () => openCustomPeriodModal(state, onChange);
    wrap.appendChild(customBtn);

    container.appendChild(wrap);
}

// Модалка выбора периода целиком (пресеты + свой диапазон) — для мест, где период
// не встроен в более крупную форму настройки (см. также openChartsConfigModal в
// dashboard.js, где период встроен прямо в модалку настройки графиков).
function openPeriodModal(title, state, onApply) {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `<h3>${title}</h3>`;

    let local = { ...state };
    const pickerRow = document.createElement("div");
    function renderRow() {
        pickerRow.innerHTML = "";
        renderPeriodPicker(pickerRow, local, renderRow);
    }
    renderRow();
    modal.appendChild(pickerRow);

    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "secondary";
    cancelBtn.textContent = t("cancel");
    cancelBtn.onclick = () => backdrop.remove();
    const okBtn = document.createElement("button");
    okBtn.textContent = t("save");
    okBtn.onclick = () => {
        Object.assign(state, local);
        backdrop.remove();
        onApply();
    };
    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);
    modal.appendChild(actions);

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
}

function openCustomPeriodModal(state, onChange) {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `<h3>${t("period_custom")}</h3>`;

    const fromLabel = document.createElement("label");
    fromLabel.style.cssText = "display:block; margin-bottom:14px;";
    fromLabel.textContent = t("period_from");
    const fromInput = document.createElement("input");
    fromInput.type = "date";
    fromInput.style.cssText = "width:100%; margin-top:4px;";
    fromInput.value = state.from || "";
    fromInput.max = todayStr();
    fromLabel.appendChild(fromInput);
    modal.appendChild(fromLabel);

    const toLabel = document.createElement("label");
    toLabel.style.cssText = "display:block; margin-bottom:14px;";
    toLabel.textContent = t("period_to");
    const toInput = document.createElement("input");
    toInput.type = "date";
    toInput.style.cssText = "width:100%; margin-top:4px;";
    toInput.value = state.to || "";
    toInput.max = todayStr();
    toLabel.appendChild(toInput);
    modal.appendChild(toLabel);

    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "secondary";
    cancelBtn.textContent = t("cancel");
    cancelBtn.onclick = () => backdrop.remove();
    const okBtn = document.createElement("button");
    okBtn.textContent = t("period_apply");
    okBtn.onclick = () => {
        state.range = "custom";
        state.from = fromInput.value || null;
        state.to = toInput.value || null;
        backdrop.remove();
        onChange();
    };
    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);
    modal.appendChild(actions);

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    fromInput.focus();
}

function wrapTable(table) {
    const wrap = document.createElement("div");
    wrap.className = "table-scroll";
    wrap.appendChild(table);
    return wrap;
}

function renderNav(active, userEmail) {
    document.querySelectorAll(".topbar, .sidebar, .sidebar-backdrop").forEach(el => el.remove());

    const pages = [
        { href: "dashboard.html", key: "dashboard", i18n: "nav_dashboard", icon: "🏠", home: true },
        { href: "goals.html", key: "goals", i18n: "nav_goals", icon: "🎯" },
        { href: "skills.html", key: "skills", i18n: "nav_skills", icon: "🥋" },
        { href: "workouts.html", key: "workouts", i18n: "nav_workouts", icon: "🏋️" },
        { href: "challenges.html", key: "challenges", i18n: "nav_challenges", icon: "🏁" },
        { href: "english.html", key: "english", i18n: "nav_english", icon: "🇬🇧" },
        { href: "calendar.html", key: "calendar", i18n: "nav_calendar", icon: "🗓️" },
        { href: "shop.html", key: "shop", i18n: "nav_shop", icon: "🛍️" },
        { href: "community.html", key: "community", i18n: "nav_community", icon: "🏆" },
    ];

    // ---- Тонкая верхняя полоса: гамбургер + быстрая эмодзи-навигация ----
    const topbar = document.createElement("div");
    topbar.className = "topbar";

    const hamburger = document.createElement("button");
    hamburger.className = "hamburger-btn";
    hamburger.setAttribute("aria-label", t("nav_open_menu"));
    hamburger.innerHTML = "☰";
    topbar.appendChild(hamburger);

    const homePage = pages.find(p => p.home);
    const homeIconLink = document.createElement("a");
    homeIconLink.href = homePage.href;
    homeIconLink.textContent = homePage.icon;
    homeIconLink.title = t(homePage.i18n);
    homeIconLink.className = "quick-nav-icon home" + (homePage.key === active ? " active" : "");
    topbar.appendChild(homeIconLink);

    const quickNav = document.createElement("div");
    quickNav.className = "quick-nav";
    for (const p of pages) {
        if (p.home) continue;
        const a = document.createElement("a");
        a.href = p.href;
        a.textContent = p.icon;
        a.title = t(p.i18n);
        a.className = "quick-nav-icon" + (p.key === active ? " active" : "");
        quickNav.appendChild(a);
    }
    topbar.appendChild(quickNav);

    document.body.prepend(topbar);

    // ---- Выезжающий сайдбар со всем содержимым бывшей шапки ----
    const backdrop = document.createElement("div");
    backdrop.className = "sidebar-backdrop";

    const sidebar = document.createElement("nav");
    sidebar.className = "sidebar";

    const homeLink = document.createElement("a");
    homeLink.href = "index.html";
    homeLink.textContent = t("nav_portfolio");
    homeLink.className = "dim-link";
    sidebar.appendChild(homeLink);

    for (const p of pages) {
        const a = document.createElement("a");
        a.href = p.href;
        a.textContent = t(p.i18n);
        if (p.key === active) a.className = "active";
        sidebar.appendChild(a);
    }

    if (userEmail) {
        const accountLink = document.createElement("a");
        accountLink.href = "account.html";
        accountLink.textContent = "👤 " + t("nav_account_title");
        accountLink.className = active === "account" ? "active" : "";
        sidebar.appendChild(accountLink);
    }

    const divider = document.createElement("div");
    divider.className = "sidebar-divider";
    sidebar.appendChild(divider);

    const langRow = document.createElement("div");
    langRow.className = "sidebar-row";
    renderLangSwitcher(langRow);
    langRow.querySelectorAll(".lang-btn").forEach(btn => {
        const original = btn.onclick;
        btn.onclick = () => { original(); };
    });
    sidebar.appendChild(langRow);

    const themeRow = document.createElement("div");
    themeRow.className = "sidebar-row";
    renderThemeSwitcher(themeRow);
    sidebar.appendChild(themeRow);

    if (userEmail) {
        const logoutBtn = document.createElement("button");
        logoutBtn.textContent = `${t("logout")} (${userEmail})`;
        logoutBtn.className = "user-switch";
        logoutBtn.onclick = logout;
        sidebar.appendChild(logoutBtn);
    }

    const version = document.createElement("button");
    version.className = "sidebar-version";
    version.textContent = "v" + SITE_VERSION;
    version.onclick = showChangelogModal;
    sidebar.appendChild(version);

    document.body.appendChild(backdrop);
    document.body.appendChild(sidebar);

    function openSidebar() { sidebar.classList.add("open"); backdrop.classList.add("open"); }
    function closeSidebar() { sidebar.classList.remove("open"); backdrop.classList.remove("open"); }
    hamburger.onclick = openSidebar;
    backdrop.onclick = closeSidebar;
    sidebar.querySelectorAll("a").forEach(a => a.addEventListener("click", closeSidebar));
}

// ---- Модалка "Что нового" — по клику на версию в сайдбаре ----
function showChangelogModal() {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `<h3>${t("changelog_title")}</h3>`;

    if (CHANGELOG.length === 0) {
        const p = document.createElement("p");
        p.className = "dim";
        p.textContent = t("changelog_empty");
        modal.appendChild(p);
    }
    for (const entry of CHANGELOG) {
        const h4 = document.createElement("h4");
        h4.style.cssText = "margin-top:16px; margin-bottom:6px;";
        h4.textContent = "v" + entry.version + (entry.date ? " — " + entry.date : "");
        modal.appendChild(h4);
        const ul = document.createElement("ul");
        ul.style.cssText = "margin:0; padding-left:20px; font-size:0.9em; color:var(--text-dim);";
        for (const c of entry.changes) {
            const li = document.createElement("li");
            li.textContent = c;
            ul.appendChild(li);
        }
        modal.appendChild(ul);
    }

    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const closeBtn = document.createElement("button");
    closeBtn.className = "secondary";
    closeBtn.textContent = t("close");
    closeBtn.onclick = () => backdrop.remove();
    actions.appendChild(closeBtn);
    modal.appendChild(actions);

    backdrop.appendChild(modal);
    backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };
    document.body.appendChild(backdrop);
}

// ---- Модальные окна (переиспользуются везде) ----

// fields: [{key, label, type: 'text'|'number'|'select'|'date', options?, value}]
function openModal(title, fields, onSubmit) {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `<h3>${title}</h3>`;

    const inputs = {};
    for (const f of fields) {
        const label = document.createElement("label");
        label.textContent = f.label;
        let input;
        if (f.type === "select") {
            input = document.createElement("select");
            for (const opt of f.options) {
                const o = document.createElement("option");
                o.value = opt.value;
                o.textContent = opt.label;
                input.appendChild(o);
            }
            input.value = f.value ?? f.options[0]?.value;
        } else {
            input = document.createElement("input");
            input.type = f.type || "text";
            input.value = f.value ?? "";
            if (f.min !== undefined) input.min = f.min;
            if (f.max !== undefined) input.max = f.max;
        }
        label.appendChild(input);
        modal.appendChild(label);
        inputs[f.key] = input;
    }

    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "secondary";
    cancelBtn.textContent = t("cancel");
    cancelBtn.onclick = () => backdrop.remove();
    const okBtn = document.createElement("button");
    okBtn.textContent = t("save");
    okBtn.onclick = async () => {
        const result = {};
        for (const f of fields) {
            const v = inputs[f.key].value;
            result[f.key] = f.type === "number" ? (parseFloat(v) || 0) : v;
        }
        backdrop.remove();
        await onSubmit(result);
    };
    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);
    modal.appendChild(actions);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    inputs[fields[0]?.key]?.focus();
}

// ==== Свайп с центра экрана вправо — открывает боковое меню (сайдбар) на телефоне ====
// Работает на любой странице (config.js подключён везде), не завязан на renderNav —
// ищет .sidebar/.sidebar-backdrop заново при каждом срабатывании, так что переживает
// пересоздание сайдбара через renderNav() без переустановки слушателей.
(function setupSidebarSwipe() {
    let startX = null, startY = null, tracking = false, mode = null; // mode: "open" | "close"
    const SWIPE_THRESHOLD = 70;   // px — минимальная длина свайпа по горизонтали, чтобы сработало
    const MAX_VERTICAL_DRIFT = 60; // px — если увели палец вертикально больше этого — это скролл, не свайп
    const CENTER_ZONE_MIN = 0.15, CENTER_ZONE_MAX = 0.85; // для открытия — начало свайпа должно быть в центре экрана

    document.addEventListener("touchstart", (e) => {
        const sidebar = document.querySelector(".sidebar");
        const isOpen = sidebar?.classList.contains("open");
        const touch = e.touches[0];

        if (isOpen) {
            // сайдбар уже открыт — свайп влево в любом месте закрывает
            mode = "close";
            startX = touch.clientX;
            startY = touch.clientY;
            tracking = true;
            return;
        }

        if (e.target.closest(".table-scroll, .calendar-grid")) { tracking = false; return; } // не мешаем горизонтальному скроллу таблиц/календаря
        const w = window.innerWidth;
        if (touch.clientX < w * CENTER_ZONE_MIN || touch.clientX > w * CENTER_ZONE_MAX) { tracking = false; return; }
        mode = "open";
        startX = touch.clientX;
        startY = touch.clientY;
        tracking = true;
    }, { passive: true });

    document.addEventListener("touchmove", (e) => {
        if (!tracking) return;
        const touch = e.touches[0];
        const dx = touch.clientX - startX;
        const dy = Math.abs(touch.clientY - startY);
        if (dy > MAX_VERTICAL_DRIFT) { tracking = false; return; } // похоже на вертикальный скролл страницы

        const sidebar = document.querySelector(".sidebar");
        const backdrop = document.querySelector(".sidebar-backdrop");
        if (mode === "open" && dx > SWIPE_THRESHOLD) {
            if (sidebar && backdrop) { sidebar.classList.add("open"); backdrop.classList.add("open"); }
            tracking = false;
        } else if (mode === "close" && dx < -SWIPE_THRESHOLD) {
            if (sidebar && backdrop) { sidebar.classList.remove("open"); backdrop.classList.remove("open"); }
            tracking = false;
        }
    }, { passive: true });

    document.addEventListener("touchend", () => { tracking = false; });
})();
