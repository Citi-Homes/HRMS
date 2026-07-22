(function () {
  function csvCell(value) {
    const text = String(value || "").trim();
    return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }

  function canExportEmployees() {
    return typeof window.isSuperUser === "function" && window.isSuperUser();
  }

  function addEmployeeExportButton() {
    const pageTitle = document.querySelector("#pageTitle");
    const tools = document.querySelector("#pageTools");
    const existing = tools?.querySelector("[data-export-employees]");
    if (!pageTitle || !tools || pageTitle.textContent.trim() !== "Employee Master") return;
    if (!canExportEmployees()) {
      existing?.remove();
      return;
    }
    if (existing) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "pill";
    button.dataset.exportEmployees = "true";
    button.textContent = "Export Employee Master Data";
    tools.appendChild(button);
  }

  function exportVisibleTable(filenamePrefix, emptyMessage) {
    const table = document.querySelector("#dataTable");
    if (!table) return alert("Table is not available.");
    const headers = [...table.querySelectorAll("thead th")].map((cell) => cell.textContent.trim());
    const rows = [...table.querySelectorAll("tbody tr")].map((row) => (
      [...row.querySelectorAll("td")].map((cell) => {
        const field = cell.querySelector("input, select");
        return field ? field.value : cell.textContent.trim();
      })
    ));

    if (!rows.length || rows.every((row) => row.join("").includes("No records found"))) {
      alert(emptyMessage);
      return;
    }

    const lines = [headers, ...rows].map((row) => row.map(csvCell).join(","));
    const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    const href = URL.createObjectURL(blob);
    link.href = href;
    link.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-export-employees]")) {
      event.preventDefault();
      if (!canExportEmployees()) {
        alert("You do not have permission to export Employee Master data.");
        return;
      }
      exportVisibleTable("employee-master", "No employee records available to export.");
    }
  });

  const observer = new MutationObserver(addEmployeeExportButton);
  observer.observe(document.body, { childList: true, subtree: true });
  addEmployeeExportButton();
})();



// First-login password change pilot for test@citihomes.ae.
(function () {
  var pilotEmail = "test@citihomes.ae";
  var helperClient = null;
  var overlayShown = false;

  function getClient() {
    if (helperClient) return helperClient;
    var cfg = window.CITI_HOMES_SUPABASE || {};
    if (!window.supabase || !cfg.url || !cfg.anonKey) return null;
    helperClient = window.supabase.createClient(cfg.url, cfg.anonKey);
    return helperClient;
  }

  function styleOverlay() {
    if (document.getElementById("firstLoginPasswordStyle")) return;
    var style = document.createElement("style");
    style.id = "firstLoginPasswordStyle";
    style.textContent = "body.first-login-locked{overflow:hidden}.first-login-overlay{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:1.5rem;background:rgba(245,241,233,.62);backdrop-filter:blur(18px) saturate(1.25)}.first-login-card{width:min(460px,92vw);border:1px solid rgba(255,255,255,.82);border-radius:22px;padding:1.35rem 1.5rem;background:linear-gradient(135deg,rgba(255,255,255,.42),rgba(255,255,255,.16));box-shadow:0 28px 80px rgba(36,37,39,.22),inset 0 1px 0 rgba(255,255,255,.85);font-family:Quicksand,Arial,sans-serif;color:#242527}.first-login-card h2{margin:0 0 .35rem;font-size:1.55rem}.first-login-card p{margin:.2rem 0 1rem;color:#6f6658;line-height:1.45}.first-login-card label{display:grid;gap:.35rem;margin:.7rem 0;font-weight:700}.first-login-card input{height:48px;border-radius:15px;border:1px solid rgba(255,255,255,.86);background:rgba(255,255,255,.38);padding:0 .95rem;font:inherit}.first-login-card button{width:100%;height:50px;border:0;border-radius:18px;background:linear-gradient(135deg,#303133,#9b8547);color:#fff;font:700 1rem Quicksand,Arial,sans-serif;cursor:pointer}.first-login-card .first-login-message{min-height:22px;color:#b24132;font-weight:700}.first-login-card .first-login-note{font-size:.82rem;color:#6f6658}";
    document.head.appendChild(style);
  }

  function showOverlay(client, email) {
    if (overlayShown || document.getElementById("firstLoginPasswordOverlay")) return;
    overlayShown = true;
    styleOverlay();
    document.body.classList.add("first-login-locked");
    var overlay = document.createElement("div");
    overlay.id = "firstLoginPasswordOverlay";
    overlay.className = "first-login-overlay";
    overlay.innerHTML = '<form class="first-login-card"><h2>Create your password</h2><p>For security, please create your own password before opening HRMS.</p><label>New password<input id="firstLoginPassword" type="password" autocomplete="new-password" required minlength="8"></label><label>Confirm password<input id="firstLoginConfirm" type="password" autocomplete="new-password" required minlength="8"></label><p class="first-login-note">Use at least 8 characters. A mix of letters, numbers and symbols is recommended.</p><button type="submit">Save Password</button><p class="first-login-message" id="firstLoginMessage"></p></form>';
    document.body.appendChild(overlay);
    overlay.querySelector("form").addEventListener("submit", async function (event) {
      event.preventDefault();
      var message = document.getElementById("firstLoginMessage");
      var password = document.getElementById("firstLoginPassword").value;
      var confirm = document.getElementById("firstLoginConfirm").value;
      if (password.length < 8) { message.textContent = "Password must be at least 8 characters."; return; }
      if (password !== confirm) { message.textContent = "Passwords do not match."; return; }
      message.textContent = "Saving your password...";
      var updateResult = await client.auth.updateUser({ password: password });
      if (updateResult.error) { message.textContent = updateResult.error.message; return; }
      var completeResult = await client.rpc("complete_my_first_login_password_change");
      if (completeResult.error) { message.textContent = completeResult.error.message; return; }
      message.style.color = "#4f6f48";
      message.textContent = "Password saved. Opening HRMS...";
      window.setTimeout(function () { window.location.reload(); }, 900);
    });
  }

  async function checkFirstLoginPassword() {
    var client = getClient();
    if (!client) return;
    var sessionResult = await client.auth.getSession();
    var session = sessionResult && sessionResult.data && sessionResult.data.session;
    var email = String(session && session.user && session.user.email || "").toLowerCase();
    if (email !== pilotEmail) return;
    var status = await client.rpc("get_my_password_change_status");
    var row = status && Array.isArray(status.data) ? status.data[0] : null;
    if (row && row.must_change_password) showOverlay(client, email);
  }

  window.addEventListener("load", function () { window.setTimeout(checkFirstLoginPassword, 1200); });
  new MutationObserver(function () { window.setTimeout(checkFirstLoginPassword, 300); }).observe(document.documentElement, { childList: true, subtree: true });
})();



