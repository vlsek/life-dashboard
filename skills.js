let userId;

const SKILL_SUGGESTIONS_RU = [
    { name: "Продольный шпагат", icon: "🤸" },
    { name: "Поперечный шпагат", icon: "🤸" },
    { name: "Мостик (гимнастический)", icon: "🌉" },
    { name: "Стойка на руках у стены", icon: "🤾" },
    { name: "Подтягивания x10", icon: "💪" },
    { name: "Жонглирование 3 мячами", icon: "🤹" },
    { name: "Свист пальцами", icon: "😗" },
    { name: "Слепая печать", icon: "⌨️" },
    { name: "Скорочтение", icon: "📖" },
    { name: "Задержка дыхания 2 мин", icon: "🫁" },
];
const SKILL_SUGGESTIONS_EN = [
    { name: "Front split", icon: "🤸" },
    { name: "Side split", icon: "🤸" },
    { name: "Bridge (gymnastic)", icon: "🌉" },
    { name: "Wall handstand", icon: "🤾" },
    { name: "10 pull-ups", icon: "💪" },
    { name: "Juggling 3 balls", icon: "🤹" },
    { name: "Whistle with fingers", icon: "😗" },
    { name: "Touch typing", icon: "⌨️" },
    { name: "Speed reading", icon: "📖" },
    { name: "2-minute breath hold", icon: "🫁" },
];
const SKILL_SUGGESTIONS = getLang() === "en" ? SKILL_SUGGESTIONS_EN : SKILL_SUGGESTIONS_RU;

function bar(pct, width = 16) {
    const filled = Math.round((pct / 100) * width);
    return "█".repeat(filled) + "░".repeat(width - filled);
}

function skillFormFields(existing) {
    return [
        { key: "name", label: t("skills_field_name"), type: "text", value: existing?.name ?? "" },
        { key: "step", label: t("skills_field_step"), type: "number", value: existing?.step ?? 10 },
        { key: "points", label: t("skills_field_points"), type: "number", value: existing?.points ?? 10 },
    ];
}

async function addSkill(prefillName) {
    openModal(t("skills_new_title"), skillFormFields(prefillName ? { name: prefillName } : null), async (res) => {
        if (!res.name?.trim()) return;
        const { error } = await sb.from("skills").insert({
            user_id: userId, name: res.name.trim(), progress: 0, mastered: false,
            step: res.step || 10, points: res.points || 10
        });
        if (error) { showToast(t("dash_save_error_generic") + error.message, "error"); console.error(error); return; }
        render();
    });
}

async function editSkill(s) {
    openModal(t("skills_edit_title"), skillFormFields(s), async (res) => {
        if (!res.name?.trim()) return;
        const { error } = await sb.from("skills").update({ name: res.name.trim(), step: res.step || 10, points: res.points || 10 }).eq("id", s.id);
        if (error) { showToast(t("dash_save_error_generic") + error.message, "error"); console.error(error); return; }
        render();
    });
}

async function deleteSkill(id) {
    if (!confirm(t("skills_confirm_delete"))) return;
    const { error } = await sb.from("skills").delete().eq("id", id);
    if (error) { showToast(t("dash_delete_error_generic") + error.message, "error"); console.error(error); return; }
    render();
}

async function bumpProgress(s, direction) {
    const step = s.step ?? 10;
    const progress = Math.max(0, Math.min(100, (s.progress ?? 0) + direction * step));
    const { error } = await sb.from("skills").update({ progress, mastered: progress >= 100 }).eq("id", s.id);
    if (error) { showToast(t("dash_save_error_generic") + error.message, "error"); console.error(error); return; }
    render();
}

async function toggleMastered(s) {
    const mastered = !s.mastered;
    const { error } = await sb.from("skills").update({ mastered, progress: mastered ? 100 : s.progress }).eq("id", s.id);
    if (error) { showToast(t("dash_save_error_generic") + error.message, "error"); console.error(error); return; }
    render();
}

