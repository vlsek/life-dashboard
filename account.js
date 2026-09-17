let user;

document.getElementById("change-password-btn").onclick = async () => {
    const msg = document.getElementById("password-msg");
    const newPassword = document.getElementById("new-password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    if (!newPassword || newPassword.length < 6) {
        msg.textContent = t("acc_password_too_short");
        return;
    }
    if (newPassword !== confirmPassword) {
        msg.textContent = t("acc_passwords_mismatch");
        return;
    }

    msg.textContent = t("dash_saving_btn");
    const { error } = await sb.auth.updateUser({ password: newPassword });
    if (error) {
        msg.textContent = t("acc_error_prefix") + error.message;
        console.error(error);
        return;
    }
    msg.textContent = "";
    document.getElementById("new-password").value = "";
    document.getElementById("confirm-password").value = "";
    showToast(t("acc_password_changed_toast"));
};

document.getElementById("change-email-btn").onclick = async () => {
    const msg = document.getElementById("email-msg");
    const newEmail = document.getElementById("new-email").value.trim();

    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        msg.textContent = t("acc_email_invalid");
        return;
    }
    if (newEmail === user.email) {
        msg.textContent = t("acc_email_same");
        return;
    }

    msg.textContent = t("dash_saving_btn");
    const { error } = await sb.auth.updateUser({ email: newEmail });
    if (error) {
        msg.textContent = t("acc_error_prefix") + error.message;
        console.error(error);
        return;
    }
    msg.textContent = "";
    document.getElementById("new-email").value = "";
    showToast(t("acc_email_change_requested_toast"));
};

(async () => {
    user = await requireAuth();
    if (!user) return;
    document.getElementById("current-email").textContent = user.email;
    renderNav("account", user.email);
})();
