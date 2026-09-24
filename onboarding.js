let user;

const GOAL_OPTIONS_RU = [
    { value: "lose_weight", label: "Похудеть" },
    { value: "gain_muscle", label: "Накачаться / набрать мышечную массу" },
    { value: "learn_skill", label: "Освоить конкретные навыки" },
    { value: "general_fitness", label: "Просто быть в форме / без конкретной цели" },
];
const GOAL_OPTIONS_EN = [
    { value: "lose_weight", label: "Lose weight" },
    { value: "gain_muscle", label: "Build muscle / gain mass" },
    { value: "learn_skill", label: "Learn specific skills" },
    { value: "general_fitness", label: "Just stay in shape / no specific goal" },
];
const GOAL_OPTIONS = getLang() === "en" ? GOAL_OPTIONS_EN : GOAL_OPTIONS_RU;

const BASE_METRICS_RU = [
    { key: "pushups", name: "Отжимания", icon: "💪", type: "number", goal_value: 100, goal_direction: "at_least", unit: "" },
    { key: "water", name: "Вода", icon: "💧", type: "number", goal_value: 2500, goal_direction: "at_least", unit: "мл" },
    { key: "study", name: "Учёба", icon: "📚", type: "number", goal_value: 30, goal_direction: "at_least", unit: "мин" },
    { key: "calories", name: "Калории", icon: "🍽️", type: "number", goal_value: 2000, goal_direction: "at_most", unit: "ккал" },
    { key: "mood", name: "Хорошее настроение / мир в отношениях", icon: "❤️", type: "boolean" },
    {
        key: "workout", name: "Тренировка", icon: "🏋️", type: "multiselect",
        options: [
            { key: "run", label: "🚶 Ходьба/бег" },
            { key: "gym", label: "🏋️ Зал" },
            { key: "stretch", label: "🤸 Стретчинг" },
            { key: "rope", label: "🪢 Скакалка" },
            { key: "swim", label: "🏊 Плаванье" },
            { key: "youtube", label: "📺 Ютуб-тренировка" },
        ]
    },
];
const BASE_METRICS_EN = [
    { key: "pushups", name: "Push-ups", icon: "💪", type: "number", goal_value: 100, goal_direction: "at_least", unit: "" },
    { key: "water", name: "Water", icon: "💧", type: "number", goal_value: 2500, goal_direction: "at_least", unit: "ml" },
    { key: "study", name: "Study", icon: "📚", type: "number", goal_value: 30, goal_direction: "at_least", unit: "min" },
    { key: "calories", name: "Calories", icon: "🍽️", type: "number", goal_value: 2000, goal_direction: "at_most", unit: "kcal" },
    { key: "mood", name: "Good mood / peace in relationships", icon: "❤️", type: "boolean" },
    {
        key: "workout", name: "Workout", icon: "🏋️", type: "multiselect",
        options: [
            { key: "run", label: "🚶 Walk/run" },
            { key: "gym", label: "🏋️ Gym" },
            { key: "stretch", label: "🤸 Stretching" },
            { key: "rope", label: "🪢 Jump rope" },
            { key: "swim", label: "🏊 Swimming" },
            { key: "youtube", label: "📺 YouTube workout" },
        ]
    },
];
const BASE_METRICS = getLang() === "en" ? BASE_METRICS_EN : BASE_METRICS_RU;

const GOAL_METRICS_RU = {
    lose_weight: [{ key: "steps", name: "Шаги", icon: "🚶", type: "number", goal_value: 8000, goal_direction: "at_least", unit: "" }],
    gain_muscle: [{ key: "protein", name: "Белок", icon: "🥩", type: "number", goal_value: 120, goal_direction: "at_least", unit: "г" }],
    learn_skill: [],
    general_fitness: [],
};
const GOAL_METRICS_EN = {
    lose_weight: [{ key: "steps", name: "Steps", icon: "🚶", type: "number", goal_value: 8000, goal_direction: "at_least", unit: "" }],
    gain_muscle: [{ key: "protein", name: "Protein", icon: "🥩", type: "number", goal_value: 120, goal_direction: "at_least", unit: "g" }],
    learn_skill: [],
    general_fitness: [],
};
const GOAL_METRICS = getLang() === "en" ? GOAL_METRICS_EN : GOAL_METRICS_RU;

