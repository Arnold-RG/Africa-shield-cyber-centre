(function () {
  const mount = document.querySelector("[data-soc]");
  if (!mount || !window.Shield) return;

  const kevBody = document.querySelector("[data-kev-body]");
  const kevCount = document.querySelector("[data-kev-count]");
  const search = document.querySelector("[data-search]");
  const ransom = document.querySelector("[data-ransom]");
  const figures = document.querySelector("[data-figures]");
  const malware = document.querySelector("[data-malware]");
  const threats = document.querySelector("[data-threats]");
  const recent = document.querySelector("[data-recent]");
  const fetched = document.querySelector("[data-fetched]");
  const pager = document.querySelector("[data-pager]");
  const prev = document.querySelector("[data-prev]");
  const next = document.querySelector("[data-next]");
  const pageSize = 20;
  let page = 0;
  let rows = [];
  let intel = null;

  const n = window.Shield.number;
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));

  function figure(label, value) {
    return `<div class="figure"><b>${n(value)}</b><span>${label}</span></div>`;
  }

  function bars(target, items) {
    if (!target) return;
    const max = Math.max(...items.map((item) => item.count), 1);
    target.innerHTML = items.map((item) => {
      const width = Math.max(2, Math.round((item.count / max) * 100));
      return `<div class="bar-row"><span>${esc(item.name)}</span><div class="bar-track"><span style="--w:${width}%"></span></div><em>${n(item.count)}</em></div>`;
    }).join("");
  }

  function filtered() {
    const q = (search?.value || "").trim().toLowerCase();
    const flag = ransom?.value || "all";
    return rows.filter((row) => {
      if (flag === "yes" && !row.ransomware) return false;
      if (flag === "no" && row.ransomware) return false;
      if (!q) return true;
      return `${row.cve} ${row.vendor} ${row.product} ${row.name}`.toLowerCase().includes(q);
    });
  }

  function draw() {
    const list = filtered();
    const pages = Math.max(1, Math.ceil(list.length / pageSize));
    if (page >= pages) page = pages - 1;
    const slice = list.slice(page * pageSize, page * pageSize + pageSize);
    if (kevCount) kevCount.textContent = `${n(list.length)} entries in view`;
    if (!kevBody) return;
    kevBody.innerHTML = slice.map((row) => `
      <tr>
        <td><a href="https://nvd.nist.gov/vuln/detail/${encodeURIComponent(row.cve)}" rel="noopener noreferrer">${esc(row.cve)}</a><span class="sub">${esc(row.name)}</span></td>
        <td>${esc(row.vendor)}<span class="sub">${esc(row.product)}</span></td>
        <td class="mono">${esc(row.added)}</td>
        <td>${row.ransomware ? "Known" : "—"}</td>
      </tr>`).join("") || `<tr><td colspan="4">Nothing in the catalog matches that search.</td></tr>`;
    if (pager) pager.textContent = `Page ${page + 1} of ${pages}`;
    if (prev) prev.disabled = page === 0;
    if (next) next.disabled = page >= pages - 1;
  }

  function render(data) {
    intel = data;
    const s = data.summary;
    if (fetched) fetched.textContent = `Retrieved ${window.Shield.formatWhen(data.fetched_at)}`;
    if (figures) {
      figures.innerHTML = [
        figure("Known exploited vulnerabilities", s.kev_count),
        figure("Added in the last 30 days", s.kev_added_30d),
        figure("Listed with known ransomware use", s.kev_ransomware),
        figure("IP indicators placed on a country", s.fox_ip_located),
      ].join("");
    }
    bars(malware, data.malware || []);
    bars(threats, data.threats || []);
    rows = data.kev || [];
    page = 0;
    draw();
    const feodo = document.querySelector("[data-feodo]");
    if (feodo) {
      feodo.innerHTML = (data.feodo || []).map((row) => `
        <tr>
          <td class="mono">${esc(row.ip)}${row.port ? ":" + esc(row.port) : ""}</td>
          <td>${esc(row.malware)}</td>
          <td>${esc(row.status)}</td>
          <td>${esc(row.country)}</td>
        </tr>`).join("") || `<tr><td colspan="4">Feodo Tracker returned no rows.</td></tr>`;
    }
    if (recent) {
      recent.innerHTML = (data.recent_indicators || []).slice(0, 8).map((row) => `
        <tr>
          <td><a href="${esc(row.record)}" rel="noopener noreferrer">${esc(row.ip)}${row.port ? ":" + esc(row.port) : ""}</a><span class="sub">${esc(row.malware)}</span></td>
          <td>${esc(row.country_name)}</td>
          <td class="hide-sm mono">${(row.seen || "").slice(0, 16)}</td>
        </tr>`).join("");
    }
  }

  let timer = 0;
  search?.addEventListener("input", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => { page = 0; draw(); }, 120);
  });
  ransom?.addEventListener("change", () => { page = 0; draw(); });
  prev?.addEventListener("click", () => { page -= 1; draw(); });
  next?.addEventListener("click", () => { page += 1; draw(); });
  document.querySelector("[data-reload]")?.addEventListener("click", () => {
    window.Shield.loadIntel(true).then(render).catch(showError);
  });

  function showError(error) {
    if (kevBody) {
      kevBody.innerHTML = `<tr><td colspan="4">${error.message || "The feed did not load."}</td></tr>`;
    }
  }

  window.Shield.loadIntel(false).then(render).catch(showError);
})();
