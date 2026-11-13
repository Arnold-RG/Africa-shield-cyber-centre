import { createGlobe } from "./globe.js";
import { createMap } from "./map2d.js";

const TYPE_HELP = {
  malware_download: "URLhaus label for a malware URL.",
  botnet_cc: "ThreatFox label for a botnet command-and-control indicator.",
  payload: "ThreatFox label for a payload indicator.",
  payload_delivery: "ThreatFox label for a delivery indicator.",
  "sensor-source": "DShield source address reported to SANS sensors.",
  "drop-listing": "Network listed by Spamhaus DROP or EDROP.",
  "ssl-blacklist": "Address listed by abuse.ch SSLBL.",
  "asn-drop": "Autonomous system listed by Spamhaus ASN-DROP.",
  phishing: "Phishing URL published by the OpenPhish community feed.",
  simulated: "Demo filler. Not a reported threat.",
};

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const light = window.matchMedia("(max-width: 860px)").matches;
const params = new URLSearchParams(location.search);
const force2d = params.get("view") === "2d";
const forceDemo = params.get("demo") === "1";
const PAGE_SIZE = 15;

const els = {
  title: document.querySelector("#title"),
  label: document.querySelector("#label"),
  cacheNote: document.querySelector("#cache-note"),
  fetched: document.querySelector("#fetched"),
  health: document.querySelector("#health"),
  banner: document.querySelector("#banner"),
  kpis: document.querySelector("#kpis"),
  feeds: document.querySelector("#feeds"),
  events: document.querySelector("#events"),
  sample: document.querySelector("#sample-note"),
  severityNote: document.querySelector("#severity-note"),
  pager: document.querySelector("#table-page"),
  counters: document.querySelector("#counters"),
  sources: document.querySelector("#sources"),
  targets: document.querySelector("#targets"),
  targetsNote: document.querySelector("#targets-note"),
  asns: document.querySelector("#asns"),
  families: document.querySelector("#families"),
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
  report: document.querySelector("#report"),
  stage: document.querySelector("#stage"),
  toggle: document.querySelector("#view-toggle"),
  feed: document.querySelector("#filter-feed"),
  type: document.querySelector("#filter-type"),
  country: document.querySelector("#filter-country"),
  severity: document.querySelector("#filter-severity"),
  family: document.querySelector("#filter-family"),
  search: document.querySelector("#filter-search"),
};

const number = new Intl.NumberFormat("en-US");
let data = null;
let report = null;
let view = null;
let mode = "3d";
let filter = { feed: "all", type: "all", country: "all", severity: "all", family: "all", query: "" };
let countriesGeo = null;
let page = 0;
let selectedEvent = null;

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
  report = await loadReport();
  renderFrame();
  fillFilters();
  renderLists();
  renderChart();
  renderReport();
  renderTable();
  els.feed.addEventListener("change", () => { filter.feed = els.feed.value; page = 0; refresh(); });
  els.type.addEventListener("change", () => { filter.type = els.type.value; page = 0; refresh(); });
  els.country.addEventListener("change", () => { filter.country = els.country.value; page = 0; refresh(); });
  els.severity.addEventListener("change", () => { filter.severity = els.severity.value; page = 0; refresh(); });
  els.family.addEventListener("change", () => { filter.family = els.family.value; page = 0; refresh(); });
  els.search.addEventListener("input", () => { filter.query = els.search.value.trim(); page = 0; refresh(); });
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
        if (useful) return payload;
      }
    } catch (error) {
      // Fall through to the labeled demo.
    }
  }
  const response = await fetch("data/demo.json");
  if (!response.ok) throw new Error("Neither the cache nor the demo file could be read.");
  return response.json();
}

async function loadReport() {
  try {
    const response = await fetch("data/reports/latest.json");
    if (response.ok) return response.json();
  } catch (error) {
    return null;
  }
  return null;
}

