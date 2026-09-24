let user;
let scope = "everyone"; // "everyone" | "friends"
let friendIds = new Set();

async function loadFriendIds() {
    const { data } = await sb.from("follows").select("followed_id").eq("follower_id", user.id);
    friendIds = new Set((data || []).map(f => f.followed_id));
}

async function renderFriendsCard() {
    const card = document.getElementById("friends-card");
    card.innerHTML = "";

    const { data: follows } = await sb.from("follows").select("followed_id").eq("follower_id", user.id);
    const ids = (follows || []).map(f => f.followed_id);

    if (ids.length > 0) {
        const { data: profiles } = await sb.from("profiles").select("user_id, display_name, avatar_url").in("user_id", ids);
        const list = document.createElement("div");
        list.style.cssText = "display:flex; flex-wrap:wrap; gap:10px; margin-bottom:14px;";
        for (const p of (profiles || [])) {
            const chip = document.createElement("div");
            chip.style.cssText = "display:flex; align-items:center; gap:6px; background:var(--bg); border:1px solid var(--border); border-radius:20px; padding:4px 10px 4px 4px;";
            chip.appendChild(makeAvatarEl(p.avatar_url, 26));
            const nameSpan = document.createElement("span");
            nameSpan.textContent = p.display_name || t("comm_no_name");
            nameSpan.style.fontSize = "0.9em";
            chip.appendChild(nameSpan);
            const unfollowBtn = document.createElement("button");
            setIcon(unfollowBtn, "x");
            unfollowBtn.className = "secondary";
            unfollowBtn.style.cssText = "padding:1px 6px; margin-left:4px;";
            unfollowBtn.onclick = async () => {
                const { error } = await sb.from("follows").delete().eq("follower_id", user.id).eq("followed_id", p.user_id);
                if (error) { showToast(t("dash_delete_error_generic") + error.message, "error"); console.error(error); return; }
                init();
            };
            chip.appendChild(unfollowBtn);
            list.appendChild(chip);
        }
        card.appendChild(list);
    } else {
        card.innerHTML = `<p class="dim">${t("comm_no_follows")}</p>`;
    }

    const addRow = document.createElement("div");
    addRow.style.cssText = "display:flex; gap:8px;";
    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = t("comm_search_placeholder");
    searchInput.style.flex = "1";
    const addBtn = document.createElement("button");
    addBtn.innerHTML = tIcon("comm_follow_btn");
    addBtn.onclick = async () => {
        const query = searchInput.value.trim();
        if (!query) return;

        const isEmail = query.includes("@");
        const { data: foundId, error } = isEmail
            ? await sb.rpc("find_user_by_email", { lookup_email: query })
            : await sb.rpc("find_user_by_name", { lookup_name: query });

        if (error || !foundId) {
            showToast(isEmail ? t("comm_user_not_found_email") : t("comm_user_not_found_name"), "error");
            return;
        }
        if (foundId === user.id) { showToast(t("comm_thats_you"), "error"); return; }
        const { error: insErr } = await sb.from("follows").insert({ follower_id: user.id, followed_id: foundId });
        if (insErr) { showToast(t("comm_follow_error") + insErr.message, "error"); return; }
        searchInput.value = "";
        showToast(t("comm_follow_added_toast"));
        init();
    };
    searchInput.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); addBtn.click(); } };
    addRow.appendChild(searchInput);
    addRow.appendChild(addBtn);
    card.appendChild(addRow);
}

async function loadLeaderboard() {
    const card = document.getElementById("leaderboard-card");
    const { data, error } = await sb.rpc("get_leaderboard");
    if (error) { card.innerHTML = `<p class="dim">${t("comm_load_error")} ${error.message}</p>`; console.error("Community RPC error:", error); return; }

    let rows = (data || []).filter(r => r.leaderboard_visible !== false || r.user_id === user.id);
    if (scope === "friends") {
        rows = rows.filter(r => r.user_id === user.id || friendIds.has(r.user_id));
    }

    card.innerHTML = "";
    if (rows.length === 0) { card.innerHTML = `<p class="dim">${t("comm_empty")}</p>`; return; }

    const medals = ["🥇", "🥈", "🥉"];
    const table = document.createElement("table");
    rows.forEach((row, i) => {
        const tr = table.insertRow();
        const rankCell = tr.insertCell();
        rankCell.textContent = medals[i] || `#${i + 1}`;
        const avatarCell = tr.insertCell();
        avatarCell.appendChild(makeAvatarEl(row.avatar_url));
        const nameCell = tr.insertCell();
        nameCell.textContent = row.display_name;
        if (row.perfect_streak > 0) {
            const streakSpan = document.createElement("span");
            streakSpan.innerHTML = ` ${iconSvg("flame")}${row.perfect_streak}`;
            streakSpan.style.cssText = "font-size:0.8em; opacity:0.8;";
            streakSpan.title = `${t("comm_perfect_streak_title")} ${row.perfect_streak}`;
            nameCell.appendChild(streakSpan);
        }
        if (row.user_id === user.id) nameCell.style.cssText += "font-weight:bold; color:var(--accent);";
        const ptsCell = tr.insertCell();
        ptsCell.textContent = `${row.total_points} ⭐`;
        ptsCell.style.textAlign = "right";
    });
    card.appendChild(wrapTable(table));
}

