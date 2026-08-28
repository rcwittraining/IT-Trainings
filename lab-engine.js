/* RCW IT Training — generic config-driven lab engine.
   Each lab page sets `window.RCW_LAB = { ...config }` then loads this script.
   It builds the full UI (welcome → lab → result) and runs the challenge from config. */
(() => {
  "use strict";
  const C = window.RCW_LAB;
  const root = document.getElementById("labRoot");
  const host = C.host || "lab-node-01";
  const user = C.user || "student";
  const accent = C.accent || "#0ba8ee";
  const badge = C.badge || "LAB";

  // ---- virtual filesystem from config ----
  const dirs = new Set(C.dirs || []);
  const files = { ...(C.files || {}) };
  (C.dirs || []).forEach((d) => dirs.add(d));

  const state = {
    name: "",
    done: new Set(),
    score: 0,
    hist: [], hIdx: 0, count: 0,
    startedAt: 0, elapsed: 0, timer: null,
    completed: false, certId: ""
  };

  // ================= DOM =================
  root.innerHTML = `
  <div class="ambient ambient-one" aria-hidden="true"></div>
  <div class="ambient ambient-two" aria-hidden="true"></div>
  <header class="site-header">
    <a class="brand" href="#" aria-label="RCW IT Training home">
      <span class="brand-mark" aria-hidden="true"><span>&gt;_</span></span>
      <span class="brand-copy"><strong>RCW</strong><small>IT TRAINING</small></span>
    </a>
    <div class="header-actions">
      <span class="secure-chip"><span class="status-dot"></span> Private lab session</span>
      <button class="icon-button" id="fullscreenButton" type="button" aria-label="Enter focus mode" title="Focus mode">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/></svg>
      </button>
    </div>
  </header>
  <main>
    <section class="screen welcome-screen is-active" id="welcomeScreen">
      <div class="welcome-grid">
        <div class="welcome-copy">
          <span class="eyebrow"><span class="eyebrow-icon">⌁</span> ${C.category}</span>
          <h1>${C.headline || C.title}</h1>
          <p class="lead">${C.lead || ""}</p>
          ${C.incident ? `<div class="incident-chip">${C.incident}</div>` : ""}
          <div class="feature-row">
            <div><strong>${C.objectives.length}</strong><span>objectives</span></div>
            <div><strong>${C.minutes || 10}</strong><span>minute target</span></div>
            <div><strong>100</strong><span>points</span></div>
          </div>
        </div>
        <div class="entry-card">
          <div class="entry-card-top"><span class="terminal-mini"><i></i><i></i><i></i></span><span>Session setup</span></div>
          <div class="entry-card-body">
            <div class="challenge-emblem" aria-hidden="true"><span style="font-size:30px;font-weight:900;color:${accent}">${badge}</span></div>
            <h2>${C.title}</h2>
            <p>Enter your name exactly as it should appear on your certificate.</p>
            <form id="startForm" novalidate>
              <label for="learnerName">Full name</label>
              <div class="input-wrap">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
                <input id="learnerName" type="text" autocomplete="name" maxlength="60" placeholder="e.g. Ananya Kumar" required>
              </div>
              <p class="field-error" id="nameError" role="alert"></p>
              <button class="primary-button" type="submit">Start challenge <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
            </form>
            <p class="privacy-note"><svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>Your lab runs entirely in this browser. No account is required.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="screen lab-screen" id="labScreen">
      <div class="lab-topline">
        <div><span class="eyebrow">Hands-on assessment</span><h1>${C.title}</h1></div>
        <div class="session-metrics">
          <div><span>TIME</span><strong id="timer">00:00</strong></div>
          <div><span>SCORE</span><strong><b id="score">0</b>/100</strong></div>
        </div>
      </div>
      <div class="lab-layout rca-layout">
        <aside class="brief-panel">
          <div class="panel-heading"><div><span class="panel-kicker">Mission brief</span><h2>${C.brief || C.title}</h2></div><span class="difficulty">${C.difficulty || "BEGINNER"}</span></div>
          <p class="brief-copy">${C.briefCopy || ""}</p>
          <ol class="task-list" id="taskList"></ol>
          <div class="progress-block">
            <div><span>Progress</span><strong id="progressText">0 of ${C.objectives.length} complete</strong></div>
            <div class="progress-track"><span id="progressBar"></span></div>
          </div>
          <details class="hint-box"><summary><span>Need a hint?</span><small>Open guide</small></summary><div>${(C.hint || []).map((h) => `<p>${h}</p>`).join("")}</div></details>
          <button class="text-button" id="resetButton" type="button"><svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5"/></svg>Reset challenge</button>
        </aside>
        <div class="terminal-card">
          <div class="terminal-bar"><div class="window-dots"><i></i><i></i><i></i></div><div class="terminal-title">${host} — ${C.shell || "bash"}</div><div class="terminal-status"><span></span>ISOLATED · SIMULATED</div></div>
          <div class="terminal-body" id="terminalBody" role="log" aria-live="polite">
            <div class="terminal-welcome">
              <pre aria-hidden="true">  ____   _______        __
 |  _ \\ / ___\\\\ \\      / /
 | |_) | |    \\ \\ /\\ / /
 |  _ <| |___  \\ V  V /
 |_| \\_\\\\____|  \\_/\\_/   </pre>
              <p>RCW Practice Environment</p><small>Enter <b>help</b> for available commands.</small>
            </div>
            <div id="terminalOutput"></div>
            <form class="terminal-input-line" id="terminalForm" autocomplete="off">
              <label for="commandInput"><span class="prompt-user" id="promptUser">${user}@${host}</span><span class="prompt-path" id="promptPath">:~$</span></label>
              <input id="commandInput" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" enterkeyhint="send">
            </form>
          </div>
          <div class="terminal-footer"><span><kbd>Enter</kbd> run command</span><span><kbd>↑</kbd><kbd>↓</kbd> history</span><span class="footer-safe"><svg viewBox="0 0 24 24"><path d="m12 3 7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3Z"/><path d="m9 12 2 2 4-4"/></svg>Safe simulation</span></div>
        </div>
      </div>
    </section>

    <section class="screen result-screen" id="resultScreen">
      <div class="result-header">
        <div class="success-orbit"><span><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg></span></div>
        <span class="eyebrow">Challenge completed</span>
        <h1>Excellent work, <span id="resultName">Learner</span>!</h1>
        <p>${C.resultCopy || ""}</p>
      </div>
      <div class="result-grid">
        <div class="score-card">
          <span class="panel-kicker">Final score</span>
          <div class="score-ring" style="--score: 100"><div><strong>100</strong><span>/ 100</span></div></div>
          <div class="score-verdict"><span>PERFECT SCORE</span><p>${C.verdict || "All objectives passed"}</p></div>
          <dl>
            <div><dt>Objectives</dt><dd id="finalObj">0 / ${C.objectives.length}</dd></div>
            <div><dt>Completion time</dt><dd id="finalTime">00:00</dd></div>
            <div><dt>Commands entered</dt><dd id="commandCount">0</dd></div>
          </dl>
        </div>
        <div class="certificate-card">
          <div class="certificate-card-head"><div><span class="panel-kicker">Your achievement</span><h2>Certificate ready</h2></div><span class="pdf-chip">PDF</span></div>
          <div class="certificate-preview-wrap"><canvas id="certificateCanvas" width="1400" height="990" aria-label="Certificate preview"></canvas></div>
          <div class="certificate-actions">
            <button class="primary-button" id="downloadPdfButton" type="button"><svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>Download certificate PDF</button>
            <button class="secondary-button" id="downloadPngButton" type="button">Save image</button>
          </div>
          <p class="certificate-note"><svg viewBox="0 0 24 24"><path d="m12 3 7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3Z"/><path d="m9 12 2 2 4-4"/></svg>Issued by RCW IT Training and signed by Pradeep Raju.</p>
        </div>
      </div>
      <button class="text-button replay-button" id="replayButton" type="button"><svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5"/></svg>Try the challenge again</button>
      <a class="primary-button passport-link" href="../skill-passport.html" style="display:flex;align-items:center;justify-content:center;gap:8px;max-width:340px;margin:18px auto 0;text-decoration:none">🎖️ View your Skill Passport</a>
    </section>
  </main>
  <div class="toast" id="toast" role="status" aria-live="polite"><span></span><p></p></div>
  <img id="instructorImage" src="assets/pradeep-raju.jpg" alt="" hidden>`;

  const $ = (s) => root.querySelector(s);
  const screens = { welcome: $("#welcomeScreen"), lab: $("#labScreen"), result: $("#resultScreen") };
  const terminalBody = $("#terminalBody"), terminalOutput = $("#terminalOutput"), terminalForm = $("#terminalForm"), commandInput = $("#commandInput");
  const timerEl = $("#timer"), scoreEl = $("#score"), progressText = $("#progressText"), progressBar = $("#progressBar");
  const certificateCanvas = $("#certificateCanvas"), instructorImage = $("#instructorImage");

  // build task list
  const taskList = $("#taskList");
  C.objectives.forEach((o, i) => {
    const li = document.createElement("li");
    li.id = "task" + i;
    li.innerHTML = `<span class="task-state"><span>${i + 1}</span><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg></span>
      <div><strong>${o.name}</strong><p>${o.desc}</p></div><em>${o.points} pts</em>`;
    taskList.appendChild(li);
  });

  function showScreen(n) { Object.values(screens).forEach((s) => s.classList.remove("is-active")); screens[n].classList.add("is-active"); window.scrollTo({ top: 0, behavior: "smooth" }); }

  function cleanName(v) { return v.replace(/\s+/g, " ").trim(); }
  function validName(v) { return v.length >= 2 && /[\p{L}]/u.test(v) && /^[\p{L}\p{M} .'-]+$/u.test(v); }

  $("#startForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const n = cleanName($("#learnerName").value);
    if (!validName(n)) { $("#learnerName").setAttribute("aria-invalid", "true"); $("#nameError").textContent = "Enter a valid full name."; $("#learnerName").focus(); return; }
    state.name = n;
    reset();
    (C.intro || []).forEach((l) => out(l, "warning"));
    showScreen("lab"); startTimer(); setTimeout(() => commandInput.focus(), 180);
  });

  function reset() {
    clearInterval(state.timer);
    state.done = new Set(); state.score = 0; state.hist = []; state.hIdx = 0; state.count = 0;
    state.startedAt = Date.now(); state.elapsed = 0; state.completed = false; state.certId = "";
    terminalOutput.innerHTML = ""; commandInput.value = ""; commandInput.disabled = false;
    timerEl.textContent = "00:00"; update();
  }

  function startTimer() { clearInterval(state.timer); state.startedAt = Date.now(); state.timer = setInterval(() => { state.elapsed = Math.floor((Date.now() - state.startedAt) / 1000); timerEl.textContent = fmt(state.elapsed); }, 250); }
  function fmt(t) { return Math.floor(t / 60).toString().padStart(2, "0") + ":" + String(Math.floor(t % 60)).padStart(2, "0"); }

  terminalForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (state.completed) return;
    const raw = commandInput.value.trim(); commandInput.value = "";
    if (!raw) return;
    cmdLine(raw); state.hist.push(raw); state.hIdx = state.hist.length; state.count++;
    generic(raw);
    checkObjectives(raw);
    scroll();
  });

  commandInput.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") { e.preventDefault(); if (state.hist.length) { state.hIdx = Math.max(0, state.hIdx - 1); commandInput.value = state.hist[state.hIdx] || ""; } }
    if (e.key === "ArrowDown") { e.preventDefault(); if (state.hist.length) { state.hIdx = Math.min(state.hist.length, state.hIdx + 1); commandInput.value = state.hist[state.hIdx] || ""; } }
  });
  terminalBody.addEventListener("click", () => { if (!state.completed) commandInput.focus(); });

  // ---- objective matching (sequential: only the first uncompleted objective) ----
  function checkObjectives(raw) {
    for (let i = 0; i < C.objectives.length; i++) {
      if (state.done.has(i)) continue;
      const o = C.objectives[i];
      if (o.requires && o.requires.some((r) => !state.done.has(r))) return;
      const hit = o.match.some((m) => new RegExp(m, "i").test(raw));
      if (hit) mark(i, o);
      return;
    }
  }
  function mark(i, o) {
    if (state.done.has(i)) return;
    state.done.add(i);
    state.score += o.points;
    out(o.success || ("✓ Objective passed. +" + o.points + " points"), "success");
    if (o.response) out(o.response);
    update();
    toast(o.name + " complete!");
    if (state.done.size === C.objectives.length) complete();
  }

  // ---- generic shell (exploration) ----
  function generic(raw) {
    let cmd = raw; if (/^sudo\s+/i.test(cmd)) cmd = cmd.replace(/^sudo\s+/i, "");
    const t = tok(cmd); const c = (t.shift() || "").toLowerCase(); const a = t;
    const L = cmd.toLowerCase();
    switch (c) {
      case "pwd": out("/home/" + user); break;
      case "whoami": out(user); break;
      case "hostname": out(a.includes("-I") ? "192.168.1.10" : host); break;
      case "uname": out(a.includes("-a") ? "Linux " + host + " 6.12.0-55.el10.x86_64 x86_64 GNU/Linux" : "Linux"); break;
      case "date": out("Sun Aug 16 14:00:00 IST 2026"); break;
      case "id": out("uid=1000(" + user + ") gid=1000(" + user + ") groups=1000(" + user + "),10(wheel)"); break;
      case "ls": ls(a, L); break;
      case "cat": cat(a); break;
      case "head": head(a, L, false); break;
      case "tail": head(a, L, true); break;
      case "grep": grep(a, L); break;
      case "wc": wc(a); break;
      case "sort": sort(a); break;
      case "file": fileCmd(a); break;
      case "stat": statCmd(a); break;
      case "find": findCmd(a); break;
      case "echo": out(a.join(" ")); break;
      case "touch": a.filter((x) => !x.startsWith("-")).forEach((p) => { files[res(p)] = files[res(p)] || ""; }); break;
      case "mkdir": a.filter((x) => !x.startsWith("-")).forEach((p) => dirs.add(res(p))); break;
      case "clear": terminalOutput.innerHTML = ""; break;
      case "history": out(state.hist.map((h, i) => String(i + 1).padStart(4, " ") + "  " + h).join("\n")); break;
      case "help": out(C.help || "Type commands to complete the objectives. Common: pwd ls cat grep head tail wc sort find echo clear history"); break;
      case "": break;
      default: if (!matchedAny(raw)) out("bash: " + c + ": command not found", "error");
    }
  }
  // avoid "command not found" for commands that are actually objective hits
  function matchedAny(raw) { return C.objectives.some((o) => o.match.some((m) => new RegExp(m, "i").test(raw))); }

  // path + fs helpers
  let cwd = "/home/" + user;
  function res(p) { if (p === "~") return "/home/" + user; if (p.startsWith("~/")) return "/home/" + user + p.slice(1); if (p.startsWith("/")) return p; return cwd + "/" + p; }
  function isDir(p) { return dirs.has(p) || p === "/"; }
  function children(dir) { const pre = dir === "/" ? "/" : dir + "/"; const s = new Set(); dirs.forEach((d) => { if (d.startsWith(pre)) { const r = d.slice(pre.length); if (r && !r.includes("/")) s.add(r + "/"); } }); Object.keys(files).forEach((f) => { if (f.startsWith(pre)) { const r = f.slice(pre.length); if (r && !r.includes("/")) s.add(r); } }); return [...s].sort(); }

  function ls(a, L) {
    const long = /-l/.test(L); const all = /-a/.test(L); const inode = /-i/.test(L);
    const target = a.filter((x) => !x.startsWith("-")).pop() || "";
    const p = target ? res(target) : cwd;
    if (!isDir(p)) { out("ls: cannot access '" + target + "': No such file or directory", "error"); return; }
    let names = children(p); if (all) names = ["./", "../", ...names];
    if (long) {
      const lines = [];
      names.forEach((n) => { const isD = n.endsWith("/"); const nm = isD ? n.slice(0, -1) : n; const f = p === "/" ? "/" + nm : p + "/" + nm; lines.push((isD ? "drwxr-xr-x." : "-rw-r--r--.") + "  1 " + user + " " + user + " " + String(isD ? 4096 : (files[f] || "").length).padStart(5, " ") + " Aug 16 14:00 " + (inode ? (nm.length ? "525" + nm.length : "525196") + " " : "") + nm); });
      out(lines.join("\n"));
    } else out(names.join("  "));
  }
  function cat(a) { const t = a.filter((x) => !x.startsWith("-")).pop() || ""; const p = res(t); if (isDir(p)) { out("cat: " + t + ": Is a directory", "error"); return; } if (files[p] !== undefined) out(files[p].replace(/\n$/, "")); else out("cat: " + t + ": No such file or directory", "error"); }
  function head(a, L, tail) { const n = parseInt((a.find((x) => x.startsWith("-n")) || "").replace("-n", ""), 10) || 10; const t = a.filter((x) => !x.startsWith("-")).pop() || ""; const p = res(t); const c = files[p]; if (c === undefined) { out((tail ? "tail" : "head") + ": cannot open '" + t + "': No such file or directory", "error"); return; } out((tail ? c.split("\n").slice(-n) : c.split("\n").slice(0, n)).join("\n")); }
  function grep(a, L) { const count = /-c/.test(L); const targets = a.filter((x) => !x.startsWith("-") && x !== "-c"); const pat = targets.shift(); if (!pat) { out("Usage: grep [OPTION]... PATTERN [FILE]...", "error"); return; } const re = new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/^"|"$/g, ""), /-i/.test(L) ? "i" : ""); targets.forEach((t) => { const p = res(t); const c = files[p]; if (c === undefined) { out("grep: " + t + ": No such file or directory", "error"); return; } const lines = c.split("\n").filter((l) => re.test(l)); if (count) out(String(lines.length)); else if (lines.length) out(lines.join("\n")); }); }
  function wc(a) { const t = a.filter((x) => !x.startsWith("-")).pop() || ""; const p = res(t); const c = files[p]; if (c === undefined) { out("wc: " + t + ": No such file or directory", "error"); return; } const l = c.split("\n").length - (c.endsWith("\n") ? 1 : 0); const w = c.trim() ? c.trim().split(/\s+/).length : 0; out("  " + l + "  " + w + "  " + c.length + " " + t); }
  function sort(a) { const t = a.filter((x) => !x.startsWith("-")).pop() || ""; const p = res(t); const c = files[p]; if (c === undefined) { out("sort: " + t + ": No such file or directory", "error"); return; } out(c.split("\n").filter(Boolean).sort().join("\n")); }
  function fileCmd(a) { const t = a.filter((x) => !x.startsWith("-")).pop() || ""; const p = res(t); if (isDir(p)) out(t + ": directory"); else if (files[p] !== undefined) out(t + ": ASCII text"); else out("file: cannot open '" + t + "' (No such file or directory)", "error"); }
  function statCmd(a) { const t = a.filter((x) => !x.startsWith("-")).pop() || ""; const p = res(t); if (files[p] === undefined && !isDir(p)) { out("stat: cannot statx '" + t + "': No such file or directory", "error"); return; } out("  File: " + t + "\n  Size: " + (isDir(p) ? 4096 : files[p].length) + "  Blocks: 8  IO Block: 4096  " + (isDir(p) ? "directory" : "regular file")); }
  function findCmd(a) { const base = a.find((x) => !x.startsWith("-")) || "."; const b = res(base); const pre = b === "/" ? "/" : b + "/"; const outLines = []; dirs.forEach((d) => { if (d.startsWith(pre)) outLines.push(d); }); Object.keys(files).forEach((f) => { if (f.startsWith(pre)) outLines.push(f); }); out(outLines.sort().join("\n") || ""); }

  function tok(cmd) { const t = []; const m = /"([^"]*)"|'([^']*)'|([^\s]+)/g; let x; while ((x = m.exec(cmd)) !== null) t.push(x[1] ?? x[2] ?? x[3]); return t; }
  function cmdLine(cmd) { const d = document.createElement("div"); d.className = "output-entry output-command"; const u = document.createElement("span"); u.className = "prompt-user"; u.textContent = user + "@" + host; const p = document.createElement("span"); p.className = "prompt-path"; p.textContent = ":~$"; d.append(u, p, document.createTextNode(" " + cmd)); terminalOutput.append(d); }
  function out(text, type) { if (text === "" || text === undefined) return; (String(text).split("\n")).forEach((l) => { const d = document.createElement("div"); d.className = "output-entry output-text " + (type || "").trim(); d.textContent = l; terminalOutput.append(d); }); }
  function scroll() { requestAnimationFrame(() => { terminalBody.scrollTop = terminalBody.scrollHeight; }); }
  function update() { const done = state.done.size; scoreEl.textContent = String(state.score); progressText.textContent = done + " of " + C.objectives.length + " complete"; progressBar.style.width = (done / C.objectives.length * 100) + "%"; C.objectives.forEach((o, i) => { const el = $("#task" + i); if (el) el.classList.toggle("is-complete", state.done.has(i)); }); }

  function complete() {
    if (state.completed) return;
    state.completed = true; state.score = 100;
    state.elapsed = Math.max(1, Math.floor((Date.now() - state.startedAt) / 1000));
    clearInterval(state.timer); timerEl.textContent = fmt(state.elapsed); commandInput.disabled = true;
    state.certId = certId(state.name);
    if (window.RCWPassport) RCWPassport.record({ type: "lab", name: state.name });
    setTimeout(() => {
      $("#resultName").textContent = state.name;
      $("#finalObj").textContent = state.done.size + " / " + C.objectives.length;
      $("#finalTime").textContent = fmt(state.elapsed);
      $("#commandCount").textContent = String(state.count);
      showScreen("result"); renderCert(); toast("Perfect score — your certificate is ready.");
    }, 1000);
  }

  function toast(m) { const t = $("#toast"); t.querySelector("p").textContent = m; t.classList.add("is-visible"); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("is-visible"), 2800); }

  function certId(name) { const n = new Date(); const dp = [n.getFullYear(), String(n.getMonth() + 1).padStart(2, "0"), String(n.getDate()).padStart(2, "0")].join(""); let h = 2166136261; const s = name + "|" + n.toISOString() + "|" + state.elapsed + "|" + C.id; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return "RCW-" + (C.certPrefix || "LAB") + "-" + dp + "-" + (h >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(-7); }

  // ---- certificate ----
  function renderCert() {
    const canvas = certificateCanvas; const ctx = canvas.getContext("2d"); const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = "#f4f0e6"; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalAlpha = 0.035; ctx.fillStyle = "#0b2b4c"; for (let y = 0; y < H; y += 18) for (let x = (y / 18) % 2 ? 9 : 0; x < W; x += 18) ctx.fillRect(x, y, 1.5, 1.5); ctx.restore();
    ctx.strokeStyle = "#08233f"; ctx.lineWidth = 22; ctx.strokeRect(26, 26, W - 52, H - 52);
    ctx.strokeStyle = "#12a9e9"; ctx.lineWidth = 3; ctx.strokeRect(48, 48, W - 96, H - 96);
    ctx.strokeStyle = "#c8a847"; ctx.lineWidth = 2; ctx.strokeRect(62, 62, W - 124, H - 124);
    ctx.fillStyle = "#08233f"; ctx.fillRect(64, 64, W - 128, 130); ctx.fillStyle = "#0ba8ee"; ctx.fillRect(64, 188, W - 128, 6);
    rrect(ctx, 98, 91, 74, 74, 16); ctx.fillStyle = "#0ba8ee"; ctx.fill(); ctx.fillStyle = "#fff"; ctx.font = "800 24px ui-monospace, monospace"; ctx.textAlign = "center"; ctx.fillText(">_", 135, 139);
    ctx.textAlign = "left"; ctx.fillStyle = "#ffffff"; ctx.font = "800 30px Arial, sans-serif"; ctx.fillText("RCW", 195, 126); ctx.fillStyle = "#4cc9ff"; ctx.font = "800 13px Arial, sans-serif"; ctx.fillText("IT TRAINING", 196, 151);
    ctx.textAlign = "right"; ctx.fillStyle = "#86a7bd"; ctx.font = "600 14px Arial, sans-serif"; ctx.fillText("LEARN  •  PRACTICE  •  MASTER  •  ACHIEVE", W - 101, 130); ctx.fillStyle = "#c9e9f6"; ctx.font = "500 12px Arial, sans-serif"; ctx.fillText("www.rcwittraining.in", W - 101, 154);
    ctx.textAlign = "center"; ctx.fillStyle = "#0ba8ee"; ctx.font = "800 15px Arial, sans-serif"; ctx.fillText("CERTIFICATE OF ACHIEVEMENT", W / 2, 266); ctx.fillStyle = "#08233f"; ctx.font = "700 61px Georgia, serif"; ctx.fillText(C.certTitle || "Challenge Champion", W / 2, 336);
    ctx.fillStyle = "#6c7c86"; ctx.font = "400 19px Georgia, serif"; ctx.fillText("This certificate is proudly presented to", W / 2, 391);
    ctx.fillStyle = "#092b4c"; fitFont(ctx, state.name, 830, 57, 34, "700", "Georgia, serif"); ctx.fillText(state.name, W / 2, 468);
    const nw = Math.min(830, ctx.measureText(state.name).width + 90); const g = ctx.createLinearGradient(W / 2 - nw / 2, 0, W / 2 + nw / 2, 0); g.addColorStop(0, "rgba(11,168,238,0)"); g.addColorStop(.5, "#0ba8ee"); g.addColorStop(1, "rgba(11,168,238,0)"); ctx.fillStyle = g; ctx.fillRect(W / 2 - nw / 2, 489, nw, 2);
    ctx.fillStyle = "#4f6472"; ctx.font = "400 18px Arial, sans-serif"; ctx.fillText(C.certDesc1 || "", W / 2, 543); ctx.fillText(C.certDesc2 || "", W / 2, 574);
    const bx = 206, by = 706; ctx.beginPath(); ctx.arc(bx, by, 76, 0, Math.PI * 2); ctx.fillStyle = "#08233f"; ctx.fill(); ctx.beginPath(); ctx.arc(bx, by, 64, 0, Math.PI * 2); ctx.strokeStyle = "#c8a847"; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = "#ffffff"; ctx.font = "800 34px Arial, sans-serif"; ctx.fillText("100", bx, by + 1); ctx.fillStyle = "#52d4ff"; ctx.font = "800 12px Arial, sans-serif"; ctx.fillText("/ 100", bx, by + 25); ctx.fillStyle = "#6a7d88"; ctx.font = "800 11px Arial, sans-serif"; ctx.fillText("FINAL SCORE", bx, by + 102);
    ctx.textAlign = "left"; meta(ctx, 350, 676, "ISSUED ON", cd(new Date())); meta(ctx, 350, 754, "CERTIFICATE ID", state.certId); meta(ctx, 660, 676, "CHALLENGE", C.certChallenge || C.title); meta(ctx, 660, 754, "STATUS", C.certStatus || "All objectives passed");
    const px = 1140, py = 685; ctx.save(); ctx.beginPath(); ctx.arc(px, py, 82, 0, Math.PI * 2); ctx.clip(); ctx.fillStyle = "#0c2e50"; ctx.fillRect(px - 84, py - 84, 168, 168); if (instructorImage.complete && instructorImage.naturalWidth) cover(ctx, instructorImage, px - 82, py - 82, 164, 164, 0.5, 0.25); ctx.restore(); ctx.beginPath(); ctx.arc(px, py, 86, 0, Math.PI * 2); ctx.strokeStyle = "#c8a847"; ctx.lineWidth = 4; ctx.stroke(); ctx.beginPath(); ctx.arc(px, py, 94, 0, Math.PI * 2); ctx.strokeStyle = "rgba(8,35,63,.22)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.textAlign = "center"; ctx.fillStyle = "#092b4c"; ctx.font = "italic 700 36px Georgia, serif"; ctx.fillText("Pradeep Raju", px, 822); ctx.strokeStyle = "#0ba8ee"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px - 112, 837); ctx.bezierCurveTo(px - 50, 826, px + 35, 849, px + 112, 834); ctx.stroke(); ctx.fillStyle = "#6a7d88"; ctx.font = "800 10px Arial, sans-serif"; ctx.fillText("PRADEEP RAJU  •  RCW IT TRAINING", px, 861);
    ctx.fillStyle = "#e3ddd0"; ctx.fillRect(92, 895, W - 184, 1); ctx.textAlign = "left"; ctx.fillStyle = "#778994"; ctx.font = "500 10px Arial, sans-serif"; ctx.fillText("RCW IT Training certifies the successful completion recorded above.", 98, 921); ctx.textAlign = "right"; ctx.fillText(C.certFooter || (C.category + " · Challenge"), W - 98, 921);
  }
  function rrect(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
  function fitFont(c, t, mw, s, min, w, f) { let z = s; do { c.font = w + " " + z + "px " + f; z -= 1; } while (c.measureText(t).width > mw && z >= min); }
  function meta(c, x, y, l, v) { c.fillStyle = "#81909a"; c.font = "800 10px Arial, sans-serif"; c.fillText(l, x, y); c.fillStyle = "#173c57"; c.font = "700 15px Arial, sans-serif"; c.fillText(v, x, y + 23); }
  function cd(d) { return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }); }
  function cover(c, img, x, y, w, h, fx, fy) { const ir = img.naturalWidth / img.naturalHeight, tr = w / h; let sw = img.naturalWidth, sh = img.naturalHeight, sx = 0, sy = 0; if (ir > tr) { sw = img.naturalHeight * tr; sx = (img.naturalWidth - sw) * (fx || 0.5); } else { sh = img.naturalWidth / tr; sy = (img.naturalHeight - sh) * (fy || 0.5); } c.drawImage(img, sx, sy, sw, sh, x, y, w, h); }
  instructorImage.addEventListener("load", () => { if (state.completed) renderCert(); });

  $("#resetButton").addEventListener("click", () => { reset(); (C.intro || []).forEach((l) => out(l, "warning")); startTimer(); commandInput.focus(); });
  $("#replayButton").addEventListener("click", () => { $("#learnerName").value = state.name; showScreen("welcome"); });
  $("#fullscreenButton").addEventListener("click", async () => { try { if (!document.fullscreenElement) { await document.documentElement.requestFullscreen(); toast("Focus mode enabled."); } else await document.exitFullscreen(); } catch { toast("Focus mode not available."); } });

  $("#downloadPngButton").addEventListener("click", () => { if (!state.completed) return; renderCert(); certificateCanvas.toBlob((b) => { if (!b) return; dl(b, "rcw-" + C.id + "-" + (state.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "learner") + ".png"); toast("Certificate image downloaded."); }, "image/png"); });
  $("#downloadPdfButton").addEventListener("click", () => { if (!state.completed) return; renderCert(); certificateCanvas.toBlob(async (b) => { if (!b) { toast("Could not prepare the PDF."); return; } const j = new Uint8Array(await b.arrayBuffer()); dl(new Blob([pdf(j, certificateCanvas.width, certificateCanvas.height)], { type: "application/pdf" }), "rcw-" + C.id + "-" + (state.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "learner") + ".pdf"); toast("Certificate PDF downloaded."); }, "image/jpeg", 0.96); });
  function dl(b, fn) { const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = fn; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 1500); }

  function pdf(jpeg, iw, ih) {
    const e = new TextEncoder(); const chunks = []; const off = [0]; let len = 0;
    const push = (v) => { const b = typeof v === "string" ? e.encode(v) : v; chunks.push(b); len += b.length; };
    const obj = (n, h, s) => { off[n] = len; push(n + " 0 obj\n" + h); if (s) { push("\nstream\n"); push(s); push("\nendstream"); } push("\nendobj\n"); };
    push(new Uint8Array([0x25,0x50,0x44,0x46,0x2d,0x31,0x2e,0x34,0x0a,0x25,0xe2,0xe3,0xcf,0xd3,0x0a]));
    obj(1, "<< /Type /Catalog /Pages 2 0 R >>"); obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    obj(3, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>");
    const c = e.encode("q\n842 0 0 595 0 0 cm\n/Im0 Do\nQ\n"); obj(4, "<< /Length " + c.length + " >>", c);
    obj(5, "<< /Type /XObject /Subtype /Image /Width " + iw + " /Height " + ih + " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " + jpeg.length + " >>", jpeg);
    const xo = len; push("xref\n0 6\n"); push("0000000000 65535 f \n"); for (let i = 1; i <= 5; i++) push(String(off[i]).padStart(10, "0") + " 00000 n \n");
    push("trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" + xo + "\n%%EOF\n");
    const outU = new Uint8Array(len); let pos = 0; chunks.forEach((ch) => { outU.set(ch, pos); pos += ch.length; }); return outU;
  }
})();
