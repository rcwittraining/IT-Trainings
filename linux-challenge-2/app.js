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
    timeline: $("#taskTimeline"),
    failure: $("#taskFailure"),
    culprit: $("#taskCulprit"),
    report: $("#taskReport")
  };

  const state = {
    learnerName: "",
    timeline: false,
    failure: false,
    culprit: false,
    report: false,
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
    appendOutput("INC-0816: prod-web-01 unexpectedly restarted at approximately 02:17.\nMission: establish the crash timeline, inspect the previous boot, identify the responsible service, and submit the root cause.", "warning");
    showScreen("lab");
    startTimer();
    setTimeout(() => commandInput.focus(), 180);
  }

  function resetChallengeState() {
    clearInterval(state.timerId);
    state.timeline = false;
    state.failure = false;
    state.culprit = false;
    state.report = false;
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
    const tokens = tokenize(rawCommand);
    const command = (tokens.shift() || "").toLowerCase();
    const args = tokens;

    switch (command) {
      case "last":
        handleLast(args);
        break;
      case "who":
        handleWho(args);
        break;
      case "uptime":
        appendOutput(" 02:31:08 up 14 min,  1 user,  load average: 0.18, 0.31, 0.22");
        break;
      case "date":
        appendOutput("Sun Aug 16 02:31:08 IST 2026");
        break;
      case "hostname":
        appendOutput("prod-web-01");
        break;
      case "hostnamectl":
        appendOutput(" Static hostname: prod-web-01\n       Icon name: computer-vm\n         Chassis: vm\n      Machine ID: 83d0b7a6a90e4f85b39e4f551d826102\nOperating System: Red Hat Enterprise Linux 10.0\n          Kernel: Linux 6.12.0-55.el10.x86_64\n    Architecture: x86-64");
        break;
      case "uname":
        appendOutput(args.includes("-a") ? "Linux prod-web-01 6.12.0-55.el10.x86_64 #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux" : "Linux");
        break;
      case "journalctl":
        handleJournalctl(args, rawCommand);
        break;
      case "systemctl":
        handleSystemctl(args);
        break;
      case "free":
        appendOutput("               total        used        free      shared  buff/cache   available\nMem:            31Gi       3.1Gi        25Gi       182Mi       3.2Gi        27Gi\nSwap:          4.0Gi          0B       4.0Gi");
        break;
      case "df":
        appendOutput("Filesystem      Size  Used Avail Use% Mounted on\n/dev/mapper/os-root   80G   29G   52G  36% /\n/dev/sda2       2.0G  412M  1.6G  21% /boot\n/dev/mapper/data-var  60G   18G   43G  30% /var");
        break;
      case "cat":
        handleCat(args);
        break;
      case "sysctl":
        handleSysctl(args);
        break;
      case "grep":
        handleGrep(args, rawCommand);
        break;
      case "dmesg":
        appendOutput("[    0.000000] Linux version 6.12.0-55.el10.x86_64\n[    0.831402] systemd[1]: System booted after an unclean shutdown.\n[    3.102947] XFS (dm-0): Mounting V5 Filesystem\n[   11.684120] systemd[1]: Reached target Multi-User System.", "info");
        break;
      case "submit":
        handleSubmit(args);
        break;
      case "pwd":
        appendOutput("/home/analyst");
        break;
      case "whoami":
        appendOutput("analyst");
        break;
      case "history":
        appendOutput(state.commandHistory.map((item, index) => `${String(index + 1).padStart(4, " ")}  ${item}`).join("\n"));
        break;
      case "clear":
        terminalOutput.replaceChildren();
        break;
      case "help":
        showHelp();
        break;
      case "man":
        handleMan(args[0]);
        break;
      case "echo":
        appendOutput(args.join(" "));
        break;
      case "":
        break;
      default:
        appendOutput(`bash: ${command}: command not found`, "error");
    }
  }

  function handleLast(args) {
    const extended = args.some((arg) => arg.toLowerCase().includes("x"));
    if (!extended) {
      appendOutput("analyst  pts/0        10.24.8.19      Sun Aug 16 02:22   still logged in\nreboot   system boot  6.12.0-55.el10  Sun Aug 16 02:17   still running");
      return;
    }
    appendOutput("analyst  pts/0        10.24.8.19      Sun Aug 16 02:22   still logged in\nreboot   system boot  6.12.0-55.el10  Sun Aug 16 02:17   still running\nrunlevel (to lvl 5)   6.12.0-55.el10  Sun Aug 16 02:17   still running\nreboot   system boot  6.12.0-55.el10  Sat Aug 15 08:02 - crash  (18:14)\nshutdown system down  6.12.0-55.el10  Fri Aug 14 22:10 - 22:11  (00:01)\n\nwtmp begins Fri Aug 14 22:10:01 2026");
    markObjective("timeline", 20, "✓ Objective 1 passed — crash and reboot timeline confirmed. +20 points");
  }

  function handleWho(args) {
    if (args.includes("-b")) appendOutput("         system boot  2026-08-16 02:17");
    else appendOutput("analyst  pts/0  2026-08-16 02:22 (10.24.8.19)");
  }

  function handleJournalctl(args, rawCommand) {
    const lowerArgs = args.map((arg) => arg.toLowerCase());
    const previousBoot = lowerArgs.includes("-1") || /--boot(?:=|\s+)-1/.test(rawCommand.toLowerCase());
    const unitIndex = lowerArgs.findIndex((arg) => arg === "-u" || arg === "--unit");
    let unit = unitIndex >= 0 ? (args[unitIndex + 1] || "") : "";
    const unitOption = args.find((arg) => arg.startsWith("--unit="));
    if (unitOption) unit = unitOption.split("=").slice(1).join("=");
    unit = unit.toLowerCase();

    if (!previousBoot) {
      if (unit === "rcw-backup.service") {
        appendOutput("Aug 16 02:18:02 prod-web-01 systemd[1]: Started RCW Backup Agent.\nAug 16 02:18:03 prod-web-01 backup-agent[811]: Backup agent 4.8.2 ready; next run 23:30.");
      } else {
        appendOutput("-- Boot 9dd3f550e42b4d9fbf235042b558bd58 --\nAug 16 02:17:01 prod-web-01 kernel: Linux version 6.12.0-55.el10.x86_64\nAug 16 02:17:12 prod-web-01 systemd[1]: Reached target Multi-User System.");
      }
      return;
    }

    if (unit) {
      if (unit !== "rcw-backup.service" && unit !== "rcw-backup" && unit !== "backup-agent.service") {
        appendOutput(`-- No entries for unit ${unit} in boot -1 --`);
        return;
      }
      appendOutput("-- Boot 741c92a677d14697850a20f2b3b32c44 (-1) --\nAug 15 23:30:00 prod-web-01 systemd[1]: Started RCW Backup Agent.\nAug 15 23:30:01 prod-web-01 backup-agent[4241]: Starting full repository index.\nAug 16 01:48:18 prod-web-01 backup-agent[4241]: WARNING index cache resident set exceeded 8.0 GiB.\nAug 16 02:11:04 prod-web-01 backup-agent[4241]: Memory usage: RSS=18.7GiB; indexed_objects=14822104.\nAug 16 02:14:39 prod-web-01 backup-agent[4241]: Memory usage: RSS=25.8GiB; allocation rate increasing.\nAug 16 02:16:42 prod-web-01 backup-agent[4241]: Memory usage: RSS=29.6GiB; unable to allocate 268435456 bytes.\nAug 16 02:16:43 prod-web-01 systemd[1]: rcw-backup.service: Main process exited during kernel panic.\nAug 16 02:16:43 prod-web-01 systemd[1]: rcw-backup.service: Consumed 2h 46min CPU time, 29.6G memory peak.");
      markObjective("culprit", 30, "✓ Objective 3 passed — rcw-backup.service identified as the memory consumer. +30 points");
      return;
    }

    appendOutput("-- Boot 741c92a677d14697850a20f2b3b32c44 (-1) --\nAug 16 02:16:42 prod-web-01 kernel: backup-agent invoked oom-killer: gfp_mask=0x140cca, order=0, oom_score_adj=0\nAug 16 02:16:42 prod-web-01 kernel: Memory cgroup out of memory: Killed process blocked by panic policy\nAug 16 02:16:43 prod-web-01 kernel: Out of memory: system-wide memory exhaustion detected\nAug 16 02:16:43 prod-web-01 kernel: Kernel panic - not syncing: System is deadlocked on memory\nAug 16 02:16:43 prod-web-01 kernel: Kernel Offset: disabled\nAug 16 02:16:53 prod-web-01 systemd-pstore: Automatic reboot initiated after kernel panic timeout");
    markObjective("failure", 30, "✓ Objective 2 passed — OOM event and kernel panic found in the previous boot. +30 points");
  }

  function handleSystemctl(args) {
    const action = (args[0] || "").toLowerCase();
    const unit = (args.find((arg, index) => index > 0 && !arg.startsWith("-")) || "").toLowerCase();
    if (!unit || !["rcw-backup.service", "rcw-backup", "backup-agent.service"].includes(unit)) {
      appendOutput(unit ? `Unit ${unit} could not be found.` : "Too few arguments.", "error");
      return;
    }
    if (action === "status") {
      appendOutput("● rcw-backup.service - RCW Backup Agent\n     Loaded: loaded (/etc/systemd/system/rcw-backup.service; enabled)\n     Active: active (running) since Sun 2026-08-16 02:18:02 IST; 13min ago\n   Main PID: 811 (backup-agent)\n      Tasks: 8\n     Memory: 92.4M (peak: 96.1M)\n        CPU: 4.203s\n     CGroup: /system.slice/rcw-backup.service\n             └─811 /opt/rcw/bin/backup-agent --full-index\n\nNote: this status is for the current boot. Inspect boot -1 for the crash window.");
    } else if (action === "cat") {
      appendOutput("# /etc/systemd/system/rcw-backup.service\n[Unit]\nDescription=RCW Backup Agent\nAfter=network-online.target\n\n[Service]\nType=simple\nExecStart=/opt/rcw/bin/backup-agent --full-index\nRestart=on-failure\n# MemoryMax is not configured\n\n[Install]\nWantedBy=multi-user.target");
    } else if (action === "show") {
      appendOutput("Id=rcw-backup.service\nActiveState=active\nSubState=running\nMemoryCurrent=96882688\nMemoryPeak=100769792\nMemoryMax=infinity");
    } else {
      appendOutput(`systemctl: action '${action}' is read-only in this investigation`, "error");
    }
  }

  function handleCat(args) {
    const path = args.find((arg) => !arg.startsWith("-")) || "";
    if (path === "/proc/sys/vm/panic_on_oom") appendOutput("1");
    else if (path === "/proc/uptime") appendOutput("844.21 731.08");
    else if (path === "/etc/systemd/system/rcw-backup.service") handleSystemctl(["cat", "rcw-backup.service"]);
    else appendOutput(`cat: ${path || "missing operand"}: No such file or directory`, "error");
  }

  function handleSysctl(args) {
    const key = args.find((arg) => !arg.startsWith("-")) || "";
    if (key === "vm.panic_on_oom" || key === "vm.panic_on_oom=1") appendOutput("vm.panic_on_oom = 1");
    else appendOutput(`sysctl: cannot stat /proc/sys/${key.replaceAll(".", "/")}: No such file or directory`, "error");
  }

  function handleGrep(args, rawCommand) {
    const query = rawCommand.toLowerCase();
    if (query.includes("oom") || query.includes("out of memory") || query.includes("panic")) {
      appendOutput("/var/log/messages-20260816:Aug 16 02:16:43 prod-web-01 kernel: Out of memory: system-wide memory exhaustion detected\n/var/log/messages-20260816:Aug 16 02:16:43 prod-web-01 kernel: Kernel panic - not syncing: System is deadlocked on memory");
      markObjective("failure", 30, "✓ Objective 2 passed — OOM event and kernel panic found in the archived logs. +30 points");
    } else if (query.includes("backup")) {
      appendOutput("/var/log/messages-20260816:Aug 16 02:16:42 prod-web-01 backup-agent[4241]: Memory usage: RSS=29.6GiB; unable to allocate 268435456 bytes.");
      markObjective("culprit", 30, "✓ Objective 3 passed — backup-agent identified as the memory consumer. +30 points");
    } else {
      appendOutput(`grep: no matching evidence for '${args.filter((arg) => !arg.startsWith("-")).join(" ")}'`);
    }
  }

  function handleSubmit(args) {
    const answer = args.join(" ").toLowerCase().trim();
    if (!answer) {
      appendOutput("Usage: submit <root cause>\nExample format: submit <service> caused <failure event>", "error");
      return;
    }
    if (!state.timeline || !state.failure || !state.culprit) {
      appendOutput("Submission held: collect and validate evidence for the first three objectives before filing the RCA.", "warning");
      return;
    }
    const namesCulprit = /(rcw[- ]?backup|backup[- ]?agent|backup service)/.test(answer);
    const namesMemoryFailure = /(oom|out of memory|memory (leak|exhaustion)|exhausted (ram|memory))/.test(answer);
    if (!namesCulprit || !namesMemoryFailure) {
      appendOutput("RCA not accepted. Name both the responsible service/process and the memory-related failure it caused.", "error");
      return;
    }
    appendOutput("RCA accepted: rcw-backup.service developed an unbounded memory leak during its full index, exhausted system RAM, and triggered the OOM panic policy. The kernel panic caused the automatic reboot.\nRecommended controls: fix the leak, set MemoryMax for the service, and review vm.panic_on_oom policy.", "success");
    markObjective("report", 20, "✓ Objective 4 passed — root cause submitted and evidence chain confirmed. +20 points");
    appendOutput("Challenge complete. Final score: 100/100", "info");
    completeChallenge();
  }

  function showHelp() {
    appendOutput(
      "Investigation commands:\n" +
      "  last -x                         show reboot, shutdown and crash records\n" +
      "  who -b                          show current boot time\n" +
      "  uptime                          show time since current boot\n" +
      "  journalctl -b -1 -p err         inspect errors from the previous boot\n" +
      "  journalctl -k -b -1             inspect previous-boot kernel messages\n" +
      "  journalctl -b -1 -u <unit>      inspect a unit in the previous boot\n" +
      "  systemctl status|cat <unit>     inspect current unit state/configuration\n" +
      "  free -h                         show current memory usage\n" +
      "  df -h                           show filesystem usage\n" +
      "  cat <path> / sysctl <key>       inspect a setting\n" +
      "  submit <root cause>             file your final RCA\n" +
      "  history | clear | help          shell utilities",
      "info"
    );
  }

  function handleMan(topic = "") {
    const pages = {
      last: "LAST(1)\nNAME\n    last — show a listing of last logged in users and system events\nOPTIONS\n    -x  show system shutdown, run-level, reboot and crash entries",
      journalctl: "JOURNALCTL(1)\nNAME\n    journalctl — query the systemd journal\nOPTIONS\n    -b -1  previous boot\n    -p err errors and higher\n    -u UNIT messages for a unit",
      systemctl: "SYSTEMCTL(1)\nNAME\n    systemctl — control and inspect the systemd system and service manager",
      submit: "SUBMIT(1)\nNAME\n    submit — file the root-cause conclusion for this investigation\nSYNOPSIS\n    submit <root cause>"
    };
    appendOutput(pages[topic] || (topic ? `No manual entry for ${topic}` : "What manual page do you want?"), pages[topic] ? "info" : "error");
  }

  function markObjective(key, points, message) {
    if (state[key]) return;
    state[key] = true;
    state.score += points;
    appendOutput(message, "success");
    updateProgress();
    showToast(message.replace(/^[^—]+—\s*/, "").replace(/\s*\+\d+ points$/, ""));
  }

  function appendCommand(command) {
    const line = document.createElement("div");
    line.className = "output-entry output-command";
    const user = document.createElement("span");
    user.className = "prompt-user";
    user.textContent = "analyst@prod-web-01";
    const path = document.createElement("span");
    path.className = "prompt-path";
    path.textContent = ":~$";
    line.append(user, path, document.createTextNode(` ${command}`));
    terminalOutput.append(line);
  }

  function appendOutput(text, type = "") {
    if (text === "") return;
    const line = document.createElement("div");
    line.className = `output-entry output-text ${type}`.trim();
    line.textContent = text;
    terminalOutput.append(line);
  }

  function scrollTerminal() {
    requestAnimationFrame(() => {
      terminalBody.scrollTop = terminalBody.scrollHeight;
    });
  }

  function updateProgress() {
    const completedCount = [state.timeline, state.failure, state.culprit, state.report].filter(Boolean).length;
    scoreElement.textContent = String(state.score);
    progressText.textContent = `${completedCount} of 4 complete`;
    progressBar.style.width = `${completedCount * 25}%`;
    Object.entries(taskElements).forEach(([key, element]) => element.classList.toggle("is-complete", state[key]));
  }

  function completeChallenge() {
    if (state.completed || !state.report) return;
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
    appendOutput("Investigation reset. Start by establishing the crash and reboot timeline.", "info");
    startTimer();
    commandInput.focus();
  });

  $("#replayButton").addEventListener("click", beginChallenge);

  $("#fullscreenButton").addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        showToast("Focus mode enabled.");
      } else {
        await document.exitFullscreen();
      }
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
    const source = `${name}|${now.toISOString()}|${state.elapsedSeconds}|rca`;
    for (let i = 0; i < source.length; i += 1) {
      hash ^= source.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return `RCW-RCA-${datePart}-${(hash >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(-7)}`;
  }

  function renderCertificate() {
    const canvas = certificateCanvas;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#f4f0e6";
    ctx.fillRect(0, 0, W, H);

    // Soft paper texture.
    ctx.save();
    ctx.globalAlpha = 0.035;
    ctx.fillStyle = "#0b2b4c";
    for (let y = 0; y < H; y += 18) {
      for (let x = (y / 18) % 2 ? 9 : 0; x < W; x += 18) ctx.fillRect(x, y, 1.5, 1.5);
    }
    ctx.restore();

    // Deep-blue architectural border.
    ctx.strokeStyle = "#08233f";
    ctx.lineWidth = 22;
    ctx.strokeRect(26, 26, W - 52, H - 52);
    ctx.strokeStyle = "#12a9e9";
    ctx.lineWidth = 3;
    ctx.strokeRect(48, 48, W - 96, H - 96);
    ctx.strokeStyle = "#c8a847";
    ctx.lineWidth = 2;
    ctx.strokeRect(62, 62, W - 124, H - 124);

    // Branded top band and corner geometry.
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

    // RCW terminal emblem.
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
    ctx.fillText("Linux Challenge Champion", W / 2, 336);

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
    ctx.fillText("for successfully completing the RCW Linux server crash investigation", W / 2, 543);
    ctx.fillText("by identifying the memory-exhaustion failure chain and its responsible service.", W / 2, 574);

    // Achievement badge.
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

    // Issue details.
    ctx.textAlign = "left";
    drawMeta(ctx, 350, 676, "ISSUED ON", formatCertificateDate(new Date()));
    drawMeta(ctx, 350, 754, "CERTIFICATE ID", state.certificateId);
    drawMeta(ctx, 660, 676, "CHALLENGE", "Server crash root-cause analysis");
    drawMeta(ctx, 660, 754, "STATUS", "Root cause correctly identified");

    // Instructor portrait and signature.
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

    // Bottom verification line.
    ctx.fillStyle = "#e3ddd0";
    ctx.fillRect(92, 895, W - 184, 1);
    ctx.textAlign = "left";
    ctx.fillStyle = "#778994";
    ctx.font = "500 10px Arial, sans-serif";
    ctx.fillText("RCW IT Training certifies the successful completion recorded above.", 98, 921);
    ctx.textAlign = "right";
    ctx.fillText("Linux Troubleshooting · Challenge 02", W - 98, 921);
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
    return `rcw-linux-challenge-2-${safeName}.${extension}`;
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
