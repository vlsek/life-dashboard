let userId;

// ---- Даты ----
// Прибавляет период к дате (ISO). Для месяцев/лет день месяца не «переезжает»:
// 31 января + 1 месяц = 28/29 февраля, а не 3 марта.
function addInterval(iso, value, unit) {
    const d = new Date(iso + "T00:00:00");
    if (unit === "day") d.setDate(d.getDate() + value);
    else if (unit === "week") d.setDate(d.getDate() + 7 * value);
    else {
        const day = d.getDate();
        const months = unit === "year" ? value * 12 : value;
        d.setDate(1);
        d.setMonth(d.getMonth() + months);
        const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        d.setDate(Math.min(day, lastDay));
    }
    return fmtDate(d);
}

function daysUntil(iso) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.round((new Date(iso + "T00:00:00") - today) / 86400000);
}

function fmtKm(n) {
    return Number(n).toLocaleString(getLang() === "en" ? "en-US" : "ru-RU") + " " + t("ms_km");
}

function intervalLabel(m) {
    if (!m.interval_value || !m.interval_unit) return null;
    return `${t("ms_every")} ${m.interval_value} ${t("ms_unit_short_" + m.interval_unit)}`;
}

// ---- Форма ----
function openMilestoneForm(existing, onSubmit) {
    openModal(existing ? t("ms_edit_title") : t("ms_new_title"), [
        { key: "name", label: t("ms_field_name"), type: "text", value: existing?.name ?? "" },
        { key: "category", label: t("ms_field_category"), type: "text", value: existing?.category ?? "" },
        { key: "last_date", label: t("ms_field_last_date"), type: "date", value: existing?.last_date ?? "", max: todayStr() },
        { key: "interval_value", label: t("ms_field_interval"), type: "number", value: existing?.interval_value ?? 0 },
        { key: "interval_unit", label: t("ms_field_unit"), type: "select", value: existing?.interval_unit ?? "month", options: [
            { value: "day", label: t("ms_unit_day") },
            { value: "week", label: t("ms_unit_week") },
            { value: "month", label: t("ms_unit_month") },
            { value: "year", label: t("ms_unit_year") },
        ] },
        { key: "due_date", label: t("ms_field_due"), type: "date", value: existing?.due_date ?? "" },
        { key: "last_km", label: t("ms_field_last_km"), type: "number", value: existing?.last_km ?? 0 },
        { key: "interval_km", label: t("ms_field_interval_km"), type: "number", value: existing?.interval_km ?? 0 },
        { key: "note", label: t("ms_field_note"), type: "text", value: existing?.note ?? "" },
    ], onSubmit);
}

// Собирает строку для базы из значений формы. Если задан интервал и дата последнего раза —
// срок считается сам; иначе берётся дата, введённая вручную (разовая веха).
function buildRow(res) {
    const value = Math.max(0, Math.floor(res.interval_value || 0));
    let due = res.due_date || null;
    if (value > 0 && res.last_date) due = addInterval(res.last_date, value, res.interval_unit);
    return {
        name: res.name.trim(),
        category: (res.category || "").trim() || t("ms_no_category"),
        last_date: res.last_date || null,
        interval_value: value || null,
        interval_unit: value ? res.interval_unit : null,
        due_date: due,
        last_km: res.last_km || null,
        interval_km: res.interval_km || null,
        note: res.note?.trim() || null,
    };
}

function showSaveError(error) {
    const missing = /milestones|relation|schema cache/i.test(error.message || "");
    showToast(t("dash_save_error_generic") + error.message + (missing ? " — " + t("ms_migration_hint") : ""), "error");
    console.error(error);
}

async function addMilestone() {
    openMilestoneForm(null, async (res) => {
        if (!res.name?.trim()) return;
        const { error } = await sb.from("milestones").insert({ user_id: userId, history: [], done: false, ...buildRow(res) });
        if (error) { showSaveError(error); return; }
        render();
    });
}

async function editMilestone(m) {
    openMilestoneForm(m, async (res) => {
        if (!res.name?.trim()) return;
        const { error } = await sb.from("milestones").update(buildRow(res)).eq("id", m.id);
        if (error) { showSaveError(error); return; }
        showToast(t("ms_toast_saved"));
        render();
    });
}

async function deleteMilestone(m) {
    if (!confirm(t("ms_confirm_delete"))) return;
    const { error } = await sb.from("milestones").delete().eq("id", m.id);
    if (error) { showToast(t("dash_delete_error_generic") + error.message, "error"); console.error(error); return; }
    render();
}

