let user, currentDate;

// ==== Кастомизируемые блоки дашборда: показать/скрыть/переставить местами ====

const DASHBOARD_BLOCK_KEYS = ["profile", "charts", "daily"];
// "daily" объединяет Дневные метрики + Цели на сегодня — они завязаны на одну и ту же дату
// и рендерятся одной функцией (renderDay), поэтому по отдельности не переставляются.

let dashboardLayout = [];

function normalizeDashboardLayout(saved) {
    const layout = [];
    const seen = new Set();
    if (Array.isArray(saved)) {
        for (const item of saved) {
            if (item && DASHBOARD_BLOCK_KEYS.includes(item.key) && !seen.has(item.key)) {
                layout.push({ key: item.key, visible: item.visible !== false });
                seen.add(item.key);
            }
        }
    }
    // блоки, которых нет в сохранённой раскладке (например, появились в новой версии сайта
    // уже после того как человек настроил себе дашборд) — добавляем в конец, видимыми
    for (const key of DASHBOARD_BLOCK_KEYS) {
        if (!seen.has(key)) layout.push({ key, visible: true });
    }
    return layout;
}

function dashboardBlockLabel(key) {
    return {
        profile: t("dash_block_profile"),
        charts: t("dash_charts_h2"),
        daily: t("dash_block_daily"),
    }[key] || key;
}

function appendHeading(container, textKey) {
    const h2 = document.createElement("h2");
    h2.textContent = t(textKey);
    container.appendChild(h2);
}

function appendCard(container, id) {
    const card = document.createElement("div");
    card.className = "card";
    card.id = id;
    card.textContent = t("loading_ellipsis");
    container.appendChild(card);
}

// Сворачиваемая секция: заголовок + стрелка ▼/▶, состояние (свёрнуто/развёрнуто)
// запоминается в localStorage по storageKey, переживает перезагрузку страницы.
// Возвращает контейнер, куда нужно класть содержимое секции (карточки, навигацию и т.д.) —
// именно этот контейнер прячется/показывается по клику на стрелку.
function createCollapsibleSection(container, headingKey, storageKey) {
    const headingRow = document.createElement("div");
    headingRow.style.cssText = "display:flex; align-items:center; gap:8px; margin-top:32px; margin-bottom:12px;";

    const h2 = document.createElement("h2");
    h2.style.margin = "0";
    h2.textContent = t(headingKey);
    headingRow.appendChild(h2);

    const lsKey = "dash_collapsed:" + storageKey;
    const hadStoredPreference = localStorage.getItem(lsKey) !== null;
    const collapsed = localStorage.getItem(lsKey) === "1";

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "secondary";
    toggleBtn.style.cssText = "padding:2px 9px; font-size:0.8em;";
    toggleBtn.textContent = collapsed ? "▶" : "▼";
    toggleBtn.title = collapsed ? t("dash_expand_btn") : t("dash_collapse_btn");
    headingRow.appendChild(toggleBtn);

    container.appendChild(headingRow);

    const content = document.createElement("div");
    content.style.display = collapsed ? "none" : "block";
    container.appendChild(content);

    toggleBtn.onclick = () => {
        const willCollapse = content.style.display !== "none";
        content.style.display = willCollapse ? "none" : "block";
        toggleBtn.textContent = willCollapse ? "▶" : "▼";
        toggleBtn.title = willCollapse ? t("dash_expand_btn") : t("dash_collapse_btn");
        localStorage.setItem(lsKey, willCollapse ? "1" : "0");
    };

    // Автосворачивание секции, если внутри оказалось нечего показывать (например, графики
    // без единой точки данных) — но только пока пользователь сам ни разу не трогал стрелку
    // для этой секции; свой выбор мы никогда не перезаписываем.
    content.autoCollapseIfNoPreference = () => {
        if (hadStoredPreference || content.style.display === "none") return;
        content.style.display = "none";
        toggleBtn.textContent = "▶";
        toggleBtn.title = t("dash_expand_btn");
    };
    content.autoExpandIfNoPreference = () => {
        if (hadStoredPreference || content.style.display !== "none") return;
        content.style.display = "block";
        toggleBtn.textContent = "▼";
        toggleBtn.title = t("dash_collapse_btn");
    };

    return content;
}

function buildBlockDom(key, container) {
    if (key === "profile") {
        const content = createCollapsibleSection(container, "dash_block_profile", "profile");
        const card = document.createElement("div");
        card.className = "card";
        card.id = "profile-card";
        card.textContent = t("loading_ellipsis");
        content.appendChild(card);
    } else if (key === "charts") {
        const content = createCollapsibleSection(container, "dash_charts_h2", "charts");
        appendCard(content, "charts-card");
    } else if (key === "daily") {
        const dailyContent = createCollapsibleSection(container, "dash_daily_h2", "daily");

        const nav = document.createElement("div");
        nav.className = "day-nav";

        const prevBtn = document.createElement("button");
        prevBtn.className = "secondary";
        prevBtn.id = "prev-day";
        prevBtn.textContent = t("prev_day");
        prevBtn.onclick = () => { currentDate.setDate(currentDate.getDate() - 1); renderDay(); };
        nav.appendChild(prevBtn);

        const dayLabel = document.createElement("strong");
        dayLabel.id = "day-label";
        nav.appendChild(dayLabel);

        const todayBtn = document.createElement("button");
        todayBtn.className = "secondary";
        todayBtn.id = "today-btn";
        todayBtn.textContent = t("today_btn");
        todayBtn.onclick = () => { currentDate = new Date(); currentDate.setHours(0, 0, 0, 0); renderDay(); };
        nav.appendChild(todayBtn);

        const nextBtn = document.createElement("button");
        nextBtn.className = "secondary";
        nextBtn.id = "next-day";
        nextBtn.textContent = t("next_day");
        nextBtn.onclick = () => { currentDate.setDate(currentDate.getDate() + 1); renderDay(); };
        nav.appendChild(nextBtn);

        const manageBtn = document.createElement("button");
        manageBtn.className = "secondary";
        manageBtn.id = "manage-metrics-btn";
        manageBtn.style.marginLeft = "auto";
        manageBtn.textContent = "⚙️";
        manageBtn.title = t("manage_metrics_btn");
        manageBtn.onclick = openMetricsManagerModal;
        nav.appendChild(manageBtn);

        dailyContent.appendChild(nav);
        appendCard(dailyContent, "daily-card");

        const plannedContent = createCollapsibleSection(container, "dash_planned_h2", "planned");
        appendCard(plannedContent, "planned-card");
    }
}

async function renderDashboardLayoutAndLoad() {
    const container = document.getElementById("dashboard-blocks");
    container.innerHTML = "";
    for (const item of dashboardLayout) {
        if (item.visible) buildBlockDom(item.key, container);
    }
    // грузим данные только для видимых блоков — скрытые блоки не делают лишних запросов
    const visible = new Set(dashboardLayout.filter(i => i.visible).map(i => i.key));
    if (visible.has("profile")) loadProfile();
    if (visible.has("charts")) loadCharts();
    if (visible.has("daily")) renderDay();
}

function openDashboardLayoutModal() {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `<h3>${t("dash_layout_modal_title")}</h3><p class="dim" style="font-size:0.85em; margin-top:-8px;">${t("dash_layout_hint")}</p>`;

    const listWrap = document.createElement("div");
    let localLayout = dashboardLayout.map(i => ({ ...i }));

    function renderList() {
        listWrap.innerHTML = "";
        localLayout.forEach((item, i) => {
            const row = document.createElement("div");
            row.style.cssText = "display:flex; align-items:center; gap:6px; padding:6px 0; border-bottom:1px solid var(--border);";

            const label = document.createElement("span");
            label.textContent = dashboardBlockLabel(item.key);
            label.style.flex = "1";
            label.style.opacity = item.visible ? "1" : "0.5";
            row.appendChild(label);

            const upBtn = document.createElement("button");
            upBtn.type = "button";
            upBtn.className = "secondary";
            upBtn.textContent = "↑";
            upBtn.disabled = i === 0;
            upBtn.onclick = () => { [localLayout[i - 1], localLayout[i]] = [localLayout[i], localLayout[i - 1]]; renderList(); };
            row.appendChild(upBtn);

            const downBtn = document.createElement("button");
            downBtn.type = "button";
            downBtn.className = "secondary";
            downBtn.textContent = "↓";
            downBtn.disabled = i === localLayout.length - 1;
            downBtn.onclick = () => { [localLayout[i + 1], localLayout[i]] = [localLayout[i], localLayout[i + 1]]; renderList(); };
            row.appendChild(downBtn);

            const toggleBtn = document.createElement("button");
            toggleBtn.type = "button";
            toggleBtn.className = "secondary";
            toggleBtn.textContent = item.visible ? "👁️" : "🚫";
            toggleBtn.title = item.visible ? t("dash_layout_hide") : t("dash_layout_show");
            toggleBtn.onclick = () => { item.visible = !item.visible; renderList(); };
            row.appendChild(toggleBtn);

            listWrap.appendChild(row);
        });
    }
    renderList();
    modal.appendChild(listWrap);

    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "secondary";
    cancelBtn.textContent = t("cancel");
    cancelBtn.onclick = () => backdrop.remove();
    const saveBtn = document.createElement("button");
    saveBtn.textContent = t("save");
    saveBtn.onclick = async () => {
        dashboardLayout = localLayout;
        const { error } = await sb.from("profiles").upsert({ user_id: user.id, dashboard_layout: dashboardLayout });
        backdrop.remove();
        if (error) { showToast(t("dash_layout_save_error") + error.message, "error"); console.error(error); return; }
        renderDashboardLayoutAndLoad();
    };
    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);
    modal.appendChild(actions);

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
}

function computeStreak(sortedDatesSet, fromDate) {
    let streak = 0;
    let cursor = new Date(fromDate);
    while (sortedDatesSet.has(fmtDate(cursor))) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
}

