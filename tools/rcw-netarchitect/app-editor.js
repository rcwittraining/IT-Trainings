/* RCW - NetArchitect : interactive editor (canvas events, selection, editing, undo, panels) */
(function () {
  "use strict";
  const C = window.RCW_CORE, S = C.S, SH = C.SH, U = C.U, $ = C.$, $$ = C.$$, uid = C.uid, clamp = C.clamp;
  const TPL = window.RCW_TEMPLATES;
  let svg, gWorld, gScene, gOverlay, gGrid, gPage, defs, wrap, toast;

  /* ------------------------------------------------------------------ document lifecycle */
  function newDoc(tplId) {
    const d = (TPL.get(tplId) || TPL.list[0]).build();
    loadDoc(d);
    S.undo = []; S.redo = []; S.dirty = false;
    fitToPage();
    persist();
  }
  function loadDoc(d) {
    S.doc = d; S.doc.settings = Object.assign({ grid: true, snap: true, gridSize: 20, guides: true, hideDetail: false, page: { size: "A3", orientation: "landscape" } }, d.settings || {});
    S.doc.pages.forEach(p => { p.nodes.forEach(n => { n.style = n.style || {}; n.props = n.props || {}; n.attrs = n.attrs || []; }); p.edges.forEach(e => { e.style = e.style || {}; e.points = e.points || []; e.attrs = e.attrs || []; }); });
    S.page = S.doc.pages[clamp(d.activePage || 0, 0, S.doc.pages.length - 1)];
    S.sel.clear(); S.selEdges.clear();
    $("#docTitle").value = S.doc.meta.title || "";
    renderAll(); renderPages(); syncToolbar();
  }
  function persist() {
    try { S.doc.activePage = S.doc.pages.indexOf(S.page); localStorage.setItem(C.STORAGE_KEY, JSON.stringify(S.doc)); S.lastSave = Date.now(); $("#saveState").textContent = "Saved locally " + new Date().toLocaleTimeString(); } catch (e) { $("#saveState").textContent = "Local save failed (storage full?)"; }
  }
  let persistT;
  function schedulePersist() { clearTimeout(persistT); persistT = setTimeout(persist, 600); }

  /* ------------------------------------------------------------------ undo / redo */
  function snapshot() { return JSON.stringify({ nodes: S.page.nodes, edges: S.page.edges }); }
  function commit(label) {
    S.undo.push({ page: S.page.id, data: S._pre || snapshot(), label }); if (S.undo.length > 100) S.undo.shift();
    S.redo = []; S._pre = null; S.dirty = true; renderAll(); schedulePersist(); syncToolbar();
  }
  function begin() { S._pre = snapshot(); }
  function undo() { const u = S.undo.pop(); if (!u) return; const p = S.doc.pages.find(x => x.id === u.page); if (!p) return; S.redo.push({ page: p.id, data: JSON.stringify({ nodes: p.nodes, edges: p.edges }) }); const d = JSON.parse(u.data); p.nodes = d.nodes; p.edges = d.edges; if (S.page !== p) { S.page = p; renderPages(); } S.sel.clear(); S.selEdges.clear(); renderAll(); schedulePersist(); syncToolbar(); }
  function redo() { const u = S.redo.pop(); if (!u) return; const p = S.doc.pages.find(x => x.id === u.page); if (!p) return; S.undo.push({ page: p.id, data: JSON.stringify({ nodes: p.nodes, edges: p.edges }) }); const d = JSON.parse(u.data); p.nodes = d.nodes; p.edges = d.edges; if (S.page !== p) { S.page = p; renderPages(); } S.sel.clear(); S.selEdges.clear(); renderAll(); schedulePersist(); syncToolbar(); }

  /* ------------------------------------------------------------------ coordinates */
  function clientToWorld(cx, cy) { const r = svg.getBoundingClientRect(); return { x: (cx - r.left - S.panX) / S.zoom, y: (cy - r.top - S.panY) / S.zoom }; }
  function snap(v) { const g = S.doc.settings.gridSize || 20; return S.doc.settings.snap ? Math.round(v / g) * g : Math.round(v); }
  function applyView() { gWorld.setAttribute("transform", `translate(${S.panX},${S.panY}) scale(${S.zoom})`); $("#zoomVal").textContent = Math.round(S.zoom * 100) + "%"; drawGrid(); }
  function setZoom(z, cx, cy) {
    z = clamp(z, 0.1, 4); const r = svg.getBoundingClientRect();
    cx = cx == null ? r.width / 2 : cx; cy = cy == null ? r.height / 2 : cy;
    const wx = (cx - S.panX) / S.zoom, wy = (cy - S.panY) / S.zoom;
    S.zoom = z; S.panX = cx - wx * z; S.panY = cy - wy * z; applyView(); renderOverlay();
  }
  function fitToPage() { const r = svg.getBoundingClientRect(); const p = C.pageSize(); const z = clamp(Math.min((r.width - 60) / p.w, (r.height - 60) / p.h), 0.1, 2); S.zoom = z; S.panX = (r.width - p.w * z) / 2; S.panY = (r.height - p.h * z) / 2; applyView(); renderOverlay(); }
  function fitToContent() {
    const b = contentBounds(); if (!b) return fitToPage(); const r = svg.getBoundingClientRect();
    const z = clamp(Math.min((r.width - 80) / b.w, (r.height - 80) / b.h), 0.1, 3); S.zoom = z; S.panX = (r.width - b.w * z) / 2 - b.x * z; S.panY = (r.height - b.h * z) / 2 - b.y * z; applyView(); renderOverlay();
  }
  function contentBounds(nodes) {
    nodes = nodes || S.page.nodes; if (!nodes.length) return null;
    let x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9;
    nodes.forEach(n => { const s = SH.get(n.type); const extra = s && s.kind === "icon" ? 40 : 0; x1 = Math.min(x1, n.x - (extra ? 30 : 0)); y1 = Math.min(y1, n.y); x2 = Math.max(x2, n.x + n.w + (extra ? 30 : 0)); y2 = Math.max(y2, n.y + n.h + extra); });
    S.page.edges.forEach(e => { const r = C.routeEdge(e); if (r) r.pts.forEach(p => { x1 = Math.min(x1, p.x); y1 = Math.min(y1, p.y); x2 = Math.max(x2, p.x); y2 = Math.max(y2, p.y); }); });
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  }

  /* ------------------------------------------------------------------ rendering */
  function drawGrid() {
    const g = S.doc.settings.gridSize || 20, p = C.pageSize();
    gPage.innerHTML = `<rect x="-6" y="-6" width="${p.w + 12}" height="${p.h + 12}" fill="#000" opacity=".06" rx="4"/><rect x="0" y="0" width="${p.w}" height="${p.h}" fill="#fff" stroke="#c8d3e3"/>` +
      (S.doc.settings.grid ? `<rect x="0" y="0" width="${p.w}" height="${p.h}" fill="url(#gridPat)"/>` : "");
    $("#gridPat").setAttribute("width", g); $("#gridPat").setAttribute("height", g);
    $("#gridPat path").setAttribute("d", `M${g},0 L0,0 0,${g}`);
    $("#gridPatBig").setAttribute("width", g * 5); $("#gridPatBig").setAttribute("height", g * 5); $("#gridPatBig path").setAttribute("d", `M${g * 5},0 L0,0 0,${g * 5}`);
    wrap.style.background = "#eef2f7";
  }
  function renderAll() {
    defs.innerHTML = C.markerDefs(S.page.edges);
    gScene.innerHTML = C.sceneMarkup();
    renderOverlay(); renderProps(); renderOutline();
    $("#emptyHint").style.display = S.page.nodes.length ? "none" : "grid";
    $("#pageBadge").className = "badge " + (S.page.level === "LLD" ? "lld" : "hld"); $("#pageBadge").textContent = S.page.level || "HLD";
    $("#statCounts").textContent = `${S.page.nodes.length} shapes · ${S.page.edges.length} connectors`;
    if (window.RCW_CHECKS && $("#checksAuto").checked) window.RCW_CHECKS.run(false);
  }
  const HANDLE = 7;
  function renderOverlay() {
    let o = "";
    const z = S.zoom, hs = HANDLE / z;
    S.sel.forEach(id => {
      const n = C.nodeById(id); if (!n) return;
      o += `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" fill="none" stroke="#078be8" stroke-width="${1.5 / z}" stroke-dasharray="${4 / z} ${3 / z}" pointer-events="none"/>`;
      if (!n.locked && S.sel.size === 1) {
        const pts = { nw: [n.x, n.y], n: [n.x + n.w / 2, n.y], ne: [n.x + n.w, n.y], e: [n.x + n.w, n.y + n.h / 2], se: [n.x + n.w, n.y + n.h], s: [n.x + n.w / 2, n.y + n.h], sw: [n.x, n.y + n.h], w: [n.x, n.y + n.h / 2] };
        Object.entries(pts).forEach(([k, [x, y]]) => { o += `<rect data-handle="${k}" data-node="${id}" x="${x - hs / 2}" y="${y - hs / 2}" width="${hs}" height="${hs}" fill="#fff" stroke="#078be8" stroke-width="${1.5 / z}"/>`; });
      }
      if (n.locked) o += `<text x="${n.x + n.w - 4 / z}" y="${n.y + 12 / z}" text-anchor="end" font-size="${11 / z}" fill="#5f6c84" pointer-events="none">🔒</text>`;
    });
    // ports on hover / when in connect tool
    const showPortsFor = new Set();
    if (S.hoverNode && (S.tool === "connect" || S.connectDraft || S.sel.has(S.hoverNode))) showPortsFor.add(S.hoverNode);
    if (S.connectDraft && S.hoverNode) showPortsFor.add(S.hoverNode);
    showPortsFor.forEach(id => {
      const n = C.nodeById(id); if (!n) return;
      ["n", "e", "s", "w"].forEach(p => { const pt = C.portPoint(n, p); const hot = S.hoverPort && S.hoverPort.node === id && S.hoverPort.port === p; o += `<circle data-port="${p}" data-node="${id}" cx="${pt.x}" cy="${pt.y}" r="${(hot ? 7 : 5) / z}" fill="${hot ? "#078be8" : "#fff"}" stroke="#078be8" stroke-width="${1.5 / z}"/>`; });
    });
    S.selEdges.forEach(id => {
      const e = C.edgeById(id); const r = C.routeEdge(e); if (!r) return;
      o += `<path d="${C.pathD(r.pts, r.router)}" fill="none" stroke="#078be8" stroke-width="${(C.edgeStyle(e).width + 4) / z}" opacity=".25" pointer-events="none"/>`;
      const p1 = r.pts[0], p2 = r.pts[r.pts.length - 1];
      o += `<circle data-endpoint="from" data-edge="${id}" cx="${p1.x}" cy="${p1.y}" r="${6 / z}" fill="#fff" stroke="#078be8" stroke-width="${2 / z}"/><circle data-endpoint="to" data-edge="${id}" cx="${p2.x}" cy="${p2.y}" r="${6 / z}" fill="#fff" stroke="#078be8" stroke-width="${2 / z}"/>`;
      (e.points || []).forEach((w, i) => { o += `<rect data-waypoint="${i}" data-edge="${id}" x="${w.x - hs / 2}" y="${w.y - hs / 2}" width="${hs}" height="${hs}" fill="#ffd51d" stroke="#101b3b" stroke-width="${1 / z}"/>`; });
      if (r.router !== "curved" && !(e.points || []).length) { const m = C.polyMid(r.pts, 0.5); o += `<circle data-addwp="1" data-edge="${id}" cx="${m.x}" cy="${m.y}" r="${5 / z}" fill="#fff" stroke="#5f6c84" stroke-width="${1 / z}" stroke-dasharray="${2 / z}"/>`; }
    });
    if (S.connectDraft) { const d = S.connectDraft; o += `<line x1="${d.x1}" y1="${d.y1}" x2="${d.x2}" y2="${d.y2}" stroke="#078be8" stroke-width="${2 / z}" stroke-dasharray="${6 / z} ${4 / z}" pointer-events="none"/>`; }
    if (S.marquee) { const m = S.marquee; o += `<rect x="${Math.min(m.x1, m.x2)}" y="${Math.min(m.y1, m.y2)}" width="${Math.abs(m.x2 - m.x1)}" height="${Math.abs(m.y2 - m.y1)}" fill="#078be8" fill-opacity=".08" stroke="#078be8" stroke-width="${1 / z}" pointer-events="none"/>`; }
    S.guides.forEach(g => { o += g.v ? `<line x1="${g.v}" y1="-1e4" x2="${g.v}" y2="1e4" stroke="#d53f8c" stroke-width="${1 / z}" stroke-dasharray="${4 / z}" pointer-events="none"/>` : `<line x1="-1e4" y1="${g.h}" x2="1e4" y2="${g.h}" stroke="#d53f8c" stroke-width="${1 / z}" stroke-dasharray="${4 / z}" pointer-events="none"/>`; });
    if (S.dropTarget) { const n = C.nodeById(S.dropTarget); if (n) o += `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" fill="#9ee636" fill-opacity=".12" stroke="#1f9d55" stroke-width="${2 / z}" pointer-events="none"/>`; }
    gOverlay.innerHTML = o;
  }

  /* ------------------------------------------------------------------ hit testing */
  function nodeAt(x, y, exclude) {
    const nodes = C.orderedNodes();
    for (let i = nodes.length - 1; i >= 0; i--) { const n = nodes[i]; if (exclude && exclude.has(n.id)) continue; if (n.hidden) continue; if (x >= n.x && x <= n.x + n.w && y >= n.y && y <= n.y + n.h) return n; }
    return null;
  }
  function containerAt(x, y, exclude) {
    const nodes = C.orderedNodes().filter(n => C.isContainer(n) && !(exclude && exclude.has(n.id)));
    for (let i = nodes.length - 1; i >= 0; i--) { const n = nodes[i]; if (x >= n.x && x <= n.x + n.w && y >= n.y && y <= n.y + n.h) return n; }
    return null;
  }
  function nearestPort(n, x, y) { let best = null, bd = 1e9; ["n", "e", "s", "w"].forEach(p => { const pt = C.portPoint(n, p); const d = Math.hypot(pt.x - x, pt.y - y); if (d < bd) { bd = d; best = p; } }); return { port: best, dist: bd }; }

  /* ------------------------------------------------------------------ node creation */
  function addNode(type, x, y, opts) {
    const s = SH.get(type); if (!s) return null;
    opts = opts || {};
    const w = opts.w || s.w, h = opts.h || s.h;
    const n = { id: uid("n"), type, x: snap(x - w / 2), y: snap(y - h / 2), w, h, label: opts.label != null ? opts.label : (s.label != null ? s.label : s.name), sub: "", style: {}, parent: null, locked: false, props: Object.assign({}, s.props || {}), attrs: [] };
    if (opts.parent) n.parent = opts.parent; else { const c = containerAt(n.x + n.w / 2, n.y + n.h / 2); if (c && !C.isContainer(n)) n.parent = c.id; else if (c && C.isContainer(n) && c.w > n.w && c.h > n.h) n.parent = c.id; }
    if (s.kind === "special" && type === "legend") n.props.auto = true;
    S.page.nodes.push(n);
    return n;
  }
  function deleteSelection() {
    if (!S.sel.size && !S.selEdges.size) return; begin();
    const ids = new Set(); S.sel.forEach(id => { ids.add(id); C.descendants(id).forEach(d => ids.add(d.id)); });
    S.page.nodes = S.page.nodes.filter(n => !ids.has(n.id));
    S.page.edges = S.page.edges.filter(e => !S.selEdges.has(e.id) && !ids.has(e.from.node) && !ids.has(e.to.node));
    S.sel.clear(); S.selEdges.clear(); commit("delete");
  }
  function duplicateSelection(dx, dy) {
    if (!S.sel.size) return; begin();
    const map = {}; const newIds = [];
    const ids = new Set(); S.sel.forEach(id => { ids.add(id); C.descendants(id).forEach(d => ids.add(d.id)); });
    ids.forEach(id => { const n = C.nodeById(id); const c = JSON.parse(JSON.stringify(n)); c.id = uid("n"); c.x += dx; c.y += dy; map[id] = c.id; S.page.nodes.push(c); newIds.push(c); });
    newIds.forEach(c => { if (c.parent && map[c.parent]) c.parent = map[c.parent]; });
    S.page.edges.filter(e => ids.has(e.from.node) && ids.has(e.to.node)).forEach(e => { const c = JSON.parse(JSON.stringify(e)); c.id = uid("e"); c.from.node = map[e.from.node]; c.to.node = map[e.to.node]; c.points = (c.points || []).map(p => ({ x: p.x + dx, y: p.y + dy })); S.page.edges.push(c); });
    S.sel = new Set(S.sel.size ? [...S.sel].map(id => map[id]) : []); S.selEdges.clear(); commit("duplicate");
  }
  function copySel() { if (!S.sel.size) return; const ids = new Set(); S.sel.forEach(id => { ids.add(id); C.descendants(id).forEach(d => ids.add(d.id)); }); S.clipboard = { nodes: S.page.nodes.filter(n => ids.has(n.id)).map(n => JSON.parse(JSON.stringify(n))), edges: S.page.edges.filter(e => ids.has(e.from.node) && ids.has(e.to.node)).map(e => JSON.parse(JSON.stringify(e))) }; S.pasteOffset = 0; showToast(`Copied ${S.clipboard.nodes.length} shape(s)`); }
  function paste() {
    if (!S.clipboard) return; begin(); S.pasteOffset += 20; const off = S.pasteOffset; const map = {};
    S.clipboard.nodes.forEach(n => { const c = JSON.parse(JSON.stringify(n)); c.id = uid("n"); c.x += off; c.y += off; map[n.id] = c.id; S.page.nodes.push(c); });
    S.page.nodes.filter(n => map[n.parent] && Object.values(map).includes(n.id)).forEach(n => { n.parent = map[n.parent]; });
    S.page.nodes.filter(n => Object.values(map).includes(n.id) && n.parent && !Object.values(map).includes(n.parent) && !C.nodeById(n.parent)).forEach(n => { n.parent = null; });
    S.clipboard.edges.forEach(e => { const c = JSON.parse(JSON.stringify(e)); c.id = uid("e"); c.from.node = map[e.from.node]; c.to.node = map[e.to.node]; c.points = (c.points || []).map(p => ({ x: p.x + off, y: p.y + off })); S.page.edges.push(c); });
    S.sel = new Set(Object.values(map)); S.selEdges.clear(); commit("paste");
  }

  /* ------------------------------------------------------------------ pointer interaction */
  let ptrDown = null;
  function onPointerDown(ev) {
    if (ev.button === 1 || (ev.button === 0 && S.tool === "pan") || (ev.button === 0 && ev.altKey && !ev.shiftKey && S.tool === "select" && !ev.target.closest(".shape,.conn"))) { ptrDown = { kind: "pan", sx: ev.clientX, sy: ev.clientY, px: S.panX, py: S.panY }; svg.setPointerCapture(ev.pointerId); svg.classList.add("dragging"); return; }
    if (ev.button === 2) return;
    closeMenus(); hideCtx();
    const w = clientToWorld(ev.clientX, ev.clientY);
    const t = ev.target;
    finishTextEdit();
    svg.focus({ preventScroll: true });
    // handles
    if (t.dataset.handle) { const n = C.nodeById(t.dataset.node); begin(); ptrDown = { kind: "resize", handle: t.dataset.handle, n, ox: n.x, oy: n.y, ow: n.w, oh: n.h, sx: w.x, sy: w.y, children: C.descendants(n.id).map(c => ({ c, x: c.x, y: c.y, w: c.w, h: c.h })) }; svg.setPointerCapture(ev.pointerId); return; }
    if (t.dataset.port) { const n = C.nodeById(t.dataset.node); const p = C.portPoint(n, t.dataset.port); ptrDown = { kind: "connect", from: n.id, port: t.dataset.port }; S.connectDraft = { x1: p.x, y1: p.y, x2: p.x, y2: p.y }; svg.setPointerCapture(ev.pointerId); return; }
    if (t.dataset.endpoint) { const e = C.edgeById(t.dataset.edge); begin(); ptrDown = { kind: "reconnect", e, end: t.dataset.endpoint }; svg.setPointerCapture(ev.pointerId); return; }
    if (t.dataset.waypoint != null && t.dataset.edge) { const e = C.edgeById(t.dataset.edge); begin(); ptrDown = { kind: "waypoint", e, i: +t.dataset.waypoint }; svg.setPointerCapture(ev.pointerId); return; }
    if (t.dataset.addwp) { const e = C.edgeById(t.dataset.edge); begin(); const r = C.routeEdge(e); const m = C.polyMid(r.pts, 0.5); e.points = [{ x: snap(m.x), y: snap(m.y) }]; ptrDown = { kind: "waypoint", e, i: 0 }; svg.setPointerCapture(ev.pointerId); renderAll(); return; }
    // tools that place things
    if (S.tool === "shape" && S.pendingShape) { begin(); const n = addNode(S.pendingShape, w.x, w.y); S.sel = new Set([n.id]); S.selEdges.clear(); commit("add"); if (!ev.shiftKey) setTool("select"); return; }
    if (S.tool === "text") { begin(); const n = addNode("text", w.x, w.y, { label: "" }); S.sel = new Set([n.id]); S.selEdges.clear(); commit("add"); setTool("select"); startTextEdit(n); return; }
    const shapeEl = t.closest(".shape"), connEl = t.closest(".conn");
    if (S.tool === "connect") {
      if (shapeEl) { const n = C.nodeById(shapeEl.dataset.id); const np = nearestPort(n, w.x, w.y); const p = C.portPoint(n, np.port); ptrDown = { kind: "connect", from: n.id, port: np.dist < 18 / S.zoom ? np.port : "auto" }; S.connectDraft = { x1: p.x, y1: p.y, x2: w.x, y2: w.y }; svg.setPointerCapture(ev.pointerId); }
      return;
    }
    if (connEl) {
      const id = connEl.dataset.id;
      if (ev.shiftKey || ev.ctrlKey || ev.metaKey) { if (S.selEdges.has(id)) S.selEdges.delete(id); else S.selEdges.add(id); } else { S.sel.clear(); S.selEdges = new Set([id]); }
      renderOverlay(); renderProps(); renderOutline(); return;
    }
    if (shapeEl) {
      const id = shapeEl.dataset.id, n = C.nodeById(id);
      if (ev.shiftKey || ev.ctrlKey || ev.metaKey) { if (S.sel.has(id)) S.sel.delete(id); else S.sel.add(id); renderOverlay(); renderProps(); renderOutline(); return; }
      if (!S.sel.has(id)) { S.sel = new Set([id]); S.selEdges.clear(); }
      renderOverlay(); renderProps(); renderOutline();
      if (n.locked) return;
      const moving = new Map(); S.sel.forEach(sid => { const sn = C.nodeById(sid); if (sn.locked) return; moving.set(sid, { x: sn.x, y: sn.y }); C.descendants(sid).forEach(d => moving.set(d.id, { x: d.x, y: d.y })); });
      const wps = new Map(); S.page.edges.forEach(e => { if (moving.has(e.from.node) && moving.has(e.to.node) && e.points && e.points.length) wps.set(e.id, e.points.map(p => ({ x: p.x, y: p.y }))); });
      ptrDown = { kind: "move", sx: w.x, sy: w.y, moving, wps, moved: false, primary: id }; svg.setPointerCapture(ev.pointerId); return;
    }
    // empty canvas: marquee
    if (!(ev.shiftKey || ev.ctrlKey || ev.metaKey)) { S.sel.clear(); S.selEdges.clear(); }
    ptrDown = { kind: "marquee", sx: w.x, sy: w.y, additive: ev.shiftKey || ev.ctrlKey || ev.metaKey }; S.marquee = { x1: w.x, y1: w.y, x2: w.x, y2: w.y }; svg.setPointerCapture(ev.pointerId); renderOverlay(); renderProps(); renderOutline();
  }
  function onPointerMove(ev) {
    const w = clientToWorld(ev.clientX, ev.clientY);
    $("#statPos").textContent = `${Math.round(w.x)}, ${Math.round(w.y)}`;
    if (!ptrDown) {
      const el = ev.target.closest && ev.target.closest(".shape"); const id = el ? el.dataset.id : null;
      if (id !== S.hoverNode) { S.hoverNode = id; renderOverlay(); }
      return;
    }
    const d = ptrDown;
    if (d.kind === "pan") { S.panX = d.px + ev.clientX - d.sx; S.panY = d.py + ev.clientY - d.sy; applyView(); return; }
    if (d.kind === "move") {
      let dx = w.x - d.sx, dy = w.y - d.sy;
      if (!d.moved && Math.hypot(dx, dy) * S.zoom < 3) return;
      if (!d.moved) { begin(); d.moved = true; }
      const prim = C.nodeById(d.primary); const o = d.moving.get(d.primary) || { x: prim.x, y: prim.y };
      let nx = o.x + dx, ny = o.y + dy;
      if (ev.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) ny = o.y; else nx = o.x; }
      // snapping + smart guides on primary
      S.guides = [];
      if (S.doc.settings.snap) { nx = snap(nx); ny = snap(ny); }
      if (S.doc.settings.guides) {
        const T = 6 / S.zoom; const cand = S.page.nodes.filter(n => !d.moving.has(n.id) && !n.hidden);
        const px = [nx, nx + prim.w / 2, nx + prim.w], py = [ny, ny + prim.h / 2, ny + prim.h];
        let bx = null, by = null;
        cand.forEach(n => { [n.x, n.x + n.w / 2, n.x + n.w].forEach(gx => px.forEach((v, i) => { if (Math.abs(v - gx) < T && (bx == null || Math.abs(v - gx) < bx.d)) bx = { d: Math.abs(v - gx), g: gx, i }; })); [n.y, n.y + n.h / 2, n.y + n.h].forEach(gy => py.forEach((v, i) => { if (Math.abs(v - gy) < T && (by == null || Math.abs(v - gy) < by.d)) by = { d: Math.abs(v - gy), g: gy, i }; })); });
        if (bx) { nx = bx.g - [0, prim.w / 2, prim.w][bx.i]; S.guides.push({ v: bx.g }); }
        if (by) { ny = by.g - [0, prim.h / 2, prim.h][by.i]; S.guides.push({ h: by.g }); }
      }
      dx = nx - o.x; dy = ny - o.y;
      d.moving.forEach((o2, id) => { const n = C.nodeById(id); n.x = o2.x + dx; n.y = o2.y + dy; });
      d.wps.forEach((pts, eid) => { const e = C.edgeById(eid); e.points = pts.map(p => ({ x: p.x + dx, y: p.y + dy })); });
      // drop target highlight (container under pointer, not being moved)
      const tgt = containerAt(w.x, w.y, new Set(d.moving.keys())); S.dropTarget = tgt ? tgt.id : null;
      gScene.innerHTML = C.sceneMarkup(); renderOverlay(); return;
    }
    if (d.kind === "resize") {
      const n = d.n; let dx = w.x - d.sx, dy = w.y - d.sy; const h = d.handle; const s = SH.get(n.type);
      let x = d.ox, y = d.oy, wd = d.ow, ht = d.oh;
      if (h.includes("e")) wd = d.ow + dx; if (h.includes("s")) ht = d.oh + dy; if (h.includes("w")) { x = d.ox + dx; wd = d.ow - dx; } if (h.includes("n")) { y = d.oy + dy; ht = d.oh - dy; }
      if (ev.shiftKey || (s.kind === "icon" && !ev.altKey)) { const r = d.ow / d.oh; if (h.length === 2) { if (Math.abs(dx) > Math.abs(dy)) ht = wd / r; else wd = ht * r; if (h.includes("w")) x = d.ox + d.ow - wd; if (h.includes("n")) y = d.oy + d.oh - ht; } }
      const minW = s.kind === "text" ? 20 : 16, minH = 12;
      if (wd < minW) { if (h.includes("w")) x = d.ox + d.ow - minW; wd = minW; } if (ht < minH) { if (h.includes("n")) y = d.oy + d.oh - minH; ht = minH; }
      if (S.doc.settings.snap && !ev.altKey) { const nx2 = snap(x + wd), ny2 = snap(y + ht); x = snap(x); y = snap(y); wd = Math.max(minW, nx2 - x); ht = Math.max(minH, ny2 - y); }
      n.x = x; n.y = y; n.w = wd; n.h = ht;
      gScene.innerHTML = C.sceneMarkup(); renderOverlay(); return;
    }
    if (d.kind === "connect") {
      S.connectDraft.x2 = w.x; S.connectDraft.y2 = w.y;
      const el = document.elementFromPoint(ev.clientX, ev.clientY); const se = el && el.closest ? el.closest(".shape") : null; const tgt = se ? C.nodeById(se.dataset.id) : nodeAt(w.x, w.y);
      S.hoverNode = tgt && tgt.id !== d.from ? tgt.id : null; S.hoverPort = null;
      if (tgt && tgt.id !== d.from) { const np = nearestPort(tgt, w.x, w.y); if (np.dist < 18 / S.zoom) { S.hoverPort = { node: tgt.id, port: np.port }; const p = C.portPoint(tgt, np.port); S.connectDraft.x2 = p.x; S.connectDraft.y2 = p.y; } }
      renderOverlay(); return;
    }
    if (d.kind === "reconnect") {
      const el = document.elementFromPoint(ev.clientX, ev.clientY); const se = el && el.closest ? el.closest(".shape") : null; const tgt = se ? C.nodeById(se.dataset.id) : nodeAt(w.x, w.y);
      S.hoverNode = tgt ? tgt.id : null; S.hoverPort = null;
      if (tgt) { const np = nearestPort(tgt, w.x, w.y); const port = np.dist < 18 / S.zoom ? np.port : "auto"; if (port !== "auto") S.hoverPort = { node: tgt.id, port }; const other = d.end === "from" ? d.e.to.node : d.e.from.node; if (tgt.id !== other) { d.e[d.end] = { node: tgt.id, port }; } }
      gScene.innerHTML = C.sceneMarkup(); renderOverlay(); return;
    }
    if (d.kind === "waypoint") { d.e.points[d.i] = { x: snap(w.x), y: snap(w.y) }; gScene.innerHTML = C.sceneMarkup(); renderOverlay(); return; }
    if (d.kind === "marquee") { S.marquee.x2 = w.x; S.marquee.y2 = w.y; renderOverlay(); return; }
  }
  function onPointerUp(ev) {
    const d = ptrDown; ptrDown = null; svg.classList.remove("dragging");
    try { svg.releasePointerCapture(ev.pointerId); } catch (e) { }
    if (!d) return;
    const w = clientToWorld(ev.clientX, ev.clientY);
    S.guides = [];
    if (d.kind === "move") {
      if (d.moved) {
        // re-parent to container under the primary's centre
        const tgt = S.dropTarget ? C.nodeById(S.dropTarget) : null; S.dropTarget = null;
        S.sel.forEach(id => { const n = C.nodeById(id); if (n.locked) return; if (tgt && tgt.id !== n.id && !C.descendants(n.id).some(x => x.id === tgt.id)) n.parent = tgt.id; else if (!tgt) { const c = containerAt(n.x + n.w / 2, n.y + n.h / 2, new Set([n.id, ...C.descendants(n.id).map(x => x.id)])); n.parent = c ? c.id : null; } });
        commit("move");
      } else { S.dropTarget = null; renderOverlay(); }
      return;
    }
    if (d.kind === "resize") { commit("resize"); return; }
    if (d.kind === "connect") {
      S.connectDraft = null; const from = d.from;
      const el = document.elementFromPoint(ev.clientX, ev.clientY); const se = el && el.closest ? el.closest(".shape") : null; let tgt = se ? C.nodeById(se.dataset.id) : nodeAt(w.x, w.y);
      let toPort = "auto"; if (S.hoverPort && tgt && S.hoverPort.node === tgt.id) toPort = S.hoverPort.port;
      S.hoverPort = null;
      if (tgt && tgt.id !== from) {
        begin(); const e = { id: uid("e"), from: { node: from, port: d.port || "auto" }, to: { node: tgt.id, port: toPort }, points: [], label: "", srcLabel: "", dstLabel: "", style: Object.assign({}, S.lastEdgeStyle || { router: "orthogonal" }), preset: S.lastPreset || "link", attrs: [] };
        S.page.edges.push(e); S.sel.clear(); S.selEdges = new Set([e.id]); commit("connect"); if (S.tool === "connect" && !ev.shiftKey) { /* stay in connect tool for rapid linking */ }
      } else if (!tgt && Math.hypot(w.x - S.connectStart?.x || 0, 0) >= 0) {
        // dropped on empty canvas: offer quick-add of same shape type
        const src = C.nodeById(from);
        if (src && Math.hypot(d.startX ?? w.x, 0) >= 0 && (Math.abs(w.x - (src.x + src.w / 2)) > 40 || Math.abs(w.y - (src.y + src.h / 2)) > 40)) {
          begin(); const n = addNode(src.type, w.x, w.y, { label: src.label }); n.style = JSON.parse(JSON.stringify(src.style || {}));
          const e = { id: uid("e"), from: { node: from, port: d.port || "auto" }, to: { node: n.id, port: "auto" }, points: [], label: "", srcLabel: "", dstLabel: "", style: Object.assign({}, S.lastEdgeStyle || { router: "orthogonal" }), preset: S.lastPreset || "link", attrs: [] };
          S.page.edges.push(e); S.sel = new Set([n.id]); S.selEdges.clear(); commit("connect+add"); showToast("Created a linked copy - press Delete if you didn't want it");
        } else renderOverlay();
      } else renderOverlay();
      return;
    }
    if (d.kind === "reconnect") { S.hoverPort = null; commit("reconnect"); return; }
    if (d.kind === "waypoint") { commit("waypoint"); return; }
    if (d.kind === "marquee") {
      const m = S.marquee; S.marquee = null; const x1 = Math.min(m.x1, m.x2), y1 = Math.min(m.y1, m.y2), x2 = Math.max(m.x1, m.x2), y2 = Math.max(m.y1, m.y2);
      if (x2 - x1 > 3 || y2 - y1 > 3) { S.page.nodes.forEach(n => { if (n.x >= x1 && n.y >= y1 && n.x + n.w <= x2 && n.y + n.h <= y2) S.sel.add(n.id); }); S.page.edges.forEach(e => { const r = C.routeEdge(e); if (r && r.pts.every(p => p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2)) S.selEdges.add(e.id); }); }
      renderOverlay(); renderProps(); renderOutline(); return;
    }
  }
  function onDblClick(ev) {
    const w = clientToWorld(ev.clientX, ev.clientY);
    // the scene may have been re-rendered between the two clicks, so resolve the target from live DOM at the pointer position
    const live = document.elementFromPoint(ev.clientX, ev.clientY);
    const se = live && live.closest ? live.closest(".shape") : null, ce = live && live.closest ? live.closest(".conn") : null;
    // fall back to the current selection when the double-click landed on a label / just outside the icon box
    const n0 = se ? C.nodeById(se.dataset.id) : (nodeAt(w.x, w.y) || (S.sel.size === 1 ? C.nodeById([...S.sel][0]) : null));
    if (n0) { const n = n0; if (n.type === "image") { pickImage(n); return; } if (n.type === "table" || n.type === "revtable" || n.type === "legend" || n.type === "titleblock") { openProps(); const f = $("#propsBody textarea, #propsBody input"); if (f) f.focus(); return; } startTextEdit(n); return; }
    if (ce) { const e = C.edgeById(ce.dataset.id); startEdgeLabelEdit(e); return; }
    // empty: add a text
    begin(); const n = addNode("text", w.x, w.y, { label: "" }); S.sel = new Set([n.id]); commit("add"); startTextEdit(n);
  }
  function onWheel(ev) {
    ev.preventDefault(); const r = svg.getBoundingClientRect();
    if (ev.ctrlKey || ev.metaKey) { const f = Math.exp(-ev.deltaY * 0.0015); setZoom(S.zoom * f, ev.clientX - r.left, ev.clientY - r.top); }
    else if (ev.shiftKey) { S.panX -= (ev.deltaY || ev.deltaX); applyView(); } else { S.panX -= ev.deltaX; S.panY -= ev.deltaY; applyView(); }
  }
  // touch pinch
  const touches = new Map(); let pinch = null;
  function onTouchPtrDown(ev) { if (ev.pointerType !== "touch") return; touches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY }); if (touches.size === 2) { const [a, b] = [...touches.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: S.zoom, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, px: S.panX, py: S.panY }; ptrDown = null; S.marquee = null; renderOverlay(); } }
  function onTouchPtrMove(ev) { if (ev.pointerType !== "touch" || !touches.has(ev.pointerId)) return; touches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY }); if (pinch && touches.size === 2) { const [a, b] = [...touches.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); const r = svg.getBoundingClientRect(); const cx = (a.x + b.x) / 2 - r.left, cy = (a.y + b.y) / 2 - r.top; S.zoom = pinch.z; S.panX = pinch.px + (cx - (pinch.cx - r.left)); S.panY = pinch.py + (cy - (pinch.cy - r.top)); setZoom(pinch.z * d / pinch.d, cx, cy); } }
  function onTouchPtrUp(ev) { if (ev.pointerType !== "touch") return; touches.delete(ev.pointerId); if (touches.size < 2) pinch = null; }

  /* ------------------------------------------------------------------ inline text editing */
  function startTextEdit(n) {
    if (n.locked) return; const s = SH.get(n.type); if (s.kind === "special" && n.type !== "table") return;
    finishTextEdit(); S.editing = { n, prev: n.label };
    const ta = $("#textEditor"); const st = C.nodeStyle(n); const r = svg.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
    const isIcon = s.kind === "icon", isCont = s.kind === "container";
    const bw = isIcon ? Math.max(n.w * 2, 140) : n.w, bh = isIcon ? 48 : isCont ? 26 : n.h;
    const bx = isIcon ? n.x + n.w / 2 - bw / 2 : n.x, by = isIcon ? n.y + n.h + 2 : n.y;
    ta.style.left = (S.panX + bx * S.zoom + r.left - wr.left) + "px"; ta.style.top = (S.panY + by * S.zoom + r.top - wr.top) + "px";
    ta.style.width = Math.max(60, bw * S.zoom) + "px"; ta.style.height = Math.max(26, bh * S.zoom) + "px";
    ta.style.fontSize = st.fontSize * S.zoom + "px"; ta.style.fontWeight = st.bold || isCont ? 700 : 500; ta.style.textAlign = isCont ? "left" : st.align || "center";
    ta.style.fontFamily = st.mono ? "ui-monospace,Consolas,monospace" : ""; ta.style.display = "block"; ta.value = n.label || ""; ta.focus(); ta.select();
    n._editing = true; gScene.querySelector(`[data-id="${n.id}"]`)?.querySelectorAll("text").forEach(t => t.style.opacity = isIcon || s.kind === "text" || s.kind === "box" ? "0" : "1");
  }
  function finishTextEdit(cancel) {
    if (!S.editing) return; const { n, prev } = S.editing; const ta = $("#textEditor"); const v = ta.value; ta.style.display = "none"; S.editing = null; delete n._editing;
    if (S.editingEdge) { const e = S.editingEdge; S.editingEdge = null; if (!cancel && v !== e.label) { begin(); e.label = v; commit("label"); } else renderAll(); return; }
    if (!cancel && v !== prev) { begin(); n.label = prev; S._pre = snapshot(); n.label = v; if (SH.get(n.type).kind === "text") autosizeText(n); commit("label"); } else renderAll();
  }
  function autosizeText(n) { const st = C.nodeStyle(n); const lines = C.wrapText(n.label, 2000, st.fontSize, st.bold); const c = document.createElement("canvas").getContext("2d"); c.font = `${st.bold ? 700 : 500} ${st.fontSize}px ${U.FONT}`; const w = Math.max(...lines.map(l => c.measureText(l).width)) + 10; n.w = Math.max(40, Math.min(w, 900)); const l2 = C.wrapText(n.label, n.w - 4, st.fontSize, st.bold); n.h = Math.max(st.fontSize * 1.4, l2.length * st.fontSize * 1.25 + 6); }
  function startEdgeLabelEdit(e) {
    finishTextEdit(); const r = C.routeEdge(e); if (!r) return; const m = C.polyMid(r.pts, 0.5);
    S.editing = { n: { label: e.label }, prev: e.label }; S.editingEdge = e;
    const ta = $("#textEditor"); const rc = svg.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
    ta.style.left = (S.panX + (m.x - 80) * S.zoom + rc.left - wr.left) + "px"; ta.style.top = (S.panY + (m.y - 14) * S.zoom + rc.top - wr.top) + "px"; ta.style.width = 160 * S.zoom + "px"; ta.style.height = 28 * S.zoom + "px"; ta.style.fontSize = 11 * S.zoom + "px"; ta.style.fontWeight = 500; ta.style.textAlign = "center"; ta.style.display = "block"; ta.value = e.label || ""; ta.focus(); ta.select();
  }
  function pickImage(n) {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/png,image/jpeg,image/svg+xml,image/webp,image/gif";
    inp.onchange = () => { const f = inp.files[0]; if (!f) return; if (f.size > 2 * 1024 * 1024) { showToast("Image too large (max 2 MB)"); return; } const rd = new FileReader(); rd.onload = () => { begin(); n.props.src = rd.result; const img = new Image(); img.onload = () => { const r = img.width / img.height; n.h = Math.round(n.w / r); commit("image"); }; img.onerror = () => commit("image"); img.src = rd.result; }; rd.readAsDataURL(f); };
    inp.click();
  }

  /* ------------------------------------------------------------------ tools / toolbar */
  function setTool(t, shape) {
    S.tool = t; S.pendingShape = shape || null; svg.className.baseVal = "tool-" + t;
    $$("[data-tool]").forEach(b => b.setAttribute("aria-pressed", b.dataset.tool === t ? "true" : "false"));
    $("#statTool").textContent = t === "shape" ? "Click on canvas to place: " + (SH.get(shape) || {}).name : { select: "Select / move (V)", connect: "Connector: drag from a shape to another (C)", pan: "Pan: drag the canvas (H)", text: "Text: click to add (T)" }[t] || t;
  }
  function syncToolbar() {
    $("#btnUndo").disabled = !S.undo.length; $("#btnRedo").disabled = !S.redo.length;
    $("#tglGrid").setAttribute("aria-pressed", String(!!S.doc.settings.grid)); $("#tglSnap").setAttribute("aria-pressed", String(!!S.doc.settings.snap)); $("#tglGuides").setAttribute("aria-pressed", String(!!S.doc.settings.guides)); $("#tglDetail").setAttribute("aria-pressed", String(!!S.doc.settings.hideDetail));
    $$("#segLevel button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.level === (S.page.level || "HLD"))));
  }

  /* ------------------------------------------------------------------ arrange */
  function selNodes() { return [...S.sel].map(C.nodeById).filter(Boolean); }
  function moveSel(dx, dy) { const ns = selNodes().filter(n => !n.locked); if (!ns.length) return; begin(); const all = new Set(); ns.forEach(n => { all.add(n.id); C.descendants(n.id).forEach(d => all.add(d.id)); }); all.forEach(id => { const n = C.nodeById(id); n.x += dx; n.y += dy; }); commit("nudge"); }
  function align(mode) {
    const ns = selNodes().filter(n => !n.locked); if (ns.length < 2) { showToast("Select two or more shapes to align"); return; } begin();
    const x1 = Math.min(...ns.map(n => n.x)), x2 = Math.max(...ns.map(n => n.x + n.w)), y1 = Math.min(...ns.map(n => n.y)), y2 = Math.max(...ns.map(n => n.y + n.h));
    ns.forEach(n => { const ox = n.x, oy = n.y; if (mode === "left") n.x = x1; if (mode === "right") n.x = x2 - n.w; if (mode === "hcenter") n.x = (x1 + x2) / 2 - n.w / 2; if (mode === "top") n.y = y1; if (mode === "bottom") n.y = y2 - n.h; if (mode === "vcenter") n.y = (y1 + y2) / 2 - n.h / 2; C.descendants(n.id).forEach(d => { d.x += n.x - ox; d.y += n.y - oy; }); });
    commit("align");
  }
  function distribute(axis) {
    const ns = selNodes().filter(n => !n.locked); if (ns.length < 3) { showToast("Select three or more shapes to distribute"); return; } begin();
    ns.sort((a, b) => axis === "h" ? a.x - b.x : a.y - b.y);
    const first = ns[0], last = ns[ns.length - 1];
    const total = axis === "h" ? (last.x + last.w) - first.x : (last.y + last.h) - first.y; const sum = ns.reduce((a, n) => a + (axis === "h" ? n.w : n.h), 0); const gap = (total - sum) / (ns.length - 1);
    let cur = axis === "h" ? first.x : first.y;
    ns.forEach(n => { const ox = n.x, oy = n.y; if (axis === "h") { n.x = cur; cur += n.w + gap; } else { n.y = cur; cur += n.h + gap; } C.descendants(n.id).forEach(d => { d.x += n.x - ox; d.y += n.y - oy; }); });
    commit("distribute");
  }
  function sameSize(mode) { const ns = selNodes().filter(n => !n.locked); if (ns.length < 2) return; begin(); const ref = C.nodeById([...S.sel][0]); ns.forEach(n => { if (mode !== "h") n.w = ref.w; if (mode !== "w") n.h = ref.h; }); commit("size"); }
  function zorder(mode) {
    const ids = new Set(S.sel); if (!ids.size) return; begin();
    const nodes = S.page.nodes; const sel = nodes.filter(n => ids.has(n.id)), rest = nodes.filter(n => !ids.has(n.id));
    if (mode === "front") S.page.nodes = rest.concat(sel); else if (mode === "back") S.page.nodes = sel.concat(rest);
    else if (mode === "forward" || mode === "backward") { const arr = nodes.slice(); const idx = arr.map((n, i) => ids.has(n.id) ? i : -1).filter(i => i >= 0); if (mode === "forward") idx.reverse().forEach(i => { if (i < arr.length - 1 && !ids.has(arr[i + 1].id)) { [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]; } }); else idx.forEach(i => { if (i > 0 && !ids.has(arr[i - 1].id)) { [arr[i], arr[i - 1]] = [arr[i - 1], arr[i]]; } }); S.page.nodes = arr; }
    S.page.nodes.forEach((n, i) => { n.z = C.isContainer(n) ? 0 : 1; }); commit("zorder");
  }
  function groupSel() {
    const ns = selNodes(); if (ns.length < 2) { showToast("Select two or more shapes to group"); return; } begin();
    const b = { x: Math.min(...ns.map(n => n.x)) - 16, y: Math.min(...ns.map(n => n.y)) - 40, x2: Math.max(...ns.map(n => n.x + n.w)) + 16, y2: Math.max(...ns.map(n => n.y + n.h)) + 44 };
    const g = { id: uid("n"), type: "zone", x: b.x, y: b.y, w: b.x2 - b.x, h: b.y2 - b.y, label: "Group", sub: "", style: {}, parent: ns[0].parent || null, locked: false, props: {}, attrs: [] };
    S.page.nodes.unshift(g); ns.forEach(n => { n.parent = g.id; }); S.sel = new Set([g.id]); commit("group");
  }
  function ungroupSel() { const ns = selNodes().filter(C.isContainer); if (!ns.length) return; begin(); ns.forEach(g => { S.page.nodes.forEach(n => { if (n.parent === g.id) n.parent = g.parent || null; }); }); S.page.nodes = S.page.nodes.filter(n => !ns.includes(n)); S.sel.clear(); commit("ungroup"); }
  function toggleLock() { const ns = selNodes(); if (!ns.length) return; begin(); const v = !ns.every(n => n.locked); ns.forEach(n => n.locked = v); commit("lock"); }
  function autoLayout() {
    // simple layered layout for selected (or all) top-level nodes based on connector direction
    const nodes = (S.sel.size > 1 ? selNodes() : S.page.nodes.filter(n => !n.parent)).filter(n => { const s = SH.get(n.type); return s.kind !== "special" && s.kind !== "text" && !n.locked; });
    if (nodes.length < 2) { showToast("Nothing to lay out - add some connected shapes first"); return; }
    begin(); const ids = new Set(nodes.map(n => n.id)); const indeg = {}; const out = {}; nodes.forEach(n => { indeg[n.id] = 0; out[n.id] = []; });
    S.page.edges.forEach(e => { if (ids.has(e.from.node) && ids.has(e.to.node) && e.from.node !== e.to.node) { out[e.from.node].push(e.to.node); indeg[e.to.node]++; } });
    const layer = {}; let q = nodes.filter(n => indeg[n.id] === 0).map(n => n.id); if (!q.length) q = [nodes[0].id]; q.forEach(id => layer[id] = 0); const seen = new Set(q);
    while (q.length) { const id = q.shift(); out[id].forEach(t => { if (!seen.has(t)) { seen.add(t); layer[t] = layer[id] + 1; q.push(t); } else layer[t] = Math.max(layer[t], layer[id] + 1 > 50 ? layer[t] : layer[id] + 1); }); }
    nodes.forEach(n => { if (layer[n.id] == null) layer[n.id] = 0; });
    const layers = {}; nodes.forEach(n => { (layers[layer[n.id]] = layers[layer[n.id]] || []).push(n); });
    const x0 = Math.min(...nodes.map(n => n.x)), y0 = Math.min(...nodes.map(n => n.y)); const GX = 200, GY = 150;
    Object.keys(layers).sort((a, b) => a - b).forEach((l, li) => { const arr = layers[l]; const totalW = arr.reduce((a, n) => a + n.w, 0) + (arr.length - 1) * 60; let cx = x0 + 400 - totalW / 2; arr.forEach(n => { const ox = n.x, oy = n.y; n.x = snap(Math.max(x0, cx)); n.y = snap(y0 + li * GY); cx += n.w + 60; C.descendants(n.id).forEach(d => { d.x += n.x - ox; d.y += n.y - oy; }); }); });
    S.page.edges.forEach(e => { if (ids.has(e.from.node) || ids.has(e.to.node)) e.points = []; });
    commit("layout");
  }

  /* ------------------------------------------------------------------ properties panel */
  function openProps() { $("#workspace").classList.add("props-open"); $("#workspace").classList.remove("props-closed"); }
  const SWATCHES = ["#101b3b", "#1f6fb5", "#078be8", "#4bd7ff", "#2a9d8f", "#1f9d55", "#9ee636", "#ffd51d", "#e07b1a", "#d0463f", "#d53f8c", "#6f42c1", "#5f6c84", "#8fa3bf", "#ffffff"];
  function renderProps(force) {
    const body = $("#propsBody"); const ns = selNodes(); const es = [...S.selEdges].map(C.edgeById).filter(Boolean);
    // Don't rebuild the panel while the user is typing in it (would steal focus / lose caret) unless the selection changed.
    const sig = [...S.sel].join(",") + "|" + [...S.selEdges].join(",") + "|" + ns.map(n => (n.attrs || []).length + ":" + (n.props && n.props.auto)).join(",") + "|" + es.map(e => (e.attrs || []).length).join(",");
    const typing = body.contains(document.activeElement) && document.activeElement !== body;
    if (!force && typing && sig === S._propsSig) return;
    S._propsSig = sig;
    if (!ns.length && !es.length) { body.innerHTML = renderPageProps(); bindPageProps(); return; }
    if (es.length && !ns.length) { body.innerHTML = renderEdgeProps(es); bindEdgeProps(es); return; }
    body.innerHTML = renderNodeProps(ns); bindNodeProps(ns);
  }
  function inp(id, label, value, type, extra) { return `<div class="row"><label for="${id}">${label}</label><input id="${id}" type="${type || "text"}" value="${U.esc(value == null ? "" : value)}" ${extra || ""}></div>`; }
  function sel(id, label, value, opts) { return `<div class="row"><label for="${id}">${label}</label><select id="${id}">${opts.map(o => `<option value="${o[0]}" ${String(o[0]) === String(value) ? "selected" : ""}>${o[1]}</option>`).join("")}</select></div>`; }
  function colorRow(id, label, value) { return `<div class="row"><label for="${id}">${label}</label><input id="${id}" type="color" value="${/^#[0-9a-f]{6}$/i.test(value) ? value : "#ffffff"}"><input id="${id}Txt" type="text" value="${U.esc(value)}" aria-label="${label} hex" style="max-width:90px"></div><div class="swatches" data-for="${id}">${SWATCHES.map(c => `<button type="button" style="background:${c}" data-c="${c}" title="${c}" aria-label="Set ${label} to ${c}"></button>`).join("")}</div>`; }
  function renderNodeProps(ns) {
    const n = ns[0], s = SH.get(n.type), st = C.nodeStyle(n), multi = ns.length > 1;
    let h = `<div class="type-badge">${SH.thumb(s).replace("<svg", '<svg width="22" height="22"')} ${multi ? ns.length + " shapes selected" : U.esc(s.name)}</div><p class="hint">${multi ? "Changes apply to all selected shapes." : "ID " + n.id + (n.parent ? " · inside " + U.esc((C.nodeById(n.parent) || {}).label || "container") : "")}</p>`;
    if (!multi) {
      h += `<h4>Content</h4><div class="row top"><label for="pLabel">Label</label><textarea id="pLabel" rows="2">${U.esc(n.label)}</textarea></div>`;
      if (s.kind !== "text" && s.kind !== "special") h += inp("pSub", "Sub-label", n.sub, "text", 'placeholder="hostname / model / IP"');
      if (n.type === "table" || n.type === "revtable") h += `<div class="row top"><label for="pRows">Rows</label><textarea id="pRows" rows="6" style="font-family:ui-monospace,Consolas,monospace;font-size:11.5px" spellcheck="false">${U.esc(n.props.rows || "")}</textarea></div><p class="hint">One row per line, columns separated by <b>|</b>. First line = header.</p>`;
      if (n.type === "legend") h += `<div class="row"><label>Mode</label><label style="min-width:0;flex:1"><input type="checkbox" id="pLegendAuto" ${n.props.auto !== false ? "checked" : ""}> Auto-generate from page</label></div>${n.props.auto === false ? `<div class="row top"><label for="pRows">Entries</label><textarea id="pRows" rows="5" style="font-family:ui-monospace,Consolas,monospace;font-size:11.5px" spellcheck="false">${U.esc(n.props.rows || "")}</textarea></div><p class="hint">One per line: <b>Name | #colour</b></p>` : ""}`;
      if (n.type === "titleblock") h += `<p class="hint">Fields come from <b>Diagram properties</b> (deselect everything to edit them).</p>`;
      if (n.type === "image") h += `<div class="row"><label>Image</label><button type="button" class="btn sm" id="pPickImg">Choose file…</button></div>`;
      h += inp("pLink", "Hyperlink", n.link || "", "text", 'placeholder="https://… or #page-name"');
      if (s.kind !== "special" && s.kind !== "text") {
        h += `<h4>LLD attributes</h4><div id="attrList">${(n.attrs || []).map((a, i) => `<div class="kv"><input type="text" value="${U.esc(a.k)}" data-ak="${i}" placeholder="Key" aria-label="Attribute key"><input type="text" value="${U.esc(a.v)}" data-av="${i}" placeholder="Value" aria-label="Attribute value"><button type="button" data-adel="${i}" aria-label="Remove attribute">×</button></div>`).join("")}</div><button type="button" class="btn sm" id="pAddAttr">+ Add attribute</button><p class="hint">Shown under the shape (e.g. Model, Mgmt IP, VLAN, Serial). Hidden when "Hide LLD detail" is on for HLD pages.</p>`;
      }
    }
    h += `<h4>Style</h4>`;
    if (s.kind !== "text") h += colorRow("pFill", "Fill", st.fill);
    h += colorRow("pStroke", "Stroke", st.stroke === "none" ? "#000000" : st.stroke);
    h += `<div class="row"><label for="pStrokeW">Stroke width</label><input id="pStrokeW" type="range" min="0" max="8" step="0.5" value="${st.strokeWidth}"><span style="min-width:24px;text-align:right">${st.strokeWidth}</span></div>`;
    h += sel("pDash", "Line style", st.dash || "", [["", "Solid"], ["6 4", "Dashed"], ["2 3", "Dotted"], ["10 4 2 4", "Dash-dot"]]);
    if (s.kind === "box" || s.kind === "container") h += `<div class="row"><label for="pOpacity">Opacity</label><input id="pOpacity" type="range" min="0.1" max="1" step="0.05" value="${st.opacity}"></div>`;
    if (s.kind === "box" && !s.geo?.call) h += sel("pGeo", "Geometry", st.geoOverride || s.geo || "rect", Object.keys(SH.GEO).map(g => [g, g]));
    h += `<h4>Text</h4>` + colorRow("pText", "Colour", st.textColor) + `<div class="pair"><div class="row"><label for="pFont">Size</label><input id="pFont" type="number" min="6" max="72" value="${st.fontSize}"></div><div class="row"><label style="flex:0 0 auto"><input type="checkbox" id="pBold" ${st.bold ? "checked" : ""}> Bold</label></div></div>`;
    h += `<div class="row"><label>Align</label><div class="chips">${["left", "center", "right"].map(a => `<button type="button" class="chip" data-align="${a}" aria-pressed="${st.align === a}">${a}</button>`).join("")}</div></div>`;
    if (s.kind === "icon") h += sel("pLabelPos", "Label position", st.labelPos || "below", [["below", "Below"], ["right", "Right"], ["above", "Above"], ["none", "Hidden"]]);
    if (!multi) h += `<h4>Position & size</h4><div class="pair"><div class="row"><label for="pX">X</label><input id="pX" type="number" value="${Math.round(n.x)}"></div><div class="row"><label for="pY">Y</label><input id="pY" type="number" value="${Math.round(n.y)}"></div><div class="row"><label for="pW">W</label><input id="pW" type="number" min="10" value="${Math.round(n.w)}"></div><div class="row"><label for="pH">H</label><input id="pH" type="number" min="10" value="${Math.round(n.h)}"></div></div>`;
    h += `<div class="row" style="margin-top:8px;flex-wrap:wrap;gap:5px"><button type="button" class="btn sm" id="pLock">${ns.every(x => x.locked) ? "🔓 Unlock" : "🔒 Lock"}</button><button type="button" class="btn sm" id="pDup">Duplicate</button><button type="button" class="btn sm danger" id="pDel">Delete</button></div>`;
    return h;
  }
  function bindColor(id, apply) {
    const c = $("#" + id), t = $("#" + id + "Txt"); if (!c) return;
    c.addEventListener("input", () => { t.value = c.value; apply(c.value, true); }); c.addEventListener("change", () => apply(c.value, false));
    t.addEventListener("change", () => { const v = t.value.trim(); if (/^#[0-9a-f]{3,8}$/i.test(v) || v === "none" || v === "transparent") { if (/^#[0-9a-f]{6}$/i.test(v)) c.value = v; apply(v, false); } });
    $$(`.swatches[data-for="${id}"] button`).forEach(b => b.addEventListener("click", () => { c.value = b.dataset.c; t.value = b.dataset.c; apply(b.dataset.c, false); }));
  }
  function bindNodeProps(ns) {
    const n = ns[0];
    const live = (fn) => { fn(); gScene.innerHTML = C.sceneMarkup(); renderOverlay(); };
    const commitNow = (label) => { commit(label); };
    const styleAll = (k, v, isLive) => { if (!S._pre) begin(); ns.forEach(x => { x.style[k] = v; }); if (isLive) live(() => { }); else commitNow("style"); };
    const on = (id, ev, fn) => { const el = $("#" + id); if (el) el.addEventListener(ev, fn); };
    on("pLabel", "input", () => { if (!S._pre) begin(); n.label = $("#pLabel").value; live(() => { }); }); on("pLabel", "change", () => { if (SH.get(n.type).kind === "text") autosizeText(n); commitNow("label"); });
    on("pSub", "input", () => { if (!S._pre) begin(); n.sub = $("#pSub").value; live(() => { }); }); on("pSub", "change", () => commitNow("sub"));
    on("pRows", "input", () => { if (!S._pre) begin(); n.props.rows = $("#pRows").value; live(() => { }); }); on("pRows", "change", () => commitNow("rows"));
    on("pLegendAuto", "change", () => { begin(); n.props.auto = $("#pLegendAuto").checked; if (!n.props.auto && !n.props.rows) n.props.rows = "Item | #1f6fb5"; commitNow("legend"); renderProps(true); });
    on("pPickImg", "click", () => pickImage(n));
    on("pLink", "change", () => { begin(); n.link = $("#pLink").value.trim(); commitNow("link"); });
    on("pAddAttr", "click", () => { begin(); n.attrs.push({ k: "", v: "" }); commitNow("attr"); renderProps(true); const f = $$("#attrList input"); if (f.length) f[f.length - 2].focus(); });
    $$("#attrList input").forEach(i => { i.addEventListener("input", () => { if (!S._pre) begin(); const k = i.dataset.ak, v = i.dataset.av; if (k != null) n.attrs[+k].k = i.value; if (v != null) n.attrs[+v].v = i.value; live(() => { }); }); i.addEventListener("change", () => commitNow("attr")); });
    $$("#attrList [data-adel]").forEach(b => b.addEventListener("click", () => { begin(); n.attrs.splice(+b.dataset.adel, 1); commitNow("attr"); renderProps(true); }));
    bindColor("pFill", (v, l) => styleAll("fill", v, l)); bindColor("pStroke", (v, l) => styleAll("stroke", v, l)); bindColor("pText", (v, l) => styleAll("textColor", v, l));
    on("pStrokeW", "input", (e) => { e.target.nextElementSibling.textContent = e.target.value; styleAll("strokeWidth", +e.target.value, true); }); on("pStrokeW", "change", (e) => styleAll("strokeWidth", +e.target.value, false));
    on("pDash", "change", (e) => styleAll("dash", e.target.value, false));
    on("pOpacity", "input", (e) => styleAll("opacity", +e.target.value, true)); on("pOpacity", "change", (e) => styleAll("opacity", +e.target.value, false));
    on("pGeo", "change", (e) => styleAll("geoOverride", e.target.value, false));
    on("pFont", "change", (e) => { styleAll("fontSize", clamp(+e.target.value || 12, 6, 72), false); ns.forEach(x => { if (SH.get(x.type).kind === "text") autosizeText(x); }); renderAll(); });
    on("pBold", "change", (e) => styleAll("bold", e.target.checked, false));
    $$("[data-align]").forEach(b => b.addEventListener("click", () => styleAll("align", b.dataset.align, false)));
    on("pLabelPos", "change", (e) => styleAll("labelPos", e.target.value, false));
    ["X", "Y", "W", "H"].forEach(k => on("p" + k, "change", (e) => { begin(); const v = +e.target.value; const key = k.toLowerCase(); const old = n[key]; if (k === "W" || k === "H") n[key] = Math.max(10, v); else { n[key] = v; C.descendants(n.id).forEach(d => d[key] += v - old); } commitNow("geometry"); }));
    on("pLock", "click", toggleLock); on("pDup", "click", () => duplicateSelection(20, 20)); on("pDel", "click", deleteSelection);
  }
  function renderEdgeProps(es) {
    const e = es[0], st = C.edgeStyle(e), multi = es.length > 1;
    let h = `<div class="type-badge">🔗 ${multi ? es.length + " connectors selected" : "Connector"}</div>`;
    if (!multi) { h += `<h4>Labels</h4>` + inp("eLabel", "Label", e.label, "text", 'placeholder="e.g. 10G LACP / HTTPS 443"') + inp("eSrc", "Source end", e.srcLabel, "text", 'placeholder="Gi1/0/1"') + inp("eDst", "Target end", e.dstLabel, "text", 'placeholder="Gi1/0/48"'); h += `<p class="hint">End labels are ideal for LLD port / interface names.</p>`; }
    h += `<h4>Type & routing</h4>` + sel("ePreset", "Media / type", e.preset || "link", Object.entries(C.PRESETS).map(([k, v]) => [k, v.name]));
    h += sel("eRouter", "Routing", st.router, [["orthogonal", "Orthogonal (right angles)"], ["straight", "Straight"], ["curved", "Curved"]]);
    h += `<div class="pair">${sel("eStart", "Start", st.startArrow, [["none", "None"], ["arrow", "Arrow"], ["open", "Open arrow"], ["dot", "Dot"], ["diamond", "Diamond"]])}${sel("eEnd", "End", st.endArrow, [["none", "None"], ["arrow", "Arrow"], ["open", "Open arrow"], ["dot", "Dot"], ["diamond", "Diamond"]])}</div>`;
    if (!multi) h += `<div class="pair">${sel("eFromPort", "From port", e.from.port, [["auto", "Auto"], ["n", "Top"], ["e", "Right"], ["s", "Bottom"], ["w", "Left"]])}${sel("eToPort", "To port", e.to.port, [["auto", "Auto"], ["n", "Top"], ["e", "Right"], ["s", "Bottom"], ["w", "Left"]])}</div>`;
    h += `<h4>Style</h4>` + colorRow("eStroke", "Colour", st.stroke) + `<div class="row"><label for="eWidth">Width</label><input id="eWidth" type="range" min="0.5" max="8" step="0.5" value="${st.width}"><span style="min-width:24px;text-align:right">${st.width}</span></div>` + sel("eDash", "Dash", st.dash || "", [["", "Solid"], ["6 4", "Dashed"], ["2 4", "Dotted"], ["8 4 2 4", "Dash-dot"], ["10 4", "Long dash"]]) + `<div class="row"><label for="eFont">Label size</label><input id="eFont" type="number" min="6" max="24" value="${st.fontSize}"></div>`;
    h += `<div class="row" style="margin-top:8px;flex-wrap:wrap;gap:5px"><button type="button" class="btn sm" id="eReverse">⇄ Reverse</button><button type="button" class="btn sm" id="eReset">Reset waypoints</button><button type="button" class="btn sm" id="eDefault">Set as default</button><button type="button" class="btn sm danger" id="eDel">Delete</button></div>`;
    if (!multi) h += `<h4>LLD attributes</h4><div id="attrList">${(e.attrs || []).map((a, i) => `<div class="kv"><input type="text" value="${U.esc(a.k)}" data-ak="${i}" placeholder="Key"><input type="text" value="${U.esc(a.v)}" data-av="${i}" placeholder="Value"><button type="button" data-adel="${i}" aria-label="Remove">×</button></div>`).join("")}</div><button type="button" class="btn sm" id="eAddAttr">+ Add attribute</button><p class="hint">e.g. Cable ID, Media, Speed, VLANs allowed. Included in exports (CSV / JSON) and the connection schedule.</p>`;
    return h;
  }
  function bindEdgeProps(es) {
    const e = es[0]; const on = (id, ev, fn) => { const el = $("#" + id); if (el) el.addEventListener(ev, fn); };
    const live = () => { defs.innerHTML = C.markerDefs(S.page.edges); gScene.innerHTML = C.sceneMarkup(); renderOverlay(); };
    const styleAll = (k, v, isLive) => { if (!S._pre) begin(); es.forEach(x => { x.style[k] = v; }); if (isLive) live(); else commit("edge style"); };
    on("eLabel", "input", () => { if (!S._pre) begin(); e.label = $("#eLabel").value; live(); }); on("eLabel", "change", () => commit("label"));
    on("eSrc", "input", () => { if (!S._pre) begin(); e.srcLabel = $("#eSrc").value; live(); }); on("eSrc", "change", () => commit("label"));
    on("eDst", "input", () => { if (!S._pre) begin(); e.dstLabel = $("#eDst").value; live(); }); on("eDst", "change", () => commit("label"));
    on("ePreset", "change", (ev) => { begin(); es.forEach(x => { x.preset = ev.target.value; delete x.style.stroke; delete x.style.width; delete x.style.dash; if (C.PRESETS[x.preset].endArrow) x.style.endArrow = C.PRESETS[x.preset].endArrow; }); S.lastPreset = ev.target.value; commit("preset"); });
    on("eRouter", "change", (ev) => styleAll("router", ev.target.value, false)); on("eStart", "change", (ev) => styleAll("startArrow", ev.target.value, false)); on("eEnd", "change", (ev) => styleAll("endArrow", ev.target.value, false));
    on("eFromPort", "change", (ev) => { begin(); e.from.port = ev.target.value; commit("port"); }); on("eToPort", "change", (ev) => { begin(); e.to.port = ev.target.value; commit("port"); });
    bindColor("eStroke", (v, l) => styleAll("stroke", v, l));
    on("eWidth", "input", (ev) => { ev.target.nextElementSibling.textContent = ev.target.value; styleAll("width", +ev.target.value, true); }); on("eWidth", "change", (ev) => styleAll("width", +ev.target.value, false));
    on("eDash", "change", (ev) => styleAll("dash", ev.target.value, false)); on("eFont", "change", (ev) => styleAll("fontSize", clamp(+ev.target.value || 10, 6, 24), false));
    on("eReverse", "click", () => { begin(); es.forEach(x => { const f = x.from; x.from = x.to; x.to = f; const sl = x.srcLabel; x.srcLabel = x.dstLabel; x.dstLabel = sl; x.points = (x.points || []).reverse(); }); commit("reverse"); });
    on("eReset", "click", () => { begin(); es.forEach(x => { x.points = []; x.from.port = "auto"; x.to.port = "auto"; }); commit("reset"); });
    on("eDefault", "click", () => { S.lastPreset = e.preset; S.lastEdgeStyle = JSON.parse(JSON.stringify(e.style)); showToast("New connectors will use this style"); });
    on("eDel", "click", deleteSelection);
    on("eAddAttr", "click", () => { begin(); e.attrs.push({ k: "", v: "" }); commit("attr"); renderProps(true); const f = $$("#attrList input"); if (f.length) f[f.length - 2].focus(); });
    $$("#attrList input").forEach(i => { i.addEventListener("input", () => { if (!S._pre) begin(); const k = i.dataset.ak, v = i.dataset.av; if (k != null) e.attrs[+k].k = i.value; if (v != null) e.attrs[+v].v = i.value; }); i.addEventListener("change", () => commit("attr")); });
    $$("#attrList [data-adel]").forEach(b => b.addEventListener("click", () => { begin(); e.attrs.splice(+b.dataset.adel, 1); commit("attr"); renderProps(true); }));
  }
  function renderPageProps() {
    const m = S.doc.meta, p = S.page, ps = S.doc.settings.page;
    return `<div class="type-badge">📄 Diagram properties</div><p class="hint">Select a shape or connector to edit it. These fields feed the title block and exports.</p>
      <h4>Document</h4>${inp("dTitle", "Title", m.title)}${inp("dOrg", "Organisation", m.org, "text", 'placeholder="Customer / company"')}${inp("dAuthor", "Author", m.author)}${inp("dVersion", "Version", m.version)}${inp("dDate", "Date", m.date, "date")}
      ${sel("dStatus", "Status", m.status, [["Draft", "Draft"], ["In review", "In review"], ["Approved", "Approved"], ["As-built", "As-built"], ["Superseded", "Superseded"]])}
      ${sel("dClass", "Classification", m.classification, [["Public", "Public"], ["Internal", "Internal"], ["Confidential", "Confidential"], ["Restricted", "Restricted"]])}
      ${inp("dStandard", "Notation std.", m.standard)}<div class="row top"><label for="dDesc">Description</label><textarea id="dDesc" rows="2">${U.esc(m.description || "")}</textarea></div>
      <h4>This page</h4>${inp("pgName", "Page name", p.name)}${sel("pgLevel", "Design level", p.level || "HLD", [["HLD", "HLD - High-Level Design"], ["LLD", "LLD - Low-Level Design"]])}
      <h4>Canvas</h4>${sel("pgSize", "Page size", ps.size, Object.keys(C.PAGE_SIZES).map(k => [k, k + (k === "Infinite" ? " (large canvas)" : "")]))}${sel("pgOrient", "Orientation", ps.orientation, [["landscape", "Landscape"], ["portrait", "Portrait"]])}
      <div class="row"><label for="pgGrid">Grid size</label><input id="pgGrid" type="number" min="5" max="100" step="5" value="${S.doc.settings.gridSize}"></div>
      <h4>Outline</h4><ul class="outline" id="outline"></ul>`;
  }
  function bindPageProps() {
    const m = S.doc.meta; const on = (id, fn) => { const el = $("#" + id); if (el) el.addEventListener("change", fn); };
    on("dTitle", e => { m.title = e.target.value; $("#docTitle").value = m.title; renderAll(); schedulePersist(); }); on("dOrg", e => { m.org = e.target.value; renderAll(); schedulePersist(); }); on("dAuthor", e => { m.author = e.target.value; renderAll(); schedulePersist(); }); on("dVersion", e => { m.version = e.target.value; renderAll(); schedulePersist(); }); on("dDate", e => { m.date = e.target.value; renderAll(); schedulePersist(); }); on("dStatus", e => { m.status = e.target.value; renderAll(); schedulePersist(); }); on("dClass", e => { m.classification = e.target.value; renderAll(); schedulePersist(); }); on("dStandard", e => { m.standard = e.target.value; renderAll(); schedulePersist(); }); on("dDesc", e => { m.description = e.target.value; schedulePersist(); });
    on("pgName", e => { S.page.name = e.target.value; renderPages(); renderAll(); schedulePersist(); }); on("pgLevel", e => { S.page.level = e.target.value; renderAll(); syncToolbar(); schedulePersist(); });
    on("pgSize", e => { S.doc.settings.page.size = e.target.value; drawGrid(); fitToPage(); schedulePersist(); }); on("pgOrient", e => { S.doc.settings.page.orientation = e.target.value; drawGrid(); fitToPage(); schedulePersist(); }); on("pgGrid", e => { S.doc.settings.gridSize = clamp(+e.target.value || 20, 5, 100); drawGrid(); schedulePersist(); });
    renderOutline();
  }
  function renderOutline() {
    const ul = $("#outline"); if (!ul) return;
    const nodes = S.page.nodes.slice().sort((a, b) => (a.parent ? 1 : 0) - (b.parent ? 1 : 0));
    ul.innerHTML = nodes.slice(0, 300).map(n => { const s = SH.get(n.type); return `<li><button type="button" data-oid="${n.id}" class="${S.sel.has(n.id) ? "sel" : ""}" style="padding-left:${n.parent ? 20 : 8}px">${SH.thumb(s).replace("<svg", '<svg width="16" height="16"')}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${U.esc((n.label || s.name).split("\n")[0])}</span>${n.locked ? "🔒" : ""}</button></li>`; }).join("") || `<li style="padding:8px;color:#5f6c84">No shapes yet</li>`;
    $$("#outline button").forEach(b => b.addEventListener("click", (ev) => { const id = b.dataset.oid; if (ev.shiftKey) { if (S.sel.has(id)) S.sel.delete(id); else S.sel.add(id); } else S.sel = new Set([id]); S.selEdges.clear(); renderOverlay(); renderOutline(); const n = C.nodeById(id); if (n) { const r = svg.getBoundingClientRect(); const cx = n.x + n.w / 2, cy = n.y + n.h / 2; const sx = S.panX + cx * S.zoom, sy = S.panY + cy * S.zoom; if (sx < 0 || sy < 0 || sx > r.width || sy > r.height) { S.panX = r.width / 2 - cx * S.zoom; S.panY = r.height / 2 - cy * S.zoom; applyView(); } } }));
  }

  /* ------------------------------------------------------------------ pages */
  function renderPages() {
    const el = $("#pages"); el.innerHTML = S.doc.pages.map((p, i) => `<button type="button" class="page-tab" role="tab" aria-selected="${p === S.page}" data-pi="${i}" title="Double-click to rename">${U.esc(p.name)} <span class="badge ${p.level === "LLD" ? "lld" : "hld"}" style="margin-left:4px">${p.level || "HLD"}</span></button>`).join("") + `<button type="button" class="page-add" id="pageAdd" title="Add page" aria-label="Add page">+</button>`;
    $$("#pages .page-tab").forEach(b => { b.addEventListener("click", () => switchPage(+b.dataset.pi)); b.addEventListener("dblclick", () => { const p = S.doc.pages[+b.dataset.pi]; const v = prompt("Page name", p.name); if (v != null && v.trim()) { p.name = v.trim(); renderPages(); renderAll(); schedulePersist(); } }); b.addEventListener("contextmenu", (ev) => { ev.preventDefault(); pageMenu(+b.dataset.pi, ev.clientX, ev.clientY); }); });
    $("#pageAdd").addEventListener("click", () => addPage());
  }
  function switchPage(i) { finishTextEdit(); S.page = S.doc.pages[i]; S.sel.clear(); S.selEdges.clear(); renderPages(); renderAll(); syncToolbar(); fitToPage(); schedulePersist(); }
  function addPage(level) { const b = TPL.builder(); b.n("heading", 40, 26, (level || S.page.level || "HLD") === "LLD" ? "Low-Level Design" : "High-Level Design", { w: 1000, h: 40 }); b.n("legend", 40, 963, "Legend", { w: 300, h: 120, props: { auto: true } }); b.n("titleblock", 1127, 987, "Title block", { w: 420, h: 96 }); const p = TPL.page("Page " + (S.doc.pages.length + 1), level || S.page.level || "HLD", b); S.doc.pages.push(p); switchPage(S.doc.pages.length - 1); }
  function pageMenu(i, x, y) {
    const p = S.doc.pages[i]; const ctx = $("#ctx");
    ctx.innerHTML = `<button data-a="rename">Rename page</button><button data-a="dup">Duplicate page</button><button data-a="level">Toggle HLD / LLD</button><hr><button data-a="left" ${i === 0 ? "disabled" : ""}>Move left</button><button data-a="right" ${i === S.doc.pages.length - 1 ? "disabled" : ""}>Move right</button><hr><button data-a="del" ${S.doc.pages.length < 2 ? "disabled" : ""} style="color:#c93c3c">Delete page</button>`;
    showCtx(x, y);
    ctx.onclick = (ev) => { const a = ev.target.closest("button")?.dataset.a; if (!a) return; hideCtx();
      if (a === "rename") { const v = prompt("Page name", p.name); if (v && v.trim()) p.name = v.trim(); }
      if (a === "dup") { const c = JSON.parse(JSON.stringify(p)); c.id = uid("p"); c.name = p.name + " (copy)"; S.doc.pages.splice(i + 1, 0, c); S.page = c; }
      if (a === "level") p.level = p.level === "LLD" ? "HLD" : "LLD";
      if (a === "left" && i > 0) { S.doc.pages.splice(i, 1); S.doc.pages.splice(i - 1, 0, p); }
      if (a === "right" && i < S.doc.pages.length - 1) { S.doc.pages.splice(i, 1); S.doc.pages.splice(i + 1, 0, p); }
      if (a === "del" && S.doc.pages.length > 1 && confirm(`Delete page "${p.name}"? This cannot be undone.`)) { S.doc.pages.splice(i, 1); if (S.page === p) S.page = S.doc.pages[Math.max(0, i - 1)]; }
      renderPages(); renderAll(); syncToolbar(); schedulePersist(); };
  }

  /* ------------------------------------------------------------------ context menu */
  function showCtx(x, y) { const ctx = $("#ctx"); const wr = wrap.getBoundingClientRect(); ctx.classList.add("open"); ctx.style.left = Math.min(x - wr.left, wr.width - 230) + "px"; ctx.style.top = Math.min(y - wr.top, wr.height - ctx.offsetHeight - 10) + "px"; }
  function hideCtx() { const ctx = $("#ctx"); ctx.classList.remove("open"); ctx.onclick = null; }
  function onContextMenu(ev) {
    ev.preventDefault(); const se = ev.target.closest(".shape"), ce = ev.target.closest(".conn");
    if (se && !S.sel.has(se.dataset.id)) { S.sel = new Set([se.dataset.id]); S.selEdges.clear(); renderOverlay(); renderProps(); }
    if (ce && !S.selEdges.has(ce.dataset.id)) { S.selEdges = new Set([ce.dataset.id]); S.sel.clear(); renderOverlay(); renderProps(); }
    const ctx = $("#ctx"); const has = S.sel.size || S.selEdges.size;
    ctx.innerHTML = has ? `<button data-a="edit">✏️ Edit text <span class="kbd">F2</span></button><button data-a="copy">Copy <span class="kbd">Ctrl+C</span></button><button data-a="dup">Duplicate <span class="kbd">Ctrl+D</span></button><hr><button data-a="front">Bring to front <span class="kbd">Ctrl+Shift+]</span></button><button data-a="back">Send to back <span class="kbd">Ctrl+Shift+[</span></button><hr>${S.sel.size > 1 ? `<button data-a="group">Group into zone <span class="kbd">Ctrl+G</span></button>` : ""}${selNodes().some(C.isContainer) ? `<button data-a="ungroup">Ungroup <span class="kbd">Ctrl+Shift+G</span></button>` : ""}<button data-a="lock">${selNodes().every(n => n.locked) && S.sel.size ? "Unlock" : "Lock"} <span class="kbd">Ctrl+L</span></button><button data-a="props">Properties…</button><hr><button data-a="del" style="color:#c93c3c">Delete <span class="kbd">Del</span></button>` : `<button data-a="paste" ${S.clipboard ? "" : "disabled"}>Paste <span class="kbd">Ctrl+V</span></button><button data-a="selall">Select all <span class="kbd">Ctrl+A</span></button><hr><button data-a="fit">Fit page <span class="kbd">Ctrl+0</span></button><button data-a="fitc">Fit content <span class="kbd">Ctrl+Shift+0</span></button><hr><button data-a="props">Diagram properties…</button>`;
    showCtx(ev.clientX, ev.clientY);
    const w = clientToWorld(ev.clientX, ev.clientY);
    ctx.onclick = (e2) => { const a = e2.target.closest("button")?.dataset.a; if (!a) return; hideCtx();
      ({ edit: () => { const n = selNodes()[0]; if (n) startTextEdit(n); else { const e = [...S.selEdges].map(C.edgeById)[0]; if (e) startEdgeLabelEdit(e); } }, copy: copySel, dup: () => duplicateSelection(20, 20), front: () => zorder("front"), back: () => zorder("back"), group: groupSel, ungroup: ungroupSel, lock: toggleLock, props: openProps, del: deleteSelection, paste: () => { paste(); }, selall: selectAll, fit: fitToPage, fitc: fitToContent })[a]?.(); };
  }
  function selectAll() { S.sel = new Set(S.page.nodes.filter(n => !n.hidden).map(n => n.id)); S.selEdges = new Set(S.page.edges.map(e => e.id)); renderOverlay(); renderProps(); }
  function closeMenus() { $$(".menu.open").forEach(m => { m.classList.remove("open"); const b = m.parentElement.querySelector("[aria-expanded]"); if (b) b.setAttribute("aria-expanded", "false"); }); }

  /* ------------------------------------------------------------------ keyboard */
  function onKey(ev) {
    const tag = (ev.target.tagName || "").toLowerCase(); const inField = tag === "input" || tag === "textarea" || tag === "select" || ev.target.isContentEditable;
    if (S.editing) { if (ev.key === "Escape") { finishTextEdit(true); ev.preventDefault(); } else if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) { finishTextEdit(); ev.preventDefault(); } else if (ev.key === "Tab") { finishTextEdit(); ev.preventDefault(); svg.focus(); } return; }
    const mod = ev.ctrlKey || ev.metaKey;
    if (inField) { if (ev.key === "Escape") { ev.target.blur(); svg.focus(); } return; }
    const k = ev.key.toLowerCase();
    if (mod && k === "z" && !ev.shiftKey) { undo(); ev.preventDefault(); return; }
    if ((mod && k === "y") || (mod && ev.shiftKey && k === "z")) { redo(); ev.preventDefault(); return; }
    if (mod && k === "s") { ev.preventDefault(); window.RCW_IO.saveJSON(); return; }
    if (mod && k === "o") { ev.preventDefault(); window.RCW_IO.openJSON(); return; }
    if (mod && k === "e") { ev.preventDefault(); openModal("exportModal"); return; }
    if (mod && k === "p") { ev.preventDefault(); window.RCW_IO.print(); return; }
    if (mod && k === "a") { ev.preventDefault(); selectAll(); return; }
    if (mod && k === "c") { copySel(); ev.preventDefault(); return; }
    if (mod && k === "x") { copySel(); deleteSelection(); ev.preventDefault(); return; }
    if (mod && k === "v") { paste(); ev.preventDefault(); return; }
    if (mod && k === "d") { duplicateSelection(20, 20); ev.preventDefault(); return; }
    if (mod && k === "g" && !ev.shiftKey) { groupSel(); ev.preventDefault(); return; }
    if (mod && k === "g" && ev.shiftKey) { ungroupSel(); ev.preventDefault(); return; }
    if (mod && k === "l") { toggleLock(); ev.preventDefault(); return; }
    if (mod && ev.shiftKey && ev.key === "]") { zorder("front"); ev.preventDefault(); return; } if (mod && ev.shiftKey && ev.key === "[") { zorder("back"); ev.preventDefault(); return; }
    if (mod && ev.key === "]") { zorder("forward"); ev.preventDefault(); return; } if (mod && ev.key === "[") { zorder("backward"); ev.preventDefault(); return; }
    if (mod && (ev.key === "=" || ev.key === "+")) { setZoom(S.zoom * 1.2); ev.preventDefault(); return; } if (mod && ev.key === "-") { setZoom(S.zoom / 1.2); ev.preventDefault(); return; }
    if (mod && ev.key === "0" && !ev.shiftKey) { fitToPage(); ev.preventDefault(); return; } if (mod && ev.shiftKey && (ev.key === "0" || ev.key === ")")) { fitToContent(); ev.preventDefault(); return; }
    if (mod && k === "k") { ev.preventDefault(); openModal("shortcutsModal"); return; }
    if (mod) return;
    if (ev.key === "Delete" || ev.key === "Backspace") { deleteSelection(); ev.preventDefault(); return; }
    if (ev.key === "Escape") { if (S.tool !== "select") setTool("select"); else { S.sel.clear(); S.selEdges.clear(); renderOverlay(); renderProps(); } hideCtx(); closeMenus(); return; }
    if (ev.key === "F2" || ev.key === "Enter") { const n = selNodes()[0]; if (n) { startTextEdit(n); ev.preventDefault(); } else { const e = [...S.selEdges].map(C.edgeById)[0]; if (e) { startEdgeLabelEdit(e); ev.preventDefault(); } } return; }
    if (ev.key.startsWith("Arrow")) { const d = ev.shiftKey ? (S.doc.settings.gridSize || 20) : 1; const dx = ev.key === "ArrowLeft" ? -d : ev.key === "ArrowRight" ? d : 0, dy = ev.key === "ArrowUp" ? -d : ev.key === "ArrowDown" ? d : 0; if (S.sel.size) { moveSel(dx, dy); ev.preventDefault(); } else { S.panX -= dx * 20; S.panY -= dy * 20; applyView(); ev.preventDefault(); } return; }
    if (ev.key === "Tab") { // cycle selection through shapes
      const nodes = C.orderedNodes(); if (!nodes.length) return; ev.preventDefault(); const cur = [...S.sel][0]; let i = nodes.findIndex(n => n.id === cur); i = ev.shiftKey ? (i <= 0 ? nodes.length - 1 : i - 1) : (i + 1) % nodes.length; S.sel = new Set([nodes[i].id]); S.selEdges.clear(); renderOverlay(); renderProps(); renderOutline(); announce(`Selected ${nodes[i].label || nodes[i].type}`); return; }
    if (k === "v") setTool("select"); else if (k === "c") setTool("connect"); else if (k === "h") setTool("pan"); else if (k === "t") setTool("text"); else if (k === "g") { S.doc.settings.grid = !S.doc.settings.grid; drawGrid(); syncToolbar(); } else if (k === "l" ) { $("#libSearch").focus(); ev.preventDefault(); } else if (k === "?") openModal("shortcutsModal"); else if (k === "n" && !ev.shiftKey) { /* reserved */ }
  }
  function announce(msg) { const a = $("#a11yLive"); a.textContent = ""; setTimeout(() => a.textContent = msg, 30); }
  function showToast(msg, ms) { toast.textContent = msg; toast.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(() => toast.classList.remove("show"), ms || 2600); announce(msg); }

  /* ------------------------------------------------------------------ modals */
  function openModal(id) { const m = $("#" + id); m.classList.add("open"); m.setAttribute("aria-hidden", "false"); S.lastFocus = document.activeElement; const f = m.querySelector("button:not(.x),input,select,textarea,[tabindex]"); if (f) setTimeout(() => f.focus(), 30); }
  function closeModal(id) { const m = typeof id === "string" ? $("#" + id) : id; m.classList.remove("open"); m.setAttribute("aria-hidden", "true"); if (S.lastFocus && S.lastFocus.focus) S.lastFocus.focus(); }
  function closeAllModals() { $$(".modal-backdrop.open").forEach(closeModal); }

  /* ------------------------------------------------------------------ shape library */
  function buildLibrary() {
    const host = $("#libBody"); let html = "";
    SH.CATEGORIES.forEach((cat, ci) => {
      const items = SH.SHAPES.filter(s => s.cat === cat.id);
      html += `<details class="lib-cat" data-cat="${cat.id}" ${ci < 3 ? "open" : ""}><summary>${U.esc(cat.name)}<span class="cnt">${items.length}</span></summary><div class="lib-grid">${items.map(s => `<button type="button" class="lib-item" data-type="${s.type}" data-tags="${U.esc((s.name + " " + s.tags).toLowerCase())}" title="${U.esc(s.name)} - click to place, or drag onto canvas" aria-label="${U.esc(s.name)}" draggable="false">${SH.thumb(s)}<span>${U.esc(s.name.length > 24 ? s.name.slice(0, 23) + "…" : s.name)}</span></button>`).join("")}</div></details>`;
    });
    host.innerHTML = html + `<p class="lib-empty" id="libEmpty" hidden>No shapes match.</p>`;
    // click -> place at centre of view (or arm click-to-place); drag -> drop
    $$(".lib-item").forEach(b => {
      let down = null;
      b.addEventListener("pointerdown", ev => { down = { x: ev.clientX, y: ev.clientY, type: b.dataset.type, id: ev.pointerId }; b.setPointerCapture(ev.pointerId); });
      b.addEventListener("pointermove", ev => { if (!down) return; if (!down.drag && Math.hypot(ev.clientX - down.x, ev.clientY - down.y) > 6) { down.drag = true; const g = $("#dragGhost"); g.innerHTML = SH.thumb(SH.get(down.type)); g.style.display = "block"; } if (down.drag) { const g = $("#dragGhost"); g.style.left = ev.clientX - 26 + "px"; g.style.top = ev.clientY - 22 + "px"; const r = svg.getBoundingClientRect(); const over = ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom; g.style.opacity = over ? "1" : ".5"; if (over) { const w = clientToWorld(ev.clientX, ev.clientY); const c = containerAt(w.x, w.y); S.dropTarget = c ? c.id : null; renderOverlay(); } } });
      const finish = ev => { if (!down) return; const d = down; down = null; $("#dragGhost").style.display = "none"; S.dropTarget = null; try { b.releasePointerCapture(d.id); } catch (e) { }
        if (d.drag) { const r = svg.getBoundingClientRect(); if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) { const w = clientToWorld(ev.clientX, ev.clientY); begin(); const n = addNode(d.type, w.x, w.y); S.sel = new Set([n.id]); S.selEdges.clear(); commit("add"); announce(`Added ${SH.get(d.type).name}`); } else renderOverlay(); }
        else { placeAtCentre(d.type); } };
      b.addEventListener("pointerup", finish); b.addEventListener("pointercancel", () => { down = null; $("#dragGhost").style.display = "none"; });
      b.addEventListener("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); placeAtCentre(b.dataset.type); } });
    });
    $("#libSearch").addEventListener("input", filterLibrary);
  }
  function placeAtCentre(type) {
    const r = svg.getBoundingClientRect(); const w = clientToWorld(r.left + r.width / 2, r.top + r.height / 2);
    // offset a little if something is already there
    let x = w.x, y = w.y; let tries = 0; while (tries++ < 12 && S.page.nodes.some(n => Math.abs(n.x + n.w / 2 - x) < 12 && Math.abs(n.y + n.h / 2 - y) < 12)) { x += 30; y += 30; }
    begin(); const n = addNode(type, x, y); S.sel = new Set([n.id]); S.selEdges.clear(); commit("add"); announce(`Added ${SH.get(type).name}. Use arrow keys to move it.`);
    if (window.matchMedia("(max-width:980px)").matches) $("#workspace").classList.remove("lib-open");
  }
  function filterLibrary() {
    const q = $("#libSearch").value.trim().toLowerCase(); let any = false;
    $$(".lib-cat").forEach(cat => { let vis = 0; $$(".lib-item", cat).forEach(it => { const m = !q || it.dataset.tags.includes(q); it.classList.toggle("hidden", !m); if (m) vis++; }); cat.style.display = vis ? "" : "none"; if (q && vis) cat.open = true; if (vis) any = true; });
    $("#libEmpty").hidden = any;
  }

  /* ------------------------------------------------------------------ templates modal */
  function buildTemplates() {
    const host = $("#tplGrid");
    host.innerHTML = TPL.list.map(t => { let prev = ""; try { const d = t.build(); prev = window.RCW_IO.previewSVG(d.pages[0], 300, 134); } catch (e) { prev = ""; } return `<button type="button" class="tpl" data-tpl="${t.id}"><div class="prev">${prev}</div><div class="info"><span class="tag" style="${t.level === "LLD" ? "background:#eee7fb;color:#5b2ec4" : ""}">${t.level}</span><b>${U.esc(t.name)}</b><span>${U.esc(t.desc)}</span></div></button>`; }).join("");
    $$("#tplGrid .tpl").forEach(b => b.addEventListener("click", () => { if (S.dirty && S.page.nodes.length > 3 && !confirm("Start a new diagram from this template? Your current diagram stays in your browser's local history only if you have downloaded it. Continue?")) return; newDoc(b.dataset.tpl); closeModal("templatesModal"); showToast("Template loaded - double-click any shape to rename it"); }));
  }

  /* ------------------------------------------------------------------ init */
  function init() {
    svg = $("#canvas"); gWorld = $("#world"); gScene = $("#scene"); gOverlay = $("#overlay"); gGrid = $("#grid"); gPage = $("#page"); defs = $("#dyn-defs"); wrap = $("#canvasWrap"); toast = $("#toast");
    buildLibrary();
    // restore or new
    let restored = false;
    try { const raw = localStorage.getItem(C.STORAGE_KEY); if (raw) { const d = JSON.parse(raw); if (d && d.pages && d.pages.length) { loadDoc(d); restored = true; } } } catch (e) { }
    if (!restored) { newDoc("blank-hld"); }
    buildTemplates();
    if (!restored || S.doc.pages.every(p => p.nodes.length <= 3)) openModal("templatesModal");
    else showToast("Restored your last diagram from this browser");
    fitToPage(); setTool("select");
    svg.addEventListener("pointerdown", ev => { onTouchPtrDown(ev); if (!pinch) onPointerDown(ev); });
    svg.addEventListener("pointermove", ev => { onTouchPtrMove(ev); if (!pinch) onPointerMove(ev); });
    svg.addEventListener("pointerup", ev => { onTouchPtrUp(ev); onPointerUp(ev); }); svg.addEventListener("pointercancel", ev => { onTouchPtrUp(ev); ptrDown = null; S.marquee = null; S.connectDraft = null; renderOverlay(); });
    svg.addEventListener("dblclick", onDblClick); svg.addEventListener("wheel", onWheel, { passive: false }); svg.addEventListener("contextmenu", onContextMenu);
    svg.addEventListener("pointerleave", () => { if (!ptrDown && S.hoverNode) { S.hoverNode = null; renderOverlay(); } });
    svg.addEventListener("click", ev => { const se = ev.target.closest(".shape"); if (se && (ev.ctrlKey || ev.metaKey) && se.dataset.link) { const l = se.dataset.link; if (l.startsWith("#")) { const i = S.doc.pages.findIndex(p => p.name.toLowerCase() === l.slice(1).toLowerCase()); if (i >= 0) switchPage(i); } else if (/^https?:\/\//i.test(l)) window.open(l, "_blank", "noopener"); } });
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", ev => { if (!ev.target.closest(".dropdown")) closeMenus(); if (!ev.target.closest("#ctx")) hideCtx(); });
    $("#textEditor").addEventListener("blur", () => finishTextEdit());
    window.addEventListener("resize", () => { renderOverlay(); });
    window.addEventListener("beforeunload", () => persist());
    // toolbar
    $$("[data-tool]").forEach(b => b.addEventListener("click", () => setTool(b.dataset.tool)));
    $("#btnUndo").addEventListener("click", undo); $("#btnRedo").addEventListener("click", redo);
    $("#btnZoomIn").addEventListener("click", () => setZoom(S.zoom * 1.2)); $("#btnZoomOut").addEventListener("click", () => setZoom(S.zoom / 1.2)); $("#btnFit").addEventListener("click", fitToPage); $("#btnFitC").addEventListener("click", fitToContent); $("#zoomVal").addEventListener("click", () => setZoom(1));
    $("#tglGrid").addEventListener("click", () => { S.doc.settings.grid = !S.doc.settings.grid; drawGrid(); syncToolbar(); schedulePersist(); });
    $("#tglSnap").addEventListener("click", () => { S.doc.settings.snap = !S.doc.settings.snap; syncToolbar(); schedulePersist(); });
    $("#tglGuides").addEventListener("click", () => { S.doc.settings.guides = !S.doc.settings.guides; syncToolbar(); schedulePersist(); });
    $("#tglDetail").addEventListener("click", () => { S.doc.settings.hideDetail = !S.doc.settings.hideDetail; renderAll(); syncToolbar(); schedulePersist(); showToast(S.doc.settings.hideDetail ? "HLD view: LLD detail (sub-labels, attributes, port labels) hidden on HLD pages" : "Showing all detail"); });
    $$("#segLevel button").forEach(b => b.addEventListener("click", () => { S.page.level = b.dataset.level; renderAll(); syncToolbar(); renderPages(); schedulePersist(); }));
    $$("[data-align-act]").forEach(b => b.addEventListener("click", () => align(b.dataset.alignAct)));
    $$("[data-dist]").forEach(b => b.addEventListener("click", () => distribute(b.dataset.dist)));
    $$("[data-z]").forEach(b => b.addEventListener("click", () => zorder(b.dataset.z)));
    $$("[data-size]").forEach(b => b.addEventListener("click", () => sameSize(b.dataset.size)));
    $("#btnGroup").addEventListener("click", groupSel); $("#btnUngroup").addEventListener("click", ungroupSel); $("#btnLock").addEventListener("click", toggleLock); $("#btnLayout").addEventListener("click", autoLayout);
    $("#btnDelete").addEventListener("click", deleteSelection); $("#btnDup").addEventListener("click", () => duplicateSelection(20, 20));
    $$(".dropdown > button").forEach(b => b.addEventListener("click", ev => { ev.stopPropagation(); const m = b.nextElementSibling; const open = m.classList.contains("open"); closeMenus(); if (!open) { m.classList.add("open"); b.setAttribute("aria-expanded", "true"); } }));
    $$(".menu").forEach(m => m.addEventListener("click", () => closeMenus()));
    $("#docTitle").addEventListener("change", e => { S.doc.meta.title = e.target.value; renderAll(); schedulePersist(); });
    $("#btnNew").addEventListener("click", () => openModal("templatesModal")); $("#btnTemplates").addEventListener("click", () => openModal("templatesModal"));
    $("#btnExport").addEventListener("click", () => { window.RCW_IO.prepareExportModal(); openModal("exportModal"); });
    $("#btnSave").addEventListener("click", () => window.RCW_IO.saveJSON()); $("#btnOpen").addEventListener("click", () => window.RCW_IO.openJSON());
    $("#btnPrint").addEventListener("click", () => window.RCW_IO.print());
    $("#btnShortcuts").addEventListener("click", () => openModal("shortcutsModal")); $("#btnAbout").addEventListener("click", () => openModal("aboutModal"));
    $("#btnChecks").addEventListener("click", () => { openProps(); window.RCW_CHECKS.run(true); });
    $("#btnClearLocal").addEventListener("click", () => { if (confirm("Clear the locally saved diagram from this browser and start blank? Download a copy first if you need it.")) { localStorage.removeItem(C.STORAGE_KEY); newDoc("blank-hld"); closeAllModals(); showToast("Local data cleared"); } });
    $$("[data-close]").forEach(b => b.addEventListener("click", () => closeModal(b.closest(".modal-backdrop"))));
    $$(".modal-backdrop").forEach(m => { m.addEventListener("pointerdown", ev => { if (ev.target === m) closeModal(m); }); m.addEventListener("keydown", ev => { if (ev.key === "Escape") { closeModal(m); ev.stopPropagation(); } if (ev.key === "Tab") { const f = $$("button:not([disabled]),input,select,textarea,[href]", m).filter(x => x.offsetParent); if (!f.length) return; if (ev.shiftKey && document.activeElement === f[0]) { f[f.length - 1].focus(); ev.preventDefault(); } else if (!ev.shiftKey && document.activeElement === f[f.length - 1]) { f[0].focus(); ev.preventDefault(); } } }); });
    $("#btnToggleLib").addEventListener("click", () => { const w = $("#workspace"); if (window.matchMedia("(max-width:980px)").matches) { w.classList.toggle("lib-open"); w.classList.remove("props-open"); } else w.classList.toggle("lib-closed"); renderOverlay(); });
    $("#btnToggleProps").addEventListener("click", () => { const w = $("#workspace"); if (window.matchMedia("(max-width:980px)").matches) { w.classList.toggle("props-open"); w.classList.remove("lib-open"); } else w.classList.toggle("props-closed"); renderOverlay(); });
    $("#libClose").addEventListener("click", () => { const w = $("#workspace"); w.classList.remove("lib-open"); if (!window.matchMedia("(max-width:980px)").matches) w.classList.add("lib-closed"); });
    $("#propsClose").addEventListener("click", () => { const w = $("#workspace"); w.classList.remove("props-open"); if (!window.matchMedia("(max-width:980px)").matches) w.classList.add("props-closed"); });
    $("#hintTemplates").addEventListener("click", () => openModal("templatesModal")); $("#hintLib").addEventListener("click", () => { $("#workspace").classList.add("lib-open"); $("#workspace").classList.remove("lib-closed"); $("#libSearch").focus(); });
    $("#checksAuto").addEventListener("change", () => { if ($("#checksAuto").checked) window.RCW_CHECKS.run(false); });
    // file drop (JSON / images)
    wrap.addEventListener("dragover", ev => { ev.preventDefault(); }); wrap.addEventListener("drop", ev => { ev.preventDefault(); const f = ev.dataTransfer.files && ev.dataTransfer.files[0]; if (!f) return; if (/\.json$/i.test(f.name) || /\.rcwna$/i.test(f.name)) window.RCW_IO.loadFile(f); else if (/^image\//.test(f.type)) { const w = clientToWorld(ev.clientX, ev.clientY); begin(); const n = addNode("image", w.x, w.y); const rd = new FileReader(); rd.onload = () => { n.props.src = rd.result; commit("image"); }; rd.readAsDataURL(f); } });
  }

  window.RCW_EDITOR = { init, newDoc, loadDoc, persist, commit, begin, undo, redo, renderAll, renderPages, fitToPage, fitToContent, setZoom, showToast, announce, openModal, closeModal, closeAllModals, addNode, selNodes, contentBounds, switchPage, openProps, autosizeText };
  document.addEventListener("DOMContentLoaded", init);
})();
