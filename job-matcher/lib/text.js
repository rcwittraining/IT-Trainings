/* RCW Job Matcher - shared text helpers.
 * Pure functions: usable in the browser (window.RCWJM.text) and in Node tests (module.exports).
 * No external dependencies, no network, no storage.
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module && module.exports) {
    module.exports = factory();
  } else {
    root.RCWJM = root.RCWJM || {};
    root.RCWJM.text = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var WORD_RE = /[A-Za-z][A-Za-z0-9+#.\-/]*/g;
  var STOP = Object.create(null);
  ('a an and are as at be been being by for from had has have he her him his how i if in ' +
   'into is it its me my of on our ours she than that the their them then there these they ' +
   'this to too us was we were what when where which who will with would you your yr yrs ' +
   'role job jobs work working team teams company companies also etc e.g ie within about ' +
   'across per via plus strong good excellent ability able able-to must should can could may').split(' ').forEach(function (w) {
    STOP[w] = true;
  });

  function str(value) {
    return value === null || value === undefined ? '' : String(value);
  }

  /** Lowercase, collapse whitespace, fold smart quotes/dashes. Keeps punctuation. */
  function normalize(value) {
    return str(value)
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014\u2212]/g, '-')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/ ?\n ?/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /** Strip all tags, decode the handful of entities a resume can contain. */
  function stripHtml(value) {
    return normalize(str(value)
      .replace(/<\s*(br|\/p|\/div|\/li|\/ul|\/ol|\/h[1-6]|\/tr|\/table|\/section|\/article)\s*\/?>/gi, '\n')
      .replace(/<\/\s*td\s*>/gi, ' | ')
      // Inline tags must not insert a space or "Ansible ." artefacts appear in the text.
      .replace(/<[^>]*>/g, '')
      .replace(/(?:\s*\|)+\s*(?=\n|$)/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'"));
  }

  function escapeHtml(value) {
    return str(value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function escapeRegExp(value) {
    return str(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function tokens(value) {
    var out = [];
    normalize(value).toLowerCase().split(WORD_RE).forEach(function () { /* noop */ });
    var matches = normalize(value).toLowerCase().match(WORD_RE) || [];
    matches.forEach(function (token) {
      var t = token.replace(/^[.\-\/]+|[.\-\/]+$/g, '');
      if (t.length > 1 && !STOP[t]) out.push(t);
    });
    return out;
  }

  function wordSet(value) {
    var set = Object.create(null);
    tokens(value).forEach(function (t) { set[t] = (set[t] || 0) + 1; });
    return set;
  }

  function splitLines(value) {
    return normalize(value).split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
  }

  function splitSentences(value) {
    return normalize(value)
      .replace(/\n/g, ' ')
      .split(/(?<=[.!?;])\s+(?=[A-Z0-9(])/)
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return s.length > 25; });
  }

  var METRIC_RE = /(\d+(?:[.,]\d+)?\s*(?:%|percent|k|m|mn|bn|x\b|hrs?|hours?|mins?|minutes?|days?|weeks?|months?|years?|nodes?|servers?|vm[s]?|users?|seats?|tickets?|gb|tb|pb|lakh|lakhs|crore|crores|inr|usd|\$|₹))/i;
  var NUMBER_RE = /\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?\s*(?:%|x|k|m|bn|hrs|hours|nodes|servers|vms|users|tickets|tb|gb|pb)/i;

  function hasMetric(sentence) {
    return METRIC_RE.test(sentence) || NUMBER_RE.test(sentence);
  }

  function titleCase(value) {
    return normalize(value).replace(/\w\S*/g, function (w) {
      return w.charAt(0).toUpperCase() + w.slice(1);
    });
  }

  /** Short stable id used for de-duplication; djb2 in base36. */
  function hash(value) {
    var h = 5381, s = normalize(value).toLowerCase();
    for (var i = 0; i < s.length; i += 1) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  function host(url) {
    var m = str(url).match(/^https?:\/\/([^/?#]+)/i);
    return m ? m[1].replace(/^www\./i, '') : '';
  }

  function clamp(value, min, max) {
    return value < min ? min : (value > max ? max : value);
  }

  function toNumber(value, fallback) {
    var n = parseFloat(str(value).replace(/,/g, ''));
    return isFinite(n) ? n : fallback;
  }

  function pluralize(n, one, many) {
    return n + ' ' + (n === 1 ? one : many);
  }

  function truncate(value, max) {
    var s = normalize(value);
    return s.length <= max ? s : s.slice(0, Math.max(0, max - 1)).replace(/[\s,.;:-]+$/, '') + '…';
  }

  /** "2019-09-14T20:33:27Z" / "2019-09-14" / epoch -> {date, days, label} */
  function parseDate(value) {
    if (!value) return null;
    var d;
    if (typeof value === 'number') d = new Date(value < 1e12 ? value * 1000 : value);
    else if (/^\d+$/.test(str(value))) { var n = parseInt(value, 10); d = new Date(n < 1e12 ? n * 1000 : n); }
    else {
      var s = str(value).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) s += 'T00:00:00Z';
      d = new Date(s);
    }
    if (!d || isNaN(d.getTime())) return null;
    var days = Math.floor((Date.now() - d.getTime()) / 86400000);
    return { date: d, days: days, label: d.toISOString().slice(0, 10) };
  }

  function relTime(value) {
    var p = parseDate(value);
    if (!p) return 'date unknown';
    if (p.days <= 0) return 'today';
    if (p.days === 1) return 'yesterday';
    if (p.days < 30) return p.days + ' days ago';
    if (p.days < 365) return Math.round(p.days / 30) + 'mo ago';
    return Math.round(p.days / 365) + 'y ago';
  }

  /** Fuzzy-ish equality used when merging listings from two sources. */
  function similarText(a, b) {
    var x = normalize(a).toLowerCase().replace(/[^a-z0-9+#. ]/g, '').split(/\s+/).filter(Boolean);
    var y = normalize(b).toLowerCase().replace(/[^a-z0-9+#. ]/g, '').split(/\s+/).filter(Boolean);
    if (!x.length || !y.length) return false;
    var shorter = x.length <= y.length ? x : y;
    var longer = x.length <= y.length ? y : x;
    var hits = 0;
    shorter.forEach(function (word) { if (longer.indexOf(word) !== -1) hits += 1; });
    return hits / shorter.length >= 0.75;
  }

  return {
    clamp: clamp,
    escapeHtml: escapeHtml,
    escapeRegExp: escapeRegExp,
    hasMetric: hasMetric,
    host: host,
    hash: hash,
    normalize: normalize,
    numbers: NUMBER_RE,
    parseDate: parseDate,
    pluralize: pluralize,
    relTime: relTime,
    similarText: similarText,
    splitLines: splitLines,
    splitSentences: splitSentences,
    stripHtml: stripHtml,
    str: str,
    titleCase: titleCase,
    tokens: tokens,
    toNumber: toNumber,
    truncate: truncate,
    wordSet: wordSet,
    words: WORD_RE
  };
}));
