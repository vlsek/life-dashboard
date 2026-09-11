let user;
let viewDate = new Date();
viewDate.setDate(1);

const WEEKDAYS_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const WEEKDAYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAYS = getLang() === "en" ? WEEKDAYS_EN : WEEKDAYS_RU;
const MONTH_NAMES_RU = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
const MONTH_NAMES_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_NAMES = getLang() === "en" ? MONTH_NAMES_EN : MONTH_NAMES_RU;

function openDayModal(dateStr, existingPlanned) {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal";
    const [y, m, d] = dateStr.split("-");
    modal.innerHTML = `<h3>${t("cal_plan_for")} ${getLang() === "en" ? `${m}/${d}/${y}` : `${d}.${m}.${y}`}</h3>`;

    // конвертируем старые записи-строки на лету, как и на дашборде
    let planned = existingPlanned.map(p => typeof p === "string" ? { type: "custom", text: p, done: false } : p);

    const list = document.createElement("div");
    modal.appendChild(list);

    function renderList() {
        list.innerHTML = "";
        if (planned.length === 0) {
            list.appendChild(Object.assign(document.createElement("p"), { className: "dim", textContent: t("cal_empty") }));
        }
        planned.forEach((item, idx) => {
            const row = document.createElement("div");
            row.style.cssText = "display:flex; align-items:center; gap:8px; padding:4px 0;";

            const cb = document.createElement("input");
            cb.type = "checkbox";
            cb.checked = !!item.done;
            cb.disabled = item.type === "goal"; // отметка выполнения цели — только на дашборде/в разделе Целей
            cb.onchange = () => { item.done = cb.checked; };
            row.appendChild(cb);

            const bullet = document.createElement("span");
            bullet.textContent = item.text + (item.type === "goal" ? ` (${t("cal_goal_suffix")})` : "");
            bullet.style.flex = "1";
            if (item.done) bullet.style.cssText += "text-decoration:line-through; opacity:0.6;";
            row.appendChild(bullet);

            const delBtn = document.createElement("button");
            delBtn.className = "danger";
            delBtn.textContent = "✕";
            delBtn.style.padding = "2px 8px";
            delBtn.onclick = () => { planned = planned.filter((_, i) => i !== idx); renderList(); };
            row.appendChild(delBtn);
            list.appendChild(row);
        });
    }
    renderList();

    const addRow = document.createElement("div");
    addRow.style.cssText = "display:flex; gap:8px; margin-top:10px;";
    const addInput = document.createElement("input");
    addInput.type = "text";
    addInput.placeholder = t("cal_new_item_placeholder");
    addInput.style.flex = "1";
    const addBtn = document.createElement("button");
    addBtn.className = "secondary";
    addBtn.textContent = "➕";
    function addItem() {
        const text = addInput.value.trim();
        if (!text) return;
        planned.push({ type: "custom", text, done: false });
        addInput.value = "";
        renderList();
    }
    addBtn.onclick = addItem;
    addInput.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } };
    addRow.appendChild(addInput);
    addRow.appendChild(addBtn);
    modal.appendChild(addRow);
    modal.appendChild(Object.assign(document.createElement("p"), {
        className: "dim", style: "font-size:0.78em; margin-top:6px;",
        textContent: t("cal_hint")
    }));

    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "secondary";
    cancelBtn.textContent = t("cancel");
    cancelBtn.onclick = () => backdrop.remove();
    const saveBtn = document.createElement("button");
    saveBtn.textContent = t("save");
    saveBtn.onclick = async () => {
        const { error } = await sb.from("daily_notes").upsert({
            user_id: user.id, date: dateStr, planned_goals: planned
        }, { onConflict: "user_id,date" });
        backdrop.remove();
        if (error) { showToast(t("dash_save_error_generic") + error.message, "error"); console.error(error); return; }
        showToast(t("saved_toast"));
        render();
    };
    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);
    modal.appendChild(actions);

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    addInput.focus();
}

async function render() {
    const grid = document.getElementById("calendar-grid");
    document.getElementById("month-label").textContent = `${MONTH_NAMES[viewDate.getMonth()]} ${viewDate.getFullYear()}`;

    const year = viewDate.getFullYear(), month = viewDate.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const lastOfMonth = new Date(year, month + 1, 0);
    const fromDate = fmtDate(firstOfMonth);
    const toDate = fmtDate(lastOfMonth);

    const { data: notes, error } = await sb.from("daily_notes").select("date, planned_goals").eq("user_id", user.id).gte("date", fromDate).lte("date", toDate);
    if (error) { grid.innerHTML = `<p class="dim">${t("comm_load_error")} ${error.message}</p>`; console.error(error); return; }

    const byDate = {};
    (notes || []).forEach(n => byDate[n.date] = n.planned_goals || []);

    grid.innerHTML = "";
    WEEKDAYS.forEach(w => {
        const el = document.createElement("div");
        el.className = "cal-weekday";
        el.textContent = w;
        grid.appendChild(el);
    });

    const startOffset = (firstOfMonth.getDay() + 6) % 7; // 0 = понедельник
    for (let i = 0; i < startOffset; i++) {
        grid.appendChild(Object.assign(document.createElement("div"), { className: "cal-cell cal-empty" }));
    }

    const todayKey = todayStr();
    for (let day = 1; day <= lastOfMonth.getDate(); day++) {
        const dateObj = new Date(year, month, day);
        const dateStr = fmtDate(dateObj);
        const planned = byDate[dateStr] || [];

        const cell = document.createElement("div");
        cell.className = "cal-cell" + (dateStr === todayKey ? " cal-today" : "");
        cell.onclick = () => openDayModal(dateStr, planned);

        const numEl = document.createElement("div");
        numEl.className = "cal-num";
        numEl.textContent = day;
        cell.appendChild(numEl);

        if (planned.length > 0) {
            const total = planned.length;
            const done = planned.filter(p => (typeof p === "object" ? p.done : false)).length;
            const badge = document.createElement("div");
            badge.className = "cal-badge";
            badge.title = `${total} ${t("cal_items_word")}, ${t("cal_done_word")}: ${done}`;
            badge.textContent = done === total ? "✅" : `📌 ${done}/${total}`;
            cell.appendChild(badge);
        }
        grid.appendChild(cell);
    }
}

document.getElementById("prev-month").onclick = () => { viewDate.setMonth(viewDate.getMonth() - 1); render(); };
document.getElementById("next-month").onclick = () => { viewDate.setMonth(viewDate.getMonth() + 1); render(); };
document.getElementById("today-month").onclick = () => { viewDate = new Date(); viewDate.setDate(1); render(); };

(async () => {
    user = await requireAuth();
    if (!user) return;
    if (!(await requireOnboarded(user.id))) return;
    renderNav("calendar", user.email);
    render();
})();
