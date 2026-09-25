// Раздел «История»: календарь месяца, где каждый день закрашен пропорционально проценту
// выполнения, недельные итоги и подробности дня по нажатию.
// Проценты считаются ровно так же, как кружки дня/недели на дашборде (те же настройки
// «что учитывать», то же расписание метрик, те же бонусные ⭐).
let user; // читается datacache.js

let viewYear, viewMonth; // месяц на экране (0..11)
let ctx = null;          // загруженные данные

const MS_DAY = 86400000;

function parseIso(iso) { return new Date(iso + "T00:00:00"); }
function mondayOf(iso) {
    const d = parseIso(iso);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return fmtDate(d);
}
function addDays(iso, n) {
    const d = parseIso(iso);
    d.setDate(d.getDate() + n);
    return fmtDate(d);
}
function locale() { return getLang() === "en" ? "en-US" : "ru-RU"; }

// ---- Данные ----
async function loadData() {
    const [metrics, values, notes, goalsRes] = await Promise.all([
        getMetrics(),
        getAllValues(),
        getAllNotes(),
        sb.from("goals").select("name, stages, done, current_stage").eq("user_id", user.id),
    ]);
    const byDate = {};
    values.forEach(v => { (byDate[v.date] ||= {})[v.metric_id] = v.value; });
    const notesByDate = {};
    notes.forEach(n => { notesByDate[n.date] = n; });
    let firstDate = null;
    for (const d of [...Object.keys(byDate), ...Object.keys(notesByDate)]) {
        if (!firstDate || d < firstDate) firstDate = d;
    }
    ctx = { metrics, byDate, notesByDate, goals: goalsRes.data || [], settings: getDayProgressSettings(), firstDate, today: todayStr() };
}

function hasData(dateStr) {
    return ctx.firstDate && dateStr >= ctx.firstDate && dateStr <= ctx.today;
}

// Выполнен ли запланированный пункт (цели — по текущему состоянию цели, как и на дашборде)
function plannedItemDone(item) {
    if (item.type === "goal") {
        const g = ctx.goals.find(x => x.name === item.text);
        if (!g) return null; // цель удалена — в счёт не идёт
        const stages = g.stages ?? 1;
        return stages <= 1 ? !!g.done : (g.current_stage ?? 0) >= stages;
    }
    return !!item.done;
}
function plannedOf(dateStr) {
    return (ctx.notesByDate[dateStr]?.planned_goals || []).map(p => typeof p === "string" ? { type: "custom", text: p, done: false } : p);
}

// Итог дня: как computeDayProgress на дашборде, но для любой даты
function dayStats(dateStr) {
    const s = ctx.settings;
    let done = 0, total = 0, bonusPct = 0;
    if (s.includeMetrics) {
        const vals = ctx.byDate[dateStr] || {};
        for (const m of ctx.metrics) {
            const isDone = isMetricDone(m, vals[m.id]);
            if (metricSchedule(m)?.type === "at_most") continue;
            if (!metricCountsInDay(m, dateStr, isDone)) continue;
            total++;
            if (isDone) done++;
        }
    }
    for (const item of plannedOf(dateStr)) {
        const isDone = plannedItemDone(item);
        if (isDone === null) continue;
        if (item.bonus) { if (isDone) bonusPct += BONUS_PCT_PER_ITEM; }
        else if (s.includePlanned) { total++; if (isDone) done++; }
    }
    const base = total > 0 ? Math.round(done / total * 100) : 0;
    return { done, total, bonusPct, pct: base + bonusPct };
}