async function loadToday() {
    const card = document.getElementById("today-card");
    const { data, error } = await sb.rpc("get_today_activity");
    if (error) { card.innerHTML = `<p class="dim">${t("comm_load_error")} ${error.message}</p>`; console.error("Community RPC error:", error); return; }

    let rows = (data || []).filter(r => r.leaderboard_visible !== false || r.user_id === user.id).sort((a, b) => b.today_points - a.today_points);
    if (scope === "friends") {
        rows = rows.filter(r => r.user_id === user.id || friendIds.has(r.user_id));
    }

    card.innerHTML = "";
    if (rows.length === 0) { card.innerHTML = `<p class="dim">${t("comm_empty")}</p>`; return; }

    for (const row of rows) {
        const item = document.createElement("div");
        item.style.cssText = "display:flex; gap:12px; padding:10px 0; border-bottom:1px solid var(--border);";
        const isMe = row.user_id === user.id;

        const avatarEl = makeAvatarEl(row.avatar_url, 40);
        avatarEl.style.flexShrink = "0";
        item.appendChild(avatarEl);

        const textWrap = document.createElement("div");
        textWrap.innerHTML = `<strong style="${isMe ? 'color:var(--accent);' : ''}">${row.display_name}</strong>
            <span class="dim"> — ${row.today_points} ⭐ ${t("comm_today_word")}</span>`;
        if (row.items && row.items.length > 0) {
            const list = document.createElement("ul");
            list.style.cssText = "margin:6px 0 0; padding-left:18px; opacity:0.85;";
            for (const it of row.items) {
                const li = document.createElement("li");
                li.textContent = it;
                list.appendChild(li);
            }
            textWrap.appendChild(list);
        } else if (row.notes) {
            // старые записи, сделанные до перехода на список пунктов
            const notesP = document.createElement("p");
            notesP.style.cssText = "margin:6px 0 0; opacity:0.85;";
            notesP.textContent = row.notes;
            textWrap.appendChild(notesP);
        }
        item.appendChild(textWrap);
        card.appendChild(item);
    }
}

async function loadCategorySelect() {
    const { data: categories } = await sb.from("metric_categories").select("*").order("label_ru");
    const select = document.getElementById("category-select");
    select.innerHTML = `<option value="">${t("comm_select_category")}</option>`;
    for (const c of (categories || [])) {
        const opt = document.createElement("option");
        opt.value = c.key;
        opt.textContent = `${c.label_ru} / ${c.label_en}`;
        select.appendChild(opt);
    }
    select.onchange = () => loadCategoryLeaderboard(select.value);
}

let categoryMode = "value"; // "value" | "points" | "streak"

