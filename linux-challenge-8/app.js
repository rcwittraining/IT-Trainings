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
    install: $("#taskInstall"),
    config: $("#taskConfig"),
    start: $("#taskStart"),
    verify: $("#taskVerify")
  };

  const LAN_SUBNET = "192.168.1.0/24";
  const PROXY_PORT = "3128";

  const state = {
    learnerName: "",
    squidInstalled: false,
    install: false,
    config: false,
    serviceStarted: false,
    start: false,
    firewallOpened: false,
    verify: false,
    score: 0,
    commandHistory: [],
    historyIndex: 0,
    commandCount: 0,
    startedAt: 0,
    elapsedSeconds: 0,
    timerId: null,
    completed: false,
    certificateId: "",
    heredocDelimiter: null,
    heredocBuffer: [],
    heredocCommand: ""
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
    appendOutput("PRX-0801: Workstations on 192.168.1.0/24 need controlled internet access via a caching proxy.\nNo proxy is installed on squid-01 (RHEL 10).\nMission: install Squid, allow the LAN subnet on port 3128, enable the service, open the firewall, and verify a proxied request.", "warning");
    showScreen("lab");
    startTimer();
    setTimeout(() => commandInput.focus(), 180);
  }

  function resetChallengeState() {
    clearInterval(state.timerId);
    state.squidInstalled = false;
    state.install = false;
    state.config = false;
    state.serviceStarted = false;
    state.start = false;
    state.firewallOpened = false;
    state.verify = false;
    state.score = 0;
    state.commandHistory = [];
    state.historyIndex = 0;
    state.commandCount = 0;
    state.startedAt = Date.now();
    state.elapsedSeconds = 0;
    state.completed = false;
    state.certificateId = "";
    state.heredocDelimiter = null;
    state.heredocBuffer = [];
    state.heredocCommand = "";
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

    if (state.heredocDelimiter) {
      if (rawCommand.trim() === state.heredocDelimiter) {
        const block = state.heredocBuffer.join("\n");
        state.heredocBuffer = [];
        state.heredocDelimiter = null;
        finishHeredoc(state.heredocCommand, block);
        state.heredocCommand = "";
      } else {
        state.heredocBuffer.push(rawCommand);
      }
      scrollTerminal();
      return;
    }

    const heredocMatch = rawCommand.match(/<<\s*['"]?([A-Za-z_][A-Za-z0-9_]*)['"]?\s*$/);
    if (heredocMatch) {
      state.heredocDelimiter = heredocMatch[1];
      state.heredocBuffer = [];
      state.heredocCommand = rawCommand;
      appendOutput(">  (heredoc open — type the config, then the delimiter '" + heredocMatch[1] + "' on its own line)", "info");
      scrollTerminal();
      return;
    }

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
      case "dnf":
      case "yum":
        handleDnf(args, cmd);
        break;
      case "systemctl":
        handleSystemctl(args);
        break;
      case "firewall-cmd":
        handleFirewall(args);
        break;
      case "curl":
        handleCurl(args, cmd);
        break;
      case "tee":
        handleTee(args, cmd, rawCommand);
        break;
      case "cat":
        handleCat(args);
        break;
      case "ss":
        handleSs(args);
        break;
      case "rpm":
        handleRpm(args);
        break;
      case "pwd":
        appendOutput("/home/admin");
        break;
      case "whoami":
        appendOutput("admin");
        break;
      case "hostname":
        appendOutput("squid-01");
        break;
      case "id":
        appendOutput("uid=1000(admin) gid=1000(admin) groups=1000(admin),10(wheel)");
        break;
      case "date":
        appendOutput("Sun Aug 16 10:20:55 IST 2026");
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

  // ---------- objective marking ----------
  function markObjective(key, points, message) {
    if (state[key]) return;
    state[key] = true;
    state.score += points;
    appendOutput(message, "success");
    updateProgress();
    showToast(message.replace(/^[^—]+—\s*/, "").replace(/\s*\+\d+ points$/, ""));
  }

  // ---------- heredoc ----------
  function finishHeredoc(openingCommand, block) {
    const cmd = openingCommand.replace(/^sudo\s+/i, "").replace(/<<\s*['"]?[A-Za-z_][A-Za-z0-9_]*['"]?.*$/, "").trim();
    if (/tee/.test(cmd) && /squid\.conf/.test(cmd)) {
      writeConfigFromBlock(block);
      return;
    }
    appendOutput("heredoc: unsupported target. Write the config with: sudo tee /etc/squid/squid.conf <<'EOF'", "error");
  }

  function writeConfigFromBlock(block) {
    if (!state.squidInstalled) {
      appendOutput("tee: /etc/squid/squid.conf: No such file or directory — install Squid first.", "error");
      return;
    }
    const body = block.toLowerCase();
    const hasPort = /http_port\s+3128/.test(body);
    const hasAcl = /acl\s+localnet\s+src\s+192\.168\.1\.0\/24/.test(body) || /acl\s+localnet\s+src\s+192\.168\.1\.0/.test(body);
    const hasAllow = /http_access\s+allow\s+localnet/.test(body);
    if (!hasPort || !hasAcl || !hasAllow) {
      appendOutput("tee: the squid.conf is incomplete. It needs:\n  http_port 3128\n  acl localnet src 192.168.1.0/24\n  http_access allow localnet", "error");
      return;
    }
    appendOutput("Wrote /etc/squid/squid.conf");
    markObjective("config", 30, "✓ Objective 2 passed — Squid was configured for the LAN on port 3128. +30 points");
  }

  function handleTee(args, cmd, rawCommand) {
    if (!/squid\.conf/.test(cmd)) {
      appendOutput("tee: missing target. Write the config to /etc/squid/squid.conf", "error");
      return;
    }
    if (!state.squidInstalled) {
      appendOutput("tee: /etc/squid/squid.conf: No such file or directory — install Squid first.", "error");
      return;
    }
    const body = rawCommand.toLowerCase();
    const hasPort = /http_port\s+3128/.test(body);
    const hasAcl = /acl\s+localnet\s+src\s+192\.168\.1\.0/.test(body);
    const hasAllow = /http_access\s+allow\s+localnet/.test(body);
    if (!hasPort || !hasAcl || !hasAllow) {
      appendOutput("tee: the squid.conf is incomplete (needs http_port 3128, acl localnet, http_access allow localnet).", "error");
      return;
    }
    appendOutput("Wrote /etc/squid/squid.conf");
    markObjective("config", 30, "✓ Objective 2 passed — Squid was configured for the LAN on port 3128. +30 points");
  }

  // ---------- command handlers ----------
  function handleDnf(args, cmd) {
    const joined = args.join(" ").toLowerCase();
    if (cmd.toLowerCase().includes("update")) {
      appendOutput("Updating Subscription Management repositories.\nLast metadata expiration check: 0:12:44 ago on Sun 16 Aug 2026 10:08:11 AM IST.\nDependencies resolved.\nNothing to do.\nComplete!");
      return;
    }
    if (joined.includes("install")) {
      const wants = joined.includes("squid");
      if (wants) {
        if (state.squidInstalled) {
          appendOutput("Package squid-6.6-1.el10.x86_64 is already installed.\nDependencies resolved.\nNothing to do.\nComplete!");
          return;
        }
        state.squidInstalled = true;
        appendOutput("Dependencies resolved.\n Package          Architecture  Version               Repository     Size\n squid            x86_64        6.6-1.el10            rhel-appstream 4.4 M\n\nTransaction Summary\nInstall  1 Package\n\nInstalled:\n  squid-6.6-1.el10.x86_64\n\nComplete!");
        markObjective("install", 20, "✓ Objective 1 passed — Squid was installed. +20 points");
      } else {
        appendOutput(`Error: Unable to find a match: ${args.filter((a) => !a.startsWith("-") && !["install"].includes(a.toLowerCase())).join(" ") || "?"}`, "error");
      }
      return;
    }
    appendOutput("dnf: use 'dnf install -y squid' or 'dnf update'");
  }

  function handleSystemctl(args) {
    const action = (args[0] || "").toLowerCase();
    const unit = (args.filter((a) => !a.startsWith("-")).pop() || "").toLowerCase();
    if (unit !== "squid") {
      appendOutput("systemctl: use 'systemctl enable --now squid' or 'systemctl status squid'", "error");
      return;
    }
    if (action === "enable") {
      if (!state.squidInstalled) {
        appendOutput("Failed to enable unit: Unit file squid.service does not exist. Install Squid first.", "error");
        return;
      }
      if (!state.config) {
        appendOutput("Enabled squid.service (but the config is not written yet — write /etc/squid/squid.conf before starting).", "info");
        return;
      }
      state.serviceStarted = true;
      appendOutput("Created symlink /etc/systemd/system/multi-user.target.wants/squid.service → /usr/lib/systemd/system/squid.service.");
      markObjective("start", 25, "✓ Objective 3 passed — Squid was enabled at boot and started. +25 points");
      return;
    }
    if (action === "status") {
      const active = state.serviceStarted ? "active (running)" : "inactive (dead)";
      appendOutput("● squid.service - Squid caching proxy\n     Loaded: loaded (/usr/lib/systemd/system/squid.service; " + (state.serviceStarted ? "enabled" : "disabled") + ")\n     Active: " + active + " since Sun 2026-08-16 10:20:55 IST; 2min ago");
      return;
    }
    if (action === "start" || action === "restart" || action === "reload") {
      if (!state.config) {
        appendOutput("Job for squid.service failed because the control process exited with error code.\nsquid: configuration not written — create /etc/squid/squid.conf first.", "error");
        return;
      }
      state.serviceStarted = true;
      appendOutput("Started squid.service.");
      if (!state.start) {
        markObjective("start", 25, "✓ Objective 3 passed — Squid was enabled at boot and started. +25 points");
      }
      return;
    }
    appendOutput("systemctl: unknown action. Try 'systemctl enable --now squid'.");
  }

  function handleFirewall(args) {
    const joined = args.join(" ").toLowerCase();
    const addService = /--add-service=squid|--add-service squid/.test(joined);
    const addPort = /--add-port=3128/.test(joined);
    const reload = /--reload/.test(joined);
    const listAll = /--list-all|--list-services/.test(joined);

    if (reload) {
      if (!state.firewallOpened) {
        appendOutput("success (no changes to apply — add the squid service or port first)");
        return;
      }
      appendOutput("success");
      return;
    }
    if (listAll) {
      const services = "cockpit dhcpv6-client ssh" + (state.firewallOpened ? " squid" : "");
      const ports = state.firewallOpened ? "3128/tcp" : "";
      appendOutput("public (active)\n  target: default\n  services: " + services + "\n  ports: " + (ports || "(none)"));
      return;
    }
    if (addService || addPort) {
      if (!state.squidInstalled) {
        appendOutput("Error: firewall-cmd: squid service not available — install Squid first.", "error");
        return;
      }
      state.firewallOpened = true;
      appendOutput("success\n(Note: run 'firewall-cmd --reload' to apply the change)");
      return;
    }
    appendOutput("firewall-cmd: unknown option. Try 'firewall-cmd --permanent --add-service=squid' then 'firewall-cmd --reload'.");
  }

  function handleCurl(args, cmd) {
    const joined = args.join(" ").toLowerCase();
    const usesProxy = /-x\s|--proxy/.test(cmd) || /localhost:3128|127\.0\.0\.1:3128/.test(joined);
    const directUrl = args.filter((a) => !a.startsWith("-")).pop() || "";

    if (!usesProxy && /3128/.test(joined)) {
      // curl to the proxy port directly is still a proxied request
      if (!state.firewallOpened) {
        appendOutput("curl: (7) Failed to connect to localhost port 3128: Connection refused\nOpen the firewall port first (firewall-cmd --add-service=squid).", "error");
        return;
      }
      if (!state.serviceStarted) {
        appendOutput("curl: (7) Failed to connect to localhost port 3128: Connection refused\nStart Squid first (systemctl enable --now squid).", "error");
        return;
      }
      appendOutput("<HTML><HEAD><TITLE>Example Domain</TITLE></HEAD><BODY><H1>Example Domain</H1></BODY></HTML>");
      if (!state.verify) {
        markObjective("verify", 25, "✓ Objective 4 passed — the proxy is reachable and serving the LAN. +25 points");
        completeChallenge();
      }
      return;
    }

    if (usesProxy) {
      if (!state.serviceStarted) {
        appendOutput("curl: (7) Failed to connect to localhost port 3128: Connection refused\nSquid is not running — start the service first.", "error");
        return;
      }
      if (!state.firewallOpened) {
        appendOutput("curl: (7) Failed to connect to localhost port 3128: Connection refused\nOpen the firewall port first (firewall-cmd --add-service=squid).", "error");
        return;
      }
      appendOutput("<HTML><HEAD><TITLE>Example Domain</TITLE></HEAD><BODY><H1>Example Domain</H1></BODY></HTML>");
      appendOutput("(Squid cache: HIT — the page was served from the proxy cache)");
      if (!state.verify) {
        markObjective("verify", 25, "✓ Objective 4 passed — the proxy is reachable and serving the LAN. +25 points");
        completeChallenge();
      }
      return;
    }

    if (directUrl) {
      appendOutput("<HTML><BODY><H1>Direct request</H1></BODY></HTML>");
      appendOutput("Tip: to test through the proxy use: curl -x http://localhost:3128 http://example.com", "info");
      return;
    }
    appendOutput("curl: no URL specified. Try: curl -x http://localhost:3128 http://example.com");
  }

  function handleCat(args) {
    const path = args.find((a) => !a.startsWith("-")) || "";
    if (path.includes("squid.conf")) {
      if (!state.config) {
        appendOutput("cat: " + path + ": No such file or directory", "error");
        return;
      }
      appendOutput(
        "# RCW training squid.conf\n" +
        "http_port 3128\n" +
        "acl localnet src " + LAN_SUBNET + "\n" +
        "http_access allow localnet\n" +
        "http_access deny all\n" +
        "cache_dir ufs /var/spool/squid 100 16 256"
      );
      return;
    }
    appendOutput(`cat: ${path || "missing operand"}: No such file or directory`, "error");
  }

  function handleSs(args) {
    const base = "State      Recv-Q Send-Q Local Address:Port  Peer Address:Port  Process\n";
    const squidLine = state.serviceStarted ? "LISTEN     0      128    *:3128            *:*                users:((\"squid\",pid=1182))\n" : "";
    appendOutput(base + squidLine);
  }

  function handleRpm(args) {
    const joined = args.join(" ").toLowerCase();
    if (joined.includes("squid") || joined.includes("-qa") || joined.includes("-q")) {
      appendOutput(state.squidInstalled ? "squid-6.6-1.el10.x86_64" : "");
      return;
    }
    appendOutput("rpm: use 'rpm -q squid' to check the package");
  }

  function showHelp() {
    appendOutput(
      "Web proxy commands:\n" +
      "  sudo dnf install -y squid                         install Squid\n" +
      "  sudo tee /etc/squid/squid.conf <<'EOF'\n" +
      "    http_port 3128\n" +
      "    acl localnet src 192.168.1.0/24\n" +
      "    http_access allow localnet\n" +
      "    EOF                                            write the config\n" +
      "  sudo systemctl enable --now squid                enable & start the service\n" +
      "  sudo firewall-cmd --permanent --add-service=squid\n" +
      "  sudo firewall-cmd --reload                        open the firewall\n" +
      "  curl -x http://localhost:3128 http://example.com  verify through the proxy\n" +
      "  systemctl status squid | ss -tlnp | rpm -q squid  inspect state\n" +
      "  history | clear | help                            shell utilities",
      "info"
    );
  }

  function handleMan(topic = "") {
    const pages = {
      squid: "SQUID(8)\nNAME\n    squid — high-performance web proxy cache\nCONFIG\n    /etc/squid/squid.conf",
      firewallcmd: "FIREWALL-CMD(1)\nNAME\n    firewall-cmd — manage the firewalld service\nOPTIONS\n    --permanent --add-service=squid   allow the squid service\n    --reload                         apply the change",
      systemctl: "SYSTEMCTL(1)\nNAME\n    systemctl — control the systemd system and service manager\nCOMMANDS\n    enable --now UNIT    enable at boot and start now"
    };
    appendOutput(pages[topic] || (topic ? `No manual entry for ${topic}` : "What manual page do you want?"), pages[topic] ? "info" : "error");
  }

  function appendCommand(command) {
    const line = document.createElement("div");
    line.className = "output-entry output-command";
    const user = document.createElement("span");
    user.className = "prompt-user";
    user.textContent = "admin@squid-01";
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
    const completedCount = [state.install, state.config, state.start, state.verify].filter(Boolean).length;
    scoreElement.textContent = String(state.score);
    progressText.textContent = `${completedCount} of 4 complete`;
    progressBar.style.width = `${completedCount * 25}%`;
    Object.entries(taskElements).forEach(([key, element]) => element.classList.toggle("is-complete", state[key]));
  }

  function completeChallenge() {
    if (state.completed || !state.verify) return;
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
    appendOutput("Proxy setup reset. Start by installing Squid.", "info");
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
    const source = `${name}|${now.toISOString()}|${state.elapsedSeconds}|squid-web-proxy`;
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `RCW-SQD-${datePart}-${(hash >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(-7)}`;
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
    ctx.fillText("Web Proxy Champion", W / 2, 336);

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
    ctx.fillText("for successfully completing the RCW Squid web proxy challenge", W / 2, 543);
    ctx.fillText("by installing Squid, allowing the LAN subnet, enabling the service, and opening the firewall.", W / 2, 574);

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
    drawMeta(ctx, 660, 676, "CHALLENGE", "Squid forward proxy deployment");
    drawMeta(ctx, 660, 754, "STATUS", "All proxy objectives passed");

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
    ctx.fillText("RHEL Networking · Challenge 08", W - 98, 921);
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
    return `rcw-squid-challenge-8-${safeName}.${extension}`;
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