// Итог недели (пн-вс): как computeWeekProgress на дашборде; будущие дни не считаются
function weekStats(mondayStr) {
    const s = ctx.settings;
    if (!ctx.firstDate) return null;
    // считаем только дни с данными: от первой записи и до сегодня (будущее и «до начала» не в счёте)
    const days = [];
    for (let i = 0; i < 7; i++) { const d = addDays(mondayStr, i); if (d <= ctx.today && d >= ctx.firstDate) days.push(d); }
    if (days.length === 0) return null;
    let done = 0, total = 0, bonusPct = 0;
    if (s.includeMetrics) {
        const weeklyDone = {};
        for (const d of days) {
            const vals = ctx.byDate[d] || {};
            for (const m of ctx.metrics) {
                const isDone = isMetricDone(m, vals[m.id]);
                const scLoop = metricSchedule(m);
                if (scLoop?.type === "weekly" || scLoop?.type === "at_most") { if (isDone) weeklyDone[m.id] = (weeklyDone[m.id] || 0) + 1; continue; }
                if (!metricCountsInDay(m, d, isDone)) continue;
                total++;
                if (isDone) done++;
            }
        }
        for (const m of ctx.metrics) {
            const sc = metricSchedule(m);
            if (sc?.type === "weekly") { total += sc.min; done += Math.min(sc.min, weeklyDone[m.id] || 0); }
            else if (sc?.type === "at_most") { total += 1; if ((weeklyDone[m.id] || 0) <= sc.max) done += 1; }
        }
    }
    for (const d of days) {
        for (const item of plannedOf(d)) {
            const isDone = plannedItemDone(item);
            if (isDone === null) continue;
            if (item.bonus) { if (isDone) bonusPct += BONUS_PCT_PER_ITEM; }
            else if (s.includePlanned) { total++; if (isDone) done++; }
        }
    }
    const base = total > 0 ? Math.round(done / total * 100) : 0;
    return { done, total, bonusPct, pct: base + bonusPct };
}

// ---- Отрисовка календаря ----
function renderMonth() {
    const title = new Date(viewYear, viewMonth, 1).toLocaleDateString(locale(), { month: "long", year: "numeric" });
    document.getElementById("hist-month-title").textContent = title.charAt(0).toUpperCase() + title.slice(1);

    const now = new Date();
    const isCurrent = viewYear === now.getFullYear() && viewMonth === now.getMonth();
    document.getElementById("hist-next").disabled = isCurrent || (viewYear > now.getFullYear()) || (viewYear === now.getFullYear() && viewMonth >= now.getMonth());

    const first = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const lead = (first.getDay() + 6) % 7;
    const cal = document.getElementById("hist-calendar");
    cal.innerHTML = "";

    // заголовок: дни недели + колонка «нед.»
    const names = t("dash_weekdays_short").split(",");
    const head = document.createElement("div");
    head.className = "hist-row hist-head";
    names.forEach(n => { const c = document.createElement("div"); c.textContent = n; head.appendChild(c); });
    const wh = document.createElement("div");
    wh.textContent = t("hist_week_col");
    head.appendChild(wh);
    cal.appendChild(head);

    let pctSum = 0, pctDays = 0, perfect = 0;
    const totalCells = Math.ceil((lead + daysInMonth) / 7) * 7;
    let row = null;
    for (let i = 0; i < totalCells; i++) {
        if (i % 7 === 0) {
            row = document.createElement("div");
            row.className = "hist-row";
            cal.appendChild(row);
        }
        const dayNum = i - lead + 1;
        if (dayNum < 1 || dayNum > daysInMonth) {
            row.appendChild(Object.assign(document.createElement("div"), { className: "hist-cell hist-empty" }));
        } else {
            const dateStr = fmtDate(new Date(viewYear, viewMonth, dayNum));
            row.appendChild(buildDayCell(dateStr, dayNum));
            if (hasData(dateStr)) {
                const st = dayStats(dateStr);
                if (st.total > 0 || st.bonusPct > 0) {
                    pctSum += Math.min(100, st.pct); pctDays++;
                    if (st.pct >= 100) perfect++;
                }
            }
        }
        if (i % 7 === 6) {
            // колонка недели: процент недели, в которую попадает эта строка
            const monday = fmtDate(new Date(viewYear, viewMonth, i - 6 - lead + 1));
            row.appendChild(buildWeekCell(monday));
        }
    }

    // сводка месяца
    const stats = document.getElementById("hist-stats");
    stats.innerHTML = "";
    const avg = pctDays > 0 ? Math.round(pctSum / pctDays) : null;
    [
        [avg == null ? "—" : avg + "%", t("hist_stat_avg")],
        [String(perfect), t("hist_stat_perfect")],
        [String(pctDays), t("hist_stat_days")],
    ].forEach(([val, label]) => {
        const c = document.createElement("div");
        c.className = "hist-stat";
        c.innerHTML = `<div class="hist-stat-val">${escapeHtmlText(val)}</div><div class="dim hist-stat-label">${escapeHtmlText(label)}</div>`;
        stats.appendChild(c);
    });
}