function renderFrame() {
  els.label.textContent = data.label || "Cached public-feed snapshot";
  els.cacheNote.textContent = data.cache_note || "";
  const fetchedTimes = (data.feeds || []).map((feed) => feed.fetched_at).filter(Boolean);
  const fetched = data.generated_at || fetchedTimes[0];
  els.fetched.textContent = fetched ? `Cache built ${stamp(fetched)}` : "";
  if (data.simulated && data.banner) {
    els.banner.hidden = false;
    els.banner.textContent = data.banner;
  } else {
    els.banner.hidden = true;
    els.banner.textContent = "";
  }
  els.health.replaceChildren();
  for (const feed of data.feeds || []) {
    const pill = document.createElement("span");
    pill.className = "pill " + (feed.ok ? "ok" : "fail");
    const dot = document.createElement("i");
    dot.setAttribute("aria-hidden", "true");
    pill.append(dot, document.createTextNode(feed.id));
    pill.title = feed.ok
      ? `${feed.name}: ${number.format(feed.parsed_count)} parsed, fetched ${stamp(feed.fetched_at)}`
      : `${feed.name} failed: ${feed.error || "no data"}`;
    els.health.append(pill);
  }
  renderKpis();
  els.legend.replaceChildren();
  els.legend.append(legendRow("beam", "Amber: DShield source addresses in that country (about 30 days of sensor reports). Not a victim country."));
  els.legend.append(legendRow("dot", "Cyan: listed infrastructure (malware URLs, C2, SSLBL, DROP). Country locator, not a street."));
  els.viewNote.textContent = data.arcs_note || data.top_targets_note || "";
  const geo = data.geoip || {};
  const credits = [];
  if (geo.attribution) credits.push(geo.attribution + (geo.licence ? ` (${geo.licence})` : ""));
  credits.push("Country outlines: Natural Earth, public domain. 3D renderer: Three.js, MIT.");
  els.credit.textContent = credits.join(" ");
  els.licences.replaceChildren();
  for (const feed of data.feeds || []) {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = feed.licence_url || feed.homepage;
    link.rel = "noopener noreferrer";
    link.target = "_blank";
    link.textContent = feed.name;
    item.append(link, document.createTextNode(` — ${feed.licence}`));
    els.licences.append(item);
  }
}

function renderKpis() {
  const totals = data.totals || {};
  const high = (data.severities || []).filter((row) => row.severity === "high" || row.severity === "critical");
  const highCount = high.reduce((sum, row) => sum + (row.count || 0), 0);
  const items = [
    [totals.feeds_ok, `${totals.feeds_ok || 0} / ${totals.feeds_total || (data.feeds || []).length}`, "Feeds that returned data", false],
    [indicatorTotal(totals), number.format(indicatorTotal(totals)), "Indicators in the full parse", false],
    [totals.dshield_source_addresses, number.format(totals.dshield_source_addresses || 0), "DShield source addresses, ~30 days", false],
    [totals.countries, number.format(totals.countries || 0), "Countries on the map", false],
    [totals.kev, number.format(totals.kev || 0), "CISA KEV catalog entries", false],
    [highCount, number.format(highCount), "High or critical triage labels", true],
  ];
  els.kpis.replaceChildren();
  for (const [raw, value, label, alert] of items) {
    const node = document.createElement("div");
    node.className = "kpi" + (alert ? " alert" : "");
    const bold = document.createElement("b");
    const span = document.createElement("span");
    span.textContent = label;
    node.append(bold, span);
    els.kpis.append(node);
    animate(bold, typeof raw === "number" ? raw : 0, value);
  }
}

function indicatorTotal(totals) {
  return ["urlhaus", "threatfox", "feodo", "spamhaus", "sslbl", "openphish"].reduce((sum, key) => sum + (totals[key] || 0), 0);
}

function legendRow(kind, text) {
  const row = document.createElement("div");
  const swatch = document.createElement("span");
  swatch.className = "swatch " + kind;
  swatch.setAttribute("aria-hidden", "true");
  row.append(swatch, document.createTextNode(text));
  return row;
}