async function renderCategoryChart(catKey) {
    const chartCard = document.getElementById("category-chart-card");
    if (!chartCard) return;
    const { data: cat } = await sb.from("metric_categories").select("*").eq("key", catKey).maybeSingle();
    if (!cat) { chartCard.innerHTML = ""; return; }

    const { data: myMetrics } = await sb.from("metrics").select("*").eq("user_id", user.id).eq("category_id", cat.id).eq("type", "number");
    if (!myMetrics || myMetrics.length === 0) {
        chartCard.innerHTML = "";
        chartCard.appendChild(Object.assign(document.createElement("p"), {
            className: "dim",
            textContent: `${t("comm_no_own_metric_1")} «${cat.label_ru}» ${t("comm_no_own_metric_2")}`
        }));

        const { data: unlinkedNumberMetrics } = await sb.from("metrics").select("*").eq("user_id", user.id).eq("type", "number");
        if (unlinkedNumberMetrics && unlinkedNumberMetrics.length > 0) {
            const row = document.createElement("div");
            row.style.cssText = "display:flex; gap:8px; align-items:center; margin-top:8px; flex-wrap:wrap;";
            const select = document.createElement("select");
            unlinkedNumberMetrics.forEach(m => {
                const opt = document.createElement("option");
                opt.value = m.id;
                opt.textContent = `${m.icon} ${m.name}` + (m.category_id ? ` (${t("comm_already_linked")})` : "");
                select.appendChild(opt);
            });
            const linkBtn = document.createElement("button");
            linkBtn.textContent = t("comm_link_btn");
            linkBtn.onclick = async () => {
                const { error } = await sb.from("metrics").update({ category_id: cat.id }).eq("id", select.value);
                if (error) { showToast(t("comm_link_error") + error.message, "error"); console.error(error); return; }
                showToast(t("comm_link_success_toast"));
                loadCategoryLeaderboard(catKey);
            };
            row.appendChild(select);
            row.appendChild(linkBtn);
            chartCard.appendChild(row);
        } else {
            chartCard.appendChild(Object.assign(document.createElement("p"), {
                className: "dim", style: "margin-top:8px;",
                textContent: t("comm_no_number_metrics")
            }));
        }
        return;
    }
    const metricIds = myMetrics.map(m => m.id);
    const { data: values } = await sb.from("daily_values").select("*").eq("user_id", user.id).in("metric_id", metricIds).order("date");

    const byDay = {};
    (values || []).forEach(v => {
        byDay[v.date] = (byDay[v.date] ?? 0) + (parseFloat(v.value) || 0);
    });
    let days = Object.keys(byDay);
    const [from, to] = periodBounds(chartPeriodState.range, chartPeriodState.from, chartPeriodState.to);
    if (from) days = days.filter(d => d >= from && (!to || d <= to));
    const points = days.sort().map(d => ({ date: d, y: byDay[d] }));
    // если у привязанных метрик есть цель — предлагаем сумму их целей как линию-ориентир
    const defaultGoal = myMetrics.reduce((sum, m) => sum + (m.goal_value || 0), 0) || null;

    chartCard.innerHTML = "";
    const titleRow = document.createElement("div");
    titleRow.style.cssText = "display:flex; align-items:center; gap:8px; margin-bottom:8px;";
    const titleSpan = document.createElement("strong");
    titleSpan.innerHTML = tIcon("comm_your_progress_chart");
    titleRow.appendChild(titleSpan);
    const periodBtn = document.createElement("button");
    periodBtn.className = "secondary";
    periodBtn.style.cssText = "margin-left:auto; padding:2px 10px;";
    setIcon(periodBtn, "gear");
    periodBtn.title = t("dash_charts_period_label");
    periodBtn.onclick = () => openPeriodModal(t("dash_charts_period_label"), chartPeriodState, wrapPeriodPersist("dash_period_community", chartPeriodState, () => renderCategoryChart(catKey)));
    titleRow.appendChild(periodBtn);
    chartCard.appendChild(titleRow);
    const goalLabel = defaultGoal != null ? `${t("chart_goal_label")} ${defaultGoal}` : null;
    renderChartBlock(chartCard, "", points, { unit: "", color: "var(--accent)", goalValue: defaultGoal, goalLabel });
}

const chartPeriodState = loadPeriodState("dash_period_community", { range: "days10", from: null, to: null }); // личный график прогресса — свой период
let categoryRange = "all"; // "week" | "last_week" | "month" | "all" — таблица сравнения с друзьями (пресеты, серверная функция)

