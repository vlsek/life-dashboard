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
    // если сегодня ещё не заполнено — считаем серию со вчера, чтобы не сбрасывало на 0 раньше времени
    const startFrom = byDay[fmtDate(today)] ? today : new Date(today.getTime() - 86400000);

    const items = [];

    // серия "идеальный день" — выполнены все метрики
    if (metrics && metrics.length) {
        const perfectDays = new Set(Object.keys(byDay).filter(d => metrics.every(m => isMetricDone(m, byDay[d][m.id]))));
        items.push({ label: t("dash_streak_perfect_days"), streak: computeStreak(perfectDays, startFrom) });
    }

    // серия по каждой метрике отдельно
    for (const m of (metrics || [])) {
        const doneDays = new Set(Object.keys(byDay).filter(d => isMetricDone(m, byDay[d][m.id])));
        const streak = computeStreak(doneDays, startFrom);
        if (streak > 0) items.push({ label: `${m.icon} ${m.name}`, streak });
    }

    // серия "заполнил заметку дня"
    const noteDays = new Set((allNotes || []).filter(n => n.items && n.items.length > 0).map(n => n.date));
    items.push({ label: t("dash_streak_note_filled"), streak: computeStreak(noteDays, startFrom) });

    items.sort((a, b) => b.streak - a.streak);
    return items.filter(i => i.streak > 0);
}

function openStreaksModal(items) {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `<h3>${t("dash_streaks_h2")}</h3>`;

    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex; flex-wrap:wrap; gap:10px;";
    for (const item of items) {
        const badge = document.createElement("div");
        badge.style.cssText = "background:var(--bg); border:1px solid var(--border); border-radius:8px; padding:8px 14px;";
        badge.innerHTML = `<div style="font-size:1.3em; font-weight:bold;">${item.streak} 🔥</div><div class="dim" style="font-size:0.8em;">${item.label}</div>`;
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
    badge.style.cssText = "cursor:pointer; font-weight:bold; white-space:nowrap;";
    badge.textContent = `🔥 ${top.streak}`;
    badge.title = items.length > 1 ? `${top.label} — ${t("dash_streak_more_hint")}` : top.label;
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
            const chartImgWrap = document.createElement("div");
            chartWrap.appendChild(chartImgWrap);

            function refreshChartImage() {
                chartImgWrap.innerHTML = "";
                const pts = filterPointsByRange(s.points, chartPeriodState.range, chartPeriodState.from, chartPeriodState.to);
                const goalValue = entry.goal != null ? entry.goal : (s.defaultGoal ?? null);
                const goalLabel = goalValue != null ? `${t("chart_goal_label")} ${goalValue}${s.unit || ''}` : null;
                renderChartBlock(chartImgWrap, s.label, pts, { unit: s.unit, color: s.color, goalValue, goalLabel });
            }
            refreshChartImage();
            dashboardChartRefreshers[entry.key] = refreshChartImage;

            const points = filterPointsByRange(s.points, chartPeriodState.range, chartPeriodState.from, chartPeriodState.to);
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
            };
            valCell.appendChild(input);
            if (unit) { const u = document.createElement("span"); u.className = "dim"; u.style.marginLeft = "4px"; u.textContent = unit.trim(); valCell.appendChild(u); }
        }
        editWrap.appendChild(wrapTable(table));
    }
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

async function loadProfile() {
    const card = document.getElementById("profile-card");
    if (!card) return; // блок скрыт в настройках дашборда
    const { data: profile } = await sb.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
    const { data: bodyParams } = await sb.from("body_parameters").select("*").eq("user_id", user.id).eq("active", true).order("position");
    const { data: allValues } = await sb.from("body_parameter_values").select("*").eq("user_id", user.id).order("date", { ascending: true });
    const { balance, total } = await calcBalance(user.id);

    card.innerHTML = "";

    const row = document.createElement("div");
    row.className = "stat-row";

    const avatarWrap = document.createElement("div");
    avatarWrap.style.cssText = "position:relative; width:44px; height:44px; flex-shrink:0;";
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

    row.appendChild(avatarWrap);
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
    // Клик открывает детали по всем активным сериям, если их несколько.
    await renderStreakBadge(row); // ждём перед балансом — иначе баланс (pinned right) успеет встать раньше и порядок съедет

    const balanceEl = document.createElement("div");
    balanceEl.className = "push-right";
    balanceEl.style.fontWeight = "bold";
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

        const dropdown = document.createElement("div");
        dropdown.className = "variation-dropdown";
        wrap.appendChild(dropdown);

        function renderDropdown() {
            dropdown.innerHTML = "";
            const query = varInput.value.trim().toLowerCase();
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
                    renderDropdown();
                };
                item.appendChild(del);

                dropdown.appendChild(item);
            });
            dropdown.classList.add("open");
        }

        varInput.oninput = renderDropdown;
        varInput.onfocus = renderDropdown;
        varInput.onblur = () => setTimeout(() => dropdown.classList.remove("open"), 150);
        varInput.onchange = () => {
            const text = varInput.value.trim();
            s.variation = text || null;
            onPersist();
            rememberVariation(text);
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

    const { data: note } = await sb.from("daily_notes").select("*").eq("user_id", user.id).eq("date", dateStr).maybeSingle();
    // planned теперь список объектов: {type: 'goal', text: имя цели} или {type: 'custom', text, done}
    // старые записи (просто строки) конвертируем на лету, чтобы ничего не потерять
    let planned = (note?.planned_goals || []).map(p => typeof p === "string" ? { type: "goal", text: p } : p);
    const { data: allGoals } = await sb.from("goals").select("*").eq("user_id", user.id);

    async function persistPlanned(newPlanned) {
        await sb.from("daily_notes").upsert({ user_id: user.id, date: dateStr, planned_goals: newPlanned }, { onConflict: "user_id,date" });
    }

    if (planned.length === 0) {
        card.innerHTML = `<p class="dim">${t("dash_planned_empty")}</p>`;
    } else {
        const table = document.createElement("table");
        for (const item of planned) {
            const row = table.insertRow();

            if (item.type === "goal") {
                const g = (allGoals || []).find(x => x.name === item.text);
                if (g) {
                    const stages = g.stages ?? 1;
                    const cell = row.insertCell();
                    if (stages <= 1) {
                        const cb = document.createElement("input");
                        cb.type = "checkbox";
                        cb.checked = !!g.done;
                        cb.onchange = async () => {
                            await sb.from("goals").update({ done: cb.checked, done_date: cb.checked ? todayStr() : null }).eq("id", g.id);
                            loadProfile();
                            renderPlanned(dateStr);
                        };
                        cell.appendChild(cb);
                    } else {
                        cell.textContent = `${g.current_stage ?? 0}/${stages}`;
                        cell.className = "dim";
                    }
                    const nameCell = row.insertCell();
                    nameCell.textContent = item.text;
                    if (g.done) nameCell.className = "done-text";
                } else {
                    row.insertCell().textContent = "⚠️";
                    row.insertCell().textContent = `${item.text}${t("dash_goal_deleted_suffix")}`;
                }
            } else {
                // произвольный пункт, не привязанный к цели — просто личная отметка на день
                const cell = row.insertCell();
                const cb = document.createElement("input");
                cb.type = "checkbox";
                cb.checked = !!item.done;
                cb.onchange = async () => {
                    item.done = cb.checked;
                    await persistPlanned(planned);
                    renderPlanned(dateStr);
                };
                cell.appendChild(cb);
                const textCell = row.insertCell();
                textCell.textContent = item.text;
                if (item.done) textCell.className = "done-text";
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
})();