// Считает серии (streaks) — общая логика для компактного бейджа в шапке профиля
// и для модалки с полным списком по клику. Раньше это было отдельным блоком "🔥 Streaks"
// на всю ширину страницы — решили, что он того не стоит, и свернули в шапку.
async function computeStreakItems() {
    const { data: metrics } = await sb.from("metrics").select("*").eq("user_id", user.id).eq("active", true);
    const { data: allValues } = await sb.from("daily_values").select("*").eq("user_id", user.id);
    const { data: allNotes } = await sb.from("daily_notes").select("date, items").eq("user_id", user.id);

    const byDay = {};
    (allValues || []).forEach(v => {
        byDay[v.date] = byDay[v.date] || {};
        byDay[v.date][v.metric_id] = v.value;
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr3 = fmtDate(today);
    // если сегодня ещё не заполнено — считаем серию со вчера, чтобы не сбрасывало на 0 раньше времени
    const startFrom = byDay[todayStr3] ? today : new Date(today.getTime() - 86400000);

    const items = [];

    // серия "идеальный день" — выполнены все метрики
    if (metrics && metrics.length) {
        const perfectDays = new Set(Object.keys(byDay).filter(d => metrics.every(m => isMetricDone(m, byDay[d][m.id]))));
        items.push({ label: t("dash_streak_perfect_days"), streak: computeStreak(perfectDays, startFrom), todayCounted: perfectDays.has(todayStr3) });
    }

    // серия по каждой метрике отдельно
    for (const m of (metrics || [])) {
        const doneDays = new Set(Object.keys(byDay).filter(d => isMetricDone(m, byDay[d][m.id])));
        const streak = computeStreak(doneDays, startFrom);
        if (streak > 0) items.push({ label: `${m.icon} ${m.name}`, streak, todayCounted: doneDays.has(todayStr3) });
    }

    // серия "заполнил заметку дня"
    const noteDays = new Set((allNotes || []).filter(n => n.items && n.items.length > 0).map(n => n.date));
    items.push({ label: t("dash_streak_note_filled"), streak: computeStreak(noteDays, startFrom), todayCounted: noteDays.has(todayStr3) });

    items.sort((a, b) => b.streak - a.streak);
    return items.filter(i => i.streak > 0);
}

const STREAK_OUTLINE_ICON = '<svg viewBox="0 0 32 32" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="2.6 2.2" stroke-linejoin="round"><path d="M16 2c1 5-3 6-3 10a3 3 0 0 0 6 0c2 1 3 4 3 7a9 9 0 1 1-18 0c0-6 4-9 6-13 1-2 2-3 6-4z"/></svg>';

const STREAK_SOLID_ICON = '<svg viewBox="0 0 32 32" width="18" height="18" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M16 2c1 5-3 6-3 10a3 3 0 0 0 6 0c2 1 3 4 3 7a9 9 0 1 1-18 0c0-6 4-9 6-13 1-2 2-3 6-4z"/></svg>';

function openStreaksModal(items) {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `<h3>${t("dash_streaks_h2")}</h3>`;

    if (items.some(i => !i.todayCounted)) {
        const warning = document.createElement("p");
        warning.style.cssText = "background:rgba(214,51,108,0.12); border:1px solid #d6336c; border-radius:8px; padding:8px 12px; font-size:0.85em; margin-top:10px;";
        warning.textContent = t("dash_streak_at_risk_warning");
        modal.appendChild(warning);
    }

    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex; flex-wrap:wrap; gap:10px; margin-top:12px;";
    for (const item of items) {
        const badge = document.createElement("div");
        badge.style.cssText = "background:var(--bg); border:1px solid var(--border); border-radius:8px; padding:8px 14px;" + (item.todayCounted ? "" : " border-color:#d6336c;");
        badge.innerHTML = `<div style="font-size:1.3em; font-weight:bold;">${item.streak} 🔥</div><div class="dim" style="font-size:0.8em;">${item.label}${item.todayCounted ? "" : " · " + t("dash_streak_not_done_today")}</div>`;
        wrap.appendChild(badge);
    }
    modal.appendChild(wrap);

    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const closeBtn = document.createElement("button");
    closeBtn.className = "secondary";
    closeBtn.textContent = t("dash_close_btn");
    closeBtn.onclick = () => backdrop.remove();
    actions.appendChild(closeBtn);
    modal.appendChild(actions);

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
}

async function renderStreakBadge(container) {
    const items = await computeStreakItems();
    if (items.length === 0) return; // стриков ни по чему нет — просто ничего не показываем

    const top = items[0];
    const badge = document.createElement("div");
    badge.style.cssText = "cursor:pointer; font-weight:bold; white-space:nowrap; display:flex; align-items:center; gap:4px;" + (top.todayCounted ? "" : " color:#d6336c;");
    badge.innerHTML = `${top.todayCounted ? STREAK_SOLID_ICON : STREAK_OUTLINE_ICON} ${top.streak}`;
    badge.title = top.todayCounted
        ? (items.length > 1 ? `${top.label} — ${t("dash_streak_more_hint")}` : top.label)
        : t("dash_streak_at_risk_warning");
    badge.onclick = () => openStreaksModal(items);
    container.appendChild(badge);
}

async function buildAvailableSeries() {
    const { data: bodyParams } = await sb.from("body_parameters").select("*").eq("user_id", user.id).eq("active", true).order("position");
    const { data: bodyValues } = await sb.from("body_parameter_values").select("*").eq("user_id", user.id).order("date");
    const { data: metrics } = await sb.from("metrics").select("*").eq("user_id", user.id).eq("active", true).in("type", ["number", "sets"]);
    const { data: allMetrics } = await sb.from("metrics").select("*").eq("user_id", user.id).eq("active", true);
    const { data: allValues } = await sb.from("daily_values").select("*").eq("user_id", user.id).order("date");

    const byDay = {};
    (allValues || []).forEach(v => {
        byDay[v.date] = byDay[v.date] || {};
        byDay[v.date][v.metric_id] = v.value;
    });

    const series = {};

    // точки хранят настоящую ISO-дату (для фильтрации по периоду), подпись формируется позже
    for (const p of (bodyParams || [])) {
        const pointsForParam = (bodyValues || [])
            .filter(v => v.parameter_id === p.id && v.value != null)
            .map(v => ({ date: v.date, y: v.value }));
        series[`body:${p.id}`] = {
            label: `${p.icon} ${p.name}`, unit: p.unit ? (p.unit.startsWith("%") ? p.unit : " " + p.unit) : "",
            color: "var(--accent)", points: pointsForParam
        };
    }

    const days = Object.keys(byDay).sort();
    series["points"] = {
        label: t("dash_points_series_label"), unit: "", color: "var(--danger)",
        points: days.map(d => {
            let pts = 0;
            for (const m of (allMetrics || [])) if (isMetricDone(m, byDay[d][m.id])) pts++;
            return { date: d, y: pts };
        })
    };

    for (const m of (metrics || [])) {
        series[`metric:${m.id}`] = {
            label: `${m.icon} ${m.name}`, unit: m.unit ? " " + m.unit : "", color: "var(--accent)", type: m.type,
            points: days.filter(d => byDay[d][m.id] !== undefined)
                .map(d => ({ date: d, y: metricNumericValue(m, byDay[d][m.id]) }))
                .filter(p => p.y != null), // "sets" с пустым/битым значением — пропускаем точку, а не рисуем дыру числом
            // если у метрики задана цель (X) — предлагаем её как линию-ориентир по умолчанию
            defaultGoal: m.goal_value ? m.goal_value : null
        };
    }

    return series;
}

function filterPointsByRange(points, rangeKey, customFrom, customTo) {
    const [from, to] = periodBounds(rangeKey, customFrom, customTo);
    let filtered = points;
    if (from) filtered = filtered.filter(p => p.date >= from && (!to || p.date <= to));
    return filtered; // {date, y} — форматирование подписи и заполнение пропусков делает renderChartBlock
}

const chartPeriodState = loadPeriodState("dash_period_dashboard", { range: "days10", from: null, to: null });

// Хранилища для точечного обновления графиков без полной пересборки блока (см. pushPointToChart) —
// заполняются при каждом полном вызове loadCharts(), используются из renderDay() при автосохранении.
let dashboardChartSeries = null;       // entryKey -> { points, label, unit, color, defaultGoal }, как в allSeries
let dashboardChartRefreshers = {};     // entryKey -> функция, перерисовывающая только картинку этого графика

// Обновляет один график точечно (без полной пересборки блока графиков — без мигания),
// когда известно, что изменилось конкретное значение конкретной метрики/параметра тела
// за конкретную дату. Если блок графиков сейчас скрыт или ещё не загружался — просто выходит,
// ничего не делает.
function pushPointToChart(entryKey, date, value) {
    if (!dashboardChartSeries) return;
    const s = dashboardChartSeries[entryKey];
    if (!s) return;
    const point = s.points.find(p => p.date === date);
    if (point) point.y = value;
    else { s.points.push({ date, y: value }); s.points.sort((a, b) => a.date.localeCompare(b.date)); }
    const refresh = dashboardChartRefreshers[entryKey];
    if (refresh) refresh();
}

async function loadCharts() {
    const card = document.getElementById("charts-card");
    if (!card) return; // блок скрыт в настройках дашборда

    const allSeries = await buildAvailableSeries();
    dashboardChartSeries = allSeries;
    dashboardChartRefreshers = {};
    const { data: profile } = await sb.from("profiles").select("dashboard_charts").eq("user_id", user.id).maybeSingle();
    let saved = profile?.dashboard_charts;
    // dashboard_charts исторически был просто массивом ключей (строк); теперь может быть
    // массивом объектов {key, goal} — второй формат нужен, чтобы хранить свой ориентир
    // на график. Понимаем оба формата для обратной совместимости.
    let selectedEntries = (saved && saved.length)
        ? saved.map(e => typeof e === "string" ? { key: e, goal: null } : { key: e.key, goal: e.goal ?? null })
        : null;
    if (!selectedEntries || !selectedEntries.length) {
        const bodyKeys = Object.keys(allSeries).filter(k => k.startsWith("body:")).slice(0, 2);
        selectedEntries = [...bodyKeys, "points"].map(k => ({ key: k, goal: null }));
    }
    selectedEntries = selectedEntries.filter(e => allSeries[e.key]);

    // Собираем всё новое содержимое в отдельном контейнере, не прикреплённом к странице,
    // и подменяем содержимое карточки только когда всё уже готово — одним синхронным шагом,
    // без паузы "пустая карточка, пока идёт запрос к серверу" (та самая причина мигания).
    const newContent = document.createElement("div");

    const topRow = document.createElement("div");
    topRow.style.cssText = "display:flex; justify-content:flex-end; margin-bottom:14px;";

    const configBtn = document.createElement("button");
    configBtn.className = "secondary";
    configBtn.textContent = t("dash_charts_configure_btn");
    configBtn.onclick = () => openChartsConfigModal(allSeries, selectedEntries);
    topRow.appendChild(configBtn);

    newContent.appendChild(topRow);

    if (selectedEntries.length === 0) {
        newContent.appendChild(Object.assign(document.createElement("p"), { className: "dim", textContent: t("dash_charts_empty") }));
        card.parentElement?.autoCollapseIfNoPreference?.();
    } else {
        // Показываем только серии, для которых реально есть хотя бы одна точка данных —
        // пустой график ничего не даёт, кроме визуального шума.
        const entriesWithData = selectedEntries.filter(entry => (allSeries[entry.key]?.points?.length ?? 0) > 0);

        if (entriesWithData.length === 0) {
            newContent.appendChild(Object.assign(document.createElement("p"), { className: "dim", textContent: t("dash_charts_no_data_yet") }));
            card.parentElement?.autoCollapseIfNoPreference?.();
        } else {
            card.parentElement?.autoExpandIfNoPreference?.();
        }

        for (const entry of entriesWithData) {
            const s = allSeries[entry.key];
            const chartWrap = document.createElement("div");
            chartWrap.style.marginBottom = "18px";

            const chartHeaderRow = document.createElement("div");
            chartHeaderRow.style.cssText = "display:flex; justify-content:flex-end; margin-bottom:2px;";
            const periodBtn = document.createElement("button");
            periodBtn.type = "button";
            periodBtn.className = "secondary";
            periodBtn.style.cssText = "padding:2px 8px; font-size:0.78em;";
            periodBtn.textContent = "🗓️";
            periodBtn.title = t("dash_chart_period_btn_title");
            chartHeaderRow.appendChild(periodBtn);
            chartWrap.appendChild(chartHeaderRow);

            const chartImgWrap = document.createElement("div");
            chartWrap.appendChild(chartImgWrap);

            function effectivePeriod() {
                return loadPeriodState("dash_period_chart:" + entry.key, null) || chartPeriodState;
            }

            function refreshChartImage() {
                chartImgWrap.innerHTML = "";
                const period = effectivePeriod();
                const pts = filterPointsByRange(s.points, period.range, period.from, period.to);
                const goalValue = entry.goal != null ? entry.goal : (s.defaultGoal ?? null);
                const goalLabel = goalValue != null ? `${t("chart_goal_label")} ${goalValue}${s.unit || ''}` : null;
                renderChartBlock(chartImgWrap, s.label, pts, { unit: s.unit, color: s.color, goalValue, goalLabel });
            }
            periodBtn.onclick = () => openChartPeriodModal(entry.key, refreshChartImage);
            refreshChartImage();
            dashboardChartRefreshers[entry.key] = refreshChartImage;

            const points = filterPointsByRange(s.points, effectivePeriod().range, effectivePeriod().from, effectivePeriod().to);
            renderEditableSeriesValues(chartWrap, entry.key, points, s.unit, refreshChartImage, s.type);
            newContent.appendChild(chartWrap);
        }
    }

    card.innerHTML = "";
    card.appendChild(newContent);
}

// Раскрывающийся список точек графика с возможностью тут же поправить значение —
// не нужно листать дни на карточке ниже, если хочешь поправить конкретную дату.
// Не показываем для "points" (баллы за день) — это вычисляемое поле, не редактируется напрямую.
function renderEditableSeriesValues(container, entryKey, points, unit, onValueSaved, metricType) {
    if (entryKey === "points" || !points.length) return;
    const [prefix, id] = [entryKey.slice(0, entryKey.indexOf(":")), entryKey.slice(entryKey.indexOf(":") + 1)];
    if (prefix !== "metric" && prefix !== "body") return;
    // для "Подходов" тут нечего редактировать напрямую числом — это перезаписало бы весь список
    // подходов за день одним числом, и при следующем открытии карточки дня список выглядел бы
    // пустым, хотя итог сохранён. Правится через саму карточку дня, а не отсюда.
    if (metricType === "sets") return;

    const toggleBtn = document.createElement("button");
    toggleBtn.className = "secondary";
    toggleBtn.style.cssText = "font-size:0.8em; padding:3px 10px; margin-top:4px;";
    toggleBtn.textContent = t("dash_chart_edit_values_btn");
    container.appendChild(toggleBtn);

    const editWrap = document.createElement("div");
    editWrap.style.cssText = "display:none; margin-top:8px; max-height:220px; overflow-y:auto;";
    container.appendChild(editWrap);

    let open = false;
    toggleBtn.onclick = () => {
        open = !open;
        editWrap.style.display = open ? "block" : "none";
        if (open && !editWrap.children.length) buildRows();
    };

    function buildRows() {
        const table = document.createElement("table");
        for (const p of points.slice().reverse()) { // сначала недавние даты
            const row = table.insertRow();
            row.insertCell().textContent = fmtRu(p.date);
            const valCell = row.insertCell();
            const input = document.createElement("input");
            input.type = "number";
            input.step = "any";
            input.style.width = "90px";
            input.value = p.y ?? "";
            input.placeholder = "0";
            input.onchange = async () => {
                const value = input.value === "" ? null : (parseFloat(input.value) || 0);
                let error;
                if (prefix === "metric") {
                    ({ error } = await sb.from("daily_values").upsert({
                        user_id: user.id, date: p.date, metric_id: id, value: value ?? 0
                    }, { onConflict: "user_id,date,metric_id" }));
                } else {
                    if (value == null) return;
                    ({ error } = await sb.from("body_parameter_values").upsert({
                        user_id: user.id, date: p.date, parameter_id: id, value
                    }, { onConflict: "user_id,date,parameter_id" }));
                }
                if (error) { showToast(t("dash_save_error_generic") + error.message, "error"); console.error(error); return; }
                flashSaved(input);
                p.y = value; // мутируем объект точки — он тот же самый и в общем массиве серии, график увидит новое значение
                onValueSaved();
                if (prefix === "body") loadProfile();
                if (prefix === "metric" && p.date === fmtDate(currentDate)) renderDay(); // сегодняшний день виден и на карточке дня — тоже обновим
                if (prefix === "metric" && p.date === fmtDate(new Date())) { renderDayProgressRing(); renderWeekProgress(); refreshStreakBadge(); } // кольцо прогресса дня — только если правили именно сегодняшнюю дату
            };
            valCell.appendChild(input);
            if (unit) { const u = document.createElement("span"); u.className = "dim"; u.style.marginLeft = "4px"; u.textContent = unit.trim(); valCell.appendChild(u); }
        }
        editWrap.appendChild(wrapTable(table));
    }
}

// Период для ОДНОГО графика — если не настроен отдельно, график использует общий
// chartPeriodState (из "Настроить графики"). Хранится в localStorage по ключу серии.
function openChartPeriodModal(key, onApply) {
    const storageKey = "dash_period_chart:" + key;
    const existing = loadPeriodState(storageKey, null);
    let localState = existing ? { ...existing } : { ...chartPeriodState };

    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `<h3>${t("dash_chart_period_modal_title")}</h3>`;

    const periodRow = document.createElement("div");
    function renderRow() { periodRow.innerHTML = ""; renderPeriodPicker(periodRow, localState, renderRow); }
    renderRow();
    modal.appendChild(periodRow);

    const hint = document.createElement("p");
    hint.className = "dim";
    hint.style.cssText = "font-size:0.8em; margin-top:12px;";
    hint.textContent = existing ? t("dash_chart_period_is_custom_hint") : t("dash_chart_period_uses_shared_hint");
    modal.appendChild(hint);

    const actions = document.createElement("div");
    actions.className = "modal-actions";
    if (existing) {
        const resetBtn = document.createElement("button");
        resetBtn.className = "secondary";
        resetBtn.textContent = t("dash_chart_period_reset_btn");
        resetBtn.onclick = () => {
            localStorage.removeItem(storageKey);
            backdrop.remove();
            onApply();
        };
        actions.appendChild(resetBtn);
    }
    const okBtn = document.createElement("button");
    okBtn.textContent = t("save");
    okBtn.onclick = () => {
        savePeriodState(storageKey, localState);
        backdrop.remove();
        onApply();
    };
    actions.appendChild(okBtn);
    modal.appendChild(actions);
    backdrop.appendChild(modal);
    backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };
    document.body.appendChild(backdrop);
}

function openChartsConfigModal(allSeries, selectedEntries) {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.style.width = "460px";
    modal.innerHTML = `<h3>${t("dash_charts_config_title")}</h3><p class="dim" style="font-size:0.85em; margin-top:-8px;">${t("dash_charts_config_hint")}</p>`;

    // Период — теперь тоже здесь, а не отдельным рядом кнопок над графиками
    const periodLabel = document.createElement("div");
    periodLabel.className = "dim";
    periodLabel.style.cssText = "font-size:0.85em; margin-bottom:6px;";
    periodLabel.textContent = t("dash_charts_period_label");
    modal.appendChild(periodLabel);

    let localPeriod = { ...chartPeriodState };
    const periodRow = document.createElement("div");
    periodRow.style.marginBottom = "16px";
    function renderPeriodRow() {
        periodRow.innerHTML = "";
        renderPeriodPicker(periodRow, localPeriod, renderPeriodRow);
    }
    renderPeriodRow();
    modal.appendChild(periodRow);

    const divider = document.createElement("hr");
    divider.style.cssText = "border:none; border-top:1px solid var(--border); margin:0 0 14px;";
    modal.appendChild(divider);

    let order = selectedEntries.map(e => ({ ...e }));

    const goalHint = document.createElement("p");
    goalHint.className = "dim";
    goalHint.style.cssText = "font-size:0.8em; margin:0 0 8px;";
    goalHint.textContent = t("dash_charts_goal_hint");
    modal.appendChild(goalHint);

    const list = document.createElement("div");
    modal.appendChild(list);

    function renderList() {
        list.innerHTML = "";
        for (const entry of order) {
            const key = entry.key;
            const s = allSeries[key];
            const row = document.createElement("div");
            row.style.cssText = "display:flex; align-items:center; gap:6px; padding:4px 0; flex-wrap:wrap;";
            const label = document.createElement("span");
            label.style.flex = "1";
            label.style.minWidth = "110px";
            label.textContent = s?.label ?? key;
            row.appendChild(label);

            const goalInput = document.createElement("input");
            goalInput.type = "number";
            goalInput.step = "any";
            goalInput.style.width = "70px";
            goalInput.placeholder = s?.defaultGoal != null ? String(s.defaultGoal) : t("dash_charts_goal_placeholder");
            goalInput.title = t("dash_charts_goal_field");
            goalInput.value = entry.goal ?? "";
            goalInput.onchange = () => { entry.goal = goalInput.value === "" ? null : (parseFloat(goalInput.value) || 0); };
            row.appendChild(goalInput);

            const upBtn = document.createElement("button");
            upBtn.className = "secondary";
            upBtn.textContent = "↑";
            upBtn.style.padding = "2px 8px";
            upBtn.onclick = () => { const i = order.indexOf(entry); if (i > 0) { [order[i-1], order[i]] = [order[i], order[i-1]]; renderList(); } };
            row.appendChild(upBtn);
            const downBtn = document.createElement("button");
            downBtn.className = "secondary";
            downBtn.textContent = "↓";
            downBtn.style.padding = "2px 8px";
            downBtn.onclick = () => { const i = order.indexOf(entry); if (i < order.length - 1) { [order[i+1], order[i]] = [order[i], order[i+1]]; renderList(); } };
            row.appendChild(downBtn);
            const removeBtn = document.createElement("button");
            removeBtn.className = "danger";
            removeBtn.textContent = "✕";
            removeBtn.style.padding = "2px 8px";
            removeBtn.onclick = () => { order = order.filter(e => e !== entry); renderList(); };
            row.appendChild(removeBtn);
            list.appendChild(row);
        }
    }
    renderList();

    const addLabel = document.createElement("label");
    addLabel.style.marginTop = "14px";
    addLabel.textContent = t("dash_charts_add_label");
    const addSelect = document.createElement("select");
    Object.entries(allSeries).forEach(([key, s]) => {
        if (order.some(e => e.key === key)) return;
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = s.label;
        addSelect.appendChild(opt);
    });
    addLabel.appendChild(addSelect);
    modal.appendChild(addLabel);
    const addBtn = document.createElement("button");
    addBtn.className = "secondary";
    addBtn.textContent = t("add_btn");
    addBtn.style.marginTop = "8px";
    addBtn.onclick = () => {
        if (addSelect.value && !order.some(e => e.key === addSelect.value)) {
            order.push({ key: addSelect.value, goal: null });
            renderList();
            addSelect.querySelector(`option[value="${addSelect.value}"]`)?.remove();
        }
    };
    modal.appendChild(addBtn);

    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "secondary";
    cancelBtn.textContent = t("cancel");
    cancelBtn.onclick = () => backdrop.remove();
    const okBtn = document.createElement("button");
    okBtn.textContent = t("save");
    okBtn.onclick = async () => {
        const { error } = await sb.from("profiles").upsert({ user_id: user.id, dashboard_charts: order });
        if (error) {
            alert(t("dash_charts_save_error") + error.message + "\n\n" + t("dash_charts_save_error_hint"));
            console.error(error);
            return;
        }
        Object.assign(chartPeriodState, localPeriod);
        savePeriodState("dash_period_dashboard", chartPeriodState);
        backdrop.remove();
        loadCharts();
    };
    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);
    modal.appendChild(actions);

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
}