function fillFilters() {
  const feeds = data.feeds || [];
  for (const feed of feeds) els.feed.append(option(feed.id, feed.name));
  const types = new Set((data.types || []).map((row) => row.type));
  for (const event of data.events || []) if (event.threat_type) types.add(event.threat_type);
  for (const type of [...types].sort()) els.type.append(option(type, type));
  for (const country of data.countries || []) els.country.append(option(country.code, `${country.name} (${country.code})`));
  for (const level of ["critical", "high", "medium", "low", "info"]) els.severity.append(option(level, level));
  for (const family of data.malware_families || []) els.family.append(option(family.family, `${family.family} (${number.format(family.count)})`));
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
    const state = feed.ok ? "ok" : "failed";
    meta.innerHTML = "";
    const status = document.createElement("span");
    status.className = feed.ok ? "ok-text" : "bad";
    status.textContent = state;
    meta.append(
      status,
      document.createTextNode(
        ` · ${number.format(feed.parsed_count || 0)} parsed · fetched ${stamp(feed.fetched_at)}` +
        (feed.last_updated ? ` · upstream ${stamp(feed.last_updated)}` : "")
      )
    );
    const note = document.createElement("p");
    note.className = "note";
    const text = feed.error ? feed.error : feed.role_note;
    note.textContent = text;
    if (text && text.length > 220) {
      note.textContent = text.slice(0, 217).replace(/\s+\S*$/, "") + "…";
    }
    note.title = text || "";
    item.append(name, meta, note);
    els.feeds.append(item);
  }

  els.counters.replaceChildren();
  const totals = data.totals || {};
  const counters = [
    [totals.urlhaus, "URLhaus URLs"],
    [totals.threatfox, "ThreatFox IOCs"],
    [totals.feodo, "Feodo C2s"],
    [totals.sslbl, "SSLBL addresses"],
    [totals.openphish, "OpenPhish URLs"],
    [totals.spamhaus, "Spamhaus DROP"],
    [totals.asndrop, "ASN-DROP"],
    [totals.malware_families, "Malware families"],
    [totals.asns, "ASNs"],
  ];
  for (const [value, label] of counters) {
    const node = document.createElement("div");
    node.className = "counter";
    const bold = document.createElement("b");
    bold.textContent = number.format(value || 0);
    const span = document.createElement("span");
    span.textContent = label;
    node.append(bold, span);
    els.counters.append(node);
  }

  renderRank(els.sources, data.top_sources || [], (row) => number.format(row.value));
  els.targetsNote.textContent = data.top_targets_note || "No fetched feed publishes a target country.";
  renderRank(els.targets, data.top_targets || [], (row) => number.format(row.value));
  if (!(data.top_targets || []).length && !els.targets.childElementCount) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "None. The feeds do not name target countries.";
    els.targets.append(empty);
  }
  renderAsn(els.asns, data.asns || []);
  renderFamily(els.families, data.malware_families || []);
  renderTypes(els.types, data.types || []);
  renderKev(els.kev, data.kev || []);
  if (els.sample) els.sample.textContent = data.sample_note || "";
  if (els.severityNote) els.severityNote.textContent = data.severity_note || "";
}

function renderRank(list, rows, metric) {
  list.replaceChildren();
  for (const row of rows) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.append(document.createTextNode(`${row.name} (${row.code})`));
    const small = document.createElement("small");
    small.textContent = `${metric(row)} · ${row.metric || ""}`.trim();
    button.append(small);
    button.addEventListener("click", () => showCountry(row.code));
    item.append(button);
    list.append(item);
  }
}

function renderAsn(list, rows) {
  list.replaceChildren();
  if (!rows.length) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "No ASN fields were published in this cache.";
    list.append(empty);
    return;
  }
  const shown = rows.slice(0, 10);
  for (const row of shown) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    const name = row.name || "name not published";
    button.append(document.createTextNode(`AS${row.asn} · ${name}`));
    const small = document.createElement("small");
    small.textContent = `${number.format(row.count)} listings or indicators` + (row.country ? ` · ${row.country}` : "");
    button.append(small);
    button.addEventListener("click", () => {
      els.search.value = `AS${row.asn}`;
      filter.query = `AS${row.asn}`;
      page = 0;
      refresh();
      showAsn(row);
    });
    item.append(button);
    list.append(item);
  }
  if (rows.length > shown.length) {
    const more = document.createElement("li");
    more.className = "empty";
    more.textContent = `${number.format(rows.length - shown.length)} more in this cache, ${number.format((data.totals || {}).asns || rows.length)} autonomous systems in the full parse.`;
    list.append(more);
  }
}

