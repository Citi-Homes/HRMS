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
