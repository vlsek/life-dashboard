let userId;

// ==== Каталог готовых челленджей ====
const CHALLENGE_TEMPLATES_RU = [
    {
        id: "pushups_100_30", icon: "💪", title: "100 отжиманий каждый день — месяц",
        description: "Каждый день отжиматься минимум 100 раз (можно за несколько подходов). 30 дней подряд.",
        type: "daily_fixed", durationDays: 30, dailyTarget: 100, unit: "раз"
    },
    {
        id: "pushups_progressive_30", icon: "📈", title: "Отжимания с шагом +5 в день — месяц",
        description: "Начинаешь с 10 отжиманий в первый день, каждый следующий день цель растёт на 5. К концу месяца — больше 150 за день.",
        type: "daily_progressive", durationDays: 30, startValue: 10, dailyIncrement: 5, unit: "раз"
    },
    {
        id: "no_sugar_21", icon: "🍬", title: "Без сахара — 21 день",
        description: "21 день без добавленного сахара. Просто отмечаешь каждый день галочкой.",
        type: "daily_boolean", durationDays: 21
    },
    {
        id: "cold_shower_30", icon: "🥶", title: "Холодный душ каждый день — месяц",
        description: "30 дней подряд заканчивать душ холодной водой.",
        type: "daily_boolean", durationDays: 30
    },
    {
        id: "read_100_books", icon: "📚", title: "Прочитать 100 книг",
        description: "Без ограничения по времени — веди учёт каждой прочитанной книги.",
        type: "cumulative_count", targetCount: 100, itemLabel: "книга"
    },
    {
        id: "words_100", icon: "🗣️", title: "Выучить 100 новых слов",
        description: "Веди учёт каждого выученного слова.",
        type: "cumulative_count", targetCount: 100, itemLabel: "слово"
    },
];
const CHALLENGE_TEMPLATES_EN = [
    {
        id: "pushups_100_30", icon: "💪", title: "100 push-ups every day — a month",
        description: "Do at least 100 push-ups every day (can be split into sets). 30 days in a row.",
        type: "daily_fixed", durationDays: 30, dailyTarget: 100, unit: "reps"
    },
    {
        id: "pushups_progressive_30", icon: "📈", title: "Push-ups +5 per day — a month",
        description: "Start with 10 push-ups on day one, the target grows by 5 each day. By the end of the month — over 150 in a day.",
        type: "daily_progressive", durationDays: 30, startValue: 10, dailyIncrement: 5, unit: "reps"
    },
    {
        id: "no_sugar_21", icon: "🍬", title: "No sugar — 21 days",
        description: "21 days without added sugar. Just check a box each day.",
        type: "daily_boolean", durationDays: 21
    },
    {
        id: "cold_shower_30", icon: "🥶", title: "Cold shower every day — a month",
        description: "End your shower with cold water for 30 days in a row.",
        type: "daily_boolean", durationDays: 30
    },
    {
        id: "read_100_books", icon: "📚", title: "Read 100 books",
        description: "No time limit — keep track of every book you finish.",
        type: "cumulative_count", targetCount: 100, itemLabel: "book"
    },
    {
        id: "words_100", icon: "🗣️", title: "Learn 100 new words",
        description: "Keep track of every word you learn.",
        type: "cumulative_count", targetCount: 100, itemLabel: "word"
    },
];
const CHALLENGE_TEMPLATES = getLang() === "en" ? CHALLENGE_TEMPLATES_EN : CHALLENGE_TEMPLATES_RU;

function daysBetween(fromStr, toStr) {
    return Math.round((new Date(toStr) - new Date(fromStr)) / 86400000);
}

// Цель на конкретный день челленджа (индекс с 0). null — если у типа нет числовой дневной цели.
function targetForDay(ch, dayIndex) {
    if (ch.type === "daily_fixed") return ch.daily_target;
    if (ch.type === "daily_progressive") return (ch.start_value ?? 0) + (ch.daily_increment ?? 0) * dayIndex;
    return null;
}

// ==== Каталог: выбрать и начать готовый челлендж ====

