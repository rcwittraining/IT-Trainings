/* ==========================================================================
   RCW KQL-Lite - a dependency-free subset of Kusto Query Language (KQL)
   --------------------------------------------------------------------------
   Lets the RCW IT Training Advanced Hunting console replica actually EXECUTE
   learner queries against a synthetic in-memory dataset instead of replaying
   canned screenshots.

   Compliance properties (see ../compliance-standards.html):
     * Pure functions - no DOM, no network, no storage, no telemetry.
     * Only ever sees the synthetic datasets the lab supplies.
     * Deterministic - same query + same data => same result.

   Supported subset: let, where, take/limit, count, distinct, project,
   project-away, project-rename, extend, summarize (count/dcount/sum/avg/
   min/max/countif/make_set/make_list), order by, union, join, render
   (ignored); datetime()/now()/ago()/timespans; iff/strcat/tolower/toupper/
   bin/parse_json/bag_keys/set_has/datetime_part/replace/indexof/strlen/
   substring/countof/coalesce/case/tostring/toint/toreal.
   ========================================================================== */
(function (global) {
  'use strict';

  var MS = { ns: 0.000001, us: 0.001, ms: 1, sec: 1000, s: 1000, secs: 1000, min: 60000, mins: 60000, m: 60000,
    hour: 3600000, hours: 3600000, h: 3600000, day: 86400000, days: 86400000, d: 86400000,
    week: 604800000, weeks: 604800000, w: 604800000, month: 2592000000, months: 2592000000, mo: 2592000000,
    year: 31536000000, years: 31536000000, y: 31536000000 };
  var KW = ('let and or not in contains has startswith endswith between matches regex by asc desc nulls ' +
    'where take limit project rename away extend summarize count distinct union join kind on outer inner ' +
    'leftouter rightouter fullouter render serialize materialize graph as from to step true false null order sort '
    + 'has_any has_all has_cs contains_cs startswith_cs endswith_cs isfuzzy withsource').split(' ');

  function err(m) { var e = new Error(m); e.rcwKql = true; return e; }
  function parseDateLiteral(v) {
    var d = new Date(String(v).indexOf('T') > 0 ? v : String(v).replace(' ', 'T'));
    if (isNaN(d.getTime())) throw err("Could not parse the date/time value '" + v + "'. Use a form such as datetime(2026-08-19 09:41:22Z).");
    return d;
  }
  function isDigit(c) { return c >= '0' && c <= '9'; }
  function isNameStart(c) { return /[A-Za-z_$]/.test(c); }
  function isNameChar(c) { return /[A-Za-z0-9_$\-.]/.test(c); }

  /* --------------------------------------------------------------- lexer */
  function lex(src) {
    var t = [], i = 0, n = src.length;
    while (i < n) {
      var c = src[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
      if (c === "'") {
        var s = ''; i++;
        while (i < n) {
          if (src[i] === "'" && src[i + 1] === "'") { s += "'"; i += 2; continue; }
          if (src[i] === "'") break;
          s += src[i++];
        }
        if (src[i] !== "'") throw err('Syntax error: a string literal is not closed.');
        i++; t.push({ k: 'str', v: s }); continue;
      }
      if (c === '"') {
        var s2 = ''; i++;
        while (i < n && src[i] !== '"') { if (src[i] === '\\') { s2 += src[i + 1]; i += 2; continue; } s2 += src[i++]; }
        i++; t.push({ k: 'str', v: s2 }); continue;
      }
      if (c === '`') {
        var s3 = ''; i++;
        while (i < n && src[i] !== '`') s3 += src[i++];
        i++; t.push({ k: 'id', v: s3 }); continue;
      }
      if (isDigit(c) || (c === '.' && isDigit(src[i + 1]))) {
        var num = '', j = i, dot = false;
        while (j < n && (isDigit(src[j]) || (src[j] === '.' && !dot))) { if (src[j] === '.') dot = true; num += src[j++]; }
        var m = src.slice(j).match(/^(ns|us|ms|secs|sec|mins|min|m|hours|hour|h|days|day|d|weeks|week|w|months|month|mo|years|year|y)(?![A-Za-z])/);
        if (m) { t.push({ k: 'span', v: parseFloat(num) * MS[m[1]] }); j += m[1].length; }
        else t.push({ k: 'num', v: parseFloat(num) });
        i = j; continue;
      }
      if (isNameStart(c)) {
        var dtx = /^(datetime|format_datetime|todatetime)$/i.test(src.slice(i, i + 8)) && /^\(\s*['"]?\d{4}-/.test(src.slice(i).replace(/^[A-Za-z_]+/, ''));
        if (dtx) {
          var nm2 = src.slice(i).match(/^[A-Za-z_]+/) [0];
          var q = i + nm2.length + 1, depth = 1, raw = '';
          while (q < n && depth > 0) { var cc = src[q]; if (cc === '(') depth++; else if (cc === ')') { depth--; if (!depth) break; } raw += cc; q++; }
          if (depth > 0) throw err('Syntax error: datetime() is missing its closing parenthesis.');
          i = q + 1;
          t.push({ k: 'dt', v: raw.trim().replace(/^['"]|['"]$/g, ''), fname: nm2.toLowerCase() });
          continue;
        }
        var id = '';
        while (i < n && isNameChar(src[i]) && !(src[i] === '~' && id.toLowerCase() === 'in')) id += src[i++];
        while (src[i] === '.' && isNameStart(src[i + 1])) { i++; var more = ''; while (i < n && isNameChar(src[i])) more += src[i++]; id += '.' + more; }
        var hy = id.match(/^(project)-(away|rename)$/i);
        if (hy) { t.push({ k: 'kw', v: 'project' }); t.push({ k: 'kw', v: hy[2].toLowerCase() }); continue; }
        var lw = id.toLowerCase();
        if (src[i] === '~' && lw === 'in') { i++; t.push({ k: 'id', v: 'in~' }); continue; }
        if (src[i] === '~' && lw === 'contains') { i++; t.push({ k: 'kw', v: 'contains_cs' }); continue; }
        if (src[i] === '~' && lw === 'has') { i++; t.push({ k: 'kw', v: 'has_cs' }); continue; }
        if (KW.indexOf(lw) >= 0 && id.indexOf('.') === -1) t.push({ k: 'kw', v: lw, raw: id });
        else t.push({ k: 'id', v: id });
        continue;
      }
      var two = src.slice(i, i + 2);
      if (two === '==' || two === '!=' || two === '<>' || two === '>=' || two === '<=' || two === '..' || two === '=~' || two === '!~') {
        t.push({ k: 'op', v: two === '<>' ? '!=' : two }); i += 2; continue;
      }
      if ('|(),;=+-*/%<>~!.[]'.indexOf(c) >= 0) { t.push({ k: 'op', v: c }); i++; continue; }
      throw err('Unexpected character "' + c + '" in the query text.');
    }
    return t;
  }

  /* -------------------------------------------------------------- parser */
  function parse(src) {
    var toks = lex(String(src == null ? '' : src));
    var p = 0;
    function peek(o) { return toks[p + (o || 0)]; }
    function at(kw) { var t = peek(); return !!t && t.k === 'kw' && t.v === kw; }
    function eat(kw) { if (at(kw)) { p++; return true; } return false; }
    function need(kw) { if (!eat(kw)) throw err("Syntax error: expected '" + kw + "'."); }
    function atOp(v) { var t = peek(); return !!t && t.k === 'op' && t.v === v; }
    function eatOp(v) { if (atOp(v)) { p++; return true; } return false; }
    function needOp(v, what) { if (!eatOp(v)) throw err('Syntax error: expected ' + (what || "'" + v + "'") + '.'); }
    function needId(what) { var t = peek(); if (!t || t.k !== 'id') throw err('Syntax error: expected ' + (what || 'a name') + '.'); p++; return t.v; }

    /* does the upcoming let-value contain a pipeline before its terminator? */
    function valueHasPipeline() {
      var d = 0;
      for (var k = p; k < toks.length; k++) {
        var t = toks[k];
        if (t.k === 'op') {
          if (t.v === '(' || t.v === '[') d++;
          else if (t.v === ')' || t.v === ']') d--;
          else if (t.v === '|' && d === 0) return true;
          else if (t.v === ';' && d === 0) return false;
        }
      }
      return false;
    }

    function parseStatementList() {
      var out = [];
      while (peek()) {
        if (eat('let')) {
          var name = needId('an identifier after "let"');
          needOp('=', '=');
          if (atOp('(')) {
            p++;
            var save = p;
            try { var iq = parseQuery(); needOp(')', ')'); out.push({ type: 'let-table', name: name, query: iq }); }
            catch (e) { if (!e.rcwKql) throw e; p = save; var ie = parseExpr(); needOp(')', ')'); out.push({ type: 'let-scalar', name: name, value: ie }); }
          } else if (peek() && peek().k === 'id' && valueHasPipeline()) {
            out.push({ type: 'let-table', name: name, query: parseQuery() });
          } else {
            var sv = parseExpr();
            var nx = peek();
            var atEnd = !nx || (nx.k === 'op' && nx.v === ';');
            if (sv && sv.type === 'col' && !sv.table && atEnd) out.push({ type: 'let-table', name: name, query: { source: { kind: 'ref', name: sv.name }, ops: [] } });
            else out.push({ type: 'let-scalar', name: name, value: sv });
          }
          eatOp(';');
          continue;
        }
        out.push({ type: 'query', query: parseQuery() });
        if (!eatOp(';')) break;
      }
      if (!out.length) throw err('The query is empty. Start with a table name, for example: DeviceEvents | take 10');
      return out;
    }

    function parseQuery() {
      var node = { source: parsePipelineSource(), ops: [] };
      while (eatOp('|')) { var op = parseOperator(); if (op) node.ops.push(op); }
      return node;
    }

    function postfix(base) {
      for (; ;) {
        if (atOp('.') && peek(1) && (peek(1).k === 'id' || peek(1).k === 'kw')) { var f = peek(1).v; p += 2; base = { type: 'path', left: base, field: f }; continue; }
        if (atOp('[')) {
          var saveIx = p; p++;
          var tk = peek();
          if (tk && (tk.k === 'str' || tk.k === 'id') && peek(1) && peek(1).k === 'op' && peek(1).v === ']') { p += 2; base = { type: 'path', left: base, field: tk.v }; continue; }
          p = saveIx; return base;
        }
        return base;
      }
    }

    var RESERVED_TABLE = ['let', 'where', 'summarize', 'order', 'sort', 'project', 'extend', 'take', 'limit', 'count', 'distinct', 'render', 'serialize', 'materialize', 'and', 'or', 'not', 'by', 'asc', 'desc', 'true', 'false', 'null'];

    function parsePipelineSource() {
      if (at('union')) {
        p++;
        for (; ;) { var ux0 = peek(); if (ux0 && (ux0.v === 'isfuzzy' || ux0.v === 'withsource') && peek(1) && peek(1).k === 'op' && peek(1).v === '=') { p += 3; continue; } break; }
        var uts = [parsePipelineSource()]; while (eatOp(',')) uts.push(parsePipelineSource());
        return { kind: 'union', tables: uts };
      }
      if (at('range')) {
        p++; var col = needId('a range column name'); need('from'); var from = parseExpr(); need('to'); var to = parseExpr();
        var step = 1; if (eat('step')) step = parseExpr();
        return { kind: 'range', col: col, from: from, to: to, step: step };
      }
      var t = peek();
      if (!t) throw err('The query ends before a table name is given. Start with a table such as DeviceEvents.');
      if (t.k === 'id') { p++; return { kind: 'ref', name: t.v }; }
      if (t.k === 'str') { p++; return { kind: 'ref', name: t.v }; }
      if (t.k === 'kw' && RESERVED_TABLE.indexOf(t.v) === -1) { p++; return { kind: 'ref', name: t.raw || t.v }; }
      throw err('Failed to resolve a tabular source near "' + (t.raw || t.v) + '". Table names available in this lab are listed in the Schema blade.');
    }

    function parseOperator() {
      var t = peek();
      if (!t || t.k !== 'kw') throw err(t
        ? "Unsupported operator near '" + (t.raw || t.v) + "'. KQL-Lite supports where, project, project-rename, project-away, extend, summarize, count, take, order by, distinct, union, join and render."
        : 'Syntax error: the query ends with an incomplete operator.');
      switch (t.v) {
        case 'where': p++; return { op: 'where', expr: parseExpr() };
        case 'take': case 'limit': p++; return { op: 'take', n: parseExpr() };
        case 'count': p++; return { op: 'count' };
        case 'distinct': { p++; var dc = [parseColumnSpec()]; while (eatOp(',')) dc.push(parseColumnSpec()); return { op: 'distinct', cols: dc }; }
        case 'order': case 'sort': {
          p++; need('by'); var keys = [];
          do { var e = parseExpr(); var dir = eat('desc') ? 'desc' : (eat('asc') ? 'asc' : 'asc'); if (at('nulls')) { p++; if (peek() && peek().k === 'kw') p++; } keys.push({ expr: e, dir: dir }); } while (eatOp(','));
          return { op: 'order', keys: keys };
        }
        case 'project': {
          p++;
          if (eat('away')) { var aw = []; do { aw.push(needId('a column name')); } while (eatOp(',')); return { op: 'project-away', cols: aw }; }
          if (eat('rename')) { var rn = []; do { rn.push(parseColumnSpec()); } while (eatOp(',')); return { op: 'project-rename', cols: rn }; }
          var pr = []; do { pr.push(parseColumnSpec()); } while (eatOp(','));
          return { op: 'project', cols: pr };
        }
        case 'extend': { p++; var ex = []; do { ex.push(parseColumnSpec()); } while (eatOp(',')); return { op: 'extend', cols: ex }; }
        case 'summarize': {
          p++; var aggs = [], bys = [], implicit = false;
          if (!at('by')) { do { aggs.push(parseColumnSpec()); } while (eatOp(',')); } else implicit = true;
          if (eat('by')) { do { bys.push(parseColumnSpec()); } while (eatOp(',')); }
          if (implicit || !aggs.length) aggs.unshift({ name: 'Count', expr: { type: 'call', fn: 'count', args: [] }, agg: 'count' });
          aggs.forEach(function (a) { if (!a.name) a.name = aggName(a); });
          return { op: 'summarize', aggs: aggs, bys: bys };
        }
        case 'serialize': case 'materialize': p++; return { op: 'noop' };
        case 'render': { p++; while (peek() && !atOp('|') && !atOp(';')) p++; return { op: 'noop' }; }
        case 'union': {
          p++;
          for (; ;) {
            var ux = peek();
            if (ux && (ux.v === 'isfuzzy' || ux.v === 'withsource' || ux.v === 'kind') && peek(1) && peek(1).k === 'op' && peek(1).v === '=') { p += 3; continue; }
            break;
          }
          var us = [parsePipelineSource()]; while (eatOp(',')) us.push(parsePipelineSource()); return { op: 'unionop', tables: us }; }
        case 'join': {
          p++; var kind = 'innerunique';
          if (eat('kind')) { eatOp('='); var kt = peek(); if (kt && (kt.k === 'kw' || kt.k === 'id')) { p++; kind = String(kt.v).toLowerCase(); } }
          needOp('(', '('); var right = parseQuery(); needOp(')', ')');
          var on = []; if (eat('on')) { do { on.push(needId('a join key')); } while (eatOp(',')); }
          return { op: 'join', kind: kind, right: right, on: on };
        }
      }
      throw err("Unsupported operator '" + (t.raw || t.v) + "' in KQL-Lite.");
    }

    function aggName(a) {
      if (a.expr && a.expr.type === 'call') return a.expr.args.length ? String(a.expr.args[0].name || 'Value') + '_' + a.expr.fn : 'Count';
      return String((a.expr && a.expr.name) || 'Value');
    }

    function parseColumnSpec() {
      var t = peek();
      if (t && (t.k === 'id' || t.k === 'kw') && peek(1) && peek(1).k === 'op' && peek(1).v === '=') { p += 2; return { name: t.raw || t.v, expr: parseExpr() }; }
      var e = parseExpr();
      return { name: e.type === 'col' ? e.name : null, expr: e };
    }

    function parseExpr() { return parseOr(); }
    function parseOr() { var l = parseAnd(); while (eat('or')) l = { type: 'or', left: l, right: parseAnd() }; return l; }
    function parseAnd() { var l = parseNot(); while (eat('and')) l = { type: 'and', left: l, right: parseNot() }; return l; }
    function parseNot() { if (eat('not')) return { type: 'not', expr: parseNot() }; return parseCompare(); }
    function parseCompare() {
      var l = parseAdd();
      var t = peek();
      if (!t) return l;
      if (t.k === 'op' && ['!=', '==', '>', '>=', '<', '<=', '=~', '!~'].indexOf(t.v) >= 0) { p++; return { type: t.v, left: l, right: parseAdd() }; }
      if (t.k === 'op' && t.v === '!') {
        var nt = peek(1);
        if (nt && ((nt.k === 'kw' && ['contains', 'has', 'startswith', 'endswith', 'in', 'between'].indexOf(nt.v) >= 0) || (nt.k === 'id' && nt.v === 'in~'))) {
          p += 2;
          if (nt.v === 'in' || nt.v === 'in~') { var ni = parseItemList(); return { type: 'not', expr: { type: nt.v, left: l, items: ni, tableOperand: singleTableOperand(ni) } }; }
          if (nt.v === 'between') { needOp('(', '('); var l2 = parseExpr(); needOp('..', 'the range operator (..)'); var h2 = parseExpr(); needOp(')', ')'); return { type: 'not', expr: { type: 'between', left: l, lo: l2, hi: h2 } }; }
          return { type: 'not', expr: { type: nt.v, left: l, right: parseAdd() } };
        }
      }
      if (t.k === 'id' && t.v === 'in~') { p++; var inItems2 = parseItemList(); return { type: 'in~', left: l, items: inItems2, tableOperand: singleTableOperand(inItems2) }; }
      if (t.k === 'kw') {
        if (['contains', 'has', 'startswith', 'endswith'].indexOf(t.v) >= 0) { p++; return { type: t.v, left: l, right: parseAdd() }; }
        if (['contains_cs', 'has_cs', 'startswith_cs', 'endswith_cs'].indexOf(t.v) >= 0) { p++; return { type: t.v.replace('_cs', ''), left: l, right: parseAdd(), cs: true }; }
        if (t.v === 'has_any' || t.v === 'has_all') { p++; return { type: t.v, left: l, items: parseItemList() }; }
        if (t.v === 'in') { p++; var inItems = parseItemList(); return { type: 'in', left: l, items: inItems, tableOperand: singleTableOperand(inItems) }; }
        if (t.v === 'between') { p++; needOp('(', '('); var lo = parseExpr(); needOp('..', 'the range operator (..)'); var hi = parseExpr(); needOp(')', ')'); return { type: 'between', left: l, lo: lo, hi: hi }; }
        if (t.v === 'matches') { p++; if (!eat('regex')) throw err("'matches' must be followed by 'regex'."); return { type: 'regex', left: l, right: parseAdd() }; }
      }
      return l;
    }
    function singleTableOperand(items) { return items && items.length === 1 && items[0].type === 'col' ? items[0].name : null; }
    function parseItemList() {
      needOp('(', '('); var items = [];
      if (!atOp(')')) { do { items.push(parseExpr()); } while (eatOp(',')); }
      needOp(')', ')');
      return items;
    }
    function parseAdd() { var l = parseMul(); for (; ;) { if (eatOp('+')) l = { type: '+', left: l, right: parseMul() }; else if (eatOp('-')) l = { type: '-', left: l, right: parseMul() }; else return l; } }
    function parseMul() { var l = parseUnary(); for (; ;) { if (eatOp('*')) l = { type: '*', left: l, right: parseUnary() }; else if (eatOp('/')) l = { type: '/', left: l, right: parseUnary() }; else if (eatOp('%')) l = { type: '%', left: l, right: parseUnary() }; else return l; } }
    function parseUnary() { if (eatOp('-')) return { type: 'neg', expr: parseUnary() }; return parsePrimary(); }
    function parsePrimary() {
      var t = peek();
      if (!t) throw err('Unexpected end of query - an expression is incomplete.');
      if (t.k === 'num') { p++; return { type: 'lit', v: t.v }; }
      if (t.k === 'str') { p++; return { type: 'lit', v: t.v }; }
      if (t.k === 'span') { p++; return { type: 'lit', v: t.v, timespan: true }; }
      if (t.k === 'kw' && (t.v === 'true' || t.v === 'false' || t.v === 'null')) { p++; return { type: 'lit', v: t.v === 'true' ? true : t.v === 'false' ? false : null }; }
      if (t.k === 'dt') { p++; return postfix({ type: 'lit', v: parseDateLiteral(t.v), rawDate: true }); }
      if (atOp('(')) { p++; var e = parseExpr(); needOp(')', ')'); return e; }
      /* Reserved words keep their operator meaning; anything else (including a
         column the learner named Count, Sum or Min) resolves as a column. */
      var RESERVED = ['and', 'or', 'not', 'in', 'contains', 'has', 'startswith', 'endswith', 'between', 'matches', 'regex', 'asc', 'desc', 'nulls', 'true', 'false', 'null', 'by', 'from', 'to', 'step', 'kind', 'on', 'as'];
      if (t.k === 'id' || (t.k === 'kw' && peek(1) && peek(1).k === 'op' && peek(1).v === '(') || (t.k === 'kw' && RESERVED.indexOf(t.v) === -1)) {
        var fname = (t.k === 'kw' ? (t.raw || t.v) : t.v); p++;
        if (atOp('(')) {
          p++; var args = [];
          if (!atOp(')')) { do { args.push(parseExpr()); } while (eatOp(',')); }
          needOp(')', ')');
          return postfix({ type: 'call', fn: String(fname).toLowerCase(), args: args });
        }
        return postfix({ type: 'col', name: fname });
      }
      throw err("Cannot parse the expression near '" + (t.raw || t.v) + "'.");
    }

    var statements = parseStatementList();
    if (peek() && !atOp(';')) throw err("Unexpected '" + (peek().raw || peek().v) + "' after the end of the query.");
    return { statements: statements };
  }

  /* -------------------------------------------------------- value helpers */
  function isDateStr(v) { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(v); }
  function isDate(v) { return v instanceof Date || isDateStr(v); }
  function ms(v) {
    if (v instanceof Date) return v.getTime();
    if (isDateStr(v)) return Date.parse(v.indexOf('T') > 0 ? v : v.replace(' ', 'T'));
    if (typeof v === 'number') return v;
    return NaN;
  }
  function iso(v) {
    var d = v instanceof Date ? v : new Date(ms(v));
    if (isNaN(d.getTime())) return String(v);
    return d.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, 'Z');
  }
  function shallow(o) { var r = {}; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k]; return r; }
  function truthy(v) { return !(v === false || v === null || v === undefined || v === 0 || v === ''); }
  function toStr(v) {
    if (v === null || v === undefined) return '';
    if (v instanceof Date) return iso(v);
    if (isDateStr(v)) return iso(v);
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    if (Array.isArray(v)) return v.map(toStr).join(', ');
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  }
  function cmp(a, b) {
    if (isDate(a) || isDate(b)) { var x = ms(a), y = ms(b); if (!isNaN(x) && !isNaN(y)) return x === y ? 0 : (x < y ? -1 : 1); }
    if (typeof a === 'number' && typeof b === 'number') return a === b ? 0 : (a < b ? -1 : 1);
    if (typeof a === 'boolean' || typeof b === 'boolean') { var p = truthy(a) ? 1 : 0, q = truthy(b) ? 1 : 0; return p - q; }
    var sa = toStr(a).toLowerCase(), sb = toStr(b).toLowerCase();
    if (typeof a === 'string' && typeof b === 'string') return a === b ? 0 : (a < b ? -1 : 1);
    return sa === sb ? 0 : (sa < sb ? -1 : 1);
  }
  function eq(a, b) {
    if (a === b) return true;
    if (isDate(a) || isDate(b)) { var x = ms(a), y = ms(b); if (!isNaN(x) && !isNaN(y)) return x === y; }
    if (typeof a === 'number' && typeof b === 'number') return a === b;
    if (typeof a === 'boolean' || typeof b === 'boolean') { if (a === null || b === null) return false; return truthy(a) === truthy(b); }
    if (a === null || a === undefined || b === null || b === undefined) return false;
    return toStr(a) === toStr(b);
  }
  function num(v) {
    if (typeof v === 'number') return v;
    if (v instanceof Date) return v.getTime();
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (isDate(v)) { var m = ms(v); return isNaN(m) ? 0 : m; }
    var n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }

  /* ------------------------------------------------------------- runtime */
  function evalExpr(node, row, consts, ctx) {
    switch (node.type) {
      case 'lit': return node.v;
      case 'col': return colValue(row, node.name, consts);
      case 'path': {
        var host = evalExpr(node.left, row, consts, ctx);
        if (typeof host === 'string') { try { host = JSON.parse(host); } catch (e) { return null; } }
        if (host === null || host === undefined) return null;
        var hv = host[node.field];
        return hv === undefined ? null : hv;
      }
      case 'and': return truthy(evalExpr(node.left, row, consts, ctx)) && truthy(evalExpr(node.right, row, consts, ctx));
      case 'or': return truthy(evalExpr(node.left, row, consts, ctx)) || truthy(evalExpr(node.right, row, consts, ctx));
      case 'not': return !truthy(evalExpr(node.expr, row, consts, ctx));
      case 'neg': return -num(evalExpr(node.expr, row, consts, ctx));
      case '+': { var la = evalExpr(node.left, row, consts, ctx), ra = evalExpr(node.right, row, consts, ctx); return (typeof la === 'string' || typeof ra === 'string') ? toStr(la) + toStr(ra) : num(la) + num(ra); }
      case '-': return num(evalExpr(node.left, row, consts, ctx)) - num(evalExpr(node.right, row, consts, ctx));
      case '*': return num(evalExpr(node.left, row, consts, ctx)) * num(evalExpr(node.right, row, consts, ctx));
      case '/': { var dv = num(evalExpr(node.right, row, consts, ctx)); if (!dv) throw err('Division by zero.'); return num(evalExpr(node.left, row, consts, ctx)) / dv; }
      case '%': { var d2 = num(evalExpr(node.right, row, consts, ctx)); if (!d2) throw err('Division by zero.'); return num(evalExpr(node.left, row, consts, ctx)) % d2; }
      case '==': return eq(evalExpr(node.left, row, consts, ctx), evalExpr(node.right, row, consts, ctx));
      case '=~': return toStr(evalExpr(node.left, row, consts, ctx)).toLowerCase() === toStr(evalExpr(node.right, row, consts, ctx)).toLowerCase();
      case '!~': return toStr(evalExpr(node.left, row, consts, ctx)).toLowerCase() !== toStr(evalExpr(node.right, row, consts, ctx)).toLowerCase();
      case '!=': return !eq(evalExpr(node.left, row, consts, ctx), evalExpr(node.right, row, consts, ctx));
      case '>': return cmp(evalExpr(node.left, row, consts, ctx), evalExpr(node.right, row, consts, ctx)) > 0;
      case '>=': return cmp(evalExpr(node.left, row, consts, ctx), evalExpr(node.right, row, consts, ctx)) >= 0;
      case '<': return cmp(evalExpr(node.left, row, consts, ctx), evalExpr(node.right, row, consts, ctx)) < 0;
      case '<=': return cmp(evalExpr(node.left, row, consts, ctx), evalExpr(node.right, row, consts, ctx)) <= 0;
      case 'contains': { var cs = !!node.cs, ch = toStr(evalExpr(node.left, row, consts, ctx)), ck = toStr(evalExpr(node.right, row, consts, ctx)); if (!cs) { ch = ch.toLowerCase(); ck = ck.toLowerCase(); } return ch.indexOf(ck) >= 0; }
      case 'has': {
        var hay = toStr(evalExpr(node.left, row, consts, ctx)).toLowerCase(), nee = toStr(evalExpr(node.right, row, consts, ctx)).toLowerCase();
        if (!nee) return false;
        return hay.split(/[^a-z0-9_]+/).indexOf(nee) >= 0 || hay.indexOf(nee) >= 0;
      }
      case 'startswith': { var bh = toStr(evalExpr(node.left, row, consts, ctx)), bk = toStr(evalExpr(node.right, row, consts, ctx)); if (!node.cs) { bh = bh.toLowerCase(); bk = bk.toLowerCase(); } return bh.indexOf(bk) === 0; }
      case 'endswith': { var s1 = toStr(evalExpr(node.left, row, consts, ctx)).toLowerCase(), s2 = toStr(evalExpr(node.right, row, consts, ctx)).toLowerCase(); return s2 === '' ? true : s1.slice(-s2.length) === s2; }
      case 'in': case 'in~': {
        var iv = evalExpr(node.left, row, consts, ctx);
        if (node.tableOperand && consts[node.tableOperand] && consts[node.tableOperand].__table) {
          var tr = consts[node.tableOperand].__table, set = Object.create(null);
          tr.forEach(function (r3) { var k3 = Object.keys(r3)[0]; set[toStr(r3[k3]).toLowerCase()] = 1; });
          return !!set[toStr(iv).toLowerCase()];
        }
        for (var i = 0; i < node.items.length; i++) {
          var cand = evalExpr(node.items[i], row, consts, ctx);
          if (node.type === 'in~' ? (toStr(iv).toLowerCase() === toStr(cand).toLowerCase()) : eq(iv, cand)) return true;
        }
        return false;
      }
      case 'has_any': case 'has_all': {
        var hay = toStr(evalExpr(node.left, row, consts, ctx)).toLowerCase();
        var terms = node.items.map(function (it) { return toStr(evalExpr(it, row, consts, ctx)).toLowerCase(); });
        var hit = function (w) { return hay.split(/[^a-z0-9_.\/-]+/).indexOf(w) >= 0 || hay.indexOf(w) >= 0; };
        return node.type === 'has_any' ? terms.some(hit) : terms.every(hit);
      }
      case 'between': { var bv = evalExpr(node.left, row, consts, ctx); return cmp(bv, evalExpr(node.lo, row, consts, ctx)) >= 0 && cmp(bv, evalExpr(node.hi, row, consts, ctx)) <= 0; }
      case 'regex': { var rx = toStr(evalExpr(node.right, row, consts, ctx)); try { return new RegExp(rx, 'i').test(toStr(evalExpr(node.left, row, consts, ctx))); } catch (e) { throw err("Invalid regular expression: '" + rx + "'."); } }
      case 'call': return callFn(node.fn, node.args, row, consts, ctx);
    }
    throw err('Cannot evaluate the expression fragment "' + node.type + '".');
  }

  function colValue(row, name, consts) {
    if (name.indexOf('.') >= 0) {
      var parts = name.split('.'), cur = row;
      for (var i = 0; i < parts.length; i++) {
        if (cur === null || cur === undefined) return null;
        if (typeof cur === 'string') { try { cur = JSON.parse(cur); } catch (e) { return null; } }
        cur = cur[parts[i]];
      }
      return cur === undefined ? null : cur;
    }
    if (row && Object.prototype.hasOwnProperty.call(row, name)) return row[name];
    if (consts && name in consts) {
      if (consts[name].__scalar !== undefined) return consts[name].__scalar;
      return consts[name].__table;
    }
    if (row && Object.keys(row).length) {
      var alt = Object.keys(row).filter(function (k) { return k.toLowerCase() === name.toLowerCase(); })[0];
      if (alt !== undefined) return row[alt];
      if (name.indexOf('.') === -1) throw err("Failed to resolve column '" + name + "'. Check the column name against the table schema in the Schema blade.");
    }
    return undefined;
  }

  function callFn(fn, argNodes, row, consts, ctx) {
    var a = function (i) { return argNodes[i] === undefined ? null : evalExpr(argNodes[i], row, consts, ctx); };
    switch (fn) {
      case 'datetime': case 'todatetime': case 'todate': {
        var d = a(0);
        if (d instanceof Date) return d;
        var s = toStr(d);
        var dt = new Date(s.indexOf('T') > 0 ? s : s.replace(' ', 'T'));
        if (isNaN(dt.getTime())) throw err("datetime() could not read '" + s + "'. Use a form such as datetime(2026-08-19 09:41:22Z).");
        return dt;
      }
      case 'now': return new Date(ctx.now + (argNodes.length ? num(a(0)) : 0));
      case 'ago': return new Date(ctx.now - num(a(0)));
      case 'timespan': case 'totimespan': return num(a(0));
      case 'iff': case 'iif': return truthy(a(0)) ? a(1) : a(2);
      case 'case': { for (var i = 0; i + 1 < argNodes.length; i += 2) if (truthy(a(i))) return a(i + 1); return a(argNodes.length - 1); }
      case 'coalesce': { for (var c = 0; c < argNodes.length; c++) { var cv = a(c); if (cv !== null && cv !== undefined && cv !== '') return cv; } return null; }
      case 'strcat': return argNodes.map(function (_, i) { return toStr(a(i)); }).join('');
      case 'tosplit': case 'split': { var sp = toStr(a(0)).split(toStr(a(1))); return argNodes.length > 2 ? sp[num(a(2))] : sp; }
      case 'tostring': return toStr(a(0));
      case 'toint': case 'tolong': return Math.trunc(num(a(0)));
      case 'toreal': case 'todouble': return num(a(0));
      case 'tobool': return truthy(a(0));
      case 'tolower': return toStr(a(0)).toLowerCase();
      case 'toupper': return toStr(a(0)).toUpperCase();
      case 'trim': return toStr(a(0)).trim();
      case 'substring': { var st = toStr(a(0)), f = num(a(1)), l = argNodes.length > 2 ? num(a(2)) : st.length; return st.substr(f, l); }
      case 'indexof': return toStr(a(0)).toLowerCase().indexOf(toStr(a(1)).toLowerCase());
      case 'strlen': return toStr(a(0)).length;
      case 'countof': { var hay2 = toStr(a(0)).toLowerCase(), nee2 = toStr(a(1)).toLowerCase(), c2 = 0, at2 = 0; if (!nee2) return 0; while ((at2 = hay2.indexOf(nee2, at2)) >= 0) { c2++; at2 += nee2.length; } return c2; }
      case 'replace': case 'replace_string': return toStr(a(0)).split(toStr(a(1))).join(toStr(a(2)));
      case 'bin': { var bm = num(a(1)), bv = num(a(0)); return a(0) instanceof Date || isDateStr(a(0)) ? new Date(Math.floor(bv / bm) * bm) : Math.floor(bv / bm) * bm; }
      case 'datetime_part': {
        var dp = toStr(a(0)).toLowerCase(), dd = new Date(ms(a(1)));
        var map = { year: 'getUTCFullYear', month: 'getUTCMonth', day: 'getUTCDate', hour: 'getUTCHours', minute: 'getUTCMinutes', second: 'getUTCSeconds' };
        if (!map[dp]) throw err("datetime_part() does not support the part '" + dp + "'.");
        var val = dd[map[dp]]();
        return dp === 'month' ? val + 1 : val;
      }
      case 'format_datetime': return iso(new Date(ms(a(0))));
      case 'set_has': { var arr = a(0); return (Array.isArray(arr) ? arr : []).map(toStr).indexOf(toStr(a(1))) >= 0; }
      case 'bag_keys': { var bk = a(0); if (typeof bk === 'string') { try { bk = JSON.parse(bk); } catch (e) { bk = {}; } } return Object.keys(bk || {}); }
      case 'parse_json': { var pj = a(0); if (typeof pj === 'object' && pj !== null) return pj; try { return JSON.parse(toStr(pj)); } catch (e) { throw err('parse_json() could not read the value supplied.'); } }
      case 'count': return 1;
      case 'isnull': case 'isempty': { var nv = a(0); return nv === null || nv === undefined || nv === ''; }
      case 'isnotnull': case 'isnotempty': case 'notempty': { var nv2 = a(0); return !(nv2 === null || nv2 === undefined || nv2 === ''); }
      case 'datetime_add': { var un = toStr(a(0)); var amt = num(a(1)); var base = new Date(ms(a(2))); var addMs = { millisecond: 1, second: 1000, minute: 60000, hour: 3600000, day: 86400000, week: 604800000, month: 2592000000, year: 31536000000 }[un.replace(/s$/, '')]; if (!addMs) throw err("datetime_add() does not support the unit '" + un + "'."); return new Date(base.getTime() + amt * addMs); }
      case 'hash': { var hs = 0, hv = toStr(a(0)); for (var z = 0; z < hv.length; z++) hs = (hs * 31 + hv.charCodeAt(z)) >>> 0; return hs % (argNodes.length > 1 ? (num(a(1)) || 100) : 100); }
    }
    throw err("Function '" + fn + "()' is not available in this lab's KQL-Lite engine. Available: count, dcount, sum, avg, min, max, countif, make_set, make_list, iff, case, strcat, tolower, toupper, bin, datetime, ago, now, tostring, toint, parse_json, bag_keys, set_has, strlen, substring, indexof, replace, countof.");
  }

  /* -------------------------------------------------------- tabular ops */
  function execSource(src, ctx, consts) {
    if (src.kind === 'ref') return resolveTable(src.name, ctx, consts).map(shallow);
    if (src.kind === 'range') {
      var rows = [], f = num(evalExpr(src.from, {}, consts, ctx)), t = num(evalExpr(src.to, {}, consts, ctx)), s = num(evalExpr(src.step, {}, consts, ctx)) || 1;
      if (Math.abs(s) < 1) s = 1;
      for (var v = f; v <= t; v += s) { var r = {}; r[src.col] = v; rows.push(r); }
      return rows;
    }
    if (src.kind === 'union') { var all = []; src.tables.forEach(function (t2) { all = all.concat(execSource(t2, ctx, consts)); }); return all; }
    return [];
  }

  function resolveTable(name, ctx, consts) {
    if (name in consts && consts[name] && consts[name].__table) return consts[name].__table;
    if (ctx.tables[name]) return ctx.tables[name];
    var keys = Object.keys(ctx.tables);
    var near = keys.filter(function (k) { return k.toLowerCase() === String(name).toLowerCase(); })[0];
    if (near) return ctx.tables[near];
    throw err("Failed to resolve table or column expression '" + name + "'. Tables in this lab: " + keys.join(', ') + '.');
  }

  function unionAlign(rows) {
    var cols = [];
    rows.forEach(function (r) { Object.keys(r).forEach(function (k) { if (cols.indexOf(k) === -1) cols.push(k); }); });
    return rows.map(function (r) { var o = {}; cols.forEach(function (k) { o[k] = r[k] === undefined ? null : r[k]; }); return o; });
  }

  function applyOp(rows, op, ctx, consts) {
    switch (op.op) {
      case 'where': return rows.filter(function (r) { return truthy(evalExpr(op.expr, r, consts, ctx)); });
      case 'take': return rows.slice(0, Math.max(0, Math.trunc(num(evalExpr(op.n, rows[0] || {}, consts, ctx)))));
      case 'count': return [{ Count: rows.length }];
      case 'noop': return rows;
      case 'project-away': return rows.map(function (r) { var o = shallow(r); op.cols.forEach(function (c) { delete o[c]; }); return o; });
      case 'project-rename': return rows.map(function (r) {
        var o = shallow(r);
        op.cols.forEach(function (c) {
          var from = c.expr && c.expr.type === 'col' ? c.expr.name : c.name;
          if (from && from !== c.name) { o[c.name] = r[from]; delete o[from]; }
        });
        return o;
      });
      case 'project': {
        var dropped = {};
        op.cols.forEach(function (c) { if (c.name && c.expr.type === 'call' && c.expr.fn === 'bag_pack') dropped[c.name] = 1; });
        return rows.map(function (r) {
          var o = {};
          op.cols.forEach(function (c) {
            var nm = c.name || (c.expr.type === 'col' ? c.expr.name : null);
            if (!nm) throw err("'project': every argument must be a column name or a name = expression pair.");
            o[nm] = c.expr.type === 'col' && !Object.prototype.hasOwnProperty.call(r, c.expr.name) ? undefined : evalExpr(c.expr, r, consts, ctx);
          });
          return o;
        });
      }
      case 'extend': return rows.map(function (r) { var o = shallow(r); op.cols.forEach(function (c) { o[c.name || c.expr.name] = evalExpr(c.expr, r, consts, ctx); }); return o; });
      case 'distinct': {
        var seen = Object.create(null), out = [];
        rows.forEach(function (r) {
          var o = {}, key = '';
          op.cols.forEach(function (c) { var nm = c.name || (c.expr && c.expr.name); var v = c.name ? r[c.name] : evalExpr(c.expr, r, consts, ctx); o[nm] = v; key += toStr(v) + ''; });
          if (!seen[key]) { seen[key] = 1; out.push(o); }
        });
        return out;
      }
      case 'unionop': { var all2 = []; op.tables.forEach(function (t) { all2 = all2.concat(execSource(t, ctx, consts)); }); return unionAlign(all2); }
      case 'order': {
        var copy = rows.slice();
        copy.sort(function (a, b) {
          for (var i = 0; i < op.keys.length; i++) {
            var c0 = cmp(evalExpr(op.keys[i].expr, a, consts, ctx), evalExpr(op.keys[i].expr, b, consts, ctx));
            if (c0) return op.keys[i].dir === 'desc' ? -c0 : c0;
          }
          return 0;
        });
        return copy;
      }
      case 'summarize': {
        function byName(b, ix) { return b.name || (b.expr && b.expr.type === 'col' && b.expr.name) || ('Key' + (op.bys.length > 1 ? ix + 1 : '')); }
        var groups = Object.create(null), orderKeys = [];
        rows.forEach(function (r) {
          var kp = op.bys.map(function (b, ix) { return toStr(evalExpr(b.expr, r, consts, ctx)) + '' + byName(b, ix); });
          var key = kp.join('\u0001');
          if (!groups[key]) {
            groups[key] = { rows: [], vals: {} };
            op.bys.forEach(function (b, ix) { groups[key].vals[byName(b, ix)] = evalExpr(b.expr, r, consts, ctx); });
            orderKeys.push(key);
          }
          groups[key].rows.push(r);
        });
        if (!op.bys.length && !orderKeys.length) orderKeys.push('__all__');
        var out2 = [];
        orderKeys.forEach(function (key) {
          var g = groups[key] || { rows: [], vals: {} };
          var o = {};
          op.bys.forEach(function (b, ix) { o[byName(b, ix)] = g.vals[byName(b, ix)]; });
          op.aggs.forEach(function (ag) { o[ag.name] = reduce(ag, g.rows, consts, ctx); });
          out2.push(o);
        });
        return out2;
      }
      case 'join': {
        var right = execTabular(op.right, ctx, Object.create(consts)).rows;
        var keys = op.on && op.on.length ? op.on : inferKeys(rows, right);
        if (!keys.length) throw err("'join' requires at least one shared column or an 'on <column>' clause.");
        var bucket = Object.create(null);
        right.forEach(function (r) { var k = keys.map(function (c) { return toStr(r[c]); }).join('\u0001'); (bucket[k] || (bucket[k] = [])).push(r); });
        var seenR = Object.create(null), res = [];
        rows.forEach(function (l) {
          var lk = keys.map(function (c) { return toStr(l[c]); }).join('\u0001');
          var matches = bucket[lk];
          if (op.kind === 'innerunique' && matches && matches.length > 1) matches = [matches[0]];
          if (matches && matches.length) {
            matches.forEach(function (r) {
              var o = shallow(l);
              Object.keys(r).forEach(function (c) { if (keys.indexOf(c) === -1 && !Object.prototype.hasOwnProperty.call(o, c)) o[c] = r[c]; });
              res.push(o);
            });
            seenR[lk] = 1;
          } else if (op.kind === 'leftouter' || op.kind === 'fullouter') {
            var o2 = shallow(l); keys.forEach(function (c) { if (!Object.prototype.hasOwnProperty.call(o2, c)) o2[c] = null; });
            res.push(o2);
            seenR[lk] = 1;
          }
        });
        if (op.kind === 'rightouter' || op.kind === 'fullouter') {
          right.forEach(function (r) { var rk = keys.map(function (c) { return toStr(r[c]); }).join('\u0001'); if (!seenR[rk]) { var o3 = shallow(r); keys.forEach(function (c) { if (!Object.prototype.hasOwnProperty.call(o3, c)) o3[c] = null; }); res.push(o3); } });
        }
        return unionAlign(res);
      }
    }
    throw err("Cannot execute the operator '" + op.op + "'.");
  }

  function inferKeys(a, b) {
    if (!a.length || !b.length) return [];
    var ka = Object.keys(a[0]), kb = Object.keys(b[0]);
    return ka.filter(function (k) { return kb.indexOf(k) >= 0 && k !== 'Timestamp'; });
  }

  function reduce(agg, groupRows, consts, ctx) {
    var call = agg.expr && agg.expr.type === 'call' ? agg.expr : null;
    var fn = call ? call.fn : 'count';
    var arg = call && call.args && call.args.length ? call.args[0] : null;
    function vals() { return groupRows.map(function (r) { return evalExpr(arg, r, consts, ctx); }); }
    function nums() { return vals().map(num); }
    switch (fn) {
      case 'count': return groupRows.length;
      case 'countif': return groupRows.filter(function (r) { return truthy(evalExpr(arg, r, consts, ctx)); }).length;
      case 'dcount': { var u = Object.create(null); vals().forEach(function (v) { u[toStr(v)] = 1; }); return Object.keys(u).length; }
      case 'sum': return nums().reduce(function (a2, b2) { return a2 + b2; }, 0);
      case 'avg': { var n = nums(); return n.length ? n.reduce(function (a2, b2) { return a2 + b2; }, 0) / n.length : 0; }
      case 'min': return nums().reduce(function (a2, b2) { return Math.min(a2, b2); }, Infinity);
      case 'max': return nums().reduce(function (a2, b2) { return Math.max(a2, b2); }, -Infinity);
      case 'percentile': return nums().sort(function (a2, b2) { return a2 - b2; })[Math.min(nums().length - 1, Math.trunc(num(evalExpr(call.args[1], groupRows[0] || {}, consts, ctx)) / 100 * nums().length))] || 0;
      case 'make_set': case 'makeset': { var s = Object.create(null); vals().forEach(function (v) { s[toStr(v)] = v; }); return Object.keys(s).map(function (k) { return s[k]; }); }
      case 'make_list': case 'makelist': return vals();
      case 'arg_max': case 'arg_min': { var pick = fn === 'arg_max' ? -1 : 1, best = null, bv = null; groupRows.forEach(function (r) { var v = num(evalExpr(arg, r, consts, ctx)); if (best === null || v * pick > bv * pick) { bv = v; best = r; } }); return best ? toStr(best) : ''; }
      case 'any': return groupRows.length ? toStr(vals()[0]) : '';
    }
    throw err("Aggregation '" + fn + "()' is not supported by KQL-Lite. Use count(), countif(), dcount(), sum(), avg(), min(), max(), make_set() or make_list().");
  }

  function execTabular(node, ctx, consts) {
    var rows = execSource(node.source, ctx, consts);
    for (var i = 0; i < node.ops.length; i++) rows = applyOp(rows, node.ops[i], ctx, consts);
    return { rows: rows };
  }

  function normalize(rows) {
    var cols = [];
    rows.slice(0, 200).forEach(function (r) { Object.keys(r).forEach(function (k) { if (k.charAt(0) !== '_' && cols.indexOf(k) === -1) cols.push(k); }); });
    return { columns: cols, rows: rows };
  }

  /* --------------------------------------------------------- public run */
  function run(query, tables, opts) {
    opts = opts || {};
    var started = Date.now();
    try {
      var ast = parse(query);
      var nowMs = typeof opts.now === 'number' ? opts.now : (opts.now ? (Date.parse(String(opts.now)) || Date.now()) : Date.now());
      var ctx = { tables: tables || {}, now: nowMs };
      var consts = Object.create(null);
      var last = null, scalar = null;
      ast.statements.forEach(function (st) {
        if (st.type === 'let-scalar') { consts[st.name] = { __scalar: evalExpr(st.value, {}, consts, ctx) }; return; }
        if (st.type === 'let-table') { var t0 = execTabular(st.query, ctx, Object.create(consts)); consts[st.name] = { __table: t0.rows }; last = t0; return; }
        last = execTabular(st.query, ctx, consts);
      });
      if (!last) {
        var names = Object.keys(consts);
        var srows = names.map(function (n) { return { Name: n, Value: consts[n].__scalar }; });
        return { columns: ['Name', 'Value'], rows: srows, total: srows.length, elapsedMs: 0, scalarOnly: true, error: null };
      }
      var out = normalize(last.rows);
      if (opts.maxRows && out.rows.length > opts.maxRows) { out.rows = out.rows.slice(0, opts.maxRows); out.truncated = true; }
      return { columns: out.columns, rows: out.rows, total: out.rows.length, returned: out.rows.length, elapsedMs: Math.max(1, Date.now() - started), error: null };
    } catch (e) {
      return { columns: [], rows: [], total: 0, elapsedMs: Math.max(1, Date.now() - started), error: e && e.rcwKql ? e.message : ('Query failed: ' + (e && e.message ? e.message : String(e))) };
    }
  }

  /* structural explain() used by the lab checkers */
  function explain(query) {
    try {
      var ast = parse(query);
      var info = { ok: true, tables: [], operators: [], columns: [], functions: [], literals: [], hasWhere: false, hasSummarize: false, hasProject: false, hasCount: false, hasLet: false, hasTimeFilter: false, statementCount: ast.statements.length };
      function walkExpr(n) {
        if (!n || typeof n !== 'object') return;
        if (n.type === 'col') { if (info.columns.indexOf(n.name) === -1) info.columns.push(n.name); }
        if (n.type === 'call') {
          if (info.functions.indexOf(n.fn) === -1) info.functions.push(n.fn);
          if (n.fn === 'ago' || n.fn === 'now' || n.fn === 'datetime') info.hasTimeFilter = true;
        }
        if (n.type === 'lit' && (typeof n.v === 'string' || typeof n.v === 'number')) { if (info.literals.length < 40) info.literals.push(n.v); }
        ['left', 'right', 'expr', 'lo', 'hi'].forEach(function (k) { if (n[k]) walkExpr(n[k]); });
        (n.args || []).forEach(walkExpr);
        (n.items || []).forEach(walkExpr);
      }
      function walkOp(op) {
        if (!op) return;
        info.operators.push(op.op);
        if (op.op === 'where') info.hasWhere = true;
        if (op.op === 'summarize') info.hasSummarize = true;
        if (op.op === 'project') info.hasProject = true;
        if (op.op === 'count') info.hasCount = true;
        ['expr', 'n'].forEach(function (k) { if (op[k]) walkExpr(op[k]); });
        (op.cols || []).forEach(function (c) { walkExpr(c && c.expr); });
        (op.keys || []).forEach(function (k) { walkExpr(k.expr); });
        (op.aggs || []).forEach(function (a) { walkExpr(a.expr); });
        (op.bys || []).forEach(function (b) { walkExpr(b.expr); });
        if (op.right) walkNode(op.right);
        (op.tables || []).forEach(function (t) { if (t.source) walkNode(t); else if (t.kind) { if (t.kind === 'ref' && info.tables.indexOf(t.name) === -1) info.tables.push(t.name); } });
      }
      function walkNode(node) {
        if (!node) return;
        if (node.source && node.source.kind === 'ref' && info.tables.indexOf(node.source.name) === -1) info.tables.push(node.source.name);
        (node.ops || []).forEach(walkOp);
      }
      ast.statements.forEach(function (st) {
        info.hasLet = info.hasLet || st.type.indexOf('let') === 0;
        if (st.type === 'let-scalar') walkExpr(st.value);
        if (st.query) walkNode(st.query);
      });
      info.text = String(query || '').replace(/\s+/g, ' ').trim().toLowerCase();
      return info;
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  var api = { run: run, explain: explain, format: function (v) { return toStr(v); }, version: '1.0.0' };
  global.RCWKql = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
