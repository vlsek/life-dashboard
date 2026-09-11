// ==== Типовые программы тренировок (шаблоны) ====
// Общеизвестные, давно устоявшиеся схемы тренировок (full-body для новичков, PPL,
// круговая для похудения, без инвентаря) — не привязаны к конкретному источнику,
// это стандартная база знаний фитнеса. При применении шаблона создаются упражнения
// с рекомендованной схемой подходов (справочно), реальные веса/повторения по факту
// человек вводит сам через обычные записи.
const WORKOUT_TEMPLATES_RU = [
    {
        id: "full_body_beginner",
        title: "Всё тело для новичков",
        goalTag: "Сила / общая форма",
        meta: "3 дня в неделю · чередуй День A и День B · начальный уровень",
        days: [
            {
                label: "День A",
                exercises: [
                    { name: "Приседания со штангой", tracksWeight: true, valueLabel: "Повторения", scheme: "3×8–10" },
                    { name: "Жим штанги лёжа", tracksWeight: true, valueLabel: "Повторения", scheme: "3×8–10" },
                    { name: "Тяга штанги в наклоне", tracksWeight: true, valueLabel: "Повторения", scheme: "3×8–10" },
                    { name: "Планка", tracksWeight: false, valueLabel: "Секунды", scheme: "3×30–45 сек" },
                ]
            },
            {
                label: "День B",
                exercises: [
                    { name: "Становая тяга", tracksWeight: true, valueLabel: "Повторения", scheme: "3×6–8" },
                    { name: "Жим штанги стоя", tracksWeight: true, valueLabel: "Повторения", scheme: "3×8–10" },
                    { name: "Тяга верхнего блока / подтягивания", tracksWeight: true, valueLabel: "Повторения", scheme: "3×8–10" },
                    { name: "Скручивания на пресс", tracksWeight: false, valueLabel: "Повторения", scheme: "3×15" },
                ]
            },
        ]
    },
    {
        id: "ppl_muscle",
        title: "Push / Pull / Legs",
        goalTag: "Набор мышечной массы",
        meta: "3–6 дней в неделю · средний уровень",
        days: [
            {
                label: "Push (грудь/плечи/трицепс)",
                exercises: [
                    { name: "Жим штанги лёжа", tracksWeight: true, valueLabel: "Повторения", scheme: "4×8–12" },
                    { name: "Жим гантелей на наклонной", tracksWeight: true, valueLabel: "Повторения", scheme: "3×10–12" },
                    { name: "Жим штанги стоя", tracksWeight: true, valueLabel: "Повторения", scheme: "3×8–10" },
                    { name: "Отжимания на брусьях", tracksWeight: false, valueLabel: "Повторения", scheme: "3× до отказа" },
                    { name: "Разгибания на трицепс", tracksWeight: true, valueLabel: "Повторения", scheme: "3×12–15" },
                ]
            },
            {
                label: "Pull (спина/бицепс)",
                exercises: [
                    { name: "Подтягивания", tracksWeight: false, valueLabel: "Повторения", scheme: "4× до отказа" },
                    { name: "Тяга штанги в наклоне", tracksWeight: true, valueLabel: "Повторения", scheme: "4×8–10" },
                    { name: "Тяга верхнего блока", tracksWeight: true, valueLabel: "Повторения", scheme: "3×10–12" },
                    { name: "Сгибания на бицепс", tracksWeight: true, valueLabel: "Повторения", scheme: "3×10–12" },
                    { name: "Шраги с гантелями", tracksWeight: true, valueLabel: "Повторения", scheme: "3×12–15" },
                ]
            },
            {
                label: "Legs (ноги)",
                exercises: [
                    { name: "Приседания со штангой", tracksWeight: true, valueLabel: "Повторения", scheme: "4×8–10" },
                    { name: "Румынская тяга", tracksWeight: true, valueLabel: "Повторения", scheme: "3×10–12" },
                    { name: "Выпады с гантелями", tracksWeight: true, valueLabel: "Повторения", scheme: "3×10 на ногу" },
                    { name: "Подъём на носки", tracksWeight: true, valueLabel: "Повторения", scheme: "4×15–20" },
                    { name: "Пресс (скручивания)", tracksWeight: false, valueLabel: "Повторения", scheme: "3×15–20" },
                ]
            },
        ]
    },
    {
        id: "fat_loss_circuit",
        title: "Круговая для похудения",
        goalTag: "Снижение веса",
        meta: "4 дня в неделю · без инвентаря · минимальный отдых между упражнениями",
        days: [
            {
                label: "Круг (2–3 раунда)",
                exercises: [
                    { name: "Берпи", tracksWeight: false, valueLabel: "Повторения", scheme: "3×10" },
                    { name: "Приседания с собственным весом", tracksWeight: false, valueLabel: "Повторения", scheme: "3×15–20" },
                    { name: "Отжимания", tracksWeight: false, valueLabel: "Повторения", scheme: "3× до отказа" },
                    { name: "Скалолаз (mountain climbers)", tracksWeight: false, valueLabel: "Секунды", scheme: "3×30 сек" },
                    { name: "Планка", tracksWeight: false, valueLabel: "Секунды", scheme: "3×30–45 сек" },
                    { name: "Прыжки со скакалкой", tracksWeight: false, valueLabel: "Минуты", scheme: "10–15 мин кардио" },
                ]
            },
        ]
    },
    {
        id: "home_no_equipment",
        title: "Дома без инвентаря",
        goalTag: "Общая форма",
        meta: "2–4 дня в неделю · только вес тела",
        days: [
            {
                label: "Тренировка",
                exercises: [
                    { name: "Приседания с собственным весом", tracksWeight: false, valueLabel: "Повторения", scheme: "3×15–20" },
                    { name: "Отжимания", tracksWeight: false, valueLabel: "Повторения", scheme: "3× до отказа" },
                    { name: "Выпады", tracksWeight: false, valueLabel: "Повторения", scheme: "3×12 на ногу" },
                    { name: "Ягодичный мостик", tracksWeight: false, valueLabel: "Повторения", scheme: "3×15–20" },
                    { name: "Планка", tracksWeight: false, valueLabel: "Секунды", scheme: "3×30–60 сек" },
                ]
            },
        ]
    },
];
const WORKOUT_TEMPLATES_EN = [
    {
        id: "full_body_beginner",
        title: "Full Body for Beginners",
        goalTag: "Strength / general fitness",
        meta: "3 days a week · alternate Day A and Day B · beginner level",
        days: [
            {
                label: "Day A",
                exercises: [
                    { name: "Barbell Squat", tracksWeight: true, valueLabel: "Reps", scheme: "3×8–10" },
                    { name: "Barbell Bench Press", tracksWeight: true, valueLabel: "Reps", scheme: "3×8–10" },
                    { name: "Bent-Over Barbell Row", tracksWeight: true, valueLabel: "Reps", scheme: "3×8–10" },
                    { name: "Plank", tracksWeight: false, valueLabel: "Seconds", scheme: "3×30–45 sec" },
                ]
            },
            {
                label: "Day B",
                exercises: [
                    { name: "Deadlift", tracksWeight: true, valueLabel: "Reps", scheme: "3×6–8" },
                    { name: "Overhead Press", tracksWeight: true, valueLabel: "Reps", scheme: "3×8–10" },
                    { name: "Lat Pulldown / Pull-ups", tracksWeight: true, valueLabel: "Reps", scheme: "3×8–10" },
                    { name: "Ab Crunches", tracksWeight: false, valueLabel: "Reps", scheme: "3×15" },
                ]
            },
        ]
    },
    {
        id: "ppl_muscle",
        title: "Push / Pull / Legs",
        goalTag: "Muscle gain",
        meta: "3–6 days a week · intermediate level",
        days: [
            {
                label: "Push (chest/shoulders/triceps)",
                exercises: [
                    { name: "Barbell Bench Press", tracksWeight: true, valueLabel: "Reps", scheme: "4×8–12" },
                    { name: "Incline Dumbbell Press", tracksWeight: true, valueLabel: "Reps", scheme: "3×10–12" },
                    { name: "Overhead Press", tracksWeight: true, valueLabel: "Reps", scheme: "3×8–10" },
                    { name: "Dips", tracksWeight: false, valueLabel: "Reps", scheme: "3× to failure" },
                    { name: "Triceps Extensions", tracksWeight: true, valueLabel: "Reps", scheme: "3×12–15" },
                ]
            },
            {
                label: "Pull (back/biceps)",
                exercises: [
                    { name: "Pull-ups", tracksWeight: false, valueLabel: "Reps", scheme: "4× to failure" },
                    { name: "Bent-Over Barbell Row", tracksWeight: true, valueLabel: "Reps", scheme: "4×8–10" },
                    { name: "Lat Pulldown", tracksWeight: true, valueLabel: "Reps", scheme: "3×10–12" },
                    { name: "Bicep Curls", tracksWeight: true, valueLabel: "Reps", scheme: "3×10–12" },
                    { name: "Dumbbell Shrugs", tracksWeight: true, valueLabel: "Reps", scheme: "3×12–15" },
                ]
            },
            {
                label: "Legs",
                exercises: [
                    { name: "Barbell Squat", tracksWeight: true, valueLabel: "Reps", scheme: "4×8–10" },
                    { name: "Romanian Deadlift", tracksWeight: true, valueLabel: "Reps", scheme: "3×10–12" },
                    { name: "Dumbbell Lunges", tracksWeight: true, valueLabel: "Reps", scheme: "3×10 per leg" },
                    { name: "Calf Raises", tracksWeight: true, valueLabel: "Reps", scheme: "4×15–20" },
                    { name: "Ab Crunches", tracksWeight: false, valueLabel: "Reps", scheme: "3×15–20" },
                ]
            },
        ]
    },
    {
        id: "fat_loss_circuit",
        title: "Fat Loss Circuit",
        goalTag: "Weight loss",
        meta: "4 days a week · no equipment · minimal rest between exercises",
        days: [
            {
                label: "Circuit (2–3 rounds)",
                exercises: [
                    { name: "Burpees", tracksWeight: false, valueLabel: "Reps", scheme: "3×10" },
                    { name: "Bodyweight Squats", tracksWeight: false, valueLabel: "Reps", scheme: "3×15–20" },
                    { name: "Push-ups", tracksWeight: false, valueLabel: "Reps", scheme: "3× to failure" },
                    { name: "Mountain Climbers", tracksWeight: false, valueLabel: "Seconds", scheme: "3×30 sec" },
                    { name: "Plank", tracksWeight: false, valueLabel: "Seconds", scheme: "3×30–45 sec" },
                    { name: "Jump Rope", tracksWeight: false, valueLabel: "Minutes", scheme: "10–15 min cardio" },
                ]
            },
        ]
    },
    {
        id: "home_no_equipment",
        title: "Home, No Equipment",
        goalTag: "General fitness",
        meta: "2–4 days a week · bodyweight only",
        days: [
            {
                label: "Workout",
                exercises: [
                    { name: "Bodyweight Squats", tracksWeight: false, valueLabel: "Reps", scheme: "3×15–20" },
                    { name: "Push-ups", tracksWeight: false, valueLabel: "Reps", scheme: "3× to failure" },
                    { name: "Lunges", tracksWeight: false, valueLabel: "Reps", scheme: "3×12 per leg" },
                    { name: "Glute Bridge", tracksWeight: false, valueLabel: "Reps", scheme: "3×15–20" },
                    { name: "Plank", tracksWeight: false, valueLabel: "Seconds", scheme: "3×30–60 sec" },
                ]
            },
        ]
    },
];
const WORKOUT_TEMPLATES = getLang() === "en" ? WORKOUT_TEMPLATES_EN : WORKOUT_TEMPLATES_RU;

