(function () {
  const canvas = document.getElementById("map");
  if (!canvas || !window.Shield || typeof L === "undefined") return;

  const list = document.querySelector("[data-country-list]");
  const search = document.querySelector("[data-search]");
  const family = document.querySelector("[data-family]");
  const region = document.querySelector("[data-region]");
  const detail = document.querySelector("[data-detail]");
  const fetched = document.querySelector("[data-fetched]");
  const countNote = document.querySelector("[data-map-count]");
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));

  const tiles = {
    day: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    evening: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  };

  const map = L.map(canvas, {
    center: [2.2, 22],
    zoom: 3,
    minZoom: 2,
    worldCopyJump: true,
    scrollWheelZoom: true,
  });

  let layer = L.tileLayer(tiles.day, {
    attribution: "&copy; OpenStreetMap &copy; CARTO",
    subdomains: "abcd",
    maxZoom: 18,
  }).addTo(map);

  document.addEventListener("shield-theme", () => {
    const evening = document.documentElement.getAttribute("data-theme") === "evening";
    map.removeLayer(layer);
    layer = L.tileLayer(evening ? tiles.evening : tiles.day, {
      attribution: "&copy; OpenStreetMap &copy; CARTO",
      subdomains: "abcd",
      maxZoom: 18,
    }).addTo(map);
  });
  if (document.documentElement.getAttribute("data-theme") === "evening") {
    document.dispatchEvent(new CustomEvent("shield-theme"));
  }

  const markers = L.layerGroup().addTo(map);
  let countries = [];
  let active = null;

  function size(count, max) {
    const ratio = Math.sqrt(count) / Math.sqrt(max || 1);
    return Math.round(12 + ratio * 28);
  }

  function visible() {
    const q = (search?.value || "").trim().toLowerCase();
    const fam = family?.value || "all";
    const east = region?.value === "east";
    return countries.filter((row) => {
      if (east && !row.east_africa) return false;
      const names = row.families || (row.malware || []).map((item) => item.name);
      if (fam !== "all" && !names.includes(fam)) return false;
      if (!q) return true;
      return `${row.name} ${row.code}`.toLowerCase().includes(q);
    });
  }

  function open(row) {
    active = row.code;
    const families = (row.malware || []).map((item) => `${item.name} ${item.count}`).join(" · ");
    if (detail) {
      detail.innerHTML = `<p class="kicker">${esc(row.code)}</p><h2>${esc(row.name)}</h2><p class="lede" style="margin-top:0.8rem">${window.Shield.number(row.count)} public IP indicators in this snapshot.</p><p class="note" style="margin-top:1rem">${esc(families) || "No family breakdown."}</p><p class="muted" style="margin-top:1rem">The mark sits on the country centroid. It is the registry country of the address block, not a street, a victim, or an attack path.</p>`;
    }
    map.flyTo([row.lat, row.lon], Math.max(map.getZoom(), 4), { duration: motion ? 0 : 0.8 });
    draw();
  }

  function draw() {
    const rows = visible();
    const max = Math.max(...rows.map((row) => row.count), 1);
    markers.clearLayers();
    const top = rows[0]?.code;
    rows.forEach((row) => {
      const d = size(row.count, max);
      const icon = L.divIcon({
        className: "pin-wrap",
        html: `<span class="pin${row.code === top ? " live" : ""}"></span>`,
        iconSize: [d, d],
        iconAnchor: [d / 2, d / 2],
      });
      const marker = L.marker([row.lat, row.lon], { icon, keyboard: true, title: row.name });
      marker.bindPopup(`<strong>${esc(row.name)}</strong><br>${window.Shield.number(row.count)} indicators`);
      marker.on("click", () => open(row));
      markers.addLayer(marker);
    });
    if (list) {
      list.innerHTML = rows.map((row) => `
        <li><button type="button" data-code="${row.code}" ${active === row.code ? 'aria-current="true"' : ""}>
          <span>${esc(row.name)}<span class="sub">${esc((row.malware[0] || {}).name || "")}</span></span>
          <span class="mono">${window.Shield.number(row.count)}</span>
        </button></li>`).join("") || `<li class="empty">No country in this filter.</li>`;
      list.querySelectorAll("button").forEach((btn) => {
        btn.addEventListener("click", () => {
          const row = countries.find((item) => item.code === btn.getAttribute("data-code"));
          if (row) open(row);
        });
      });
    }
    if (countNote) countNote.textContent = `${rows.length} countries on the map`;
  }

  function fillFamilies(data) {
    if (!family) return;
    const names = (data.malware || []).map((item) => item.name);
    family.innerHTML = `<option value="all">All families</option>` + names.map((name) => `<option value="${esc(name)}">${esc(name)}</option>`).join("");
  }

  let timer = 0;
  search?.addEventListener("input", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(draw, 120);
  });
  family?.addEventListener("change", draw);
  region?.addEventListener("change", () => {
    if (region.value === "east") {
      map.flyTo([2, 34], 4, { duration: motion ? 0 : 0.8 });
    } else {
      map.flyTo([2.2, 22], 3, { duration: motion ? 0 : 0.8 });
    }
    draw();
  });

  window.Shield.loadIntel(false).then((data) => {
    countries = data.countries || [];
    if (fetched) fetched.textContent = `Retrieved ${window.Shield.formatWhen(data.fetched_at)}`;
    fillFamilies(data);
    draw();
    window.setTimeout(() => map.invalidateSize(), 200);
  }).catch((error) => {
    if (detail) detail.textContent = error.message || "The feed did not load.";
  });

  window.addEventListener("resize", () => map.invalidateSize());
})();
