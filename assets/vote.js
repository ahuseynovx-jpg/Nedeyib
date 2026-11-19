/* Counter adapter. Swap BASE (and the two paths) for a Cloudflare Worker later. */
(function (global) {
  var NAMESPACE = "nedeyib";
  var BASE = "https://abacus.jasoncameron.dev";
  var KEY = /^[A-Za-z0-9_.-]{3,64}$/;

  function endpoint(action, id) {
    if (!KEY.test(NAMESPACE) || !KEY.test(id)) throw new Error("bad key");
    return BASE + "/" + action + "/" + NAMESPACE + "/" + encodeURIComponent(id);
  }

  function asCount(data) {
    if (!data || typeof data.value !== "number" || !isFinite(data.value) || data.value < 0) {
      throw new Error("bad count");
    }
    return data.value;
  }

  async function read(id) {
    var res = await fetch(endpoint("get", id), { method: "GET", cache: "no-store" });
    if (res.status === 404) return 0;
    if (!res.ok) throw new Error("read " + res.status);
    return asCount(await res.json());
  }

  async function increment(id) {
    var res = await fetch(endpoint("hit", id), { method: "GET", cache: "no-store" });
    if (!res.ok) throw new Error("hit " + res.status);
    return asCount(await res.json());
  }

  global.NEDEYIB_COUNTER = { read: read, increment: increment, namespace: NAMESPACE };

  var STORE = "nedeyib-votes";
  var listEl = document.querySelector("[data-candidates]");
  var fallbackEl = document.querySelector("[data-vote-fallback]");
  if (!listEl) return;

  var candidates = [];
  var counts = {};
  var countsKnown = false;
  var loaded = false;
  var voted = loadVoted();
  var pending = {};

  function loadVoted() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORE) || "{}");
      if (!raw || typeof raw !== "object") return {};
      return raw;
    } catch (err) {
      return {};
    }
  }

  function saveVoted() {
    try { localStorage.setItem(STORE, JSON.stringify(voted)); } catch (err) {}
  }

  function showFallback() {
    if (fallbackEl) fallbackEl.hidden = false;
  }

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function totalVotes() {
    return candidates.reduce(function (sum, cand) {
      return sum + (counts[cand.id] || 0);
    }, 0);
  }

  function ordered() {
    return candidates.map(function (cand, index) {
      return { cand: cand, index: index, votes: countsKnown ? (counts[cand.id] || 0) : null };
    }).sort(function (a, b) {
      if (a.votes == null || b.votes == null || a.votes === b.votes) return a.index - b.index;
      return b.votes - a.votes;
    });
  }

  function render() {
    var all = totalVotes();
    listEl.innerHTML = ordered().map(function (row) {
      var cand = row.cand;
      var did = !!voted[cand.id];
      var busy = !!pending[cand.id];
      var countHtml = "";
      if (countsKnown) {
        var votes = counts[cand.id] || 0;
        var pct = all > 0 ? Math.round(votes / all * 100) : 0;
        countHtml =
          '<div class="cand-count"><b>' + votes + '</b> səs · ' + pct + '%</div>' +
          '<div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-valuetext="' + votes + ' səs, ' + pct + '%" aria-label="' + esc(cand.name) + '">' +
          '<i data-meter-fill data-width="' + pct + '" style="width:' + pct + '%"></i></div>';
      }
      return (
        '<li class="cand">' +
        '<div class="cand-top"><div class="cand-meta"><b>' + esc(cand.name) + '</b><span>' + esc(cand.role) + '</span></div>' +
        '<button type="button" class="vote-btn' + (did ? " done" : "") + '" data-vote="' + esc(cand.id) + '"' +
        (did || busy || !loaded ? " disabled" : "") + ' aria-pressed="' + (did ? "true" : "false") + '">' +
        (did ? "Səs verdin" : "Səs ver") + "</button></div>" +
        countHtml +
        "</li>"
      );
    }).join("");
  }

  listEl.addEventListener("click", function (event) {
    var button = event.target.closest("[data-vote]");
    if (!button || button.disabled) return;
    var id = button.getAttribute("data-vote");
    if (!loaded || !id || voted[id] || pending[id]) return;
    if (!candidates.some(function (cand) { return cand.id === id; })) return;
    pending[id] = true;
    var previous = counts[id];
    if (countsKnown) counts[id] = (counts[id] || 0) + 1;
    render();
    global.NEDEYIB_COUNTER.increment(id).then(function (value) {
      counts[id] = value;
      countsKnown = true;
      voted[id] = true;
      saveVoted();
    }).catch(function () {
      if (countsKnown) counts[id] = previous || 0;
      showFallback();
    }).then(function () {
      pending[id] = false;
      render();
    });
  });

  fetch("/data/candidates.json", { cache: "no-store" })
    .then(function (res) {
      if (!res.ok) throw new Error("candidates");
      return res.json();
    })
    .then(function (data) {
      var rows = data && Array.isArray(data.candidates) ? data.candidates : [];
      candidates = rows.filter(function (cand) {
        return cand && KEY.test(cand.id) && typeof cand.name === "string" && cand.name.trim() && typeof cand.role === "string";
      });
      if (!candidates.length) throw new Error("empty");
      render();
      return Promise.all(candidates.map(function (cand) {
        return global.NEDEYIB_COUNTER.read(cand.id).then(function (value) {
          counts[cand.id] = value;
        });
      })).then(function () {
        countsKnown = true;
      }).catch(function () {
        showFallback();
      });
    })
    .then(function () {
      loaded = true;
      render();
    })
    .catch(function () {
      showFallback();
      if (candidates.length) {
        loaded = true;
        render();
      } else listEl.innerHTML = '<li><span>Namizədlər yüklənmədi.</span></li>';
    });
})(window);
