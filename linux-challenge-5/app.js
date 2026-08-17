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
    init: $("#taskInit"),
    kubectl: $("#taskKubectl"),
    cni: $("#taskCni")
  };

  const K8S_VERSION = "v1.30.2";
  const POD_CIDR = "10.244.0.0/16";
  const FLANNEL_MANIFEST = "https://raw.githubusercontent.com/flannel-io/flannel/master/Documentation/kube-flannel.yml";

  const state = {
    learnerName: "",
    toolsInstalled: false,
    install: false,
    init: false,
    kubeconfigCopied: false,
    kubeconfigOwned: false,
    kubectl: false,
    cniApplied: false,
    nodesVerified: false,
    cni: false,
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
    appendOutput("CLT-0501: Node k8s-lab-01 is a fresh Ubuntu 22.04 machine with no cluster running.\nMission: install the Kubernetes tooling, initialise a single-node control plane, configure kubectl, deploy a pod network, and bring the node to Ready.", "warning");
    showScreen("lab");
    startTimer();
    setTimeout(() => commandInput.focus(), 180);
  }

  function resetChallengeState() {
    clearInterval(state.timerId);
    state.toolsInstalled = false;
    state.install = false;
    state.init = false;
    state.kubeconfigCopied = false;
    state.kubeconfigOwned = false;
    state.kubectl = false;
    state.cniApplied = false;
    state.nodesVerified = false;
    state.cni = false;
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
    // Strip an optional leading "sudo " so sudo and non-sudo forms behave identically.
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
      case "kubeadm":
        handleKubeadm(args, cmd);
        break;
      case "kubectl":
        handleKubectl(args, cmd);
        break;
      case "cp":
        handleCp(args, cmd);
        break;
      case "chown":
        handleChown(args, cmd);
        break;
      case "mkdir":
        handleMkdir(args, cmd);
        break;
      case "ls":
        handleLs(args);
        break;
      case "pwd":
        appendOutput("/home/operator");
        break;
      case "whoami":
        appendOutput("operator");
        break;
      case "hostname":
        appendOutput("k8s-lab-01");
        break;
      case "id":
        appendOutput("uid=1000(operator) gid=1000(operator) groups=1000(operator),4(adm),27(sudo)");
        break;
      case "date":
        appendOutput("Sun Aug 16 06:40:11 IST 2026");
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
      const wants = joined.includes("kubelet") && joined.includes("kubeadm") && joined.includes("kubectl");
      if (wants) {
        if (state.toolsInstalled) {
          appendOutput("kubelet is already the newest version (1.30.2-1.1).\nkubeadm is already the newest version (1.30.2-1.1).\nkubectl is already the newest version (1.30.2-1.1).\n0 upgraded, 0 newly installed.");
          return;
        }
        state.toolsInstalled = true;
        appendOutput("Reading package lists... Done\nSetting up kubelet (1.30.2-1.1) ...\nSetting up kubeadm (1.30.2-1.1) ...\nSetting up kubectl (1.30.2-1.1) ...\nkubelet.service is enabled and running.");
        markObjective("install", 20, "✓ Objective 1 passed — kubelet, kubeadm and kubectl were installed. +20 points");
      } else {
        appendOutput(`E: Unable to locate package ${args.filter((a) => !a.startsWith("-") && !["install", "update", "upgrade"].includes(a.toLowerCase())).join(" ") || "?"}`, "error");
      }
      return;
    }
    appendOutput("apt: use 'apt install -y kubelet kubeadm kubectl' or 'apt update'");
  }

  function handleKubeadm(args, cmd) {
    const sub = (args[0] || "").toLowerCase();
    if (sub === "init") {
      if (!state.toolsInstalled) {
        appendOutput("[preflight] Some fatal errors occurred:\n[preflight] kubeadm is not installed. Install the Kubernetes tools first (apt-get install -y kubelet kubeadm kubectl).", "error");
        return;
      }
      if (state.init) {
        appendOutput("[init] A control plane already exists on this node. Run 'kubeadm reset' before re-initialising.", "error");
        return;
      }
      const cidrArg = cmd.includes("--pod-network-cidr");
      appendOutput(
        `[init] Using Kubernetes version: ${K8S_VERSION}\n` +
        `[preflight] Running pre-flight checks\n` +
        `[preflight] Pulling images required for setting up a Kubernetes cluster\n` +
        `[certs] Generating "apiserver" certificate and key\n` +
        `[kubeconfig] Wrote "admin.conf" kubeconfig file\n` +
        `[control-plane] Creating static Pod manifest for "kube-apiserver"\n` +
        `[etcd] Creating static Pod manifest for local etcd in "/etc/kubernetes/manifests"\n` +
        `[mark-control-plane] Marking the node k8s-lab-01 as control-plane\n` +
        `[addons] Applied essential addon: CoreDNS\n` +
        `[addons] Applied essential addon: kube-proxy\n\n` +
        `Your Kubernetes control-plane has initialized successfully!\n\n` +
        `To start using your cluster, run the following as a regular user:\n` +
        `  mkdir -p $HOME/.kube\n` +
        `  sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config\n` +
        `  sudo chown $(id -u):$(id -g) $HOME/.kube/config\n\n` +
        (cidrArg ? "" : "Tip: next time pass --pod-network-cidr=10.244.0.0/16 for Flannel.\n\n") +
        `You can now join worker nodes by running:\n` +
        `kubeadm join 192.168.1.50:6443 --token abcdef.0123456789abcdef --discovery-token-ca-cert-hash sha256:6b8f4c2d9e1a3f7b5c8d0e2f4a6b9c1d3e5f7a9b2c4d6e8f0a1b3c5d7e9f1a`
      );
      markObjective("init", 30, "✓ Objective 2 passed — the control plane was initialised with kubeadm. +30 points");
      return;
    }
    if (sub === "version") {
      appendOutput(`kubeadm version: &version.Info{Major:"1", Minor:"30", GitVersion:"${K8S_VERSION}"}`);
      return;
    }
    if (sub === "token" || cmd.includes("print-join-command")) {
      if (!state.init) { appendOutput("kubeadm: the control plane has not been initialised yet", "error"); return; }
      appendOutput("kubeadm join 192.168.1.50:6443 --token abcdef.0123456789abcdef --discovery-token-ca-cert-hash sha256:6b8f4c2d9e1a3f7b5c8d0e2f4a6b9c1d3e5f7a9b2c4d6e8f0a1b3c5d7e9f1a");
      return;
    }
    if (sub === "reset") {
      appendOutput("[reset] This is a simulated lab — use the 'Reset cluster setup' button to start over.");
      return;
    }
    appendOutput(`kubeadm: unknown command "${sub}" for "kubeadm". Run 'kubeadm init --pod-network-cidr=${POD_CIDR}' to bootstrap.`);
  }

  function handleKubectl(args, cmd) {
    const sub = (args[0] || "").toLowerCase();
    // kubectl requires a configured kubeconfig to talk to the API server.
    if (sub !== "version" && sub !== "help") {
      if (!state.kubeconfigCopied) {
        appendOutput("The connection to the server localhost:8080 was refused — did you configure kubectl?\nHint: sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config", "error");
        return;
      }
    }

    if (sub === "apply") {
      const manifest = args.find((a) => !a.startsWith("-")) || "";
      const isCni = /flannel|calico|cilium|kube-flannel|weave|kube-router/i.test(manifest) || /flannel|calico|cilium|weave|kube-router/i.test(cmd);
      if (isCni) {
        if (state.cniApplied) { appendOutput("Warning: resource pods already exists"); return; }
        state.cniApplied = true;
        appendOutput(`namespace/kube-flannel created\nserviceaccount/flannel created\nclusterrole.rbac.authorization.k8s.io/flannel created\ndaemonset.apps/kube-flannel-ds created`);
        appendOutput("Pod network (Flannel) applied — the node should reach Ready shortly.");
        if (!state.nodesVerified) appendOutput("Run 'kubectl get nodes' to verify the cluster status.", "info");
        return;
      }
      appendOutput(`kubectl apply: unrecognised manifest "${manifest}". Apply the Flannel pod network:\nkubectl apply -f ${FLANNEL_MANIFEST}`, "error");
      return;
    }

    if (sub === "get") {
      const kind = (args[1] || "").toLowerCase();
      if (kind === "nodes" || kind === "node") {
        const status = state.cniApplied ? "Ready" : "NotReady";
        appendOutput(
          "NAME          STATUS   ROLES           AGE   VERSION\n" +
          `k8s-lab-01    ${status}${status === "Ready" ? "    " : "   "}control-plane   2m    ${K8S_VERSION}`
        );
        if (state.cniApplied && !state.nodesVerified) {
          state.nodesVerified = true;
          markObjective("cni", 25, "✓ Objective 4 passed — the pod network is deployed and the node reports Ready. +25 points");
          completeChallenge();
        } else if (!state.cniApplied) {
          appendOutput("The node is NotReady because no pod network is installed yet.\nApply it with: kubectl apply -f " + FLANNEL_MANIFEST, "info");
        }
        return;
      }
      if (kind === "pods" || kind === "pod") {
        if (!state.cniApplied) {
          appendOutput(
            "NAMESPACE      NAME                              READY   STATUS    RESTARTS   AGE\n" +
            "kube-system    coredns-5dd5756b68-fmh2k          0/1     Pending   0          2m\n" +
            "kube-system    kube-proxy-4q7vf                  1/1     Running   0          2m"
          );
          return;
        }
        appendOutput(
          "NAMESPACE      NAME                              READY   STATUS    RESTARTS   AGE\n" +
          "kube-system    coredns-5dd5756b68-fmh2k          1/1     Running   0          3m\n" +
          "kube-system    kube-proxy-4q7vf                  1/1     Running   0          3m\n" +
          "kube-system    kube-flannel-ds-abcde             1/1     Running   0          1m"
        );
        return;
      }
      appendOutput(`kubectl get: unknown resource "${kind}". Try 'kubectl get nodes' or 'kubectl get pods -A'.`, "error");
      return;
    }

    if (sub === "version") {
      appendOutput(`Client Version: ${K8S_VERSION}\nKustomize Version: v5.4.2\nServer Version: ${state.init ? K8S_VERSION : "(server unreachable — control plane not initialised)"}`);
      return;
    }

    if (sub === "cluster-info") {
      if (!state.init) { appendOutput("To further debug and diagnose cluster problems, use 'kubectl cluster-info dump'.\nThe control plane has not been initialised.", "error"); return; }
      appendOutput(`Kubernetes control plane is running at https://192.168.1.50:6443\nCoreDNS is running at https://192.168.1.50:6443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy`);
      return;
    }

    appendOutput(`kubectl: unknown command "${sub}". Use 'kubectl apply -f <manifest>', 'kubectl get nodes', 'kubectl get pods -A', or 'kubectl version'.`);
  }

  function handleCp(args, cmd) {
    const copiesAdminConf = cmd.includes("admin.conf") && (cmd.includes(".kube/config") || cmd.includes(".kube/") || cmd.includes("$HOME/.kube"));
    if (copiesAdminConf) {
      if (!state.init) { appendOutput("cp: cannot stat '/etc/kubernetes/admin.conf': No such file or directory — initialise the control plane first.", "error"); return; }
      state.kubeconfigCopied = true;
      appendOutput("Copied /etc/kubernetes/admin.conf → $HOME/.kube/config");
      checkKubectlObjective();
      return;
    }
    appendOutput(`cp: missing or unsupported operands. Expected: cp -i /etc/kubernetes/admin.conf $HOME/.kube/config`, "error");
  }

  function handleChown(args, cmd) {
    const ownsConfig = cmd.includes("$HOME/.kube/config") || cmd.includes(".kube/config");
    if (ownsConfig) {
      if (!state.kubeconfigCopied) { appendOutput("chown: cannot access '$HOME/.kube/config': No such file or directory — copy the admin kubeconfig first.", "error"); return; }
      state.kubeconfigOwned = true;
      appendOutput("Ownership of $HOME/.kube/config set to operator:operator");
      checkKubectlObjective();
      return;
    }
    appendOutput("chown: missing or unsupported operands. Expected: chown $(id -u):$(id -g) $HOME/.kube/config", "error");
  }

  function handleMkdir(args, cmd) {
    const target = args.filter((a) => !a.startsWith("-")).join(" ") || "";
    if (!target) { appendOutput("mkdir: missing operand", "error"); return; }
    if (target.includes(".kube")) {
      appendOutput("Directory $HOME/.kube ready.");
      return;
    }
    appendOutput(`mkdir: created directory '${target.replace(/\$HOME/, "/home/operator")}'`);
  }

  function handleLs(args) {
    const entries = [".bashrc", ".profile", ".kube/"];
    appendOutput(entries.join("   "));
  }

  function checkKubectlObjective() {
    if (state.kubeconfigCopied && state.kubeconfigOwned) {
      markObjective("kubectl", 25, "✓ Objective 3 passed — kubectl access was configured via the admin kubeconfig. +25 points");
    }
  }

  function showHelp() {
    appendOutput(
      "Cluster setup commands:\n" +
      "  sudo apt-get install -y kubelet kubeadm kubectl   install the Kubernetes tools\n" +
      "  sudo apt-get update                               refresh package lists\n" +
      "  sudo kubeadm init --pod-network-cidr=10.244.0.0/16\n" +
      "                                                    initialise the control plane\n" +
      "  kubeadm version                                   show kubeadm version\n" +
      "  kubeadm token create --print-join-command         show the worker join command\n" +
      "  mkdir -p $HOME/.kube                              prepare the kubectl config dir\n" +
      "  sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config\n" +
      "                                                    copy the admin kubeconfig\n" +
      "  sudo chown $(id -u):$(id -g) $HOME/.kube/config    fix kubeconfig ownership\n" +
      "  kubectl apply -f <flannel-manifest>               deploy the pod network (CNI)\n" +
      "  kubectl get nodes                                 verify the node is Ready\n" +
      "  kubectl get pods -A | kubectl version | kubectl cluster-info\n" +
      "  history | clear | help                            shell utilities",
      "info"
    );
  }

  function handleMan(topic = "") {
    const pages = {
      kubeadm: "KUBEADM(1)\nNAME\n    kubeadm — bootstrap a Kubernetes cluster\nSYNOPSIS\n    kubeadm init --pod-network-cidr=CIDR",
      kubectl: "KUBECTL(1)\nNAME\n    kubectl — control the Kubernetes cluster manager\nSYNOPSIS\n    kubectl get nodes | kubectl apply -f MANIFEST",
      apt: "APT-GET(8)\nNAME\n    apt-get — APT package handling utility\nSYNOPSIS\n    apt-get install -y kubelet kubeadm kubectl"
    };
    appendOutput(pages[topic] || (topic ? `No manual entry for ${topic}` : "What manual page do you want?"), pages[topic] ? "info" : "error");
  }

  function appendCommand(command) {
    const line = document.createElement("div");
    line.className = "output-entry output-command";
    const user = document.createElement("span");
    user.className = "prompt-user";
    user.textContent = "operator@k8s-lab-01";
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
    const completedCount = [state.install, state.init, state.kubectl, state.cni].filter(Boolean).length;
    scoreElement.textContent = String(state.score);
    progressText.textContent = `${completedCount} of 4 complete`;
    progressBar.style.width = `${completedCount * 25}%`;
    Object.entries(taskElements).forEach(([key, element]) => element.classList.toggle("is-complete", state[key]));
  }

  function completeChallenge() {
    if (state.completed || !state.cni) return;
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
    appendOutput("Cluster setup reset. Start by installing the Kubernetes tools.", "info");
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
    const source = `${name}|${now.toISOString()}|${state.elapsedSeconds}|kubernetes-cluster`;
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `RCW-K8S-${datePart}-${(hash >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(-7)}`;
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
    ctx.fillText("Kubernetes Cluster Champion", W / 2, 336);

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
    ctx.fillText("for successfully completing the RCW Kubernetes cluster setup challenge", W / 2, 543);
    ctx.fillText("by installing the tooling, initialising the control plane, configuring kubectl, and deploying a pod network.", W / 2, 574);

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
    drawMeta(ctx, 660, 676, "CHALLENGE", "Single-node Kubernetes cluster setup");
    drawMeta(ctx, 660, 754, "STATUS", "All cluster-bootstrap objectives passed");

    // Founder portrait and signature.
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
    ctx.fillText("Linux & Kubernetes · Challenge 05", W - 98, 921);
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
    return `rcw-kubernetes-challenge-5-${safeName}.${extension}`;
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
