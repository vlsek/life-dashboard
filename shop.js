let userId;

async function uploadShopImage(file) {
    const ext = file.name.split(".").pop();
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error } = await sb.storage.from("shop-images").upload(path, file);
    if (error) { alert(t("shop_upload_error") + error.message); return null; }
    const { data } = sb.storage.from("shop-images").getPublicUrl(path);
    return data.publicUrl;
}

function openItemModal(existing, onSubmit) {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `<h3>${existing ? t("shop_edit_title") : t("shop_new_title")}</h3>`;

    let imageUrl = existing?.image_url || null;

    const nameLabel = document.createElement("label");
    nameLabel.textContent = t("skills_field_name");
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = existing?.name ?? "";
    nameLabel.appendChild(nameInput);
    modal.appendChild(nameLabel);

    const linkLabel = document.createElement("label");
    linkLabel.textContent = t("shop_field_link");
    const linkInput = document.createElement("input");
    linkInput.type = "text";
    linkInput.value = existing?.link ?? "";
    linkLabel.appendChild(linkInput);
    modal.appendChild(linkLabel);

    const costLabel = document.createElement("label");
    costLabel.textContent = t("shop_field_cost");
    const costInput = document.createElement("input");
    costInput.type = "number";
    costInput.value = existing?.cost ?? 100;
    costLabel.appendChild(costInput);
    modal.appendChild(costLabel);

    const imgLabel = document.createElement("label");
    imgLabel.textContent = t("shop_field_image");
    const imgUrlInput = document.createElement("input");
    imgUrlInput.type = "text";
    imgUrlInput.placeholder = "https://...";
    imgUrlInput.value = imageUrl || "";
    imgUrlInput.oninput = () => { imageUrl = imgUrlInput.value.trim() || null; };
    imgLabel.appendChild(imgUrlInput);
    modal.appendChild(imgLabel);

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.style.marginTop = "8px";
    fileInput.onchange = async () => {
        if (!fileInput.files[0]) return;
        const uploaded = await uploadShopImage(fileInput.files[0]);
        if (uploaded) { imageUrl = uploaded; imgUrlInput.value = uploaded; }
    };
    modal.appendChild(fileInput);

    if (imageUrl) {
        const preview = document.createElement("img");
        preview.src = imageUrl;
        preview.style.cssText = "max-width:100%; max-height:120px; margin-top:10px; border-radius:8px; display:block;";
        modal.appendChild(preview);
    }

    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "secondary";
    cancelBtn.textContent = t("cancel");
    cancelBtn.onclick = () => backdrop.remove();
    const okBtn = document.createElement("button");
    okBtn.textContent = t("save");
    okBtn.onclick = async () => {
        if (!nameInput.value.trim()) return;
        backdrop.remove();
        await onSubmit({
            name: nameInput.value.trim(),
            link: linkInput.value.trim() || null,
            cost: parseFloat(costInput.value) || 100,
            image_url: imageUrl,
        });
    };
    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);
    modal.appendChild(actions);

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    nameInput.focus();
}

async function addItem() {
    openItemModal(null, async (res) => {
        const { error } = await sb.from("shop_items").insert({ user_id: userId, ...res, redeemed: false });
        if (error) { showToast(t("dash_save_error_generic") + error.message, "error"); console.error(error); return; }
        render();
    });
}

async function editItem(item) {
    openItemModal(item, async (res) => {
        const { error } = await sb.from("shop_items").update(res).eq("id", item.id);
        if (error) { showToast(t("dash_save_error_generic") + error.message, "error"); console.error(error); return; }
        render();
    });
}

async function buyItem(item) {
    const { error } = await sb.from("shop_items").update({ redeemed: true, redeemed_date: todayStr() }).eq("id", item.id);
    if (error) { showToast(t("dash_save_error_generic") + error.message, "error"); console.error(error); return; }
    render();
}