function buildDayCell(dateStr, dayNum) {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "hist-cell";
    const future = dateStr > ctx.today;
    const data = hasData(dateStr);
    const st = data ? dayStats(dateStr) : null;
    const show = st && (st.total > 0 || st.bonusPct > 0);
    const fill = show ? Math.max(0, Math.min(100, st.pct)) : 0;

    if (dateStr === ctx.today) cell.classList.add("hist-today");
    if (future) cell.classList.add("hist-future");
    if (show && st.pct > 100) cell.classList.add("hist-over");
    if (show && fill >= 100) cell.classList.add("hist-full");
    if (show && fill >= 55) cell.classList.add("hist-dark-text");
    if (!data && !future) cell.classList.add("hist-nodata");
    // заливка снизу вверх на fill%: 100% — сплошной зелёный день
    if (show) cell.style.background = `linear-gradient(to top, var(--hist-ok) ${fill}%, var(--bg-card) ${fill}%)`;

    cell.innerHTML = `<span class="hist-daynum">${dayNum}</span>${show ? `<span class="hist-pct">${st.pct}%</span>` : ""}`;
    cell.onclick = () => showDay(dateStr);
    return cell;
}

function buildWeekCell(mondayStr) {
    const cell = document.createElement("div");
    cell.className = "hist-cell hist-weekcell";
    const ws = weekStats(mondayStr);
    if (ws && (ws.total > 0 || ws.bonusPct > 0)) {
        const fill = Math.min(100, ws.pct);
        cell.style.background = `linear-gradient(to top, var(--accent) ${fill}%, var(--bg-card) ${fill}%)`;
        if (fill >= 55) cell.classList.add("hist-accent-text");
        cell.innerHTML = `<span class="hist-pct">${ws.pct}%</span>`;
    }
    return cell;
}

// ---- Недели списком (последние 8) ----
function renderWeeks() {
    const box = document.getElementById("hist-weeks");
    box.innerHTML = "";
    let monday = mondayOf(ctx.today);
    let any = false;
    for (let i = 0; i < 8; i++) {
        const ws = weekStats(monday);
        if (ws && (ws.total > 0 || ws.bonusPct > 0)) {
            any = true;
            const end = addDays(monday, 6);
            const fmt = (iso) => parseIso(iso).toLocaleDateString(locale(), { day: "numeric", month: "short" });
            const row = document.createElement("div");
            row.className = "hist-weekrow";
            const fill = Math.min(100, ws.pct);
            row.innerHTML = `
                <div class="hist-weeklabel">${escapeHtmlText(fmt(monday))} – ${escapeHtmlText(fmt(end))}</div>
                <div class="hist-bar"><div class="hist-bar-fill" style="width:${fill}%;${ws.pct >= 100 ? " background:var(--hist-ok);" : ""}"></div></div>
                <div class="hist-weekpct">${ws.pct}%</div>`;
            box.appendChild(row);
        }
        monday = addDays(monday, -7);
    }
    if (!any) box.innerHTML = `<p class="dim">${escapeHtmlText(t("hist_no_data"))}</p>`;
}

