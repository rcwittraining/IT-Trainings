/* RCW - NetArchitect : import / export (SVG, PNG, JPEG, PDF/print, JSON, CSV schedules) + design checks */
(function () {
  "use strict";
  const C = window.RCW_CORE, S = C.S, SH = C.SH, U = C.U, $ = C.$, $$ = C.$$;
  const ED = () => window.RCW_EDITOR;

  function safeName(s) { return (s || "diagram").replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").slice(0, 60); }
  function download(blob, name) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
  function fileBase() { return safeName(S.doc.meta.title) + "_" + safeName(S.page.name) + "_" + (S.page.level || "HLD") + "_v" + safeName(S.doc.meta.version || "1"); }

  /* ---------------- SVG assembly (standalone, fonts embedded as system stack) ---------------- */
  function buildSVG(opts) {
    opts = opts || {};
    const prev = { page: S.page, sel: S.sel, selE: S.selEdges, hide: S.doc.settings.hideDetail };
    if (opts.page) S.page = opts.page;
    S.exporting = true;
    let x = 0, y = 0, w, h;
    const ps = C.pageSize();
    if (opts.area === "content") { const b = ED().contentBounds(); if (b) { x = b.x - 24; y = b.y - 24; w = b.w + 48; h = b.h + 48; } else { w = ps.w; h = ps.h; } }
    else { w = ps.w; h = ps.h; }
    const scene = C.sceneMarkup({ forExport: true });
    const defs = C.markerDefs(S.page.edges);
    const bg = opts.transparent ? "" : `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#ffffff"/>`;
    const m = S.doc.meta;
    const wm = opts.watermark ? `<text x="${x + w - 12}" y="${y + h - 8}" text-anchor="end" font-family="${U.FONT}" font-size="9" fill="#8fa3bf">Created with RCW - NetArchitect · www.rcwittraining.in</text>` : "";
    const cls = (m.classification || "").toLowerCase(); const banner = (opts.classBanner !== false && (cls.includes("confidential") || cls.includes("restricted"))) ? `<text x="${x + w / 2}" y="${y + 14}" text-anchor="middle" font-family="${U.FONT}" font-size="11" font-weight="800" fill="#c93c3c" letter-spacing="2">${U.esc(m.classification.toUpperCase())}</text>` : "";
    const title = U.esc(m.title || "Diagram") + " - " + U.esc(S.page.name) + " (" + (S.page.level || "HLD") + ")";
    const desc = U.esc(m.description || `${S.page.level || "HLD"} diagram created with RCW - NetArchitect`);
    const meta = `<metadata><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dc="http://purl.org/dc/elements/1.1/"><rdf:Description><dc:title>${title}</dc:title><dc:creator>${U.esc(m.author || "")}</dc:creator><dc:date>${U.esc(m.date || "")}</dc:date><dc:description>${desc}</dc:description><dc:rights>${U.esc(m.org || "")} · Classification: ${U.esc(m.classification || "")}</dc:rights><dc:publisher>RCW - NetArchitect (www.rcwittraining.in)</dc:publisher></rdf:Description></rdf:RDF></metadata>`;
    const svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}" role="img" aria-labelledby="t d"><title id="t">${title}</title><desc id="d">${desc}</desc>${meta}<defs>${defs}</defs>${bg}<g>${scene}</g>${banner}${wm}</svg>`;
    S.exporting = false;
    S.page = prev.page; S.doc.settings.hideDetail = prev.hide;
    return { svg, w, h };
  }
  function previewSVG(page, w, h) {
    const prev = S.page; S.page = page; S.exporting = true;
    const ps = C.pageSize(); const scene = C.sceneMarkup({ forExport: true }); const defs = C.markerDefs(page.edges);
    S.exporting = false; S.page = prev;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ps.w} ${ps.h}" width="${w}" height="${h}" aria-hidden="true"><defs>${defs}</defs><rect width="${ps.w}" height="${ps.h}" fill="#fff"/>${scene}</svg>`;
  }

  /* ---------------- raster export ---------------- */
  function rasterize(svgText, w, h, scale, type, quality, bgWhite) {
    return new Promise((resolve, reject) => {
      const img = new Image(); const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" }); const url = URL.createObjectURL(blob);
      img.onload = () => {
        const cv = document.createElement("canvas"); const MAX = 16384; let sc = scale; if (w * sc > MAX || h * sc > MAX) sc = Math.min(MAX / w, MAX / h);
        cv.width = Math.round(w * sc); cv.height = Math.round(h * sc); const ctx = cv.getContext("2d");
        if (bgWhite || type === "image/jpeg") { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height); }
        ctx.drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url);
        cv.toBlob(b => b ? resolve(b) : reject(new Error("Canvas export failed")), type, quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not render SVG")); };
      img.src = url;
    });
  }

  /* ---------------- export modal ---------------- */
  function prepareExportModal() {
    $("#expTitle").textContent = `${S.doc.meta.title || "Diagram"} · ${S.page.name}`;
    const sel = $("#expPages"); sel.innerHTML = `<option value="current">Current page only (${U.esc(S.page.name)})</option><option value="all">All ${S.doc.pages.length} page(s) - separate files</option>`;
    updateExportInfo();
  }
  function updateExportInfo() {
    const fmt = $$("input[name=expFmt]").find(r => r.checked).value; const scale = +$("#expScale").value; const area = $$("input[name=expArea]").find(r => r.checked).value;
    let w, h; if (area === "content") { const b = ED().contentBounds(); w = b ? b.w + 48 : C.pageSize().w; h = b ? b.h + 48 : C.pageSize().h; } else { w = C.pageSize().w; h = C.pageSize().h; }
    $("#expInfo").textContent = fmt === "svg" ? `Vector SVG · ${Math.round(w)} × ${Math.round(h)} px · infinitely scalable` : fmt === "pdf" ? "Opens your browser's print dialog - choose 'Save as PDF'. Page size follows the diagram (A3/A4 …)." : fmt === "json" ? "RCW NetArchitect JSON - re-open later to keep editing (all pages included)." : fmt === "csv" ? "CSV schedules: shapes (inventory) + connectors (connection schedule) - handy for LLD documents." : `${fmt.toUpperCase()} · ${Math.round(w * scale)} × ${Math.round(h * scale)} px @ ${scale}× (${Math.round(96 * scale)} dpi)`;
    $("#expRaster").style.display = fmt === "png" || fmt === "jpg" ? "" : "none"; $("#expTransparentRow").style.display = fmt === "png" || fmt === "svg" ? "" : "none";
  }
  async function doExport() {
    const fmt = $$("input[name=expFmt]").find(r => r.checked).value; const scale = +$("#expScale").value; const area = $$("input[name=expArea]").find(r => r.checked).value; const transparent = $("#expTransparent").checked; const wmk = $("#expWatermark").checked; const pagesMode = $("#expPages").value;
    const pages = pagesMode === "all" ? S.doc.pages : [S.page];
    const btn = $("#expGo"); btn.disabled = true; btn.textContent = "Exporting…";
    try {
      if (fmt === "json") { saveJSON(); }
      else if (fmt === "csv") { exportCSV(pages); }
      else if (fmt === "pdf") { print(pagesMode === "all"); }
      else {
        for (const p of pages) {
          const prevPage = S.page; S.page = p;
          const { svg, w, h } = buildSVG({ area, transparent, watermark: wmk });
          const base = fileBase(); S.page = prevPage;
          if (fmt === "svg") download(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), base + ".svg");
          else { const blob = await rasterize(svg, w, h, scale, fmt === "png" ? "image/png" : "image/jpeg", 0.92, !transparent); download(blob, base + (fmt === "png" ? ".png" : ".jpg")); }
          if (pages.length > 1) await new Promise(r => setTimeout(r, 400));
        }
      }
      ED().showToast("Export complete - check your downloads");
      ED().closeModal("exportModal");
    } catch (e) { console.error(e); ED().showToast("Export failed: " + e.message, 5000); }
    btn.disabled = false; btn.textContent = "Download";
  }

  /* ---------------- JSON ---------------- */
  function saveJSON() {
    S.doc.activePage = S.doc.pages.indexOf(S.page); S.doc.savedAt = new Date().toISOString(); S.doc.generator = "RCW - NetArchitect 1.0 (www.rcwittraining.in)";
    const clean = JSON.parse(JSON.stringify(S.doc, (k, v) => k.startsWith("_") ? undefined : v));
    download(new Blob([JSON.stringify(clean, null, 1)], { type: "application/json" }), safeName(S.doc.meta.title) + ".rcwna.json");
    S.dirty = false; ED().persist(); ED().showToast("Diagram downloaded as JSON - keep it to re-open later");
  }
  function openJSON() { const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".json,.rcwna,application/json"; inp.onchange = () => { if (inp.files[0]) loadFile(inp.files[0]); }; inp.click(); }
  function loadFile(f) {
    if (f.size > 25 * 1024 * 1024) { ED().showToast("File too large (max 25 MB)"); return; }
    const rd = new FileReader(); rd.onload = () => {
      try { const d = JSON.parse(rd.result); validateDoc(d); if (S.dirty && S.page.nodes.length > 3 && !confirm("Replace the current diagram with the opened file?")) return; ED().loadDoc(d); S.undo = []; S.redo = []; ED().fitToPage(); ED().persist(); ED().closeAllModals(); ED().showToast(`Opened "${d.meta.title}"`); }
      catch (e) { ED().showToast("Could not open file: " + e.message, 5000); }
    }; rd.readAsText(f);
  }
  // strict schema validation - protects against malformed / hostile files (no eval, no HTML injection: all text is escaped on render)
  function validateDoc(d) {
    if (!d || typeof d !== "object") throw new Error("not a JSON object");
    if (d.app !== "RCW-NetArchitect") throw new Error("not an RCW NetArchitect file");
    if (!Array.isArray(d.pages) || !d.pages.length) throw new Error("no pages");
    if (d.pages.length > 50) throw new Error("too many pages");
    d.meta = Object.assign({ title: "Untitled", level: "HLD", author: "", org: "", version: "0.1", date: "", status: "Draft", classification: "Internal", description: "", standard: "RCW notation v1" }, d.meta || {});
    Object.keys(d.meta).forEach(k => { if (typeof d.meta[k] !== "string") d.meta[k] = String(d.meta[k] == null ? "" : d.meta[k]).slice(0, 500); else d.meta[k] = d.meta[k].slice(0, 500); });
    const num = (v, def) => (typeof v === "number" && isFinite(v)) ? v : def;
    d.pages.forEach(p => {
      if (!Array.isArray(p.nodes)) p.nodes = []; if (!Array.isArray(p.edges)) p.edges = [];
      if (p.nodes.length > 5000 || p.edges.length > 5000) throw new Error("page too large");
      p.id = String(p.id || C.uid("p")); p.name = String(p.name || "Page").slice(0, 80); p.level = p.level === "LLD" ? "LLD" : "HLD";
      const ids = new Set();
      p.nodes = p.nodes.filter(n => n && typeof n === "object" && SH.get(n.type)).map(n => {
        const s = SH.get(n.type); const o = { id: String(n.id || C.uid("n")), type: n.type, x: num(n.x, 0), y: num(n.y, 0), w: Math.max(4, num(n.w, s.w)), h: Math.max(4, num(n.h, s.h)), label: String(n.label == null ? "" : n.label).slice(0, 2000), sub: String(n.sub || "").slice(0, 500), style: {}, parent: n.parent ? String(n.parent) : null, locked: !!n.locked, props: {}, attrs: [], z: num(n.z, 0), link: n.link ? String(n.link).slice(0, 500) : "" };
        if (o.link && !/^(https?:\/\/|#)/i.test(o.link)) o.link = "";
        if (n.style && typeof n.style === "object") Object.keys(n.style).forEach(k => { const v = n.style[k]; if (typeof v === "number" && isFinite(v)) o.style[k] = v; else if (typeof v === "boolean") o.style[k] = v; else if (typeof v === "string" && v.length < 60 && !/[<>"']/.test(v)) o.style[k] = v; });
        if (n.props && typeof n.props === "object") { if (typeof n.props.rows === "string") o.props.rows = n.props.rows.slice(0, 20000); if (typeof n.props.auto === "boolean") o.props.auto = n.props.auto; if (typeof n.props.src === "string" && /^data:image\/(png|jpeg|gif|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(n.props.src) && n.props.src.length < 4e6) o.props.src = n.props.src; }
        if (Array.isArray(n.attrs)) o.attrs = n.attrs.slice(0, 40).map(a => ({ k: String(a && a.k || "").slice(0, 80), v: String(a && a.v || "").slice(0, 200) }));
        ids.add(o.id); return o;
      });
      p.nodes.forEach(n => { if (n.parent && !ids.has(n.parent)) n.parent = null; });
      p.edges = p.edges.filter(e => e && e.from && e.to && ids.has(String(e.from.node)) && ids.has(String(e.to.node))).map(e => {
        const o = { id: String(e.id || C.uid("e")), from: { node: String(e.from.node), port: ["n", "e", "s", "w"].includes(e.from.port) ? e.from.port : "auto" }, to: { node: String(e.to.node), port: ["n", "e", "s", "w"].includes(e.to.port) ? e.to.port : "auto" }, points: Array.isArray(e.points) ? e.points.slice(0, 20).map(pt => ({ x: num(pt.x, 0), y: num(pt.y, 0) })) : [], label: String(e.label || "").slice(0, 500), srcLabel: String(e.srcLabel || "").slice(0, 120), dstLabel: String(e.dstLabel || "").slice(0, 120), style: {}, preset: C.PRESETS[e.preset] ? e.preset : "link", attrs: [], labelT: num(e.labelT, 0.5) };
        if (e.style && typeof e.style === "object") Object.keys(e.style).forEach(k => { const v = e.style[k]; if (typeof v === "number" && isFinite(v)) o.style[k] = v; else if (typeof v === "boolean") o.style[k] = v; else if (typeof v === "string" && v.length < 60 && !/[<>"']/.test(v)) o.style[k] = v; });
        if (Array.isArray(e.attrs)) o.attrs = e.attrs.slice(0, 40).map(a => ({ k: String(a && a.k || "").slice(0, 80), v: String(a && a.v || "").slice(0, 200) }));
        return o;
      });
    });
    d.settings = Object.assign({ grid: true, snap: true, gridSize: 20, guides: true, hideDetail: false, page: { size: "A3", orientation: "landscape" } }, d.settings && typeof d.settings === "object" ? d.settings : {});
    if (!C.PAGE_SIZES[d.settings.page?.size]) d.settings.page = { size: "A3", orientation: "landscape" };
    d.activePage = num(d.activePage, 0);
  }

  /* ---------------- CSV schedules ---------------- */
  function csvEsc(v) { v = String(v == null ? "" : v); return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; }
  function exportCSV(pages) {
    const attrKeys = new Set(), eAttrKeys = new Set();
    pages.forEach(p => { p.nodes.forEach(n => (n.attrs || []).forEach(a => a.k && attrKeys.add(a.k))); p.edges.forEach(e => (e.attrs || []).forEach(a => a.k && eAttrKeys.add(a.k))); });
    const ak = [...attrKeys], ek = [...eAttrKeys];
    let inv = ["Page", "Level", "ID", "Type", "Category", "Label", "Sub-label", "Inside container", "X", "Y", "W", "H", ...ak].map(csvEsc).join(",") + "\n";
    pages.forEach(p => p.nodes.forEach(n => { const s = SH.get(n.type); if (!s || s.kind === "special" || s.kind === "text") return; const parent = n.parent ? (p.nodes.find(x => x.id === n.parent) || {}).label || "" : ""; const am = {}; (n.attrs || []).forEach(a => am[a.k] = a.v); inv += [p.name, p.level, n.id, s.name, s.cat, n.label.replace(/\n/g, " "), n.sub, parent.replace(/\n/g, " "), Math.round(n.x), Math.round(n.y), Math.round(n.w), Math.round(n.h), ...ak.map(k => am[k] || "")].map(csvEsc).join(",") + "\n"; }));
    let con = ["Page", "ID", "From", "From port label", "To", "To port label", "Label", "Media / type", "Routing", ...ek].map(csvEsc).join(",") + "\n";
    pages.forEach(p => p.edges.forEach(e => { const a = p.nodes.find(n => n.id === e.from.node), b = p.nodes.find(n => n.id === e.to.node); if (!a || !b) return; const am = {}; (e.attrs || []).forEach(x => am[x.k] = x.v); con += [p.name, e.id, (a.label || a.type).replace(/\n/g, " "), e.srcLabel, (b.label || b.type).replace(/\n/g, " "), e.dstLabel, e.label.replace(/\n/g, " "), (C.PRESETS[e.preset] || C.PRESETS.link).name, (e.style || {}).router || "orthogonal", ...ek.map(k => am[k] || "")].map(csvEsc).join(",") + "\n"; }));
    const bom = "\ufeff";
    download(new Blob([bom + inv], { type: "text/csv;charset=utf-8" }), safeName(S.doc.meta.title) + "_inventory.csv");
    setTimeout(() => download(new Blob([bom + con], { type: "text/csv;charset=utf-8" }), safeName(S.doc.meta.title) + "_connections.csv"), 400);
  }

  /* ---------------- print / PDF ---------------- */
  function print(allPages) {
    const pages = allPages ? S.doc.pages : [S.page]; const area = $("#printArea");
    const ps = C.pageSize(); const size = (S.doc.settings.page.size === "Infinite" ? "A3" : S.doc.settings.page.size) + " " + (S.doc.settings.page.orientation || "landscape");
    let style = document.getElementById("printStyle"); if (!style) { style = document.createElement("style"); style.id = "printStyle"; document.head.appendChild(style); }
    style.textContent = `@page{size:${size};margin:8mm}@media print{#printArea .pg{page-break-after:always;display:flex;align-items:center;justify-content:center;height:100vh}#printArea .pg:last-child{page-break-after:auto}#printArea svg{max-width:100%;max-height:100%;width:auto;height:auto}}`;
    area.innerHTML = pages.map(p => { const prev = S.page; S.page = p; const { svg } = buildSVG({ watermark: $("#expWatermark") ? $("#expWatermark").checked : true }); S.page = prev; return `<div class="pg">${svg.replace(/^<\?xml[^>]*>\s*/, "")}</div>`; }).join("");
    ED().showToast("Use 'Save as PDF' in the print dialog", 4000);
    setTimeout(() => { window.print(); setTimeout(() => { area.innerHTML = ""; }, 2000); }, 200);
  }

  window.RCW_IO = { buildSVG, previewSVG, prepareExportModal, updateExportInfo, doExport, saveJSON, openJSON, loadFile, exportCSV, print, download, safeName };
  document.addEventListener("DOMContentLoaded", () => {
    $$("input[name=expFmt],input[name=expArea]").forEach(r => r.addEventListener("change", updateExportInfo)); $("#expScale").addEventListener("change", updateExportInfo);
    $("#expGo").addEventListener("click", doExport);
  });

  /* ======================= design / compliance checks ======================= */
  const CHECKS = {
    run(focus) {
      const out = [], p = S.page, m = S.doc.meta, level = p.level || "HLD";
      const nodes = p.nodes, edges = p.edges;
      const real = nodes.filter(n => { const s = SH.get(n.type); return s && s.kind !== "special" && s.kind !== "text"; });
      const add = (sev, msg, ids, fix) => out.push({ sev, msg, ids: ids || [], fix });
      // documentation furniture
      if (!nodes.some(n => n.type === "titleblock")) add("error", "No title block on this page (required by most design-document standards: title, version, author, date, classification).", [], { label: "Add title block", act: () => addFurniture("titleblock") });
      if (!nodes.some(n => n.type === "legend")) add("warn", "No legend / key. Readers may not know what symbols and line styles mean.", [], { label: "Add legend", act: () => addFurniture("legend") });
      if (level === "LLD" && !nodes.some(n => n.type === "revtable")) add("warn", "LLD pages should carry a revision history table.", [], { label: "Add revision table", act: () => addFurniture("revtable") });
      if (!m.title || /untitled/i.test(m.title)) add("warn", "Diagram title is empty or 'Untitled'.", [], { label: "Edit properties", act: () => { S.sel.clear(); S.selEdges.clear(); ED().renderAll(); ED().openProps(); $("#dTitle")?.focus(); } });
      if (!m.author) add("info", "Author is not set (shown in the title block).", [], { label: "Edit properties", act: () => { S.sel.clear(); S.selEdges.clear(); ED().renderAll(); ED().openProps(); $("#dAuthor")?.focus(); } });
      if (!m.version) add("warn", "Version is empty - every issued design should be versioned.");
      if (!m.classification) add("warn", "Classification (Public / Internal / Confidential / Restricted) is not set.");
      // labels
      const unl = real.filter(n => !n.label || !n.label.trim() || n.label === (SH.get(n.type).label || SH.get(n.type).name));
      if (unl.length) add(level === "LLD" ? "error" : "warn", `${unl.length} shape(s) still carry the default or empty label${level === "LLD" ? " - LLD requires unique hostnames / identifiers" : ""}.`, unl.map(n => n.id));
      // duplicates
      const seen = {}; real.forEach(n => { const k = (n.label || "").trim().toLowerCase(); if (k) (seen[k] = seen[k] || []).push(n.id); });
      const dups = Object.entries(seen).filter(([k, v]) => v.length > 1 && !/^(users?|user group|customers?|internet|wan|laptop|pc|workstation|mobile|printer|ip phones?|phones?|wi-?fi|access points?|ap|cameras?|end users?|staff|guests?)$/.test(k));
      if (dups.length) add("warn", `Duplicate labels: ${dups.slice(0, 4).map(d => `"${d[0]}"`).join(", ")}${dups.length > 4 ? "…" : ""}. Use unique names for devices.`, dups.flatMap(d => d[1]));
      // orphans
      const linked = new Set(); edges.forEach(e => { linked.add(e.from.node); linked.add(e.to.node); });
      const orph = real.filter(n => !linked.has(n.id) && !C.isContainer(n) && !["users", "user", "admin", "attacker", "branch", "datacenter", "marker"].includes(n.type));
      if (orph.length) add("info", `${orph.length} device(s) have no connections - intentional?`, orph.map(n => n.id));
      // LLD specifics
      if (level === "LLD") {
        const noPorts = edges.filter(e => { const a = nodes.find(n => n.id === e.from.node), b = nodes.find(n => n.id === e.to.node); const inf = x => x && SH.get(x.type) && ["network", "security", "compute"].includes(SH.get(x.type).cat); return inf(a) && inf(b) && !e.srcLabel && !e.dstLabel && !e.label; });
        if (noPorts.length) add("warn", `${noPorts.length} infrastructure link(s) have no interface / port or speed labels. LLD links should state both ends (e.g. Gi1/0/1 ↔ Gi1/0/48) and media/speed.`, [], { label: "Select them", act: () => { S.sel.clear(); S.selEdges = new Set(noPorts.map(e => e.id)); ED().renderAll(); } });
        const noIp = real.filter(n => ["network", "security"].includes(SH.get(n.type).cat) && !/\d+\.\d+\.\d+\.\d+|[0-9a-f:]{6,}/i.test(n.sub + " " + (n.attrs || []).map(a => a.v).join(" ") + " " + n.label));
        if (noIp.length) add("info", `${noIp.length} network/security device(s) show no management IP (add in Sub-label or LLD attributes).`, noIp.map(n => n.id));
        const noAttrs = real.filter(n => ["network", "security", "compute"].includes(SH.get(n.type).cat) && !(n.attrs || []).length && !n.sub);
        if (noAttrs.length > real.length / 2 && real.length > 2) add("info", "Most devices have no model / attributes - LLDs normally list model, firmware, role and management address.");
        if (!nodes.some(n => n.type === "table")) add("info", "No detail table on this LLD page (IP plan, VLAN plan, port map or cabling schedule).", [], { label: "Add table", act: () => addFurniture("table") });
      } else {
        // HLD: too much detail?
        const detailed = real.filter(n => (n.attrs || []).length > 2).length; if (detailed > 3) add("info", `${detailed} shapes carry detailed attributes on an HLD page. Consider moving detail to an LLD page or enable 'Hide LLD detail'.`);
        if (real.length > 60) add("info", `${real.length} shapes on one HLD page - consider splitting into multiple pages / views for readability.`);
      }
      // security-architecture sanity
      const hasInternet = real.some(n => ["internet", "wan", "cigw"].includes(n.type)); const hasFw = real.some(n => ["firewall", "waf", "cfirewall", "cwafc"].includes(n.type));
      if (hasInternet && !hasFw) add("warn", "External connectivity (Internet / WAN) is shown without any firewall / WAF enforcement point.");
      const directInet = edges.filter(e => { const a = nodes.find(n => n.id === e.from.node), b = nodes.find(n => n.id === e.to.node); if (!a || !b) return false; const isInet = x => ["internet", "wan"].includes(x.type); const isSens = x => ["database", "crdb", "cnosql", "sdb", "storage", "ad", "fileserver", "vault", "ckms", "csecrets"].includes(x.type); return (isInet(a) && isSens(b)) || (isInet(b) && isSens(a)); });
      if (directInet.length) add("error", "A data store / directory / secret store is connected directly to the Internet or WAN - insert an enforcement point.", [], { label: "Select links", act: () => { S.sel.clear(); S.selEdges = new Set(directInet.map(e => e.id)); ED().renderAll(); } });
      // accessibility / readability
      const lowContrast = []; real.forEach(n => { const st = C.nodeStyle(n); const s = SH.get(n.type); if (s.kind === "box" && st.fill && st.fill !== "none" && /^#/.test(st.fill) && /^#/.test(st.textColor)) { if (U.contrast(st.fill, st.textColor) < 4.5) lowContrast.push(n.id); } });
      if (lowContrast.length) add("warn", `${lowContrast.length} shape(s) have text/fill contrast below WCAG AA (4.5:1). Adjust text or fill colour.`, lowContrast);
      const tiny = nodes.filter(n => C.nodeStyle(n).fontSize < 8 && SH.get(n.type).kind !== "special"); if (tiny.length) add("info", `${tiny.length} label(s) use a font size under 8 px - may be unreadable when printed.`, tiny.map(n => n.id));
      // out of page
      const ps = C.pageSize(); if (S.doc.settings.page.size !== "Infinite") { const off = nodes.filter(n => n.x < 0 || n.y < 0 || n.x + n.w > ps.w || n.y + n.h > ps.h); if (off.length) add("warn", `${off.length} shape(s) extend beyond the page boundary and will be cut off in PDF / page exports.`, off.map(n => n.id)); }
      // line-style consistency: same preset with overridden colours
      const overridden = edges.filter(e => e.style && e.style.stroke && C.PRESETS[e.preset || "link"].stroke !== e.style.stroke).length; if (overridden > 0 && overridden < edges.length) add("info", `${overridden} connector(s) override their media-type colour. Consistent line styles per media type make the legend trustworthy.`);
      renderChecks(out, focus);
      return out;
    }
  };
  function addFurniture(type) {
    const ps = C.pageSize(); const s = SH.get(type); ED().begin();
    const pos = { titleblock: [ps.w - 460, ps.h - 136], legend: [40, ps.h - 160], revtable: [ps.w - 850, ps.h - 136], table: [ps.w - 460, 90] }[type] || [100, 100];
    const n = ED().addNode(type, pos[0] + s.w / 2, pos[1] + s.h / 2, {}); if (type === "titleblock") { n.w = 420; n.h = 96; } if (type === "legend") { n.w = 300; n.h = 120; n.props.auto = true; } if (type === "revtable") { n.w = 370; n.h = 96; } if (type === "table") { n.w = 420; n.h = 150; }
    S.sel = new Set([n.id]); ED().commit("add"); CHECKS.run(true);
  }
  function renderChecks(out, focus) {
    const host = $("#checksBody"); if (!host) return;
    const counts = { error: 0, warn: 0, info: 0 }; out.forEach(o => counts[o.sev]++);
    $("#checksSummary").innerHTML = out.length ? `<b style="color:${counts.error ? "#c93c3c" : counts.warn ? "#9a5b00" : "#1f9d55"}">${counts.error} error · ${counts.warn} warning · ${counts.info} info</b> on page "${U.esc(S.page.name)}" (${S.page.level || "HLD"})` : `<b style="color:#1f9d55">✓ All checks passed</b> for page "${U.esc(S.page.name)}"`;
    host.innerHTML = out.map((o, i) => `<li class="${o.sev}"><span class="sev">${o.sev === "warn" ? "WARN" : o.sev.toUpperCase()}</span><span>${U.esc(o.msg)}</span>${o.ids.length ? `<button type="button" data-ci="${i}">Show</button>` : o.fix ? `<button type="button" data-cf="${i}">${U.esc(o.fix.label)}</button>` : ""}</li>`).join("");
    $$("#checksBody [data-ci]").forEach(b => b.addEventListener("click", () => { const o = out[+b.dataset.ci]; S.sel = new Set(o.ids.filter(id => C.nodeById(id))); S.selEdges.clear(); ED().renderAll(); if (S.sel.size) { const b2 = ED().contentBounds([...S.sel].map(C.nodeById)); } }));
    $$("#checksBody [data-cf]").forEach(b => b.addEventListener("click", () => out[+b.dataset.cf].fix.act()));
    $("#checksBadge").textContent = out.length ? String(out.length) : "✓"; $("#checksBadge").style.background = counts.error ? "#fde8e8" : counts.warn ? "#fff3df" : "#e4f6ea"; $("#checksBadge").style.color = counts.error ? "#c93c3c" : counts.warn ? "#9a5b00" : "#1f9d55";
    if (focus) { const d = $("#checksDetails"); d.open = true; d.scrollIntoView({ block: "nearest" }); }
  }
  window.RCW_CHECKS = CHECKS;
})();
