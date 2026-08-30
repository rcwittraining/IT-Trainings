/* ===== RCW Certification Exam Simulator engine ===== */
(function () {
  const BANKS = window.EXAM_BANKS || {};
  const $ = (id) => document.getElementById(id);

  const views = { home: $("view-home"), quiz: $("view-quiz"), results: $("view-results") };
  function show(view) {
    Object.values(views).forEach((v) => v.classList.add("hidden"));
    views[view].classList.remove("hidden");
    window.scrollTo(0, 0);
  }

  /* ---------- utilities ---------- */
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function fmt(sec) {
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    const mm = String(m).padStart(2, "0"), ss = String(s).padStart(2, "0");
    return (h > 0 ? h + ":" + mm + ":" + ss : mm + ":" + ss);
  }
  const LETTERS = ["A", "B", "C", "D"];

  /* ---------- state ---------- */
  let state = null;
  let timerInt = null;

  /* ---------- home ---------- */
  function renderHome() {
    const grid = $("exam-grid");
    grid.innerHTML = "";
    let total = 0;
    Object.values(BANKS).forEach((b) => {
      total += b.questions.length;
      const card = document.createElement("div");
      card.className = "exam-card";
      card.innerHTML = `
        <div class="vendor">${b.vendor}</div>
        <h3>${b.title} <span class="code">${b.code}</span></h3>
        <p>${b.description}</p>
        <div class="exam-stats">
          <span>📝 ${b.questions.length} questions</span>
          <span>🎯 Pass ${b.passPercent}%</span>
        </div>
        <div class="exam-config">
          <label>Questions</label>
          <select data-role="count">
            <option value="20">20 questions — quick check</option>
            <option value="50">50 questions — practice</option>
            <option value="100">100 questions — full exam</option>
            <option value="${b.questions.length}">All (${b.questions.length})</option>
          </select>
          <label>Mode</label>
          <div class="mode-toggle">
            <button class="active" data-mode="practice" data-role="mode-btn">📖 Practice</button>
            <button data-mode="exam" data-role="mode-btn">⏱ Timed Exam</button>
          </div>
          <button class="btn btn-primary" data-role="start">Start ${b.title} →</button>
        </div>`;
      const modeBtns = card.querySelectorAll("[data-role=mode-btn]");
      modeBtns.forEach((btn) =>
        btn.addEventListener("click", () => {
          modeBtns.forEach((x) => x.classList.remove("active"));
          btn.classList.add("active");
        })
      );
      card.querySelector("[data-role=start]").addEventListener("click", () => {
        const count = Math.min(parseInt(card.querySelector("[data-role=count]").value, 10), b.questions.length);
        const mode = card.querySelector("[data-role=mode-btn].active").dataset.mode;
        startExam(b, count, mode);
      });
      grid.appendChild(card);
    });
    $("total-questions").textContent = total.toLocaleString();
  }

  /* ---------- exam setup ---------- */
  function startExam(bank, count, mode) {
    const picked = shuffle(bank.questions).slice(0, count).map((q) => {
      // shuffle options, remap correct index
      const idx = shuffle([0, 1, 2, 3]);
      const options = idx.map((i) => q.o[i]);
      return { q: q.q, o: options, a: idx.indexOf(q.a), e: q.e, c: q.c };
    });
    state = {
      bank, mode, questions: picked,
      answers: new Array(picked.length).fill(-1),
      flags: new Set(), current: 0,
      timeLeft: mode === "exam" ? count * 75 : 0,
      reviewed: new Set() // practice: questions already answered
    };
    $("quiz-title").textContent = `${bank.title} (${bank.code})`;
    $("quiz-mode-label").textContent = mode === "exam" ? "TIMED EXAM" : "PRACTICE";
    clearInterval(timerInt);
    startTimer();
    show("quiz");
    renderQuestion();
  }

  function startTimer() {
    updateTimer();
    timerInt = setInterval(() => {
      if (state.mode === "exam") {
        state.timeLeft--;
        if (state.timeLeft <= 0) { clearInterval(timerInt); finishExam(true); return; }
      } else {
        state.timeLeft++;
      }
      updateTimer();
    }, 1000);
  }
  function updateTimer() {
    const t = $("quiz-timer");
    t.textContent = fmt(state.mode === "exam" ? state.timeLeft : state.timeLeft);
    t.classList.toggle("low", state.mode === "exam" && state.timeLeft <= 60);
  }

  /* ---------- question rendering ---------- */
  function renderQuestion() {
    const i = state.current, q = state.questions[i];
    $("q-number").textContent = `Question ${i + 1} of ${state.questions.length}`;
    $("q-category").textContent = q.c;
    $("q-text").textContent = q.q;

    const flagBtn = $("btn-flag");
    flagBtn.classList.toggle("flagged", state.flags.has(i));
    flagBtn.innerHTML = state.flags.has(i) ? "🚩 Flagged" : "🏳 Flag";

    const opts = $("options");
    opts.innerHTML = "";
    const answered = state.answers[i] !== -1;
    const locked = state.mode === "practice" && state.reviewed.has(i);

    q.o.forEach((text, j) => {
      const div = document.createElement("div");
      div.className = "option";
      if (state.answers[i] === j) div.classList.add("selected");
      if (locked) {
        div.classList.add("disabled");
        if (j === q.a) div.classList.add("correct");
        if (state.answers[i] === j && j !== q.a) div.classList.add("wrong");
      }
      div.innerHTML = `<span class="letter">${LETTERS[j]}</span><span>${text}</span>`;
      div.addEventListener("click", () => {
        if (locked) return;
        state.answers[i] = j;
        if (state.mode === "practice") {
          state.reviewed.add(i);
          autoAdvance(i);
        }
        renderQuestion();
      });
      opts.appendChild(div);
    });

    // explanation (practice after answering)
    const exp = $("explanation");
    if (locked) {
      const correct = state.answers[i] === q.a;
      exp.classList.remove("hidden", "good", "bad");
      exp.classList.add(correct ? "good" : "bad");
      $("exp-head").textContent = correct ? "✅ Correct" : "❌ Incorrect — the correct answer is " + LETTERS[q.a];
      $("exp-text").textContent = q.e;
    } else {
      exp.classList.add("hidden");
    }

    $("btn-prev").disabled = i === 0;
    $("btn-next").innerHTML = i === state.questions.length - 1 ? "Review & finish ✓" : "Next →";
    const answeredCount = state.answers.filter((a) => a !== -1).length;
    $("answered-count").textContent = `${answeredCount} of ${state.questions.length} answered`;
    $("progress-bar").style.width = ((i + 1) / state.questions.length * 100) + "%";
    renderPalette();
  }

  function autoAdvance(i) {
    // brief delay so user sees the color, then go next in practice mode
    setTimeout(() => {
      if (state && state.current === i && i < state.questions.length - 1) {
        state.current++;
        renderQuestion();
      }
    }, 900);
  }

  function renderPalette() {
    const pal = $("palette");
    pal.innerHTML = "";
    state.questions.forEach((_, i) => {
      const c = document.createElement("button");
      c.className = "pal-cell";
      if (state.answers[i] !== -1) c.classList.add("answered");
      if (i === state.current) c.classList.add("current");
      if (state.flags.has(i)) c.classList.add("flagged");
      c.textContent = i + 1;
      c.addEventListener("click", () => { state.current = i; renderQuestion(); });
      pal.appendChild(c);
    });
  }

  /* ---------- navigation ---------- */
  $("btn-prev").addEventListener("click", () => { if (state.current > 0) { state.current--; renderQuestion(); } });
  $("btn-next").addEventListener("click", () => {
    if (state.current < state.questions.length - 1) { state.current++; renderQuestion(); }
    else finishExam(false);
  });
  $("btn-flag").addEventListener("click", () => {
    const i = state.current;
    state.flags.has(i) ? state.flags.delete(i) : state.flags.add(i);
    renderQuestion();
  });
  $("btn-submit").addEventListener("click", () => finishExam(false));
  $("btn-quit").addEventListener("click", () => {
    if (confirm("Quit this exam? Your progress will be lost.")) { clearInterval(timerInt); state = null; show("home"); }
  });

  document.addEventListener("keydown", (e) => {
    if (!state || views.quiz.classList.contains("hidden")) return;
    if (state.mode === "exam" && ["a", "b", "c", "d"].includes(e.key.toLowerCase())) {
      const j = ["a", "b", "c", "d"].indexOf(e.key.toLowerCase());
      state.answers[state.current] = j;
      renderQuestion();
    }
    if (e.key === "ArrowLeft" && state.current > 0) { state.current--; renderQuestion(); }
    if (e.key === "ArrowRight" && state.current < state.questions.length - 1) { state.current++; renderQuestion(); }
  });

  /* ---------- finish / results ---------- */
  function finishExam(auto) {
    const unanswered = state.answers.filter((a) => a === -1).length;
    if (!auto && state.mode === "exam" && unanswered > 0) {
      if (!confirm(`You still have ${unanswered} unanswered question(s). Submit anyway?`)) return;
    }
    clearInterval(timerInt);
    renderResults();
    show("results");
  }

  function renderResults() {
    const qs = state.questions;
    const total = qs.length;
    let correct = 0;
    const cats = {};
    qs.forEach((q, i) => {
      const ok = state.answers[i] === q.a;
      if (ok) correct++;
      if (!cats[q.c]) cats[q.c] = { total: 0, correct: 0 };
      cats[q.c].total++;
      if (ok) cats[q.c].correct++;
    });
    const pct = Math.round((correct / total) * 100);
    const passed = pct >= state.bank.passPercent;

    // ring
    const ring = $("score-ring");
    ring.classList.toggle("fail", !passed);
    ring.style.background = `conic-gradient(${passed ? "var(--ok)" : "var(--bad)"} ${pct * 3.6}deg, var(--card2) ${pct * 3.6}deg 360deg)`;
    $("score-pct").textContent = pct + "%";
    $("score-fraction").textContent = `${correct} / ${total} correct`;
    $("result-verdict").textContent = passed ? "🎉 You passed!" : "📚 Keep practicing";
    const timeUsed = state.mode === "exam" ? (total * 75 - state.timeLeft) : state.timeLeft;
    $("result-sub").textContent = `${state.bank.fullTitle} — pass mark ${state.bank.passPercent}%. ${state.mode === "exam" ? "Timed exam" : "Practice mode"} · time ${fmt(timeUsed)}.`;

    const wrong = total - correct;
    const flagged = state.flags.size;
    $("result-stats").innerHTML = `
      <div class="rs"><b style="color:var(--ok)">${correct}</b><small>Correct</small></div>
      <div class="rs"><b style="color:var(--bad)">${wrong}</b><small>Incorrect</small></div>
      <div class="rs"><b>${flagged}</b><small>Flagged</small></div>
      <div class="rs"><b>${state.bank.passPercent}%</b><small>Pass mark</small></div>`;

    // category bars
    const barWrap = $("category-bars");
    barWrap.innerHTML = "";
    Object.entries(cats).sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total)).forEach(([name, d]) => {
      const p = Math.round((d.correct / d.total) * 100);
      const row = document.createElement("div");
      row.className = "cat-row";
      row.innerHTML = `
        <div class="cat-label"><span>${name}</span><span class="pct">${d.correct}/${d.total} · ${p}%</span></div>
        <div class="cat-track"><div class="cat-fill ${p < 60 ? "weak" : ""}" style="width:${p}%"></div></div>`;
      barWrap.appendChild(row);
    });

    // review list
    const list = $("review-list");
    list.innerHTML = "";
    qs.forEach((q, i) => {
      const item = document.createElement("div");
      item.className = "review-item";
      item.dataset.correct = state.answers[i] === q.a ? "1" : "0";
      item.dataset.flagged = state.flags.has(i) ? "1" : "0";
      const ok = state.answers[i] === q.a;
      const given = state.answers[i];
      let optsHtml = "";
      q.o.forEach((t, j) => {
        let cls = "", mark = "";
        if (j === q.a) { cls = "is-correct"; mark = "✔"; }
        if (j === given && j !== q.a) { cls = "is-wrong"; mark = "✘"; }
        if (j === given && j === q.a) mark = "✔";
        if (!mark && j === given) mark = "•";
        optsHtml += `<div class="ri-opt ${cls}"><span class="mark">${mark || " "}</span>${LETTERS[j]}. ${t}</div>`;
      });
      const givenTxt = given === -1 ? "Not answered" : `You answered ${LETTERS[given]}`;
      item.innerHTML = `
        <div class="ri-head">
          <span class="ri-tag ${ok ? "ok" : "no"}">${ok ? "✅ Correct" : "❌ Incorrect"}</span>
          ${state.flags.has(i) ? '<span class="ri-tag flag">🏳 Flagged</span>' : ""}
          <span class="ri-cat">Q${i + 1} · ${q.c} · ${givenTxt}</span>
        </div>
        <h4>${q.q}</h4>
        ${optsHtml}
        <div class="ri-exp">💡 ${q.e}</div>`;
      list.appendChild(item);
    });
    setReviewFilter("all");
  }

  function setReviewFilter(f) {
    document.querySelectorAll(".filter-btn").forEach((b) => b.classList.toggle("active", b.dataset.filter === f));
    document.querySelectorAll(".review-item").forEach((item) => {
      let show = true;
      if (f === "wrong") show = item.dataset.correct === "0";
      if (f === "correct") show = item.dataset.correct === "1";
      if (f === "flagged") show = item.dataset.flagged === "1";
      item.classList.toggle("hidden", !show);
    });
  }
  document.querySelectorAll(".filter-btn").forEach((b) =>
    b.addEventListener("click", () => setReviewFilter(b.dataset.filter))
  );

  $("btn-retry").addEventListener("click", () => {
    const { bank, mode } = state;
    const n = state.questions.length;
    startExam(bank, n, mode);
  });
  $("btn-home").addEventListener("click", () => { state = null; show("home"); });
  document.querySelectorAll("[data-nav=home]").forEach((a) =>
    a.addEventListener("click", (e) => { e.preventDefault(); show("home"); })
  );

  renderHome();
  show("home");
})();