function openCatalogModal() {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.style.width = "480px";
    modal.innerHTML = `<h3>${t("ch_catalog_title")}</h3>`;

    const list = document.createElement("div");
    for (const tpl of CHALLENGE_TEMPLATES) {
        const card = document.createElement("div");
        card.className = "card";
        card.style.cssText = "margin-bottom:10px; cursor:pointer;";
        card.innerHTML = `<strong>${tpl.icon} ${tpl.title}</strong>
            <div class="dim" style="font-size:0.85em; margin-top:4px;">${tpl.description}</div>`;
        card.onclick = async () => {
            await startFromTemplate(tpl);
            backdrop.remove();
        };
        list.appendChild(card);
    }
    modal.appendChild(list);

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

async function startFromTemplate(tpl) {
    const { error } = await sb.from("challenge_instances").insert({
        user_id: userId, template_id: tpl.id, title: tpl.title, icon: tpl.icon, type: tpl.type,
        unit: tpl.unit ?? null, duration_days: tpl.durationDays ?? null, daily_target: tpl.dailyTarget ?? null,
        start_value: tpl.startValue ?? null, daily_increment: tpl.dailyIncrement ?? null,
        target_count: tpl.targetCount ?? null, item_label: tpl.itemLabel ?? null
    });
    if (error) { showToast(t("dash_save_error_generic") + error.message, "error"); console.error(error); return; }
    showToast(t("ch_started_toast"));
    render();
}

// ==== Свой челлендж ====

function openCustomChallengeModal() {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `<h3>${t("ch_custom_title")}</h3>`;

    function field(labelText, input) {
        const label = document.createElement("label");
        label.textContent = labelText;
        label.appendChild(input);
        modal.appendChild(label);
        return input;
    }

    const titleInput = field(t("ch_field_title"), Object.assign(document.createElement("input"), { type: "text" }));
    const iconInput = field(t("ch_field_icon"), Object.assign(document.createElement("input"), { type: "text", value: "🏆" }));

    const typeSelect = document.createElement("select");
    [["daily_fixed", t("ch_type_daily_fixed")], ["daily_progressive", t("ch_type_daily_progressive")],
     ["daily_boolean", t("ch_type_daily_boolean")], ["cumulative_count", t("ch_type_cumulative")]]
        .forEach(([v, l]) => { const o = document.createElement("option"); o.value = v; o.textContent = l; typeSelect.appendChild(o); });
    field(t("ch_field_type"), typeSelect);

    const durationInput = field(t("ch_field_duration"), Object.assign(document.createElement("input"), { type: "number", value: 30 }));
    const dailyTargetInput = field(t("ch_field_daily_target"), Object.assign(document.createElement("input"), { type: "number", value: 0 }));
    const startValueInput = field(t("ch_field_start_value"), Object.assign(document.createElement("input"), { type: "number", value: 0 }));
    const incrementInput = field(t("ch_field_increment"), Object.assign(document.createElement("input"), { type: "number", value: 1 }));
    const unitInput = field(t("ch_field_unit"), Object.assign(document.createElement("input"), { type: "text" }));
    const targetCountInput = field(t("ch_field_target_count"), Object.assign(document.createElement("input"), { type: "number", value: 10 }));
    const itemLabelInput = field(t("ch_field_item_label"), Object.assign(document.createElement("input"), { type: "text" }));

    function applyTypeState() {
        const type = typeSelect.value;
        const dailyFields = [durationInput];
        const fixedFields = [dailyTargetInput];
        const progFields = [startValueInput, incrementInput];
        const cumFields = [targetCountInput, itemLabelInput];
        dailyFields.forEach(el => el.disabled = !(type.startsWith("daily")));
        fixedFields.forEach(el => el.disabled = type !== "daily_fixed");
        progFields.forEach(el => el.disabled = type !== "daily_progressive");
        unitInput.disabled = type === "daily_boolean";
        cumFields.forEach(el => el.disabled = type !== "cumulative_count");
        [...dailyFields, ...fixedFields, ...progFields, unitInput, ...cumFields].forEach(el => el.style.opacity = el.disabled ? "0.4" : "1");
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
        if (!titleInput.value.trim()) return;
        const type = typeSelect.value;
        const { error } = await sb.from("challenge_instances").insert({
            user_id: userId, template_id: null, title: titleInput.value.trim(), icon: iconInput.value || "🏆", type,
            unit: type === "daily_boolean" ? null : (unitInput.value || null),
            duration_days: type.startsWith("daily") ? (parseInt(durationInput.value) || 30) : null,
            daily_target: type === "daily_fixed" ? (parseFloat(dailyTargetInput.value) || 0) : null,
            start_value: type === "daily_progressive" ? (parseFloat(startValueInput.value) || 0) : null,
            daily_increment: type === "daily_progressive" ? (parseFloat(incrementInput.value) || 0) : null,
            target_count: type === "cumulative_count" ? (parseFloat(targetCountInput.value) || 0) : null,
            item_label: type === "cumulative_count" ? (itemLabelInput.value || null) : null
        });
        backdrop.remove();
        if (error) { showToast(t("dash_save_error_generic") + error.message, "error"); console.error(error); return; }
        showToast(t("ch_started_toast"));
        render();
    };
    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);
    modal.appendChild(actions);

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    titleInput.focus();
}

