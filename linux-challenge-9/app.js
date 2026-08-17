(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const screens = {
    welcome: $("#welcomeScreen"),
    lab: $("#labScreen"),
    result: $("#resultScreen")
  };

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
    inspect: $("#taskInspect"),
    remove: $("#taskRemove"),
    create: $("#taskCreate"),
    config: $("#taskConfig")
  };

  // The application layout for this scenario.
  const APP_BINARY = "/opt/rcw-app/v2.1/rcw-app";
  const APP_CONFIG = "/opt/rcw-app/v2.1/config.ini";
  const BIN_LINK = "/usr/local/bin/rcw-app";
  const CFG_LINK = "/etc/rcw-app/config.ini";
  const OLD_TARGET = "/opt/rcw-app/v2.0/rcw-app"; // removed — this is why the link is dangling

  const state = {
    learnerName: "",
    inspect: false,
    remove: false,
    create: false,
    config: false,
    binLinkExists: true,     // stale link present at start
    cfgLinkExists: false,    // config link missing at start
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
    Object.values(screens).forEach((screen) => screen.classList.remove("is-active"));
    screens[name].classList.add("is-active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cleanName(value) {
    return value.replace(/\s+/g, " ").trim();
  }

  function isValidName(value) {
    return value.length >= 2 && /[\p{L}]/u.test(value) && /^[\p{L}\p{M} .'-]+$/u.test(value);
  }

  startForm.addEventListener("submit", (event) => {
    event.preventDefault();
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

  learnerNameInput.addEventListener("input", () => {
    learnerNameInput.removeAttribute("aria-invalid");
    nameError.textContent = "";
  });

  function beginChallenge() {
    resetChallengeState();
    appendOutput("LNK-0901: Application rcw-app was upgraded to /opt/rcw-app/v2.1/.\nThe launch symlink " + BIN_LINK + " still points at the removed v2.0 binary (a dangling link), and the config link is missing.\nMission: inspect, remove the stale link, recreate it against v2.1, and link the config.", "warning");
    showScreen("lab");
    startTimer();
    setTimeout(() => commandInput.focus(), 180);
  }

  function resetChallengeState() {
    clearInterval(state.timerId);
    state.inspect = false;
    state.remove = false;
    state.create = false;
    state.config = false;
    state.binLinkExists = true;
    state.cfgLinkExists = false;
    state.score = 0;
    state.commandHistory = [];
    state.historyIndex = 0;
    state.commandCount = 0;
    state.startedAt = Date.now();
    state.elapsedSeconds = 0;
    state.completed = false;
    state.certificateId = "";
    terminalOutput.replaceChildren();
    commandInput.value = "";
    commandInput.disabled = false;
    timerElement.textContent = "00:00";
    updateProgress();
  }

  function startTimer() {
    clearInterval(state.timerId);
    state.startedAt = Date.now();
    state.timerId = window.setInterval(() => {
      state.elapsedSeconds = Math.floor((Date.now() - state.startedAt) / 1000);
      timerElement.textContent = formatDuration(state.elapsedSeconds);
    }, 250);
  }

  function formatDuration(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  terminalForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (state.completed) return;
    const rawCommand = commandInput.value.trim();
    commandInput.value = "";
    if (!rawCommand) return;
    appendCommand(rawCommand);
    state.commandHistory.push(rawCommand);
    state.historyIndex = state.commandHistory.length;
    state.commandCount += 1;
    executeCommand(rawCommand);
    scrollTerminal();
  });

  commandInput.addEventListener("keydown", (event) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (state.commandHistory.length) {
        state.historyIndex = Math.max(0, state.historyIndex - 1);
        commandInput.value = state.commandHistory[state.historyIndex] || "";
        requestAnimationFrame(() => commandInput.setSelectionRange(commandInput.value.length, commandInput.value.length));
      }
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (state.commandHistory.length) {
        state.historyIndex = Math.min(state.commandHistory.length, state.historyIndex + 1);
        commandInput.value = state.commandHistory[state.historyIndex] || "";
      }
    }
  });

  terminalBody.addEventListener("click", () => {
    if (!state.completed) commandInput.focus();
  });

  function tokenize(command) {
    const tokens = [];
    const matcher = /"([^"]*)"|'([^']*)'|([^\s]+)/g;
    let match;
    while ((match = matcher.exec(command)) !== null) tokens.push(match[1] ?? match[2] ?? match[3]);
    return tokens;
  }

  function executeCommand(rawCommand) {
    let cmd = rawCommand;
    if (/^sudo\s+/i.test(cmd)) cmd = cmd.replace(/^sudo\s+/i, "");
    const tokens = tokenize(cmd);
    const command = (tokens.shift() || "").toLowerCase();
    const args = tokens;

    switch (command) {
      case "ls": handleLs(args, cmd); break;
      case "ln": handleLn(args); break;
      case "readlink": handleReadlink(args); break;
      case "rm": handleRm(args); break;
      case "unlink": handleUnlink(args); break;
      case "find": handleFind(args); break;
      case "file": handleFile(args); break;
      case "stat": handleStat(args); break;
      case "cat": handleCat(args); break;
      case "pwd": appendOutput("/home/student"); break;
      case "whoami": appendOutput("student"); break;
      case "hostname": appendOutput("app-node-01"); break;
      case "id": appendOutput("uid=1000(student) gid=1000(student) groups=1000(student),10(wheel)"); break;
      case "date": appendOutput("Sun Aug 16 11:05:20 IST 2026"); break;
      case "history": appendOutput(state.commandHistory.map((item, index) => `${String(index + 1).padStart(4, " ")}  ${item}`).join("\n")); break;
      case "clear": terminalOutput.replaceChildren(); break;
      case "help": showHelp(); break;
      case "man": handleMan(args[0]); break;
      case "echo": appendOutput(args.join(" ")); break;
      case "": break;
      default:
        appendOutput(`bash: ${command}: command not found`, "error");
    }
  }

  // ---------- objective marking ----------
  function markObjective(key, points, message) {
    if (state[key]) return;
    state[key] = true;
    state.score += points;
    appendOutput(message, "success");
    updateProgress();
    showToast(message.replace(/^[^—]+—\s*/, "").replace(/\s*\+\d+ points$/, ""));
  }

  // ---------- command handlers ----------
  function handleLs(args, cmd) {
    const long = /-l/.test(cmd);
    const target = args.filter((a) => !a.startsWith("-")).pop() || "";

    // ls -l /usr/local/bin/rcw-app  (single file)
    if (target.includes("rcw-app") && !target.includes("config")) {
      if (!state.binLinkExists) { appendOutput("ls: cannot access '" + target + "': No such file or directory", "error"); return; }
      if (long) {
        const dest = state.create ? APP_BINARY : OLD_TARGET;
        appendOutput("lrwxrwxrwx. 1 root root 25 Aug 16 08:00 " + target.split("/").pop() + " -> " + dest);
        if (!state.create) {
          appendOutput("(dangling: " + dest + " does not exist)");
        }
      } else {
        appendOutput(target.split("/").pop());
      }
      markInspect();
      return;
    }

    // ls -l /etc/rcw-app/config.ini (single config)
    if (target.includes("config.ini")) {
      if (!state.cfgLinkExists) { appendOutput("ls: cannot access '" + target + "': No such file or directory", "error"); return; }
      if (long) appendOutput("lrwxrwxrwx. 1 root root 28 Aug 16 08:00 config.ini -> " + APP_CONFIG);
      else appendOutput("config.ini");
      return;
    }

    // directory listing
    if (target.includes("/usr/local/bin") || target.includes("/opt/rcw-app")) {
      if (target.includes("/usr/local/bin")) {
        const lines = ["total 0"];
        if (state.binLinkExists) {
          const dest = state.create ? APP_BINARY : OLD_TARGET;
          lines.push("lrwxrwxrwx. 1 root root 25 Aug 16 08:00 rcw-app -> " + dest);
        }
        appendMultiline(lines.join("\n"));
      } else if (target.includes("/opt/rcw-app")) {
        appendMultiline("total 0\ndrwxr-xr-x. 2 root root 4096 Aug 16 08:00 v2.1");
      }
      markInspect();
      return;
    }
    if (target.includes("/etc/rcw-app")) {
      const lines = ["total 0"];
      if (state.cfgLinkExists) lines.push("lrwxrwxrwx. 1 root root 28 Aug 16 08:00 config.ini -> " + APP_CONFIG);
      appendMultiline(lines.join("\n"));
      return;
    }
    // default home listing
    appendOutput(".bashrc   .profile");
  }

  function handleLn(args) {
    const symbolic = args.some((a) => a === "-s");
    const targets = args.filter((a) => !a.startsWith("-"));
    const src = targets[0];
    const dst = targets[1];

    if (!symbolic) {
      appendOutput("ln: creating hard links is out of scope here — use 'ln -s' for a soft link.", "error");
      return;
    }
    if (!src || !dst) { appendOutput("ln: missing file operand", "error"); return; }

    // Config link — check first (both paths contain "rcw-app", so be specific)
    if (src.includes("config") || dst.includes("config")) {
      if (src !== APP_CONFIG && !src.includes("config.ini")) {
        appendOutput("ln: the target should be the v2.1 config: " + APP_CONFIG, "error");
        return;
      }
      state.cfgLinkExists = true;
      appendOutput("(symlink created: " + dst + " -> " + src + ")");
      markObjective("config", 25, "✓ Objective 4 passed — the config soft link was created. +25 points");
      completeChallenge();
      return;
    }

    // Binary link
    if (src.includes("rcw-app") && dst.includes("rcw-app")) {
      if (state.binLinkExists && !state.remove) {
        appendOutput("ln: failed to create symbolic link '" + dst + "': File exists\nRemove the stale link first (rm " + BIN_LINK + " or unlink " + BIN_LINK + ").", "error");
        return;
      }
      if (src !== APP_BINARY && !src.includes("v2.1")) {
        appendOutput("ln: the target should be the v2.1 binary: " + APP_BINARY, "error");
        return;
      }
      state.binLinkExists = true;
      appendOutput("(symlink created: " + dst + " -> " + src + ")");
      markObjective("create", 30, "✓ Objective 3 passed — the binary soft link was recreated against v2.1. +30 points");
      return;
    }

    appendOutput("ln: unrecognised link targets. Expected:\n  ln -s " + APP_BINARY + " " + BIN_LINK + "\n  ln -s " + APP_CONFIG + " " + CFG_LINK);
  }

  function handleReadlink(args) {
    const flagF = args.some((a) => a === "-f" || a === "-e" || a === "-m");
    const target = args.filter((a) => !a.startsWith("-")).pop() || "";

    if (target.includes("config.ini") || (target.includes("rcw-app") && target.includes("etc"))) {
      if (!state.cfgLinkExists) { appendOutput("readlink: " + target + ": No such file or directory", "error"); return; }
      appendOutput(flagF ? APP_CONFIG : APP_CONFIG);
      return;
    }
    if (target.includes("rcw-app")) {
      if (!state.binLinkExists) { appendOutput("readlink: " + target + ": No such file or directory", "error"); return; }
      const dest = state.create ? APP_BINARY : OLD_TARGET;
      if (flagF) {
        appendOutput(dest);
      } else {
        appendOutput(dest);
      }
      markInspect();
      return;
    }
    appendOutput("readlink: missing operand");
  }

  function handleRm(args) {
    const targets = args.filter((a) => !a.startsWith("-"));
    if (!targets.length) { appendOutput("rm: missing operand", "error"); return; }
    targets.forEach((t) => {
      if (t.includes("rcw-app") && !t.includes("config")) {
        if (!state.binLinkExists) { appendOutput("rm: cannot remove '" + t + "': No such file or directory", "error"); return; }
        state.binLinkExists = false;
        appendOutput("(removed symlink " + t + ")");
        markObjective("remove", 25, "✓ Objective 2 passed — the stale link was removed without touching the target. +25 points");
        return;
      }
      appendOutput("rm: no such file '" + t + "' (nothing to remove)", "error");
    });
  }

  function handleUnlink(args) {
    const target = args.filter((a) => !a.startsWith("-")).pop() || "";
    if (target.includes("rcw-app") && !target.includes("config")) {
      if (!state.binLinkExists) { appendOutput("unlink: cannot unlink '" + target + "': No such file or directory", "error"); return; }
      state.binLinkExists = false;
      appendOutput("(unlinked " + target + ")");
      markObjective("remove", 25, "✓ Objective 2 passed — the stale link was removed without touching the target. +25 points");
      return;
    }
    appendOutput("unlink: missing or unsupported operand. Try: unlink " + BIN_LINK, "error");
  }

  function handleFind(args) {
    // find / -type l  (or similar) — list symlinks
    const typeL = args.some((a) => a === "-type" && false) || /-type\s+l/.test(args.join(" ")) || args.includes("-type");
    const out = [];
    if (state.binLinkExists) out.push(BIN_LINK);
    if (state.cfgLinkExists) out.push(CFG_LINK);
    if (typeL || args.length === 0) {
      appendMultiline(out.join("\n") || "(no symbolic links found)");
      markInspect();
      return;
    }
    appendMultiline(out.join("\n"));
  }

  function handleFile(args) {
    const target = args.filter((a) => !a.startsWith("-")).pop() || "";
    if (target.includes("rcw-app") && !target.includes("config")) {
      if (!state.binLinkExists) { appendOutput("file: cannot open '" + target + "' (No such file or directory)", "error"); return; }
      const dest = state.create ? APP_BINARY : OLD_TARGET;
      appendOutput(target + ": symbolic link to " + dest);
      markInspect();
      return;
    }
    if (target.includes("config.ini")) {
      if (!state.cfgLinkExists) { appendOutput("file: cannot open '" + target + "' (No such file or directory)", "error"); return; }
      appendOutput(target + ": symbolic link to " + APP_CONFIG);
      return;
    }
    appendOutput("file: cannot open '" + target + "' (No such file or directory)", "error");
  }

  function handleStat(args) {
    const target = args.filter((a) => !a.startsWith("-")).pop() || "";
    if (target.includes("rcw-app") && !target.includes("config")) {
      if (!state.binLinkExists) { appendOutput("stat: cannot statx '" + target + "': No such file or directory", "error"); return; }
      const dest = state.create ? APP_BINARY : OLD_TARGET;
      appendOutput("  File: " + target + " -> " + dest + "\n  Size: " + dest.length + "  Blocks: 0  IO Block: 4096  symbolic link");
      markInspect();
      return;
    }
    appendOutput("stat: cannot statx '" + target + "': No such file or directory", "error");
  }

  function handleCat(args) {
    const target = args.filter((a) => !a.startsWith("-")).pop() || "";
    if (target.includes("config.ini")) {
      if (!state.cfgLinkExists) { appendOutput("cat: " + target + ": No such file or directory", "error"); return; }
      appendOutput("[rcw-app]\nversion = 2.1\nport = 8080\nlog_level = info");
      return;
    }
    appendOutput("cat: " + target + ": No such file or directory", "error");
  }

  function markInspect() {
    markObjective("inspect", 20, "✓ Objective 1 passed — the existing symlinks were inspected. +20 points");
  }

  function showHelp() {
    appendOutput(
      "Soft link commands:\n" +
      "  ls -l /usr/local/bin/rcw-app          inspect the link (note the '->')\n" +
      "  ls -l /usr/local/bin                 list a directory showing links\n" +
      "  readlink /usr/local/bin/rcw-app      show the link target\n" +
      "  readlink -f /usr/local/bin/rcw-app   fully resolve the target\n" +
      "  find / -type l                       find all symbolic links\n" +
      "  file /usr/local/bin/rcw-app          identify a file type\n" +
      "  stat /usr/local/bin/rcw-app          inspect link metadata\n" +
      "  rm /usr/local/bin/rcw-app            remove only the link\n" +
      "  unlink /usr/local/bin/rcw-app        remove only the link (alt)\n" +
      "  ln -s <target> <link>                create a soft link\n" +
      "  history | clear | help               shell utilities",
      "info"
    );
  }

  function handleMan(topic = "") {
    const pages = {
      ln: "LN(1)\nNAME\n    ln - make links between files\nOPTIONS\n    -s  make symbolic links instead of hard links\nSYNOPSIS\n    ln -s TARGET LINK_NAME",
      readlink: "READLINK(1)\nNAME\n    readlink - print resolved symbolic links\nOPTIONS\n    -f  canonicalize by following every symlink",
      unlink: "UNLINK(1)\nNAME\n    unlink - call the unlink function to remove the specified file",
      find: "FIND(1)\nNAME\n    find - search for files in a directory hierarchy\nEXAMPLE\n    find / -type l   list symbolic links"
    };
    appendOutput(pages[topic] || (topic ? `No manual entry for ${topic}` : "What manual page do you want?"), pages[topic] ? "info" : "error");
  }

  function appendCommand(command) {
    const line = document.createElement("div");
    line.className = "output-entry output-command";
    const user = document.createElement("span");
    user.className = "prompt-user";
    user.textContent = "student@app-node-01";
    const path = document.createElement("span");
    path.className = "prompt-path";
    path.textContent = ":~$";
    line.append(user, path, document.createTextNode(` ${command}`));
    terminalOutput.append(line);
  }

  function appendOutput(text, type) {
    if (text === "") return;
    const line = document.createElement("div");
    line.className = "output-entry output-text " + (type || "").trim();
    line.textContent = text;
    terminalOutput.append(line);
  }

  function appendMultiline(text) {
    text.split("\n").forEach((l) => appendOutput(l));
  }

  function scrollTerminal() {
    requestAnimationFrame(() => {
      terminalBody.scrollTop = terminalBody.scrollHeight;
    });
  }

  function updateProgress() {
    const completedCount = [state.inspect, state.remove, state.create, state.config].filter(Boolean).length;
    scoreElement.textContent = String(state.score);
    progressText.textContent = `${completedCount} of 4 complete`;
    progressBar.style.width = `${completedCount * 25}%`;
    Object.entries(taskElements).forEach(([key, element]) => element.classList.toggle("is-complete", state[key]));
  }

  function completeChallenge() {
    if (state.completed || !state.config) return;
    state.completed = true;
    state.score = 100;
    state.elapsedSeconds = Math.max(1, Math.floor((Date.now() - state.startedAt) / 1000));
    clearInterval(state.timerId);
    timerElement.textContent = formatDuration(state.elapsedSeconds);
    commandInput.disabled = true;
    state.certificateId = makeCertificateId(state.learnerName);
    RCWPassport.record({ type: "lab", name: state.learnerName });
    window.setTimeout(() => {
      $("#resultName").textContent = state.learnerName;
      $("#finalTime").textContent = formatDuration(state.elapsedSeconds);
      $("#commandCount").textContent = String(state.commandCount);
      showScreen("result");
      renderCertificate();
      showToast("Perfect score — your certificate is ready.");
    }, 1000);
  }

  $("#resetButton").addEventListener("click", () => {
    resetChallengeState();
    appendOutput("Link task reset. Start by inspecting the existing links.", "info");
    startTimer();
    commandInput.focus();
  });

  $("#replayButton").addEventListener("click", beginChallenge);

  $("#fullscreenButton").addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        showToast("Focus mode enabled.");
      } else await document.exitFullscreen();
    } catch {
      showToast("Focus mode is not available in this browser.");
    }
  });

  function showToast(message) {
    const toast = $("#toast");
    toast.querySelector("p").textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(showToast.timeoutId);
    showToast.timeoutId = setTimeout(() => toast.classList.remove("is-visible"), 2800);
  }

  function makeCertificateId(name) {
    const now = new Date();
    const datePart = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("");
    let hash = 2166136261;
    const source = `${name}|${now.toISOString()}|${state.elapsedSeconds}|soft-links`;
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `RCW-LNK-${datePart}-${(hash >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(-7)}`;
  }

  function renderCertificate() {
    const canvas = certificateCanvas;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#f4f0e6";
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.globalAlpha = 0.035;
    ctx.fillStyle = "#0b2b4c";
    for (let y = 0; y < H; y += 18) {
      for (let x = (y / 18) % 2 ? 9 : 0; x < W; x += 18) ctx.fillRect(x, y, 1.5, 1.5);
    }
    ctx.restore();

    ctx.strokeStyle = "#08233f";
    ctx.lineWidth = 22;
    ctx.strokeRect(26, 26, W - 52, H - 52);
    ctx.strokeStyle = "#12a9e9";
    ctx.lineWidth = 3;
    ctx.strokeRect(48, 48, W - 96, H - 96);
    ctx.strokeStyle = "#c8a847";
    ctx.lineWidth = 2;
    ctx.strokeRect(62, 62, W - 124, H - 124);

    ctx.fillStyle = "#08233f";
    ctx.fillRect(64, 64, W - 128, 130);
    ctx.fillStyle = "#0ba8ee";
    ctx.fillRect(64, 188, W - 128, 6);
    ctx.beginPath();
    ctx.moveTo(64, 194);
    ctx.lineTo(240, 194);
    ctx.lineTo(64, 365);
    ctx.closePath();
    ctx.fillStyle = "rgba(11,168,238,.08)";
    ctx.fill();

    roundedRect(ctx, 98, 91, 74, 74, 16);
    ctx.fillStyle = "#0ba8ee";
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "800 24px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText(">_", 135, 139);

    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 30px Arial, sans-serif";
    ctx.fillText("RCW", 195, 126);
    ctx.fillStyle = "#4cc9ff";
    ctx.font = "800 13px Arial, sans-serif";
    ctx.letterSpacing = "3px";
    ctx.fillText("IT TRAINING", 196, 151);
    ctx.letterSpacing = "0px";

    ctx.textAlign = "right";
    ctx.fillStyle = "#86a7bd";
    ctx.font = "600 14px Arial, sans-serif";
    ctx.fillText("LEARN  •  PRACTICE  •  MASTER  •  ACHIEVE", W - 101, 130);
    ctx.fillStyle = "#c9e9f6";
    ctx.font = "500 12px Arial, sans-serif";
    ctx.fillText("www.rcwittraining.in", W - 101, 154);

    ctx.textAlign = "center";
    ctx.fillStyle = "#0ba8ee";
    ctx.font = "800 15px Arial, sans-serif";
    ctx.fillText("CERTIFICATE OF ACHIEVEMENT", W / 2, 266);
    ctx.fillStyle = "#08233f";
    ctx.font = "700 61px Georgia, serif";
    ctx.fillText("Filesystem Links Champion", W / 2, 336);

    ctx.fillStyle = "#6c7c86";
    ctx.font = "400 19px Georgia, serif";
    ctx.fillText("This certificate is proudly presented to", W / 2, 391);

    ctx.fillStyle = "#092b4c";
    setFittedFont(ctx, state.learnerName, 830, 57, 34, "700", "Georgia, serif");
    ctx.fillText(state.learnerName, W / 2, 468);
    const nameWidth = Math.min(830, ctx.measureText(state.learnerName).width + 90);
    const gradient = ctx.createLinearGradient(W / 2 - nameWidth / 2, 0, W / 2 + nameWidth / 2, 0);
    gradient.addColorStop(0, "rgba(11,168,238,0)");
    gradient.addColorStop(.5, "#0ba8ee");
    gradient.addColorStop(1, "rgba(11,168,238,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(W / 2 - nameWidth / 2, 489, nameWidth, 2);

    ctx.fillStyle = "#4f6472";
    ctx.font = "400 18px Arial, sans-serif";
    ctx.fillText("for successfully completing the RCW symbolic (soft) links challenge", W / 2, 543);
    ctx.fillText("by inspecting, removing, and recreating symbolic links to resolve a dangling application path.", W / 2, 574);

    const badgeX = 206;
    const badgeY = 706;
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, 76, 0, Math.PI * 2);
    ctx.fillStyle = "#08233f";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, 64, 0, Math.PI * 2);
    ctx.strokeStyle = "#c8a847";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 34px Arial, sans-serif";
    ctx.fillText("100", badgeX, badgeY + 1);
    ctx.fillStyle = "#52d4ff";
    ctx.font = "800 12px Arial, sans-serif";
    ctx.fillText("/ 100", badgeX, badgeY + 25);
    ctx.fillStyle = "#6a7d88";
    ctx.font = "800 11px Arial, sans-serif";
    ctx.fillText("FINAL SCORE", badgeX, badgeY + 102);

    ctx.textAlign = "left";
    drawMeta(ctx, 350, 676, "ISSUED ON", formatCertificateDate(new Date()));
    drawMeta(ctx, 350, 754, "CERTIFICATE ID", state.certificateId);
    drawMeta(ctx, 660, 676, "CHALLENGE", "Symbolic link repair and creation");
    drawMeta(ctx, 660, 754, "STATUS", "All link objectives passed");

    const photoX = 1140;
    const photoY = 685;
    ctx.save();
    ctx.beginPath();
    ctx.arc(photoX, photoY, 82, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#0c2e50";
    ctx.fillRect(photoX - 84, photoY - 84, 168, 168);
    if (instructorImage.complete && instructorImage.naturalWidth) {
      drawImageCover(ctx, instructorImage, photoX - 82, photoY - 82, 164, 164, 0.5, 0.25);
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(photoX, photoY, 86, 0, Math.PI * 2);
    ctx.strokeStyle = "#c8a847";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(photoX, photoY, 94, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(8,35,63,.22)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = "#092b4c";
    ctx.font = "italic 700 36px Georgia, serif";
    ctx.fillText("Pradeep Raju", photoX, 822);
    ctx.strokeStyle = "#0ba8ee";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(photoX - 112, 837);
    ctx.bezierCurveTo(photoX - 50, 826, photoX + 35, 849, photoX + 112, 834);
    ctx.stroke();
    ctx.fillStyle = "#6a7d88";
    ctx.font = "800 10px Arial, sans-serif";
    ctx.fillText("PRADEEP RAJU  •  RCW IT TRAINING", photoX, 861);

    ctx.fillStyle = "#e3ddd0";
    ctx.fillRect(92, 895, W - 184, 1);
    ctx.textAlign = "left";
    ctx.fillStyle = "#778994";
    ctx.font = "500 10px Arial, sans-serif";
    ctx.fillText("RCW IT Training certifies the successful completion recorded above.", 98, 921);
    ctx.textAlign = "right";
    ctx.fillText("RHEL 10 Filesystem · Challenge 09", W - 98, 921);
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
  }

  function setFittedFont(ctx, text, maxWidth, startSize, minSize, weight, family) {
    let size = startSize;
    do {
      ctx.font = `${weight} ${size}px ${family}`;
      size -= 1;
    } while (ctx.measureText(text).width > maxWidth && size >= minSize);
  }

  function drawMeta(ctx, x, y, label, value) {
    ctx.fillStyle = "#81909a";
    ctx.font = "800 10px Arial, sans-serif";
    ctx.fillText(label, x, y);
    ctx.fillStyle = "#173c57";
    ctx.font = "700 15px Arial, sans-serif";
    ctx.fillText(value, x, y + 23);
  }

  function formatCertificateDate(date) {
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  }

  function drawImageCover(ctx, image, x, y, width, height, focusX = 0.5, focusY = 0.5) {
    const imageRatio = image.naturalWidth / image.naturalHeight;
    const targetRatio = width / height;
    let sourceWidth = image.naturalWidth;
    let sourceHeight = image.naturalHeight;
    let sourceX = 0;
    let sourceY = 0;

    if (imageRatio > targetRatio) {
      sourceWidth = image.naturalHeight * targetRatio;
      sourceX = (image.naturalWidth - sourceWidth) * focusX;
    } else {
      sourceHeight = image.naturalWidth / targetRatio;
      sourceY = (image.naturalHeight - sourceHeight) * focusY;
    }
    ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
  }

  instructorImage.addEventListener("load", () => {
    if (state.completed) renderCertificate();
  });

  $("#downloadPngButton").addEventListener("click", () => {
    if (!state.completed) return;
    renderCertificate();
    certificateCanvas.toBlob((blob) => {
      if (!blob) return;
      downloadBlob(blob, certificateFilename("png"));
      showToast("Certificate image downloaded.");
    }, "image/png");
  });

  $("#downloadPdfButton").addEventListener("click", () => {
    if (!state.completed) return;
    renderCertificate();
    certificateCanvas.toBlob(async (blob) => {
      if (!blob) {
        showToast("Could not prepare the PDF. Please try again.");
        return;
      }
      const jpegBytes = new Uint8Array(await blob.arrayBuffer());
      const pdfBytes = buildPdfFromJpeg(jpegBytes, certificateCanvas.width, certificateCanvas.height);
      downloadBlob(new Blob([pdfBytes], { type: "application/pdf" }), certificateFilename("pdf"));
      showToast("Certificate PDF downloaded.");
    }, "image/jpeg", 0.96);
  });

  function certificateFilename(extension) {
    const safeName = state.learnerName.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "learner";
    return `rcw-links-challenge-9-${safeName}.${extension}`;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function buildPdfFromJpeg(jpegBytes, imageWidth, imageHeight) {
    const encoder = new TextEncoder();
    const chunks = [];
    const offsets = [0];
    let length = 0;

    const push = (value) => {
      const bytes = typeof value === "string" ? encoder.encode(value) : value;
      chunks.push(bytes);
      length += bytes.length;
    };

    const addObject = (number, header, streamBytes = null) => {
      offsets[number] = length;
      push(`${number} 0 obj\n${header}`);
      if (streamBytes) {
        push("\nstream\n");
        push(streamBytes);
        push("\nendstream");
      }
      push("\nendobj\n");
    };

    push(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));
    addObject(1, "<< /Type /Catalog /Pages 2 0 R >>");
    addObject(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    addObject(3, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>");

    const content = encoder.encode("q\n842 0 0 595 0 0 cm\n/Im0 Do\nQ\n");
    addObject(4, `<< /Length ${content.length} >>`, content);
    addObject(5, `<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>`, jpegBytes);

    const xrefOffset = length;
    push("xref\n0 6\n");
    push("0000000000 65535 f \n");
    for (let index = 1; index <= 5; index += 1) {
      push(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`);
    }
    push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

    const output = new Uint8Array(length);
    let position = 0;
    chunks.forEach((chunk) => {
      output.set(chunk, position);
      position += chunk.length;
    });
    return output;
  }
})();
