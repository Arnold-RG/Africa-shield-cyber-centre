(function () {
  const form = document.querySelector("[data-report]");
  if (!form) return;
  const KEY = "shield-reports-v1";
  const list = document.querySelector("[data-report-list]");
  const search = document.querySelector("[data-search]");
  const statusFilter = document.querySelector("[data-status]");
  const note = document.querySelector("[data-report-note]");
  const empty = document.querySelector("[data-report-empty]");

  const read = () => {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
    catch { return []; }
  };
  const write = (rows) => localStorage.setItem(KEY, JSON.stringify(rows));

  const ref = () => {
    const now = new Date();
    const stamp = now.toISOString().slice(0, 10).replace(/-/g, "");
    const salt = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `AS-${stamp}-${salt}`;
  };

  function render() {
    const q = (search?.value || "").trim().toLowerCase();
    const status = statusFilter?.value || "all";
    const rows = read().filter((row) => {
      if (status !== "all" && row.status !== status) return false;
      if (!q) return true;
      return `${row.ref} ${row.title} ${row.category} ${row.country} ${row.detail}`.toLowerCase().includes(q);
    });
    if (empty) empty.classList.toggle("hidden", rows.length !== 0);
    if (!list) return;
    list.innerHTML = rows.map((row) => `
      <article class="job" data-ref="${row.ref}">
        <div>
          <p class="kicker">${row.ref}</p>
          <h3>${escapeHtml(row.title)}</h3>
          <p class="muted" style="margin-top:0.45rem">${escapeHtml(row.category)} · ${escapeHtml(row.country)}</p>
          <p style="margin-top:0.7rem">${escapeHtml(row.detail)}</p>
        </div>
        <div>
          <label>Status
            <select data-set-status="${row.ref}">
              ${["filed", "watching", "closed"].map((item) => `<option ${item === row.status ? "selected" : ""}>${item}</option>`).join("")}
            </select>
          </label>
          <p class="muted" style="margin-top:0.8rem">Filed ${row.filed.slice(0, 10)} · kept on this device</p>
          <button class="text-btn" type="button" data-delete="${row.ref}" style="margin-top:0.6rem;letter-spacing:0.12em;text-transform:uppercase;font-size:0.72rem">Remove</button>
        </div>
      </article>`).join("");
    list.querySelectorAll("[data-set-status]").forEach((select) => {
      select.addEventListener("change", () => {
        const rowsAll = read();
        const row = rowsAll.find((item) => item.ref === select.getAttribute("data-set-status"));
        if (row) row.status = select.value;
        write(rowsAll);
      });
    });
    list.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", () => {
        write(read().filter((item) => item.ref !== btn.getAttribute("data-delete")));
        render();
      });
    });
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[ch]));
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const title = String(data.get("title") || "").trim();
    const detail = String(data.get("detail") || "").trim();
    const category = String(data.get("category") || "");
    const country = String(data.get("country") || "");
    if (title.length < 4 || detail.length < 12 || !category || !country) {
      if (note) note.textContent = "Add a title, a category, a country, and a description of at least a sentence.";
      return;
    }
    const row = {
      ref: ref(),
      title,
      detail,
      category,
      country,
      when: String(data.get("when") || ""),
      contact: String(data.get("contact") || "").trim(),
      status: "filed",
      filed: new Date().toISOString(),
    };
    const rows = read();
    rows.unshift(row);
    write(rows);
    form.reset();
    if (note) note.textContent = `${row.ref} is stored in this browser. It was not uploaded.`;
    render();
  });

  document.querySelector("[data-export]")?.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(read(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "africa-shield-notes.json";
    link.click();
    URL.revokeObjectURL(url);
  });

  document.querySelector("[data-clear]")?.addEventListener("click", () => {
    if (!read().length) return;
    if (window.confirm("Remove every note stored in this browser?")) {
      write([]);
      render();
    }
  });

  let timer = 0;
  search?.addEventListener("input", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(render, 120);
  });
  statusFilter?.addEventListener("change", render);
  render();
})();