// ---- Подробности дня ----
function fmtMetricValue(m, v) {
    if (v == null) return "—";
    if (m.type === "boolean") return v === true ? "✓" : "—";
    if (m.type === "multiselect") {
        if (!Array.isArray(v) || v.length === 0) return "—";
        return v.map(k => (m.options || []).find(o => (o.key ?? o.label) === k)?.label ?? k).join(", ");
    }
    if (m.type === "sets") {
        if (!Array.isArray(v) || v.length === 0) return "—";
        const reps = v.reduce((sum, s) => sum + (s?.reps || 0), 0);
        const times = v.map(s => s?.time).filter(Boolean);
        return `${v.length} ${t("hist_sets_word")} · ${reps} ${t("hist_reps_word")}` + (times.length ? `\n${times.join(", ")}` : "");
    }
    const goal = m.goal_value ? ` / ${m.goal_direction === "at_most" ? "< " : ""}${m.goal_value}` : "";
    return `${v}${m.unit ? " " + m.unit : ""}${goal}`;
}

function showDay(dateStr) {
    const st = dayStats(dateStr);
    const data = hasData(dateStr);
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal";
    const dateLabel = parseIso(dateStr).toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    modal.innerHTML = `<h3>${escapeHtmlText(dateLabel)}</h3>`;

    if (dateStr > ctx.today) {
        modal.appendChild(Object.assign(document.createElement("p"), { className: "dim", textContent: t("hist_future_day") }));
    } else if (!data) {
        modal.appendChild(Object.assign(document.createElement("p"), { className: "dim", textContent: t("hist_no_data") }));
    } else {
        const fill = Math.min(100, st.pct);
        const sum = document.createElement("div");
        sum.innerHTML = `
            <div style="display:flex; align-items:baseline; gap:10px;">
                <span style="font-size:1.8em; font-weight:700;">${st.pct}%</span>
                <span class="dim">${escapeHtmlText(t("hist_done_of"))} ${st.done} / ${st.total}${st.bonusPct ? " · +" + st.bonusPct + "% " : ""}</span>
            </div>
            <div class="hist-bar" style="margin:8px 0 14px;"><div class="hist-bar-fill" style="width:${fill}%;${st.pct >= 100 ? " background:var(--hist-ok);" : ""}"></div></div>`;
        modal.appendChild(sum);

        // метрики
        const vals = ctx.byDate[dateStr] || {};
        if (ctx.metrics.length) {
            modal.appendChild(Object.assign(document.createElement("h4"), { textContent: t("hist_metrics_h"), style: "margin:12px 0 6px;" }));
            const table = document.createElement("table");
            for (const m of ctx.metrics) {
                const v = vals[m.id];
                const isDone = isMetricDone(m, v);
                const expected = metricExpectedOn(m, dateStr);
                const row = table.insertRow();
                const status = row.insertCell();
                status.style.width = "1%";
                if (isDone) setIcon(status, "done", "color:var(--hist-ok);");
                else if (expected) setIcon(status, "x", "color:var(--text-dim); opacity:0.6;");
                else status.innerHTML = `<span class="dim">–</span>`;
                const name = row.insertCell();
                name.innerHTML = labelHtml(m.icon, m.name);
                if (!expected && !isDone) {
                    const off = document.createElement("div");
                    off.className = "dim";
                    off.style.fontSize = "0.75em";
                    const sc = metricSchedule(m);
                    off.textContent = sc?.type === "weekly" ? `${sc.min}${t("dash_schedule_weekly_short")}` : t("hist_not_scheduled");
                    name.appendChild(off);
                }
                const val = row.insertCell();
                val.style.cssText = "white-space:pre-line; text-align:right;";
                val.textContent = fmtMetricValue(m, v);
            }
            modal.appendChild(wrapTable(table));
        }

        // планы на день
        const planned = plannedOf(dateStr);
        if (planned.length) {
            modal.appendChild(Object.assign(document.createElement("h4"), { textContent: t("hist_planned_h"), style: "margin:14px 0 6px;" }));
            const list = document.createElement("div");
            for (const item of planned) {
                const isDone = plannedItemDone(item);
                const line = document.createElement("div");
                line.style.cssText = "display:flex; align-items:center; gap:8px; padding:3px 0;";
                const mark = document.createElement("span");
                if (isDone === null) setIcon(mark, "alert", "color:#e0a93b;");
                else if (isDone) setIcon(mark, "done", "color:var(--hist-ok);");
                else setIcon(mark, "x", "color:var(--text-dim); opacity:0.6;");
                line.appendChild(mark);
                const text = document.createElement("span");
                text.textContent = item.text + (item.type === "goal" ? ` (${t("cal_goal_suffix")})` : "");
                if (isDone) text.style.opacity = "0.7";
                line.appendChild(text);
                if (item.bonus) { const star = document.createElement("span"); setIcon(star, "star", "color:#e0a93b; fill:#e0a93b;"); line.appendChild(star); }
                list.appendChild(line);
            }
            modal.appendChild(list);
        }

        // заметки «что сделал»
        const notes = ctx.notesByDate[dateStr]?.items || [];
        if (notes.length) {
            modal.appendChild(Object.assign(document.createElement("h4"), { textContent: t("hist_notes_h"), style: "margin:14px 0 6px;" }));
            const ul = document.createElement("ul");
            ul.style.cssText = "margin:0; padding-left:20px;";
            for (const n of notes) ul.appendChild(Object.assign(document.createElement("li"), { textContent: typeof n === "string" ? n : (n?.text ?? "") }));
            modal.appendChild(ul);
        }
    }

    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const closeBtn = document.createElement("button");
    closeBtn.className = "secondary";
    closeBtn.textContent = t("dash_close_btn");
    closeBtn.onclick = () => backdrop.remove();
    actions.appendChild(closeBtn);
    modal.appendChild(actions);
    backdrop.appendChild(modal);
    backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };
    document.body.appendChild(backdrop);
}

