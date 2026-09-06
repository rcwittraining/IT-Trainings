/* RCW - NetArchitect : starter templates (HLD & LLD)
   Every template is a plain function returning a document object. Page space is A3 landscape (1587 x 1123 px @96dpi).
*/
(function () {
  "use strict";
  const SH = window.RCW_SHAPES;
  const today = () => new Date().toISOString().slice(0, 10);

  function builder() {
    let seq = 0;
    const nodes = [], edges = [];
    const n = (type, x, y, label, o = {}) => {
      const s = SH.get(type);
      if (!s) throw new Error("Unknown shape " + type);
      const node = { id: "n" + (++seq), type, x, y, w: o.w || s.w, h: o.h || s.h, label: label == null ? (s.label != null ? s.label : s.name) : label, sub: o.sub || "", style: o.style || {}, parent: o.parent || null, locked: !!o.locked, props: Object.assign({}, s.props || {}, o.props || {}), attrs: o.attrs || [] };
      nodes.push(node);
      return node.id;
    };
    const e = (from, to, label, o = {}) => {
      edges.push({ id: "e" + (++seq), from: { node: from, port: o.fp || "auto" }, to: { node: to, port: o.tp || "auto" }, points: o.points || [], label: label || "", srcLabel: o.src || "", dstLabel: o.dst || "", style: Object.assign({ router: o.route || "orthogonal", startArrow: "none", endArrow: "none" }, o.style || {}), preset: o.preset || "link", attrs: o.attrs || [], labelT: o.labelT == null ? 0.5 : o.labelT });
    };
    return { nodes, edges, n, e };
  }
  function doc(meta, pages) {
    return { app: "RCW-NetArchitect", version: 1, meta: Object.assign({ title: "Untitled diagram", level: "HLD", author: "", org: "", version: "0.1", date: today(), status: "Draft", classification: "Internal", description: "", standard: "RCW notation v1" }, meta), pages, activePage: 0, settings: { grid: true, snap: true, gridSize: 20, guides: true, hideDetail: false, page: { size: "A3", orientation: "landscape" } } };
  }
  function page(name, level, b, opts = {}) {
    return Object.assign({ id: "p" + Math.random().toString(36).slice(2, 8), name, level, nodes: b.nodes, edges: b.edges }, opts);
  }
  const FLOW = { endArrow: "arrow" }, DEP = { endArrow: "arrow", dash: "6 4" };
  // add standard furniture: heading, legend, title block
  function furniture(b, heading) {
    b.n("heading", 40, 26, heading, { w: 1000, h: 40 });
    b.n("legend", 40, 963, "Legend", { w: 300, h: 120, props: { auto: true } });
    b.n("titleblock", 1127, 987, "Title block", { w: 420, h: 96 });
  }

  const TEMPLATES = [];

  /* ---------------- Blank ---------------- */
  TEMPLATES.push({ id: "blank-hld", name: "Blank HLD (A3 landscape)", level: "HLD", desc: "Empty page with heading, legend and title block ready.", build() {
    const b = builder(); furniture(b, "High-Level Design");
    return doc({ title: "High-Level Design", level: "HLD" }, [page("HLD", "HLD", b)]);
  } });
  TEMPLATES.push({ id: "blank-lld", name: "Blank LLD (A3 landscape)", level: "LLD", desc: "Empty page with heading, legend, title block and revision history.", build() {
    const b = builder(); furniture(b, "Low-Level Design");
    b.n("revtable", 740, 987, "Revision history", { w: 370, h: 96 });
    return doc({ title: "Low-Level Design", level: "LLD" }, [page("LLD", "LLD", b)]);
  } });

  /* ---------------- Enterprise campus HLD ---------------- */
  TEMPLATES.push({ id: "campus-hld", name: "Enterprise campus network (HLD)", level: "HLD", desc: "Three-tier campus: Internet edge, DMZ, core, distribution, access and endpoints with management and DC zones.", build() {
    const b = builder(); furniture(b, "Enterprise Campus Network - High-Level Design");
    const inet = b.n("internet", 745, 78, "Internet");
    const r1 = b.n("router", 640, 185, "ISP-A edge router", { sub: "isp-rtr-01" });
    const r2 = b.n("router", 880, 185, "ISP-B edge router", { sub: "isp-rtr-02" });
    const mz = b.n("mgmt", 40, 285, "Management zone", { w: 400, h: 180 });
    const nms = b.n("monitoring", 60, 350, "NMS", { sub: "nms-01", parent: mz });
    const siem = b.n("siem", 150, 350, "SIEM", { sub: "siem-01", parent: mz });
    const aaa = b.n("nac", 240, 350, "AAA / NAC", { sub: "ise-01", parent: mz });
    const dns = b.n("dns", 330, 350, "DNS / DHCP", { sub: "infra-01", parent: mz });
    const dmz = b.n("dmz", 470, 285, "DMZ", { w: 650, h: 180 });
    const ha = b.n("cluster", 490, 313, "Edge firewall HA pair", { w: 200, h: 135, parent: dmz });
    const fw1 = b.n("firewall", 505, 350, "Edge FW-A", { sub: "edge-fw-01", parent: ha });
    const fw2 = b.n("firewall", 605, 350, "Edge FW-B", { sub: "edge-fw-02", parent: ha });
    const waf = b.n("waf", 740, 350, "WAF", { sub: "waf-01", parent: dmz });
    const pxy = b.n("proxy", 830, 350, "Web proxy", { sub: "proxy-01", parent: dmz });
    const web = b.n("webserver", 930, 350, "Public web", { sub: "web-dmz-01", parent: dmz });
    const mail = b.n("mailserver", 1030, 350, "Mail relay", { sub: "smtp-01", parent: dmz });
    const dc = b.n("onprem", 1150, 285, "Data centre", { w: 397, h: 180 });
    const hv = b.n("hypervisor", 1170, 350, "Virtualisation cluster", { sub: "esx-01..04", parent: dc });
    const san = b.n("storage", 1255, 350, "SAN", { sub: "san-01", parent: dc });
    const ad = b.n("ad", 1330, 350, "Directory", { sub: "dc-01/02", parent: dc });
    const db = b.n("database", 1415, 350, "Databases", { sub: "db-01", parent: dc });
    const coreLane = b.n("swimlane", 40, 480, "Core layer", { w: 1507, h: 115 });
    const c1 = b.n("l3switch", 700, 507, "Core-A", { sub: "core-sw-01", parent: coreLane });
    const c2 = b.n("l3switch", 820, 507, "Core-B", { sub: "core-sw-02", parent: coreLane });
    const distLane = b.n("swimlane", 40, 605, "Distribution layer", { w: 1507, h: 110 });
    const accLane = b.n("swimlane", 40, 725, "Access layer", { w: 1507, h: 110 });
    const cols = [340, 660, 980, 1300], names = ["Building A", "Building B", "Building C", "Building D"];
    cols.forEach((x, i) => {
      const d = b.n("l3switch", x, 630, "Dist " + names[i], { sub: "dist-sw-0" + (i + 1), parent: distLane });
      const a = b.n("switch", x, 750, "Access " + names[i], { sub: "acc-sw-0" + (i + 1) + "x", parent: accLane });
      const pc = b.n("pc", x - 90, 850, "Users");
      const ph = b.n("ipphone", x - 20, 850, "IP phones");
      const ap = b.n("ap", x + 50, 850, "Wi-Fi");
      b.e(c1, d, i === 0 ? "10G" : ""); b.e(c2, d, "");
      b.e(d, a, "2x10G");
      b.e(a, pc); b.e(a, ph); b.e(a, ap);
    });
    b.e(inet, r1, "ISP-A"); b.e(inet, r2, "ISP-B");
    b.e(r1, fw1); b.e(r1, fw2); b.e(r2, fw1); b.e(r2, fw2);
    b.e(fw1, fw2, "HA sync", { style: { dash: "6 4" }, preset: "logical" });
    b.e(fw1, c1, "Inside"); b.e(fw2, c2, "Inside"); b.e(fw1, c2); b.e(fw2, c1);
    b.e(fw2, waf); b.e(waf, web, "HTTPS"); b.e(fw1, pxy); b.e(fw2, mail);
    b.e(hv, c2, "2x25G"); b.e(san, hv, "FC", { preset: "fibre-mm" }); b.e(ad, c2); b.e(db, c2);
    b.e(nms, c1); b.e(siem, c1); b.e(aaa, c1); b.e(dns, c1);
    return doc({ title: "Enterprise Campus Network", level: "HLD", description: "Three-tier campus with redundant Internet edge, DMZ services, and a data centre block." }, [page("Campus HLD", "HLD", b)]);
  } });

  /* ---------------- Hybrid cloud HLD ---------------- */
  TEMPLATES.push({ id: "hybrid-cloud-hld", name: "Hybrid cloud (on-prem + AWS / Azure style)", level: "HLD", desc: "On-premises DC connected to a cloud region over dedicated link and IPsec, with VPC subnets and managed services.", build() {
    const b = builder(); furniture(b, "Hybrid Cloud Connectivity - High-Level Design");
    const br = b.n("branch", 80, 110, "Branch offices", { sub: "SD-WAN" });
    const ru = b.n("laptop", 80, 270, "Remote users", { sub: "SSL VPN / ZTNA" });
    const cust = b.n("users", 80, 400, "Customers");
    const inet = b.n("internet", 640, 100, "Internet", { w: 120, h: 80 });
    const cdn = b.n("ccdn", 900, 112, "CDN / edge"); const cwaf = b.n("cwafc", 990, 112, "Cloud WAF"); const cdns = b.n("cdns", 1080, 112, "Public DNS");
    const dcz = b.n("onprem", 40, 470, "On-premises data centre (Chennai)", { w: 560, h: 380 });
    const rtr = b.n("router", 80, 530, "WAN router", { sub: "dc-rtr-01", parent: dcz });
    const fw = b.n("firewall", 200, 530, "DC firewall", { sub: "dc-fw-01", parent: dcz });
    const core = b.n("l3switch", 320, 530, "DC core", { sub: "dc-core-01", parent: dcz });
    const vpn = b.n("vpn", 440, 530, "VPN concentrator", { sub: "dc-vpn-01", parent: dcz });
    const hv = b.n("hypervisor", 80, 690, "vSphere cluster", { sub: "esx-01..06", parent: dcz });
    const san = b.n("storage", 200, 690, "Storage", { sub: "san-01", parent: dcz });
    const ad = b.n("ad", 320, 690, "Active Directory", { sub: "dc-01/02", parent: dcz });
    const bkp = b.n("backup", 440, 690, "Backup", { sub: "veeam-01", parent: dcz });
    const region = b.n("cregion", 660, 260, "Cloud region (ap-south-1 / Central India)", { w: 887, h: 600 });
    const vpc = b.n("cvpc", 690, 330, "VPC / VNet 10.50.0.0/16", { w: 620, h: 500, parent: region });
    const pub = b.n("csubnet", 705, 380, "Public subnet 10.50.1.0/24", { w: 590, h: 130, parent: vpc });
    const igw = b.n("cigw", 720, 420, "Internet gateway", { parent: pub });
    const nat = b.n("cnat", 810, 420, "NAT gateway", { parent: pub });
    const alb = b.n("celb", 900, 420, "Application LB", { parent: pub });
    const bast = b.n("bastion", 990, 416, "Bastion", { parent: pub });
    const app = b.n("csubnetp", 705, 530, "Private subnet - app 10.50.2.0/24", { w: 590, h: 130, parent: vpc });
    const i1 = b.n("cinstance", 720, 570, "Web/app 1", { parent: app });
    const i2 = b.n("cinstance", 800, 570, "Web/app 2", { parent: app });
    const asg = b.n("cautoscale", 880, 570, "Auto-scaling", { parent: app });
    const eks = b.n("ck8s", 960, 570, "Kubernetes", { parent: app });
    const fn = b.n("cfunction", 1040, 570, "Functions", { parent: app });
    const data = b.n("csubnetp", 705, 680, "Private subnet - data 10.50.3.0/24", { w: 590, h: 130, parent: vpc });
    const rds = b.n("crdb", 720, 720, "Managed DB (primary)", { parent: data });
    const rds2 = b.n("crdb", 830, 720, "Managed DB (standby)", { parent: data });
    const cache = b.n("ccache", 940, 720, "Cache", { parent: data });
    const nosql = b.n("cnosql", 1020, 720, "NoSQL", { parent: data });
    const s3 = b.n("cobject", 1340, 340, "Object storage", { parent: region });
    const kms = b.n("ckms", 1440, 340, "KMS", { parent: region });
    const iam = b.n("ciam", 1340, 430, "IAM / Entra", { parent: region });
    const sec = b.n("csecrets", 1440, 430, "Secrets", { parent: region });
    const mon = b.n("cmonitor", 1340, 520, "Monitoring", { parent: region });
    const logs = b.n("clogs", 1440, 520, "Audit logs", { parent: region });
    const bv = b.n("cbackup", 1340, 610, "Backup vault", { parent: region });
    const tgw = b.n("ctransit", 1440, 610, "Transit hub", { parent: region });
    const dx = b.n("cdirect", 1340, 720, "Direct Connect / ExpressRoute", { parent: region });
    const vgw = b.n("cvpngw", 1440, 720, "VPN gateway", { parent: region });
    b.e(br, inet); b.e(ru, inet); b.e(cust, inet);
    b.e(inet, cdn, "HTTPS", FLOW && { style: FLOW }); b.e(cdn, cwaf); b.e(cwaf, alb, "HTTPS 443", { style: FLOW }); b.e(cdns, cdn, "", { style: DEP });
    b.e(inet, igw); b.e(igw, alb); b.e(alb, i1); b.e(alb, i2); b.e(alb, eks);
    b.e(i1, rds, "SQL/TLS", { style: FLOW }); b.e(i2, cache); b.e(eks, nosql); b.e(fn, s3, "", { style: FLOW });
    b.e(rds, rds2, "sync replication", { style: { dash: "6 4" }, preset: "logical" }); b.e(rds, bv, "snapshots", { style: DEP });
    b.e(rtr, dx, "1 Gbps dedicated", { preset: "wan" }); b.e(vpn, vgw, "IPsec backup tunnel", { preset: "tunnel" });
    b.e(dx, tgw); b.e(vgw, tgw); b.e(tgw, vpc);
    b.e(rtr, fw); b.e(fw, core); b.e(fw, vpn); b.e(core, hv); b.e(hv, san, "FC", { preset: "fibre-mm" }); b.e(core, ad); b.e(core, bkp);
    b.e(ad, iam, "identity federation", { style: DEP }); b.e(bkp, s3, "offsite copy", { style: DEP });
    b.e(i1, mon, "", { style: DEP }); b.e(eks, logs, "", { style: DEP });
    return doc({ title: "Hybrid Cloud Connectivity", level: "HLD" }, [page("Hybrid cloud HLD", "HLD", b)]);
  } });

  /* ---------------- 3-tier web application HLD ---------------- */
  TEMPLATES.push({ id: "web-3tier-hld", name: "3-tier web application (HLD)", level: "HLD", desc: "Clients, edge, presentation, application and data tiers with cross-cutting services, laid out in swimlanes.", build() {
    const b = builder(); furniture(b, "3-Tier Web Application - High-Level Design");
    const lanes = [["Clients", 80], ["Edge & security", 220], ["Presentation tier", 380], ["Application tier", 540], ["Data tier", 700], ["Cross-cutting services", 850]];
    const L = {};
    lanes.forEach(([name, y], i) => { const h = i === 5 ? 100 : (lanes[i + 1][1] - y - 10); L[name] = b.n("swimlane", 40, y, name, { w: 1507, h }); });
    const br = b.n("browser", 300, 110, "Web browser", { parent: L["Clients"] });
    const mob = b.n("mobileapp", 500, 108, "Mobile app", { parent: L["Clients"] });
    const partner = b.n("thirdparty", 700, 100, "Partner systems (B2B API)", { w: 180, h: 56, parent: L["Clients"] });
    const cdn = b.n("ccdn", 300, 252, "CDN", { parent: L["Edge & security"] });
    const waf = b.n("waf", 420, 250, "WAF / DDoS", { parent: L["Edge & security"] });
    const lb = b.n("loadbalancer", 560, 252, "Load balancer", { sub: "TLS termination", parent: L["Edge & security"] });
    const apigw = b.n("capigw", 720, 252, "API gateway", { parent: L["Edge & security"] });
    const idp = b.n("idp", 1200, 250, "Identity provider (SSO)", { parent: L["Edge & security"] });
    const w1 = b.n("webserver", 380, 420, "Web 1", { sub: "nginx", parent: L["Presentation tier"] });
    const w2 = b.n("webserver", 480, 420, "Web 2", { sub: "nginx", parent: L["Presentation tier"] });
    const spa = b.n("cobject", 720, 420, "Static assets", { parent: L["Presentation tier"] });
    const a1 = b.n("appserver", 380, 580, "App 1", { parent: L["Application tier"] });
    const a2 = b.n("appserver", 480, 580, "App 2", { parent: L["Application tier"] });
    const q = b.n("squeue", 640, 590, "Job queue", { w: 150, h: 46, parent: L["Application tier"] });
    const wk = b.n("worker", 840, 578, "Workers", { parent: L["Application tier"] });
    const sch = b.n("scheduler", 940, 578, "Scheduler", { parent: L["Application tier"] });
    const db1 = b.n("database", 380, 740, "Primary DB", { sub: "PostgreSQL", parent: L["Data tier"] });
    const db2 = b.n("database", 480, 740, "Replica", { sub: "read-only", parent: L["Data tier"] });
    const cache = b.n("scache", 640, 742, "Cache", { parent: L["Data tier"] });
    const srch = b.n("search", 740, 742, "Search", { parent: L["Data tier"] });
    const fs = b.n("filestore", 840, 742, "File store", { parent: L["Data tier"] });
    const bk = b.n("cbackup", 1000, 742, "Backups", { parent: L["Data tier"] });
    const mon = b.n("monitoring", 1140, 880, "Monitoring", { parent: L["Cross-cutting services"] });
    const log = b.n("logserver", 1240, 880, "Central logging", { parent: L["Cross-cutting services"] });
    const vault = b.n("vault", 1340, 876, "Secrets", { parent: L["Cross-cutting services"] });
    const ci = b.n("ccicd", 1440, 876, "CI/CD", { parent: L["Cross-cutting services"] });
    b.e(br, cdn, "HTTPS", { style: FLOW }); b.e(mob, apigw, "HTTPS/JSON", { style: FLOW }); b.e(partner, apigw, "mTLS", { style: FLOW });
    b.e(cdn, waf, "", { style: FLOW }); b.e(waf, lb, "", { style: FLOW }); b.e(apigw, lb, "", { style: FLOW }); b.e(cdn, spa, "origin", { style: DEP });
    b.e(lb, w1, "", { style: FLOW }); b.e(lb, w2, "", { style: FLOW }); b.e(br, idp, "OIDC", { style: DEP }); b.e(apigw, idp, "JWT validation", { style: DEP });
    b.e(w1, a1, "HTTP 8080", { style: FLOW }); b.e(w2, a2, "HTTP 8080", { style: FLOW }); b.e(a1, q, "enqueue", { style: FLOW }); b.e(q, wk, "consume", { style: FLOW }); b.e(sch, q, "", { style: DEP });
    b.e(a1, db1, "SQL 5432", { style: FLOW }); b.e(a2, db2, "read", { style: FLOW }); b.e(db1, db2, "streaming replication", { style: { dash: "6 4" } }); b.e(a2, cache, "", { style: FLOW }); b.e(wk, srch, "index", { style: FLOW }); b.e(wk, fs, "", { style: FLOW }); b.e(db1, bk, "nightly", { style: DEP });
    b.e(a1, mon, "", { style: DEP }); b.e(wk, log, "", { style: DEP }); b.e(a2, vault, "secrets", { style: DEP });
    return doc({ title: "3-Tier Web Application", level: "HLD" }, [page("Application HLD", "HLD", b)]);
  } });

  /* ---------------- Branch office LLD ---------------- */
  TEMPLATES.push({ id: "branch-lld", name: "Branch office (LLD - interfaces & addressing)", level: "LLD", desc: "Interface-level topology with port labels, IP/VLAN plan tables and per-VLAN segments.", build() {
    const b = builder(); furniture(b, "Branch Office - Low-Level Design (Interfaces, VLANs & Addressing)");
    b.n("revtable", 360, 963, "Revision history", { w: 360, h: 96 });
    const inet = b.n("internet", 60, 100, "ISP (Internet)", { sub: "203.0.113.0/30" });
    const rtr = b.n("router", 300, 100, "br-rtr-01", { sub: "ISR 4331 - 10.20.99.1", attrs: [{ k: "Model", v: "Cisco ISR 4331" }, { k: "Loopback0", v: "10.20.255.1/32" }, { k: "Mgmt VLAN", v: "99" }] });
    const fw = b.n("firewall", 520, 104, "br-fw-01", { sub: "FortiGate 100F", attrs: [{ k: "HA", v: "Standalone" }, { k: "Mgmt IP", v: "10.20.99.2" }] });
    const core = b.n("l3switch", 760, 102, "br-core-sw-01", { sub: "C9300-48P - 10.20.99.3", attrs: [{ k: "Model", v: "Catalyst 9300-48P" }, { k: "SVIs", v: "10,20,30,40,50,99" }] });
    const a1 = b.n("switch", 640, 320, "br-acc-sw-01", { sub: "C9200L-48P - 10.20.99.11" });
    const a2 = b.n("switch", 900, 320, "br-acc-sw-02", { sub: "C9200L-48P - 10.20.99.12" });
    const v10 = b.n("vlan", 40, 540, "VLAN 10 - Users - 10.20.10.0/24 (GW .1)", { w: 360, h: 150 });
    const pc1 = b.n("pc", 70, 590, "PC-01", { sub: "DHCP", parent: v10 }); const pc2 = b.n("pc", 160, 590, "PC-02", { sub: "DHCP", parent: v10 }); const lap = b.n("laptop", 250, 596, "Laptops", { sub: "DHCP pool .50-.250", parent: v10 });
    const v20 = b.n("vlan", 420, 540, "VLAN 20 - Voice - 10.20.20.0/24 (GW .1)", { w: 360, h: 150 });
    const ph1 = b.n("ipphone", 450, 592, "Phone-01", { sub: "PoE - CDP voice VLAN", parent: v20 }); const ph2 = b.n("ipphone", 560, 592, "Phone-02", { parent: v20 });
    const v30 = b.n("vlan", 800, 540, "VLAN 30 - Wireless - 10.20.30.0/24 (GW .1)", { w: 360, h: 150 });
    const ap1 = b.n("ap", 830, 588, "br-ap-01", { sub: "10.20.99.21 (mgmt)", parent: v30 }); const ap2 = b.n("ap", 920, 588, "br-ap-02", { sub: "10.20.99.22 (mgmt)", parent: v30 }); const mob = b.n("mobile", 1040, 588, "BYOD", { parent: v30 });
    const v40 = b.n("vlan", 40, 710, "VLAN 40 - Printers - 10.20.40.0/24", { w: 360, h: 130 });
    const pr = b.n("printer", 70, 750, "br-prn-01", { sub: "10.20.40.10 (static)", parent: v40 });
    const v50 = b.n("vlan", 420, 710, "VLAN 50 - CCTV / IoT - 10.20.50.0/24", { w: 360, h: 130 });
    const cam = b.n("camera", 450, 754, "br-cam-01..08", { sub: "10.20.50.11-18", parent: v50 });
    const v99 = b.n("vlan", 800, 710, "VLAN 99 - Management - 10.20.99.0/24", { w: 360, h: 130 });
    const nms = b.n("monitoring", 830, 752, "NMS (HQ)", { sub: "10.10.99.50 via WAN", parent: v99 });
    b.n("table", 1180, 90, "VLAN plan", { w: 367, h: 150, props: { rows: "VLAN | Name | Subnet | Gateway\n10 | Users | 10.20.10.0/24 | 10.20.10.1\n20 | Voice | 10.20.20.0/24 | 10.20.20.1\n30 | Wireless | 10.20.30.0/24 | 10.20.30.1\n40 | Printers | 10.20.40.0/24 | 10.20.40.1\n50 | CCTV/IoT | 10.20.50.0/24 | 10.20.50.1\n99 | Management | 10.20.99.0/24 | 10.20.99.1" } });
    b.n("table", 1180, 262, "Device addressing", { w: 367, h: 150, props: { rows: "Device | Interface | IP / mask | Notes\nbr-rtr-01 | Gi0/0/0 | 203.0.113.2/30 | ISP handoff\nbr-rtr-01 | Gi0/0/1 | 10.20.0.1/30 | to firewall\nbr-fw-01 | port1 | 10.20.0.2/30 | outside\nbr-fw-01 | port2 | 10.20.1.1/30 | inside P2P\nbr-core-sw-01 | Gi1/0/1 | 10.20.1.2/30 | uplink\nbr-core-sw-01 | Vlan99 | 10.20.99.3/24 | mgmt SVI" } });
    b.n("table", 1180, 434, "Port map (trunks & uplinks)", { w: 367, h: 150, props: { rows: "From | Port | To | Port | Mode\ncore-sw-01 | Gi1/0/47 | acc-sw-01 | Gi1/0/48 | Trunk 10,20,30,40,50,99\ncore-sw-01 | Gi1/0/48 | acc-sw-02 | Gi1/0/48 | Trunk 10,20,30,40,50,99\nacc-sw-01 | Gi1/0/1-24 | PCs/phones | - | Access 10 / voice 20\nacc-sw-02 | Gi1/0/45-46 | APs | - | Trunk native 99\nacc-sw-02 | Gi1/0/40 | printer | - | Access 40" } });
    b.n("note", 1180, 610, "Design notes:\n- All uplinks 1G copper Cat6A, PoE+ budget 740 W per access switch.\n- Native VLAN 999 (unused) on all trunks; DTP disabled.\n- Voice VLAN via CDP/LLDP-MED; DHCP option 150 -> HQ CUCM.\n- Management via VLAN 99 only; SSHv2, AAA to HQ ISE.", { w: 367, h: 110, style: { fontSize: 11 } });
    b.e(inet, rtr, "203.0.113.0/30", { src: "", dst: "Gi0/0/0", preset: "wan" });
    b.e(rtr, fw, "10.20.0.0/30", { src: "Gi0/0/1", dst: "port1" });
    b.e(fw, core, "10.20.1.0/30 (P2P routed)", { src: "port2", dst: "Gi1/0/1" });
    b.e(core, a1, "Trunk", { src: "Gi1/0/47", dst: "Gi1/0/48" });
    b.e(core, a2, "Trunk", { src: "Gi1/0/48", dst: "Gi1/0/48" });
    b.e(a1, pc1, "", { src: "Gi1/0/1", dst: "" }); b.e(a1, pc2, "", { src: "Gi1/0/2" }); b.e(a1, lap, "", { src: "Gi1/0/3-10" });
    b.e(a1, ph1, "PoE", { src: "Gi1/0/11" }); b.e(a1, ph2, "PoE", { src: "Gi1/0/12" });
    b.e(a2, ap1, "PoE+ trunk", { src: "Gi1/0/45" }); b.e(a2, ap2, "PoE+ trunk", { src: "Gi1/0/46" }); b.e(ap1, mob, "802.11ax", { preset: "wireless" });
    b.e(a1, pr, "", { src: "Gi1/0/40" }); b.e(a2, cam, "PoE", { src: "Gi1/0/1-8" }); b.e(core, nms, "SNMPv3 / syslog", { style: DEP });
    return doc({ title: "Branch Office Network", level: "LLD", description: "Interface-level design for a 50-user branch with voice, wireless and CCTV segments." }, [page("Branch LLD", "LLD", b)]);
  } });

  /* ---------------- Rack elevation LLD ---------------- */
  TEMPLATES.push({ id: "rack-lld", name: "Data centre rack elevation (LLD)", level: "LLD", desc: "Two 42U racks with U positions, plus elevation schedule, cabling schedule and power table.", build() {
    const b = builder(); furniture(b, "Data Centre Rack Elevation - Low-Level Design");
    b.n("revtable", 360, 963, "Revision history", { w: 360, h: 96 });
    const U = 16, HDR = 26;
    function rack(x, name, items) {
      const ry = 100;
      const r = b.n("rack", x, ry, name, { w: 180, h: HDR + 42 * U + 6 });
      items.forEach(it => {
        const [uTop, uSize, type, label, sub] = it;
        const y = ry + HDR + (42 - uTop) * U + 1;
        const style = type === "sw" ? { fill: "#1f6fb5", stroke: "#0d3d68" } : type === "fw" ? { fill: "#d0463f", stroke: "#7c1f1a" } : type === "st" ? { fill: "#2a9d8f", stroke: "#12574f" } : {};
        const st2 = type === "patchpanel" ? { fill: "#23313f", stroke: "#0b1219" } : type === "pdu" ? { fill: "#333", stroke: "#111" } : type === "kvm" ? { fill: "#5b6b7f", stroke: "#2e3a48" } : style;
        b.n("rackdevice", x + 24, y, label, { w: 150, h: uSize * U - 2, parent: r, sub, style: st2 });
      });
      return r;
    }
    rack(60, "Rack A01 (network)", [[42, 1, "patchpanel", "PP-A01-42 (48x Cat6A)"], [41, 1, "patchpanel", "PP-A01-41 (24x LC fibre)"], [40, 1, "sw", "core-sw-01 (C9500-48Y4C)"], [39, 1, "sw", "core-sw-02 (C9500-48Y4C)"], [37, 1, "fw", "dc-fw-01 (PA-3220)"], [36, 1, "fw", "dc-fw-02 (PA-3220)"], [34, 1, "sw", "oob-sw-01 (C9200-24T)"], [33, 1, "kvm", "KVM / console server"], [30, 2, "srv", "lb-01 (F5 i2600)"], [28, 2, "srv", "lb-02 (F5 i2600)"], [20, 4, "st", "san-01 (Pure X20)"], [10, 2, "srv", "bkp-01 (R750xd)"], [4, 1, "pdu", "PDU-A (32A) - feed A"], [3, 1, "pdu", "PDU-B (32A) - feed B"]]);
    rack(280, "Rack A02 (compute)", [[42, 1, "patchpanel", "PP-A02-42 (48x Cat6A)"], [41, 1, "sw", "tor-sw-01 (N9K-93180)"], [40, 1, "sw", "tor-sw-02 (N9K-93180)"], [38, 2, "srv", "esx-01 (R760)"], [36, 2, "srv", "esx-02 (R760)"], [34, 2, "srv", "esx-03 (R760)"], [32, 2, "srv", "esx-04 (R760)"], [30, 2, "srv", "esx-05 (R760)"], [28, 2, "srv", "esx-06 (R760)"], [24, 2, "srv", "db-01 (R760 - 1 TB RAM)"], [22, 2, "srv", "db-02 (R760 - 1 TB RAM)"], [14, 4, "st", "nas-01 (FAS2820)"], [4, 1, "pdu", "PDU-A (32A) - feed A"], [3, 1, "pdu", "PDU-B (32A) - feed B"]]);
    b.n("table", 520, 100, "Rack elevation schedule", { w: 520, h: 280, props: { rows: "Rack | U | Device | Model | Serial | Mgmt IP\nA01 | 40 | core-sw-01 | C9500-48Y4C | FDO2xxxxxxA | 10.0.99.11\nA01 | 39 | core-sw-02 | C9500-48Y4C | FDO2xxxxxxB | 10.0.99.12\nA01 | 37 | dc-fw-01 | PA-3220 | 0130xxxxxx | 10.0.99.21\nA01 | 36 | dc-fw-02 | PA-3220 | 0130xxxxxx | 10.0.99.22\nA01 | 29-30 | lb-01 | F5 i2600 | f5-xxxx | 10.0.99.31\nA01 | 17-20 | san-01 | Pure X20 | PURE-xxxx | 10.0.99.41\nA02 | 41 | tor-sw-01 | N9K-93180YC | FDO2xxxxxxC | 10.0.99.13\nA02 | 37-38 | esx-01 | PowerEdge R760 | SVCTAG1 | 10.0.98.11 (iDRAC)\nA02 | 23-24 | db-01 | PowerEdge R760 | SVCTAG7 | 10.0.98.21 (iDRAC)" } });
    b.n("table", 520, 400, "Cabling schedule", { w: 520, h: 250, props: { rows: "Cable ID | From (device/port) | To (device/port) | Type | Length\nA01-001 | core-sw-01 Te1/0/49 | core-sw-02 Te1/0/49 | MMF OM4 LC-LC | 1 m\nA01-002 | core-sw-01 Te1/0/1 | dc-fw-01 eth1/1 | Cat6A | 2 m\nA01-003 | core-sw-02 Te1/0/1 | dc-fw-02 eth1/1 | Cat6A | 2 m\nA01-010 | core-sw-01 Te1/0/50 | tor-sw-01 Eth1/49 | SMF OS2 LC-LC | 5 m\nA01-011 | core-sw-02 Te1/0/50 | tor-sw-02 Eth1/49 | SMF OS2 LC-LC | 5 m\nA02-001 | tor-sw-01 Eth1/1 | esx-01 NIC1 | DAC 25G | 2 m\nA02-002 | tor-sw-02 Eth1/1 | esx-01 NIC2 | DAC 25G | 2 m\nA01-020 | san-01 CT0.FC0 | esx-01 HBA0 | MMF OM4 LC-LC | 3 m" } });
    b.n("table", 1060, 100, "Power & environment", { w: 487, h: 200, props: { rows: "Rack | PDU | Circuit | Capacity | Est. load\nA01 | PDU-A | Feed A (UPS-1) | 32 A / 7.4 kW | 3.1 kW\nA01 | PDU-B | Feed B (UPS-2) | 32 A / 7.4 kW | 3.0 kW\nA02 | PDU-A | Feed A (UPS-1) | 32 A / 7.4 kW | 5.6 kW\nA02 | PDU-B | Feed B (UPS-2) | 32 A / 7.4 kW | 5.4 kW\nRoom | CRAC | N+1 | 22 C setpoint | 45 % RH" } });
    b.n("note", 1060, 330, "Installation notes:\n- Dual-corded devices: PSU1 -> PDU-A, PSU2 -> PDU-B.\n- Hot aisle at rear; blanking panels in all unused U positions.\n- Cable labels at both ends (Brady, format <RACK>-<NNN>).\n- Structured cabling terminated at U41/U42 patch panels only.\n- Torque rails to 4.5 Nm; earth bonding to rack busbar.", { w: 487, h: 150, style: { fontSize: 11 } });
    b.n("legend", 1060, 500, "Legend", { w: 300, h: 120, props: { auto: false, rows: "Network switch | #1f6fb5\nFirewall | #d0463f\nServer | #4b6584\nStorage | #2a9d8f\nPatch panel / PDU | #333333" } });
    return doc({ title: "Data Centre Rack Elevation", level: "LLD" }, [page("Rack elevation", "LLD", b)]);
  } });

  /* ---------------- Microservices (C4 container) ---------------- */
  TEMPLATES.push({ id: "microservices-c4", name: "Microservices platform (C4 container view)", level: "HLD", desc: "Customer-facing platform: SPA, API gateway, domain services, per-service data stores, event bus and external systems.", build() {
    const b = builder(); furniture(b, "E-commerce Platform - Container Diagram (C4 level 2)");
    const cust = b.n("c4person", 50, 230, "Customer\n[Person]\nBrowses and orders products", { w: 150, h: 120 });
    const ops = b.n("c4person", 50, 560, "Operations\n[Person]\nMonitors and supports", { w: 150, h: 120 });
    const sys = b.n("zone", 270, 90, "E-commerce platform [Software system]", { w: 1000, h: 790, style: { fill: "#f4f7fb", stroke: "#1168bd" } });
    // column 1: channels, gateway, identity
    const spa = b.n("c4container", 300, 140, "Web application\n[Container: React SPA]", { w: 200, h: 80, parent: sys });
    const mob = b.n("c4container", 300, 280, "Mobile app\n[Container: Flutter]", { w: 200, h: 80, parent: sys });
    const gw = b.n("gateway", 300, 430, "API gateway\n[Container: Kong]", { w: 200, h: 90, parent: sys });
    const auth = b.n("idp", 368, 590, "Identity provider\n[OIDC]", { parent: sys });
    // column 2: domain services
    const cat = b.n("microservice", 680, 140, "Catalog service\n[Container: Node.js]", { w: 180, h: 96, parent: sys });
    const order = b.n("microservice", 680, 300, "Order service\n[Container: Java/Spring]", { w: 180, h: 96, parent: sys });
    const pay = b.n("microservice", 680, 460, "Payment service\n[Container: Go]", { w: 180, h: 96, parent: sys });
    const notif = b.n("microservice", 680, 620, "Notification service\n[Container: Python]", { w: 180, h: 96, parent: sys });
    // column 3: data stores
    const cdb = b.n("sdb", 960, 143, "Catalog DB\n[MongoDB]", { w: 130, h: 90, parent: sys });
    const cache = b.n("scache", 1160, 158, "Cache\n[Redis]", { parent: sys });
    const odb = b.n("sdb", 960, 303, "Orders DB\n[PostgreSQL]", { w: 130, h: 90, parent: sys });
    const search = b.n("search", 1160, 318, "Search index\n[OpenSearch]", { parent: sys });
    const pdb = b.n("sdb", 960, 463, "Payments DB\n[PostgreSQL]", { w: 130, h: 90, parent: sys });
    // event bus along the bottom of the system
    const bus = b.n("squeue", 300, 800, "Event bus [Kafka] - topics: orders, payments, notifications", { w: 940, h: 50, parent: sys });
    // external systems
    const psp = b.n("thirdparty", 1330, 535, "Payment provider\n[External system]", { w: 220, h: 80 });
    const email = b.n("thirdparty", 1330, 628, "Email / SMS gateway\n[External system]", { w: 220, h: 80 });
    const mon = b.n("cmonitor", 1410, 880, "Observability\n[Prometheus / Grafana]", { w: 60, h: 60 });
    // people -> channels
    b.e(cust, spa, "Uses\n[HTTPS]", { style: DEP, fp: "e", tp: "w" }); b.e(cust, mob, "Uses\n[HTTPS]", { style: DEP, fp: "e", tp: "w" });
    b.e(ops, mon, "Monitors\n[HTTPS]", { style: DEP, fp: "s", tp: "w", labelT: 0.35, points: [{ x: 125, y: 910 }] });
    // channels -> gateway (web app goes round the outside of the mobile app)
    b.e(spa, gw, "Calls API\n[JSON/HTTPS]", { style: DEP, fp: "e", tp: "e", labelT: 0.3, points: [{ x: 524, y: 200 }] });
    b.e(mob, gw, "Calls API\n[JSON/HTTPS]", { style: DEP, fp: "s", tp: "n" });
    b.e(gw, auth, "Validates tokens\n[OIDC/JWT]", { style: DEP, fp: "s", tp: "n" });
    // gateway -> services (each on its own vertical so the lines never merge)
    b.e(gw, cat, "[REST]", { style: DEP, fp: "e", tp: "w", labelT: 0.9, points: [{ x: 566, y: 464.5 }, { x: 566, y: 188 }] });
    b.e(gw, order, "[REST]", { style: DEP, fp: "e", tp: "w", labelT: 0.9, points: [{ x: 578, y: 485.5 }, { x: 578, y: 348 }] });
    b.e(gw, pay, "[REST]", { style: DEP, fp: "e", tp: "w", labelT: 0.3 });
    // services -> stores
    b.e(cat, cdb, "[Mongo wire]", { style: DEP, fp: "e", tp: "w" }); b.e(cdb, cache, "[RESP]", { style: DEP, fp: "e", tp: "w" });
    b.e(order, odb, "Reads/writes\n[JDBC]", { style: DEP, fp: "e", tp: "w" }); b.e(odb, search, "Indexes", { style: DEP, fp: "e", tp: "w" });
    b.e(pay, pdb, "[SQL]", { style: DEP, fp: "e", tp: "w" });
    // events: publishers drop down a lane to the left of the services column; the subscriber sits right above the bus
    b.e(order, bus, "Publishes OrderCreated", { style: DEP, fp: "s", tp: "n", labelT: 0.18, points: [{ x: 610, y: 420 }, { x: 610, y: 770 }] });
    b.e(pay, bus, "Publishes PaymentSettled", { style: DEP, fp: "s", tp: "n", labelT: 0.24, points: [{ x: 640, y: 580 }, { x: 640, y: 770 }] });
    b.e(bus, notif, "Subscribes", { style: DEP, fp: "n", tp: "s" });
    // external calls
    b.e(pay, psp, "Charges card\n[HTTPS]", { style: DEP, fp: "e", tp: "w", labelT: 0.6, points: [{ x: 920, y: 575 }, { x: 1300, y: 575 }] });
    b.e(notif, email, "Sends\n[SMTP/HTTPS]", { style: DEP, fp: "e", tp: "w" });
    return doc({ title: "E-commerce Platform - Container Diagram", level: "HLD", standard: "C4 model (container level)" }, [page("C4 containers", "HLD", b)]);
  } });

  /* ---------------- Zero-trust segmentation ---------------- */
  TEMPLATES.push({ id: "segmentation-hld", name: "Security zones & segmentation (HLD)", level: "HLD", desc: "Untrusted, DMZ, trusted, restricted (PCI) and management zones with enforcement points and permitted flows.", build() {
    const b = builder(); furniture(b, "Network Security Zones & Segmentation - High-Level Design");
    const un = b.n("untrusted", 40, 120, "Untrusted (Internet)", { w: 240, h: 700 });
    const dmz = b.n("dmz", 360, 120, "DMZ (semi-trusted)", { w: 280, h: 700 });
    const tr = b.n("trusted", 720, 120, "Internal (trusted)", { w: 340, h: 700 });
    const rs = b.n("restricted", 1140, 120, "Restricted (PCI CDE)", { w: 300, h: 700 });
    const mg = b.n("mgmt", 360, 840, "Management (out-of-band)", { w: 1080, h: 110 });
    const inet = b.n("internet", 110, 190, "Internet", { parent: un });
    const att = b.n("attacker", 130, 330, "Threat actor", { parent: un });
    const cust = b.n("users", 120, 470, "Customers", { parent: un });
    const rem = b.n("laptop", 120, 620, "Remote staff", { parent: un });
    const fw1 = b.n("firewall", 286, 420, "Perimeter FW", { sub: "L7 NGFW + IPS" });
    const fw2 = b.n("firewall", 646, 420, "Internal FW", { sub: "L7 NGFW" });
    const fw3 = b.n("firewall", 1066, 420, "CDE FW", { sub: "Micro-seg" });
    const waf = b.n("waf", 380, 190, "WAF", { parent: dmz }); const web = b.n("webserver", 470, 194, "Web front", { parent: dmz }); const pxy = b.n("proxy", 560, 194, "Proxy", { parent: dmz });
    const smtp = b.n("mailserver", 380, 330, "Mail relay", { parent: dmz }); const vpn = b.n("vpn", 470, 336, "VPN / ZTNA", { parent: dmz }); const bas = b.n("bastion", 560, 330, "Bastion", { parent: dmz });
    const edns = b.n("dns", 380, 470, "Ext. DNS", { parent: dmz }); const ips = b.n("ips", 470, 466, "IDS", { parent: dmz });
    const app1 = b.n("appserver", 740, 194, "App tier", { parent: tr }); const ad = b.n("ad", 830, 194, "AD / DNS", { parent: tr }); const file = b.n("fileserver", 920, 194, "File", { parent: tr });
    const pc = b.n("pc", 740, 330, "Staff PCs", { parent: tr }); const prn = b.n("printer", 830, 330, "Printers", { parent: tr }); const wifi = b.n("ap", 920, 330, "Corp Wi-Fi", { parent: tr });
    const nac = b.n("nac", 740, 480, "NAC", { parent: tr }); const idp = b.n("idp", 830, 470, "IdP / MFA", { parent: tr }); const edr = b.n("edr", 920, 470, "EDR", { parent: tr });
    const db = b.n("database", 1170, 190, "Cardholder DB", { sub: "encrypted at rest", parent: rs }); const papp = b.n("appserver", 1250, 194, "Payment app", { parent: rs });
    const hsm = b.n("vault", 1170, 340, "HSM / vault", { parent: rs }); const tok = b.n("appserver", 1250, 344, "Tokenisation", { parent: rs }); const plog = b.n("logserver", 1170, 480, "CDE audit log", { parent: rs });
    const nms = b.n("monitoring", 380, 865, "NMS", { parent: mg }); const siem = b.n("siem", 480, 865, "SIEM", { parent: mg }); const jump = b.n("bastion", 580, 862, "Jump host", { parent: mg }); const pki = b.n("pki", 680, 865, "PKI", { parent: mg }); const bkp = b.n("backup", 780, 865, "Backup", { parent: mg }); const pam = b.n("vault", 880, 862, "PAM", { parent: mg });
    b.n("table", 40, 840, "Zone-to-zone policy (summary)", { w: 280, h: 110, props: { rows: "From -> To | Allowed | Ports\nUntrusted -> DMZ | Yes (via WAF) | 443\nDMZ -> Internal | Restricted | 8443, 636\nInternal -> CDE | Deny by default | 1433 (app only)\nMgmt -> Any | Jump host only | 22, 3389" }, style: { fontSize: 9 } });
    b.e(inet, fw1, "HTTPS 443", { style: FLOW }); b.e(att, fw1, "blocked", { style: { endArrow: "arrow", dash: "3 3", stroke: "#c93c3c" } }); b.e(cust, fw1, "HTTPS 443", { style: FLOW }); b.e(rem, fw1, "IPsec/SSL VPN", { preset: "tunnel" });
    b.e(fw1, waf, "", { style: FLOW }); b.e(waf, web, "HTTPS", { style: FLOW }); b.e(fw1, vpn, "", { style: FLOW }); b.e(fw1, smtp, "SMTP 25", { style: FLOW });
    b.e(web, fw2, "HTTPS 8443", { style: FLOW }); b.e(fw2, app1, "", { style: FLOW }); b.e(vpn, fw2, "", { style: FLOW }); b.e(pc, pxy, "HTTP/S", { style: FLOW }); b.e(pxy, fw1, "", { style: FLOW });
    b.e(app1, fw3, "TDS 1433 / TLS", { style: FLOW }); b.e(fw3, papp, "", { style: FLOW }); b.e(papp, db, "", { style: FLOW }); b.e(papp, hsm, "PKCS#11", { style: FLOW }); b.e(papp, tok, "", { style: FLOW });
    b.e(pc, ad, "Kerberos/LDAPS", { style: DEP }); b.e(pc, nac, "802.1X", { style: DEP }); b.e(bas, jump, "", { style: DEP });
    b.e(fw1, siem, "syslog/TLS", { style: DEP }); b.e(fw2, siem, "syslog/TLS", { style: DEP }); b.e(fw3, siem, "syslog/TLS", { style: DEP }); b.e(plog, siem, "forward", { style: DEP });
    return doc({ title: "Security Zones & Segmentation", level: "HLD" }, [page("Segmentation HLD", "HLD", b)]);
  } });

  window.RCW_TEMPLATES = { list: TEMPLATES, get: id => TEMPLATES.find(t => t.id === id), blank: () => TEMPLATES[0].build(), builder, doc, page };
})();