function renderFamily(list, rows) {
  list.replaceChildren();
  if (!rows.length) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "No malware family names were published in this cache.";
    list.append(empty);
    return;
  }
  for (const row of rows) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${row.family} · ${number.format(row.count)}`;
    button.addEventListener("click", () => {
      filter.family = row.family;
      els.family.value = row.family;
      page = 0;
      refresh();
    });
    item.append(button);
    list.append(item);
  }
}

function renderTypes(list, rows) {
  list.replaceChildren();
  for (const row of rows) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${row.type} · ${number.format(row.count)}`;
    button.title = TYPE_HELP[row.type] || "Label as published by the feed.";
    button.addEventListener("click", () => {
      filter.type = row.type;
      els.type.value = row.type;
      page = 0;
      refresh();
    });
    item.append(button);
    list.append(item);
  }
}

function renderKev(list, rows) {
  list.replaceChildren();
  if (!rows.length) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "No KEV entries in this cache.";
    list.append(empty);
    return;
  }
  const shown = rows.slice(0, 10);
  for (const item of shown) {
    const node = document.createElement("li");
    const link = document.createElement("a");
    link.href = item.reference;
    link.rel = "noopener noreferrer";
    link.target = "_blank";
    link.textContent = item.cve;
    const name = document.createElement("div");
    name.textContent = item.name;
    const meta = document.createElement("div");
    meta.className = "meta";
    const ransom = (item.ransomware || "Unknown");
    meta.textContent = `${item.vendor} ${item.product} · added ${item.date_added || "unstated"} · ransomware: ${ransom}`;
    node.append(link, name, meta);
    list.append(node);
  }
  if (rows.length > shown.length || (data.totals || {}).kev) {
    const more = document.createElement("li");
    more.className = "empty";
    more.textContent = `Showing ${shown.length} newest of ${number.format(rows.length)} listed. Catalog size: ${number.format((data.totals || {}).kev || rows.length)}.`;
    list.append(more);
  }
}

function renderTable() {
  const events = (data.events || []).filter((event) => matchEvent(event, filter));
  const pages = Math.max(1, Math.ceil(events.length / PAGE_SIZE));
  if (page >= pages) page = pages - 1;
  if (page < 0) page = 0;
  const slice = events.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  els.events.replaceChildren();
  if (!slice.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 8;
    cell.className = "empty";
    cell.textContent = "No listed rows match these filters.";
    row.append(cell);
    els.events.append(row);
  }
  for (const event of slice) {
    const row = document.createElement("tr");
    if (selectedEvent && selectedEvent.title === event.title && selectedEvent.feed === event.feed) {
      row.className = "selected";
    }
    row.tabIndex = 0;
    row.append(
      cell(stamp(event.observed_at)),
      severityCell(event.severity),
      cell(event.feed),
      cell(event.threat_type),
      iocCell(event),
      cell(event.malware_family || "—"),
      cell(event.country || event.source_country || "—"),
      cell(event.asn ? `AS${event.asn}` : "—")
    );
    row.addEventListener("click", () => { selectedEvent = event; showEvent(event); renderTable(); });
    row.addEventListener("keydown", (press) => {
      if (press.key === "Enter" || press.key === " ") {
        press.preventDefault();
        selectedEvent = event;
        showEvent(event);
        renderTable();
      }
    });
    els.events.append(row);
  }
  els.pager.replaceChildren();
  const prev = document.createElement("button");
  prev.type = "button";
  prev.textContent = "Previous";
  prev.disabled = page === 0;
  prev.addEventListener("click", () => { page -= 1; renderTable(); });
  const next = document.createElement("button");
  next.type = "button";
  next.textContent = "Next";
  next.disabled = page >= pages - 1 || !events.length;
  next.addEventListener("click", () => { page += 1; renderTable(); });
  const info = document.createElement("span");
  info.textContent = `${number.format(events.length)} matching indicators, page ${page + 1} of ${pages}`;
  els.pager.append(prev, next, info);
}