async function uploadAvatar(file) {
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await sb.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) { alert(t("dash_avatar_upload_error") + uploadError.message); return; }
    const { data } = sb.storage.from("avatars").getPublicUrl(path);
    const url = data.publicUrl + "?t=" + Date.now(); // ломаем кэш браузера при замене фото
    await sb.from("profiles").upsert({ user_id: user.id, avatar_url: url });
    loadProfile();
}

async function getBodyParameters() {
    const { data } = await sb.from("body_parameters").select("*").eq("user_id", user.id).eq("active", true).order("position");
    return data || [];
}

function bodyParamFormFields(existing) {
    return [
        { key: "name", label: t("dash_metric_field_name"), type: "text", value: existing?.name ?? "" },
        { key: "icon", label: t("dash_metric_field_icon"), type: "text", value: existing?.icon ?? "📏" },
        { key: "unit", label: t("dash_body_param_unit_label"), type: "text", value: existing?.unit ?? "" },
    ];
}

async function addBodyParameter() {
    openModal(t("dash_body_param_new_title"), bodyParamFormFields(null), async (res) => {
        if (!res.name?.trim()) return;
        const existing = await getBodyParameters();
        const position = existing.length;
        const { error } = await sb.from("body_parameters").insert({
            user_id: user.id, name: res.name.trim(), icon: res.icon || "📏", unit: res.unit, position, active: true
        });
        if (error) { showToast(t("dash_save_error_generic") + error.message, "error"); console.error(error); return; }
        showToast(t("dash_param_added_toast"));
        renderDay();
        loadProfile();
        loadCharts();
    });
}

async function editBodyParameter(p) {
    openModal(t("dash_body_param_edit_title"), bodyParamFormFields(p), async (res) => {
        if (!res.name?.trim()) return;
        const { error } = await sb.from("body_parameters").update({
            name: res.name.trim(), icon: res.icon || "📏", unit: res.unit
        }).eq("id", p.id);
        if (error) { showToast(t("dash_save_error_generic") + error.message, "error"); console.error(error); return; }
        showToast(t("saved_toast"));
        renderDay();
        loadProfile();
        loadCharts();
    });
}

async function deleteBodyParameter(p) {
    if (!confirm(t("dash_body_param_delete_confirm").replace("{name}", p.name))) return;
    const { error } = await sb.from("body_parameters").delete().eq("id", p.id);
    if (error) { showToast(t("dash_delete_error_generic") + error.message, "error"); console.error(error); return; }
    showToast(t("deleted_toast"));
    renderDay();
    loadProfile();
    loadCharts();
}

// Возраст с правильным склонением: 21 год, 22 года, 25 лет и т.п.
function formatAge(age) {
    if (getLang() === "en") {
        return `${age} ${age === 1 ? "year" : "years"}`;
    }
    const mod100 = age % 100;
    const mod10 = age % 10;
    let word;
    if (mod100 >= 11 && mod100 <= 14) word = "лет";
    else if (mod10 === 1) word = "год";
    else if (mod10 >= 2 && mod10 <= 4) word = "года";
    else word = "лет";
    return `${age} ${word}`;
}

// ---- Диаграмма "на сколько % день сделан" — настройки хранятся в localStorage (личная
// настройка отображения, не данные, синхронизировать между устройствами не нужно) ----
function getDayProgressSettings() {
    const defaults = { enabled: true, includePlanned: true, includeMetrics: true, displayMode: "avatar" };
    try {
        const raw = localStorage.getItem("day_progress_settings");
        if (!raw) return defaults;
        return { ...defaults, ...JSON.parse(raw) };
    } catch { return defaults; }
}
function setDayProgressSettings(s) {
    localStorage.setItem("day_progress_settings", JSON.stringify(s));
}

// Сколько % сверху плана добавляет один выполненный бонусный (⭐) пункт
const BONUS_PCT_PER_ITEM = 20;

// Считает done/total по сегодняшнему дню из выбранных в настройках источников:
// дневные метрики (isMetricDone/calcDailyPoints — та же логика, что и в счёте дня) и/или
// список "Запланировано на сегодня" (обычные пункты + привязанные цели). Бонусные (⭐)
// пункты плана в done/total не идут — они дают отдельный bonusPct сверху, позволяя
// "перевыполнить" день выше 100%.
// Элементы кольца прогресса дня — заполняются в loadProfileInner при полной отрисовке
// карточки профиля; refreshDayProgressRing() ниже использует их, чтобы обновить только
// само кольцо (например, после отметки пункта плана), не трогая остальную карточку.
let dayProgressRingWrapEl = null;
let dayProgressRingHostEl = null;
let dayProgressTextEl = null;
let streakBadgeHostEl = null;

async function refreshStreakBadge() {
    if (!streakBadgeHostEl) return;
    streakBadgeHostEl.innerHTML = "";
    await renderStreakBadge(streakBadgeHostEl);
}

// ---- Прогресс недели — отдельный бейдж-кружок рядом с аватаркой (не совмещаем с кольцом
// дня, чтобы не громоздить несколько колец друг на друга). Если неделя не закрыта —
// подсказка с одной случайной незавершённой целью, чтобы было понятно, что доделать.
let weekProgressHostEl = null;

