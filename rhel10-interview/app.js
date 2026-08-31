/* RHEL 10 Interview Q&A app */
(function () {
  var QA = window.RHEL10_QA || [];
  var $ = function (s) { return document.querySelector(s); };
  var state = { topic: "", search: "", open: {} };

  // topics in order of first appearance
  var topics = [];
  QA.forEach(function (q) { if (topics.indexOf(q.t) === -1) topics.push(q.t); });
  $("#qCount").textContent = QA.length;
  $("#topicCount").textContent = topics.length;

  function esc(t) {
    return String(t).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; });
  }

  function renderChips() {
    var row = $("#topicChips");
    row.innerHTML = '<button class="chip' + (!state.topic ? " active" : "") + '" data-topic="">All topics</button>' +
      topics.map(function (t) {
        var n = QA.filter(function (q) { return q.t === t; }).length;
        return '<button class="chip' + (state.topic === t ? " active" : "") + '" data-topic="' + esc(t) + '">' + esc(t) + ' (' + n + ')</button>';
      }).join("");
    Array.prototype.forEach.call(row.querySelectorAll(".chip"), function (c) {
      c.onclick = function () { state.topic = c.getAttribute("data-topic"); renderChips(); render(); };
    });
  }

  function render() {
    var list = $("#qaList");
    var term = state.search.trim().toLowerCase();
    var shown = QA.map(function (q, i) { return { q: q, i: i }; }).filter(function (o) {
      var okTopic = !state.topic || o.q.t === state.topic;
      var okSearch = !term || (o.q.q + " " + o.q.a + " " + o.q.t).toLowerCase().indexOf(term) !== -1;
      return okTopic && okSearch;
    });

    $("#resultLine").textContent = shown.length + " of " + QA.length + " questions" + (state.topic ? " in " + state.topic : "");
    $("#noResults").classList.toggle("hidden", shown.length !== 0);

    list.innerHTML = shown.map(function (o, idx) {
      var q = o.q, n = o.i + 1, isOpen = !!state.open[o.i];
      return '<article class="qa-card' + (isOpen ? " open" : "") + '" data-i="' + o.i + '">' +
        '<div class="qa-head">' +
        '<span class="qa-num">' + n + '</span>' +
        '<div style="flex:1"><div class="qa-q">' + esc(q.q) + '</div><span class="qa-topic">' + esc(q.t) + '</span></div>' +
        '<span class="qa-toggle">▾</span>' +
        '</div>' +
        '<div class="qa-body"><div class="qa-body-inner">' +
        '<span class="ans-label">Answer</span><div class="qa-answer">' + esc(q.a) + '</div>' +
        '<span class="ans-label exp-label">Explanation / key point</span><div class="qa-explain">💡 ' + esc(q.e) + '</div>' +
        '</div></div></article>';
    }).join("");

    Array.prototype.forEach.call(list.querySelectorAll(".qa-card"), function (card) {
      card.querySelector(".qa-head").onclick = function () {
        var i = card.getAttribute("data-i");
        state.open[i] = !state.open[i];
        card.classList.toggle("open", state.open[i]);
        var body = card.querySelector(".qa-body");
        if (state.open[i]) body.style.maxHeight = body.scrollHeight + "px"; else body.style.maxHeight = null;
      };
    });
  }

  $("#search").addEventListener("input", function (e) { state.search = e.target.value; render(); });
  $("#expandAll").onclick = function () {
    QA.forEach(function (_, i) { state.open[i] = true; });
    render();
    Array.prototype.forEach.call(document.querySelectorAll(".qa-card"), function (card) {
      var body = card.querySelector(".qa-body"); body.style.maxHeight = body.scrollHeight + "px";
    });
  };
  $("#collapseAll").onclick = function () { state.open = {}; render(); };

  renderChips();
  render();
})();