function openTemplatesModal() {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.style.width = "480px";
    modal.innerHTML = `<h3>${t("workouts_templates_title")}</h3><p class="dim" style="font-size:0.85em; margin-top:-8px;">${t("workouts_templates_hint")}</p>`;

    const listWrap = document.createElement("div");
    modal.appendChild(listWrap);

    function showList() {
        listWrap.innerHTML = "";
        for (const tpl of WORKOUT_TEMPLATES) {
            const card = document.createElement("div");
            card.className = "card";
            card.style.cssText = "margin-bottom:10px; cursor:pointer;";
            card.innerHTML = `<strong>${tpl.title}</strong> <span class="dim" style="font-size:0.85em;">— ${tpl.goalTag}</span>
                <div class="dim" style="font-size:0.8em; margin-top:4px;">${tpl.meta}</div>`;
            card.onclick = () => showPreview(tpl);
            listWrap.appendChild(card);
        }
    }

    function showPreview(tpl) {
        listWrap.innerHTML = "";
        const backBtn = document.createElement("button");
        backBtn.className = "secondary";
        backBtn.textContent = "← " + t("workouts_templates_title");
        backBtn.style.marginBottom = "10px";
        backBtn.onclick = showList;
        listWrap.appendChild(backBtn);

        for (const day of tpl.days) {
            const dayTitle = document.createElement("div");
            dayTitle.style.cssText = "font-weight:bold; margin:10px 0 4px;";
            dayTitle.textContent = day.label;
            listWrap.appendChild(dayTitle);
            const ul = document.createElement("ul");
            ul.style.cssText = "margin:0 0 6px; padding-left:20px;";
            for (const ex of day.exercises) {
                const li = document.createElement("li");
                li.className = "dim";
                li.style.fontSize = "0.9em";
                li.textContent = `${ex.name} — ${ex.scheme}`;
                ul.appendChild(li);
            }
            listWrap.appendChild(ul);
        }

        const applyBtn = document.createElement("button");
        applyBtn.textContent = t("workouts_templates_apply_btn");
        applyBtn.style.marginTop = "10px";
        applyBtn.onclick = async () => { await applyTemplate(tpl); backdrop.remove(); };
        listWrap.appendChild(applyBtn);
    }

    showList();

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

async function applyTemplate(tpl) {
    const { data: existing } = await sb.from("workout_exercises").select("name").eq("user_id", userId);
    const existingNames = new Set((existing || []).map(e => e.name.trim().toLowerCase()));

    const rows = [];
    for (const day of tpl.days) {
        for (const ex of day.exercises) {
            if (existingNames.has(ex.name.trim().toLowerCase())) continue; // не дублируем, если уже есть такое упражнение
            rows.push({
                user_id: userId, name: ex.name, category: day.label,
                tracks_weight: ex.tracksWeight, value_label: ex.valueLabel,
                suggested_scheme: ex.scheme, unit: "кг"
            });
            existingNames.add(ex.name.trim().toLowerCase());
        }
    }
    if (rows.length === 0) { showToast(t("workouts_templates_all_exist")); return; }

    const { error } = await sb.from("workout_exercises").insert(rows);
    if (error) { showToast(t("workouts_toast_save_error") + error.message, "error"); console.error(error); return; }
    showToast(t("workouts_templates_applied_toast").replace("{n}", rows.length));
    render();
}

let userId;
const workoutsPeriodState = loadPeriodState("dash_period_workouts", { range: "month", from: null, to: null });

async function renderOverviewChart(allEntries) {
    const card = document.getElementById("overview-card");
    card.innerHTML = "";
    const headerRow = document.createElement("div");
    headerRow.style.cssText = "display:flex; align-items:center; gap:8px; margin-bottom:8px;";
    const title = document.createElement("strong");
    title.textContent = t("workouts_overview_title");
    headerRow.appendChild(title);
    const periodBtn = document.createElement("button");
    periodBtn.className = "secondary";
    periodBtn.style.cssText = "margin-left:auto; padding:2px 10px;";
    periodBtn.textContent = "⚙️";
    periodBtn.title = t("dash_charts_period_label");
    periodBtn.onclick = () => openPeriodModal(t("dash_charts_period_label"), workoutsPeriodState, wrapPeriodPersist("dash_period_workouts", workoutsPeriodState, () => renderOverviewChart(allEntries)));
    headerRow.appendChild(periodBtn);
    card.appendChild(headerRow);

    // суммарное количество подходов по дням, по всем упражнениям сразу — общий объём активности
    const byDay = {};
    for (const e of allEntries) {
        const count = (e.sets || []).length;
        if (!count) continue;
        byDay[e.date] = (byDay[e.date] || 0) + count;
    }
    const [from, to] = periodBounds(workoutsPeriodState.range, workoutsPeriodState.from, workoutsPeriodState.to);
    let days = Object.keys(byDay);
    if (from) days = days.filter(d => d >= from && (!to || d <= to));
    const points = days.sort().map(d => ({ date: d, y: byDay[d] }));

    if (points.length < 2) {
        card.appendChild(Object.assign(document.createElement("p"), { className: "dim", textContent: t("chart_not_enough_data") }));
        return;
    }
    renderChartBlock(card, "", points, { unit: " " + t("workouts_sets_word"), color: "var(--accent)" });
}

function exerciseFormFields(existing) {
    return [
        { key: "name", label: t("workouts_field_name"), type: "text", value: existing?.name ?? "" },
        { key: "category", label: t("workouts_field_category"), type: "text", value: existing?.category ?? "" },
        {
            key: "tracks_weight", label: t("workouts_field_tracks_weight"), type: "select",
            options: [{ value: "yes", label: t("workouts_tracks_weight_yes") }, { value: "no", label: t("workouts_tracks_weight_no") }],
            value: (existing?.tracks_weight ?? true) ? "yes" : "no"
        },
        { key: "value_label", label: t("workouts_field_value_label"), type: "text", value: existing?.value_label ?? t("workouts_default_value_label") },
        { key: "unit", label: t("workouts_field_unit"), type: "text", value: existing?.unit ?? "кг" },
    ];
}

async function addExercise() {
    openModal(t("workouts_new_exercise"), exerciseFormFields(null), async (res) => {
        if (!res.name?.trim()) return;
        const { error } = await sb.from("workout_exercises").insert({
            user_id: userId, name: res.name.trim(), category: res.category?.trim() || null, unit: res.unit?.trim() || "кг",
            tracks_weight: res.tracks_weight !== "no", value_label: res.value_label?.trim() || t("workouts_default_value_label")
        });
        if (error) { showToast(t("workouts_toast_save_error") + error.message, "error"); console.error(error); return; }
        render();
    });
}

async function editExercise(ex) {
    openModal(t("workouts_edit_exercise"), exerciseFormFields(ex), async (res) => {
        if (!res.name?.trim()) return;
        const { error } = await sb.from("workout_exercises").update({
            name: res.name.trim(), category: res.category?.trim() || null, unit: res.unit?.trim() || "кг",
            tracks_weight: res.tracks_weight !== "no", value_label: res.value_label?.trim() || t("workouts_default_value_label")
        }).eq("id", ex.id);
        if (error) { showToast(t("workouts_toast_save_error") + error.message, "error"); console.error(error); return; }
        render();
    });
}

async function deleteExercise(ex) {
    if (!confirm(t("workouts_confirm_delete_exercise").replace("{name}", ex.name))) return;
    const { error } = await sb.from("workout_exercises").delete().eq("id", ex.id);
    if (error) { showToast(t("workouts_toast_save_error") + error.message, "error"); console.error(error); return; }
    render();
}

// ---- Модалка добавления/редактирования записи (подходы динамически, дата, заметка) ----

function openEntryModal(exercise, existing, onSubmit) {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `<h3>${existing ? t("workouts_edit_entry") : t("workouts_new_entry")} — ${exercise.name}</h3>`;

    const dateLabel = document.createElement("label");
    dateLabel.textContent = t("workouts_field_date");
    const dateInput = document.createElement("input");
    dateInput.type = "date";
    dateInput.value = existing?.date ?? todayStr();
    dateInput.max = todayStr();
    dateLabel.appendChild(dateInput);
    modal.appendChild(dateLabel);

    const setsWrap = document.createElement("div");
    setsWrap.style.margin = "10px 0";
    const setsTitle = document.createElement("div");
    setsTitle.className = "dim";
    setsTitle.style.cssText = "font-size:0.85em; margin-bottom:6px;";
    setsTitle.textContent = exercise.tracks_weight ? t("workouts_sets_label") : (exercise.value_label || t("workouts_default_value_label"));
    setsWrap.appendChild(setsTitle);

    let sets = existing?.sets?.length ? existing.sets.map(s => ({ ...s })) : [{ reps: "", weight: "" }];

    function renderSets() {
        setsWrap.querySelectorAll(".set-row").forEach(el => el.remove());
        sets.forEach((s, i) => {
            const row = document.createElement("div");
            row.className = "set-row";
            row.style.cssText = "display:flex; gap:6px; align-items:center; margin-bottom:6px;";

            const repsInput = document.createElement("input");
            repsInput.type = "number";
            repsInput.placeholder = exercise.tracks_weight ? t("workouts_reps_placeholder") : (exercise.value_label || t("workouts_default_value_label"));
            repsInput.style.width = exercise.tracks_weight ? "80px" : "160px";
            repsInput.value = s.reps ?? "";
            repsInput.onchange = () => s.reps = repsInput.value === "" ? null : (parseFloat(repsInput.value) || 0);
            row.appendChild(repsInput);

            if (exercise.tracks_weight) {
                const xSpan = document.createElement("span");
                xSpan.textContent = "×";
                xSpan.className = "dim";
                row.appendChild(xSpan);

                const weightInput = document.createElement("input");
                weightInput.type = "number";
                weightInput.step = "0.5";
                weightInput.placeholder = t("workouts_weight_placeholder") + ` (${exercise.unit || "кг"})`;
                weightInput.style.width = "110px";
                weightInput.value = s.weight ?? "";
                weightInput.onchange = () => s.weight = weightInput.value === "" ? null : (parseFloat(weightInput.value) || 0);
                row.appendChild(weightInput);
            }

            const removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.className = "danger";
            removeBtn.textContent = "✕";
            removeBtn.style.padding = "2px 8px";
            removeBtn.onclick = () => { sets.splice(i, 1); if (sets.length === 0) sets.push({ reps: "", weight: "" }); renderSets(); };
            row.appendChild(removeBtn);

            setsWrap.appendChild(row);
        });
    }
    renderSets();

    const addSetBtn = document.createElement("button");
    addSetBtn.type = "button";
    addSetBtn.className = "secondary";
    addSetBtn.textContent = t("workouts_add_set_btn");
    addSetBtn.onclick = () => { sets.push({ reps: "", weight: "" }); renderSets(); };
    setsWrap.appendChild(addSetBtn);
    modal.appendChild(setsWrap);

    const notesLabel = document.createElement("label");
    notesLabel.textContent = t("workouts_field_notes");
    const notesInput = document.createElement("input");
    notesInput.type = "text";
    notesInput.value = existing?.notes ?? "";
    notesLabel.appendChild(notesInput);
    modal.appendChild(notesLabel);

    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "secondary";
    cancelBtn.textContent = t("cancel");
    cancelBtn.onclick = () => backdrop.remove();
    const okBtn = document.createElement("button");
    okBtn.textContent = t("save");
    okBtn.onclick = async () => {
        const cleanSets = sets.filter(s => s.reps !== "" && s.reps != null).map(s => ({ reps: parseFloat(s.reps) || 0, weight: s.weight === "" || s.weight == null ? null : (parseFloat(s.weight) || 0) }));
        backdrop.remove();
        await onSubmit({ date: dateInput.value || todayStr(), sets: cleanSets, notes: notesInput.value.trim() || null });
    };
    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);
    modal.appendChild(actions);

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    dateInput.focus();
}