// ==== Рендер карточки челленджа ====

async function upsertDailyEntry(challengeId, dateStr, value) {
    const { data: existing } = await sb.from("challenge_entries").select("id").eq("challenge_id", challengeId).eq("date", dateStr).maybeSingle();
    if (existing) {
        return await sb.from("challenge_entries").update({ value }).eq("id", existing.id);
    }
    return await sb.from("challenge_entries").insert({ user_id: userId, challenge_id: challengeId, date: dateStr, value });
}

async function addCumulativeEntry(challengeId, note) {
    return await sb.from("challenge_entries").insert({ user_id: userId, challenge_id: challengeId, date: todayStr(), value: 1, note: note || null });
}

async function deleteEntry(id, onDone) {
    const { error } = await sb.from("challenge_entries").delete().eq("id", id);
    if (error) { showToast(t("dash_delete_error_generic") + error.message, "error"); console.error(error); return; }
    onDone();
}

async function markCompleted(ch) {
    const { error } = await sb.from("challenge_instances").update({ completed: true, completed_at: new Date().toISOString() }).eq("id", ch.id);
    if (error) { showToast(t("dash_save_error_generic") + error.message, "error"); console.error(error); return; }
    showToast(t("ch_completed_toast"));
    render();
}

async function abandonChallenge(ch) {
    if (!confirm(t("ch_confirm_abandon"))) return;
    const { error } = await sb.from("challenge_instances").update({ active: false }).eq("id", ch.id);
    if (error) { showToast(t("dash_delete_error_generic") + error.message, "error"); console.error(error); return; }
    render();
}