// First-login password change pilot for test@citihomes.ae.
(function () {
  var pilotEmail = "test@citihomes.ae";
  var helperClient = null;
  var overlayShown = false;

  function getClient() {
    if (helperClient) return helperClient;
    var cfg = window.CITI_HOMES_SUPABASE || {};
    if (!window.supabase || !cfg.url || !cfg.anonKey) return null;
    helperClient = window.supabase.createClient(cfg.url, cfg.anonKey);
    return helperClient;
  }

  function styleOverlay() {
    if (document.getElementById("firstLoginPasswordStyle")) return;
    var style = document.createElement("style");
    style.id = "firstLoginPasswordStyle";
    style.textContent = "body.first-login-locked{overflow:hidden}.first-login-overlay{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:1.5rem;background:rgba(245,241,233,.62);backdrop-filter:blur(18px) saturate(1.25)}.first-login-card{width:min(460px,92vw);border:1px solid rgba(255,255,255,.82);border-radius:22px;padding:1.35rem 1.5rem;background:linear-gradient(135deg,rgba(255,255,255,.42),rgba(255,255,255,.16));box-shadow:0 28px 80px rgba(36,37,39,.22),inset 0 1px 0 rgba(255,255,255,.85);font-family:Quicksand,Arial,sans-serif;color:#242527}.first-login-card h2{margin:0 0 .35rem;font-size:1.55rem}.first-login-card p{margin:.2rem 0 1rem;color:#6f6658;line-height:1.45}.first-login-card label{display:grid;gap:.35rem;margin:.7rem 0;font-weight:700}.first-login-card input{height:48px;border-radius:15px;border:1px solid rgba(255,255,255,.86);background:rgba(255,255,255,.38);padding:0 .95rem;font:inherit}.first-login-card button{width:100%;height:50px;border:0;border-radius:18px;background:linear-gradient(135deg,#303133,#9b8547);color:#fff;font:700 1rem Quicksand,Arial,sans-serif;cursor:pointer}.first-login-card .first-login-message{min-height:22px;color:#b24132;font-weight:700}.first-login-card .first-login-note{font-size:.82rem;color:#6f6658}";
    document.head.appendChild(style);
  }

  function showOverlay(client, email) {
    if (overlayShown || document.getElementById("firstLoginPasswordOverlay")) return;
    overlayShown = true;
    styleOverlay();
    document.body.classList.add("first-login-locked");
    var overlay = document.createElement("div");
    overlay.id = "firstLoginPasswordOverlay";
    overlay.className = "first-login-overlay";
    overlay.innerHTML = '<form class="first-login-card"><h2>Create your password</h2><p>For security, please create your own password before opening HRMS.</p><label>New password<input id="firstLoginPassword" type="password" autocomplete="new-password" required minlength="8"></label><label>Confirm password<input id="firstLoginConfirm" type="password" autocomplete="new-password" required minlength="8"></label><p class="first-login-note">Use at least 8 characters. A mix of letters, numbers and symbols is recommended.</p><button type="submit">Save Password</button><p class="first-login-message" id="firstLoginMessage"></p></form>';
    document.body.appendChild(overlay);
    overlay.querySelector("form").addEventListener("submit", async function (event) {
      event.preventDefault();
      var message = document.getElementById("firstLoginMessage");
      var password = document.getElementById("firstLoginPassword").value;
      var confirm = document.getElementById("firstLoginConfirm").value;
      if (password.length < 8) { message.textContent = "Password must be at least 8 characters."; return; }
      if (password !== confirm) { message.textContent = "Passwords do not match."; return; }
      message.textContent = "Saving your password...";
      var updateResult = await client.auth.updateUser({ password: password });
      if (updateResult.error) { message.textContent = updateResult.error.message; return; }
      var completeResult = await client.rpc("complete_my_first_login_password_change");
      if (completeResult.error) { message.textContent = completeResult.error.message; return; }
      message.style.color = "#4f6f48";
      message.textContent = "Password saved. Opening HRMS...";
      window.setTimeout(function () { window.location.reload(); }, 900);
    });
  }

  async function checkFirstLoginPassword() {
    var client = getClient();
    if (!client) return;
    var sessionResult = await client.auth.getSession();
    var session = sessionResult && sessionResult.data && sessionResult.data.session;
    var email = String(session && session.user && session.user.email || "").toLowerCase();
    if (email !== pilotEmail) return;
    var status = await client.rpc("get_my_password_change_status");
    var row = status && Array.isArray(status.data) ? status.data[0] : null;
    if (row && row.must_change_password) showOverlay(client, email);
  }

  window.addEventListener("load", function () { window.setTimeout(checkFirstLoginPassword, 1200); });
  new MutationObserver(function () { window.setTimeout(checkFirstLoginPassword, 300); }).observe(document.documentElement, { childList: true, subtree: true });
})();


// First-login password screen polish: show password and reliable save handler.
(function () {
  function getClient() {
    var cfg = window.CITI_HOMES_SUPABASE || {};
    if (!window.supabase || !cfg.url || !cfg.anonKey) return null;
    return window.supabase.createClient(cfg.url, cfg.anonKey);
  }

  function setMessage(text, isError) {
    var message = document.getElementById("firstLoginMessage");
    if (!message) return;
    message.style.color = isError ? "#b13b2f" : "#4f6f48";
    message.textContent = text;
  }

  async function saveFirstLoginPassword(event) {
    var form = event.target;
    if (!form || !form.closest || !form.closest("#firstLoginPasswordOverlay")) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    var client = getClient();
    var passwordInput = document.getElementById("firstLoginPassword");
    var confirmInput = document.getElementById("firstLoginConfirm");
    var submitButton = form.querySelector('button[type="submit"]');
    var password = passwordInput ? passwordInput.value : "";
    var confirm = confirmInput ? confirmInput.value : "";

    if (!client) return setMessage("Secure connection is not ready. Please refresh and try again.", true);
    if (!password || password.length < 8) return setMessage("Password must be at least 8 characters.", true);
    if (password !== confirm) return setMessage("New password and confirm password must match.", true);

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Saving...";
    }
    setMessage("Saving your password...", false);

    try {
      var updateResult = await client.auth.updateUser({ password: password });
      if (updateResult && updateResult.error) throw updateResult.error;
      var completeResult = await client.rpc("complete_my_first_login_password_change");
      if (completeResult && completeResult.error) throw completeResult.error;
      setMessage("Password saved. Opening HRMS...", false);
      window.setTimeout(function () { window.location.reload(); }, 900);
    } catch (error) {
      setMessage((error && error.message) ? error.message : "Password could not be saved. Please try again.", true);
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Save Password";
      }
    }
  }

  function addPasswordToggle() {
    var overlay = document.getElementById("firstLoginPasswordOverlay");
    var passwordInput = document.getElementById("firstLoginPassword");
    var confirmInput = document.getElementById("firstLoginConfirm");
    if (!overlay || !passwordInput || !confirmInput) return;

    if (!document.getElementById("firstLoginPasswordPatchStyle")) {
      var style = document.createElement("style");
      style.id = "firstLoginPasswordPatchStyle";
      style.textContent = '.first-login-show-row{display:flex!important;align-items:center;gap:10px;margin:4px 0 14px;color:#343331;font-weight:700}.first-login-show-row input{width:18px!important;height:18px!important;accent-color:#6f7e58}.first-login-card button[disabled]{opacity:.68;cursor:wait}';
      document.head.appendChild(style);
    }

    if (!document.getElementById("firstLoginShowPassword")) {
      var note = overlay.querySelector(".first-login-note");
      var row = document.createElement("label");
      row.className = "first-login-show-row";
      row.innerHTML = '<input id="firstLoginShowPassword" type="checkbox"><span>Show password</span>';
      if (note && note.parentNode) note.parentNode.insertBefore(row, note);
      else overlay.querySelector("form").appendChild(row);
      row.querySelector("input").addEventListener("change", function () {
        var nextType = this.checked ? "text" : "password";
        passwordInput.type = nextType;
        confirmInput.type = nextType;
      });
    }

    var form = overlay.querySelector("form");
    if (form && form.dataset.firstLoginPatched !== "true") {
      form.dataset.firstLoginPatched = "true";
      form.addEventListener("submit", saveFirstLoginPassword, true);
    }
  }

  window.addEventListener("load", function () { window.setTimeout(addPasswordToggle, 500); });
  new MutationObserver(addPasswordToggle).observe(document.documentElement, { childList: true, subtree: true });
})();


