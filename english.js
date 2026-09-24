let userId;

// Языки, на которых можно вести словарь: код ISO 639-1 → название на самом языке
const VOCAB_LANGS = [
    ["en", "English"], ["de", "Deutsch"], ["fr", "Français"], ["es", "Español"], ["it", "Italiano"],
    ["pt", "Português"], ["nl", "Nederlands"], ["pl", "Polski"], ["cs", "Čeština"], ["sv", "Svenska"],
    ["tr", "Türkçe"], ["uk", "Українська"], ["ru", "Русский"], ["ka", "ქართული"], ["ar", "العربية"],
    ["he", "עברית"], ["hi", "हिन्दी"], ["zh", "中文"], ["ja", "日本語"], ["ko", "한국어"],
];
function langName(code) { return (VOCAB_LANGS.find(l => l[0] === code) || [code, (code || "").toUpperCase()])[1]; }

// Выбранный фильтр списка ("all" или код языка) и последний язык, на котором добавляли слово
function getLangFilter() { try { return localStorage.getItem("vocab_lang_filter") || "all"; } catch { return "all"; } }
function setLangFilter(v) { try { localStorage.setItem("vocab_lang_filter", v); } catch { /* ignore */ } }
function getLastLang() { try { return localStorage.getItem("vocab_last_lang") || "en"; } catch { return "en"; } }
function setLastLang(v) { try { localStorage.setItem("vocab_last_lang", v); } catch { /* ignore */ } }
// Перевод идёт на язык интерфейса; если учишь как раз его — тогда на английский
function translationTarget(fromLang) {
    const ui = getLang() === "en" ? "en" : "ru";
    return ui === fromLang ? "en" : ui;
}

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

    // Язык слова
    const langLabel = document.createElement("label");
    langLabel.style.cssText = "display:block; margin-bottom:14px;";
    langLabel.textContent = t("eng_field_lang");
    const langSelect = document.createElement("select");
    langSelect.style.cssText = "width:100%; margin-top:4px;";
    VOCAB_LANGS.forEach(([code, name]) => {
        const o = document.createElement("option");
        o.value = code;
        o.textContent = name;
        langSelect.appendChild(o);
    });
    const filterNow = getLangFilter();
    langSelect.value = existing?.lang || (filterNow !== "all" ? filterNow : getLastLang());
    langLabel.appendChild(langSelect);
    modal.appendChild(langLabel);
    enhanceSelectWithCustomDropdown(langSelect);

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
        const result = await autoTranslate(wordInput.value, langSelect.value, translationTarget(langSelect.value));
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
        setLastLang(langSelect.value);
        await onSubmit({ word: wordInput.value.trim(), translation: translationInput.value.trim() || null, example: exampleInput.value.trim() || null, lang: langSelect.value });
    };
    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);
    modal.appendChild(actions);

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    wordInput.focus();
}

function langFields(res, existing) {
    if (res.lang !== "en" || (existing && "lang" in existing)) return { lang: res.lang };
    return {};
}
function showVocabSaveError(error) {
    const hint = /lang/i.test(error.message || "") ? " — " + t("eng_lang_migration_hint") : "";
    showToast(t("dash_save_error_generic") + error.message + hint, "error");
    console.error(error);
}

async function addWord() {
    openWordModal(null, async (res) => {
        const { error } = await sb.from("vocabulary").insert({
            user_id: userId, word: res.word, translation: res.translation,
            example: res.example, learned: false, ...langFields(res, null)
        });
        if (error) { showVocabSaveError(error); return; }
        render();
    });
}

async function editWord(w) {
    openWordModal(w, async (res) => {
        const { error } = await sb.from("vocabulary").update({
            word: res.word, translation: res.translation, example: res.example, ...langFields(res, w)
        }).eq("id", w.id);
        if (error) { showVocabSaveError(error); return; }
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
    const wordSpan = document.createElement("span");
    wordSpan.textContent = w.word;
    if (w.learned) wordSpan.className = "done-text";
    wordSpan.style.fontWeight = "600";
    wordCell.appendChild(wordSpan);
    if (getLangFilter() === "all") {
        const tag = document.createElement("span");
        tag.textContent = (w.lang || "en").toUpperCase();
        tag.title = langName(w.lang || "en");
        tag.style.cssText = "margin-left:6px; font-size:0.65em; padding:1px 6px; border-radius:8px; border:1px solid var(--border); color:var(--text-dim); vertical-align:middle;";
        wordCell.appendChild(tag);
    }

    row.insertCell().textContent = w.translation || "—";

    const exampleCell = row.insertCell();
    exampleCell.className = "dim";
    exampleCell.style.fontSize = "0.85em";
    exampleCell.textContent = w.example || "";

    const actionsCell = row.insertCell();
    actionsCell.style.whiteSpace = "nowrap";
    const editBtn = document.createElement("button");
    editBtn.className = "secondary";
    setIcon(editBtn, "edit");
    editBtn.style.marginRight = "4px";
    editBtn.onclick = () => editWord(w);
    actionsCell.appendChild(editBtn);
    const delBtn = document.createElement("button");
    delBtn.className = "danger";
    setIcon(delBtn, "trash");
    delBtn.onclick = () => deleteWord(w.id);
    actionsCell.appendChild(delBtn);
}

async function render() {
    const { data: allWords } = await sb.from("vocabulary").select("*").eq("user_id", userId).order("created_at", { ascending: false });

    // Фильтр по языку: "Все" + только те языки, на которых уже есть слова
    const counts = {};
    (allWords || []).forEach(w => { const l = w.lang || "en"; counts[l] = (counts[l] || 0) + 1; });
    let filter = getLangFilter();
    if (filter !== "all" && !counts[filter]) { filter = "all"; setLangFilter("all"); }
    const filterBox = document.getElementById("lang-filter");
    filterBox.innerHTML = "";
    const codes = Object.keys(counts);
    if (codes.length > 1) {
        [["all", t("eng_filter_all"), allWords.length], ...codes.map(c => [c, langName(c), counts[c]])].forEach(([code, label, n]) => {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "pill" + (filter === code ? " selected" : "");
            b.style.minHeight = "0";
            b.textContent = `${label} · ${n}`;
            b.onclick = () => { setLangFilter(code); render(); };
            filterBox.appendChild(b);
        });
    }
    const words = (allWords || []).filter(w => filter === "all" || (w.lang || "en") === filter);
    const active = words.filter(w => !w.learned);
    const done = words.filter(w => w.learned);

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
