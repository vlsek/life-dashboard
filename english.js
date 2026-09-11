let userId;

// Бесплатный переводчик без ключа (MyMemory) — вызывается прямо из браузера пользователя,
// никаких серверных секретов не нужно. Лимит щедрый для личного использования (не для спама).
async function autoTranslate(text, fromLang = "en", toLang = "ru") {
    if (!text?.trim()) return null;
    try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.trim())}&langpair=${fromLang}|${toLang}`;
        const resp = await fetch(url);
        if (!resp.ok) return null;
        const data = await resp.json();
        const translated = data?.responseData?.translatedText;
        // MyMemory возвращает "NO QUERY SPECIFIED" / похожие фейковые ответы при проблемах — отсекаем
        if (!translated || /no query|invalid|error/i.test(translated)) return null;
        return translated;
    } catch (e) {
        console.error("Translate error:", e);
        return null;
    }
}

// ---- Кастомная модалка добавления/редактирования слова с автопереводом ----

function openWordModal(existing, onSubmit) {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `<h3>${existing ? t("eng_edit_word") : t("eng_new_word")}</h3>`;

    const wordLabel = document.createElement("label");
    wordLabel.style.cssText = "display:block; margin-bottom:14px;";
    wordLabel.textContent = t("eng_field_word");
    const wordInput = document.createElement("input");
    wordInput.type = "text";
    wordInput.style.cssText = "width:100%; margin-top:4px;";
    wordInput.value = existing?.word ?? "";
    wordLabel.appendChild(wordInput);
    modal.appendChild(wordLabel);

    const translationLabel = document.createElement("label");
    translationLabel.style.cssText = "display:block; margin-bottom:4px;";
    translationLabel.textContent = t("eng_field_translation");
    modal.appendChild(translationLabel);

    const translationRow = document.createElement("div");
    translationRow.style.cssText = "display:flex; gap:6px; margin-bottom:14px;";
    const translationInput = document.createElement("input");
    translationInput.type = "text";
    translationInput.style.flex = "1";
    translationInput.value = existing?.translation ?? "";
    const translateBtn = document.createElement("button");
    translateBtn.type = "button";
    translateBtn.className = "secondary";
    translateBtn.textContent = "🔄";
    translateBtn.title = t("eng_translate_btn_title");
    translationRow.appendChild(translationInput);
    translationRow.appendChild(translateBtn);
    modal.appendChild(translationRow);

    let autoFilled = false; // чтобы не перетирать то, что человек уже сам поправил

    async function runTranslate() {
        if (!wordInput.value.trim()) return;
        translateBtn.disabled = true;
        translateBtn.textContent = "⏳";
        const result = await autoTranslate(wordInput.value, "en", "ru");
        translateBtn.disabled = false;
        translateBtn.textContent = "🔄";
        if (result) {
            translationInput.value = result;
            autoFilled = true;
        } else {
            showToast(t("eng_translate_error"), "error");
        }
    }
    translateBtn.onclick = runTranslate;

    // автоматически переводим при уходе с поля слова, если перевод ещё пуст или был автозаполнен
    wordInput.addEventListener("blur", () => {
        if (!translationInput.value.trim() || autoFilled) runTranslate();
    });
    // как только человек сам печатает в переводе — больше не перезатираем
    translationInput.addEventListener("input", () => { autoFilled = false; });

    const exampleLabel = document.createElement("label");
    exampleLabel.style.cssText = "display:block; margin-bottom:14px;";
    exampleLabel.textContent = t("eng_field_example");
    const exampleInput = document.createElement("input");
    exampleInput.type = "text";
    exampleInput.style.cssText = "width:100%; margin-top:4px;";
    exampleInput.value = existing?.example ?? "";
    exampleLabel.appendChild(exampleInput);
    modal.appendChild(exampleLabel);

    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "secondary";
    cancelBtn.textContent = t("cancel");
    cancelBtn.onclick = () => backdrop.remove();
    const okBtn = document.createElement("button");
    okBtn.textContent = t("save");
    okBtn.onclick = async () => {
        if (!wordInput.value.trim()) return;
        backdrop.remove();
        await onSubmit({ word: wordInput.value.trim(), translation: translationInput.value.trim() || null, example: exampleInput.value.trim() || null });
    };
    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);
    modal.appendChild(actions);

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    wordInput.focus();
}

async function addWord() {
    openWordModal(null, async (res) => {
        const { error } = await sb.from("vocabulary").insert({
            user_id: userId, word: res.word, translation: res.translation,
            example: res.example, learned: false
        });
        if (error) { showToast(t("dash_save_error_generic") + error.message, "error"); console.error(error); return; }
        render();
    });
}

async function editWord(w) {
    openWordModal(w, async (res) => {
        const { error } = await sb.from("vocabulary").update({
            word: res.word, translation: res.translation, example: res.example
        }).eq("id", w.id);
        if (error) { showToast(t("dash_save_error_generic") + error.message, "error"); console.error(error); return; }
        render();
    });
}

async function deleteWord(id) {
    if (!confirm(t("eng_confirm_delete"))) return;
    const { error } = await sb.from("vocabulary").delete().eq("id", id);
    if (error) { showToast(t("dash_delete_error_generic") + error.message, "error"); console.error(error); return; }
    render();
}

async function toggleLearned(w) {
    const { error } = await sb.from("vocabulary").update({ learned: !w.learned }).eq("id", w.id);
    if (error) { showToast(t("dash_save_error_generic") + error.message, "error"); console.error(error); return; }
    render();
}

function renderWordRow(table, w) {
    const row = table.insertRow();
    const checkCell = row.insertCell();
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!w.learned;
    cb.onchange = () => toggleLearned(w);
    checkCell.appendChild(cb);

    const wordCell = row.insertCell();
    wordCell.textContent = w.word;
    if (w.learned) wordCell.className = "done-text";
    wordCell.style.fontWeight = "600";

    row.insertCell().textContent = w.translation || "—";

    const exampleCell = row.insertCell();
    exampleCell.className = "dim";
    exampleCell.style.fontSize = "0.85em";
    exampleCell.textContent = w.example || "";

    const actionsCell = row.insertCell();
    actionsCell.style.whiteSpace = "nowrap";
    const editBtn = document.createElement("button");
    editBtn.className = "secondary";
    editBtn.textContent = "✏️";
    editBtn.style.marginRight = "4px";
    editBtn.onclick = () => editWord(w);
    actionsCell.appendChild(editBtn);
    const delBtn = document.createElement("button");
    delBtn.className = "danger";
    delBtn.textContent = "🗑";
    delBtn.onclick = () => deleteWord(w.id);
    actionsCell.appendChild(delBtn);
}

async function render() {
    const { data: words } = await sb.from("vocabulary").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    const active = (words || []).filter(w => !w.learned);
    const done = (words || []).filter(w => w.learned);

    const statsCard = document.getElementById("stats-card");
    statsCard.innerHTML = `<div class="stat-row">
        <div>${t("eng_learning_label")} ${active.length}</div>
        <div>${t("eng_learned_label")} ${done.length}</div>
        <div class="push-right" style="font-weight:bold;">${t("eng_total_label")} ${(words || []).length}</div>
    </div>`;

    const activeBox = document.getElementById("words-active");
    activeBox.innerHTML = "";
    if (active.length === 0) {
        activeBox.innerHTML = `<p class="dim">${t("eng_nothing_to_learn")}</p>`;
    } else {
        const table = document.createElement("table");
        for (const w of active) renderWordRow(table, w);
        activeBox.appendChild(wrapTable(table));
    }

    const doneBox = document.getElementById("words-done");
    doneBox.innerHTML = "";
    if (done.length === 0) {
        doneBox.innerHTML = `<p class="dim">${t("eng_nothing_learned")}</p>`;
    } else {
        const table = document.createElement("table");
        for (const w of done) renderWordRow(table, w);
        doneBox.appendChild(wrapTable(table));
    }
}

document.getElementById("add-word-btn").onclick = addWord;
(async () => {
    const user = await requireAuth();
    if (!user) return;
    if (!(await requireOnboarded(user.id))) return;
    userId = user.id;
    renderNav("english", user.email);
    render();
})();