// ---- Навигация по месяцам ----
function shiftMonth(delta) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    const now = new Date();
    if (d.getFullYear() > now.getFullYear() || (d.getFullYear() === now.getFullYear() && d.getMonth() > now.getMonth())) return;
    viewYear = d.getFullYear();
    viewMonth = d.getMonth();
    renderMonth();
}

(async () => {
    user = await requireAuth();
    if (!user) return;
    if (!(await requireOnboarded(user.id))) return;
    renderNav("history", user.email);

    const now = new Date();
    viewYear = now.getFullYear();
    viewMonth = now.getMonth();
    setIcon(document.getElementById("hist-prev"), "chevron_left");
    setIcon(document.getElementById("hist-next"), "chevron_right");
    document.getElementById("hist-prev").onclick = () => shiftMonth(-1);
    document.getElementById("hist-next").onclick = () => shiftMonth(1);
    document.getElementById("hist-today").onclick = () => { viewYear = now.getFullYear(); viewMonth = now.getMonth(); renderMonth(); };

    await loadData();
    if (!ctx.firstDate) {
        document.getElementById("hist-calendar").innerHTML = `<p class="dim">${escapeHtmlText(t("hist_no_data"))}</p>`;
        document.getElementById("hist-weeks").innerHTML = "";
        return;
    }
    renderMonth();
    renderWeeks();

    // Листание месяцев свайпом по календарю
    const cal = document.getElementById("hist-calendar");
    let sx = null, sy = null;
    cal.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    cal.addEventListener("touchend", (e) => {
        if (sx === null) return;
        const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
        sx = sy = null;
        if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        shiftMonth(dx < 0 ? 1 : -1);
    }, { passive: true });
})();