function renderSkillRow(table, s, { withControls = true } = {}) {
    const row = table.insertRow();
    const nameCell = row.insertCell();
    nameCell.textContent = s.name;
    if (s.mastered) nameCell.className = "done-text";

    const barCell = row.insertCell();
    barCell.className = "bar";
    barCell.textContent = bar(s.progress ?? 0);

    row.insertCell().textContent = `${s.progress ?? 0}%`;
    row.insertCell().textContent = `${s.points ?? 10} ⭐`;

    if (withControls) {
        const btnCell = row.insertCell();
        btnCell.style.whiteSpace = "nowrap";
        const minusBtn = document.createElement("button");
        minusBtn.className = "secondary";
        minusBtn.textContent = `−${s.step ?? 10}%`;
        minusBtn.style.marginRight = "4px";
        minusBtn.onclick = () => bumpProgress(s, -1);
        btnCell.appendChild(minusBtn);
        const plusBtn = document.createElement("button");
        plusBtn.className = "secondary";
        plusBtn.textContent = `+${s.step ?? 10}%`;
        plusBtn.onclick = () => bumpProgress(s, 1);
        btnCell.appendChild(plusBtn);
    } else {
        row.insertCell();
    }

    const checkCell = row.insertCell();
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!s.mastered;
    cb.onchange = () => toggleMastered(s);
    checkCell.appendChild(cb);

    const actionsCell = row.insertCell();
    actionsCell.style.whiteSpace = "nowrap";
    const editBtn = document.createElement("button");
    editBtn.className = "secondary";
    editBtn.textContent = "✏️";
    editBtn.style.marginRight = "4px";
    editBtn.onclick = () => editSkill(s);
    actionsCell.appendChild(editBtn);
    const delBtn = document.createElement("button");
    delBtn.className = "danger";
    delBtn.textContent = "🗑";
    delBtn.onclick = () => deleteSkill(s.id);
    actionsCell.appendChild(delBtn);
}

function renderSuggestions(existingNames) {
    const card = document.getElementById("suggestions-card");
    card.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex; flex-wrap:wrap; gap:8px;";
    for (const s of SKILL_SUGGESTIONS) {
        if (existingNames.has(s.name)) continue;
        const btn = document.createElement("button");
        btn.className = "pill";
        btn.textContent = `${s.icon} ${s.name} +`;
        btn.onclick = () => addSkill(s.name);
        wrap.appendChild(btn);
    }
    if (!wrap.children.length) {
        card.innerHTML = `<p class="dim" style="margin:0;">${t("skills_all_suggestions_added")}</p>`;
    } else {
        card.appendChild(wrap);
    }
}

// ---- Книги ----

function bookFormFields(existing) {
    return [
        { key: "title", label: t("skills_book_field_title"), type: "text", value: existing?.title ?? "" },
        { key: "author", label: t("skills_book_field_author"), type: "text", value: existing?.author ?? "" },
        { key: "points", label: t("skills_book_field_points"), type: "number", value: existing?.points ?? 10 },
    ];
}

async function addBook() {
    openModal(t("skills_book_new_title"), bookFormFields(null), async (res) => {
        if (!res.title?.trim()) return;
        const { error } = await sb.from("books").insert({
            user_id: userId, title: res.title.trim(), author: res.author?.trim() || null,
            points: res.points || 10, status: "to_read"
        });
        if (error) { showToast(t("dash_save_error_generic") + error.message, "error"); console.error(error); return; }
        render();
    });
}

async function editBook(b) {
    openModal(t("skills_book_edit_title"), bookFormFields(b), async (res) => {
        if (!res.title?.trim()) return;
        const { error } = await sb.from("books").update({ title: res.title.trim(), author: res.author?.trim() || null, points: res.points || 10 }).eq("id", b.id);
        if (error) { showToast(t("dash_save_error_generic") + error.message, "error"); console.error(error); return; }
        render();
    });
}

async function deleteBook(id) {
    if (!confirm(t("skills_book_confirm_delete"))) return;
    const { error } = await sb.from("books").delete().eq("id", id);
    if (error) { showToast(t("dash_delete_error_generic") + error.message, "error"); console.error(error); return; }
    render();
}