async function renderWeekProgress() {
    if (!weekProgressHostEl) return;
    weekProgressHostEl.innerHTML = "";
    const settings = getDayProgressSettings();
    if (!settings.enabled) return;
    const week = await computeWeekProgress();
    if (!week || (week.total === 0 && week.bonusPct === 0)) return;

    const basePct = week.total > 0 ? week.done / week.total : 0;
    const totalPct = Math.round(basePct * 100) + week.bonusPct;
    const r = 20;
    const circumference = 2 * Math.PI * r;
    const offset = circumference * (1 - basePct);
    const bonusFraction = Math.min(1, week.bonusPct / 100);
    const offsetBonus = circumference * (1 - bonusFraction);

    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex; flex-direction:column; align-items:center; gap:3px; cursor:pointer;";
    wrap.title = `${t("dash_week_progress_label")}: ${totalPct}% (${week.done}/${week.total}${week.bonusPct > 0 ? " +" + week.bonusPct + "% ⭐" : ""})`;
    wrap.innerHTML = `
        <div style="position:relative; width:48px; height:48px;">
            <svg width="48" height="48" viewBox="0 0 48 48" style="transform: rotate(-90deg);">
                <circle cx="24" cy="24" r="${r}" fill="none" stroke="var(--border)" stroke-width="3"/>
                <circle cx="24" cy="24" r="${r}" fill="none" stroke="var(--accent)" stroke-width="3"
                    stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"/>
                ${week.bonusPct > 0 ? `<circle cx="24" cy="24" r="${r}" fill="none" stroke="#d6336c" stroke-width="3"
                    stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offsetBonus}"/>` : ""}
            </svg>
            <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:0.68em; font-weight:700;">${totalPct}%</div>
        </div>
        <div class="dim" style="font-size:0.65em; white-space:nowrap;">${t("dash_week_progress_label")}</div>`;
    weekProgressHostEl.appendChild(wrap);
}

// Напоминание про недоделанную неделю — показывается только по сб/вс (когда неделя ещё
// не закрыта), а не постоянно рядом с кружком. Один раз закрыл крестиком — не всплывает
// повторно в этот же день (localStorage), назавтра снова появится, если актуально.
async function checkWeekendGoalReminder() {
    const dow = new Date().getDay(); // 0=вс, 6=сб
    if (dow !== 0 && dow !== 6) return;
    const todayKey = fmtDate(new Date());
    const dismissedKey = "week_reminder_dismissed:" + todayKey;
    if (localStorage.getItem(dismissedKey)) return;

    const settings = getDayProgressSettings();
    if (!settings.enabled) return;
    const week = await computeWeekProgress();
    if (!week) return;
    const basePct = week.total > 0 ? week.done / week.total : 0;
    const totalPct = Math.round(basePct * 100) + week.bonusPct;
    if (totalPct >= 100) return;

    const { data: allGoals } = await sb.from("goals").select("*").eq("user_id", user.id);
    const incomplete = (allGoals || []).filter(g => {
        const stages = g.stages ?? 1;
        return stages <= 1 ? !g.done : (g.current_stage ?? 0) < stages;
    });
    if (incomplete.length === 0) return;
    const pick = incomplete[Math.floor(Math.random() * incomplete.length)];

    const banner = document.createElement("div");
    banner.className = "card";
    banner.style.cssText = "border:1px solid var(--accent); display:flex; align-items:center; gap:12px; justify-content:space-between;";
    const text = document.createElement("div");
    text.innerHTML = `<strong>${t("dash_week_reminder_title")}</strong><br><span class="dim" style="font-size:0.9em;">${t("dash_week_progress_suggestion_prefix")} «${pick.name}» — ${t("dash_week_reminder_currently")} ${totalPct}%</span>`;
    banner.appendChild(text);
    const closeBtn = document.createElement("button");
    closeBtn.className = "secondary";
    closeBtn.textContent = "✕";
    closeBtn.onclick = () => { localStorage.setItem(dismissedKey, "1"); banner.remove(); };
    banner.appendChild(closeBtn);

    const main = document.querySelector("main");
    if (main) main.insertBefore(banner, main.firstChild);
}

async function renderDayProgressRing() {
    if (!dayProgressRingHostEl) return; // карточка профиля ещё не строилась в этой сессии
    const settings = getDayProgressSettings();
    const dayProgress = await computeDayProgress();

    dayProgressRingHostEl.innerHTML = "";
    dayProgressTextEl.textContent = "";
    dayProgressRingWrapEl.title = "";
    removeHeaderProgressBadge();

    if (!dayProgress || (dayProgress.total === 0 && dayProgress.bonusPct === 0)) return;

    const basePct = dayProgress.total > 0 ? dayProgress.done / dayProgress.total : 0;
    const totalPct = Math.round(basePct * 100) + dayProgress.bonusPct;
    const titleText = `${t("dash_day_progress_label")}: ${totalPct}% (${dayProgress.done}/${dayProgress.total}${dayProgress.bonusPct > 0 ? " +" + dayProgress.bonusPct + "% ⭐" : ""})`;

    if (settings.displayMode === "header") {
        renderHeaderProgressBadge(basePct, dayProgress.bonusPct, totalPct, titleText);
        return;
    }

    const r = 24;
    const circumference = 2 * Math.PI * r;
    const offset = circumference * (1 - basePct);
    const bonusFraction = Math.min(1, dayProgress.bonusPct / 100);
    const offsetBonus = circumference * (1 - bonusFraction);

    dayProgressRingHostEl.innerHTML = `
        <svg width="52" height="52" viewBox="0 0 52 52" style="transform: rotate(-90deg);">
            <circle cx="26" cy="26" r="${r}" fill="none" stroke="var(--border)" stroke-width="3"/>
            <circle cx="26" cy="26" r="${r}" fill="none" stroke="var(--accent)" stroke-width="3"
                stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"/>
            ${dayProgress.bonusPct > 0 ? `<circle cx="26" cy="26" r="${r}" fill="none" stroke="#d6336c" stroke-width="3"
                stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offsetBonus}"/>` : ""}
        </svg>`;
    dayProgressRingWrapEl.title = titleText;
    dayProgressTextEl.textContent = totalPct + "%";
}

// Второй режим отображения — отдельный заполняемый кружок с процентом в шапке страницы,
// вместо кольца вокруг аватарки. Живёт в .topbar (собирается в renderNav из config.js),
// поэтому просто находим её в DOM и добавляем/обновляем свой элемент.
function removeHeaderProgressBadge() {
    const el = document.getElementById("day-progress-header-badge");
    if (el) el.remove();
}
function renderHeaderProgressBadge(basePct, bonusPct, totalPct, titleText) {
    const topbar = document.querySelector(".topbar");
    if (!topbar) return;
    removeHeaderProgressBadge();

    const r = 13;
    const circumference = 2 * Math.PI * r;
    const offset = circumference * (1 - basePct);
    const bonusFraction = Math.min(1, bonusPct / 100);
    const offsetBonus = circumference * (1 - bonusFraction);

    const badge = document.createElement("button");
    badge.type = "button";
    badge.id = "day-progress-header-badge";
    badge.title = titleText;
    badge.onclick = () => openDayProgressSettingsModal(loadProfile);
    badge.style.cssText = "background:transparent; border:none; cursor:pointer; position:relative; width:32px; height:32px; min-height:0; flex-shrink:0; padding:0;";
    badge.innerHTML = `
        <svg width="32" height="32" viewBox="0 0 32 32" style="transform: rotate(-90deg);">
            <circle cx="16" cy="16" r="${r}" fill="none" stroke="var(--border)" stroke-width="3"/>
            <circle cx="16" cy="16" r="${r}" fill="none" stroke="var(--accent)" stroke-width="3"
                stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"/>
            ${bonusPct > 0 ? `<circle cx="16" cy="16" r="${r}" fill="none" stroke="#d6336c" stroke-width="3"
                stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offsetBonus}"/>` : ""}
        </svg>
        <span style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:700; color:var(--text);">${totalPct}%</span>`;
    (document.getElementById("topbar-right") || topbar).appendChild(badge);
}

async function computeDayProgress() {
    const settings = getDayProgressSettings();
    if (!settings.enabled) return null;
    const dateStr = fmtDate(new Date());
    let done = 0, total = 0, bonusPct = 0;

    if (settings.includeMetrics) {
        const metrics = await getMetrics();
        done += await calcDailyPoints(user.id, dateStr, metrics);
        total += metrics.length;
    }

    // Бонусные (⭐) пункты дают перевыполнение НЕЗАВИСИМО от того, включён ли сам план
    // в базовые 100% ("Учитывать пункты «Запланировано на сегодня»") — это осознанный
    // бонус сверху, а не часть общего счёта, поэтому список планов читаем всегда.
    const { data: note } = await sb.from("daily_notes").select("planned_goals").eq("user_id", user.id).eq("date", dateStr).maybeSingle();
    const planned = note?.planned_goals ?? [];
    if (planned.length > 0) {
        const { data: allGoals } = await sb.from("goals").select("*").eq("user_id", user.id);
        for (const item of planned) {
            let isDone;
            if (item.type === "goal") {
                const g = (allGoals || []).find(x => x.name === item.text);
                if (!g) continue; // удалённая цель — больше не в счёте
                const stages = g.stages ?? 1;
                isDone = stages <= 1 ? g.done : (g.current_stage ?? 0) >= stages;
            } else {
                isDone = !!item.done;
            }
            if (item.bonus) {
                if (isDone) bonusPct += BONUS_PCT_PER_ITEM;
            } else if (settings.includePlanned) {
                total++;
                if (isDone) done++;
            }
        }
    }
    return { done, total, bonusPct };
}

// ---- Прогресс недели — по аналогии с днём, только сумма за 7 дней. Неделя считается
// с субботы по пятницу (личная настройка недели пользователя, не стандартная пн-вс).
function getWeekDates() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysSinceMonday = (today.getDay() + 6) % 7; // пн=0, вт=1, ... вс=6
    const start = new Date(today);
    start.setDate(today.getDate() - daysSinceMonday);
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        dates.push(fmtDate(d));
    }
    return dates;
}

async function computeWeekProgress() {
    const settings = getDayProgressSettings();
    if (!settings.enabled) return null;
    const dates = getWeekDates();
    const todayStr2 = fmtDate(new Date());
    const pastOrToday = dates.filter(d => d <= todayStr2); // будущие дни недели ещё не считаем
    let done = 0, total = 0, bonusPct = 0;

    if (settings.includeMetrics) {
        const metrics = await getMetrics();
        if (metrics.length > 0 && pastOrToday.length > 0) {
            const { data: values } = await sb.from("daily_values").select("*").eq("user_id", user.id).in("date", pastOrToday);
            const byDate = {};
            (values || []).forEach(v => { (byDate[v.date] ||= {})[v.metric_id] = v.value; });
            for (const dateStr of pastOrToday) {
                const byMetric = byDate[dateStr] || {};
                for (const m of metrics) {
                    total++;
                    if (isMetricDone(m, byMetric[m.id])) done++;
                }
            }
        }
    }

    if (pastOrToday.length > 0) {
        const { data: notes } = await sb.from("daily_notes").select("date, planned_goals").eq("user_id", user.id).in("date", pastOrToday);
        if (notes && notes.length > 0) {
            const { data: allGoals } = await sb.from("goals").select("*").eq("user_id", user.id);
            for (const note of notes) {
                for (const item of (note.planned_goals || [])) {
                    let isDone;
                    if (item.type === "goal") {
                        const g = (allGoals || []).find(x => x.name === item.text);
                        if (!g) continue;
                        const stages = g.stages ?? 1;
                        isDone = stages <= 1 ? g.done : (g.current_stage ?? 0) >= stages;
                    } else {
                        isDone = !!item.done;
                    }
                    if (item.bonus) {
                        if (isDone) bonusPct += BONUS_PCT_PER_ITEM;
                    } else if (settings.includePlanned) {
                        total++;
                        if (isDone) done++;
                    }
                }
            }
        }
    }
    return { done, total, bonusPct };
}

function openDayProgressSettingsModal(onSave) {
    const settings = getDayProgressSettings();
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `<h3>${t("dash_day_progress_settings_title")}</h3>`;

    function checkboxRow(labelText, checked) {
        const label = document.createElement("label");
        label.style.cssText = "display:flex; align-items:center; gap:8px; flex-direction:row;";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = checked;
        label.appendChild(cb);
        const span = document.createElement("span");
        span.textContent = labelText;
        span.style.cssText = "color:var(--text); font-size:1em; margin:0;";
        label.appendChild(span);
        modal.appendChild(label);
        return cb;
    }

    const enabledCb = checkboxRow(t("dash_day_progress_show"), settings.enabled);
    const plannedCb = checkboxRow(t("dash_day_progress_include_planned"), settings.includePlanned);
    const metricsCb = checkboxRow(t("dash_day_progress_include_metrics"), settings.includeMetrics);

    const modeLabel = document.createElement("label");
    modeLabel.style.cssText = "display:block; margin-top:14px; font-size:0.85em; color:var(--text-dim);";
    modeLabel.textContent = t("dash_day_progress_display_mode_label");
    const modeSelect = document.createElement("select");
    [
        { value: "avatar", label: t("dash_day_progress_mode_avatar") },
        { value: "header", label: t("dash_day_progress_mode_header") },
    ].forEach(opt => {
        const o = document.createElement("option");
        o.value = opt.value;
        o.textContent = opt.label;
        modeSelect.appendChild(o);
    });
    modeSelect.value = settings.displayMode;
    modeLabel.appendChild(modeSelect);
    modal.appendChild(modeLabel);
    enhanceSelectWithCustomDropdown(modeSelect);

    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "secondary";
    cancelBtn.textContent = t("cancel");
    cancelBtn.onclick = () => backdrop.remove();
    const okBtn = document.createElement("button");
    okBtn.textContent = t("save");
    okBtn.onclick = () => {
        setDayProgressSettings({ enabled: enabledCb.checked, includePlanned: plannedCb.checked, includeMetrics: metricsCb.checked, displayMode: modeSelect.value });
        backdrop.remove();
        onSave();
    };
    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);
    modal.appendChild(actions);
    backdrop.appendChild(modal);
    backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };
    document.body.appendChild(backdrop);
}

// loadProfile() дёргается из многих мест (галочки, звёздочки, автосейв метрик и т.д.) —
// без защиты от параллельного запуска два быстрых подряд вызова могли начать выполняться
// одновременно: первый уже успел очистить и начать заново наполнять карточку, а второй
// в этот момент тоже очищал её и добавлял своё — в итоге на странице оказывалось несколько
// копий блока профиля друг под другом. Гарантируем, что реально выполняется только один
// вызов за раз, а всё, что накопилось, пока шёл текущий — схлопывается в один повторный запуск.
let loadProfileRunning = false;
let loadProfileQueued = false;
async function loadProfile() {
    if (loadProfileRunning) { loadProfileQueued = true; return; }
    loadProfileRunning = true;
    try {
        await loadProfileInner();
    } finally {
        loadProfileRunning = false;
        if (loadProfileQueued) {
            loadProfileQueued = false;
            loadProfile();
        }
    }
}

