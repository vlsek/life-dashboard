let userId;

function bar(cur, total, width = 8) {
    const pct = total ? cur / total : 0;
    const filled = Math.round(pct * width);
    return "█".repeat(filled) + "░".repeat(width - filled);
}

function openGoalForm(existing, onSubmit) {
    openModal(existing ? t("goals_edit_title") : t("goals_new_title"), [
        { key: "name", label: t("goals_field_name"), type: "text", value: existing?.name ?? "" },
        { key: "points", label: t("goals_field_points"), type: "number", value: existing?.points ?? 5 },
        { key: "category", label: t("goals_field_category"), type: "text", value: existing?.category ?? "" },
        { key: "stages", label: t("goals_field_stages"), type: "number", value: existing?.stages ?? 1 },
        { key: "difficulty", label: t("goals_field_difficulty"), type: "select", value: existing?.difficulty ?? "", options: [
            { value: "", label: t("goals_diff_none") },
            { value: "easy", label: t("goals_diff_easy") },
            { value: "medium", label: t("goals_diff_medium") },
            { value: "hard", label: t("goals_diff_hard") },
        ] },
        { key: "deadline", label: t("goals_field_deadline"), type: "date", value: existing?.deadline ?? "" },
    ], onSubmit);
}

// Дедлайн и сложность пишем в базу только если они заданы (или уже были у цели) —
// так страница продолжает работать и до применения миграции 020.
function goalExtraFields(res, existing) {
    const extra = {};
    const hasCols = existing ? ("deadline" in existing) : false;
    if (res.deadline || hasCols) extra.deadline = res.deadline || null;
    if (res.difficulty || hasCols) extra.difficulty = res.difficulty || null;
    return extra;
}

function showGoalSaveError(error) {
    const missingCol = /deadline|difficulty/i.test(error.message || "");
    showToast(t("dash_save_error_generic") + error.message + (missingCol ? " — " + t("goals_migration_hint") : ""), "error");
    console.error(error);
}

// Сколько дней до дедлайна (отрицательное — просрочено)
function daysUntil(isoDate) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const target = new Date(isoDate + "T00:00:00");
    return Math.round((target - today) / 86400000);
}

async function addGoal() {
    openGoalForm(null, async (res) => {
        if (!res.name?.trim()) return;
        const { error } = await sb.from("goals").insert({
            user_id: userId, name: res.name.trim(), points: res.points || 5,
            category: (res.category || t("goals_no_category")).trim(), stages: Math.max(1, res.stages || 1),
            current_stage: 0, done: false, ...goalExtraFields(res, null)
        });
        if (error) { showGoalSaveError(error); return; }
        render();
    });
}

async function editGoal(g) {
    openGoalForm(g, async (res) => {
        if (!res.name?.trim()) return;
        const stages = Math.max(1, res.stages || 1);
        const patch = {
            name: res.name.trim(), points: res.points || 5,
            category: (res.category || t("goals_no_category")).trim(), stages,
            ...goalExtraFields(res, g)
        };
        if (g.current_stage > stages) patch.current_stage = stages;
        if (stages > 1) patch.done = (g.current_stage ?? 0) >= stages;
        const { error } = await sb.from("goals").update(patch).eq("id", g.id);
        if (error) { showGoalSaveError(error); return; }
        showToast(t("goals_updated_toast"));
        render();
    });
}

async function deleteGoal(id) {
    if (!confirm(t("goals_confirm_delete"))) return;
    const { error } = await sb.from("goals").delete().eq("id", id);
    if (error) { showToast(t("dash_delete_error_generic") + error.message, "error"); console.error(error); return; }
    render();
}

async function toggleGoal(g) {
    const done = !g.done;
    const { error } = await sb.from("goals").update({ done, done_date: done ? todayStr() : null }).eq("id", g.id);
    if (error) { showToast(t("dash_save_error_generic") + error.message, "error"); console.error(error); return; }
    render();
}

async function stepGoal(g, delta) {
    const stages = g.stages ?? 1;
    const cur = Math.max(0, Math.min(stages, (g.current_stage ?? 0) + delta));
    const done = cur >= stages;
    const { error } = await sb.from("goals").update({
        current_stage: cur, done, done_date: done ? todayStr() : null
    }).eq("id", g.id);
    if (error) { showToast(t("dash_save_error_generic") + error.message, "error"); console.error(error); return; }
    render();
}

