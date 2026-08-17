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
    test: $("#taskTest"),
    verify: $("#taskVerify")
  };

  const state = {
    learnerName: "",
    nginxInstalled: false,
    install: false,
    config: false,
    configTested: false,
    test: false,
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
    appendOutput("PRX-0601: Two internal apps are live on web-proxy-01:\n  - Web UI  → http://127.0.0.1:3000\n  - REST API → http://127.0.0.1:4000\nPort 80 serves nothing yet. Install Nginx, write a reverse proxy, and bring both apps online on port 80.", "warning");
    showScreen("lab");
    startTimer();
    setTimeout(() => commandInput.focus(), 180);
  }

  function resetChallengeState() {
    clearInterval(state.timerId);
    state.nginxInstalled = false;
    state.install = false;
    state.config = false;
    state.configTested = false;
    state.test = false;
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

    // Heredoc handling: lines typed while a heredoc is open are collected
    // until the closing delimiter line, then the whole block is evaluated.
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

    // Detect the opening of a heredoc:  cmd ... <<'EOF'  or  cmd ... <<EOF
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
      case "apt-get":
      case "apt":
        handleApt(args, cmd);
        break;
      case "nginx":
        handleNginx(args, cmd);
        break;
      case "tee":
        handleTee(args, cmd, rawCommand);
        break;
      case "cat":
        handleCat(args);
        break;
      case "ln":
        handleLn(args, cmd);
        break;
      case "ls":
        handleLs(args);
        break;
      case "systemctl":
        handleSystemctl(args);
        break;
      case "curl":
        handleCurl(args, cmd);
        break;
      case "ss":
      case "netstat":
        handlePorts(args);
        break;
      case "pwd":
        appendOutput("/home/admin");
        break;
      case "whoami":
        appendOutput("admin");
        break;
      case "hostname":
        appendOutput("web-proxy-01");
        break;
      case "id":
        appendOutput("uid=1000(admin) gid=1000(admin) groups=1000(admin),27(sudo)");
        break;
      case "date":
        appendOutput("Sun Aug 16 08:15:42 IST 2026");
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

  // ---------- command handlers ----------
  function handleApt(args, cmd) {
    const joined = args.join(" ").toLowerCase();
    if (cmd.toLowerCase().includes("update")) {
      appendOutput("Hit:1 http://archive.ubuntu.com/ubuntu jammy InRelease\nGet:2 http://archive.ubuntu.com/ubuntu jammy-updates InRelease [128 kB]\nReading package lists... Done");
      return;
    }
    if (joined.includes("install")) {
      const wants = joined.includes("nginx");
      if (wants) {
        if (state.nginxInstalled) {
          appendOutput("nginx is already the newest version (1.18.0-6ubuntu14.4).\n0 upgraded, 0 newly installed.");
          return;
        }
        state.nginxInstalled = true;
        appendOutput("Reading package lists... Done\nSetting up nginx (1.18.0-6ubuntu14.4) ...\nnginx.service is enabled and running.");
        markObjective("install", 20, "✓ Objective 1 passed — Nginx was installed. +20 points");
      } else {
        appendOutput(`E: Unable to locate package ${args.filter((a) => !a.startsWith("-") && !["install", "update"].includes(a.toLowerCase())).join(" ") || "?"}`, "error");
      }
      return;
    }
    appendOutput("apt: use 'apt install -y nginx' or 'apt update'");
  }

  function handleNginx(args, cmd) {
    const sub = (args[0] || "").toLowerCase();
    if (sub === "-t") {
      if (!state.nginxInstalled) {
        appendOutput("nginx: command not found — install Nginx first.", "error");
        return;
      }
      if (!state.config) {
        appendOutput("nginx: [emerg] no server block found for the reverse proxy — write the site config first.", "error");
        return;
      }
      state.configTested = true;
      appendOutput("nginx: the configuration file /etc/nginx/nginx.conf syntax is ok\nnginx: configuration file /etc/nginx/nginx.conf test is successful");
      if (!state.test) {
        markObjective("test", 25, "✓ Objective 3 passed — the configuration was tested and the site was enabled. +25 points");
      }
      return;
    }
    if (sub === "-s" || sub === "-v") {
      if (sub === "-v") {
        appendOutput("nginx version: nginx/1.18.0 (Ubuntu)");
        return;
      }
      const action = (args[1] || "").toLowerCase();
      if (action === "reload" || (sub === "-s" && action === "reload")) {
        if (!state.configTested) {
          appendOutput("nginx: [alert] configuration not tested — run 'nginx -t' first.", "error");
          return;
        }
        appendOutput("Reloaded Nginx — the reverse proxy is now serving on port 80.");
        if (!state.verify && !state.config) { /* cannot verify without config */ }
        return;
      }
      appendOutput("nginx -s: unknown signal. Try 'nginx -s reload'.", "error");
      return;
    }
    appendOutput("nginx: use 'nginx -t' (test) or 'systemctl reload nginx' (reload)");
  }

  function finishHeredoc(openingCommand, block) {
    // The opening command is the tee line; the block is the config body.
    const cmd = openingCommand.replace(/^sudo\s+/i, "").replace(/<<\s*['"]?[A-Za-z_][A-Za-z0-9_]*['"]?.*$/, "").trim();
    const isTee = /tee/.test(cmd) && /sites-available/.test(cmd);
    if (isTee) {
      writeConfigFromBlock(block);
      return;
    }
    appendOutput("heredoc: unsupported target. Write the config with: sudo tee /etc/nginx/sites-available/rcw-app <<'EOF'", "error");
  }

  function writeConfigFromBlock(block) {
    if (!state.nginxInstalled) {
      appendOutput("tee: /etc/nginx/sites-available/rcw-app: No such file or directory — install Nginx first.", "error");
      return;
    }
    const body = block.toLowerCase();
    const hasUiProxy = /location\s*\/\s*\{/.test(body) && /proxy_pass\s+http:\/\/127\.0\.0\.1:3000/.test(body);
    const hasApiProxy = /location\s*\/api/.test(body) && /proxy_pass\s+http:\/\/127\.0\.0\.1:4000/.test(body);
    if (!hasUiProxy || !hasApiProxy) {
      appendOutput("tee: the site config is incomplete. It must route '/' to 127.0.0.1:3000 and '/api/' to 127.0.0.1:4000.", "error");
      return;
    }
    appendOutput("Wrote /etc/nginx/sites-available/rcw-app");
    markObjective("config", 30, "✓ Objective 2 passed — the reverse proxy site config was written. +30 points");
  }

  function handleTee(args, cmd, rawCommand) {
    // Single-line tee (non-heredoc) — validate essentials if the config is on one line.
    const targetsSite = /sites-available/.test(cmd);
    if (!targetsSite) {
      appendOutput("tee: missing target. Write the config to /etc/nginx/sites-available/rcw-app", "error");
      return;
    }
    if (!state.nginxInstalled) {
      appendOutput("tee: /etc/nginx/sites-available/rcw-app: No such file or directory — install Nginx first.", "error");
      return;
    }
    const body = rawCommand.toLowerCase();
    const hasUiProxy = /location\s*\/\s*\{/.test(body) && /proxy_pass\s+http:\/\/127\.0\.0\.1:3000/.test(body);
    const hasApiProxy = /location\s*\/api/.test(body) && /proxy_pass\s+http:\/\/127\.0\.0\.1:4000/.test(body);
    if (!hasUiProxy || !hasApiProxy) {
      appendOutput("tee: the site config is incomplete. It must route '/' to 127.0.0.1:3000 and '/api/' to 127.0.0.1:4000.", "error");
      return;
    }
    appendOutput("Wrote /etc/nginx/sites-available/rcw-app");
    markObjective("config", 30, "✓ Objective 2 passed — the reverse proxy site config was written. +30 points");
  }

  function handleCat(args) {
    const path = args.find((a) => !a.startsWith("-")) || "";
    if (path.includes("sites-available/rcw-app") || path.includes("sites-enabled/rcw-app")) {
      if (!state.config) {
        appendOutput("cat: " + path + ": No such file or directory", "error");
        return;
      }
      appendOutput(
        "server {\n" +
        "    listen 80;\n" +
        "    server_name _;\n\n" +
        "    location / {\n" +
        "        proxy_pass http://127.0.0.1:3000;\n" +
        "        proxy_set_header Host $host;\n" +
        "        proxy_set_header X-Real-IP $remote_addr;\n" +
        "    }\n\n" +
        "    location /api/ {\n" +
        "        proxy_pass http://127.0.0.1:4000/;\n" +
        "    }\n" +
        "}"
      );
      return;
    }
    if (path.includes("nginx.conf")) {
      appendOutput("# /etc/nginx/nginx.conf (summary)\nuser www-data;\nworker_processes auto;\ninclude /etc/nginx/sites-enabled/*;\n");
      return;
    }
    appendOutput(`cat: ${path || "missing operand"}: No such file or directory`, "error");
  }

  function handleLn(args, cmd) {
    const enablesSite = /-s/.test(cmd) && /sites-enabled/.test(cmd) && /sites-available\/rcw-app/.test(cmd);
    if (enablesSite) {
      if (!state.config) {
        appendOutput("ln: failed to create symbolic link: /etc/nginx/sites-available/rcw-app does not exist — write the config first.", "error");
        return;
      }
      appendOutput("Site rcw-app enabled → /etc/nginx/sites-enabled/rcw-app");
      return;
    }
    appendOutput("ln: missing operands. Expected: ln -s /etc/nginx/sites-available/rcw-app /etc/nginx/sites-enabled/", "error");
  }

  function handleLs(args) {
    const path = args.find((a) => !a.startsWith("-")) || "";
    if (path.includes("sites-enabled")) {
      const entries = ["default"];
      if (state.config) entries.push("rcw-app");
      appendOutput(entries.join("   "));
      return;
    }
    if (path.includes("sites-available")) {
      const entries = ["default"];
      if (state.config) entries.push("rcw-app");
      appendOutput(entries.join("   "));
      return;
    }
    appendOutput(".bashrc   .profile");
  }

  function handleSystemctl(args) {
    const action = (args[0] || "").toLowerCase();
    const unit = (args[1] || "").toLowerCase();
    if (unit !== "nginx") {
      appendOutput("systemctl: use 'systemctl reload nginx' or 'systemctl status nginx'", "error");
      return;
    }
    if (action === "reload") {
      if (!state.configTested) {
        appendOutput("Failed to reload nginx.service: configuration not tested — run 'nginx -t' first.", "error");
        return;
      }
      appendOutput("Nginx reloaded — reverse proxy live on port 80.");
      return;
    }
    if (action === "status") {
      const active = state.configTested && state.verify ? "active (running)" : "active (running) — not yet verified via curl";
      appendOutput("● nginx.service - A high performance web server and a reverse proxy server\n     Loaded: loaded (/lib/systemd/system/nginx.service; enabled)\n     Active: " + active);
      return;
    }
    if (action === "enable" || action === "start") {
      appendOutput((action === "enable" ? "Created symlink /etc/systemd/system/multi-user.target.wants/nginx.service" : "Started nginx.service") + ".");
      return;
    }
    appendOutput("systemctl: unknown action. Try 'systemctl reload nginx'.");
  }

  function handleCurl(args, cmd) {
    const joined = args.join(" ").toLowerCase();
    // Determine the URL path
    const hasApi = /api|4000/.test(joined);
    const hasHealth = /health/.test(joined);
    const port80 = /localhost:80|http:\/\/localhost\/?(\s|$)|http:\/\/localhost[^0-9]/.test(joined) || /http:\/\/localhost\/?$/.test(joined) || (!/3000|4000/.test(joined) && /localhost/.test(joined));

    if (/3000/.test(joined)) {
      appendOutput("<html><body><h1>RCW Web UI</h1><p>Internal app on port 3000</p></body></html>");
      return;
    }
    if (/4000/.test(joined)) {
      appendOutput('{"status":"ok","service":"rcw-api","version":"1.4.2"}');
      return;
    }

    // Front door on port 80
    if (!state.configTested) {
      appendOutput("curl: (7) Failed to connect to localhost port 80: Connection refused\nNginx is not yet serving — test the config and reload first.", "error");
      return;
    }
    if (hasApi || hasHealth) {
      appendOutput('{"status":"ok","service":"rcw-api","version":"1.4.2","proxied":true}');
    } else {
      appendOutput("<html><body><h1>RCW Web UI</h1><p>Served by Nginx reverse proxy</p></body></html>");
    }

    // Objective 4: both paths must answer through port 80.
    if (hasApi || hasHealth) {
      if (state.configTested && !state.verify) {
        markObjective("verify", 25, "✓ Objective 4 passed — Nginx is serving the API through port 80. +25 points");
        completeChallenge();
      }
    } else if (port80 && !state.verify && state.configTested) {
      appendOutput("The UI responds on port 80. Also verify the API path: curl -s http://localhost/api/health", "info");
    }
  }

  function handlePorts(args) {
    const base = "State      Recv-Q Send-Q Local Address:Port  Peer Address:Port\n";
    const appLines = "LISTEN     0      511    127.0.0.1:3000         0.0.0.0:*\nLISTEN     0      511    127.0.0.1:4000         0.0.0.0:*\n";
    const nginxLine = state.configTested ? "LISTEN     0      511    0.0.0.0:80           0.0.0.0:*\n" : "";
    appendOutput(base + nginxLine + appLines);
  }

  function showHelp() {
    appendOutput(
      "Reverse proxy commands:\n" +
      "  sudo apt-get install -y nginx                    install Nginx\n" +
      "  sudo apt-get update                              refresh package lists\n" +
      "  sudo tee /etc/nginx/sites-available/rcw-app <<'EOF'\n" +
      "    server { listen 80; location / { proxy_pass http://127.0.0.1:3000; }\n" +
      "             location /api/ { proxy_pass http://127.0.0.1:4000/; } } EOF\n" +
      "                                                    write the site config\n" +
      "  sudo ln -s /etc/nginx/sites-available/rcw-app /etc/nginx/sites-enabled/\n" +
      "                                                    enable the site\n" +
      "  sudo nginx -t                                    test the configuration\n" +
      "  sudo systemctl reload nginx                      reload Nginx\n" +
      "  curl -s http://localhost/                        verify the UI on port 80\n" +
      "  curl -s http://localhost/api/health              verify the API on port 80\n" +
      "  ss -tlnp | systemctl status nginx | cat <path>   inspect state\n" +
      "  history | clear | help                           shell utilities",
      "info"
    );
  }

  function handleMan(topic = "") {
    const pages = {
      nginx: "NGINX(8)\nNAME\n    nginx — HTTP and reverse proxy server\nOPTIONS\n    -t  test configuration and exit",
      systemctl: "SYSTEMCTL(1)\nNAME\n    systemctl — control the systemd system and service manager\nCOMMANDS\n    reload UNIT    reload a service configuration",
      curl: "CURL(1)\nNAME\n    curl — transfer a URL\nOPTIONS\n    -s  silent mode",
      tee: "TEE(1)\nNAME\n    tee — read from stdin and write to standard output and files"
    };
    appendOutput(pages[topic] || (topic ? `No manual entry for ${topic}` : "What manual page do you want?"), pages[topic] ? "info" : "error");
  }

  function appendCommand(command) {
    const line = document.createElement("div");
    line.className = "output-entry output-command";
    const user = document.createElement("span");
    user.className = "prompt-user";
    user.textContent = "admin@web-proxy-01";
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
    const completedCount = [state.install, state.config, state.test, state.verify].filter(Boolean).length;
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
    appendOutput("Proxy setup reset. Start by installing Nginx.", "info");
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
    const source = `${name}|${now.toISOString()}|${state.elapsedSeconds}|nginx-reverse-proxy`;
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `RCW-NGX-${datePart}-${(hash >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(-7)}`;
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
    ctx.fillText("Reverse Proxy Champion", W / 2, 336);

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
    ctx.fillText("for successfully completing the RCW Nginx reverse proxy challenge", W / 2, 543);
    ctx.fillText("by installing Nginx and routing port 80 traffic to the internal web UI and API.", W / 2, 574);

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
    drawMeta(ctx, 660, 676, "CHALLENGE", "Nginx reverse proxy deployment");
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
    ctx.fillText("Linux & Web · Challenge 06", W - 98, 921);
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
    return `rcw-nginx-challenge-6-${safeName}.${extension}`;
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