async function loadProfileInner() {
    const card = document.getElementById("profile-card");
    if (!card) return; // блок скрыт в настройках дашборда
    const { data: profile } = await sb.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
    const { data: bodyParams } = await sb.from("body_parameters").select("*").eq("user_id", user.id).eq("active", true).order("position");
    const { data: allValues } = await sb.from("body_parameter_values").select("*").eq("user_id", user.id).order("date", { ascending: true });
    const { balance, total } = await calcBalance(user.id);

    card.innerHTML = "";

    const row = document.createElement("div");
    row.className = "stat-row";

    // Колонка: аватарка с кольцом прогресса дня + текст с процентом под ней.
    const avatarCol = document.createElement("div");
    avatarCol.style.cssText = "display:flex; flex-direction:column; align-items:center; gap:3px;";

    // Внешняя обёртка чуть больше самой аватарки — в ней рисуется кольцо прогресса дня
    // вокруг фото (пустое кольцо, если день не начат; при 100% — полная рамка).
    const avatarRingWrap = document.createElement("div");
    avatarRingWrap.style.cssText = "position:relative; width:52px; height:52px; flex-shrink:0;";

    const avatarWrap = document.createElement("div");
    avatarWrap.style.cssText = "position:absolute; top:4px; left:4px; width:44px; height:44px;";
    const avatarImg = document.createElement("img");
    avatarImg.src = profile?.avatar_url || "";
    avatarImg.style.cssText = "width:44px; height:44px; border-radius:50%; object-fit:cover; background:var(--bg); border:2px solid var(--border); display:" + (profile?.avatar_url ? "block" : "none") + ";";
    const avatarPlaceholder = document.createElement("div");
    avatarPlaceholder.textContent = "👤";
    avatarPlaceholder.style.cssText = "width:44px; height:44px; border-radius:50%; background:var(--bg); border:2px solid var(--border); display:flex; align-items:center; justify-content:center; font-size:1.3em;" + (profile?.avatar_url ? " display:none;" : "");
    avatarWrap.appendChild(avatarImg);
    avatarWrap.appendChild(avatarPlaceholder);

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.style.display = "none";
    fileInput.onchange = () => { if (fileInput.files[0]) uploadAvatar(fileInput.files[0]); };

    avatarWrap.style.cursor = "pointer";
    avatarWrap.title = t("dash_photo_btn");
    avatarWrap.onclick = () => fileInput.click();

    avatarRingWrap.appendChild(avatarWrap);

    // Кольцо прогресса дня вокруг аватарки: базовое кольцо (обычные пункты/метрики) плюс,
    // если есть выполненные бонусные (⭐) пункты — второй слой поверх другим цветом,
    // показывающий перевыполнение сверх 100%. Сама отрисовка вынесена в отдельную функцию
    // и держится в переменных модуля — чтобы при отметке пункта плана можно было обновить
    // только кольцо (refreshDayProgressRing), не перерисовывая всю карточку профиля.
    const ringHost = document.createElement("div");
    ringHost.style.cssText = "position:absolute; inset:0; pointer-events:none;";
    avatarRingWrap.appendChild(ringHost);

    const dayProgressText = document.createElement("div");
    dayProgressText.style.cssText = "font-size:0.72em; color:var(--text-dim); text-align:center; white-space:nowrap;";

    dayProgressRingWrapEl = avatarRingWrap;
    dayProgressRingHostEl = ringHost;
    dayProgressTextEl = dayProgressText;
    await renderDayProgressRing();

    const dayProgressGear = document.createElement("button");
    dayProgressGear.type = "button";
    dayProgressGear.textContent = "⚙️";
    dayProgressGear.title = t("dash_day_progress_settings_title");
    dayProgressGear.style.cssText = "position:absolute; bottom:-3px; right:-3px; width:19px; height:19px; min-height:0; box-sizing:border-box; border-radius:50%; background:var(--bg-card); border:1px solid var(--border); font-size:11px; line-height:1; display:flex; align-items:center; justify-content:center; padding:0; cursor:pointer;";
    dayProgressGear.onclick = (e) => { e.stopPropagation(); openDayProgressSettingsModal(loadProfile); };
    avatarRingWrap.appendChild(dayProgressGear);

    avatarCol.appendChild(avatarRingWrap);
    avatarCol.appendChild(dayProgressText);
    row.appendChild(avatarCol);

    weekProgressHostEl = document.createElement("div");
    row.appendChild(weekProgressHostEl);
    await renderWeekProgress();

    row.appendChild(fileInput);

    function openBirthdateModal() {
        openModal(t("dash_birthdate_title"), [
            { key: "birthdate", label: t("dash_birthdate_title"), type: "date", value: profile?.birthdate ?? "", min: "1900-01-01", max: todayStr() }
        ], async (res) => {
            if (res.birthdate && (res.birthdate < "1900-01-01" || res.birthdate > todayStr())) {
                showToast(t("dash_birthdate_range_error"), "error");
                return;
            }
            const { error } = await sb.from("profiles").upsert({ user_id: user.id, birthdate: res.birthdate });
            if (error) { showToast(t("dash_save_error_generic") + error.message, "error"); console.error(error); return; }
            loadProfile();
        });
    }

    // сначала собираем весь текстовый HTML одним куском — если делать это через несколько
    // "row.innerHTML +=" ПОСЛЕ добавления реальных элементов с обработчиками (аватар/возраст),
    // браузер пересоберёт весь DOM из текста и обработчики слетят
    let statsHtml = "";

    if (bodyParams && bodyParams.length && allValues && allValues.length) {
        // направление, которое считается "хорошим прогрессом" по цели из онбординга
        const wantsDown = profile?.goal_type === "lose_weight";
        const wantsUp = profile?.goal_type === "gain_muscle";

        for (const param of bodyParams) {
            const paramValues = allValues.filter(v => v.parameter_id === param.id && v.value != null);
            if (paramValues.length === 0) continue;

            const first = paramValues[0];
            const latest = paramValues[paramValues.length - 1];
            const prev = paramValues.length > 1 ? paramValues[paramValues.length - 2] : null;

            const sinceFirst = first.value != null ? (latest.value - first.value) : null;
            const sincePrev = prev?.value != null ? (latest.value - prev.value) : null;

            let color = "var(--text)";
            const nameLower = param.name.toLowerCase();
            if (sincePrev != null) {
                if ((nameLower.includes("вес") || nameLower.includes("weight")) && wantsDown) color = sincePrev < 0 ? "var(--success)" : (sincePrev > 0 ? "var(--danger)" : color);
                if ((nameLower.includes("вес") || nameLower.includes("weight")) && wantsUp) color = sincePrev > 0 ? "var(--success)" : (sincePrev < 0 ? "var(--danger)" : color);
                if (nameLower.includes("мыш") || nameLower.includes("muscle")) color = sincePrev > 0 ? "var(--success)" : (sincePrev < 0 ? "var(--danger)" : color);
            }

            const unit = param.unit ? (param.unit.startsWith("%") ? param.unit : " " + param.unit) : "";
            let text = `${param.icon} ${param.name}: ${latest.value}${unit}`;
            if (sinceFirst != null && Math.abs(sinceFirst) > 0.001) {
                const sign = sinceFirst > 0 ? "+" : "";
                text += ` <span style="color:${color};">(${sign}${sinceFirst.toFixed(1)}${unit})</span>`;
            }
            statsHtml += `<div>${text}</div>`;
        }
    }

    row.insertAdjacentHTML("beforeend", statsHtml);
    // Стрик — компактным бейджем в этой же строке (раньше был отдельным блоком на всю ширину).
    // Клик открывает детали по всем активным сериям, если их несколько. Держим в отдельном
    // хосте, чтобы обновлять бейдж точечно (после метрики/плана), не трогая всю карточку.
    streakBadgeHostEl = document.createElement("span");
    row.appendChild(streakBadgeHostEl);
    await renderStreakBadge(streakBadgeHostEl); // ждём перед балансом — иначе баланс (pinned right) успеет встать раньше и порядок съедет

    const balanceEl = document.createElement("div");
    balanceEl.className = "push-right";
    balanceEl.style.fontWeight = "bold";
    balanceEl.style.cursor = "pointer";
    balanceEl.title = t("dash_balance_click_hint");
    balanceEl.onclick = () => { window.location.href = "shop.html"; };
    balanceEl.textContent = `💰 ${balance}`;
    row.appendChild(balanceEl);

    // теперь добавляем возраст с кнопкой — уже после того, как весь текстовый HTML собран,
    // так что обработчик клика на кнопке больше никто не снесёт
    const ageSlot = document.createElement("div");
    if (profile?.birthdate) {
        const bd = new Date(profile.birthdate);
        const today = new Date();
        let age = today.getFullYear() - bd.getFullYear();
        if (today.getMonth() < bd.getMonth() || (today.getMonth() === bd.getMonth() && today.getDate() < bd.getDate())) age--;
        ageSlot.innerHTML = `🎂 ${formatAge(age)} `;
        const editAgeBtn = document.createElement("button");
        editAgeBtn.className = "secondary";
        editAgeBtn.textContent = "✏️";
        editAgeBtn.style.cssText = "padding:1px 6px; font-size:0.8em;";
        editAgeBtn.onclick = openBirthdateModal;
        ageSlot.appendChild(editAgeBtn);
    } else {
        const setBdBtn = document.createElement("button");
        setBdBtn.className = "secondary";
        setBdBtn.textContent = t("dash_set_birthdate_btn");
        setBdBtn.onclick = openBirthdateModal;
        ageSlot.appendChild(setBdBtn);
    }
    // вставляем возраст сразу после аватарки (после avatarWrap + fileInput, т.е. третьим элементом)
    row.insertBefore(ageSlot, row.children[2] || null);

    card.appendChild(row);
}

// ---- Виджет воды в шапке: стакан, который наполняется по ходу дня, быстрые кнопки
// добавления и дневная норма (из веса, если не задана вручную). Хранится как обычная
// метрика — специально ничего нового в базе не заводим, просто ищем метрику по имени/иконке
// (или предлагаем создать, если её ещё нет), значения — та же daily_values, что и у всех.
function findWaterMetric(metrics) {
    return (metrics || []).find(m => m.icon === "💧" || /вода|water/i.test(m.name || ""));
}

async function getAutoWaterNormMl() {
    const { data: params } = await sb.from("body_parameters").select("*").eq("user_id", user.id);
    const weightParam = (params || []).find(p => p.icon === "⚖️" || /вес|weight/i.test(p.name || ""));
    if (!weightParam) return null;
    const { data: values } = await sb.from("body_parameter_values").select("*").eq("user_id", user.id).eq("parameter_id", weightParam.id).order("date", { ascending: false }).limit(1);
    const weightKg = values?.[0]?.value;
    if (!weightKg) return null;
    return Math.round(weightKg * 30); // стандартная грубая формула — 30мл на кг веса
}

async function getTodayWaterMl(metric) {
    const { data } = await sb.from("daily_values").select("value").eq("user_id", user.id).eq("metric_id", metric.id).eq("date", fmtDate(new Date())).maybeSingle();
    return data?.value ?? 0;
}

async function addWaterMl(metric, deltaMl) {
    const current = await getTodayWaterMl(metric);
    const next = Math.max(0, current + deltaMl);
    await sb.from("daily_values").upsert({ user_id: user.id, metric_id: metric.id, date: fmtDate(new Date()), value: next }, { onConflict: "user_id,date,metric_id" });
    return next;
}

async function createWaterMetric() {
    const metrics = await getMetrics();
    const maxPos = metrics.reduce((mx, m) => Math.max(mx, m.position ?? 0), 0);
    const { data, error } = await sb.from("metrics").insert({
        user_id: user.id, name: t("dash_water_metric_name"), icon: "💧", unit: "мл", type: "number", position: maxPos + 1, active: true,
    }).select().single();
    if (error) { showToast(t("dash_save_error_generic") + error.message, "error"); console.error(error); return null; }
    return data;
}

function openWaterModal(metric, currentMl, normMl) {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `<h3>💧 ${t("dash_water_modal_title")}</h3>`;

    const amountP = document.createElement("p");
    amountP.style.cssText = "font-size:1.3em; font-weight:700; margin-top:10px;";
    modal.appendChild(amountP);

    const barOuter = document.createElement("div");
    barOuter.style.cssText = "background:var(--bg); border:1px solid var(--border); border-radius:8px; height:14px; overflow:hidden; margin-bottom:14px;";
    const barInner = document.createElement("div");
    barInner.style.cssText = "height:100%; background:#3b9ee5; transition:width 0.2s;";
    barOuter.appendChild(barInner);
    modal.appendChild(barOuter);

    function refreshLabel(ml) {
        const pct = normMl > 0 ? Math.min(100, Math.round(ml / normMl * 100)) : 0;
        amountP.textContent = `${ml} / ${normMl} мл (${pct}%)`;
        barInner.style.width = pct + "%";
    }
    refreshLabel(currentMl);

    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex; gap:8px; flex-wrap:wrap;";
    [200, 1000].forEach(ml => {
        const btn = document.createElement("button");
        btn.className = "secondary";
        btn.textContent = "+ " + (ml >= 1000 ? (ml / 1000) + " л" : ml + " мл");
        btn.onclick = async () => {
            const next = await addWaterMl(metric, ml);
            refreshLabel(next);
            renderWaterBadge();
        };
        btnRow.appendChild(btn);
    });
    const customBtn = document.createElement("button");
    customBtn.className = "secondary";
    customBtn.textContent = t("dash_water_add_custom_btn");
    customBtn.onclick = async () => {
        const val = prompt(t("dash_water_add_custom_prompt"));
        const ml = parseInt(val, 10);
        if (!ml || ml <= 0) return;
        const next = await addWaterMl(metric, ml);
        refreshLabel(next);
        renderWaterBadge();
    };
    btnRow.appendChild(customBtn);
    modal.appendChild(btnRow);

    const goalLabel = document.createElement("label");
    goalLabel.style.cssText = "display:block; margin-top:16px; font-size:0.85em; color:var(--text-dim);";
    goalLabel.textContent = t("dash_water_goal_label");
    const goalInput = document.createElement("input");
    goalInput.type = "number";
    goalInput.value = metric.goal_value ?? normMl;
    goalInput.style.width = "100%";
    goalLabel.appendChild(goalInput);
    modal.appendChild(goalLabel);
    const goalHint = document.createElement("p");
    goalHint.className = "dim";
    goalHint.style.cssText = "font-size:0.78em; margin-top:4px;";
    goalHint.textContent = metric.goal_value != null ? t("dash_water_goal_manual_hint") : t("dash_water_goal_auto_hint");
    modal.appendChild(goalHint);

    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const closeBtn = document.createElement("button");
    closeBtn.className = "secondary";
    closeBtn.textContent = t("dash_close_btn");
    closeBtn.onclick = () => backdrop.remove();
    const saveGoalBtn = document.createElement("button");
    saveGoalBtn.textContent = t("dash_water_goal_save_btn");
    saveGoalBtn.onclick = async () => {
        const ml = parseInt(goalInput.value, 10);
        if (!ml || ml <= 0) return;
        await sb.from("metrics").update({ goal_value: ml }).eq("id", metric.id);
        metric.goal_value = ml;
        refreshLabel(currentMl);
        renderWaterBadge();
        goalHint.textContent = t("dash_water_goal_manual_hint");
    };
    actions.appendChild(closeBtn);
    actions.appendChild(saveGoalBtn);
    modal.appendChild(actions);

    backdrop.appendChild(modal);
    backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };
    document.body.appendChild(backdrop);
}

async function renderWaterBadge() {
    const topbar = document.querySelector(".topbar");
    if (!topbar) return;

    const metrics = await getMetrics();
    const metric = findWaterMetric(metrics);

    // Переиспользуем уже существующую кнопку и меняем только содержимое — иначе при каждой
    // перерисовке она удалялась и вставала заново, и стакан "прыгал" по шапке.
    let badge = document.getElementById("water-badge");
    if (!badge) {
        badge = document.createElement("button");
        badge.type = "button";
        badge.id = "water-badge";
        badge.style.cssText = "background:transparent; border:none; cursor:pointer; flex-shrink:0; width:32px; height:32px; min-height:0; padding:0; display:flex; align-items:center; justify-content:center;";
        (document.getElementById("topbar-right") || topbar).appendChild(badge);
    }

    if (!metric) {
        badge.title = t("dash_water_setup_prompt");
        badge.innerHTML = '<span style="font-size:1.1em;">💧</span>';
        badge.onclick = async () => {
            const created = await createWaterMetric();
            if (created) { renderWaterBadge(); openWaterModal(created, 0, (await getAutoWaterNormMl()) || 2000); }
        };
        return;
    }

    const normMl = metric.goal_value ?? (await getAutoWaterNormMl()) ?? 2000;
    const currentMl = await getTodayWaterMl(metric);
    const pct = normMl > 0 ? Math.min(1, currentMl / normMl) : 0;
    const full = pct >= 1;
    // при 100% стакан становится золотым; цвет темы уже занят кружком прогресса, поэтому именно золото
    const fillColor = full ? "#f5b82e" : "#3b9ee5";
    const strokeColor = full ? "#f5b82e" : "var(--text-dim)";

    badge.title = `💧 ${currentMl} / ${normMl} мл`;
    // "стакан" — трапеция с заливкой снизу пропорционально проценту
    badge.innerHTML = `
        <svg width="20" height="24" viewBox="0 0 20 24" style="display:block;">
            <defs><clipPath id="water-clip"><rect x="2" y="${22 - pct * 20}" width="16" height="${pct * 20}"/></clipPath></defs>
            <path d="M3 2h14l-2 20H5L3 2z" fill="none" stroke="${strokeColor}" stroke-width="1.6" stroke-linejoin="round"/>
            <path d="M3 2h14l-2 20H5L3 2z" fill="${fillColor}" clip-path="url(#water-clip)"/>
        </svg>`;
    badge.onclick = () => openWaterModal(metric, currentMl, normMl);
}

