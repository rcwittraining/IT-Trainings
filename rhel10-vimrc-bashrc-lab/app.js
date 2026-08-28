(() => {
  "use strict";

  const Core = window.RCWConfigLabCore;
  if (!Core) throw new Error("Lab validation helpers were not loaded.");

  const ORIGINAL = Object.freeze({
    "/home/student/.vimrc": '" RCW RHEL 10 starter configuration\nset compatible\n',
    "/home/student/.bashrc": '# .bashrc\n\n# Source global definitions\nif [ -f /etc/bashrc ]; then\n    . /etc/bashrc\nfi\n'
  });

  const TASKS = [
    { id: "inspect", points: 10 },
    { id: "backup", points: 15 },
    { id: "vimrc", points: 25 },
    { id: "bashrc", points: 25 },
    { id: "reload", points: 15 },
    { id: "validate", points: 10 }
  ];

  const $ = (id) => document.getElementById(id);
  const els = {
    welcome: $("welcomeScreen"), lab: $("labScreen"), learnerName: $("learnerName"), entryError: $("entryError"),
    start: $("startLab"), terminalBody: $("terminalBody"), terminalForm: $("terminalForm"), terminalInput: $("terminalInput"),
    clear: $("clearTerminal"), score: $("scoreDisplay"), progressText: $("progressText"), progressFill: $("progressFill"),
    missionStatus: $("missionStatus"), guideButton: $("guideButton"), resetButton: $("resetButton"), guideModal: $("guideModal"),
    resetModal: $("resetModal"), confirmReset: $("confirmReset"), completionModal: $("completionModal"), finalScore: $("finalScore"),
    completionMessage: $("completionMessage"), continueButton: $("continueButton"), certificateButton: $("certificateButton"),
    certificateModal: $("certificateModal"), certificateName: $("certificateName"), certificateDate: $("certificateDate"),
    certificateScore: $("certificateScore"), certificateId: $("certificateId"), printCertificate: $("printCertificate"),
    downloadCertificate: $("downloadCertificate"), vimEditor: $("vimEditor"), vimFilename: $("vimFilename"),
    vimModified: $("vimModified"), vimBuffer: $("vimBuffer"), vimMode: $("vimMode"), vimPosition: $("vimPosition"),
    vimCommandRow: $("vimCommandRow"), vimCommand: $("vimCommand")
  };

  let learner = "Learner";
  let files;
  let shellEnv;
  let aliases;
  let inspected;
  let completed;
  let score;
  let sourcedValid;
  let verified;
  let syntaxSnapshot;
  let reviewSnapshots;
  let commandHistory;
  let historyIndex;
  let completionShown;
  let currentEditor = null;
  let editorMode = "normal";
  let editorOriginal = "";
  let editorSaved = "";

  function resetState() {
    files = { ...ORIGINAL };
    shellEnv = { USER: "student", HOME: "/home/student", SHELL: "/bin/bash", PATH: "/usr/local/bin:/usr/bin:/usr/local/sbin:/usr/sbin", HISTCONTROL: "ignoredups", HISTSIZE: "1000" };
    aliases = {};
    inspected = new Set();
    completed = new Set();
    score = 0;
    sourcedValid = false;
    verified = { editor: false, history: false, alias: false };
    syntaxSnapshot = "";
    reviewSnapshots = {};
    commandHistory = [];
    historyIndex = 0;
    completionShown = false;
    closeEditor(true);
    updateProgress();
  }

  function addLine(text = "", kind = "") {
    const line = document.createElement("div");
    line.className = "terminal-line" + (kind ? ` ${kind}` : "");
    line.textContent = text;
    els.terminalBody.appendChild(line);
    els.terminalBody.scrollTop = els.terminalBody.scrollHeight;
  }

  function addCommand(command) {
    addLine(`[student@rhel10 ~]$ ${command}`, "command");
  }

  function clearTerminal() {
    els.terminalBody.textContent = "";
  }

  function taskById(id) {
    return TASKS.find((task) => task.id === id);
  }

  function award(id) {
    if (completed.has(id)) return;
    const task = taskById(id);
    completed.add(id);
    score += task.points;
    addLine(`✓ Objective complete: +${task.points} points (${score}/100)`, "success");
    updateProgress();
  }

  function updateProgress() {
    if (!els.score) return;
    els.score.textContent = String(score || 0);
    els.progressText.textContent = `${completed ? completed.size : 0} / ${TASKS.length} objectives`;
    els.progressFill.style.width = `${completed ? (completed.size / TASKS.length) * 100 : 0}%`;
    document.querySelectorAll(".task-card").forEach((card) => {
      const isDone = completed && completed.has(card.dataset.task);
      card.classList.toggle("complete", Boolean(isDone));
      card.classList.remove("active");
    });
    const next = TASKS.find((task) => !completed || !completed.has(task.id));
    if (next) document.querySelector(`[data-task="${next.id}"]`)?.classList.add("active");
    els.missionStatus.textContent = completed && completed.size === TASKS.length ? "Complete" : "In progress";
  }

  function evaluate() {
    if (inspected.has("/home/student/.vimrc") && inspected.has("/home/student/.bashrc")) award("inspect");

    if (files["/home/student/.vimrc.bak"] === ORIGINAL["/home/student/.vimrc"] && files["/home/student/.bashrc.bak"] === ORIGINAL["/home/student/.bashrc"]) award("backup");

    if (Core.validateVimrc(files["/home/student/.vimrc"]).ok) award("vimrc");
    if (Core.validateBashrc(files["/home/student/.bashrc"]).ok) award("bashrc");

    if (sourcedValid && verified.editor && verified.history && verified.alias) award("reload");

    const syntaxCurrent = syntaxSnapshot === files["/home/student/.bashrc"];
    const reviewedVim = reviewSnapshots["/home/student/.vimrc"] === files["/home/student/.vimrc"];
    const reviewedBash = reviewSnapshots["/home/student/.bashrc"] === files["/home/student/.bashrc"];
    if (syntaxCurrent && reviewedVim && reviewedBash && Core.validateVimrc(files["/home/student/.vimrc"]).ok && Core.validateBashrc(files["/home/student/.bashrc"]).ok) award("validate");

    if (completed.size === TASKS.length && !completionShown) completeLab();
  }

  function startLab() {
    const name = els.learnerName.value.trim().replace(/\s+/g, " ");
    if (name.length < 2) {
      els.entryError.textContent = "Please enter your name before starting.";
      els.learnerName.focus();
      return;
    }
    learner = name;
    els.entryError.textContent = "";
    resetState();
    els.welcome.hidden = true;
    els.lab.hidden = false;
    addLine(`Welcome, ${learner}. Your RHEL 10 user environment is ready.`, "success");
    els.terminalInput.focus();
  }

  function listFiles(longFormat) {
    const names = [".", "..", ".bash_logout", ".bash_profile", ".bashrc", ".vimrc"];
    if (files["/home/student/.bashrc.bak"] !== undefined) names.push(".bashrc.bak");
    if (files["/home/student/.vimrc.bak"] !== undefined) names.push(".vimrc.bak");
    if (!longFormat) return names.join("  ");
    return names.map((name) => {
      if (name === "." || name === "..") return `drwx------. 2 student student  120 Aug 19 10:00 ${name}`;
      const content = files[`/home/student/${name}`];
      const size = content === undefined ? 24 : new TextEncoder().encode(content).length;
      return `-rw-r--r--. 1 student student ${String(size).padStart(4, " ")} Aug 19 10:00 ${name}`;
    }).join("\n");
  }

  function fileDisplayPath(path) {
    return path.replace("/home/student/", "~/");
  }

  function getSystemFile(path) {
    if (path === "/etc/redhat-release") return "Red Hat Enterprise Linux release 10.0 (Coughlan)\n";
    if (path === "/etc/bashrc") return "# System-wide functions and aliases\n";
    return undefined;
  }

  function fileContent(path) {
    return Object.prototype.hasOwnProperty.call(files, path) ? files[path] : getSystemFile(path);
  }

  function simpleDiff(oldPath, newPath) {
    const before = fileContent(oldPath);
    const after = fileContent(newPath);
    if (before === undefined || after === undefined) return { error: `diff: ${before === undefined ? oldPath : newPath}: No such file or directory` };
    if (before === after) return { output: "" };
    const a = before.replace(/\n$/, "").split("\n");
    const b = after.replace(/\n$/, "").split("\n");
    const lines = [`--- ${fileDisplayPath(oldPath)}\t2026-08-19 10:00:00`, `+++ ${fileDisplayPath(newPath)}\t2026-08-19 10:15:00`, `@@ -1,${a.length} +1,${b.length} @@`];
    a.forEach((line) => lines.push(`-${line}`));
    b.forEach((line) => lines.push(`+${line}`));
    return { output: lines.join("\n") };
  }

  function showHelp() {
    [
      "Supported commands:",
      "  ls [-la] [path]        List simulated files",
      "  cat FILE               Read a file",
      "  cp [-p] SOURCE DEST    Copy a file",
      "  vim FILE               Open the Vim-style editor",
      "  source ~/.bashrc       Reload Bash configuration",
      "  echo $VARIABLE         Show an environment value",
      "  alias [NAME]           Show loaded aliases",
      "  type NAME              Identify a loaded alias",
      "  bash -n FILE           Validate Bash syntax",
      "  diff -u OLD NEW        Review file changes",
      "  pwd, whoami, hostname, date, history, clear",
      "  vim --version, bash --version, hostnamectl",
      "",
      "The terminal accepts one safe simulated command at a time."
    ].forEach((line) => addLine(line, line.startsWith("Supported") ? "success" : ""));
  }

  function execute(command) {
    const raw = command.trim();
    if (!raw) return;
    commandHistory.push(raw);
    historyIndex = commandHistory.length;
    addCommand(raw);

    if (/[|;&`]|\$\(/.test(raw)) {
      addLine("This practice shell accepts one command at a time; pipelines and command substitution are not enabled.", "warning");
      return;
    }

    const tokens = Core.tokenize(raw);
    const cmd = tokens[0];
    const args = tokens.slice(1);

    if (cmd === "help") { showHelp(); return; }
    if (cmd === "clear" || (cmd === "c" && aliases.c === "clear")) { clearTerminal(); return; }
    if (cmd === "pwd") { addLine("/home/student"); return; }
    if (cmd === "whoami") { addLine("student"); return; }
    if (cmd === "hostname") { addLine("rhel10.lab.local"); return; }
    if (cmd === "date") { addLine("Wed Aug 19 10:18:00 IST 2026"); return; }
    if (cmd === "hostnamectl") {
      addLine(" Static hostname: rhel10.lab.local\n       Icon name: computer-vm\n         Chassis: vm\n      Machine ID: 8d5f6f1188dc4dd2932f180507f682aa\n Operating System: Red Hat Enterprise Linux 10.0 (Coughlan)\n           Kernel: Linux 6.12.0-55.el10.x86_64\n     Architecture: x86-64");
      return;
    }
    if (cmd === "history") { commandHistory.forEach((item, index) => addLine(`${String(index + 1).padStart(4, " ")}  ${item}`)); return; }
    if (cmd === "ls" || (cmd === "ll" && aliases.ll === "ls -alF")) {
      const longFormat = cmd === "ll" || args.some((arg) => /^-[a-z]*l/i.test(arg));
      addLine(listFiles(longFormat));
      return;
    }
    if (cmd === "cat") {
      if (!args.length) { addLine("cat: missing file operand", "error"); return; }
      args.forEach((arg) => {
        const path = Core.homePath(arg);
        const content = fileContent(path);
        if (content === undefined) addLine(`cat: ${arg}: No such file or directory`, "error");
        else {
          if (path === "/home/student/.vimrc" || path === "/home/student/.bashrc") inspected.add(path);
          addLine(content.replace(/\n$/, ""));
        }
      });
      evaluate();
      return;
    }
    if (cmd === "cp") {
      const operands = args.filter((arg) => !arg.startsWith("-"));
      if (operands.length !== 2) { addLine("cp: expected SOURCE and DEST", "error"); return; }
      const source = Core.homePath(operands[0]);
      const destination = Core.homePath(operands[1]);
      if (!Object.prototype.hasOwnProperty.call(files, source)) { addLine(`cp: cannot stat '${operands[0]}': No such file or directory`, "error"); return; }
      if (!destination.startsWith("/home/student/")) { addLine("cp: destination is outside this practice home directory", "error"); return; }
      files[destination] = files[source];
      addLine(`'${fileDisplayPath(source)}' -> '${fileDisplayPath(destination)}'`, "success");
      evaluate();
      return;
    }
    if (cmd === "vim" || cmd === "vi") {
      if (args[0] === "--version") {
        addLine("VIM - Vi IMproved 9.1 (2024 Jan 02, compiled for RHEL 10)\nIncluded patches: 1-785\nHuge version without GUI. Features included (+) or not (-):\n+syntax +viminfo +terminal +multi_byte +persistent_undo");
        return;
      }
      if (args.length !== 1) { addLine(`${cmd}: provide one file, for example: vim ~/.vimrc`, "error"); return; }
      openEditor(Core.homePath(args[0]));
      return;
    }
    if (cmd === "source" || cmd === ".") {
      if (args.length !== 1 || Core.homePath(args[0]) !== "/home/student/.bashrc") { addLine(`${cmd}: this lab supports reloading ~/.bashrc`, "error"); return; }
      const syntax = Core.bashSyntax(files["/home/student/.bashrc"]);
      if (!syntax.ok) { addLine(`bash: ${syntax.message}`, "error"); return; }
      const parsed = Core.parseBashrc(files["/home/student/.bashrc"]);
      Object.assign(shellEnv, parsed.env);
      aliases = { ...parsed.aliases };
      sourcedValid = Core.validateBashrc(files["/home/student/.bashrc"]).ok;
      verified = { editor: false, history: false, alias: false };
      addLine(".bashrc loaded into the current simulated shell.", sourcedValid ? "success" : "warning");
      if (!sourcedValid) addLine("The file loaded, but required lab settings are still missing.", "warning");
      evaluate();
      return;
    }
    if (cmd === "echo") {
      const expression = args.join(" ");
      if (/^\$[A-Za-z_][A-Za-z0-9_]*$/.test(expression)) {
        const key = expression.slice(1);
        const value = shellEnv[key] || "";
        addLine(value);
        if (key === "EDITOR" && value === "vim") verified.editor = true;
        if ((key === "HISTSIZE" && value === "2000") || (key === "HISTCONTROL" && value === "ignoreboth")) verified.history = true;
        evaluate();
      } else addLine(expression);
      return;
    }
    if (cmd === "alias") {
      if (!args.length) Object.keys(aliases).sort().forEach((name) => addLine(`alias ${name}='${aliases[name]}'`));
      else args.forEach((name) => {
        if (aliases[name] === undefined) addLine(`bash: alias: ${name}: not found`, "error");
        else {
          addLine(`alias ${name}='${aliases[name]}'`);
          if (name === "ll" && aliases.ll === "ls -alF") verified.alias = true;
        }
      });
      evaluate();
      return;
    }
    if (cmd === "type") {
      if (args.length !== 1) { addLine("type: expected one command name", "error"); return; }
      const name = args[0];
      if (aliases[name] !== undefined) {
        addLine(`${name} is aliased to \`${aliases[name]}'`);
        if (name === "ll" && aliases.ll === "ls -alF") verified.alias = true;
      } else if (["bash", "vim", "cat", "cp", "diff"].includes(name)) addLine(`${name} is /usr/bin/${name}`);
      else addLine(`bash: type: ${name}: not found`, "error");
      evaluate();
      return;
    }
    if (cmd === "bash") {
      if (args[0] === "--version") { addLine("GNU bash, version 5.2.26(1)-release (x86_64-redhat-linux-gnu)"); return; }
      if (args[0] === "-n" && args[1]) {
        const path = Core.homePath(args[1]);
        const content = fileContent(path);
        if (content === undefined) { addLine(`bash: ${args[1]}: No such file or directory`, "error"); return; }
        const result = Core.bashSyntax(content);
        if (result.ok) {
          syntaxSnapshot = content;
          addLine(`Syntax OK: ${fileDisplayPath(path)}`, "success");
        } else addLine(`bash: ${result.message}`, "error");
        evaluate();
        return;
      }
      addLine("bash: this lab supports --version and -n FILE", "warning");
      return;
    }
    if (cmd === "diff") {
      const operands = args.filter((arg) => !arg.startsWith("-"));
      if (operands.length !== 2) { addLine("diff: expected OLD_FILE and NEW_FILE", "error"); return; }
      const oldPath = Core.homePath(operands[0]);
      const newPath = Core.homePath(operands[1]);
      const result = simpleDiff(oldPath, newPath);
      if (result.error) addLine(result.error, "error");
      else {
        if (result.output) result.output.split("\n").forEach((line) => addLine(line, line.startsWith("+++") || line.startsWith("+") ? "diff-add" : line.startsWith("---") || line.startsWith("-") ? "diff-remove" : ""));
        else addLine("No differences.");
        if (oldPath === "/home/student/.vimrc.bak" && newPath === "/home/student/.vimrc") reviewSnapshots[newPath] = files[newPath];
        if (oldPath === "/home/student/.bashrc.bak" && newPath === "/home/student/.bashrc") reviewSnapshots[newPath] = files[newPath];
      }
      evaluate();
      return;
    }
    if (cmd === "man") {
      if (args[0] === "vim") addLine("VIM(1)  Vi IMproved, a programmer's text editor\nPress i for Insert mode, Esc for Normal mode, and : to enter Ex commands.");
      else if (args[0] === "bash") addLine("BASH(1)  GNU Bourne-Again SHell\nStartup files include ~/.bash_profile and ~/.bashrc. Use source to read commands into the current shell.");
      else addLine(`No manual entry for ${args[0] || ""}`, "error");
      return;
    }

    addLine(`bash: ${cmd}: command not found`, "error");
  }

  function openEditor(path) {
    if (path !== "/home/student/.vimrc" && path !== "/home/student/.bashrc") {
      addLine("vim: this focused exercise supports ~/.vimrc and ~/.bashrc", "warning");
      return;
    }
    currentEditor = path;
    editorOriginal = files[path] || "";
    editorSaved = editorOriginal;
    els.vimBuffer.value = editorOriginal;
    els.vimFilename.textContent = fileDisplayPath(path);
    els.vimEditor.hidden = false;
    els.terminalInput.disabled = true;
    setEditorMode("normal");
    updateEditorStatus();
    els.vimBuffer.focus();
    els.vimBuffer.setSelectionRange(0, 0);
  }

  function setEditorMode(mode) {
    editorMode = mode;
    if (mode === "insert") {
      els.vimBuffer.readOnly = false;
      els.vimMode.textContent = "-- INSERT --";
      els.vimMode.parentElement.style.background = "#ffd46d";
    } else {
      els.vimBuffer.readOnly = true;
      els.vimMode.textContent = "-- NORMAL --";
      els.vimMode.parentElement.style.background = "#65d990";
    }
    els.vimBuffer.focus();
  }

  function updateEditorStatus() {
    const position = els.vimBuffer.selectionStart || 0;
    const before = els.vimBuffer.value.slice(0, position).split("\n");
    els.vimPosition.textContent = `${before.length},${before[before.length - 1].length + 1}`;
    els.vimModified.textContent = els.vimBuffer.value !== editorSaved ? "[modified]" : "";
  }

  function saveEditor() {
    if (!currentEditor) return;
    let value = els.vimBuffer.value;
    if (value && !value.endsWith("\n")) value += "\n";
    files[currentEditor] = value;
    els.vimBuffer.value = value;
    editorSaved = value;
    els.vimModified.textContent = "";
    evaluate();
  }

  function closeEditor(forceDiscard = false) {
    if (!currentEditor && els.vimEditor?.hidden) return;
    if (forceDiscard && currentEditor) els.vimBuffer.value = editorOriginal;
    currentEditor = null;
    els.vimEditor.hidden = true;
    els.vimCommandRow.hidden = true;
    els.vimCommand.value = "";
    els.terminalInput.disabled = false;
    if (!els.lab.hidden) els.terminalInput.focus();
  }

  function runVimCommand(command) {
    const value = command.replace(/^:/, "").trim();
    els.vimCommandRow.hidden = true;
    els.vimCommand.value = "";
    if (value === "w") {
      saveEditor();
      setEditorMode("normal");
    } else if (value === "wq" || value === "x") {
      saveEditor();
      const path = currentEditor;
      closeEditor();
      addLine(`"${fileDisplayPath(path)}" written`, "success");
    } else if (value === "q!") {
      closeEditor(true);
      addLine("Vim changes discarded.", "warning");
    } else if (value === "q") {
      if (els.vimBuffer.value !== editorSaved) {
        els.vimModified.textContent = "E37: No write since last change (add ! to override)";
        els.vimBuffer.focus();
      } else closeEditor();
    } else {
      els.vimModified.textContent = `E492: Not an editor command: ${value}`;
      els.vimBuffer.focus();
    }
  }

  function editorKeydown(event) {
    if (editorMode === "insert") {
      if (event.key === "Escape" || (event.ctrlKey && event.key === "[")) {
        event.preventDefault();
        setEditorMode("normal");
      }
      return;
    }
    if (event.key === "i") { event.preventDefault(); setEditorMode("insert"); return; }
    if (event.key === "a") {
      event.preventDefault();
      const next = Math.min(els.vimBuffer.value.length, els.vimBuffer.selectionStart + 1);
      els.vimBuffer.setSelectionRange(next, next);
      setEditorMode("insert");
      return;
    }
    if (event.key === "o") {
      event.preventDefault();
      const pos = els.vimBuffer.selectionStart;
      const end = els.vimBuffer.value.indexOf("\n", pos);
      const insertAt = end === -1 ? els.vimBuffer.value.length : end + 1;
      els.vimBuffer.value = els.vimBuffer.value.slice(0, insertAt) + "\n" + els.vimBuffer.value.slice(insertAt);
      els.vimBuffer.setSelectionRange(insertAt, insertAt);
      setEditorMode("insert");
      updateEditorStatus();
      return;
    }
    if (event.key === ":") {
      event.preventDefault();
      els.vimCommandRow.hidden = false;
      els.vimCommand.focus();
      return;
    }
    if (event.key === "Escape") event.preventDefault();
    if (["Backspace", "Delete", "Enter"].includes(event.key) || (event.key.length === 1 && !event.ctrlKey && !event.metaKey)) event.preventDefault();
  }

  function showDialog(dialog) {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function closeDialog(dialog) {
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function completeLab() {
    completionShown = true;
    els.finalScore.textContent = String(score);
    els.completionMessage.textContent = `${learner}, you completed every objective and validated a working RHEL 10 user configuration.`;
    prepareCertificate();
    try {
      if (window.RCWPassport) window.RCWPassport.record({ type: "lab", name: "RHEL 10 .vimrc & .bashrc Configuration Lab", score, total: 100, xp: 100, activity: 6, skill: "RHEL 10 Linux administration" });
    } catch (error) { console.warn("Passport recording was unavailable.", error); }
    showDialog(els.completionModal);
  }

  function certificateCode() {
    const seed = `${learner}|${new Date().toISOString().slice(0, 10)}|${score}`;
    let hash = 2166136261;
    for (let i = 0; i < seed.length; i += 1) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
    return `RCW-RHEL10-${(hash >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
  }

  function prepareCertificate() {
    const now = new Date();
    els.certificateName.textContent = learner;
    els.certificateScore.textContent = `${score} / 100`;
    els.certificateDate.textContent = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" }).format(now);
    els.certificateId.textContent = `Certificate ID: ${certificateCode()}`;
  }

  function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(/\s+/);
    const lines = [];
    let line = "";
    words.forEach((word) => {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; } else line = test;
    });
    if (line) lines.push(line);
    lines.forEach((item, index) => ctx.fillText(item, x, y + index * lineHeight));
    return y + lines.length * lineHeight;
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
  }

  async function renderCertificateJpeg() {
    const canvas = document.createElement("canvas");
    canvas.width = 1400;
    canvas.height = 990;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 1400, 990);
    gradient.addColorStop(0, "#fffdf6");
    gradient.addColorStop(1, "#eef6ff");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1400, 990);
    ctx.strokeStyle = "#09295a"; ctx.lineWidth = 12; ctx.strokeRect(24, 24, 1352, 942);
    ctx.strokeStyle = "#d6a720"; ctx.lineWidth = 3; ctx.strokeRect(46, 46, 1308, 898);
    ctx.strokeStyle = "#7da3cf"; ctx.lineWidth = 1; ctx.strokeRect(57, 57, 1286, 876);

    ctx.textAlign = "left"; ctx.fillStyle = "#0b2f63"; ctx.font = "900 58px Arial"; ctx.fillText("RCW", 100, 134);
    ctx.font = "800 25px Arial"; ctx.fillText("IT TRAINING", 230, 112);
    ctx.fillStyle = "#56708e"; ctx.font = "500 18px Arial"; ctx.fillText("Practice · Learn · Grow", 230, 139);
    ctx.fillStyle = "#d6a720"; ctx.fillRect(100, 162, 1200, 3);

    ctx.textAlign = "center"; ctx.fillStyle = "#517194"; ctx.font = "800 21px Arial"; ctx.fillText("CERTIFICATE OF ACHIEVEMENT", 700, 227);
    ctx.fillStyle = "#0b2f63"; ctx.font = "italic 700 57px Georgia"; ctx.fillText("Linux Challenge Champion", 700, 303);
    ctx.fillStyle = "#66768b"; ctx.font = "400 22px Arial"; ctx.fillText("This certificate is proudly presented to", 700, 359);
    ctx.fillStyle = "#172945"; ctx.font = `700 ${learner.length > 30 ? 44 : 54}px Georgia`; ctx.fillText(learner, 700, 429);
    ctx.strokeStyle = "#d6a720"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(390, 450); ctx.lineTo(1010, 450); ctx.stroke();
    ctx.fillStyle = "#66768b"; ctx.font = "400 21px Arial"; ctx.fillText("for successfully completing the", 700, 500);
    ctx.fillStyle = "#0b2f63"; ctx.font = "800 31px Arial"; ctx.fillText("RHEL 10 .vimrc & .bashrc Configuration Lab", 700, 550);
    ctx.fillStyle = "#53657d"; ctx.font = "400 20px Arial";
    wrapCanvasText(ctx, "Demonstrating practical skill in safely backing up, configuring, reloading, validating and reviewing persistent Vim and Bash user settings.", 700, 601, 880, 30);

    ctx.fillStyle = "#edf4fb"; ctx.fillRect(330, 674, 740, 70);
    ctx.strokeStyle = "#c8daec"; ctx.strokeRect(330, 674, 740, 70);
    ctx.fillStyle = "#536b87"; ctx.font = "700 18px Arial"; ctx.fillText("FINAL SCORE", 500, 716);
    ctx.fillStyle = "#0a356b"; ctx.font = "900 30px Arial"; ctx.fillText(`${score} / 100`, 700, 718);
    ctx.fillStyle = "#536b87"; ctx.font = "700 18px Arial"; ctx.fillText("6 OBJECTIVES", 900, 716);

    ctx.textAlign = "left"; ctx.fillStyle = "#203956"; ctx.font = "700 21px Arial"; ctx.fillText(els.certificateDate.textContent, 110, 842);
    ctx.fillStyle = "#718096"; ctx.font = "400 15px Arial"; ctx.fillText("Date of completion", 110, 868);

    try {
      const photo = await loadImage("assets/pradeep-raju.jpg");
      ctx.save(); ctx.beginPath(); ctx.arc(1035, 834, 59, 0, Math.PI * 2); ctx.clip();
      const ratio = Math.max(118 / photo.width, 118 / photo.height);
      const width = photo.width * ratio; const height = photo.height * ratio;
      ctx.drawImage(photo, 1035 - width / 2, 834 - height * 0.31, width, height);
      ctx.restore(); ctx.strokeStyle = "#d6a720"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(1035, 834, 61, 0, Math.PI * 2); ctx.stroke();
    } catch (error) {
      ctx.fillStyle = "#0b2f63"; ctx.beginPath(); ctx.arc(1035, 834, 59, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = "800 25px Arial"; ctx.fillText("PR", 1035, 844);
    }
    ctx.textAlign = "left"; ctx.fillStyle = "#172945"; ctx.font = "italic 700 25px Georgia"; ctx.fillText("Pradeep Raju", 1115, 819);
    ctx.fillStyle = "#5d6f86"; ctx.font = "500 16px Arial"; ctx.fillText("Founder & Senior Architect", 1115, 846);
    ctx.fillText("RCW IT Training", 1115, 871);

    ctx.textAlign = "center"; ctx.fillStyle = "#7890aa"; ctx.font = "500 14px monospace"; ctx.fillText(els.certificateId.textContent, 700, 918);
    return { dataUrl: canvas.toDataURL("image/jpeg", 0.92), width: canvas.width, height: canvas.height };
  }

  function binaryStringToBytes(value) {
    const bytes = new Uint8Array(value.length);
    for (let i = 0; i < value.length; i += 1) bytes[i] = value.charCodeAt(i) & 255;
    return bytes;
  }

  async function downloadPdf() {
    const originalText = els.downloadCertificate.textContent;
    els.downloadCertificate.disabled = true;
    els.downloadCertificate.textContent = "Preparing PDF…";
    try {
      const rendered = await renderCertificateJpeg();
      const jpegBinary = atob(rendered.dataUrl.split(",")[1]);
      const content = "q\n842 0 0 595 0 0 cm\n/Im0 Do\nQ\n";
      const objects = [];
      objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
      objects[2] = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
      objects[3] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>";
      objects[4] = `<< /Type /XObject /Subtype /Image /Width ${rendered.width} /Height ${rendered.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBinary.length} >>\nstream\n${jpegBinary}\nendstream`;
      objects[5] = `<< /Length ${content.length} >>\nstream\n${content}endstream`;
      let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
      const offsets = [0];
      for (let number = 1; number <= 5; number += 1) {
        offsets[number] = pdf.length;
        pdf += `${number} 0 obj\n${objects[number]}\nendobj\n`;
      }
      const xref = pdf.length;
      pdf += "xref\n0 6\n0000000000 65535 f \n";
      for (let number = 1; number <= 5; number += 1) pdf += `${String(offsets[number]).padStart(10, "0")} 00000 n \n`;
      pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
      const blob = new Blob([binaryStringToBytes(pdf)], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `RCW-RHEL10-Vimrc-Bashrc-${learner.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "Learner"}.pdf`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    } catch (error) {
      console.error(error);
      window.alert("The PDF could not be created. Please use Print certificate instead.");
    } finally {
      els.downloadCertificate.disabled = false;
      els.downloadCertificate.textContent = originalText;
    }
  }

  els.start.addEventListener("click", startLab);
  els.learnerName.addEventListener("keydown", (event) => { if (event.key === "Enter") startLab(); });
  els.terminalForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = els.terminalInput.value;
    els.terminalInput.value = "";
    execute(value);
  });
  els.terminalInput.addEventListener("keydown", (event) => {
    if (event.key === "ArrowUp") { event.preventDefault(); if (historyIndex > 0) historyIndex -= 1; els.terminalInput.value = commandHistory[historyIndex] || ""; }
    if (event.key === "ArrowDown") { event.preventDefault(); if (historyIndex < commandHistory.length) historyIndex += 1; els.terminalInput.value = commandHistory[historyIndex] || ""; }
  });
  els.clear.addEventListener("click", clearTerminal);
  els.guideButton.addEventListener("click", () => showDialog(els.guideModal));
  els.resetButton.addEventListener("click", () => showDialog(els.resetModal));
  els.confirmReset.addEventListener("click", () => {
    closeDialog(els.resetModal);
    resetState(); clearTerminal();
    addLine("Lab reset. Original .vimrc and .bashrc restored.", "warning");
    els.terminalInput.focus();
  });
  document.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", () => closeDialog($(button.dataset.closeModal))));
  document.querySelectorAll(".hint-toggle").forEach((button) => button.addEventListener("click", () => {
    const box = $(`hint-${button.dataset.hint}`);
    box.hidden = !box.hidden;
    button.textContent = box.hidden ? "Show hint" : "Hide hint";
  }));

  els.vimBuffer.addEventListener("keydown", editorKeydown);
  els.vimBuffer.addEventListener("input", updateEditorStatus);
  els.vimBuffer.addEventListener("click", updateEditorStatus);
  els.vimBuffer.addEventListener("keyup", updateEditorStatus);
  els.vimCommand.addEventListener("keydown", (event) => {
    if (event.key === "Enter") { event.preventDefault(); runVimCommand(els.vimCommand.value); }
    if (event.key === "Escape") { event.preventDefault(); els.vimCommandRow.hidden = true; els.vimCommand.value = ""; els.vimBuffer.focus(); }
  });
  document.querySelectorAll("[data-vim-action]").forEach((button) => button.addEventListener("click", () => {
    const action = button.dataset.vimAction;
    if (action === "insert") setEditorMode("insert");
    if (action === "escape") setEditorMode("normal");
    if (action === "write") runVimCommand("w");
    if (action === "writequit") runVimCommand("wq");
    if (action === "quitforce") runVimCommand("q!");
  }));

  els.continueButton.addEventListener("click", () => { closeDialog(els.completionModal); els.terminalInput.focus(); });
  els.certificateButton.addEventListener("click", () => { closeDialog(els.completionModal); prepareCertificate(); showDialog(els.certificateModal); });
  els.printCertificate.addEventListener("click", () => {
    document.body.classList.add("printing-certificate");
    window.print();
    setTimeout(() => document.body.classList.remove("printing-certificate"), 500);
  });
  els.downloadCertificate.addEventListener("click", downloadPdf);

  document.querySelectorAll("dialog").forEach((dialog) => dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog(dialog);
  }));
})();