function cell(text) {
  const node = document.createElement("td");
  node.textContent = text || "—";
  return node;
}

function iocCell(event) {
  const node = document.createElement("td");
  node.className = "ioc";
  node.textContent = event.title;
  return node;
}

function severityCell(level) {
  const node = document.createElement("td");
  const mark = document.createElement("span");
  mark.className = "sev sev-" + (level || "info");
  mark.textContent = level || "info";
  node.append(mark);
  return node;
}

function renderChart() {
  const usingList = filter.country !== "all" || filter.severity !== "all" || filter.family !== "all" || filter.query;
  const buckets = usingList ? bucketsFromEvents() : chosenBuckets();
  const width = 1100;
  const height = 140;
  const pad = { l: 28, r: 8, t: 10, b: 24 };
  const inner = width - pad.l - pad.r;
  const max = Math.max(1, ...buckets);
  const barW = inner / 24;
  const ns = "http://www.w3.org/2000/svg";
  while (els.chart.firstChild) els.chart.removeChild(els.chart.firstChild);
  els.chart.setAttribute("viewBox", `0 0 ${width} ${height}`);
  els.chart.setAttribute("preserveAspectRatio", "none");
  buckets.forEach((value, index) => {
    const bar = document.createElementNS(ns, "rect");
    const h = (value / max) * (height - pad.t - pad.b);
    bar.setAttribute("x", String(pad.l + index * barW + 2));
    bar.setAttribute("y", String(height - pad.b - h));
    bar.setAttribute("width", String(Math.max(2, barW - 4)));
    bar.setAttribute("height", String(Math.max(0, h)));
    bar.setAttribute("class", value ? "bar" : "bar-dim");
    bar.setAttribute("role", "img");
    const start = hourLabel(index);
    bar.setAttribute("aria-label", `${start}: ${value} stamped indicators`);
    els.chart.append(bar);
  });
  const axis = document.createElementNS(ns, "text");
  axis.setAttribute("x", String(pad.l));
  axis.setAttribute("y", String(height - 6));
  axis.setAttribute("fill", "#93aaa4");
  axis.setAttribute("font-size", "11");
  axis.textContent = usingList
    ? "Filtered chart counts only the listed (capped) rows that match."
    : "Hours in this 24-hour cache window, oldest at left.";
  els.chart.append(axis);
  els.chartTitle.textContent = `24-hour timeline, peak ${Math.max(0, ...buckets)}`;
  els.timelineNote.textContent = data.timeline?.note || "";
  if (usingList) {
    els.timelineNote.textContent = (data.timeline?.note || "") + " This filtered chart counts only the listed rows, which are capped.";
  }
  let empty = document.querySelector("#timeline-empty");
  if (!empty) {
    empty = document.createElement("p");
    empty.id = "timeline-empty";
    empty.className = "timeline-empty";
    els.chart.insertAdjacentElement("afterend", empty);
  }
  const allEmpty = buckets.every((value) => value === 0);
  els.chart.classList.toggle("hidden", allEmpty);
  empty.hidden = !allEmpty;
  if (allEmpty) {
    const failed = (data.feeds || []).filter((feed) => !feed.ok).map((feed) => feed.name);
    empty.textContent = "No feed timestamps fell inside this 24-hour window. That reflects the stamps in this cache, not that nothing happened."
      + (failed.length ? " Feeds that did not return data in this fetch: " + failed.join(", ") + "." : "");
  } else {
    empty.textContent = "";
  }
}

function chosenBuckets() {
  if (filter.feed !== "all") return data.timeline?.by_feed?.[filter.feed] || Array(24).fill(0);
  if (filter.type !== "all") return data.timeline?.by_type?.[filter.type] || Array(24).fill(0);
  return data.timeline?.buckets || Array(24).fill(0);
}

function bucketsFromEvents() {
  const buckets = Array(24).fill(0);
  const end = data.timeline?.end || data.generated_at;
  if (!end) return buckets;
  const close = Date.parse(end);
  if (Number.isNaN(close)) return buckets;
  for (const event of data.events || []) {
    if (!matchEvent(event, filter) || !event.observed_at) continue;
    const when = Date.parse(event.observed_at);
    if (Number.isNaN(when)) continue;
    const delta = (close - when) / 1000;
    if (delta < 0 || delta >= 86400) continue;
    const hoursAgo = Math.floor(delta / 3600);
    buckets[23 - hoursAgo] += 1;
  }
  return buckets;
}

