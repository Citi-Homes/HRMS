(function () {
  const superUserEmails = new Set(["umer@citihomes.ae"]);

  function currentEmail() {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      const value = localStorage.getItem(key);
      if (!value || !key.toLowerCase().includes("auth")) continue;
      try {
        const parsed = JSON.parse(value);
        const email = parsed?.user?.email || parsed?.session?.user?.email || parsed?.currentSession?.user?.email;
        if (email) return String(email).toLowerCase();
      } catch {}
    }
    return "";
  }

  function isSuperUser() {
    return superUserEmails.has(currentEmail());
  }

  let scheduled = false;
  function schedulePageTools() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      addPageTools();
    });
  }

  function csvCell(value) {
    const text = String(value || "").trim();
    return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }

  function addPageTools() {
    const pageTitle = document.querySelector("#pageTitle");
    const tools = document.querySelector("#pageTools");
    if (!pageTitle || !tools) return;

    const title = pageTitle.textContent.trim();
    if (title === "Employee Master") addEmployeeExportButton(tools);
  }

  function addEmployeeExportButton(tools) {
    if (tools.querySelector("[data-export-employees]")) return;
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
    link.href = URL.createObjectURL(blob);
    link.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(link.href);
    link.remove();
  }

  function exportEmployees() {
    exportVisibleTable("employee-master", "No employee records available to export.");
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-export-employees]")) {
      event.preventDefault();
      exportEmployees();
    }
    setTimeout(schedulePageTools, 50);
  });

  new MutationObserver((mutations) => {
    const shouldUpdate = mutations.some((mutation) => (
      mutation.target.id === "pageTools" ||
      mutation.target.id === "addRecordPanel" ||
      mutation.target.id === "pageTitle" ||
      mutation.target.closest?.("#pageTools, #addRecordPanel, #tablePage")
    ));
    if (shouldUpdate) schedulePageTools();
  }).observe(document.body, { childList: true, subtree: true });
  schedulePageTools();
})();
