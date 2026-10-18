import { createGlobe } from "./globe.js";
import { createMap } from "./map2d.js";

const TYPE_HELP = {
  malware_download: "URLhaus label for a malware URL.",
  botnet_cc: "ThreatFox label for a botnet command-and-control indicator.",
  payload: "ThreatFox label for a payload indicator.",
  payload_delivery: "ThreatFox label for a delivery indicator.",
  "sensor-source": "DShield source address reported to SANS sensors.",
  "drop-listing": "Network listed by Spamhaus DROP or EDROP.",
  simulated: "Demo filler. Not a reported threat.",
};

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const light = window.matchMedia("(max-width: 860px)").matches;
const params = new URLSearchParams(location.search);
const force2d = params.get("view") === "2d";
const forceDemo = params.get("demo") === "1";

const els = {
  title: document.querySelector("#title"),
  label: document.querySelector("#label"),
  cacheNote: document.querySelector("#cache-note"),
  banner: document.querySelector("#banner"),
  feeds: document.querySelector("#feeds"),
  events: document.querySelector("#events"),
  sample: document.querySelector("#sample-note"),
  counters: document.querySelector("#counters"),
  sources: document.querySelector("#sources"),
  targets: document.querySelector("#targets"),
  targetsNote: document.querySelector("#targets-note"),
  types: document.querySelector("#types"),
  kev: document.querySelector("#kev"),
  chart: document.querySelector("#chart"),
  chartTitle: document.querySelector("#chart-title"),
  timelineNote: document.querySelector("#timeline-note"),
  detail: document.querySelector("#detail"),
  legend: document.querySelector("#legend"),
  viewNote: document.querySelector("#view-note"),
  credit: document.querySelector("#credit"),
  licences: document.querySelector("#licences"),
  stage: document.querySelector("#stage"),
  toggle: document.querySelector("#view-toggle"),
  feed: document.querySelector("#filter-feed"),
  type: document.querySelector("#filter-type"),
  country: document.querySelector("#filter-country"),
};

const number = new Intl.NumberFormat("en-US");
let data = null;
let view = null;
let mode = "3d";
let filter = { feed: "all", type: "all", country: "all" };
let countriesGeo = null;

boot().catch((error) => {
  els.label.textContent = "The cache could not be read.";
  els.cacheNote.textContent = error.message;
});

async function boot() {
  data = await loadData();
  try {
    countriesGeo = await fetch("vendor/countries.json").then((response) => response.json());
  } catch (error) {
    countriesGeo = null;
  }
  renderFrame();
  fillFilters();
  renderLists();
  renderChart();
  els.feed.addEventListener("change", () => { filter.feed = els.feed.value; refresh(); });
  els.type.addEventListener("change", () => { filter.type = els.type.value; refresh(); });
  els.country.addEventListener("change", () => { filter.country = els.country.value; refresh(); });
  els.toggle.addEventListener("click", () => {
    mode = mode === "3d" ? "2d" : "3d";
    mount();
  });
  mount();
}

async function loadData() {
  if (!forceDemo) {
    try {
      const response = await fetch("data/snapshot.json");
      if (response.ok) {
        const payload = await response.json();
        const useful = (payload.countries || []).length || (payload.events || []).length || (payload.kev || []).length;
        if (payload && payload.simulated === false && useful) return payload;
      }
    } catch (error) {
      /* fall through to the labeled demo */
    }
  }
  const response = await fetch("data/demo.json");
  if (!response.ok) throw new Error("No cache and no demo file.");
  return response.json();
}

function renderFrame() {
  els.title.textContent = data.simulated ? "Simulated demo" : "SOC dashboard";
  els.label.textContent = data.label;
  els.cacheNote.textContent = data.simulated
    ? data.cache_note
    : `${data.cache_note} Cache built ${stamp(data.generated_at)}.`;
  els.banner.hidden = !data.banner;
  els.banner.textContent = data.banner || "";
  els.sample.textContent = data.sample_note || "";
  els.targetsNote.textContent = data.top_targets_note || "";
  els.legend.replaceChildren(
    legendRow("beam", "Amber beam: DShield source addresses in that country."),
    legendRow("dot", "Cyan mark: listed infrastructure addresses, not victims.")
  );
  els.viewNote.textContent = data.simulated
    ? "Satellites and red arcs are simulated demo filler."
    : data.arcs_note;
  els.credit.textContent = `Africa Shield SOC. Arnold Rurangwa. ${data.geoip?.attribution || ""}`;
  els.licences.replaceChildren();
  for (const feed of data.feeds || []) {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = feed.licence_url;
    link.rel = "noopener noreferrer";
    link.target = "_blank";
    link.textContent = feed.name;
    item.append(link, ` — ${feed.licence}`);
    els.licences.append(item);
  }
}

function legendRow(kind, text) {
  const p = document.createElement("p");
  const swatch = document.createElement("span");
  swatch.className = `swatch ${kind}`;
  p.append(swatch, document.createTextNode(text));
  return p;
}