async function addEntry(exercise) {
    openEntryModal(exercise, null, async (res) => {
        const { error } = await sb.from("workout_entries").insert({
            user_id: userId, exercise_id: exercise.id, date: res.date, sets: res.sets, notes: res.notes
        });
        if (error) { showToast(t("workouts_toast_save_error") + error.message, "error"); console.error(error); return; }
        showToast(t("workouts_toast_saved"));
        render();
    });
}

async function editEntry(exercise, entry) {
    openEntryModal(exercise, entry, async (res) => {
        const { error } = await sb.from("workout_entries").update({ date: res.date, sets: res.sets, notes: res.notes }).eq("id", entry.id);
        if (error) { showToast(t("workouts_toast_save_error") + error.message, "error"); console.error(error); return; }
        showToast(t("workouts_toast_saved"));
        render();
    });
}

async function deleteEntry(entry) {
    if (!confirm(t("workouts_confirm_delete_entry"))) return;
    const { error } = await sb.from("workout_entries").delete().eq("id", entry.id);
    if (error) { showToast(t("workouts_toast_save_error") + error.message, "error"); console.error(error); return; }
    render();
}

function formatSets(sets, exercise) {
    if (!sets || !sets.length) return "—";
    if (exercise.tracks_weight) {
        return sets.map(s => s.weight != null ? `${s.reps}×${s.weight}${exercise.unit || "кг"}` : `${s.reps}`).join(", ");
    }
    const unitSuffix = exercise.unit ? ` ${exercise.unit}` : "";
    return sets.map(s => `${s.reps}${unitSuffix}`).join(", ");
}