async function getMetrics() {
    const { data } = await sb.from("metrics").select("*").eq("user_id", user.id).eq("active", true).order("position");
    return data || [];
}

// Небольшая зелёная вспышка рамки поля — подтверждение, что автосохранение сработало
function flashSaved(el) {
    el.classList.add("saved-flash");
    setTimeout(() => el.classList.remove("saved-flash"), 900);
}

async function renderDay() {
    if (!document.getElementById("daily-card")) return; // блок скрыт в настройках дашборда
    const dateStr = fmtDate(currentDate);
    document.getElementById("day-label").textContent = currentDate.toLocaleDateString(getLang() === "en" ? "en-US" : "ru-RU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const metrics = await getMetrics();
    const { data: values } = await sb.from("daily_values").select("*").eq("user_id", user.id).eq("date", dateStr);
    const valueByMetric = {};
    (values || []).forEach(v => valueByMetric[v.metric_id] = v.value);

    const bodyParams = await getBodyParameters();
    const { data: paramValues } = await sb.from("body_parameter_values").select("*").eq("user_id", user.id).eq("date", dateStr);
    const pendingBody = {}; // parameter_id -> значение
    bodyParams.forEach(p => {
        const existing = (paramValues || []).find(v => v.parameter_id === p.id);
        pendingBody[p.id] = existing?.value ?? null;
    });

    const { data: existingNote } = await sb.from("daily_notes").select("*").eq("user_id", user.id).eq("date", dateStr).maybeSingle();
    let itemsValue = existingNote?.items ?? [];

    const card = document.getElementById("daily-card");
    card.innerHTML = "";

    const pending = {}; // metric_id -> value being edited
    // для number: если на этот день ещё ничего не сохранено — оставляем undefined (пусто в поле,
    // "0" только как плейсхолдер), чтобы не приходилось стирать 0 перед вводом своего значения.
    // Если значение уже сохранено (в т.ч. настоящий 0) — показываем его.
    metrics.forEach(m => pending[m.id] = valueByMetric[m.id] ?? ((m.type === "multiselect" || m.type === "sets") ? [] : m.type === "boolean" ? false : undefined));

    // Автосохранение: срабатывает сразу при уходе с поля (blur/change), а не только по кнопке
    // "Сохранить день" — быстрее переходить от одной метрики к другой, не боясь потерять ввод.
    async function autoSaveMetric(m, value, inputEl) {
        const { error } = await sb.from("daily_values").upsert({
            user_id: user.id, date: dateStr, metric_id: m.id, value
        }, { onConflict: "user_id,date,metric_id" });
        if (error) {
            showToast(t("dash_metric_save_error") + m.name + "»: " + error.message, "error");
            console.error(error);
            return;
        }
        if (inputEl) flashSaved(inputEl);
        renderScore(metrics, pending);
        pushPointToChart("metric:" + m.id, dateStr, metricNumericValue(m, value)); // обновить график точечно, без мигания всего блока
        if (dateStr === fmtDate(new Date())) { renderDayProgressRing(); renderWeekProgress(); refreshStreakBadge(); } // кольцо прогресса дня на аватарке — сразу же, без ожидания обновления страницы
    }

    async function autoSaveBodyParam(p, value, inputEl) {
        if (value == null) return; // пустое поле — не измерялось, писать нечего
        const { error } = await sb.from("body_parameter_values").upsert({
            user_id: user.id, date: dateStr, parameter_id: p.id, value
        }, { onConflict: "user_id,date,parameter_id" });
        if (error) {
            showToast(t("dash_metric_save_error") + p.name + "»: " + error.message, "error");
            console.error(error);
            return;
        }
        if (inputEl) flashSaved(inputEl);
        pushPointToChart("body:" + p.id, dateStr, value); // обновить график точечно, без мигания всего блока
        loadProfile(); // на профиле тоже показана свежая цифра параметра тела (динамика с начала/с прошлого раза)
    }

    const grid = document.createElement("div");
    grid.className = "field-grid";

function makeGearBtn(m) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "⚙️";
    btn.className = "gear-btn";
    btn.title = t("dash_gear_configure_metric_title");
    btn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); editMetric(m); };
    return btn;
}

// Метрика-раскладушка типа "sets" — например "Отжимания": список подходов, у каждого
// количество раз и, необязательно, особенность (положение рук и т.п.). Хранится в
// daily_values.value как jsonb-массив [{reps, variation}, ...] — колонка и так jsonb,
// новых миграций для этого типа метрики не потребовалось.
function renderSetsMetric(m) {
    const box = document.createElement("div");
    box.className = "card";
    box.style.marginBottom = "14px";

    // Особенность подхода (например "широкий хват") — своя мини-подсказка вместо нативного
    // <datalist>: показываем список при фокусе/вводе, с иконкой ✕ у каждого варианта, чтобы
    // можно было сразу удалить случайно/неверно введённый вариант, а не лезть в ⚙️ метрики.
    async function rememberVariation(text) {
        if (!text) return;
        const known = new Set((m.options || []).map(o => (o.label || o.key || "").toLowerCase()));
        if (known.has(text.toLowerCase())) return;
        const newOptions = [...(m.options || []), { key: text, label: text }];
        const { error } = await sb.from("metrics").update({ options: newOptions }).eq("id", m.id);
        if (error) { console.error(error); return; } // тихо — это фоновая подсказка, не критично, если не сохранилась
        m.options = newOptions;
    }

    async function forgetVariation(labelToRemove) {
        const newOptions = (m.options || []).filter(o => (o.label || o.key) !== labelToRemove);
        const { error } = await sb.from("metrics").update({ options: newOptions }).eq("id", m.id);
        if (error) { showToast(t("dash_save_error_generic") + error.message, "error"); console.error(error); return; }
        m.options = newOptions;
    }

    // Комбобокс "особенность подхода": текстовое поле + своя выпадашка вместо datalist
    function buildVariationCombo(s, onPersist) {
        const wrap = document.createElement("div");
        wrap.className = "variation-combo";

        const varInput = document.createElement("input");
        varInput.type = "text";
        varInput.placeholder = t("dash_sets_variation_placeholder");
        varInput.value = s.variation ?? "";
        wrap.appendChild(varInput);

        const arrowBtn = document.createElement("button");
        arrowBtn.type = "button";
        arrowBtn.className = "variation-combo-arrow";
        arrowBtn.textContent = "▾";
        arrowBtn.tabIndex = -1;
        arrowBtn.title = t("dash_sets_variation_show_all_title");
        wrap.appendChild(arrowBtn);

        const dropdown = document.createElement("div");
        dropdown.className = "variation-dropdown";
        document.body.appendChild(dropdown);

        function renderDropdown(showAll) {
            dropdown.innerHTML = "";
            const query = showAll ? "" : varInput.value.trim().toLowerCase();
            const matches = (m.options || []).filter(o => (o.label || o.key || "").toLowerCase().includes(query));
            if (matches.length === 0) { dropdown.classList.remove("open"); return; }
            matches.forEach(o => {
                const label = o.label || o.key;
                const item = document.createElement("div");
                item.className = "variation-option";

                const text = document.createElement("span");
                text.textContent = label;
                text.className = "variation-option-text";
                text.onmousedown = (e) => {
                    e.preventDefault();
                    varInput.value = label;
                    dropdown.classList.remove("open");
                    s.variation = label;
                    onPersist();
                };
                item.appendChild(text);

                const del = document.createElement("button");
                del.type = "button";
                del.className = "variation-option-remove";
                del.textContent = "✕";
                del.title = t("dash_sets_variation_remove_title");
                del.onmousedown = async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    await forgetVariation(label);
                    renderDropdown(showAll);
                };
                item.appendChild(del);

                dropdown.appendChild(item);
            });
            positionFloatingPanel(varInput, dropdown);
            dropdown.classList.add("open");
        }

        varInput.oninput = () => renderDropdown(false);
        varInput.onfocus = () => renderDropdown(false);
        varInput.onblur = () => setTimeout(() => dropdown.classList.remove("open"), 150);
        varInput.onchange = () => {
            const text = varInput.value.trim();
            s.variation = text || null;
            onPersist();
            rememberVariation(text);
        };
        arrowBtn.onmousedown = (e) => {
            e.preventDefault();
            if (dropdown.classList.contains("open")) {
                dropdown.classList.remove("open");
            } else {
                renderDropdown(true);
                varInput.focus();
            }
        };

        return wrap;
    }

    const headerRow = document.createElement("div");
    headerRow.style.cssText = "display:flex; align-items:center; gap:8px;";
    const title = document.createElement("strong");
    title.textContent = `${m.icon} ${m.name}`;
    headerRow.appendChild(title);
    headerRow.appendChild(makeGearBtn(m));

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "secondary";
    toggleBtn.style.cssText = "margin-left:auto; padding:2px 10px; font-size:0.85em;";
    headerRow.appendChild(toggleBtn);
    box.appendChild(headerRow);

    const summary = document.createElement("div");
    summary.className = "dim";
    summary.style.cssText = "font-size:0.85em; margin:4px 0 0;";
    box.appendChild(summary);

    const body = document.createElement("div");
    body.style.marginTop = "8px";
    box.appendChild(body);

    let sets = Array.isArray(pending[m.id]) ? pending[m.id] : [];
    let open = sets.length > 0; // если уже что-то есть за сегодня — сразу видно, иначе свёрнуто

    function updateSummary() {
        summary.textContent = sets.length === 0
            ? t("dash_sets_empty")
            : `${sets.length} ${t("dash_sets_word")} · ${sets.reduce((sum, s) => sum + (s.reps || 0), 0)} ${t("dash_sets_reps_word")}`;
    }
    updateSummary();

    function persist() {
        pending[m.id] = sets;
        updateSummary();
        autoSaveMetric(m, sets);
    }

    function renderBody() {
        body.innerHTML = "";
        body.style.display = open ? "block" : "none";
        toggleBtn.textContent = open ? "▼" : "▶";

        if (sets.length > 0) {
            const table = document.createElement("table");
            sets.forEach((s, i) => {
                const row = table.insertRow();
                row.insertCell().textContent = `${i + 1}`;

                const repsCell = row.insertCell();
                const repsInput = document.createElement("input");
                repsInput.type = "number";
                repsInput.step = "any";
                repsInput.style.width = "70px";
                repsInput.placeholder = t("dash_sets_reps_placeholder");
                repsInput.value = s.reps ?? "";
                repsInput.onchange = () => { s.reps = repsInput.value === "" ? null : (parseFloat(repsInput.value) || 0); persist(); };
                repsCell.appendChild(repsInput);

                const varCell = row.insertCell();
                const combo = buildVariationCombo(s, persist);
                varCell.appendChild(combo);

                const delCell = row.insertCell();
                const delBtn = document.createElement("button");
                delBtn.type = "button";
                delBtn.className = "danger";
                delBtn.textContent = "✕";
                delBtn.style.padding = "2px 8px";
                delBtn.onclick = () => { sets.splice(i, 1); persist(); renderBody(); };
                delCell.appendChild(delBtn);

                table.appendChild(row);
            });
            body.appendChild(wrapTable(table));
        }

        const addBtn = document.createElement("button");
        addBtn.type = "button";
        addBtn.className = "secondary";
        addBtn.textContent = t("dash_sets_add_btn");
        addBtn.onclick = () => {
            sets.push({ reps: null, variation: null });
            open = true;
            persist();
            renderBody();
            const lastInput = body.querySelector("table tr:last-child input[type=number]");
            if (lastInput) lastInput.focus();
        };
        body.appendChild(addBtn);
    }

    toggleBtn.onclick = () => { open = !open; renderBody(); };
    renderBody();

    return box;
}

