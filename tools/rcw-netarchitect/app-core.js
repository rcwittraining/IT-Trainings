/* RCW - NetArchitect : editor core (state, model, rendering, routing)
   (c) RCW IT Training - www.rcwittraining.in  |  100% client-side, no data leaves the browser.
*/
(function () {
  "use strict";
  const SH = window.RCW_SHAPES, U = SH.util;
  const NS = "http://www.w3.org/2000/svg";
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const PAGE_SIZES = { A4: [1123, 794], A3: [1587, 1123], A2: [2245, 1587], Letter: [1056, 816], Tabloid: [1632, 1056], Infinite: [4000, 3000] };
  const STORAGE_KEY = "rcw-netarchitect-doc-v1";
  const uid = p => (p || "n") + Math.random().toString(36).slice(2, 9);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ------------------------------------------------------------------ connector presets
     Line styles follow common network-drawing conventions (colour + dash = media type).  */
  const PRESETS = {
    link: { name: "Ethernet / generic link", stroke: "#101b3b", width: 2, dash: "" },
    fibre: { name: "Fibre (single-mode)", stroke: "#d98a1a", width: 2.5, dash: "" },
    "fibre-mm": { name: "Fibre (multi-mode) / FC", stroke: "#e07b1a", width: 2.5, dash: "10 4" },
    wan: { name: "WAN / carrier circuit", stroke: "#1f6fb5", width: 3, dash: "" },
    tunnel: { name: "VPN / encrypted tunnel", stroke: "#0d7a3e", width: 2.5, dash: "8 4 2 4" },
    wireless: { name: "Wireless", stroke: "#6f42c1", width: 2, dash: "2 4" },
    logical: { name: "Logical / control plane", stroke: "#5f6c84", width: 1.5, dash: "6 4" },
    flow: { name: "Data flow", stroke: "#078be8", width: 2, dash: "", endArrow: "arrow" },
    power: { name: "Power", stroke: "#c93c3c", width: 2, dash: "1 3" },
    console: { name: "Console / OOB", stroke: "#8fa3bf", width: 1.5, dash: "4 3" },
    trunk: { name: "Trunk / port-channel (802.1Q / LACP)", stroke: "#101b3b", width: 4, dash: "" },
    ha: { name: "HA / heartbeat / cluster link", stroke: "#b7791f", width: 2, dash: "3 3" },
    storage: { name: "Storage (FC / iSCSI / NVMe-oF)", stroke: "#2a9d8f", width: 2.5, dash: "" },
    replication: { name: "Replication / sync", stroke: "#2a9d8f", width: 2, dash: "10 4 2 4", endArrow: "arrow", startArrow: "arrow" },
    api: { name: "API call (sync)", stroke: "#101b3b", width: 1.5, dash: "", endArrow: "arrow" },
    async: { name: "Event / message (async)", stroke: "#6b46c1", width: 1.5, dash: "6 4", endArrow: "open" },
    dependency: { name: "Dependency (UML)", stroke: "#101b3b", width: 1.5, dash: "6 4", endArrow: "open" },
    association: { name: "Association (UML)", stroke: "#101b3b", width: 1.5, dash: "" },
    inheritance: { name: "Inheritance / generalisation (UML)", stroke: "#101b3b", width: 1.5, dash: "", endArrow: "triangle" },
    realization: { name: "Realisation (UML)", stroke: "#101b3b", width: 1.5, dash: "6 4", endArrow: "triangle" },
    composition: { name: "Composition (UML)", stroke: "#101b3b", width: 1.5, dash: "", startArrow: "diamondfilled" },
    aggregation: { name: "Aggregation (UML)", stroke: "#101b3b", width: 1.5, dash: "", startArrow: "diamond" },
    onetomany: { name: "One-to-many (ERD)", stroke: "#2b6cb0", width: 1.5, dash: "", startArrow: "one", endArrow: "many" },
    manytomany: { name: "Many-to-many (ERD)", stroke: "#2b6cb0", width: 1.5, dash: "", startArrow: "many", endArrow: "many" },
    sequence: { name: "Sequence message (UML)", stroke: "#101b3b", width: 1.5, dash: "", endArrow: "arrow", router: "straight" },
    sequenceret: { name: "Sequence return (UML)", stroke: "#101b3b", width: 1.5, dash: "6 4", endArrow: "open", router: "straight" },
    bpmnflow: { name: "Sequence flow (BPMN)", stroke: "#101b3b", width: 1.5, dash: "", endArrow: "arrow" },
    bpmnmsg: { name: "Message flow (BPMN)", stroke: "#101b3b", width: 1.5, dash: "6 4", startArrow: "dot", endArrow: "open" },
    blocked: { name: "Blocked / denied flow", stroke: "#d0463f", width: 2, dash: "4 4", endArrow: "cross" },
    plain: { name: "Plain line (no styling)", stroke: "#101b3b", width: 1.5, dash: "" }
  };

  /* ------------------------------------------------------------------ state */
  const S = {
    doc: null, page: null, sel: new Set(), selEdges: new Set(),
    tool: "select", pendingShape: null,
    zoom: 1, panX: 40, panY: 40,
    undo: [], redo: [], dirty: false,
    clipboard: null, lastSave: 0, editing: null,
    hoverPort: null, connectDraft: null, marquee: null,
    dragging: null, guides: [], pasteOffset: 0
  };

  /* ------------------------------------------------------------------ helpers */
  function pageSize() {
    const p = S.doc.settings.page || { size: "A3", orientation: "landscape" };
    let [w, h] = PAGE_SIZES[p.size] || PAGE_SIZES.A3;
    if (p.orientation === "portrait" && w > h) [w, h] = [h, w];
    return { w, h };
  }
  function nodeById(id) { return S.page.nodes.find(n => n.id === id); }
  function edgeById(id) { return S.page.edges.find(e => e.id === id); }
  // absolute position (nodes store absolute coordinates; parent is only for grouping/moving)
  function bbox(n) { return { x: n.x, y: n.y, w: n.w, h: n.h, cx: n.x + n.w / 2, cy: n.y + n.h / 2 }; }
  function descendants(id, acc) {
    acc = acc || [];
    S.page.nodes.forEach(n => { if (n.parent === id) { acc.push(n); descendants(n.id, acc); } });
    return acc;
  }
  function isContainer(n) { const s = SH.get(n.type); return s && s.kind === "container"; }
  function nodeStyle(n) {
    const s = SH.get(n.type) || SH.get("rect");
    const st = Object.assign({ fill: s.pal.fill, stroke: s.pal.stroke, strokeWidth: 2, dash: s.dash || "", fontSize: s.fontSize || (s.kind === "container" ? 13 : s.kind === "icon" ? 11 : 12), textColor: s.textColor || "#101b3b", bold: !!s.bold, align: s.align || "center", opacity: 1, radius: s.geo === "rounded" ? 10 : 0, labelPos: s.kind === "icon" ? "below" : "center", mono: !!s.mono }, n.style || {});
    return st;
  }

  /* ------------------------------------------------------------------ ports
     Each node has 4 side ports (n,e,s,w) + centre 'auto' which picks the best side. */
  function portPoint(n, port) {
    const b = bbox(n);
    switch (port) {
      case "n": return { x: b.cx, y: b.y };
      case "s": return { x: b.cx, y: b.y + b.h };
      case "w": return { x: b.x, y: b.cy };
      case "c": return { x: b.cx, y: b.cy };
      case "e": return { x: b.x + b.w, y: b.cy };
      default: return { x: b.cx, y: b.cy };
    }
  }
  function bestPorts(a, b) {
    const A = bbox(a), B = bbox(b);
    const dx = B.cx - A.cx, dy = B.cy - A.cy;
    // prefer horizontal when horizontal gap dominates
    const gapX = Math.max(0, Math.abs(dx) - (A.w + B.w) / 2), gapY = Math.max(0, Math.abs(dy) - (A.h + B.h) / 2);
    if (gapX >= gapY) return dx >= 0 ? ["e", "w"] : ["w", "e"];
    return dy >= 0 ? ["s", "n"] : ["n", "s"];
  }
  function resolveEnds(e) {
    const a = nodeById(e.from.node), b = nodeById(e.to.node);
    if (!a || !b) return null;
    let pa = e.from.port, pb = e.to.port;
    if (a.type === "anchor") pa = "c"; if (b.type === "anchor") pb = "c";
    if (pa === "auto" || pb === "auto") { const bp = bestPorts(a, b); if (pa === "auto") pa = bp[0]; if (pb === "auto") pb = bp[1]; }
    const p1 = fanPoint(a, pa, e, true), p2 = fanPoint(b, pb, e, false);
    return { a, b, pa, pb, p1, p2 };
  }
  /* Fan-out ("dynamic glue"): when several connectors share one side of a shape they are spread along that side
     instead of stacking on the midpoint. On wide sides (buses, long bars) each connector attaches near its far end
     so that it can drop straight in. The reference point of the far end is the nearest waypoint when there is one. */
  const fanCache = { key: "", map: new Map(), tick: 0 };
  function fanRef(ed, n, isFrom) {
    const pts = ed.points || [];
    if (pts.length) return isFrom ? pts[0] : pts[pts.length - 1];
    const other = nodeById(isFrom ? ed.to.node : ed.from.node);
    if (!other) return null;
    const ob = bbox(other); return { x: ob.cx, y: ob.cy };
  }
  function fanList(n, port) {
    const key = S.page.id + ":" + S.page.edges.length + ":" + S.page.nodes.length + ":" + fanCache.tick;
    if (fanCache.key !== key) { fanCache.key = key; fanCache.map.clear(); }
    const ck = n.id + ":" + port;
    let list = fanCache.map.get(ck);
    if (list) return list;
    list = [];
    S.page.edges.forEach(ed => {
      const isFrom = ed.from.node === n.id, isTo = ed.to.node === n.id;
      if (!isFrom && !isTo) return;
      if (isFrom && isTo) return; // self-loop: leave at the centre
      const other = nodeById(isFrom ? ed.to.node : ed.from.node); if (!other) return;
      let pt = isFrom ? ed.from.port : ed.to.port;
      if (pt === "auto") { const bp = bestPorts(isFrom ? n : other, isFrom ? other : n); pt = isFrom ? bp[0] : bp[1]; }
      if (pt !== port) return;
      const ref = fanRef(ed, n, isFrom); if (!ref) return;
      list.push({ id: ed.id, k: (port === "n" || port === "s") ? ref.x : ref.y });
    });
    list.sort((x, y) => x.k - y.k || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
    fanCache.map.set(ck, list);
    return list;
  }
  function fanPoint(node, port, e, isFrom) {
    const base = portPoint(node, port);
    if (!e || !e.id) return base;
    const s = SH.get(node.type); if (s && s.kind === "container") return base; // containers keep centre ports
    if (port === "c" || node.type === "anchor") return base;
    const list = fanList(node, port);
    const i = list.findIndex(x => x.id === e.id); if (i < 0) return base;
    const n = list.length;
    const b = bbox(node), horiz = port === "n" || port === "s";
    const span = horiz ? b.w : b.h, start = horiz ? b.x : b.y;
    let pos;
    if (span >= 300) {
      // wide side: glue near the far end, spreading connectors whose far ends (almost) coincide
      const me = list[i]; const grp = list.filter(x => Math.abs(x.k - me.k) < 24); const gi = grp.findIndex(x => x.id === e.id);
      pos = me.k + (gi - (grp.length - 1) / 2) * 26;
      pos = Math.max(start + 16, Math.min(start + span - 16, pos));
    } else {
      if (n < 2) return base;
      const usable = Math.min(span * 0.7, (n - 1) * 26); // never wider than 70 % of the side, max 26 px spacing
      pos = (horiz ? b.cx : b.cy) - usable / 2 + (usable / (n - 1)) * i;
    }
    return horiz ? { x: pos, y: base.y } : { x: base.x, y: pos };
  }

  /* ------------------------------------------------------------------ routing */
  const DIR = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0], c: [0, 0] };
  function routeEdge(e) {
    const r = resolveEnds(e); if (!r) return null;
    const st = e.style || {}, router = st.router || "orthogonal";
    let pts;
    if (router === "straight") pts = [r.p1, ...(e.points || []), r.p2];
    else if (router === "curved") pts = [r.p1, ...(e.points || []), r.p2];
    else pts = orthogonal(r, e.points || []);
    return { pts, r, router };
  }
  function orthogonal(r, way) {
    const OFF = 24;
    const d1 = DIR[r.pa], d2 = DIR[r.pb];
    const s = { x: r.p1.x + d1[0] * OFF, y: r.p1.y + d1[1] * OFF };
    const t = { x: r.p2.x + d2[0] * OFF, y: r.p2.y + d2[1] * OFF };
    const pts = [r.p1, s];
    if (way.length) {
      // user waypoints: connect with L-bends
      let cur = s;
      way.forEach(w => { pts.push({ x: w.x, y: cur.y }); pts.push(w); cur = w; });
      pts.push({ x: t.x, y: cur.y }); pts.push(t);
    } else {
      const hA = d1[1] === 0, hB = d2[1] === 0;
      if (hA && hB) { const mx = (s.x + t.x) / 2; pts.push({ x: mx, y: s.y }, { x: mx, y: t.y }); }
      else if (!hA && !hB) { const my = (s.y + t.y) / 2; pts.push({ x: s.x, y: my }, { x: t.x, y: my }); }
      else if (hA && !hB) pts.push({ x: t.x, y: s.y });
      else pts.push({ x: s.x, y: t.y });
      pts.push(t);
    }
    pts.push(r.p2);
    // remove duplicate consecutive points, then drop collinear middle points (keeps corners only)
    const dd = pts.filter((p, i) => i === 0 || Math.abs(p.x - pts[i - 1].x) > 0.01 || Math.abs(p.y - pts[i - 1].y) > 0.01);
    return dd.filter((p, i) => { if (i === 0 || i === dd.length - 1) return true; const a = dd[i - 1], b = dd[i + 1]; const sameX = Math.abs(a.x - p.x) < 0.01 && Math.abs(b.x - p.x) < 0.01, sameY = Math.abs(a.y - p.y) < 0.01 && Math.abs(b.y - p.y) < 0.01; return !(sameX || sameY); });
  }
  function pathD(pts, router, radius) {
    if (pts.length < 2) return "";
    if (router === "curved") {
      if (pts.length === 2) { const [a, b] = pts; const dx = (b.x - a.x) * 0.5; return `M${a.x},${a.y} C${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`; }
      let d = `M${pts[0].x},${pts[0].y}`;
      for (let i = 1; i < pts.length - 1; i++) { const p = pts[i], q = pts[i + 1]; const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2; d += ` Q${p.x},${p.y} ${mx},${my}`; }
      const l = pts[pts.length - 1]; d += ` T${l.x},${l.y}`; return d;
    }
    radius = radius == null ? 8 : radius;
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
      const l1 = Math.hypot(p1.x - p0.x, p1.y - p0.y), l2 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const rr = Math.min(radius, l1 / 2, l2 / 2);
      if (rr < 1 || router === "straight") { d += ` L${p1.x},${p1.y}`; continue; }
      const a = { x: p1.x - (p1.x - p0.x) / l1 * rr, y: p1.y - (p1.y - p0.y) / l1 * rr };
      const b = { x: p1.x + (p2.x - p1.x) / l2 * rr, y: p1.y + (p2.y - p1.y) / l2 * rr };
      d += ` L${a.x},${a.y} Q${p1.x},${p1.y} ${b.x},${b.y}`;
    }
    const l = pts[pts.length - 1]; d += ` L${l.x},${l.y}`;
    return d;
  }
  function polyMid(pts, t) { // point at fraction t along polyline
    let total = 0; const segs = [];
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); segs.push(l); total += l; }
    let target = total * (t == null ? 0.5 : t);
    for (let i = 0; i < segs.length; i++) {
      if (target <= segs[i] || i === segs.length - 1) { const f = segs[i] ? target / segs[i] : 0; const a = pts[i], b = pts[i + 1]; return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, horiz: Math.abs(b.x - a.x) >= Math.abs(b.y - a.y) }; }
      target -= segs[i];
    }
    return { x: pts[0].x, y: pts[0].y, horiz: true };
  }

  /* ------------------------------------------------------------------ text helpers */
  function wrapText(text, maxWidth, fontSize, bold, mono) {
    const canvas = wrapText.c || (wrapText.c = document.createElement("canvas").getContext("2d"));
    canvas.font = `${bold ? 700 : 500} ${fontSize}px ${mono ? U.FONT.replace(/^.*?,/, "ui-monospace,Consolas,") : U.FONT}`;
    const out = [];
    String(text == null ? "" : text).split(/\r?\n/).forEach(par => {
      const words = par.split(/(\s+)/).filter(w => w.length);
      let line = "";
      words.forEach(w => {
        const test = line + w;
        if (canvas.measureText(test).width > maxWidth && line.trim()) { out.push(line.trimEnd()); line = w.trimStart(); }
        else line = test;
      });
      out.push(line.trimEnd());
    });
    return out;
  }
  function svgText(lines, x, y, fs, color, opts) {
    opts = opts || {};
    const lh = fs * 1.25, anchor = opts.anchor || "middle";
    const total = lines.length * lh, startY = opts.valign === "top" ? y + fs : y - total / 2 + fs * 0.85;
    const fam = opts.mono ? "ui-monospace,Consolas,'Courier New',monospace" : U.FONT;
    return `<text x="${x}" y="${startY}" text-anchor="${anchor}" font-family="${fam}" font-size="${fs}" font-weight="${opts.bold ? 700 : 500}" fill="${color}" ${opts.extra || ""}>${lines.map((l, i) => `<tspan x="${x}" dy="${i ? lh : 0}">${U.esc(l) || " "}</tspan>`).join("")}</text>`;
  }

  /* ------------------------------------------------------------------ node rendering (markup string, used by canvas + export) */
  function renderNode(n, forExport) {
    const s = SH.get(n.type) || SH.get("rect");
    const st = nodeStyle(n);
    const hide = S.doc.settings.hideDetail && S.page.level === "HLD";
    let body = "", label = "";
    const lines = n.label ? wrapText(n.label, Math.max(40, (s.kind === "icon" ? Math.max(n.w * 1.9, 120) : n.w - 12)), st.fontSize, st.bold, st.mono) : [];
    const subLines = n.sub && !hide ? wrapText(n.sub, Math.max(40, (s.kind === "icon" ? Math.max(n.w * 1.9, 120) : n.w - 12)), Math.max(8, st.fontSize - 2), false, true) : [];
    if (s.kind === "icon") {
      body = SH.renderIcon(s, n.w, n.h, st);
      const cx = n.w / 2;
      if (st.labelPos === "below" || st.labelPos == null) {
        label = svgText(lines, cx, n.h + 4, st.fontSize, st.textColor, { valign: "top", bold: st.bold, mono: st.mono });
        if (subLines.length) label += svgText(subLines, cx, n.h + 4 + lines.length * st.fontSize * 1.25 + 2, Math.max(8, st.fontSize - 2), "#5f6c84", { valign: "top", mono: true });
      } else if (st.labelPos === "right") {
        label = svgText(lines, n.w + 8, n.h / 2 - (subLines.length ? 6 : 0), st.fontSize, st.textColor, { anchor: "start", bold: st.bold, mono: st.mono }).replace(/x="[^"]*"/g, `x="${n.w + 8}"`);
        if (subLines.length) label += svgText(subLines, n.w + 8, n.h / 2 + lines.length * st.fontSize * 0.7 + 6, Math.max(8, st.fontSize - 2), "#5f6c84", { anchor: "start", mono: true }).replace(/x="[^"]*"/g, `x="${n.w + 8}"`);
      } else if (st.labelPos === "above") {
        label = svgText(lines, cx, -6 - (lines.length - 1) * st.fontSize * 0.62, st.fontSize, st.textColor, { bold: st.bold, mono: st.mono });
      }
    } else if (s.kind === "container") {
      const hh = 26;
      body = `<rect x="0" y="0" width="${n.w}" height="${n.h}" rx="8" fill="${st.fill}" stroke="${st.stroke}" stroke-width="${st.strokeWidth}"${st.dash ? ` stroke-dasharray="${st.dash}"` : ""} opacity="${st.opacity}"/>`;
      if (s.rackU) {
        // rack: draw U ruler
        const U_H = (n.h - hh - 6) / 42;
        for (let i = 0; i < 42; i++) { const y = hh + i * U_H; body += `<line x1="0" y1="${y}" x2="22" y2="${y}" stroke="#c4c9d3" stroke-width="1"/><text x="11" y="${y + U_H / 2 + 3}" text-anchor="middle" font-family="${U.FONT}" font-size="8" fill="#5f6c84">${42 - i}</text>`; if (i % 2) body += `<rect x="22" y="${y}" width="${n.w - 22}" height="${U_H}" fill="#000" opacity=".025"/>`; }
        body += `<line x1="22" y1="${hh}" x2="22" y2="${n.h - 6}" stroke="#c4c9d3"/>`;
      }
      const tl = wrapText(n.label, n.w - 20, st.fontSize, true)[0] || "";
      body += `<path d="M8,0 H${n.w - 8} A8,8 0 0 1 ${n.w},8 V${hh} H0 V8 A8,8 0 0 1 8,0 Z" fill="${st.stroke}" opacity=".9"/>`;
      label = `<text x="10" y="${hh / 2 + 1}" dominant-baseline="middle" font-family="${U.FONT}" font-size="${st.fontSize}" font-weight="700" fill="#fff">${U.esc(tl)}</text>`;
      if (n.sub && !hide) label += `<text x="${n.w - 10}" y="${hh / 2 + 1}" text-anchor="end" dominant-baseline="middle" font-family="ui-monospace,Consolas,monospace" font-size="${Math.max(8, st.fontSize - 3)}" fill="#fff" opacity=".9">${U.esc(n.sub)}</text>`;
    } else if (s.kind === "text") {
      const fs = st.fontSize;
      const l2 = wrapText(n.label, n.w - 4, fs, st.bold);
      const x = st.align === "left" ? 2 : st.align === "right" ? n.w - 2 : n.w / 2;
      body = `<rect x="0" y="0" width="${n.w}" height="${n.h}" fill="${st.fill === "none" ? "transparent" : st.fill}" stroke="${st.stroke === "none" ? "transparent" : st.stroke}" stroke-width="${st.strokeWidth}"/>`;
      label = svgText(l2, x, 2, fs, st.textColor, { valign: "top", anchor: st.align === "left" ? "start" : st.align === "right" ? "end" : "middle", bold: st.bold });
    } else if (s.kind === "special") {
      body = renderSpecial(n, s, st);
    } else { // box
      const geo = st.geoOverride || s.geo || "rect";
      body = SH.renderGeo(Object.assign({}, s, { geo }), n.w, n.h, Object.assign({}, st, { dash: st.dash }));
      if (st.opacity !== 1) body = `<g opacity="${st.opacity}">${body}</g>`;
      const pad = geo === "diamond" || geo === "ellipse" ? n.w * 0.22 : geo === "hexagon" || geo === "parallelogram" || geo === "chevron" || geo === "octagon" ? n.w * 0.2 : geo === "star5" || geo === "heart" || geo === "shield" ? n.w * 0.25 : 10;
      const outside = s.noLabel || s.labelBelow || n.w < 34 || n.h < 18; // tiny/narrow shapes and pure lines/markers: label sits below the shape instead of inside
      const l2 = wrapText(n.label, outside ? Math.max(n.w * 1.9, 140) : Math.max(30, n.w - pad * 2), st.fontSize, st.bold, st.mono);
      const s2 = n.sub && !hide ? wrapText(n.sub, outside ? Math.max(n.w * 1.9, 140) : Math.max(30, n.w - pad * 2), Math.max(8, st.fontSize - 2), false, true) : [];
      const dy = (s.labelDy || 0) * n.h;
      const cy = geo === "lifeline" ? Math.min(44, n.h * 0.2) / 2 : n.h / 2 + dy - (s2.length ? (s2.length * (st.fontSize - 2) * 1.25) / 2 : 0);
      const x = st.align === "left" ? pad : st.align === "right" ? n.w - pad : n.w / 2;
      const anchor = st.align === "left" ? "start" : st.align === "right" ? "end" : "middle";
      if (outside) {
        label = svgText(l2, n.w / 2, n.h + 4, st.fontSize, st.textColor === "#fff" ? "#101b3b" : st.textColor, { valign: "top", bold: st.bold, mono: st.mono });
        if (s2.length) label += svgText(s2, n.w / 2, n.h + 4 + l2.length * st.fontSize * 1.25 + 2, Math.max(8, st.fontSize - 2), "#5f6c84", { valign: "top", mono: true });
      }
      else if (geo === "note" && st.align === "left") label = svgText(l2, 10, 8, st.fontSize, st.textColor, { valign: "top", anchor: "start", bold: st.bold, mono: st.mono });
      else label = svgText(l2, x, cy, st.fontSize, st.textColor, { bold: st.bold, anchor, mono: st.mono });
      if (s2.length && !outside) label += svgText(s2, x, cy + (l2.length * st.fontSize * 1.25) / 2 + (s2.length * (st.fontSize - 2) * 1.25) / 2 + 2, Math.max(8, st.fontSize - 2), st.textColor === "#fff" ? "#e6eef9" : "#5f6c84", { anchor, mono: true });
    }
    // attribute badge (LLD detail): small key/value list under the label when present
    let attrs = "";
    if (n.attrs && n.attrs.length && !hide && s.kind !== "special") {
      const fs = Math.max(8, st.fontSize - 3), lh = fs * 1.3;
      const rows = n.attrs.filter(a => a.k || a.v).slice(0, 8);
      if (rows.length) {
        const w = Math.max(n.w, 120), y0 = s.kind === "icon" ? n.h + 6 + (lines.length * st.fontSize * 1.25) + (subLines.length ? subLines.length * (st.fontSize - 2) * 1.25 + 2 : 0) + 2 : n.h + 4;
        const h = rows.length * lh + 6;
        attrs = `<g class="attrs"><rect x="${n.w / 2 - w / 2}" y="${y0}" width="${w}" height="${h}" rx="4" fill="#fff" stroke="#dce5f1" stroke-width="1"/>${rows.map((a, i) => `<text x="${n.w / 2 - w / 2 + 6}" y="${y0 + 4 + fs + i * lh}" font-family="ui-monospace,Consolas,monospace" font-size="${fs}" fill="#101b3b"><tspan font-weight="700" fill="#5f6c84">${U.esc(a.k)}${a.k ? ":" : ""}</tspan> ${U.esc(a.v)}</text>`).join("")}</g>`;
      }
    }
    return { body, label: label + attrs };
  }

  function renderSpecial(n, s, st) {
    const fs = st.fontSize || 11;
    if (n.type === "table" || n.type === "revtable") {
      const rows = String((n.props && n.props.rows) || "").split(/\r?\n/).filter(r => r.trim()).map(r => r.split("|").map(c => c.trim()));
      const cols = Math.max(1, ...rows.map(r => r.length));
      const cfs = Math.max(7, fs - 2);
      // column widths proportional to the longest cell in each column (min 6 chars), then scaled to fit n.w
      const need = Array.from({ length: cols }, (_, ci) => Math.max(6, ...rows.map(r => (r[ci] || "").length)) + 2);
      const tot = need.reduce((a, b) => a + b, 0); const cws = need.map(v => v / tot * n.w);
      const xs = [0]; cws.forEach((w, i) => xs.push(xs[i] + w));
      const hh = 22, rh = Math.max(14, (n.h - hh) / Math.max(1, rows.length));
      const fit = (str, w) => { const maxc = Math.max(1, Math.floor((w - 8) / (cfs * 0.62))); return str.length > maxc ? str.slice(0, Math.max(1, maxc - 1)) + "\u2026" : str; };
      let g = `<rect x="0" y="0" width="${n.w}" height="${n.h}" fill="#fff" stroke="${st.stroke === "#101b3b" ? "#101b3b" : st.stroke}" stroke-width="1.5"/>`;
      g += `<rect x="0" y="0" width="${n.w}" height="${hh}" fill="#101b3b"/><text x="8" y="${hh / 2 + 1}" dominant-baseline="middle" font-family="${U.FONT}" font-size="${fs}" font-weight="700" fill="#fff">${U.esc(fit(n.label, n.w))}</text>`;
      rows.forEach((r, ri) => {
        const y = hh + ri * rh;
        if (ri === 0) g += `<rect x="0" y="${y}" width="${n.w}" height="${rh}" fill="#e3f0fc"/>`;
        else if (ri % 2 === 0) g += `<rect x="0" y="${y}" width="${n.w}" height="${rh}" fill="#f7fafd"/>`;
        g += `<line x1="0" y1="${y}" x2="${n.w}" y2="${y}" stroke="#dce5f1"/>`;
        r.forEach((c, ci) => { if (ci >= cols) return; g += `<text x="${xs[ci] + 5}" y="${y + rh / 2 + 1}" dominant-baseline="middle" font-family="${ri === 0 ? U.FONT : "ui-monospace,Consolas,monospace"}" font-size="${cfs}" font-weight="${ri === 0 ? 700 : 500}" fill="#101b3b">${U.esc(fit(c, cws[ci]))}</text>`; });
      });
      for (let ci = 1; ci < cols; ci++) g += `<line x1="${xs[ci]}" y1="${hh}" x2="${xs[ci]}" y2="${n.h}" stroke="#dce5f1"/>`;
      return `<g>${g}</g>`;
    }
    if (n.type === "umlclass" || n.type === "umlinterface" || n.type === "umlentity") {
      const rows = String((n.props && n.props.rows) || "").split(/\r?\n/);
      const nameLines = String(n.label || "").split(/\r?\n/).filter(Boolean).slice(0, 2);
      const hh = 12 + nameLines.length * (fs + 3), lh = fs + 5;
      const stroke = st.stroke, fill = st.fill === "#ffffff" || st.fill === "#fff" ? "#fff" : st.fill;
      let g = `<rect x="0" y="0" width="${n.w}" height="${n.h}" fill="${fill}" stroke="${stroke}" stroke-width="${st.strokeWidth}"/>`;
      g += `<rect x="0" y="0" width="${n.w}" height="${hh}" fill="${n.type === "umlentity" ? "#e3f0fc" : "#f4f7fb"}" stroke="${stroke}" stroke-width="${st.strokeWidth}"/>`;
      nameLines.forEach((l, i) => { g += `<text x="${n.w / 2}" y="${8 + (i + 0.5) * (fs + 3) - 2}" text-anchor="middle" dominant-baseline="middle" font-family="${U.FONT}" font-size="${fs + (i === nameLines.length - 1 ? 1 : -1)}" font-weight="${i === nameLines.length - 1 ? 700 : 500}" font-style="${n.type === "umlinterface" && i === nameLines.length - 1 ? "italic" : "normal"}" fill="${st.textColor === "#fff" ? "#101b3b" : st.textColor}">${U.esc(l)}</text>`; });
      let y = hh + 4;
      const maxc = Math.max(4, Math.floor((n.w - 12) / (fs * 0.6)));
      rows.forEach(r => {
        if (y > n.h - 4) return;
        if (/^-{2,}$/.test(r.trim())) { g += `<line x1="0" y1="${y + 2}" x2="${n.w}" y2="${y + 2}" stroke="${stroke}" stroke-width="${st.strokeWidth}"/>`; y += 8; return; }
        const t = r.length > maxc ? r.slice(0, maxc - 1) + "\u2026" : r;
        const key = /^(PK|FK|UK)\b/.test(t.trim());
        g += `<text x="8" y="${y + lh / 2}" dominant-baseline="middle" font-family="ui-monospace,Consolas,monospace" font-size="${Math.max(7, fs - 1)}" font-weight="${key ? 700 : 500}" text-decoration="${/^PK\b/.test(t.trim()) ? "underline" : "none"}" fill="#101b3b">${U.esc(t)}</text>`;
        y += lh;
      });
      return `<g>${g}</g>`;
    }
    if (n.type === "legend") {
      let items = [];
      if (n.props && n.props.auto === false && n.props.rows) items = String(n.props.rows).split(/\r?\n/).filter(Boolean).map(r => { const [name, c] = r.split("|").map(x => x.trim()); return { name, color: c || "#1f6fb5", kind: "swatch" }; });
      else {
        const seen = new Map();
        S.page.nodes.forEach(m => { const ms = SH.get(m.type); if (!ms || ms.kind === "special" || ms.kind === "text" || ms.kind === "container" || ms.cat === "hidden" || ms.cat === "lines" || ms.noLabel) return; if (!seen.has(m.type)) seen.set(m.type, { name: ms.name, shape: ms, style: nodeStyle(m), kind: "icon" }); });
        const presets = new Map();
        S.page.edges.forEach(e => { const p = e.preset || "link"; if (!presets.has(p)) presets.set(p, { name: PRESETS[p] ? PRESETS[p].name : p, preset: Object.assign({}, PRESETS[p] || PRESETS.link, e.style || {}), kind: "line" }); });
        items = [...seen.values(), ...presets.values()];
      }
      const hh = 22, lh = 20, colW = 150, cols = Math.max(1, Math.floor(n.w / colW)), rowsN = Math.ceil(items.length / cols);
      const need = hh + rowsN * lh + 8;
      let g = `<rect x="0" y="0" width="${n.w}" height="${n.h}" fill="#fff" stroke="#101b3b" stroke-width="1.5"/><rect x="0" y="0" width="${n.w}" height="${hh}" fill="#101b3b"/><text x="8" y="${hh / 2 + 1}" dominant-baseline="middle" font-family="${U.FONT}" font-size="${fs}" font-weight="700" fill="#fff">${U.esc(n.label || "Legend")}</text>`;
      items.forEach((it, i) => {
        const col = i % cols, row = Math.floor(i / cols), x = 8 + col * colW, y = hh + 6 + row * lh;
        if (y + lh > n.h) return;
        if (it.kind === "icon") g += it.shape.kind === "icon" ? `<g transform="translate(${x},${y})">${SH.renderIcon(it.shape, 20, 16, it.style)}</g>` : `<g transform="translate(${x},${y})">${SH.renderGeo(it.shape, 20, 14, Object.assign({}, it.style, { strokeWidth: 1.2 }))}</g>`;
        else if (it.kind === "swatch") g += `<rect x="${x + 2}" y="${y + 2}" width="16" height="12" rx="2" fill="${it.color}"/>`;
        else g += `<line x1="${x}" y1="${y + 8}" x2="${x + 20}" y2="${y + 8}" stroke="${it.preset.stroke}" stroke-width="${it.preset.width}"${it.preset.dash ? ` stroke-dasharray="${it.preset.dash}"` : ""}/>`;
        g += `<text x="${x + 26}" y="${y + 9}" dominant-baseline="middle" font-family="${U.FONT}" font-size="${Math.max(7, fs - 2)}" fill="#101b3b">${U.esc(it.name.length > 22 ? it.name.slice(0, 21) + "…" : it.name)}</text>`;
      });
      if (need > n.h && !S.exporting) g += `<text x="${n.w - 6}" y="${n.h - 4}" text-anchor="end" font-family="${U.FONT}" font-size="8" fill="#c93c3c">+${items.length - Math.floor((n.h - hh - 8) / lh) * cols} more (enlarge)</text>`;
      return g;
    }
    if (n.type === "titleblock") {
      const m = S.doc.meta, pg = S.page;
      const c1 = n.w * 0.46, c2 = n.w * 0.27, rh = n.h / 3;
      const cell = (x, y, w, k, v, big) => `<rect x="${x}" y="${y}" width="${w}" height="${rh}" fill="#fff" stroke="#101b3b" stroke-width="1"/><text x="${x + 5}" y="${y + 9}" font-family="${U.FONT}" font-size="7" font-weight="700" fill="#5f6c84" letter-spacing=".5">${U.esc(k.toUpperCase())}</text><text x="${x + 5}" y="${y + rh - 6}" font-family="${U.FONT}" font-size="${big ? 12 : 9.5}" font-weight="${big ? 800 : 600}" fill="#101b3b">${U.esc(String(v || "").slice(0, big ? 44 : 30))}</text>`;
      let g = `<rect x="0" y="0" width="${n.w}" height="${n.h}" fill="#fff" stroke="#101b3b" stroke-width="2"/>`;
      g += cell(0, 0, c1, "Project / diagram title", m.title, true) + cell(c1, 0, c2, "Level", (pg.level || m.level) + (pg.name ? " - " + pg.name : "")) + cell(c1 + c2, 0, n.w - c1 - c2, "Version", m.version);
      g += cell(0, rh, c1, "Organisation / owner", m.org || "RCW IT Training") + cell(c1, rh, c2, "Author", m.author) + cell(c1 + c2, rh, n.w - c1 - c2, "Date", m.date);
      g += cell(0, rh * 2, c1, "Notation standard", m.standard || "RCW notation v1") + cell(c1, rh * 2, c2, "Status", m.status) + cell(c1 + c2, rh * 2, n.w - c1 - c2, "Classification", m.classification);
      const cls = (m.classification || "").toLowerCase();
      if (cls.includes("confidential") || cls.includes("restricted") || cls.includes("secret")) g += `<rect x="${c1 + c2}" y="${rh * 2}" width="${n.w - c1 - c2}" height="${rh}" fill="#c93c3c" opacity=".12"/>`;
      return g;
    }
    if (n.type === "image") {
      if (n.props && n.props.src) return `<image href="${n.props.src}" x="0" y="0" width="${n.w}" height="${n.h}" preserveAspectRatio="xMidYMid meet"/>`;
      return `<rect x="0" y="0" width="${n.w}" height="${n.h}" rx="6" fill="#f4f7fb" stroke="#8fa3bf" stroke-dasharray="6 4" stroke-width="1.5"/><text x="${n.w / 2}" y="${n.h / 2}" text-anchor="middle" dominant-baseline="middle" font-family="${U.FONT}" font-size="11" fill="#5f6c84">Double-click to choose image</text>`;
    }
    return `<rect x="0" y="0" width="${n.w}" height="${n.h}" fill="#fff" stroke="#101b3b"/>`;
  }

  /* ------------------------------------------------------------------ edge rendering */
  function edgeStyle(e) {
    const p = PRESETS[e.preset || "link"] || PRESETS.link;
    return Object.assign({ stroke: p.stroke, width: p.width, dash: p.dash, startArrow: p.startArrow || "none", endArrow: p.endArrow || "none", router: p.router || "orthogonal", fontSize: 10, labelBg: true, jumps: true }, e.style || {});
  }
  /* Line jumps: where this orthogonal edge crosses an earlier orthogonal edge, hop over it with a small arc. */
  function segCross(a, b, c, d2) { // axis-aligned segments only; returns intersection point or null
    const ah = Math.abs(a.y - b.y) < 0.01, ch = Math.abs(c.y - d2.y) < 0.01;
    if (ah === ch) return null;
    const h1 = ah ? [a, b] : [c, d2], v1 = ah ? [c, d2] : [a, b];
    const x = v1[0].x, y = h1[0].y;
    const xmin = Math.min(h1[0].x, h1[1].x), xmax = Math.max(h1[0].x, h1[1].x), ymin = Math.min(v1[0].y, v1[1].y), ymax = Math.max(v1[0].y, v1[1].y);
    if (x > xmin + 2 && x < xmax - 2 && y > ymin + 2 && y < ymax - 2) return { x, y, onHoriz: ah };
    return null;
  }
  function pathWithJumps(pts, others, radius, corner) {
    corner = corner == null ? 8 : corner;
    const n = pts.length;
    const rr = pts.map((p, i) => { if (i === 0 || i === n - 1) return 0; const p0 = pts[i - 1], p2 = pts[i + 1]; const l1 = Math.hypot(p.x - p0.x, p.y - p0.y), l2 = Math.hypot(p2.x - p.x, p2.y - p.y); const r = Math.min(corner, l1 / 2, l2 / 2); return r < 1 ? 0 : r; });
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < n - 1; i++) {
      const a = pts[i], b = pts[i + 1]; const L = Math.hypot(b.x - a.x, b.y - a.y); if (L < 0.01) continue;
      const ux = (b.x - a.x) / L, uy = (b.y - a.y) / L;
      const segStart = { x: a.x + ux * rr[i], y: a.y + uy * rr[i] }, segEnd = { x: b.x - ux * rr[i + 1], y: b.y - uy * rr[i + 1] };
      const horiz = Math.abs(uy) < 0.01, vert = Math.abs(ux) < 0.01;
      const hops = [];
      if (horiz || vert) others.forEach(op => { for (let k = 0; k < op.length - 1; k++) { const c = segCross(a, b, op[k], op[k + 1]); if (c && (horiz ? c.onHoriz : !c.onHoriz)) hops.push(c); } });
      if (i > 0 && rr[i] > 0) d += ` Q${a.x},${a.y} ${segStart.x},${segStart.y}`;
      if (hops.length) {
        const key = horiz ? "x" : "y", dir = (b[key] - a[key]) >= 0 ? 1 : -1, sweep = dir > 0 ? 1 : 0;
        hops.sort((p, q) => (p[key] - q[key]) * dir);
        let cur = segStart;
        hops.forEach(hp => {
          const before = { x: hp.x, y: hp.y }, after = { x: hp.x, y: hp.y };
          before[key] -= radius * dir; after[key] += radius * dir;
          if ((before[key] - cur[key]) * dir <= 0 || (segEnd[key] - after[key]) * dir <= 0) return;
          d += ` L${before.x},${before.y} A${radius},${radius} 0 0 ${sweep} ${after.x},${after.y}`;
          cur = after;
        });
      }
      d += ` L${segEnd.x},${segEnd.y}`;
    }
    return d;
  }
  function ptsBox(pts) { let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity; pts.forEach(p => { if (p.x < x1) x1 = p.x; if (p.x > x2) x2 = p.x; if (p.y < y1) y1 = p.y; if (p.y > y2) y2 = p.y; }); return { x1, y1, x2, y2 }; }
  let jumpCtx = null; // { seen: [{pts, bb}...] } set by sceneMarkup while rendering edges in order
  function renderEdge(e, selected) {
    const r = routeEdge(e); if (!r) return "";
    const st = edgeStyle(e);
    let d = pathD(r.pts, r.router);
    if (jumpCtx) {
      const bb = ptsBox(r.pts);
      if (st.jumps !== false && r.router === "orthogonal") { // line jumps: hop over earlier orthogonal connectors that this one crosses
        const near = jumpCtx.seen.filter(o => o.bb.x1 <= bb.x2 && o.bb.x2 >= bb.x1 && o.bb.y1 <= bb.y2 && o.bb.y2 >= bb.y1).map(o => o.pts);
        const hasCross = near.some(op => { for (let i = 0; i < r.pts.length - 1; i++) for (let k = 0; k < op.length - 1; k++) if (segCross(r.pts[i], r.pts[i + 1], op[k], op[k + 1])) return true; return false; });
        if (hasCross) d = pathWithJumps(r.pts, near, Math.max(5, st.width * 2.2));
      }
      if (r.router === "orthogonal") jumpCtx.seen.push({ pts: r.pts, bb });
    }
    const mid = polyMid(r.pts, e.labelT == null ? 0.5 : e.labelT);
    const hide = S.doc.settings.hideDetail && S.page.level === "HLD";
    const markerId = (kind, color) => `m-${kind}-${color.replace("#", "")}`;
    let g = `<path d="${d}" fill="none" stroke="${st.stroke}" stroke-width="${st.width}"${st.dash ? ` stroke-dasharray="${st.dash}"` : ""} stroke-linejoin="round" stroke-linecap="round"` +
      (st.startArrow !== "none" ? ` marker-start="url(#${markerId(st.startArrow + "-s", st.stroke)})"` : "") + (st.endArrow !== "none" ? ` marker-end="url(#${markerId(st.endArrow, st.stroke)})"` : "") + `/>`;
    const lbl = (text, x, y, horiz, small) => {
      if (!text) return "";
      const lines = wrapText(text, 220, small ? st.fontSize - 1 : st.fontSize, false, small);
      const fs = small ? Math.max(7, st.fontSize - 1) : st.fontSize, lh = fs * 1.25;
      const w = Math.max(...lines.map(l => l.length)) * fs * 0.58 + 8, h = lines.length * lh + 4;
      return `<g class="elabel" transform="translate(${x},${y})">${st.labelBg ? `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="3" fill="#fff" fill-opacity=".92" stroke="${small ? "#dce5f1" : "none"}"/>` : ""}${svgText(lines, 0, 0, fs, small ? "#0d3d68" : "#101b3b", { mono: small })}</g>`;
    };
    g += lbl(e.label, mid.x, mid.y, mid.horiz, false);
    if (!hide) {
      if (e.srcLabel) { const p = polyMid(r.pts, 0.12); g += lbl(e.srcLabel, p.x + (mid.horiz ? 0 : 0), p.y, p.horiz, true); }
      if (e.dstLabel) { const p = polyMid(r.pts, 0.88); g += lbl(e.dstLabel, p.x, p.y, p.horiz, true); }
    }
    return { d, g, pts: r.pts, r, st };
  }

  /* ------------------------------------------------------------------ markers / defs */
  function markerDefs(edges) {
    const colors = new Set();
    edges.forEach(e => colors.add(edgeStyle(e).stroke));
    let d = "";
    colors.forEach(c => {
      const id = c.replace("#", "");
      d += `<marker id="m-arrow-${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M0,0 L10,5 L0,10 z" fill="${c}"/></marker>`;
      d += `<marker id="m-arrow-s-${id}" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto" markerUnits="strokeWidth"><path d="M10,0 L0,5 L10,10 z" fill="${c}"/></marker>`;
      d += `<marker id="m-open-${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M1,1 L9,5 L1,9" fill="none" stroke="${c}" stroke-width="1.5"/></marker>`;
      d += `<marker id="m-open-s-${id}" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="8" markerHeight="8" orient="auto" markerUnits="strokeWidth"><path d="M9,1 L1,5 L9,9" fill="none" stroke="${c}" stroke-width="1.5"/></marker>`;
      d += `<marker id="m-dot-${id}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto" markerUnits="strokeWidth"><circle cx="5" cy="5" r="4" fill="${c}"/></marker>`;
      d += `<marker id="m-dot-s-${id}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto" markerUnits="strokeWidth"><circle cx="5" cy="5" r="4" fill="${c}"/></marker>`;
      d += `<marker id="m-diamond-${id}" viewBox="0 0 12 10" refX="11" refY="5" markerWidth="9" markerHeight="8" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M0,5 L6,0 L12,5 L6,10 z" fill="#fff" stroke="${c}" stroke-width="1.5"/></marker>`;
      d += `<marker id="m-diamond-s-${id}" viewBox="0 0 12 10" refX="1" refY="5" markerWidth="9" markerHeight="8" orient="auto" markerUnits="strokeWidth"><path d="M0,5 L6,0 L12,5 L6,10 z" fill="#fff" stroke="${c}" stroke-width="1.5"/></marker>`;
      d += `<marker id="m-triangle-${id}" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="10" markerHeight="10" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M1,1 L11,6 L1,11 z" fill="#fff" stroke="${c}" stroke-width="1.2"/></marker>`;
      d += `<marker id="m-triangle-s-${id}" viewBox="0 0 12 12" refX="1" refY="6" markerWidth="10" markerHeight="10" orient="auto" markerUnits="strokeWidth"><path d="M11,1 L1,6 L11,11 z" fill="#fff" stroke="${c}" stroke-width="1.2"/></marker>`;
      d += `<marker id="m-diamondfilled-${id}" viewBox="0 0 12 10" refX="11" refY="5" markerWidth="9" markerHeight="8" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M0,5 L6,0 L12,5 L6,10 z" fill="${c}"/></marker>`;
      d += `<marker id="m-diamondfilled-s-${id}" viewBox="0 0 12 10" refX="1" refY="5" markerWidth="9" markerHeight="8" orient="auto" markerUnits="strokeWidth"><path d="M0,5 L6,0 L12,5 L6,10 z" fill="${c}"/></marker>`;
      d += `<marker id="m-bar-${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="8" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M8,0 V10" stroke="${c}" stroke-width="1.6"/></marker>`;
      d += `<marker id="m-bar-s-${id}" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="8" orient="auto" markerUnits="strokeWidth"><path d="M2,0 V10" stroke="${c}" stroke-width="1.6"/></marker>`;
      d += `<marker id="m-one-${id}" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="9" markerHeight="9" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M4,1 V11 M8,1 V11" stroke="${c}" stroke-width="1.4" fill="none"/></marker>`;
      d += `<marker id="m-one-s-${id}" viewBox="0 0 12 12" refX="1" refY="6" markerWidth="9" markerHeight="9" orient="auto" markerUnits="strokeWidth"><path d="M4,1 V11 M8,1 V11" stroke="${c}" stroke-width="1.4" fill="none"/></marker>`;
      d += `<marker id="m-many-${id}" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="10" markerHeight="10" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M1,6 L11,1 M1,6 L11,11 M1,6 H11 M3,1 V11" stroke="${c}" stroke-width="1.3" fill="none"/></marker>`;
      d += `<marker id="m-many-s-${id}" viewBox="0 0 12 12" refX="1" refY="6" markerWidth="10" markerHeight="10" orient="auto" markerUnits="strokeWidth"><path d="M11,6 L1,1 M11,6 L1,11 M11,6 H1 M9,1 V11" stroke="${c}" stroke-width="1.3" fill="none"/></marker>`;
      d += `<marker id="m-cross-${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M4,1 L10,9 M10,1 L4,9" stroke="${c}" stroke-width="1.6" fill="none"/></marker>`;
      d += `<marker id="m-cross-s-${id}" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="8" markerHeight="8" orient="auto" markerUnits="strokeWidth"><path d="M0,1 L6,9 M6,1 L0,9" stroke="${c}" stroke-width="1.6" fill="none"/></marker>`;
      d += `<marker id="m-square-${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse" markerUnits="strokeWidth"><rect x="1" y="1" width="8" height="8" fill="${c}"/></marker>`;
      d += `<marker id="m-square-s-${id}" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="6" markerHeight="6" orient="auto" markerUnits="strokeWidth"><rect x="1" y="1" width="8" height="8" fill="${c}"/></marker>`;
      d += `<marker id="m-circleopen-${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse" markerUnits="strokeWidth"><circle cx="5" cy="5" r="3.5" fill="#fff" stroke="${c}" stroke-width="1.3"/></marker>`;
      d += `<marker id="m-circleopen-s-${id}" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto" markerUnits="strokeWidth"><circle cx="5" cy="5" r="3.5" fill="#fff" stroke="${c}" stroke-width="1.3"/></marker>`;
    });
    return d;
  }

  /* ------------------------------------------------------------------ z-ordering: containers first (by area), then others */
  function orderedNodes() {
    const nodes = S.page.nodes.slice();
    const depth = n => { let d = 0, p = n.parent; while (p && d < 50) { const pn = nodeById(p); if (!pn) break; d++; p = pn.parent; } return d; };
    return nodes.map((n, i) => ({ n, i, z: n.z || 0, c: isContainer(n) ? 0 : 1, d: depth(n) }))
      .sort((a, b) => (a.z - b.z) || (a.c - b.c) || (a.d - b.d) || (a.i - b.i)).map(o => o.n);
  }

  /* ------------------------------------------------------------------ full scene markup (shared by canvas & export) */
  /* transform for a node: translate + optional rotation / flips about the shape centre */
  function nodeTransform(n) {
    let t = `translate(${n.x},${n.y})`;
    const rot = n.rot || 0, fx = n.flipH ? -1 : 1, fy = n.flipV ? -1 : 1;
    if (rot || fx < 0 || fy < 0) t += ` translate(${n.w / 2},${n.h / 2})${rot ? ` rotate(${rot})` : ""}${fx < 0 || fy < 0 ? ` scale(${fx},${fy})` : ""} translate(${-n.w / 2},${-n.h / 2})`;
    return t;
  }
  function sceneMarkup(opts) {
    opts = opts || {};
    fanCache.tick++; // positions may have changed since the last render: recompute connector fan-out
    const nodes = orderedNodes();
    let out = "", anchors = "";
    nodes.forEach(n => {
      if (n.hidden) return;
      if (n.type === "anchor") { if (!opts.forExport) anchors += `<g class="shape anchor" data-id="${n.id}" transform="translate(${n.x},${n.y})"><circle cx="${n.w / 2}" cy="${n.h / 2}" r="${n.w / 2 + 3}" fill="transparent"/><circle cx="${n.w / 2}" cy="${n.h / 2}" r="${n.w / 2}" fill="#078be8" fill-opacity=".15" stroke="#078be8" stroke-opacity=".6" stroke-width="1"/></g>`; return; }
      const r = renderNode(n, opts.forExport);
      out += `<g class="shape${n.locked ? " locked" : ""}" data-id="${n.id}" transform="${nodeTransform(n)}" ${n.link ? `data-link="${U.esc(n.link)}"` : ""}>${r.body}${r.label}</g>`;
    });
    jumpCtx = S.doc.settings.lineJumps === false ? null : { seen: [] };
    S.page.edges.forEach(e => {
      const r = renderEdge(e); if (!r) return;
      out += `<g class="conn" data-id="${e.id}">${opts.forExport ? "" : `<path d="${r.d}" fill="none" stroke="transparent" stroke-width="14" class="hit"/>`}${r.g}</g>`;
    });
    jumpCtx = null;
    return out + anchors;
  }

  window.RCW_CORE = { S, SH, U, NS, $, $$, PAGE_SIZES, STORAGE_KEY, PRESETS, uid, clamp, pageSize, nodeById, edgeById, bbox, descendants, isContainer, nodeStyle, portPoint, resolveEnds, routeEdge, pathD, polyMid, wrapText, svgText, renderNode, renderEdge, edgeStyle, markerDefs, orderedNodes, sceneMarkup, nodeTransform
  };
})();
