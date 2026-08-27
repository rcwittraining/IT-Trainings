(() => {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const screens = { welcome: $("#welcomeScreen"), lab: $("#labScreen"), result: $("#resultScreen") };

  const startForm = $("#startForm");
  const learnerNameInput = $("#learnerName");
  const nameError = $("#nameError");
  const terminalForm = $("#terminalForm");
  const commandInput = $("#commandInput");
  const terminalOutput = $("#terminalOutput");
  const terminalBody = $("#terminalBody");
  const timerElement = $("#timer");
  const scoreElement = $("#score");
  const progressText = $("#progressText");
  const progressBar = $("#progressBar");
  const certificateCanvas = $("#certificateCanvas");
  const instructorImage = $("#instructorImage");
  const promptPath = $("#promptPath");

  const taskElements = {
    init: $("#taskInit"),
    add: $("#taskAdd"),
    commit: $("#taskCommit"),
    branch: $("#taskBranch")
  };

  const state = {
    learnerName: "",
    repoInit: false,
    init: false,
    identitySet: false,
    staged: false,
    add: false,
    committed: false,
    commit: false,
    branchCreated: false,
    branchMerged: false,
    branch: false,
    currentBranch: "main",
    score: 0,
    commandHistory: [],
    historyIndex: 0,
    commandCount: 0,
    startedAt: 0,
    elapsedSeconds: 0,
    timerId: null,
    completed: false,
    certificateId: ""
  };

  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove("is-active"));
    screens[name].classList.add("is-active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function cleanName(v) { return v.replace(/\s+/g, " ").trim(); }
  function isValidName(v) { return v.length >= 2 && /[\p{L}]/u.test(v) && /^[\p{L}\p{M} .'-]+$/u.test(v); }

  startForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = cleanName(learnerNameInput.value);
    if (!isValidName(name)) {
      learnerNameInput.setAttribute("aria-invalid", "true");
      nameError.textContent = "Enter a valid full name using letters, spaces, apostrophes, hyphens, or periods.";
      learnerNameInput.focus();
      return;
    }
    learnerNameInput.removeAttribute("aria-invalid");
    nameError.textContent = "";
    state.learnerName = name;
    beginChallenge();
  });
  learnerNameInput.addEventListener("input", () => { learnerNameInput.removeAttribute("aria-invalid"); nameError.textContent = ""; });

  function beginChallenge() {
    resetChallengeState();
    appendOutput("GIT-1201: The project at ~/my-app has no version control.\nMission: git init, set your identity, stage and commit the files, then create and merge a feature branch.", "warning");
    showScreen("lab");
    startTimer();
    setTimeout(() => commandInput.focus(), 180);
  }

  function resetChallengeState() {
    clearInterval(state.timerId);
    state.repoInit = false; state.init = false; state.identitySet = false;
    state.staged = false; state.add = false; state.committed = false; state.commit = false;
    state.branchCreated = false; state.branchMerged = false; state.branch = false;
    state.currentBranch = "main";
    state.score = 0; state.commandHistory = []; state.historyIndex = 0; state.commandCount = 0;
    state.startedAt = Date.now(); state.elapsedSeconds = 0; state.completed = false; state.certificateId = "";
    terminalOutput.replaceChildren(); commandInput.value = ""; commandInput.disabled = false;
    timerElement.textContent = "00:00"; updatePrompt(); updateProgress();
  }

  function startTimer() {
    clearInterval(state.timerId);
    state.startedAt = Date.now();
    state.timerId = setInterval(() => {
      state.elapsedSeconds = Math.floor((Date.now() - state.startedAt) / 1000);
      timerElement.textContent = formatDuration(state.elapsedSeconds);
    }, 250);
  }
  function formatDuration(t) { return Math.floor(t / 60).toString().padStart(2, "0") + ":" + String(Math.floor(t % 60)).padStart(2, "0"); }

  function updatePrompt() {
    promptPath.textContent = ":~/my-app (" + state.currentBranch + ")$";
  }

  terminalForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (state.completed) return;
    const raw = commandInput.value.trim();
    commandInput.value = "";
    if (!raw) return;
    appendCommand(raw);
    state.commandHistory.push(raw);
    state.historyIndex = state.commandHistory.length;
    state.commandCount += 1;
    execute(raw);
    updatePrompt();
    scrollTerminal();
  });

  commandInput.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") { e.preventDefault(); if (state.commandHistory.length) { state.historyIndex = Math.max(0, state.historyIndex - 1); commandInput.value = state.commandHistory[state.historyIndex] || ""; requestAnimationFrame(() => commandInput.setSelectionRange(commandInput.value.length, commandInput.value.length)); } }
    if (e.key === "ArrowDown") { e.preventDefault(); if (state.commandHistory.length) { state.historyIndex = Math.min(state.commandHistory.length, state.historyIndex + 1); commandInput.value = state.commandHistory[state.historyIndex] || ""; } }
  });
  terminalBody.addEventListener("click", () => { if (!state.completed) commandInput.focus(); });

  function tokenize(cmd) {
    const t = [];
    const m = /"([^"]*)"|'([^']*)'|([^\s]+)/g; let x;
    while ((x = m.exec(cmd)) !== null) t.push(x[1] ?? x[2] ?? x[3]);
    return t;
  }

  function execute(raw) {
    const tokens = tokenize(raw);
    const command = (tokens.shift() || "").toLowerCase();
    const args = tokens;
    switch (command) {
      case "git": handleGit(args, raw); break;
      case "pwd": appendOutput("/home/dev/my-app"); break;
      case "whoami": appendOutput("dev"); break;
      case "ls": appendOutput("app.py  README.md  requirements.txt"); break;
      case "cat": handleCat(args); break;
      case "hostname": appendOutput("dev-node-01"); break;
      case "uname": appendOutput("Linux"); break;
      case "date": appendOutput("Sun Aug 16 12:30:00 IST 2026"); break;
      case "clear": terminalOutput.replaceChildren(); break;
      case "history": appendOutput(state.commandHistory.map((c, i) => String(i + 1).padStart(4, " ") + "  " + c).join("\n")); break;
      case "help": showHelp(); break;
      case "man": appendOutput("GIT(1)\nNAME\n    git - the stupid content tracker\nCOMMANDS\n    init config status add commit log branch checkout merge"); break;
      case "": break;
      default: appendOutput("bash: " + command + ": command not found", "error");
    }
  }

  function handleCat(args) {
    const t = args.filter((a) => !a.startsWith("-")).pop() || "";
    if (t === "app.py") appendOutput("def main():\n    print(\"Hello, RCW!\")\n\nif __name__ == \"__main__\":\n    main()");
    else if (t === "README.md") appendOutput("# My App\n\nA sample project for version control practice.");
    else if (t === "requirements.txt") appendOutput("flask==3.0.0\nrequests==2.31.0");
    else appendOutput("cat: " + t + ": No such file or directory", "error");
  }

  function handleGit(args, raw) {
    const sub = (args[0] || "").toLowerCase();

    if (sub === "init") {
      if (state.repoInit) { appendOutput("Reinitialized existing Git repository in /home/dev/my-app/.git/"); return; }
      state.repoInit = true;
      appendOutput("Initialized empty Git repository in /home/dev/my-app/.git/");
      checkInit();
      return;
    }

    if (sub === "config") {
      if (args.includes("--global")) {
        appendOutput("(global config set)");
        return;
      }
      if (!state.repoInit) { appendOutput("fatal: not a git repository (or any parent up to mount point /)\nRun 'git init' first.", "error"); return; }
      if (args.includes("user.name")) { state.identitySet = state.identitySet || (args[args.length - 1] && args[args.length - 1] !== "user.name"); }
      else if (args.includes("user.email")) { /* email also counts toward identity */ }
      appendOutput("(config updated)");
      // identity complete only when both name and email set — approximate: name set is enough to proceed
      checkInit();
      return;
    }

    if (sub === "status") {
      if (!state.repoInit) { appendOutput("fatal: not a git repository (or any parent up to mount point /)", "error"); return; }
      if (!state.committed) {
        appendOutput("On branch " + state.currentBranch + "\n\nNo commits yet\n\nUntracked files:\n  (use \"git add <file>...\" to include in what will be committed)\n\tapp.py\n\tREADME.md\n\trequirements.txt\n\nnothing added to commit but untracked files present");
      } else {
        appendOutput("On branch " + state.currentBranch + "\nnothing to commit, working tree clean");
      }
      return;
    }

    if (sub === "add") {
      if (!state.repoInit) { appendOutput("fatal: not a git repository (or any parent up to mount point /)", "error"); return; }
      state.staged = true;
      appendOutput("(staged files for commit)");
      markObjective("add", 25, "✓ Objective 2 passed — the files were staged. +25 points");
      return;
    }

    if (sub === "commit") {
      if (!state.repoInit) { appendOutput("fatal: not a git repository", "error"); return; }
      if (!state.staged) { appendOutput("nothing to commit (use \"git add\" to track files)", "error"); return; }
      if (!state.identitySet) { appendOutput('*** Please tell me who you are.\n\nRun\n  git config user.email "you@example.com"\n  git config user.name "Your Name"', "error"); return; }
      state.committed = true;
      const msg = raw.match(/-m\s+(?:"([^"]*)"|'([^']*)'|(\S+))/);
      const message = msg ? (msg[1] || msg[2] || msg[3]) : "Initial commit";
      appendOutput("[" + state.currentBranch + " (root-commit) a1b2c3d] " + message + "\n 3 files changed, 42 insertions(+)");
      markObjective("commit", 25, "✓ Objective 3 passed — the first commit was created. +25 points");
      return;
    }

    if (sub === "branch") {
      if (!state.repoInit) { appendOutput("fatal: not a git repository", "error"); return; }
      if (!args[1]) {
        appendOutput("* " + state.currentBranch + (state.branchCreated ? "\n  feature-x" : ""));
        return;
      }
      const name = args[1];
      state.branchCreated = true;
      appendOutput("(branch '" + name + "' created)");
      return;
    }

    if (sub === "checkout" || sub === "switch") {
      if (!state.repoInit) { appendOutput("fatal: not a git repository", "error"); return; }
      const target = args[1] || "";
      if (target === "feature-x" || target === "-b" || args.includes("-b")) {
        state.currentBranch = "feature-x";
        if (!state.branchCreated) state.branchCreated = true;
        appendOutput("Switched to branch 'feature-x'");
        return;
      }
      if (target === "main" || target === "master") {
        state.currentBranch = "main";
        appendOutput("Switched to branch 'main'");
        return;
      }
      appendOutput("error: pathspec '" + target + "' did not match any file(s) known to git", "error");
      return;
    }

    if (sub === "merge") {
      if (!state.repoInit) { appendOutput("fatal: not a git repository", "error"); return; }
      const target = args[1] || "";
      if (target === "feature-x" || target === "feature") {
        if (!state.branchCreated) { appendOutput("merge: feature-x - not something we can merge", "error"); return; }
        state.branchMerged = true;
        state.currentBranch = "main";
        appendOutput("Updating a1b2c3d..e5f6a7b\nFast-forward\n app.py | 5 +++++\n 1 file changed, 5 insertions(+)");
        markObjective("branch", 25, "✓ Objective 4 passed — the feature branch was created and merged. +25 points");
        completeChallenge();
        return;
      }
      appendOutput("merge: " + target + " - not something we can merge", "error");
      return;
    }

    if (sub === "log") {
      if (!state.repoInit) { appendOutput("fatal: not a git repository", "error"); return; }
      if (!state.committed) { appendOutput("fatal: your current branch '" + state.currentBranch + "' does not have any commits yet", "error"); return; }
      appendOutput("commit a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d (HEAD -> " + state.currentBranch + ")\nAuthor: Dev <dev@example.com>\nDate:   Sun Aug 16 12:30:00 2026 +0530\n\n    Initial commit");
      return;
    }

    if (sub === "diff") {
      if (!state.repoInit) { appendOutput("fatal: not a git repository", "error"); return; }
      appendOutput("diff --git a/app.py b/app.py\nindex 83db48f..5b0e4f2 100644\n--- a/app.py\n+++ b/app.py\n@@ -1,3 +1,5 @@\n def main():\n     print(\"Hello, RCW!\")\n+\n+# added a feature");
      return;
    }

    appendOutput("git: unknown command \"" + sub + "\". Use 'git init|config|status|add|commit|log|branch|checkout|merge'.");
  }

  function checkInit() {
    if (state.repoInit && state.identitySet) {
      markObjective("init", 25, "✓ Objective 1 passed — the repository was initialised and identity configured. +25 points");
    }
  }

  function markObjective(key, points, message) {
    if (state[key]) return;
    state[key] = true;
    state.score += points;
    appendOutput(message, "success");
    updateProgress();
    showToast(message.replace(/^[^—]+—\s*/, "").replace(/\s*\+\d+ points$/, ""));
  }

  function showHelp() {
    appendOutput(
      "Git commands:\n" +
      "  git init                            create a repository\n" +
      "  git config user.name \"Your Name\"    set your identity\n" +
      "  git config user.email \"you@x.com\"   set your email\n" +
      "  git status                          show working tree status\n" +
      "  git add .                           stage all changes\n" +
      "  git commit -m \"message\"             commit staged changes\n" +
      "  git log --oneline                   show commit history\n" +
      "  git branch feature-x                create a branch\n" +
      "  git checkout feature-x              switch branch\n" +
      "  git checkout main / git merge feature-x   merge back\n" +
      "  history | clear | help              shell utilities",
      "info"
    );
  }

  function appendCommand(cmd) {
    const line = document.createElement("div");
    line.className = "output-entry output-command";
    const u = document.createElement("span"); u.className = "prompt-user"; u.textContent = "dev@dev-node-01";
    const p = document.createElement("span"); p.className = "prompt-path"; p.textContent = ":~/my-app (" + state.currentBranch + ")$";
    line.append(u, p, document.createTextNode(" " + cmd));
    terminalOutput.append(line);
  }
  function appendOutput(text, type) {
    if (text === "") return;
    const line = document.createElement("div");
    line.className = "output-entry output-text " + (type || "").trim();
    line.textContent = text;
    terminalOutput.append(line);
  }
  function scrollTerminal() { requestAnimationFrame(() => { terminalBody.scrollTop = terminalBody.scrollHeight; }); }

  function updateProgress() {
    const done = [state.init, state.add, state.commit, state.branch].filter(Boolean).length;
    scoreElement.textContent = String(state.score);
    progressText.textContent = done + " of 4 complete";
    progressBar.style.width = (done * 25) + "%";
    Object.entries(taskElements).forEach(([k, el]) => el.classList.toggle("is-complete", state[k]));
  }

  function completeChallenge() {
    if (state.completed || !state.branch) return;
    state.completed = true;
    state.score = 100;
    state.elapsedSeconds = Math.max(1, Math.floor((Date.now() - state.startedAt) / 1000));
    clearInterval(state.timerId);
    timerElement.textContent = formatDuration(state.elapsedSeconds);
    commandInput.disabled = true;
    state.certificateId = makeCertificateId(state.learnerName);
    RCWPassport.record({ type: "lab", name: state.learnerName });
    setTimeout(() => {
      $("#resultName").textContent = state.learnerName;
      $("#finalTime").textContent = formatDuration(state.elapsedSeconds);
      $("#commandCount").textContent = String(state.commandCount);
      showScreen("result");
      renderCertificate();
      showToast("Perfect score — your certificate is ready.");
    }, 1000);
  }

  $("#resetButton").addEventListener("click", () => { resetChallengeState(); appendOutput("Git task reset. Start by initialising the repository.", "info"); startTimer(); commandInput.focus(); });
  $("#replayButton").addEventListener("click", beginChallenge);
  $("#fullscreenButton").addEventListener("click", async () => { try { if (!document.fullscreenElement) { await document.documentElement.requestFullscreen(); showToast("Focus mode enabled."); } else await document.exitFullscreen(); } catch { showToast("Focus mode is not available in this browser."); } });

  function showToast(m) { const t = $("#toast"); t.querySelector("p").textContent = m; t.classList.add("is-visible"); clearTimeout(showToast._t); showToast._t = setTimeout(() => t.classList.remove("is-visible"), 2800); }

  function makeCertificateId(name) {
    const now = new Date();
    const dp = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("");
    let h = 2166136261;
    const src = name + "|" + now.toISOString() + "|" + state.elapsedSeconds + "|git";
    for (let i = 0; i < src.length; i++) { h ^= src.charCodeAt(i); h = Math.imul(h, 16777619); }
    return "RCW-GIT-" + dp + "-" + (h >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(-7);
  }

  function renderCertificate() {
    const canvas = certificateCanvas; const ctx = canvas.getContext("2d"); const W = canvas.width; const H = canvas.height;
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = "#f4f0e6"; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalAlpha = 0.035; ctx.fillStyle = "#0b2b4c";
    for (let y = 0; y < H; y += 18) for (let x = (y / 18) % 2 ? 9 : 0; x < W; x += 18) ctx.fillRect(x, y, 1.5, 1.5);
    ctx.restore();
    ctx.strokeStyle = "#08233f"; ctx.lineWidth = 22; ctx.strokeRect(26, 26, W - 52, H - 52);
    ctx.strokeStyle = "#12a9e9"; ctx.lineWidth = 3; ctx.strokeRect(48, 48, W - 96, H - 96);
    ctx.strokeStyle = "#c8a847"; ctx.lineWidth = 2; ctx.strokeRect(62, 62, W - 124, H - 124);
    ctx.fillStyle = "#08233f"; ctx.fillRect(64, 64, W - 128, 130);
    ctx.fillStyle = "#0ba8ee"; ctx.fillRect(64, 188, W - 128, 6);
    roundedRect(ctx, 98, 91, 74, 74, 16); ctx.fillStyle = "#0ba8ee"; ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "800 24px ui-monospace, monospace"; ctx.textAlign = "center"; ctx.fillText(">_", 135, 139);
    ctx.textAlign = "left"; ctx.fillStyle = "#ffffff"; ctx.font = "800 30px Arial, sans-serif"; ctx.fillText("RCW", 195, 126);
    ctx.fillStyle = "#4cc9ff"; ctx.font = "800 13px Arial, sans-serif"; ctx.fillText("IT TRAINING", 196, 151);
    ctx.textAlign = "right"; ctx.fillStyle = "#86a7bd"; ctx.font = "600 14px Arial, sans-serif"; ctx.fillText("LEARN  •  PRACTICE  •  MASTER  •  ACHIEVE", W - 101, 130);
    ctx.fillStyle = "#c9e9f6"; ctx.font = "500 12px Arial, sans-serif"; ctx.fillText("www.rcwittraining.in", W - 101, 154);
    ctx.textAlign = "center"; ctx.fillStyle = "#0ba8ee"; ctx.font = "800 15px Arial, sans-serif"; ctx.fillText("CERTIFICATE OF ACHIEVEMENT", W / 2, 266);
    ctx.fillStyle = "#08233f"; ctx.font = "700 61px Georgia, serif"; ctx.fillText("Version Control Champion", W / 2, 336);
    ctx.fillStyle = "#6c7c86"; ctx.font = "400 19px Georgia, serif"; ctx.fillText("This certificate is proudly presented to", W / 2, 391);
    ctx.fillStyle = "#092b4c"; setFittedFont(ctx, state.learnerName, 830, 57, 34, "700", "Georgia, serif"); ctx.fillText(state.learnerName, W / 2, 468);
    const nw = Math.min(830, ctx.measureText(state.learnerName).width + 90);
    const g = ctx.createLinearGradient(W / 2 - nw / 2, 0, W / 2 + nw / 2, 0); g.addColorStop(0, "rgba(11,168,238,0)"); g.addColorStop(.5, "#0ba8ee"); g.addColorStop(1, "rgba(11,168,238,0)");
    ctx.fillStyle = g; ctx.fillRect(W / 2 - nw / 2, 489, nw, 2);
    ctx.fillStyle = "#4f6472"; ctx.font = "400 18px Arial, sans-serif";
    ctx.fillText("for successfully completing the RCW Git & GitHub challenge", W / 2, 543);
    ctx.fillText("by initialising a repository, committing changes, and merging a feature branch.", W / 2, 574);
    const bx = 206, by = 706;
    ctx.beginPath(); ctx.arc(bx, by, 76, 0, Math.PI * 2); ctx.fillStyle = "#08233f"; ctx.fill();
    ctx.beginPath(); ctx.arc(bx, by, 64, 0, Math.PI * 2); ctx.strokeStyle = "#c8a847"; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = "#ffffff"; ctx.font = "800 34px Arial, sans-serif"; ctx.fillText("100", bx, by + 1);
    ctx.fillStyle = "#52d4ff"; ctx.font = "800 12px Arial, sans-serif"; ctx.fillText("/ 100", bx, by + 25);
    ctx.fillStyle = "#6a7d88"; ctx.font = "800 11px Arial, sans-serif"; ctx.fillText("FINAL SCORE", bx, by + 102);
    ctx.textAlign = "left"; drawMeta(ctx, 350, 676, "ISSUED ON", formatCertDate(new Date()));
    drawMeta(ctx, 350, 754, "CERTIFICATE ID", state.certificateId);
    drawMeta(ctx, 660, 676, "CHALLENGE", "Git version control workflow");
    drawMeta(ctx, 660, 754, "STATUS", "All version control objectives passed");
    const px = 1140, py = 685;
    ctx.save(); ctx.beginPath(); ctx.arc(px, py, 82, 0, Math.PI * 2); ctx.clip(); ctx.fillStyle = "#0c2e50"; ctx.fillRect(px - 84, py - 84, 168, 168);
    if (instructorImage.complete && instructorImage.naturalWidth) drawImageCover(ctx, instructorImage, px - 82, py - 82, 164, 164, 0.5, 0.25);
    ctx.restore(); ctx.beginPath(); ctx.arc(px, py, 86, 0, Math.PI * 2); ctx.strokeStyle = "#c8a847"; ctx.lineWidth = 4; ctx.stroke();
    ctx.beginPath(); ctx.arc(px, py, 94, 0, Math.PI * 2); ctx.strokeStyle = "rgba(8,35,63,.22)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.textAlign = "center"; ctx.fillStyle = "#092b4c"; ctx.font = "italic 700 36px Georgia, serif"; ctx.fillText("Pradeep Raju", px, 822);
    ctx.strokeStyle = "#0ba8ee"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px - 112, 837); ctx.bezierCurveTo(px - 50, 826, px + 35, 849, px + 112, 834); ctx.stroke();
    ctx.fillStyle = "#6a7d88"; ctx.font = "800 10px Arial, sans-serif"; ctx.fillText("PRADEEP RAJU  •  RCW IT TRAINING", px, 861);
    ctx.fillStyle = "#e3ddd0"; ctx.fillRect(92, 895, W - 184, 1);
    ctx.textAlign = "left"; ctx.fillStyle = "#778994"; ctx.font = "500 10px Arial, sans-serif"; ctx.fillText("RCW IT Training certifies the successful completion recorded above.", 98, 921);
    ctx.textAlign = "right"; ctx.fillText("Version Control · Challenge 01", W - 98, 921);
  }
  function roundedRect(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
  function setFittedFont(c, text, maxW, s, minS, w, f) { let size = s; do { c.font = w + " " + size + "px " + f; size -= 1; } while (c.measureText(text).width > maxW && size >= minS); }
  function drawMeta(c, x, y, l, v) { c.fillStyle = "#81909a"; c.font = "800 10px Arial, sans-serif"; c.fillText(l, x, y); c.fillStyle = "#173c57"; c.font = "700 15px Arial, sans-serif"; c.fillText(v, x, y + 23); }
  function formatCertDate(d) { return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }); }
  function drawImageCover(c, img, x, y, w, h, fx, fy) {
    const ir = img.naturalWidth / img.naturalHeight, tr = w / h;
    let sw = img.naturalWidth, sh = img.naturalHeight, sx = 0, sy = 0;
    if (ir > tr) { sw = img.naturalHeight * tr; sx = (img.naturalWidth - sw) * (fx || 0.5); }
    else { sh = img.naturalWidth / tr; sy = (img.naturalHeight - sh) * (fy || 0.5); }
    c.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }
  instructorImage.addEventListener("load", () => { if (state.completed) renderCertificate(); });

  $("#downloadPngButton").addEventListener("click", () => { if (!state.completed) return; renderCertificate(); certificateCanvas.toBlob((b) => { if (!b) return; downloadBlob(b, certFilename("png")); showToast("Certificate image downloaded."); }, "image/png"); });
  $("#downloadPdfButton").addEventListener("click", () => {
    if (!state.completed) return;
    renderCertificate();
    certificateCanvas.toBlob(async (b) => {
      if (!b) { showToast("Could not prepare the PDF. Please try again."); return; }
      const jpg = new Uint8Array(await b.arrayBuffer());
      const pdf = buildPdfFromJpeg(jpg, certificateCanvas.width, certificateCanvas.height);
      downloadBlob(new Blob([pdf], { type: "application/pdf" }), certFilename("pdf"));
      showToast("Certificate PDF downloaded.");
    }, "image/jpeg", 0.96);
  });
  function certFilename(ext) { const s = state.learnerName.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "learner"; return "rcw-git-" + s + "." + ext; }
  function downloadBlob(b, fn) { const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = fn; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 1500); }

  function buildPdfFromJpeg(jpegBytes, iw, ih) {
    const enc = new TextEncoder(); const chunks = []; const offsets = [0]; let length = 0;
    const push = (v) => { const b = typeof v === "string" ? enc.encode(v) : v; chunks.push(b); length += b.length; };
    const addObj = (n, header, stream) => { offsets[n] = length; push(n + " 0 obj\n" + header); if (stream) { push("\nstream\n"); push(stream); push("\nendstream"); } push("\nendobj\n"); };
    push(new Uint8Array([0x25,0x50,0x44,0x46,0x2d,0x31,0x2e,0x34,0x0a,0x25,0xe2,0xe3,0xcf,0xd3,0x0a]));
    addObj(1, "<< /Type /Catalog /Pages 2 0 R >>"); addObj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    addObj(3, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>");
    const content = enc.encode("q\n842 0 0 595 0 0 cm\n/Im0 Do\nQ\n");
    addObj(4, "<< /Length " + content.length + " >>", content);
    addObj(5, "<< /Type /XObject /Subtype /Image /Width " + iw + " /Height " + ih + " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " + jpegBytes.length + " >>", jpegBytes);
    const xo = length; push("xref\n0 6\n"); push("0000000000 65535 f \n");
    for (let i = 1; i <= 5; i++) push(String(offsets[i]).padStart(10, "0") + " 00000 n \n");
    push("trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" + xo + "\n%%EOF\n");
    const out = new Uint8Array(length); let pos = 0; chunks.forEach((c) => { out.set(c, pos); pos += c.length; });
    return out;
  }
})();