// First-login password screen polish: show password and reliable save handler.
(function () {
  function getClient() {
    var cfg = window.CITI_HOMES_SUPABASE || {};
    if (!window.supabase || !cfg.url || !cfg.anonKey) return null;
    return window.supabase.createClient(cfg.url, cfg.anonKey);
  }

  function setMessage(text, isError) {
    var message = document.getElementById("firstLoginMessage");
    if (!message) return;
    message.style.color = isError ? "#b13b2f" : "#4f6f48";
    message.textContent = text;
  }

  async function saveFirstLoginPassword(event) {
    var form = event.target;
    if (!form || !form.closest || !form.closest("#firstLoginPasswordOverlay")) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    var client = getClient();
    var passwordInput = document.getElementById("firstLoginPassword");
    var confirmInput = document.getElementById("firstLoginConfirm");
    var submitButton = form.querySelector('button[type="submit"]');
    var password = passwordInput ? passwordInput.value : "";
    var confirm = confirmInput ? confirmInput.value : "";

    if (!client) return setMessage("Secure connection is not ready. Please refresh and try again.", true);
    if (!password || password.length < 8) return setMessage("Password must be at least 8 characters.", true);
    if (password !== confirm) return setMessage("New password and confirm password must match.", true);

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Saving...";
    }
    setMessage("Saving your password...", false);

    try {
      var updateResult = await client.auth.updateUser({ password: password });
      if (updateResult && updateResult.error) throw updateResult.error;
      var completeResult = await client.rpc("complete_my_first_login_password_change");
      if (completeResult && completeResult.error) throw completeResult.error;
      setMessage("Password saved. Opening HRMS...", false);
      window.setTimeout(function () { window.location.reload(); }, 900);
    } catch (error) {
      setMessage((error && error.message) ? error.message : "Password could not be saved. Please try again.", true);
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Save Password";
      }
    }
  }

  function addPasswordToggle() {
    var overlay = document.getElementById("firstLoginPasswordOverlay");
    var passwordInput = document.getElementById("firstLoginPassword");
    var confirmInput = document.getElementById("firstLoginConfirm");
    if (!overlay || !passwordInput || !confirmInput) return;

    if (!document.getElementById("firstLoginPasswordPatchStyle")) {
      var style = document.createElement("style");
      style.id = "firstLoginPasswordPatchStyle";
      style.textContent = '.first-login-show-row{display:flex!important;align-items:center;gap:10px;margin:4px 0 14px;color:#343331;font-weight:700}.first-login-show-row input{width:18px!important;height:18px!important;accent-color:#6f7e58}.first-login-card button[disabled]{opacity:.68;cursor:wait}';
      document.head.appendChild(style);
    }

    if (!document.getElementById("firstLoginShowPassword")) {
      var note = overlay.querySelector(".first-login-note");
      var row = document.createElement("label");
      row.className = "first-login-show-row";
      row.innerHTML = '<input id="firstLoginShowPassword" type="checkbox"><span>Show password</span>';
      if (note && note.parentNode) note.parentNode.insertBefore(row, note);
      else overlay.querySelector("form").appendChild(row);
      row.querySelector("input").addEventListener("change", function () {
        var nextType = this.checked ? "text" : "password";
        passwordInput.type = nextType;
        confirmInput.type = nextType;
      });
    }

    var form = overlay.querySelector("form");
    if (form && form.dataset.firstLoginPatched !== "true") {
      form.dataset.firstLoginPatched = "true";
      form.addEventListener("submit", saveFirstLoginPassword, true);
    }
  }

  window.addEventListener("load", function () { window.setTimeout(addPasswordToggle, 500); });
  new MutationObserver(addPasswordToggle).observe(document.documentElement, { childList: true, subtree: true });
})();


// First-login password current-password support for Supabase secure password changes.
(function () {
  function getClient() {
    var cfg = window.CITI_HOMES_SUPABASE || {};
    if (!window.supabase || !cfg.url || !cfg.anonKey) return null;
    return window.supabase.createClient(cfg.url, cfg.anonKey);
  }

  function setMessage(text, isError) {
    var message = document.getElementById("firstLoginMessage");
    if (!message) return;
    message.style.color = isError ? "#b13b2f" : "#4f6f48";
    message.textContent = text;
  }

  function allPasswordInputs() {
    return Array.from(document.querySelectorAll("#firstLoginPasswordOverlay input[type='password'], #firstLoginPasswordOverlay input[type='text']"))
      .filter(function (input) { return input.id !== "firstLoginShowPassword"; });
  }

  async function saveWithCurrentPassword(event) {
    var form = event.target;
    if (!form || !form.closest || !form.closest("#firstLoginPasswordOverlay")) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    var client = getClient();
    var currentInput = document.getElementById("firstLoginCurrentPassword");
    var passwordInput = document.getElementById("firstLoginPassword");
    var confirmInput = document.getElementById("firstLoginConfirm");
    var submitButton = form.querySelector('button[type="submit"]');
    var currentPassword = currentInput ? currentInput.value : "";
    var password = passwordInput ? passwordInput.value : "";
    var confirm = confirmInput ? confirmInput.value : "";

    if (!client) return setMessage("Secure connection is not ready. Please refresh and try again.", true);
    if (!currentPassword) return setMessage("Please enter your current temporary password.", true);
    if (!password || password.length < 8) return setMessage("Password must be at least 8 characters.", true);
    if (password !== confirm) return setMessage("New password and confirm password must match.", true);

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Saving...";
    }
    setMessage("Saving your password...", false);

    try {
      var updateResult = await client.auth.updateUser({ password: password, currentPassword: currentPassword });
      if (updateResult && updateResult.error) throw updateResult.error;
      var completeResult = await client.rpc("complete_my_first_login_password_change");
      if (completeResult && completeResult.error) throw completeResult.error;
      setMessage("Password saved. Opening HRMS...", false);
      window.setTimeout(function () { window.location.reload(); }, 900);
    } catch (error) {
      setMessage((error && error.message) ? error.message : "Password could not be saved. Please check your current password and try again.", true);
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Save Password";
      }
    }
  }

  function installCurrentPasswordSupport() {
    var overlay = document.getElementById("firstLoginPasswordOverlay");
    var form = overlay && overlay.querySelector("form");
    var newPassword = document.getElementById("firstLoginPassword");
    var confirmPassword = document.getElementById("firstLoginConfirm");
    if (!overlay || !form || !newPassword || !confirmPassword) return;

    if (!document.getElementById("firstLoginCurrentPassword")) {
      var currentLabel = document.createElement("label");
      currentLabel.textContent = "Current temporary password";
      currentLabel.innerHTML += '<input id="firstLoginCurrentPassword" type="password" autocomplete="current-password" required>';
      form.insertBefore(currentLabel, newPassword.closest("label"));
    }

    var showToggle = document.getElementById("firstLoginShowPassword");
    if (showToggle && showToggle.dataset.currentPasswordPatched !== "true") {
      showToggle.dataset.currentPasswordPatched = "true";
      showToggle.addEventListener("change", function () {
        var nextType = this.checked ? "text" : "password";
        allPasswordInputs().forEach(function (input) { input.type = nextType; });
      }, true);
    }

    if (showToggle && showToggle.checked) allPasswordInputs().forEach(function (input) { input.type = "text"; });

    if (form.dataset.currentPasswordSubmitPatched !== "true") {
      form.dataset.currentPasswordSubmitPatched = "true";
      form.addEventListener("submit", saveWithCurrentPassword, true);
    }
  }

  window.addEventListener("load", function () { window.setTimeout(installCurrentPasswordSupport, 500); });
  new MutationObserver(installCurrentPasswordSupport).observe(document.documentElement, { childList: true, subtree: true });
})();


