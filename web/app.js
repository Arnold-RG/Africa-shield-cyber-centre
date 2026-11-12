/* AEGIS / Global SOC. Zero build-time dependencies. Strictly same-origin API. */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const escapeHTML = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
  const fmt = (v) => Number(v || 0).toLocaleString('en-US');
  const svgNS = 'http://www.w3.org/2000/svg';
  const icon = (name) => '<svg class="ico"><use href="#ic-' + name + '"></use></svg>';
  const severityColor = {critical: '#ff697c', high: '#ffbd75', medium: '#62a8ff', low: '#47e1bf'};
  const state = {mode: 'pending', aiEnabled: false, incidents: [], events: [], overview: null, status: null,
                 refreshing: false, busyAction: false, toastTimeout: null, pollTimer: null};

  function toast(message, isError = false) {
    const box = $('toast');
    box.textContent = message;
    box.classList.toggle('error', isError);
    box.hidden = false;
    clearTimeout(state.toastTimeout);
    state.toastTimeout = setTimeout(() => { box.hidden = true; }, 4500);
  }

  function nowClock() {
    $('utc-clock').textContent = new Date().toLocaleTimeString('en-GB', {timeZone: 'UTC', hour12: false}) + ' UTC';
  }
  function formatTime(input, full = false) {
    const d = new Date(input);
    if (!Number.isFinite(d.valueOf())) return '—';
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'UTC', month: full ? 'short' : undefined,
      day: full ? '2-digit' : undefined, hour: '2-digit', minute: '2-digit',
      hour12: false
    }).format(d) + (full ? ' UTC' : '');
  }
  function ago(value) {
    const delta = Math.max(0, Date.now() - new Date(value).getTime());
    if (!Number.isFinite(delta)) return '—';
    if (delta < 60000) return 'NOW';
    if (delta < 3600000) return Math.floor(delta / 60000) + 'M AGO';
    if (delta < 86400000) return Math.floor(delta / 3600000) + 'H AGO';
    return Math.floor(delta / 86400000) + 'D AGO';
  }

  async function api(path, options = {}) {
    const key = sessionStorage.getItem('aegisOperatorKey') || '';
    const headers = {Accept: 'application/json', ...(options.body ? {'Content-Type':'application/json'} : {})};
    if (key) headers['X-SOC-API-Key'] = key;
    const response = await fetch(path, {
      ...options, headers: {...headers, ...(options.headers || {})}, cache: 'no-store'
    });
    let payload;
    try { payload = await response.json(); }
    catch { throw new Error('Invalid API response (' + response.status + ')'); }
    if (!response.ok) {
      if (response.status === 401) {
        $('data-notice').textContent = 'Operator authorization required. Open Settings and enter your SOC_API_KEY.';
        $('data-notice').classList.remove('live');
      }
      throw new Error(typeof payload.detail === 'string' ? payload.detail : 'HTTP ' + response.status);
    }
    return payload;
  }

  function setStatus(status) {
    state.status = status;
    state.mode = status.mode;
    state.aiEnabled = Boolean(status.ai_enabled);
    const demo = Boolean(status.is_demo);
    const badge = $('mode-badge');
    badge.className = 'mode-badge' + (demo ? ' demo' : '');
    badge.innerHTML = '<span class="mode-led"></span> ' + (demo ? 'DEMO / SYNTHETIC' : 'LIVE / SENSOR DATA');
    $('footer-mode').textContent = demo ? 'DEMO MODE' : 'LIVE MODE';
    $('core-state').textContent = 'Online';
    $('core-state').style.color = '#66deaa';
    $('health-label').textContent = 'ONLINE';
    $('health-indicator').style.width = '100%';
    const notice = $('data-notice');
    notice.classList.toggle('live', !demo);
    notice.innerHTML = demo
      ? icon('alert') + '<span><strong>DEMONSTRATION ENVIRONMENT</strong> — All geolocated events are synthetic; IP addresses are reserved documentation ranges. CISA KEV feed is real when available.</span>'
      : icon('lock') + '<span><strong>LIVE SENSOR MODE</strong> — Only ingested telemetry is shown. Global coverage, attribution and freshness depend on the integrated sensors. Containment requires separate authorized tooling.</span>';
    $('events-caption').textContent = demo ? 'Synthetic event observations' : 'Ingested sensor observations';
    $('geo-caption').textContent = demo ? 'Simulated locations / documentation IPs' : 'Sensor geolocation hints, not attribution';
    $('ai-state').textContent = state.aiEnabled ? 'MODEL CONNECTED' : 'NOT CONFIGURED';
    $('ai-state').style.color = state.aiEnabled ? '#b9adfd' : '#a6aaba';
    $('generate-brief').disabled = !state.aiEnabled;
    $('generate-brief').title = state.aiEnabled ? 'Generate advisory analysis' : 'Set SOC_AI_KEY on the backend to enable AI';
    $('intel-updated').textContent = status.last_intelligence_sync
      ? 'Last successful sync: ' + formatTime(status.last_intelligence_sync, true)
      : 'CISA feed sync pending / unavailable';
  }

  function setOffline(message) {
    $('core-state').textContent = 'Offline';
    $('core-state').style.color = '#ff697c';
    $('health-label').textContent = 'OFFLINE';
    $('health-indicator').style.width = '0';
    const notice = $('data-notice');
    notice.classList.remove('live');
    notice.textContent = 'SOC API is unavailable. ' + message + ' — start the backend and refresh.';
  }

  function renderOverview(data) {
    state.overview = data;
    const {metrics} = data;
    $('m-events').textContent = fmt(metrics.observations);
    $('m-critical').textContent = fmt(metrics.critical);
    $('m-incidents').textContent = fmt(metrics.open_incidents);
    $('m-sources').textContent = fmt(metrics.sources);
    $('nav-count').textContent = fmt(metrics.open_incidents);
    renderTrend(data.trend);
    renderSeverity(data.severity);
    renderMap(data.map_points);
  }

  function renderTrend(buckets) {
    const root = $('trend-chart');
    root.replaceChildren();
    const max = Math.max(1, ...buckets.map(x => x.count));
    buckets.forEach((bucket) => {
      const bar = el('div', 'chart-bar');
      bar.style.height = Math.max(3, Math.round(100 * bucket.count / max)) + '%';
      bar.dataset.count = bucket.count;
      bar.title = bucket.time + ' UTC: ' + bucket.count + ' observations';
      root.appendChild(bar);
    });
    $('trend-left').textContent = buckets[0]?.time || '—';
    $('trend-right').textContent = buckets[buckets.length - 1]?.time || '—';
  }

  function renderSeverity(items) {
    const root = $('severity-bars');
    root.replaceChildren();
    const total = items.reduce((sum, s) => sum + s.count, 0);
    items.forEach(item => {
      const row = el('div','severity-line');
      const top = el('div','severity-line-top');
      const name = el('span');
      const dot = el('i','legend-dot');
      dot.style.background = severityColor[item.name] || severityColor.low;
      name.append(dot, document.createTextNode(item.name.toUpperCase()));
      top.append(name, el('strong','',fmt(item.count) + ' · ' + (total ? Math.round(100 * item.count / total) : 0) + '%'));
      const track = el('div','severity-track');
      const fill = el('div','severity-fill');
      fill.style.width = (total ? item.count / total * 100 : 0) + '%';
      fill.style.background = severityColor[item.name] || severityColor.low;
      track.appendChild(fill);
      row.append(top,track);
      root.appendChild(row);
    });
  }

  function renderMap(points) {
    const root = $('map-markers');
    root.replaceChildren();
    $('map-overlay-count').textContent = fmt(points.length);
    // Multiple observations near the same location are grouped into one marker.
    // Marker positions represent only supplied sensor hints, not observed attack routes.
    const groups = new Map();
    for (const item of points) {
      if (typeof item.lat !== 'number' || typeof item.lon !== 'number') continue;
      const key = item.country || 'ZZ';
      const prior = groups.get(key) || {country:key,lat:0,lon:0,n:0,level:'low'};
      prior.n += 1; prior.lat += item.lat; prior.lon += item.lon;
      if ((['low','medium','high','critical'].indexOf(item.severity)) >
          (['low','medium','high','critical'].indexOf(prior.level))) prior.level = item.severity;
      groups.set(key,prior);
    }
    for (const group of groups.values()) {
      const lon = group.lon / group.n, lat = group.lat / group.n;
      const x = Math.max(10, Math.min(990, (lon + 180) / 360 * 1000));
      const y = Math.max(10, Math.min(490, (90 - lat) / 180 * 500));
      const radius = 3.1 + Math.min(4.4, Math.log2(group.n + 1));
      const wrapper = document.createElementNS(svgNS,'g');
      wrapper.setAttribute('class','map-marker');
      wrapper.setAttribute('role','button');
      wrapper.setAttribute('tabindex','0');
      wrapper.setAttribute('aria-label', group.country + ': ' + group.n + ' observations');
      const halo = document.createElementNS(svgNS,'circle');
      halo.setAttribute('class','point-halo');
      halo.setAttribute('cx',x); halo.setAttribute('cy',y);
      halo.setAttribute('r',radius*2.6);
      halo.setAttribute('fill',severityColor[group.level]);
      const core = document.createElementNS(svgNS,'circle');
      core.setAttribute('class','point-core');
      core.setAttribute('cx',x); core.setAttribute('cy',y);
      core.setAttribute('r',radius);
      core.setAttribute('fill',severityColor[group.level]);
      const title = document.createElementNS(svgNS,'title');
      title.textContent = group.country + ' · ' + group.n + ' observed events · max severity ' + group.level;
      wrapper.append(halo,core,title);
      const announce = () => toast(group.country + ': ' + group.n + ' geolocated observations · max ' + group.level + ' severity');
      wrapper.addEventListener('click',announce);
      wrapper.addEventListener('keydown',e => { if (e.key === 'Enter' || e.key === ' ') {e.preventDefault(); announce();} });
      root.appendChild(wrapper);
    }
  }

  function renderEvents(items) {
    state.events = items;
    $('feed-count').textContent = String(items.length).padStart(2,'0');
    $('feed-caption').textContent = state.mode === 'demo' ? 'Synthetic simulation · demo only' : 'Ingested sensor telemetry';
    const root = $('event-feed');
    if (!items.length) { root.innerHTML = '<div class="empty-state">No telemetry has been ingested yet.</div>'; return; }
    root.innerHTML = items.slice(0, 9).map(x => {
      const kind = String(x.kind || 'Event');
      const tone = x.severity === 'critical' ? 'red' : x.severity === 'high' ? 'orange' : x.severity === 'low' ? 'green' : '';
      return '<div class="event-row"><span class="event-pin '+tone+'">'+icon(x.severity === 'critical' ? 'alert' : 'radar')+'</span>' +
        '<div class="event-body"><div class="event-title"><strong title="'+escapeHTML(kind)+'">'+escapeHTML(kind)+'</strong><time title="'+escapeHTML(formatTime(x.ts,true))+'">'+escapeHTML(ago(x.ts))+'</time></div>'+
        '<div class="event-description" title="'+escapeHTML(x.summary)+'">'+escapeHTML(x.summary || x.target || x.source)+'</div>'+
        '<div class="event-meta"><span class="severity-chip '+escapeHTML(x.severity)+'">'+escapeHTML(x.severity.toUpperCase())+'</span><span>'+escapeHTML(x.country)+'</span><span>·</span><span>'+escapeHTML(x.source)+'</span></div></div></div>';
    }).join('');
  }

  function renderIncidents(items) {
    state.incidents = items;
    const filter = $('incident-filter').value;
    const current = items.filter(item => {
      if (filter === 'active') return item.status === 'open' || item.status === 'investigating';
      return filter === 'all' || item.status === filter;
    });
    $('case-count').textContent = String(current.length).padStart(2,'0');
    $('case-footer').textContent = 'SHOWING ' + Math.min(current.length,20) + ' / ' + current.length + ' CASES';
    const tbody = $('incident-table');
    if (!current.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-cell">No incidents matching this filter.</td></tr>';
      return;
    }
    tbody.innerHTML = current.slice(0,20).map(item => {
      const id = Number(item.id);
      const severity = escapeHTML(item.severity);
      const status = escapeHTML(item.status);
      const reportButton = state.aiEnabled ? '<button type="button" class="action-mini ai-action" data-action="analyze" data-id="'+id+'" title="Generate advisory report">✦ AI</button>' : '';
      const actions = item.status === 'resolved'
        ? reportButton
        : '<button type="button" class="action-mini" data-action="investigating" data-id="'+id+'" title="Mark investigating">Investigate</button>' +
          '<button type="button" class="action-mini" data-action="contained" data-id="'+id+'" title="Record case as contained; does not execute containment">Contain</button>' +
          '<button type="button" class="action-mini" data-action="resolved" data-id="'+id+'" title="Mark case resolved">Resolve</button>' + reportButton;
      return '<tr><td class="case-id">INC-'+String(id).padStart(4,'0')+'</td>' +
        '<td><strong>'+escapeHTML(item.title)+'</strong><small>'+escapeHTML(item.source)+' · '+escapeHTML(item.country)+'</small></td>'+
        '<td><span class="severity-chip '+severity+'">'+severity.toUpperCase()+'</span></td>'+
        '<td><span class="score-number">'+fmt(item.score)+'</span><span class="score-track"><i style="width:'+Math.max(0,Math.min(100,Number(item.score)))+'%"></i></span></td>'+
        '<td><span class="status-chip '+status+'">'+status.toUpperCase()+'</span></td>'+
        '<td>'+escapeHTML(formatTime(item.created_at,true))+'</td>'+
        '<td><div class="case-actions">'+actions+'</div></td></tr>';
    }).join('');
  }

  function renderIntel(items, last) {
    if (last) $('intel-updated').textContent = 'Last successful sync: ' + formatTime(last, true);
    const root = $('kev-list');
    if (!items.length) {
      root.innerHTML = '<div class="empty-state">CISA catalog has not synced yet. The feed may be temporarily unavailable; no vulnerabilities are fabricated.</div>';
      return;
    }
    root.innerHTML = items.slice(0,10).map(x => {
      const cve = /^CVE-[0-9]{4}-[0-9]{4,}$/.test(x.cve) ? x.cve : '';
      const href = cve ? 'https://nvd.nist.gov/vuln/detail/' + encodeURIComponent(cve) : 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog';
      return '<div class="kev-row"><div class="kev-info"><strong><a href="'+href+'" target="_blank" rel="noopener noreferrer">'+escapeHTML(x.cve)+'</a></strong>' +
        '<p>'+escapeHTML(x.vendor)+' / '+escapeHTML(x.product)+'</p><p>'+escapeHTML(x.vulnerability)+'</p></div>'+
        '<div class="kev-meta"><span class="kev-tag">KNOWN EXPLOITED</span><span>'+escapeHTML(x.date_added)+'</span></div></div>';
    }).join('');
  }

  function renderAutomation(data) {
    const root = $('job-list');
    root.innerHTML = data.automated_jobs.map(job => {
      const active = job.state === 'active' || job.state === 'scheduled';
      return '<div class="job-row"><span class="job-icon">'+icon(active?'check':'cpu')+'</span><div class="job-main"><strong>'+escapeHTML(job.name)+'</strong><small>'+escapeHTML(job.type)+'</small></div><span class="job-state'+(active?'':' muted')+'">'+escapeHTML(job.state.toUpperCase())+'</span></div>';
    }).join('');
    $('audit-count').textContent = fmt(data.audit_count) + ' total records';
    const log = $('audit-list');
    log.innerHTML = data.audit.length ? data.audit.slice(0,5).map(a =>
      '<div class="audit-row"><span class="audit-dot"></span><div class="audit-main"><strong>'+escapeHTML(a.action.replaceAll('_',' '))+'</strong><small>'+escapeHTML(a.actor)+' · '+escapeHTML(a.detail)+'</small></div><time>'+escapeHTML(ago(a.ts))+'</time></div>'
    ).join('') : '<div class="empty-state">No audit records yet.</div>';
  }

  async function refresh() {
    if (state.refreshing) return;
    state.refreshing = true;
    $('refresh-all').disabled = true;
    try {
      const status = await api('/api/status');
      setStatus(status);
      if (status.mode === 'live' && !sessionStorage.getItem('aegisOperatorKey')) {
        $('data-notice').textContent = 'Live mode is protected. Enter your operator key under Settings to access telemetry.';
        return;
      }
      const hours = Number($('range-select').value) || 24;
      const tasks = [
        ['overview', '/api/overview?hours=' + hours],
        ['events', '/api/events?limit=80'],
        ['incidents', '/api/incidents?limit=200'],
        ['intel', '/api/intelligence?limit=30'],
        ['automation', '/api/automation']
      ];
      const results = await Promise.allSettled(tasks.map(x => api(x[1])));
      let failures = 0;
      results.forEach((result, i) => {
        if (result.status === 'rejected') { failures++; console.warn(tasks[i][0], result.reason.message); return; }
        const data = result.value;
        switch (tasks[i][0]) {
          case 'overview': renderOverview(data); break;
          case 'events': renderEvents(data.items); break;
          case 'incidents': renderIncidents(data.items); break;
          case 'intel': renderIntel(data.items, data.last_updated); break;
          case 'automation': renderAutomation(data); break;
        }
      });
      if (failures) toast(failures + ' data panel(s) could not refresh. Verify connection / authorization.',true);
    } catch (error) {
      setOffline(error.message);
    } finally {
      state.refreshing = false;
      $('refresh-all').disabled = false;
    }
  }

  async function updateCase(id, action) {
    if (state.busyAction) return;
    const numericId = Number(id);
    if (!Number.isSafeInteger(numericId) || numericId < 1) return;
    if (action === 'contained' && !confirm('Record this case as contained? This updates the case status only; no host is isolated or blocked.')) return;
    if (action === 'resolved' && !confirm('Mark this case as resolved?')) return;
    state.busyAction = true;
    try {
      if (action === 'analyze') {
        if (!state.aiEnabled) { toast('AI is not configured on the server',true); return; }
        toast('Generating advisory investigation report…');
        const result = await api('/api/incidents/'+numericId+'/analyze', {method:'POST'});
        showReport('INC-'+String(numericId).padStart(4,'0')+' · INVESTIGATION',result.report);
        document.getElementById('copilot').scrollIntoView({behavior:'smooth'});
        toast('Investigation report generated. No containment actions executed.');
      } else if (['open','investigating','contained','resolved'].includes(action)) {
        await api('/api/incidents/'+numericId+'/status', {method:'POST',body:JSON.stringify({status:action})});
        toast('Incident INC-'+numericId+' status recorded as '+action+'. No infrastructure action taken.');
        await refresh();
      }
    } catch (error) {
      toast('Action failed: '+error.message,true);
    } finally {
      state.busyAction = false;
    }
  }

  function showReport(label, report) {
    $('ai-report-wrap').hidden = false;
    $('ai-report').textContent = label + '\n\n' + report;
  }
  async function brief() {
    if (!state.aiEnabled) {toast('SOC_AI_KEY is not configured on the backend.',true);return;}
    const button = $('generate-brief');
    button.disabled = true;
    button.textContent = 'Analyzing incidents…';
    try {
      const result = await api('/api/ai/brief',{method:'POST'});
      showReport('GLOBAL SOC · SHIFT HANDOVER',result.report);
      toast('Advisory shift brief ready.');
    } catch(error) {
      toast('AI analysis failed: '+error.message,true);
    } finally {
      button.innerHTML = icon('bolt')+' Generate Shift Brief '+icon('arrow');
      button.disabled = !state.aiEnabled;
    }
  }

  function openSettings() {
    $('api-key').value = sessionStorage.getItem('aegisOperatorKey') || '';
    $('settings-dialog').showModal();
    $('api-key').focus();
  }
  function attach() {
    nowClock();
    setInterval(nowClock,1000);
    ['settings-top','settings-side'].forEach(id => $(id).addEventListener('click',openSettings));
    $('save-key').addEventListener('click',() => {
      const key = $('api-key').value.trim();
      if (!key) {toast('Enter a key or select Clear key.',true); return;}
      sessionStorage.setItem('aegisOperatorKey',key);
      $('settings-dialog').close();
      refresh();
    });
    $('clear-key').addEventListener('click',() => {
      sessionStorage.removeItem('aegisOperatorKey');
      $('api-key').value = '';
      $('settings-dialog').close();
      toast('Operator key cleared from browser session.');
      refresh();
    });
    $('refresh-all').addEventListener('click',refresh);
    $('feed-refresh').addEventListener('click',refresh);
    $('incident-refresh').addEventListener('click',refresh);
    $('range-select').addEventListener('change',refresh);
    $('incident-filter').addEventListener('change',()=>renderIncidents(state.incidents));
    $('incident-table').addEventListener('click',e => {
      const button = e.target.closest('button[data-action]');
      if (button) updateCase(button.dataset.id,button.dataset.action);
    });
    $('generate-brief').addEventListener('click',brief);
    $('copy-brief').addEventListener('click',async() => {
      try { await navigator.clipboard.writeText($('ai-report').textContent); toast('Advisory report copied.'); }
      catch { toast('Clipboard unavailable. Select and copy the report manually.',true); }
    });
    document.querySelectorAll('#main-nav a').forEach(link => link.addEventListener('click',() => {
      document.querySelectorAll('#main-nav a').forEach(item=>item.classList.remove('active'));
      link.classList.add('active');
    }));
    refresh().then(() => {
      state.pollTimer = setInterval(() => {
        if (!document.hidden) refresh();
      },Math.max(5000,Number(state.status?.poll_seconds || 15)*1000));
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',attach,{once:true});
  else attach();
})();
