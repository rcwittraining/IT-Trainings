"use strict";

(function registerValidation(root) {
  const clean = (value) => String(value || "").trim();
  const all = (values) => Array.isArray(values) && values.every(Boolean);
  const points = Object.freeze({ governance: 10, image: 15, identity: 10, cluster: 10, task: 15, network: 15, service: 10, operations: 10, review: 5 });

  const validation = Object.freeze({
    governance(data) {
      return clean(data.name).length >= 2 && data.owner === "Application Service Owner" && data.dataClass === "Internal — synthetic lab transactions" && data.release === "Limited monitored pilot" && all(data.attestations) && data.attestations.length === 3;
    },
    image(data) {
      return clean(data.repository) === "rcw-orders" && data.mutability === "Immutable" && data.scan === "Enhanced — continuous" && data.encryption === "Customer managed KMS key" && data.lifecycle === "Expire untagged after 7 days; retain 20 releases" && data.reference.includes("@sha256:") && !data.reference.includes(":latest") && all(data.evidence) && data.evidence.length === 3;
    },
    identity(data) {
      return data.execution === "Scoped ECR pull, logs write, one secret read" && data.taskRole === "Read orders-config only" && data.delivery === "Secrets Manager ARN reference" && data.encryption === "Customer managed KMS key with scoped policy" && all(data.controls) && data.controls.length === 3;
    },
    cluster(data) {
      return clean(data.name) === "rcw-prod-ecs" && data.infrastructure === "AWS Fargate (serverless)" && data.insights === "Enhanced observability" && data.encryption === "Customer managed KMS key" && data.exec === "Disabled by default; break-glass only" && data.capacity === "FARGATE" && all(data.governance) && data.governance.length === 2;
    },
    task(data) {
      return clean(data.family) === "rcw-orders-web" && data.runtime === "Fargate / awsvpc" && data.platform === "Linux / X86_64" && data.size === "0.5 vCPU / 1 GB" && clean(data.image).includes("@sha256:") && !clean(data.image).includes(":latest") && data.port === "8080 / TCP" && data.user === "Non-root UID 10001" && data.root === "Read only with explicit /tmp volume" && data.privileged === "Disabled" && data.log === "awslogs → /rcw/prod/ecs/orders" && data.logProtection === "90 days / customer managed KMS key" && data.secret === "DB_TOKEN from Secrets Manager ARN" && data.health === "GET /healthz every 30s" && all(data.controls) && data.controls.length === 3;
    },
    network(data) {
      return data.layout === "2 public + 2 private subnets across 2 AZs" && data.taskSubnets === "Private app subnets in AZ-a and AZ-b" && data.publicIp === "Disabled" && data.listener === "HTTPS :443 with ACM certificate" && data.albSecurity === "TCP 443 from approved client CIDR" && data.taskSecurity === "TCP 8080 from ALB security group only" && data.target === "IP / port 8080 / health path /healthz" && data.outbound === "Private endpoints with scoped endpoint policies" && all(data.endpoints) && data.endpoints.length === 4;
    },
    service(data) {
      return clean(data.name) === "rcw-orders-service" && data.task === "rcw-orders-web:1" && data.compute === "FARGATE" && data.desired === "2" && data.platform === "LATEST (approved at release)" && data.deployment === "Rolling update (ECS)" && data.healthy === "100 min / 200 max" && data.circuit === "Circuit breaker + automatic rollback" && data.rebalance === "Enabled" && data.grace === "60 seconds" && data.tags === "Enabled + propagate service tags" && data.exec === "Disabled; controlled break-glass workflow" && all(data.scaling) && data.scaling.length === 3;
    },
    operations(tests) {
      return ["digest", "tls", "health", "availability", "logs", "rollback", "scale"].every((key) => tests && tests[key] === true);
    },
    review(data) {
      const date = new Date(`${data.reviewDate}T00:00:00`);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      return data.decision === "Approve limited monitored pilot" && clean(data.owner).length >= 2 && Number.isFinite(date.getTime()) && date > today && all(data.attestations) && data.attestations.length === 4;
    },
    score(completed) {
      return Object.keys(points).reduce((sum, key) => sum + (completed && completed[key] ? points[key] : 0), 0);
    },
    points
  });

  root.RCWECSLab = validation;
  if (typeof module !== "undefined" && module.exports) module.exports = validation;
})(typeof globalThis !== "undefined" ? globalThis : this);

