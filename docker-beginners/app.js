/* Docker for Beginners — study + simulated hands-on terminal lab */
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };

  /* ---------- tab switching ---------- */
  var viewStudy = $("#view-study"), viewLab = $("#view-lab");
  function showTab(tab) {
    var isLab = tab === "lab";
    viewStudy.classList.toggle("hidden", isLab);
    viewLab.classList.toggle("hidden", !isLab);
    document.querySelectorAll(".htab").forEach(function (b) {
      b.classList.toggle("active", b.dataset.tab === tab);
    });
    window.scrollTo(0, 0);
    if (isLab) setTimeout(function () { $("#termInput").focus(); }, 100);
  }
  document.querySelectorAll(".htab, [data-tab]").forEach(function (b) {
    b.addEventListener("click", function () { showTab(b.dataset.tab); });
  });
  document.querySelectorAll(".go-lab").forEach(function (b) { b.addEventListener("click", function () { showTab("lab"); }); });

  /* ---------- study "try it" buttons jump to relevant task ---------- */
  var taskHints = {
    0: "docker pull hello-world",
    1: "docker images",
    2: "docker run hello-world",
    3: "docker run -d -p 8080:80 --name web nginx",
    4: "docker ps",
    5: "docker logs web",
    6: "docker exec web cat /etc/os-release",
    7: "docker stop web",
    8: "docker start web",
    9: "docker ps -a",
    10: "docker build -t myapp:1.0 .",
    11: "docker volume create webdata",
    12: "docker run -d --name site -p 8090:80 -v webdata:/usr/share/nginx/html nginx",
    13: "docker network create webnet",
    14: "docker compose up -d"
  };
  document.querySelectorAll(".try").forEach(function (b) {
    b.addEventListener("click", function () {
      highlightTask(+b.dataset.task);
      showTab("lab");
    });
  });

  /* ---------- lab state ---------- */
  function freshState() {
    return {
      images: {},                 // repo:tag -> info
      containers: [],             // {id,name,image,status,ports,volumes,networks,created}
      volumes: [], networks: [], built: [], composed: false,
      history: [], done: {}
    };
  }
  var S = load() || freshState();
  function load() { try { var r = localStorage.getItem("docker-beginners-lab"); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
  function save() { try { localStorage.setItem("docker-beginners-lab", JSON.stringify(S)); } catch (e) {} }

  var CATALOG = {
    "nginx": { size: "192MB", base: "Debian", cmd: "/docker-entrypoint.sh nginx -g 'daemon off;'", ports: "80/tcp",
      logs: ["/docker-entrypoint.sh: /docker-entrypoint.d/ is complete.", "2026/08/31 10:14:02 [notice] nginx/1.25.5", "2026/08/31 10:14:02 [emerg] start worker processes"] },
    "alpine": { size: "7.05MB", base: "Alpine", cmd: "/bin/sh" },
    "ubuntu": { size: "78MB", base: "Ubuntu", cmd: "bash" },
    "hello-world": { size: "13.3kB", base: "scratch", cmd: "/hello", run: "hello" },
    "redis": { size: "117MB", base: "Debian", cmd: "redis-server", ports: "6379/tcp" },
    "postgres:16": { size: "425MB", base: "Debian", cmd: "docker-entrypoint.sh postgres", ports: "5432/tcp" }
  };
  function imgInfo(ref) { return CATALOG[ref] || CATALOG[ref.split(":")[0]] || { size: (40 + Math.floor(Math.random() * 300)) + "MB", base: "Linux", cmd: "/start.sh" }; }

  function hex(n) { var s = ""; for (var i = 0; i < n; i++) s += "0123456789abcdef"[Math.floor(Math.random() * 16)]; return s; }
  function shortId() { return hex(12); }
  function cname() {
    var a = ["keen", "brave", "calm", "epic", "sharp", "warm", "cool", "bold"];
    var b = ["bell", "fox", "ray", "jet", "oak", "sky", "fin", "watt"];
    return a[Math.floor(Math.random() * a.length)] + "_" + b[Math.floor(Math.random() * b.length)];
  }

  /* ---------- task definitions ---------- */
  var TASKS = [
    { t: "Pull your first image", d: "Download the hello-world image from Docker Hub.", chk: function () { return !!S.images["hello-world:latest"]; } },
    { t: "List local images", d: "Show images stored on this host.", chk: function () { return S.history.some(function (h) { return h === "images"; }) && Object.keys(S.images).length > 0; } },
    { t: "Run the hello-world container", d: "Create and run a container from the image.", chk: function () { return S.containers.some(function (c) { return c.image === "hello-world"; }); } },
    { t: "Run nginx detached with a name and port", d: "Background web server publishing port 8080.", chk: function () { var c = S.containers.find(function (x) { return x.name === "web"; }); return c && c.image === "nginx" && c.status === "running" && c.ports.indexOf("0.0.0.0:8080->80/tcp") !== -1; } },
    { t: "List running containers", d: "Show the active containers with ps.", chk: function () { var run = S.containers.filter(function (c) { return c.status === "running"; }).length; return run > 0 && S.history.indexOf("ps") !== -1; } },
    { t: "Check the container logs", d: "View logs of the web container.", chk: function () { return S.done._logs; } },
    { t: "Run a command inside the container", d: "Use exec to inspect the running container.", chk: function () { return S.done._exec; } },
    { t: "Stop the web container", d: "Stop it gracefully.", chk: function () { var c = S.containers.find(function (x) { return x.name === "web"; }); return c && c.status === "exited" && S.done._stop; } },
    { t: "Start it again", d: "Restart the stopped container.", chk: function () { var c = S.containers.find(function (x) { return x.name === "web"; }); return c && c.status === "running" && S.done._restarted; } },
    { t: "List ALL containers (including stopped)", d: "Use ps -a.", chk: function () { return S.history.indexOf("psa") !== -1; } },
    { t: "Build your own image from a Dockerfile", d: "Build and tag myapp:1.0.", chk: function () { return S.built.indexOf("myapp:1.0") !== -1; } },
    { t: "Create a named volume", d: "Persistent storage named webdata.", chk: function () { return S.volumes.indexOf("webdata") !== -1; } },
    { t: "Run a container using the volume", d: "Mount webdata into a container.", chk: function () { return S.containers.some(function (c) { return c.volumes.indexOf("webdata") !== -1 && c.status === "running"; }); } },
    { t: "Create a user-defined network", d: "Name it webnet.", chk: function () { return S.networks.indexOf("webnet") !== -1; } },
    { t: "Bring up an app with Compose", d: "Start a multi-service stack.", chk: function () { return S.composed; } }
  ];
  var highlightIdx = -1;
  function renderTasks() {
    var list = $("#taskList"); list.innerHTML = "";
    var done = TASKS.filter(function (t) { return t.done; }).length;
    TASKS.forEach(function (task, i) {
      var li = document.createElement("li");
      if (task.done) li.classList.add("done");
      if (i === highlightIdx && !task.done) li.classList.add("active");
      li.innerHTML = '<span class="tnum">' + (task.done ? "✓" : (i + 1)) + '</span><span><b>' + task.t + '</b><span class="tcmd">' + esc(taskHints[i] || "") + '</span></span>';
      list.appendChild(li);
    });
    $("#taskBar").style.width = (done / TASKS.length * 100) + "%";
    $("#taskCount").textContent = done + " / " + TASKS.length + " complete";
  }
  function esc(t) { return String(t).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }

  function checkTasks() {
    var before = TASKS.filter(function (t) { return t.done; }).length;
    TASKS.forEach(function (t) { if (!t.done && t.chk()) { t.done = true; } });
    var after = TASKS.filter(function (t) { return t.done; }).length;
    save(); renderTasks();
    if (after > before) {
      var t = TASKS.filter(function (x) { return x.done; })[after - 1];
      toast("✓ Task complete: " + t.t, after === TASKS.length ? "All 15 tasks done — you've covered the Docker basics! 🐳" : (after + " of " + TASKS.length + " complete"), after === TASKS.length ? "info" : "");
    }
  }

  /* ---------- terminal ---------- */
  var out = $("#termOutput"), input = $("#termInput");
  function add(html, cls) {
    var d = document.createElement("div");
    d.className = "line" + (cls ? " " + cls : "");
    d.innerHTML = html; out.appendChild(d);
    $("#terminal").scrollTop = $("#terminal").scrollHeight;
  }
  function echo(cmd) { add('<span class="prompt">root@rcw:~#</span> ' + esc(cmd), "cmd-echo"); }

  function boot() {
    add('<span class="head">RCW Docker Practice Lab</span> — simulated Docker engine v26 (educational, not a real host)', "dim");
    add("Type <span class='ok'>help</span> to see available commands, or follow the tasks on the left.", "dim");
    add("");
  }
  boot();
  renderTasks();

  var commands = {
    help: function () {
      add('<span class="head">Available commands</span>', "ok");
      [
        "docker version | docker info            — engine info",
        "docker pull &lt;image&gt;                  — download an image",
        "docker images                          — list images",
        "docker run [opts] &lt;image&gt; [cmd]       -d -p h:c --name -v src:dst --network -e -it --rm",
        "docker ps [-a]                         — list containers",
        "docker logs &lt;name&gt;                    — view logs",
        "docker exec &lt;name&gt; &lt;cmd&gt;               — run a command in a container",
        "docker stop | start | restart | rm &lt;name&gt;",
        "docker rmi &lt;image&gt;                     — remove an image",
        "docker build -t name:tag .             — build from Dockerfile",
        "docker volume create|ls|rm &lt;name&gt;",
        "docker network create|ls|rm &lt;name&gt;",
        "docker compose up -d | ps | down       — multi-service stacks",
        "docker system prune                    — cleanup",
        "clear                                  — clear the screen"
      ].forEach(function (l) { add(l); });
    },
    clear: function () { out.innerHTML = ""; }
  };

  function run(cmd) {
    echo(cmd);
    var toks = tokenize(cmd.trim());
    if (!toks.length) return;
    if (toks[0] !== "docker") {
      if (commands[toks[0]]) { commands[toks[0]](); return; }
      if (toks[0] === "ls") return add("total 0\ndrwxr-xr-x  Dockerfile  docker-compose.yml");
      add("bash: " + esc(toks[0]) + ": command not found (this lab simulates Docker commands — type <span class='ok'>help</span>)", "err");
      return;
    }
    var sub = toks[1];
    if (!sub) return add("Run 'docker help' or 'docker version'.", "warn");
    if (sub === "version" || sub === "--version" || sub === "-v") return add("Docker version 26.1.4, build simulated (educational lab)", "ok");
    if (sub === "info") return dockerInfo();
    if (sub === "pull") return dockerPull(toks[2]);
    if (sub === "images" || sub === "image") { S.history.push("images"); return dockerImages(); }
    if (sub === "rmi") return dockerRmi(toks[2]);
    if (sub === "run") return dockerRun(toks.slice(2));
    if (sub === "ps") return dockerPs(toks.indexOf("-a") !== -1 || toks.indexOf("--all") !== -1);
    if (sub === "logs") return dockerLogs(toks[2]);
    if (sub === "exec") return dockerExec(toks.slice(2));
    if (sub === "stop") return dockerLifecycle(toks[2], "stop");
    if (sub === "start") return dockerLifecycle(toks[2], "start");
    if (sub === "restart") return dockerLifecycle(toks[2], "restart");
    if (sub === "rm") return dockerRm(toks[2], toks.indexOf("-f") !== -1 || toks.indexOf("--force") !== -1);
    if (sub === "build") return dockerBuild(toks.slice(2));
    if (sub === "volume") return volume(toks.slice(2));
    if (sub === "network") return network(toks.slice(2));
    if (sub === "compose" || sub === "docker-compose") return compose(toks.slice(2));
    if (sub === "system" && toks[2] === "prune") return prune();
    add("docker: '" + esc(sub) + "' is not supported in this beginner lab. Type <span class='ok'>help</span>.", "warn");
  }

  function tokenize(str) {
    var out = [], re = /"([^"]*)"|'([^']*)'|(\S+)/g, m;
    while ((m = re.exec(str))) out.push(m[1] !== undefined ? m[1] : (m[2] !== undefined ? m[2] : m[3]));
    return out;
  }

  function dockerInfo() {
    add("Containers: " + S.containers.length + " (running: " + S.containers.filter(function (c) { return c.status === "running"; }).length + ")", "");
    add("Images: " + Object.keys(S.images).length);
    add("Server Version: 26.1.4-simulated");
    add("Storage Driver: overlay2  ·  Backing: educational");
  }

  function dockerPull(ref) {
    if (!ref) return add("docker pull requires an image name, e.g. <span class='ok'>docker pull nginx</span>", "err");
    var repo = ref.indexOf(":") === -1 ? ref + ":latest" : ref;
    if (S.images[repo]) return add("Status: Image is up to date for " + esc(repo), "dim");
    add("Using default tag: latest", "dim");
    add("latest: Pulling from library/" + repo.split(":")[0]);
    var layers = 3 + Math.floor(Math.random() * 2);
    for (var i = 0; i < layers; i++) add(hex(12) + ": Pull complete");
    add("Status: Downloaded newer image for " + esc(repo), "ok");
    S.images[repo] = imgInfo(repo); save(); checkTasks();
  }

  function dockerImages() {
    var keys = Object.keys(S.images);
    if (!keys.length) return add("REPOSITORY   TAG   IMAGE ID   CREATED   SIZE\n(no images yet — try <span class='ok'>docker pull hello-world</span>)");
    add("REPOSITORY      TAG       IMAGE ID       CREATED        SIZE", "head");
    keys.forEach(function (k) {
      var parts = k.split(":"), info = S.images[k];
      add(pad(parts[0], 16) + pad(parts[1], 10) + pad(hex(12).slice(0, 12), 15) + "2 minutes ago " + info.size);
    });
  }
  function pad(s, n) { s = String(s); while (s.length < n) s += " "; return s; }

  function ensureImage(ref) {
    var repo = ref.indexOf(":") === -1 ? ref + ":latest" : ref;
    if (!S.images[repo]) { add("Unable to find image '" + esc(repo) + "' locally", "dim"); dockerPull(ref); }
    return repo;
  }

  function dockerRun(toks) {
    var opts = { d: false, it: false, rm: false, name: "", ports: [], volumes: [], network: "bridge", env: [] };
    var i = 0, image = null, cmd = [];
    while (i < toks.length) {
      var t = toks[i];
      if (t === "-d" || t === "--detach") opts.d = true;
      else if (t === "-it" || t === "-i" || t === "-t") opts.it = true;
      else if (t === "--rm") opts.rm = true;
      else if (t === "--name") opts.name = toks[++i];
      else if (t === "-p" || t === "--publish") opts.ports.push(toks[++i]);
      else if (t === "-v" || t === "--volume") opts.volumes.push(toks[++i]);
      else if (t === "--network") opts.network = toks[++i];
      else if (t === "-e" || t === "--env") opts.env.push(toks[++i]);
      else if (t.charAt(0) !== "-" && !image) image = t;
      else if (image) cmd.push(t);
      i++;
    }
    if (!image) return add("docker run requires an image, e.g. <span class='ok'>docker run -d -p 8080:80 --name web nginx</span>", "err");
    if (opts.name && S.containers.some(function (c) { return c.name === opts.name; }))
      return add('docker: Error response from daemon: Conflict. The container name "/' + esc(opts.name) + '" is already in use.', "err");
    var repo = ensureImage(image);
    var info = S.images[repo] || imgInfo(repo);
    var name = opts.name || cname();
    var id = shortId();
    var portMaps = opts.ports.map(function (p) { var x = p.split(":"); return "0.0.0.0:" + x[0] + "->" + (x[1] || x[0]) + "/tcp"; });
    var vols = opts.volumes.map(function (v) { return v.split(":")[0]; });
    vols.forEach(function (v) { if (v.charAt(0) !== "/" && S.volumes.indexOf(v) === -1) add("WARNING: volume '" + v + "' is declared but not created (docker volume create " + v + ")", "warn"); });
    var c = { id: id, name: name, image: repo.split(":")[0], status: "running", ports: portMaps, volumes: vols, network: opts.network, created: "just now", rm: opts.rm, info: info };
    S.containers.push(c);

    if (info.run === "hello") {
      add("");
      add("Hello from Docker!", "ok");
      add("This message shows that your installation appears to be working correctly.");
      add("");
      add("To generate this message, Docker took the following steps:");
      add(" 1. The Docker client contacted the Docker daemon.");
      add(" 2. The daemon pulled the \"hello-world\" image.");
      add(" 3. The daemon created a new container from that image which runs the executable that produces the output.");
      c.status = "exited";
    } else if (!opts.d && !opts.it) {
      add(info.base + " container started in the foreground. (In a real terminal it would attach; here it runs. Use <span class='ok'>-d</span> to run detached.)", "dim");
    } else if (opts.it) {
      add("root@" + name + ":/#  <span class='dim'>(interactive shell simulated — type <span class='ok'>exit</span> to leave)</span>", "ok");
      add("Tip: inside you would run commands like 'ls', 'cat /etc/os-release'. In this lab use <span class='ok'>docker exec " + name + " &lt;cmd&gt;</span> from the host.", "dim");
    } else {
      add(id, "ok");
    }
    S.history.push("run"); save(); checkTasks();
  }

  function dockerPs(all) {
    if (all) S.history.push("psa"); else S.history.push("ps");
    var list = S.containers.filter(function (c) { return all || c.status === "running"; });
    add("CONTAINER ID   IMAGE     COMMAND                  STATUS         PORTS                    NAMES", "head");
    if (!list.length) return add(all ? "(no containers yet)" : "(no running containers — use -a to see stopped ones)");
    list.forEach(function (c) {
      var st = c.status === "running" ? "Up about a minute" : "Exited (0) about a minute ago";
      add(pad(c.id.slice(0, 12), 15) + pad(c.image, 10) + pad(c.info.cmd.slice(0, 22), 25) + pad(st, 17) + pad(c.ports.join(", ") || "", 25) + c.name);
    });
  }

  function findC(name) { return S.containers.find(function (c) { return c.name === name || c.id === name || c.id.slice(0, 12) === name; }); }

  function dockerLogs(name) {
    var c = findC(name);
    if (!c) return add('Error response from daemon: No such container: ' + esc(name || ""), "err");
    if (c.info.logs) c.info.logs.forEach(function (l) { add(l); });
    else add("[" + c.image + "] container started. (" + c.info.base + "-based, " + c.info.cmd + ") — no application logs in this simulation.");
    S.done._logs = true; save(); checkTasks();
  }

  function dockerExec(toks) {
    var name = toks[0]; if (!name) return add("Usage: docker exec &lt;container&gt; &lt;command&gt;", "err");
    var c = findC(name);
    if (!c) return add('Error response from daemon: No such container: ' + esc(name), "err");
    if (c.status !== "running") return add('Error response from daemon: Container ' + c.id.slice(0, 12) + ' is not running', "err");
    var cmd = toks.slice(1).join(" ");
    if (/os-release/.test(cmd)) {
      add('PRETTY_NAME="' + c.info.base + ' GNU/Linux (in ' + esc(c.image) + ' container)"');
      add('NAME="' + c.info.base + '"');
      add("ID=" + c.info.base.toLowerCase());
    } else if (/^sh|^bash|^\/bin\/sh/.test(cmd)) {
      add("root@" + c.name + ":/# (interactive shell — run commands inside; type exit to return)", "ok");
    } else if (cmd) {
      add("$ " + esc(cmd), "dim");
      add("(output simulated for the " + esc(c.image) + " container)");
    } else add("(exec with no command)", "warn");
    S.done._exec = true; save(); checkTasks();
  }

  function dockerLifecycle(name, action) {
    var c = findC(name);
    if (!c) return add('Error response from daemon: No such container: ' + esc(name || ""), "err");
    if (action === "stop") {
      if (c.status !== "running") return add("Container " + name + " is already stopped.", "warn");
      c.status = "exited"; S.done._stop = true; add(c.name, "ok");
    } else if (action === "start") {
      if (c.status === "running") return add("Container " + name + " is already running.", "warn");
      c.status = "running"; if (S.done._stop) S.done._restarted = true; add(c.name, "ok");
    } else {
      c.status = "running"; S.done._restarted = true; add(c.name, "ok");
    }
    save(); checkTasks();
  }

  function dockerRm(name, force) {
    var c = findC(name);
    if (!c) return add('Error: No such container: ' + esc(name || ""), "err");
    if (c.status === "running" && !force) return add('Error response from daemon: container is running: stop it first or use <span class="ok">-f</span>', "err");
    S.containers = S.containers.filter(function (x) { return x.id !== c.id; });
    add(c.name, "ok"); save();
  }

  function dockerRmi(ref) {
    var repo = ref && ref.indexOf(":") === -1 ? ref + ":latest" : ref;
    if (!S.images[repo]) return add("Error: No such image: " + esc(ref || ""), "err");
    delete S.images[repo]; add("Untagged: " + esc(repo), "ok"); add("Deleted: " + hex(12)); save();
  }

  function dockerBuild(toks) {
    var tag = null, ctx = ".";
    for (var i = 0; i < toks.length; i++) {
      if (toks[i] === "-t" || toks[i] === "--tag") tag = toks[++i];
      else if (toks[i].charAt(0) !== "-") ctx = toks[i];
    }
    if (!tag) return add("Provide a tag: <span class='ok'>docker build -t myapp:1.0 .</span>", "err");
    add("Sending build context to Docker daemon  4.8MB", "dim");
    add("Step 1/7 : FROM node:20-alpine");
    ensureImage("node:20-alpine");
    add("Step 2/7 : WORKDIR /app");
    add("Step 3/7 : COPY package*.json ./");
    add("Step 4/7 : RUN npm install --omit=dev");
    add(" ---> <span class='dim'>running in " + hex(12) + "</span>");
    add("Step 5/7 : COPY . .");
    add("Step 6/7 : EXPOSE 8080");
    add("Step 7/7 : CMD [\"node\",\"server.js\"]");
    add("Successfully built " + hex(12), "ok");
    add("Successfully tagged " + esc(tag), "ok");
    S.images[tag] = imgInfo(tag); if (S.built.indexOf(tag) === -1) S.built.push(tag);
    save(); checkTasks();
  }

  function volume(toks) {
    var action = toks[0], name = toks[1];
    if (action === "create") {
      if (!name) return add("Usage: docker volume create &lt;name&gt;", "err");
      if (S.volumes.indexOf(name) !== -1) return add(name + " already exists.", "warn");
      S.volumes.push(name); add(name, "ok");
    } else if (action === "ls") {
      add("DRIVER    VOLUME NAME", "head");
      if (!S.volumes.length) add("(no volumes — <span class='ok'>docker volume create webdata</span>)");
      S.volumes.forEach(function (v) { add("local     " + v); });
      return;
    } else if (action === "rm") {
      S.volumes = S.volumes.filter(function (v) { return v !== name; }); add(name, "ok");
    } else if (action === "inspect") {
      add("[{ \"CreatedAt\": \"now\", \"Name\": \"" + esc(name || "") + "\", \"Driver\": \"local\", \"Mountpoint\": \"/var/lib/docker/volumes/" + esc(name || "") + "/_data\" }]");
    } else add("Usage: docker volume create|ls|rm|inspect", "warn");
    save(); checkTasks();
  }

  function network(toks) {
    var action = toks[0], name = toks[1];
    if (action === "create") {
      if (!name) return add("Usage: docker network create &lt;name&gt;", "err");
      if (S.networks.indexOf(name) !== -1) return add(name + " already exists.", "warn");
      S.networks.push(name); add(hex(12), "ok");
    } else if (action === "ls") {
      add("NETWORK ID     NAME        DRIVER    SCOPE", "head");
      add(pad(hex(12).slice(0, 12), 15) + pad("bridge", 12) + "bridge    local");
      add(pad(hex(12).slice(0, 12), 15) + pad("host", 12) + "host      local");
      S.networks.forEach(function (n) { add(pad(hex(12).slice(0, 12), 15) + pad(n, 12) + "bridge    local"); });
      return;
    } else if (action === "rm") { S.networks = S.networks.filter(function (n) { return n !== name; }); add(name, "ok"); }
    else add("Usage: docker network create|ls|rm", "warn");
    save(); checkTasks();
  }

  function compose(toks) {
    var action = toks[0];
    if (action === "up" && toks.indexOf("-d") !== -1) {
      add("[+] Running 5/5", "ok");
      if (S.networks.indexOf("docker-basics_default") === -1) { S.networks.push("docker-basics_default"); add("✔ Network docker-basics_default  Created"); }
      if (S.volumes.indexOf("docker-basics_webdata") === -1) { S.volumes.push("docker-basics_webdata"); add("✔ Volume docker-basics_webdata  Created"); }
      if (!S.containers.find(function (c) { return c.name === "docker-basics-web-1"; })) {
        ensureImage("nginx"); ensureImage("postgres:16");
        S.containers.push({ id: shortId(), name: "docker-basics-web-1", image: "nginx", status: "running", ports: ["0.0.0.0:8080->80/tcp"], volumes: ["docker-basics_webdata"], network: "docker-basics_default", created: "just now", info: imgInfo("nginx") });
        S.containers.push({ id: shortId(), name: "docker-basics-db-1", image: "postgres", status: "running", ports: ["5432/tcp"], volumes: [], network: "docker-basics_default", created: "just now", info: imgInfo("postgres:16") });
        add("✔ Container docker-basics-db-1   Started"); add("✔ Container docker-basics-web-1  Started");
      }
      S.composed = true;
    } else if (action === "ps") {
      add("NAME                    IMAGE      STATUS         PORTS", "head");
      if (!S.composed) return add("(no compose stack — run <span class='ok'>docker compose up -d</span>)");
      add(pad("docker-basics-web-1", 24) + pad("nginx", 11) + "Up (healthy)   0.0.0.0:8080->80/tcp");
      add(pad("docker-basics-db-1", 24) + pad("postgres", 11) + "Up (healthy)   5432/tcp");
      return;
    } else if (action === "logs") {
      add("web-1  | 10.0.0.2 - - GET / 200", "dim"); add("db-1   | PostgreSQL init process complete", "dim");
    } else if (action === "down") {
      S.containers = S.containers.filter(function (c) { return c.network !== "docker-basics_default"; });
      S.composed = false; add("✔ Container docker-basics-web-1  Removed", "ok"); add("✔ Container docker-basics-db-1   Removed", "ok"); add("✔ Network docker-basics_default  Removed");
    } else add("Usage: docker compose up -d | ps | logs | down", "warn");
    save(); checkTasks();
  }

  function prune() {
    var before = S.containers.length;
    S.containers = S.containers.filter(function (c) { return c.status === "running"; });
    add("Deleted stopped containers: " + (before - S.containers.filter(function (c) { return c.status === "running"; }).length));
    add("Total reclaimed space: 1.2GB (simulated)", "ok");
    save();
  }

  /* ---------- input handling ---------- */
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      var cmd = input.value; input.value = "";
      if (cmd.trim()) { S.history_raw = S.history_raw || []; S.history_raw.push(cmd); save(); run(cmd); }
    } else if (e.key === "ArrowUp") {
      var h = S.history_raw || []; input.value = h[h.length - 1] || ""; e.preventDefault();
    }
  });
  $("#terminal").addEventListener("click", function () { input.focus(); });

  $("#resetLab").addEventListener("click", function () {
    if (confirm("Reset the Docker lab? Your containers, images and progress will be cleared.")) {
      S = freshState(); save();
      TASKS.forEach(function (t) { t.done = false; });
      out.innerHTML = ""; boot(); renderTasks();
      toast("Lab reset", "Start fresh with the task list.", "info");
    }
  });

  $("#hintBtn").addEventListener("click", function () {
    var next = TASKS.findIndex(function (t) { return !t.done; });
    if (next === -1) { toast("All tasks complete! 🐳", "Use the reset button to practice again.", "info"); return; }
    highlightIdx = next; renderTasks();
    add('<span class="warn">💡 Hint — task ' + (next + 1) + ': ' + esc(TASKS[next].t) + '</span>');
    add('<span class="ok">   try:</span> ' + esc(taskHints[next]));
    input.focus();
  });

  function highlightTask(i) { highlightIdx = i; renderTasks(); }

  function toast(title, detail, type) {
    var host = document.createElement("div"); host.className = "toast-host";
    var t = document.createElement("div"); t.className = "toast " + (type || "");
    t.innerHTML = '<div class="tt">' + esc(title) + '</div>' + (detail ? '<div class="td">' + esc(detail) + '</div>' : "");
    document.body.appendChild(t);
    setTimeout(function () { t.style.opacity = "0"; t.style.transition = "opacity .3s"; setTimeout(function () { t.remove(); }, 320); }, 5200);
  }
})();