async function renderExerciseCard(container, exercise, entries) {
    const card = document.createElement("div");
    card.className = "card";
    card.style.marginBottom = "14px";

    const header = document.createElement("div");
    header.style.cssText = "display:flex; align-items:center; gap:8px; margin-bottom:2px; flex-wrap:wrap;";
    const title = document.createElement("h3");
    title.style.margin = "0";
    title.style.flex = "1";
    title.textContent = exercise.category ? `${exercise.name} · ${exercise.category}` : exercise.name;
    header.appendChild(title);

    const addBtn = document.createElement("button");
    addBtn.className = "secondary";
    addBtn.textContent = t("workouts_add_entry_btn");
    addBtn.onclick = () => addEntry(exercise);
    header.appendChild(addBtn);

    const editBtn = document.createElement("button");
    editBtn.className = "secondary";
    editBtn.textContent = "✏️";
    editBtn.onclick = () => editExercise(exercise);
    header.appendChild(editBtn);

    const delBtn = document.createElement("button");
    delBtn.className = "danger";
    delBtn.textContent = "🗑";
    delBtn.onclick = () => deleteExercise(exercise);
    header.appendChild(delBtn);

    card.appendChild(header);

    if (exercise.suggested_scheme) {
        const scheme = document.createElement("div");
        scheme.className = "dim";
        scheme.style.cssText = "font-size:0.85em; margin-bottom:8px;";
        scheme.textContent = `${t("workouts_suggested_scheme_label")} ${exercise.suggested_scheme}`;
        card.appendChild(scheme);
    }

    // мини-график прогресса: для упражнений с весом — максимальный вес за день,
    // для остальных — суммарный объём (сумма всех подходов за день, например всего повторений)
    let chartPoints;
    if (exercise.tracks_weight) {
        chartPoints = entries
            .filter(e => e.sets?.some(s => s.weight != null))
            .map(e => ({ date: e.date, y: Math.max(...e.sets.filter(s => s.weight != null).map(s => s.weight)) }))
            .sort((a, b) => a.date.localeCompare(b.date));
    } else {
        chartPoints = entries
            .filter(e => e.sets?.some(s => s.reps != null))
            .map(e => ({ date: e.date, y: e.sets.reduce((sum, s) => sum + (s.reps || 0), 0) }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }
    if (chartPoints.length >= 2) {
        const chartWrap = document.createElement("div");
        chartWrap.style.marginBottom = "10px";
        const chartTitle = exercise.tracks_weight ? t("workouts_chart_title") : t("workouts_chart_title_volume");
        const chartUnit = exercise.tracks_weight ? " " + (exercise.unit || "кг") : (exercise.unit ? " " + exercise.unit : "");
        renderChartBlock(chartWrap, chartTitle, chartPoints, { unit: chartUnit, color: "var(--accent)" });
        card.appendChild(chartWrap);
    }

    if (entries.length === 0) {
        card.appendChild(Object.assign(document.createElement("p"), { className: "dim", textContent: t("workouts_no_entries") }));
    } else {
        const table = document.createElement("table");
        for (const e of entries.slice().sort((a, b) => b.date.localeCompare(a.date))) {
            const row = table.insertRow();
            row.insertCell().textContent = fmtRu(e.date);
            row.insertCell().textContent = formatSets(e.sets, exercise);
            const notesCell = row.insertCell();
            notesCell.className = "dim";
            notesCell.textContent = e.notes || "";
            const actionsCell = row.insertCell();
            actionsCell.style.whiteSpace = "nowrap";
            const eEditBtn = document.createElement("button");
            eEditBtn.className = "secondary";
            eEditBtn.textContent = "✏️";
            eEditBtn.style.marginRight = "4px";
            eEditBtn.onclick = () => editEntry(exercise, e);
            actionsCell.appendChild(eEditBtn);
            const eDelBtn = document.createElement("button");
            eDelBtn.className = "danger";
            eDelBtn.textContent = "🗑";
            eDelBtn.onclick = () => deleteEntry(e);
            actionsCell.appendChild(eDelBtn);
        }
        card.appendChild(wrapTable(table));
    }

    container.appendChild(card);
}

async function render() {
    const list = document.getElementById("exercises-list");
    list.innerHTML = t("workouts_loading");

    const { data: exercises, error: exError } = await sb.from("workout_exercises").select("*").eq("user_id", userId).order("created_at");
    if (exError) {
        list.innerHTML = `<p class="dim">${t("workouts_toast_save_error")}${exError.message} — ${t("workouts_migration_hint")}</p>`;
        console.error(exError);
        return;
    }
    const { data: entries, error: enError } = await sb.from("workout_entries").select("*").eq("user_id", userId).order("date");
    if (enError) { list.innerHTML = `<p class="dim">${t("workouts_toast_save_error")}${enError.message}</p>`; console.error(enError); return; }

    await renderOverviewChart(entries || []);

    list.innerHTML = "";
    if (!exercises || exercises.length === 0) {
        list.innerHTML = `<p class="dim">${t("workouts_empty")}</p>`;
        return;
    }

    for (const ex of exercises) {
        const exEntries = (entries || []).filter(e => e.exercise_id === ex.id);
        await renderExerciseCard(list, ex, exEntries);
    }
}

document.getElementById("add-exercise-btn").onclick = addExercise;
document.getElementById("open-templates-btn").onclick = openTemplatesModal;

(async () => {
    const user = await requireAuth();
    if (!user) return;
    if (!(await requireOnboarded(user.id))) return;
    userId = user.id;
    renderNav("workouts", user.email);
    render();
})();
