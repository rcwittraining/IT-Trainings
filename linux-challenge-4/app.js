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
    account: $("#taskAccount"),
    hash: $("#taskHash"),
    crack: $("#taskCrack"),
    report: $("#taskReport")
  };

  const ROOT_HASH = "$6$rcwlab2026$Iacc3qKjwlYUjM.NNoNeiSSd2YpiBRz5.Li3ijU1IuHo7oBb55GEzRe2eLv33oLBNGuWvlRNd/oDqrsRtkAfF.";
  const TRAINING_PASSWORD = "RcwRoot2026!";

  const state = {
    learnerName: "",
    account: false,
    hash: false,
    crack: false,
    report: false,
    auditPrepared: false,
    crackedPassword: "",
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
    appendOutput("CHG-0816: The root password for lab-auth-01 is unknown after an administrator handover.\nAuthorisation: local password audit approved for this isolated training host. Inspect the account, prepare an offline audit file, recover the weak credential, and submit it.", "warning");
    showScreen("lab");
    startTimer();
    setTimeout(() => commandInput.focus(), 180);
  }

  function resetChallengeState() {
    clearInterval(state.timerId);
    state.account = false;
    state.hash = false;
    state.crack = false;
    state.report = false;
    state.auditPrepared = false;
    state.crackedPassword = "";
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
      case "sudo":
        handleSudo(args, rawCommand);
        break;
      case "grep":
        handleGrep(args, rawCommand);
        break;
      case "cat":
        handleCat(args);
        break;
      case "getent":
        handleGetent(args);
        break;
      case "passwd":
        handlePasswd(args);
        break;
      case "ls":
        handleLs(args);
        break;
      case "unshadow":
        handleUnshadow(args, rawCommand);
        break;
      case "cut":
      case "awk":
        handleExtractHash(rawCommand);
        break;
      case "john":
        handleJohn(args, rawCommand);
        break;
      case "hashcat":
        handleHashcat(args, rawCommand);
        break;
      case "file":
        handleFile(args);
        break;
      case "head":
      case "tail":
        handleWordlist(command, args);
        break;
      case "wc":
        handleWc(args);
        break;
      case "openssl":
        handleOpenSsl(args);
        break;
      case "id":
        appendOutput(args.includes("root") ? "uid=0(root) gid=0(root) groups=0(root)" : "uid=1004(analyst) gid=1004(analyst) groups=1004(analyst),190(systemd-journal)");
        break;
      case "date":
        appendOutput("Sun Aug 16 04:12:08 IST 2026");
        break;
      case "hostname":
        appendOutput("lab-auth-01");
        break;
      case "hostnamectl":
        appendOutput(" Static hostname: lab-auth-01\n       Icon name: computer-vm\n         Chassis: vm\nOperating System: Red Hat Enterprise Linux 10.0\n          Kernel: Linux 6.12.0-55.el10.x86_64\n    Architecture: x86-64");
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

  function rootShadowLine() {
    return `root:${ROOT_HASH}:20681:0:99999:7:::`;
  }

  function handleSudo(args, rawCommand) {
    const subcommand = (args[0] || "").toLowerCase();
    const rest = args.slice(1);
    if (subcommand === "grep") handleGrep(rest, rawCommand.replace(/^sudo\s+/i, ""));
    else if (subcommand === "cat") handleCat(rest);
    else if (subcommand === "getent") handleGetent(rest);
    else if (subcommand === "unshadow") handleUnshadow(rest, rawCommand.replace(/^sudo\s+/i, ""));
    else appendOutput("sudo: this authorised lab is read-only; use inspection and offline-audit commands only", "error");
  }

  function handleGrep(args, rawCommand) {
    const query = rawCommand.toLowerCase();
    if (query.includes("/etc/shadow") && query.includes("root")) {
      appendOutput(rootShadowLine());
      markObjective("account", 20, "✓ Objective 1 passed — the root account and its local password hash were located. +20 points");
    } else if (query.includes("/etc/passwd") && query.includes("root")) {
      appendOutput("root:x:0:0:root:/root:/bin/bash");
    } else appendOutput("grep: no matching audit evidence");
  }

  function handleCat(args) {
    const path = args.find((arg) => !arg.startsWith("-")) || "";
    if (path === "/etc/shadow") {
      appendOutput(rootShadowLine());
      markObjective("account", 20, "✓ Objective 1 passed — the root account and its local password hash were located. +20 points");
    } else if (path === "/etc/passwd") {
      appendOutput("root:x:0:0:root:/root:/bin/bash\nbin:x:1:1:bin:/bin:/sbin/nologin\nanalyst:x:1004:1004:Security Analyst:/home/analyst:/bin/bash");
    } else if (path === "/tmp/rcw-audit.txt") {
      if (!state.auditPrepared) appendOutput("cat: /tmp/rcw-audit.txt: No such file or directory", "error");
      else appendOutput(`root:${ROOT_HASH}:0:0:root:/root:/bin/bash`);
    } else if (path === "/tmp/root.hash") {
      if (!state.auditPrepared) appendOutput("cat: /tmp/root.hash: No such file or directory", "error");
      else appendOutput(ROOT_HASH);
    } else if (path.includes("rcw-training.txt")) {
      appendOutput("[training wordlist: 2,048 approved candidates]\nSpring2026!\nWelcome123!\nRcwAdmin2026!\n...\n[candidate list truncated]");
    } else appendOutput(`cat: ${path || "missing operand"}: No such file or directory`, "error");
  }

  function handleGetent(args) {
    const database = (args[0] || "").toLowerCase();
    const key = (args[1] || "").toLowerCase();
    if (database === "shadow" && key === "root") {
      appendOutput(rootShadowLine());
      markObjective("account", 20, "✓ Objective 1 passed — the root account and its local password hash were located. +20 points");
    } else if (database === "passwd" && key === "root") appendOutput("root:x:0:0:root:/root:/bin/bash");
    else appendOutput("getent: no matching entry");
  }

  function handlePasswd(args) {
    if ((args.includes("-S") || args.includes("--status")) && args.includes("root")) {
      appendOutput("root PS 2026-08-16 0 99999 7 -1 (Password set, SHA512 crypt.)");
      markObjective("account", 20, "✓ Objective 1 passed — the root account has a set local password. +20 points");
    } else appendOutput("passwd: password changes are disabled; this challenge requires an offline audit", "error");
  }

  function handleLs(args) {
    const joined = args.join(" ");
    if (joined.includes("/etc/shadow")) appendOutput("-rw-r----- 1 root shadow 1298 Aug 16 03:58 /etc/shadow");
    else if (joined.includes("/tmp/rcw-audit.txt")) appendOutput(state.auditPrepared ? "-rw------- 1 analyst analyst 163 Aug 16 04:05 /tmp/rcw-audit.txt" : "ls: cannot access '/tmp/rcw-audit.txt': No such file or directory", state.auditPrepared ? "" : "error");
    else if (joined.includes("wordlists")) appendOutput("-rw-r--r-- 1 root root 27142 Aug 16 03:55 rcw-training.txt");
    else appendOutput("total 0");
  }

  function handleUnshadow(args, rawCommand) {
    const joined = `${args.join(" ")} ${rawCommand}`;
    if (!joined.includes("/etc/passwd") || !joined.includes("/etc/shadow")) {
      appendOutput("Usage: unshadow /etc/passwd /etc/shadow > /tmp/rcw-audit.txt", "error");
      return;
    }
    state.auditPrepared = true;
    appendOutput("Audit file prepared: /tmp/rcw-audit.txt\nDetected hash prefix $6$: SHA-512 crypt (sha512crypt).", "info");
    markObjective("hash", 25, "✓ Objective 2 passed — SHA-512 crypt was identified and the offline audit file was prepared. +25 points");
  }

  function handleExtractHash(rawCommand) {
    const query = rawCommand.toLowerCase();
    if (!query.includes("shadow") || !query.includes("root")) {
      appendOutput("No hash extracted. Select the root record from /etc/shadow.", "error");
      return;
    }
    state.auditPrepared = true;
    appendOutput(`${ROOT_HASH}\nHash written to /tmp/root.hash\nMode: 1800 (sha512crypt $6$, SHA512 Unix)`);
    markObjective("hash", 25, "✓ Objective 2 passed — SHA-512 crypt was identified and an offline hash file was prepared. +25 points");
  }

  function handleJohn(args, rawCommand) {
    const query = rawCommand.toLowerCase();
    if (args.includes("--show") || query.includes("--show")) {
      if (!state.crackedPassword) {
        appendOutput("0 password hashes cracked, 1 left");
        return;
      }
      appendOutput(`root:${TRAINING_PASSWORD}:0:0:root:/root:/bin/bash\n\n1 password hash cracked, 0 left`);
      return;
    }
    const hasWordlist = query.includes("--wordlist") || query.includes("rcw-training.txt");
    const hasAudit = query.includes("rcw-audit.txt") || query.includes("root.hash");
    if (!state.auditPrepared || !hasAudit) {
      appendOutput("No password hashes loaded. Prepare /tmp/rcw-audit.txt with unshadow first.", "error");
      return;
    }
    if (!hasWordlist) {
      appendOutput("Audit policy requires the approved wordlist: --wordlist=/usr/share/wordlists/rcw-training.txt", "warning");
      return;
    }
    state.crackedPassword = TRAINING_PASSWORD;
    appendOutput("Using default input encoding: UTF-8\nLoaded 1 password hash (sha512crypt, crypt(3) $6$ [SHA512 256/256 AVX2 4x])\nCost 1 (iteration count) is 5000 for all loaded hashes\nPress 'q' or Ctrl-C to abort, almost any other key for status\nRcwRoot2026!    (root)\n1g 0:00:00:01 DONE (2026-08-16 04:07) 0.7246g/s 1484p/s 1484c/s\nUse the --show option to display the cracked credential reliably.", "success");
    markObjective("crack", 35, "✓ Objective 3 passed — the authorised wordlist audit recovered the training password. +35 points");
  }

  function handleHashcat(args, rawCommand) {
    const query = rawCommand.toLowerCase();
    if (!state.auditPrepared || (!query.includes("root.hash") && !query.includes("rcw-audit.txt"))) {
      appendOutput("Hashcat: prepare /tmp/root.hash from the root shadow entry first.", "error");
      return;
    }
    if (!query.includes("1800") || !query.includes("rcw-training.txt")) {
      appendOutput("Hashcat: use mode 1800 and the approved rcw-training.txt wordlist.", "warning");
      return;
    }
    state.crackedPassword = TRAINING_PASSWORD;
    appendOutput(`${ROOT_HASH}:${TRAINING_PASSWORD}\n\nSession..........: rcw-training-audit\nStatus...........: Cracked\nHash.Mode........: 1800 (sha512crypt $6$, SHA512 (Unix))\nRecovered........: 1/1 (100.00%) Digests`, "success");
    markObjective("crack", 35, "✓ Objective 3 passed — the authorised wordlist audit recovered the training password. +35 points");
  }

  function handleFile(args) {
    const path = args.find((arg) => !arg.startsWith("-")) || "";
    if ((path === "/tmp/rcw-audit.txt" || path === "/tmp/root.hash") && state.auditPrepared) appendOutput(`${path}: ASCII text, with very long lines (SHA-512 crypt password audit data)`);
    else appendOutput(`${path || "file"}: cannot open: No such file or directory`, "error");
  }

  function handleWordlist(command, args) {
    if (!args.join(" ").includes("rcw-training.txt")) {
      appendOutput(`${command}: cannot open input`, "error");
      return;
    }
    appendOutput(command === "head"
      ? "Password1\nWelcome123\nSummer2026\nAdmin@123\nRcwTraining!"
      : "LinuxLab!\nCloudAdmin2026\nAugust#2026\nRootAccess!\nTrainingOnly!");
  }

  function handleWc(args) {
    if (args.join(" ").includes("rcw-training.txt")) appendOutput("2048 /usr/share/wordlists/rcw-training.txt");
    else appendOutput("wc: no supported audit file selected", "error");
  }

  function handleOpenSsl(args) {
    const joined = args.join(" ");
    if (!joined.includes("passwd")) {
      appendOutput("OpenSSL 3.2.2 4 Jun 2026");
      return;
    }
    const candidate = args[args.length - 1] || "";
    if (candidate === TRAINING_PASSWORD) appendOutput(ROOT_HASH);
    else appendOutput("$6$rcwlab2026$[different SHA-512 crypt digest]");
  }

  function handleSubmit(args) {
    const answer = args.join(" ").trim();
    if (!answer) {
      appendOutput("Usage: submit <recovered password>\nPasswords are case-sensitive.", "error");
      return;
    }
    if (!state.account || !state.hash || !state.crack) {
      appendOutput("Submission held: inspect the account, prepare the offline audit, and recover the credential before submitting.", "warning");
      return;
    }
    if (answer !== TRAINING_PASSWORD) {
      appendOutput("Password not accepted. Use john --show /tmp/rcw-audit.txt and preserve exact capitalization and symbols.", "error");
      return;
    }
    appendOutput("Password accepted: RcwRoot2026!\nAudit finding: the root account used SHA-512 crypt, but the credential was present in the supplied 2,048-entry training wordlist and was recovered quickly.\nRecommended actions: reset to a unique high-entropy credential, restrict direct root authentication, store emergency access in an approved vault, and monitor credential age.", "success");
    markObjective("report", 20, "✓ Objective 4 passed — the recovered credential and password-audit finding were validated. +20 points");
    appendOutput("Challenge complete. Final score: 100/100", "info");
    completeChallenge();
  }

  function showHelp() {
    appendOutput(
      "Password audit commands:\n" +
      "  sudo grep '^root:' /etc/shadow  inspect the root shadow record\n" +
      "  passwd -S root                    show root password status\n" +
      "  getent passwd|shadow root         query local account databases\n" +
      "  unshadow /etc/passwd /etc/shadow > /tmp/rcw-audit.txt\n" +
      "                                      prepare an offline John audit file\n" +
      "  john --wordlist=<file> <audit>    run the approved wordlist audit\n" +
      "  john --show <audit>               display recovered credentials\n" +
      "  hashcat -m 1800 <hash> <wordlist> alternative approved audit path\n" +
      "  head|tail|wc <wordlist>           inspect the supplied candidate list\n" +
      "  submit <password>                 validate the recovered password\n" +
      "  history | clear | help            shell utilities",
      "info"
    );
  }

  function handleMan(topic = "") {
    const pages = {
      shadow: "SHADOW(5)\nNAME\n    shadow — encrypted password file\nFORMAT\n    login:encrypted-password:last-change:min:max:warn:inactive:expire:reserved\n    Prefix $6$ identifies SHA-512 crypt.",
      unshadow: "UNSHADOW(8)\nNAME\n    unshadow — combine passwd and shadow data for an authorised offline audit",
      john: "JOHN(8)\nNAME\n    john — password security auditing tool\nOPTIONS\n    --wordlist=FILE  use a controlled candidate list\n    --show           display cracked credentials",
      hashcat: "HASHCAT(1)\nNAME\n    hashcat — password recovery and auditing utility\nMODE\n    1800  sha512crypt $6$, SHA512 (Unix)",
      submit: "SUBMIT(1)\nNAME\n    submit — validate the recovered training password\nSYNOPSIS\n    submit <password>"
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
    user.textContent = "analyst@lab-auth-01";
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
    const completedCount = [state.account, state.hash, state.crack, state.report].filter(Boolean).length;
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
    appendOutput("Password audit reset. Start by inspecting the root account and shadow record.", "info");
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
    const source = `${name}|${now.toISOString()}|${state.elapsedSeconds}|password-audit`;
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `RCW-PWA-${datePart}-${(hash >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(-7)}`;
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
    ctx.fillText("for successfully completing the RCW Linux root password audit", W / 2, 543);
    ctx.fillText("by identifying the root hash and recovering the authorised training credential.", W / 2, 574);

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
    drawMeta(ctx, 660, 676, "CHALLENGE", "Root password recovery and audit");
    drawMeta(ctx, 660, 754, "STATUS", "All password-audit objectives passed");

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
    ctx.fillText("Linux Authentication · Challenge 04", W - 98, 921);
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
    return `rcw-linux-challenge-4-${safeName}.${extension}`;
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
