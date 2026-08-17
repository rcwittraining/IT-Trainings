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
    create: $("#taskCreate"),
    verify: $("#taskVerify"),
    edit: $("#taskEdit")
  };

  const ORIGINAL = "/data/db/orders.db";
  const LINK = "/backup/orders.db";
  const INODE = "525196"; // a realistic inode number for both names
  const DB_CONTENT = "order_id,customer,total\n1001,Rajesh,4200.00\n1002,Ananya,3150.50\n";
  const HOST = "data-node-01";

  // A virtual set of standard RHEL 10 files so exploration commands (cat, grep,
  // head, tail, wc, sort, getent) work anywhere in the lab.
  const SYSTEM_FILES = {
    "/etc/hostname": HOST + "\n",
    "/etc/redhat-release": "Red Hat Enterprise Linux release 10.0 (Plow)\n",
    "/etc/os-release": 'NAME="Red Hat Enterprise Linux"\nVERSION="10.0 (Plow)"\nID="rhel"\nID_LIKE="fedora"\nVERSION_ID="10.0"\nPRETTY_NAME="Red Hat Enterprise Linux 10.0 (Plow)"\n',
    "/etc/passwd": "root:x:0:0:root:/root:/bin/bash\nbin:x:1:1:bin:/bin:/sbin/nologin\nstudent:x:1000:1000:Student:/home/student:/bin/bash\noperator:x:1001:1001:Operator:/home/operator:/bin/bash\n",
    "/etc/group": "root:x:0:\nwheel:x:10:student\nstudent:x:1000:\noperator:x:1001:\n",
    "/etc/fstab": "/dev/mapper/rhel-root /  xfs  defaults  0 0\n/dev/sda1 /boot        xfs  defaults  0 0\n/dev/mapper/rhel-swap none swap defaults  0 0\n",
    "/etc/shells": "/bin/bash\n/usr/bin/bash\n/bin/sh\n/usr/bin/sh\n",
    "/etc/ssh/sshd_config": "# $OpenBSD: sshd_config\nPort 22\nPermitRootLogin no\nPasswordAuthentication yes\nPubkeyAuthentication yes\n",
    "/proc/version": "Linux version 6.12.0-55.el10.x86_64 (mockbuild@rhel10) (gcc version 14.2.1 20250103 (Red Hat 14.2.1-6))\n"
  };

  const state = {
    learnerName: "",
    inspect: false,
    create: false,
    verify: false,
    edit: false,
    hardLinkExists: false, // becomes true after ln (no -s)
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
    appendOutput("HLN-1001: The database " + ORIGINAL + " must also be reachable as " + LINK + " without duplicating data.\nMission: inspect its inode, create a HARD link (no -s), confirm both names share one inode, and prove the link by editing one and reading the other.", "warning");
    showScreen("lab");
    startTimer();
    setTimeout(() => commandInput.focus(), 180);
  }

  function resetChallengeState() {
    clearInterval(state.timerId);
    state.inspect = false;
    state.create = false;
    state.verify = false;
    state.edit = false;
    state.hardLinkExists = false;
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
      case "stat": handleStat(args); break;
      case "cat": handleCat(args); break;
      case "echo": handleEcho(args, cmd); break;
      case "cp": handleCp(args); break;
      case "find": handleFind(args); break;
      case "uname": handleUname(args); break;
      case "df": handleDf(args); break;
      case "free": handleFree(args); break;
      case "uptime": handleUptime(); break;
      case "hostnamectl": handleHostnamectl(args); break;
      case "getent": handleGetent(args); break;
      case "grep": handleGrep(args, cmd); break;
      case "head": handleHead(args); break;
      case "tail": handleTail(args); break;
      case "wc": handleWc(args); break;
      case "sort": handleSort(args); break;
      case "systemctl": handleSystemctl(args); break;
      case "pwd": appendOutput("/home/student"); break;
      case "whoami": appendOutput("student"); break;
      case "hostname": appendOutput(HOST); break;
      case "id": appendOutput("uid=1000(student) gid=1000(student) groups=1000(student),10(wheel)"); break;
      case "date": appendOutput("Sun Aug 16 11:35:10 IST 2026"); break;
      case "history": appendOutput(state.commandHistory.map((item, index) => `${String(index + 1).padStart(4, " ")}  ${item}`).join("\n")); break;
      case "clear": terminalOutput.replaceChildren(); break;
      case "help": showHelp(); break;
      case "man": handleMan(args[0]); break;
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

  function markInspect() {
    markObjective("inspect", 20, "✓ Objective 1 passed — the original file's inode and link count were inspected. +20 points");
  }

  // ---------- command handlers ----------
  function handleLs(args, cmd) {
    const long = /-l/.test(cmd);
    const inode = /-i/.test(cmd);
    const targets = args.filter((a) => !a.startsWith("-"));

    // ls -li /data/db/orders.db /backup/orders.db  (both)
    if (targets.length > 1 && targets.every((t) => t.includes("orders.db"))) {
      const linkCount = state.hardLinkExists ? 2 : 1;
      const lines = [];
      lines.push(inode ? INODE : "", "-rw-rw-r--." + " " + linkCount + " student student 56 Aug 16 08:00 " + targets[0]);
      if (state.hardLinkExists) {
        lines.push(inode ? INODE : "", "-rw-rw-r--." + " " + linkCount + " student student 56 Aug 16 08:00 " + targets[1]);
      } else {
        appendOutput("ls: cannot access '" + targets[1] + "': No such file or directory", "error");
        markInspect();
        return;
      }
      appendMultiline(lines.filter(Boolean).join("\n"));
      markInspect();
      if (state.hardLinkExists) {
        markObjective("verify", 25, "✓ Objective 3 passed — both names share inode " + INODE + " with link count 2. +25 points");
      }
      return;
    }

    // single file
    if (targets.length === 1 && targets[0].includes("orders.db")) {
      const isLink = targets[0].includes("/backup/");
      if (isLink && !state.hardLinkExists) { appendOutput("ls: cannot access '" + targets[0] + "': No such file or directory", "error"); return; }
      const linkCount = state.hardLinkExists ? 2 : 1;
      appendOutput((inode ? INODE + " " : "") + "-rw-rw-r--." + " " + linkCount + " student student 56 Aug 16 08:00 " + targets[0].split("/").pop());
      markInspect();
      return;
    }

    // directory listings
    if (targets[0] && (targets[0].includes("/data/db") || targets[0].includes("/backup"))) {
      const lines = ["total 8"];
      if (targets[0].includes("/data/db")) {
        lines.push((inode ? INODE + " " : "") + "-rw-rw-r--." + " " + (state.hardLinkExists ? 2 : 1) + " student student 56 Aug 16 08:00 orders.db");
      } else if (targets[0].includes("/backup")) {
        if (state.hardLinkExists) lines.push((inode ? INODE + " " : "") + "-rw-rw-r--." + " 2 student student 56 Aug 16 08:00 orders.db");
      }
      appendMultiline(lines.join("\n"));
      markInspect();
      return;
    }
    appendOutput(".bashrc   .profile");
  }

  function handleLn(args) {
    const symbolic = args.some((a) => a === "-s");
    const targets = args.filter((a) => !a.startsWith("-"));
    const src = targets[0];
    const dst = targets[1];

    if (!src || !dst) { appendOutput("ln: missing file operand", "error"); return; }

    // Hard link must be created WITHOUT -s
    if (symbolic) {
      appendOutput("ln: -s creates a SOFT link (a separate inode pointing at a path).\nThis task needs a HARD link — drop the -s flag: ln " + ORIGINAL + " " + LINK, "error");
      return;
    }

    // Correct hard link
    if (src.includes("orders.db") && dst.includes("orders.db")) {
      if (state.hardLinkExists) { appendOutput("ln: failed to create hard link '" + dst + "': File exists", "error"); return; }
      if (!src.includes("/data/db") || !dst.includes("/backup")) {
        appendOutput("ln: link should connect " + ORIGINAL + " → " + LINK, "error");
        return;
      }
      state.hardLinkExists = true;
      appendOutput("(hard link created: " + dst + " -> " + src + ", link count now 2)");
      markObjective("create", 30, "✓ Objective 2 passed — the hard link was created (no -s flag). +30 points");
      return;
    }
    appendOutput("ln: unrecognised targets. Expected: ln " + ORIGINAL + " " + LINK);
  }

  function handleStat(args) {
    const targets = args.filter((a) => !a.startsWith("-"));
    if (!targets.length) { appendOutput("stat: missing operand", "error"); return; }
    targets.forEach((t) => {
      if (!t.includes("orders.db")) { appendOutput("stat: cannot statx '" + t + "': No such file or directory", "error"); return; }
      const isLink = t.includes("/backup/");
      if (isLink && !state.hardLinkExists) { appendOutput("stat: cannot statx '" + t + "': No such file or directory", "error"); return; }
      appendOutput("  File: " + t + "\n  Size: 56          Blocks: 8          IO Block: 4096   regular file\nDevice: 253,0     Inode: " + INODE + "     Links: " + (state.hardLinkExists ? 2 : 1));
      markInspect();
    });
  }

  function handleCat(args) {
    const targets = args.filter((a) => !a.startsWith("-"));
    if (!targets.length) {
      appendOutput("cat: no input files (stdin is not available in this terminal)");
      return;
    }
    targets.forEach((t) => {
      if (Object.prototype.hasOwnProperty.call(SYSTEM_FILES, t)) {
        appendMultiline(SYSTEM_FILES[t].replace(/\n$/, ""));
        return;
      }
      if (!t.includes("orders.db")) { appendOutput("cat: " + t + ": No such file or directory", "error"); return; }
      const isLink = t.includes("/backup/");
      if (isLink && !state.hardLinkExists) { appendOutput("cat: " + t + ": No such file or directory", "error"); return; }
      appendMultiline(DB_CONTENT.replace(/\n$/, ""));
    });
  }

  function handleEcho(args, cmd) {
    // echo "text" >> file
    const append = />>/.test(cmd);
    const m = cmd.match(/>>\s*(\S+)/) || cmd.match(/>\s*(\S+)/);
    if (m && m[1].includes("orders.db")) {
      const text = args.join(" ");
      if (append) {
        appendOutput("(appended to " + m[1] + ")");
        // If editing one name, the change is visible via the other (same inode).
        if (state.hardLinkExists) {
          markObjective("edit", 25, "✓ Objective 4 passed — the edit on one name is visible through the hard link. +25 points");
          completeChallenge();
        }
        return;
      }
      appendOutput("(wrote to " + m[1] + ")");
      if (state.hardLinkExists) {
        markObjective("edit", 25, "✓ Objective 4 passed — the edit on one name is visible through the hard link. +25 points");
        completeChallenge();
      }
      return;
    }
    // plain echo
    appendOutput(args.join(" "));
  }

  function handleCp(args) {
    const targets = args.filter((a) => !a.startsWith("-"));
    const src = targets[0], dst = targets[1];
    if (src && src.includes("orders.db") && dst && dst.includes("/backup")) {
      appendOutput("cp would create a SEPARATE copy (new inode, double disk usage).\nFor a hard link (same inode, no extra data), use: ln " + ORIGINAL + " " + LINK, "info");
      return;
    }
    appendOutput("cp: missing file operand", "error");
  }

  function handleFind(args) {
    const samefile = args.some((a) => a === "-samefile");
    const target = args.filter((a) => !a.startsWith("-") && a !== "-samefile").pop() || "";
    if (samefile || args.includes("-samefile")) {
      const out = [ORIGINAL];
      if (state.hardLinkExists) out.push(LINK);
      appendMultiline(out.join("\n"));
      markInspect();
      return;
    }
    appendOutput(ORIGINAL + (state.hardLinkExists ? "\n" + LINK : ""));
  }

  // ---------- standard RHEL 10 commands ----------
  function handleUname(args) {
    if (args.includes("-a")) appendOutput("Linux " + HOST + " 6.12.0-55.el10.x86_64 #1 SMP PREEMPT_DYNAMIC Wed Jul 15 10:00:00 UTC 2026 x86_64 x86_64 x86_64 GNU/Linux");
    else if (args.includes("-r")) appendOutput("6.12.0-55.el10.x86_64");
    else appendOutput("Linux");
  }
  function handleDf(args) {
    appendOutput("Filesystem              1K-blocks    Used Available Use% Mounted on\n/dev/mapper/rhel-root   27194112 4172192  23021920  16% /\n/dev/sda1                 1038336  230400    807936  23% /boot\n/dev/vg_data/lv_app     30929920 29383424   1546496  95% /data\ntmpfs                     4076912       0   4076912   0% /dev/shm");
  }
  function handleFree(args) {
    appendOutput("               total        used        free      shared  buff/cache   available\nMem:         8153824     1204120     5232216       84020     1717488     6610940\nSwap:        3145728           0     3145728");
  }
  function handleUptime() { appendOutput(" 11:45:00 up  3:40,  1 user,  load average: 0.05, 0.09, 0.08"); }
  function handleHostnamectl(args) {
    if (args.includes("set-hostname")) { appendOutput("hostname set to " + (args[args.length - 1] || HOST)); return; }
    appendOutput("   Static hostname: " + HOST + "\n         Icon name: computer-vm\n           Chassis: vm\n  Operating System: Red Hat Enterprise Linux 10.0\n            Kernel: Linux 6.12.0-55.el10.x86_64\n      Architecture: x86-64");
  }
  function handleGetent(args) {
    const db = (args[0] || "").toLowerCase();
    const key = args[1];
    if (db === "passwd") {
      const line = key ? SYSTEM_FILES["/etc/passwd"].split("\n").find((l) => l.startsWith(key + ":")) : SYSTEM_FILES["/etc/passwd"];
      if (line) appendMultiline(line.replace(/\n$/, "")); else appendOutput("getent: no entry", "error");
      return;
    }
    if (db === "group") {
      const line = key ? SYSTEM_FILES["/etc/group"].split("\n").find((l) => l.startsWith(key + ":")) : SYSTEM_FILES["/etc/group"];
      if (line) appendMultiline(line.replace(/\n$/, "")); else appendOutput("getent: no entry", "error");
      return;
    }
    if (db === "hosts") appendOutput("192.168.1.20  " + HOST + " " + HOST.split(".")[0]);
    else appendOutput("getent: unknown database", "error");
  }
  function handleGrep(args, cmd) {
    const targets = args.filter((a) => !a.startsWith("-"));
    const pattern = targets.shift();
    if (!pattern) { appendOutput("Usage: grep [OPTION]... PATTERN [FILE]...", "error"); return; }
    const ci = /-i/.test(cmd);
    const re = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), ci ? "i" : "");
    targets.forEach((t) => {
      const content = SYSTEM_FILES[t] || (t.includes("orders.db") ? DB_CONTENT : null);
      if (content) content.split("\n").forEach((line) => { if (re.test(line)) appendOutput(line); });
      else appendOutput("grep: " + t + ": No such file or directory", "error");
    });
  }
  function handleHead(args) {
    const n = parseInt((args.find((a) => a.startsWith("-n")) || "").replace("-n", ""), 10) || 10;
    const t = args.filter((a) => !a.startsWith("-")).pop() || "";
    const content = SYSTEM_FILES[t] || (t.includes("orders.db") ? DB_CONTENT : null);
    if (!content) { appendOutput("head: cannot open '" + t + "': No such file or directory", "error"); return; }
    appendMultiline(content.split("\n").slice(0, n).join("\n"));
  }
  function handleTail(args) {
    const n = parseInt((args.find((a) => a.startsWith("-n")) || "").replace("-n", ""), 10) || 10;
    const t = args.filter((a) => !a.startsWith("-")).pop() || "";
    const content = SYSTEM_FILES[t] || (t.includes("orders.db") ? DB_CONTENT : null);
    if (!content) { appendOutput("tail: cannot open '" + t + "': No such file or directory", "error"); return; }
    appendMultiline(content.split("\n").slice(-n).join("\n"));
  }
  function handleWc(args) {
    const t = args.filter((a) => !a.startsWith("-")).pop() || "";
    const content = SYSTEM_FILES[t] || (t.includes("orders.db") ? DB_CONTENT : null);
    if (!content) { appendOutput("wc: " + t + ": No such file or directory", "error"); return; }
    const lines = content.split("\n").length - (content.endsWith("\n") ? 1 : 0);
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    appendOutput("  " + lines + "  " + words + "  " + content.length + " " + t);
  }
  function handleSort(args) {
    const t = args.filter((a) => !a.startsWith("-")).pop() || "";
    const content = SYSTEM_FILES[t] || (t.includes("orders.db") ? DB_CONTENT : null);
    if (!content) { appendOutput("sort: " + t + ": No such file or directory", "error"); return; }
    appendMultiline(content.split("\n").filter(Boolean).sort().join("\n"));
  }
  function handleSystemctl(args) {
    const action = (args[0] || "").toLowerCase();
    const unit = (args.filter((a) => !a.startsWith("-")).pop() || "").toLowerCase();
    if (action === "status" && unit === "sshd") {
      appendOutput("● sshd.service - OpenSSH server daemon\n     Loaded: loaded (/usr/lib/systemd/system/sshd.service; enabled)\n     Active: active (running) since Sun 2026-08-16 08:00:00 IST; 3h ago");
    } else {
      appendOutput("systemctl: use 'systemctl status sshd'");
    }
  }

  function showHelp() {
    appendOutput(
      "Hard link commands:\n" +
      "  ls -li /data/db/orders.db          inspect inode + link count\n" +
      "  stat /data/db/orders.db            detailed inode/link metadata\n" +
      "  ln /data/db/orders.db /backup/orders.db   create a HARD link (no -s)\n" +
      "  ls -li /data/db/orders.db /backup/orders.db   confirm same inode\n" +
      "  find /data -samefile /data/db/orders.db       find all names of an inode\n" +
      "  echo 'x' >> /data/db/orders.db     edit (visible via the link)\n" +
      "  cat /backup/orders.db              read via the other name\n" +
      "  history | clear | help             shell utilities",
      "info"
    );
  }

  function handleMan(topic = "") {
    const pages = {
      ln: "LN(1)\nNAME\n    ln - make links between files\nDESCRIPTION\n    By default (no -s), ln makes HARD links: multiple names for the SAME inode.\n    A hard link shares data; deleting one name does not remove the data while other links exist.\nOPTIONS\n    -s  make symbolic links instead",
      stat: "STAT(1)\nNAME\n    stat - display file or file system status\nKEY FIELDS\n    Inode  the inode number\n    Links  the number of hard links to this inode",
      find: "FIND(1)\nNAME\n    find - search for files in a directory hierarchy\nEXAMPLE\n    find / -samefile /data/db/orders.db"
    };
    appendOutput(pages[topic] || (topic ? `No manual entry for ${topic}` : "What manual page do you want?"), pages[topic] ? "info" : "error");
  }

  function appendCommand(command) {
    const line = document.createElement("div");
    line.className = "output-entry output-command";
    const user = document.createElement("span");
    user.className = "prompt-user";
    user.textContent = "student@data-node-01";
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
    const completedCount = [state.inspect, state.create, state.verify, state.edit].filter(Boolean).length;
    scoreElement.textContent = String(state.score);
    progressText.textContent = `${completedCount} of 4 complete`;
    progressBar.style.width = `${completedCount * 25}%`;
    Object.entries(taskElements).forEach(([key, element]) => element.classList.toggle("is-complete", state[key]));
  }

  function completeChallenge() {
    if (state.completed || !state.edit) return;
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
    appendOutput("Link task reset. Start by inspecting the database file's inode.", "info");
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
    const source = `${name}|${now.toISOString()}|${state.elapsedSeconds}|hard-links`;
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `RCW-HLN-${datePart}-${(hash >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(-7)}`;
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
    ctx.fillText("for successfully completing the RCW hard links challenge", W / 2, 543);
    ctx.fillText("by creating a hard link, confirming a shared inode, and proving the link with a live edit.", W / 2, 574);

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
    drawMeta(ctx, 660, 676, "CHALLENGE", "Hard link creation and verification");
    drawMeta(ctx, 660, 754, "STATUS", "All hard-link objectives passed");

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
    ctx.fillText("RHEL 10 Filesystem · Challenge 10", W - 98, 921);
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
    return `rcw-hardlink-challenge-10-${safeName}.${extension}`;
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
