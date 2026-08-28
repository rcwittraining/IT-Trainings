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
    pv: $("#taskPv"),
    vg: $("#taskVg"),
    lv: $("#taskLv")
  };

  const VG_NAME = "vg_data";
  const LV_PATH = "/dev/vg_data/lv_app";
  const NEW_DISK = "/dev/sdb";
  const BASE_SIZE = "30.00g";
  const NEW_SIZE = "50.00g";

  const state = {
    learnerName: "",
    inspect: false,
    inspectedVia: null,
    pvCreated: false,
    pv: false,
    vgExtended: false,
    vg: false,
    lvExtended: false,
    lv: false,
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
    appendOutput("LVX-0701: Logical volume lv_app (vg_data) is 95% full.\n  Mount point : /app\n  Current size: " + BASE_SIZE + "\n  New disk    : /dev/sdb (20 GB) — uninitialised\nMission: inspect the storage, add /dev/sdb to the volume group, and grow the filesystem online.", "warning");
    showScreen("lab");
    startTimer();
    setTimeout(() => commandInput.focus(), 180);
  }

  function resetChallengeState() {
    clearInterval(state.timerId);
    state.inspect = false;
    state.inspectedVia = null;
    state.pvCreated = false;
    state.pv = false;
    state.vgExtended = false;
    state.vg = false;
    state.lvExtended = false;
    state.lv = false;
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
      case "pvs":
      case "pvscan":
      case "pvdisplay":
        handlePvs(args, command);
        break;
      case "vgs":
      case "vgscan":
      case "vgdisplay":
        handleVgs(args, command);
        break;
      case "lvs":
      case "lvscan":
      case "lvdisplay":
        handleLvs(args, command);
        break;
      case "pvcreate":
        handlePvcreate(args);
        break;
      case "vgextend":
        handleVgextend(args);
        break;
      case "lvextend":
        handleLvextend(args, cmd);
        break;
      case "df":
        handleDf(args);
        break;
      case "lsblk":
        handleLsblk(args);
        break;
      case "fdisk":
      case "parted":
        handlePartition(args, command);
        break;
      case "resize2fs":
        handleResize2fs();
        break;
      case "xfs_growfs":
        handleXfsGrowfs();
        break;
      case "pwd":
        appendOutput("/home/storage");
        break;
      case "whoami":
        appendOutput("storage");
        break;
      case "hostname":
        appendOutput("storage-01");
        break;
      case "id":
        appendOutput("uid=1000(storage) gid=1000(storage) groups=1000(storage),27(sudo)");
        break;
      case "date":
        appendOutput("Sun Aug 16 09:42:30 IST 2026");
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

  function markInspect() {
    if (!state.inspect) {
      markObjective("inspect", 20, "✓ Objective 1 passed — the current storage layout was inspected. +20 points");
    }
  }

  // ---------- command handlers ----------
  function handlePvs(args, command) {
    let lines;
    if (command === "pvdisplay") {
      lines = [
        "  --- Physical volume ---",
        "  PV Name               /dev/sda2",
        "  VG Name               " + VG_NAME,
        "  PV Size               30.00 GiB / not usable 3.00 MiB",
        "  Allocatable           yes",
        "  PE Size               4.00 MiB",
        "  Total PE              7679",
        "  Free PE               127",
        "  Allocated PE          7552"
      ];
      if (state.pvCreated) {
        lines.push("", "  --- Physical volume ---", "  PV Name               /dev/sdb", "  VG Name               " + (state.vgExtended ? VG_NAME : ""), "  PV Size               20.00 GiB / not usable 3.00 MiB", "  Allocatable           yes", "  PE Size               4.00 MiB", "  Total PE              5119", "  Free PE               5119", "  Allocated PE          0");
      }
    } else {
      lines = ["  PV         VG        Fmt  Attr PSize   PFree ", "  /dev/sda2  " + VG_NAME + "   lvm2 a--  30.00g  0 "];
      if (state.pvCreated) {
        const vgCol = state.vgExtended ? VG_NAME : "";
        lines.push("  /dev/sdb   " + vgCol.padEnd(9, " ") + " lvm2 a--  20.00g  20.00g");
      }
    }
    appendOutput(lines.join("\n"));
    markInspect();
  }

  function handleVgs(args, command) {
    let lines;
    if (command === "vgdisplay") {
      lines = [
        "  --- Volume group ---",
        "  VG Name               " + VG_NAME,
        "  System ID             ",
        "  Format                lvm2",
        "  VG Size               " + (state.vgExtended ? NEW_SIZE : BASE_SIZE),
        "  PE Size               4.00 MiB",
        "  Total PE              " + (state.vgExtended ? "12798" : "7679"),
        "  Alloc PE / Size       7552 / 29.50 GiB",
        "  Free  PE / Size       " + (state.vgExtended ? "5246 / 20.49 GiB" : "127 / 508.00 MiB")
      ];
    } else {
      lines = ["  VG        #PV #LV #SN Attr   VSize   VFree ", "  " + VG_NAME + "     " + (state.vgExtended ? "2" : "1") + "   1   0 wz--n- " + (state.vgExtended ? NEW_SIZE : BASE_SIZE) + " " + (state.vgExtended ? "20.49g" : "508.00m")];
    }
    appendOutput(lines.join("\n"));
    markInspect();
  }

  function handleLvs(args, command) {
    let lines;
    if (command === "lvdisplay") {
      lines = [
        "  --- Logical volume ---",
        "  LV Path                " + LV_PATH,
        "  LV Name                lv_app",
        "  VG Name                " + VG_NAME,
        "  LV Size                " + (state.lvExtended ? NEW_SIZE : "29.50 GiB"),
        "  # open                 1",
        "  LV Status              available"
      ];
    } else {
      lines = ["  LV     VG       Attr       LSize   Pool Origin", "  lv_app " + VG_NAME + "   -wi-ao---- " + (state.lvExtended ? NEW_SIZE : "29.50g")];
    }
    appendOutput(lines.join("\n"));
    markInspect();
  }

  function handlePvcreate(args) {
    const target = args.filter((a) => !a.startsWith("-")).pop() || "";
    if (!target) {
      appendOutput("pvcreate: missing device. Expected: pvcreate /dev/sdb", "error");
      return;
    }
    if (target !== NEW_DISK && !/sdb/.test(target)) {
      appendOutput(`pvcreate: device ${target} not found. The new disk is ${NEW_DISK}.`, "error");
      return;
    }
    if (state.pvCreated) {
      appendOutput(`Physical volume "${NEW_DISK}" already initialized.`);
      return;
    }
    state.pvCreated = true;
    appendOutput(`  Physical volume "${NEW_DISK}" successfully created.\n  Volume group "${VG_NAME}" successfully extended`);
    markObjective("pv", 25, "✓ Objective 2 passed — " + NEW_DISK + " was initialised as a physical volume. +25 points");
  }

  function handleVgextend(args) {
    const vg = args[0] || "";
    const device = args[1] || "";
    if (!device) {
      appendOutput("vgextend: missing device. Expected: vgextend " + VG_NAME + " " + NEW_DISK, "error");
      return;
    }
    if (vg !== VG_NAME && !/vg_data/.test(vg)) {
      appendOutput(`vgextend: volume group "${vg}" not found. The volume group is ${VG_NAME}.`, "error");
      return;
    }
    if (!state.pvCreated) {
      appendOutput(`vgextend: ${NEW_DISK} is not a physical volume — run pvcreate first.`, "error");
      return;
    }
    if (state.vgExtended) {
      appendOutput(`  Volume group "${VG_NAME}" already contains ${NEW_DISK}.`);
      return;
    }
    state.vgExtended = true;
    appendOutput(`  Volume group "${VG_NAME}" successfully extended\n  VG Size now ` + NEW_SIZE);
    markObjective("vg", 25, "✓ Objective 3 passed — " + NEW_DISK + " was added to the volume group " + VG_NAME + ". +25 points");
  }

  function handleLvextend(args, cmd) {
    const hasResize = /-r\b/.test(cmd) || args.some((a) => /^-.*r/.test(a));
    const hasFullFree = /\+100%free|-l\s*\+100%free/i.test(cmd);
    const target = args.filter((a) => a.startsWith("/dev/")).pop() || "";

    if (!state.vgExtended) {
      appendOutput("  Insufficient free space: 127 extents needed, but only 127 available\n  Extend the volume group first (vgextend " + VG_NAME + " " + NEW_DISK + ").", "error");
      return;
    }
    if (state.lvExtended) {
      appendOutput(`  Logical volume "${LV_PATH}" is already at its maximum size.`);
      return;
    }
    if (target && !target.includes("lv_app")) {
      appendOutput(`  Logical volume "${target}" not found in volume group "${VG_NAME}".`, "error");
      return;
    }

    state.lvExtended = true;
    if (hasResize) {
      appendOutput(`  Size of logical volume ${VG_NAME}/lv_app changed from 29.50 GiB (7552 extents) to 50.00 GiB (12798 extents).\n  Logical volume ${VG_NAME}/lv_app successfully resized.\nmeta-data=/dev/mapper/${VG_NAME}-lv_app isize=512    agcount=4, agsize=1933312 blks\n         =                       sectsz=512   attr=2, projid32bit=1\ndata blocks changed from 7733248 to 13105152`);
    } else {
      appendOutput(`  Size of logical volume ${VG_NAME}/lv_app changed from 29.50 GiB (7552 extents) to 50.00 GiB (12798 extents).\n  Logical volume ${VG_NAME}/lv_app successfully resized.\n  (Hint: add -r to also resize the filesystem, or run xfs_growfs /app next.)`, "info");
    }
    markObjective("lv", 30, "✓ Objective 4 passed — the logical volume and its filesystem were grown. +30 points");
    completeChallenge();
  }

  function handleDf(args) {
    const mount = args.filter((a) => !a.startsWith("-")).pop() || "";
    if (mount && !mount.includes("app")) {
      appendOutput(`Filesystem      1K-blocks  Used Available Use% Mounted on\n/dev/mapper/${VG_NAME}-lv_app ${state.lvExtended ? "52403200" : "30929920"} 29383424 ${state.lvExtended ? "20580096" : "242688"} ${state.lvExtended ? "59%" : "95%"} ${mount}`);
      return;
    }
    const availBlocks = state.lvExtended ? "20580096" : "242688";
    const usePct = state.lvExtended ? "59%" : "95%";
    appendOutput(`Filesystem                1K-blocks    Used Available Use% Mounted on\n/dev/mapper/${VG_NAME}-lv_app ${state.lvExtended ? "52403200" : "30929920"} 29383424 ${availBlocks} ${usePct} /app`);
    markInspect();
  }

  function handleLsblk(args) {
    const lines = [
      "NAME              MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT",
      "sda                 8:0    0   30G  0 disk ",
      "└─sda2              8:2    0 29.5G  0 part ",
      "  └─" + VG_NAME + "-lv_app 253:0    0 29.5G  0 lvm  /app"
    ];
    if (state.pvCreated) {
      lines.push("sdb                 8:16   0   20G  0 disk ");
      if (state.vgExtended) lines.push("└─" + VG_NAME + "-lv_app 253:0    0 " + (state.lvExtended ? "50G" : "49.5G") + "  0 lvm  /app");
    }
    appendOutput(lines.join("\n"));
    markInspect();
  }

  function handlePartition(args, command) {
    appendOutput("Note: LVM accepts a whole disk directly — no partition table is required.\nUse 'pvcreate " + NEW_DISK + "' instead of " + command + ".", "info");
  }

  function handleResize2fs() {
    appendOutput("resize2fs: this filesystem is XFS. Use 'xfs_growfs /app' or run 'lvextend -r' to resize it.", "error");
  }

  function handleXfsGrowfs() {
    if (!state.lvExtended) {
      appendOutput("xfs_growfs: /app is not mounted — or the logical volume has not been extended yet.\nRun 'lvextend -r' first.", "error");
      return;
    }
    appendOutput("meta-data=/dev/mapper/" + VG_NAME + "-lv_app isize=512    agcount=4, agsize=1933312 blks\ndata blocks changed from 7733248 to 13105152");
  }

  function showHelp() {
    appendOutput(
      "LVM storage commands:\n" +
      "  sudo pvs | vgs | lvs | pvdisplay | vgdisplay | lvdisplay   inspect storage\n" +
      "  df -h /app | lsblk                                        check usage\n" +
      "  sudo pvcreate /dev/sdb                                    initialise the new disk\n" +
      "  sudo vgextend vg_data /dev/sdb                            extend the volume group\n" +
      "  sudo lvextend -r -l +100%FREE /dev/vg_data/lv_app         grow volume + filesystem\n" +
      "  sudo xfs_growfs /app                                      (alternative) grow XFS only\n" +
      "  history | clear | help                                    shell utilities",
      "info"
    );
  }

  function handleMan(topic = "") {
    const pages = {
      pvcreate: "PVCREATE(8)\nNAME\n    pvcreate — initialize a disk or partition for use by LVM\nSYNOPSIS\n    pvcreate /dev/sdb",
      vgextend: "VGEXTEND(8)\nNAME\n    vgextend — add physical volumes to a volume group\nSYNOPSIS\n    vgextend vg_data /dev/sdb",
      lvextend: "LVEXTEND(8)\nNAME\n    lvextend — extend the size of a logical volume\nOPTIONS\n    -r          resize the underlying filesystem too\n    -l +100%FREE  use all remaining free extents",
      xfs_growfs: "XFS_GROWFS(8)\nNAME\n    xfs_growfs — expand an XFS filesystem\nSYNOPSIS\n    xfs_growfs /app"
    };
    appendOutput(pages[topic] || (topic ? `No manual entry for ${topic}` : "What manual page do you want?"), pages[topic] ? "info" : "error");
  }

  function appendCommand(command) {
    const line = document.createElement("div");
    line.className = "output-entry output-command";
    const user = document.createElement("span");
    user.className = "prompt-user";
    user.textContent = "storage@storage-01";
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
    const completedCount = [state.inspect, state.pv, state.vg, state.lv].filter(Boolean).length;
    scoreElement.textContent = String(state.score);
    progressText.textContent = `${completedCount} of 4 complete`;
    progressBar.style.width = `${completedCount * 25}%`;
    Object.entries(taskElements).forEach(([key, element]) => element.classList.toggle("is-complete", state[key]));
  }

  function completeChallenge() {
    if (state.completed || !state.lv) return;
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
    appendOutput("Storage task reset. Start by inspecting the current storage layout.", "info");
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
    const source = `${name}|${now.toISOString()}|${state.elapsedSeconds}|lvm-extend`;
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `RCW-LVM-${datePart}-${(hash >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(-7)}`;
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
    ctx.fillText("Storage Management Champion", W / 2, 336);

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
    ctx.fillText("for successfully completing the RCW LVM volume extension challenge", W / 2, 543);
    ctx.fillText("by adding a new disk, extending the volume group, and growing the logical volume and filesystem online.", W / 2, 574);

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
    drawMeta(ctx, 660, 676, "CHALLENGE", "LVM volume group and filesystem extension");
    drawMeta(ctx, 660, 754, "STATUS", "All storage objectives passed");

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
    ctx.fillText("Linux Storage · Challenge 07", W - 98, 921);
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
    return `rcw-lvm-challenge-7-${safeName}.${extension}`;
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