function hourLabel(index) {
  const end = data.timeline?.end || data.generated_at;
  if (!end) return `hour ${index + 1}`;
  const close = Date.parse(end);
  if (Number.isNaN(close)) return `hour ${index + 1}`;
  const start = new Date(close - (24 - index) * 3600 * 1000);
  return start.toISOString().replace("T", " ").replace(".000Z", " UTC");
}

function renderReport() {
  els.report.replaceChildren();
  if (!report) {
    const note = document.createElement("p");
    note.className = "note";
    note.textContent = "No analyst report is present yet. Run scripts/analyze.py against the snapshot to generate one.";
    els.report.append(note);
    return;
  }
  if (report.simulated) {
    const banner = document.createElement("p");
    banner.className = "banner";
    banner.textContent = "This report is based on simulated demo data.";
    els.report.append(banner);
  }
  const intro = document.createElement("p");
  intro.className = "note";
  intro.textContent = `Rule-based report generated ${stamp(report.generated_at)} from the snapshot at ${stamp(report.snapshot_generated_at)}.`;
  els.report.append(intro);
  for (const line of (report.executive_summary || []).slice(0, 3)) {
    const p = document.createElement("p");
    p.textContent = line.replace(/\*\*/g, "");
    els.report.append(p);
  }
  if ((report.recommended_actions || []).length) {
    const heading = document.createElement("p");
    heading.className = "note";
    heading.textContent = "Recommended actions";
    els.report.append(heading);
    const list = document.createElement("ul");
    for (const line of report.recommended_actions.slice(0, 4)) {
      const item = document.createElement("li");
      item.textContent = line.replace(/^\d+\.\s*/, "");
      list.append(item);
    }
    els.report.append(list);
  }
  const links = document.createElement("p");
  links.className = "report-links";
  const md = document.createElement("a");
  md.href = "data/reports/latest.md";
  md.textContent = "Full report (Markdown)";
  const html = document.createElement("a");
  html.href = "data/reports/latest.html";
  html.textContent = "Full report (HTML)";
  html.className = "report-html";
  links.append(md, " · ", html);
  els.report.append(links);
}

function mount() {
  if (view && view.destroy) view.destroy();
  els.stage.replaceChildren();
  const can3d = !force2d && hasWebGL();
  mode = mode === "3d" && can3d ? "3d" : (can3d && mode === "3d" ? "3d" : mode);
  if (!can3d) mode = "2d";
  els.toggle.hidden = !hasWebGL() && !force2d ? true : false;
  if (!hasWebGL()) els.toggle.hidden = true;
  els.toggle.setAttribute("aria-pressed", mode === "2d" ? "true" : "false");
  els.toggle.textContent = mode === "3d" ? "2D map" : "3D globe";
  const options = {
    motion: !reduced,
    light,
    onPick: (code) => showCountry(code),
  };
  view = mode === "3d" ? createGlobe(els.stage, options) : createMap(els.stage, options);
  if (countriesGeo && view.setCountries) view.setCountries(countriesGeo);
  view.setSnapshot(data, { feed: filter.feed, type: filter.type, country: filter.country });
}

function refresh() {
  renderChart();
  renderTable();
  if (view && view.setFilter) {
    view.setFilter({ feed: filter.feed, type: filter.type, country: filter.country });
  }
  if (filter.country !== "all") showCountry(filter.country, false);
}

