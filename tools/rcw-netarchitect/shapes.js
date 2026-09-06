/* RCW - NetArchitect : shape / stencil library
   Vendor-neutral symbols for HLD & LLD network, cloud and software architecture diagrams.
   Icons are drawn in a 100x100 coordinate space and scaled uniformly by the editor.
   (c) RCW IT Training - www.rcwittraining.in
*/
(function () {
  "use strict";

  /* ---------- colour helpers ---------- */
  function hexToRgb(h) {
    h = (h || "#000").replace("#", "");
    if (h.length === 3) h = h.split("").map(c => c + c).join("");
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
  }
  function shade(hex, pct) { // pct>0 lighten toward white, <0 darken
    const [r, g, b] = hexToRgb(hex);
    const t = pct > 0 ? 255 : 0, p = Math.abs(pct);
    return rgbToHex(r + (t - r) * p, g + (t - g) * p, b + (t - b) * p);
  }
  function luminance(hex) {
    const [r, g, b] = hexToRgb(hex).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function contrast(a, b) {
    const l1 = luminance(a), l2 = luminance(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  /* ---------- drawing helpers (100x100 space) ---------- */
  const FONT = "Inter,ui-sans-serif,system-ui,Segoe UI,Arial,sans-serif";
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function txt(x, y, s, size, color, weight, extra) {
    return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-family="${FONT}" font-size="${size}" font-weight="${weight || 800}" fill="${color}" ${extra || ""}>${esc(s)}</text>`;
  }
  function arrow(x1, y1, x2, y2, color, w) {
    w = w || 5;
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
    const hl = w * 2.4, hw = w * 1.6;
    const bx = x2 - ux * hl, by = y2 - uy * hl;
    return `<line x1="${x1}" y1="${y1}" x2="${bx}" y2="${by}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>` +
      `<polygon points="${x2},${y2} ${bx - uy * hw},${by + ux * hw} ${bx + uy * hw},${by - ux * hw}" fill="${color}"/>`;
  }
  // cloud-style rounded tile with a white glyph
  function tile(c, glyph) {
    return `<rect x="6" y="6" width="88" height="88" rx="18" fill="${c.F}" stroke="${c.K}" stroke-width="2.5"/>${glyph}`;
  }
  // 1U style server box with big white text
  function labelledServer(c, label) {
    return `<rect x="4" y="24" width="92" height="52" rx="5" fill="${c.F}" stroke="${c.K}" stroke-width="2.5"/>
      <circle cx="14" cy="36" r="3" fill="${c.L}"/><circle cx="14" cy="50" r="3" fill="${c.L}"/><circle cx="14" cy="64" r="3" fill="${c.L}"/>
      <rect x="24" y="30" width="6" height="40" rx="1" fill="${c.D}"/>
      ${txt(62, 51, label, 22, "#fff", 800)}`;
  }
  const CLOUD_PATH = "M25 62 C8 62 4 45 16 38 C6 22 28 8 38 20 C44 4 70 4 74 20 C88 12 102 30 90 42 C102 52 90 66 76 62 Z";
  function personGlyph(cx, cy, s, color) { // s = scale, head radius = 9s
    return `<circle cx="${cx}" cy="${cy - 22 * s}" r="${11 * s}" fill="${color}"/>
      <path d="M${cx - 24 * s},${cy + 22 * s} a24,24 0 0 1 48,0 z" transform="scale(${s}) translate(${cx / s - cx},${cy / s - cy})" fill="${color}"/>`;
  }
  function person(cx, cy, s, color) {
    const r = 11 * s, sw = 24 * s;
    return `<circle cx="${cx}" cy="${cy - 20 * s}" r="${r}" fill="${color}"/>
      <path d="M${cx - sw},${cy + 24 * s} v-${8 * s} a${sw},${sw} 0 0 1 ${2 * sw},0 v${8 * s} z" fill="${color}"/>`;
  }

  /* ---------- palette per category ---------- */
  const PAL = {
    network: { fill: "#1f6fb5", stroke: "#0d3d68" },
    security: { fill: "#d0463f", stroke: "#7c1f1a" },
    compute: { fill: "#4b6584", stroke: "#233348" },
    storage: { fill: "#2a9d8f", stroke: "#12574f" },
    endpoint: { fill: "#5d6b7d", stroke: "#2e3843" },
    cloudNet: { fill: "#6f42c1", stroke: "#3d2270" },
    cloudCompute: { fill: "#ec7a1c", stroke: "#8a4207" },
    cloudStorage: { fill: "#2e8b57", stroke: "#164a2d" },
    cloudDb: { fill: "#2b6cb0", stroke: "#153a63" },
    cloudSec: { fill: "#c53030", stroke: "#6e1414" },
    cloudInt: { fill: "#d53f8c", stroke: "#78204f" },
    cloudOps: { fill: "#319795", stroke: "#1a5352" },
    c4: { fill: "#1168bd", stroke: "#0b4884" },
    c4c: { fill: "#438dd5", stroke: "#2e6295" },
    c4comp: { fill: "#85bbf0", stroke: "#4f86bd" },
    c4ext: { fill: "#8a8a8a", stroke: "#5a5a5a" },
    soft: { fill: "#6b46c1", stroke: "#3d2470" },
    generic: { fill: "#ffffff", stroke: "#101b3b" },
    note: { fill: "#fff3b0", stroke: "#c9a400" }
  };

  /* ---------- categories ---------- */
  const CATEGORIES = [
    { id: "network", name: "Network devices" },
    { id: "security", name: "Security" },
    { id: "compute", name: "Servers, virtualisation & storage" },
    { id: "endpoint", name: "Users & endpoints" },
    { id: "cloud", name: "Cloud services (AWS / Azure / GCP generic)" },
    { id: "software", name: "Software architecture (C4 / microservices)" },
    { id: "zones", name: "Zones, sites & containers" },
    { id: "lld", name: "LLD detail (racks, panels, labels)" },
    { id: "flow", name: "Flowchart & basic shapes" },
    { id: "annot", name: "Annotation & documentation" }
  ];

  /* =====================================================================
     SHAPES.  kind: icon | box | container | text | special
     icon:(c)=>svg  where c={F,K,L,D,W}  (fill, stroke, light, dark, white)
     geo:(w,h,st)=>svg for box/container shapes
     ===================================================================== */
  const SHAPES = [];
  function def(o) { SHAPES.push(o); }

  /* ===================== NETWORK ===================== */
  def({ type: "router", name: "Router", cat: "network", tags: "router gateway cisco l3 wan edge", kind: "icon", w: 64, h: 64, pal: PAL.network,
    icon: c => `<circle cx="50" cy="50" r="44" fill="${c.F}" stroke="${c.K}" stroke-width="3"/>
      ${arrow(24, 37, 70, 37, "#fff")}${arrow(76, 63, 30, 63, "#fff")}${arrow(37, 76, 37, 30, "#fff")}${arrow(63, 24, 63, 70, "#fff")}` });
  def({ type: "switch", name: "Switch (L2)", cat: "network", tags: "switch access layer2 ethernet", kind: "icon", w: 72, h: 52, pal: PAL.network,
    icon: c => `<rect x="4" y="26" width="92" height="48" rx="7" fill="${c.F}" stroke="${c.K}" stroke-width="3"/>
      ${arrow(14, 40, 47, 40, "#fff", 4)}${arrow(53, 40, 86, 40, "#fff", 4)}${arrow(86, 60, 53, 60, "#fff", 4)}${arrow(47, 60, 14, 60, "#fff", 4)}` });
  def({ type: "l3switch", name: "Multilayer switch (L3)", cat: "network", tags: "switch core distribution layer3 routing", kind: "icon", w: 72, h: 60, pal: PAL.network,
    icon: c => `<polygon points="14,22 86,22 96,32 24,32" fill="${c.D}" stroke="${c.K}" stroke-width="2"/>
      <rect x="4" y="32" width="92" height="46" rx="6" fill="${c.F}" stroke="${c.K}" stroke-width="3"/>
      ${arrow(14, 46, 46, 46, "#fff", 4)}${arrow(54, 46, 86, 46, "#fff", 4)}${arrow(86, 64, 54, 64, "#fff", 4)}${arrow(46, 64, 14, 64, "#fff", 4)}
      <circle cx="90" cy="27" r="3" fill="#fff"/>` });
  def({ type: "loadbalancer", name: "Load balancer", cat: "network", tags: "adc lb balancer f5 haproxy", kind: "icon", w: 72, h: 56, pal: PAL.network,
    icon: c => `<rect x="4" y="22" width="92" height="56" rx="8" fill="${c.F}" stroke="${c.K}" stroke-width="3"/>
      <circle cx="24" cy="50" r="7" fill="#fff"/>${arrow(31, 50, 62, 34, "#fff", 4)}${arrow(31, 50, 62, 50, "#fff", 4)}${arrow(31, 50, 62, 66, "#fff", 4)}
      <rect x="68" y="29" width="14" height="9" rx="2" fill="#fff"/><rect x="68" y="45.5" width="14" height="9" rx="2" fill="#fff"/><rect x="68" y="62" width="14" height="9" rx="2" fill="#fff"/>` });
  def({ type: "ap", name: "Wireless access point", cat: "network", tags: "wifi wlan ap wireless", kind: "icon", w: 64, h: 60, pal: PAL.network,
    icon: c => `<ellipse cx="50" cy="76" rx="42" ry="14" fill="${c.F}" stroke="${c.K}" stroke-width="3"/>
      <circle cx="50" cy="76" r="4" fill="#fff"/>
      <path d="M34,52 a22,22 0 0 1 32,0" fill="none" stroke="${c.K}" stroke-width="5" stroke-linecap="round"/>
      <path d="M22,38 a38,38 0 0 1 56,0" fill="none" stroke="${c.K}" stroke-width="5" stroke-linecap="round"/>
      <path d="M11,24 a54,54 0 0 1 78,0" fill="none" stroke="${c.K}" stroke-width="5" stroke-linecap="round"/>` });
  def({ type: "wlc", name: "Wireless LAN controller", cat: "network", tags: "wlc wireless controller", kind: "icon", w: 72, h: 52, pal: PAL.network,
    icon: c => `<rect x="4" y="34" width="92" height="42" rx="7" fill="${c.F}" stroke="${c.K}" stroke-width="3"/>
      ${arrow(14, 48, 44, 48, "#fff", 4)}${arrow(44, 64, 14, 64, "#fff", 4)}
      <path d="M62,60 a12,12 0 0 1 18,0" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
      <path d="M55,50 a22,22 0 0 1 32,0" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
      <circle cx="71" cy="67" r="3" fill="#fff"/>` });
  def({ type: "modem", name: "Modem / ONT", cat: "network", tags: "modem ont dsl fibre isp cpe", kind: "icon", w: 64, h: 48, pal: PAL.network,
    icon: c => `<rect x="6" y="40" width="88" height="34" rx="6" fill="${c.F}" stroke="${c.K}" stroke-width="3"/>
      <circle cx="22" cy="57" r="4" fill="#9ee636"/><circle cx="36" cy="57" r="4" fill="#9ee636"/><circle cx="50" cy="57" r="4" fill="#ffd51d"/>
      <line x1="80" y1="40" x2="80" y2="16" stroke="${c.K}" stroke-width="4" stroke-linecap="round"/><circle cx="80" cy="14" r="4" fill="${c.K}"/>` });
  def({ type: "internet", name: "Internet", cat: "network", tags: "internet cloud public wan isp", kind: "icon", w: 96, h: 64, pal: { fill: "#8fa3bf", stroke: "#3e4f68" }, label: "Internet",
    icon: c => `<path d="${CLOUD_PATH}" fill="${c.F}" stroke="${c.K}" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="50" cy="40" r="15" fill="none" stroke="#fff" stroke-width="3"/><ellipse cx="50" cy="40" rx="6" ry="15" fill="none" stroke="#fff" stroke-width="2.5"/>
      <line x1="35" y1="40" x2="65" y2="40" stroke="#fff" stroke-width="2.5"/>` });
  def({ type: "wan", name: "WAN / MPLS cloud", cat: "network", tags: "wan mpls sdwan provider cloud", kind: "icon", w: 96, h: 64, pal: { fill: "#5b7db1", stroke: "#26406a" }, label: "WAN",
    icon: c => `<path d="${CLOUD_PATH}" fill="${c.F}" stroke="${c.K}" stroke-width="3" stroke-linejoin="round"/>` });
  def({ type: "vpn", name: "VPN tunnel / concentrator", cat: "network", tags: "vpn ipsec tunnel ssl remote access", kind: "icon", w: 72, h: 52, pal: PAL.network,
    icon: c => `<rect x="4" y="30" width="92" height="40" rx="20" fill="${c.L}" stroke="${c.K}" stroke-width="3"/>
      <line x1="14" y1="50" x2="36" y2="50" stroke="${c.K}" stroke-width="4" stroke-dasharray="6 4"/><line x1="64" y1="50" x2="86" y2="50" stroke="${c.K}" stroke-width="4" stroke-dasharray="6 4"/>
      <rect x="40" y="46" width="20" height="16" rx="3" fill="${c.F}" stroke="${c.K}" stroke-width="2"/>
      <path d="M44,46 v-5 a6,6 0 0 1 12,0 v5" fill="none" stroke="${c.K}" stroke-width="3"/>` });
  def({ type: "nic", name: "Network interface", cat: "network", tags: "nic interface port ethernet card", kind: "icon", w: 56, h: 44, pal: PAL.network,
    icon: c => `<rect x="10" y="30" width="80" height="44" rx="5" fill="${c.F}" stroke="${c.K}" stroke-width="3"/>
      <rect x="20" y="42" width="24" height="20" rx="2" fill="#fff"/><rect x="26" y="62" width="12" height="6" fill="#fff"/>
      <rect x="54" y="42" width="26" height="4" fill="#fff"/><rect x="54" y="52" width="26" height="4" fill="#fff"/><rect x="54" y="62" width="18" height="4" fill="#fff"/>` });
  def({ type: "tower", name: "Cell tower / radio", cat: "network", tags: "tower antenna 4g 5g lte radio mast", kind: "icon", w: 56, h: 68, pal: PAL.network,
    icon: c => `<polygon points="50,10 30,92 40,92 50,52 60,92 70,92" fill="${c.F}" stroke="${c.K}" stroke-width="2.5"/>
      <line x1="38" y1="60" x2="62" y2="60" stroke="${c.K}" stroke-width="2.5"/><line x1="34" y1="76" x2="66" y2="76" stroke="${c.K}" stroke-width="2.5"/>
      <path d="M28,26 a30,30 0 0 1 0,-16" fill="none" stroke="${c.K}" stroke-width="3.5" stroke-linecap="round"/><path d="M72,26 a30,30 0 0 0 0,-16" fill="none" stroke="${c.K}" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M18,34 a48,48 0 0 1 0,-32" fill="none" stroke="${c.K}" stroke-width="3.5" stroke-linecap="round"/><path d="M82,34 a48,48 0 0 0 0,-32" fill="none" stroke="${c.K}" stroke-width="3.5" stroke-linecap="round"/>` });
  def({ type: "hub", name: "Hub / media converter", cat: "network", tags: "hub media converter legacy", kind: "icon", w: 64, h: 44, pal: PAL.network,
    icon: c => `<rect x="6" y="36" width="88" height="34" rx="6" fill="${c.L}" stroke="${c.K}" stroke-width="3"/>
      ${arrow(16, 53, 44, 53, c.K, 4)}${arrow(84, 53, 56, 53, c.K, 4)}` });
  def({ type: "dns", name: "DNS server", cat: "network", tags: "dns bind resolver name", kind: "icon", w: 72, h: 48, pal: PAL.compute, icon: c => labelledServer(c, "DNS") });
  def({ type: "dhcp", name: "DHCP / IPAM", cat: "network", tags: "dhcp ipam address", kind: "icon", w: 72, h: 48, pal: PAL.compute, icon: c => labelledServer(c, "DHCP") });
  def({ type: "ntp", name: "NTP server", cat: "network", tags: "ntp time", kind: "icon", w: 72, h: 48, pal: PAL.compute, icon: c => labelledServer(c, "NTP") });
  def({ type: "proxy", name: "Proxy", cat: "network", tags: "proxy forward reverse squid", kind: "icon", w: 72, h: 48, pal: PAL.compute, icon: c => labelledServer(c, "PXY") });

  /* ===================== SECURITY ===================== */
  def({ type: "firewall", name: "Firewall", cat: "security", tags: "firewall ngfw palo fortinet asa checkpoint", kind: "icon", w: 68, h: 56, pal: PAL.security,
    icon: c => { let s = `<rect x="6" y="18" width="88" height="66" rx="4" fill="${c.F}" stroke="${c.K}" stroke-width="3"/>`;
      [34.5, 51, 67.5].forEach(y => s += `<line x1="6" y1="${y}" x2="94" y2="${y}" stroke="#fff" stroke-width="3"/>`);
      [[18, 34.5], [51, 67.5]].forEach(([a, b]) => { [35, 65].forEach(x => s += `<line x1="${x}" y1="${a}" x2="${x}" y2="${b}" stroke="#fff" stroke-width="3"/>`); });
      [[34.5, 51], [67.5, 84]].forEach(([a, b]) => { [20, 50, 80].forEach(x => s += `<line x1="${x}" y1="${a}" x2="${x}" y2="${b}" stroke="#fff" stroke-width="3"/>`); });
      return s; } });
  def({ type: "waf", name: "WAF / DDoS protection", cat: "security", tags: "waf web application firewall ddos shield", kind: "icon", w: 60, h: 64, pal: PAL.security,
    icon: c => `<path d="M50,6 L88,20 V50 C88,72 70,88 50,96 C30,88 12,72 12,50 V20 Z" fill="${c.F}" stroke="${c.K}" stroke-width="3" stroke-linejoin="round"/>
      ${txt(50, 52, "WAF", 24, "#fff")}` });
  def({ type: "ips", name: "IDS / IPS sensor", cat: "security", tags: "ids ips intrusion sensor detection", kind: "icon", w: 60, h: 64, pal: PAL.security,
    icon: c => `<path d="M50,6 L88,20 V50 C88,72 70,88 50,96 C30,88 12,72 12,50 V20 Z" fill="${c.F}" stroke="${c.K}" stroke-width="3" stroke-linejoin="round"/>
      <polyline points="22,54 36,54 42,38 50,70 58,44 64,54 78,54" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>` });
  def({ type: "siem", name: "SIEM / SOC", cat: "security", tags: "siem soc splunk sentinel logs security monitoring", kind: "icon", w: 72, h: 48, pal: PAL.security, icon: c => labelledServer(c, "SIEM") });
  def({ type: "nac", name: "NAC / 802.1X", cat: "security", tags: "nac ise clearpass radius 802.1x aaa", kind: "icon", w: 72, h: 48, pal: PAL.security, icon: c => labelledServer(c, "AAA") });
  def({ type: "pki", name: "PKI / Certificate authority", cat: "security", tags: "pki ca certificate tls", kind: "icon", w: 72, h: 48, pal: PAL.security, icon: c => labelledServer(c, "PKI") });
  def({ type: "bastion", name: "Bastion / jump host", cat: "security", tags: "bastion jump host pam", kind: "icon", w: 56, h: 64, pal: PAL.security,
    icon: c => `<rect x="24" y="6" width="52" height="88" rx="5" fill="${c.F}" stroke="${c.K}" stroke-width="3"/>
      <rect x="32" y="16" width="36" height="8" rx="2" fill="#fff" opacity=".9"/><rect x="32" y="30" width="36" height="8" rx="2" fill="#fff" opacity=".9"/>
      <circle cx="50" cy="62" r="11" fill="none" stroke="#fff" stroke-width="4"/><line x1="50" y1="73" x2="50" y2="86" stroke="#fff" stroke-width="4"/><line x1="50" y1="82" x2="58" y2="82" stroke="#fff" stroke-width="4"/>` });
  def({ type: "idp", name: "Identity provider / SSO", cat: "security", tags: "identity idp sso saml oidc entra okta ad", kind: "icon", w: 60, h: 60, pal: PAL.security,
    icon: c => `<circle cx="50" cy="50" r="44" fill="${c.F}" stroke="${c.K}" stroke-width="3"/>
      ${person(50, 50, 1.4, "#fff")}
      <circle cx="74" cy="72" r="12" fill="${c.K}"/><path d="M69,72 h10 M74,67 v10" stroke="#fff" stroke-width="3" stroke-linecap="round"/>` });
  def({ type: "ad", name: "Directory (AD / LDAP)", cat: "security", tags: "active directory ldap domain controller dc", kind: "icon", w: 72, h: 48, pal: PAL.compute, icon: c => labelledServer(c, "AD") });
  def({ type: "vault", name: "Secrets / key vault", cat: "security", tags: "vault secrets kms key hsm", kind: "icon", w: 60, h: 60, pal: PAL.security,
    icon: c => `<rect x="10" y="10" width="80" height="80" rx="8" fill="${c.F}" stroke="${c.K}" stroke-width="3"/>
      <circle cx="50" cy="50" r="20" fill="none" stroke="#fff" stroke-width="5"/><circle cx="50" cy="50" r="6" fill="#fff"/>
      <line x1="50" y1="30" x2="50" y2="22" stroke="#fff" stroke-width="4"/><line x1="50" y1="78" x2="50" y2="70" stroke="#fff" stroke-width="4"/>
      <line x1="30" y1="50" x2="22" y2="50" stroke="#fff" stroke-width="4"/><line x1="78" y1="50" x2="70" y2="50" stroke="#fff" stroke-width="4"/>` });
  def({ type: "edr", name: "Endpoint protection (EDR/AV)", cat: "security", tags: "edr antivirus defender endpoint", kind: "icon", w: 60, h: 64, pal: PAL.security,
    icon: c => `<path d="M50,6 L88,20 V50 C88,72 70,88 50,96 C30,88 12,72 12,50 V20 Z" fill="${c.F}" stroke="${c.K}" stroke-width="3" stroke-linejoin="round"/>
      <polyline points="30,52 44,66 72,36" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>` });

  /* ===================== COMPUTE / STORAGE ===================== */
  def({ type: "server", name: "Server (tower)", cat: "compute", tags: "server tower host physical", kind: "icon", w: 52, h: 68, pal: PAL.compute,
    icon: c => `<rect x="24" y="6" width="52" height="88" rx="5" fill="${c.F}" stroke="${c.K}" stroke-width="3"/>
      <rect x="32" y="16" width="36" height="9" rx="2" fill="${c.L}"/><rect x="32" y="31" width="36" height="9" rx="2" fill="${c.L}"/><rect x="32" y="46" width="36" height="9" rx="2" fill="${c.L}"/>
      <circle cx="38" cy="78" r="3.5" fill="#9ee636"/><circle cx="50" cy="78" r="3.5" fill="#9ee636"/><circle cx="62" cy="78" r="3.5" fill="#ffd51d"/>` });
  def({ type: "rackserver", name: "Rack server (1U/2U)", cat: "compute", tags: "server rack 1u 2u blade physical", kind: "icon", w: 80, h: 44, pal: PAL.compute,
    icon: c => `<rect x="4" y="30" width="92" height="40" rx="4" fill="${c.F}" stroke="${c.K}" stroke-width="3"/>
      <rect x="10" y="37" width="30" height="10" rx="1.5" fill="${c.L}"/><rect x="10" y="53" width="30" height="10" rx="1.5" fill="${c.L}"/>
      <rect x="46" y="37" width="30" height="10" rx="1.5" fill="${c.L}"/><rect x="46" y="53" width="30" height="10" rx="1.5" fill="${c.L}"/>
      <circle cx="86" cy="42" r="3" fill="#9ee636"/><circle cx="86" cy="58" r="3" fill="#ffd51d"/>` });
  def({ type: "webserver", name: "Web server", cat: "compute", tags: "web http nginx apache iis", kind: "icon", w: 72, h: 48, pal: PAL.compute, icon: c => labelledServer(c, "WEB") });
  def({ type: "appserver", name: "Application server", cat: "compute", tags: "application app tomcat jboss middleware", kind: "icon", w: 72, h: 48, pal: PAL.compute, icon: c => labelledServer(c, "APP") });
  def({ type: "mailserver", name: "Mail server", cat: "compute", tags: "mail smtp exchange email", kind: "icon", w: 72, h: 48, pal: PAL.compute, icon: c => labelledServer(c, "MAIL") });
  def({ type: "fileserver", name: "File server", cat: "compute", tags: "file smb nfs share", kind: "icon", w: 72, h: 48, pal: PAL.compute, icon: c => labelledServer(c, "FILE") });
  def({ type: "monitoring", name: "Monitoring / NMS", cat: "compute", tags: "monitoring nms zabbix prometheus grafana snmp observability", kind: "icon", w: 72, h: 48, pal: PAL.compute, icon: c => labelledServer(c, "NMS") });
  def({ type: "logserver", name: "Log / syslog server", cat: "compute", tags: "log syslog elk", kind: "icon", w: 72, h: 48, pal: PAL.compute, icon: c => labelledServer(c, "LOG") });
  def({ type: "backup", name: "Backup server", cat: "compute", tags: "backup veeam commvault repository", kind: "icon", w: 72, h: 48, pal: PAL.compute, icon: c => labelledServer(c, "BKP") });
  def({ type: "hypervisor", name: "Hypervisor host", cat: "compute", tags: "hypervisor esxi hyper-v kvm host virtualisation", kind: "icon", w: 72, h: 60, pal: PAL.compute,
    icon: c => `<rect x="4" y="16" width="92" height="70" rx="6" fill="${c.F}" stroke="${c.K}" stroke-width="3"/>
      <rect x="12" y="24" width="22" height="30" rx="3" fill="#fff"/><rect x="39" y="24" width="22" height="30" rx="3" fill="#fff"/><rect x="66" y="24" width="22" height="30" rx="3" fill="#fff"/>
      <rect x="12" y="62" width="76" height="14" rx="3" fill="${c.D}"/>${txt(50, 69.5, "HYPERVISOR", 9, "#fff", 700)}` });
  def({ type: "vm", name: "Virtual machine", cat: "compute", tags: "vm virtual machine instance guest", kind: "icon", w: 60, h: 56, pal: PAL.compute,
    icon: c => `<rect x="8" y="14" width="84" height="64" rx="7" fill="${c.L}" stroke="${c.K}" stroke-width="3" stroke-dasharray="7 4"/>
      <rect x="20" y="26" width="60" height="40" rx="5" fill="${c.F}"/>${txt(50, 46.5, "VM", 20, "#fff")}
      <rect x="36" y="80" width="28" height="6" rx="2" fill="${c.K}"/>` });
  def({ type: "container", name: "Container (Docker)", cat: "compute", tags: "container docker pod oci", kind: "icon", w: 60, h: 52, pal: { fill: "#0db7ed", stroke: "#0a6f90" },
    icon: c => `<rect x="10" y="40" width="80" height="44" rx="6" fill="${c.F}" stroke="${c.K}" stroke-width="3"/>
      <rect x="18" y="20" width="18" height="16" fill="${c.F}" stroke="${c.K}" stroke-width="2.5"/><rect x="41" y="20" width="18" height="16" fill="${c.F}" stroke="${c.K}" stroke-width="2.5"/><rect x="64" y="20" width="18" height="16" fill="${c.F}" stroke="${c.K}" stroke-width="2.5"/>
      <line x1="10" y1="54" x2="90" y2="54" stroke="#fff" stroke-width="2.5"/><line x1="10" y1="68" x2="90" y2="68" stroke="#fff" stroke-width="2.5"/>` });
  def({ type: "k8s", name: "Kubernetes cluster", cat: "compute", tags: "kubernetes k8s cluster eks aks gke openshift", kind: "icon", w: 64, h: 64, pal: { fill: "#326ce5", stroke: "#1a3d8f" },
    icon: c => { const pts = []; for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 7; pts.push(`${(50 + 46 * Math.cos(a)).toFixed(1)},${(50 + 46 * Math.sin(a)).toFixed(1)}`); }
      let s = `<polygon points="${pts.join(" ")}" fill="${c.F}" stroke="${c.K}" stroke-width="3" stroke-linejoin="round"/><circle cx="50" cy="50" r="17" fill="none" stroke="#fff" stroke-width="5"/><circle cx="50" cy="50" r="5" fill="#fff"/>`;
      for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 7; s += `<line x1="${(50 + 18 * Math.cos(a)).toFixed(1)}" y1="${(50 + 18 * Math.sin(a)).toFixed(1)}" x2="${(50 + 32 * Math.cos(a)).toFixed(1)}" y2="${(50 + 32 * Math.sin(a)).toFixed(1)}" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`; }
      return s; } });
  def({ type: "database", name: "Database", cat: "compute", tags: "database db sql oracle mysql postgres mssql", kind: "icon", w: 56, h: 64, pal: PAL.storage,
    icon: c => `<path d="M16,20 v58 a34,12 0 0 0 68,0 v-58" fill="${c.F}" stroke="${c.K}" stroke-width="3"/>
      <path d="M16,40 a34,12 0 0 0 68,0" fill="none" stroke="${c.K}" stroke-width="2" opacity=".6"/><path d="M16,59 a34,12 0 0 0 68,0" fill="none" stroke="${c.K}" stroke-width="2" opacity=".6"/>
      <ellipse cx="50" cy="20" rx="34" ry="12" fill="${c.L}" stroke="${c.K}" stroke-width="3"/>` });
  def({ type: "storage", name: "Storage array (SAN/NAS)", cat: "compute", tags: "storage san nas array disk netapp pure emc", kind: "icon", w: 64, h: 64, pal: PAL.storage,
    icon: c => `<rect x="10" y="6" width="80" height="88" rx="6" fill="${c.F}" stroke="${c.K}" stroke-width="3"/>
      ${[14, 32, 50, 68].map(y => `<rect x="18" y="${y}" width="64" height="13" rx="2.5" fill="#fff" opacity=".92"/><circle cx="74" cy="${y + 6.5}" r="3" fill="#9ee636"/><rect x="22" y="${y + 4}" width="36" height="5" rx="1" fill="${c.L}"/>`).join("")}` });
  def({ type: "tape", name: "Tape library / archive", cat: "compute", tags: "tape lto archive library", kind: "icon", w: 64, h: 52, pal: PAL.storage,
    icon: c => `<rect x="6" y="22" width="88" height="60" rx="6" fill="${c.F}" stroke="${c.K}" stroke-width="3"/>
      <circle cx="34" cy="52" r="14" fill="#fff"/><circle cx="34" cy="52" r="5" fill="${c.K}"/><circle cx="66" cy="52" r="14" fill="#fff"/><circle cx="66" cy="52" r="5" fill="${c.K}"/>
      <line x1="34" y1="38" x2="66" y2="38" stroke="#fff" stroke-width="3"/>` });
  def({ type: "disk", name: "Disk / volume", cat: "compute", tags: "disk volume lun ebs block", kind: "icon", w: 52, h: 52, pal: PAL.storage,
    icon: c => `<circle cx="50" cy="50" r="42" fill="${c.F}" stroke="${c.K}" stroke-width="3"/><circle cx="50" cy="50" r="24" fill="${c.L}" stroke="${c.K}" stroke-width="2"/><circle cx="50" cy="50" r="7" fill="${c.K}"/>
      <path d="M50,50 L82,32" stroke="${c.K}" stroke-width="5" stroke-linecap="round"/>` });
  def({ type: "ups", name: "UPS / power", cat: "compute", tags: "ups power pdu battery", kind: "icon", w: 48, h: 64, pal: PAL.compute,
    icon: c => `<rect x="22" y="10" width="56" height="84" rx="6" fill="${c.F}" stroke="${c.K}" stroke-width="3"/>
      <polygon points="56,20 36,56 50,56 44,84 66,44 52,44" fill="#ffd51d" stroke="${c.K}" stroke-width="1.5" stroke-linejoin="round"/>` });
  def({ type: "mainframe", name: "Mainframe / appliance", cat: "compute", tags: "mainframe appliance chassis", kind: "icon", w: 60, h: 68, pal: PAL.compute,
    icon: c => `<rect x="12" y="6" width="76" height="88" rx="4" fill="${c.D}" stroke="${c.K}" stroke-width="3"/>
      <rect x="20" y="14" width="60" height="30" rx="2" fill="${c.L}"/><rect x="20" y="50" width="60" height="8" rx="2" fill="${c.F}"/><rect x="20" y="62" width="60" height="8" rx="2" fill="${c.F}"/><rect x="20" y="74" width="60" height="8" rx="2" fill="${c.F}"/>` });

  /* ===================== ENDPOINTS ===================== */
  def({ type: "user", name: "User", cat: "endpoint", tags: "user person actor employee customer", kind: "icon", w: 48, h: 56, pal: PAL.endpoint,
    icon: c => `<circle cx="50" cy="28" r="20" fill="${c.F}" stroke="${c.K}" stroke-width="3"/><path d="M10,96 v-12 a40,40 0 0 1 80,0 v12 z" fill="${c.F}" stroke="${c.K}" stroke-width="3" stroke-linejoin="round"/>` });
  def({ type: "users", name: "User group", cat: "endpoint", tags: "users group team department people", kind: "icon", w: 64, h: 56, pal: PAL.endpoint,
    icon: c => `<circle cx="28" cy="34" r="14" fill="${c.L}" stroke="${c.K}" stroke-width="2.5"/><path d="M2,88 v-8 a26,26 0 0 1 52,0 v8 z" fill="${c.L}" stroke="${c.K}" stroke-width="2.5"/>
      <circle cx="72" cy="34" r="14" fill="${c.L}" stroke="${c.K}" stroke-width="2.5"/><path d="M46,88 v-8 a26,26 0 0 1 52,0 v8 z" fill="${c.L}" stroke="${c.K}" stroke-width="2.5"/>
      <circle cx="50" cy="26" r="17" fill="${c.F}" stroke="${c.K}" stroke-width="3"/><path d="M18,92 v-10 a32,32 0 0 1 64,0 v10 z" fill="${c.F}" stroke="${c.K}" stroke-width="3"/>` });
  def({ type: "admin", name: "Administrator", cat: "endpoint", tags: "admin operator engineer sysadmin", kind: "icon", w: 48, h: 56, pal: { fill: "#0d7a3e", stroke: "#064d26" },
    icon: c => `<circle cx="50" cy="28" r="20" fill="${c.F}" stroke="${c.K}" stroke-width="3"/><path d="M10,96 v-12 a40,40 0 0 1 80,0 v12 z" fill="${c.F}" stroke="${c.K}" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="76" cy="76" r="15" fill="#ffd51d" stroke="${c.K}" stroke-width="2"/><path d="M76,68 v8 l6,4" fill="none" stroke="${c.K}" stroke-width="3" stroke-linecap="round"/>` });
  def({ type: "attacker", name: "Threat actor", cat: "endpoint", tags: "attacker threat hacker adversary", kind: "icon", w: 48, h: 56, pal: { fill: "#222", stroke: "#000" },
    icon: c => `<circle cx="50" cy="30" r="20" fill="${c.F}" stroke="${c.K}" stroke-width="3"/><path d="M10,96 v-12 a40,40 0 0 1 80,0 v12 z" fill="${c.F}" stroke="${c.K}" stroke-width="3"/>
      <path d="M28,22 h44 v6 h-44 z" fill="#d0463f"/><rect x="36" y="30" width="10" height="5" fill="#fff"/><rect x="54" y="30" width="10" height="5" fill="#fff"/>` });
  def({ type: "pc", name: "Workstation / PC", cat: "endpoint", tags: "pc desktop workstation computer client", kind: "icon", w: 60, h: 56, pal: PAL.endpoint,
    icon: c => `<rect x="8" y="12" width="84" height="56" rx="5" fill="${c.F}" stroke="${c.K}" stroke-width="3"/><rect x="15" y="19" width="70" height="42" rx="2" fill="${c.L}"/>
      <rect x="40" y="70" width="20" height="10" fill="${c.K}"/><rect x="26" y="80" width="48" height="8" rx="3" fill="${c.K}"/>` });
  def({ type: "laptop", name: "Laptop", cat: "endpoint", tags: "laptop notebook client remote", kind: "icon", w: 64, h: 48, pal: PAL.endpoint,
    icon: c => `<rect x="16" y="18" width="68" height="46" rx="4" fill="${c.F}" stroke="${c.K}" stroke-width="3"/><rect x="22" y="24" width="56" height="34" rx="1" fill="${c.L}"/>
      <path d="M6,68 h88 l4,10 h-96 z" fill="${c.K}"/>` });
  def({ type: "mobile", name: "Mobile device", cat: "endpoint", tags: "mobile phone smartphone tablet byod ios android", kind: "icon", w: 40, h: 60, pal: PAL.endpoint,
    icon: c => `<rect x="28" y="4" width="44" height="92" rx="8" fill="${c.F}" stroke="${c.K}" stroke-width="3"/><rect x="33" y="14" width="34" height="66" rx="2" fill="${c.L}"/><circle cx="50" cy="88" r="3.5" fill="#fff"/>` });
  def({ type: "printer", name: "Printer / MFP", cat: "endpoint", tags: "printer mfp print", kind: "icon", w: 60, h: 52, pal: PAL.endpoint,
    icon: c => `<rect x="26" y="8" width="48" height="28" fill="#fff" stroke="${c.K}" stroke-width="3"/><rect x="8" y="36" width="84" height="40" rx="6" fill="${c.F}" stroke="${c.K}" stroke-width="3"/>
      <rect x="26" y="62" width="48" height="26" fill="#fff" stroke="${c.K}" stroke-width="3"/><circle cx="80" cy="48" r="4" fill="#9ee636"/>` });
  def({ type: "ipphone", name: "IP phone", cat: "endpoint", tags: "ip phone voip telephone sip", kind: "icon", w: 60, h: 52, pal: PAL.endpoint,
    icon: c => `<rect x="8" y="30" width="84" height="52" rx="7" fill="${c.F}" stroke="${c.K}" stroke-width="3"/><rect x="40" y="38" width="44" height="18" rx="2" fill="${c.L}"/>
      <rect x="14" y="20" width="18" height="60" rx="8" fill="${c.K}"/>${[62, 70].map(y => [44, 56, 68, 80].map(x => `<rect x="${x}" y="${y}" width="8" height="5" rx="1" fill="#fff"/>`).join("")).join("")}` });
  def({ type: "camera", name: "IP camera / IoT", cat: "endpoint", tags: "camera cctv iot sensor ot", kind: "icon", w: 60, h: 48, pal: PAL.endpoint,
    icon: c => `<rect x="10" y="28" width="60" height="36" rx="6" fill="${c.F}" stroke="${c.K}" stroke-width="3"/><polygon points="70,38 92,26 92,66 70,54" fill="${c.F}" stroke="${c.K}" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="34" cy="46" r="9" fill="${c.L}" stroke="${c.K}" stroke-width="2"/><rect x="24" y="64" width="20" height="14" fill="${c.K}"/>` });
  def({ type: "branch", name: "Branch office / building", cat: "endpoint", tags: "branch office site building campus", kind: "icon", w: 60, h: 64, pal: PAL.endpoint,
    icon: c => `<rect x="14" y="14" width="72" height="80" rx="3" fill="${c.F}" stroke="${c.K}" stroke-width="3"/>
      ${[24, 42, 60].map(y => [24, 44, 64].map(x => `<rect x="${x}" y="${y}" width="12" height="11" fill="#ffd51d" opacity=".9"/>`).join("")).join("")}<rect x="42" y="76" width="16" height="18" fill="${c.K}"/>` });
  def({ type: "datacenter", name: "Data centre", cat: "endpoint", tags: "datacenter data centre dc facility colocation", kind: "icon", w: 68, h: 60, pal: PAL.compute,
    icon: c => `<path d="M6,40 L50,12 L94,40 V90 H6 Z" fill="${c.F}" stroke="${c.K}" stroke-width="3" stroke-linejoin="round"/>
      ${[30, 55].map(x => `<rect x="${x}" y="46" width="15" height="40" rx="2" fill="#fff"/>${[52, 61, 70, 79].map(y => `<rect x="${x + 3}" y="${y}" width="9" height="4" fill="${c.L}"/>`).join("")}`).join("")}` });

  /* ===================== CLOUD (generic vendor-neutral) ===================== */
  const chipGlyph = `<rect x="30" y="30" width="40" height="40" rx="5" fill="#fff"/>${[36, 50, 64].map(v => `<line x1="${v}" y1="30" x2="${v}" y2="18" stroke="#fff" stroke-width="4"/><line x1="${v}" y1="70" x2="${v}" y2="82" stroke="#fff" stroke-width="4"/><line x1="30" y1="${v}" x2="18" y2="${v}" stroke="#fff" stroke-width="4"/><line x1="70" y1="${v}" x2="82" y2="${v}" stroke="#fff" stroke-width="4"/>`).join("")}`;
  def({ type: "cinstance", name: "Compute instance (EC2 / VM)", cat: "cloud", tags: "cloud ec2 azure vm gce compute instance", kind: "icon", w: 56, h: 56, pal: PAL.cloudCompute, icon: c => tile(c, chipGlyph) });
  def({ type: "cautoscale", name: "Auto-scaling group", cat: "cloud", tags: "autoscaling asg vmss mig scale set", kind: "icon", w: 56, h: 56, pal: PAL.cloudCompute,
    icon: c => tile(c, `<path d="M32,60 a20,20 0 0 1 32,-26" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/><polygon points="66,26 68,42 52,36" fill="#fff"/>
      <path d="M68,40 a20,20 0 0 1 -32,26" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/><polygon points="34,74 32,58 48,64" fill="#fff"/>`) });
  def({ type: "cfunction", name: "Serverless function", cat: "cloud", tags: "lambda function serverless faas azure functions cloud functions", kind: "icon", w: 56, h: 56, pal: PAL.cloudCompute,
    icon: c => tile(c, `<path d="M30,74 L46,30 H56 L74,74 H64 L51,42 L40,74 Z" fill="#fff"/>`) });
  def({ type: "ccontainers", name: "Container service (ECS / ACI)", cat: "cloud", tags: "ecs fargate aci cloud run container service", kind: "icon", w: 56, h: 56, pal: PAL.cloudCompute,
    icon: c => tile(c, `<rect x="24" y="28" width="22" height="20" rx="3" fill="#fff"/><rect x="54" y="28" width="22" height="20" rx="3" fill="#fff"/><rect x="24" y="54" width="22" height="20" rx="3" fill="#fff"/><rect x="54" y="54" width="22" height="20" rx="3" fill="#fff"/>`) });
  def({ type: "ck8s", name: "Managed Kubernetes (EKS / AKS / GKE)", cat: "cloud", tags: "eks aks gke kubernetes managed", kind: "icon", w: 56, h: 56, pal: PAL.cloudCompute,
    icon: c => tile(c, `<circle cx="50" cy="50" r="20" fill="none" stroke="#fff" stroke-width="5"/><circle cx="50" cy="50" r="6" fill="#fff"/>${[0, 60, 120, 180, 240, 300].map(a => { const r = a * Math.PI / 180; return `<line x1="${50 + 20 * Math.cos(r)}" y1="${50 + 20 * Math.sin(r)}" x2="${50 + 30 * Math.cos(r)}" y2="${50 + 30 * Math.sin(r)}" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`; }).join("")}`) });
  def({ type: "cobject", name: "Object storage (S3 / Blob / GCS)", cat: "cloud", tags: "s3 blob gcs bucket object storage", kind: "icon", w: 56, h: 56, pal: PAL.cloudStorage,
    icon: c => tile(c, `<path d="M26,30 L32,76 H68 L74,30 Z" fill="#fff"/><ellipse cx="50" cy="30" rx="24" ry="8" fill="${c.L}" stroke="#fff" stroke-width="3"/>`) });
  def({ type: "cblock", name: "Block storage (EBS / Managed disk)", cat: "cloud", tags: "ebs managed disk persistent block volume", kind: "icon", w: 56, h: 56, pal: PAL.cloudStorage,
    icon: c => tile(c, `<circle cx="50" cy="50" r="26" fill="#fff"/><circle cx="50" cy="50" r="9" fill="${c.F}"/><circle cx="50" cy="50" r="18" fill="none" stroke="${c.L}" stroke-width="2"/>`) });
  def({ type: "cfile", name: "File storage (EFS / Files)", cat: "cloud", tags: "efs azure files filestore nfs smb", kind: "icon", w: 56, h: 56, pal: PAL.cloudStorage,
    icon: c => tile(c, `<path d="M22,32 h20 l6,8 h30 v32 h-56 z" fill="#fff"/>`) });
  def({ type: "cbackup", name: "Backup vault", cat: "cloud", tags: "backup vault recovery archive glacier", kind: "icon", w: 56, h: 56, pal: PAL.cloudStorage,
    icon: c => tile(c, `<rect x="26" y="26" width="48" height="48" rx="5" fill="#fff"/><circle cx="50" cy="50" r="12" fill="none" stroke="${c.F}" stroke-width="4"/><circle cx="50" cy="50" r="4" fill="${c.F}"/>`) });
  def({ type: "crdb", name: "Managed relational DB (RDS / SQL)", cat: "cloud", tags: "rds aurora azure sql cloud sql managed database relational", kind: "icon", w: 56, h: 56, pal: PAL.cloudDb,
    icon: c => tile(c, `<path d="M28,30 v40 a22,8 0 0 0 44,0 v-40" fill="#fff"/><ellipse cx="50" cy="30" rx="22" ry="8" fill="${c.L}" stroke="#fff" stroke-width="3"/><path d="M28,50 a22,8 0 0 0 44,0" fill="none" stroke="${c.F}" stroke-width="2"/>`) });
  def({ type: "cnosql", name: "NoSQL / key-value DB", cat: "cloud", tags: "dynamodb cosmos firestore nosql keyvalue document", kind: "icon", w: 56, h: 56, pal: PAL.cloudDb,
    icon: c => tile(c, `${[26, 42, 58].map(y => `<rect x="24" y="${y}" width="52" height="12" rx="3" fill="#fff"/><rect x="28" y="${y + 3}" width="14" height="6" rx="1" fill="${c.F}"/>`).join("")}`) });
  def({ type: "ccache", name: "In-memory cache (Redis)", cat: "cloud", tags: "cache redis memcached elasticache", kind: "icon", w: 56, h: 56, pal: PAL.cloudDb,
    icon: c => tile(c, `<polygon points="56,22 30,56 48,56 42,78 70,42 52,42" fill="#fff"/>`) });
  def({ type: "cwarehouse", name: "Data warehouse / analytics", cat: "cloud", tags: "redshift synapse bigquery warehouse analytics lake", kind: "icon", w: 56, h: 56, pal: PAL.cloudDb,
    icon: c => tile(c, `<rect x="24" y="56" width="12" height="20" fill="#fff"/><rect x="44" y="40" width="12" height="36" fill="#fff"/><rect x="64" y="26" width="12" height="50" fill="#fff"/>`) });
  def({ type: "cqueue", name: "Message queue (SQS / Service Bus)", cat: "cloud", tags: "sqs service bus queue messaging pubsub", kind: "icon", w: 56, h: 56, pal: PAL.cloudInt,
    icon: c => tile(c, `${[26, 42, 58].map(x => `<rect x="${x}" y="40" width="14" height="20" rx="2" fill="#fff"/>`).join("")}${arrow(18, 50, 24, 50, "#fff", 3)}${arrow(74, 50, 82, 50, "#fff", 3)}`) });
  def({ type: "cevent", name: "Event bus / streaming (Kafka / Kinesis)", cat: "cloud", tags: "eventbridge kinesis event hub kafka pubsub stream", kind: "icon", w: 56, h: 56, pal: PAL.cloudInt,
    icon: c => tile(c, `<circle cx="30" cy="50" r="8" fill="#fff"/>${[30, 50, 70].map(y => `<circle cx="72" cy="${y}" r="7" fill="#fff"/><line x1="37" y1="50" x2="65" y2="${y}" stroke="#fff" stroke-width="3.5"/>`).join("")}`) });
  def({ type: "capigw", name: "API gateway", cat: "cloud", tags: "api gateway apim apigee rest", kind: "icon", w: 56, h: 56, pal: PAL.cloudInt,
    icon: c => tile(c, txt(50, 51, "API", 28, "#fff")) });
  def({ type: "cnotify", name: "Notification / email service", cat: "cloud", tags: "sns ses sendgrid notification email sms", kind: "icon", w: 56, h: 56, pal: PAL.cloudInt,
    icon: c => tile(c, `<rect x="22" y="32" width="56" height="38" rx="4" fill="#fff"/><polyline points="22,34 50,56 78,34" fill="none" stroke="${c.F}" stroke-width="3.5"/>`) });
  def({ type: "ccdn", name: "CDN / edge", cat: "cloud", tags: "cloudfront front door cdn edge cache", kind: "icon", w: 56, h: 56, pal: PAL.cloudNet,
    icon: c => tile(c, `<circle cx="50" cy="50" r="22" fill="none" stroke="#fff" stroke-width="4"/><ellipse cx="50" cy="50" rx="9" ry="22" fill="none" stroke="#fff" stroke-width="3"/><line x1="28" y1="50" x2="72" y2="50" stroke="#fff" stroke-width="3"/>
      ${[[22, 24], [78, 24], [22, 76], [78, 76]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#fff"/>`).join("")}`) });
  def({ type: "cdns", name: "Cloud DNS (Route 53 / Azure DNS)", cat: "cloud", tags: "route53 azure dns cloud dns zone", kind: "icon", w: 56, h: 56, pal: PAL.cloudNet, icon: c => tile(c, txt(50, 51, "DNS", 26, "#fff")) });
  def({ type: "celb", name: "Cloud load balancer (ALB / NLB)", cat: "cloud", tags: "alb nlb elb application gateway load balancer", kind: "icon", w: 56, h: 56, pal: PAL.cloudNet,
    icon: c => tile(c, `<circle cx="28" cy="50" r="8" fill="#fff"/>${[30, 50, 70].map(y => `<line x1="36" y1="50" x2="66" y2="${y}" stroke="#fff" stroke-width="4"/><rect x="66" y="${y - 6}" width="12" height="12" rx="2" fill="#fff"/>`).join("")}`) });
  def({ type: "cigw", name: "Internet gateway", cat: "cloud", tags: "internet gateway igw egress", kind: "icon", w: 56, h: 56, pal: PAL.cloudNet, icon: c => tile(c, txt(50, 51, "IGW", 26, "#fff")) });
  def({ type: "cnat", name: "NAT gateway", cat: "cloud", tags: "nat gateway outbound", kind: "icon", w: 56, h: 56, pal: PAL.cloudNet, icon: c => tile(c, txt(50, 51, "NAT", 26, "#fff")) });
  def({ type: "cvpngw", name: "VPN gateway", cat: "cloud", tags: "vpn gateway site-to-site ipsec", kind: "icon", w: 56, h: 56, pal: PAL.cloudNet,
    icon: c => tile(c, `<rect x="30" y="46" width="40" height="30" rx="5" fill="#fff"/><path d="M37,46 v-8 a13,13 0 0 1 26,0 v8" fill="none" stroke="#fff" stroke-width="5"/><circle cx="50" cy="60" r="4" fill="${c.F}"/>`) });
  def({ type: "cdirect", name: "Dedicated link (Direct Connect / ExpressRoute)", cat: "cloud", tags: "direct connect expressroute interconnect dedicated private link", kind: "icon", w: 56, h: 56, pal: PAL.cloudNet,
    icon: c => tile(c, `<rect x="18" y="38" width="22" height="24" rx="3" fill="#fff"/><rect x="60" y="38" width="22" height="24" rx="3" fill="#fff"/><line x1="40" y1="50" x2="60" y2="50" stroke="#fff" stroke-width="6"/>`) });
  def({ type: "ctransit", name: "Transit gateway / hub", cat: "cloud", tags: "transit gateway vwan hub peering", kind: "icon", w: 56, h: 56, pal: PAL.cloudNet,
    icon: c => tile(c, `<circle cx="50" cy="50" r="10" fill="#fff"/>${[[50, 22], [78, 50], [50, 78], [22, 50]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="#fff"/><line x1="50" y1="50" x2="${x}" y2="${y}" stroke="#fff" stroke-width="3.5"/>`).join("")}`) });
  def({ type: "cprivlink", name: "Private endpoint", cat: "cloud", tags: "private endpoint privatelink service endpoint", kind: "icon", w: 56, h: 56, pal: PAL.cloudNet,
    icon: c => tile(c, `<circle cx="50" cy="50" r="20" fill="none" stroke="#fff" stroke-width="5"/><circle cx="50" cy="50" r="7" fill="#fff"/><line x1="70" y1="50" x2="84" y2="50" stroke="#fff" stroke-width="5"/>`) });
  def({ type: "ciam", name: "IAM / identity", cat: "cloud", tags: "iam identity entra role policy", kind: "icon", w: 56, h: 56, pal: PAL.cloudSec,
    icon: c => tile(c, `${person(42, 50, 1.3, "#fff")}<circle cx="70" cy="66" r="10" fill="#fff"/><rect x="66" y="64" width="20" height="5" fill="#fff"/>`) });
  def({ type: "ckms", name: "Key management (KMS)", cat: "cloud", tags: "kms key vault hsm encryption", kind: "icon", w: 56, h: 56, pal: PAL.cloudSec,
    icon: c => tile(c, `<circle cx="38" cy="46" r="14" fill="none" stroke="#fff" stroke-width="6"/><line x1="50" y1="52" x2="78" y2="66" stroke="#fff" stroke-width="6" stroke-linecap="round"/><line x1="70" y1="62" x2="66" y2="70" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`) });
  def({ type: "csecrets", name: "Secrets manager", cat: "cloud", tags: "secrets manager key vault credentials", kind: "icon", w: 56, h: 56, pal: PAL.cloudSec,
    icon: c => tile(c, `<rect x="28" y="44" width="44" height="32" rx="5" fill="#fff"/><path d="M36,44 v-9 a14,14 0 0 1 28,0 v9" fill="none" stroke="#fff" stroke-width="5"/><circle cx="50" cy="60" r="5" fill="${c.F}"/>`) });
  def({ type: "cwafc", name: "Cloud WAF / Shield", cat: "cloud", tags: "waf shield ddos cloud armor front door", kind: "icon", w: 56, h: 56, pal: PAL.cloudSec,
    icon: c => tile(c, `<path d="M50,20 L76,30 V50 C76,64 64,74 50,80 C36,74 24,64 24,50 V30 Z" fill="#fff"/>`) });
  def({ type: "cfirewall", name: "Cloud firewall / NSG", cat: "cloud", tags: "security group nsg network firewall acl", kind: "icon", w: 56, h: 56, pal: PAL.cloudSec,
    icon: c => tile(c, `<rect x="22" y="30" width="56" height="40" rx="3" fill="#fff"/>${[43, 56].map(y => `<line x1="22" y1="${y}" x2="78" y2="${y}" stroke="${c.F}" stroke-width="3"/>`).join("")}<line x1="50" y1="30" x2="50" y2="43" stroke="${c.F}" stroke-width="3"/><line x1="36" y1="43" x2="36" y2="56" stroke="${c.F}" stroke-width="3"/><line x1="64" y1="43" x2="64" y2="56" stroke="${c.F}" stroke-width="3"/><line x1="50" y1="56" x2="50" y2="70" stroke="${c.F}" stroke-width="3"/>`) });
  def({ type: "cmonitor", name: "Monitoring (CloudWatch / Monitor)", cat: "cloud", tags: "cloudwatch azure monitor stackdriver metrics alerts observability", kind: "icon", w: 56, h: 56, pal: PAL.cloudOps,
    icon: c => tile(c, `<path d="M24,66 a26,26 0 0 1 52,0" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/><line x1="50" y1="66" x2="64" y2="46" stroke="#fff" stroke-width="5" stroke-linecap="round"/><circle cx="50" cy="66" r="5" fill="#fff"/>`) });
  def({ type: "clogs", name: "Logging / audit trail", cat: "cloud", tags: "cloudtrail log analytics audit logging", kind: "icon", w: 56, h: 56, pal: PAL.cloudOps,
    icon: c => tile(c, `<rect x="28" y="22" width="44" height="56" rx="4" fill="#fff"/>${[34, 44, 54, 64].map(y => `<rect x="35" y="${y}" width="${y === 64 ? 18 : 30}" height="4" rx="1" fill="${c.F}"/>`).join("")}`) });
  def({ type: "ccicd", name: "CI/CD pipeline", cat: "cloud", tags: "cicd pipeline devops github actions jenkins gitlab", kind: "icon", w: 56, h: 56, pal: PAL.cloudOps,
    icon: c => tile(c, `<circle cx="28" cy="50" r="8" fill="#fff"/><circle cx="50" cy="50" r="8" fill="#fff"/><circle cx="72" cy="50" r="8" fill="#fff"/><line x1="36" y1="50" x2="42" y2="50" stroke="#fff" stroke-width="4"/><line x1="58" y1="50" x2="64" y2="50" stroke="#fff" stroke-width="4"/>`) });
  def({ type: "ciac", name: "Infrastructure as code", cat: "cloud", tags: "terraform bicep cloudformation iac ansible", kind: "icon", w: 56, h: 56, pal: PAL.cloudOps,
    icon: c => tile(c, `<polyline points="38,34 24,50 38,66" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><polyline points="62,34 76,50 62,66" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><line x1="54" y1="30" x2="46" y2="70" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`) });
  def({ type: "cai", name: "AI / ML service", cat: "cloud", tags: "ai ml bedrock openai vertex sagemaker llm", kind: "icon", w: 56, h: 56, pal: PAL.cloudOps,
    icon: c => tile(c, `<circle cx="50" cy="50" r="9" fill="#fff"/>${[[30, 30], [70, 30], [30, 70], [70, 70]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="#fff"/><line x1="50" y1="50" x2="${x}" y2="${y}" stroke="#fff" stroke-width="3"/>`).join("")}`) });
  def({ type: "cregion", name: "Cloud region / account", cat: "cloud", tags: "region account subscription project tenant cloud boundary", kind: "container", w: 420, h: 300, pal: { fill: "#fff7ec", stroke: "#ec7a1c" }, label: "Cloud region", dash: "8 5" });
  def({ type: "cvpc", name: "VPC / VNet", cat: "cloud", tags: "vpc vnet virtual network", kind: "container", w: 360, h: 240, pal: { fill: "#f1eefb", stroke: "#6f42c1" }, label: "VPC 10.0.0.0/16" });
  def({ type: "csubnet", name: "Subnet (public)", cat: "cloud", tags: "subnet public dmz", kind: "container", w: 280, h: 160, pal: { fill: "#eaf7ee", stroke: "#2e8b57" }, label: "Public subnet 10.0.1.0/24", dash: "6 4" });
  def({ type: "csubnetp", name: "Subnet (private)", cat: "cloud", tags: "subnet private internal", kind: "container", w: 280, h: 160, pal: { fill: "#eaf1fb", stroke: "#2b6cb0" }, label: "Private subnet 10.0.2.0/24", dash: "6 4" });
  def({ type: "caz", name: "Availability zone", cat: "cloud", tags: "availability zone az", kind: "container", w: 300, h: 220, pal: { fill: "#ffffff", stroke: "#8fa3bf" }, label: "AZ-a", dash: "3 4" });

  /* ===================== SOFTWARE ARCHITECTURE ===================== */
  def({ type: "c4person", name: "Person (C4)", cat: "software", tags: "c4 person actor user role", kind: "box", w: 130, h: 120, pal: PAL.c4, textColor: "#fff",
    geo: (w, h, st) => { const r = Math.min(20, h * 0.17), top = r * 1.5; return `<circle cx="${w / 2}" cy="${r}" r="${r}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="${st.strokeWidth}"/>
      <rect x="0" y="${top}" width="${w}" height="${h - top}" rx="14" fill="${st.fill}" stroke="${st.stroke}" stroke-width="${st.strokeWidth}"/>`; }, labelDy: 0.13 });
  def({ type: "c4system", name: "Software system (C4)", cat: "software", tags: "c4 system boundary application", kind: "box", w: 150, h: 90, pal: PAL.c4, textColor: "#fff", geo: "rounded" });
  def({ type: "c4container", name: "Container / service (C4)", cat: "software", tags: "c4 container service application api", kind: "box", w: 150, h: 90, pal: PAL.c4c, textColor: "#fff", geo: "rounded" });
  def({ type: "c4component", name: "Component (C4)", cat: "software", tags: "c4 component module class", kind: "box", w: 140, h: 80, pal: PAL.c4comp, textColor: "#101b3b", geo: "rounded" });
  def({ type: "c4external", name: "External system (C4)", cat: "software", tags: "c4 external third party saas", kind: "box", w: 150, h: 90, pal: PAL.c4ext, textColor: "#fff", geo: "rounded" });
  def({ type: "microservice", name: "Microservice", cat: "software", tags: "microservice service hexagon", kind: "box", w: 120, h: 100, pal: PAL.soft, textColor: "#fff", geo: "hexagon" });
  def({ type: "api", name: "API endpoint", cat: "software", tags: "api rest graphql grpc endpoint", kind: "box", w: 130, h: 50, pal: { fill: "#eef2ff", stroke: "#4c51bf" }, textColor: "#2a2f7a", geo: "pill" });
  def({ type: "gateway", name: "API gateway / BFF", cat: "software", tags: "gateway bff ingress reverse proxy", kind: "box", w: 140, h: 70, pal: { fill: "#4c51bf", stroke: "#2a2f7a" }, textColor: "#fff", geo: "rounded" });
  def({ type: "browser", name: "Web browser / SPA", cat: "software", tags: "browser spa frontend react angular web client", kind: "icon", w: 68, h: 56, pal: PAL.soft,
    icon: c => `<rect x="6" y="12" width="88" height="76" rx="7" fill="#fff" stroke="${c.K}" stroke-width="3"/><rect x="6" y="12" width="88" height="18" rx="7" fill="${c.F}"/><rect x="6" y="22" width="88" height="8" fill="${c.F}"/>
      <circle cx="16" cy="21" r="3" fill="#fff"/><circle cx="26" cy="21" r="3" fill="#fff"/><circle cx="36" cy="21" r="3" fill="#fff"/>
      <rect x="16" y="40" width="40" height="6" rx="2" fill="${c.L}"/><rect x="16" y="52" width="68" height="6" rx="2" fill="${c.L}"/><rect x="16" y="64" width="56" height="6" rx="2" fill="${c.L}"/>` });
  def({ type: "mobileapp", name: "Mobile app", cat: "software", tags: "mobile app ios android client", kind: "icon", w: 40, h: 60, pal: PAL.soft,
    icon: c => `<rect x="28" y="4" width="44" height="92" rx="8" fill="${c.F}" stroke="${c.K}" stroke-width="3"/><rect x="33" y="14" width="34" height="66" rx="2" fill="#fff"/>
      <rect x="38" y="22" width="24" height="14" rx="2" fill="${c.L}"/><rect x="38" y="42" width="24" height="5" rx="1" fill="${c.L}"/><rect x="38" y="52" width="18" height="5" rx="1" fill="${c.L}"/>` });
  def({ type: "sdb", name: "Database (software)", cat: "software", tags: "database sql nosql store persistence", kind: "box", w: 110, h: 90, pal: { fill: "#ffffff", stroke: "#2a9d8f" }, textColor: "#101b3b", geo: "cylinder" });
  def({ type: "squeue", name: "Queue / topic", cat: "software", tags: "queue topic message broker kafka rabbitmq", kind: "box", w: 140, h: 50, pal: { fill: "#fdf2f8", stroke: "#d53f8c" }, textColor: "#701a47", geo: "queue" });
  def({ type: "scache", name: "Cache", cat: "software", tags: "cache redis memcache", kind: "icon", w: 56, h: 56, pal: { fill: "#d53f8c", stroke: "#78204f" },
    icon: c => `<rect x="10" y="10" width="80" height="80" rx="14" fill="${c.F}" stroke="${c.K}" stroke-width="3"/><polygon points="56,22 30,56 48,56 42,78 70,42 52,42" fill="#fff"/>` });
  def({ type: "search", name: "Search index", cat: "software", tags: "search elasticsearch opensearch solr index", kind: "icon", w: 56, h: 56, pal: PAL.soft,
    icon: c => `<rect x="10" y="10" width="80" height="80" rx="14" fill="${c.F}" stroke="${c.K}" stroke-width="3"/><circle cx="44" cy="44" r="16" fill="none" stroke="#fff" stroke-width="6"/><line x1="56" y1="56" x2="74" y2="74" stroke="#fff" stroke-width="7" stroke-linecap="round"/>` });
  def({ type: "scheduler", name: "Scheduler / cron", cat: "software", tags: "scheduler cron job timer batch", kind: "icon", w: 56, h: 56, pal: PAL.soft,
    icon: c => `<circle cx="50" cy="50" r="42" fill="${c.F}" stroke="${c.K}" stroke-width="3"/><circle cx="50" cy="50" r="30" fill="#fff"/><line x1="50" y1="50" x2="50" y2="30" stroke="${c.K}" stroke-width="5" stroke-linecap="round"/><line x1="50" y1="50" x2="64" y2="58" stroke="${c.K}" stroke-width="5" stroke-linecap="round"/><circle cx="50" cy="50" r="4" fill="${c.K}"/>` });
  def({ type: "worker", name: "Worker / batch job", cat: "software", tags: "worker batch job consumer processor etl", kind: "icon", w: 56, h: 56, pal: PAL.soft,
    icon: c => { let s = `<rect x="10" y="10" width="80" height="80" rx="14" fill="${c.F}" stroke="${c.K}" stroke-width="3"/>`; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; s += `<rect x="46" y="20" width="8" height="12" rx="2" fill="#fff" transform="rotate(${i * 45} 50 50)"/>`; } return s + `<circle cx="50" cy="50" r="18" fill="#fff"/><circle cx="50" cy="50" r="8" fill="${c.F}"/>`; } });
  def({ type: "auth", name: "Auth service / token", cat: "software", tags: "auth oauth jwt token identity", kind: "icon", w: 56, h: 56, pal: PAL.soft,
    icon: c => `<rect x="10" y="10" width="80" height="80" rx="14" fill="${c.F}" stroke="${c.K}" stroke-width="3"/><rect x="24" y="36" width="52" height="34" rx="4" fill="#fff"/><circle cx="38" cy="53" r="7" fill="${c.F}"/><rect x="50" y="46" width="20" height="4" fill="${c.F}"/><rect x="50" y="56" width="14" height="4" fill="${c.F}"/>` });
  def({ type: "filestore", name: "File / blob store", cat: "software", tags: "file blob store upload", kind: "icon", w: 56, h: 56, pal: PAL.soft,
    icon: c => `<rect x="10" y="10" width="80" height="80" rx="14" fill="${c.F}" stroke="${c.K}" stroke-width="3"/><path d="M24,34 h20 l6,8 h26 v30 h-52 z" fill="#fff"/>` });
  def({ type: "event", name: "Event / message", cat: "software", tags: "event message domain event notification", kind: "box", w: 120, h: 44, pal: { fill: "#fff8e1", stroke: "#d98a1a" }, textColor: "#5d3a00", geo: "parallelogram" });
  def({ type: "thirdparty", name: "SaaS / third-party", cat: "software", tags: "saas third party external vendor", kind: "box", w: 140, h: 70, pal: { fill: "#f4f4f4", stroke: "#8a8a8a" }, textColor: "#333", geo: "rounded", dash: "6 4" });

  /* ===================== ZONES / CONTAINERS ===================== */
  def({ type: "zone", name: "Zone / group", cat: "zones", tags: "zone group boundary container area", kind: "container", w: 360, h: 240, pal: { fill: "#f4f7fb", stroke: "#4a7fb5" }, label: "Zone", dash: "8 5" });
  def({ type: "dmz", name: "DMZ zone", cat: "zones", tags: "dmz perimeter zone", kind: "container", w: 360, h: 200, pal: { fill: "#fff4e5", stroke: "#e07b1a" }, label: "DMZ", dash: "8 5" });
  def({ type: "trusted", name: "Trusted / internal zone", cat: "zones", tags: "trusted internal lan zone", kind: "container", w: 360, h: 240, pal: { fill: "#ecf8ef", stroke: "#1f9d55" }, label: "Internal (trusted)", dash: "8 5" });
  def({ type: "untrusted", name: "Untrusted / external zone", cat: "zones", tags: "untrusted external public zone", kind: "container", w: 300, h: 160, pal: { fill: "#fdeeee", stroke: "#c93c3c" }, label: "External (untrusted)", dash: "8 5" });
  def({ type: "restricted", name: "Restricted / PCI zone", cat: "zones", tags: "restricted pci secure high security zone", kind: "container", w: 320, h: 200, pal: { fill: "#f3eefc", stroke: "#6f42c1" }, label: "Restricted (PCI)", dash: "8 5" });
  def({ type: "mgmt", name: "Management zone (OOB)", cat: "zones", tags: "management oob zone", kind: "container", w: 320, h: 160, pal: { fill: "#eef6f6", stroke: "#319795" }, label: "Management (OOB)", dash: "8 5" });
  def({ type: "site", name: "Site / location", cat: "zones", tags: "site location building campus branch hq", kind: "container", w: 420, h: 300, pal: { fill: "#ffffff", stroke: "#101b3b" }, label: "Site: HQ" });
  def({ type: "onprem", name: "On-premises data centre", cat: "zones", tags: "onprem on-premises datacenter dc", kind: "container", w: 420, h: 300, pal: { fill: "#f7f9fc", stroke: "#4b6584" }, label: "On-premises DC" });
  def({ type: "cluster", name: "Cluster / HA pair", cat: "zones", tags: "cluster ha pair failover", kind: "container", w: 240, h: 140, pal: { fill: "#ffffff", stroke: "#4b6584" }, label: "HA cluster", dash: "3 4" });
  def({ type: "vlan", name: "VLAN / segment", cat: "zones", tags: "vlan segment broadcast domain subnet", kind: "container", w: 300, h: 140, pal: { fill: "#eef4fb", stroke: "#1f6fb5" }, label: "VLAN 10 - Users (10.10.10.0/24)", dash: "6 4" });
  def({ type: "swimlane", name: "Tier / swimlane", cat: "zones", tags: "tier layer swimlane row band", kind: "container", w: 720, h: 140, pal: { fill: "#fafbfd", stroke: "#8fa3bf" }, label: "Tier" });

  /* ===================== LLD DETAIL ===================== */
  def({ type: "rack", name: "Rack (42U)", cat: "lld", tags: "rack cabinet 42u lld", kind: "container", w: 180, h: 420, pal: { fill: "#f4f4f6", stroke: "#2e3843" }, label: "Rack A01", rackU: true });
  def({ type: "patchpanel", name: "Patch panel", cat: "lld", tags: "patch panel lld cabling", kind: "icon", w: 96, h: 28, pal: PAL.compute,
    icon: c => `<rect x="2" y="30" width="96" height="40" rx="3" fill="${c.D}" stroke="${c.K}" stroke-width="2"/>${Array.from({ length: 12 }, (_, i) => `<rect x="${8 + i * 7.3}" y="42" width="5" height="12" rx="1" fill="#fff"/>`).join("")}` });
  def({ type: "pdu", name: "PDU", cat: "lld", tags: "pdu power distribution lld", kind: "icon", w: 96, h: 24, pal: PAL.compute,
    icon: c => `<rect x="2" y="34" width="96" height="32" rx="3" fill="#333" stroke="#000" stroke-width="2"/>${Array.from({ length: 8 }, (_, i) => `<circle cx="${12 + i * 10.8}" cy="50" r="4" fill="#fff"/>`).join("")}<circle cx="92" cy="50" r="3" fill="#9ee636"/>` });
  def({ type: "kvm", name: "KVM / console", cat: "lld", tags: "kvm console serial lld", kind: "icon", w: 96, h: 24, pal: PAL.compute, icon: c => `<rect x="2" y="34" width="96" height="32" rx="3" fill="${c.F}" stroke="${c.K}" stroke-width="2"/>${txt(50, 51, "KVM / CONSOLE", 12, "#fff", 700)}` });
  def({ type: "rackdevice", name: "Rack-mounted device", cat: "lld", tags: "rack device 1u 2u server switch lld", kind: "box", w: 150, h: 30, pal: { fill: "#4b6584", stroke: "#233348" }, textColor: "#fff", geo: "rackdevice", label: "device-01", fontSize: 10, mono: true });
  def({ type: "blank1u", name: "Blank / spare 1U", cat: "lld", tags: "blank spare 1u lld", kind: "box", w: 150, h: 20, pal: { fill: "#e6e8ec", stroke: "#8a8f99" }, textColor: "#555", geo: "rect", label: "spare", fontSize: 9 });
  def({ type: "iface", name: "Interface / port label", cat: "lld", tags: "interface port label gi te eth lld", kind: "box", w: 64, h: 22, pal: { fill: "#ffffff", stroke: "#1f6fb5" }, textColor: "#0d3d68", geo: "rect", label: "Gi1/0/1", fontSize: 10, mono: true });
  def({ type: "iplabel", name: "IP address label", cat: "lld", tags: "ip address label cidr lld", kind: "box", w: 110, h: 22, pal: { fill: "#f4f7fb", stroke: "#8fa3bf" }, textColor: "#101b3b", geo: "rect", label: "10.0.0.1/24", fontSize: 10, mono: true });
  def({ type: "vlanlabel", name: "VLAN tag", cat: "lld", tags: "vlan tag label lld", kind: "box", w: 70, h: 22, pal: { fill: "#e3f0fc", stroke: "#1f6fb5" }, textColor: "#0d3d68", geo: "pill", label: "VLAN 10", fontSize: 10 });
  def({ type: "table", name: "Detail table (IP / VLAN / ports)", cat: "lld", tags: "table ip plan vlan matrix port map lld", kind: "special", w: 320, h: 150, label: "IP addressing plan", props: { rows: "Device | Interface | IP / Mask | VLAN\ncore-sw-01 | Vlan10 | 10.10.10.1/24 | 10\ncore-sw-01 | Vlan20 | 10.10.20.1/24 | 20" } });

  /* ===================== FLOWCHART / BASIC ===================== */
  def({ type: "rect", name: "Rectangle / process", cat: "flow", tags: "rectangle box process step", kind: "box", w: 140, h: 70, pal: PAL.generic, geo: "rect" });
  def({ type: "rounded", name: "Rounded rectangle", cat: "flow", tags: "rounded rectangle terminal", kind: "box", w: 140, h: 70, pal: PAL.generic, geo: "rounded" });
  def({ type: "ellipse", name: "Ellipse", cat: "flow", tags: "ellipse oval start end", kind: "box", w: 140, h: 80, pal: PAL.generic, geo: "ellipse" });
  def({ type: "circle", name: "Circle", cat: "flow", tags: "circle connector node", kind: "box", w: 80, h: 80, pal: PAL.generic, geo: "ellipse" });
  def({ type: "diamond", name: "Decision", cat: "flow", tags: "diamond decision condition", kind: "box", w: 140, h: 90, pal: PAL.generic, geo: "diamond" });
  def({ type: "parallelogram", name: "Data / input-output", cat: "flow", tags: "parallelogram data input output", kind: "box", w: 150, h: 70, pal: PAL.generic, geo: "parallelogram" });
  def({ type: "document", name: "Document", cat: "flow", tags: "document report file", kind: "box", w: 140, h: 80, pal: PAL.generic, geo: "document" });
  def({ type: "cylinder", name: "Cylinder / data store", cat: "flow", tags: "cylinder store database", kind: "box", w: 110, h: 90, pal: PAL.generic, geo: "cylinder" });
  def({ type: "hexagon", name: "Hexagon", cat: "flow", tags: "hexagon preparation", kind: "box", w: 140, h: 80, pal: PAL.generic, geo: "hexagon" });
  def({ type: "triangle", name: "Triangle", cat: "flow", tags: "triangle warning", kind: "box", w: 100, h: 90, pal: PAL.generic, geo: "triangle", labelDy: 0.2 });
  def({ type: "gcloud", name: "Cloud (generic)", cat: "flow", tags: "cloud generic", kind: "box", w: 160, h: 100, pal: PAL.generic, geo: "cloud" });
  def({ type: "blockarrow", name: "Block arrow", cat: "flow", tags: "arrow block direction flow", kind: "box", w: 140, h: 60, pal: { fill: "#e3f0fc", stroke: "#1f6fb5" }, geo: "blockarrow" });
  def({ type: "pill", name: "Pill / tag", cat: "flow", tags: "pill tag badge capsule", kind: "box", w: 120, h: 40, pal: PAL.generic, geo: "pill" });
  def({ type: "marker", name: "Step marker (number)", cat: "flow", tags: "marker step number callout sequence", kind: "box", w: 30, h: 30, pal: { fill: "#101b3b", stroke: "#101b3b" }, textColor: "#fff", geo: "ellipse", label: "1", fontSize: 13 });

  /* ===================== ANNOTATION ===================== */
  def({ type: "text", name: "Text", cat: "annot", tags: "text label heading caption", kind: "text", w: 160, h: 32, pal: { fill: "none", stroke: "none" }, label: "Text", fontSize: 14 });
  def({ type: "heading", name: "Heading", cat: "annot", tags: "heading title text", kind: "text", w: 320, h: 40, pal: { fill: "none", stroke: "none" }, label: "Diagram heading", fontSize: 22, bold: true });
  def({ type: "note", name: "Note / sticky", cat: "annot", tags: "note sticky comment remark", kind: "box", w: 160, h: 90, pal: PAL.note, geo: "note", label: "Note", fontSize: 12, align: "left" });
  def({ type: "callout", name: "Callout", cat: "annot", tags: "callout speech bubble comment", kind: "box", w: 160, h: 70, pal: { fill: "#ffffff", stroke: "#101b3b" }, geo: "callout", label: "Callout", fontSize: 12 });
  def({ type: "legend", name: "Legend (auto)", cat: "annot", tags: "legend key symbols auto", kind: "special", w: 220, h: 120, label: "Legend" });
  def({ type: "titleblock", name: "Title block (auto)", cat: "annot", tags: "title block metadata version author classification", kind: "special", w: 420, h: 96, label: "Title block" });
  def({ type: "revtable", name: "Revision history", cat: "annot", tags: "revision history change log version table", kind: "special", w: 360, h: 100, label: "Revision history", props: { rows: "Ver | Date | Author | Change\n0.1 | " + new Date().toISOString().slice(0, 10) + " | Author | Initial draft" } });
  def({ type: "image", name: "Image (upload)", cat: "annot", tags: "image picture logo png svg upload", kind: "special", w: 120, h: 80, label: "" });

  /* ---------- geometry renderers for box/container shapes ---------- */
  const GEO = {
    rect: (w, h, st) => `<rect x="0" y="0" width="${w}" height="${h}" rx="${st.radius || 0}" ${fs(st)}/>`,
    rounded: (w, h, st) => `<rect x="0" y="0" width="${w}" height="${h}" rx="${st.radius == null ? 10 : st.radius}" ${fs(st)}/>`,
    pill: (w, h, st) => `<rect x="0" y="0" width="${w}" height="${h}" rx="${h / 2}" ${fs(st)}/>`,
    ellipse: (w, h, st) => `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}" ${fs(st)}/>`,
    diamond: (w, h, st) => `<polygon points="${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}" ${fs(st)} stroke-linejoin="round"/>`,
    parallelogram: (w, h, st) => { const o = Math.min(w * 0.18, h * 0.5); return `<polygon points="${o},0 ${w},0 ${w - o},${h} 0,${h}" ${fs(st)} stroke-linejoin="round"/>`; },
    hexagon: (w, h, st) => { const o = Math.min(w * 0.22, h * 0.5); return `<polygon points="${o},0 ${w - o},0 ${w},${h / 2} ${w - o},${h} ${o},${h} 0,${h / 2}" ${fs(st)} stroke-linejoin="round"/>`; },
    triangle: (w, h, st) => `<polygon points="${w / 2},0 ${w},${h} 0,${h}" ${fs(st)} stroke-linejoin="round"/>`,
    document: (w, h, st) => `<path d="M0,0 H${w} V${h - h * 0.15} C${w * 0.75},${h - h * 0.35} ${w * 0.25},${h + h * 0.05} 0,${h - h * 0.15} Z" ${fs(st)}/>`,
    cylinder: (w, h, st) => { const ry = Math.min(h * 0.14, w * 0.2); return `<path d="M0,${ry} V${h - ry} A${w / 2},${ry} 0 0 0 ${w},${h - ry} V${ry}" ${fs(st)}/><ellipse cx="${w / 2}" cy="${ry}" rx="${w / 2}" ry="${ry}" ${fs(st)}/>`; },
    cloud: (w, h, st) => `<g transform="scale(${w / 106},${h / 70})"><path d="M25 62 C8 62 4 45 16 38 C6 22 28 8 38 20 C44 4 70 4 74 20 C88 12 102 30 90 42 C102 52 90 66 76 62 Z" ${fs(st)} vector-effect="non-scaling-stroke" stroke-linejoin="round"/></g>`,
    note: (w, h, st) => { const f = Math.min(18, w * 0.2, h * 0.3); return `<path d="M0,0 H${w - f} L${w},${f} V${h} H0 Z" ${fs(st)}/><path d="M${w - f},0 V${f} H${w}" fill="none" stroke="${st.stroke}" stroke-width="${st.strokeWidth}"/>`; },
    callout: (w, h, st) => { const b = h * 0.75, r = 8; return `<path d="M${r},0 H${w - r} A${r},${r} 0 0 1 ${w},${r} V${b - r} A${r},${r} 0 0 1 ${w - r},${b} H${w * 0.35} L${w * 0.2},${h} L${w * 0.24},${b} H${r} A${r},${r} 0 0 1 0,${b - r} V${r} A${r},${r} 0 0 1 ${r},0 Z" ${fs(st)} stroke-linejoin="round"/>`; },
    blockarrow: (w, h, st) => { const hd = Math.min(w * 0.35, h), t = h * 0.25; return `<polygon points="0,${t} ${w - hd},${t} ${w - hd},0 ${w},${h / 2} ${w - hd},${h} ${w - hd},${h - t} 0,${h - t}" ${fs(st)} stroke-linejoin="round"/>`; },
    queue: (w, h, st) => `<rect x="0" y="0" width="${w}" height="${h}" rx="4" ${fs(st)}/>${[0.3, 0.5, 0.7].map(p => `<line x1="${w * p}" y1="0" x2="${w * p}" y2="${h}" stroke="${st.stroke}" stroke-width="${st.strokeWidth}" opacity=".5"/>`).join("")}`,
    rackdevice: (w, h, st) => `<rect x="0" y="0" width="${w}" height="${h}" rx="2" ${fs(st)}/><rect x="3" y="3" width="6" height="${Math.max(2, h - 6)}" rx="1" fill="#fff" opacity=".35"/><rect x="${w - 9}" y="3" width="6" height="${Math.max(2, h - 6)}" rx="1" fill="#fff" opacity=".35"/><circle cx="${w - 16}" cy="${h / 2}" r="2" fill="#9ee636"/>`
  };
  function fs(st) {
    return `fill="${st.fill}" stroke="${st.stroke}" stroke-width="${st.strokeWidth}"${st.dash ? ` stroke-dasharray="${st.dash}"` : ""}`;
  }

  const byType = {};
  SHAPES.forEach(s => { if (!s.pal) s.pal = { fill: "#ffffff", stroke: "#101b3b" }; byType[s.type] = s; });

  window.RCW_SHAPES = {
    CATEGORIES, SHAPES, GEO, PAL, byType, get: t => byType[t],
    util: { shade, contrast, luminance, esc, txt, arrow, hexToRgb, FONT },
    // render the icon body for an icon-kind shape into a w x h box (uniform scale, centred)
    renderIcon(shape, w, h, style) {
      const F = style.fill || shape.pal.fill, K = style.stroke || shape.pal.stroke;
      const c = { F, K, L: shade(F, 0.55), D: shade(F, -0.25), W: "#fff" };
      const s = Math.min(w / 100, h / 100), ox = (w - 100 * s) / 2, oy = (h - 100 * s) / 2;
      return `<g transform="translate(${ox},${oy}) scale(${s})">${shape.icon(c)}</g>`;
    },
    renderGeo(shape, w, h, style) {
      const g = typeof shape.geo === "function" ? shape.geo : GEO[shape.geo || "rect"];
      return g(w, h, style);
    },
    // library thumbnail (44x36)
    thumb(shape) {
      const st = { fill: shape.pal.fill, stroke: shape.pal.stroke, strokeWidth: 2, dash: shape.dash || "" };
      if (shape.kind === "icon") return `<svg viewBox="0 0 100 100" aria-hidden="true">${this.renderIcon(shape, 100, 100, st)}</svg>`;
      if (shape.kind === "container") return `<svg viewBox="-2 -2 104 84" aria-hidden="true"><rect x="0" y="0" width="100" height="80" rx="8" fill="${st.fill}" stroke="${st.stroke}" stroke-width="3" stroke-dasharray="${shape.dash ? "10 6" : ""}"/><rect x="0" y="0" width="100" height="20" rx="8" fill="${st.stroke}" opacity=".85"/></svg>`;
      if (shape.kind === "text") return `<svg viewBox="0 0 100 80" aria-hidden="true">${txt(50, 40, "Aa", 44, "#101b3b", shape.bold ? 800 : 500)}</svg>`;
      if (shape.kind === "special") {
        if (shape.type === "legend") return `<svg viewBox="0 0 100 80" aria-hidden="true"><rect x="2" y="2" width="96" height="76" rx="6" fill="#fff" stroke="#101b3b" stroke-width="3"/><circle cx="20" cy="26" r="7" fill="#1f6fb5"/><rect x="34" y="22" width="50" height="8" fill="#8fa3bf"/><rect x="13" y="44" width="14" height="14" fill="#d0463f"/><rect x="34" y="47" width="50" height="8" fill="#8fa3bf"/></svg>`;
        if (shape.type === "titleblock") return `<svg viewBox="0 0 100 80" aria-hidden="true"><rect x="2" y="16" width="96" height="48" fill="#fff" stroke="#101b3b" stroke-width="3"/><line x1="2" y1="32" x2="98" y2="32" stroke="#101b3b" stroke-width="2"/><line x1="50" y1="32" x2="50" y2="64" stroke="#101b3b" stroke-width="2"/><rect x="8" y="20" width="60" height="8" fill="#101b3b"/></svg>`;
        if (shape.type === "image") return `<svg viewBox="0 0 100 80" aria-hidden="true"><rect x="4" y="6" width="92" height="68" rx="6" fill="#f4f7fb" stroke="#8fa3bf" stroke-width="3"/><circle cx="32" cy="30" r="9" fill="#ffd51d"/><path d="M12,66 L40,40 L58,56 L70,46 L90,66 Z" fill="#4a7fb5"/></svg>`;
        return `<svg viewBox="0 0 100 80" aria-hidden="true"><rect x="2" y="8" width="96" height="64" fill="#fff" stroke="#101b3b" stroke-width="3"/>${[24, 40, 56].map(y => `<line x1="2" y1="${y}" x2="98" y2="${y}" stroke="#8fa3bf" stroke-width="2"/>`).join("")}<line x1="40" y1="8" x2="40" y2="72" stroke="#8fa3bf" stroke-width="2"/><rect x="2" y="8" width="96" height="16" fill="#101b3b"/></svg>`;
      }
      const w = 100, h = shape.geo === "triangle" || shape.geo === "cylinder" || shape.type === "c4person" ? 90 : 64;
      return `<svg viewBox="-3 -3 106 ${h + 6}" aria-hidden="true">${this.renderGeo(shape, w, h, { ...st, strokeWidth: 3, radius: shape.geo === "rounded" ? 10 : 0 })}</svg>`;
    }
  };
})();