async function deleteItem(id) {
    if (!confirm(t("shop_confirm_delete"))) return;
    const { error } = await sb.from("shop_items").delete().eq("id", id);
    if (error) { showToast(t("dash_delete_error_generic") + error.message, "error"); console.error(error); return; }
    render();
}

async function render() {
    const { balance, total, spent } = await calcBalance(userId);
    const balCard = document.getElementById("balance-card");
    balCard.innerHTML = `<strong style="font-size:1.3em;">${t("dash_balance_label")} ${balance} ${t("shop_points_word")}</strong>
        <div class="dim" style="margin-top:4px;">${t("shop_total_earned")} ${total} · ${t("shop_total_spent")} ${spent}</div>`;

    const { data: items } = await sb.from("shop_items").select("*").eq("user_id", userId).order("cost");
    const box = document.getElementById("shop-items");
    box.innerHTML = "";

    if (!items || items.length === 0) {
        box.innerHTML = `<p class="dim">${t("shop_list_empty")}</p>`;
        return;
    }

    const grid = document.createElement("div");
    grid.style.cssText = "display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:14px;";

    for (const item of items) {
        const card = document.createElement("div");
        card.className = "card";
        card.style.padding = "14px";

        if (item.image_url) {
            const img = document.createElement("img");
            img.src = item.image_url;
            img.style.cssText = "width:100%; height:120px; object-fit:cover; border-radius:8px; margin-bottom:10px;";
            card.appendChild(img);
        }

        const nameEl = document.createElement("div");
        nameEl.style.cssText = "font-weight:600; margin-bottom:4px;" + (item.redeemed ? " text-decoration:line-through; opacity:0.5;" : "");
        if (item.link) {
            const a = document.createElement("a");
            a.href = item.link;
            a.target = "_blank";
            a.innerHTML = `${escapeHtmlText(item.name)} ${iconSvg("link")}`;
            a.style.color = "inherit";
            nameEl.appendChild(a);
        } else {
            nameEl.textContent = item.name;
        }
        card.appendChild(nameEl);

        const costEl = document.createElement("div");
        costEl.className = "dim";
        costEl.innerHTML = `${item.cost} ${coinIcon()}`;
        card.appendChild(costEl);

        const statusEl = document.createElement("div");
        statusEl.style.marginTop = "8px";
        if (item.redeemed) {
            statusEl.textContent = `${t("shop_bought_prefix")} ${item.redeemed_date ? fmtRu(item.redeemed_date) : ""}`;
        } else {
            const affordable = balance >= item.cost;
            const buyBtn = document.createElement("button");
            buyBtn.innerHTML = affordable ? t("shop_buy_btn") : `${t("shop_not_enough")} ${item.cost - balance} ${coinIcon()}`;
            buyBtn.disabled = !affordable;
            buyBtn.onclick = () => buyItem(item);
            statusEl.appendChild(buyBtn);
        }
        card.appendChild(statusEl);

        const actionsEl = document.createElement("div");
        actionsEl.style.cssText = "margin-top:8px; white-space:nowrap;";
        const editBtn = document.createElement("button");
        editBtn.className = "secondary";
        setIcon(editBtn, "edit");
        editBtn.style.marginRight = "4px";
        editBtn.onclick = () => editItem(item);
        actionsEl.appendChild(editBtn);
        const delBtn = document.createElement("button");
        delBtn.className = "danger";
        setIcon(delBtn, "trash");
        delBtn.onclick = () => deleteItem(item.id);
        actionsEl.appendChild(delBtn);
        card.appendChild(actionsEl);

        grid.appendChild(card);
    }
    box.appendChild(grid);
}

document.getElementById("add-item-btn").onclick = addItem;
(async () => {
    const user = await requireAuth();
    if (!user) return;
    if (!(await requireOnboarded(user.id))) return;
    userId = user.id;
    renderNav("shop", user.email);
    render();
})();