function showCountry(code, setSelect = true) {
  const country = (data.countries || []).find((row) => row.code === code);
  if (!country) return;
  if (setSelect) {
    filter.country = code;
    els.country.value = code;
    if (view && view.setFilter) view.setFilter({ feed: filter.feed, type: filter.type, country: filter.country });
    page = 0;
    renderChart();
    renderTable();
  }
  if (view && view.select) view.select(code);
  const lines = [
    `${country.name} (${country.code})`,
    country.source_addresses ? `${number.format(country.source_addresses)} DShield source addresses (about 30 days of sensor reports). This is the country of the source, not a victim country.` : "",
    country.source_reports ? `${number.format(country.source_reports)} DShield source reports.` : "",
    country.host_observations ? `${number.format(country.host_observations)} listed infrastructure addresses geolocated to this country (country locator, not a street).` : "",
    country.types && country.types.length ? `Types: ${country.types.join(", ")}.` : "",
  ].filter(Boolean);
  const rows = (data.events || []).filter((event) => event.country === code || event.source_country === code).slice(0, 6);
  renderDetail(lines[0], lines.slice(1), rows);
}

function showAsn(row) {
  renderDetail(
    `AS${row.asn} ${row.name || ""}`.trim(),
    [
      `${number.format(row.count)} listings or indicators in this cache.`,
      row.country ? `Most common published country code: ${row.country}.` : "No country was published for this ASN.",
      "ASN values are taken from the feeds or from Spamhaus ASN-DROP. They are not inferred here.",
    ],
    (data.events || []).filter((event) => event.asn === row.asn).slice(0, 6)
  );
}

function showEvent(event) {
  if (event.country && view && view.select) view.select(event.country);
  const lines = [
    event.summary,
    event.severity ? `Local triage severity: ${event.severity}. ${data.severity_note || ""}` : "",
    event.malware_family ? `Malware family (as published): ${event.malware_family}.` : "",
    event.asn ? `ASN: AS${event.asn}${event.asn_name ? " " + event.asn_name : ""}.` : "",
    event.confidence != null ? `Published confidence: ${event.confidence}.` : "",
    event.country ? `Mapped country: ${event.country}. This is not a victim country.` : "No country was published or derived for this indicator.",
    event.target_country ? `Target country: ${event.target_country}.` : "",
    event.observed_at ? `Observed: ${stamp(event.observed_at)}.` : "No per-row timestamp.",
  ].filter(Boolean);
  renderDetail(event.title, lines, [], event);
}

function renderDetail(title, lines, events, event) {
  els.detail.replaceChildren();
  const heading = document.createElement("h2");
  heading.textContent = "Detail";
  const h = document.createElement("h3");
  h.textContent = title;
  els.detail.append(heading, h);
  for (const line of lines) {
    const p = document.createElement("p");
    p.className = "note";
    p.textContent = line;
    els.detail.append(p);
  }
  if (event) els.detail.append(eventParagraph(event));
  for (const row of events || []) els.detail.append(eventParagraph(row));
}

function eventParagraph(event) {
  const p = document.createElement("p");
  p.append(document.createTextNode(`${event.feed}: ${event.title} `));
  if (event.reference) {
    const link = document.createElement("a");
    link.href = event.reference;
    link.rel = "noopener noreferrer";
    link.target = "_blank";
    link.textContent = "Source";
    p.append(link);
  }
  return p;
}

function matchEvent(event, current) {
  if (current.feed !== "all" && event.feed !== current.feed) return false;
  if (current.type !== "all" && event.threat_type !== current.type) return false;
  if (current.country !== "all" && event.country !== current.country && event.source_country !== current.country) return false;
  if (current.severity !== "all" && event.severity !== current.severity) return false;
  if (current.family !== "all" && event.malware_family !== current.family) return false;
  if (current.query) {
    const hay = [
      event.title, event.ip, event.feed, event.threat_type, event.malware_family,
      event.country, event.source_country, event.summary, event.tags, event.ioc_type,
      event.asn ? `AS${event.asn}` : "", event.asn_name, event.severity,
    ].join(" ").toLowerCase();
    if (!hay.includes(current.query.toLowerCase())) return false;
  }
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

function animate(node, target, formatted) {
  if (reduced || !target) {
    node.textContent = formatted != null ? (typeof formatted === "string" && target === 0 && formatted.includes("/") ? formatted : number.format(target)) : number.format(target);
    if (formatted && String(formatted).includes("/")) node.textContent = formatted;
    return;
  }
  if (formatted && String(formatted).includes("/")) {
    node.textContent = formatted;
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