// First-login password submit priority fix: run current-password save before older handlers.
(function () {
  function getClient() {
    var cfg = window.CITI_HOMES_SUPABASE || {};
    if (!window.supabase || !cfg.url || !cfg.anonKey) return null;
    return window.supabase.createClient(cfg.url, cfg.anonKey);
  }

  function setMessage(text, isError) {
    var message = document.getElementById("firstLoginMessage");
    if (!message) return;
    message.style.color = isError ? "#b13b2f" : "#4f6f48";
    message.textContent = text;
  }

  function readFirstLoginPasswords() {
    return {
      current: (document.getElementById("firstLoginCurrentPassword") || {}).value || "",
      next: (document.getElementById("firstLoginPassword") || {}).value || "",
      confirm: (document.getElementById("firstLoginConfirm") || {}).value || ""
    };
  }

  async function saveFirstLoginPasswordWithCurrent(event) {
    if (event && event.preventDefault) event.preventDefault();
    if (event && event.stopPropagation) event.stopPropagation();
    if (event && event.stopImmediatePropagation) event.stopImmediatePropagation();

    var client = getClient();
    var values = readFirstLoginPasswords();
    var button = document.querySelector('#firstLoginPasswordOverlay button[type="submit"]');

    if (!client) return setMessage("Secure connection is not ready. Please refresh and try again.", true);
    if (!values.current) return setMessage("Please enter your current temporary password.", true);
    if (!values.next || values.next.length < 8) return setMessage("Password must be at least 8 characters.", true);
    if (values.next !== values.confirm) return setMessage("New password and confirm password must match.", true);

    if (button) {
      button.disabled = true;
      button.textContent = "Saving...";
    }
    setMessage("Saving your password...", false);

    try {
      var updateResult = await client.auth.updateUser({ password: values.next, currentPassword: values.current });
      if (updateResult && updateResult.error) throw updateResult.error;
      var completeResult = await client.rpc("complete_my_first_login_password_change");
      if (completeResult && completeResult.error) throw completeResult.error;
      setMessage("Password saved. Opening HRMS...", false);
      window.setTimeout(function () { window.location.reload(); }, 900);
    } catch (error) {
      setMessage((error && error.message) ? error.message : "Password could not be saved. Please check your current password and try again.", true);
      if (button) {
        button.disabled = false;
        button.textContent = "Save Password";
      }
    }
  }

  function installPrioritySubmit() {
    var overlay = document.getElementById("firstLoginPasswordOverlay");
    var form = overlay && overlay.querySelector("form");
    var button = overlay && overlay.querySelector('button[type="submit"]');
    if (!overlay || !form || !button || !document.getElementById("firstLoginCurrentPassword")) return;

    if (overlay.dataset.prioritySubmitPatched !== "true") {
      overlay.dataset.prioritySubmitPatched = "true";
      overlay.addEventListener("submit", saveFirstLoginPasswordWithCurrent, true);
    }
    if (button.dataset.prioritySubmitPatched !== "true") {
      button.dataset.prioritySubmitPatched = "true";
      button.addEventListener("click", saveFirstLoginPasswordWithCurrent, true);
    }
  }

  window.addEventListener("load", function () { window.setTimeout(installPrioritySubmit, 600); });
  new MutationObserver(installPrioritySubmit).observe(document.documentElement, { childList: true, subtree: true });
})();


// First-login password robust re-authentication save for the pilot account.
(function () {
  var pilotEmail = "test@citihomes.ae";

  function getClient() {
    var cfg = window.CITI_HOMES_SUPABASE || {};
    if (!window.supabase || !cfg.url || !cfg.anonKey) return null;
    return window.supabase.createClient(cfg.url, cfg.anonKey);
  }

  function setMessage(text, isError) {
    var message = document.getElementById("firstLoginMessage");
    if (!message) return;
    message.style.color = isError ? "#b13b2f" : "#4f6f48";
    message.textContent = text;
  }

  async function robustPilotPasswordSave(event) {
    var target = event && event.target;
    var overlay = document.getElementById("firstLoginPasswordOverlay");
    if (!overlay || !target || !target.closest || !target.closest("#firstLoginPasswordOverlay")) return;
    if (event.type === "click" && !target.closest('button[type="submit"]')) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    var client = getClient();
    var current = (document.getElementById("firstLoginCurrentPassword") || {}).value || "";
    var next = (document.getElementById("firstLoginPassword") || {}).value || "";
    var confirm = (document.getElementById("firstLoginConfirm") || {}).value || "";
    var button = overlay.querySelector('button[type="submit"]');

    if (!client) return setMessage("Secure connection is not ready. Please refresh and try again.", true);
    if (!current) return setMessage("Please enter your current temporary password.", true);
    if (!next || next.length < 8) return setMessage("Password must be at least 8 characters.", true);
    if (next !== confirm) return setMessage("New password and confirm password must match.", true);

    if (button) {
      button.disabled = true;
      button.textContent = "Saving...";
    }
    setMessage("Checking current password...", false);

    try {
      var signIn = await client.auth.signInWithPassword({ email: pilotEmail, password: current });
      if (signIn && signIn.error) throw signIn.error;
      setMessage("Saving your new password...", false);
      var update = await client.auth.updateUser({ password: next });
      if (update && update.error) throw update.error;
      var complete = await client.rpc("complete_my_first_login_password_change");
      if (complete && complete.error) throw complete.error;
      setMessage("Password saved. Opening HRMS...", false);
      window.setTimeout(function () { window.location.reload(); }, 900);
    } catch (error) {
      setMessage((error && error.message) ? error.message : "Password could not be saved. Please check your current password and try again.", true);
      if (button) {
        button.disabled = false;
        button.textContent = "Save Password";
      }
    }
  }

  document.addEventListener("click", robustPilotPasswordSave, true);
  document.addEventListener("submit", robustPilotPasswordSave, true);
})();


// Disable first-login password setup. Magic link will be used instead.
(function () {
  function removeFirstLoginPasswordOverlay() {
    var overlay = document.getElementById("firstLoginPasswordOverlay");
    if (overlay) overlay.remove();
    if (document.body) document.body.classList.remove("first-login-locked");
  }

  removeFirstLoginPasswordOverlay();
  window.addEventListener("load", removeFirstLoginPasswordOverlay);
  window.addEventListener("pageshow", removeFirstLoginPasswordOverlay);
  new MutationObserver(removeFirstLoginPasswordOverlay).observe(document.documentElement, { childList: true, subtree: true });
})();