function renderGoalRow(table, g, { showDate = false } = {}) {
    const row = table.insertRow();
    const stages = g.stages ?? 1;

    const statusCell = row.insertCell();
    if (stages <= 1) {
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = !!g.done;
        cb.onchange = () => toggleGoal(g);
        statusCell.appendChild(cb);
    } else {
        statusCell.style.whiteSpace = "nowrap";
        const barSpan = document.createElement("span");
        barSpan.className = "bar";
        barSpan.style.fontSize = "0.85em";
        barSpan.textContent = bar(g.current_stage ?? 0, stages);
        statusCell.appendChild(barSpan);
        const fracSpan = document.createElement("span");
        fracSpan.className = "dim";
        fracSpan.style.fontSize = "0.8em";
        fracSpan.textContent = ` ${g.current_stage ?? 0}/${stages} `;
        statusCell.appendChild(fracSpan);
        const minusBtn = document.createElement("button");
        minusBtn.className = "secondary";
        minusBtn.textContent = "−";
        minusBtn.style.padding = "0 8px";
        minusBtn.onclick = () => stepGoal(g, -1);
        statusCell.appendChild(minusBtn);
        const plusBtn = document.createElement("button");
        plusBtn.className = "secondary";
        plusBtn.textContent = "+";
        plusBtn.style.padding = "0 8px";
        plusBtn.style.marginLeft = "2px";
        plusBtn.onclick = () => stepGoal(g, 1);
        statusCell.appendChild(plusBtn);
    }

    const nameCell = row.insertCell();
    const nameSpan = document.createElement("span");
    nameSpan.textContent = g.name;
    if (g.done) nameSpan.className = "done-text";
    nameCell.appendChild(nameSpan);

    // Метки под названием: сложность и дедлайн (у выполненных целей не показываем дедлайн)
    const chips = [];
    if (g.difficulty) {
        const colors = { easy: "#3fa66b", medium: "#e0a93b", hard: "#d6336c" };
        chips.push({ text: t("goals_diff_" + g.difficulty), color: colors[g.difficulty] || "var(--text-dim)" });
    }
    if (g.deadline && !g.done) {
        const days = daysUntil(g.deadline);
        let label, color;
        if (days < 0) { label = `${t("goals_deadline_overdue")} ${-days} ${t("goals_days_short")}`; color = "#d6336c"; }
        else if (days === 0) { label = t("goals_deadline_today"); color = "#d6336c"; }
        else { label = `${t("goals_deadline_until")} ${fmtRu(g.deadline)} · ${days} ${t("goals_days_short")}`; color = days <= 3 ? "#e0a93b" : "var(--text-dim)"; }
        chips.push({ text: label, color });
    }
    if (chips.length) {
        const chipRow = document.createElement("div");
        chipRow.style.cssText = "display:flex; flex-wrap:wrap; gap:6px; margin-top:4px;";
        for (const c of chips) {
            const chip = document.createElement("span");
            chip.textContent = c.text;
            chip.style.cssText = `font-size:0.72em; padding:1px 8px; border-radius:10px; border:1px solid ${c.color}; color:${c.color}; white-space:nowrap;`;
            chipRow.appendChild(chip);
        }
        nameCell.appendChild(chipRow);
    }

    row.insertCell().innerHTML = `${g.points ?? 5} ${coinIcon()}`;

    if (showDate) {
        row.insertCell().textContent = g.done_date ? fmtRu(g.done_date) : "";
    }

    const actionsCell = row.insertCell();
    actionsCell.style.whiteSpace = "nowrap";
    const editBtn = document.createElement("button");
    editBtn.className = "secondary";
    setIcon(editBtn, "edit");
    editBtn.style.marginRight = "4px";
    editBtn.onclick = () => editGoal(g);
    actionsCell.appendChild(editBtn);
    const delBtn = document.createElement("button");
    delBtn.className = "danger";
    setIcon(delBtn, "trash");
    delBtn.onclick = () => deleteGoal(g.id);
    actionsCell.appendChild(delBtn);
}

async function render() {
    const { data: goals, error } = await sb.from("goals").select("*").eq("user_id", userId).order("created_at");
    if (error) {
        document.getElementById("goals-active").innerHTML = `<p class="dim">${t("comm_load_error")} ${error.message}</p>`;
        console.error(error);
        return;
    }
    const active = (goals || []).filter(g => !g.done);
    const done = (goals || []).filter(g => g.done);

    const activeBox = document.getElementById("goals-active");
    activeBox.innerHTML = "";

    if (active.length === 0) {
        activeBox.innerHTML = `<p class="dim">${t("goals_no_active")}</p>`;
    } else {
        const categories = {};
        for (const g of active) {
            const cat = g.category || t("goals_no_category");
            (categories[cat] = categories[cat] || []).push(g);
        }
        for (const cat of Object.keys(categories).sort()) {
            const h = document.createElement("h3");
            h.textContent = cat;
            activeBox.appendChild(h);
            const table = document.createElement("table");
            const byDeadline = categories[cat].slice().sort((a, b) => {
                if (!a.deadline && !b.deadline) return 0;
                if (!a.deadline) return 1;
                if (!b.deadline) return -1;
                return a.deadline.localeCompare(b.deadline);
            });
            for (const g of byDeadline) renderGoalRow(table, g);
            activeBox.appendChild(wrapTable(table));
        }
    }

    const earned = (goals || []).filter(g => g.done).reduce((s, g) => s + (g.points ?? 5), 0);
    const possible = (goals || []).reduce((s, g) => s + (g.points ?? 5), 0);
    const summary = document.createElement("p");
    summary.className = "dim";
    summary.textContent = `${t("goals_points_earned")} ${earned} / ${possible}`;
    activeBox.appendChild(summary);

    const doneBox = document.getElementById("goals-done");
    doneBox.innerHTML = "";
    if (done.length === 0) {
        doneBox.innerHTML = `<p class="dim">${t("goals_no_done")}</p>`;
    } else {
        const table = document.createElement("table");
        const sorted = done.slice().sort((a, b) => (b.done_date ?? "").localeCompare(a.done_date ?? ""));
        for (const g of sorted) renderGoalRow(table, g, { showDate: true });
        doneBox.appendChild(wrapTable(table));
    }
}

document.getElementById("add-goal-btn").onclick = addGoal;
(async () => {
    const user = await requireAuth();
    if (!user) return;
    if (!(await requireOnboarded(user.id))) return;
    userId = user.id;
    renderNav("goals", user.email);
    render();
})();
