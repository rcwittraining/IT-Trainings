/* RCW Job Matcher - local persistence.
 *
 * Everything the tool remembers lives in this browser's localStorage under
 * rcwjm.v1.*. Nothing is sent to a server, no cookie is set, no analytics script is
 * loaded, and no credential is ever accepted or stored (there is no login form to
 * type one into). API keys typed in Sources are the single sensitive input; they are
 * stored locally, never transmitted anywhere except the API you named, and the UI says
 * so next to the field.
 *
 * Browser: window.RCWJM.store   Node (tests): an in-memory shim so the logic stays testable.
 */
(function (root, factory) {
  'use strict';
  var deps = typeof module === 'object' && module && module.exports
    ? { text: require('./text.js') }
    : { text: root.RCWJM.text };
  if (typeof module === 'object' && module && module.exports) module.exports = factory(deps.text, null);
  else { root.RCWJM = root.RCWJM || {}; root.RCWJM.store = factory(deps.text, root.localStorage); }
}(typeof self !== 'undefined' ? self : this, function (text, storage) {
  'use strict';

  var NS = 'rcwjm.v1.';
  var memory = Object.create(null);
  var backend = storage && typeof storage.getItem === 'function' ? storage : {
    getItem: function (k) { return k in memory ? memory[k] : null; },
    setItem: function (k, v) { memory[k] = String(v); },
    removeItem: function (k) { delete memory[k]; }
  };

  var DEFAULT_TARGETS = {
    roleFamilies: ['sysadmin', 'infraops', 'cloud', 'virtualization', 'storage', 'devops', 'sre', 'endpoint', 'architect', 'lead'],
    keywords: ['linux administrator', 'infrastructure engineer', 'cloud engineer', 'vmware administrator', 'site reliability engineer'],
    mustHave: [],
    exclude: ['internship', 'graduate program', 'security clearance', 'clearance required', 'citizenship only', 'onsite only', 'usa only', 'canada only'],
    regions: ['India', 'Remote (worldwide)'],
    remote: 'any',
    relocate: false,
    indiaOnly: false,
    salaryMinLPA: 0,
    minScore: 55,
    maxAgeDays: 45,
    jobTypes: [],
    levelStretch: 1,
    tone: 'standard'
  };

  var DEFAULT_SETTINGS = {
    sources: { remotive: true, arbeitnow: true, greenhouse: true },
    companies: {
      greenhouse: ['cloudflare', 'gitlab', 'datadog', 'hashicorp', 'elastic'],
      lever: [],
      smartrecruiters: []
    },
    keys: {},
    autoRefreshHours: 6,
    lastFetchAt: {},
    cacheTtlHours: 6,
    keepCachedDays: 14,
    profileName: ''
  };

  function read(key, fallback) {
    try {
      var raw = backend.getItem(NS + key);
      if (raw === null || raw === undefined) return fallback;
      var value = JSON.parse(raw);
      return value === null || value === undefined ? fallback : value;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      backend.setItem(NS + key, JSON.stringify(value));
      return true;
    } catch (e) {
      // Quota or privacy mode: keep the app usable, just stop promising persistence.
      return false;
    }
  }

  function remove(key) {
    try { backend.removeItem(NS + key); } catch (e) {}
  }

  function getTargets() {
    var stored = read('targets', null);
    return Object.assign({}, DEFAULT_TARGETS, stored || {}, {
      roleFamilies: (stored && stored.roleFamilies) || DEFAULT_TARGETS.roleFamilies,
      exclude: (stored && stored.exclude) || DEFAULT_TARGETS.exclude,
      regions: (stored && stored.regions) || DEFAULT_TARGETS.regions
    });
  }

  function getSettings() {
    var stored = read('settings', null);
    return Object.assign({}, DEFAULT_SETTINGS, stored || {}, {
      sources: Object.assign({}, DEFAULT_SETTINGS.sources, (stored && stored.sources) || {}),
      companies: Object.assign({}, DEFAULT_SETTINGS.companies, (stored && stored.companies) || {}),
      keys: Object.assign({}, (stored && stored.keys) || {}),
      lastFetchAt: Object.assign({}, (stored && stored.lastFetchAt) || {})
    });
  }

  /** Jobs cache: one entry per source so a partial failure never loses good data. */
  function getCache() {
    return read('cache', {});
  }

  function setCacheEntry(sourceId, jobs) {
    var cache = getCache();
    cache[sourceId] = { at: new Date().toISOString(), jobs: jobs.slice(0, 400) };
    write('cache', cache);
    return cache;
  }

  function pruneCache(days) {
    var cache = getCache();
    var keep = Object.create(null);
    Object.keys(cache).forEach(function (key) {
      var entry = cache[key];
      var parsed = text.parseDate(entry && entry.at);
      if (parsed && parsed.days <= (days || 14)) keep[key] = entry;
    });
    write('cache', keep);
    return keep;
  }

  function cacheAgeHours(sourceId) {
    var entry = getCache()[sourceId];
    if (!entry || !entry.at) return null;
    var parsed = text.parseDate(entry.at);
    return parsed ? parsed.days * 24 + (Date.now() - parsed.date.getTime()) % 86400000 / 3600000 : null;
  }

  function isFreshEnough(sourceId, minIntervalMinutes) {
    var entry = getCache()[sourceId];
    if (!entry || !entry.at || !minIntervalMinutes) return true;
    var age = (Date.now() - new Date(entry.at).getTime()) / 60000;
    return age >= minIntervalMinutes;
  }

  /* ---------------------------------------------------------------- tracker */

  var STATUSES = ['new', 'shortlisted', 'packet-ready', 'applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn'];

  function getTracker() {
    return read('tracker', []);
  }

  function saveTracker(entries) {
    return write('tracker', entries.slice(0, 4000));
  }

  function upsert(entry) {
    var list = getTracker();
    var index = -1;
    for (var i = 0; i < list.length; i += 1) {
      if (list[i].id === entry.id) { index = i; break; }
    }
    var now = new Date().toISOString();
    if (index === -1) {
      list.unshift(Object.assign({ added: now, updated: now, status: 'new', history: [{ at: now, status: 'new' }] }, entry));
    } else {
      var previous = list[index];
      var changedStatus = entry.status && entry.status !== previous.status;
      list[index] = Object.assign({}, previous, entry, {
        added: previous.added,
        updated: now,
        history: changedStatus ? (previous.history || []).concat([{ at: now, status: entry.status }]) : (previous.history || [])
      });
    }
    saveTracker(list);
    return list;
  }

  function removeEntry(id) {
    var list = getTracker().filter(function (entry) { return entry.id !== id; });
    saveTracker(list);
    return list;
  }

  function stats(entries) {
    var counts = Object.create(null);
    STATUSES.forEach(function (status) { counts[status] = 0; });
    var scoreSum = 0, scoreCount = 0, blanks = 0;
    (entries || []).forEach(function (entry) {
      counts[entry.status || 'new'] = (counts[entry.status || 'new'] || 0) + 1;
      if (typeof entry.score === 'number') { scoreSum += entry.score; scoreCount += 1; }
      if (entry.packet && entry.packet.blanks) blanks += 1;
    });
    var applied = (counts.applied || 0) + (counts.screening || 0) + (counts.interview || 0) + (counts.offer || 0);
    var replied = (counts.screening || 0) + (counts.interview || 0) + (counts.offer || 0);
    return {
      counts: counts,
      total: (entries || []).length,
      avgScore: scoreCount ? Math.round(scoreSum / scoreCount) : null,
      packetsWithBlanks: blanks,
      applied: applied,
      responseRate: applied ? Math.round((replied / applied) * 100) : null
    };
  }

  /* -------------------------------------------------------------- packets */

  function getPackets() {
    return read('packets', {});
  }

  function savePacket(packet) {
    var map = getPackets();
    map[packet.jobId] = Object.assign({}, map[packet.jobId], packet, { savedAt: new Date().toISOString() });
    write('packets', map);
    return map;
  }

  function savePackets(list) {
    var map = getPackets();
    list.forEach(function (packet) {
      map[packet.jobId] = Object.assign({}, map[packet.jobId], packet, { savedAt: new Date().toISOString() });
    });
    write('packets', map);
    return map;
  }

  function removePacket(id) {
    var map = getPackets();
    delete map[id];
    write('packets', map);
    return map;
  }

  function lastShown() {
    return read('lastShown', null);
  }

  function setLastShown(value) { write('lastShown', value); }

  function wipe() {
    Object.keys(localStorage || {}).forEach(function (key) {
      if (key.indexOf(NS) === 0) remove(key.replace(NS, ''));
    });
    ['profile', 'targets', 'settings', 'cache', 'tracker', 'packets', 'lastShown'].forEach(remove);
  }

  return {
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    DEFAULT_TARGETS: DEFAULT_TARGETS,
    NS: NS,
    STATUSES: STATUSES,
    cacheAgeHours: cacheAgeHours,
    get: read,
    getCache: getCache,
    getPackets: getPackets,
    getSettings: getSettings,
    getTargets: getTargets,
    getTracker: getTracker,
    isFreshEnough: isFreshEnough,
    lastShown: lastShown,
    pruneCache: pruneCache,
    remove: remove,
    removeEntry: removeEntry,
    removePacket: removePacket,
    savePacket: savePacket,
    savePackets: savePackets,
    set: write,
    setCacheEntry: setCacheEntry,
    setLastShown: setLastShown,
    setProfile: function (profile) { return write('profile', profile); },
    getProfile: function () { return read('profile', null); },
    setSettings: function (settings) { return write('settings', settings); },
    setTargets: function (targets) { return write('targets', targets); },
    stats: stats,
    upsert: upsert,
    wipe: wipe
  };
}));