// Test profile view-only access and Store tab compatibility patch.
(function () {
  function testEmail() {
    try {
      if (typeof normalizedEmail === "function") return normalizedEmail();
    } catch (error) {}
    return "";
  }

  function isTestViewOnlyUser() {
    return testEmail() === "test@citihomes.ae";
  }

  function applyTabPatch() {
    try {
      if (Array.isArray(pages)) {
        var inventoryPage = pages.find(function (page) { return page.key === "inventory"; });
        if (inventoryPage) inventoryPage.label = "Office Assets";

        var hasStore = pages.some(function (page) { return page.key === "store"; });
        if (!hasStore) {
          var inventoryIndex = pages.findIndex(function (page) { return page.key === "inventory"; });
          var storePage = { key: "store", label: "Store", table: "store" };
          if (inventoryIndex >= 0) pages.splice(inventoryIndex + 1, 0, storePage);
          else pages.push(storePage);
        }
      }

      if (typeof columns === "object" && columns) {
        columns.store = ["item", "category", "quantity", "location", "requested_by", "status", "remarks"];
      }
    } catch (error) {
      console.warn("Unable to apply Store tab patch", error);
    }
  }

  function patchPermissions() {
    if (window.__testViewOnlyPermissionsPatched) return;
    window.__testViewOnlyPermissionsPatched = true;

    var originalCanEdit = typeof canEdit === "function" ? canEdit : function () { return false; };
    var originalCanViewTable = typeof canViewTable === "function" ? canViewTable : function () { return false; };
    var originalCanEditTable = typeof canEditTable === "function" ? canEditTable : function () { return false; };
    var originalCanExportTable = typeof canExportTable === "function" ? canExportTable : function () { return false; };
    var originalCanViewPage = typeof canViewPage === "function" ? canViewPage : function () { return false; };
    var originalCanViewAttendancePortal = typeof canViewAttendancePortal === "function" ? canViewAttendancePortal : function () { return false; };

    canEdit = function () {
      if (isTestViewOnlyUser()) return false;
      return originalCanEdit();
    };

    canViewTable = function (table) {
      if (isTestViewOnlyUser()) return table !== "employee_hierarchy";
      if (table === "store") return originalCanViewTable("inventory");
      return originalCanViewTable(table);
    };

    canEditTable = function (table) {
      if (isTestViewOnlyUser()) return false;
      if (table === "store") return originalCanEditTable("inventory");
      return originalCanEditTable(table);
    };

    canExportTable = function (table) {
      if (isTestViewOnlyUser()) return false;
      if (table === "store") return originalCanExportTable("inventory");
      return originalCanExportTable(table);
    };

    canViewAttendancePortal = function () {
      if (isTestViewOnlyUser()) return true;
      return originalCanViewAttendancePortal();
    };

    canViewPage = function (page) {
      if (isTestViewOnlyUser()) {
        if (page.key === "access_control" || page.key === "hierarchy") return false;
        if (page.key === "attendance") return true;
        if (page.table) return page.table !== "employee_hierarchy";
        return true;
      }
      return originalCanViewPage(page);
    };
  }

  function applyViewOnlyUiGuards() {
    if (!isTestViewOnlyUser()) return;
    document.querySelectorAll("[data-save], [data-delete], [data-import], [data-export], [data-clear-table], [data-recruitment-template]").forEach(function (node) {
      node.remove();
    });
    document.querySelectorAll("#recordForm, #addRecordPanel").forEach(function (node) {
      node.hidden = true;
    });
  }

  function applyPatch() {
    applyTabPatch();
    patchPermissions();
    applyViewOnlyUiGuards();
    try {
      if (typeof renderShell === "function") renderShell();
    } catch (error) {}
  }

  applyPatch();
  window.addEventListener("load", applyPatch);
  window.addEventListener("pageshow", applyPatch);
  new MutationObserver(function () {
    applyTabPatch();
    applyViewOnlyUiGuards();
  }).observe(document.documentElement, { childList: true, subtree: true });
})();


// Test profile view-only access and Store tab compatibility patch.
(function () {
  function testEmail() {
    try {
      if (typeof normalizedEmail === "function") return normalizedEmail();
    } catch (error) {}
    return "";
  }

  function isTestViewOnlyUser() {
    return testEmail() === "test@citihomes.ae";
  }

  function applyTabPatch() {
    try {
      if (Array.isArray(pages)) {
        var inventoryPage = pages.find(function (page) { return page.key === "inventory"; });
        if (inventoryPage) inventoryPage.label = "Office Assets";

        var hasStore = pages.some(function (page) { return page.key === "store"; });
        if (!hasStore) {
          var inventoryIndex = pages.findIndex(function (page) { return page.key === "inventory"; });
          var storePage = { key: "store", label: "Store", table: "store" };
          if (inventoryIndex >= 0) pages.splice(inventoryIndex + 1, 0, storePage);
          else pages.push(storePage);
        }
      }

      if (typeof columns === "object" && columns) {
        columns.store = ["item", "category", "quantity", "location", "requested_by", "status", "remarks"];
      }
    } catch (error) {
      console.warn("Unable to apply Store tab patch", error);
    }
  }

  function patchPermissions() {
    if (window.__testViewOnlyPermissionsPatched) return;
    window.__testViewOnlyPermissionsPatched = true;

    var originalCanEdit = typeof canEdit === "function" ? canEdit : function () { return false; };
    var originalCanViewTable = typeof canViewTable === "function" ? canViewTable : function () { return false; };
    var originalCanEditTable = typeof canEditTable === "function" ? canEditTable : function () { return false; };
    var originalCanExportTable = typeof canExportTable === "function" ? canExportTable : function () { return false; };
    var originalCanViewPage = typeof canViewPage === "function" ? canViewPage : function () { return false; };
    var originalCanViewAttendancePortal = typeof canViewAttendancePortal === "function" ? canViewAttendancePortal : function () { return false; };

    canEdit = function () {
      if (isTestViewOnlyUser()) return false;
      return originalCanEdit();
    };

    canViewTable = function (table) {
      if (isTestViewOnlyUser()) return table !== "employee_hierarchy";
      if (table === "store") return originalCanViewTable("inventory");
      return originalCanViewTable(table);
    };

    canEditTable = function (table) {
      if (isTestViewOnlyUser()) return false;
      if (table === "store") return originalCanEditTable("inventory");
      return originalCanEditTable(table);
    };

    canExportTable = function (table) {
      if (isTestViewOnlyUser()) return false;
      if (table === "store") return originalCanExportTable("inventory");
      return originalCanExportTable(table);
    };

    canViewAttendancePortal = function () {
      if (isTestViewOnlyUser()) return true;
      return originalCanViewAttendancePortal();
    };

    canViewPage = function (page) {
      if (isTestViewOnlyUser()) {
        if (page.key === "access_control" || page.key === "hierarchy") return false;
        if (page.key === "attendance") return true;
        if (page.table) return page.table !== "employee_hierarchy";
        return true;
      }
      return originalCanViewPage(page);
    };
  }

  function applyViewOnlyUiGuards() {
    if (!isTestViewOnlyUser()) return;
    document.querySelectorAll("[data-save], [data-delete], [data-import], [data-export], [data-clear-table], [data-recruitment-template]").forEach(function (node) {
      node.remove();
    });
    document.querySelectorAll("#recordForm, #addRecordPanel").forEach(function (node) {
      node.hidden = true;
    });
  }

  function applyPatch() {
    applyTabPatch();
    patchPermissions();
    applyViewOnlyUiGuards();
    try {
      if (typeof renderShell === "function") renderShell();
    } catch (error) {}
  }

  applyPatch();
  window.addEventListener("load", applyPatch);
  window.addEventListener("pageshow", applyPatch);
  new MutationObserver(function () {
    applyTabPatch();
    applyViewOnlyUiGuards();
  }).observe(document.documentElement, { childList: true, subtree: true });
})();


