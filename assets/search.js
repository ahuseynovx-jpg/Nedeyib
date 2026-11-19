/* Client-side search over one person's own words. No model, no paraphrase. */
(function (root) {
  var STOP = {
    ve: 1, bir: 1, bu: 1, da: 1, de: 1, ki: 1, ile: 1, ucun: 1, ne: 1, nece: 1,
    olan: 1, olur: 1, edir: 1, etmek: 1, amma: 1, ya: 1, daha: 1, cox: 1, en: 1,
    o: 1, hem: 1, hele: 1, artiq: 1, qeder: 1, kimi: 1, gore: 1, sonra: 1,
    men: 1, sen: 1, biz: 1, siz: 1, onlar: 1, var: 1, yox: 1, deyil: 1,
    lakin: 1, ancaq: 1, her: 1, butun: 1, onu: 1, ona: 1, onun: 1, bele: 1, ele: 1,
    ise: 1, ucun: 1, sadece: 1, cunki: 1, eger: 1, yeni: 1, oz: 1, ozu: 1,
    bu: 1, su: 1, hemin: 1, artiq: 1, lap: 1, cox: 1, az: 1, dir: 1
  };
  var SUFFIXES = [
    "larindan", "lerinden", "larinin", "lerinin", "larini", "lerini",
    "lardan", "lerden", "larda", "lerde", "lara", "lere", "lari", "leri",
    "lar", "ler", "dan", "den", "tan", "ten", "nin", "nun", "dir", "dur",
    "mis", "mus", "maq", "mek", "mak", "mek", "acaq", "ecek", "mali", "meli",
    "araq", "erek", "ib", "ub", "anda", "ende", "ince", "unca",
    "si", "su", "nin", "in", "un", "i", "u", "a", "e", "ya", "ye", "yi", "yu"
  ].filter(function (suf, i, all) { return all.indexOf(suf) === i; })
    .sort(function (a, b) { return b.length - a.length; });

  function fold(value) {
    return String(value || "")
      .toLocaleLowerCase("az")
      .replace(/\u0307/g, "")
      .replace(/ə/g, "a")
      .replace(/ı/g, "i")
      .replace(/ö/g, "o")
      .replace(/ü/g, "u")
      .replace(/ğ/g, "g")
      .replace(/ş/g, "s")
      .replace(/ç/g, "c");
  }

  function stem(token) {
    var word = token;
    var rounds = 0;
    while (word.length >= 6 && rounds < 2) {
      var next = "";
      for (var i = 0; i < SUFFIXES.length; i++) {
        var suf = SUFFIXES[i];
        if (suf.length < 2 && word.length < 7) continue;
        if (word.length - suf.length >= 4 && word.endsWith(suf)) {
          next = word.slice(0, -suf.length);
          break;
        }
      }
      if (!next || next === word) break;
      word = next;
      rounds++;
    }
    return word;
  }

  function normalizeQuery(text) {
    return fold(text)
      .replace(/(\d)[.\s](?=\d)/g, "$1")
      .replace(/[^a-z0-9\s]/g, " ");
  }

  function tokensOf(text) {
    var parts = normalizeQuery(text).split(/\s+/);
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      if (!parts[i] || parts[i].length < 2) continue;
      var word = stem(parts[i]);
      if (!word || word.length < 2 || STOP[word] || STOP[parts[i]]) continue;
      out.push(word);
    }
    return out;
  }

  function edit1(a, b) {
    if (a === b) return true;
    var la = a.length;
    var lb = b.length;
    if (Math.abs(la - lb) > 1) return false;
    var i = 0;
    var j = 0;
    var used = false;
    while (i < la && j < lb) {
      if (a.charCodeAt(i) === b.charCodeAt(j)) {
        i++;
        j++;
        continue;
      }
      if (used) return false;
      used = true;
      if (la === lb) {
        i++;
        j++;
      } else if (la > lb) i++;
      else j++;
    }
    return true;
  }

  function createEngine(chunks) {
    var docs = [];
    var df = new Map();
    var dictionary = [];
    chunks.forEach(function (chunk, index) {
      var words = tokensOf((chunk.title || "") + " " + (chunk.text || ""));
      var tf = new Map();
      words.forEach(function (word) {
        tf.set(word, (tf.get(word) || 0) + 1);
      });
      tf.forEach(function (_n, term) {
        if (!df.has(term)) dictionary.push(term);
        df.set(term, (df.get(term) || 0) + 1);
      });
      docs.push({ index: index, tf: tf, len: words.length || 1, chunk: chunk });
    });
    dictionary.sort();
    var avg = docs.reduce(function (sum, doc) { return sum + doc.len; }, 0) / (docs.length || 1);
    var k1 = 1.2;
    var b = 0.75;
    var N = docs.length;

    function expand(term) {
      if (df.has(term)) return [term];
      var prefix = [];
      if (term.length >= 4) {
        for (var i = 0; i < dictionary.length && prefix.length < 8; i++) {
          var key = dictionary[i];
          if (key.length < 4) continue;
          if (key.indexOf(term) === 0 || term.indexOf(key) === 0) prefix.push(key);
        }
      }
      if (prefix.length) return prefix;
      if (term.length < 5) return [];
      var fuzzy = [];
      for (var j = 0; j < dictionary.length && fuzzy.length < 6; j++) {
        var other = dictionary[j];
        if (Math.abs(other.length - term.length) > 1) continue;
        if (other.charCodeAt(0) !== term.charCodeAt(0)) continue;
        if (edit1(other, term)) fuzzy.push(other);
      }
      return fuzzy;
    }

    function idf(term) {
      var n = df.get(term) || 0;
      return Math.log(1 + (N - n + 0.5) / (n + 0.5));
    }

    function search(query) {
      var terms = [];
      var seen = {};
      tokensOf(query).forEach(function (term) {
        if (seen[term]) return;
        seen[term] = 1;
        var alts = expand(term);
        if (alts.length) terms.push(alts);
      });
      if (!terms.length) return [];
      var scores = new Map();
      terms.forEach(function (alts) {
        docs.forEach(function (doc) {
          var best = 0;
          for (var i = 0; i < alts.length; i++) {
            var term = alts[i];
            var freq = doc.tf.get(term) || 0;
            if (!freq) continue;
            var weight = idf(term) * (freq * (k1 + 1)) / (freq + k1 * (1 - b + b * doc.len / avg));
            if (weight > best) best = weight;
          }
          if (best > 0) scores.set(doc.index, (scores.get(doc.index) || 0) + best);
        });
      });
      return Array.from(scores.entries())
        .map(function (pair) { return { chunk: docs[pair[0]].chunk, score: pair[1] }; })
        .sort(function (a, b) { return b.score - a.score; });
    }

    return { search: search };
  }

  root.NEDEYIB_SEARCH = { createEngine: createEngine, fold: fold, tokensOf: tokensOf };

  if (!root.document || !document.querySelector("[data-search]")) return;

  var form = document.querySelector("[data-search]");
  var input = form.querySelector("input[name=q]");
  var resultsEl = document.querySelector("[data-search-results]");
  var enginePromise = null;

  function loadEngine() {
    if (!enginePromise) {
      enginePromise = fetch("/data/index/ferhad-pervizi.json", { credentials: "same-origin" })
        .then(function (res) {
          if (!res.ok) throw new Error(String(res.status));
          return res.json();
        })
        .then(function (data) {
          var chunks = data && Array.isArray(data.chunks) ? data.chunks : [];
          return createEngine(chunks);
        });
    }
    return enginePromise;
  }

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function clock(seconds) {
    var total = Math.max(0, Math.floor(Number(seconds) || 0));
    var mins = Math.floor(total / 60);
    var secs = total % 60;
    return mins + ":" + (secs < 10 ? "0" : "") + secs;
  }

  function foldMap(raw) {
    var folded = "";
    var map = [];
    for (var i = 0; i < raw.length; i++) {
      var piece = fold(raw.charAt(i));
      for (var j = 0; j < piece.length; j++) {
        folded += piece.charAt(j);
        map.push(i);
      }
    }
    return { folded: folded, map: map };
  }

  function highlight(text, query) {
    var raw = String(text || "").replace(/\s+/g, " ").trim();
    if (!raw) return "";
    var mapped = foldMap(raw);
    var terms = tokensOf(query).filter(function (term) { return term.length >= 3; });
    var marks = [];
    terms.forEach(function (term) {
      var from = 0;
      while (from < mapped.folded.length) {
        var at = mapped.folded.indexOf(term, from);
        if (at < 0) break;
        marks.push([mapped.map[at], mapped.map[at + term.length - 1] + 1]);
        from = at + term.length;
      }
    });
    marks.sort(function (a, b) { return a[0] - b[0] || b[1] - a[1]; });
    var merged = [];
    marks.forEach(function (span) {
      var last = merged[merged.length - 1];
      if (!last || span[0] > last[1]) merged.push(span.slice());
      else if (span[1] > last[1]) last[1] = span[1];
    });
    var start = 0;
    if (merged.length) {
      start = Math.max(0, merged[0][0] - 80);
      var space = raw.lastIndexOf(" ", start);
      if (space > start - 40) start = space + 1;
    }
    var end = Math.min(raw.length, start + 300);
    var slice = raw.slice(start, end);
    var sliceMap = foldMap(slice);
    var local = [];
    terms.forEach(function (term) {
      var from = 0;
      while (from < sliceMap.folded.length) {
        var at = sliceMap.folded.indexOf(term, from);
        if (at < 0) break;
        local.push([sliceMap.map[at], sliceMap.map[at + term.length - 1] + 1]);
        from = at + term.length;
      }
    });
    local.sort(function (a, b) { return a[0] - b[0]; });
    var html = "";
    var cursor = 0;
    local.forEach(function (span) {
      if (span[0] < cursor) return;
      html += esc(slice.slice(cursor, span[0])) + "<mark>" + esc(slice.slice(span[0], span[1])) + "</mark>";
      cursor = span[1];
    });
    html += esc(slice.slice(cursor));
    if (start > 0) html = "…" + html;
    if (end < raw.length) html += "…";
    return html;
  }

  function pick(hits) {
    var best = hits.length ? hits[0].score : 0;
    if (best < 1.15) return [];
    var chosen = [];
    var perUrl = {};
    for (var i = 0; i < hits.length && chosen.length < 5; i++) {
      var chunk = hits[i].chunk;
      var key = String(chunk.url || "").split("&t=")[0];
      if ((perUrl[key] || 0) >= 2) continue;
      if (hits[i].score < best * 0.35) break;
      perUrl[key] = (perUrl[key] || 0) + 1;
      chosen.push(hits[i]);
    }
    return chosen;
  }

  function renderHits(query, hits) {
    var chosen = pick(hits);
    if (!chosen.length) {
      resultsEl.innerHTML = '<p class="empty">Bu mövzuda hələ mənbə tapılmadı. Kitabxana doldurulur.</p>';
      return;
    }
    resultsEl.innerHTML = '<ol class="hits">' + chosen.map(function (hit) {
      var chunk = hit.chunk;
      var video = chunk.type === "video";
      var badge = video ? "Video" : "Bloq";
      var when = video && chunk.start != null ? '<span class="hit-time">' + clock(chunk.start) + "</span>" : "";
      var label = video ? "Videoda bax" : "Oxu";
      return (
        '<li class="hit">' +
        '<div class="hit-top"><span class="badge">' + badge + "</span>" + when + "</div>" +
        '<p class="hit-title">' + esc(chunk.title || "") + "</p>" +
        '<p class="excerpt">' + highlight(chunk.text, query) + "</p>" +
        '<a class="hit-link" href="' + esc(chunk.url) + '" target="_blank" rel="noopener noreferrer">' + label + "</a>" +
        "</li>"
      );
    }).join("") + "</ol>";
  }

  function run(query) {
    var q = String(query || "").trim();
    if (!q) {
      resultsEl.innerHTML = "";
      return;
    }
    resultsEl.innerHTML = '<p class="hint">Axtarılır…</p>';
    loadEngine().then(function (engine) {
      renderHits(q, engine.search(q));
    }).catch(function () {
      resultsEl.innerHTML = '<p class="empty">Axtarış faylı yüklənmədi.</p>';
    });
  }

  input.addEventListener("focus", function () { loadEngine(); });
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var q = input.value.trim();
    var path = location.pathname.replace(/\/$/, "") || "/ferhad-pervizi";
    history.replaceState(null, "", q ? path + "/?q=" + encodeURIComponent(q) : path + "/");
    run(q);
  });
  document.querySelectorAll("[data-q]").forEach(function (button) {
    button.addEventListener("click", function () {
      input.value = button.getAttribute("data-q");
      input.focus();
      form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit", { cancelable: true }));
    });
  });

  var initial = new URLSearchParams(location.search).get("q");
  if (initial) {
    input.value = initial;
    run(initial);
  }
})(typeof window !== "undefined" ? window : globalThis);