function metricDescription(m) {
    if (m.type === "boolean") return t("onb_metric_bool");
    if (m.type === "multiselect") return t("onb_metric_multiselect");
    return `${m.goal_direction === "at_most" ? t("onb_metric_less_than") : t("onb_metric_at_least")} ${m.goal_value}${m.unit ? " " + m.unit : ""}`;
}

function renderForm() {
    const card = document.getElementById("form-card");
    card.innerHTML = "";

    function field(labelText, inputEl) {
        const label = document.createElement("label");
        label.style.display = "block";
        label.style.marginBottom = "14px";
        label.textContent = labelText;
        inputEl.style.width = "100%";
        inputEl.style.marginTop = "4px";
        label.appendChild(inputEl);
        card.appendChild(label);
        return inputEl;
    }

    // ---- Как планируешь использовать — влияет на то, что показываем дальше в форме
    // и какие настройки дашборда включаем по умолчанию (метрики vs план на день) ----
    const usecaseSelect = document.createElement("select");
    [
        { value: "goals", label: t("onb_usecase_goals") },
        { value: "planner", label: t("onb_usecase_planner") },
        { value: "both", label: t("onb_usecase_both") },
    ].forEach(opt => {
        const o = document.createElement("option");
        o.value = opt.value;
        o.textContent = opt.label;
        usecaseSelect.appendChild(o);
    });
    field(t("onb_field_usecase"), usecaseSelect);
    enhanceSelectWithCustomDropdown(usecaseSelect);

    const genderSelect = document.createElement("select");
    genderSelect.innerHTML = `<option value="male">${t("onb_gender_male")}</option><option value="female">${t("onb_gender_female")}</option>`;
    field(t("onb_field_gender"), genderSelect);
    enhanceSelectWithCustomDropdown(genderSelect);

    const birthdateInput = document.createElement("input");
    birthdateInput.type = "date";
    birthdateInput.min = "1900-01-01";
    birthdateInput.max = todayStr();
    field(t("dash_birthdate_title"), birthdateInput);

    const heightInput = document.createElement("input");
    heightInput.type = "number";
    heightInput.placeholder = t("onb_height_placeholder");
    field(t("onb_field_height"), heightInput);
    const heightLabel = heightInput.parentNode;

    const weightInput = document.createElement("input");
    weightInput.type = "number";
    weightInput.step = "0.1";
    weightInput.placeholder = t("onb_weight_placeholder");
    field(t("onb_field_weight"), weightInput);
    const weightLabel = weightInput.parentNode;

    const goalSelect = document.createElement("select");
    for (const g of GOAL_OPTIONS) {
        const opt = document.createElement("option");
        opt.value = g.value;
        opt.textContent = g.label;
        goalSelect.appendChild(opt);
    }
    field(t("onb_field_priority"), goalSelect);
    const goalLabel = goalSelect.parentNode;
    enhanceSelectWithCustomDropdown(goalSelect);

    const skillsWrap = document.createElement("div");
    skillsWrap.style.display = "none";
    const skillsInput = document.createElement("input");
    skillsInput.type = "text";
    skillsInput.placeholder = t("onb_skills_placeholder");
    const skillsLabel = document.createElement("label");
    skillsLabel.textContent = t("onb_skills_label");
    skillsLabel.style.display = "block";
    skillsLabel.style.marginBottom = "14px";
    skillsInput.style.width = "100%";
    skillsInput.style.marginTop = "4px";
    skillsLabel.appendChild(skillsInput);
    skillsWrap.appendChild(skillsLabel);
    card.appendChild(skillsWrap);

    // ---- Раскрывающийся список метрик под выбранную цель ----
    const metricsToggle = document.createElement("button");
    metricsToggle.type = "button";
    metricsToggle.className = "secondary";
    metricsToggle.style.cssText = "width:100%; margin-bottom:10px;";
    metricsToggle.textContent = t("onb_metrics_toggle_show");
    card.appendChild(metricsToggle);

    const metricsWrap = document.createElement("div");
    metricsWrap.style.cssText = "display:none; margin-bottom:14px; padding:10px; border:1px solid var(--border); border-radius:8px;";
    card.appendChild(metricsWrap);

    const checkboxByKey = {};

    function renderMetricsCheckboxes() {
        metricsWrap.innerHTML = "";
        const candidates = [...BASE_METRICS, ...(GOAL_METRICS[goalSelect.value] || [])];
        for (const m of candidates) {
            const row = document.createElement("label");
            row.style.cssText = "display:flex; align-items:flex-start; gap:8px; margin-bottom:8px; font-weight:normal;";
            const cb = document.createElement("input");
            cb.type = "checkbox";
            cb.checked = checkboxByKey[m.key] !== undefined ? checkboxByKey[m.key] : true;
            cb.style.width = "auto";
            cb.style.marginTop = "3px";
            cb.onchange = () => { checkboxByKey[m.key] = cb.checked; };
            row.appendChild(cb);
            const textWrap = document.createElement("div");
            textWrap.innerHTML = `${iconHtml(m.icon, "margin-right:0.35em;")}<strong>${m.name}</strong> <span class="dim" style="font-size:0.85em;">— ${metricDescription(m)}</span>`;
            row.appendChild(textWrap);
            metricsWrap.appendChild(row);
        }
    }
    renderMetricsCheckboxes();

    metricsToggle.onclick = () => {
        const open = metricsWrap.style.display !== "none";
        metricsWrap.style.display = open ? "none" : "block";
        metricsToggle.textContent = open ? t("onb_metrics_toggle_show") : t("onb_metrics_toggle_hide");
    };

    goalSelect.onchange = () => {
        skillsWrap.style.display = goalSelect.value === "learn_skill" ? "block" : "none";
        renderMetricsCheckboxes();
    };

    // Для сценария "ежедневник" скрываем всё, что относится к фитнес-целям и метрикам —
    // человеку, который хочет просто список дел, не нужно продираться через это на старте.
    function applyUsecaseVisibility() {
        const isPlanner = usecaseSelect.value === "planner";
        heightLabel.style.display = isPlanner ? "none" : "block";
        weightLabel.style.display = isPlanner ? "none" : "block";
        goalLabel.style.display = isPlanner ? "none" : "block";
        metricsToggle.style.display = isPlanner ? "none" : "block";
        metricsWrap.style.display = "none";
        metricsToggle.textContent = t("onb_metrics_toggle_show");
        skillsWrap.style.display = (!isPlanner && goalSelect.value === "learn_skill") ? "block" : "none";
    }
    usecaseSelect.onchange = applyUsecaseVisibility;
    applyUsecaseVisibility();

    const submitBtn = document.createElement("button");
    submitBtn.textContent = t("onb_submit_btn");
    submitBtn.style.width = "100%";
    submitBtn.style.marginTop = "10px";
    submitBtn.onclick = async () => {
        const bd = birthdateInput.value;
        if (bd && (bd < "1900-01-01" || bd > todayStr())) {
            alert(t("dash_birthdate_range_error"));
            return;
        }
        submitBtn.disabled = true;
        submitBtn.textContent = t("onb_submitting");
        const isPlanner = usecaseSelect.value === "planner";
        const candidates = isPlanner ? [] : [...BASE_METRICS, ...(GOAL_METRICS[goalSelect.value] || [])];
        const selectedMetrics = candidates.filter(m => checkboxByKey[m.key] !== false);

        // Настройка диаграммы дня по умолчанию под выбранный сценарий — личная настройка
        // отображения (localStorage), можно будет поменять в любой момент через ⚙️ на диаграмме.
        try {
            localStorage.setItem("day_progress_settings", JSON.stringify(
                isPlanner ? { enabled: true, includePlanned: true, includeMetrics: false }
                    : usecaseSelect.value === "goals" ? { enabled: true, includePlanned: false, includeMetrics: true }
                        : { enabled: true, includePlanned: true, includeMetrics: true }
            ));
        } catch { /* localStorage недоступен — не критично, останутся дефолтные настройки */ }

        await completeOnboarding({
            gender: genderSelect.value,
            birthdate: birthdateInput.value || null,
            height: isPlanner ? null : (heightInput.value ? parseFloat(heightInput.value) : null),
            weight: isPlanner ? null : (weightInput.value ? parseFloat(weightInput.value) : null),
            goal_type: isPlanner ? null : goalSelect.value,
            skills_raw: isPlanner ? "" : skillsInput.value,
            selectedMetrics,
        });
    };
    card.appendChild(submitBtn);

    const skipBtn = document.createElement("button");
    skipBtn.textContent = t("onb_skip_btn");
    skipBtn.className = "secondary";
    skipBtn.style.width = "100%";
    skipBtn.style.marginTop = "8px";
    skipBtn.onclick = async () => {
        skipBtn.disabled = true;
        try {
            localStorage.setItem("day_progress_settings", JSON.stringify({ enabled: true, includePlanned: true, includeMetrics: true }));
        } catch { /* не критично */ }
        const { error: profileError } = await sb.from("profiles").upsert({ user_id: user.id, onboarded: true });
        if (profileError) {
            alert(t("dash_save_error_generic") + profileError.message + "\n\n" + t("onb_migration_hint_001"));
            console.error(profileError);
            skipBtn.disabled = false;
            return;
        }
        const seedError = await seedMetrics(BASE_METRICS);
        if (seedError) {
            alert(t("onb_profile_saved_metrics_failed") + seedError.message);
            console.error(seedError);
        }
        try { localStorage.setItem("tour_pending", "1"); } catch { /* не критично */ }
        window.location.href = "dashboard.html";
    };
    card.appendChild(skipBtn);
}