(function initializeLab() {
  if (typeof document === "undefined") return;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const validation = globalThis.RCWECSLab;
  const STORAGE_KEY = "rcw-ecs-gui-lab-v1";
  const ROUTES = ["overview", "image", "identity", "cluster", "task", "network", "service", "operations", "review"];
  const objectiveKeys = ["governance", "image", "identity", "cluster", "task", "network", "service", "operations", "review"];
  const labels = Object.freeze({ governance: "authorize the workload scope", image: "approve the ECR image", identity: "approve IAM and secrets", cluster: "create the Fargate cluster", task: "register the hardened task definition", network: "create the private network path", service: "create the ECS service", operations: "pass operational validation" });

  const freshState = () => ({
    version: 1,
    currentRoute: "overview",
    learnerName: "",
    completed: { governance: false, image: false, identity: false, cluster: false, task: false, network: false, service: false, operations: false, review: false },
    tests: { digest: false, tls: false, health: false, availability: false, logs: false, rollback: false, scale: false },
    audit: [],
    certificateId: "",
    completedAt: ""
  });

  let state = loadState();
  let toastTimer = 0;
  const instructorImage = new Image();
  instructorImage.src = "pradeep-raju.jpg";

  function loadState() {
    try {
      const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
      if (!stored || stored.version !== 1 || !stored.completed || !stored.tests) return freshState();
      return Object.assign(freshState(), stored, {
        completed: Object.assign(freshState().completed, stored.completed),
        tests: Object.assign(freshState().tests, stored.tests),
        audit: Array.isArray(stored.audit) ? stored.audit.slice(-100) : []
      });
    } catch (_) { return freshState(); }
  }

  function saveState() {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { /* The simulation remains usable without storage. */ }
  }

  function audit(source, event, result = "Success") {
    state.audit.push({ time: new Date().toISOString(), source, event, result, identity: "TrainingRole/RCWLearner" });
    state.audit = state.audit.slice(-100);
    saveState();
  }

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.hidden = false;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.classList.remove("is-visible"); toast.hidden = true; }, 2800);
  }

  function setMessage(selector, message, success = false) {
    const element = $(selector);
    element.textContent = message;
    element.classList.toggle("success", success);
  }

  function openDialog(dialog) {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function closeDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function prerequisites(...keys) { return keys.every((key) => state.completed[key]); }
  function missing(keys) { return keys.filter((key) => !state.completed[key]).map((key) => labels[key]).join(", then "); }

  function requireBefore(keys, messageSelector) {
    if (prerequisites(...keys)) return true;
    setMessage(messageSelector, `First ${missing(keys)}.`);
    return false;
  }

  function complete(key, source, event) {
    if (!state.completed[key]) {
      state.completed[key] = true;
      audit(source, event);
      showToast(`${key.charAt(0).toUpperCase() + key.slice(1)} complete · ${validation.points[key]} points`);
    }
    saveState();
    updateUI();
  }

  function updateUI() {
    const completeCount = objectiveKeys.filter((key) => state.completed[key]).length;
    const score = validation.score(state.completed);
    $("#progressLabel").textContent = `${completeCount} of 9 objectives complete`;
    $("#scoreLabel").textContent = `Score: ${score} / 100`;
    $("#progressBar").style.width = `${score}%`;
    $(".progress-track").setAttribute("aria-valuenow", String(score));
    $$('[data-task-badge]').forEach((badge) => badge.classList.toggle("is-complete", Boolean(state.completed[badge.dataset.taskBadge])));
    $$('[data-objective-status]').forEach((status) => {
      const done = Boolean(state.completed[status.dataset.objectiveStatus]);
      status.textContent = done ? "Complete" : "Required";
      status.classList.toggle("success", done);
    });
    $$('[data-control]').forEach((control) => {
      const done = Boolean(state.completed[control.dataset.control]);
      control.classList.toggle("is-ready", done);
      $(".control-icon", control).textContent = done ? "✓" : "○";
      $(".control-status", control).textContent = done ? "Ready" : "Pending";
    });
    $$('[data-test]').forEach((row) => {
      const passed = Boolean(state.tests[row.dataset.test]);
      row.classList.toggle("passed", passed);
      $(".test-result-icon", row).textContent = passed ? "✓" : "○";
    });
    const testsPassed = Object.values(state.tests).filter(Boolean).length;
    $("#validationStatus").textContent = validation.operations(state.tests) ? "7 / 7 passed" : `${testsPassed} / 7 passed`;
    $("#validationStatus").classList.toggle("success", validation.operations(state.tests));
    if (state.completed.service) {
      $("[data-service-count]").textContent = "2 / 2";
      $("[data-target-count]").textContent = "2 healthy";
      $("[data-az-state]").textContent = "AZ-a + AZ-b";
    }
    $("#reviewReadiness").textContent = prerequisites("governance", "image", "identity", "cluster", "task", "network", "service", "operations") ? "All technical gates passed; accountable approval is ready." : "Complete the first 8 objectives before approval.";
    renderAudit();
  }

  function renderAudit() {
    const body = $("#auditRows");
    body.replaceChildren();
    if (!state.audit.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td"); cell.colSpan = 4; cell.textContent = "Complete objectives to generate evidence."; row.append(cell); body.append(row); return;
    }
    state.audit.slice().reverse().slice(0, 14).forEach((entry) => {
      const row = document.createElement("tr");
      const values = [new Date(entry.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }), entry.source, entry.event, entry.result];
      values.forEach((value) => { const cell = document.createElement("td"); cell.textContent = value; row.append(cell); });
      body.append(row);
    });
  }

  function navigate(route, options = {}) {
    if (!ROUTES.includes(route)) route = "overview";
    state.currentRoute = route;
    $$("[data-view]").forEach((view) => { const active = view.dataset.view === route; view.hidden = !active; view.classList.toggle("is-active", active); });
    $$('[data-route]').forEach((button) => {
      const active = button.dataset.route === route; button.classList.toggle("is-active", active);
      if (button.classList.contains("nav-item")) active ? button.setAttribute("aria-current", "page") : button.removeAttribute("aria-current");
    });
    closeNavigation();
    $("#servicesMenu").hidden = true;
    $("#servicesButton").setAttribute("aria-expanded", "false");
    if (options.hash !== false && location.hash !== `#${route}`) history.replaceState(null, "", `#${route}`);
    saveState();
    if (options.focus !== false) $("#mainContent").focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  function openNavigation() {
    $("#serviceNavigation").classList.add("is-open"); $("#navigationScrim").hidden = false; $("#menuButton").setAttribute("aria-expanded", "true");
  }
  function closeNavigation() {
    $("#serviceNavigation").classList.remove("is-open"); $("#navigationScrim").hidden = true; $("#menuButton").setAttribute("aria-expanded", "false");
  }

  function values(...ids) { return ids.map((id) => $(`#${id}`).checked); }

  $("#governanceForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = { name: $("#learnerName").value, owner: $("#workloadOwner").value, dataClass: $("#dataClass").value, release: $("#releaseScope").value, attestations: values("scopeSynthetic", "scopeOwner", "scopeIac") };
    if (!validation.governance(data)) { setMessage("#governanceMessage", "Enter your name, choose the Application Service Owner, synthetic internal data, and a limited monitored pilot; then accept all three guardrails."); return; }
    state.learnerName = data.name.trim();
    complete("governance", "Governance", "Workload boundary approved");
    setMessage("#governanceMessage", "Workload scope approved. Production remains subject to qualified organizational review.", true);
  });

  $("#imageForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!requireBefore(["governance"], "#imageMessage")) return;
    const data = { repository: $("#repositoryName").value, mutability: $("#tagMutability").value, scan: $("#scanMode").value, encryption: $("#ecrEncryption").value, lifecycle: $("#lifecyclePolicy").value, reference: $("#imageReference").value, evidence: values("sbomCheck", "vulnCheck", "signCheck") };
    if (!validation.image(data)) { setMessage("#imageMessage", "Use repository rcw-orders, immutable tags, enhanced continuous scanning, customer-managed KMS encryption, the defined lifecycle, the digest-pinned image, and all promotion evidence."); return; }
    complete("image", "Amazon ECR", "Repository created; digest approved");
    audit("Amazon Inspector", "Image scan: 0 critical, 0 unapproved high");
    setMessage("#imageMessage", "Repository and immutable image digest approved for this simulated release.", true);
  });

  $("#identityForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!requireBefore(["image"], "#identityMessage")) return;
    const data = { execution: $("#executionPolicy").value, taskRole: $("#taskRole").value, delivery: $("#secretDelivery").value, encryption: $("#secretEncryption").value, controls: values("iamFederation", "iamPassRole", "iamTrail") };
    if (!validation.identity(data)) { setMessage("#identityMessage", "Keep execution and task roles separate, scope each permission, reference the KMS-encrypted secret, and enable all identity controls."); return; }
    complete("identity", "AWS IAM", "Least-privilege ECS roles approved");
    audit("Secrets Manager", "KMS-encrypted secret reference approved");
    setMessage("#identityMessage", "Build, execution, and task responsibilities are separated without static credentials.", true);
  });

  $("#clusterForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!requireBefore(["identity"], "#clusterMessage")) return;
    const data = { name: $("#clusterName").value, infrastructure: $("#clusterInfra").value, insights: $("#containerInsights").value, encryption: $("#ephemeralEncryption").value, exec: $("#executeCommand").value, capacity: $("#capacityProvider").value, governance: values("clusterTags", "clusterBudget") };
    if (!validation.cluster(data)) { setMessage("#clusterMessage", "Create rcw-prod-ecs with Fargate, enhanced observability, customer-managed encryption, FARGATE capacity, controlled ECS Exec, tags, and cost ownership."); return; }
    complete("cluster", "Amazon ECS", "Cluster rcw-prod-ecs created");
    setMessage("#clusterMessage", "Fargate cluster created with enhanced observability and governance controls.", true);
  });

  $("#taskForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!requireBefore(["cluster"], "#taskMessage")) return;
    const data = { family: $("#taskFamily").value, runtime: $("#taskRuntime").value, platform: $("#taskPlatform").value, size: $("#taskSize").value, image: $("#taskImage").value, port: $("#containerPort").value, user: $("#containerUser").value, root: $("#rootFilesystem").value, privileged: $("#privilegedMode").value, log: $("#logDriver").value, logProtection: $("#logProtection").value, secret: $("#taskSecret").value, health: $("#containerHealth").value, controls: values("dropCaps", "essentialContainer", "noSensitiveEnv") };
    if (!validation.task(data)) { setMessage("#taskMessage", "Use the supplied Fargate/awsvpc size and digest, port 8080, non-root user, read-only root, no privilege, protected awslogs, secret ARN, health check, and all runtime constraints."); return; }
    complete("task", "Amazon ECS", "Task definition rcw-orders-web:1 registered");
    audit("CloudWatch Logs", "Encrypted log group /rcw/prod/ecs/orders configured");
    setMessage("#taskMessage", "Task definition revision 1 registered with required runtime controls.", true);
  });

  $("#networkForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!requireBefore(["task"], "#networkMessage")) return;
    const data = { layout: $("#vpcLayout").value, taskSubnets: $("#taskSubnets").value, publicIp: $("#publicIp").value, listener: $("#albListener").value, albSecurity: $("#albSecurity").value, taskSecurity: $("#taskSecurity").value, target: $("#targetGroup").value, outbound: $("#outboundPath").value, endpoints: values("endpointEcr", "endpointS3", "endpointOps", "flowLogs") };
    if (!validation.network(data)) { setMessage("#networkMessage", "Use two public and two private subnets across two AZs, private tasks without public IPs, HTTPS, SG-to-SG ingress, an IP target group, private endpoints, and Flow Logs."); return; }
    complete("network", "Amazon VPC", "Private multi-AZ network path created");
    audit("Elastic Load Balancing", "HTTPS listener and IP target group created");
    setMessage("#networkMessage", "Public HTTPS terminates at the ALB; task ingress and service dependencies stay private.", true);
  });

  $("#serviceForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!requireBefore(["network"], "#serviceMessage")) return;
    const data = { name: $("#serviceName").value, task: $("#serviceTask").value, compute: $("#serviceCompute").value, desired: $("#desiredTasks").value, platform: $("#platformVersion").value, deployment: $("#deploymentType").value, healthy: $("#healthyPercent").value, circuit: $("#circuitBreaker").value, rebalance: $("#azRebalance").value, grace: $("#healthGrace").value, tags: $("#managedTags").value, exec: $("#serviceExec").value, scaling: values("scalingBounds", "scalingCpu", "scalingLoad") };
    if (!validation.service(data)) { setMessage("#serviceMessage", "Deploy revision 1 on FARGATE with two tasks, latest approved platform, safe rolling percentages, rollback, AZ rebalancing, 60-second grace, managed tags, controlled Exec, and bounded autoscaling."); return; }
    complete("service", "Amazon ECS", "Service reached steady state: 2/2 tasks");
    audit("Elastic Load Balancing", "Two healthy targets across AZ-a and AZ-b");
    setMessage("#serviceMessage", "Service reached a simulated steady state with two healthy private tasks.", true);
  });

  $("#runValidationButton").addEventListener("click", () => {
    if (!requireBefore(["service"], "#operationsMessage")) return;
    ["digest", "tls", "health", "availability", "logs", "scale"].forEach((key) => { state.tests[key] = true; });
    audit("RCW Release Validator", "Image, TLS, health, multi-AZ, telemetry, and autoscaling checks passed");
    audit("Application Auto Scaling", "Scale 2 → 4 → 2 completed within policy");
    saveState(); updateUI();
    setMessage("#operationsMessage", state.tests.rollback ? "All seven checks passed." : "Six checks passed. Run the failed-deployment rollback drill to finish.", state.tests.rollback);
    if (validation.operations(state.tests)) complete("operations", "RCW Release Validator", "All operational checks passed");
  });

  $("#runRollbackButton").addEventListener("click", () => {
    if (!requireBefore(["service"], "#operationsMessage")) return;
    state.tests.rollback = true;
    audit("Amazon ECS", "Revision 2 failed health checks; circuit breaker triggered", "Expected failure");
    audit("Amazon ECS", "Automatic rollback restored rcw-orders-web:1");
    saveState(); updateUI();
    setMessage("#operationsMessage", validation.operations(state.tests) ? "All seven checks passed; the last healthy revision was restored." : "Rollback drill passed. Run the release validation suite to finish.", validation.operations(state.tests));
    if (validation.operations(state.tests)) complete("operations", "RCW Release Validator", "All operational checks passed");
  });

  $("#reviewForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const prior = ["governance", "image", "identity", "cluster", "task", "network", "service", "operations"];
    if (!requireBefore(prior, "#reviewMessage")) return;
    const data = { decision: $("#releaseDecision").value, owner: $("#riskOwner").value, reviewDate: $("#reviewDate").value, attestations: values("reviewEvidence", "reviewIncident", "reviewChange", "reviewCleanup") };
    if (!validation.review(data)) { setMessage("#reviewMessage", "Approve only the limited monitored pilot, name a residual-risk owner, choose a future review date, and accept all four evidence statements."); return; }
    state.completedAt = new Date().toISOString();
    state.certificateId = state.certificateId || makeCertificateId(state.learnerName);
    complete("review", "Human Release Review", "Limited monitored pilot approved");
    setMessage("#reviewMessage", "Pilot approved. Production authorization remains outside this educational simulation.", true);
    $("#finalScore").textContent = String(validation.score(state.completed));
    renderCertificate();
    openDialog($("#completionDialog"));
  });

  function evidencePayload() {
    return {
      schema: "rcw-ecs-lab-evidence/v1",
      generatedAt: new Date().toISOString(),
      simulation: true,
      cloudResourcesCreated: false,
      learner: state.learnerName || null,
      score: validation.score(state.completed),
      completedObjectives: Object.assign({}, state.completed),
      validationTests: Object.assign({}, state.tests),
      architecture: {
        region: "us-east-1 (simulated)", cluster: "rcw-prod-ecs", launchType: "FARGATE", service: "rcw-orders-service", desiredTasks: 2,
        image: "digest pinned; immutable; enhanced continuous scan", taskRuntime: "non-root; read-only root; non-privileged", network: "HTTPS ALB; private tasks in two AZs; no public task IP", deployment: "rolling; circuit breaker; automatic rollback", autoscaling: "min 2; max 6; CPU target 60%"
      },
      controlAlignment: ["NIST CSF 2.0 Govern/Identify/Protect/Detect/Respond/Recover", "ISO/IEC 27001 risk-based ISMS control evidence", "AWS Security Hub CSPM ECS and ECR control intent", "CIS AWS Foundations account-level prerequisites"],
      disclaimer: "Educational control alignment only; not a compliance certification or production authorization.",
      certificateId: state.certificateId || null,
      completedAt: state.completedAt || null,
      events: state.audit.slice()
    };
  }

  function safeFilename(value) { return String(value || "learner").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "learner"; }
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1200);
  }
  function downloadEvidence() {
    const data = JSON.stringify(evidencePayload(), null, 2);
    downloadBlob(new Blob([data], { type: "application/json" }), `rcw-ecs-lab-evidence-${safeFilename(state.learnerName)}.json`);
    showToast("Evidence JSON downloaded");
  }
  ["#downloadEvidenceTopButton", "#downloadEvidenceButton", "#downloadEvidenceDialogButton"].forEach((selector) => $(selector).addEventListener("click", downloadEvidence));

  function makeCertificateId(name) {
    let hash = 2166136261;
    `${name}|${new Date().toISOString()}|ecs`.split("").forEach((character) => { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); });
    return `RCW-ECS-${new Date().getFullYear()}-${(hash >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
  }
  function fittedFont(ctx, text, maxWidth, start, min, weight, family) {
    let size = start; do { ctx.font = `${weight} ${size}px ${family}`; size -= 1; } while (ctx.measureText(text).width > maxWidth && size >= min); return size + 1;
  }
  function drawImageCover(ctx, image, x, y, width, height) {
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight); const sw = width / scale; const sh = height / scale; const sx = (image.naturalWidth - sw) / 2; const sy = (image.naturalHeight - sh) / 2; ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
  }
  function drawMeta(ctx, x, y, label, value) {
    ctx.textAlign = "left"; ctx.fillStyle = "#758793"; ctx.font = "800 11px Arial, sans-serif"; ctx.fillText(label, x, y); ctx.fillStyle = "#10283f"; fittedFont(ctx, value, 270, 17, 11, "700", "Arial, sans-serif"); ctx.fillText(value, x, y + 27);
  }
  function renderCertificate() {
    const canvas = $("#certificateCanvas"); const ctx = canvas.getContext("2d"); const W = canvas.width; const H = canvas.height;
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = "#f8f4eb"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#10283f"; ctx.lineWidth = 18; ctx.strokeRect(35, 35, W - 70, H - 70); ctx.strokeStyle = "#c8a847"; ctx.lineWidth = 3; ctx.strokeRect(57, 57, W - 114, H - 114);
    ctx.fillStyle = "#10283f"; ctx.fillRect(92, 89, 92, 66); ctx.fillStyle = "#ffffff"; ctx.textAlign = "center"; ctx.font = "900 24px Arial, sans-serif"; ctx.fillText("RCW", 138, 131);
    ctx.textAlign = "left"; ctx.fillStyle = "#10283f"; ctx.font = "800 26px Arial, sans-serif"; ctx.fillText("RCW IT TRAINING", 205, 117); ctx.fillStyle = "#70818d"; ctx.font = "700 11px Arial, sans-serif"; ctx.fillText("HANDS-ON CLOUD LEARNING • EDUCATIONAL ACHIEVEMENT", 205, 141);
    ctx.textAlign = "center"; ctx.fillStyle = "#c38a24"; ctx.font = "800 15px Arial, sans-serif"; ctx.fillText("CERTIFICATE OF ACHIEVEMENT", W / 2, 244);
    const title = "Amazon ECS End-to-End Lab Champion"; ctx.fillStyle = "#10283f"; fittedFont(ctx, title, 1120, 57, 38, "700", "Georgia, serif"); ctx.fillText(title, W / 2, 326);
    ctx.fillStyle = "#687985"; ctx.font = "400 19px Georgia, serif"; ctx.fillText("This certificate is proudly presented to", W / 2, 383);
    ctx.fillStyle = "#092b4c"; fittedFont(ctx, state.learnerName || "RCW Learner", 830, 57, 34, "700", "Georgia, serif"); ctx.fillText(state.learnerName || "RCW Learner", W / 2, 457);
    const width = Math.min(830, ctx.measureText(state.learnerName || "RCW Learner").width + 90); const gradient = ctx.createLinearGradient(W / 2 - width / 2, 0, W / 2 + width / 2, 0); gradient.addColorStop(0, "rgba(243,155,34,0)"); gradient.addColorStop(.5, "#f39b22"); gradient.addColorStop(1, "rgba(243,155,34,0)"); ctx.fillStyle = gradient; ctx.fillRect(W / 2 - width / 2, 481, width, 2);
    ctx.fillStyle = "#4f6472"; ctx.font = "400 17px Arial, sans-serif"; ctx.fillText("for designing, deploying, and validating a hardened, observable, and resilient", W / 2, 536); ctx.fillText("Amazon ECS Fargate service with compliant control evidence and human oversight.", W / 2, 568);
    const badgeX = 205; const badgeY = 704; ctx.beginPath(); ctx.arc(badgeX, badgeY, 76, 0, Math.PI * 2); ctx.fillStyle = "#10283f"; ctx.fill(); ctx.beginPath(); ctx.arc(badgeX, badgeY, 64, 0, Math.PI * 2); ctx.strokeStyle = "#c8a847"; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = "#fff"; ctx.font = "800 34px Arial, sans-serif"; ctx.fillText(String(validation.score(state.completed)), badgeX, badgeY + 1); ctx.fillStyle = "#ffbd65"; ctx.font = "800 12px Arial, sans-serif"; ctx.fillText("/ 100", badgeX, badgeY + 25); ctx.fillStyle = "#6a7d88"; ctx.font = "800 11px Arial, sans-serif"; ctx.fillText("FINAL SCORE", badgeX, badgeY + 102);
    const issuedDate = new Date(state.completedAt || Date.now()).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }); drawMeta(ctx, 350, 676, "ISSUED ON", issuedDate); drawMeta(ctx, 350, 754, "CERTIFICATE ID", state.certificateId || "Pending"); drawMeta(ctx, 660, 676, "LAB", "Secure ECS Fargate deployment"); drawMeta(ctx, 660, 754, "STATUS", "Limited monitored pilot approved");
    const photoX = 1140; const photoY = 685; ctx.save(); ctx.beginPath(); ctx.arc(photoX, photoY, 82, 0, Math.PI * 2); ctx.clip(); ctx.fillStyle = "#163e5b"; ctx.fillRect(photoX - 84, photoY - 84, 168, 168); if (instructorImage.complete && instructorImage.naturalWidth) drawImageCover(ctx, instructorImage, photoX - 82, photoY - 82, 164, 164); ctx.restore(); ctx.beginPath(); ctx.arc(photoX, photoY, 86, 0, Math.PI * 2); ctx.strokeStyle = "#c8a847"; ctx.lineWidth = 4; ctx.stroke(); ctx.fillStyle = "#092b4c"; ctx.font = "italic 700 36px Georgia, serif"; ctx.fillText("Pradeep Raju", photoX, 822); ctx.strokeStyle = "#f39b22"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(photoX - 112, 837); ctx.bezierCurveTo(photoX - 50, 826, photoX + 35, 849, photoX + 112, 834); ctx.stroke(); ctx.fillStyle = "#6a7d88"; ctx.font = "800 10px Arial, sans-serif"; ctx.fillText("PRADEEP RAJU  •  RCW IT TRAINING", photoX, 861);
    ctx.fillStyle = "#ded8cb"; ctx.fillRect(92, 895, W - 184, 1); ctx.textAlign = "left"; ctx.fillStyle = "#778994"; ctx.font = "500 10px Arial, sans-serif"; ctx.fillText("RCW IT Training certifies the browser-local educational achievement recorded above.", 98, 921); ctx.textAlign = "right"; ctx.fillText("ECS · Fargate · container security · operations", W - 98, 921);
  }
  instructorImage.addEventListener("load", () => { if (state.completed.review) renderCertificate(); });

  function buildPdfFromJpeg(jpegBytes, imageWidth, imageHeight) {
    const encoder = new TextEncoder(); const chunks = []; const offsets = [0]; let length = 0;
    const push = (value) => { const bytes = typeof value === "string" ? encoder.encode(value) : value; chunks.push(bytes); length += bytes.length; };
    const addObject = (number, header, streamBytes = null) => { offsets[number] = length; push(`${number} 0 obj\n${header}`); if (streamBytes) { push("\nstream\n"); push(streamBytes); push("\nendstream"); } push("\nendobj\n"); };
    push(new Uint8Array([0x25,0x50,0x44,0x46,0x2d,0x31,0x2e,0x34,0x0a,0x25,0xe2,0xe3,0xcf,0xd3,0x0a])); addObject(1, "<< /Type /Catalog /Pages 2 0 R >>"); addObject(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"); addObject(3, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>"); const content = encoder.encode("q\n842 0 0 595 0 0 cm\n/Im0 Do\nQ\n"); addObject(4, `<< /Length ${content.length} >>`, content); addObject(5, `<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>`, jpegBytes); const xref = length; push("xref\n0 6\n0000000000 65535 f \n"); for (let i = 1; i <= 5; i += 1) push(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`); push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`); const output = new Uint8Array(length); let position = 0; chunks.forEach((chunk) => { output.set(chunk, position); position += chunk.length; }); return output;
  }

  $("#downloadPdfButton").addEventListener("click", () => {
    if (!state.completed.review) return;
    renderCertificate();
    $("#certificateCanvas").toBlob(async (blob) => {
      if (!blob) { showToast("Could not prepare the certificate PDF"); return; }
      const jpeg = new Uint8Array(await blob.arrayBuffer()); const pdf = buildPdfFromJpeg(jpeg, $("#certificateCanvas").width, $("#certificateCanvas").height); downloadBlob(new Blob([pdf], { type: "application/pdf" }), `rcw-ecs-lab-champion-${safeFilename(state.learnerName)}.pdf`); showToast("Certificate PDF downloaded");
    }, "image/jpeg", 0.96);
  });

  $$('[data-route]').forEach((element) => element.addEventListener("click", (event) => { event.preventDefault(); navigate(element.dataset.route); }));
  $$('[data-service-route]').forEach((element) => element.addEventListener("click", () => navigate(element.dataset.serviceRoute)));
  $$('[data-next-route]').forEach((element) => element.addEventListener("click", () => navigate(element.dataset.nextRoute)));
  $$('[data-close-dialog]').forEach((element) => element.addEventListener("click", () => closeDialog($(`#${element.dataset.closeDialog}`))));
  $("#menuButton").addEventListener("click", openNavigation); $("#closeNavButton").addEventListener("click", closeNavigation); $("#navigationScrim").addEventListener("click", closeNavigation); $("#guideButton").addEventListener("click", () => openDialog($("#guideDialog")));
  $("#servicesButton").addEventListener("click", () => { const menu = $("#servicesMenu"); menu.hidden = !menu.hidden; $("#servicesButton").setAttribute("aria-expanded", String(!menu.hidden)); });
  $("#serviceSearch").addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return; event.preventDefault(); const query = event.currentTarget.value.toLowerCase();
    const map = [[["ecr", "image", "scan", "registry"], "image"], [["iam", "role", "secret", "identity"], "identity"], [["cluster", "fargate", "insights"], "cluster"], [["task", "container", "definition"], "task"], [["vpc", "network", "alb", "load balancer", "endpoint"], "network"], [["service", "deploy", "scaling"], "service"], [["log", "monitor", "rollback", "cloudtrail", "test"], "operations"], [["compliance", "review", "nist", "iso", "evidence"], "review"]];
    const match = map.find(([terms]) => terms.some((term) => query.includes(term))); if (match) { navigate(match[1]); event.currentTarget.value = ""; } else showToast("Try image, IAM, cluster, task, VPC, service, logs, rollback, or compliance");
  });
  document.addEventListener("click", (event) => { if (!event.target.closest("#servicesButton, #servicesMenu")) { $("#servicesMenu").hidden = true; $("#servicesButton").setAttribute("aria-expanded", "false"); } });
  $("#resetButton").addEventListener("click", () => openDialog($("#resetDialog")));
  $("#confirmResetButton").addEventListener("click", () => { try { sessionStorage.removeItem(STORAGE_KEY); } catch (_) {} location.hash = "overview"; location.reload(); });
  window.addEventListener("hashchange", () => navigate(location.hash.slice(1), { hash: false }));
  window.addEventListener("keydown", (event) => { if (event.key === "Escape") { closeNavigation(); $("#servicesMenu").hidden = true; } });

  const localDateValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); $("#reviewDate").min = localDateValue(tomorrow);
  const nextReview = new Date(); nextReview.setDate(nextReview.getDate() + 30); $("#reviewDate").value = localDateValue(nextReview);
  if (state.learnerName) $("#learnerName").value = state.learnerName;
  if (state.completed.review) renderCertificate();
  updateUI();
  const initialRoute = ROUTES.includes(location.hash.slice(1)) ? location.hash.slice(1) : (ROUTES.includes(state.currentRoute) ? state.currentRoute : "overview"); navigate(initialRoute, { focus: false, hash: false });
})();
