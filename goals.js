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
    ], onSubmit);
}

async function addGoal() {
    openGoalForm(null, async (res) => {
        if (!res.name?.trim()) return;
        const { error } = await sb.from("goals").insert({
            user_id: userId, name: res.name.trim(), points: res.points || 5,
            category: (res.category || t("goals_no_category")).trim(), stages: Math.max(1, res.stages || 1),
            current_stage: 0, done: false
        });
        if (error) { showToast(t("dash_save_error_generic") + error.message, "error"); console.error(error); return; }
        render();
    });
}

async function editGoal(g) {
    openGoalForm(g, async (res) => {
        if (!res.name?.trim()) return;
        const stages = Math.max(1, res.stages || 1);
        const patch = {
            name: res.name.trim(), points: res.points || 5,
            category: (res.category || t("goals_no_category")).trim(), stages
        };
        if (g.current_stage > stages) patch.current_stage = stages;
        if (stages > 1) patch.done = (g.current_stage ?? 0) >= stages;
        const { error } = await sb.from("goals").update(patch).eq("id", g.id);
        if (error) { showToast(t("dash_save_error_generic") + error.message, "error"); console.error(error); return; }
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
    nameCell.textContent = g.name;
    if (g.done) nameCell.className = "done-text";

    row.insertCell().textContent = `${g.points ?? 5} 🪙`;

    if (showDate) {
        row.insertCell().textContent = g.done_date ? fmtRu(g.done_date) : "";
    }

    const actionsCell = row.insertCell();
    actionsCell.style.whiteSpace = "nowrap";
    const editBtn = document.createElement("button");
    editBtn.className = "secondary";
    editBtn.textContent = "✏️";
    editBtn.style.marginRight = "4px";
    editBtn.onclick = () => editGoal(g);
    actionsCell.appendChild(editBtn);
    const delBtn = document.createElement("button");
    delBtn.className = "danger";
    delBtn.textContent = "🗑";
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
            for (const g of categories[cat]) renderGoalRow(table, g);
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