function renderDailyChallengeCard(ch, entries) {
    const card = document.createElement("div");
    card.className = "card";
    card.style.marginBottom = "14px";

    const entryByDate = {};
    entries.forEach(e => { entryByDate[e.date] = e; });

    const todayIdx = daysBetween(ch.start_date, todayStr());
    const duration = ch.duration_days || 30;
    const isBoolean = ch.type === "daily_boolean";
    const doneDays = [];
    for (let i = 0; i < duration; i++) {
        const dateStr = fmtDate(new Date(new Date(ch.start_date).getTime() + i * 86400000));
        const e = entryByDate[dateStr];
        const target = targetForDay(ch, i);
        const done = isBoolean ? (e?.value === 1) : (e && target != null && e.value >= target);
        doneDays.push({ i, dateStr, done, isFuture: i > todayIdx, isToday: i === todayIdx });
    }
    const completedCount = doneDays.filter(d => d.done).length;
    const isOver = todayIdx >= duration;

    const header = document.createElement("div");
    header.style.cssText = "display:flex; align-items:center; gap:8px; flex-wrap:wrap;";
    const title = document.createElement("strong");
    title.textContent = `${ch.icon} ${ch.title}`;
    header.appendChild(title);
    const abandonBtn = document.createElement("button");
    abandonBtn.className = "danger";
    setIcon(abandonBtn, "trash");
    abandonBtn.style.cssText = "margin-left:auto; padding:2px 8px;";
    abandonBtn.onclick = () => abandonChallenge(ch);
    header.appendChild(abandonBtn);
    card.appendChild(header);

    const progressLine = document.createElement("div");
    progressLine.className = "dim";
    progressLine.style.cssText = "font-size:0.85em; margin:6px 0;";
    progressLine.textContent = `${t("ch_day_label")} ${Math.min(todayIdx + 1, duration)}/${duration} · ${t("ch_completed_days")} ${completedCount}/${duration}`;
    card.appendChild(progressLine);

    const dots = document.createElement("div");
    dots.style.cssText = "display:flex; flex-wrap:wrap; gap:3px; margin-bottom:10px;";
    doneDays.forEach(d => {
        const dot = document.createElement("span");
        dot.title = d.dateStr;
        dot.style.cssText = "width:10px; height:10px; border-radius:50%; display:inline-block;" +
            (d.isFuture ? "background:var(--border);" : d.done ? "background:var(--success);" : "background:var(--danger); opacity:0.6;") +
            (d.isToday ? " box-shadow:0 0 0 2px var(--accent);" : "");
        dots.appendChild(dot);
    });
    card.appendChild(dots);

    if (!isOver) {
        const todayEntry = entryByDate[todayStr()];
        const todayTarget = targetForDay(ch, todayIdx);
        const row = document.createElement("div");
        row.style.cssText = "display:flex; align-items:center; gap:8px;";

        if (isBoolean) {
            const label = document.createElement("label");
            label.style.cssText = "display:flex; align-items:center; gap:6px; cursor:pointer;";
            const cb = document.createElement("input");
            cb.type = "checkbox";
            cb.checked = todayEntry?.value === 1;
            cb.onchange = async () => {
                const { error } = await upsertDailyEntry(ch.id, todayStr(), cb.checked ? 1 : 0);
                if (error) { showToast(t("dash_save_error_generic") + error.message, "error"); console.error(error); return; }
                render();
            };
            label.appendChild(cb);
            label.appendChild(document.createTextNode(t("ch_done_today_label")));
            row.appendChild(label);
        } else {
            const targetLabel = document.createElement("span");
            targetLabel.className = "dim";
            targetLabel.style.fontSize = "0.85em";
            targetLabel.textContent = `${t("ch_target_today")} ${todayTarget}${ch.unit ? " " + ch.unit : ""}:`;
            row.appendChild(targetLabel);

            const input = document.createElement("input");
            input.type = "number";
            input.step = "any";
            input.style.width = "90px";
            input.value = todayEntry?.value ?? "";
            input.placeholder = "0";
            input.onchange = async () => {
                const value = input.value === "" ? 0 : (parseFloat(input.value) || 0);
                const { error } = await upsertDailyEntry(ch.id, todayStr(), value);
                if (error) { showToast(t("dash_save_error_generic") + error.message, "error"); console.error(error); return; }
                flashSaved(input);
                render();
            };
            row.appendChild(input);
        }
        card.appendChild(row);
    } else {
        const overNote = document.createElement("p");
        overNote.className = "dim";
        overNote.style.fontSize = "0.85em";
        overNote.textContent = t("ch_duration_over_note");
        card.appendChild(overNote);
        const completeBtn = document.createElement("button");
        completeBtn.textContent = t("ch_mark_completed_btn");
        completeBtn.onclick = () => markCompleted(ch);
        card.appendChild(completeBtn);
    }

    return card;
}

