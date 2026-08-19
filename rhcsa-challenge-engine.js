(() => {
  "use strict";

  const C = window.RCW_RHCSA_CHALLENGE;
  if (!C || !C.scenario || !Array.isArray(C.objectives)) throw new Error("Challenge configuration is missing.");

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const htmlEscape = (value) => String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
  const cleanName = (value) => String(value || "").trim().replace(/\s+/g, " ").slice(0, 60);
  const normalizePath = (path) => String(path || "").replace(/\/+$/, "") || "/";
  const hasLine = (content, pattern) => String(content || "").split(/\r?\n/).some((line) => pattern.test(line.trim()));
  const shellWords = (value) => {
    const words = [];
    const regex = /"((?:\\.|[^"])*)"|'([^']*)'|([^\s]+)/g;
    let match;
    while ((match = regex.exec(value))) words.push((match[1] ?? match[2] ?? match[3]).replace(/\\([\\"'])/g, "$1"));
    return words;
  };
  const stripSudo = (value) => String(value || "").trim().replace(/^sudo\s+/, "");
  const dateText = (date = new Date()) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" }).format(date);
  const safeSlug = (value) => value.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "Learner";

  document.title = `${C.title} | RCW IT Training`;
  document.body.innerHTML = `
    <a class="skip" href="#terminalInput">Skip to terminal</a>
    <header class="site-head">
      <a class="brand" href="../index.html" aria-label="RCW IT Training home">
        <span class="brand-mark">RCW</span><span class="brand-copy"><strong>RCW IT Training</strong><small>INTERACTIVE LEARNING LAB</small></span>
      </a>
      <div class="head-right"><span class="secure"><i class="dot"></i>Isolated practice system</span><button id="openGuide" class="icon-btn" type="button" aria-label="Open lab guide">?</button></div>
    </header>
    <main id="main">
      <section id="welcome" class="screen welcome active" aria-labelledby="welcomeTitle">
        <div class="welcome-copy">
          <div class="kicker">RHCSA-aligned · RHEL 10 preparation</div>
          <h1 id="welcomeTitle">${htmlEscape(C.heroLine1)}<br><span>${htmlEscape(C.heroLine2)}</span></h1>
          <p class="lead">${htmlEscape(C.summary)}</p>
          <span class="scenario-chip">SCENARIO // ${htmlEscape(C.scenarioLabel)}</span>
          <div class="stats" aria-label="Lab details"><div><strong>${C.objectives.length}</strong><span>Objectives</span></div><div><strong>100</strong><span>Total points</span></div><div><strong>State</strong><span>Validated</span></div></div>
        </div>
        <div class="entry">
          <div class="entry-head"><span class="terminal-mini">&gt;_</span><span><small>SESSION ENTRY</small><strong>Begin the challenge</strong></span></div>
          <div class="entry-body">
            <div class="kicker">Learner identification</div>
            <p>Your name appears on the completion certificate. Your work is evaluated from the resulting system configuration, not from command text alone.</p>
            <label for="learnerName">Full name</label>
            <input id="learnerName" maxlength="60" autocomplete="name" placeholder="Enter your name" aria-describedby="nameError">
            <p id="nameError" class="error" role="alert"></p>
            <button id="startLab" class="btn primary wide" type="button"><span>Start practical assessment</span><span aria-hidden="true">→</span></button>
            <p class="privacy">Name and progress stay in this browser.</p>
          </div>
        </div>
      </section>

      <section id="lab" class="screen lab" aria-labelledby="labTitle">
        <div class="lab-top"><div><div class="kicker">Live practical assessment</div><h1 id="labTitle">${htmlEscape(C.title)}</h1></div><div class="metrics"><div class="metric"><span>LEARNER</span><strong id="learnerMetric">—</strong></div><div class="metric score"><span>LIVE SCORE</span><strong><span id="score">0</span>/100</strong></div></div></div>
        <div class="lab-grid">
          <aside class="mission" aria-label="Mission objectives">
            <div class="mission-head"><div><div class="kicker">Mission brief</div><h2>${htmlEscape(C.missionTitle)}</h2></div><span class="difficulty">INTERMEDIATE</span></div>
            <p class="brief">${htmlEscape(C.brief)}</p>
            <ol id="tasks" class="tasks"></ol>
            <div class="progress-label"><span>Objective progress</span><strong id="progressText">0 / ${C.objectives.length}</strong></div><div class="progress-track"><div id="progressFill" class="progress-fill"></div></div>
            <details class="hints"><summary>Show command reminders</summary><p>${C.reminders.map((item) => `<code>${htmlEscape(item)}</code>`).join(" · ")}</p></details>
            <div class="mission-actions"><button id="guideInLab" class="btn secondary" type="button">Lab guide</button><button id="resetLab" class="btn secondary" type="button">Reset</button></div>
          </aside>
          <section class="workspace" aria-label="Practice terminal">
            <div class="envbar"><div><strong>RHEL 10 practice host</strong><small id="hostLabel">root@server1 · bash</small></div><div class="tags"><span>ROOT ACCESS</span><span>PERSISTENCE CHECKS</span><span>STATE VALIDATION</span></div></div>
            <div class="terminal">
              <div class="termbar"><span class="window-dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="termtitle">root@server1: ~</span><button id="clearTerminal" type="button">Clear output</button></div>
              <div id="terminalOutput" class="term-body" role="log" aria-live="polite"></div>
              <form id="terminalForm" class="input-row" autocomplete="off"><span class="prompt-user">[root@server1</span><span class="prompt-path">~]</span><span>#</span><input id="terminalInput" aria-label="Terminal command" spellcheck="false" autocomplete="off"></form>
              <div class="term-hint">Try <code>help</code> for supported commands. Use <code>vi /path/to/file</code> for configuration files.</div>
              <section id="editor" class="editor" hidden aria-label="Configuration file editor">
                <div class="editor-head"><span><strong>vi</strong> · <span id="editorPath"></span></span><span id="editorBadge" class="editor-badge">NORMAL</span></div>
                <textarea id="editorText" readonly spellcheck="false" aria-label="File content"></textarea>
                <div class="editor-status"><span id="editorMode">-- NORMAL --</span><span id="editorPosition">1,1</span></div>
                <div class="editor-command"><span>:</span><input id="editorCommand" aria-label="vi command" autocomplete="off" disabled></div>
                <div class="editor-controls"><button data-editor="insert" type="button">i Insert</button><button data-editor="normal" type="button">Esc Normal</button><button data-editor="write" type="button">:w Save</button><button data-editor="savequit" type="button">:wq Save & quit</button><button data-editor="quit" type="button">:q! Discard</button></div>
              </section>
            </div>
          </section>
        </div>
      </section>

      <section id="result" class="screen result" aria-labelledby="resultTitle">
        <div class="result-header"><div class="medal" aria-hidden="true">★</div><div class="kicker">Practical assessment complete</div><h1 id="resultTitle">Linux Challenge Champion</h1><p id="resultMessage"></p></div>
        <div class="result-grid">
          <section class="score-card"><div class="kicker">Final result</div><div class="score-ring"><span><strong>100</strong><span>out of 100</span></span></div><div class="verdict">ALL OBJECTIVES VALIDATED</div><dl class="result-dl"><div><dt>Learner</dt><dd id="resultLearner"></dd></div><div><dt>Objectives</dt><dd>${C.objectives.length} / ${C.objectives.length}</dd></div><div><dt>Outcome</dt><dd>Completed</dd></div></dl></section>
          <section class="cert-card"><div class="cert-head"><div><div class="kicker">RCW IT Training</div><h2>Completion certificate</h2></div><span class="pdf-chip">PDF READY</span></div><div class="cert-preview"><canvas id="certificateCanvas" width="1400" height="990" aria-label="Certificate preview"></canvas></div><div class="cert-actions"><button id="downloadCertificate" class="btn primary" type="button">Download PDF certificate</button><button id="printCertificate" class="btn secondary" type="button">Print certificate</button></div><p class="cert-note">Issued by RCW IT Training · Signed by Pradeep Raju</p></section>
        </div>
        <button id="replay" class="btn secondary replay" type="button">Run challenge again</button>
      </section>
    </main>
    <dialog id="guideModal" class="modal"><div class="modal-card"><div class="kicker">Quick reference</div><h2>${htmlEscape(C.title)}</h2><p>${htmlEscape(C.guideIntro)}</p><div class="guide-grid">${C.objectives.map((item, index) => `<section><h3>${index + 1}. ${htmlEscape(item.title)}</h3><p>${htmlEscape(item.detail)} Worth ${item.points} points.</p></section>`).join("")}</div><div class="modal-actions"><a class="btn secondary" href="LAB_GUIDE.md" target="_blank" rel="noopener">Open complete guide</a><button id="closeGuide" class="btn primary" type="button">Return to lab</button></div></div></dialog>
    <div id="toast" class="toast" role="status" aria-live="polite"></div>`;

  const E = {
    welcome: $("#welcome"), lab: $("#lab"), result: $("#result"), learnerName: $("#learnerName"), nameError: $("#nameError"),
    learnerMetric: $("#learnerMetric"), score: $("#score"), tasks: $("#tasks"), progressText: $("#progressText"), progressFill: $("#progressFill"),
    output: $("#terminalOutput"), form: $("#terminalForm"), input: $("#terminalInput"), editor: $("#editor"), editorPath: $("#editorPath"), editorText: $("#editorText"),
    editorBadge: $("#editorBadge"), editorMode: $("#editorMode"), editorPosition: $("#editorPosition"), editorCommand: $("#editorCommand"), guide: $("#guideModal"), toast: $("#toast"),
    resultLearner: $("#resultLearner"), resultMessage: $("#resultMessage"), certificate: $("#certificateCanvas"), download: $("#downloadCertificate")
  };

  let learner = "";
  let completed = new Set();
  let score = 0;
  let editorState = { open: false, path: "", original: "", mode: "normal" };
  let state = makeState();

  function makeState() {
    const base = {
      files: Object.assign({}, C.initialFiles || {}), dirs: new Set(C.initialDirs || ["/", "/etc", "/var", "/var/log"]), inspected: new Set(), history: [],
      storage: { diskLabel: "", partition: null, pv: new Set(), vg: {}, lvs: {}, filesystems: {}, swapSignatures: new Set(), mounts: {}, activeSwap: new Set() },
      system: { defaultTarget: "graphical.target", currentTarget: "graphical.target", visitedTargets: new Set(), enabled: new Set(), active: new Set(), restartCounts: {}, daemonSnapshot: "", grubSnapshot: "" },
      network: { connection: { name: "ens160", method: "auto", address: "", gateway: "", dns: "", active: true }, hostname: "server1", firewallPermanentServices: new Set(), firewallPermanentPorts: new Set(), firewallRuntimeServices: new Set(), firewallRuntimePorts: new Set() },
      security: { selinuxMode: "Enforcing", ports: {}, fcontexts: {}, restored: new Set(), booleans: { httpd_can_network_connect: false }, groups: { wheel: new Set(["root"]) }, users: { root: { groups: new Set(["wheel"]), maxDays: 99999 } }, sudoValidated: new Set() }
    };
    return base;
  }

  function renderTasks() {
    E.tasks.innerHTML = C.objectives.map((item, index) => `<li class="task" data-objective="${htmlEscape(item.id)}"><span class="task-state">${index + 1}</span><span><strong>${htmlEscape(item.title)}</strong><p>${htmlEscape(item.detail)}</p></span><em>${item.points} pts</em></li>`).join("");
  }

  function line(text = "", kind = "") {
    const item = document.createElement("div");
    item.className = `term-line ${kind}`.trim();
    item.textContent = text;
    E.output.appendChild(item);
    E.output.scrollTop = E.output.scrollHeight;
  }

  function toast(text) {
    E.toast.textContent = text;
    E.toast.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => E.toast.classList.remove("show"), 2800);
  }

  function switchScreen(target) {
    [E.welcome, E.lab, E.result].forEach((screen) => screen.classList.remove("active"));
    target.classList.add("active");
    window.scrollTo(0, 0);
  }

  function startLab() {
    learner = cleanName(E.learnerName.value);
    if (learner.length < 2) { E.nameError.textContent = "Please enter at least two characters."; E.learnerName.focus(); return; }
    E.nameError.textContent = "";
    resetState();
    E.learnerMetric.textContent = learner.split(" ")[0].slice(0, 14);
    switchScreen(E.lab);
    line(`RCW IT Training · ${C.title}`, "info");
    line(`Session opened for ${learner}.`, "success");
    line(C.terminalWelcome, "muted");
    line("Your score increases only when the required system state is correct.", "warning");
    E.input.focus();
  }

  function resetState() {
    state = makeState(); completed = new Set(); score = 0; editorState = { open: false, path: "", original: "", mode: "normal" };
    E.output.innerHTML = ""; E.editor.hidden = true; E.input.disabled = false; renderTasks(); updateProgress();
  }

  function objectivePassed(id) {
    const f = state.files;
    if (C.scenario === "storage") {
      const st = state.storage;
      const reportPath = st.lvs["vg_exam/lv_reports"] ? "/dev/vg_exam/lv_reports" : "";
      const swapPath = st.lvs["vg_exam/lv_swap"] ? "/dev/vg_exam/lv_swap" : "";
      const fstab = f["/etc/fstab"] || "";
      const reportPersistent = reportPath && hasLine(fstab, /^UUID=RCW-REPORTS\s+\/reports\s+xfs\s+\S+\s+0\s+0$/i);
      const swapPersistent = swapPath && hasLine(fstab, /^(?:\/dev\/vg_exam\/lv_swap|UUID=RCW-SWAP)\s+(?:none\s+)?swap\s+swap\s+\S+\s+0\s+0$/i);
      return {
        inventory: state.inspected.has("block") && state.inspected.has("fs"),
        partition: st.diskLabel === "gpt" && st.partition && st.partition.device === "/dev/sdc1" && st.partition.sizeGiB >= 7.5,
        lvm: st.pv.has("/dev/sdc1") && st.vg.vg_exam === "/dev/sdc1",
        filesystem: !!st.lvs["vg_exam/lv_reports"] && st.filesystems[reportPath] === "xfs",
        mount: reportPersistent && state.dirs.has("/reports") && st.mounts["/reports"] === reportPath,
        swap: !!st.lvs["vg_exam/lv_swap"] && st.swapSignatures.has(swapPath) && swapPersistent && st.activeSwap.has(swapPath)
      }[id] || false;
    }
    if (C.scenario === "system") {
      const sy = state.system;
      const chrony = f["/etc/chrony.conf"] || "";
      const service = f["/etc/systemd/system/rhcsa-report.service"] || "";
      const timer = f["/etc/systemd/system/rhcsa-report.timer"] || "";
      const unitCombined = `${service}\n---\n${timer}`;
      const timerGood = hasLine(service, /^\[Unit\]$/i) && hasLine(service, /^\[Service\]$/i) && hasLine(service, /^Type=oneshot$/i) && hasLine(service, /^ExecStart=\/usr\/local\/sbin\/rhcsa-report$/) && hasLine(timer, /^\[Timer\]$/i) && hasLine(timer, /^OnCalendar=daily$/i) && hasLine(timer, /^Persistent=true$/i) && hasLine(timer, /^Unit=rhcsa-report\.service$/i) && sy.daemonSnapshot === unitCombined && sy.enabled.has("rhcsa-report.timer") && sy.active.has("rhcsa-report.timer");
      return {
        inspect: state.inspected.has("target") && state.inspected.has("boot-errors") && sy.visitedTargets.has("rescue.target") && sy.currentTarget === "multi-user.target",
        target: sy.defaultTarget === "multi-user.target",
        time: (hasLine(chrony, /^(?:server|pool)\s+time\.example\.net\s+iburst$/i)) && sy.enabled.has("chronyd.service") && sy.active.has("chronyd.service") && (sy.restartCounts["chronyd.service"] || 0) > 0 && state.inspected.has("chrony"),
        journal: state.dirs.has("/var/log/journal") && (sy.restartCounts["systemd-journald.service"] || 0) > 0 && state.inspected.has("journal-disk"),
        timer: timerGood,
        grub: hasLine(f["/etc/default/grub"] || "", /^GRUB_TIMEOUT=5$/) && sy.grubSnapshot === (f["/etc/default/grub"] || "")
      }[id] || false;
    }
    if (C.scenario === "network-security") {
      const n = state.network, sec = state.security, sudoFile = state.files["/etc/sudoers.d/operator"] || "";
      const staticGood = n.connection.method === "manual" && n.connection.address === "192.0.2.50/24" && n.connection.gateway === "192.0.2.1" && n.connection.dns === "192.0.2.53" && n.connection.active && n.hostname === "server1.example.com";
      const contextEntry = Object.entries(sec.fcontexts).find(([pattern, type]) => pattern === "/srv/examweb(/.*)?" && type === "httpd_sys_content_t");
      const user = sec.users.operator;
      const sudoGood = hasLine(sudoFile, /^operator\s+ALL=\(ALL\)\s+ALL$/) && sec.sudoValidated.has("/etc/sudoers.d/operator");
      return {
        inspect: state.inspected.has("network") && state.inspected.has("selinux"),
        network: staticGood,
        firewall: n.firewallRuntimeServices.has("http") && n.firewallRuntimePorts.has("8081/tcp") && n.firewallPermanentServices.has("http") && n.firewallPermanentPorts.has("8081/tcp"),
        selinuxPort: sec.selinuxMode === "Enforcing" && sec.ports["8081/tcp"] === "http_port_t",
        contexts: state.dirs.has("/srv/examweb") && !!contextEntry && sec.restored.has("/srv/examweb"),
        boolean: sec.booleans.httpd_can_network_connect === true,
        privilege: !!sec.groups.ops && !!user && user.groups.has("ops") && user.maxDays === 90 && sudoGood
      }[id] || false;
    }
    return false;
  }

  function evaluate() {
    const next = new Set();
    let changed = false;
    C.objectives.forEach((objective, index) => {
      const passed = objectivePassed(objective.id), wasPassed = completed.has(objective.id);
      const task = $(`[data-objective="${objective.id}"]`);
      if (passed) next.add(objective.id);
      if (passed && !wasPassed) { changed = true; line(`Objective complete: ${objective.title} (+${objective.points})`, "success"); }
      if (!passed && wasPassed) { changed = true; line(`Objective needs attention: ${objective.title} (-${objective.points})`, "warning"); }
      if (task) { task.classList.toggle("done", passed); $(".task-state", task).textContent = passed ? "✓" : String(index + 1); }
    });
    completed = next;
    score = C.objectives.reduce((total, objective) => total + (completed.has(objective.id) ? objective.points : 0), 0);
    updateProgress();
    if (changed && score < 100) toast(`${score}/100 · Current system state validated`);
    if (score === 100 && completed.size === C.objectives.length) setTimeout(() => { if (score === 100 && completed.size === C.objectives.length) finishLab(); }, 550);
  }

  function updateProgress() {
    E.score.textContent = score;
    E.progressText.textContent = `${completed.size} / ${C.objectives.length}`;
    E.progressFill.style.width = `${(completed.size / C.objectives.length) * 100}%`;
  }

  function finishLab() {
    if (E.result.classList.contains("active")) return;
    E.resultLearner.textContent = learner;
    E.resultMessage.textContent = `${learner}, your persistent system configuration passed all ${C.objectives.length} state checks in ${C.title}.`;
    drawCertificate(E.certificate.getContext("2d"));
    loadPortrait().then((portrait) => { if (portrait) drawCertificate(E.certificate.getContext("2d"), portrait); });
    switchScreen(E.result);
    recordProgress();
  }

  function recordProgress() {
    try {
      if (window.RCWPassport && typeof window.RCWPassport.record === "function") window.RCWPassport.record({ type: "lab", name: C.title, score: 100, total: 100, xp: 100, activity: `Completed ${C.title}`, skill: "RHCSA RHEL 10" });
    } catch (_) { /* Progress recording must never interrupt the certificate. */ }
  }

  function openEditor(path) {
    path = normalizePath(path);
    const allowed = Object.prototype.hasOwnProperty.call(state.files, path) || /^\/etc\/systemd\/system\/[A-Za-z0-9_.@-]+\.(?:service|timer)$/.test(path) || /^\/etc\/sudoers\.d\/[A-Za-z0-9_.-]+$/.test(path);
    if (!allowed) { line(`vi: ${path}: editing is not available in this scenario`, "error"); return; }
    if (!Object.prototype.hasOwnProperty.call(state.files, path)) state.files[path] = "";
    editorState = { open: true, path, original: state.files[path], mode: "normal" };
    E.editorPath.textContent = path; E.editorText.value = state.files[path]; E.editor.hidden = false; E.input.disabled = true; setEditorMode("normal"); E.editorText.focus();
  }

  function setEditorMode(mode) {
    editorState.mode = mode;
    const insert = mode === "insert", command = mode === "command";
    E.editorText.readOnly = !insert; E.editorCommand.disabled = !command;
    E.editorBadge.textContent = insert ? "INSERT" : command ? "COMMAND" : "NORMAL";
    E.editorMode.textContent = insert ? "-- INSERT --" : command ? ":" : "-- NORMAL --";
    E.editorBadge.classList.toggle("modified", E.editorText.value !== editorState.original);
    if (insert) E.editorText.focus(); else if (command) { E.editorCommand.value = ""; E.editorCommand.focus(); } else E.editorText.focus();
  }

  function closeEditor(save) {
    if (save) state.files[editorState.path] = E.editorText.value.replace(/\r\n/g, "\n");
    const path = editorState.path;
    editorState.open = false; E.editor.hidden = true; E.input.disabled = false; E.input.focus();
    line(save ? `"${path}" written` : `Editing cancelled: ${path}`, save ? "success" : "warning");
    if (save) evaluate();
  }

  function editorAction(action) {
    if (action === "insert") setEditorMode("insert");
    else if (action === "normal") setEditorMode("normal");
    else if (action === "write") { state.files[editorState.path] = E.editorText.value.replace(/\r\n/g, "\n"); editorState.original = E.editorText.value; line(`"${editorState.path}" written`, "success"); setEditorMode("normal"); evaluate(); }
    else if (action === "savequit") closeEditor(true);
    else if (action === "quit") closeEditor(false);
  }

  function runCommand(raw) {
    const entered = String(raw || "").trim();
    if (!entered) return;
    if (entered.length > 500) { line("Command is too long.", "error"); return; }
    line(`[root@server1 ~]# ${entered}`, "command");
    state.history.push(entered);
    const cmd = stripSudo(entered);
    if (/[;&|`]|\$\(/.test(cmd)) { line("Use one direct command at a time in this practice system.", "error"); return; }
    const words = shellWords(cmd);
    const bin = words[0] || "";
    let handled = false;

    if (bin === "help") { showHelp(); handled = true; }
    else if (bin === "clear") { E.output.innerHTML = ""; handled = true; }
    else if (["vi", "vim"].includes(bin) && words[1]) { openEditor(words[1]); return; }
    else if (bin === "cat" && words[1]) { catFile(words[1]); handled = true; }
    else if (bin === "mkdir") { handled = commandMkdir(words); }
    else if (C.scenario === "storage") handled = storageCommand(cmd, words);
    else if (C.scenario === "system") handled = systemCommand(cmd, words);
    else if (C.scenario === "network-security") handled = networkSecurityCommand(cmd, words);

    if (!handled) line(`${bin || "command"}: command or option is not available in this scenario. Type help.`, "error");
    evaluate();
  }

  function showHelp() {
    line("Supported command families for this scenario:", "info");
    const common = ["cat, mkdir, vi/vim, clear, help"];
    const scenario = {
      storage: ["lsblk, blkid, parted, pvcreate, vgcreate, lvcreate, pvs, vgs, lvs", "mkfs.xfs, mkswap, mount, findmnt, swapon, df"],
      system: ["systemctl, journalctl, timedatectl, chronyc", "grub2-mkconfig, cat, mkdir, vi/vim"],
      "network-security": ["nmcli, hostnamectl, firewall-cmd", "getenforce, setenforce, semanage, restorecon, setsebool, getsebool", "groupadd, useradd, usermod, chage, visudo"]
    }[C.scenario] || [];
    [...common, ...scenario].forEach((item) => line(`  ${item}`, "muted"));
    line("The complete learner guide contains task-specific examples and verification steps.", "warning");
  }

  function catFile(path) {
    path = normalizePath(path);
    if (!Object.prototype.hasOwnProperty.call(state.files, path)) line(`cat: ${path}: No such file`, "error");
    else String(state.files[path]).split("\n").forEach((value) => line(value));
  }

  function commandMkdir(words) {
    const paths = words.slice(1).filter((word) => !word.startsWith("-"));
    if (!paths.length) { line("mkdir: missing operand", "error"); return true; }
    paths.forEach((path) => { state.dirs.add(normalizePath(path)); line(`created directory '${normalizePath(path)}'`, "success"); });
    return true;
  }

  function storageCommand(cmd, words) {
    const st = state.storage;
    if (words[0] === "lsblk") { state.inspected.add("block"); if (words.includes("-f") || words.includes("--fs")) state.inspected.add("fs"); line("NAME              SIZE TYPE FSTYPE      MOUNTPOINTS"); line("sda                40G disk"); line("├─sda1              1G part xfs         /boot"); line("└─sda2             39G part LVM2_member"); line("  ├─rhel-root      35G lvm  xfs         /"); line("  └─rhel-swap       4G lvm  swap        [SWAP]"); line(`sdc                12G disk`); if (st.partition) line(`└─sdc1               8G part ${st.pv.has("/dev/sdc1") ? "LVM2_member" : ""}`); return true; }
    if (words[0] === "blkid") { state.inspected.add("fs"); Object.entries(st.filesystems).forEach(([dev, fs]) => line(`${dev}: UUID="${dev.includes("lv_reports") ? "RCW-REPORTS" : "RCW-SWAP"}" TYPE="${fs}"`)); if (!Object.keys(st.filesystems).length) line("/dev/sda1: UUID=\"boot-10\" TYPE=\"xfs\""); return true; }
    if (words[0] === "parted") {
      if (!words.includes("/dev/sdc")) { line("parted: use the 12 GiB data disk /dev/sdc", "error"); return true; }
      if (/mklabel\s+gpt/i.test(cmd)) { st.diskLabel = "gpt"; line("Information: GPT disk label created on /dev/sdc.", "success"); }
      if (/mkpart/i.test(cmd)) { if (st.diskLabel !== "gpt") line("Error: create a GPT label before the partition.", "error"); else { st.partition = { device: "/dev/sdc1", sizeGiB: 8 }; line("Information: /dev/sdc1 created (8 GiB).", "success"); } }
      if (/\bprint\b/.test(cmd)) { line(`Partition Table: ${st.diskLabel || "unknown"}`); if (st.partition) line("Number  Start    End      Size     File system  Name  Flags\n 1      1.00MiB  8193MiB  8192MiB"); }
      if (!/(mklabel|mkpart|print)/i.test(cmd)) line("parted: supported actions are mklabel gpt, mkpart, and print", "error");
      return true;
    }
    if (words[0] === "pvcreate") { const dev = words.find((w) => w === "/dev/sdc1"); if (!dev || !st.partition) line("pvcreate: /dev/sdc1 does not exist", "error"); else { st.pv.add(dev); line(`Physical volume "${dev}" successfully created.`, "success"); } return true; }
    if (words[0] === "vgcreate") { const name = words[1], dev = words[2]; if (!name || !dev) line("vgcreate: volume group name and physical volume are required", "error"); else if (!st.pv.has(dev)) line(`vgcreate: ${dev} is not an initialized physical volume`, "error"); else { st.vg[name] = dev; line(`Volume group "${name}" successfully created`, "success"); } return true; }
    if (words[0] === "lvcreate") {
      const nIndex = words.findIndex((w) => w === "-n" || w === "--name"), lIndex = words.findIndex((w) => w === "-L" || w === "--size");
      const name = nIndex >= 0 ? words[nIndex + 1] : "", size = lIndex >= 0 ? words[lIndex + 1] : "", vg = words[words.length - 1];
      if (!st.vg[vg]) line(`lvcreate: volume group "${vg}" not found`, "error"); else if (!name || !size) line("lvcreate: use -n NAME and -L SIZE", "error"); else { const numeric = parseFloat(size); if (!numeric || numeric <= 0) line("lvcreate: invalid size", "error"); else { st.lvs[`${vg}/${name}`] = { sizeGiB: /m$/i.test(size) ? numeric / 1024 : numeric }; line(`Logical volume "${name}" created.`, "success"); } } return true;
    }
    if (["pvs", "vgs", "lvs"].includes(words[0])) { if (words[0] === "pvs") { line("PV          VG       Fmt  Attr PSize PFree"); st.pv.forEach((pv) => line(`${pv}  ${Object.keys(st.vg)[0] || ""} lvm2 a--  8.00g`)); } if (words[0] === "vgs") { line("VG       #PV #LV VSize VFree"); Object.keys(st.vg).forEach((vg) => line(`${vg}    1   ${Object.keys(st.lvs).filter((key) => key.startsWith(`${vg}/`)).length}  <8.00g`)); } if (words[0] === "lvs") { line("LV         VG       Attr       LSize"); Object.entries(st.lvs).forEach(([key, lv]) => { const [vg, name] = key.split("/"); line(`${name}  ${vg}  -wi-a-----  ${lv.sizeGiB.toFixed(2)}g`); }); } return true; }
    if (words[0] === "mkfs.xfs") { const dev = words.find((w) => w.startsWith("/dev/")); if (!dev || !st.lvs[dev.replace("/dev/", "")]) line(`mkfs.xfs: ${dev || "device"}: No such logical volume`, "error"); else { st.filesystems[dev] = "xfs"; line(`meta-data=${dev} isize=512 agcount=4`, "success"); line("reflink=1 bigtime=1 inobtcount=1"); } return true; }
    if (words[0] === "mkswap") { const dev = words.find((w) => w.startsWith("/dev/")); if (!dev || !st.lvs[dev.replace("/dev/", "")]) line(`mkswap: cannot open ${dev || "device"}`, "error"); else { st.filesystems[dev] = "swap"; st.swapSignatures.add(dev); line(`Setting up swapspace version 1, UUID=RCW-SWAP`, "success"); } return true; }
    if (words[0] === "mount") {
      if (words.includes("-a")) { applyFstab(); return true; }
      if (words.length === 1) { Object.entries(st.mounts).forEach(([path, dev]) => line(`${dev} on ${path} type ${st.filesystems[dev] || "unknown"} (rw,relatime)`)); return true; }
      const dev = words[1], path = normalizePath(words[2]);
      if (!st.filesystems[dev]) line(`mount: ${dev}: unknown filesystem`, "error"); else if (!state.dirs.has(path)) line(`mount: ${path}: mount point does not exist`, "error"); else { st.mounts[path] = dev; line(`${dev} mounted on ${path}`, "success"); } return true;
    }
    if (words[0] === "findmnt") { const path = words.find((w) => w.startsWith("/")); if (path && st.mounts[path]) { line("TARGET   SOURCE                     FSTYPE OPTIONS"); line(`${path} ${st.mounts[path]} xfs    rw,relatime`); } else line("findmnt: no matching mount point", "error"); return true; }
    if (words[0] === "swapon") { if (words.includes("-a")) { applySwapFstab(); return true; } if (words.includes("--show") || words.length === 1) { line("NAME                     TYPE SIZE USED PRIO"); st.activeSwap.forEach((dev) => line(`${dev} partition 1G 0B -2`)); return true; } const dev = words.find((w) => w.startsWith("/dev/")); if (dev && st.swapSignatures.has(dev)) { st.activeSwap.add(dev); line(`${dev} enabled`, "success"); } else line("swapon: invalid swap device", "error"); return true; }
    if (words[0] === "df") { line("Filesystem                      Size Used Avail Use% Mounted on"); line("/dev/mapper/rhel-root             35G 6.2G   29G  18% /"); Object.entries(st.mounts).forEach(([path, dev]) => line(`${dev.padEnd(34)} 4.0G  70M  3.9G   2% ${path}`)); return true; }
    return false;
  }

  function applyFstab() {
    const fstab = state.files["/etc/fstab"] || "";
    if (hasLine(fstab, /^UUID=RCW-REPORTS\s+\/reports\s+xfs\s+\S+\s+0\s+0$/i) && state.dirs.has("/reports") && state.storage.filesystems["/dev/vg_exam/lv_reports"] === "xfs") { state.storage.mounts["/reports"] = "/dev/vg_exam/lv_reports"; line("/reports mounted from /etc/fstab", "success"); }
    else line("mount: /etc/fstab contains no valid /reports UUID entry", "error");
  }

  function applySwapFstab() {
    const fstab = state.files["/etc/fstab"] || "";
    if (hasLine(fstab, /^(?:\/dev\/vg_exam\/lv_swap|UUID=RCW-SWAP)\s+(?:none\s+)?swap\s+swap\s+\S+\s+0\s+0$/i) && state.storage.swapSignatures.has("/dev/vg_exam/lv_swap")) { state.storage.activeSwap.add("/dev/vg_exam/lv_swap"); line("Swap entries enabled from /etc/fstab", "success"); }
    else line("swapon: /etc/fstab contains no valid swap entry", "error");
  }

  function unitName(value) { return value && value.includes(".") ? value : `${value}.service`; }

  function systemCommand(cmd, words) {
    const sy = state.system;
    if (words[0] === "systemctl") {
      const action = words[1];
      if (action === "get-default") { state.inspected.add("target"); line(sy.defaultTarget); return true; }
      if (action === "set-default") { const target = words[2]; if (!["multi-user.target", "graphical.target"].includes(target)) line("systemctl: target not available", "error"); else { sy.defaultTarget = target; line(`Created symlink /etc/systemd/system/default.target → /usr/lib/systemd/system/${target}.`, "success"); } return true; }
      if (action === "isolate") { const target = words[2]; if (!["rescue.target", "multi-user.target", "graphical.target"].includes(target)) line("systemctl: target not available", "error"); else { sy.currentTarget = target; sy.visitedTargets.add(target); line(`Isolated ${target}.`, target === "rescue.target" ? "warning" : "success"); } return true; }
      if (action === "daemon-reload") { sy.daemonSnapshot = `${state.files["/etc/systemd/system/rhcsa-report.service"] || ""}\n---\n${state.files["/etc/systemd/system/rhcsa-report.timer"] || ""}`; line("System manager configuration reloaded.", "success"); return true; }
      if (["enable", "start", "restart"].includes(action)) {
        const now = words.includes("--now"), rawUnit = words.filter((w, i) => i > 1 && !w.startsWith("-"))[0], unit = unitName(rawUnit);
        if (!rawUnit) { line("systemctl: unit name required", "error"); return true; }
        if (action === "enable" || now) sy.enabled.add(unit);
        if (action === "start" || action === "restart" || now) sy.active.add(unit);
        if (action === "restart") sy.restartCounts[unit] = (sy.restartCounts[unit] || 0) + 1;
        line(`${unit} ${action === "enable" ? "enabled" : action === "restart" ? "restarted" : "started"}.`, "success"); return true;
      }
      if (action === "status") { const unit = unitName(words[2]); line(`● ${unit} - Practice unit`); line(`   Loaded: loaded (${sy.enabled.has(unit) ? "enabled" : "disabled"})`); line(`   Active: ${sy.active.has(unit) ? "active (running)" : "inactive (dead)"}`, sy.active.has(unit) ? "success" : "warning"); return true; }
      if (action === "is-enabled") { const unit = unitName(words[2]); line(sy.enabled.has(unit) ? "enabled" : "disabled", sy.enabled.has(unit) ? "success" : "warning"); return true; }
      if (action === "list-timers") { line("NEXT                        LEFT LAST PASSED UNIT                 ACTIVATES"); if (sy.active.has("rhcsa-report.timer")) line("Thu 2026-08-20 00:00:00 IST  7h -    -      rhcsa-report.timer   rhcsa-report.service", "success"); else line("0 timers listed.", "warning"); return true; }
      line("systemctl: supported actions include get-default, set-default, isolate, enable --now, restart, daemon-reload, status, is-enabled, and list-timers", "error"); return true;
    }
    if (words[0] === "journalctl") { if (words.includes("--disk-usage")) { state.inspected.add("journal-disk"); line(`Archived and active journals take up ${state.dirs.has("/var/log/journal") ? "16.0M" : "8.0M"} in the file system.`); } else { state.inspected.add("boot-errors"); line("Aug 19 09:04:11 server1 kernel: Previous boot diagnostic: clean recovery", "warning"); line("Aug 19 09:04:14 server1 systemd[1]: Reached target Graphical Interface."); } return true; }
    if (words[0] === "timedatectl") { line("               Local time: Wed 2026-08-19 16:22:30 IST"); line("           Universal time: Wed 2026-08-19 10:52:30 UTC"); line("                 RTC time: Wed 2026-08-19 10:52:30"); line(`System clock synchronized: ${sy.active.has("chronyd.service") ? "yes" : "no"}`); line("              NTP service: active"); return true; }
    if (words[0] === "chronyc") { state.inspected.add("chrony"); const configured = hasLine(state.files["/etc/chrony.conf"] || "", /^(?:server|pool)\s+time\.example\.net\s+iburst$/i); line("MS Name/IP address         Stratum Poll Reach LastRx Last sample"); line(configured && sy.active.has("chronyd.service") ? "^* time.example.net              2   6   377    20    -13us[ -18us] +/- 12ms" : "^? time.example.net              0   6     0     -     +0ns[  +0ns] +/- 0ns", configured ? "success" : "warning"); return true; }
    if (words[0] === "grub2-mkconfig") { if (!words.includes("-o") || !words.includes("/boot/grub2/grub.cfg")) line("grub2-mkconfig: write the BIOS configuration to /boot/grub2/grub.cfg", "error"); else { sy.grubSnapshot = state.files["/etc/default/grub"] || ""; line("Generating grub configuration file ...", "info"); line("done", "success"); } return true; }
    return false;
  }

  function networkSecurityCommand(cmd, words) {
    const n = state.network, sec = state.security;
    if (words[0] === "nmcli") {
      if (words[1] === "device" || words[1] === "dev") { state.inspected.add("network"); line("DEVICE  TYPE      STATE      CONNECTION"); line(`ens160  ethernet  connected  ${n.connection.name}`); line("lo      loopback  connected  lo"); return true; }
      if (words[1] === "connection" || words[1] === "con") {
        const action = words[2];
        if (["show", "s"].includes(action)) { state.inspected.add("network"); line("NAME    UUID                                  TYPE      DEVICE"); line(`${n.connection.name.padEnd(7)} 1d99c100-10ab-4cb8-a100-rcw10exam ethernet  ens160`); return true; }
        if (["modify", "mod"].includes(action)) {
          const rest = words.slice(4);
          for (let i = 0; i < rest.length; i += 2) { const key = rest[i], value = rest[i + 1]; if (key === "ipv4.method") n.connection.method = value; else if (key === "ipv4.addresses") n.connection.address = value; else if (key === "ipv4.gateway") n.connection.gateway = value; else if (key === "ipv4.dns") n.connection.dns = value; }
          line(`Connection '${n.connection.name}' successfully updated.`, "success"); return true;
        }
        if (["up", "activate"].includes(action)) { n.connection.active = true; line("Connection successfully activated.", "success"); return true; }
      }
      line("nmcli: use device status, connection show, connection modify, or connection up", "error"); return true;
    }
    if (words[0] === "hostnamectl") { if (words[1] === "set-hostname" && words[2]) { n.hostname = words[2]; $("#hostLabel").textContent = `root@${n.hostname.split(".")[0]} · bash`; line(`Static hostname set to ${n.hostname}`, "success"); } else { line(`Static hostname: ${n.hostname}`); line("Operating System: Red Hat Enterprise Linux 10"); } return true; }
    if (words[0] === "firewall-cmd") {
      const permanent = words.includes("--permanent");
      const serviceArg = words.find((w) => w.startsWith("--add-service=")); const portArg = words.find((w) => w.startsWith("--add-port="));
      if (words.includes("--state")) line("running", "success");
      else if (serviceArg) { const value = serviceArg.split("=")[1]; (permanent ? n.firewallPermanentServices : n.firewallRuntimeServices).add(value); line("success", "success"); }
      else if (portArg) { const value = portArg.split("=")[1]; (permanent ? n.firewallPermanentPorts : n.firewallRuntimePorts).add(value); line("success", "success"); }
      else if (words.includes("--reload")) { n.firewallRuntimeServices = new Set(n.firewallPermanentServices); n.firewallRuntimePorts = new Set(n.firewallPermanentPorts); line("success", "success"); }
      else if (words.includes("--list-all")) { line("public (active)"); line(`  services: ${Array.from(n.firewallRuntimeServices).join(" ")}`); line(`  ports: ${Array.from(n.firewallRuntimePorts).join(" ")}`); }
      else line("firewall-cmd: supported options are --state, --permanent --add-service, --add-port, --reload and --list-all", "error"); return true;
    }
    if (words[0] === "getenforce") { state.inspected.add("selinux"); line(sec.selinuxMode); return true; }
    if (words[0] === "setenforce") { sec.selinuxMode = words[1] === "0" || /^permissive$/i.test(words[1] || "") ? "Permissive" : "Enforcing"; line(sec.selinuxMode, sec.selinuxMode === "Enforcing" ? "success" : "warning"); return true; }
    if (words[0] === "semanage" && words[1] === "port") { if (words.includes("-l")) { state.inspected.add("selinux"); line("SELinux Port Type              Proto    Port Number"); line("http_port_t                   tcp      80, 443, 488, 8008, 8009, 8443"); Object.entries(sec.ports).forEach(([port, type]) => line(`${type.padEnd(30)} ${port.split("/")[1]}      ${port.split("/")[0]}`)); } else { const t = words.indexOf("-t"), p = words.indexOf("-p"), port = words[words.length - 1]; if (t < 0 || p < 0 || !/^\d+$/.test(port)) line("semanage port: use -a -t TYPE -p PROTO PORT", "error"); else { sec.ports[`${port}/${words[p + 1]}`] = words[t + 1]; line("SELinux port mapping added.", "success"); } } return true; }
    if (words[0] === "semanage" && words[1] === "fcontext") { if (words.includes("-l")) { Object.entries(sec.fcontexts).forEach(([pattern, type]) => line(`${pattern.padEnd(35)} all files          system_u:object_r:${type}:s0`)); } else { const t = words.indexOf("-t"), pattern = words[words.length - 1]; if (t < 0 || !pattern.startsWith("/")) line("semanage fcontext: use -a -t TYPE FILE_SPEC", "error"); else { sec.fcontexts[pattern] = words[t + 1]; line("SELinux file-context rule added.", "success"); } } return true; }
    if (words[0] === "restorecon") { const path = normalizePath(words[words.length - 1]); const match = Object.keys(sec.fcontexts).find((pattern) => path === pattern.replace(/\(\/\.\*\)\?$/, "")); if (match) { sec.restored.add(path); line(`Relabeled ${path} recursively as ${sec.fcontexts[match]}`, "success"); } else line(`restorecon: no custom file-context rule matches ${path}`, "warning"); return true; }
    if (words[0] === "setsebool") { const persistent = words.includes("-P"), name = words.find((w) => Object.prototype.hasOwnProperty.call(sec.booleans, w)); const value = words[words.length - 1]; if (!name) line("setsebool: supported boolean not found", "error"); else { sec.booleans[name] = ["on", "1", "true"].includes(String(value).toLowerCase()); line(`${name} --> ${sec.booleans[name] ? "on" : "off"}${persistent ? " (persistent)" : ""}`, "success"); } return true; }
    if (words[0] === "getsebool") { const name = words[1]; if (Object.prototype.hasOwnProperty.call(sec.booleans, name)) line(`${name} --> ${sec.booleans[name] ? "on" : "off"}`); else line("getsebool: boolean not found", "error"); return true; }
    if (words[0] === "groupadd") { const group = words[words.length - 1]; if (!group || group.startsWith("-")) line("groupadd: group name required", "error"); else if (sec.groups[group]) line(`groupadd: group '${group}' already exists`, "error"); else { sec.groups[group] = new Set(); line(`Group ${group} created.`, "success"); } return true; }
    if (words[0] === "useradd") { const user = words[words.length - 1]; if (!user || user.startsWith("-")) line("useradd: user name required", "error"); else { sec.users[user] = { groups: new Set(), maxDays: 99999 }; line(`User ${user} created.`, "success"); } return true; }
    if (words[0] === "usermod") { const g = words.findIndex((w) => w === "-aG" || w === "-G"), user = words[words.length - 1]; if (g < 0 || !sec.users[user] || !sec.groups[words[g + 1]]) line("usermod: use -aG GROUP USER with existing names", "error"); else { words[g + 1].split(",").forEach((group) => { if (sec.groups[group]) { sec.users[user].groups.add(group); sec.groups[group].add(user); } }); line(`User ${user} groups updated.`, "success"); } return true; }
    if (words[0] === "chage") { const m = words.findIndex((w) => w === "-M" || w === "--maxdays"), user = words[words.length - 1]; if (words.includes("-l") && sec.users[user]) { line(`Last password change                                    : ${dateText()}`); line(`Maximum number of days between password change          : ${sec.users[user].maxDays}`); } else if (m >= 0 && sec.users[user]) { sec.users[user].maxDays = Number(words[m + 1]); line(`Password aging updated for ${user}.`, "success"); } else line("chage: use -M DAYS USER or -l USER", "error"); return true; }
    if (words[0] === "id") { const user = words[1], data = sec.users[user]; if (!data) line(`id: '${user}': no such user`, "error"); else line(`uid=1001(${user}) gid=1001(${user}) groups=${Array.from(data.groups).join(",")}`); return true; }
    if (words[0] === "visudo") { const c = words.findIndex((w) => w === "-c" || w === "-cf" || w === "--check"); const path = c >= 0 && words[c] === "-cf" ? words[c + 1] : words[words.length - 1]; const content = state.files[path] || ""; if (hasLine(content, /^operator\s+ALL=\(ALL\)\s+ALL$/)) { sec.sudoValidated.add(path); line(`${path}: parsed OK`, "success"); } else line(`${path}: syntax error`, "error"); return true; }
    return false;
  }

  function certificateCode() {
    const seed = `${C.slug}-${learner}-${new Date().toISOString().slice(0, 10)}`;
    let hash = 2166136261;
    for (let i = 0; i < seed.length; i += 1) { hash ^= seed.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return `RCW-LCC-${(hash >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
  }

  function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(/\s+/), lines = []; let current = "";
    words.forEach((word) => { const test = current ? `${current} ${word}` : word; if (ctx.measureText(test).width > maxWidth && current) { lines.push(current); current = word; } else current = test; });
    if (current) lines.push(current);
    lines.forEach((item, index) => ctx.fillText(item, x, y + index * lineHeight));
  }

  function drawCertificate(ctx, portrait) {
    const canvas = ctx.canvas, gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#fffdf6"); gradient.addColorStop(1, "#eef6ff"); ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1400, 990);
    ctx.strokeStyle = "#09295a"; ctx.lineWidth = 12; ctx.strokeRect(24, 24, 1352, 942); ctx.strokeStyle = "#d6a720"; ctx.lineWidth = 3; ctx.strokeRect(46, 46, 1308, 898); ctx.strokeStyle = "#7da3cf"; ctx.lineWidth = 1; ctx.strokeRect(57, 57, 1286, 876);
    ctx.textAlign = "left"; ctx.fillStyle = "#0b2f63"; ctx.font = "900 58px Arial"; ctx.fillText("RCW", 100, 134); ctx.font = "800 25px Arial"; ctx.fillText("IT TRAINING", 230, 112); ctx.fillStyle = "#56708e"; ctx.font = "500 18px Arial"; ctx.fillText("Practice · Learn · Grow", 230, 139); ctx.fillStyle = "#d6a720"; ctx.fillRect(100, 162, 1200, 3);
    ctx.textAlign = "center"; ctx.fillStyle = "#517194"; ctx.font = "800 21px Arial"; ctx.fillText("CERTIFICATE OF ACHIEVEMENT", 700, 227); ctx.fillStyle = "#0b2f63"; ctx.font = "italic 700 57px Georgia"; ctx.fillText("Linux Challenge Champion", 700, 303); ctx.fillStyle = "#66768b"; ctx.font = "400 22px Arial"; ctx.fillText("This certificate is proudly presented to", 700, 359); ctx.fillStyle = "#172945"; ctx.font = `700 ${learner.length > 30 ? 44 : 54}px Georgia`; ctx.fillText(learner, 700, 429); ctx.strokeStyle = "#d6a720"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(390, 450); ctx.lineTo(1010, 450); ctx.stroke();
    ctx.fillStyle = "#66768b"; ctx.font = "400 21px Arial"; ctx.fillText("for successfully completing the", 700, 500); ctx.fillStyle = "#0b2f63"; ctx.font = `800 ${C.certificateLabTitle.length > 42 ? 26 : 31}px Arial`; ctx.fillText(C.certificateLabTitle, 700, 550); ctx.fillStyle = "#53657d"; ctx.font = "400 20px Arial"; wrapCanvasText(ctx, C.certificateStatement, 700, 601, 900, 30);
    ctx.fillStyle = "#edf4fb"; ctx.fillRect(330, 674, 740, 70); ctx.strokeStyle = "#c8daec"; ctx.strokeRect(330, 674, 740, 70); ctx.fillStyle = "#536b87"; ctx.font = "700 18px Arial"; ctx.fillText("FINAL SCORE", 500, 716); ctx.fillStyle = "#0a356b"; ctx.font = "900 30px Arial"; ctx.fillText("100 / 100", 700, 718); ctx.fillStyle = "#536b87"; ctx.font = "700 18px Arial"; ctx.fillText(`${C.objectives.length} OBJECTIVES`, 900, 716);
    ctx.textAlign = "left"; ctx.fillStyle = "#203956"; ctx.font = "700 21px Arial"; ctx.fillText(dateText(), 110, 842); ctx.fillStyle = "#718096"; ctx.font = "400 15px Arial"; ctx.fillText("Date of completion", 110, 868);
    if (portrait) { ctx.save(); ctx.beginPath(); ctx.arc(1035, 834, 59, 0, Math.PI * 2); ctx.clip(); const ratio = Math.max(118 / portrait.width, 118 / portrait.height), width = portrait.width * ratio, height = portrait.height * ratio; ctx.drawImage(portrait, 1035 - width / 2, 834 - height * 0.31, width, height); ctx.restore(); ctx.strokeStyle = "#d6a720"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(1035, 834, 61, 0, Math.PI * 2); ctx.stroke(); } else { ctx.fillStyle = "#0b2f63"; ctx.beginPath(); ctx.arc(1035, 834, 59, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = "800 25px Arial"; ctx.fillText("PR", 1035, 844); }
    ctx.textAlign = "left"; ctx.fillStyle = "#172945"; ctx.font = "italic 700 25px Georgia"; ctx.fillText("Pradeep Raju", 1115, 819); ctx.fillStyle = "#5d6f86"; ctx.font = "500 16px Arial"; ctx.fillText("Founder & Senior Architect", 1115, 846); ctx.fillText("RCW IT Training", 1115, 871); ctx.textAlign = "center"; ctx.fillStyle = "#7890aa"; ctx.font = "500 14px monospace"; ctx.fillText(`Certificate ID: ${certificateCode()}`, 700, 918);
  }

  function loadPortrait() {
    return new Promise((resolve) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => resolve(null); image.src = C.portrait; });
  }

  function binaryStringToBytes(value) { const bytes = new Uint8Array(value.length); for (let i = 0; i < value.length; i += 1) bytes[i] = value.charCodeAt(i) & 255; return bytes; }

  async function downloadPdf() {
    const original = E.download.textContent; E.download.disabled = true; E.download.textContent = "Preparing PDF…";
    try {
      const portrait = await loadPortrait(); drawCertificate(E.certificate.getContext("2d"), portrait);
      const jpeg = E.certificate.toDataURL("image/jpeg", 0.92), jpegBinary = atob(jpeg.split(",")[1]), content = "q\n842 0 0 595 0 0 cm\n/Im0 Do\nQ\n", objects = [];
      objects[1] = "<< /Type /Catalog /Pages 2 0 R >>"; objects[2] = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"; objects[3] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>"; objects[4] = `<< /Type /XObject /Subtype /Image /Width 1400 /Height 990 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBinary.length} >>\nstream\n${jpegBinary}\nendstream`; objects[5] = `<< /Length ${content.length} >>\nstream\n${content}endstream`;
      let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", offsets = [0]; for (let number = 1; number <= 5; number += 1) { offsets[number] = pdf.length; pdf += `${number} 0 obj\n${objects[number]}\nendobj\n`; } const xref = pdf.length; pdf += "xref\n0 6\n0000000000 65535 f \n"; for (let number = 1; number <= 5; number += 1) pdf += `${String(offsets[number]).padStart(10, "0")} 00000 n \n`; pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
      const blob = new Blob([binaryStringToBytes(pdf)], { type: "application/pdf" }), link = document.createElement("a"), href = URL.createObjectURL(blob); link.href = href; link.download = `RCW-${C.slug}-${safeSlug(learner)}.pdf`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(href), 1000); toast("PDF certificate prepared.");
    } catch (error) { console.error(error); window.alert("The PDF could not be created. Please use Print certificate instead."); }
    finally { E.download.disabled = false; E.download.textContent = original; }
  }

  function printCertificate() { const data = E.certificate.toDataURL("image/png"), popup = window.open("", "_blank", "noopener,noreferrer"); if (!popup) { window.alert("Allow pop-ups to print the certificate."); return; } popup.document.write(`<title>RCW IT Training Certificate</title><img alt="Certificate" src="${data}" style="width:100%;height:auto"><script>onload=()=>print()<\/script>`); popup.document.close(); }

  function openGuide() { if (typeof E.guide.showModal === "function") E.guide.showModal(); else E.guide.setAttribute("open", ""); }
  function closeGuide() { if (typeof E.guide.close === "function") E.guide.close(); else E.guide.removeAttribute("open"); }

  renderTasks();
  $("#startLab").addEventListener("click", startLab); E.learnerName.addEventListener("keydown", (event) => { if (event.key === "Enter") startLab(); });
  E.form.addEventListener("submit", (event) => { event.preventDefault(); const value = E.input.value; E.input.value = ""; runCommand(value); });
  $("#clearTerminal").addEventListener("click", () => { E.output.innerHTML = ""; E.input.focus(); });
  $$("[data-editor]").forEach((button) => button.addEventListener("click", () => editorAction(button.dataset.editor)));
  E.editorText.addEventListener("input", () => { E.editorBadge.classList.toggle("modified", E.editorText.value !== editorState.original); const before = E.editorText.value.slice(0, E.editorText.selectionStart).split("\n"); E.editorPosition.textContent = `${before.length},${before[before.length - 1].length + 1}`; });
  E.editorText.addEventListener("keydown", (event) => { if (event.key === "Escape") { event.preventDefault(); setEditorMode("normal"); } else if (editorState.mode === "normal" && event.key.toLowerCase() === "i") { event.preventDefault(); setEditorMode("insert"); } else if (editorState.mode === "normal" && event.key === ":") { event.preventDefault(); setEditorMode("command"); } });
  E.editorCommand.addEventListener("keydown", (event) => { if (event.key !== "Enter") return; event.preventDefault(); const command = E.editorCommand.value.trim(); if (command === "wq" || command === "x") closeEditor(true); else if (command === "w") editorAction("write"); else if (command === "q!") closeEditor(false); else { E.editorMode.textContent = `Not an editor command: ${command}`; setTimeout(() => setEditorMode("normal"), 1100); } });
  [$("#openGuide"), $("#guideInLab")].forEach((button) => button.addEventListener("click", openGuide)); $("#closeGuide").addEventListener("click", closeGuide); E.guide.addEventListener("click", (event) => { if (event.target === E.guide) closeGuide(); });
  $("#resetLab").addEventListener("click", () => { if (window.confirm("Reset all work and return to the beginning?")) { resetState(); E.learnerName.value = learner; switchScreen(E.welcome); } });
  $("#replay").addEventListener("click", () => { resetState(); E.learnerName.value = learner; switchScreen(E.welcome); });
  E.download.addEventListener("click", downloadPdf); $("#printCertificate").addEventListener("click", printCertificate);

  if (window.__RCW_ENABLE_TEST__ === true) {
    window.__RCW_RHCSA_TEST__ = { run: runCommand, getState: () => state, getScore: () => score, objectivePassed, setFile: (path, content) => { state.files[path] = content; evaluate(); }, finish: finishLab };
  }
})();