// «Сделано»: дата (по умолчанию сегодня), необязательный пробег и заметка. Регулярную веху
// переносит на следующий срок, разовую — переводит в выполненные.
function markDone(m) {
    openModal(`${escapeHtmlText(t("ms_mark_done_title"))} — ${escapeHtmlText(m.name)}`, [
        { key: "date", label: t("ms_field_done_date"), type: "date", value: todayStr(), max: todayStr() },
        { key: "km", label: t("ms_field_done_km"), type: "number", value: 0 },
        { key: "note", label: t("ms_field_note"), type: "text", value: "" },
    ], async (res) => {
        const date = res.date || todayStr();
        const km = res.km || null;
        const history = [...(Array.isArray(m.history) ? m.history : []), { date, km, note: res.note?.trim() || null }];
        const patch = { last_date: date, history };
        if (km) patch.last_km = km;
        if (m.interval_value && m.interval_unit) patch.due_date = addInterval(date, m.interval_value, m.interval_unit);
        else patch.done = true;
        const { error } = await sb.from("milestones").update(patch).eq("id", m.id);
        if (error) { showSaveError(error); return; }
        showToast(t("ms_toast_saved"));
        render();
    });
}

function showHistory(m) {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `<h3>${escapeHtmlText(t("ms_history_title"))} — ${escapeHtmlText(m.name)}</h3>`;
    const list = (Array.isArray(m.history) ? m.history : []).slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    if (list.length === 0) {
        const p = document.createElement("p");
        p.className = "dim";
        p.textContent = t("ms_history_empty");
        modal.appendChild(p);
    } else {
        const table = document.createElement("table");
        for (const h of list) {
            const row = table.insertRow();
            row.insertCell().textContent = fmtRu(h.date);
            row.insertCell().textContent = h.km ? fmtKm(h.km) : "";
            row.insertCell().textContent = h.note || "";
        }
        modal.appendChild(wrapTable(table));
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

// ---- Отрисовка ----
function chip(text, color) {
    const el = document.createElement("span");
    el.textContent = text;
    el.style.cssText = `font-size:0.72em; padding:1px 8px; border-radius:10px; border:1px solid ${color}; color:${color}; white-space:nowrap;`;
    return el;
}

function statusChip(m) {
    if (!m.due_date) return null;
    const days = daysUntil(m.due_date);
    if (days < 0) return chip(`${t("ms_overdue_by")} ${-days} ${t("ms_days_short")}`, "#d6336c");
    if (days === 0) return chip(t("ms_due_today"), "#d6336c");
    if (days <= 14) return chip(`${t("ms_due_in")} ${days} ${t("ms_days_short")} · ${fmtRu(m.due_date)}`, "#e0a93b");
    return chip(`${t("ms_due_in")} ${days} ${t("ms_days_short")} · ${fmtRu(m.due_date)}`, "var(--text-dim)");
}

function renderRow(table, m, { done = false } = {}) {
    const row = table.insertRow();

    const doneCell = row.insertCell();
    if (!done) {
        const btn = document.createElement("button");
        btn.className = "secondary";
        setIcon(btn, "done");
        btn.title = t("ms_mark_done_btn");
        btn.style.padding = "2px 8px";
        btn.onclick = () => markDone(m);
        doneCell.appendChild(btn);
    }

    const nameCell = row.insertCell();
    const nameEl = document.createElement("span");
    nameEl.textContent = m.name;
    if (done) nameEl.className = "done-text";
    nameCell.appendChild(nameEl);

    const chips = document.createElement("div");
    chips.style.cssText = "display:flex; flex-wrap:wrap; gap:6px; margin-top:4px;";
    if (!done) { const s = statusChip(m); if (s) chips.appendChild(s); }
    const iv = intervalLabel(m);
    if (iv) chips.appendChild(chip(iv, "var(--text-dim)"));
    if (m.last_date) chips.appendChild(chip(`${t("ms_last_time")} ${fmtRu(m.last_date)}${m.last_km ? " · " + fmtKm(m.last_km) : ""}`, "var(--text-dim)"));
    if (!done && m.last_km && m.interval_km) chips.appendChild(chip(`${t("ms_next_km")} ${fmtKm(Number(m.last_km) + Number(m.interval_km))}`, "var(--text-dim)"));
    if (chips.children.length) nameCell.appendChild(chips);
    if (m.note) {
        const note = document.createElement("div");
        note.className = "dim";
        note.style.cssText = "font-size:0.8em; margin-top:4px;";
        note.textContent = m.note;
        nameCell.appendChild(note);
    }

    const actionsCell = row.insertCell();
    actionsCell.style.whiteSpace = "nowrap";
    if (Array.isArray(m.history) && m.history.length) {
        const histBtn = document.createElement("button");
        histBtn.className = "secondary";
        setIcon(histBtn, "list");
        histBtn.title = t("ms_history_title");
        histBtn.style.marginRight = "4px";
        histBtn.onclick = () => showHistory(m);
        actionsCell.appendChild(histBtn);
    }
    const editBtn = document.createElement("button");
    editBtn.className = "secondary";
    setIcon(editBtn, "edit");
    editBtn.style.marginRight = "4px";
    editBtn.onclick = () => editMilestone(m);
    actionsCell.appendChild(editBtn);
    const delBtn = document.createElement("button");
    delBtn.className = "danger";
    setIcon(delBtn, "trash");
    delBtn.onclick = () => deleteMilestone(m);
    actionsCell.appendChild(delBtn);
}

async function render() {
    const { data, error } = await sb.from("milestones").select("*").eq("user_id", userId).order("created_at");
    const activeBox = document.getElementById("ms-active");
    const doneBox = document.getElementById("ms-done");
    if (error) {
        const missing = /milestones|relation|schema cache/i.test(error.message || "");
        activeBox.innerHTML = "";
        const p = document.createElement("p");
        p.className = "dim";
        p.textContent = `${t("comm_load_error")} ${error.message}${missing ? " — " + t("ms_migration_hint") : ""}`;
        activeBox.appendChild(p);
        doneBox.innerHTML = "";
        console.error(error);
        return;
    }
    const all = data || [];
    const active = all.filter(m => !m.done);
    const done = all.filter(m => m.done);

    activeBox.innerHTML = "";
    if (active.length === 0) {
        activeBox.innerHTML = `<p class="dim">${escapeHtmlText(t("ms_no_active"))}</p>`;
    } else {
        // Сводка: сколько просрочено / скоро
        const overdue = active.filter(m => m.due_date && daysUntil(m.due_date) < 0).length;
        const soon = active.filter(m => m.due_date && daysUntil(m.due_date) >= 0 && daysUntil(m.due_date) <= 14).length;
        if (overdue || soon) {
            const s = document.createElement("p");
            s.style.cssText = "margin:12px 0 0; font-size:0.9em;";
            const parts = [];
            if (overdue) parts.push(`<span style="color:#d6336c;">${escapeHtmlText(t("ms_summary_overdue"))} ${overdue}</span>`);
            if (soon) parts.push(`<span style="color:#e0a93b;">${escapeHtmlText(t("ms_summary_soon"))} ${soon}</span>`);
            s.innerHTML = parts.join(" · ");
            activeBox.appendChild(s);
        }
        const groups = {};
        for (const m of active) (groups[m.category || t("ms_no_category")] ||= []).push(m);
        for (const cat of Object.keys(groups).sort()) {
            const h = document.createElement("h3");
            h.textContent = cat;
            activeBox.appendChild(h);
            const table = document.createElement("table");
            const sorted = groups[cat].slice().sort((a, b) => {
                if (!a.due_date && !b.due_date) return 0;
                if (!a.due_date) return 1;
                if (!b.due_date) return -1;
                return a.due_date.localeCompare(b.due_date);
            });
            for (const m of sorted) renderRow(table, m);
            activeBox.appendChild(wrapTable(table));
        }
    }

    doneBox.innerHTML = "";
    if (done.length === 0) {
        doneBox.innerHTML = `<p class="dim">${escapeHtmlText(t("ms_no_done"))}</p>`;
    } else {
        const table = document.createElement("table");
        const sorted = done.slice().sort((a, b) => (b.last_date ?? "").localeCompare(a.last_date ?? ""));
        for (const m of sorted) renderRow(table, m, { done: true });
        doneBox.appendChild(wrapTable(table));
    }
}

document.getElementById("add-ms-btn").onclick = addMilestone;
(async () => {
    const user = await requireAuth();
    if (!user) return;
    if (!(await requireOnboarded(user.id))) return;
    userId = user.id;
    renderNav("milestones", user.email);
    render();
})();