function renderCumulativeChallengeCard(ch, entries) {
    const card = document.createElement("div");
    card.className = "card";
    card.style.marginBottom = "14px";

    const header = document.createElement("div");
    header.style.cssText = "display:flex; align-items:center; gap:8px; flex-wrap:wrap;";
    const title = document.createElement("strong");
    title.textContent = `${ch.icon} ${ch.title}`;
    header.appendChild(title);
    const abandonBtn = document.createElement("button");
    abandonBtn.className = "danger";
    setIcon(abandonBtn, "trash");
    abandonBtn.style.cssText = "margin-left:auto; padding:2px 8px;";
    abandonBtn.onclick = () => abandonChallenge(ch);
    header.appendChild(abandonBtn);
    card.appendChild(header);

    const count = entries.reduce((sum, e) => sum + (e.value || 0), 0);
    const target = ch.target_count || 0;
    const itemWord = ch.item_label || "";

    const progressLine = document.createElement("div");
    progressLine.className = "dim";
    progressLine.style.cssText = "font-size:0.85em; margin:6px 0;";
    progressLine.textContent = `${count} / ${target} ${itemWord}`;
    card.appendChild(progressLine);

    const barOuter = document.createElement("div");
    barOuter.style.cssText = "background:var(--bg); border-radius:6px; height:8px; overflow:hidden; margin-bottom:10px;";
    const barInner = document.createElement("div");
    const pct = target > 0 ? Math.min(100, (count / target) * 100) : 0;
    barInner.style.cssText = `background:var(--accent); height:100%; width:${pct}%;`;
    barOuter.appendChild(barInner);
    card.appendChild(barOuter);

    if (count >= target && target > 0) {
        const completeBtn = document.createElement("button");
        completeBtn.textContent = t("ch_mark_completed_btn");
        completeBtn.style.marginBottom = "10px";
        completeBtn.onclick = () => markCompleted(ch);
        card.appendChild(completeBtn);
    }

    const addRow = document.createElement("div");
    addRow.style.cssText = "display:flex; gap:6px; margin-bottom:10px;";
    const noteInput = document.createElement("input");
    noteInput.type = "text";
    noteInput.style.flex = "1";
    noteInput.placeholder = ch.item_label ? `${t("ch_item_placeholder_prefix")} ${ch.item_label}` : t("ch_item_placeholder_generic");
    const addBtn = document.createElement("button");
    addBtn.className = "secondary";
    addBtn.textContent = t("add_btn");
    addBtn.onclick = async () => {
        const { error } = await addCumulativeEntry(ch.id, noteInput.value.trim());
        if (error) { showToast(t("dash_save_error_generic") + error.message, "error"); console.error(error); return; }
        render();
    };
    addRow.appendChild(noteInput);
    addRow.appendChild(addBtn);
    card.appendChild(addRow);

    if (entries.length > 0) {
        const list = document.createElement("div");
        list.style.cssText = "max-height:160px; overflow-y:auto;";
        const table = document.createElement("table");
        entries.slice().reverse().forEach(e => {
            const row = table.insertRow();
            row.insertCell().textContent = fmtRu(e.date);
            const noteCell = row.insertCell();
            noteCell.textContent = e.note || "—";
            const delCell = row.insertCell();
            const delBtn = document.createElement("button");
            delBtn.className = "danger";
            setIcon(delBtn, "x");
            delBtn.style.padding = "2px 8px";
            delBtn.onclick = () => deleteEntry(e.id, render);
            delCell.appendChild(delBtn);
            table.appendChild(row);
        });
        list.appendChild(wrapTable(table));
        card.appendChild(list);
    }

    return card;
}

// ==== Основной рендер страницы ====

async function render() {
    const activeBox = document.getElementById("challenges-active");
    const doneBox = document.getElementById("challenges-completed");
    activeBox.innerHTML = t("loading_ellipsis");

    const { data: instances, error } = await sb.from("challenge_instances").select("*").eq("user_id", userId).eq("active", true).order("created_at");
    if (error) {
        activeBox.innerHTML = `<p class="dim">${t("comm_load_error")} ${error.message} — ${t("ch_migration_hint")}</p>`;
        console.error(error);
        return;
    }
    const { data: allEntries } = await sb.from("challenge_entries").select("*").eq("user_id", userId).order("date");

    const entriesByChallenge = {};
    (allEntries || []).forEach(e => {
        entriesByChallenge[e.challenge_id] = entriesByChallenge[e.challenge_id] || [];
        entriesByChallenge[e.challenge_id].push(e);
    });

    const active = (instances || []).filter(ch => !ch.completed);
    const completed = (instances || []).filter(ch => ch.completed);

    activeBox.innerHTML = "";
    if (active.length === 0) {
        activeBox.innerHTML = `<p class="dim">${t("ch_no_active")}</p>`;
    } else {
        for (const ch of active) {
            const entries = entriesByChallenge[ch.id] || [];
            const card = ch.type === "cumulative_count" ? renderCumulativeChallengeCard(ch, entries) : renderDailyChallengeCard(ch, entries);
            activeBox.appendChild(card);
        }
    }

    doneBox.innerHTML = "";
    if (completed.length === 0) {
        doneBox.innerHTML = `<p class="dim">${t("ch_no_completed")}</p>`;
    } else {
        for (const ch of completed) {
            const row = document.createElement("div");
            row.className = "card";
            row.style.marginBottom = "8px";
            row.innerHTML = `<strong>${ch.icon} ${ch.title}</strong> <span class="dim" style="font-size:0.85em;">— ${fmtRu(ch.completed_at?.slice(0, 10) || ch.start_date)}</span>`;
            doneBox.appendChild(row);
        }
    }
}

document.getElementById("open-catalog-btn").onclick = openCatalogModal;
document.getElementById("add-custom-btn").onclick = openCustomChallengeModal;

(async () => {
    const user = await requireAuth();
    if (!user) return;
    if (!(await requireOnboarded(user.id))) return;
    userId = user.id;
    renderNav("challenges", user.email);
    render();
})();
