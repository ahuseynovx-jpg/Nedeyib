(function () {
  var form = document.querySelector("[data-ask]");
  if (!form) return;
  var input = form.querySelector("textarea");
  var button = form.querySelector("button");
  var out = document.querySelector("[data-ask-out]");
  var left = document.querySelector("[data-ask-left]");
  var url = "https://nedeyib-ask.social-hardware827-wvycc6.workers.dev/ask";

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function showLeft(remaining) {
    if (typeof remaining !== "number" || !left) return;
    left.hidden = false;
    left.textContent = "Bu gün qalan sual: " + remaining;
  }

  function render(data) {
    var sources = Array.isArray(data.sources) ? data.sources : [];
    var byN = {};
    sources.forEach(function (source) { byN[String(source.n)] = source; });
    var answer = esc(data.answer || "").replace(/\[(\d+)\]/g, function (_, n) {
      var source = byN[n];
      if (!source || !source.url) return "[" + n + "]";
      return '<a href="' + esc(source.url) + '" target="_blank" rel="noopener noreferrer">[' + n + "]</a>";
    });
    var list = sources.map(function (source) {
      var kind = source.type === "video" ? "Video" : source.type === "article" ? "Bloq" : esc(source.type || "");
      var date = source.date ? " · " + esc(source.date) : "";
      return "<li><a href=\"" + esc(source.url) + "\" target=\"_blank\" rel=\"noopener noreferrer\">[" + esc(source.n) + "] " + esc(source.title || source.url) + "</a> <span>" + kind + date + "</span></li>";
    }).join("");
    out.innerHTML = '<div class="ask-answer"><p>' + answer + "</p>" + (list ? '<ol class="ask-sources">' + list + "</ol>" : "") + "</div>";
    showLeft(data.remaining);
  }

  var ideas = [
    "10 000 manatla nə edim?",
    "Ailə büdcəsini necə qurum?",
    "Kreditdən necə qurtulum?",
    "Pulumu necə qoruyum?",
    "Əmanət qoymağa dəyərmi?",
    "Dollara keçim, yoxsa manatda qalım?",
    "Devalvasiya olanda nə etməli?",
    "İnflyasiya qənaəti yeyir?",
    "İpoteka götürməyə dəyərmi?",
    "Siyasi dəstək olmadan biznes qurmaq olar?",
    "Vergi sahibkara necə təsir edir?",
    "Qızıl yığmaq düzgündürmü?",
    "Pensiya üçün necə yığmalı?",
    "Daşınmaz əmlak bahalaşacaq?",
    "İnvestisiyaya haradan başlayım?"
  ];
  var suggest = document.querySelector("[data-suggest]");
  var suggestBtn = document.querySelector("[data-suggest-q]");
  var ideaIndex = 0;
  var timer = 0;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function showIdea(next) {
    if (!suggestBtn) return;
    ideaIndex = (next + ideas.length) % ideas.length;
    suggestBtn.textContent = ideas[ideaIndex];
  }

  function arm() {
    if (reduceMotion || !suggest) return;
    clearInterval(timer);
    timer = setInterval(function () {
      suggestBtn.classList.add("out");
      setTimeout(function () {
        showIdea(ideaIndex + 1);
        suggestBtn.classList.remove("out");
      }, 350);
    }, 4000);
  }

  showIdea(0);
  arm();
  if (suggest) {
    suggest.addEventListener("mouseenter", function () { clearInterval(timer); });
    suggest.addEventListener("mouseleave", arm);
    suggest.addEventListener("focusin", function () { clearInterval(timer); });
    suggest.addEventListener("focusout", arm);
  }
  if (suggestBtn) {
    suggestBtn.addEventListener("click", function () {
      input.value = suggestBtn.textContent;
      input.focus();
    });
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var question = input.value.trim().slice(0, 500);
    if (!question) return;
    input.value = question;
    button.disabled = true;
    out.innerHTML = '<p class="hint">Cavab hazırlanır…</p>';
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: question, person: "ferhad-pervizi" })
    }).then(function (res) {
      return res.json().then(function (data) { return { status: res.status, data: data || {} }; }, function () { return { status: res.status, data: {} }; });
    }).then(function (result) {
      if (result.status === 429 || result.status === 503 || result.status !== 200 || typeof result.data.answer !== "string") {
        out.innerHTML = '<p class="vote-fallback">' + esc(result.data.error || "Sual göndərilmədi.") + "</p>";
        showLeft(result.data.remaining);
        return;
      }
      render(result.data);
    }).catch(function () {
      out.innerHTML = '<p class="vote-fallback">Sual göndərilmədi.</p>';
    }).then(function () {
      button.disabled = false;
    });
  });
})();
