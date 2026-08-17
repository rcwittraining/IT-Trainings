(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const screens = {
    welcome: $("#welcomeScreen"),
    lab: $("#labScreen")
  };

  const terminalForm = $("#terminalForm");
  const commandInput = $("#commandInput");
  const terminalOutput = $("#terminalOutput");
  const terminalBody = $("#terminalBody");
  const promptUser = $("#promptUser");
  const promptPath = $("#promptPath");
  const sessionTimeEl = $("#sessionTime");
  const cmdCountEl = $("#cmdCount");

  // ============================================================
  // VIRTUAL FILESYSTEM
  // ============================================================
  const dirs = new Set([
    "/", "/etc", "/etc/ssh", "/etc/ssh/sshd_config.d", "/etc/systemd", "/etc/systemd/system",
    "/etc/selinux", "/etc/cron.d", "/etc/yum.repos.d", "/var", "/var/log", "/var/spool", "/var/lib",
    "/tmp", "/root", "/home", "/home/student", "/home/student/Documents", "/home/student/scripts",
    "/home/operator", "/home/webadmin", "/usr", "/usr/bin", "/usr/share", "/usr/share/doc", "/boot",
    "/dev", "/mnt", "/media", "/opt", "/srv", "/data"
  ]);

  const files = {
    "/etc/hostname": "rhel10.rcw.local\n",
    "/etc/redhat-release": "Red Hat Enterprise Linux release 10.0 (Plow)\n",
    "/etc/os-release": "NAME=\"Red Hat Enterprise Linux\"\nVERSION=\"10.0 (Plow)\"\nID=\"rhel\"\nID_LIKE=\"fedora\"\nVERSION_ID=\"10.0\"\nPLATFORM_ID=\"platform:el10\"\nPRETTY_NAME=\"Red Hat Enterprise Linux 10.0 (Plow)\"\nANSI_COLOR=\"0;31\"\nCPE_NAME=\"cpe:/o:redhat:enterprise_linux:10::baseos\"\n",
    "/etc/issue": "\\S\nKernel \\r on an \\m\n\n",
    "/etc/motd": "\nWelcome to the RCW IT Training RHEL 10 practice environment.\nPractice freely — this system is a simulated sandbox.\n\n",
    "/etc/shells": "/bin/sh\n/bin/bash\n/usr/bin/sh\n/usr/bin/bash\n/usr/bin/tmux\n/bin/tmux\n",
    "/proc/version": "Linux version 6.12.0-55.el10.x86_64 (mockbuild@rhel10) (gcc version 14.2.1 20250103 (Red Hat 14.2.1-6)) #1 SMP PREEMPT_DYNAMIC Wed Jul 15 10:00:00 UTC 2026\n",
    "/etc/yum.repos.d/redhat.repo": "[example-BaseOS]\nname = RHEL 10 BaseOS\nbaseurl = https://cdn.redhat.com/content/dist/rhel10/10/x86_64/baseos/os\nenabled = 1\n\n[example-AppStream]\nname = RHEL 10 AppStream\nbaseurl = https://cdn.redhat.com/content/dist/rhel10/10/x86_64/appstream/os\nenabled = 1\n",
    "/etc/hosts": "127.0.0.1   localhost localhost.localdomain localhost4\n192.168.1.10 rhel10.rcw.local rhel10\n",
    "/etc/resolv.conf": "search rcw.local\nnameserver 192.168.1.1\n",
    "/etc/passwd":
      "root:x:0:0:root:/root:/bin/bash\n" +
      "bin:x:1:1:bin:/bin:/sbin/nologin\n" +
      "student:x:1000:1000:Student:/home/student:/bin/bash\n" +
      "operator:x:1001:1001:Operator:/home/operator:/bin/bash\n" +
      "webadmin:x:1002:1002:Web Admin:/home/webadmin:/bin/bash\n",
    "/etc/group":
      "root:x:0:\n" +
      "wheel:x:10:student\n" +
      "student:x:1000:\n" +
      "operator:x:1001:\n" +
      "webadmin:x:1002:\n",
    "/etc/fstab":
      "/dev/mapper/rhel-root /                       xfs     defaults        0 0\n" +
      "UUID=1a2b3c4d-1111-2222-3333-444455556666 /boot xfs     defaults        0 0\n" +
      "/dev/mapper/rhel-swap none                    swap    defaults        0 0\n" +
      "/dev/vg_data/lv_app   /app                    xfs     defaults        0 0\n",
    "/etc/ssh/sshd_config":
      "# $OpenBSD: sshd_config\n" +
      "Port 22\n" +
      "PermitRootLogin no\n" +
      "PasswordAuthentication yes\n" +
      "PubkeyAuthentication yes\n" +
      "AllowUsers student operator\n" +
      "Subsystem sftp /usr/libexec/openssh/sftp-server\n",
    "/etc/sudoers":
      "root ALL=(ALL) ALL\n" +
      "%wheel ALL=(ALL) ALL\n" +
      "student ALL=(ALL) NOPASSWD: ALL\n",
    "/etc/cron.d/backup": "30 2 * * * root /usr/local/bin/backup.sh\n",
    "/etc/systemd/system/multi-user.target.wants/httpd.service": "# symlink placeholder\n",
    "/var/log/messages":
      "Aug 16 08:00:01 rhel10 systemd[1]: Started Session 12 of user student.\n" +
      "Aug 16 08:05:22 rhel10 kernel: IPv6: ADDRCONF(NETDEV_CHANGE): ens160: link becomes ready\n" +
      "Aug 16 08:30:41 rhel10 systemd[1]: Starting Daily Cleanup of Temporary Directories...\n" +
      "Aug 16 08:30:41 rhel10 systemd[1]: Finished Daily Cleanup of Temporary Directories.\n",
    "/var/log/secure":
      "Aug 16 07:59:10 rhel10 sshd[1420]: Accepted password for student from 192.168.1.25 port 52144 ssh2\n" +
      "Aug 16 08:01:02 rhel10 sudo: student : TTY=pts/0 ; PWD=/home/student ; COMMAND=/usr/bin/dnf update\n",
    "/home/student/.bashrc":
      "# .bashrc\n" +
      "alias ll='ls -l --color=auto'\n" +
      "alias vi='vim'\n" +
      "export HISTSIZE=1000\n",
    "/home/student/Documents/report.txt":
      "RCW IT Training — Storage Report\n" +
      "===============================\n" +
      "Volume group vg_data is 95 percent full.\n" +
      "Logical volume lv_app holds the application data.\n" +
      "A new disk /dev/sdb (20 GB) is available.\n" +
      "Action: extend the volume group and grow the filesystem.\n",
    "/home/student/Documents/access.log":
      "192.168.1.10 - - [16/Aug/2026:08:01:02 +0530] \"GET /index.html HTTP/1.1\" 200 1024\n" +
      "192.168.1.25 - - [16/Aug/2026:08:02:11 +0530] \"GET /api/health HTTP/1.1\" 200 45\n" +
      "192.168.1.30 - - [16/Aug/2026:08:03:44 +0530] \"POST /login HTTP/1.1\" 401 12\n" +
      "192.168.1.10 - - [16/Aug/2026:08:04:20 +0530] \"GET /report.txt HTTP/1.1\" 200 512\n",
    "/home/student/scripts/backup.sh":
      "#!/bin/bash\n# Simple backup script\nSRC=/home/student/Documents\nDST=/data/backups\nmkdir -p \"$DST\"\ntar -czf \"$DST/docs-$(date +%F).tar.gz\" -C \"$SRC\" .\necho \"Backup complete: $DST\"\n"
  };

  // ============================================================
  // SYSTEM STATE
  // ============================================================
  const users = new Set(["root", "student", "operator", "webadmin", "bin", "daemon"]);
  const userUid = { root: 0, student: 1000, operator: 1001, webadmin: 1002 };
  const groups = new Set(["root", "wheel", "student", "operator", "webadmin"]);

  const services = {
    sshd:       { enabled: true,  active: true,  desc: "OpenSSH server daemon" },
    httpd:      { enabled: false, active: false, desc: "The Apache HTTP Server" },
    nginx:      { enabled: false, active: false, desc: "A high performance web server" },
    crond:      { enabled: true,  active: true,  desc: "Command Scheduler" },
    firewalld:  { enabled: true,  active: true,  desc: "firewalld - dynamic firewall daemon" },
    chronyd:    { enabled: true,  active: true,  desc: "NTP client/server" },
    NetworkManager: { enabled: true, active: true, desc: "Network Manager" },
    postfix:    { enabled: false, active: false, desc: "Postfix Mail Transport Agent" },
    mariadb:    { enabled: false, active: false, desc: "MariaDB 10.11 database server" },
    "nfs-server": { enabled: false, active: false, desc: "NFS server and services" },
    autofs:     { enabled: false, active: false, desc: "Automounts filesystems on demand" },
    tuned:      { enabled: true,  active: true,  desc: "Dynamic System Tuning Daemon" }
  };

  const packages = new Set([
    "bash", "coreutils", "util-linux", "openssh-server", "openssh-clients", "firewalld",
    "chrony", "httpd", "nginx", "mariadb-server", "postfix", "autofs", "nfs-utils",
    "vim-enhanced", "tmux", "git", "podman", "lvm2", "xfsprogs", "e2fsprogs", "tar",
    "gzip", "findutils", "grep", "sed", "gawk", "crontabs", "at", "policycoreutils",
    "policycoreutils-python-utils", "setools-console", "container-tools"
  ]);

  let firewallServices = ["ssh", "dhcpv6-client", "cockpit"];
  let firewallPorts = ["22/tcp", "9090/tcp"];
  let selinuxMode = "enforcing";
  let hostname = "rhel10.rcw.local";

  // Storage / LVM simulation
  let pvs = [ { device: "/dev/sda2", vg: "rhel", size: "29.00g" } ];
  let vgs = [ { name: "rhel", pvs: 1, free: "0", size: "29.00g" }, { name: "vg_data", pvs: 1, free: "508.00m", size: "30.00g" } ];
  let lvs = [ { path: "/dev/rhel/root", vg: "rhel", size: "26.00g" }, { path: "/dev/rhel/swap", vg: "rhel", size: "3.00g" }, { path: "/dev/vg_data/lv_app", vg: "vg_data", size: "29.50g" } ];

  // ============================================================
  // SESSION STATE
  // ============================================================
  let cwd = "/home/student";
  let commandHistory = [];
  let historyIndex = 0;
  let commandCount = 0;
  let startedAt = Date.now();
  let timerId = null;
  let heredocDelimiter = null;
  let heredocBuffer = [];
  let heredocCommand = "";
  // cat > file input mode (finished with Ctrl+D, like a real shell)
  let catInputTarget = null;
  let catInputAppend = false;
  let catInputLines = [];

  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove("is-active"));
    screens[name].classList.add("is-active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ============================================================
  // PATH HELPERS
  // ============================================================
  function resolve(p) {
    if (p === "~") p = "/home/student";
    else if (p.startsWith("~/")) p = "/home/student" + p.slice(1);
    let abs = p.startsWith("/") ? p : cwd + "/" + p;
    const parts = [];
    for (const seg of abs.split("/")) {
      if (seg === "" || seg === ".") continue;
      if (seg === "..") { parts.pop(); continue; }
      parts.push(seg);
    }
    return "/" + parts.join("/");
  }

  function isDir(p) { return dirs.has(p) || p === "/"; }
  function exists(p) { return dirs.has(p) || Object.prototype.hasOwnProperty.call(files, p) || p === "/"; }

  function children(dir) {
    const out = new Set();
    const prefix = dir === "/" ? "/" : dir + "/";
    for (const d of dirs) {
      if (d === dir) continue;
      if (d.startsWith(prefix)) {
        const rest = d.slice(prefix.length);
        if (!rest.includes("/")) out.add(rest + "/");
      }
    }
    for (const f in files) {
      if (f.startsWith(prefix)) {
        const rest = f.slice(prefix.length);
        if (!rest.includes("/")) out.add(rest);
      }
    }
    return [...out].sort();
  }

  function parentOf(p) {
    if (p === "/") return "/";
    const idx = p.lastIndexOf("/");
    return idx === 0 ? "/" : p.slice(0, idx);
  }

  function fileSize(name) { return (files[name] || "").length; }

  // ============================================================
  // TERMINAL I/O
  // ============================================================
  function promptSuffix() {
    if (cwd === "/home/student") return " ~]$";
    if (cwd.startsWith("/home/student/")) return " ~/" + cwd.slice("/home/student/".length) + "]$";
    return " " + (cwd === "/" ? "/" : cwd) + "]$";
  }

  function updatePrompt() {
    promptUser.textContent = "[student@rhel10";
    promptPath.textContent = promptSuffix();
  }

  function appendCommand(cmd) {
    const line = document.createElement("div");
    line.className = "output-entry output-command";
    const user = document.createElement("span");
    user.className = "prompt-user";
    user.textContent = "[student@rhel10";
    const path = document.createElement("span");
    path.className = "prompt-path";
    path.textContent = promptSuffix();
    line.append(user, path, document.createTextNode(" " + cmd));
    terminalOutput.append(line);
  }

  function appendOutput(text, type) {
    if (text === "") return;
    const line = document.createElement("div");
    line.className = "output-entry output-text " + (type || "").trim();
    line.textContent = text;
    terminalOutput.append(line);
  }

  function appendMultiline(text, type) {
    if (!text) return;
    text.split("\n").forEach((l) => appendOutput(l, type));
  }

  function scrollTerminal() {
    requestAnimationFrame(() => { terminalBody.scrollTop = terminalBody.scrollHeight; });
  }

  function toast(message) {
    const t = $("#toast");
    t.querySelector("p").textContent = message;
    t.classList.add("is-visible");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("is-visible"), 2400);
  }

  function startTimer() {
    clearInterval(timerId);
    startedAt = Date.now();
    timerId = setInterval(() => {
      const s = Math.floor((Date.now() - startedAt) / 1000);
      const m = Math.floor(s / 60).toString().padStart(2, "0");
      sessionTimeEl.textContent = m + ":" + String(s % 60).padStart(2, "0");
    }, 1000);
  }

  // ============================================================
  // MAIN DISPATCH
  // ============================================================
  terminalForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const rawCommand = commandInput.value.trim();
    commandInput.value = "";
    if (!rawCommand) return;
    appendCommand(rawCommand);
    commandHistory.push(rawCommand);
    historyIndex = commandHistory.length;
    commandCount += 1;
    cmdCountEl.textContent = String(commandCount);

    // cat > file input mode (type lines, finish with Ctrl+D)
    if (catInputTarget) {
      catInputLines.push(rawCommand);
      scrollTerminal();
      return;
    }

    // heredoc
    if (heredocDelimiter) {
      if (rawCommand.trim() === heredocDelimiter) {
        const block = heredocBuffer.join("\n");
        heredocBuffer = [];
        heredocDelimiter = null;
        finishHeredoc(heredocCommand, block);
        heredocCommand = "";
      } else {
        heredocBuffer.push(rawCommand);
      }
      scrollTerminal();
      return;
    }
    const heredocMatch = rawCommand.match(/<<\s*['"]?([A-Za-z_][A-Za-z0-9_]*)['"]?\s*$/);
    if (heredocMatch) {
      heredocDelimiter = heredocMatch[1];
      heredocBuffer = [];
      heredocCommand = rawCommand;
      appendOutput("> ", "info");
      scrollTerminal();
      return;
    }

    executeCommand(rawCommand);
    updatePrompt();
    scrollTerminal();
  });

  commandInput.addEventListener("keydown", (event) => {
    // Ctrl+D ends a cat > file input session (EOF), like a real shell
    if ((event.ctrlKey && event.key === "d") || (event.key === "d" && event.ctrlKey)) {
      if (catInputTarget) {
        event.preventDefault();
        finishCatInput();
        return;
      }
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (commandHistory.length) {
        historyIndex = Math.max(0, historyIndex - 1);
        commandInput.value = commandHistory[historyIndex] || "";
        requestAnimationFrame(() => commandInput.setSelectionRange(commandInput.value.length, commandInput.value.length));
      }
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (commandHistory.length) {
        historyIndex = Math.min(commandHistory.length, historyIndex + 1);
        commandInput.value = commandHistory[historyIndex] || "";
      }
    }
  });

  terminalBody.addEventListener("click", () => commandInput.focus());

  function tokenize(command) {
    const tokens = [];
    const matcher = /"([^"]*)"|'([^']*)'|([^\s]+)/g;
    let match;
    while ((match = matcher.exec(command)) !== null) tokens.push(match[1] ?? match[2] ?? match[3]);
    return tokens;
  }

  function finishHeredoc(opening, block) {
    const cmd = opening.replace(/<<\s*['"]?[A-Za-z_][A-Za-z0-9_]*['"]?.*$/, "").trim();
    // cat > file <<EOF  or  tee file <<EOF
    let m = cmd.match(/^cat\s+>\s*(\S+)/) || cmd.match(/^cat\s+>>\s*(\S+)/);
    if (m) {
      writeFile(resolve(m[1]), block + "\n");
      return;
    }
    m = cmd.match(/^tee\s+(-a\s+)?(\S+)/);
    if (m) {
      writeFile(resolve(m[2]), block + "\n");
      return;
    }
    appendOutput("heredoc: unsupported target (try 'cat > file <<EOF')", "error");
  }

  function finishCatInput() {
    const content = catInputLines.join("\n") + "\n";
    const path = catInputTarget;
    if (catInputAppend) {
      files[path] = (files[path] || "") + content;
    } else {
      files[path] = content;
    }
    // ensure parent dir exists
    const parent = parentOf(path);
    if (!isDir(parent)) dirs.add(parent);
    appendOutput("(saved " + catInputLines.length + " line" + (catInputLines.length === 1 ? "" : "s") + " to " + path + ")");
    catInputTarget = null;
    catInputAppend = false;
    catInputLines = [];
  }

  function writeFile(path, content) {
    files[path] = content;
    // ensure parent dir exists
    const parent = parentOf(path);
    if (!isDir(parent)) dirs.add(parent);
    appendOutput("(file written: " + path + ")");
  }

  function executeCommand(rawCommand) {
    // echo redirection: echo "text" > file / >> file
    let redir = rawCommand.match(/^(echo\s+.*?)\s*(>>?)\s*(\S+)\s*$/);
    if (redir) {
      const inner = redir[1].slice(5).trim();
      const text = inner.replace(/^['"](.*)['"]$/, "$1");
      const target = resolve(redir[3]);
      const op = redir[2];
      if (op === ">>") files[target] = (files[target] || "") + text + "\n";
      else files[target] = text + "\n";
      appendOutput("(redirected to " + redir[3] + ")");
      return;
    }

    // cat > file  or  cat >> file — enter input mode (finish with Ctrl+D)
    redir = rawCommand.match(/^cat\s+(>>?)\s*(\S+)\s*$/);
    if (redir) {
      catInputTarget = resolve(redir[2]);
      catInputAppend = redir[1] === ">>";
      catInputLines = [];
      appendOutput("(typing mode — enter your lines, then press Ctrl+D to save to " + redir[2] + ")", "info");
      return;
    }

    // strip sudo
    let cmd = rawCommand;
    if (/^sudo\s+/i.test(cmd)) cmd = cmd.replace(/^sudo\s+/i, "");
    const tokens = tokenize(cmd);
    const command = (tokens.shift() || "").toLowerCase();
    const args = tokens;

    switch (command) {
      case "pwd": appendOutput(cwd); break;
      case "ls": handleLs(args, cmd); break;
      case "cd": handleCd(args); break;
      case "cat": handleCat(args); break;
      case "head": handleHead(args); break;
      case "tail": handleTail(args); break;
      case "less": case "more": handleCat(args); break;
      case "touch": handleTouch(args); break;
      case "mkdir": handleMkdir(args); break;
      case "rmdir": handleRmdir(args); break;
      case "rm": handleRm(args); break;
      case "cp": handleCp(args); break;
      case "mv": handleMv(args); break;
      case "echo": appendOutput(args.join(" ")); break;
      case "grep": handleGrep(args, cmd); break;
      case "wc": handleWc(args); break;
      case "sort": handleSort(args); break;
      case "cut": handleCut(args, cmd); break;
      case "sed": handleSed(args, cmd); break;
      case "awk": handleAwk(cmd); break;
      case "find": handleFind(args); break;
      case "file": handleFile(args); break;
      case "stat": handleStat(args); break;
      case "ln": handleLn(args); break;
      case "chmod": handleChmod(args); break;
      case "chown": handleChown(args); break;
      case "chgrp": handleChown(args); break;
      case "umask": appendOutput("0022"); break;
      case "tar": handleTar(args); break;
      case "gzip": handleGzip(args); break;
      case "gunzip": appendOutput("gunzip: use 'gzip -d' in this sandbox"); break;
      case "diff": handleDiff(args); break;
      case "df": handleDf(args); break;
      case "du": handleDu(args); break;
      case "whoami": appendOutput("student"); break;
      case "id": handleId(args); break;
      case "getent": handleGetent(args); break;
      case "useradd": handleUseradd(args); break;
      case "usermod": handleUsermod(args); break;
      case "userdel": handleUserdel(args); break;
      case "passwd": handlePasswd(args); break;
      case "groupadd": handleGroupadd(args); break;
      case "groupdel": handleGroupdel(args); break;
      case "hostname": if (args.includes("-I")) appendOutput("192.168.1.10"); else appendOutput(hostname); break;
      case "hostnamectl": handleHostnamectl(args); break;
      case "timedatectl": handleTimedatectl(args); break;
      case "localectl": handleLocalectl(args); break;
      case "uname": handleUname(args); break;
      case "which": case "whereis": case "type": handleWhich(args, command); break;
      case "md5sum": handleHash(args, "md5"); break;
      case "sha256sum": handleHash(args, "sha256"); break;
      case "uniq": handleUniq(args); break;
      case "tr": handleTr(args, cmd); break;
      case "chage": handleChage(args); break;
      case "env": handleEnv(); break;
      case "export": appendOutput("(variable exported)"); break;
      case "kill": case "pkill": case "killall": handleKill(args, command); break;
      case "uptime": appendOutput(" 10:42:11 up  3:17,  1 user,  load average: 0.08, 0.12, 0.09"); break;
      case "date": appendOutput("Sun Aug 16 10:42:11 IST 2026"); break;
      case "free": appendOutput("               total        used        free      shared  buff/cache   available\nMem:         8153824     1204120     5232216       84020     1717488     6610940\nSwap:        3145728           0     3145728"); break;
      case "ps": handlePs(args); break;
      case "top": appendOutput("top - 10:42:11 up 3:17, 1 user, load average: 0.08, 0.12, 0.09\nTasks: 208 total, 1 running, 207 sleeping\n%Cpu(s):  1.2 us, 0.6 sy, 0.0 ni, 98.1 id\nMiB Mem :   7962.7 total,   5108.8 free,   1176.3 used\n  PID USER      PR  NI  VIRT  RES  SHR S %CPU %MEM TIME+ COMMAND\n    1 root      20   0 170m  12m  8m S  0.0  0.1 0:01.2 systemd\n 1420 root      20   0  16m  6m  4m S  0.0  0.1 0:00.4 sshd"); break;
      case "systemctl": handleSystemctl(args); break;
      case "journalctl": handleJournalctl(args); break;
      case "dnf": case "yum": handleDnf(args, cmd); break;
      case "rpm": handleRpm(args); break;
      case "subscription-manager": handleSubscription(args); break;
      case "lsblk": handleLsblk(args); break;
      case "blkid": appendOutput('/dev/sda2: UUID="1a2b3c4d-..." TYPE="LVM2_member"\n/dev/mapper/rhel-root: UUID="abcd..." TYPE="xfs"\n/dev/sdb: PTUUID="a1b2c3d4" PTTYPE="dos"'); break;
      case "fdisk": handleFdisk(args); break;
      case "pvcreate": handlePvcreate(args); break;
      case "pvs": case "pvdisplay": case "pvscan": handlePvs(cmd); break;
      case "vgcreate": handleVgcreate(args); break;
      case "vgs": case "vgdisplay": case "vgscan": handleVgs(cmd); break;
      case "lvcreate": handleLvcreate(args); break;
      case "lvextend": handleLvextend(args); break;
      case "lvs": case "lvdisplay": case "lvscan": handleLvs(cmd); break;
      case "mkfs": case "mkfs.xfs": case "mkfs.ext4": handleMkfs(args, command); break;
      case "mount": handleMount(args); break;
      case "umount": handleUmount(args); break;
      case "findmnt": handleFindmnt(args); break;
      case "mkswap": appendOutput("Setting up swapspace version 1, size = 3 GiB (3221225472 bytes)\nno label, UUID=aaaa-bbbb-cccc-dddd"); break;
      case "swapon": appendOutput("NAME      TYPE SIZE USED PRIO\n/dev/mapper/rhel-swap partition 3G 0B -2"); break;
      case "swapoff": appendOutput(""); break;
      case "ip": handleIp(args); break;
      case "nmcli": handleNmcli(args); break;
      case "ping": appendOutput("PING example.com (93.184.216.34) 56(84) bytes of data.\n64 bytes from 93.184.216.34: icmp_seq=1 ttl=56 time=24.1 ms\n64 bytes from 93.184.216.34: icmp_seq=2 ttl=56 time=23.8 ms"); break;
      case "ss": handleSs(args); break;
      case "curl": handleCurl(args); break;
      case "firewall-cmd": handleFirewall(args); break;
      case "sestatus": appendOutput("SELinux status:                 enabled\nSELinuxfs mount:                /sys/fs/selinux\nCurrent mode:                   " + selinuxMode + "\nPolicy from config file:        targeted"); break;
      case "getenforce": appendOutput(selinuxMode); break;
      case "setenforce": handleSetenforce(args); break;
      case "semanage": handleSemanage(args); break;
      case "restorecon": appendOutput("restorecon: relabeled context on the specified path"); break;
      case "chcon": appendOutput("context changed"); break;
      case "getsebool": appendOutput("httpd_can_network_connect --> off"); break;
      case "setsebool": appendOutput(""); break;
      case "podman": handlePodman(args); break;
      case "crontab": handleCrontab(args); break;
      case "at": appendOutput("warning: commands will be executed using /bin/sh\njob 1 at Sun Aug 16 11:00:00 2026"); break;
      case "ssh-keygen": appendOutput("Generating public/private ed25519 key pair.\nYour identification has been saved in /home/student/.ssh/id_ed25519\nYour public key has been saved in /home/student/.ssh/id_ed25519.pub"); break;
      case "history": appendOutput(commandHistory.map((item, i) => String(i + 1).padStart(4, " ") + "  " + item).join("\n")); break;
      case "clear": terminalOutput.replaceChildren(); break;
      case "help": handleHelp(args); break;
      case "man": handleMan(args); break;
      case "": break;
      default:
        appendOutput("bash: " + command + ": command not found", "error");
    }
  }

  // ============================================================
  // FILE / NAV COMMANDS
  // ============================================================
  function handleLs(args, cmd) {
    const long = /-l/.test(cmd);
    const all = /-a/.test(cmd);
    const ctx = /-Z/.test(cmd);
    const target = args.filter((a) => !a.startsWith("-")).pop() || "";
    const path = target ? resolve(target) : cwd;
    if (!isDir(path)) { appendOutput("ls: cannot access '" + target + "': No such file or directory", "error"); return; }
    let names = children(path);
    if (all) names = ["./", "../", ...names];
    if (long) {
      const lines = [];
      if (all) lines.push("drwxr-xr-x.  5 root    root    4096 Aug 16 08:00 .", "drwxr-xr-x. 20 root    root    4096 Aug 16 07:50 ..");
      names.forEach((n) => {
        const isDirName = n.endsWith("/");
        const nm = isDirName ? n.slice(0, -1) : n;
        const full = path === "/" ? "/" + nm : path + "/" + nm;
        const mode = isDirName ? "drwxr-xr-x." : "-rw-r--r--.";
        const size = isDirName ? 4096 : fileSize(full);
        const ctxStr = ctx ? " system_u:object_r:" + (isDirName ? "etc_t" : "user_home_t") + ":s0" : "";
        lines.push(mode + "  2 student student " + String(size).padStart(6, " ") + " Aug 16 08:00 " + nm + ctxStr);
      });
      appendMultiline(lines.join("\n"));
    } else {
      appendOutput(names.join("  "));
    }
  }

  function handleCd(args) {
    const target = args[0];
    if (!target || target === "~") { cwd = "/home/student"; return; }
    const path = resolve(target);
    if (path === "/") { cwd = "/"; return; }
    if (isDir(path)) { cwd = path; return; }
    if (exists(path)) { appendOutput("bash: cd: " + target + ": Not a directory", "error"); return; }
    appendOutput("bash: cd: " + target + ": No such file or directory", "error");
  }

  function handleCat(args) {
    const target = args.filter((a) => !a.startsWith("-")).pop() || "";
    const path = resolve(target);
    if (isDir(path)) { appendOutput("cat: " + target + ": Is a directory", "error"); return; }
    if (Object.prototype.hasOwnProperty.call(files, path)) appendMultiline(files[path].replace(/\n$/, ""));
    else appendOutput("cat: " + target + ": No such file or directory", "error");
  }

  function handleHead(args) {
    const n = parseInt((args.find((a) => a.startsWith("-n")) || "").replace("-n", ""), 10) || 10;
    const target = args.filter((a) => !a.startsWith("-")).pop() || "";
    const path = resolve(target);
    const content = files[path];
    if (!content) { appendOutput("head: cannot open '" + target + "': No such file or directory", "error"); return; }
    appendMultiline(content.split("\n").slice(0, n).join("\n"));
  }

  function handleTail(args) {
    const n = parseInt((args.find((a) => a.startsWith("-n")) || "").replace("-n", ""), 10) || 10;
    const target = args.filter((a) => !a.startsWith("-")).pop() || "";
    const path = resolve(target);
    const content = files[path];
    if (!content) { appendOutput("tail: cannot open '" + target + "': No such file or directory", "error"); return; }
    appendMultiline(content.split("\n").slice(-n).join("\n"));
  }

  function handleTouch(args) {
    const targets = args.filter((a) => !a.startsWith("-"));
    if (!targets.length) { appendOutput("touch: missing file operand", "error"); return; }
    targets.forEach((t) => { const p = resolve(t); if (!files[p]) files[p] = ""; });
  }

  function handleMkdir(args) {
    const targets = args.filter((a) => !a.startsWith("-"));
    if (!targets.length) { appendOutput("mkdir: missing operand", "error"); return; }
    const parent = /-p/.test(args.join(" "));
    targets.forEach((t) => {
      const p = resolve(t);
      if (dirs.has(p)) { appendOutput("mkdir: cannot create directory '" + t + "': File exists", "error"); return; }
      if (!parent && !isDir(parentOf(p))) { appendOutput("mkdir: cannot create directory '" + t + "': No such file or directory", "error"); return; }
      dirs.add(p);
    });
  }

  function handleRmdir(args) {
    const targets = args.filter((a) => !a.startsWith("-"));
    targets.forEach((t) => {
      const p = resolve(t);
      if (!dirs.has(p)) { appendOutput("rmdir: failed to remove '" + t + "': No such file or directory", "error"); return; }
      if (children(p).length) { appendOutput("rmdir: failed to remove '" + t + "': Directory not empty", "error"); return; }
      dirs.delete(p);
    });
  }

  function handleRm(args) {
    const recursive = /-[a-zA-Z]*r/.test(args.join(" ")) || /-[a-zA-Z]*R/.test(args.join(" "));
    const targets = args.filter((a) => !a.startsWith("-"));
    if (!targets.length) { appendOutput("rm: missing operand", "error"); return; }
    targets.forEach((t) => {
      const p = resolve(t);
      if (dirs.has(p)) {
        if (!recursive) { appendOutput("rm: cannot remove '" + t + "': Is a directory", "error"); return; }
        // delete subtree
        const prefix = p === "/" ? "/" : p + "/";
        [...dirs].forEach((d) => { if (d.startsWith(prefix)) dirs.delete(d); });
        dirs.delete(p);
        Object.keys(files).forEach((f) => { if (f.startsWith(prefix)) delete files[f]; });
      } else if (Object.prototype.hasOwnProperty.call(files, p)) {
        delete files[p];
      } else {
        appendOutput("rm: cannot remove '" + t + "': No such file or directory", "error");
      }
    });
  }

  function handleCp(args) {
    const recursive = /-[a-zA-Z]*r/.test(args.join(" "));
    const src = args.filter((a) => !a.startsWith("-"))[0];
    const dst = args.filter((a) => !a.startsWith("-"))[1];
    if (!src || !dst) { appendOutput("cp: missing file operand", "error"); return; }
    const s = resolve(src);
    const d = resolve(dst);
    if (isDir(s)) {
      if (!recursive) { appendOutput("cp: -r not specified; omitting directory '" + src + "'", "error"); return; }
      dirs.add(d);
      appendOutput("(directory copied)");
      return;
    }
    if (!Object.prototype.hasOwnProperty.call(files, s)) { appendOutput("cp: cannot stat '" + src + "': No such file or directory", "error"); return; }
    const destPath = isDir(d) ? d + "/" + (src.split("/").pop()) : d;
    files[destPath] = files[s];
  }

  function handleMv(args) {
    const src = args.filter((a) => !a.startsWith("-"))[0];
    const dst = args.filter((a) => !a.startsWith("-"))[1];
    if (!src || !dst) { appendOutput("mv: missing file operand", "error"); return; }
    const s = resolve(src);
    const d = resolve(dst);
    if (dirs.has(s)) { dirs.delete(s); dirs.add(d); }
    else if (Object.prototype.hasOwnProperty.call(files, s)) {
      const destPath = isDir(d) ? d + "/" + (src.split("/").pop()) : d;
      files[destPath] = files[s]; delete files[s];
    } else appendOutput("mv: cannot stat '" + src + "': No such file or directory", "error");
  }

  function handleGrep(args, cmd) {
    const caseInsensitive = /-i/.test(cmd);
    const invert = /-v/.test(cmd);
    const lineNumber = /-n/.test(cmd);
    const targets = args.filter((a) => !a.startsWith("-"));
    const pattern = targets.shift();
    if (!pattern) { appendOutput("Usage: grep [OPTION]... PATTERN [FILE]...", "error"); return; }
    const flag = caseInsensitive ? "i" : "";
    const re = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flag);
    const process = (content, label) => {
      content.split("\n").forEach((line, i) => {
        const match = re.test(line);
        if (invert ? !match : match) {
          appendOutput((lineNumber ? (i + 1) + ":" : "") + (label ? label + ":" : "") + line);
        }
      });
    };
    if (!targets.length) { appendOutput("grep: no input (supply a file or pipe)"); return; }
    targets.forEach((t) => {
      const p = resolve(t);
      if (isDir(p)) { appendOutput("grep: " + t + ": Is a directory", "error"); return; }
      if (Object.prototype.hasOwnProperty.call(files, p)) process(files[p], targets.length > 1 ? t : "");
      else appendOutput("grep: " + t + ": No such file or directory", "error");
    });
  }

  function handleWc(args) {
    const target = args.filter((a) => !a.startsWith("-")).pop() || "";
    const p = resolve(target);
    if (!Object.prototype.hasOwnProperty.call(files, p)) { appendOutput("wc: " + target + ": No such file or directory", "error"); return; }
    const lines = files[p].split("\n").length - (files[p].endsWith("\n") ? 1 : 0);
    const words = files[p].trim() ? files[p].trim().split(/\s+/).length : 0;
    const bytes = files[p].length;
    appendOutput("  " + lines + "  " + words + "  " + bytes + " " + target);
  }

  function handleSort(args) {
    const target = args.filter((a) => !a.startsWith("-")).pop() || "";
    const p = resolve(target);
    if (!Object.prototype.hasOwnProperty.call(files, p)) { appendOutput("sort: cannot read: " + target + ": No such file or directory", "error"); return; }
    appendMultiline(files[p].split("\n").filter(Boolean).sort().join("\n"));
  }

  function handleCut(args, cmd) {
    const dMatch = args.find((a) => a.startsWith("-d"));
    const fMatch = args.find((a) => a.startsWith("-f"));
    const delim = dMatch ? dMatch.replace(/^-d/, "") : "\t";
    const fields = fMatch ? fMatch.replace(/^-f/, "").split(",").map(Number) : [1];
    const target = args.filter((a) => !a.startsWith("-")).pop() || "";
    const p = resolve(target);
    if (!Object.prototype.hasOwnProperty.call(files, p)) { appendOutput("cut: " + target + ": No such file or directory", "error"); return; }
    files[p].split("\n").filter(Boolean).forEach((line) => {
      const cols = line.split(delim);
      appendOutput(fields.map((f) => cols[f - 1] ?? "").join(delim));
    });
  }

  function handleSed(args, cmd) {
    const expr = args.find((a) => !a.startsWith("-") && /s|d$|p$/.test(a) && a.includes("/")) || "";
    const target = args.filter((a) => !a.startsWith("-") && a !== expr).pop() || "";
    const p = resolve(target);
    if (!expr) { appendOutput("sed: missing expression", "error"); return; }
    if (!Object.prototype.hasOwnProperty.call(files, p)) { appendOutput("sed: can't read " + target + ": No such file or directory", "error"); return; }
    // support s/old/new/g and /pattern/d
    const sMatch = expr.match(/^s\/(.+?)\/(.*?)\/(g?)$/);
    const dMatch = expr.match(/^\/(.+?)\/d$/);
    files[p].split("\n").filter(Boolean).forEach((line) => {
      if (dMatch) { if (!new RegExp(dMatch[1]).test(line)) appendOutput(line); return; }
      if (sMatch) {
        const [ , from, to, g ] = sMatch;
        const re = new RegExp(from, g ? "g" : "");
        appendOutput(line.replace(re, to));
      }
    });
  }

  function handleAwk(cmd) {
    // very limited: awk '{print $1}' file
    const target = cmd.split(/\s+/).filter((a) => !a.startsWith("-") && !a.startsWith("{"))[cmd.split(/\s+/).filter((a) => !a.startsWith("-") && !a.startsWith("{")).length - 1];
    const p = resolve(target);
    if (!Object.prototype.hasOwnProperty.call(files, p)) { appendOutput("awk: cmd. line:1: fatal: cannot open file `" + target + "'", "error"); return; }
    files[p].split("\n").filter(Boolean).forEach((line) => appendOutput(line.split(/\s+/)[0]));
  }

  function handleFind(args) {
    const root = args.find((a) => !a.startsWith("-")) || ".";
    const base = resolve(root);
    if (!isDir(base)) { appendOutput("find: '" + root + "': No such file or directory", "error"); return; }
    const prefix = base === "/" ? "/" : base + "/";
    const out = [];
    [...dirs].forEach((d) => { if (d.startsWith(prefix)) out.push(d); });
    Object.keys(files).forEach((f) => { if (f.startsWith(prefix)) out.push(f); });
    appendMultiline(out.sort().join("\n"));
  }

  function handleFile(args) {
    const target = args.filter((a) => !a.startsWith("-")).pop() || "";
    const p = resolve(target);
    if (dirs.has(p) || p === "/") { appendOutput(target + ": directory"); return; }
    if (Object.prototype.hasOwnProperty.call(files, p)) appendOutput(target + ": ASCII text");
    else appendOutput("file: cannot open '" + target + "' (No such file or directory)", "error");
  }

  function handleStat(args) {
    const target = args.filter((a) => !a.startsWith("-")).pop() || "";
    const p = resolve(target);
    if (!exists(p)) { appendOutput("stat: cannot statx '" + target + "': No such file or directory", "error"); return; }
    appendOutput("  File: " + target + "\n  Size: " + (isDir(p) ? 4096 : fileSize(p)) + "  Blocks: 8  IO Block: 4096  " + (isDir(p) ? "directory" : "regular file") + "\nAccess: (0644/-rw-r--r--)  Uid: ( 1000/student)   Gid: ( 1000/student)");
  }

  function handleLn(args) {
    const symbolic = /-s/.test(args.join(" "));
    const targets = args.filter((a) => !a.startsWith("-"));
    const src = targets[0], dst = targets[1];
    if (!src || !dst) { appendOutput("ln: missing file operand", "error"); return; }
    const s = resolve(src);
    const d = resolve(dst);
    if (symbolic) { appendOutput("(symlink created: " + dst + " -> " + src + ")"); return; }
    if (Object.prototype.hasOwnProperty.call(files, s)) files[d] = files[s];
    else appendOutput("ln: failed to access '" + src + "': No such file or directory", "error");
  }

  function handleChmod(args) {
    const mode = args.find((a) => /^[0-7]{3,4}$/.test(a) || /^[ugoa]+[+-=]/.test(a));
    const target = args.filter((a) => !a.startsWith("-") && a !== mode).pop() || "";
    if (!mode || !target) { appendOutput("chmod: missing operand", "error"); return; }
    const p = resolve(target);
    if (!exists(p)) { appendOutput("chmod: cannot access '" + target + "': No such file or directory", "error"); return; }
  }

  function handleChown(args) {
    const target = args.filter((a) => !a.startsWith("-")).pop() || "";
    const p = resolve(target);
    if (!target) { appendOutput("chown: missing operand", "error"); return; }
    if (!exists(p)) { appendOutput("chown: cannot access '" + target + "': No such file or directory", "error"); return; }
  }

  function handleTar(args) {
    const joined = args.join(" ");
    if (/^-?(c|czf|cf)/.test(joined) && /\.tar/.test(joined)) {
      appendOutput("(archive created)");
      return;
    }
    if (/^-?(t|tf)/.test(joined) && /\.tar/.test(joined)) {
      appendOutput("Documents/report.txt\nDocuments/access.log\nscripts/backup.sh");
      return;
    }
    if (/^-?(x|xf|xzf)/.test(joined)) { appendOutput("(archive extracted)"); return; }
    appendOutput("tar: use 'tar -czf out.tar.gz dir/' (create), 'tar -tf out.tar.gz' (list), 'tar -xf out.tar.gz' (extract)");
  }

  function handleGzip(args) {
    const target = args.filter((a) => !a.startsWith("-")).pop() || "";
    if (!target) { appendOutput("gzip: compressed data not written (no input)", "error"); return; }
    appendOutput("(compressed " + target + " -> " + target + ".gz)");
  }

  function handleDiff(args) {
    const a = args[0], b = args[1];
    if (!a || !b) { appendOutput("diff: missing operand", "error"); return; }
    const fa = files[resolve(a)], fb = files[resolve(b)];
    if (fa === undefined || fb === undefined) { appendOutput("diff: No such file or directory", "error"); return; }
    if (fa === fb) { appendOutput("(files are identical)"); return; }
    const la = fa.split("\n"), lb = fb.split("\n");
    const n = Math.max(la.length, lb.length);
    for (let i = 0; i < n; i++) {
      if (la[i] !== lb[i]) appendOutput((i + 1) + "c" + (i + 1) + "\n< " + (la[i] || "") + "\n---\n> " + (lb[i] || ""));
    }
  }

  function handleDf(args) {
    appendOutput("Filesystem              1K-blocks    Used Available Use% Mounted on\n/dev/mapper/rhel-root   27194112 4172192  23021920  16% /\n/dev/sda1                 1038336  230400    807936  23% /boot\n/dev/vg_data/lv_app     30929920 29383424   1546496  95% /app\ntmpfs                     4076912       0   4076912   0% /dev/shm");
  }

  function handleDu(args) {
    appendOutput("4096\t./Documents\n4096\t./scripts\n8192\t.");
  }

  // ============================================================
  // USERS / GROUPS
  // ============================================================
  function handleId(args) {
    const who = args[0];
    if (who && !users.has(who)) { appendOutput("id: '" + who + "': no such user", "error"); return; }
    if (who === "root") { appendOutput("uid=0(root) gid=0(root) groups=0(root)"); return; }
    appendOutput("uid=" + (userUid[who] || 1000) + "(" + (who || "student") + ") gid=" + (userUid[who] || 1000) + "(" + (who || "student") + ") groups=" + (userUid[who] || 1000) + "(" + (who || "student") + "),10(wheel)");
  }

  function handleGetent(args) {
    const db = (args[0] || "").toLowerCase();
    const key = args[1];
    if (db === "passwd") {
      const line = key ? files["/etc/passwd"].split("\n").find((l) => l.startsWith(key + ":")) : files["/etc/passwd"];
      if (line) appendMultiline(line.replace(/\n$/, ""));
      else appendOutput("getent: no entry", "error");
      return;
    }
    if (db === "group") {
      const line = key ? files["/etc/group"].split("\n").find((l) => l.startsWith(key + ":")) : files["/etc/group"];
      if (line) appendMultiline(line.replace(/\n$/, ""));
      else appendOutput("getent: no entry", "error");
      return;
    }
    if (db === "hosts") appendOutput("192.168.1.10  rhel10.rcw.local rhel10");
    else appendOutput("getent: unknown database", "error");
  }

  function handleUseradd(args) {
    const name = args.filter((a) => !a.startsWith("-")).pop() || "";
    if (!name) { appendOutput("useradd: missing user name", "error"); return; }
    if (users.has(name)) { appendOutput("useradd: user '" + name + "' already exists", "error"); return; }
    users.add(name);
    userUid[name] = 1003 + users.size;
    files["/etc/passwd"] += name + ":x:" + userUid[name] + ":" + userUid[name] + "::/home/" + name + ":/bin/bash\n";
    appendOutput("useradd: user '" + name + "' created");
  }

  function handleUsermod(args) {
    const name = args.filter((a) => !a.startsWith("-")).pop() || "";
    if (!users.has(name)) { appendOutput("usermod: user '" + name + "' does not exist", "error"); return; }
    appendOutput("usermod: user '" + name + "' updated");
  }

  function handleUserdel(args) {
    const name = args.filter((a) => !a.startsWith("-")).pop() || "";
    if (!users.has(name)) { appendOutput("userdel: user '" + name + "' does not exist", "error"); return; }
    users.delete(name);
    appendOutput("userdel: user '" + name + "' removed");
  }

  function handlePasswd(args) {
    const name = args[0] || "student";
    appendOutput("Changing password for user " + name + ".\nNew password: \nRetype new password: \npasswd: all authentication tokens updated successfully.");
  }

  function handleGroupadd(args) {
    const name = args.filter((a) => !a.startsWith("-")).pop() || "";
    if (groups.has(name)) { appendOutput("groupadd: group '" + name + "' already exists", "error"); return; }
    groups.add(name);
    files["/etc/group"] += name + ":x:2000:\n";
    appendOutput("groupadd: group '" + name + "' created");
  }

  function handleGroupdel(args) {
    const name = args[0] || "";
    if (!groups.has(name)) { appendOutput("groupdel: group '" + name + "' does not exist", "error"); return; }
    groups.delete(name);
    appendOutput("groupdel: group '" + name + "' removed");
  }

  // ============================================================
  // SYSTEM
  // ============================================================
  function handleHostnamectl(args) {
    if (args.includes("set-hostname")) {
      hostname = args[args.length - 1];
      files["/etc/hostname"] = hostname + "\n";
      appendOutput("hostname set to " + hostname);
      return;
    }
    appendOutput("   Static hostname: " + hostname + "\n         Icon name: computer-vm\n           Chassis: vm\n  Operating System: Red Hat Enterprise Linux 10.0\n            Kernel: Linux 6.12.0-55.el10.x86_64\n      Architecture: x86-64");
  }

  function handleTimedatectl(args) {
    const joined = args.join(" ");
    if (/set-timezone/.test(joined)) {
      appendOutput("timezone set to " + (args[args.length - 1] || "UTC"));
      return;
    }
    if (/set-ntp|set-ntp true/.test(joined)) { appendOutput("NTP synchronization enabled"); return; }
    appendOutput("               Local time: Sun 2026-08-16 10:42:11 IST\n           Universal time: Sun 2026-08-16 05:12:11 UTC\n                 RTC time: Sun 2026-08-16 05:12:11\n                Time zone: Asia/Kolkata (IST, +0530)\nSystem clock synchronized: yes\n              NTP service: active\n          RTC in local TZ: no");
  }

  function handleLocalectl(args) {
    const joined = args.join(" ");
    if (/set-locale/.test(joined)) { appendOutput("locale set to " + (args[args.length - 1] || "en_US.UTF-8")); return; }
    appendOutput("   System Locale: LANG=en_US.UTF-8\n       VC Keymap: us\n      X11 Layout: us");
  }

  function handleWhich(args, command) {
    const target = args[0];
    if (!target) { appendOutput(command + ": missing operand", "error"); return; }
    if (command === "whereis") { appendOutput(target + ": /usr/bin/" + target + " /usr/share/man/man1/" + target + ".1.gz"); return; }
    if (command === "type") { appendOutput(target + " is /usr/bin/" + target); return; }
    // which
    if (target === "ls" || target === "cat" || target === "grep" || target === "sed" || target === "awk" || target === "tar" || target === "dnf" || target === "systemctl" || target === "podman" || target === "python3" || target === "vim" || target === "tmux" || target === "git" || target === "ssh" || target === "scp") {
      appendOutput("/usr/bin/" + target);
    } else {
      appendOutput("which: no " + target + " in (/usr/local/bin:/usr/bin:/bin)");
    }
  }

  function handleHash(args, algo) {
    const target = args.filter((a) => !a.startsWith("-")).pop() || "";
    const content = files[resolve(target)];
    if (!content && !Object.prototype.hasOwnProperty.call(files, resolve(target))) { appendOutput(algo + "sum: " + target + ": No such file or directory", "error"); return; }
    // deterministic fake hash
    let h = 0;
    const s = (content || target);
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    const hex = h.toString(16).padStart(algo === "md5" ? 32 : 64, "0").slice(0, algo === "md5" ? 32 : 64);
    appendOutput(hex + "  " + target);
  }

  function handleUniq(args) {
    const target = args.filter((a) => !a.startsWith("-")).pop() || "";
    const content = files[resolve(target)];
    if (!content) { appendOutput("uniq: " + target + ": No such file or directory", "error"); return; }
    const seen = new Set();
    content.split("\n").filter(Boolean).forEach((l) => { if (!seen.has(l)) { seen.add(l); appendOutput(l); } });
  }

  function handleTr(args, cmd) {
    // tr 'a-z' 'A-Z' < file  (or via pipe, not supported; accept a file after <)
    const m = cmd.match(/<\s*(\S+)/);
    const target = m ? m[1] : null;
    if (!target) { appendOutput("tr: reading stdin is not supported here — use: tr 'a-z' 'A-Z' < file", "info"); return; }
    const content = files[resolve(target)];
    if (!content) { appendOutput("tr: " + target + ": No such file or directory", "error"); return; }
    const set1 = args[0] || "";
    const set2 = args[1] || "";
    if (set1 === "a-z" && set2 === "A-Z") appendMultiline(content.toUpperCase());
    else if (set1 === "A-Z" && set2 === "a-z") appendMultiline(content.toLowerCase());
    else appendOutput(content);
  }

  function handleChage(args) {
    const user = args.filter((a) => !a.startsWith("-")).pop();
    if (!user) { appendOutput("chage: missing user name", "error"); return; }
    if (!users.has(user)) { appendOutput("chage: user '" + user + "' does not exist in /etc/passwd", "error"); return; }
    const listMode = args.includes("-l");
    // Handle -M 90 and -M90 forms
    const mIdx = args.findIndex((a) => a.startsWith("-M"));
    if (mIdx >= 0 && !listMode) {
      const attached = args[mIdx].slice(2);
      const days = parseInt(attached || args[mIdx + 1], 10);
      if (!isNaN(days)) { appendOutput("chage: maximum password age set to " + days + " days for user " + user); return; }
    }
    if (!listMode && (args.includes("-m") || args.includes("-W") || args.includes("-I"))) {
      appendOutput("chage: password aging settings updated for user " + user);
      return;
    }
    appendOutput("Last password change                                    : Aug 01, 2026\nPassword expires                                        : never\nPassword inactive                                       : never\nAccount expires                                         : never\nMinimum number of days between password change          : 0\nMaximum number of days between password change          : 99999\nNumber of days of warning before password expires       : 7");
  }

  function handleEnv() {
    appendOutput("SHELL=/bin/bash\nUSER=student\nHOME=/home/student\nPATH=/usr/local/bin:/usr/bin:/usr/local/sbin:/usr/sbin\nLANG=en_US.UTF-8\nPWD=" + cwd);
  }

  function handleKill(args, command) {
    const target = args.filter((a) => !a.startsWith("-")).pop();
    if (!target) { appendOutput(command + ": missing operand", "error"); return; }
    if (command === "pkill" || command === "killall") {
      appendOutput("(sent SIGTERM to processes matching '" + target + "')");
      return;
    }
    appendOutput("(sent SIGTERM to process " + target + ")");
  }

  function handleUname(args) {
    if (args.includes("-r")) appendOutput("6.12.0-55.el10.x86_64");
    else if (args.includes("-a")) appendOutput("Linux rhel10.rcw.local 6.12.0-55.el10.x86_64 #1 SMP PREEMPT_DYNAMIC Wed Jul 15 10:00:00 UTC 2026 x86_64 x86_64 x86_64 GNU/Linux");
    else appendOutput("Linux");
  }

  function handlePs(args) {
    appendOutput("    PID TTY          TIME CMD\n   1420 pts/0    00:00:00 bash\n   1582 pts/0    00:00:00 ps");
  }

  function handleSystemctl(args) {
    const action = (args[0] || "").toLowerCase();
    const unit = (args.filter((a) => !a.startsWith("-")).pop() || "").toLowerCase();
    if (action === "list-units" || action === "list-unit-files") {
      const lines = Object.keys(services).map((s) => s + ".service " + (services[s].enabled ? "enabled" : "disabled"));
      appendMultiline(lines.join("\n"));
      return;
    }
    if (unit && services[unit]) {
      if (action === "status") {
        const svc = services[unit];
        appendOutput("● " + unit + ".service - " + svc.desc + "\n     Loaded: loaded (/usr/lib/systemd/system/" + unit + ".service; " + (svc.enabled ? "enabled" : "disabled") + ")\n     Active: " + (svc.active ? "active (running)" : "inactive (dead)") + " since Sun 2026-08-16 08:00:00 IST; 2h ago");
      } else if (action === "enable" || action === "enable" + "") {
        services[unit].enabled = true;
        appendOutput("Created symlink /etc/systemd/system/multi-user.target.wants/" + unit + ".service");
      } else if (action === "start" || action === "restart" || action === "reload") {
        services[unit].active = true;
        appendOutput((action === "reload" ? "Reloaded" : "Started") + " " + unit + ".service");
      } else if (action === "stop") {
        services[unit].active = false;
        appendOutput("Stopped " + unit + ".service");
      } else if (action === "disable") {
        services[unit].enabled = false;
        appendOutput("Removed /etc/systemd/system/multi-user.target.wants/" + unit + ".service");
      } else if (action === "enable" && args.includes("--now")) {
        services[unit].enabled = true; services[unit].active = true;
        appendOutput("Created symlink .../" + unit + ".service\nStarted " + unit + ".service");
      } else {
        appendOutput("systemctl: unknown action '" + action + "'");
      }
      return;
    }
    if (unit) { appendOutput("Failed to " + (action || "query") + " " + unit + ".service: Unit " + unit + ".service could not be found.", "error"); return; }
    appendOutput("systemctl: use 'systemctl status <unit>', 'enable --now <unit>', 'list-units'");
  }

  function handleJournalctl(args) {
    const unit = args.filter((a) => !a.startsWith("-")).pop() || "";
    if (unit && services[unit]) {
      appendOutput("Aug 16 08:00:00 rhel10 systemd[1]: Started " + services[unit].desc + ".\nAug 16 08:00:01 rhel10 " + unit + "[1024]: service started");
      return;
    }
    appendOutput("Aug 16 08:00:00 rhel10 systemd[1]: Starting system...\nAug 16 08:00:05 rhel10 kernel: Linux version 6.12.0-55.el10.x86_64\nAug 16 08:00:10 rhel10 systemd[1]: Reached target Multi-User System.");
  }

  function handleDnf(args, cmd) {
    const joined = args.join(" ").toLowerCase();
    if (cmd.includes("install")) {
      const name = args.filter((a) => !a.startsWith("-") && !["install", "-y"].includes(a.toLowerCase())).pop();
      if (!name) { appendOutput("dnf: install: missing package name", "error"); return; }
      if (packages.has(name)) { appendOutput("Package " + name + " is already installed."); return; }
      packages.add(name);
      appendOutput("Dependencies resolved.\n Package  Arch   Version        Repo            Size\nInstalling:\n " + name.padEnd(10) + " x86_64 1.0-1.el10     rhel-appstream  1.2 M\n\nComplete!");
      return;
    }
    if (cmd.includes("remove")) {
      const name = args.filter((a) => !a.startsWith("-") && !["remove", "-y"].includes(a.toLowerCase())).pop();
      packages.delete(name);
      appendOutput("Removed: " + name + "\nComplete!");
      return;
    }
    if (cmd.includes("search")) {
      const q = args.filter((a) => !a.startsWith("-") && a !== "search").pop() || "";
      appendOutput("Name Matched: " + q + "\n  httpd.x86_64 : The Apache HTTP Server\n  httpd-tools.x86_64 : Tools for httpd");
      return;
    }
    if (cmd.includes("info")) {
      const name = args.filter((a) => !a.startsWith("-") && a !== "info").pop() || "httpd";
      appendOutput("Name         : " + name + "\nVersion      : 2.4.62\nRelease      : 1.el10\nArchitecture : x86_64\nSummary      : A package for " + name);
      return;
    }
    if (cmd.includes("list")) {
      appendMultiline([...packages].sort().map((p) => p + ".x86_64  installed").join("\n"));
      return;
    }
    if (cmd.includes("update") || cmd.includes("upgrade")) {
      appendOutput("Last metadata expiration check: 0:02:11 ago.\nDependencies resolved.\nNothing to do.\nComplete!");
      return;
    }
    if (cmd.includes("repolist")) {
      appendOutput("repo id              repo name\nexample-AppStream    RHEL 10 AppStream\nexample-BaseOS       RHEL 10 BaseOS");
      return;
    }
    appendOutput("dnf: use 'dnf install <pkg>', 'dnf search <pkg>', 'dnf remove <pkg>', 'dnf repolist'");
  }

  function handleRpm(args) {
    const joined = args.join(" ");
    if (/-qa/.test(joined)) { appendMultiline([...packages].sort().join("\n")); return; }
    if (/-q\s+(\S+)/.test(joined)) {
      const m = joined.match(/-q\s+(\S+)/);
      const name = m[1];
      if (packages.has(name)) appendOutput(name + "-1.0-1.el10.x86_64");
      else appendOutput("package " + name + " is not installed");
      return;
    }
    if (/-qi/.test(joined)) {
      const name = joined.match(/-qi\s+(\S+)/)[1];
      appendOutput("Name        : " + name + "\nVersion     : 1.0\nRelease     : 1.el10\nArchitecture: x86_64\nInstall Date: Sun 16 Aug 2026 08:00:00 AM IST");
      return;
    }
    if (/-ql/.test(joined)) {
      const name = joined.match(/-ql\s+(\S+)/)[1];
      appendOutput("/usr/bin/" + name + "\n/usr/share/doc/" + name + "\n/etc/" + name);
      return;
    }
    appendOutput("rpm: use 'rpm -q <pkg>', 'rpm -qa', 'rpm -qi <pkg>', 'rpm -ql <pkg>'");
  }

  function handleSubscription(args) {
    const joined = args.join(" ");
    if (joined.includes("status")) appendOutput("+-------------------------------------------+\n   System Status Details\n+-------------------------------------------+\nOverall Status: Disabled (registered but not attached)");
    else if (joined.includes("register")) appendOutput("Registering to: subscription.rhsm.redhat.com:443/subscription\nThe system has been registered with ID: 1a2b3c4d-...");
    else if (joined.includes("auto-attach")) appendOutput("Installed Product Current Status:\nProduct Name: Red Hat Enterprise Linux for x86_64\nStatus:       Subscribed");
    else appendOutput("subscription-manager: use 'status', 'register --auto-attach'");
  }

  // ============================================================
  // STORAGE
  // ============================================================
  function handleLsblk(args) {
    appendOutput("NAME              MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT\nsda                 8:0    0   30G  0 disk\n├─sda1              8:1    0    1G  0 part /boot\n└─sda2              8:2    0   29G  0 part\n  ├─rhel-root     253:0    0   26G  0 lvm  /\n  └─rhel-swap     253:1    0    3G  0 lvm  [SWAP]\nsdb                 8:16   0   20G  0 disk\nsr0                11:0    1 1024M  0 rom");
  }

  function handleFdisk(args) {
    const device = args.filter((a) => !a.startsWith("-")).pop() || "";
    if (/^-l/.test(args.join(" ")) || /-l/.test(device)) {
      appendOutput("Disk /dev/sda: 30 GiB, 32212254720 bytes, 62914560 sectors\nDevice     Boot Start      End  Sectors Size Id Type\n/dev/sda1  *     2048  2099199  2097152   1G 83 Linux\n/dev/sda2      2099200 62914559 60815360  29G 8e Linux LVM\n\nDisk /dev/sdb: 20 GiB, 21474836480 bytes, 41943040 sectors");
      return;
    }
    appendOutput("Welcome to fdisk (util-linux 2.40).\nCommand (m for help): (simulated — use 'fdisk -l' to list disks)");
  }

  function handlePvcreate(args) {
    const target = args.filter((a) => !a.startsWith("-")).pop() || "";
    if (!target) { appendOutput("pvcreate: missing device", "error"); return; }
    if (pvs.some((p) => p.device === target)) { appendOutput('  Physical volume "' + target + '" already initialized.'); return; }
    pvs.push({ device: target, vg: "", size: "20.00g" });
    appendOutput('  Physical volume "' + target + '" successfully created.');
  }

  function handlePvs(cmd) {
    if (cmd === "pvdisplay") {
      appendMultiline(pvs.map((p) => "  --- Physical volume ---\n  PV Name               " + p.device + "\n  VG Name               " + p.vg + "\n  PV Size               " + p.size).join("\n\n"));
      return;
    }
    appendOutput("  PV         VG        Fmt  Attr PSize   PFree\n" + pvs.map((p) => "  " + p.device.padEnd(10) + " " + p.vg.padEnd(8) + " lvm2 a--  " + p.size + "  0").join("\n"));
  }

  function handleVgcreate(args) {
    const name = args.filter((a) => !a.startsWith("-"))[0];
    const devices = args.filter((a) => !a.startsWith("-")).slice(1);
    if (!name) { appendOutput("vgcreate: missing volume group name", "error"); return; }
    if (vgs.some((v) => v.name === name)) { appendOutput("vgcreate: A volume group called '" + name + "' already exists.", "error"); return; }
    vgs.push({ name: name, pvs: devices.length || 1, free: "20.00g", size: "20.00g" });
    appendOutput("  Volume group \"" + name + "\" successfully created");
  }

  function handleVgs(cmd) {
    if (cmd === "vgdisplay") {
      appendMultiline(vgs.map((v) => "  --- Volume group ---\n  VG Name               " + v.name + "\n  VG Size               " + v.size + "\n  PE Size               4.00 MiB\n  Total PE              5120\n  Free  PE / Size       5120 / " + v.free).join("\n\n"));
      return;
    }
    appendOutput("  VG        #PV #LV #SN Attr   VSize   VFree\n" + vgs.map((v) => "  " + v.name.padEnd(10) + " " + v.pvs + "   0   0 wz--n- " + v.size + " " + v.free).join("\n"));
  }

  function handleLvcreate(args) {
    const name = args.filter((a) => !a.startsWith("-") && !/^[-L]/.test(a) && !/^[0-9]/.test(a)).pop();
    if (!name) { appendOutput("lvcreate: missing logical volume name", "error"); return; }
    appendOutput("  Logical volume \"" + name + "\" created.");
  }

  function handleLvextend(args) {
    appendOutput("  Size of logical volume changed.\n  Logical volume successfully resized.\n  (Hint: add -r to resize the filesystem too, or run xfs_growfs.)");
  }

  function handleLvs(cmd) {
    if (cmd === "lvdisplay") {
      appendMultiline(lvs.map((l) => "  --- Logical volume ---\n  LV Path                " + l.path + "\n  VG Name                " + l.vg + "\n  LV Size                " + l.size).join("\n\n"));
      return;
    }
    appendOutput("  LV     VG       Attr       LSize   Pool Origin\n" + lvs.map((l) => "  " + l.path.split("/").pop().padEnd(7) + " " + l.vg.padEnd(8) + " -wi-ao---- " + l.size).join("\n"));
  }

  function handleMkfs(args, command) {
    const fstype = command === "mkfs.ext4" ? "ext4" : "xfs";
    const target = args.filter((a) => !a.startsWith("-")).pop() || "";
    if (!target) { appendOutput("mkfs." + fstype + ": missing device", "error"); return; }
    appendOutput("meta-data=" + target + "  isize=512    agcount=4\n" + (fstype === "xfs" ? "data     = bsize=4096   blocks=512000" : "Filesystem features: has_journal ext_attr resize_inode dir_index\nCreating journal (4096 blocks)"));
  }

  function handleMount(args) {
    const targets = args.filter((a) => !a.startsWith("-"));
    if (targets.length >= 2) { appendOutput("(mounted " + targets[0] + " on " + targets[1] + ")"); return; }
    appendOutput("/dev/mapper/rhel-root on / type xfs (rw,relatime,seclabel)\n/dev/sda1 on /boot type xfs (rw,relatime,seclabel)\n/dev/vg_data/lv_app on /app type xfs (rw,relatime,seclabel)");
  }

  function handleUmount(args) {
    const target = args.filter((a) => !a.startsWith("-")).pop() || "";
    if (!target) { appendOutput("umount: missing mount point", "error"); return; }
    appendOutput("(unmounted " + target + ")");
  }

  function handleFindmnt(args) {
    appendOutput("TARGET SOURCE                FSTYPE OPTIONS\n/      /dev/mapper/rhel-root  xfs    rw,relatime,seclabel\n/boot  /dev/sda1              xfs    rw,relatime,seclabel\n/app   /dev/vg_data/lv_app    xfs    rw,relatime,seclabel");
  }

  // ============================================================
  // NETWORK
  // ============================================================
  function handleIp(args) {
    const sub = args[0] || "";
    if (sub === "addr" || sub === "a") {
      appendOutput("1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN\n    inet 127.0.0.1/8 scope host lo\n2: ens160: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP\n    inet 192.168.1.10/24 brd 192.168.1.255 scope global dynamic noprefixroute ens160");
      return;
    }
    if (sub === "route" || sub === "r") {
      appendOutput("default via 192.168.1.1 dev ens160 proto dhcp src 192.168.1.10 metric 100\n192.168.1.0/24 dev ens160 proto kernel scope link src 192.168.1.10 metric 100");
      return;
    }
    if (sub === "link" || sub === "l") {
      appendOutput("1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN mode DEFAULT\n2: ens160: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP mode DEFAULT");
      return;
    }
    appendOutput("ip: use 'ip addr', 'ip route', 'ip link'");
  }

  function handleNmcli(args) {
    const joined = args.join(" ");
    if (/con\s+show/.test(joined) || /connection show/.test(joined)) {
      appendOutput("NAME    UUID                                  TYPE      DEVICE\nens160  1a2b3c4d-5678-...                      ethernet  ens160");
      return;
    }
    if (/dev\s+status/.test(joined) || /device status/.test(joined)) {
      appendOutput("DEVICE  TYPE      STATE      CONNECTION\nens160  ethernet  connected  ens160\nlo      loopback  unmanaged  --");
      return;
    }
    if (/general\s+status/.test(joined)) {
      appendOutput("STATE      CONNECTIVITY  WIFI-HW  WIFI     WWAN-HW  WWAN\nconnected  full          enabled  enabled  enabled  enabled");
      return;
    }
    appendOutput("nmcli: use 'nmcli con show', 'nmcli dev status', 'nmcli general status'");
  }

  function handleSs(args) {
    appendOutput("State      Recv-Q Send-Q Local Address:Port  Peer Address:Port  Process\nLISTEN     0      128    0.0.0.0:22           0.0.0.0:*          users:((\"sshd\",pid=1420,fd=3))\nLISTEN     0      128       [::]:22              [::]:*          users:((\"sshd\",pid=1420,fd=4))");
  }

  function handleCurl(args) {
    const url = args.filter((a) => !a.startsWith("-")).pop() || "";
    appendOutput("<html><body><h1>Example Domain</h1><p>This domain is for use in illustrative examples.</p></body></html>");
  }

  // ============================================================
  // SECURITY
  // ============================================================
  function handleFirewall(args) {
    const joined = args.join(" ");
    if (/--list-all|--list-services/.test(joined)) {
      appendOutput("public (active)\n  target: default\n  services: " + firewallServices.join(" ") + "\n  ports: " + firewallPorts.join(" "));
      return;
    }
    if (/--add-service=(\S+)/.test(joined)) {
      const svc = joined.match(/--add-service=(\S+)/)[1];
      if (!firewallServices.includes(svc)) firewallServices.push(svc);
      appendOutput("success\n(Note: run 'firewall-cmd --reload' to apply)");
      return;
    }
    if (/--add-port=(\S+)/.test(joined)) {
      const port = joined.match(/--add-port=(\S+)/)[1];
      if (!firewallPorts.includes(port)) firewallPorts.push(port);
      appendOutput("success");
      return;
    }
    if (/--remove-service=(\S+)/.test(joined)) {
      const svc = joined.match(/--remove-service=(\S+)/)[1];
      firewallServices = firewallServices.filter((s) => s !== svc);
      appendOutput("success");
      return;
    }
    if (/--reload/.test(joined)) { appendOutput("success"); return; }
    if (/--state/.test(joined)) { appendOutput("running"); return; }
    appendOutput("firewall-cmd: use '--list-all', '--add-service=<s>', '--add-port=<p>/tcp', '--reload'");
  }

  function handleSetenforce(args) {
    const mode = args[0];
    if (mode === "0" || mode === "permissive") { selinuxMode = "permissive"; appendOutput(""); }
    else if (mode === "1" || mode === "enforcing") { selinuxMode = "enforcing"; appendOutput(""); }
    else appendOutput("setenforce: Enforcing|Permissive|1|0", "error");
  }

  function handleSemanage(args) {
    const joined = args.join(" ");
    if (/fcontext/.test(joined)) {
      appendOutput("(fcontext entry added — run restorecon to apply)");
      return;
    }
    if (/port/.test(joined)) {
      appendOutput("(port context added)");
      return;
    }
    if (/boolean/.test(joined)) {
      appendOutput("(SELinux boolean updated)");
      return;
    }
    appendOutput("semanage: use 'semanage fcontext -a -t httpd_sys_content_t \"<path>(/.*)?\"'");
  }

  // ============================================================
  // CONTAINERS / CRON
  // ============================================================
  function handlePodman(args) {
    const sub = args[0] || "";
    if (sub === "ps") appendOutput("CONTAINER ID  IMAGE                            COMMAND     CREATED     STATUS      PORTS       NAMES");
    else if (sub === "images") appendOutput("REPOSITORY                TAG         IMAGE ID      CREATED      SIZE\nregistry.access.redhat.com/ubi9/ubi   latest   a1b2c3d4e5f6  3 weeks ago  95 MB");
    else if (sub === "search") appendOutput("NAME                        DESCRIPTION\nregistry.access.redhat.com/ubi9/ubi  Red Hat Universal Base Image 9");
    else if (sub === "pull") { appendOutput("Trying to pull " + (args[1] || "image") + "...\nGetting image source signatures\nCopying blob done\nWriting manifest to image destination\nStoring signatures"); }
    else if (sub === "run") appendOutput("(container started — use 'podman ps' to list it)");
    else if (sub === "rmi") appendOutput("(image removed)");
    else if (sub === "stop") appendOutput("(container stopped)");
    else if (sub === "rm") appendOutput("(container removed)");
    else appendOutput("podman: use 'podman search|pull|run|ps|images|stop|rm|rmi'");
  }

  function handleCrontab(args) {
    if (args.includes("-l")) {
      appendOutput("30 2 * * * /usr/local/bin/backup.sh");
      return;
    }
    if (args.includes("-e")) {
      appendOutput("crontab: use 'crontab -e' with your editor (simulated — list with crontab -l)");
      return;
    }
    appendOutput("crontab: use 'crontab -l' (list) or 'crontab -e' (edit)");
  }

  // ============================================================
  // HELP
  // ============================================================
  function handleHelp(args) {
    const topic = args[0] ? args[0].toLowerCase() : "";
    const guides = {
      tools: "Essential tools:\n  grep PATTERN file        search text\n  sed 's/a/b/g' file       substitute text\n  awk '{print $1}' file    print a column\n  sort file / cut -d: -f1 file\n  uniq file / tr 'a-z' 'A-Z' < file\n  diff a b / find . / wc -l file\n  md5sum file / sha256sum file\n  which cmd / whereis cmd / type cmd\n  tar -czf out.tar.gz dir/ / gzip file",
      scripts: "Shell scripts:\n  cat > script.sh <<EOF\n    #!/bin/bash\n    echo hello\n  EOF\n  chmod +x script.sh\n  bash script.sh",
      system: "Operate systems:\n  systemctl status sshd\n  systemctl enable --now httpd\n  journalctl -u sshd\n  timedatectl / localectl / hostnamectl / uname -a\n  ps aux / top / uptime / free\n  kill <pid> / pkill <name>",
      storage: "Local storage (LVM):\n  lsblk / fdisk -l\n  pvcreate /dev/sdb\n  vgcreate vg_data /dev/sdb\n  lvcreate -n lv_app -L 10G vg_data\n  lvextend -r -l +100%FREE /dev/vg_data/lv_app",
      filesystem: "File systems:\n  mkfs.xfs /dev/sdb1\n  mkfs.ext4 /dev/sdb2\n  mount /dev/sdb1 /mnt\n  umount /mnt / findmnt / df -h\n  mkswap /dev/sdb3 / swapon -a",
      deploy: "Deploy & maintain:\n  dnf install <pkg> / dnf search <pkg>\n  rpm -q <pkg> / rpm -qa / rpm -qi <pkg>\n  subscription-manager status\n  ssh-keygen -t ed25519",
      network: "Networking:\n  nmcli con show / nmcli dev status\n  ip addr / ip route / ping host\n  hostname -I / hostnamectl set-hostname new.name\n  ss -tlnp / curl URL",
      users: "Users & groups:\n  useradd -m -s /bin/bash anna\n  passwd anna / usermod -aG wheel anna\n  chage -l anna / chage -M 90 anna\n  groupadd devs / groupdel devs\n  getent passwd anna / id anna",
      security: "Security & SELinux:\n  firewall-cmd --list-all\n  firewall-cmd --add-service=http --reload\n  sestatus / getenforce / setenforce 0\n  semanage fcontext -a -t httpd_sys_content_t \"/web(/.*)?\"\n  restorecon -Rv /web / chcon / ls -Z",
      containers: "Containers (podman):\n  podman search nginx\n  podman pull nginx\n  podman run -d --name web -p 8080:80 nginx\n  podman ps / podman stop web / podman rm web"
    };
    if (topic && guides[topic]) {
      appendOutput(guides[topic], "info");
      return;
    }
    appendOutput(
      "RHEL 10 practice terminal — command reference (type 'help <topic>'):\n" +
      "  help tools        grep, sed, awk, sort, cut, uniq, tr, md5sum, which\n" +
      "  help scripts      write & run shell scripts\n" +
      "  help system       systemctl, journalctl, timedatectl, hostnamectl, ps\n" +
      "  help storage      LVM: pvcreate, vgcreate, lvcreate, lvextend\n" +
      "  help filesystem   mkfs, mount, umount, mkswap, findmnt, df\n" +
      "  help deploy       dnf, rpm, subscription-manager, ssh-keygen\n" +
      "  help network      nmcli, ip, hostnamectl, ss, curl\n" +
      "  help users        useradd, passwd, usermod, chage, groupadd, getent\n" +
      "  help security     firewall-cmd, SELinux, semanage, restorecon\n" +
      "  help containers   podman search/pull/run/ps\n\n" +
      "Shell utilities: pwd ls cd cat head tail touch mkdir rm cp mv echo\n" +
      "  grep wc sort cut sed awk uniq tr find file stat ln chmod chown tar gzip\n" +
      "  diff md5sum sha256sum which env df du whoami id history clear man <cmd>",
      "info"
    );
  }

  function handleMan(args) {
    const topic = args[0] || "";
    const pages = {
      ls: "LS(1)\nNAME\n    ls - list directory contents\nOPTIONS\n    -l  long listing\n    -a  show hidden\n    -Z  SELinux context",
      dnf: "DNF(8)\nNAME\n    dnf - package manager for RPM-based distributions\nSYNOPSIS\n    dnf install|remove|search|info PACKAGE",
      systemctl: "SYSTEMCTL(1)\nNAME\n    systemctl - control the systemd system and service manager\nSYNOPSIS\n    systemctl enable --now UNIT",
      firewalld: "FIREWALL-CMD(1)\nNAME\n    firewall-cmd - manage firewalld\nSYNOPSIS\n    firewall-cmd --add-service=http --reload",
      lvextend: "LVEXTEND(8)\nNAME\n    lvextend - extend a logical volume\nOPTIONS\n    -r          resize the filesystem too\n    -l +100%FREE  use all free extents"
    };
    appendOutput(pages[topic] || (topic ? "No manual entry for " + topic : "What manual page do you want?"), pages[topic] ? "info" : "error");
  }

  // ============================================================
  // BOOT
  // ============================================================
  $("#launchButton").addEventListener("click", () => {
    showScreen("lab");
    startTimer();
    appendOutput("Welcome to the RHEL 10 practice terminal.\nType 'help' to list commands, or 'help <topic>' for an RHCSA domain guide.", "info");
    updatePrompt();
    setTimeout(() => commandInput.focus(), 180);
  });

  $("#fullscreenButton").addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        toast("Focus mode enabled.");
      } else await document.exitFullscreen();
    } catch { toast("Focus mode is not available in this browser."); }
  });

  updatePrompt();
})();