function fillFilters() {
  for (const feed of data.feeds || []) {
    if (feed.id === "kev") continue;
    els.feed.append(option(feed.id, feed.name));
  }
  for (const type of data.types || []) els.type.append(option(type.type, type.type));
  const countries = [...(data.countries || [])].sort((a, b) => a.name.localeCompare(b.name));
  for (const country of countries) els.country.append(option(country.code, country.name));
}

function renderLists() {
  els.feeds.replaceChildren();
  for (const feed of data.feeds || []) {
    const item = document.createElement("li");
    const name = document.createElement("div");
    name.className = "feed-name";
    name.textContent = feed.name;
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = feed.ok
      ? `${number.format(feed.parsed_count)} parsed · source time ${stamp(feed.last_updated)}`
      : `Not loaded. ${feed.error || "No error text."}`;
    if (!feed.ok) meta.classList.add("bad");
    const note = document.createElement("p");
    note.className = "note";
    note.textContent = feed.role_note;
    item.append(name, meta, note);
    els.feeds.append(item);
  }

  const events = (data.events || []).filter((event) => matchEvent(event, filter));
  els.events.replaceChildren();
  if (!events.length) {
    const item = document.createElement("li");
    item.textContent = "No listed rows match these filters.";
    els.events.append(item);
  }
  for (const event of events) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.append(document.createTextNode(event.title));
    const meta = document.createElement("small");
    meta.textContent = `${event.feed} · ${event.threat_type} · ${event.country || "no country"} · ${stamp(event.observed_at)}`;
    button.append(meta);
    button.addEventListener("click", () => showEvent(event));
    item.append(button);
    els.events.append(item);
  }

  renderRank(els.sources, data.top_sources || [], "source addresses");
  renderRank(els.targets, data.top_targets || [], "target rows");
  els.types.replaceChildren();
  for (const type of data.types || []) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${type.type} · ${number.format(type.count)}`;
    button.addEventListener("click", () => {
      els.type.value = type.type;
      filter.type = type.type;
      refresh();
    });
    const help = document.createElement("p");
    help.className = "note";
    help.textContent = TYPE_HELP[type.type] || "Name published by the feed.";
    item.append(button, help);
    els.types.append(item);
  }
  const tiles = [
    ["Malware URLs", data.totals.urlhaus, "URLhaus rows in this cache"],
    ["ThreatFox IOCs", data.totals.threatfox, "indicators in this cache"],
    ["Botnet C2s", data.totals.feodo, "Feodo addresses in this cache"],
    ["DROP networks", data.totals.spamhaus, "Spamhaus networks in this cache"],
    ["Source addresses", data.totals.dshield_source_addresses, "DShield sources, summed by country"],
    ["Exploited vulns", data.totals.kev, "CISA catalog entries"],
  ];
  els.counters.replaceChildren();
  for (const [label, value, caption] of tiles) {
    const tile = document.createElement("div");
    tile.className = "counter";
    const strong = document.createElement("b");
    const span = document.createElement("span");
    span.textContent = `${label}. ${caption}`;
    tile.append(strong, span);
    els.counters.append(tile);
    animate(strong, value || 0);
  }
  els.kev.replaceChildren();
  for (const vuln of data.kev || []) {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = vuln.reference;
    link.rel = "noopener noreferrer";
    link.target = "_blank";
    link.textContent = vuln.cve;
    item.append(link, document.createTextNode(` · ${vuln.vendor} ${vuln.product}`));
    const note = document.createElement("p");
    note.className = "note";
    note.textContent = `${vuln.name} Added ${vuln.date_added}. ${vuln.summary}`;
    item.append(note);
    els.kev.append(item);
  }
}

function renderRank(list, rows, metric) {
  list.replaceChildren();
  if (!rows.length) {
    const item = document.createElement("li");
    item.className = "note";
    item.textContent = "None in this cache.";
    list.append(item);
    return;
  }
  for (const row of rows) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${row.name} · ${number.format(row.value)} ${metric}`;
    button.addEventListener("click", () => showCountry(row.code));
    item.append(button);
    list.append(item);
  }
}

function renderChart() {
  const usingList = filter.country !== "all" || (filter.feed !== "all" && filter.type !== "all");
  const buckets = usingList ? bucketsFromEvents() : chosenBuckets();
  const max = Math.max(1, ...buckets);
  const width = 720;
  const height = 140;
  const gap = 6;
  const barWidth = (width - gap * 25) / 24;
  els.chart.setAttribute("viewBox", `0 0 ${width} ${height}`);
  els.chart.replaceChildren();
  buckets.forEach((count, index) => {
    const barHeight = Math.max(2, (count / max) * 96);
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("class", count ? "bar" : "bar-dim");
    rect.setAttribute("x", String(index * (barWidth + gap)));
    rect.setAttribute("y", String(110 - barHeight));
    rect.setAttribute("width", String(barWidth));
    rect.setAttribute("height", String(barHeight));
    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = `${count} timestamps, ${23 - index}h before the cache`;
    rect.append(title);
    els.chart.append(rect);
  });
  const base = usingList
    ? "This filtered chart counts only the listed rows, which are capped."
    : (data.timeline?.note || "");
  els.timelineNote.textContent = base;
  els.chartTitle.textContent = `24 bars of feed timestamps. Highest bar is ${max}. ${base}`;
}

