(function () {
  const root = document.documentElement;
  const stored = localStorage.getItem("shield-theme");
  if (stored === "evening" || stored === "day") {
    root.setAttribute("data-theme", stored === "evening" ? "evening" : "day");
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((reg) => reg.unregister());
    }).catch(() => {});
  }

  const navBtn = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("#nav");
  if (navBtn && nav) {
    navBtn.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      navBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        nav.classList.remove("is-open");
        navBtn.setAttribute("aria-expanded", "false");
      }
    });
  }

  const themeBtn = document.querySelector("[data-theme-toggle]");
  const paintTheme = () => {
    const evening = root.getAttribute("data-theme") === "evening";
    if (themeBtn) {
      themeBtn.textContent = evening ? "Day" : "Evening";
      themeBtn.setAttribute("aria-pressed", evening ? "true" : "false");
    }
  };
  paintTheme();
  themeBtn?.addEventListener("click", () => {
    const evening = root.getAttribute("data-theme") === "evening";
    root.setAttribute("data-theme", evening ? "day" : "evening");
    localStorage.setItem("shield-theme", evening ? "day" : "evening");
    paintTheme();
    document.dispatchEvent(new CustomEvent("shield-theme"));
  });

  const clock = document.querySelector("[data-clock]");
  const tick = () => {
    if (!clock) return;
    clock.textContent = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Africa/Nairobi",
      hourCycle: "h23",
    }).format(new Date());
  };
  tick();
  window.setInterval(tick, 30000);

  const dict = {
    fr: {
      "nav.home": "Accueil",
      "nav.desk": "Bureau",
      "nav.map": "Carte",
      "nav.report": "Signaler",
      "nav.learn": "Apprendre",
      "nav.events": "Agenda",
      "nav.careers": "Métiers",
      "nav.about": "Le centre",
      "nav.contact": "Contact",
      "nav.menu": "Menu",
    },
    sw: {
      "nav.home": "Nyumbani",
      "nav.desk": "Dawati",
      "nav.map": "Ramani",
      "nav.report": "Ripoti",
      "nav.learn": "Jifunze",
      "nav.events": "Matukio",
      "nav.careers": "Kazi",
      "nav.about": "Kuhusu",
      "nav.contact": "Wasiliana",
      "nav.menu": "Menyu",
    },
    rw: {
      "nav.home": "Ahabanza",
      "nav.desk": "Ikigo",
      "nav.map": "Ikarita",
      "nav.report": "Menyesha",
      "nav.learn": "Wige",
      "nav.events": "Ibirori",
      "nav.careers": "Akazi",
      "nav.about": "Ibyerekeye",
      "nav.contact": "Tuvugishe",
      "nav.menu": "Ibikubiyemo",
    },
  };

  const applyLang = (code) => {
    document.documentElement.lang = code === "en" ? "en" : code;
    document.querySelectorAll("[data-i18n]").forEach((node) => {
      const key = node.getAttribute("data-i18n");
      const original = node.getAttribute("data-i18n-en") || node.textContent;
      if (!node.getAttribute("data-i18n-en")) node.setAttribute("data-i18n-en", original);
      node.textContent = (dict[code] && dict[code][key]) || original;
    });
    document.querySelectorAll("[data-lang]").forEach((btn) => {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-lang") === code ? "true" : "false");
    });
    localStorage.setItem("shield-lang", code);
  };

  document.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.addEventListener("click", () => applyLang(btn.getAttribute("data-lang")));
  });
  const savedLang = localStorage.getItem("shield-lang");
  if (savedLang) applyLang(savedLang);

  document.addEventListener("keydown", (event) => {
    if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target;
    if (target && /input|textarea|select/i.test(target.tagName)) return;
    const search = document.querySelector("[data-search]");
    if (!search) return;
    event.preventDefault();
    search.focus();
  });

  window.Shield = window.Shield || {};
  window.Shield.loadIntel = async function loadIntel(reload) {
    const base = document.body.getAttribute("data-root") || "..";
    const response = await fetch(`${base}/data/public-intel.json`, {
      cache: reload ? "reload" : "default",
    });
    if (!response.ok) throw new Error("The public feed file did not load.");
    return response.json();
  };
  window.Shield.formatWhen = function formatWhen(iso) {
    if (!iso) return "—";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Africa/Nairobi",
      hourCycle: "h23",
    }).format(date) + " EAT";
  };
  window.Shield.number = function number(value) {
    return new Intl.NumberFormat("en-GB").format(value || 0);
  };

  document.querySelectorAll("[data-quiz]").forEach((quiz) => {
    const result = quiz.querySelector("[data-quiz-result]");
    quiz.querySelector("[data-quiz-check]")?.addEventListener("click", () => {
      const questions = quiz.querySelectorAll("fieldset");
      let score = 0;
      questions.forEach((set) => {
        const chosen = set.querySelector("input:checked");
        if (chosen && chosen.value === "1") score += 1;
      });
      if (result) {
        result.textContent = `${score} of ${questions.length} correct.`;
      }
    });
  });

  const jobSearch = document.querySelector("[data-job-search]");
  const jobPlace = document.querySelector("[data-job-place]");
  const jobList = document.querySelector("[data-jobs]");
  if (jobList) {
    const cards = Array.from(jobList.querySelectorAll("[data-job]"));
    const empty = document.querySelector("[data-job-empty]");
    const filterJobs = () => {
      const q = (jobSearch?.value || "").trim().toLowerCase();
      const place = jobPlace?.value || "all";
      let shown = 0;
      cards.forEach((card) => {
        const hay = card.getAttribute("data-job") || "";
        const loc = card.getAttribute("data-place") || "";
        const ok = (!q || hay.includes(q)) && (place === "all" || loc === place);
        card.classList.toggle("hidden", !ok);
        if (ok) shown += 1;
      });
      if (empty) empty.classList.toggle("hidden", shown !== 0);
    };
    jobSearch?.addEventListener("input", filterJobs);
    jobPlace?.addEventListener("change", filterJobs);
  }

  const interest = document.querySelector("[data-interest]");
  interest?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(interest);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const note = interest.querySelector("[data-interest-note]");
    if (!name || !email.includes("@")) {
      if (note) note.textContent = "Add your name and a real email address.";
      return;
    }
    const key = "shield-interest-v1";
    const rows = JSON.parse(localStorage.getItem(key) || "[]");
    rows.push({ name, email, event: data.get("event") || "", at: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(rows));
    interest.reset();
    if (note) note.textContent = "Saved on this device only. The public site does not send this note anywhere.";
  });

  const contact = document.querySelector("[data-contact]");
  contact?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(contact);
    const note = contact.querySelector("[data-contact-note]");
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const message = String(data.get("message") || "").trim();
    if (!name || !email.includes("@") || message.length < 8) {
      if (note) note.textContent = "Name, email, and a short message are required.";
      return;
    }
    const key = "shield-messages-v1";
    const rows = JSON.parse(localStorage.getItem(key) || "[]");
    rows.push({ name, email, topic: data.get("topic") || "", message, at: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(rows));
    contact.reset();
    if (note) note.textContent = "Kept in this browser. For an urgent incident, call +250 788 911 911.";
  });

  document.querySelectorAll("[data-auth-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-auth-tab");
      document.querySelectorAll("[data-auth-tab]").forEach((item) => {
        item.setAttribute("aria-selected", item === btn ? "true" : "false");
      });
      document.querySelectorAll("[data-auth-panel]").forEach((panel) => {
        panel.classList.toggle("hidden", panel.getAttribute("data-auth-panel") !== id);
      });
    });
  });
  document.querySelectorAll("[data-auth]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const note = document.querySelector("[data-auth-note]");
      if (note) note.textContent = "This public copy does not keep accounts, and the password was not sent.";
    });
  });

  const homeKev = document.querySelector("[data-home-kev]");
  if (homeKev) {
    const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[ch]));
    window.Shield.loadIntel(false).then((data) => {
      const when = document.querySelector("[data-fetched]");
      if (when) when.textContent = window.Shield.formatWhen(data.fetched_at);
      const version = document.querySelector("[data-kev-version]");
      if (version) version.textContent = data.summary.kev_version || "—";
      const figures = document.querySelector("[data-home-figures]");
      if (figures) {
        const s = data.summary;
        const cells = [
          [s.kev_count, "Exploited vulnerabilities in the CISA catalog"],
          [s.kev_added_30d, "Added to that catalog in 30 days"],
          [s.fox_ip_located, "ThreatFox addresses placed on a registry country"],
          [s.countries, "Countries named in this snapshot"],
        ];
        figures.innerHTML = cells.map(([value, label]) => `<div class="figure"><b>${window.Shield.number(value)}</b><span>${label}</span></div>`).join("");
      }
      homeKev.innerHTML = (data.kev || []).slice(0, 6).map((row) => `
        <tr>
          <td><a href="https://nvd.nist.gov/vuln/detail/${encodeURIComponent(row.cve)}">${esc(row.cve)}</a><span class="sub">${esc(row.name)}</span></td>
          <td class="hide-sm">${esc(row.vendor)}</td>
          <td class="mono">${esc(row.added)}</td>
        </tr>`).join("");
      const countries = document.querySelector("[data-home-countries]");
      if (countries) {
        countries.innerHTML = (data.countries || []).slice(0, 6).map((row) => `
          <li><a href="../ThreatMap/">
            <span class="room-index">${esc(row.code)}</span>
            <span><span class="room-title">${esc(row.name)}</span><span class="sub">${window.Shield.number(row.count)} indicators</span></span>
            <span class="muted">${esc((row.malware[0] || {}).name || "")}</span>
          </a></li>`).join("");
      }
    }).catch(() => {
      homeKev.innerHTML = `<tr><td colspan="3">The public snapshot did not load.</td></tr>`;
    });
  }
})();
