let user;

async function deleteUser(u) {
    if (!confirm(t("admin_confirm_delete_1") + (u.display_name ?? u.email) + t("admin_confirm_delete_2"))) return;
    const { error } = await sb.rpc("admin_delete_user", { target_user: u.user_id });
    if (error) { showToast(t("dash_delete_error_generic") + error.message, "error"); console.error(error); return; }
    showToast(t("admin_user_deleted_toast"));
    render();
}

async function render() {
    const content = document.getElementById("admin-content");
    const { data, error } = await sb.rpc("admin_list_users");
    if (error) {
        content.innerHTML = `<div class="card"><p class="dim">${t("admin_no_access")} ${error.message}</p>
        <p class="dim" style="font-size:0.85em; margin-top:8px;">${t("admin_no_access_hint")}</p></div>`;
        console.error(error);
        return;
    }

    content.innerHTML = "";
    const card = document.createElement("div");
    card.className = "card";
    const table = document.createElement("table");
    const thead = table.insertRow();
    [t("admin_th_name"), t("admin_th_email"), t("admin_th_admin"), t("admin_th_registered"), ""].forEach(h => { const th = document.createElement("th"); th.textContent = h; thead.appendChild(th); });

    for (const u of (data || [])) {
        const row = table.insertRow();
        const nameCell = row.insertCell();
        nameCell.textContent = u.display_name || "—";
        if (u.user_id === user.id) nameCell.style.cssText = "font-weight:bold; color:var(--accent);";
        row.insertCell().textContent = u.email;
        row.insertCell().textContent = u.is_admin ? "✅" : "";
        row.insertCell().textContent = fmtRu(u.created_at?.slice(0, 10));

        const actionsCell = row.insertCell();
        if (u.user_id !== user.id) {
            const delBtn = document.createElement("button");
            delBtn.className = "danger";
            delBtn.textContent = t("admin_delete_btn");
            delBtn.onclick = () => deleteUser(u);
            actionsCell.appendChild(delBtn);
        } else {
            actionsCell.textContent = t("admin_thats_you");
            actionsCell.className = "dim";
        }
    }
    card.appendChild(wrapTable(table));
    content.appendChild(card);
}

(async () => {
    user = await requireAuth();
    if (!user) return;
    renderNav("admin", user.email);
    render();
})();