async function toggleBookDone(b) {
    const done = b.status !== "done";
    const { error } = await sb.from("books").update({ status: done ? "done" : "to_read", done_date: done ? todayStr() : null }).eq("id", b.id);
    if (error) { showToast(t("dash_save_error_generic") + error.message, "error"); console.error(error); return; }
    render();
}

function renderBookRow(table, b, { showDate = false } = {}) {
    const row = table.insertRow();
    const checkCell = row.insertCell();
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = b.status === "done";
    cb.onchange = () => toggleBookDone(b);
    checkCell.appendChild(cb);

    const titleCell = row.insertCell();
    titleCell.textContent = b.author ? `${b.title} — ${b.author}` : b.title;
    if (b.status === "done") titleCell.className = "done-text";

    row.insertCell().textContent = `${b.points ?? 10} ⭐`;
    if (showDate) row.insertCell().textContent = b.done_date ? fmtRu(b.done_date) : "";

    const actionsCell = row.insertCell();
    actionsCell.style.whiteSpace = "nowrap";
    const editBtn = document.createElement("button");
    editBtn.className = "secondary";
    editBtn.textContent = "✏️";
    editBtn.style.marginRight = "4px";
    editBtn.onclick = () => editBook(b);
    actionsCell.appendChild(editBtn);
    const delBtn = document.createElement("button");
    delBtn.className = "danger";
    delBtn.textContent = "🗑";
    delBtn.onclick = () => deleteBook(b.id);
    actionsCell.appendChild(delBtn);
}

async function renderBooks() {
    const { data: books } = await sb.from("books").select("*").eq("user_id", userId).order("created_at");
    const active = (books || []).filter(b => b.status !== "done");
    const done = (books || []).filter(b => b.status === "done");

    const activeBox = document.getElementById("books-active");
    activeBox.innerHTML = "";
    if (active.length === 0) {
        activeBox.innerHTML = `<p class="dim">${t("skills_book_list_empty")}</p>`;
    } else {
        const table = document.createElement("table");
        for (const b of active) renderBookRow(table, b);
        activeBox.appendChild(wrapTable(table));
    }

    const doneBox = document.getElementById("books-done");
    doneBox.innerHTML = "";
    if (done.length === 0) {
        doneBox.innerHTML = `<p class="dim">${t("skills_book_none_read")}</p>`;
    } else {
        const table = document.createElement("table");
        for (const b of done) renderBookRow(table, b, { showDate: true });
        doneBox.appendChild(wrapTable(table));
    }
}

async function render() {
    const { data: skills } = await sb.from("skills").select("*").eq("user_id", userId).order("created_at");
    const active = (skills || []).filter(s => !s.mastered);
    const mastered = (skills || []).filter(s => s.mastered);

    renderSuggestions(new Set((skills || []).map(s => s.name)));

    const activeBox = document.getElementById("skills-active");
    activeBox.innerHTML = "";
    if (active.length === 0) {
        activeBox.innerHTML = `<p class="dim">${t("skills_none_active")}</p>`;
    } else {
        const table = document.createElement("table");
        for (const s of active) renderSkillRow(table, s);
        activeBox.appendChild(wrapTable(table));
    }

    const doneBox = document.getElementById("skills-done");
    doneBox.innerHTML = "";
    if (mastered.length === 0) {
        doneBox.innerHTML = `<p class="dim">${t("skills_none_mastered")}</p>`;
    } else {
        const table = document.createElement("table");
        for (const s of mastered) renderSkillRow(table, s, { withControls: false });
        doneBox.appendChild(wrapTable(table));
    }

    renderBooks();
}

document.getElementById("add-skill-btn").onclick = () => addSkill();
document.getElementById("add-book-btn").onclick = addBook;
(async () => {
    const user = await requireAuth();
    if (!user) return;
    if (!(await requireOnboarded(user.id))) return;
    userId = user.id;
    renderNav("skills", user.email);
    render();
})();
