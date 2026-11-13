export function createMap(container, options) {
  const canvas = document.createElement("canvas");
  container.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  let geojson = null;
  let snapshot = null;
  let filter = { feed: "all", type: "all", country: "all" };
  let selected = null;
  let width = 1;
  let height = 1;

  function resize() {
    const rect = container.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw();
  }

  function project(lon, lat) {
    return [(lon + 180) / 360 * width, (90 - lat) / 180 * height];
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#07141a";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(47, 111, 115, 0.85)";
    ctx.lineWidth = 1;
    for (const feature of geojson?.features || []) {
      for (const ring of rings(feature.geometry)) {
        ctx.beginPath();
        let open = false;
        for (let i = 0; i < ring.length; i += 1) {
          const point = ring[i];
          if (i > 0 && Math.abs(point[0] - ring[i - 1][0]) > 180) {
            open = false;
            continue;
          }
          const [x, y] = project(point[0], point[1]);
          if (!open) {
            ctx.moveTo(x, y);
            open = true;
          } else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    for (const country of snapshot?.countries || []) {
      if (!passes(country, filter)) continue;
      const [x, y] = project(country.lon, country.lat);
      const hosts = hostValue(country, filter);
      const beams = beamValue(country, filter);
      const dim = selected && selected !== country.code;
      if (beams > 0) {
        const radius = 3 + Math.min(16, Math.log10(beams + 1) * 2.4);
        ctx.beginPath();
        ctx.fillStyle = dim ? "rgba(224, 164, 90, 0.25)" : "rgba(224, 164, 90, 0.9)";
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      if (hosts > 0) {
        ctx.beginPath();
        ctx.fillStyle = dim ? "rgba(125, 206, 196, 0.25)" : "#7dcec4";
        ctx.arc(x, y, 4 + Math.min(8, Math.log10(hosts + 1) * 2), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (snapshot?.simulated) {
      ctx.strokeStyle = "#d46a55";
      for (const arc of snapshot.arcs || []) {
        const from = (snapshot.countries || []).find((country) => country.code === arc.source_country);
        const to = (snapshot.countries || []).find((country) => country.code === arc.target_country);
        if (!from || !to) continue;
        const [x1, y1] = project(from.lon, from.lat);
        const [x2, y2] = project(to.lon, to.lat);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo((x1 + x2) / 2, Math.min(y1, y2) - 30, x2, y2);
        ctx.stroke();
      }
    }
  }

  canvas.addEventListener("click", (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    let best = null;
    let bestDistance = 22;
    for (const country of snapshot?.countries || []) {
      if (!passes(country, filter)) continue;
      const [cx, cy] = project(country.lon, country.lat);
      const distance = Math.hypot(cx - x, cy - y);
      if (distance < bestDistance) {
        best = country;
        bestDistance = distance;
      }
    }
    if (best) options.onPick(best.code);
  });

  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  return {
    setCountries(next) { geojson = next; draw(); },
    setSnapshot(next, nextFilter) { snapshot = next; filter = nextFilter || filter; draw(); },
    setFilter(next) { filter = next; draw(); },
    select(code) { selected = code; draw(); },
    resize,
    destroy() { observer.disconnect(); canvas.remove(); },
  };
}

function passes(country, filter) {
  if (filter.country !== "all" && country.code !== filter.country) return false;
  if (filter.type !== "all" && !(country.types || []).includes(filter.type)) return false;
  if (filter.feed !== "all" && !country.by_feed?.[filter.feed]) return false;
  return beamValue(country, filter) > 0 || hostValue(country, filter) > 0;
}

function beamValue(country, filter) {
  if (filter.type !== "all" && filter.type !== "sensor-source") return 0;
  if (filter.feed !== "all" && filter.feed !== "dshield") return 0;
  return country.source_addresses || 0;
}

function hostValue(country, filter) {
  if (filter.feed === "dshield" || filter.type === "sensor-source") return 0;
  if (filter.feed !== "all") return country.by_feed?.[filter.feed]?.observations || 0;
  return country.host_observations || 0;
}

function rings(geometry) {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return geometry.coordinates || [];
  if (geometry.type === "MultiPolygon") return (geometry.coordinates || []).flat();
  return [];
}