for (const m of metrics) {
    if (m.type === "number") {
        const wrap = document.createElement("div");
        wrap.style.cssText = "display:flex; flex-direction:column; gap:4px;";
        const labelRow = document.createElement("div");
        labelRow.style.cssText = "display:flex; align-items:center; gap:6px; flex-wrap:wrap;";
        const labelText = document.createElement("span");
        labelText.className = "dim";
        labelText.style.fontSize = "0.85em";
        labelText.textContent = `${m.icon} ${m.name}${m.unit ? " (" + m.unit + ")" : ""}`;
        labelRow.appendChild(labelText);

        const isAddMode = m.input_mode === "add";
        let totalLabel = null;

        labelRow.appendChild(makeGearBtn(m));

        if (isAddMode) {
            const totalRow = document.createElement("div");
            totalRow.style.cssText = "display:flex; align-items:center; gap:4px; height:22px;";

            totalLabel = document.createElement("span");
            totalLabel.style.cssText = "font-size:0.85em; font-weight:bold; white-space:nowrap;";
            totalLabel.textContent = `${t("dash_metric_current_total")} ${pending[m.id] ?? 0}`;
            totalRow.appendChild(totalLabel);

            // Опечатался при прибавлении — карандаш даёт поправить итог напрямую, минуя логику
            // "прибавить дельту" (без этого в режиме "прибавлять" исправить ошибку было нечем).
            const fixBtn = document.createElement("button");
            fixBtn.type = "button";
            fixBtn.className = "secondary";
            fixBtn.textContent = "✏️";
            fixBtn.title = t("dash_metric_fix_total_title");
            fixBtn.style.cssText = "padding:1px 6px; font-size:0.75em; min-height:0; line-height:1.4; flex-shrink:0;";
            fixBtn.onclick = () => {
                const current = pending[m.id] ?? 0;
                const raw = window.prompt(t("dash_metric_fix_total_prompt"), current);
                if (raw === null) return; // отмена
                const fixed = parseFloat(raw);
                if (isNaN(fixed)) return;
                pending[m.id] = fixed;
                totalLabel.textContent = `${t("dash_metric_current_total")} ${fixed}`;
                totalLabel.style.color = "var(--success)";
                setTimeout(() => { totalLabel.style.color = ""; }, 900);
                autoSaveMetric(m, fixed, null);
            };
            totalRow.appendChild(fixBtn);
            wrap.appendChild(labelRow);
            wrap.appendChild(totalRow);
        } else {
            wrap.appendChild(labelRow);
            // невидимый плейсхолдер той же высоты, что и строка "Итого" у метрик в режиме
            // "прибавлять" — чтобы поля ввода у всех метрик в сетке были на одном уровне,
            // а не вразнобой из-за того, что у одних есть доп. строка, а у других нет
            const spacer = document.createElement("div");
            spacer.style.height = "22px";
            wrap.appendChild(spacer);
        }

        const input = document.createElement("input");
        input.type = "number";
        input.step = "any";
        input.placeholder = isAddMode ? t("dash_metric_add_placeholder") : "0";
        input.value = isAddMode ? "" : (pending[m.id] ?? "");

        function commitAdd() {
            const delta = parseFloat(input.value);
            input.value = ""; // очищаем сразу — поле готово для следующего прибавления
            if (!delta) return;
            pending[m.id] = (pending[m.id] ?? 0) + delta;
            if (totalLabel) totalLabel.textContent = `${t("dash_metric_current_total")} ${pending[m.id]}`;
            autoSaveMetric(m, pending[m.id] ?? 0, input);
        }

        input.onchange = () => {
            if (isAddMode) {
                commitAdd();
            } else {
                pending[m.id] = input.value === "" ? undefined : (parseFloat(input.value) || 0);
                autoSaveMetric(m, pending[m.id] ?? 0, input);
            }
        };

        if (isAddMode) {
            // явная кнопка "+" рядом с полем — на всякий случай, если переход на другое поле
            // или Enter неудобны (например, это последнее поле на экране телефона)
            const addValueBtn = document.createElement("button");
            addValueBtn.type = "button";
            addValueBtn.textContent = "+";
            addValueBtn.title = t("dash_metric_add_btn_title");
            addValueBtn.style.cssText = "padding:0 12px; min-height:0; flex-shrink:0;";
            addValueBtn.onclick = commitAdd;

            const inputRow = document.createElement("div");
            inputRow.style.cssText = "display:flex; gap:6px;";
            input.style.flex = "1";
            inputRow.appendChild(input);
            inputRow.appendChild(addValueBtn);
            wrap.appendChild(inputRow);
        } else {
            wrap.appendChild(input);
        }
        grid.appendChild(wrap);
    }
}
card.appendChild(grid);

for (const m of metrics) {
    if (m.type === "boolean") {
        const row = document.createElement("div");
        row.style.cssText = "display:flex; align-items:center; gap:8px; margin-bottom:10px;";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = !!pending[m.id];
        cb.onchange = () => {
            pending[m.id] = cb.checked;
            autoSaveMetric(m, pending[m.id]);
        };
        const labelSpan = document.createElement("span");
        labelSpan.textContent = `${m.icon} ${m.name}`;
        row.appendChild(cb);
        row.appendChild(labelSpan);
        row.appendChild(makeGearBtn(m));
        card.appendChild(row);
    }
}

for (const m of metrics) {
    if (m.type === "multiselect") {
        const wrap = document.createElement("div");
        wrap.style.marginBottom = "14px";
        const wLabel = document.createElement("div");
        wLabel.style.cssText = "display:flex; align-items:center; gap:6px; margin-bottom:6px;";
        const labelText = document.createElement("span");
        labelText.className = "dim";
        labelText.textContent = `${m.icon} ${m.name}:`;
        wLabel.appendChild(labelText);
        wLabel.appendChild(makeGearBtn(m));
        wrap.appendChild(wLabel);
        const opts = Array.isArray(m.options) ? m.options : [];
        for (const opt of opts) {
            const btn = document.createElement("button");
            btn.className = "pill" + (pending[m.id].includes(opt.key) ? " selected" : "");
            btn.textContent = opt.label;
            btn.style.cssText = "margin:0 6px 6px 0;";
            btn.onclick = () => {
                if (pending[m.id].includes(opt.key)) pending[m.id] = pending[m.id].filter(k => k !== opt.key);
                else pending[m.id] = [...pending[m.id], opt.key];
                btn.classList.toggle("selected");
                autoSaveMetric(m, pending[m.id]);
            };
            wrap.appendChild(btn);
        }
        card.appendChild(wrap);
    }
}

for (const m of metrics) {
    if (m.type === "sets") {
        card.appendChild(renderSetsMetric(m));
    }
}

    const bodyGrid = document.createElement("div");
    bodyGrid.className = "field-grid";
    for (const p of bodyParams) {
        const wrap = document.createElement("div");
        wrap.style.cssText = "display:flex; flex-direction:column; gap:4px;";
        const labelRow = document.createElement("div");
        labelRow.style.cssText = "display:flex; align-items:center; gap:6px;";
        const labelText = document.createElement("span");
        labelText.className = "dim";
        labelText.style.fontSize = "0.85em";
        labelText.textContent = `${p.icon} ${p.name}${p.unit ? " (" + p.unit + ")" : ""}`;
        labelRow.appendChild(labelText);
        const gearBtn = document.createElement("button");
        gearBtn.type = "button";
        gearBtn.textContent = "⚙️";
        gearBtn.className = "gear-btn";
        gearBtn.title = t("dash_gear_configure_param_title");
        gearBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); editBodyParameter(p); };
        labelRow.appendChild(gearBtn);
        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.textContent = "🗑";
        delBtn.className = "gear-btn";
        delBtn.title = t("dash_gear_delete_param_title");
        delBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); deleteBodyParameter(p); };
        labelRow.appendChild(delBtn);
        const input = document.createElement("input");
        input.type = "number";
        input.step = "0.1";
        input.value = pendingBody[p.id] ?? "";
        input.placeholder = t("dash_measured_placeholder");
        input.onchange = () => {
            pendingBody[p.id] = input.value === "" ? null : parseFloat(input.value);
            autoSaveBodyParam(p, pendingBody[p.id], input);
        };
        wrap.appendChild(labelRow);
        wrap.appendChild(input);
        bodyGrid.appendChild(wrap);
    }
    card.appendChild(bodyGrid);

    const addParamBtn = document.createElement("button");
    addParamBtn.className = "secondary";
    addParamBtn.textContent = t("dash_add_body_param_btn");
    addParamBtn.style.marginBottom = "14px";
    addParamBtn.onclick = addBodyParameter;
    card.appendChild(addParamBtn);

    const itemsWrap = document.createElement("div");
    itemsWrap.style.marginBottom = "14px";
    const itemsTitle = document.createElement("div");
    itemsTitle.textContent = t("dash_useful_today_title");
    itemsTitle.style.marginBottom = "6px";
    itemsWrap.appendChild(itemsTitle);

    const itemsList = document.createElement("div");
    itemsWrap.appendChild(itemsList);

    async function persistItems() {
        await sb.from("daily_notes").upsert({
            user_id: user.id, date: dateStr, items: itemsValue, planned_goals: existingNote?.planned_goals ?? []
        }, { onConflict: "user_id,date" });
    }

    function renderItemsList() {
        itemsList.innerHTML = "";
        if (itemsValue.length === 0) {
            const empty = document.createElement("p");
            empty.className = "dim";
            empty.style.cssText = "margin:0 0 8px; font-size:0.9em;";
            empty.textContent = t("dash_useful_today_empty");
            itemsList.appendChild(empty);
        }
        itemsValue.forEach((item, idx) => {
            const row = document.createElement("div");
            row.style.cssText = "display:flex; align-items:center; gap:8px; padding:4px 0;";
            const bullet = document.createElement("span");
            bullet.textContent = "• " + item;
            bullet.style.flex = "1";
            row.appendChild(bullet);
            const delBtn = document.createElement("button");
            delBtn.className = "danger";
            delBtn.textContent = "✕";
            delBtn.style.padding = "2px 8px";
            delBtn.onclick = async () => {
                itemsValue = itemsValue.filter((_, i) => i !== idx);
                await persistItems();
                renderItemsList();
            };
            row.appendChild(delBtn);
            itemsList.appendChild(row);
        });
    }
    renderItemsList();

    const addRow = document.createElement("div");
    addRow.style.cssText = "display:flex; gap:8px; margin-top:6px;";
    const addInput = document.createElement("input");
    addInput.type = "text";
    addInput.placeholder = t("dash_useful_today_placeholder");
    addInput.style.flex = "1";
    const addBtn = document.createElement("button");
    addBtn.className = "secondary";
    addBtn.textContent = t("add_btn");
    async function addItemToList() {
        const text = addInput.value.trim();
        if (!text) return;
        itemsValue = [...itemsValue, text];
        addInput.value = "";
        await persistItems();
        renderItemsList();
    }
    addBtn.onclick = addItemToList;
    addInput.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); addItemToList(); } };
    addRow.appendChild(addInput);
    addRow.appendChild(addBtn);
    itemsWrap.appendChild(addRow);

    card.appendChild(itemsWrap);

    const saveBtn = document.createElement("button");
    saveBtn.textContent = t("dash_save_day_btn");
    saveBtn.onclick = async () => {
        saveBtn.disabled = true;
        const originalText = saveBtn.textContent;
        saveBtn.textContent = t("dash_saving_btn");

        for (const m of metrics) {
            const valueToSave = m.type === "number" ? (pending[m.id] ?? 0) : pending[m.id];
            const { error } = await sb.from("daily_values").upsert({
                user_id: user.id, date: dateStr, metric_id: m.id, value: valueToSave
            }, { onConflict: "user_id,date,metric_id" });
            if (error) {
                showToast(t("dash_metric_save_error") + m.name + "»: " + error.message, "error");
                console.error(error);
                saveBtn.disabled = false;
                saveBtn.textContent = originalText;
                return;
            }
        }

        for (const p of bodyParams) {
            if (pendingBody[p.id] == null) continue; // не измерялось — не пишем пустое значение
            const { error } = await sb.from("body_parameter_values").upsert({
                user_id: user.id, date: dateStr, parameter_id: p.id, value: pendingBody[p.id]
            }, { onConflict: "user_id,date,parameter_id" });
            if (error) {
                showToast(t("dash_metric_save_error") + p.name + "»: " + error.message, "error");
                console.error(error);
                saveBtn.disabled = false;
                saveBtn.textContent = originalText;
                return;
            }
        }

        await persistItems();
        loadProfile();
        loadCharts();
        renderScore(metrics, pending);
        showToast(t("dash_day_saved_toast"));
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    };
    card.appendChild(saveBtn);

    const scoreBox = document.createElement("div");
    scoreBox.className = "card";
    scoreBox.style.marginTop = "14px";
    scoreBox.id = "score-box";
    card.appendChild(scoreBox);
    renderScore(metrics, pending);

    renderPlanned(dateStr);
}

function renderScore(metrics, pending) {
    const box = document.getElementById("score-box");
    if (!box) return;
    let points = 0;
    for (const m of metrics) if (isMetricDone(m, pending[m.id])) points++;
    box.innerHTML = `<strong>${t("dash_score_label")} ${points} / ${metrics.length}</strong>`;
}

// ---- Настройка метрик ----

async function getMetricCategories() {
    const { data } = await sb.from("metric_categories").select("*").order("label_ru");
    return data || [];
}

async function resolveCategoryId(rawValue) {
    if (!rawValue) return null;
    if (rawValue !== "__new__") return rawValue;
    const newLabel = window.prompt(t("dash_new_category_prompt"));
    if (!newLabel?.trim()) return null;
    const key = newLabel.trim().toLowerCase().replace(/[^a-z0-9а-яё]+/gi, "_").slice(0, 30) + "_" + Date.now().toString(36);
    const { data, error } = await sb.from("metric_categories")
        .insert({ key, label_en: newLabel.trim(), label_ru: newLabel.trim(), created_by: user.id })
        .select().single();
    if (error) { alert(t("dash_category_create_error") + error.message); return null; }
    return data.id;
}

function openMetricFormModal(existing, categoryOptions, onSubmit) {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `<h3>${existing ? t("dash_metric_form_title_edit") : t("dash_metric_form_title_new")}</h3>`;

    function field(labelText, input) {
        const label = document.createElement("label");
        const labelSpan = document.createElement("span");
        labelSpan.textContent = labelText;
        label.appendChild(labelSpan);
        label.appendChild(input);
        modal.appendChild(label);
        input._labelSpan = labelSpan; // чтобы можно было поменять подпись поля динамически (см. applyTypeState)
        return input;
    }

    const nameInput = field(t("dash_metric_field_name"), Object.assign(document.createElement("input"), { type: "text", value: existing?.name ?? "" }));
    const iconInput = field(t("dash_metric_field_icon"), Object.assign(document.createElement("input"), { type: "text", value: existing?.icon ?? "📌" }));

    const typeSelect = document.createElement("select");
    [["number", t("dash_metric_type_number")], ["boolean", t("dash_metric_type_boolean")], ["multiselect", t("dash_metric_type_multiselect")], ["sets", t("dash_metric_type_sets")]]
        .forEach(([v, l]) => { const o = document.createElement("option"); o.value = v; o.textContent = l; typeSelect.appendChild(o); });
    typeSelect.value = existing?.type ?? "number";
    field(t("dash_metric_field_type"), typeSelect);
    enhanceSelectWithCustomDropdown(typeSelect);

    const goalDirSelect = document.createElement("select");
    [["at_least", t("dash_goal_dir_at_least")], ["at_most", t("dash_goal_dir_at_most")]].forEach(([v, l]) => { const o = document.createElement("option"); o.value = v; o.textContent = l; goalDirSelect.appendChild(o); });
    goalDirSelect.value = existing?.goal_direction ?? "at_least";
    field(t("dash_metric_field_goal_dir"), goalDirSelect);

    const goalValueInput = field(t("dash_metric_field_goal_value"), Object.assign(document.createElement("input"), { type: "number", value: existing?.goal_value ?? 0 }));
    const unitInput = field(t("dash_metric_field_unit"), Object.assign(document.createElement("input"), { type: "text", value: existing?.unit ?? "" }));
    const optionsInput = field(t("dash_metric_field_options"), Object.assign(document.createElement("input"), {
        type: "text", value: (existing?.options || []).map(o => `${o.key}:${o.label}`).join(", ")
    }));

    const inputModeSelect = document.createElement("select");
    [["set", t("dash_metric_input_mode_set")], ["add", t("dash_metric_input_mode_add")]].forEach(([v, l]) => { const o = document.createElement("option"); o.value = v; o.textContent = l; inputModeSelect.appendChild(o); });
    inputModeSelect.value = existing?.input_mode ?? "set";
    field(t("dash_metric_field_input_mode"), inputModeSelect);

    const catSelect = document.createElement("select");
    categoryOptions.forEach(c => { const o = document.createElement("option"); o.value = c.value; o.textContent = c.label; catSelect.appendChild(o); });
    catSelect.value = existing?.category_id ?? "";
    field(t("dash_metric_field_category"), catSelect);

    function applyTypeState() {
        const type = typeSelect.value;
        const goalFields = [goalDirSelect, goalValueInput, unitInput];
        const goalApplies = type === "number" || type === "sets"; // у "Подходов" цель/единица тоже нужны — считаются по сумме reps
        goalFields.forEach(el => el.disabled = !goalApplies);
        inputModeSelect.disabled = type !== "number"; // "прибавлять/перезаписывать" имеет смысл только у обычного числа — подходы и так по своей природе прибавляются
        optionsInput.disabled = (type !== "multiselect" && type !== "sets");
        [...goalFields, inputModeSelect, optionsInput].forEach(el => el.style.opacity = el.disabled ? "0.4" : "1");
        optionsInput._labelSpan.textContent = type === "sets" ? t("dash_metric_field_variations") : t("dash_metric_field_options");
        if (type === "boolean") {
            goalValueInput.value = "";
            unitInput.value = "";
            optionsInput.value = "";
        }
    }
    typeSelect.onchange = applyTypeState;
    applyTypeState();

    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "secondary";
    cancelBtn.textContent = t("cancel");
    cancelBtn.onclick = () => backdrop.remove();
    const okBtn = document.createElement("button");
    okBtn.textContent = t("save");
    okBtn.onclick = async () => {
        if (!nameInput.value.trim()) return;
        backdrop.remove();
        await onSubmit({
            name: nameInput.value.trim(),
            icon: iconInput.value || "📌",
            type: typeSelect.value,
            goal_direction: goalDirSelect.value,
            goal_value: parseFloat(goalValueInput.value) || 0,
            unit: unitInput.value,
            options_raw: optionsInput.value,
            category_id: catSelect.value,
            input_mode: inputModeSelect.value,
        });
    };
    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);
    modal.appendChild(actions);

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    nameInput.focus();
}