function chosenBuckets() {
  if (filter.feed !== "all") return data.timeline?.by_feed?.[filter.feed] || Array(24).fill(0);
  if (filter.type !== "all") return data.timeline?.by_type?.[filter.type] || Array(24).fill(0);
  return data.timeline?.buckets || Array(24).fill(0);
}

function bucketsFromEvents() {
  const end = Date.parse(data.timeline?.end || data.generated_at);
  const buckets = Array(24).fill(0);
  for (const event of data.events || []) {
    if (!matchEvent(event, filter) || !event.observed_at) continue;
    const delta = (end - Date.parse(event.observed_at)) / 1000;
    if (Number.isNaN(delta) || delta < 0 || delta >= 86400) continue;
    buckets[23 - Math.floor(delta / 3600)] += 1;
  }
  return buckets;
}

function mount() {
  if (view) view.destroy();
  els.toggle.setAttribute("aria-pressed", mode === "2d" ? "true" : "false");
  els.toggle.textContent = mode === "2d" ? "3D globe" : "2D map";
  const webgl = !force2d && mode === "3d" && hasWebGL();
  try {
    if (!webgl) throw new Error("2d");
    mode = "3d";
    view = createGlobe(els.stage, { motion: !reduced, light, onPick: showCountry });
  } catch (error) {
    mode = "2d";
    els.toggle.setAttribute("aria-pressed", "true");
    view = createMap(els.stage, { onPick: showCountry });
    els.viewNote.textContent = `${data.simulated ? "Simulated demo. " : ""}2D fallback. ${data.arcs_note || ""}`;
  }
  if (countriesGeo) view.setCountries(countriesGeo);
  view.setSnapshot(data, filter);
}

function refresh() {
  renderLists();
  renderChart();
  view.setFilter(filter);
  if (filter.country !== "all") showCountry(filter.country, false);
}

function showCountry(code, setSelect = true) {
  const country = (data.countries || []).find((item) => item.code === code);
  if (!country) return;
  if (setSelect) {
    els.country.value = code;
    filter.country = code;
    view.setFilter(filter);
    renderLists();
    renderChart();
  }
  view.select(code);
  const rows = (data.events || []).filter((event) => event.country === code).slice(0, 6);
  const block = document.createElement("div");
  const heading = document.createElement("h3");
  heading.textContent = `${country.name} (${country.code})`;
  const body = document.createElement("p");
  body.textContent = [
    `DShield source addresses: ${number.format(country.source_addresses)}.`,
    `DShield source reports: ${number.format(country.source_reports)}.`,
    country.persistence_days == null ? "" : `SANS average days between first and last source report: ${country.persistence_days}. That is not a dwell-time measurement.`,
    `Listed infrastructure addresses: ${number.format(country.host_observations)}.`,
    "The mark sits on the Natural Earth label point for the country, not a street.",
  ].filter(Boolean).join(" ");
  block.append(heading, body);
  for (const event of rows) block.append(eventParagraph(event));
  els.detail.replaceChildren(block);
}

function showEvent(event) {
  if (event.country) view.select(event.country);
  const block = document.createElement("div");
  const heading = document.createElement("h3");
  heading.textContent = event.title;
  block.append(heading, eventParagraph(event));
  if (event.simulated) {
    const note = document.createElement("p");
    note.className = "note";
    note.textContent = "Simulated demo row. Not a reported attack.";
    block.append(note);
  }
  els.detail.replaceChildren(block);
}

function eventParagraph(event) {
  const p = document.createElement("p");
  p.textContent = `${event.summary} Type: ${event.threat_type}. Time: ${stamp(event.observed_at)}. Country: ${event.country || "none"}.`;
  if (event.reference) {
    const link = document.createElement("a");
    link.href = event.reference;
    link.rel = "noopener noreferrer";
    link.target = "_blank";
    link.textContent = " Source";
    p.append(link);
  }
  return p;
}

function matchEvent(event, current) {
  if (current.feed !== "all" && event.feed !== current.feed) return false;
  if (current.type !== "all" && event.threat_type !== current.type) return false;
  if (current.country !== "all" && event.country !== current.country && event.source_country !== current.country) return false;
  return true;
}

function option(value, label) {
  const node = document.createElement("option");
  node.value = value;
  node.textContent = label;
  return node;
}

function stamp(value) {
  if (!value) return "not stamped";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toISOString().replace(".000Z", " UTC").replace("T", " ").replace("Z", " UTC");
}

function animate(node, target) {
  if (reduced) {
    node.textContent = number.format(target);
    return;
  }
  const start = performance.now();
  function step(now) {
    const t = Math.min(1, (now - start) / 700);
    node.textContent = number.format(Math.round(target * (1 - Math.pow(1 - t, 3))));
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch (error) {
    return false;
  }
}