async function loadCategoryLeaderboard(catKey) {
    const card = document.getElementById("category-card");
    if (!catKey) { card.innerHTML = t("comm_pick_category_above"); document.getElementById("category-chart-card").innerHTML = ""; return; }
    card.innerHTML = t("loading_ellipsis");

    const { data, error } = await sb.rpc("get_category_leaderboard", { cat_key: catKey, range_key: categoryRange });
    if (error) { card.innerHTML = `<p class="dim">${t("comm_load_error")} ${error.message}</p>`; console.error(error); return; }

    let rows = (data || []).filter(r => (r.leaderboard_visible !== false || r.user_id === user.id) && (r.category_points > 0 || r.total_value > 0 || r.user_id === user.id));
    if (scope === "friends") {
        rows = rows.filter(r => r.user_id === user.id || friendIds.has(r.user_id));
    }
    const sortKey = categoryMode === "streak" ? "category_streak" : categoryMode === "points" ? "category_points" : "total_value";
    rows = rows.slice().sort((a, b) => b[sortKey] - a[sortKey]);

    card.innerHTML = "";

    const rangeRow = document.createElement("div");
    rangeRow.style.cssText = "display:flex; gap:6px; margin-bottom:8px; flex-wrap:wrap;";
    [["week", t("period_week")], ["last_week", t("period_last_week")], ["month", t("period_month")], ["all", t("period_all")]].forEach(([key, label]) => {
        const btn = document.createElement("button");
        btn.className = categoryRange === key ? "" : "secondary";
        btn.textContent = label;
        btn.onclick = () => { categoryRange = key; loadCategoryLeaderboard(catKey); };
        rangeRow.appendChild(btn);
    });
    card.appendChild(rangeRow);

    const modeRow = document.createElement("div");
    modeRow.style.cssText = "display:flex; gap:6px; margin-bottom:10px; flex-wrap:wrap;";
    [["value", t("comm_mode_value")], ["points", t("comm_mode_points")], ["streak", t("comm_mode_streak")]].forEach(([key, label]) => {
        const btn = document.createElement("button");
        btn.className = categoryMode === key ? "" : "secondary";
        btn.textContent = label;
        btn.onclick = () => { categoryMode = key; loadCategoryLeaderboard(catKey); };
        modeRow.appendChild(btn);
    });
    card.appendChild(modeRow);

    if (rows.length === 0) {
        card.appendChild(Object.assign(document.createElement("p"), { className: "dim", textContent: t("comm_nobody_tracking") }));
    } else {
        const table = document.createElement("table");
        const thead = table.insertRow();
        ["#", "", t("comm_th_name"), t("comm_th_sum"), t("comm_th_points"), "flame"].forEach(h => { const th = document.createElement("th"); if (h === "flame") th.innerHTML = iconSvg("flame"); else th.textContent = h; thead.appendChild(th); });
        rows.forEach((row, i) => {
            const tr = table.insertRow();
            tr.insertCell().textContent = `#${i + 1}`;
            tr.insertCell().appendChild(makeAvatarEl(row.avatar_url));
            const nameCell = tr.insertCell();
            nameCell.textContent = row.display_name;
            if (row.user_id === user.id) nameCell.style.cssText = "font-weight:bold; color:var(--accent);";
            tr.insertCell().textContent = row.total_value;
            tr.insertCell().textContent = `${row.category_points} ⭐`;
            tr.insertCell().textContent = row.category_streak > 0 ? `${row.category_streak}` : "—";
        });
        card.appendChild(wrapTable(table));
    }

    renderCategoryChart(catKey);
}

async function editDisplayName() {
    const { data: profile } = await sb.from("profiles").select("*").eq("user_id", user.id).maybeSingle();

    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `<h3>${t("comm_public_profile_title")}</h3>`;

    const nameLabel = document.createElement("label");
    nameLabel.textContent = t("comm_display_name_label");
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = profile?.display_name ?? "";
    nameLabel.appendChild(nameInput);
    modal.appendChild(nameLabel);

    const visLabel = document.createElement("label");
    visLabel.style.cssText = "display:flex; align-items:center; gap:8px; margin-top:14px;";
    const visCb = document.createElement("input");
    visCb.type = "checkbox";
    visCb.checked = profile?.leaderboard_visible !== false;
    visLabel.appendChild(visCb);
    visLabel.appendChild(document.createTextNode(t("comm_visibility_label")));
    modal.appendChild(visLabel);
    modal.appendChild(document.createElement("div")).innerHTML =
        `<p class="dim" style="font-size:0.85em; margin:6px 0 0;">${t("comm_visibility_hint")}</p>`;

    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "secondary";
    cancelBtn.textContent = t("cancel");
    cancelBtn.onclick = () => backdrop.remove();
    const okBtn = document.createElement("button");
    okBtn.textContent = t("save");
    okBtn.onclick = async () => {
        const { error } = await sb.from("profiles").upsert({
            user_id: user.id, display_name: nameInput.value.trim() || null, leaderboard_visible: visCb.checked
        });
        backdrop.remove();
        if (error) { showToast(t("dash_save_error_generic") + error.message, "error"); console.error(error); return; }
        init();
    };
    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);
    modal.appendChild(actions);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
}

async function init() {
    await loadFriendIds();
    renderFriendsCard();
    loadLeaderboard();
    loadToday();
    const currentCat = document.getElementById("category-select").value;
    if (currentCat) loadCategoryLeaderboard(currentCat);
}

document.getElementById("scope-everyone").onclick = () => { scope = "everyone"; init(); };
document.getElementById("scope-friends").onclick = () => { scope = "friends"; init(); };

(async () => {
    user = await requireAuth();
    if (!user) return;
    if (!(await requireOnboarded(user.id))) return;
    renderNav("community", user.email);

    const nameBtn = document.createElement("button");
    nameBtn.innerHTML = tIcon("comm_public_profile_btn");
    nameBtn.className = "secondary";
    nameBtn.style.marginBottom = "16px";
    nameBtn.onclick = editDisplayName;
    document.querySelector("main").insertBefore(nameBtn, document.querySelector("main").children[1]);

    loadCategorySelect();
    init();
})();
