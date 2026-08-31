/* =====================================================================
   VMware Cloud Foundation — SDDC Manager Console Practice Lab
   Educational simulation. Not a VMware product. No real infrastructure.
   ===================================================================== */
(function () {
  "use strict";

  /* ---------- default lab state ---------- */
  function defaultState() {
    return {
      vcfVersion: "5.2",
      bundleVersion: "5.2.1",
      networkPools: [
        { name: "m01-network-pool", free: 22, used: 10, total: 32, subnets: "Management · vMotion · vSAN · NSX TEP" },
        { name: "w01-network-pool", free: 14, used: 6, total: 20, subnets: "Management · vMotion · vSAN · NSX TEP" }
      ],
      domains: [
        {
          id: "mgmt", name: "management-domain", type: "Management", vcenter: "sddc-vcenter-01",
          status: "Active", hosts: 4, version: "5.2.0", vcenterVer: "vCenter 8.0U3",
          storage: "vSAN", nsx: "NSX Manager (shared)", license: "VCF Advanced",
          vcap: 42, mem: 58, cpu: 35
        }
      ],
      freeHosts: [
        { fqdn: "esxi-w01-01.vcf.local", model: "Dell PowerEdge R750", ip: "10.0.12.41", cpu: "2x Xeon 6342 (48c)", mem: "512 GB", disks: "4x 1.6TB NVMe", hcl: true, pool: "" },
        { fqdn: "esxi-w01-02.vcf.local", model: "Dell PowerEdge R750", ip: "10.0.12.42", cpu: "2x Xeon 6342 (48c)", mem: "512 GB", disks: "4x 1.6TB NVMe", hcl: true, pool: "" },
        { fqdn: "esxi-w01-03.vcf.local", model: "Dell PowerEdge R750", ip: "10.0.12.43", cpu: "2x Xeon 6342 (48c)", mem: "512 GB", disks: "4x 1.6TB NVMe", hcl: true, pool: "" },
        { fqdn: "esxi-w01-04.vcf.local", model: "HPE DL380 Gen10", ip: "10.0.12.44", cpu: "2x Xeon 6230 (40c)", mem: "256 GB", disks: "2x 800GB SSD (HDD hybrid)", hcl: false, pool: "" }
      ],
      commissioned: [],
      backups: { enabled: false, sftp: "", schedule: "weekly", retain: 7, last: "Never", next: "Not configured" },
      certMode: "Self-signed",
      tasks: [
        { id: 1, name: "Health check — management domain", sub: "SDDC Manager", pct: 100, status: "Successful", icon: "✓", time: "Today 08:14" }
      ],
      taskSeq: 2,
      passwords: { "vCenter Server": 380, "NSX Manager": 380, "ESXi hosts": 380, "SDDC Manager": 380 },
      license: { vsphere: "VMware vSphere 8 Enterprise Plus", vsan: "VMware vSAN Enterprise", nsx: "NSX-T Advanced", assigned: true }
    };
  }

  let S = load() || defaultState();

  function load() {
    try { const r = localStorage.getItem("vcf-lab-state"); return r ? JSON.parse(r) : null; }
    catch (e) { return null; }
  }
  function save() { try { localStorage.setItem("vcf-lab-state", JSON.stringify(S)); } catch (e) {} }

  /* ---------- helpers ---------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const statusBadge = (s) => {
    const map = {
      "Active": "green", "Successful": "green", "Completed": "green", "Healthy": "green", "Enabled": "green",
      "Uncommissioned": "gray", "Pending": "gray", "Not configured": "gray", "Self-signed": "amber",
      "In progress": "blue", "Running": "blue", "Pending approval": "amber",
      "Failed": "red", "Error": "red", "Validation error": "red", "Disabled": "red"
    };
    return `<span class="badge ${map[s] || "gray"}">${esc(s)}</span>`;
  };
  const hostsTotal = () => S.domains.reduce((a, d) => a + d.hosts, 0);
  const daysToExpiry = (d) => {
    const exp = d < 0 ? "expired" : d <= 30 ? "expiring soon" : "valid";
    return exp;
  };
  function toast(title, detail, type) {
    const host = $("#toastHost");
    const t = document.createElement("div");
    t.className = "toast " + (type || "");
    t.innerHTML = `<div class="tt">${esc(title)}</div>${detail ? `<div class="td">${esc(detail)}</div>` : ""}`;
    host.appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity .3s"; setTimeout(() => t.remove(), 300); }, 4600);
  }

  /* ---------- routing ---------- */
  let view = "dashboard";
  let detailCtx = null; // {type:'domain'|'pool'|'host'|'task', id:...}
  function go(v) { view = v; detailCtx = null; $$(".nav-item").forEach((n) => n.classList.toggle("active", n.dataset.view === v)); render(); window.scrollTo(0, 0); }

  function render() {
    const c = $("#content");
    c.innerHTML = "";
    const fn = views[view] || views.dashboard;
    c.innerHTML = fn();
    bindContent();
    updateBadges();
  }

  function head(title, sub, actionsHtml) {
    return `<div class="page-head"><div><h1>${title}</h1><div class="sub">${sub || ""}</div></div><div class="page-actions">${actionsHtml || ""}</div></div>`;
  }

  /* ---------- views ---------- */
  const views = {};

  views.dashboard = function () {
    const uncommissioned = S.freeHosts.length;
    const viDomains = S.domains.filter((d) => d.type === "VI").length;
    return head("Dashboard", "System overview for the VMware Cloud Foundation instance") +
      `<div class="info-banner"><span class="ib-ic">ℹ️</span><div><b>Practice lab:</b> click around exactly like the real SDDC Manager — commission hosts, build a workload domain, run an upgrade, configure backup, rotate certificates and passwords. Every action updates the console and is saved in your browser.</div></div>
      <div class="kpi-grid">
        <div class="kpi blue"><div class="k-label">Workload Domains</div><div class="k-value">${S.domains.length}</div><div class="k-foot">${viDomains} VI · 1 management</div></div>
        <div class="kpi"><div class="k-label">Hosts</div><div class="k-value">${hostsTotal()}</div><div class="k-foot">commissioned in domains</div></div>
        <div class="kpi amber"><div class="k-label">Uncommissioned Hosts</div><div class="k-value">${uncommissioned}</div><div class="k-foot">ready to commission</div></div>
        <div class="kpi"><div class="k-label">Network Pools</div><div class="k-value">${S.networkPools.length}</div><div class="k-foot">IP pools configured</div></div>
        <div class="kpi ${S.backups.enabled ? "ok" : "amber"}"><div class="k-label">Backup</div><div class="k-value">${S.backups.enabled ? "On" : "Off"}</div><div class="k-foot">${esc(S.backups.last)}</div></div>
      </div>
      <div class="pill-row">
        ${healthPill("Management vSAN capacity", 42)}
        ${healthPill("vCenter Server health", 100)}
        ${healthPill("NSX-T health", 100)}
        ${healthPill("SDDC Manager health", 100)}
      </div>
      <div class="panel">
        <div class="panel-head"><h2>Getting started — recommended order</h2><span class="hint">Your guided workflow</span></div>
        <div class="panel-body"><div class="guide-steps">
          ${guideStep("Commission hosts", "Add an uncommissioned host into a network pool under Hosts → Commission Hosts.", "hosts")}
          ${guideStep("Create a workload domain", "Build a VI domain from commissioned hosts (needs 3) under Workload Domains.", "domains")}
          ${guideStep("Configure backup", "Point SDDC Manager at an SFTP target under Backup Settings.", "backup")}
          ${guideStep("Run a lifecycle upgrade", "Upgrade the stack to bundle " + esc(S.bundleVersion) + " under Updates & Upgrades.", "lifecycle")}
          ${guideStep("Rotate certificates & passwords", "Issue CA certificates and rotate component passwords.", "certificates")}
        </div></div>
      </div>
      <div class="panel">
        <div class="panel-head"><h2>Recent tasks</h2></div>
        <div class="panel-body">${taskList(S.tasks.slice(-4).reverse())}</div>
      </div>`;
  };

  function healthPill(label, pct) {
    const cls = pct >= 85 ? "" : pct >= 60 ? "warn" : "crit";
    const val = pct === 100 ? "Healthy" : pct + "% used";
    return `<div class="health-pill"><div class="hp-top"><span>${esc(label)}</span><span>${val}</span></div><div class="bar"><i class="${cls}" style="width:${Math.min(pct,100)}%"></i></div></div>`;
  }
  function guideStep(t, d, v) {
    return `<div class="guide-step"><span class="gn"></span><div class="gt"><b>${t}</b><span>${d}</span></div><div style="margin-left:auto"><button class="btn btn-secondary btn-sm" data-go="${v}">Open →</button></div></div>`;
  }

  /* ---- Workload Domains ---- */
  views.domains = function () {
    const commissionable = S.commissioned.length;
    return head("Workload Domains", "Manage management and VI (Virtual Infrastructure) workload domains",
      `<button class="btn btn-primary" data-wizard="create-domain">＋ Create Workload Domain</button>`) +
      `<div class="info-banner"><span class="ib-ic">💡</span><div>The <b>management domain</b> is created during bring-up and cannot be deleted. VI workload domains are provisioned for tenant workloads and each get a dedicated vCenter. ${commissionable ? commissionable + " commissioned host(s) available." : "Commission at least 3 hosts before creating a VI domain."}</div></div>
      <div class="panel"><div class="panel-head"><h2>Domains</h2><span class="hint">${S.domains.length} domain(s)</span></div>
      <table class="grid"><thead><tr><th>Name</th><th>Type</th><th>vCenter</th><th>Hosts</th><th>Storage</th><th>Version</th><th>Status</th></tr></thead><tbody>
      ${S.domains.map((d) => `<tr data-detail="domain:${d.id}">
        <td class="cell-name">${esc(d.name)}</td><td>${d.type}</td><td>${esc(d.vcenter)}</td><td>${d.hosts}</td>
        <td>${esc(d.storage)}</td><td>${esc(d.version)}</td><td>${statusBadge(d.status)}</td></tr>`).join("")}
      </tbody></table></div>`;
  };

  function domainDetail(id) {
    const d = S.domains.find((x) => x.id === id);
    if (!d) return "";
    const isMgmt = d.type === "Management";
    return `<span class="link-back" data-go="domains">← All workload domains</span>` +
      head(d.name, d.type + " workload domain",
        isMgmt ? "" : `<button class="btn btn-danger" data-wizard="delete-domain" data-id="${d.id}">Delete domain</button>`) +
      `<div class="pill-row">
        <div class="health-pill"><div class="hp-top"><span>vSAN capacity</span><span>${d.vcap}% used</span></div><div class="bar"><i class="${d.vcap>85?"crit":d.vcap>60?"warn":""}" style="width:${d.vcap}%"></i></div></div>
        <div class="health-pill"><div class="hp-top"><span>Memory</span><span>${d.mem}% used</span></div><div class="bar"><i style="width:${d.mem}%"></i></div></div>
        <div class="health-pill"><div class="hp-top"><span>Compute (CPU)</span><span>${d.cpu}% used</span></div><div class="bar"><i class="${d.cpu>85?"crit":""}" style="width:${d.cpu}%"></i></div></div>
      </div>
      <div class="panel"><div class="panel-head"><h2>Details</h2></div>
      <div class="detail-grid">
        ${di("Domain type", d.type)}${di("vCenter Server", d.vcenter + " (" + d.vcenterVer + ")")}
        ${di("Host count", d.hosts)}${di("Primary storage", d.storage)}
        ${di("NSX", d.nsx)}${di("License edition", d.license)}
        ${di("Current version", d.version)}${di("Status", d.status)}
      </div></div>
      <div class="panel"><div class="panel-head"><h2>Cluster lifecycle</h2></div>
      <div class="panel-body" style="padding:16px 18px">
        <button class="btn btn-secondary btn-sm" data-wizard="add-host" data-id="${d.id}">➕ Expand cluster (add host)</button>
        <button class="btn btn-secondary btn-sm" data-wizard="upgrade" data-id="${d.id}">⟳ Check for upgrade</button>
      </div></div>`;
  }
  const di = (k, v) => `<div class="di"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`;

  /* ---- Hosts ---- */
  views.hosts = function () {
    const rows = [];
    S.domains.forEach((d) => d.clusterHosts && d.clusterHosts.forEach((h) => rows.push({ h, state: "Commissioned", domain: d.name })));
    S.commissioned.forEach((h) => rows.push({ h, state: "Commissioned", domain: "Not assigned" }));
    S.freeHosts.forEach((h) => rows.push({ h, state: "Uncommissioned", domain: "—" }));
    return head("Hosts", "Commissioned, assigned and uncommissioned ESXi hosts",
      `<button class="btn btn-primary" data-wizard="commission">＋ Commission Hosts</button>`) +
      `<div class="panel"><div class="panel-head"><h2>All hosts</h2><span class="hint">${rows.length} host(s)</span></div>
      <table class="grid"><thead><tr><th>FQDN</th><th>IP</th><th>Model</th><th>Memory</th><th>HCL</th><th>Assignment</th><th>State</th></tr></thead><tbody>
      ${rows.map(({ h, state, domain }) => `<tr data-detail="host:${esc(h.fqdn)}">
        <td class="cell-name">${esc(h.fqdn)}</td><td>${esc(h.ip)}</td><td>${esc(h.model)}</td><td>${esc(h.mem)}</td>
        <td>${h.hcl ? '<span class="badge green">Certified</span>' : '<span class="badge red">Not on HCL</span>'}</td>
        <td>${esc(domain)}</td><td>${statusBadge(state)}</td></tr>`).join("")}
      </tbody></table></div>`;
  };

  function hostDetail(fqdn) {
    const inFree = S.freeHosts.find((h) => h.fqdn === fqdn);
    const inComm = S.commissioned.find((h) => h.fqdn === fqdn);
    let assigned = "—", state = "Uncommissioned";
    S.domains.forEach((d) => (d.clusterHosts || []).forEach((h) => { if (h.fqdn === fqdn) { assigned = d.name; state = "Commissioned"; } }));
    if (inComm) state = "Commissioned";
    const h = inFree || inComm;
    if (!h) return "";
    return `<span class="link-back" data-go="hosts">← All hosts</span>` +
      head(h.fqdn, "ESXi host") +
      `<div class="panel"><div class="panel-head"><h2>Host details</h2><div>${state === "Uncommissioned" ? '<button class="btn btn-primary btn-sm" data-wizard="commission">Commission this host</button>' : statusBadge(state)}</div></div>
      <div class="detail-grid">
        ${di("Status", state)}${di("Assigned to", assigned)}
        ${di("Management IP", h.ip)}${di("Model", h.model)}
        ${di("CPU", h.cpu)}${di("Memory", h.mem)}
        ${di("Storage", h.disks)}${di("vSAN HCL", h.hcl ? "Certified" : "NOT on vSAN HCL")}
        ${di("Network pool", h.pool || "—")}${di("ESXi", "ESXi 8.0 U3 (VCF " + S.vcfVersion + ")")}
      </div></div>`;
  }

  /* ---- Network pools ---- */
  views.networkpools = function () {
    return head("Network Pools", "IP address pools used for host vmkernel interfaces (management, vMotion, vSAN, NSX TEP)",
      `<button class="btn btn-primary" data-wizard="add-pool">＋ Create Network Pool</button>`) +
      `<div class="panel"><div class="panel-head"><h2>Network pools</h2></div>
      <table class="grid"><thead><tr><th>Name</th><th>Traffic types</th><th>Used</th><th>Free</th><th>Total</th></tr></thead><tbody>
      ${S.networkPools.map((p) => `<tr data-detail="pool:${esc(p.name)}">
        <td class="cell-name">${esc(p.name)}</td><td>${esc(p.subnets)}</td><td>${p.used}</td><td>${p.free}</td><td>${p.total}</td></tr>`).join("")}
      </tbody></table></div>`;
  };
  function poolDetail(name) {
    const p = S.networkPools.find((x) => x.name === name);
    if (!p) return "";
    return `<span class="link-back" data-go="networkpools">← All network pools</span>` +
      head(p.name, "Network pool") +
      `<div class="panel"><div class="panel-head"><h2>IP allocation</h2></div>
      <div class="pill-row"><div class="health-pill" style="flex:1"><div class="hp-top"><span>Addresses used</span><span>${p.used} / ${p.total}</span></div><div class="bar"><i style="width:${(p.used/p.total*100).toFixed(0)}%"></i></div></div></div>
      <div class="detail-grid">${di("Traffic types", p.subnets)}${di("Free IPs", p.free)}${di("Used IPs", p.used)}${di("Total", p.total)}</div></div>`;
  }

  /* ---- Lifecycle ---- */
  views.lifecycle = function () {
    const rows = [
      { comp: "SDDC Manager", cur: "5.2.0", target: S.bundleVersion, note: "Upgrade first", mandatory: true },
      { comp: "Management domain vCenter Server", cur: "8.0.2", target: "8.0.3", note: "After SDDC Manager" },
      { comp: "NSX-T Data Center", cur: "4.2.0", target: "4.2.1", note: "Orchestrated" },
      { comp: "ESXi hosts (management)", cur: "8.0.2", target: "8.0.3", note: "vLCM images" },
      { comp: "vSAN / vDS", cur: "5.2.0", target: "5.2.1", note: "Included" }
    ];
    const bundleApplied = S.domains.every((d) => d.version === S.bundleVersion) && S.vcfVersion === S.bundleVersion;
    return head("Updates & Upgrades", "Lifecycle management (LCM) — bundle download, prechecks and orchestrated upgrades",
      `<button class="btn btn-secondary" data-action="download-bundles">⬇ Download bundles</button>
       <button class="btn btn-primary" data-wizard="upgrade" ${bundleApplied ? "disabled" : ""}>⟳ Upgrade now</button>`) +
      `<div class="info-banner"><span class="ib-ic">⟳</span><div>LCM upgrades <b>SDDC Manager first</b>, then the <b>management domain</b>, then <b>VI workload domains</b>. Supported bundles are pulled from the VMware depot (or transferred offline for air-gapped sites). ${bundleApplied ? "This instance is already on the latest bundle." : "A newer bundle is available: " + esc(S.bundleVersion) + "."}</div></div>
      <div class="panel"><div class="panel-head"><h2>Available bundle: VCF ${esc(S.bundleVersion)}</h2><span class="hint">${bundleApplied ? statusBadge("Completed") : statusBadge("Pending")}</span></div>
      <table class="grid"><thead><tr><th>Component</th><th>Current</th><th>Target</th><th>Notes</th></tr></thead><tbody>
      ${rows.map((r) => `<tr><td class="cell-strong">${esc(r.comp)}</td><td>${esc(r.cur)}</td><td>${bundleApplied ? esc(r.target) : esc(r.cur)}</td><td>${esc(r.note)}</td></tr>`).join("")}
      </tbody></table></div>
      <div class="panel"><div class="panel-head"><h2>Precheck results</h2><button class="btn btn-secondary btn-sm" data-action="precheck">Run prechecks</button></div>
      <div class="panel-body" style="padding:14px 18px">
        <div id="precheckOut"><span class="hint">Run prechecks to validate snapshots, backups, capacity and configuration drift before upgrading.</span></div>
      </div></div>`;
  };

  /* ---- Backup ---- */
  views.backup = function () {
    const b = S.backups;
    return head("Backup Settings", "SDDC Manager configuration backup") +
      `<div class="panel"><div class="panel-head"><h2>Backup configuration</h2><span>${b.enabled ? statusBadge("Enabled") : statusBadge("Disabled")}</span></div>
      <div class="detail-grid">
        ${di("Status", b.enabled ? "Configured & scheduled" : "Not configured")}
        ${di("SFTP target", b.sftp || "—")}
        ${di("Schedule", b.schedule)}
        ${di("Retention", b.retain + " backups")}
        ${di("Last backup", b.last)}
        ${di("Next backup", b.next)}
      </div>
      <div style="padding:16px 18px;display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-primary" data-wizard="backup">${b.enabled ? "Edit backup settings" : "Configure backup"}</button>
        <button class="btn btn-secondary" data-action="backup-now" ${b.enabled ? "" : "disabled"}>Back up now</button>
      </div></div>
      <div class="info-banner"><span class="ib-ic">📌</span><div>SDDC Manager backs up its configuration to an <b>external SFTP server</b>. vCenter uses file-based backup and NSX-T backs up to SFTP as well — backups are required before an upgrade.</div></div>`;
  };

  /* ---- Certificates ---- */
  views.certificates = function () {
    const self = S.certMode === "Self-signed";
    const comps = ["SDDC Manager", "vCenter Server", "NSX Manager", "NSX Edge", "ESXi hosts"];
    return head("Certificates", "Component certificates and certificate authority integration",
      `<button class="btn btn-primary" data-wizard="certs">${self ? "Replace with CA certificates" : "Manage certificates"}</button>`) +
      `<div class="panel"><div class="panel-head"><h2>Component certificates</h2><span>${self ? statusBadge("Self-signed") : statusBadge("Active")}</span></div>
      <table class="grid"><thead><tr><th>Component</th><th>Issuer</th><th>Validity</th><th>Status</th></tr></thead><tbody>
      ${comps.map((c) => `<tr><td class="cell-strong">${c}</td>
        <td>${self ? "VMCA self-signed" : "rcw-root-CA (Microsoft CA)"}</td>
        <td>${self ? "Generated at install" : "Issued today · 825 days"}</td>
        <td>${self ? '<span class="badge amber">Self-signed</span>' : '<span class="badge green">Trusted</span>'}</td></tr>`).join("")}
      </tbody></table></div>
      <div class="info-banner"><span class="ib-ic">🔒</span><div>SDDC Manager can generate CSRs and install certificates from an <b>external certificate authority</b> for all management components, replacing the default self-signed certificates.</div></div>`;
  };

  /* ---- Passwords ---- */
  views.passwords = function () {
    return head("Password Management", "Rotate and remediate component credentials") +
      `<div class="panel"><div class="panel-head"><h2>Component passwords</h2><button class="btn btn-primary btn-sm" data-wizard="passwords">Rotate passwords</button></div>
      <table class="grid"><thead><tr><th>Component</th><th>Age (days)</th><th>Lifecycle</th><th>Status</th></tr></thead><tbody>
      ${Object.entries(S.passwords).map(([c, age]) => {
        const warn = age >= 365;
        return `<tr><td class="cell-strong">${esc(c)}</td><td>${age} days</td><td>${age >= 365 ? "Rotation recommended" : "Within policy"}</td>
        <td>${warn ? '<span class="badge amber">Expiring soon</span>' : '<span class="badge green">Healthy</span>'}</td></tr>`;
      }).join("")}
      </tbody></table></div>
      <div class="info-banner"><span class="ib-ic">🔑</span><div>Password rotation is orchestrated by SDDC Manager. Credentials are tracked centrally and rotation can be scheduled or run on demand; SDDC Manager also remediates credentials changed out of band (configuration drift).</div></div>`;
  };

  /* ---- Licensing ---- */
  views.licensing = function () {
    const l = S.license;
    return head("Licensing", "License keys applied across the SDDC") +
      `<div class="panel"><div class="panel-head"><h2>Applied licenses</h2></div>
      <div class="detail-grid">
        ${di("vSphere", l.vsphere)}${di("vSAN", l.vsan)}${di("NSX-T", l.nsx)}
        ${di("License state", l.assigned ? "Keys applied centrally via SDDC Manager" : "Not set")}
      </div></div>
      <div class="info-banner"><span class="ib-ic">🧾</span><div>License keys for vSphere, vSAN and NSX are added and assigned to workload domains centrally in SDDC Manager.</div></div>`;
  };

  /* ---- Tasks ---- */
  views.tasks = function () {
    return head("Tasks", "Workflow and task history") +
      `<div class="panel"><div class="panel-head"><h2>All tasks</h2><span class="hint">${S.tasks.length} task(s)</span></div>
      <div class="panel-body">${taskList(S.tasks.slice().reverse())}</div></div>`;
  };

  function taskList(tasks) {
    if (!tasks.length) return `<div class="table-empty">No tasks yet.</div>`;
    return tasks.map((t) => {
      const done = t.pct >= 100;
      const st = t.status || (done ? "Successful" : "In progress");
      const color = st === "Successful" ? "var(--green)" : st === "Failed" ? "var(--red)" : "var(--blue)";
      return `<div class="task" data-detail="task:${t.id}">
        <span class="t-ic" style="color:${color}">${t.icon || "⟳"}</span>
        <div class="t-main"><div class="t-name">${esc(t.name)}</div><div class="t-sub">${esc(t.sub || "")}</div></div>
        <div class="t-prog">${done ? statusBadge(st) : `<div class="bar"><i style="width:${t.pct}%"></i></div>`}</div>
        <span class="t-time">${esc(t.time || "Just now")}</span>
      </div>`;
    }).join("");
  }

  /* ---------- wizards ---------- */
  const wizards = {};

  /* Commission hosts */
  wizards.commission = function () {
    const selectable = S.freeHosts.filter((h) => h.hcl);
    return {
      title: "Commission Hosts",
      steps: ["Select hosts", "Network pool", "Review"],
      data: { picked: [], pool: S.networkPools[0] ? S.networkPools[0].name : "" },
      render: (w, step) => {
        if (step === 0) {
          if (!selectable.length) return `<div class="table-empty">No eligible uncommissioned hosts. (A host that is not on the vSAN HCL cannot be commissioned.)</div>`;
          return `<p style="margin-bottom:12px;color:var(--muted)">Select uncommissioned hosts to validate, image and add to a network pool.</p>` +
            selectable.map((h, i) => `<label class="pick ${w.data.picked.includes(i) ? "sel" : ""}">
              <input type="checkbox" data-pick="${i}" ${w.data.picked.includes(i) ? "checked" : ""}>
              <div class="pk-main"><div class="pk-name">${esc(h.fqdn)}</div><div class="pk-sub">${esc(h.model)} · ${esc(h.mem)} · ${esc(h.ip)}</div></div>
              <span class="badge green">HCL certified</span></label>`).join("");
        }
        if (step === 1) {
          return `<div class="field"><label>Network pool <span class="req">*</span></label>
            <select data-f="pool">${S.networkPools.map((p) => `<option ${w.data.pool === p.name ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select>
            <div class="help">IP addresses for management, vMotion, vSAN and NSX TEP vmkernel interfaces are assigned from this pool.</div></div>`;
        }
        const hosts = w.data.picked.map((i) => selectable[i].fqdn);
        return `<div class="review-box">
          ${rv("Hosts to commission", hosts.length ? hosts.join(", ") : "None")}
          ${rv("Network pool", w.data.pool)}
          ${rv("Validation", "NTP, DNS, HCL, disks and network connectivity will be checked")}
        </div>`;
      },
      validate: (w, step) => {
        if (step === 0 && !w.data.picked.length) return "Select at least one host.";
        return null;
      },
      run: (w, finish) => {
        const chosen = w.data.picked.map((i) => selectable[i]);
        const stages = [
          ["Validating hosts", "NTP, DNS, HCL and network prerequisites"],
          ["Applying VCF-compliant ESXi image", "Base image + vendor add-on"],
          ["Configuring vmkernel interfaces", "Assigning IPs from " + w.data.pool],
          ["Completing commissioning", "Hosts added to inventory"]
        ];
        runTask("Commission " + chosen.length + " host(s)", "Host lifecycle", stages, () => {
          chosen.forEach((h) => {
            h.pool = w.data.pool;
            S.freeHosts = S.freeHosts.filter((x) => x.fqdn !== h.fqdn);
            S.commissioned.push(h);
            const p = S.networkPools.find((p) => p.name === w.data.pool);
            if (p) { p.used++; p.free = Math.max(0, p.free - 1); }
          });
          save(); finish(true);
          toast("Hosts commissioned", chosen.length + " host(s) added to inventory and network pool.");
        });
      }
    };
  };

  /* Create workload domain */
  wizards["create-domain"] = function () {
    const available = S.commissioned;
    return {
      title: "Create VI Workload Domain",
      steps: ["Domain details", "Hosts", "Storage & NSX", "Review"],
      data: { name: "vi-workload-domain-01", storage: "vSAN", nsx: "shared", hosts: [] },
      render: (w, step) => {
        if (step === 0) return `<div class="field"><label>Domain name <span class="req">*</span></label><input data-f="name" value="${esc(w.data.name)}" placeholder="e.g. vi-domain-01"><div class="help">A dedicated vCenter Server will be deployed for this VI domain.</div></div>`;
        if (step === 1) {
          if (available.length < 3) return `<div class="info-banner" style="margin:0"><span class="ib-ic">⚠️</span><div>Only <b>${available.length}</b> commissioned host(s) are available. A vSAN VI workload domain requires a minimum of <b>3 hosts</b>. Commission hosts first.</div></div>`;
          return `<p style="margin-bottom:12px;color:var(--muted)">Select at least 3 hosts (vSAN minimum for FTT=1).</p>` +
            available.map((h, i) => `<label class="pick ${w.data.hosts.includes(i) ? "sel" : ""}">
              <input type="checkbox" data-pick-host="${i}" ${w.data.hosts.includes(i) ? "checked" : ""}>
              <div class="pk-main"><div class="pk-name">${esc(h.fqdn)}</div><div class="pk-sub">${esc(h.model)} · ${esc(h.mem)}</div></div></label>`).join("");
        }
        if (step === 2) return `
          <div class="field"><label>Primary storage</label>
            <select data-f="storage"><option>vSAN</option><option>NFS</option><option>VMFS on Fibre Channel</option><option>vVols</option></select>
            <div class="help">The management domain always uses vSAN. VI domains can use vSAN, NFS, FC or vVols.</div></div>
          <div class="field"><label>NSX</label>
            <select data-f="nsx"><option value="shared">Use the shared NSX Manager cluster (management domain)</option><option value="dedicated">Deploy a dedicated NSX Manager cluster</option></select></div>`;
        const h = w.data.hosts.length;
        return `<div class="review-box">
          ${rv("Domain name", w.data.name)}
          ${rv("vCenter Server", "New VCSA deployed for this domain")}
          ${rv("Hosts", h + (h ? " (" + available.filter((_, i) => w.data.hosts.includes(i)).map((x) => x.fqdn).join(", ") + ")" : ""))}
          ${rv("Storage", w.data.storage)}
          ${rv("NSX", w.data.nsx === "shared" ? "Shared NSX Manager" : "Dedicated NSX cluster")}
        </div>`;
      },
      validate: (w, step) => {
        if (step === 0 && !w.data.name.trim()) return "Enter a domain name.";
        if (step === 1 && w.data.hosts.length < 3) return "Select at least 3 hosts for a vSAN VI domain.";
        return null;
      },
      run: (w, finish) => {
        const chosen = w.data.hosts.map((i) => available[i]);
        const stages = [
          ["Deploying vCenter Server Appliance", "For domain " + w.data.name],
          ["Configuring vSAN cluster", w.data.storage + ", FTT=1 mirror"],
          ["Preparing NSX", w.data.nsx === "shared" ? "Registering with shared NSX Manager" : "Deploying NSX Manager cluster"],
          ["Adding hosts and creating cluster", chosen.length + " hosts joined"],
          ["Finalizing workload domain", "Domain registration"]
        ];
        runTask("Create VI workload domain — " + w.data.name, "Workload domain provisioning", stages, () => {
          const id = "vi-" + Date.now();
          chosen.forEach((h) => { S.commissioned = S.commissioned.filter((x) => x.fqdn !== h.fqdn); });
          S.domains.push({
            id, name: w.data.name, type: "VI", vcenter: "vcsa-" + w.data.name, status: "Active",
            hosts: chosen.length, version: S.vcfVersion + ".0", vcenterVer: "vCenter 8.0U3",
            storage: w.data.storage, nsx: w.data.nsx === "shared" ? "NSX Manager (shared)" : "Dedicated NSX",
            license: "VCF Advanced", vcap: 38, mem: 24, cpu: 18, clusterHosts: chosen
          });
          save(); finish(true);
          toast("Workload domain created", w.data.name + " is active with " + chosen.length + " hosts.");
        });
      }
    };
  };

  /* Delete domain */
  wizards["delete-domain"] = function (id) {
    const d = S.domains.find((x) => x.id === id);
    return {
      title: "Delete Workload Domain",
      steps: ["Confirm"],
      data: { confirm: "" },
      render: (w) => `<div class="info-banner" style="background:var(--red-bg);border-color:#e6b3ad;color:#7a1d12"><span class="ib-ic">⚠️</span><div>You are about to delete <b>${esc(d ? d.name : "")}</b>. This removes its vCenter Server, clusters and frees the hosts back to the unassigned pool. This cannot be undone in the lab.</div></div>
        <div class="field" style="margin-top:14px"><label>Type the domain name to confirm</label><input data-f="confirm" placeholder="${esc(d ? d.name : "")}"></div>`,
      validate: (w) => (w.data.confirm === (d && d.name) ? null : "Type the exact domain name to confirm."),
      run: (w, finish) => {
        const stages = [["Removing hosts from cluster", ""], ["Deleting vCenter Server", ""], ["Deleting workload domain", ""]];
        runTask("Delete workload domain — " + d.name, "Workload domain decommissioning", stages, () => {
          (d.clusterHosts || []).forEach((h) => { h.pool = ""; S.commissioned.push(h); });
          S.domains = S.domains.filter((x) => x.id !== d.id);
          save(); finish(true); toast("Workload domain deleted", d.name + " removed; hosts returned to pool.");
        });
      }
    };
  };

  /* Add host to cluster */
  wizards["add-host"] = function () {
    const available = S.commissioned;
    return {
      title: "Expand Cluster — Add Host",
      steps: ["Select host", "Review"],
      data: { host: -1 },
      render: (w, step) => {
        if (!available.length) return `<div class="info-banner" style="margin:0"><span class="ib-ic">ℹ️</span><div>No commissioned-but-unassigned hosts. Commission a host first.</div></div>`;
        if (step === 0) return available.map((h, i) => `<label class="pick ${w.data.host === i ? "sel" : ""}">
          <input type="radio" name="ah" data-pick-host="${i}" ${w.data.host === i ? "checked" : ""}>
          <div class="pk-main"><div class="pk-name">${esc(h.fqdn)}</div><div class="pk-sub">${esc(h.model)} · ${esc(h.mem)}</div></div></label>`).join("");
        const h = available[w.data.host];
        return `<div class="review-box">${rv("Host", h ? h.fqdn : "—")}${rv("Action", "Add to cluster and apply vSAN storage policy")}</div>`;
      },
      validate: (w, step) => (step === 0 && w.data.host < 0 ? "Select a host." : null),
      run: (w, finish) => {
        const h = available[w.data.host];
        runTask("Add host " + h.fqdn + " to cluster", "Cluster expansion", [["Validating host", ""], ["Adding to vSAN cluster", ""], ["Applying storage policy", ""]], () => {
          S.commissioned = S.commissioned.filter((x) => x.fqdn !== h.fqdn);
          const d = S.domains.find((x) => detailCtx && x.id === detailCtx.id) || S.domains[0];
          d.clusterHosts = d.clusterHosts || []; d.clusterHosts.push(h); d.hosts++;
          save(); finish(true); toast("Host added", h.fqdn + " joined the cluster.");
        });
      }
    };
  };

  /* Network pool */
  wizards["add-pool"] = function () {
    return {
      title: "Create Network Pool",
      steps: ["Details", "Review"],
      data: { name: "w02-network-pool", total: 16 },
      render: (w, step) => step === 0 ? `
        <div class="field"><label>Network pool name <span class="req">*</span></label><input data-f="name" value="${esc(w.data.name)}"></div>
        <div class="field"><label>Total IP addresses</label><input data-f="total" type="number" min="4" value="${w.data.total}">
        <div class="help">Addresses are consumed by host vmkernel interfaces during commissioning.</div></div>`
        : `<div class="review-box">${rv("Name", w.data.name)}${rv("Total IPs", w.data.total)}${rv("Traffic types", "Management · vMotion · vSAN · NSX TEP")}</div>`,
      validate: (w) => (!w.data.name.trim() ? "Enter a name." : null),
      run: (w, finish) => runTask("Create network pool — " + w.data.name, "Network pool", [["Reserving IP range", ""], ["Creating network pool", ""]], () => {
        S.networkPools.push({ name: w.data.name, free: +w.data.total, used: 0, total: +w.data.total, subnets: "Management · vMotion · vSAN · NSX TEP" });
        save(); finish(true); toast("Network pool created", w.data.name);
      })
    };
  };

  /* Lifecycle upgrade */
  wizards.upgrade = function () {
    return {
      title: "Lifecycle Upgrade — VCF " + S.bundleVersion,
      steps: ["Prechecks", "Upgrade order", "Review & run"],
      data: { prechecked: false },
      render: (w, step) => {
        if (step === 0) return `<p style="margin-bottom:12px;color:var(--muted)">Prechecks validate the environment before any upgrade.</p>
          <button class="btn btn-secondary" data-precheck>▶ Run prechecks now</button>
          <div id="wizPre" style="margin-top:14px">${w.data.prechecked ? `<div class="badge green">All prechecks passed</div><div class="help" style="margin-top:8px">✓ No snapshots · ✓ Backup configured/fresh · ✓ Capacity available · ✓ No configuration drift</div>` : `<span class="hint">Not run yet.</span>`}</div>`;
        if (step === 1) return `<ol style="margin:0;padding-left:20px;line-height:2">
          <li><b>SDDC Manager</b> — upgraded first</li>
          <li><b>Management domain</b> — vCenter, NSX, then ESXi hosts</li>
          <li><b>VI workload domains</b> — one at a time</li></ol>
          <div class="help" style="margin-top:10px">The supported order is enforced automatically by LCM.</div>`;
        return `<div class="review-box">${rv("Target bundle", "VCF " + S.bundleVersion)}${rv("Scope", "Full stack, management domain first")}${rv("Estimated time", "~2–4 hours (simulated)")}${rv("Prechecks", w.data.prechecked ? "Passed" : "Not run")}</div>`;
      },
      validate: (w, step) => (step === 0 && !w.data.prechecked ? "Run the prechecks first." : null),
      run: (w, finish) => runTask("Upgrade to VCF " + S.bundleVersion, "Lifecycle management",
        [["Upgrading SDDC Manager", ""], ["Upgrading management vCenter", ""], ["Upgrading NSX-T", ""], ["Upgrading ESXi hosts (vLCM)", ""], ["Finalizing VI domains", ""]],
        () => {
          S.vcfVersion = S.bundleVersion;
          S.domains.forEach((d) => (d.version = S.bundleVersion));
          Object.keys(S.passwords).forEach((k) => (S.passwords[k] = 0));
          save(); finish(true); toast("Upgrade complete", "Instance is now on VCF " + S.bundleVersion + ".");
        })
    };
  };

  /* Backup */
  wizards.backup = function () {
    const b = S.backups;
    return {
      title: "Configure SDDC Manager Backup",
      steps: ["SFTP target", "Schedule", "Review"],
      data: { sftp: b.sftp || "sftp://backup.vcf.local:22/sddc-backups", schedule: b.schedule, retain: b.retain },
      render: (w, step) => {
        if (step === 0) return `<div class="field"><label>Backup (SFTP) server <span class="req">*</span></label><input data-f="sftp" value="${esc(w.data.sftp)}" placeholder="sftp://host:22/path"><div class="help">Backups are written to an external SFTP target.</div></div>`;
        if (step === 1) return `<div class="field-row">
          <div class="field"><label>Schedule</label><select data-f="schedule"><option>daily</option><option>weekly</option><option>monthly</option></select></div>
          <div class="field"><label>Retention (backups)</label><input data-f="retain" type="number" min="1" value="${w.data.retain}"></div></div>`;
        return `<div class="review-box">${rv("SFTP target", w.data.sftp)}${rv("Schedule", w.data.schedule)}${rv("Retention", w.data.retain + " backups")}</div>`;
      },
      validate: (w) => (!w.data.sftp.trim() ? "Enter the SFTP target." : null),
      run: (w, finish) => runTask("Configure SDDC Manager backup", "Backup", [["Validating SFTP target", ""], ["Saving backup configuration", ""], ["Running first backup", ""]], () => {
        S.backups = { enabled: true, sftp: w.data.sftp, schedule: w.data.schedule, retain: +w.data.retain, last: "Today (just now)", next: "Next " + w.data.schedule + " run" };
        save(); finish(true); toast("Backup configured", "First backup written to SFTP.");
      })
    };
  };

  /* Certificates */
  wizards.certs = function () {
    return {
      title: "Replace Certificates (External CA)",
      steps: ["Certificate authority", "Components", "Review"],
      data: { ca: "Microsoft AD CS", csr: true },
      render: (w, step) => {
        if (step === 0) return `<div class="field"><label>Certificate authority</label>
          <select data-f="ca"><option>Microsoft AD CS</option><option>OpenXPKI</option><option>Other (manual CSR)</option></select>
          <div class="help">SDDC Manager generates CSRs and installs the issued certificates.</div></div>`;
        if (step === 1) return `<p style="margin-bottom:10px;color:var(--muted)">Components to be issued CA-signed certificates:</p>
          ${["SDDC Manager", "vCenter Server", "NSX Manager", "NSX Edge", "ESXi hosts"].map((c) => `<label class="pick sel"><input type="checkbox" checked disabled><div class="pk-main"><div class="pk-name">${c}</div></div><span class="badge blue">CSR</span></label>`).join("")}`;
        return `<div class="review-box">${rv("CA", w.data.ca)}${rv("Components", "5 management components")}${rv("Action", "Generate CSRs, install signed certificates")}</div>`;
      },
      validate: () => null,
      run: (w, finish) => runTask("Replace component certificates", "Certificates", [["Generating CSRs", ""], ["Submitting to CA", w.ca], ["Installing certificates", ""], ["Verifying trust chain", ""]], () => {
        S.certMode = "CA"; save(); finish(true); toast("Certificates replaced", "All components now use CA-signed certificates.");
      })
    };
  };

  /* Passwords */
  wizards.passwords = function () {
    return {
      title: "Rotate Component Passwords",
      steps: ["Components", "Review"],
      data: { all: true },
      render: (w, step) => step === 0
        ? Object.keys(S.passwords).map((c) => `<label class="pick sel"><input type="checkbox" checked disabled><div class="pk-main"><div class="pk-name">${c}</div><div class="pk-sub">${S.passwords[c]} days old</div></div></label>`).join("")
        : `<div class="review-box">${rv("Components", "All managed components")}${rv("Action", "Generate and apply new credentials, update SDDC Manager inventory")}</div>`,
      validate: () => null,
      run: (w, finish) => runTask("Rotate component passwords", "Security", [["Generating new credentials", ""], ["Applying to vCenter / NSX / ESXi", ""], ["Updating SDDC Manager inventory", ""]], () => {
        Object.keys(S.passwords).forEach((k) => (S.passwords[k] = 0));
        save(); finish(true); toast("Passwords rotated", "All component credentials were updated.");
      })
    };
  };

  /* ---------- wizard engine ---------- */
  let wizard = null;
  function openWizard(name, extra) {
    const def = wizards[name];
    if (!def) return;
    const w = def(extra);
    wizard = Object.assign({ name, step: 0, data: {} }, w);
    renderModal();
  }
  function renderModal() {
    const ov = $("#modalOverlay"), m = $("#modal");
    if (!wizard) { ov.classList.add("hidden"); m.innerHTML = ""; return; }
    const last = wizard.steps.length - 1;
    m.innerHTML = `
      <div class="modal-head"><h3>${esc(wizard.title)}</h3><button class="modal-x" data-close>×</button></div>
      <div class="modal-steps">${wizard.steps.map((s, i) => `<div class="wstep ${i === wizard.step ? "active" : i < wizard.step ? "done" : ""}"><span class="num">${i < wizard.step ? "✓" : i + 1}</span>${esc(s)}</div>`).join("")}</div>
      <div class="modal-body" id="wizBody">${wizard.render(wizard, wizard.step)}</div>
      <div class="modal-foot">
        <button class="btn btn-secondary" data-close>${wizard.step === 0 ? "Cancel" : "Back"}</button>
        <div class="right">
          ${wizard.step < last ? `<button class="btn btn-primary" data-next>Next →</button>` : `<button class="btn btn-primary" data-finish>✓ Finish / Run</button>`}
        </div>
      </div>`;
    ov.classList.remove("hidden");
    bindModal();
  }
  function collectData() {
    $$("#wizBody [data-f]").forEach((el) => { wizard.data[el.dataset.f] = el.type === "number" ? +el.value : el.value; });
  }
  function bindModal() {
    $("#modal [data-close]").onclick = () => { wizard = null; renderModal(); };
    $("#modalOverlay").onclick = (e) => { if (e.target.id === "modalOverlay") { wizard = null; renderModal(); } };
    $$("#wizBody [data-pick]").forEach((el) => el.onchange = () => {
      collectData();
      const i = +el.dataset.pick;
      const arr = wizard.data.picked || (wizard.data.picked = []);
      if (el.checked) { if (!arr.includes(i)) arr.push(i); } else wizard.data.picked = arr.filter((x) => x !== i);
      wizard.data.picked.sort(); refreshStep();
    });
    $$("#wizBody [data-pick-host]").forEach((el) => el.onchange = () => {
      collectData();
      const i = +el.dataset.pickHost;
      if (el.type === "radio") wizard.data.hosts = [i], wizard.data.host = i;
      else {
        const arr = wizard.data.hosts || (wizard.data.hosts = []);
        if (el.checked) { if (!arr.includes(i)) arr.push(i); } else wizard.data.hosts = arr.filter((x) => x !== i);
        wizard.data.hosts.sort();
      }
      refreshStep();
    });
    const pre = $("#wizBody [data-precheck]");
    if (pre) pre.onclick = () => { wizard.data.prechecked = true; const out = $("#wizPre"); if (out) out.innerHTML = `<div class="spinner" style="width:30px;height:30px;border-width:3px;margin:6px 0 10px"></div><span class="hint">Running prechecks…</span>`; setTimeout(() => refreshStep(), 900); };
    const next = $("#modal [data-next]");
    if (next) next.onclick = () => {
      collectData();
      const err = wizard.validate ? wizard.validate(wizard, wizard.step) : null;
      if (err) { toast("Check required fields", err, "warn"); return; }
      wizard.step++; renderModal();
    };
    const fin = $("#modal [data-finish]");
    if (fin) fin.onclick = () => {
      collectData();
      const err = wizard.validate ? wizard.validate(wizard, wizard.step) : null;
      if (err) { toast("Cannot proceed", err, "warn"); return; }
      runWizardExecution();
    };
    // live update text fields without re-render (avoid focus loss)
    $$("#wizBody input[data-f], #wizBody select[data-f]").forEach((el) => el.addEventListener("input", collectData));
  }
  function refreshStep() { const body = $("#wizBody"); if (body) body.innerHTML = wizard.render(wizard, wizard.step); bindModal(); }

  function runWizardExecution() {
    const m = $("#modal");
    m.innerHTML = `<div class="modal-head"><h3>${esc(wizard.title)}</h3></div>
      <div class="modal-body"><div class="progress-oval"><div class="spinner"></div><h3 id="runStage">Starting…</h3><p class="hint" id="runSub">Please wait — do not close this window.</p><div class="bar" style="margin:18px 30px 0"><i id="runBar" style="width:0%"></i></div></div></div>`;
    const run = wizard.run;
    const finish = (ok) => { setTimeout(() => { wizard = null; renderModal(); }, 600); };
    run(wizard, finish);
  }

  /* ---------- task runner with staged progress ---------- */
  function runTask(name, sub, stages, onDone) {
    const id = S.taskSeq++;
    const task = { id, name, sub, pct: 0, status: "In progress", icon: "⟳", time: "Running" };
    S.tasks.push(task); save(); updateBadges();
    let si = 0;
    const stageEl = () => $("#runStage"), subEl = () => $("#runSub"), barEl = () => $("#runBar");
    function next() {
      if (si >= stages.length) {
        task.pct = 100; task.status = "Successful"; task.icon = "✓"; task.time = "Just now";
        save(); updateBadges();
        if (stageEl()) { stageEl().textContent = "✓ Completed successfully"; if (subEl()) subEl().textContent = name; if (barEl()) barEl().style.width = "100%"; }
        try { onDone && onDone(); } catch (e) {}
        if (view === "tasks") render();
        return;
      }
      const [label, detail] = stages[si];
      if (stageEl()) { stageEl().textContent = label; if (subEl()) subEl().textContent = detail || sub; }
      const targetPct = Math.round(((si + 1) / stages.length) * 100);
      animateBar(task, targetPct, () => { si++; next(); });
    }
    next();
  }
  function animateBar(task, target, cb) {
    const barEl = () => $("#runBar");
    const iv = setInterval(() => {
      task.pct = Math.min(target, task.pct + Math.max(1, Math.round((target - task.pct) / 4)));
      if (barEl()) barEl().style.width = task.pct + "%";
      save();
      if (task.pct >= target) { clearInterval(iv); setTimeout(cb, 350); }
    }, 160);
  }

  function rv(k, v) { return `<div class="rv"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span></div>`; }

  /* ---------- content binding ---------- */
  function bindContent() {
    $$("[data-go]").forEach((el) => el.onclick = () => go(el.dataset.go));
    $$("[data-wizard]").forEach((el) => el.onclick = () => openWizard(el.dataset.wizard, el.dataset.id));
    $$("[data-detail]").forEach((el) => el.onclick = () => openDetail(el.dataset.detail));
    const act = $("[data-action]");
    $$("[data-action]").forEach((el) => el.onclick = () => doAction(el.dataset.action, el));
    const bell = $("#taskBell");
    if (bell) bell.onclick = () => go("tasks");
  }

  function openDetail(token) {
    const [type, id] = token.split(":");
    const c = $("#content");
    if (type === "domain") { detailCtx = { type, id }; c.innerHTML = domainDetail(id); }
    else if (type === "pool") { detailCtx = { type, id }; c.innerHTML = poolDetail(id); }
    else if (type === "host") { detailCtx = { type, id }; c.innerHTML = hostDetail(id); }
    else if (type === "task") { detailCtx = { type, id }; go("tasks"); return; }
    bindContent(); window.scrollTo(0, 0);
  }

  function doAction(action, el) {
    if (action === "download-bundles") {
      toast("Bundles downloaded", "VCF " + S.bundleVersion + " bundle retrieved from the VMware depot.", "info");
      addSimpleTask("Download LCM bundle — VCF " + S.bundleVersion, "Lifecycle management");
    }
    if (action === "precheck") {
      const out = $("#precheckOut");
      out.innerHTML = `<div class="spinner" style="width:30px;height:30px;border-width:3px;margin:4px 0 10px"></div><span class="hint">Running prechecks…</span>`;
      setTimeout(() => {
        out.innerHTML = `<div class="badge green">All prechecks passed</div>
          <div style="margin-top:10px;line-height:1.9;font-size:13px">
          ✓ No VM snapshots on management components<br>
          ✓ SDDC Manager backup is ${S.backups.enabled ? "configured and fresh" : "<b style='color:var(--amber)'>NOT configured — configure backup before upgrade</b>"}<br>
          ✓ Sufficient compute and storage capacity<br>
          ✓ No configuration drift detected<br>
          ✓ NTP and DNS healthy</div>`;
      }, 1100);
    }
    if (action === "backup-now") {
      runTask("Back up SDDC Manager (on demand)", "Backup", [["Snapshotting configuration", ""], ["Transferring to SFTP", S.backups.sftp], ["Verifying backup", ""]], () => {
        S.backups.last = "Today (manual)"; save(); toast("Backup complete", "Configuration backed up to SFTP."); if (view === "backup") render();
      });
    }
  }
  function addSimpleTask(name, sub) {
    const id = S.taskSeq++;
    S.tasks.push({ id, name, sub, pct: 100, status: "Successful", icon: "✓", time: "Just now" });
    save(); updateBadges();
  }

  function updateBadges() {
    const running = S.tasks.filter((t) => t.pct < 100).length;
    const badge = $("#navTaskBadge"), dot = $("#bellDot");
    if (badge) { badge.textContent = S.tasks.length; badge.style.display = S.tasks.length ? "" : "none"; }
    if (dot) { dot.textContent = running; dot.classList.toggle("show", running > 0); }
    const v = $("#vcfVersion"); if (v) v.textContent = S.vcfVersion;
  }

  /* ---------- chrome ---------- */
  $$(".nav-item").forEach((n) => n.onclick = () => go(n.dataset.view));
  $("#navToggle").onclick = () => $("#sidenav").classList.toggle("open");
  $("#resetLab").onclick = () => {
    if (confirm("Reset the practice lab to its initial state? All your changes will be cleared.")) {
      S = defaultState(); save(); go("dashboard"); toast("Lab reset", "The console is back to its starting state.", "info");
    }
  };
  $("#ribbonClose").onclick = () => $("#simRibbon").style.display = "none";

  go("dashboard");
})();