// Magic link login patch. Password login is replaced by email-only sign in.
(function () {
  var MAGIC_REDIRECT_URL = "https://citi-homes.github.io/HRMS/";

  function message(text, tone) {
    var node = document.getElementById("loginMessage");
    if (!node) return;
    node.textContent = text || "";
    node.classList.toggle("success", tone === "success");
    node.classList.toggle("error", tone === "error");
  }

  function applyMagicLinkUi() {
    var form = document.getElementById("loginForm");
    var email = document.getElementById("username");
    var password = document.getElementById("password");
    var toggle = document.getElementById("passwordToggle");
    if (!form || !email) return;

    email.placeholder = "yourname@citihomes.ae";
    email.autocomplete = "email";
    email.required = true;

    var passwordLabel = password ? password.closest("label") : null;
    if (passwordLabel) passwordLabel.remove();
    if (toggle) toggle.remove();

    var submit = form.querySelector('button[type="submit"]');
    if (submit && submit.textContent.trim() !== "Send Magic Link") submit.textContent = "Send Magic Link";

    if (!form.querySelector(".magic-link-note")) {
      var note = document.createElement("p");
      note.className = "magic-link-note";
      note.textContent = "Enter your approved Citi Homes email. We will send a secure one-time sign-in link.";
      form.insertBefore(note, submit || document.getElementById("loginMessage"));
    }
  }

  async function sendMagicLink(email) {
    if (!client) throw new Error("Supabase connection is not ready.");
    var cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanEmail) throw new Error("Please enter your email address.");
    if (!cleanEmail.endsWith("@citihomes.ae")) throw new Error("Please use your Citi Homes email address.");

    var result = await client.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: MAGIC_REDIRECT_URL,
        shouldCreateUser: false
      }
    });
    if (result.error) throw result.error;
    return cleanEmail;
  }

  function installMagicSubmit() {
    var form = document.getElementById("loginForm");
    if (!form || form.dataset.magicLinkReady === "true") return;
    form.dataset.magicLinkReady = "true";

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      var submit = form.querySelector('button[type="submit"]');
      var original = submit ? submit.textContent : "Send Magic Link";
      try {
        if (submit) {
          submit.disabled = true;
          submit.textContent = "Sending...";
        }
        message("", "");
        var sentTo = await sendMagicLink(document.getElementById("username")?.value);
        message("Magic link sent to " + sentTo + ". Please open your email and click the sign-in link.", "success");
      } catch (error) {
        message(error?.message || String(error), "error");
      } finally {
        if (submit) {
          submit.disabled = false;
          submit.textContent = original;
        }
      }
    }, true);
  }

  function cleanMagicLinkUrl() {
    if (location.hash && /access_token|refresh_token|type=magiclink/.test(location.hash)) {
      history.replaceState(null, document.title, location.pathname + location.search);
    }
  }

  function applyMagicLinkPatch() {
    applyMagicLinkUi();
    installMagicSubmit();
    cleanMagicLinkUrl();
  }

  applyMagicLinkPatch();
  window.addEventListener("load", applyMagicLinkPatch);
  window.addEventListener("pageshow", applyMagicLinkPatch);
  new MutationObserver(applyMagicLinkPatch).observe(document.documentElement, { childList: true, subtree: true });
})();


// Restore standard login and first-time password creation for registered Access Control users.
(function standardLoginFirstTimeInstaller() {
  if (window.__standardLoginWithFirstTimePatch) return;
  window.__standardLoginWithFirstTimePatch = true;

  var APP_URL = "https://citi-homes.github.io/HRMS/";
  var originalRemove = Element.prototype.remove;
  var textDescriptor = Object.getOwnPropertyDescriptor(Node.prototype, "textContent");

  Element.prototype.remove = function () {
    if (document.documentElement.dataset.loginMode === "password") {
      if (this.id === "password" || this.id === "passwordToggle" || (this.querySelector && this.querySelector("#password")) || (this.classList && this.classList.contains("password-field"))) return;
    }
    return originalRemove.call(this);
  };

  if (textDescriptor && textDescriptor.set && !window.__loginTextSetterPatched) {
    window.__loginTextSetterPatched = true;
    Object.defineProperty(Node.prototype, "textContent", {
      get: textDescriptor.get,
      set: function (value) {
        var next = value;
        if (this && this.matches && this.matches('#loginForm button[type="submit"]') && value === "Send Magic Link") {
          next = document.documentElement.dataset.loginMode === "first_time" ? "Send Create Password Link" : "Login";
        }
        return textDescriptor.set.call(this, next);
      }
    });
  }

  function loginMessage(text, tone) {
    var node = document.getElementById("loginMessage");
    if (!node) return;
    node.textContent = text || "";
    node.style.color = tone === "error" ? "#b23b32" : tone === "success" ? "#4f6f4b" : "";
  }

  function formShell() {
    var oldForm = document.getElementById("loginForm");
    if (!oldForm) return null;
    var form = oldForm.cloneNode(false);
    form.id = "loginForm";
    form.className = oldForm.className || "login-form";
    form.method = "post";
    form.action = "javascript:void(0)";
    oldForm.parentNode.replaceChild(form, oldForm);
    return form;
  }

  function setupPasswordToggle() {
    var input = document.getElementById("password");
    var button = document.getElementById("passwordToggle");
    if (!input || !button) return;
    function show() { input.type = "text"; button.textContent = "Eye"; }
    function hide() { input.type = "password"; button.textContent = "Eye"; }
    button.addEventListener("mousedown", show);
    button.addEventListener("touchstart", show);
    button.addEventListener("mouseup", hide);
    button.addEventListener("mouseleave", hide);
    button.addEventListener("touchend", hide);
  }

  function renderPasswordLogin() {
    document.documentElement.dataset.loginMode = "password";
    var form = formShell();
    if (!form) return;
    form.innerHTML = [
      '<label>Email',
      '<input id="username" type="email" autocomplete="username" placeholder="admin@citihomes.ae" required>',
      '</label>',
      '<label>Password',
      '<span class="password-field">',
      '<input id="password" type="password" autocomplete="current-password" placeholder="Password" required>',
      '<button id="passwordToggle" type="button" aria-label="Hold to show password">Eye</button>',
      '</span>',
      '</label>',
      '<p class="magic-link-note" hidden></p>',
      '<button type="submit">Login</button>',
      '<button type="button" class="first-time-link" id="firstTimePasswordLink">First time user? Create password</button>',
      '<p id="loginMessage" class="form-message"></p>'
    ].join('');
    setupPasswordToggle();
    var firstTimeLink = document.getElementById("firstTimePasswordLink");
    if (firstTimeLink) firstTimeLink.addEventListener("click", renderFirstTimeRequest);
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      try {
        loginMessage("", "");
        var button = form.querySelector('button[type="submit"]');
        button.disabled = true;
        button.textContent = "Logging in...";
        state.session = await signIn(document.getElementById("username").value, document.getElementById("password").value);
        renderShell();
        renderDashboard();
        loadDashboardData({ optional: true }).then(function () { if (state.page === "dashboard") renderDashboard(); }).catch(function (error) { console.warn("Dashboard data loaded after login with warnings", error); });
        loadHierarchyData().then(function () { if (state.page === "dashboard") renderDashboard(); }).catch(function (error) { console.warn("Hierarchy loaded after login with warnings", error); });
      } catch (error) {
        loginMessage((error && error.message) || String(error), "error");
      } finally {
        var doneButton = form.querySelector('button[type="submit"]');
        if (doneButton) { doneButton.disabled = false; doneButton.textContent = "Login"; }
      }
    });
  }

  async function isRegisteredForPortal(email) {
    var cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanEmail) throw new Error("Please enter your registered email address.");
    if (!cleanEmail.endsWith("@citihomes.ae")) throw new Error("Please use your registered Citi Homes email address.");
    var result = await client.rpc("is_admin_portal_email", { p_email: cleanEmail });
    if (result.error) throw new Error("Access Control check is not ready. Please contact the super user.");
    if (!result.data) throw new Error("This email is not active in Access Control. Please ask the super user to add your profile first.");
    return cleanEmail;
  }

  function renderFirstTimeRequest() {
    document.documentElement.dataset.loginMode = "first_time";
    var form = formShell();
    if (!form) return;
    form.innerHTML = [
      '<label>Registered Email',
      '<input id="username" type="email" autocomplete="email" placeholder="yourname@citihomes.ae" required>',
      '</label>',
      '<p class="magic-link-note">Only emails already added by the super user in Access Control can create a password.</p>',
      '<button type="submit">Send Create Password Link</button>',
      '<button type="button" class="first-time-link" id="backToLogin">Back to normal login</button>',
      '<p id="loginMessage" class="form-message"></p>'
    ].join('');
    var back = document.getElementById("backToLogin");
    if (back) back.addEventListener("click", renderPasswordLogin);
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      var button = form.querySelector('button[type="submit"]');
      try {
        if (!client) throw new Error("Supabase connection is not ready.");
        button.disabled = true;
        button.textContent = "Sending...";
        loginMessage("", "");
        var cleanEmail = await isRegisteredForPortal(document.getElementById("username") && document.getElementById("username").value);
        var result = await client.auth.resetPasswordForEmail(cleanEmail, { redirectTo: APP_URL + "?first_time_password=1" });
        if (result.error) throw result.error;
        loginMessage("Create-password link sent to " + cleanEmail + ". Open your email and follow the link.", "success");
      } catch (error) {
        loginMessage((error && error.message) || String(error), "error");
      } finally {
        button.disabled = false;
        button.textContent = "Send Create Password Link";
      }
    });
  }

  function showPasswordCreateOverlay() {
    if (document.getElementById("createPasswordOverlay")) return;
    var overlay = document.createElement("div");
    overlay.id = "createPasswordOverlay";
    overlay.style.cssText = "position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:rgba(0,0,0,.28);backdrop-filter:blur(10px);";
    overlay.innerHTML = [
      '<form id="createPasswordForm" style="width:min(520px,92vw);padding:28px;border-radius:26px;background:rgba(255,255,255,.72);border:1px solid rgba(255,255,255,.72);box-shadow:0 24px 70px rgba(0,0,0,.18);font-family:inherit;">',
      '<h2 style="margin:0 0 8px;font-size:30px;">Create your password</h2>',
      '<p style="margin:0 0 18px;color:#6f6a60;">Set your private HRMS password. After saving, use normal email/password login.</p>',
      '<label style="display:block;margin-bottom:12px;">New password<input id="newHrmsPassword" type="password" minlength="8" required style="width:100%;margin-top:8px;padding:14px;border-radius:18px;border:1px solid rgba(255,255,255,.8);background:rgba(255,255,255,.55);"></label>',
      '<label style="display:block;margin-bottom:12px;">Confirm password<input id="confirmHrmsPassword" type="password" minlength="8" required style="width:100%;margin-top:8px;padding:14px;border-radius:18px;border:1px solid rgba(255,255,255,.8);background:rgba(255,255,255,.55);"></label>',
      '<label style="display:flex;gap:10px;align-items:center;margin:12px 0 18px;"><input id="showCreatedPassword" type="checkbox">Show password</label>',
      '<button type="submit" style="width:100%;border:0;border-radius:22px;padding:15px;background:linear-gradient(135deg,#343434,#9c8341);color:white;font-weight:700;font-size:17px;">Save Password</button>',
      '<p id="createPasswordMessage" style="margin:14px 0 0;color:#b23b32;font-weight:700;"></p>',
      '</form>'
    ].join('');
    document.body.appendChild(overlay);
    var showCheckbox = document.getElementById("showCreatedPassword");
    if (showCheckbox) showCheckbox.addEventListener("change", function () {
      var type = this.checked ? "text" : "password";
      document.getElementById("newHrmsPassword").type = type;
      document.getElementById("confirmHrmsPassword").type = type;
    });
    var passwordForm = document.getElementById("createPasswordForm");
    if (passwordForm) passwordForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      var message = document.getElementById("createPasswordMessage");
      var first = document.getElementById("newHrmsPassword").value;
      var second = document.getElementById("confirmHrmsPassword").value;
      try {
        if (first.length < 8) throw new Error("Password must be at least 8 characters.");
        if (first !== second) throw new Error("Passwords do not match.");
        var update = await client.auth.updateUser({ password: first });
        if (update.error) throw update.error;
        message.style.color = "#4f6f4b";
        message.textContent = "Password saved successfully. Opening HRMS...";
        history.replaceState(null, document.title, location.pathname);
        var sessionResult = await client.auth.getSession();
        state.session = sessionResult.data.session;
        state.portalUser = await verifyPortalAccess();
        overlay.remove();
        renderShell();
        renderDashboard();
        loadDashboardData({ optional: true }).then(function () { if (state.page === "dashboard") renderDashboard(); });
      } catch (error) {
        message.style.color = "#b23b32";
        message.textContent = (error && error.message) || String(error);
      }
    });
  }

  function maybeShowCreatePassword() {
    var isCreatePasswordReturn = location.search.indexOf("first_time_password=1") >= 0 || /type=recovery|access_token|refresh_token/.test(location.hash || "");
    if (!isCreatePasswordReturn || !client) return;
    setTimeout(async function () {
      var sessionResult = await client.auth.getSession();
      if (sessionResult.data.session) showPasswordCreateOverlay();
    }, 900);
  }

  function bootPatch() {
    var loginVisible = document.getElementById("loginView") && !document.getElementById("loginView").hidden;
    if (loginVisible && document.documentElement.dataset.loginMode !== "first_time") renderPasswordLogin();
    maybeShowCreatePassword();
  }

  bootPatch();
  window.addEventListener("load", bootPatch);
  window.addEventListener("pageshow", bootPatch);
})();


