(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const GAME_SECONDS = 30 * 60;
  const INITIAL_USERS = 2400;
  const INITIAL_REVENUE = 18000;

  const CAUSES = [
    { id: "resolver", label: "Stale service-name resolution after a data-cluster failover" },
    { id: "pool", label: "Application connection pool exhausted by orphaned sessions" },
    { id: "listener", label: "Stale listener configuration retained after an approved release" },
    { id: "credential", label: "Expired private-link client credential retained by the service" }
  ];

  const SCENARIOS = [
    {
      id: "resolver",
      cause: "Stale service-name resolution after a data-cluster failover",
      required: ["dns", "logs", "database"],
      findings: {
        dns: "Public application record: healthy. Internal data endpoint: 10.40.8.22. Application runtime cache: 10.40.8.18 (stale).",
        balancer: "Cloud listener: available. Application targets: 0/2 healthy. Target responses: HTTP 503.",
        server: "Two application nodes are reachable. Service process is running; data-connection workers are blocked.",
        logs: "DATA_CONNECT timeout target=10.40.8.18. Failover event: current primary changed to 10.40.8.22 at 02:14:09.",
        database: "On-premises primary is healthy at 10.40.8.22. Previous primary 10.40.8.18 is retired. Cloud probe cannot reach the cached target."
      },
      states: { dns: "fault", balancer: "fault", server: "fault", database: "healthy" },
      lessons: "Set bounded resolver caching for service endpoints, add a post-failover application probe, and require the recovery runbook to validate the active data endpoint."
    },
    {
      id: "pool",
      cause: "Application connection pool exhausted by orphaned sessions",
      required: ["server", "logs", "database"],
      findings: {
        dns: "Public and private records resolve within policy. No stale responses or record drift detected.",
        balancer: "Cloud listener: available. Application targets alternate between timeout and HTTP 503.",
        server: "Both nodes are reachable. Service process is running. Connection workers: 500/500 occupied; request queue rising.",
        logs: "POOL_ACQUIRE timeout after 30000 ms. Orphaned sessions increased immediately after the reporting job ended.",
        database: "On-premises cluster is healthy. 480 idle sessions belong to the application pool; query latency is within baseline."
      },
      states: { dns: "healthy", balancer: "fault", server: "fault", database: "fault" },
      lessons: "Enforce connection lifetime limits, close sessions when jobs terminate, alert on pool saturation, and test pool recovery during release validation."
    },
    {
      id: "listener",
      cause: "Stale listener configuration retained after an approved release",
      required: ["balancer", "server", "logs"],
      findings: {
        dns: "Application record resolves to the expected cloud edge address. Resolution time is within baseline.",
        balancer: "Listener is healthy, but health probes expect application port 8080. Both targets reject the probe.",
        server: "Nodes are healthy. Application service is listening on stale port 9080; approved runtime configuration specifies 8080.",
        logs: "STARTUP_CONFIG source=runtime-cache listener=9080. Current approved configuration listener=8080. Reload pending.",
        database: "On-premises cluster and private connection are healthy. No failed application data sessions are present."
      },
      states: { dns: "healthy", balancer: "fault", server: "fault", database: "healthy" },
      lessons: "Invalidate runtime configuration during deployment, add listener-port validation to release gates, and compare target health before completing a change."
    },
    {
      id: "credential",
      cause: "Expired private-link client credential retained by the service",
      required: ["server", "logs", "database"],
      findings: {
        dns: "Public and private service records resolve correctly. No record changes occurred during the incident window.",
        balancer: "Cloud listener is available. All application targets return HTTP 503 because downstream initialization failed.",
        server: "Nodes are reachable. Service remains active but reports that its private-link client identity was loaded before the rollover.",
        logs: "PRIVATE_LINK authentication rejected: client credential expired at 02:00:00. Current credential is present in the protected runtime store.",
        database: "On-premises cluster is healthy. Local checks pass; remote application sessions are rejected due to an expired client identity."
      },
      states: { dns: "healthy", balancer: "fault", server: "fault", database: "healthy" },
      lessons: "Reload service identities before expiry, alert on credential age, verify private connectivity after rollover, and document a no-downtime refresh procedure."
    }
  ];

  const ACTION_TITLES = {
    dns: "DNS evidence",
    balancer: "Load-balancer evidence",
    server: "Server evidence",
    logs: "Correlated log evidence",
    database: "Database evidence",
    restart: "Service restart"
  };

  const NODE_BY_ACTION = {
    dns: "#nodeDns",
    balancer: "#nodeBalancer",
    server: "#nodeServer",
    logs: "#nodeServer",
    database: "#nodeDatabase"
  };

  const PHASES = [
    { key: "detect", element: "#phaseDetect", label: "Detect", hint: "Confirm the outage path", points: 20 },
    { key: "analyze", element: "#phaseAnalyze", label: "Analyze", hint: "Correlate required evidence", points: 25 },
    { key: "respond", element: "#phaseRespond", label: "Respond", hint: "Record an evidence-based cause", points: 20 },
    { key: "recover", element: "#phaseRecover", label: "Recover", hint: "Execute the approved runbook", points: 20 },
    { key: "verify", element: "#phaseVerify", label: "Verify", hint: "Prove production health", points: 15 }
  ];

  const screens = {
    welcome: $("#welcomeScreen"),
    game: $("#gameScreen"),
    result: $("#resultScreen"),
    timeout: $("#timeoutScreen")
  };

  const state = {
    learnerName: "",
    scenario: null,
    startedAt: 0,
    endedAt: 0,
    timerId: null,
    penaltySeconds: 0,
    remainingSeconds: GAME_SECONDS,
    potentialScore: 100,
    usersAffected: INITIAL_USERS,
    revenueImpact: INITIAL_REVENUE,
    peakUsers: INITIAL_USERS,
    peakRevenue: INITIAL_REVENUE,
    wrongDecisions: 0,
    actionCount: 0,
    checks: new Set(),
    checkCounts: {},
    postChecks: new Set(),
    diagnosisCorrect: false,
    restarted: false,
    completed: false,
    failed: false,
    phases: { detect: false, analyze: false, respond: false, recover: false, verify: false },
    auditLog: [],
    certificateId: "",
    finalScore: 0
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

  $("#startForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = $("#learnerName");
    const name = cleanName(input.value);
    if (!isValidName(name)) {
      input.setAttribute("aria-invalid", "true");
      $("#nameError").textContent = "Enter a valid name using letters, spaces, apostrophes, hyphens, or periods.";
      input.focus();
      return;
    }
    input.removeAttribute("aria-invalid");
    $("#nameError").textContent = "";
    state.learnerName = name;
    beginGame();
  });

  $("#learnerName").addEventListener("input", () => {
    $("#learnerName").removeAttribute("aria-invalid");
    $("#nameError").textContent = "";
  });

  function randomUint() {
    try {
      const values = new Uint32Array(1);
      window.crypto.getRandomValues(values);
      return values[0];
    } catch (_) {
      return Date.now() >>> 0;
    }
  }

  function shuffled(items) {
    const copy = items.slice();
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swap = randomUint() % (index + 1);
      [copy[index], copy[swap]] = [copy[swap], copy[index]];
    }
    return copy;
  }

  function beginGame() {
    clearInterval(state.timerId);
    state.scenario = SCENARIOS[randomUint() % SCENARIOS.length];
    state.startedAt = Date.now();
    state.endedAt = 0;
    state.penaltySeconds = 0;
    state.remainingSeconds = GAME_SECONDS;
    state.potentialScore = 100;
    state.usersAffected = INITIAL_USERS;
    state.revenueImpact = INITIAL_REVENUE;
    state.peakUsers = INITIAL_USERS;
    state.peakRevenue = INITIAL_REVENUE;
    state.wrongDecisions = 0;
    state.actionCount = 0;
    state.checks = new Set();
    state.checkCounts = {};
    state.postChecks = new Set();
    state.diagnosisCorrect = false;
    state.restarted = false;
    state.completed = false;
    state.failed = false;
    state.phases = { detect: false, analyze: false, respond: false, recover: false, verify: false };
    state.auditLog = [];
    state.certificateId = "";
    state.finalScore = 0;

    resetGameInterface();
    renderDiagnosisOptions();
    renderImpact();
    renderPhases();
    addEvidence("Incident opened", "Application availability probe failed. 2,400 users affected; revenue risk is $18,000 per hour.", "risk", "system");
    addEvidence("Authority confirmed", "Incident commander may run read-only diagnostics and the documented application-service recovery runbook.", "info", "govern");
    showScreen("game");
    updateTimer();
    state.timerId = window.setInterval(updateTimer, 250);
    setActionMessage("Select a diagnostic action to begin.", "");
  }

  function resetGameInterface() {
    $("#evidenceLog").replaceChildren();
    const empty = document.createElement("div");
    empty.className = "evidence-empty";
    empty.id = "evidenceEmpty";
    const mark = document.createElement("span");
    mark.textContent = "+";
    const copy = document.createElement("p");
    copy.textContent = "Your actions and findings will be recorded here.";
    empty.append(mark, copy);
    $("#evidenceLog").append(empty);

    $$(".action-button").forEach((button) => {
      button.disabled = false;
      button.classList.remove("is-used", "is-authorized");
    });
    $$(".topology-node").forEach((node) => node.classList.remove("is-checked", "is-fault", "is-healthy"));
    $("#nodeUsers").classList.add("is-healthy");
    $("#productionStatus").className = "status-pill critical";
    $("#productionStatus").innerHTML = "<i></i> OUTAGE";
    $("#countdownCard").classList.remove("is-urgent");
    $("#diagnosisForm").reset();
    $("#diagnosisForm button").disabled = false;
    $("#readyEvidence").classList.remove("is-ready");
    $("#readyCause").classList.remove("is-ready");
    $("#readyApproval").classList.remove("is-ready");
  }

  function renderDiagnosisOptions() {
    const container = $("#diagnosisOptions");
    container.replaceChildren();
    shuffled(CAUSES).forEach((cause, index) => {
      const wrapper = document.createElement("div");
      wrapper.className = "diagnosis-option";
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "rootCause";
      input.id = `cause-${cause.id}`;
      input.value = cause.id;
      const label = document.createElement("label");
      label.htmlFor = input.id;
      label.textContent = cause.label;
      wrapper.append(input, label);
      container.append(wrapper);
      if (index === 0) input.dataset.first = "true";
    });
  }

  function updateTimer() {
    if (state.completed || state.failed || !state.startedAt) return;
    const realElapsed = Math.floor((Date.now() - state.startedAt) / 1000);
    state.remainingSeconds = Math.max(0, GAME_SECONDS - realElapsed - state.penaltySeconds);
    $("#countdown").textContent = formatDuration(state.remainingSeconds);
    $("#countdown").dateTime = `PT${state.remainingSeconds}S`;
    $("#countdownCard").classList.toggle("is-urgent", state.remainingSeconds <= 300);
    if (state.remainingSeconds <= 0) failGame();
  }

  function formatDuration(totalSeconds) {
    const safe = Math.max(0, Math.floor(totalSeconds));
    const minutes = Math.floor(safe / 60).toString().padStart(2, "0");
    const seconds = (safe % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function incidentElapsed() {
    return Math.min(GAME_SECONDS, GAME_SECONDS - state.remainingSeconds);
  }

  function formatNumber(value) {
    return Number(value).toLocaleString("en-US");
  }

  function formatMoney(value) {
    return `$${formatNumber(value)}/hr`;
  }

  $("#actionGrid").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button || button.disabled || state.completed || state.failed) return;
    handleAction(button.dataset.action, button);
  });

  function handleAction(action, button) {
    state.actionCount += 1;
    if (action === "restart") {
      attemptRestart();
      return;
    }
    inspectAction(action, button);
  }

  function inspectAction(action, button) {
    const afterRecovery = state.restarted;
    const alreadyInPhase = afterRecovery ? state.postChecks.has(action) : state.checks.has(action);
    state.checkCounts[action] = (state.checkCounts[action] || 0) + 1;

    if (alreadyInPhase) {
      applyPenalty({ score: 2, seconds: 15, users: 100, revenue: 750 }, `Repeated ${ACTION_TITLES[action].toLowerCase()} delayed the response.`);
    }

    button.classList.add("is-used");

    if (afterRecovery) {
      state.postChecks.add(action);
      inspectRecoveredService(action);
      return;
    }

    state.checks.add(action);
    const finding = state.scenario.findings[action];
    addEvidence(ACTION_TITLES[action], finding, state.scenario.required.includes(action) ? "info" : "neutral", action);
    revealTopology(action, state.scenario.states[action] || "checked");
    setActionMessage(finding, state.scenario.states[action] === "fault" ? "warning" : "");

    state.phases.detect = state.checks.size >= 1;
    state.phases.analyze = state.scenario.required.every((requiredAction) => state.checks.has(requiredAction));
    updateReadiness();
    renderPhases();
  }

  function revealTopology(action, status) {
    const selector = NODE_BY_ACTION[action];
    if (!selector) return;
    const node = $(selector);
    node.classList.add("is-checked");
    node.classList.remove("is-fault", "is-healthy");
    if (status === "fault") node.classList.add("is-fault");
    if (status === "healthy") node.classList.add("is-healthy");
  }

  function inspectRecoveredService(action) {
    const recoveredFindings = {
      dns: "Public and private records resolve to the current production endpoints. No stale responses detected.",
      balancer: "Listener healthy. Application targets: 2/2 healthy. End-to-end probe: HTTP 200.",
      server: "Application service active on both nodes. Startup checks passed; request queues are draining.",
      logs: "No new critical errors after recovery. Success rate and response time are within baseline.",
      database: "On-premises cluster healthy. New application sessions authenticated and completed validation queries."
    };
    const finding = recoveredFindings[action];
    addEvidence(`Post-recovery ${ACTION_TITLES[action].toLowerCase()}`, finding, "success", `verify-${action}`);
    revealTopology(action, "healthy");
    setActionMessage(finding, "success");

    if (action === "server") {
      state.usersAffected = Math.min(state.usersAffected, 250);
      state.revenueImpact = Math.min(state.revenueImpact, 1800);
    }
    if (action === "balancer") {
      state.usersAffected = Math.min(state.usersAffected, 100);
      state.revenueImpact = Math.min(state.revenueImpact, 900);
    }
    renderImpact();

    if (state.postChecks.has("server") && state.postChecks.has("balancer")) {
      state.phases.verify = true;
      state.usersAffected = 0;
      state.revenueImpact = 0;
      renderImpact();
      renderPhases();
      addEvidence("Production verification passed", "Application nodes healthy, load balancer 2/2, end-to-end probe HTTP 200. Incident closure criteria met.", "success", "close");
      window.setTimeout(completeGame, 700);
    } else {
      setActionMessage("Recovery is progressing. Verify both Server and Load Balancer before closure.", "success");
      renderPhases();
    }
  }

  $("#diagnosisForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (state.completed || state.failed || state.diagnosisCorrect) return;
    const selected = $("input[name='rootCause']:checked");
    if (!selected) {
      setActionMessage("Choose a root cause before submitting the decision.", "warning");
      showToast("Select a root cause supported by the evidence.");
      return;
    }

    state.actionCount += 1;
    const evidenceComplete = state.scenario.required.every((action) => state.checks.has(action));
    if (!evidenceComplete) {
      applyPenalty({ score: 8, seconds: 60, users: 350, revenue: 2500 }, "Diagnosis submitted before the required evidence was collected.");
      addEvidence("Diagnosis rejected", "The decision record lacks the required correlated evidence. Continue read-only investigation.", "risk", "decision");
      setActionMessage("Unsupported diagnosis rejected. Collect the required evidence before authorizing a change.", "danger");
      return;
    }

    if (selected.value !== state.scenario.id) {
      applyPenalty({ score: 12, seconds: 90, users: 500, revenue: 3500 }, "Incorrect root-cause decision increased the outage impact.");
      addEvidence("Root cause not supported", `Rejected decision: ${selected.nextElementSibling.textContent}. Evidence does not support this cause.`, "risk", "decision");
      setActionMessage("The selected cause conflicts with the collected evidence. Reassess before making a change.", "danger");
      selected.checked = false;
      return;
    }

    state.diagnosisCorrect = true;
    state.phases.respond = true;
    addEvidence("Root cause confirmed", state.scenario.cause, "success", "decision");
    setActionMessage("Diagnosis accepted. The controlled application-service restart is now authorized.", "success");
    $$("input[name='rootCause']").forEach((input) => { input.disabled = true; });
    $("#diagnosisForm button").disabled = true;
    revealConfirmedFault();
    updateReadiness();
    renderPhases();
  });

  function revealConfirmedFault() {
    $("#nodeServer").classList.remove("is-healthy");
    $("#nodeServer").classList.add("is-checked", "is-fault");
  }

  function attemptRestart() {
    if (!state.diagnosisCorrect) {
      applyPenalty({ score: 20, seconds: 120, users: 800, revenue: 6000 }, "Blind service restart failed and expanded the business impact.");
      addEvidence("Unauthorized restart failed", "Service restarted without an evidence-based cause. The same dependency failure returned and request queues expanded.", "risk", "restart");
      setActionMessage("Restart failed: root cause was not confirmed. Return to read-only diagnostics.", "danger");
      return;
    }

    state.restarted = true;
    state.phases.recover = true;
    state.usersAffected = Math.min(state.usersAffected, 800);
    state.revenueImpact = Math.min(state.revenueImpact, 6000);
    $("#restartButton").disabled = true;
    $("#restartButton").classList.add("is-used");
    $("#nodeServer").classList.remove("is-fault");
    $("#nodeServer").classList.add("is-checked");
    $("#productionStatus").innerHTML = "<i></i> RECOVERING";
    addEvidence("Approved recovery executed", "Application service restarted on both nodes using the documented runbook. Current runtime configuration and protected dependencies reloaded.", "success", "restart");
    setActionMessage("Service restart completed. Verify both Server and Load Balancer before closing the incident.", "success");
    renderImpact();
    renderPhases();
  }

  function applyPenalty(penalty, reason) {
    state.potentialScore = Math.max(0, state.potentialScore - penalty.score);
    state.penaltySeconds += penalty.seconds;
    state.usersAffected += penalty.users;
    state.revenueImpact += penalty.revenue;
    state.peakUsers = Math.max(state.peakUsers, state.usersAffected);
    state.peakRevenue = Math.max(state.peakRevenue, state.revenueImpact);
    state.wrongDecisions += 1;
    renderImpact();
    updateTimer();
    showToast(`${reason} −${penalty.score} points`);
  }

  function renderImpact() {
    $("#usersAffected").textContent = formatNumber(state.usersAffected);
    $("#revenueImpact").textContent = formatMoney(state.revenueImpact);
    $("#scorePotential").textContent = String(state.potentialScore);
    $("#decisionCount").textContent = `${state.wrongDecisions} wrong decision${state.wrongDecisions === 1 ? "" : "s"}`;
    $("#usersTrend").textContent = state.usersAffected === 0 ? "production restored" : state.usersAffected > INITIAL_USERS ? `+${formatNumber(state.usersAffected - INITIAL_USERS)} from decisions` : "recovery validation in progress";
    $("#revenueTrend").textContent = state.revenueImpact === 0 ? "exposure stopped" : state.revenueImpact > INITIAL_REVENUE ? `+${formatMoney(state.revenueImpact - INITIAL_REVENUE)} escalation` : "current hourly exposure";
  }

  function renderPhases() {
    let completedCount = 0;
    let currentFound = false;
    PHASES.forEach((phase) => {
      const element = $(phase.element);
      const complete = state.phases[phase.key];
      element.classList.toggle("is-complete", complete);
      element.classList.remove("is-current");
      if (complete) completedCount += 1;
      else if (!currentFound) {
        element.classList.add("is-current");
        currentFound = true;
        $("#currentPhase").textContent = phase.label;
        $("#phaseHint").textContent = phase.hint;
      }
    });
    if (completedCount === PHASES.length) {
      $("#currentPhase").textContent = "Closed";
      $("#phaseHint").textContent = "Production verified";
    }
    $("#objectiveText").textContent = `${completedCount}/5`;
  }

  function updateReadiness() {
    const evidenceReady = state.scenario.required.every((action) => state.checks.has(action));
    $("#readyEvidence").classList.toggle("is-ready", evidenceReady);
    $("#readyCause").classList.toggle("is-ready", state.diagnosisCorrect);
    $("#readyApproval").classList.toggle("is-ready", evidenceReady && state.diagnosisCorrect);
    $("#restartButton").classList.toggle("is-authorized", evidenceReady && state.diagnosisCorrect);
  }

  function addEvidence(title, message, type = "neutral", action = "") {
    const empty = $("#evidenceEmpty");
    if (empty) empty.remove();
    const entry = document.createElement("article");
    entry.className = `evidence-entry${type === "risk" ? " is-risk" : type === "success" ? " is-success" : ""}`;
    const time = document.createElement("time");
    time.textContent = `T+${formatDuration(incidentElapsed())}`;
    const heading = document.createElement("strong");
    heading.textContent = title;
    const copy = document.createElement("p");
    copy.textContent = message;
    entry.append(time, heading, copy);
    $("#evidenceLog").append(entry);
    $("#evidenceLog").scrollTop = $("#evidenceLog").scrollHeight;

    state.auditLog.push({
      elapsed: formatDuration(incidentElapsed()),
      action: action || "event",
      title,
      finding: message,
      classification: type,
      usersAffected: state.usersAffected,
      revenueRiskPerHour: state.revenueImpact,
      scorePotential: state.potentialScore
    });
  }

  function setActionMessage(message, type) {
    const element = $("#actionMessage");
    element.className = `action-message${type ? ` is-${type}` : ""}`;
    element.querySelector("p").textContent = message;
  }

  function earnedObjectivePoints() {
    return PHASES.reduce((sum, phase) => sum + (state.phases[phase.key] ? phase.points : 0), 0);
  }

  function failGame() {
    if (state.completed || state.failed) return;
    state.failed = true;
    state.endedAt = Date.now();
    state.remainingSeconds = 0;
    clearInterval(state.timerId);
    state.finalScore = Math.min(state.potentialScore, earnedObjectivePoints());
    addEvidence("Recovery window expired", "The 30-minute recovery objective was not met. Production impact continues and the incident requires escalation.", "risk", "timeout");
    $("#timeoutScore").textContent = `${state.finalScore}/100`;
    showScreen("timeout");
  }

  function completeGame() {
    if (state.completed || state.failed || !state.phases.verify) return;
    state.completed = true;
    state.endedAt = Date.now();
    clearInterval(state.timerId);
    updateTimer();
    state.finalScore = state.potentialScore;
    state.certificateId = makeCertificateId();
    RCWPassport.record({ type: "lab", name: state.learnerName });

    $("#productionStatus").className = "status-pill healthy";
    $("#productionStatus").innerHTML = "<i></i> HEALTHY";
    $$(".action-button").forEach((button) => { button.disabled = true; });

    populateResults();
    window.setTimeout(() => {
      showScreen("result");
      renderCertificate();
      showToast("Production restored. Your final score is ready.");
    }, 650);
  }

  function populateResults() {
    const elapsed = incidentElapsed();
    $("#resultName").textContent = state.learnerName;
    $("#finalScore").textContent = String(state.finalScore);
    $("#scoreRing").style.setProperty("--score", state.finalScore);
    $("#gradeChip").textContent = gradeForScore(state.finalScore);
    $("#finalTime").textContent = formatDuration(elapsed);
    $("#finalActions").textContent = String(state.actionCount);
    $("#finalMistakes").textContent = String(state.wrongDecisions);
    $("#finalUsers").textContent = formatNumber(state.peakUsers);
    $("#finalRevenue").textContent = formatMoney(state.peakRevenue);
    $("#finalCause").textContent = state.scenario.cause;
    $("#lessonsText").textContent = state.scenario.lessons;
    $("#resultSummary").textContent = state.wrongDecisions === 0
      ? "You used correlated evidence, executed the approved recovery, and verified production without increasing the incident impact."
      : `You restored production and completed all response objectives. ${state.wrongDecisions} decision${state.wrongDecisions === 1 ? "" : "s"} increased impact and reduced the final score.`;
  }

  function gradeForScore(score) {
    if (score >= 90) return "ARCHITECT LEVEL";
    if (score >= 75) return "RESPONSE LEAD";
    if (score >= 60) return "RECOVERY COMPLETE";
    return "DEVELOPING PRACTICE";
  }

  function makeCertificateId() {
    const now = new Date();
    const datePart = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("");
    let hash = 2166136261;
    const source = `${state.learnerName}|${now.toISOString()}|${state.finalScore}|${state.scenario.id}|architect`;
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `RCW-ITA-${datePart}-${(hash >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(-7)}`;
  }

  function resetToNewGame() {
    if (!state.learnerName) {
      showScreen("welcome");
      return;
    }
    beginGame();
  }

  $("#replayButton").addEventListener("click", resetToNewGame);
  $("#timeoutReplayButton").addEventListener("click", resetToNewGame);

  $("#fullscreenButton").addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        showToast("Focus mode enabled.");
      } else {
        await document.exitFullscreen();
      }
    } catch (_) {
      showToast("Focus mode is not available in this browser.");
    }
  });

  function showToast(message) {
    const toast = $("#toast");
    toast.querySelector("p").textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(showToast.timerId);
    showToast.timerId = window.setTimeout(() => toast.classList.remove("is-visible"), 3000);
  }

  $("#downloadRecordButton").addEventListener("click", () => {
    if (!state.completed) return;
    const record = {
      recordType: "RCW IT Architect production incident simulation",
      incidentId: "INC-PRD-2400",
      learner: state.learnerName,
      startedAt: new Date(state.startedAt).toISOString(),
      endedAt: new Date(state.endedAt).toISOString(),
      incidentClockElapsed: formatDuration(incidentElapsed()),
      architecture: "Hybrid cloud and on-premises infrastructure",
      confirmedRootCause: state.scenario.cause,
      recovery: "Controlled application service restart followed by server and load-balancer verification",
      finalScore: state.finalScore,
      wrongDecisions: state.wrongDecisions,
      peakUsersAffected: state.peakUsers,
      peakRevenueRiskPerHour: state.peakRevenue,
      controlAlignment: [
        "NIST SP 800-61 Revision 3 incident response practices",
        "ISO/IEC 27001:2022 information security management control principles"
      ],
      alignmentNotice: "Training alignment only; not certification or legal assurance.",
      lessonsAndImprovement: state.scenario.lessons,
      auditTrail: state.auditLog
    };
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" });
    downloadBlob(blob, `rcw-incident-${state.certificateId.toLowerCase()}.json`);
    showToast("Incident record downloaded.");
  });

  const certificateCanvas = $("#certificateCanvas");
  const instructorImage = $("#instructorImage");

  function renderCertificate() {
    if (!state.completed) return;
    const canvas = certificateCanvas;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#f1eee4";
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = 0.035;
    ctx.fillStyle = "#0a2942";
    for (let y = 0; y < height; y += 18) {
      for (let x = (y / 18) % 2 ? 9 : 0; x < width; x += 18) ctx.fillRect(x, y, 1.5, 1.5);
    }
    ctx.restore();

    ctx.strokeStyle = "#071f35";
    ctx.lineWidth = 22;
    ctx.strokeRect(26, 26, width - 52, height - 52);
    ctx.strokeStyle = "#20aee8";
    ctx.lineWidth = 3;
    ctx.strokeRect(48, 48, width - 96, height - 96);
    ctx.strokeStyle = "#c8a84b";
    ctx.lineWidth = 2;
    ctx.strokeRect(62, 62, width - 124, height - 124);

    ctx.fillStyle = "#071f35";
    ctx.fillRect(64, 64, width - 128, 132);
    ctx.fillStyle = "#20aee8";
    ctx.fillRect(64, 190, width - 128, 6);

    roundedRect(ctx, 96, 91, 76, 76, 16);
    ctx.fillStyle = "#168fc5";
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 21px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("RCW", 134, 138);

    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 29px Arial, sans-serif";
    ctx.fillText("IT ARCHITECT", 196, 126);
    ctx.fillStyle = "#70d6ff";
    ctx.font = "800 12px Arial, sans-serif";
    ctx.fillText("RCW IT TRAINING", 198, 151);

    ctx.textAlign = "right";
    ctx.fillStyle = "#88a8bd";
    ctx.font = "700 13px Arial, sans-serif";
    ctx.fillText("DESIGN  •  RESPOND  •  RECOVER  •  IMPROVE", width - 101, 127);
    ctx.fillStyle = "#c6e6f4";
    ctx.font = "500 12px Arial, sans-serif";
    ctx.fillText("www.rcwittraining.in", width - 101, 153);

    ctx.textAlign = "center";
    ctx.fillStyle = "#168fc5";
    ctx.font = "800 14px Arial, sans-serif";
    ctx.fillText("CERTIFICATE OF ACHIEVEMENT", width / 2, 263);
    ctx.fillStyle = "#071f35";
    ctx.font = "700 58px Georgia, serif";
    ctx.fillText("Production Incident Architect", width / 2, 335);

    ctx.fillStyle = "#6b7a84";
    ctx.font = "400 18px Georgia, serif";
    ctx.fillText("This RCW IT Architect achievement is presented to", width / 2, 388);

    ctx.fillStyle = "#092d49";
    setFittedFont(ctx, state.learnerName, 830, 57, 34, "700", "Georgia, serif");
    ctx.fillText(state.learnerName, width / 2, 464);
    const nameWidth = Math.min(830, ctx.measureText(state.learnerName).width + 90);
    const gradient = ctx.createLinearGradient(width / 2 - nameWidth / 2, 0, width / 2 + nameWidth / 2, 0);
    gradient.addColorStop(0, "rgba(22,143,197,0)");
    gradient.addColorStop(.5, "#168fc5");
    gradient.addColorStop(1, "rgba(22,143,197,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(width / 2 - nameWidth / 2, 486, nameWidth, 2);

    ctx.fillStyle = "#526874";
    ctx.font = "400 17px Arial, sans-serif";
    ctx.fillText("for restoring a hybrid production service through evidence-based diagnosis,", width / 2, 537);
    ctx.fillText("controlled recovery, and verified incident closure in the RCW Production Outage Game.", width / 2, 567);

    const badgeX = 202;
    const badgeY = 705;
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, 77, 0, Math.PI * 2);
    ctx.fillStyle = "#071f35";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, 64, 0, Math.PI * 2);
    ctx.strokeStyle = "#c8a84b";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 36px Arial, sans-serif";
    ctx.fillText(String(state.finalScore), badgeX, badgeY + 2);
    ctx.fillStyle = "#6fd6ff";
    ctx.font = "800 12px Arial, sans-serif";
    ctx.fillText("/ 100", badgeX, badgeY + 26);
    ctx.fillStyle = "#697e89";
    ctx.font = "800 10px Arial, sans-serif";
    ctx.fillText("FINAL SCORE", badgeX, badgeY + 103);

    ctx.textAlign = "left";
    drawMeta(ctx, 345, 674, "ISSUED ON", formatCertificateDate(new Date()));
    drawMeta(ctx, 345, 752, "CERTIFICATE ID", state.certificateId);
    drawMeta(ctx, 650, 674, "CHALLENGE", "Hybrid production outage response");
    drawMeta(ctx, 650, 752, "STATUS", "Production recovered and verified");

    const photoX = 1140;
    const photoY = 685;
    ctx.save();
    ctx.beginPath();
    ctx.arc(photoX, photoY, 82, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#0b2d48";
    ctx.fillRect(photoX - 84, photoY - 84, 168, 168);
    if (instructorImage.complete && instructorImage.naturalWidth) {
      drawImageCover(ctx, instructorImage, photoX - 82, photoY - 82, 164, 164, 0.5, 0.25);
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(photoX, photoY, 86, 0, Math.PI * 2);
    ctx.strokeStyle = "#c8a84b";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(photoX, photoY, 94, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(7,31,53,.22)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = "#092d49";
    ctx.font = "italic 700 36px Georgia, serif";
    ctx.fillText("Pradeep Raju", photoX, 822);
    ctx.strokeStyle = "#168fc5";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(photoX - 112, 837);
    ctx.bezierCurveTo(photoX - 50, 826, photoX + 35, 849, photoX + 112, 834);
    ctx.stroke();
    ctx.fillStyle = "#6a7d88";
    ctx.font = "800 10px Arial, sans-serif";
    ctx.fillText("PRADEEP RAJU  •  RCW IT TRAINING", photoX, 861);

    ctx.fillStyle = "#ddd8cc";
    ctx.fillRect(92, 895, width - 184, 1);
    ctx.textAlign = "left";
    ctx.fillStyle = "#778994";
    ctx.font = "500 9.5px Arial, sans-serif";
    ctx.fillText("Independent training achievement — not a professional or standards certification.", 98, 921);
    ctx.textAlign = "right";
    ctx.fillText("RCW IT Architect Challenge · Production Outage Game", width - 98, 921);
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
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
    ctx.font = "700 14px Arial, sans-serif";
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
    return `rcw-production-incident-architect-${safeName}.${extension}`;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
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
    for (let index = 1; index <= 5; index += 1) push(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`);
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
