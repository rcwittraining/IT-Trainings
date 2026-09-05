/* ==========================================================================
   RCW Lab Framework — shared engine for the Microsoft Defender console labs
   --------------------------------------------------------------------------
   Responsibilities
     1. Portal chrome behaviour (nav, tabs, routing, mobile drawer).
     2. Guided objectives: declarative validation, scoring, gating, progress.
     3. Learner-controlled state only: everything persists to localStorage in
        this browser. No accounts, no servers, no analytics of lab answers.
     4. Tamper-evident audit trail of every action the learner takes in the
        simulated console, exportable as redacted JSON evidence.
     5. Compliance gate shown before the lab accepts any input.
   ========================================================================== */
(function (global) {
  'use strict';

  var VERSION = '2026.09';
  var doc = global.document;
  var STORE = 'rcw.defender-lab.';
  var $ = function (sel, root) { return (root || doc).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); };
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function stamp(ts) {
    var d = new Date(ts);
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + ' ' +
      pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds()) + 'Z';
  }
  function hash(str) { var h = 5381; for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0; return h; }
  function code(str) { return ('000000' + hash(str).toString(36).toUpperCase()).slice(-6); }

  /* ------------------------------------------------------ PII redaction */
  var EMAIL = /[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+\.)+[A-Za-z]{2,}/g;
  var IPV4 = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
  var HEXHASH = /\b[0-9a-f]{8,}\b/gi;
  var GUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
  /* RFC 5737 documentation + RFC 2606 example ranges stay readable on purpose */
  var DOC_NET = /^(203\.0\.113\.|192\.0\.2\.|198\.51\.100\.|192\.0\.0\.)/;
  var DOC_DOMAIN = /(\.example|\.test|\.invalid|\.localhost|contoso)/i;

  function redact(text) {
    var s = String(text == null ? '' : text);
    s = s.replace(EMAIL, function (m) { return DOC_DOMAIN.test(m) ? m : '[redacted-upn]'; });
    s = s.replace(IPV4, function (m) { return DOC_NET.test(m) ? m : '[redacted-ip]'; });
    s = s.replace(GUID, function (m) { return /^[0-9a-f-]{36}$/.test(m) ? '[redacted-guid]' : m; });
    s = s.replace(/(sha1|md5)?\s*[:=]\s*[0-9a-f]{32,}/gi, 'fileHash: [redacted-hash]');
    s = s.replace(HEXHASH, function (m) { return m.length >= 32 ? '[redacted-hash]' : m; });
    return s;
  }

  /* ------------------------------------------------------------ storage */
  function load(id) {
    var out = { v: 1, learner: '', acceptedAt: null, done: {}, audit: [], visits: 0, answers: {}, flags: [] };
    try {
      var raw = global.localStorage.getItem(STORE + id);
      if (raw) { var p = JSON.parse(raw); if (p && typeof p === 'object') out = Object.assign(out, p); }
    } catch (e) { /* private mode / disabled storage: lab still runs, nothing is lost silently */ out.storageBlocked = true; }
    out.visits = (out.visits || 0) + 1;
    return out;
  }
  function save() {
    if (!cfg || !state) return;
    try { global.localStorage.setItem(STORE + cfg.labId, JSON.stringify(state)); } catch (e) { state.storageBlocked = true; }
  }

  var cfg = null, state = null, api = {};

  /* --------------------------------------------------------------- toast */
  function toast(title, body, tone) {
    var region = $('#rcwToast');
    if (!region) {
      region = doc.createElement('div');
      region.id = 'rcwToast';
      region.className = 'toast-region';
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', 'polite');
      doc.body.appendChild(region);
    }
    var el = doc.createElement('div');
    el.className = 'toast';
    if (tone) el.setAttribute('data-tone', tone);
    el.innerHTML = '<b>' + esc(title) + '</b>' + (body ? '<div>' + esc(body) + '</div>' : '');
    region.appendChild(el);
    global.setTimeout(function () { el.remove(); }, tone === 'error' ? 8000 : 5200);
  }

  /* ------------------------------------------------------------ the log */
  function log(action, detail, level) {
    if (!state) return;
    var entry = { ts: new Date().toISOString(), action: String(action || ''), detail: redact(String(detail || '')), level: level || 'info' };
    state.audit.unshift(entry);
    if (state.audit.length > 400) state.audit.length = 400;
    renderAudit();
    save();
    return entry;
  }

  function renderAudit() {
    var list = $('#rcwAuditList');
    if (!list) return;
    var rows = state.audit.slice(0, 120);
    list.innerHTML = rows.length ? rows.map(function (e) {
      var tone = e.level === 'warn' ? 'sev-medium' : e.level === 'blocked' ? 'sev-high' : e.level === 'done' ? 'sev-low' : 'sev-info';
      return '<tr><td class="mono">' + esc(stamp(Date.parse(e.ts))) + '</td>' +
        '<td><span class="chip plain ' + tone + '">' + esc(e.level) + '</span></td>' +
        '<td><b>' + esc(e.action) + '</b>' + (e.detail ? '<span class="sub">' + esc(e.detail) + '</span>' : '') + '</td></tr>';
    }).join('') : '<tr><td colspan="3" class="muted">No actions recorded yet. Every control you use in this console is written here.</td></tr>';
    var c = $('#rcwAuditCount'); if (c) c.textContent = String(state.audit.length);
  }

  function evidencePack() {
    var doneList = Object.keys(state.done).filter(function (k) { return state.done[k] && state.done[k].complete; });
    return {
      kind: 'RCW IT Training practice-lab evidence record',
      schema: 'rcw.defender-lab.evidence/1.0',
      lab: { id: cfg.labId, title: cfg.title, frameworkVersion: VERSION },
      generatedAt: new Date().toISOString(),
      learner: state.learner ? state.learner : '[not provided]',
      authorization: { acceptedAt: state.acceptedAt, basis: 'lab acceptable-use + synthetic data only' },
      score: totalScore(),
      objectives: (cfg.objectives || []).map(function (o) {
        var d = state.done[o.id] || {};
        return { id: o.id, title: o.title, points: o.points, complete: !!d.complete, completedAt: d.at || null, evidence: d.evidence || [], notes: d.notes || '' };
      }),
      controls: cfg.controls || [],
      auditEvents: state.audit.length,
      audit: state.audit.slice(0, 200),
      integrity: { verifyCode: verifyCode(), note: 'Self-attested practice evidence. Not a Microsoft certification and not an audit record for any production system.' },
      synthetic: true
    };
  }

  function verifyCode() {
    return 'RCW-DEF-' + code(JSON.stringify({ l: cfg.labId, n: state.learner, s: totalScore(), d: Object.keys(state.done).sort().join(','), t: state.acceptedAt || '' }));
  }

  function download(name, text, mime) {
    try {
      var blob = new Blob([text], { type: mime || 'application/json;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = doc.createElement('a');
      a.href = url; a.download = name; a.style.display = 'none';
      doc.body.appendChild(a); a.click();
      global.setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 400);
      return true;
    } catch (e) { return false; }
  }

  /* --------------------------------------------------------------- score */
  function totalScore() {
    var sum = 0;
    (cfg.objectives || []).forEach(function (o) { var d = state.done[o.id]; if (d && d.complete) sum += o.points || 0; });
    return Math.min(100, sum);
  }
  function doneCount() {
    return (cfg.objectives || []).filter(function (o) { return state.done[o.id] && state.done[o.id].complete; }).length;
  }

  function renderProgress() {
    var objs = cfg.objectives || [], n = doneCount(), pct = Math.round((n / Math.max(1, objs.length)) * 100);
    var pl = $('#progressLabel'); if (pl) pl.textContent = n + ' of ' + objs.length + ' objectives complete';
    var sl = $('#scoreLabel'); if (sl) sl.textContent = 'Score: ' + totalScore() + ' / 100';
    var bar = $('#progressBar'); if (bar) bar.style.width = pct + '%';
    var track = $('.progress-track'); if (track) track.setAttribute('aria-valuenow', String(pct));
    $$('[data-task-badge]').forEach(function (b) {
      var id = b.getAttribute('data-task-badge'), o = findObj(id);
      if (!o) return;
      var complete = !!(state.done[id] && state.done[id].complete);
      b.classList.toggle('is-done', complete);
      b.textContent = complete ? '\u2713' : (o.shortLabel || String(objs.indexOf(o) + 1));
      b.setAttribute('title', complete ? 'Objective complete' : 'Objective ' + (objs.indexOf(o) + 1) + ': ' + o.title);
    });
    $$('[data-objective-status]').forEach(function (el) {
      var id = el.getAttribute('data-objective-status'), o = findObj(id);
      if (!o) return;
      var complete = !!(state.done[id] && state.done[id].complete);
      var locked = o.requires && o.requires.length && !o.requires.every(function (r) { return state.done[r] && state.done[r].complete; });
      el.setAttribute('data-state', complete ? 'done' : locked ? 'blocked' : 'todo');
      el.innerHTML = complete
        ? '<span aria-hidden="true">\u2713</span> Complete · +' + o.points + ' pts'
        : locked ? '<span aria-hidden="true">\u25fb</span> Locked' : '<span aria-hidden="true">\u25cb</span> Required · ' + o.points + ' pts';
      el.className = (el.className || '').replace(/is-done/g, '') + (complete ? ' is-done' : '');
      var badge = el.classList.contains('obj-badge') ? el : null;
      if (badge) badge.classList.toggle('is-done', complete);
    });
    $$('[data-lock-note]').forEach(function (el) {
      var id = el.getAttribute('data-lock-note'), o = findObj(id);
      if (!o) return;
      var locked = o.requires && o.requires.length && !o.requires.every(function (r) { return state.done[r] && state.done[r].complete; });
      el.hidden = !locked;
    });
    var comp = $('#rcwCompletion');
    if (comp) {
      var allDone = n === objs.length && objs.length > 0;
      comp.hidden = !allDone;
      if (allDone) renderCompletion();
    }
    $$('[data-score]').forEach(function (el) { el.textContent = String(totalScore()); });
    $$('[data-next-lab]').forEach(function (el) {
      var next = (cfg.objectives || []).filter(function (o) { return !(state.done[o.id] && state.done[o.id].complete); })[0];
      el.hidden = !next || !!(state.done[next.id] && state.done[next.id].complete);
      if (next) {
        el.textContent = 'Next objective: ' + (next.navLabel || next.title);
        el.setAttribute('data-route', next.view || '');
        el.setAttribute('data-goto', next.id);
      }
    });
  }
  function findObj(id) { return (cfg.objectives || []).filter(function (o) { return o.id === id; })[0]; }

  function renderCompletion() {
    var box = $('#rcwCompletionBody');
    if (!box || box.getAttribute('data-rendered') === 'yes') return;
    var v = verifyCode();
    box.innerHTML =
      '<div class="grid-4" style="margin-bottom:12px">' +
      '<div class="stat"><div class="n green">' + totalScore() + '<span style="font-size:14px">/100</span></div><div class="lbl">Final score</div></div>' +
      '<div class="stat"><div class="n">' + (cfg.objectives || []).length + '</div><div class="lbl">Objectives evidenced</div></div>' +
      '<div class="stat"><div class="n">' + state.audit.length + '</div><div class="lbl">Logged actions</div></div>' +
      '<div class="stat"><div class="n" style="font-size:15px;padding-top:8px" id="rcwVerify">' + esc(v) + '</div><div class="lbl">Self-attestation code</div></div>' +
      '</div>' +
      '<p class="small"><strong>Record:</strong> ' + esc(cfg.title) + ' · learner <em>' + esc(state.learner || '[not provided]') +
      '</em> · completed ' + esc(stamp(Date.now())) + ' · browser-local record. This is independent RCW IT Training practice material: it is not a Microsoft credential, not tied to any tenant, and contains no production data.</p>' +
      '<div class="btn-group">' +
      '<button class="btn btn--primary" type="button" data-evidence="download">Download evidence pack (JSON)</button>' +
      '<button class="btn" type="button" data-evidence="copy">Copy summary</button>' +
      '<button class="btn" type="button" data-evidence="print">Print / save as PDF</button>' +
      '</div>';
    box.setAttribute('data-rendered', 'yes');
  }

  /* ==================================================== check engine == */
  function val(id) {
    var el = doc.getElementById(id);
    if (!el) return null;
    if (el.type === 'checkbox') return el.checked;
    if (el.type === 'radio') { var picked = $$('[name="' + id + '"]').filter(function (r) { return r.checked; })[0]; return picked ? (picked.value || picked.getAttribute('data-value')) : null; }
    if (el.hasAttribute('data-value')) return el.getAttribute('data-value');
    return el.value == null ? '' : String(el.value);
  }
  function txt(id) { var v = val(id); return v == null ? '' : String(v).trim(); }
  function pickedNames(name) {
    return $$('[name="' + name + '"]').filter(function (i) { return i.checked; })
      .map(function (i) { return i.value || i.getAttribute('data-value') || i.id; });
  }
  function selectedRows(sel) {
    var box = $(sel); if (!box) return [];
    return $$('[aria-selected="true"], tr.is-selected', box).map(function (r) { return r.getAttribute('data-row-id'); });
  }

  function runCheck(c, obj) {
    var kind = c.check, id = c.id, msg = c.message || '';
    switch (kind) {
      case 'required':
        var missing = (c.ids || [id]).filter(function (x) { return !txt(x); });
        return missing.length ? { ok: false, msg: c.message || ('Fill in: ' + missing.join(', ') + '.') } : { ok: true };
      case 'equals':
        return txt(id) === String(c.value) ? { ok: true } : { ok: false, msg: msg || 'That selection is not the compliant choice for this scenario.' };
      case 'oneOf':
        return (c.values || []).indexOf(txt(id)) >= 0 ? { ok: true } : { ok: false, msg: msg || 'Choose one of the accepted values.' };
      case 'noneOf':
        return (c.values || []).indexOf(txt(id)) === -1 ? { ok: true } : { ok: false, msg: msg || 'That option is out of scope for a training tenant.' };
      case 'allChecked': {
        var un = (c.ids || []).filter(function (x) { var e = doc.getElementById(x); return !e || !e.checked; });
        return un.length ? { ok: false, msg: msg || 'Acknowledge every item: ' + un.length + ' still unticked.' } : { ok: true };
      }
      case 'exactly': {
        var want = (c.on || []).slice().sort(), got = (c.ids || []).filter(function (x) { var e = doc.getElementById(x); return e && e.checked; }).sort();
        if (JSON.stringify(want) === JSON.stringify(got)) return { ok: true };
        var extra = got.filter(function (g) { return want.indexOf(g) === -1; });
        return { ok: false, msg: msg || (extra.length ? 'Uncheck ' + extra.join(', ') + ' — those are not justified by the evidence.' : 'Tick ' + want.filter(function (w) { return got.indexOf(w) === -1; }).join(', ') + ' as well.') };
      }
      case 'group': {
        var got2 = pickedNames(id);
        if (!got2.length) return { ok: false, msg: msg || 'Select at least one option.' };
        if (c.exactly) {
          var w = (c.exactly || []).slice().sort(), g = got2.slice().sort();
          return JSON.stringify(w) === JSON.stringify(g) ? { ok: true } : { ok: false, msg: msg || ('Expected exactly: ' + w.join(', ') + '. You picked: ' + g.join(', ') + '.') };
        }
        var need2 = (c.anyOf || []);
        return need2.some(function (n) { return got2.indexOf(n) >= 0; }) ? { ok: true } : { ok: false, msg: msg || 'Pick a relevant option.' };
      }
      case 'minLength': {
        var t = txt(id);
        return t.length >= (c.n || 40) ? { ok: true } : { ok: false, msg: msg || ('Add more detail (' + t.length + '/' + (c.n || 40) + ' characters).') };
      }
      case 'containsAll': {
        var s = txt(id).toLowerCase(), miss = (c.words || []).filter(function (w) { return s.indexOf(String(w).toLowerCase()) === -1; });
        return miss.length ? { ok: false, msg: msg || ('Your note must reference: ' + miss.join(', ') + '.') } : { ok: true };
      }
      case 'forbids': {
        var s2 = txt(id).toLowerCase(), hit = (c.words || []).filter(function (w) { return s2.indexOf(String(w).toLowerCase()) !== -1; });
        return hit.length ? { ok: false, msg: msg || ('Remove: ' + hit.join(', ') + ' — never place raw identifiers, keys or personal data in notes.') } : { ok: true };
      }
      case 'rowSelection': {
        var got3 = selectedRows(c.selector).filter(Boolean);
        var want3 = (c.ids || []).slice().sort();
        if (!got3.length) return { ok: false, msg: msg || 'Select the matching row(s) in the table first.' };
        if (c.superset) return want3.every(function (w) { return got3.indexOf(w) >= 0; }) ? { ok: true } : { ok: false, msg: msg || ('Your selection must include: ' + want3.join(', ') + '.') };
        return JSON.stringify(want3) === JSON.stringify(got3.slice().sort()) ? { ok: true } : { ok: false, msg: msg || ('Selection should be exactly: ' + want3.join(', ') + '. You selected: ' + got3.join(', ') + '.') };
      }
      case 'actionSequence': {
        var seq = (state.answers[obj.id + '.seq'] || []);
        var exp = (c.steps || []);
        if (seq.length < exp.length) return { ok: false, msg: msg || ('Complete the action in order. Next expected step: "' + exp[seq.length] + '".') };
        var bad = exp.filter(function (e, i) { return seq[i] !== e; });
        return bad.length ? { ok: false, msg: msg || ('Order matters: ' + bad[0] + ' should come before ' + seq[seq.indexOf(bad[0])] + '. Reset the action and follow the documented sequence.') } : { ok: true };
      }
      case 'kql': return checkKql(c, obj, id);
      case 'custom':
        try { return c.fn(api, obj) ? { ok: true } : { ok: false, msg: msg || 'Not yet acceptable.' }; }
        catch (e) { return { ok: false, msg: 'Check failed to run: ' + e.message }; }
      case 'mustNotHaveFlag':
        return state.flags.indexOf(c.flag) === -1 ? { ok: true } : { ok: false, msg: msg || 'Resolve the recorded policy violation first (' + c.flag + ').' };
    }
    return { ok: false, msg: 'Unknown check "' + kind + '"' };
  }

  function checkKql(c, obj, editorId) {
    var ed = doc.getElementById(editorId || c.editor);
    if (!ed) return { ok: false, msg: 'Query editor not found.' };
    var q = ed.value;
    if (!/\S/.test(q)) return { ok: false, msg: 'Write a query first.' };
    var info = global.RCWKql ? global.RCWKql.explain(q) : { ok: true, tables: [], operators: [], columns: [], functions: [], hasWhere: /\|\s*where/i.test(q), hasSummarize: /summarize/i.test(q), hasTimeFilter: /ago\(|datetime\(|now\(/i.test(q), text: q.toLowerCase() };
    if (!info.ok) return { ok: false, msg: 'Query does not parse: ' + info.error };
    var low = info.text;
    if (c.table && low.indexOf(c.table.toLowerCase()) === -1) return { ok: false, msg: 'The query must run against ' + c.table + '.' };
    if (c.tables && c.tables.length && !c.tables.some(function (t) { return low.indexOf(t.toLowerCase()) >= 0; })) return { ok: false, msg: 'Reference at least one of: ' + c.tables.join(', ') + '.' };
    if (c.requiresOperators && !c.requiresOperators.every(function (o) { return info.operators.indexOf(o) >= 0 || new RegExp('\\|\\s*' + o + '\\b', 'i').test(q); }))
      return { ok: false, msg: 'Your query must use: ' + c.requiresOperators.join(', ') + '.' };
    if (c.requireTimeWindow && !info.hasTimeFilter && !/ago\(|datetime\(|now\(/i.test(q)) return { ok: false, msg: 'Bound the query with a time window (for example | where Timestamp > ago(14d)) so the hunt is reproducible and does not scan the whole retention period.' };
    if (c.forbids && c.forbids.length) {
      var badF = c.forbids.filter(function (f) { return low.indexOf(String(f).toLowerCase()) !== -1; });
      if (badF.length) return { ok: false, msg: c.message || ('Remove ' + badF.join(', ') + ' — ' + (c.why || 'it is not justified for this scope.') + ' ' + (c.message || '')) };
    }
    if (c.mustMatch) {
      var rx = null;
      try { rx = new RegExp(c.mustMatch, 'i'); }
      catch (e) { return { ok: false, msg: 'The validator pattern for this objective is malformed (' + e.message + '). This is a lab-authoring defect, not your query.' }; }
      if (!rx.test(q)) return { ok: false, msg: c.message || 'Query does not match the required pattern.' };
    }
    var res = global.RCWKql ? global.RCWKql.run(q, c.dataset || cfg.kqlTables || {}, { now: cfg.now }) : { rows: [], error: null };
    if (res.error) return { ok: false, msg: 'Query error: ' + res.error };
    if (c.minRows != null && res.rows.length < c.minRows) return { ok: false, msg: c.message || ('Expected at least ' + c.minRows + ' row(s); got ' + res.rows.length + '. Loosen or fix the filter.') };
    if (c.maxRows != null && res.rows.length > c.maxRows) return { ok: false, msg: c.message || ('Too broad: ' + res.rows.length + ' rows returned, expected at most ' + c.maxRows + '. Narrow the scope.') };
    if (c.exactRows != null && res.rows.length !== c.exactRows) return { ok: false, msg: c.message || ('Expected exactly ' + c.exactRows + ' row(s), got ' + res.rows.length + '. Re-read the alert evidence before adjusting the filter.') };
    if (c.firstRowField && c.firstRowValue != null) {
      var first = (res.rows[0] || {})[c.firstRowField];
      if (String(first).toLowerCase() !== String(c.firstRowValue).toLowerCase()) return { ok: false, msg: c.message || ('The first row should be ' + c.firstRowValue + ' (got ' + first + ').') };
    }
    if (c.rowFieldValues) {
      var vals2 = (c.rowFieldValues.values || []).map(String);
      var seen = res.rows.map(function (r) { return String(r[c.rowFieldValues.field]); });
      var same = vals2.length === seen.length && vals2.every(function (v) { return seen.indexOf(v) >= 0; });
      if (!same) return { ok: false, msg: c.message || (c.rowFieldValues.field + ' should resolve to exactly: ' + vals2.join(', ') + '.') };
    }
    return { ok: true, note: res.rows.length + ' row(s)' };
  }

  /* --------------------------------------------------- objective submit */
  function submitObjective(id, extraEvidence) {
    var obj = findObj(id);
    if (!obj) { toast('Unknown objective', id, 'error'); return { ok: false }; }
    if (obj.requires && obj.requires.length) {
      var missing = obj.requires.filter(function (r) { return !(state.done[r] && state.done[r].complete); });
      if (missing.length) {
        fail(obj, 'Locked until the prerequisite control is evidenced: ' + missing.join(', ') + '.');
        return { ok: false, locked: true };
      }
    }
    var results = (obj.checks || []).map(function (c) { return { c: c, r: runCheck(c, obj) }; });
    var failed = results.filter(function (x) { return !x.r.ok; });
    if (extraEvidence) (obj.extraChecks || []).forEach(function (c) { var r = runCheck(c, obj); if (!r.ok) failed.push({ c: c, r: r }); });
    if (failed.length) { fail(obj, failed[0].r.msg); return { ok: false, failed: failed }; }
    var ev = (obj.evidence || []).slice();
    (obj.capture || []).forEach(function (f) { var v = txt(f); if (v) ev.push(redact(f + ' = ' + v)); });
    if (results.some(function (x) { return x.r.note; })) ev = ev.concat(results.map(function (x) { return x.r.note; }).filter(Boolean).map(function (t) { return 'Query result: ' + t; }));
    if (failed.length === 0) {
      state.done[id] = { complete: true, at: new Date().toISOString(), evidence: ev.slice(0, 14) };
      log('Objective complete', obj.title + ' (+' + obj.points + ' pts)', 'done');
      toast('Objective complete', obj.title + ' · +' + obj.points + ' points', 'ok');
      setMsg(obj, 'All ' + (obj.checks || []).length + ' control checks passed. Evidence recorded in the audit trail.', 'ok');
      save(); renderProgress();
      if (cfg.afterObjective) { try { cfg.afterObjective(api, obj.id); } catch (e) { } }
      if (doneCount() === (cfg.objectives || []).length) { log('Lab complete', 'Final score ' + totalScore() + '/100', 'done'); toast('Lab complete', 'Score ' + totalScore() + '/100. Your evidence pack is unlocked below.', 'ok'); }
    }
    return { ok: true };
  }

  function fail(obj, msg) {
    var el = msgEl(obj);
    if (el) { el.textContent = msg || 'Not accepted yet.'; el.setAttribute('data-tone', 'error'); }
    log('Blocked', (obj ? obj.title + ' — ' : '') + (msg || ''), 'blocked');
    toast('Not accepted', msg || 'Check the control requirements.', 'error');
    save();
  }
  function msgEl(obj) {
    if (!obj) return null;
    return doc.getElementById('msg-' + obj.id) || ($('#form-' + obj.id) ? $('#form-' + obj.id).querySelector('.msg') : null);
  }
  function setMsg(obj, text, tone) {
    var el = msgEl(obj);
    if (el) { el.textContent = text || ''; el.setAttribute('data-tone', tone || 'ok'); }
  }

  /* ----------------------------------------------------------- routing */
  function go(route, opts) {
    if (!route) return;
    var views = $$('[data-view]');
    var target = views.filter(function (v) { return v.getAttribute('data-view') === route; })[0];
    if (!target) return;
    views.forEach(function (v) { v.hidden = true; v.classList.remove('is-active'); });
    target.hidden = false; target.classList.add('is-active');
    $$('[data-route]').forEach(function (b) {
      var on = b.getAttribute('data-route') === route;
      b.classList.toggle('is-active', on);
      if (b.tagName === 'BUTTON' && b.closest('.side-nav')) { if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); }
    });
    $$('.crumb-current').forEach(function (c) {
      var o = (cfg.objectives || []).filter(function (x) { return (x.view || x.id) === route; })[0];
      if (o) c.textContent = o.navLabel || o.title;
    });
    doc.body.classList.remove('nav-open');
    if (!(opts && opts.noScroll)) { var main = $('#labMain') || target; main.scrollIntoView ? main.scrollIntoView({ block: 'start' }) : null; global.scrollTo(0, 0); }
    try { global.history.replaceState(null, '', '#' + route); } catch (e) { }
    log('Navigate', 'Opened ' + route, 'info');
    if (cfg.onView) { try { cfg.onView(api, route); } catch (e) { } }
  }

  function wireChrome() {
    doc.addEventListener('click', function (ev) {
      var routeEl = ev.target.closest ? ev.target.closest('[data-route]') : null;
      if (routeEl && routeEl.getAttribute('data-route')) { ev.preventDefault(); go(routeEl.getAttribute('data-route')); return; }
      var guide = ev.target.closest ? ev.target.closest('[data-guide-open]') : null;
      if (guide) {
        var d = doc.getElementById(guide.getAttribute('data-guide-open'));
        if (d) { if (d.tagName === 'DETAILS') d.open = true; d.scrollIntoView({ block: 'center' }); log('Guide', 'Opened lab guide section', 'info'); }
        return;
      }
      var auditBtn = ev.target.closest ? ev.target.closest('[data-audit-toggle]') : null;
      if (auditBtn) { var fly = $('#rcwAuditFlyout'); if (fly) { fly.hidden = !fly.hidden; if (!fly.hidden) { var first = $('button, a[href]', fly); if (first) first.focus(); } } return; }
      var closeBtn = ev.target.closest ? ev.target.closest('[data-audit-close]') : null;
      if (closeBtn) { var f2 = $('#rcwAuditFlyout'); if (f2) f2.hidden = true; return; }
      var ex = ev.target.closest ? ev.target.closest('[data-evidence]') : null;
      if (ex) {
        var what = ex.getAttribute('data-evidence');
        if (what === 'download') { var ok = download(cfg.labId + '-evidence-' + stamp(Date.now()).slice(0, 10) + '.json', JSON.stringify(evidencePack(), null, 2)); log('Evidence exported', ok ? 'Redacted JSON evidence pack downloaded' : 'Download blocked by the browser', ok ? 'done' : 'warn'); toast(ok ? 'Evidence pack saved' : 'Download blocked', ok ? 'Saved locally in your browser only.' : 'Your browser prevented the file download.', ok ? 'ok' : 'warn'); }
        if (what === 'copy') { var summary = 'RCW IT Training · ' + cfg.title + '\nScore ' + totalScore() + '/100 · verify ' + verifyCode() + '\n' + (cfg.objectives || []).map(function (o) { return (state.done[o.id] && state.done[o.id].complete ? '[x]' : '[ ]') + ' ' + o.title; }).join('\n'); copyText(summary); }
        if (what === 'print') { global.print(); }
        return;
      }
      var resetBtn = ev.target.closest ? ev.target.closest('[data-lab-reset]') : null;
      if (resetBtn) { resetLab(); return; }
      var step = ev.target.closest ? ev.target.closest('[data-seq-step]') : null;
      if (step) {
        var obj2 = step.getAttribute('data-seq-obj'), key = obj2 + '.seq';
        var arr = state.answers[key] || (state.answers[key] = []);
        arr.push(step.getAttribute('data-seq-step'));
        log('Console action', step.getAttribute('data-seq-step') + ' (on ' + obj2 + ')', 'info');
        if (cfg.onStep) { try { cfg.onStep(api, step, arr); } catch (e) { } }
        save();
      }
      var tabBtn = ev.target.closest ? ev.target.closest('[data-tab]') : null;
      if (tabBtn) {
        var group = tabBtn.closest('.tabbed');
        if (group) {
          $$('[data-tab]', group).forEach(function (t) { t.setAttribute('aria-selected', t === tabBtn ? 'true' : 'false'); });
          $$('[data-tabpanel]', group).forEach(function (p) { p.hidden = p.getAttribute('data-tabpanel') !== tabBtn.getAttribute('data-tab'); });
        }
      }
      var sortBtn = ev.target.closest ? ev.target.closest('[data-sort]') : null;
      if (sortBtn) sortTable(sortBtn);
    });

    $$('form[data-objective]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        submitObjective(form.getAttribute('data-objective'));
      });
    });
    $$('input[type=checkbox], input[type=radio], select, textarea').forEach(function (el) {
      el.addEventListener('change', function () {
        if (el.classList.contains('radio-card')) { }
        var card = el.closest('.radio-card');
        if (card && el.type === 'radio') { $$('[name="' + el.name + '"]').forEach(function (r) { var c = r.closest('.radio-card'); if (c) c.classList.toggle('is-picked', r.checked); }); }
        var pick = el.closest('[data-pick]');
        if (pick) { var box = doc.getElementById(pick.getAttribute('data-pick')); if (box) $$('[data-opt]', box).forEach(function (o) { o.classList.toggle('is-picked', o.getAttribute('data-opt') === (el.value || el.getAttribute('data-value'))); }); }
        save();
      });
    });
    $$('input[type=text], textarea, input[type=search]').forEach(function (el) {
      el.addEventListener('input', function () { if (el.id === 'learnerName') { state.learner = el.value.slice(0, 70); var box = $('#rcwCompletionBody'); if (box) box.removeAttribute('data-rendered'); save(); } });
    });

    $$('.nav-section > .nav-head').forEach(function (h) {
      h.addEventListener('click', function () {
        var sec = h.closest('.nav-section');
        var open = sec.getAttribute('data-open') !== 'false';
        sec.setAttribute('data-open', open ? 'false' : 'true');
        h.setAttribute('aria-expanded', String(!open));
      });
    });
    var menuBtn = $('#navToggleButton');
    if (menuBtn) menuBtn.addEventListener('click', function () { var on = !doc.body.classList.contains('nav-open'); doc.body.classList.toggle('nav-open', on); menuBtn.setAttribute('aria-expanded', String(on)); });
    var navScrim = $('#navScrim');
    if (navScrim) navScrim.addEventListener('click', function () { doc.body.classList.remove('nav-open'); });
    var closeNav = $('#navCloseButton');
    if (closeNav) closeNav.addEventListener('click', function () { doc.body.classList.remove('nav-open'); var mb = $('#navToggleButton'); if (mb) mb.focus(); });

    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var fly = $('#rcwAuditFlyout');
        if (fly && !fly.hidden) { fly.hidden = true; log('Dismissed', 'Closed the action log', 'info'); return; }
        if (doc.body.classList.contains('nav-open')) { doc.body.classList.remove('nav-open'); }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        var ed = doc.activeElement && doc.activeElement.getAttribute && doc.activeElement.getAttribute('data-kql');
        if (ed) { e.preventDefault(); var run = $('#rcwKqlRun-' + ed); if (run) run.click(); }
      }
    });
  }

  function copyText(t) {
    if (global.navigator && global.navigator.clipboard && global.navigator.clipboard.writeText) {
      global.navigator.clipboard.writeText(t).then(function () { toast('Copied', 'Summary is on your clipboard.', 'ok'); }, function () { fallbackCopy(t); });
    } else fallbackCopy(t);
  }
  function fallbackCopy(t) {
    var ta = doc.createElement('textarea');
    ta.value = t; ta.setAttribute('readonly', 'true'); ta.style.position = 'fixed'; ta.style.left = '-9999px';
    doc.body.appendChild(ta); ta.select();
    try { doc.execCommand('copy'); toast('Copied', 'Summary is on your clipboard.', 'ok'); } catch (e) { toast('Copy blocked', 'Select the text and copy manually.', 'warn'); }
    ta.remove();
  }

  function sortTable(btn) {
    var table = btn.closest('table'), key = btn.getAttribute('data-sort');
    var tbody = $('tbody', table); if (!tbody) return;
    var dir = btn.getAttribute('data-dir') === 'asc' ? 'desc' : 'asc';
    $$('[data-sort]', table).forEach(function (h) { h.removeAttribute('data-sort-dir'); });
    btn.setAttribute('data-dir', dir);
    btn.setAttribute('aria-sort', dir === 'asc' ? 'ascending' : 'descending');
    var rows = $$('tr', tbody);
    var idx = -1;
    $$('th', table).forEach(function (th, i) { if (th.getAttribute('data-sort') === key) idx = i; });
    rows.sort(function (a, b) {
      var x = (a.children[idx] || {}).textContent || '', y = (b.children[idx] || {}).textContent || '';
      var nx = parseFloat(String(x).replace(/[^\d.-]/g, '')), ny = parseFloat(String(y).replace(/[^\d.-]/g, ''));
      var cmp = (!isNaN(nx) && !isNaN(ny) && /[\d.]/.test(x)) ? nx - ny : String(x).localeCompare(String(y), 'en', { numeric: true });
      return dir === 'asc' ? cmp : -cmp;
    });
    rows.forEach(function (r) { tbody.appendChild(r); });
    log('Sort', 'Sorted ' + (table.getAttribute('data-grid-name') || 'grid') + ' by ' + key + ' (' + dir + ')', 'info');
  }

  function resetLab() {
    var modal = $('#rcwResetModal');
    if (!modal) { doReset(); return; }
    modal.hidden = false;
    var focusEl = $('#rcwResetConfirm', modal) || $('button', modal);
    if (focusEl) focusEl.focus();
    modal.addEventListener('click', function h(e) {
      if (e.target.closest('[data-reset-confirm]')) { modal.hidden = true; doReset(); modal.removeEventListener('click', h); }
      if (e.target.closest('[data-reset-cancel]') || e.target === modal) { modal.hidden = true; modal.removeEventListener('click', h); }
    });
  }
  function doReset() {
    try { global.localStorage.removeItem(STORE + cfg.labId); } catch (e) { }
    log('Reset', 'Lab state cleared from this browser', 'warn');
    toast('Lab reset', 'Reloading a clean tenant snapshot.', 'ok');
    global.setTimeout(function () { global.location.reload(); }, 550);
  }

  /* ------------------------------------------------- row selection grids */
  function wireGrids() {
    $$('table[data-selectable]').forEach(function (t) {
      $$('tr[data-row-id]', t).forEach(function (r) {
        r.setAttribute('tabindex', '0');
        r.setAttribute('role', 'row');
        if (!r.hasAttribute('aria-selected')) r.setAttribute('aria-selected', 'false');
        r.addEventListener('click', function (e) {
          if (e.target.closest('button,a,input,select')) return;
          toggleRow(r, t);
        });
        r.addEventListener('keydown', function (e) {
          if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleRow(r, t); }
        });
      });
    });
  }
  function toggleRow(r, t) {
    var multi = t.hasAttribute('data-multi');
    var on = r.getAttribute('aria-selected') === 'true';
    if (!multi) $$('tr[data-row-id]', t).forEach(function (o) { o.setAttribute('aria-selected', 'false'); o.classList.remove('is-selected'); });
    r.setAttribute('aria-selected', String(!on));
    r.classList.toggle('is-selected', !on);
    var sel = selectedRows('#' + (t.id || '') );
    var countEl = t.parentNode.querySelector('[data-selection-count]');
    if (countEl) countEl.textContent = sel.length ? sel.length + ' row(s) selected' : 'No rows selected';
    log('Grid select', (t.getAttribute('data-grid-name') || 'grid') + ' → ' + (r.getAttribute('data-row-id')) + (on ? ' (deselected)' : ' (selected)'), 'info');
    if (cfg.onSelect) { try { cfg.onSelect(api, t, r, sel); } catch (e) { } }
    save();
  }

  /* ------------------------------------------------------- KQL console UI */
  function mountKql(opts) {
    var ed = doc.getElementById(opts.editor);
    if (!ed) return null;
    ed.setAttribute('spellcheck', 'false');
    ed.setAttribute('autocomplete', 'off');
    var lines = doc.getElementById(opts.lines || (opts.editor + 'Lines'));
    function paint() {
      if (!lines) return;
      var n = ed.value.split('\n').length;
      var buf = [];
      for (var i = 1; i <= n; i++) buf.push(i);
      lines.textContent = buf.join('\n');
    }
    ed.addEventListener('input', paint);
    ed.addEventListener('scroll', function () { if (lines) lines.scrollTop = ed.scrollTop; });
    paint();

    var runBtn = doc.getElementById(opts.run || ('rcwKqlRun-' + opts.editor));
    function execute() {
      var res = global.RCWKql.run(ed.value, opts.tables || cfg.kqlTables || {}, { now: cfg.now, maxRows: opts.maxRows || 200 });
      var errBox = doc.getElementById(opts.error || 'rcwKqlError');
      var outBox = doc.getElementById(opts.results || 'rcwKqlResults');
      var meta = doc.getElementById(opts.meta || 'rcwKqlMeta');
      if (res.error) {
        if (errBox) { errBox.hidden = false; errBox.textContent = res.error; }
        if (outBox) { outBox.innerHTML = ''; }
        if (meta) meta.textContent = 'Query failed · 0 rows · ' + res.elapsedMs + ' ms';
        log('KQL error', (opts.label || 'query') + ' → ' + res.error, 'warn');
        toast('Query failed', res.error.slice(0, 140), 'error');
        if (opts.onError) { try { opts.onError(api, res.error); } catch (e) { } }
        return res;
      }
      if (errBox) { errBox.hidden = true; errBox.textContent = ''; }
      if (outBox) outBox.innerHTML = renderGrid(res, opts);
      if (meta) meta.innerHTML = '<span>' + res.rows.length + ' row(s)' + (res.truncated ? ' (first 200 shown)' : '') + '</span><span>·</span><span>' +
        res.elapsedMs + ' ms</span><span>·</span><span class="mono">' + esc(ed.value.replace(/\s+/g, ' ').slice(0, 80)) + '</span>';
      log('KQL run', (opts.label || 'query') + ' → ' + res.rows.length + ' rows', 'info');
      if (opts.onDone) { try { opts.onDone(api, res); } catch (e) { } }
      if (opts.checkObjective) { var r = submitObjective(opts.checkObjective, true); if (r.ok && opts.autoAdvance) { var nx = (cfg.objectives || []).filter(function (o) { return !(state.done[o.id] && state.done[o.id].complete); })[0]; if (nx) go(nx.view || nx.id); } }
      return res;
    }
    if (runBtn) runBtn.addEventListener('click', execute);
    var fmt = doc.getElementById(opts.format || 'rcwKqlFormat');
    if (fmt) fmt.addEventListener('click', function () {
      ed.value = ed.value.replace(/\s*\|\s*/g, '\n| ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
      paint(); log('KQL', 'Formatted query text', 'info');
    });
    var clr = doc.getElementById(opts.clear || 'rcwKqlClear');
    if (clr) clr.addEventListener('click', function () { ed.value = ''; paint(); var e2 = doc.getElementById(opts.error || 'rcwKqlError'); if (e2) e2.hidden = true; var o2 = doc.getElementById(opts.results || 'rcwKqlResults'); if (o2) o2.innerHTML = ''; log('KQL', 'Cleared the query editor', 'info'); });
    var exp = doc.getElementById(opts.exportCsv || 'rcwKqlExport');
    if (exp) exp.addEventListener('click', function () {
      var res = global.RCWKql.run(ed.value, opts.tables || cfg.kqlTables || {}, { now: cfg.now, maxRows: 5000 });
      if (res.error) { toast('Cannot export', 'The query must run without errors first.', 'warn'); return; }
      var csv = [res.columns.join(',')].concat(res.rows.map(function (r) {
        return res.columns.map(function (c) { var v = redact(global.RCWKql.format(r[c])).replace(/"/g, '""'); return /[",\n]/.test(v) ? '"' + v + '"' : v; }).join(',');
      })).join('\n');
      var ok = download((opts.label || 'advanced-hunting') + '-results.csv', csv, 'text/csv;charset=utf-8');
      log('Export', (ok ? 'Exported ' : 'Blocked export of ') + res.rows.length + ' simulated rows as CSV', ok ? 'done' : 'warn');
      toast(ok ? 'CSV exported' : 'Export blocked', 'Synthetic rows only — nothing from a real tenant.', ok ? 'ok' : 'warn');
    });
    $$('[data-kql-insert]').forEach(function (b) {
      b.addEventListener('click', function () {
        var t = b.getAttribute('data-kql-insert');
        if (b.hasAttribute('data-kql-replace')) ed.value = t;
        else {
          var pos = ed.selectionStart == null ? ed.value.length : ed.selectionStart;
          var pre = ed.value.slice(0, pos), post = ed.value.slice(pos);
          var glue = pre && !/\s$/.test(pre) ? ' ' : '';
          ed.value = pre + glue + t + post;
          ed.focus();
          var caret = (pre + glue + t).length;
          try { ed.setSelectionRange(caret, caret); } catch (e) { }
        }
        paint(); log('KQL', 'Inserted snippet: ' + t.slice(0, 60), 'info');
      });
    });
    $$('[data-kql-sample]').forEach(function (b) {
      b.addEventListener('click', function () {
        ed.value = b.getAttribute('data-kql-sample') || '';
        paint(); log('KQL', 'Loaded sample query: ' + (b.getAttribute('data-sample-name') || 'untitled'), 'info');
        toast('Sample loaded', 'Read it before you run it — samples are a starting point, not an answer.', 'ok');
        execute();
      });
    });
    api.executeKql = execute;
    return { run: execute, editor: ed };
  }

  function renderGrid(res, opts) {
    if (!res.rows.length) return '<p class="msg" data-tone="warn" style="margin:0;border:0;background:#fff4ce">The query is valid and ran successfully, but returned no rows. Review the filters, the time window, and whether the table is the right source for this alert type.</p>';
    var head = res.columns.map(function (c) { return '<th scope="col">' + esc(c) + '</th>'; }).join('');
    var body = res.rows.map(function (r, i) {
      return '<tr><td class="num muted">' + (i + 1) + '</td>' + res.columns.map(function (c) {
        var v = redact(global.RCWKql.format(r[c]));
        if (v.length > 120) v = v.slice(0, 117) + '\u2026';
        return '<td' + (typeof r[c] === 'number' ? ' class="num"' : '') + '>' + esc(v) + '</td>';
      }).join('') + '</tr>';
    }).join('');
    return '<div class="grid-wrap"><table class="data-grid"><caption>Simulated advanced hunting results — synthetic dataset, ' + res.rows.length + ' row(s)</caption><thead><tr><th class="num">#</th>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>';
  }

  /* ---------------------------------------------------- compliance gate */
  function ensureGate() {
    if (state.acceptedAt) return;
    var wrap = doc.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.id = 'rcwGate';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-labelledby', 'rcwGateTitle');
    wrap.innerHTML =
      '<div class="modal">' +
      '<header><h2 id="rcwGateTitle">Before you enter the console</h2>' +
      '<p class="small muted">RCW IT Training · ' + esc(cfg.title) + ' · read once per browser</p></header>' +
      '<div class="m-body">' +
      '<div class="notice info"><span class="n-ico" aria-hidden="true">i</span><div><b>You are about to use a simulated Microsoft Defender portal.</b>' +
      '<p>The console layout is a training replica built by RCW IT Training. It is not Microsoft software, is not affiliated with or endorsed by Microsoft, and is never connected to a tenant. Every device, user, alert, file, hash and IP address is synthetic.</p></div></div>' +
      '<ul class="gate-list">' +
      '<li class="gate"><span class="g-ico">1</span><div><b>Scope and authority</b><small>I am practising on simulated data I own or am authorised to train with. I will not use this lab to describe, direct or validate actions against a production tenant without written authorisation from its owner.</small></div></li>' +
      '<li class="gate"><span class="g-ico">2</span><div><b>Data handling</b><small>I will enter only synthetic values in text fields — never real UPNs, mailboxes, IP addresses, hashes, keys, tickets, customer names, or health/financial records. Notes I type may be exported by me as evidence, and are redacted on export by default.</small></div></li>' +
      '<li class="gate"><span class="g-ico">3</span><div><b>Assessment honesty</b><small>I will complete the objectives myself. The score and evidence pack are a personal practice record, not a Microsoft certification or an employer-auditable control record.</small></div></li>' +
      '<li class="gate"><span class="g-ico">4</span><div><b>Reporting duty</b><small>If a lab scenario resembles an incident I have seen at work, I will follow my employer\'s incident and disclosure procedures (for example security@team, plus NIS2 24h early warning / 72h notification / 1-month final report, DORA 4h initial notification for financial entities, and GDPR Article 33 within 72 hours) rather than improvising from memory of this lab.</small></div></li>' +
      '</ul>' +
      '<label class="field" for="rcwGateName"><span class="lbl">Your name (optional, used only for the completion record — stored in this browser)</span>' +
      '<input id="rcwGateName" type="text" maxlength="70" autocomplete="off" placeholder="e.g. Pradeep R."></label>' +
      '<label class="check"><input type="checkbox" id="rcwGateAck"><span><b>I have read and accept the four conditions above.</b><small>Required. Nothing is transmitted; there is no server in this lab.</small></span></label>' +
      '</div>' +
      '<div class="m-foot"><a class="small" href="' + (cfg.complianceHref || '../microsoft-defender-labs/compliance-standards.html') + '">Read the full lab &amp; accessibility standards</a>' +
      '<span class="note"></span><button class="btn btn--primary" type="button" id="rcwGateEnter" disabled>Enter the lab</button></div>' +
      '</div>';
    doc.body.appendChild(wrap);
    var ack = $('#rcwGateAck'), enter = $('#rcwGateEnter');
    ack.addEventListener('change', function () { enter.disabled = !ack.checked; });
    enter.addEventListener('click', function () {
      state.acceptedAt = new Date().toISOString();
      state.learner = ($('#rcwGateName').value || '').slice(0, 70);
      log('Authorization accepted', 'All four acceptable-use conditions acknowledged by ' + (state.learner || 'anonymous learner'), 'done');
      save();
      wrap.remove();
      var main = $('#labMain');
      if (main) { main.setAttribute('tabindex', '-1'); main.focus(); }
      toast('Authorisation recorded', 'Timestamped in your action log. Start with the first objective.', 'ok');
    });
    $('#rcwGateAck').focus();
    doc.addEventListener('keydown', function esc2(e) { if (!doc.getElementById('rcwGate')) { doc.removeEventListener('keydown', esc2); return; } if (e.key === 'Tab') { var f = $$('a[href], button, input, select, textarea', wrap).filter(function (x) { return !x.disabled && x.offsetParent !== null; }); if (!f.length) return; var first = f[0], last = f[f.length - 1]; if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); } } });
  }

  /* ------------------------------------------------------------- restore */
  function restoreInputs() {
    $$('[data-restore]').forEach(function (el) {
      var key = el.getAttribute('data-restore') || el.id;
      var v = state.answers[key];
      if (v == null) return;
      if (el.type === 'checkbox') el.checked = !!v;
      else el.value = v;
    });
    var ln = doc.getElementById('learnerName');
    if (ln && state.learner) ln.value = state.learner;
    $$('select, input[type=text], textarea').forEach(function (el) {
      if (!el.id || el.closest('#rcwGate')) return;
      el.addEventListener('change', function () { state.answers[el.id] = el.type === 'checkbox' ? el.checked : el.value; save(); });
      if (el.tagName === 'TEXTAREA' || el.type === 'text') el.addEventListener('blur', function () { state.answers[el.id] = el.value; save(); });
    });
    $$('[data-restore-rows]').forEach(function (t) {
      var saved = state.answers[t.id + '.rows'] || [];
      $$('tr[data-row-id]', t).forEach(function (r) { var on = saved.indexOf(r.getAttribute('data-row-id')) >= 0; r.setAttribute('aria-selected', String(on)); r.classList.toggle('is-selected', on); });
    });
  }
  function persistRows() {
    $$('table[data-restore-rows]').forEach(function (t) {
      state.answers[t.id + '.rows'] = $$('tr[data-row-id][aria-selected="true"]', t).map(function (r) { return r.getAttribute('data-row-id'); });
      save();
    });
  }

  /* --------------------------------------------------------------- init */
  function init(config) {
    cfg = config || {};
    cfg.labId = cfg.labId || (doc.body.getAttribute('data-lab-id') || 'lab');
    cfg.title = cfg.title || 'Microsoft Defender practice lab';
    cfg.objectives = cfg.objectives || [];
    state = load(cfg.labId);
    api.cfg = cfg;
    api.state = state;
    api.val = val; api.txt = txt; api.picked = pickedNames; api.selectedRows = selectedRows;
    api.log = log; api.toast = toast; api.go = go; api.redact = redact; api.esc = esc;
    api.get = doc.getElementById.bind(doc); api.$$ = $$; api.$ = $;
    api.setVal = function (id, v) { var el = doc.getElementById(id); if (!el) return; if (el.type === 'checkbox') el.checked = !!v; else { el.value = v; state.answers[el.id] = v; save(); } };
    api.setText = function (id, t) { var el = doc.getElementById(id); if (el) { el.innerHTML = t; } };
    api.msg = function (objId, text, tone) { var o = findObj(objId); if (o) setMsg(o, text, tone); };
    api.fail = function (objId, msg) { var o = findObj(objId) || { id: objId, title: objId }; fail(o, msg); };
    api.complete = function (objId, note) {
      var o = findObj(objId); if (!o) return;
      if (o.requires && o.requires.length && !o.requires.every(function (r) { return state.done[r] && state.done[r].complete; })) { fail(o, 'Complete ' + o.requires.join(' + ') + ' first.'); return; }
      var checks = (o.checks || []).map(function (c) { return runCheck(c, o); });
      if (checks.length && !checks.every(Boolean) && checks.some(function (c) { return !c.ok; })) { fail(o, checks.filter(function (c) { return !c.ok; })[0].msg); return; }
      var ev = (o.evidence || []).slice();
      if (note) ev.push(redact(note));
      state.done[objId] = { complete: true, at: new Date().toISOString(), evidence: ev.slice(0, 14) };
      log('Objective complete', o.title + ' (+' + o.points + ' pts)', 'done');
      toast('Objective complete', o.title + ' · +' + o.points + ' points', 'ok');
      save(); renderProgress();
      if (cfg.afterObjective) { try { cfg.afterObjective(api, objId); } catch (e) { } }
    };
    api.flag = function (f, why) { if (state.flags.indexOf(f) === -1) { state.flags.push(f); log('Compliance violation', f + ' — ' + (why || ''), 'warn'); toast('Recorded as a control violation', f + '. ' + (why || ''), 'warn'); save(); } };
    api.clearFlag = function (f) { state.flags = state.flags.filter(function (x) { return x !== f; }); save(); };
    api.hasFlag = function (f) { return state.flags.indexOf(f) >= 0; };
    api.score = totalScore; api.doneCount = doneCount; api.audit = function () { return state.audit.slice(); };
    api.evidence = evidencePack; api.submit = submitObjective; api.mountKql = mountKql; api.renderAudit = renderAudit;
    api.verify = verifyCode; api.download = download; api.save = save; api.refresh = renderProgress;
    api.selectedOf = selectedRows;

    renderShell();
    doc.documentElement.classList.add('rcw-lab-ready');
    if (doc.body) doc.body.setAttribute('data-lab-version', VERSION);
    wireChrome();
    wireGrids();
    restoreInputs();
    renderAudit();
    renderProgress();
    (cfg.mounts || []).forEach(function (m) { try { mountKql(m); } catch (e) { console.warn('KQL mount failed', e); } });
    if (cfg.onReady) { try { cfg.onReady(api); } catch (e) { console.warn(e); } }
    var h = (global.location.hash || '').replace('#', '');
    if (h && $$('[data-view]').some(function (v) { return v.getAttribute('data-view') === h; })) go(h, { noScroll: true });
    if (state.storageBlocked) toast('Storage unavailable', 'Your browser blocks local storage, so progress lasts for this page visit only.', 'warn');
    ensureGate();
    save();
    $$('[data-lab-year]').forEach(function (e) { e.textContent = String(new Date().getFullYear()); });
  }

  /* public row-selection helper for lab scripts */
  function selectRows(selector, ids, silent) {
    var t = $(selector); if (!t) return;
    $$('tr[data-row-id]', t).forEach(function (r) {
      var on = ids.indexOf(r.getAttribute('data-row-id')) >= 0;
      r.setAttribute('aria-selected', String(on));
      r.classList.toggle('is-selected', on);
    });
    if (!silent) { log('Programmatic select', ids.join(', '), 'info'); persistRows(); save(); }
  }
  function patchRow(id, htmlFields) {
    var r = $('[data-row-id="' + id + '"]');
    if (!r) return;
    Object.keys(htmlFields).forEach(function (k) {
      var cell = r.querySelector('[data-cell="' + k + '"]');
      if (cell) cell.innerHTML = htmlFields[k];
    });
    save();
  }

  api.runCheck = runCheck; api._internals = { runCheck: runCheck, val: val, txt: txt, pickedNames: pickedNames, selectedRows: selectedRows, renderGrid: renderGrid };
  api.init = init;
  api.selectRows = selectRows;
  api.patchRow = patchRow;
  api.persistRows = persistRows;

  /* ------------------------------------------------------- shell render */
  var ICONS = {
    home: '<path d="M12 3 3 10v10h6v-6h6v6h6V10z"/>',
    shield: '<path d="M12 2 4 5v7c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V5z"/>',
    alert: '<path d="M12 2 1.5 21h21zM11 9h2v6h-2zm0 8h2v2h-2z"/>',
    hunt: '<path d="M10 2a8 8 0 1 0 4.9 14.3l5.3 5.3 1.4-1.4-5.3-5.3A8 8 0 0 0 10 2zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12z"/>',
    device: '<path d="M2 5h20v11H2zm7 13h6l1 2H9z"/>',
    user: '<path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm-9 9a9 9 0 0 1 18 0z"/>',
    mail: '<path d="M2 5h20v14H2zm2 2v.5l8 5.5 8-5.5V7z"/>',
    cloud: '<path d="M6.5 20A5.5 5.5 0 0 1 6 9a7 7 0 0 1 13.4 2.2A4.4 4.4 0 0 1 18 20z"/>',
    key: '<path d="M14 2a8 8 0 0 0-7.4 11L2 17.6V22h4.4l1-1v-2h2v-2h2l1.2-1.2A8 8 0 1 0 14 2zm4 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/>',
    gear: '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm9 4-2.2.6a7.7 7.7 0 0 1-.7 1.7l1.3 1.9-1.6 1.6-1.9-1.3c-.5.3-1.1.5-1.7.7L12 20h-2.2l-.6-2.2a7.7 7.7 0 0 1-1.7-.7L5.6 18 4 16.4l1.3-1.9c-.3-.5-.5-1.1-.7-1.7L2.4 12v-2.2l2.2-.6c.2-.6.4-1.2.7-1.7L4 5.6 5.6 4l1.9 1.3c.5-.3 1.1-.5 1.7-.7L10 2.4h2.2l.6 2.2c.6.2 1.2.4 1.7.7L18.4 4 20 5.6l-1.3 1.9c.3.5.5 1.1.7 1.7l2.2.6z"/>',
    report: '<path d="M4 3h13l3 3v15H4zm3 8h10v2H7zm0 4h10v2H7z"/>',
    db: '<path d="M12 2c4.4 0 8 1.3 8 3v14c0 1.7-3.6 3-8 3s-8-1.3-8-3V5c0-1.7 3.6-3 8-3z"/>',
    doc: '<path d="M6 2h8l4 4v16H6zm8 1v4h4z"/>',
    graph: '<path d="M4 20V8h4v12zm6 0V4h4v16zm6 0v-8h4v8z"/>'
  };
  function renderShell() {
    var sh = cfg.shell;
    if (!sh) return;
    var mount = doc.getElementById('labShell') || doc.body;
    var nav = (sh.nav || []).map(function (sec) {
      var items = (sec.items || []).map(function (it) {
        if (it.plain) return '<li><span class="nav-item muted"><span class="nav-ico" aria-hidden="true"></span>' + esc(it.label) + '</span></li>';
        return '<li><button class="nav-item" type="button" data-route="' + esc(it.route) + '">' +
          '<span class="nav-ico" aria-hidden="true">' + esc(it.icon || '\u00b7') + '</span>' + esc(it.label) +
          (it.objective ? ' <span class="task-badge" data-task-badge="' + esc(it.objective) + '"></span>' : '') + '</button></li>';
      }).join('');
      return '<div class="nav-section" data-open="' + (sec.open === false ? 'false' : 'true') + '">' +
        '<button class="nav-head" type="button" aria-expanded="true">' + esc(sec.section) + '<span class="chev" aria-hidden="true">\u25be</span></button>' +
        '<ul class="nav-list">' + items + '</ul></div>';
    }).join('');

    var html =
      '<a class="skip-link" href="#labMain">Skip to the lab workspace</a>' +
      '<header class="app-header">' +
        '<button class="hamburger" type="button" id="navToggleButton" aria-label="Show or hide the lab navigation" aria-expanded="false" aria-controls="labNav"><span></span><span></span><span></span></button>' +
        '<span class="waffle" role="img" aria-label="Portal waffle menu (decorative)"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>' +
        '<div class="portal-brand"><span class="brand-mark" aria-hidden="true">RCW</span>' +
          '<span class="brand-text">' + esc(sh.brand || 'Microsoft Defender portal') + '</span>' +
          '<span class="brand-sep" aria-hidden="true">|</span><span class="brand-lab">' + esc(sh.brandSuffix || 'console replica \u00b7 practice lab') + '</span></div>' +
        '<div class="global-search"><svg class="gs-icon" viewBox="0 0 24 24" aria-hidden="true" fill="#fff"><path d="M10 2a8 8 0 1 0 4.9 14.3l5.3 5.3 1.4-1.4-5.3-5.3A8 8 0 0 0 10 2z"/></svg>' +
          '<input type="search" id="labGlobalSearch" placeholder="Search this lab: &quot;isolate device&quot;, &quot;KQL&quot;, &quot;false positive&quot;" aria-label="Search the lab guide for a term" autocomplete="off"><span class="gs-hint" aria-hidden="true">/</span></div>' +
        '<div class="header-right">' +
          '<button class="icon-btn" type="button" data-audit-toggle aria-label="Open the action log"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a8 8 0 0 0-8 8v5l-2 3v1h20v-1l-2-3v-5a8 8 0 0 0-8-8zm-2 19h4a2 2 0 0 1-4 0z"/></svg><span class="dot" id="rcwAuditDot" hidden></span></button>' +
          '<button class="icon-btn" type="button" data-guide-open="' + esc(sh.guideId || 'labGuide') + '" aria-label="Open the lab guide"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h11l5 5v13H4zm11 1v5h5"/></svg></button>' +
          '<button class="icon-btn" type="button" aria-label="Feedback on the lab content (sends nothing)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v12H8l-4 4z"/></svg></button>' +
          '<button class="icon-btn" type="button" aria-label="Help \u2014 this lab runs entirely offline"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-2h2zm1.8-6.3-1 1A2.6 2.6 0 0 0 13 14h-2a3.6 3.6 0 0 1 0-7 3 3 0 0 1 2.9 2.1z"/></svg></button>' +
          '<div class="account-chip" role="img" aria-label="Signed in as the simulated training identity Mira Solanki, role Security Operator (simulated)"><span class="avatar" aria-hidden="true">MS</span>' +
            '<span class="account-meta"><b>' + esc(sh.account || 'SOC Analyst (simulated)') + '</b><small>' + esc(sh.accountRole || 'Simulated role \u00b7 read+respond') + '</small></span></div>' +
        '</div>' +
      '</header>' +
      '<div class="env-strip">' +
        '<span class="pill"><span aria-hidden="true">\u25c9</span> ' + esc(sh.tenant || 'contoso-rcw.example \u00b7 simulated tenant') + '</span>' +
        '<span class="pill amber"><span aria-hidden="true">\u25b3</span> Console replica \u00b7 not Microsoft software</span>' +
        '<span class="pill green"><span aria-hidden="true">\u2713</span> Offline \u00b7 synthetic data \u00b7 no tenant connection</span>' +
        '<span class="grow"></span>' +
        '<span class="footnote">' + esc(sh.iaNote || 'Portal IA modelled on the 2026 Microsoft Defender portal') + '</span>' +
        '<button class="btn btn--sm" type="button" data-lab-reset>Reset lab</button>' +
      '</div>' +
      '<div class="body-grid">' +
        '<aside class="side-nav" id="labNav" aria-label="Lab console navigation">' +
          '<div class="nav-top"><b>' + esc(sh.navTitle || 'Defender portal') + '</b><button class="nav-close" type="button" id="navCloseButton" aria-label="Close navigation">\u00d7</button></div>' +
          nav +
          '<p class="nav-note"><b>Safe training mode</b>Actions here change a simulated model only. No device is isolated, no mail is deleted, and no credential is reset for a real user.</p>' +
        '</div>' +
        '<div id="navScrim" aria-hidden="true"></div>' +
        '<main class="content" id="labMain" tabindex="-1">' +
          '<div class="progress-head" role="group" aria-label="Lab progress">' +
            '<span class="plabel" id="progressLabel">Progress</span>' +
            '<div class="progress-track" role="progressbar" aria-label="Overall lab progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span id="progressBar"></span></div>' +
            '<span class="score" id="scoreLabel">Score: 0 / 100</span>' +
            '<button class="btn btn--sm" type="button" data-audit-toggle>Action log (<span id="rcwAuditCount">0</span>)</button>' +
          '</div>' +
          '<div id="labViews"></div>' +
        '</main>' +
      '</div>' +
      '<footer class="page-foot"><div class="frow">' +
        '<span class="grow">Independent RCW IT Training practice material. Not affiliated with, endorsed by, or sponsored by Microsoft. &ldquo;Microsoft Defender&rdquo;, &ldquo;Defender for Endpoint&rdquo; and similar marks belong to their owner and are used only to describe the product workflow being taught.</span>' +
        '<a href="../microsoft-defender-labs/compliance-standards.html">Lab &amp; accessibility standards</a>' +
        '<a href="../microsoft-defender-labs/">All Defender labs</a>' +
        '<a href="https://www.rcwittraining.in/">www.rcwittraining.in</a>' +
        '<span>&copy; <span data-lab-year>2026</span> RCW IT Training \u00b7 Founder Pradeep Raju</span>' +
      '</div></footer>' +
      '<div class="flyout" id="rcwAuditFlyout" hidden role="dialog" aria-modal="false" aria-labelledby="rcwAuditTitle">' +
        '<header><h2 id="rcwAuditTitle">Console action log</h2><span class="chip plain sev-info">this browser only</span>' +
          '<span class="card-actions"><button class="btn btn--sm" type="button" data-evidence="download">Export JSON</button>' +
          '<button class="btn btn--sm" type="button" data-audit-close aria-label="Close the action log">\u00d7</button></span></header>' +
        '<div class="f-body">' +
          '<p class="small muted mb0">Every button, selection and query you submit is timestamped here in UTC. Values are passed through the redactor before they are written, so accidental pastes of real UPNs, IPs or hashes are masked automatically.</p>' +
          '<div class="grid-wrap" style="margin-top:10px"><table class="data-grid"><thead><tr><th scope="col">Time (UTC)</th><th scope="col">Level</th><th scope="col">Action</th></tr></thead><tbody id="rcwAuditList"></tbody></table></div>' +
        '</div></div>' +
      '<div class="modal-backdrop" id="rcwResetModal" hidden role="dialog" aria-modal="true" aria-labelledby="rcwResetTitle">' +
        '<div class="modal"><header><h2 id="rcwResetTitle">Reset this lab?</h2></header>' +
        '<div class="m-body"><p>All objectives, evidence entries and the action log stored in <strong>this browser</strong> will be deleted. Nothing is stored on a server, so there is nothing to delete remotely.</p></div>' +
        '<div class="m-foot"><button class="btn" type="button" data-reset-cancel>Keep my progress</button><button class="btn btn--danger" type="button" data-reset-confirm>Reset the lab</button></div></div></div>';
    if (doc.getElementById('labShell')) {
      var host = doc.getElementById('labShell');
      host.innerHTML = html;
    } else {
      doc.body.insertAdjacentHTML('afterbegin', html);
    }
    var viewsHost = doc.getElementById('labViews');
    var src = doc.getElementById('labViewsSource');
    if (viewsHost && src) { viewsHost.appendChild(src); src.removeAttribute('id'); src.removeAttribute('hidden'); }
    var gs = doc.getElementById('labGlobalSearch');
    if (gs) gs.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var q = gs.value.trim().toLowerCase();
      if (!q) return;
      var views = $$('[data-view]'), hit = null;
      for (var i = 0; i < views.length; i++) { if (String(views[i].textContent).toLowerCase().indexOf(q) >= 0) { hit = views[i]; break; } }
      if (hit) { go(hit.getAttribute('data-view')); toast('Jumped to', (hit.getAttribute('data-view-label') || hit.getAttribute('data-view')) + ' \u2014 matched your search', 'ok'); }
      else { toast('No match', 'Nothing in this lab mentions "' + q.slice(0, 40) + '". Try a control name such as isolate, quarantine or KQL.', 'warn'); }
    });
  }
  api.renderShell = renderShell;

  global.RCWLab = api;
  global.RCWLabUtil = { esc: esc, redact: redact, stamp: stamp, $: $, $$: $$ };
})(typeof window !== 'undefined' ? window : globalThis);