// Stop old magic-link button watcher from repeatedly rewriting restored login buttons.
(function () {
  if (window.__stopMagicLoginButtonLoop) return;
  window.__stopMagicLoginButtonLoop = true;
  var descriptor = Object.getOwnPropertyDescriptor(Node.prototype, "textContent");
  if (!descriptor || !descriptor.set || !descriptor.get) return;
  Object.defineProperty(Node.prototype, "textContent", {
    get: descriptor.get,
    set: function (value) {
      if (this && this.matches && this.matches('#loginForm button[type="submit"]') && value === "Send Magic Link") {
        var mode = document.documentElement.dataset.loginMode;
        var current = descriptor.get.call(this);
        if (mode === "password" && current === "Login") return;
        if (mode === "first_time" && current === "Send Create Password Link") return;
      }
      return descriptor.set.call(this, value);
    }
  });
})();


// Stable Access Control profile creation through Supabase RPC.
(function () {
  if (window.__chAccessProfileCreatePatch) return;
  window.__chAccessProfileCreatePatch = true;

  function accessCreateMessage(text, tone) {
    var node = document.getElementById("accessControlMessage");
    if (!node) return;
    node.textContent = text || "";
    node.classList.toggle("success", tone === "success");
    node.classList.toggle("error", tone === "error");
  }

  function profileRpcPayload(payload) {
    return {
      p_team_member_id: payload.team_member_id || "",
      p_team_member_name: payload.team_member_name || "",
      p_email: payload.email || "",
      p_role: payload.role || "Viewer",
      p_access_level: payload.access_level || payload.role || "Viewer",
      p_is_active: payload.is_active !== false,
      p_can_view_attendance: Boolean(payload.can_view_attendance),
      p_can_view_employee_master: Boolean(payload.can_view_employee_master),
      p_can_view_recruitment: Boolean(payload.can_view_recruitment),
      p_can_manage_leave: Boolean(payload.can_manage_leave),
      p_can_manage_vendors: Boolean(payload.can_manage_vendors),
      p_can_manage_inventory: Boolean(payload.can_manage_inventory),
      p_can_manage_pantry: Boolean(payload.can_manage_pantry)
    };
  }

  async function createLoginAccountIfNeeded(payload, currentSession) {
    if (!client || !client.auth || !payload.email || !payload.password) return "Access profile saved.";
    var result = await client.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: { data: { display_name: payload.team_member_name || "", team_member_id: payload.team_member_id || "" } }
    });
    if (currentSession && currentSession.access_token && currentSession.refresh_token) {
      await client.auth.setSession({ access_token: currentSession.access_token, refresh_token: currentSession.refresh_token });
      if (typeof state === "object") state.session = currentSession;
    }
    if (result.error) {
      var text = String(result.error.message || "");
      if (text.toLowerCase().includes("already") || text.toLowerCase().includes("registered")) {
        return "Access profile saved. Login account already exists.";
      }
      return "Access profile saved. Supabase Auth user may need checking: " + text;
    }
    return "Access profile saved and login account created.";
  }

  createAccessProfile = async function (form) {
    if (typeof isSuperUser === "function" && !isSuperUser()) throw new Error("Only the superuser can create access profiles.");
    if (!client) throw new Error("Supabase connection is not ready.");

    accessCreateMessage("Creating profile...");
    var payload = accessFormPayload(form);
    if (!payload.team_member_id || !payload.team_member_name || !payload.email || !payload.password) {
      throw new Error("Please fill Team Member ID, Name, Email and Temporary Password.");
    }

    var currentSession = typeof state === "object" ? state.session : null;
    var rpcResult = await client.rpc("upsert_admin_portal_user_profile", profileRpcPayload(payload));
    if (rpcResult.error) throw rpcResult.error;

    var authMessage = await createLoginAccountIfNeeded(payload, currentSession);
    if (form && typeof form.reset === "function") form.reset();
    if (typeof renderAccessControlPage === "function") await renderAccessControlPage();
    accessCreateMessage(authMessage + " Active for " + payload.email + ".", "success");
  };
})();