function parseOptionsRaw(raw) {
    if (!raw?.trim()) return [];
    return raw.split(",").map(s => s.trim()).filter(Boolean).map(pair => {
        const [key, ...rest] = pair.split(":");
        return { key: key.trim(), label: (rest.join(":").trim() || key.trim()) };
    });
}

async function addMetric(onDone) {
    const categories = await getMetricCategories();
    const categoryOptions = [
        { value: "", label: t("dash_category_none") },
        ...categories.map(c => ({ value: c.id, label: `${c.label_ru} / ${c.label_en}` })),
        { value: "__new__", label: t("dash_category_new") },
    ];
    openMetricFormModal(null, categoryOptions, async (res) => {
        const categoryId = await resolveCategoryId(res.category_id);
        const { data: existing } = await sb.from("metrics").select("position").eq("user_id", user.id).order("position", { ascending: false }).limit(1);
        const position = (existing?.[0]?.position ?? -1) + 1;
        const { error } = await sb.from("metrics").insert({
            user_id: user.id, name: res.name, icon: res.icon, type: res.type,
            goal_direction: res.goal_direction, goal_value: res.goal_value, unit: res.unit,
            options: parseOptionsRaw(res.options_raw), position, active: true, category_id: categoryId,
            input_mode: res.input_mode
        });
        if (error) { showToast(t("dash_save_error_generic") + error.message, "error"); console.error(error); return; }
        renderDay();
        loadCharts();
        if (onDone) onDone(); else openMetricsManagerModal();
    });
}

async function editMetric(m, onDone) {
    const categories = await getMetricCategories();
    const categoryOptions = [
        { value: "", label: t("dash_category_none") },
        ...categories.map(c => ({ value: c.id, label: `${c.label_ru} / ${c.label_en}` })),
        { value: "__new__", label: t("dash_category_new") },
    ];
    openMetricFormModal(m, categoryOptions, async (res) => {
        const categoryId = await resolveCategoryId(res.category_id);
        const { error } = await sb.from("metrics").update({
            name: res.name, icon: res.icon, type: res.type,
            goal_direction: res.goal_direction, goal_value: res.goal_value, unit: res.unit,
            options: parseOptionsRaw(res.options_raw), category_id: categoryId,
            input_mode: res.input_mode
        }).eq("id", m.id);
        if (error) { showToast(t("dash_save_error_generic") + error.message, "error"); console.error(error); return; }
        renderDay();
        loadCharts();
        if (onDone) onDone();
    });
}

async function deleteMetric(m) {
    if (!confirm(t("dash_delete_metric_confirm").replace("{name}", m.name))) return;
    const { error } = await sb.from("metrics").delete().eq("id", m.id);
    if (error) { showToast(t("dash_delete_error_generic") + error.message, "error"); console.error(error); return; }
    renderDay();
    loadCharts();
    openMetricsManagerModal();
}

// Менеджер метрик — открывается во всплывающем окне, а не занимает место на странице
async function openMetricsManagerModal() {
    document.querySelectorAll(".modal-backdrop").forEach(el => el.remove()); // закрыть предыдущее, если было

    const metrics = await getMetrics();

    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.style.width = "480px";
    modal.innerHTML = `<h3>${t("dash_metrics_manager_title")}</h3>`;

    if (metrics.length === 0) {
        modal.innerHTML += `<p class="dim">${t("dash_metrics_manager_empty")}</p>`;
    } else {
        const table = document.createElement("table");
        for (const m of metrics) {
            const row = table.insertRow();
            row.insertCell().textContent = `${m.icon} ${m.name}`;
            const goalCell = row.insertCell();
            goalCell.className = "dim";
            goalCell.style.fontSize = "0.85em";
            goalCell.textContent = m.type === "number"
                ? `${m.goal_direction === "at_most" ? "<" : "≥"} ${m.goal_value ?? 0} ${m.unit || ""}`
                : m.type === "boolean" ? t("dash_metric_goal_bool") : t("dash_metric_goal_multiselect");
            const actionsCell = row.insertCell();
            actionsCell.style.whiteSpace = "nowrap";
            const editBtn = document.createElement("button");
            editBtn.className = "secondary";
            editBtn.textContent = "✏️";
            editBtn.style.marginRight = "4px";
            editBtn.onclick = () => editMetric(m, openMetricsManagerModal);
            actionsCell.appendChild(editBtn);
            const delBtn = document.createElement("button");
            delBtn.className = "danger";
            delBtn.textContent = "🗑";
            delBtn.onclick = () => deleteMetric(m);
            actionsCell.appendChild(delBtn);
        }
        modal.appendChild(table);
    }

    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const addBtn = document.createElement("button");
    addBtn.textContent = t("dash_add_metric_btn");
    addBtn.onclick = () => addMetric(openMetricsManagerModal);
    const closeBtn = document.createElement("button");
    closeBtn.className = "secondary";
    closeBtn.textContent = t("dash_close_btn");
    closeBtn.onclick = () => backdrop.remove();
    actions.appendChild(addBtn);
    actions.appendChild(closeBtn);
    modal.appendChild(actions);

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
}

// ---- Цели на сегодня ----

async function renderPlanned(dateStr) {
    const card = document.getElementById("planned-card");
    card.innerHTML = "";

    const hint = document.createElement("p");
    hint.className = "dim";
    hint.style.cssText = "font-size:0.8em; margin:0 0 10px;";
    hint.textContent = t("dash_planned_bonus_hint");
    card.appendChild(hint);

    const { data: note } = await sb.from("daily_notes").select("*").eq("user_id", user.id).eq("date", dateStr).maybeSingle();
    // planned теперь список объектов: {type: 'goal', text: имя цели} или {type: 'custom', text, done}
    // старые записи (просто строки) конвертируем на лету, чтобы ничего не потерять
    let planned = (note?.planned_goals || []).map(p => typeof p === "string" ? { type: "goal", text: p } : p);
    const { data: allGoals } = await sb.from("goals").select("*").eq("user_id", user.id);

    async function persistPlanned(newPlanned) {
        await sb.from("daily_notes").upsert({ user_id: user.id, date: dateStr, planned_goals: newPlanned }, { onConflict: "user_id,date" });
    }

    // Звёздочка "доп. пункт" — не входит в базовые 100% (в счёт done/total не идёт),
    // а при выполнении добавляет фиксированный бонус к проценту дня поверх плана (см.
    // computeDayProgress/BONUS_PCT_PER_ITEM). Так можно "перевыполнить" день.
    function buildBonusStarBtn(item) {
        const starBtn = document.createElement("button");
        starBtn.type = "button";
        starBtn.className = "secondary";
        starBtn.style.cssText = "padding:2px 7px; font-size:0.9em;";
        starBtn.textContent = item.bonus ? "⭐" : "☆";
        starBtn.title = t("dash_planned_bonus_toggle_title");
        starBtn.onclick = async () => {
            item.bonus = !item.bonus;
            starBtn.textContent = item.bonus ? "⭐" : "☆";
            await persistPlanned(planned);
            renderDayProgressRing();
            renderWeekProgress();
        };
        return starBtn;
    }

    if (planned.length === 0) {
        const emptyMsg = document.createElement("p");
        emptyMsg.className = "dim";
        emptyMsg.textContent = t("dash_planned_empty");
        card.appendChild(emptyMsg);
    } else {
        const table = document.createElement("table");
        for (const item of planned) {
            const row = table.insertRow();

            if (item.type === "goal") {
                const g = (allGoals || []).find(x => x.name === item.text);
                if (g) {
                    const stages = g.stages ?? 1;
                    const cell = row.insertCell();
                    const nameCell = row.insertCell();
                    nameCell.textContent = item.text;
                    if (stages <= 1) {
                        const cb = document.createElement("input");
                        cb.type = "checkbox";
                        cb.checked = !!g.done;
                        cb.onchange = async () => {
                            g.done = cb.checked; // держим локальную копию в согласии — без неё перерисовка не нужна
                            await sb.from("goals").update({ done: g.done, done_date: g.done ? todayStr() : null }).eq("id", g.id);
                            nameCell.className = g.done ? "done-text" : "";
                            renderDayProgressRing();
                            renderWeekProgress();
                        };
                        cell.appendChild(cb);
                    } else {
                        cell.textContent = `${g.current_stage ?? 0}/${stages}`;
                        cell.className = "dim";
                    }
                    if (g.done) nameCell.className = "done-text";
                    row.insertCell().appendChild(buildBonusStarBtn(item));
                } else {
                    row.insertCell().textContent = "⚠️";
                    row.insertCell().textContent = `${item.text}${t("dash_goal_deleted_suffix")}`;
                    row.insertCell();
                }
            } else {
                // произвольный пункт, не привязанный к цели — просто личная отметка на день
                const cell = row.insertCell();
                const cb = document.createElement("input");
                cb.type = "checkbox";
                cb.checked = !!item.done;
                const textCell = row.insertCell();
                textCell.textContent = item.text;
                if (item.done) textCell.className = "done-text";
                cb.onchange = async () => {
                    item.done = cb.checked;
                    await persistPlanned(planned);
                    textCell.className = item.done ? "done-text" : "";
                    renderDayProgressRing();
                    renderWeekProgress();
                };
                cell.appendChild(cb);
                row.insertCell().appendChild(buildBonusStarBtn(item));
            }

            const removeCell = row.insertCell();
            const removeBtn = document.createElement("button");
            removeBtn.className = "secondary";
            removeBtn.textContent = "✕";
            removeBtn.onclick = async () => {
                const newPlanned = planned.filter(p => p !== item);
                await persistPlanned(newPlanned);
                renderPlanned(dateStr);
            };
            removeCell.appendChild(removeBtn);
        }
        card.appendChild(wrapTable(table));
    }

    const addRow = document.createElement("div");
    addRow.style.cssText = "display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;";

    const customInput = document.createElement("input");
    customInput.type = "text";
    customInput.placeholder = t("dash_planned_custom_placeholder");
    customInput.style.flex = "1";
    customInput.style.minWidth = "160px";
    async function addCustom() {
        const text = customInput.value.trim();
        if (!text) return;
        const newPlanned = [...planned, { type: "custom", text, done: false }];
        customInput.value = "";
        await persistPlanned(newPlanned);
        renderPlanned(dateStr);
    }
    customInput.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } };
    const addCustomBtn = document.createElement("button");
    addCustomBtn.className = "secondary";
    addCustomBtn.textContent = t("add_btn");
    addCustomBtn.onclick = addCustom;

    const addFromGoalsBtn = document.createElement("button");
    addFromGoalsBtn.textContent = t("dash_planned_add_from_goals_btn");
    addFromGoalsBtn.onclick = () => {
        const plannedGoalNames = planned.filter(p => p.type === "goal").map(p => p.text);
        const options = (allGoals || []).filter(g => !g.done && !plannedGoalNames.includes(g.name)).map(g => ({ value: g.name, label: g.name }));
        if (options.length === 0) { showToast(t("dash_planned_no_goals_toast")); return; }
        openModal(t("dash_planned_add_goal_title"), [{ key: "goal", label: t("dash_planned_goal_field"), type: "select", options }], async (res) => {
            const newPlanned = [...planned, { type: "goal", text: res.goal }];
            await persistPlanned(newPlanned);
            renderPlanned(dateStr);
        });
    };

    addRow.appendChild(customInput);
    addRow.appendChild(addCustomBtn);
    addRow.appendChild(addFromGoalsBtn);
    card.appendChild(addRow);
}

(async () => {
    user = await requireAuth();
    if (!user) return;

    const { data: profile } = await sb.from("profiles").select("onboarded, dashboard_layout").eq("user_id", user.id).maybeSingle();
    if (!profile?.onboarded) { window.location.href = "onboarding.html"; return; }

    renderNav("dashboard", user.email);
    currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    dashboardLayout = normalizeDashboardLayout(profile.dashboard_layout);
    document.getElementById("customize-dashboard-btn").onclick = openDashboardLayoutModal;
    renderDashboardLayoutAndLoad();
    checkWeekendGoalReminder();
    renderWaterBadge();
})();