async function seedMetrics(list) {
    if (!list.length) return null;
    const rows = list.map((m, i) => ({
        user_id: user.id, name: m.name, icon: m.icon, type: m.type,
        goal_value: m.goal_value ?? null, goal_direction: m.goal_direction ?? null, unit: m.unit ?? "",
        options: m.options ?? [], position: i,
    }));
    const { error } = await sb.from("metrics").insert(rows);
    return error;
}

async function completeOnboarding(answers) {
    const { error: profileError } = await sb.from("profiles").upsert({
        user_id: user.id,
        gender: answers.gender,
        birthdate: answers.birthdate,
        height: answers.height,
        goal_type: answers.goal_type,
        onboarded: true,
    });
    if (profileError) {
        alert(t("onb_save_form_error") + profileError.message + "\n\n" + t("onb_migration_hint_001b"));
        console.error(profileError);
        const submitBtn = document.querySelector("#form-card button");
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = t("onb_submit_btn"); }
        return;
    }

    const { data: existingParams } = await sb.from("body_parameters").select("id, name").eq("user_id", user.id);
    let weightParamId = existingParams?.find(p => p.name === t("onb_body_param_weight"))?.id;
    if (!existingParams || existingParams.length === 0) {
        const defaults = [
            { user_id: user.id, name: t("onb_body_param_weight"), icon: "⚖️", unit: t("onb_kg_unit"), position: 0 },
            { user_id: user.id, name: t("onb_body_param_fat"), icon: "🧬", unit: "%", position: 1 },
            { user_id: user.id, name: t("onb_body_param_muscle"), icon: "💪", unit: t("onb_kg_unit"), position: 2 },
            { user_id: user.id, name: t("onb_body_param_water"), icon: "💧", unit: "%", position: 3 },
        ];
        const { data: inserted, error: paramsError } = await sb.from("body_parameters").insert(defaults).select();
        if (paramsError) console.error(t("onb_body_params_console_error"), paramsError);
        weightParamId = inserted?.find(p => p.name === t("onb_body_param_weight"))?.id;
    }

    if (answers.weight && weightParamId) {
        await sb.from("body_parameter_values").upsert({
            user_id: user.id, date: todayStr(), parameter_id: weightParamId, value: answers.weight
        }, { onConflict: "user_id,date,parameter_id" });
    }

    const seedError = await seedMetrics(answers.selectedMetrics);
    if (seedError) {
        alert(t("onb_form_saved_metrics_failed") + seedError.message);
        console.error(seedError);
    }

    if (answers.goal_type === "learn_skill" && answers.skills_raw?.trim()) {
        const skillNames = answers.skills_raw.split(",").map(s => s.trim()).filter(Boolean);
        if (skillNames.length) {
            await sb.from("skills").insert(skillNames.map(name => ({ user_id: user.id, name, progress: 0, mastered: false })));
        }
    }

    try { localStorage.setItem("tour_pending", "1"); } catch { /* не критично */ }
    window.location.href = "dashboard.html";
}

(async () => {
    user = await requireAuth();
    if (!user) return;

    const { data: profile } = await sb.from("profiles").select("onboarded").eq("user_id", user.id).maybeSingle();
    if (profile?.onboarded) { window.location.href = "dashboard.html"; return; }

    renderForm();
})();