// Fast Access Control profile creation: save profile first, create auth account in background.
(function () {
  if (window.__chFastAccessProfilePatch) return;
  window.__chFastAccessProfilePatch = true;

  function setAccessMessage(text, tone) {
    var node = document.getElementById("accessControlMessage");
    if (!node) return;
    node.textContent = text || "";
    node.classList.toggle("success", tone === "success");
    node.classList.toggle("error", tone === "error");
  }

  function makeProfileRpcPayload(payload) {
    return {
      p_team_member_id: payload.team_member_id || "",
      p_team_member_name: payload.team_member_name || "",
      p_email: payload.email || "",
      p_role: payload.role || "Viewer",
      p_access_level: payload.access_level || payload.role || "Viewer",
      p_is_active: payload.is_active !== false,
      p_can_view_attendance: Boolean(payload.can_view_attendance),
      p_can_view_employee_master: Boolean(payload.can_view_employee_master),
      p_can_view_recruitment: Boolean(payload.can_view_recruitment),
      p_can_manage_leave: Boolean(payload.can_manage_leave),
      p_can_manage_vendors: Boolean(payload.can_manage_vendors),
      p_can_manage_inventory: Boolean(payload.can_manage_inventory),
      p_can_manage_pantry: Boolean(payload.can_manage_pantry)
    };
  }

  function backgroundCreateAuthAccount(payload, sessionSnapshot) {
    if (!client || !client.auth || !payload.email || !payload.password) return;
    window.setTimeout(async function () {
      try {
        await client.auth.signUp({
          email: payload.email,
          password: payload.password,
          options: { data: { display_name: payload.team_member_name || "", team_member_id: payload.team_member_id || "" } }
        });
      } catch (error) {
        console.warn("Background login account creation needs checking", error);
      } finally {
        try {
          if (sessionSnapshot && sessionSnapshot.access_token && sessionSnapshot.refresh_token) {
            await client.auth.setSession({ access_token: sessionSnapshot.access_token, refresh_token: sessionSnapshot.refresh_token });
            if (typeof state === "object") state.session = sessionSnapshot;
          }
        } catch (error) {}
      }
    }, 50);
  }

  createAccessProfile = async function (form) {
    if (typeof isSuperUser === "function" && !isSuperUser()) throw new Error("Only the superuser can create access profiles.");
    if (!client) throw new Error("Supabase connection is not ready.");

    setAccessMessage("Saving profile...");
    var payload = accessFormPayload(form);
    if (!payload.team_member_id || !payload.team_member_name || !payload.email || !payload.password) {
      throw new Error("Please fill Team Member ID, Name, Email and Temporary Password.");
    }

    var sessionSnapshot = typeof state === "object" ? state.session : null;
    var rpcResult = await client.rpc("upsert_admin_portal_user_profile", makeProfileRpcPayload(payload));
    if (rpcResult.error) throw rpcResult.error;

    backgroundCreateAuthAccount(payload, sessionSnapshot);
    if (form && typeof form.reset === "function") form.reset();
    if (typeof renderAccessControlPage === "function") await renderAccessControlPage();
    setAccessMessage("Profile saved for " + payload.email + ". Login account is being prepared in the background.", "success");
  };
})();


// Final Access Control create-profile override: save with Supabase Auth user ID.
(function () {
  window.__chAccessCreateAuthIdFinal = true;

  function accessMessage(text, tone) {
    var node = document.getElementById("accessControlMessage");
    if (!node) return;
    node.textContent = text || "";
    node.classList.toggle("success", tone === "success");
    node.classList.toggle("error", tone === "error");
  }

  async function restoreSuperuserSession(sessionSnapshot) {
    try {
      if (sessionSnapshot && sessionSnapshot.access_token && sessionSnapshot.refresh_token) {
        await client.auth.setSession({ access_token: sessionSnapshot.access_token, refresh_token: sessionSnapshot.refresh_token });
        if (typeof state === "object") state.session = sessionSnapshot;
      }
    } catch (error) {}
  }

  createAccessProfile = async function (form) {
    if (typeof isSuperUser === "function" && !isSuperUser()) throw new Error("Only the superuser can create access profiles.");
    if (!client) throw new Error("Supabase connection is not ready.");

    accessMessage("Creating login account...");
    var payload = accessFormPayload(form);
    if (!payload.team_member_id || !payload.team_member_name || !payload.email || !payload.password) {
      throw new Error("Please fill Team Member ID, Name, Email and Temporary Password.");
    }

    var sessionSnapshot = typeof state === "object" ? state.session : null;
    var signUpResult = await Promise.race([
      client.auth.signUp({
        email: payload.email,
        password: payload.password,
        options: { data: { display_name: payload.team_member_name, team_member_id: payload.team_member_id } }
      }),
      new Promise(function (_, reject) {
        window.setTimeout(function () { reject(new Error("Login account creation is taking too long. Please try again.")); }, 15000);
      })
    ]);
    await restoreSuperuserSession(sessionSnapshot);

    var signUpError = signUpResult && signUpResult.error;
    var authUserId = signUpResult && signUpResult.data && signUpResult.data.user && signUpResult.data.user.id;
    if (signUpError && !String(signUpError.message || "").toLowerCase().includes("already")) throw signUpError;
    if (!authUserId) {
      throw new Error("This email already exists in Supabase Auth or did not return an Auth ID. Delete that Auth user first, then create the profile again.");
    }

    accessMessage("Saving access profile...");
    var profilePayload = Object.assign({}, payload, { auth_user_id: authUserId });
    delete profilePayload.password;
    var saveResult = await client.from("admin_portal_users").upsert(profilePayload, { onConflict: "auth_user_id" });
    if (saveResult.error) throw saveResult.error;

    form.reset();
    if (typeof renderAccessControlPage === "function") await renderAccessControlPage();
    accessMessage("Profile saved for " + payload.email + ".", "success");
  };
})();


// Final Access Control profile save. This keeps the current superuser session active.
(function () {
  window.__chAccessProfileOnlyFinal = true;

  function setAccessProfileMessage(text, tone) {
    var node = document.getElementById("accessControlMessage");
    if (!node) return;
    node.textContent = text || "";
    node.classList.toggle("success", tone === "success");
    node.classList.toggle("error", tone === "error");
  }

  window.createAccessProfile = async function (form) {
    if (typeof isSuperUser === "function" && !isSuperUser()) {
      throw new Error("Only the superuser can create access profiles.");
    }
    if (!client) throw new Error("Supabase connection is not ready.");

    setAccessProfileMessage("Saving access profile...");
    var payload = accessFormPayload(form);
    if (!payload.team_member_id || !payload.team_member_name || !payload.email) {
      throw new Error("Please fill Team Member ID, Name and Email.");
    }

    var profilePayload = Object.assign({}, payload);
    delete profilePayload.password;

    var result = await client.from("admin_portal_users").insert(profilePayload);
    if (result.error) throw result.error;

    form.reset();
    if (typeof renderAccessControlPage === "function") await renderAccessControlPage();
    setAccessProfileMessage("Profile saved for " + payload.email + ". Create the login account from Supabase Auth when ready.", "success");
  };
})();
