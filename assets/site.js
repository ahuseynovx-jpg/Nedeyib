(function () {
  var TODO = "CONTACT_EMAIL_TODO";
  var config = window.NEDEYIB_CONFIG || {};
  var email = String(config.CONTACT_EMAIL || "").trim();
  var contactReady = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email !== TODO;

  var root = document.documentElement;
  var toggle = document.querySelector("[data-theme-toggle]");
  try {
    var stored = localStorage.getItem("nedeyib-theme");
    if (stored === "light" || stored === "dark") root.setAttribute("data-theme", stored);
  } catch (err) {}

  function theme() {
    var chosen = root.getAttribute("data-theme");
    if (chosen === "light" || chosen === "dark") return chosen;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function paintTheme() {
    if (!toggle) return;
    var dark = theme() === "dark";
    toggle.setAttribute("aria-pressed", dark ? "true" : "false");
    toggle.setAttribute("aria-label", dark ? "İşıqlı mövzuya keç" : "Qaranlıq mövzuya keç");
  }

  paintTheme();
  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = theme() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("nedeyib-theme", next); } catch (err) {}
      paintTheme();
    });
  }
  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    var onScheme = function () {
      if (!root.getAttribute("data-theme")) paintTheme();
    };
    if (mq.addEventListener) mq.addEventListener("change", onScheme);
  }

  if (contactReady) {
    document.querySelectorAll("[data-contact]").forEach(function (el) { el.hidden = false; });
    document.querySelectorAll("[data-contact-mail]").forEach(function (link) {
      link.href = "mailto:" + email;
      link.textContent = email;
    });
  }

  document.querySelectorAll("form.ask").forEach(function (form) {
    form.addEventListener("submit", function (event) { event.preventDefault(); });
  });

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function hostOf(url) {
    try { return new URL(url).host; } catch (err) { return url; }
  }

  function validSource(item) {
    if (!item || typeof item.title !== "string" || typeof item.url !== "string") return false;
    var title = item.title.trim();
    var url = item.url.trim();
    if (!title || !/^https?:\/\//i.test(url)) return false;
    return true;
  }

  function safePhoto(src) {
    if (typeof src !== "string") return "";
    src = src.trim();
    if (src.indexOf("/") === 0 && src.indexOf("//") !== 0) return src;
    if (/^https:\/\//i.test(src)) return src;
    return "";
  }

  function sourcesFor(people, id) {
    var person = people[id] || {};
    var all = Array.isArray(person.sources) ? person.sources : [];
    return all.filter(validSource);
  }

  var listEl = document.querySelector("[data-source-list]");

  fetch("/data/sources.json", { credentials: "same-origin", cache: "no-store" })
    .then(function (res) {
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    })
    .then(function (data) {
      var people = (data && data.people) || {};

      document.querySelectorAll("[data-photo]").forEach(function (el) {
        var person = people[el.getAttribute("data-photo")] || {};
        var src = safePhoto(person.photo);
        if (!src) return;
        var img = document.createElement("img");
        img.alt = "";
        img.src = src;
        el.appendChild(img);
      });

      if (!listEl) return;
      var id = listEl.getAttribute("data-person");
      var sources = sourcesFor(people, id);
      if (!sources.length) {
        listEl.innerHTML = '<p class="empty">Kitabxanaya hələ mənbə əlavə olunmayıb.</p>';
        return;
      }
      var items = sources.map(function (item, index) {
        var url = item.url.trim();
        var note = item.note && String(item.note).trim()
          ? '<p class="sx">' + esc(String(item.note).trim()) + "</p>"
          : "";
        return (
          "<li><span class=\"num\">" + (index + 1) + "</span><div>" +
          '<a class="st" href="' + esc(url) + '" rel="noopener noreferrer">' + esc(item.title.trim()) + "</a>" +
          note +
          '<p class="sl">' + esc(hostOf(url)) + "</p></div></li>"
        );
      }).join("");
      listEl.innerHTML = '<ol class="sources">' + items + "</ol>";
    })
    .catch(function () {
      if (listEl) listEl.innerHTML = '<p class="empty">Mənbə siyahısı yüklənmədi.</p>';
    });

  var MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avqust", "sentyabr", "oktyabr", "noyabr", "dekabr"];

  function whole(value) {
    var n = Number(value);
    if (!isFinite(n) || n < 0) return 0;
    return Math.round(n);
  }

  function formatDate(iso) {
    var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || "").trim());
    if (!match) return "";
    var month = MONTHS[Number(match[2]) - 1];
    if (!month) return "";
    return Number(match[3]) + " " + month + " " + match[1];
  }

  function percentLabel(processed, total) {
    if (!total) return "hesablanır";
    var pct = processed / total * 100;
    if (processed <= 0 || pct <= 0) return "0%";
    if (pct < 0.05) return "1%-dən az";
    if (pct < 10) return String(Math.round(pct * 10) / 10).replace(".", ",") + "%";
    return Math.round(pct) + "%";
  }

  function percentWidth(processed, total) {
    if (!total) return 0;
    return Math.max(0, Math.min(100, processed / total * 100));
  }

  function animateMeters(root) {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.querySelectorAll("[data-meter-fill]").forEach(function (fill) {
      var width = fill.getAttribute("data-width") || "0";
      if (reduce) {
        fill.style.width = width + "%";
        return;
      }
      fill.style.width = "0%";
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          fill.style.width = width + "%";
        });
      });
    });
  }

  function platformKnown(item) {
    return !!(item && item.total_known === true && whole(item.total) > 0);
  }

  function renderPlatform(item) {
    var name = esc(item && (item.label || item.key) || "");
    var note = item && item.note && String(item.note).trim()
      ? '<p class="platform-note">' + esc(String(item.note).trim()) + "</p>"
      : "";
    if (!platformKnown(item)) {
      return (
        '<li class="platform"><div class="platform-top"><b>' + name + "</b>" +
        '<span class="platform-count is-unknown">hesablanır</span></div>' +
        '<div class="meter is-unknown" aria-hidden="true"></div>' + note + "</li>"
      );
    }
    var total = whole(item.total);
    var processed = whole(item.processed);
    var label = percentLabel(processed, total);
    var width = percentWidth(processed, total);
    return (
      '<li class="platform"><div class="platform-top"><b>' + name + "</b>" +
      '<span class="platform-count">' + processed + " / " + total + " · " + esc(label) + "</span></div>" +
      '<div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + processed + '" aria-valuetext="' + esc(label + ", " + processed + " / " + total) + '" aria-label="' + name + '">' +
      '<i data-meter-fill data-width="' + width + '"></i></div>' + note + "</li>"
    );
  }

  function renderCompact(el, stats) {
    var unique = stats.unique_works || {};
    var total = whole(unique.total);
    var processed = whole(unique.processed);
    var known = total > 0;
    var label = known ? percentLabel(processed, total) : "hesablanır";
    var width = known ? percentWidth(processed, total) : 0;
    var line = el.querySelector("[data-stats-line]");
    var meter = el.querySelector("[data-meter]");
    var fill = el.querySelector("[data-meter-fill]");
    if (line) {
      line.innerHTML = known
        ? "Ümumi irəliləyiş: <b>" + esc(label) + "</b> <span>(" + processed + " / " + total + " unikal çıxış)</span>"
        : "Ümumi irəliləyiş: <b>hesablanır</b>";
    }
    if (meter) {
      meter.setAttribute("aria-valuemin", "0");
      meter.setAttribute("aria-valuemax", "100");
      meter.setAttribute("aria-valuenow", String(Math.round(width * 10) / 10));
      meter.setAttribute("aria-valuetext", known ? label + ", " + processed + " / " + total + " unikal çıxış" : "hesablanır");
    }
    if (fill) fill.setAttribute("data-width", String(width));
    animateMeters(el);
  }

  function renderDetail(el, stats) {
    var body = el.querySelector("[data-stats-body]");
    if (!body) return;
    var unique = stats.unique_works || {};
    var total = whole(unique.total);
    var processed = whole(unique.processed);
    var dupes = whole(unique.duplicates_merged);
    var known = total > 0;
    var label = known ? percentLabel(processed, total) : "hesablanır";
    var width = known ? percentWidth(processed, total) : 0;
    var date = formatDate(stats.updated);
    var platforms = Array.isArray(stats.platforms) ? stats.platforms : [];
    var bar = known
      ? '<div class="meter meter-lg" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + (Math.round(width * 10) / 10) + '" aria-valuetext="' + esc(label + ", " + processed + " / " + total + " unikal çıxış") + '" aria-label="Ümumi irəliləyiş"><i data-meter-fill data-width="' + width + '"></i></div>'
      : '<div class="meter meter-lg is-unknown" aria-hidden="true"></div>';
    var pair = known ? '<p class="stats-pair"><b>' + processed + "</b> / " + total + " unikal çıxış</p>" : "";
    body.innerHTML =
      '<div class="stats-overall">' +
      '<p class="stats-kicker">Ümumi irəliləyiş</p>' +
      '<p class="stats-pct">' + esc(label) + "</p>" +
      bar + pair +
      '<p class="stats-meta">Kitabxana doldurulur, bu faiz zamanla artacaq.</p>' +
      '<p class="dedupe">Eyni çıxış bir neçə platformada ola bilər, ümumi faiz təkrarlar çıxılmaqla hesablanır.</p>' +
      '<p class="stats-meta">Birləşdirilən təkrarlar: <b>' + dupes + "</b></p>" +
      (date ? '<p class="stats-meta">Son yenilənmə: <b>' + esc(date) + "</b></p>" : "") +
      "</div>" +
      '<h3 class="stats-sub">Platformalar</h3>' +
      '<p class="stats-legend">İşlənib / ümumi. İşlənib o deməkdir ki, çıxış transkripsiya edilərək indekslənib.</p>' +
      '<ul class="platforms">' + platforms.map(renderPlatform).join("") + "</ul>";
    animateMeters(body);
  }

  function failStats(id) {
    document.querySelectorAll('[data-stats="' + id + '"]').forEach(function (el) {
      var line = el.querySelector("[data-stats-line]");
      if (line) line.textContent = "Statistika yüklənmədi.";
      var body = el.querySelector("[data-stats-body]");
      if (body) body.innerHTML = '<p class="empty">Statistika yüklənmədi.</p>';
    });
  }

  var seen = [];
  document.querySelectorAll("[data-stats]").forEach(function (el) {
    var id = el.getAttribute("data-stats") || "";
    if (seen.indexOf(id) !== -1) return;
    seen.push(id);
    if (!/^[a-z0-9-]+$/.test(id)) {
      failStats(id);
      return;
    }
    fetch("/data/stats/" + id + ".json", { credentials: "same-origin", cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then(function (stats) {
        document.querySelectorAll('[data-stats="' + id + '"]').forEach(function (node) {
          if (node.hasAttribute("data-stats-compact")) renderCompact(node, stats);
          if (node.hasAttribute("data-stats-detail")) renderDetail(node, stats);
        });
      })
      .catch(function () { failStats(id); });
  });
})();
