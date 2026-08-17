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
    print: $("#taskPrint"),
    types: $("#taskTypes"),
    loop: $("#taskLoop"),
    func: $("#taskFunc")
  };

  // ---- mini Python state ----
  let variables = {};
  let functions = {};
  let pendingForLoop = null; // { var, values, printed: 0 }

  const state = {
    learnerName: "",
    print: false,
    types: false,
    loop: false,
    func: false,
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
    appendOutput("PY-1401: Python 3.12 REPL ready.\nMission: print output, assign a variable, create a list, run a for loop, and define a function.", "warning");
    showScreen("lab");
    startTimer();
    setTimeout(() => commandInput.focus(), 180);
  }

  function resetChallengeState() {
    clearInterval(state.timerId);
    state.print = false; state.types = false; state.loop = false; state.func = false;
    state.score = 0; state.commandHistory = []; state.historyIndex = 0; state.commandCount = 0;
    state.startedAt = Date.now(); state.elapsedSeconds = 0; state.completed = false; state.certificateId = "";
    variables = {}; functions = {}; pendingForLoop = null;
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
    const raw = commandInput.value;
    commandInput.value = "";
    if (!raw.trim()) return;
    appendCommand(raw);
    state.commandHistory.push(raw);
    state.historyIndex = state.commandHistory.length;
    state.commandCount += 1;
    runPython(raw);
    scrollTerminal();
  });

  commandInput.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") { e.preventDefault(); if (state.commandHistory.length) { state.historyIndex = Math.max(0, state.historyIndex - 1); commandInput.value = state.commandHistory[state.historyIndex] || ""; requestAnimationFrame(() => commandInput.setSelectionRange(commandInput.value.length, commandInput.value.length)); } }
    if (e.key === "ArrowDown") { e.preventDefault(); if (state.commandHistory.length) { state.historyIndex = Math.min(state.commandHistory.length, state.historyIndex + 1); commandInput.value = state.commandHistory[state.historyIndex] || ""; } }
  });
  terminalBody.addEventListener("click", () => { if (!state.completed) commandInput.focus(); });

  // ---- tiny Python evaluator ----
  function pyValue(expr) {
    const s = expr.trim();
    if (s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1);
    if (s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1);
    if (/^-?\d+$/.test(s)) return parseInt(s, 10);
    if (/^-?\d+\.\d+$/.test(s)) return parseFloat(s);
    if (s === "True") return true;
    if (s === "False") return false;
    if (s === "None") return null;
    if (s.startsWith("[") && s.endsWith("]")) {
      const inner = s.slice(1, -1).trim();
      if (!inner) return [];
      return inner.split(",").map((x) => pyValue(x.trim()));
    }
    if (s.startsWith("{") && s.endsWith("}")) {
      const inner = s.slice(1, -1).trim();
      const obj = {};
      if (inner) inner.split(",").forEach((kv) => { const [k, v] = kv.split(":"); obj[pyValue(k.trim())] = pyValue(v.trim()); });
      return obj;
    }
    if (Object.prototype.hasOwnProperty.call(variables, s)) return variables[s];
    return undefined;
  }

  function pyRepr(v) {
    if (v === null) return "None";
    if (v === undefined) return "NameError";
    if (typeof v === "string") return "'" + v + "'";
    if (Array.isArray(v)) return "[" + v.map(pyRepr).join(", ") + "]";
    if (typeof v === "object") return "{" + Object.keys(v).map((k) => pyRepr(k) + ": " + pyRepr(v[k])).join(", ") + "}";
    return String(v);
  }

  function runPython(raw) {
    const line = raw.replace(/\s+$/, "");

    // help / clear
    if (line.trim() === "help") { showHelp(); return; }
    if (line.trim() === "clear") { terminalOutput.replaceChildren(); return; }
    if (line.trim() === "history") { appendOutput(state.commandHistory.map((c, i) => String(i + 1).padStart(4, " ") + "  " + c).join("\n")); return; }

    // function definition
    const defMatch = line.match(/^def\s+(\w+)\s*\(([^)]*)\)\s*:\s*return\s+(.+)$/);
    if (defMatch) {
      const fname = defMatch[1], params = defMatch[2].split(",").map((p) => p.trim()).filter(Boolean);
      functions[fname] = { params, body: defMatch[3] };
      appendOutput("(function '" + fname + "' defined)");
      markObjective("func", 30, "✓ Objective 4 passed — a function was defined. +30 points");
      return;
    }

    // function call
    const callMatch = line.match(/^(\w+)\(([^)]*)\)$/);
    if (callMatch && functions[callMatch[1]]) {
      const f = functions[callMatch[1]];
      const args = callMatch[2] ? callMatch[2].split(",").map((a) => pyValue(a.trim())) : [];
      const local = {};
      f.params.forEach((p, i) => { local[p] = args[i]; });
      const saved = { ...variables };
      Object.assign(variables, local);
      const result = evalSimple(f.body);
      Object.assign(variables, saved, local);
      // keep function params out after call? restore saved
      variables = saved;
      appendOutput(pyRepr(result));
      markObjective("func", 30, "✓ Objective 4 passed — the function was called. +30 points");
      completeChallenge();
      return;
    }

    // for loop: for i in range(n): print(...)  — single-line
    const forMatch = line.match(/^for\s+(\w+)\s+in\s+range\((\d+)\)\s*:\s*print\((.*)\)\s*$/);
    if (forMatch) {
      const varName = forMatch[1], n = parseInt(forMatch[2], 10), expr = forMatch[3];
      for (let i = 0; i < n; i++) {
        variables[varName] = i;
        const v = evalSimple(expr);
        appendOutput(String(v));
      }
      markObjective("loop", 25, "✓ Objective 3 passed — the for loop ran. +25 points");
      return;
    }

    // print(...)
    const printMatch = line.match(/^print\((.*)\)\s*$/);
    if (printMatch) {
      const inner = printMatch[1].trim();
      if (inner.startsWith('"') || inner.startsWith("'")) {
        appendOutput(inner.slice(1, -1));
      } else {
        const v = evalSimple(inner);
        appendOutput(String(v));
      }
      markObjective("print", 20, "✓ Objective 1 passed — output was printed. +20 points");
      return;
    }

    // type(...)
    const typeMatch = line.match(/^type\((\w+)\)\s*$/);
    if (typeMatch) {
      const v = variables[typeMatch[1]];
      if (v === undefined) { appendOutput("Traceback (most recent call last):\nNameError: name '" + typeMatch[1] + "' is not defined", "error"); return; }
      if (Array.isArray(v)) appendOutput("<class 'list'>");
      else if (typeof v === "object" && v !== null) appendOutput("<class 'dict'>");
      else if (typeof v === "number") appendOutput("<class 'int'>");
      else if (typeof v === "string") appendOutput("<class 'str'>");
      else appendOutput("<class '" + typeof v + "'>");
      markObjective("types", 25, "✓ Objective 2 passed — a data type was inspected. +25 points");
      return;
    }

    // len(...)
    const lenMatch = line.match(/^len\((\w+)\)\s*$/);
    if (lenMatch) {
      const v = variables[lenMatch[1]];
      if (v === undefined) { appendOutput("Traceback (most recent call last):\nNameError: name '" + lenMatch[1] + "' is not defined", "error"); return; }
      appendOutput(String((Array.isArray(v) || typeof v === "string") ? v.length : Object.keys(v).length));
      markObjective("types", 25, "✓ Objective 2 passed — a data type was inspected. +25 points");
      return;
    }

    // assignment: name = value
    const assignMatch = line.match(/^(\w+)\s*=\s*(.+)$/);
    if (assignMatch) {
      const name = assignMatch[1], valExpr = assignMatch[2].trim();
      // list literal
      if (valExpr.startsWith("[") && valExpr.endsWith("]")) {
        variables[name] = pyValue(valExpr);
        appendOutput("(assigned " + name + " = " + pyRepr(variables[name]) + ")");
        markObjective("types", 25, "✓ Objective 2 passed — a list was created. +25 points");
        return;
      }
      if (valExpr.startsWith("{") && valExpr.endsWith("}")) {
        variables[name] = pyValue(valExpr);
        appendOutput("(assigned " + name + " = " + pyRepr(variables[name]) + ")");
        markObjective("types", 25, "✓ Objective 2 passed — a dict was created. +25 points");
        return;
      }
      variables[name] = pyValue(valExpr);
      appendOutput("(assigned " + name + " = " + pyRepr(variables[name]) + ")");
      markObjective("print", 20, "✓ Objective 1 passed — a variable was assigned. +20 points");
      return;
    }

    // bare expression: variable or arithmetic
    const v = evalSimple(line);
    if (v === undefined) {
      appendOutput("Traceback (most recent call last):\nNameError: name '" + line.split(/[\s+\-*/]+/)[0].trim() + "' is not defined", "error");
    } else {
      appendOutput(pyRepr(v));
    }
  }

  function evalSimple(expr) {
    const s = expr.trim();
    // replace variable names with values for arithmetic
    const withVars = s.replace(/\b[a-zA-Z_]\w*\b/g, (m) => {
      if (m === "True" || m === "False" || m === "None") return m;
      return Object.prototype.hasOwnProperty.call(variables, m) ? JSON.stringify(variables[m]) : m;
    });
    // string concatenation: "a" + "b"
    if (withVars.includes('"') && withVars.includes("+")) {
      const parts = withVars.split("+").map((p) => p.trim());
      const all = parts.every((p) => /^"[^"]*"$/.test(p) || /^'[^']*'$/.test(p));
      if (all) return parts.map((p) => p.slice(1, -1)).join("");
    }
    try {
      const result = Function("return (" + withVars + ");")();
      if (result === undefined) return pyValue(s);
      return result;
    } catch (err) {
      return pyValue(s);
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
      "Python features:\n" +
      "  print(\"Hello, RCW!\")           print output\n" +
      "  x = 10                         assign a variable\n" +
      "  nums = [1, 2, 3]               create a list\n" +
      "  type(nums) / len(nums)         inspect data types\n" +
      "  for i in range(3): print(i)    run a for loop\n" +
      "  def greet(name): return \"Hello \" + name\n" +
      "  greet(\"RCW\")                    call a function\n" +
      "  help | clear | history         utilities",
      "info"
    );
  }

  function appendCommand(cmd) {
    const line = document.createElement("div");
    line.className = "output-entry output-command";
    const u = document.createElement("span"); u.className = "prompt-user"; u.textContent = ">>>";
    line.append(u, document.createTextNode(" " + cmd));
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
    const done = [state.print, state.types, state.loop, state.func].filter(Boolean).length;
    scoreElement.textContent = String(state.score);
    progressText.textContent = done + " of 4 complete";
    progressBar.style.width = (done * 25) + "%";
    Object.entries(taskElements).forEach(([k, el]) => el.classList.toggle("is-complete", state[k]));
  }

  function completeChallenge() {
    if (state.completed || !state.func) return;
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

  $("#resetButton").addEventListener("click", () => { resetChallengeState(); appendOutput("Coding task reset. Start with print(\"Hello\").", "info"); startTimer(); commandInput.focus(); });
  $("#replayButton").addEventListener("click", beginChallenge);
  $("#fullscreenButton").addEventListener("click", async () => { try { if (!document.fullscreenElement) { await document.documentElement.requestFullscreen(); showToast("Focus mode enabled."); } else await document.exitFullscreen(); } catch { showToast("Focus mode is not available in this browser."); } });

  function showToast(m) { const t = $("#toast"); t.querySelector("p").textContent = m; t.classList.add("is-visible"); clearTimeout(showToast._t); showToast._t = setTimeout(() => t.classList.remove("is-visible"), 2800); }

  function makeCertificateId(name) {
    const now = new Date();
    const dp = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("");
    let h = 2166136261;
    const src = name + "|" + now.toISOString() + "|" + state.elapsedSeconds + "|python";
    for (let i = 0; i < src.length; i++) { h ^= src.charCodeAt(i); h = Math.imul(h, 16777619); }
    return "RCW-PY-" + dp + "-" + (h >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(-7);
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
    ctx.fillStyle = "#08233f"; ctx.font = "700 61px Georgia, serif"; ctx.fillText("Python Programming Champion", W / 2, 336);
    ctx.fillStyle = "#6c7c86"; ctx.font = "400 19px Georgia, serif"; ctx.fillText("This certificate is proudly presented to", W / 2, 391);
    ctx.fillStyle = "#092b4c"; setFittedFont(ctx, state.learnerName, 830, 57, 34, "700", "Georgia, serif"); ctx.fillText(state.learnerName, W / 2, 468);
    const nw = Math.min(830, ctx.measureText(state.learnerName).width + 90);
    const g = ctx.createLinearGradient(W / 2 - nw / 2, 0, W / 2 + nw / 2, 0); g.addColorStop(0, "rgba(11,168,238,0)"); g.addColorStop(.5, "#0ba8ee"); g.addColorStop(1, "rgba(11,168,238,0)");
    ctx.fillStyle = g; ctx.fillRect(W / 2 - nw / 2, 489, nw, 2);
    ctx.fillStyle = "#4f6472"; ctx.font = "400 18px Arial, sans-serif";
    ctx.fillText("for successfully completing the RCW Python basics challenge", W / 2, 543);
    ctx.fillText("by printing output, using variables and types, looping, and writing functions.", W / 2, 574);
    const bx = 206, by = 706;
    ctx.beginPath(); ctx.arc(bx, by, 76, 0, Math.PI * 2); ctx.fillStyle = "#08233f"; ctx.fill();
    ctx.beginPath(); ctx.arc(bx, by, 64, 0, Math.PI * 2); ctx.strokeStyle = "#c8a847"; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = "#ffffff"; ctx.font = "800 34px Arial, sans-serif"; ctx.fillText("100", bx, by + 1);
    ctx.fillStyle = "#52d4ff"; ctx.font = "800 12px Arial, sans-serif"; ctx.fillText("/ 100", bx, by + 25);
    ctx.fillStyle = "#6a7d88"; ctx.font = "800 11px Arial, sans-serif"; ctx.fillText("FINAL SCORE", bx, by + 102);
    ctx.textAlign = "left"; drawMeta(ctx, 350, 676, "ISSUED ON", formatCertDate(new Date()));
    drawMeta(ctx, 350, 754, "CERTIFICATE ID", state.certificateId);
    drawMeta(ctx, 660, 676, "CHALLENGE", "Python programming fundamentals");
    drawMeta(ctx, 660, 754, "STATUS", "All programming objectives passed");
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
    ctx.textAlign = "right"; ctx.fillText("Programming · Challenge 01", W - 98, 921);
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
  function certFilename(ext) { const s = state.learnerName.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "learner"; return "rcw-python-" + s + "." + ext; }
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
