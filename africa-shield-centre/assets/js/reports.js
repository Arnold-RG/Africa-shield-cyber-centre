(function () {
  const form = document.querySelector("[data-report]");
  if (!form) return;

  const LEGACY_KEY = "shield-reports-v1";
  const DB_NAME = "africa-shield-notes";
  const STORE = "reports";
  const list = document.querySelector("[data-report-list]");
  const search = document.querySelector("[data-search]");
  const statusFilter = document.querySelector("[data-status]");
  const note = document.querySelector("[data-report-note]");
  const empty = document.querySelector("[data-report-empty]");

  const esc = (window.ArnovaSecure && window.ArnovaSecure.escapeHtml)
    ? window.ArnovaSecure.escapeHtml
    : function (value) {
        return String(value || "").replace(/[&<>"']/g, function (ch) {
          return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
        });
      };

  let cache = [];
  let db = null;

  function legacyRead() {
    try { return JSON.parse(localStorage.getItem(LEGACY_KEY) || "[]"); }
    catch (e) { return []; }
  }

  async function openStore() {
    if (!(window.ArnovaSecure && window.ArnovaSecure.openDb)) {
      cache = legacyRead();
      return null;
    }
    db = await window.ArnovaSecure.openDb(DB_NAME, 1, function (database) {
      if (!database.objectStoreNames.contains(STORE)) {
        database.createObjectStore(STORE, { keyPath: "ref" });
      }
    });
    const existing = await window.ArnovaSecure.idbGetAll(db, STORE);
    const legacy = legacyRead();
    if ((!existing || !existing.length) && legacy.length) {
      for (let i = 0; i < legacy.length; i += 1) {
        await window.ArnovaSecure.idbPut(db, STORE, legacy[i]);
      }
      try { localStorage.removeItem(LEGACY_KEY); } catch (e) { /* ignore */ }
      cache = legacy.slice();
    } else {
      cache = existing || [];
    }
    cache.sort(function (a, b) {
      return String(b.filed || "").localeCompare(String(a.filed || ""));
    });
    return db;
  }

  async function persistAll(rows) {
    cache = rows.slice();
    if (!db || !window.ArnovaSecure) {
      try { localStorage.setItem(LEGACY_KEY, JSON.stringify(cache)); } catch (e) { /* ignore */ }
      return;
    }
    const tx = db.transaction(STORE, "readwrite");
    const os = tx.objectStore(STORE);
    os.clear();
    rows.forEach(function (row) { os.put(row); });
    await new Promise(function (resolve, reject) {
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
    });
  }

  function ref() {
    const now = new Date();
    const stamp = now.toISOString().slice(0, 10).replace(/-/g, "");
    const salt = Math.random().toString(36).slice(2, 6).toUpperCase();
    return "AS-" + stamp + "-" + salt;
  }

  function render() {
    const q = (search && search.value ? search.value : "").trim().toLowerCase();
    const status = (statusFilter && statusFilter.value) || "all";
    const rows = cache.filter(function (row) {
      if (status !== "all" && row.status !== status) return false;
      if (!q) return true;
      return (row.ref + " " + row.title + " " + row.category + " " + row.country + " " + row.detail)
        .toLowerCase()
        .includes(q);
    });
    if (empty) empty.classList.toggle("hidden", rows.length !== 0);
    if (!list) return;
    list.innerHTML = rows.map(function (row) {
      return (
        '<article class="job" data-ref="' + esc(row.ref) + '">' +
          "<div>" +
            '<p class="kicker">' + esc(row.ref) + "</p>" +
            "<h3>" + esc(row.title) + "</h3>" +
            '<p class="muted" style="margin-top:0.45rem">' + esc(row.category) + " · " + esc(row.country) + "</p>" +
            '<p style="margin-top:0.7rem">' + esc(row.detail) + "</p>" +
          "</div>" +
          "<div>" +
            "<label>Status" +
              '<select data-set-status="' + esc(row.ref) + '">' +
                ["filed", "watching", "closed"].map(function (item) {
                  return '<option' + (item === row.status ? " selected" : "") + ">" + item + "</option>";
                }).join("") +
              "</select>" +
            "</label>" +
            '<p class="muted" style="margin-top:0.8rem">Filed ' + esc(String(row.filed || "").slice(0, 10)) + " · kept on this device</p>" +
            '<button class="text-btn" type="button" data-delete="' + esc(row.ref) + '" style="margin-top:0.6rem;letter-spacing:0.12em;text-transform:uppercase;font-size:0.72rem">Remove</button>' +
          "</div>" +
        "</article>"
      );
    }).join("");

    list.querySelectorAll("[data-set-status]").forEach(function (select) {
      select.addEventListener("change", function () {
        const row = cache.find(function (item) {
          return item.ref === select.getAttribute("data-set-status");
        });
        if (row) {
          row.status = select.value;
          persistAll(cache).then(function () { /* ok */ });
        }
      });
    });
    list.querySelectorAll("[data-delete]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        persistAll(cache.filter(function (item) {
          return item.ref !== btn.getAttribute("data-delete");
        })).then(render);
      });
    });
  }

  form.addEventListener("submit", function (event) {
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
      title: title,
      detail: detail,
      category: category,
      country: country,
      when: String(data.get("when") || ""),
      contact: String(data.get("contact") || "").trim(),
      status: "filed",
      filed: new Date().toISOString(),
    };
    const next = cache.slice();
    next.unshift(row);
    persistAll(next).then(function () {
      form.reset();
      if (note) note.textContent = row.ref + " is stored in this browser (IndexedDB). It was not uploaded.";
      render();
    });
  });

  document.querySelector("[data-export]")?.addEventListener("click", function () {
    const blob = new Blob([JSON.stringify(cache, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "africa-shield-notes.json";
    link.click();
    URL.revokeObjectURL(url);
  });

  document.querySelector("[data-clear]")?.addEventListener("click", function () {
    if (!cache.length) return;
    if (window.confirm("Remove every note stored in this browser?")) {
      persistAll([]).then(render);
    }
  });

  let timer = 0;
  search?.addEventListener("input", function () {
    window.clearTimeout(timer);
    timer = window.setTimeout(render, 120);
  });
  statusFilter?.addEventListener("change", render);

  openStore().then(render).catch(function () {
    cache = legacyRead();
    render();
  });
})();
