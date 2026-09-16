/* RCW Job Matcher - UI orchestration.
 *
 * Holds no state anywhere but this browser: the single source of truth is
 * localStorage (rcwjm.v1.*) plus the in-memory scored job list. Every async path
 * degrades to a visible per-source status instead of an empty board.
 */
(function () {
  'use strict';

  var R = window.RCWJM;
  var text = R.text, skills = R.skills, resumeApi = R.resume, matcher = R.matcher, feeds = R.feeds, packetsApi = R.packets, store = R.store;

  var el = function (id) { return document.getElementById(id); };
  var html = function (node, markup) { if (node) node.innerHTML = markup; };
  var val = function (id, fallback) { var n = el(id); return n ? n.value : (fallback || ''); };
  var on = function (id, evt, fn) { var n = el(id); if (n) n.addEventListener(evt, fn); };
  var esc = text.escapeHtml;

  var state = {
    profile: null,
    targets: store.getTargets(),
    settings: store.getSettings(),
    scored: [],
    fetching: false,
    autoTimer: null,
    selectedPacket: null,
    sourceState: Object.create(null),
    lastSearchNote: ''
  };

  /* ------------------------------------------------------------------ toast */
  var toastTimer = null;
  function toast(message, isError) {
    var node = el('toast');
    if (!node) {
      node = document.createElement('div');
      node.id = 'toast';
      node.className = 'toast';
      node.setAttribute('role', 'status');
      document.body.appendChild(node);
    }
    node.textContent = message;
    node.className = 'toast show' + (isError ? ' err' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { node.className = 'toast' + (isError ? ' err' : ''); }, isError ? 6500 : 3800);
  }

  function copyToClipboard(value, label) {
    var done = function () { toast((label || 'Copied') + ' — paste it into the application form'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(done, function () { legacyCopy(value); done(); });
      return;
    }
    legacyCopy(value); done();
  }
  function legacyCopy(value) {
    var ta = document.createElement('textarea');
    ta.value = value; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  /* --------------------------------------------------------------- profile */
  function currentProfile() {
    if (!state.profile) state.profile = store.getProfile();
    if (!state.profile) state.profile = blankProfile();
    return state.profile;
  }

  function blankProfile() {
    return { version: 1, seed: false, source: 'not loaded yet', name: '', headline: '', email: '', phone: '', linkedin: '', github: '', website: '', location: '', noticePeriod: '', currentCtc: '', expectedCtc: '', visa: '', years: 0, seniority: 3, skills: [], extraSkills: [], certifications: [], education: { degrees: [], institutions: [] }, employment: [], achievements: [], raw: '', ats: null };
  }

  function saveProfile(profile) {
    state.profile = profile;
    store.setProfile(profile);
    renderProfile();
    renderSkills();
    renderAts();
    if (state.scored.length) { rescore(); renderJobs(); }
  }

  function renderProfile() {
    var p = currentProfile();
    var map = { pName: 'name', pHeadline: 'headline', pEmail: 'email', pPhone: 'phone', pLocation: 'location', pLinkedin: 'linkedin', pWebsite: 'website', pNotice: 'noticePeriod', pCurrent: 'currentCtc', pExpected: 'expectedCtc', pVisa: 'visa' };
    Object.keys(map).forEach(function (id) { var n = el(id); if (n) n.value = text.str(p[map[id]]); });
    var years = el('pYears'); if (years) years.value = p.years || '';
    var note = el('parseNote');
    if (note) {
      var bits = [];
      if (p.source) bits.push('Source: ' + p.source + '.');
      if (p.parsedAt) bits.push('Parsed ' + new Date(p.parsedAt).toLocaleString() + '.');
      if (p.employment && p.employment.length) bits.push(p.employment.length + ' employment entries detected.');
      if (p.years) bits.push('Experience read as ' + p.years + ' yrs' + (p.yearsDerived && !p.yearsExplicit ? ' (derived from your date ranges — check it)' : '') + '.');
      note.textContent = bits.join(' ');
    }
  }

  function renderSkills() {
    var p = currentProfile();
    var cloud = el('skillCloud');
    if (!cloud) return;
    var list = (p.skills || []).concat((p.extraSkills || []).map(function (name) {
      var canonical = skills.lookup(name);
      return { name: name, category: canonical ? canonical.category : 'Custom', weight: canonical ? canonical.weight : 2, mentions: 0, custom: true, excluded: false };
    }));
    html(cloud, list.length ? list.map(function (entry) {
      return '<label class="skill' + (entry.custom ? ' custom' : '') + (entry.excluded ? ' off' : '') + '" title="' + esc(entry.category + ' · weight ' + entry.weight + (entry.mentions ? ' · ' + entry.mentions + ' mention(s) in your resume' : '')) + '">' +
        '<input type="checkbox" data-skill="' + esc(entry.name) + '"' + (entry.excluded ? '' : ' checked') + '>' +
        '<span>' + esc(entry.name) + '</span><span class="w">' + entry.weight + '</span>' +
        (entry.custom ? '<span class="n">yours</span>' : (entry.mentions ? '<span class="n">' + entry.mentions + '×</span>' : '')) +
        '</label>';
    }).join('') : '<p class="hint">Nothing extracted yet.</p>');
    var count = el('skillCount');
    if (count) count.textContent = list.filter(function (s) { return !s.excluded; }).length + ' active / ' + list.length + ' found';
    cloud.querySelectorAll('input[data-skill]').forEach(function (box) {
      box.addEventListener('change', function () {
        var name = box.getAttribute('data-skill');
        var prof = currentProfile();
        var found = (prof.skills || []).filter(function (s) { return s.name === name; })[0];
        if (found) found.excluded = !box.checked;
        else prof.extraSkills = (prof.extraSkills || []).map(function (n) { return n === name && !box.checked ? '!' + n : (n.charAt(0) === '!' && box.checked ? n.slice(1) : n); });
        saveProfile(prof);
      });
    });
  }

  function renderAts() {
    var p = currentProfile();
    var ats = p.ats || (p.raw ? resumeApi.atsReview(p, p.raw) : null);
    var ring = el('atsRing'), score = el('atsScore');
    if (score) score.textContent = ats ? ats.score : '–';
    if (ring && ats) {
      var color = ats.score >= 85 ? '#3f9c4c' : ats.score >= 65 ? '#078be8' : '#d08a12';
      ring.style.background = 'conic-gradient(' + color + ' ' + (ats.score * 3.6) + 'deg,#e6edf6 0)';
    } else if (ring) ring.style.background = 'conic-gradient(#e6edf6 0deg,#e6edf6 0)';
    var verdict = el('atsVerdict');
    if (verdict) verdict.textContent = ats ? ats.verdict : 'Load a resume to check it.';
    var meta = el('atsMeta');
    if (meta && ats) meta.textContent = ats.words + ' words · ' + ats.bullets + ' bullet lines · ' + ats.quantified + ' quantified figure(s) · ' + ats.dutyPhrases + ' “responsible for”-style phrase(s)';
    html(el('atsChecks'), ats ? ats.checks.map(function (c) {
      return '<li class="' + (c.passed ? 'pass' : 'fail') + '"><span class="mark">' + (c.passed ? '✓' : '!') + '</span>' +
        '<span>' + esc(c.label) + (c.advice ? '<span class="advice">' + esc(c.advice) + '</span>' : '') + '</span>' +
        '<span class="pts">' + c.earned + '/' + c.points + '</span></li>';
    }).join('') : '<li><span class="advice">No resume loaded.</span></li>');
  }

  /* --------------------------------------------------------------- targets */
  function renderTargets() {
    var t = state.targets;
    var roles = el('roleChips');
    if (roles) {
      html(roles, skills.ROLE_FAMILIES.map(function (family) {
        var on_ = (t.roleFamilies || []).indexOf(family.id) !== -1;
        return '<label class="chip' + (on_ ? ' on' : '') + '"><input type="checkbox" data-role="' + esc(family.id) + '"' + (on_ ? ' checked' : '') + '><span>' + esc(family.label) + '</span><small>L' + family.level + '</small></label>';
      }).join(''));
      roles.querySelectorAll('input[data-role]').forEach(function (box) {
        box.addEventListener('change', function () {
          var id = box.getAttribute('data-role');
          var list = (state.targets.roleFamilies || []).slice();
          if (box.checked) { if (list.indexOf(id) === -1) list.push(id); }
          else state.targets.roleFamilies = list.filter(function (x) { return x !== id; });
          if (box.checked) state.targets.roleFamilies = list;
          commitTargets();
        });
      });
    }
    var regions = el('regionChips');
    if (regions) {
      var regionKeys = Object.keys(skills.LOCATION_GROUPS);
      html(regions, regionKeys.map(function (region) {
        var on_ = (t.regions || []).indexOf(region) !== -1;
        return '<label class="chip' + (on_ ? ' on' : '') + '"><input type="checkbox" data-region="' + esc(region) + '"' + (on_ ? ' checked' : '') + '><span>' + esc(region) + '</span></label>';
      }).join(''));
      regions.querySelectorAll('input[data-region]').forEach(function (box) {
        box.addEventListener('change', function () {
          var region = box.getAttribute('data-region');
          var list = (state.targets.regions || []).slice();
          if (box.checked && list.indexOf(region) === -1) list.push(region);
          if (!box.checked) list = list.filter(function (x) { return x !== region; });
          state.targets.regions = list;
          commitTargets();
        });
      });
    }
    var kw = el('tKeywords'); if (kw) kw.value = (t.keywords || []).join('\n');
    var ex = el('tExclude'); if (ex) ex.value = (t.exclude || []).join(', ');
    var remote = el('tRemote'); if (remote) remote.value = t.remote || 'any';
    var age = el('tAge'); if (age) age.value = String(t.maxAgeDays || 45);
    var minScore = el('tMinScore'); if (minScore) minScore.value = t.minScore;
    var minScoreVal = el('tMinScoreVal'); if (minScoreVal) minScoreVal.textContent = t.minScore;
    var salary = el('tSalary'); if (salary) salary.value = t.salaryMinLPA || '';
    var relocate = el('tRelocate'); if (relocate) relocate.checked = !!t.relocate;
    var india = el('tIndiaOnly'); if (india) india.checked = !!t.indiaOnly;
    var tone = el('tTone'); if (tone) tone.value = t.tone || 'standard';
    var block = el('tMustBlock'); if (block) block.checked = !!matcher.options.mustHaveIsBlocking;
    renderMustHaves();
  }

  function renderMustHaves() {
    var list = state.targets.mustHave || [];
    html(el('mustHaveChips'), list.length ? list.map(function (name) {
      var canonical = skills.lookup(name);
      return '<span class="tagchip must" data-must="' + esc(name) + '" title="Click to remove">' + esc(name) + (canonical ? ' · weight ' + canonical.weight : '') + ' ✕</span>';
    }).join('') : '<span class="hint">None set — recommended at first, since a hard filter on 3 skills can silently drop the job you most wanted.</span>');
    var wrap = el('mustHaveChips');
    if (wrap) wrap.querySelectorAll('[data-must]').forEach(function (chip) {
      chip.style.cursor = 'pointer';
      chip.addEventListener('click', function () {
        state.targets.mustHave = (state.targets.mustHave || []).filter(function (n) { return n !== chip.getAttribute('data-must'); });
        commitTargets();
      });
    });
  }

  var commitTimer = null;
  function commitTargets(rerender) {
    store.setTargets(state.targets);
    if (rerender !== false) {
      clearTimeout(commitTimer);
      commitTimer = setTimeout(function () {
        if (state.scored.length) { rescore(); renderJobs(); }
        renderBulkBar();
      }, 120);
    }
  }

  function bindTargetInputs() {
    on('tKeywords', 'input', function () {
      state.targets.keywords = val('tKeywords').split(/\n|,/).map(function (s) { return s.trim(); }).filter(Boolean);
      commitTargets(false);
    });
    on('tExclude', 'input', function () {
      state.targets.exclude = val('tExclude').split(/[\n,]/).map(function (s) { return s.trim(); }).filter(Boolean);
      commitTargets();
    });
    on('tRemote', 'change', function () { state.targets.remote = val('tRemote'); commitTargets(); });
    on('tAge', 'change', function () { state.targets.maxAgeDays = text.toNumber(val('tAge'), 45); commitTargets(); });
    on('tMinScore', 'input', function () {
      state.targets.minScore = text.toNumber(val('tMinScore'), 55);
      var out = el('tMinScoreVal'); if (out) out.textContent = state.targets.minScore;
      commitTargets();
    });
    on('tSalary', 'input', function () { state.targets.salaryMinLPA = text.toNumber(val('tSalary'), 0); commitTargets(); });
    on('tRelocate', 'change', function () { state.targets.relocate = !!el('tRelocate').checked; commitTargets(); });
    on('tIndiaOnly', 'change', function () { state.targets.indiaOnly = !!el('tIndiaOnly').checked; commitTargets(); });
    on('tTone', 'change', function () { state.targets.tone = val('tTone'); commitTargets(false); });
    on('tMustBlock', 'change', function () {
      matcher.options.mustHaveIsBlocking = !!el('tMustBlock').checked;
      store.set('mustBlock', !!el('tMustBlock').checked);
      commitTargets();
    });
    on('btnAddMust', 'click', function () {
      var raw = val('mustHaveInput');
      if (!raw.trim()) return;
      var resolved = skills.resolveList(raw);
      state.targets.mustHave = (state.targets.mustHave || []).concat(resolved.known.filter(function (n) { return (state.targets.mustHave || []).indexOf(n) === -1; }));
      if (resolved.unknown.length) toast('Not in the taxonomy, kept as typed: ' + resolved.unknown.join(', '));
      var box = el('mustHaveInput'); if (box) box.value = '';
      commitTargets(false); renderMustHaves(); commitTargets();
    });
    on('mustHaveInput', 'keydown', function (event) { if (event.key === 'Enter') { event.preventDefault(); el('btnAddMust').click(); } });
    on('btnAddSkill', 'click', function () {
      var raw = val('extraSkill');
      if (!raw.trim()) return;
      var p = currentProfile();
      var names = raw.split(/[,;\n]/).map(function (s) { return s.trim(); }).filter(Boolean);
      p.extraSkills = (p.extraSkills || []).slice();
      names.forEach(function (name) { if (p.extraSkills.indexOf(name) === -1) p.extraSkills.push(name); });
      var box = el('extraSkill'); if (box) box.value = '';
      saveProfile(p);
      toast(names.length === 1 ? 'Added ' + names[0] + ' to your skill set' : 'Added ' + names.length + ' skills');
    });
    on('extraSkill', 'keydown', function (event) { if (event.key === 'Enter') { event.preventDefault(); el('btnAddSkill').click(); } });
  }

  /* ----------------------------------------------------------------- jobs */
  function rescore() {
    var p = currentProfile();
    state.scored = matcher.rank(state.scored, p, state.targets, { keepBlocked: true });
  }

  function visibleJobs() {
    var mode = val('showWhich', 'matches');
    var q = text.normalize(val('jobFilter')).toLowerCase();
    var maxAge = state.targets.maxAgeDays || 3650;
    return state.scored.filter(function (job) {
      var m = job.match || { score: 0, blocked: null };
      if (mode === 'blocked' && !m.blocked) return false;
      if (mode === 'packet' && !store.getPackets()[job.id]) return false;
      if (mode === 'strong' && m.score < 80) return false;
      if (mode === 'matches' && (m.score < state.targets.minScore || m.blocked)) return false;
      if (maxAge && job.posted) {
        var parsed = text.parseDate(job.posted);
        if (parsed && parsed.days > maxAge) return false;
      }
      if (q) {
        var hay = (text.str(job.title) + ' ' + text.str(job.company) + ' ' + text.str(job.location) + ' ' + text.str(job.sourceLabel)).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function scoreColor(score) {
    if (score >= 80) return '#2f9e44';
    if (score >= 65) return '#078be8';
    if (score >= 50) return '#d08a12';
    if (score >= 35) return '#7c5cd6';
    return '#93a3b8';
  }

  function verdictClass(label) {
    return { 'Strong fit': 'v-strong', 'Good fit': 'v-good', 'Worth a look': 'v-worth', Stretch: 'v-stretch', Weak: 'v-weak', Blocked: 'v-blocked' }[label] || 'v-weak';
  }

  function renderSourceSummary() {
    var node = el('sourceSummary');
    if (!node) return;
    var total = state.scored.length;
    var above = state.scored.filter(function (j) { return !j.match.blocked && j.match.score >= state.targets.minScore; }).length;
    var sources = [];
    state.scored.forEach(function (j) { (j.sources || [j.sourceLabel]).forEach(function (s) { if (s && sources.indexOf(s) === -1) sources.push(s); }); });
    node.textContent = total
      ? total + ' listing(s) scored from ' + (sources.join(', ') || 'your import') + ' — ' + above + ' at or above your floor of ' + state.targets.minScore + '.' + (state.lastSearchNote ? ' ' + state.lastSearchNote : '')
      : 'No listings loaded yet.' + (state.lastSearchNote ? ' ' + state.lastSearchNote : '');
  }

  function renderJobs() {
    var list = el('jobList');
    var jobs = visibleJobs();
    var existingScrolled = list ? list.scrollTop : 0;
    // Read the stores once per render, not once per card: a 400-listing board must not
    // re-parse the whole JSON payload per row.
    state.renderPackets = store.getPackets();
    state.renderTrackerMap = (function () {
      var map = Object.create(null);
      store.getTracker().forEach(function (entry) { map[entry.id] = entry; });
      return map;
    }());
    state.renderIndex = (function () {
      var map = Object.create(null);
      state.scored.forEach(function (job) { map[job.id] = job; });
      return map;
    }());
    if (list) {
      html(list, jobs.map(function (job) { return jobCard(job, state.renderPackets, state.renderTrackerMap); }).join(''));
      list.scrollTop = existingScrolled;
      bindJobCards(list);
    }
    var empty = el('jobEmpty');
    if (empty) empty.classList.toggle('hidden', jobs.length > 0);
    renderBulkBar();
    renderSourceSummary();
    updateCounts();
  }

  function jobCard(job, packetsMap, trackerMap) {
    var m = job.match || { score: 0, bands: [], matched: [], missing: [], blocked: null, verdict: 'Weak' };
    var hasPacket = !!(packetsMap || {})[job.id];
    var tracked = (trackerMap || {})[job.id];
    var link = job.applyUrl || job.url;
    var demoNote = job.demo ? '<span class="tagchip demo">sample data — not a real vacancy</span>' : '';
    var tags = m.matched.slice(0, 7).map(function (entry) {
      return '<span class="tagchip match" title="' + esc(entry.why) + '">✓ ' + esc(entry.name) + '</span>';
    }).join('') + m.missing.slice(0, 5).map(function (entry) {
      return '<span class="tagchip' + (entry.mustHave ? ' must' : ' miss') + '" title="' + (entry.lab ? 'Lab: https://www.rcwittraining.in/' + esc(entry.lab) : 'Not found in your resume') + '">✗ ' + esc(entry.name) + (entry.mustHave ? ' (must-have)' : '') + '</span>';
    }).join('');

    return '<article class="job' + (m.blocked ? ' blocked' : '') + '" data-id="' + esc(job.id) + '">' +
      '<div class="job-top">' +
        '<div class="score"><div class="score-ring" style="--pct:' + m.score + ';--ring:' + scoreColor(m.score) + '"><b>' + m.score + '</b></div><div class="score-lbl">' + esc(m.verdict) + '</div></div>' +
        '<div class="job-main">' +
          '<p class="job-title">' + (link && !job.demo ? '<a href="' + esc(link) + '" target="_blank" rel="noopener noreferrer nofollow">' + esc(job.title) + '</a>' : esc(job.title)) + '</p>' +
          '<p class="job-meta"><b>' + esc(job.company || '—') + '</b><span class="dot">•</span><span>' + esc(job.location || 'location not stated') + '</span>' +
          (job.salary ? '<span class="dot">•</span><span>' + esc(job.salary) + '</span>' : '') +
          '<span class="dot">•</span><span>' + esc(text.relTime(job.posted)) + '</span>' +
          '<span class="dot">•</span><span>' + esc(m.remoteMode || 'onsite') + '</span>' +
          '<span class="verdict ' + verdictClass(m.verdict) + '">' + esc(m.blocked || (m.levelLabel || '') ) + '</span></p>' +
          (demoNote ? '<p style="margin-top:6px">' + demoNote + '</p>' : '') +
          (m.blocked ? '<p class="hint" style="color:#a03129;font-weight:700">' + esc(m.blocked) + '</p>' : '') +
          '<div class="job-tags">' + tags + '</div>' +
        '</div>' +
        '<div class="job-actions">' +
          '<button class="btn small ' + (hasPacket ? '' : 'primary') + '" data-act="packet" type="button">' + (hasPacket ? 'Open packet' : 'Prepare packet') + '</button>' +
          '<button class="btn small" data-act="track" type="button">' + (tracked ? esc(tracked.status) : '+ Shortlist') + '</button>' +
          (link ? '<a class="btn small" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer nofollow">Apply ↗</a>' : '<span class="btn small" title="This source gave no apply URL — open the listing text">no link</span>') +
          '<button class="btn small ghost" data-act="why" type="button">Why this score</button>' +
        '</div>' +
      '</div>' +
      '<div class="more">' +
        '<div class="bands">' + m.bands.map(function (band) {
          return '<div class="band"><div class="band-h">' + esc(band.label) + '<span>' + band.earned + '/' + band.max + '</span></div>' +
            '<div class="bar"><i style="width:' + (band.max ? Math.round((band.earned / band.max) * 100) : 0) + '%"></i></div>' +
            '<p>' + esc(band.note) + '</p></div>';
        }).join('') + '</div>' +
        (m.gaps && m.gaps.length ? '<p class="subh">Close the gap, then apply</p><ul class="gap-list">' + m.gaps.map(function (gap) {
          return '<li><b>' + esc(gap.name) + '</b> — ' + esc(gap.action) + (gap.lab ? ' <a href="/' + esc(String(gap.lab).replace(/^\//, '')) + '" target="_blank" rel="noopener">open the lab ↗</a>' : '') + '</li>';
        }).join('') + '</ul>' : '') +
        '<p class="subh">Posting text</p><div class="desc">' + esc(text.truncate(text.stripHtml(job.description), 1400)) + '</div>' +
        '<p class="srcnote">' + esc((job.sources || [job.sourceLabel || job.source]).join(' + ')) +
        (job.attribution ? ' · ' + esc(job.attribution) : '') + ' · ' + (link ? '<a href="' + esc(link) + '" target="_blank" rel="noopener noreferrer nofollow">employer’s page ↗</a>' : 'no link supplied') + '</p>' +
      '</div></article>';
  }

  function bindJobCards(root) {
    root.querySelectorAll('.job').forEach(function (card) {
      var id = card.getAttribute('data-id');
      var job = (state.renderIndex || {})[id];
      if (!job) return;
      card.querySelectorAll('[data-act]').forEach(function (button) {
        button.addEventListener('click', function () {
          var act = button.getAttribute('data-act');
          if (act === 'why') { card.classList.toggle('open'); return; }
          if (act === 'packet') {
            var existing = store.getPackets()[job.id];
            if (existing) { selectPacket(job.id); showTab('packets'); return; }
            var packet = makePacket(job);
            store.savePacket(packet);
            selectPacket(job.id);
            showTab('packets');
            renderJobs();
            toast('Packet ready for “' + text.truncate(job.title, 46) + '” — read the two [FILL] lines before you send');
            return;
          }
          if (act === 'track') {
            var tracker = store.getTracker();
            var already = tracker.filter(function (e) { return e.id === job.id; })[0];
            if (already) {
              var next = store.STATUSES[(store.STATUSES.indexOf(already.status || 'new') + 1) % store.STATUSES.length];
              store.upsert({ id: job.id, status: next });
              toast('Moved to “' + next + '”');
            } else {
              store.upsert(trackerEntry(job, 'shortlisted'));
              toast('Shortlisted “' + text.truncate(job.title, 46) + '”');
            }
            renderJobs(); renderTracker(); updateCounts();
          }
        });
      });
    });
  }

  function trackerEntry(job, status) {
    return {
      id: job.id, title: job.title, company: job.company, location: job.location, url: job.url, applyUrl: job.applyUrl,
      score: job.match ? job.match.score : null, verdict: job.match ? job.match.verdict : '', sourceLabel: job.sourceLabel,
      sources: job.sources || [job.sourceLabel], status: status || 'new', notes: '', packet: store.getPackets()[job.id] ? true : null
    };
  }

  function renderBulkBar() {
    var jobs = visibleJobs().filter(function (j) { return !j.match.blocked && j.match.score >= state.targets.minScore; });
    var count = el('bulkCount');
    if (count) count.textContent = String(jobs.length);
    var bar = el('bulkBar');
    if (bar) bar.style.display = jobs.length ? '' : 'none';
  }

  /** Listings the visitor put in themselves (sample set, imports) are never evicted by a refresh. */
  function localJobs() {
    var out = [];
    if (state.sampleLoaded) out = out.concat((R.sampleJobs || []).map(function (job) {
      return Object.assign({}, job, { sourceLabel: 'Offline sample data', attribution: 'Synthetic example listing — not a real vacancy' });
    }));
    return out.concat(state.importedJobs || []);
  }

  /* ------------------------------------------------------------ searching */
  function searchNow(force) {
    if (state.fetching) { toast('A search is already running.', true); return; }
    var settings = state.settings;
    var ids = Object.keys(settings.sources || {}).filter(function (id) { return settings.sources[id]; });
    var queries = feeds.buildQueries(currentProfile(), state.targets);
    if (!ids.length) { toast('No sources are switched on. Turn some on in step 6.', true); showTab('sources'); return; }

    var cache = store.getCache();
    var toFetch = [];
    var usedCache = [];
    ids.forEach(function (id) {
      var source = feeds.get(id);
      var entry = cache[id];
      var fresh = entry && !force && (Date.now() - new Date(entry.at).getTime()) / 3600000 < (settings.cacheTtlHours || 6);
      if (fresh) { usedCache.push(id); return; }
      // Etiquette floor: some public APIs ask for a few calls a day. Honour that even on
      // a forced refresh, because the alternative is losing access for everyone using this tool.
      if (source && source.minIntervalMinutes && entry) {
        var ageMinutes = (Date.now() - new Date(entry.at).getTime()) / 60000;
        if (ageMinutes < source.minIntervalMinutes) {
          usedCache.push(id);
          state.lastSearchNote = text.titleCase(id) + ' served from cache: it asks for a few fetches a day, and the last call was ' + Math.round(ageMinutes) + ' min ago.';
          return;
        }
      }
      toFetch.push(id);
    });

    state.fetching = true;
    setSourceStatus(toFetch, 'loading');
    if (usedCache.length) setSourceStatus(usedCache, 'cached');

    var context = {
      query: queries.primary[0] || 'linux administrator',
      queries: queries,
      category: /devops|sysadmin|system/i.test(queries.primary.join(' ')) ? 'devops' : (state.targets.category || 'devops'),
      companies: settings.companies || {},
      keys: settings.keys || {},
      fetch: function (url, opts) { return feeds.fetchWithTimeout(url, opts, 15000); }
    };
    // Company-scoped sources fan out per slug.
    var plan = [];
    toFetch.forEach(function (id) {
      var source = feeds.get(id);
      if (!source) return;
      if (source.needsCompanies) {
        var companies = ((settings.companies || {})[id] || []).filter(Boolean);
        if (!companies.length) { setSourceStatus([id], 'skipped'); return; }
        companies.forEach(function (company) { plan.push({ id: id, company: company }); });
      } else if (id === 'adzuna' || id === 'jsearch') {
        if (!hasKeysFor(id, settings)) { setSourceStatus([id], 'skipped'); return; }
        plan.push({ id: id, company: null });
      } else plan.push({ id: id, company: null });
    });

    if (!plan.length) {
      state.fetching = false;
      mergeResults([], usedCache, cache);
      toast(usedCache.length ? 'Served everything from cache (within the source rate limits).' : 'No live source was eligible — check step 6.', usedCache.length ? false : true);
      return;
    }

    var results = [];
    var queue = plan.slice();
    function worker() {
      if (!queue.length) return Promise.resolve();
      var item = queue.shift();
      var source = feeds.get(item.id);
      state.sourceState[item.id] = 'loading';
      return feeds.fetchWithTimeout(source.build(context, item.company, settings.keys || {}), {
        headers: source.headers ? source.headers(settings.keys || {}) : {}
      }, 15000).then(function (json) {
        // Re-use the adapter's parse through runSource-style call.
        var parsed = source.parse(json, context, item.company) || [];
        parsed.forEach(function (job) {
          job.attribution = job.attribution || source.attribution;
          job.sourceUrl = source.attributionUrl || '';
        });
        results.push({ sourceId: item.id, ok: true, jobs: parsed, error: '' });
        state.sourceState[item.id] = 'done';
      }).catch(function (error) {
        results.push({ sourceId: item.id, ok: false, jobs: [], error: (item.company ? item.company + ': ' : '') + (error.name === 'AbortError' ? 'timed out' : (error.message || 'network error')) });
        state.sourceState[item.id] = 'error';
      }).then(worker);
    }
    var workers = [];
    for (var i = 0; i < 3; i += 1) workers.push(worker());
    Promise.all(workers).then(function () {
      state.fetching = false;
      mergeResults(results, usedCache, cache);
      scheduleAuto();
    });
  }

  function hasKeysFor(id, settings) {
    var keys = settings.keys || {};
    if (id === 'adzuna') return !!(keys.adzuna_id && keys.adzuna_key);
    if (id === 'jsearch') return !!keys.rapidapi_key;
    return true;
  }

  function setSourceStatus(ids, kind) {
    ids.forEach(function (id) { state.sourceState[id] = kind; });
    renderSourceStatus();
  }

  function renderSourceStatus() {
    var node = el('sourceStatus');
    if (!node) return;
    var settings = state.settings;
    var cache = store.getCache();
    var ids = Object.keys(settings.sources || {}).filter(function (id) { return settings.sources[id]; });
    if (!ids.length) { html(node, '<span class="src error">no sources enabled</span>'); return; }
    html(node, ids.map(function (id) {
      var source = feeds.get(id);
      var kind = state.sourceState[id] || (cache[id] ? 'cached' : 'idle');
      var entry = cache[id];
      var count = entry && entry.jobs ? entry.jobs.length : 0;
      var label = source ? source.label.split(' (')[0] : id;
      var suffix = kind === 'cached' ? ' · cached ' + text.relTime(entry.at) : kind === 'done' ? ' · just fetched' : kind === 'error' ? ' · failed' : kind === 'skipped' ? ' · needs setup' : '';
      return '<span class="src ' + kind + '" title="' + esc(label + suffix) + '">' + esc(label) + ' <b>' + (count || 0) + '</b></span>';
    }).join(''));
  }

  function mergeResults(results, usedCacheIds, cache) {
    var errors = [];
    var freshBySource = Object.create(null);
    (results || []).forEach(function (result) {
      freshBySource[result.sourceId] = (freshBySource[result.sourceId] || []).concat(result.jobs || []);
      if (!result.ok && result.error) errors.push(text.titleCase(result.sourceId) + ': ' + result.error);
      if ((result.jobs || []).length) store.setCacheEntry(result.sourceId, result.jobs);
      var settings = state.settings;
      settings.lastFetchAt = settings.lastFetchAt || {};
      settings.lastFetchAt[result.sourceId] = new Date().toISOString();
      store.setSettings(settings);
    });

    var keepIds = Object.keys(state.settings.sources || {}).filter(function (id) { return state.settings.sources[id]; });
    var all = [];
    var freshIds = Object.keys(freshBySource);
    keepIds.forEach(function (id) {
      if (freshIds.indexOf(id) !== -1) all = all.concat(freshBySource[id]);
      else if (cache[id] && cache[id].jobs) all = all.concat(cache[id].jobs);
    });
    localJobs().forEach(function (job) { all.push(job); });

    var merged = matcher.dedupe(all);
    state.scored = matcher.rank(merged, currentProfile(), state.targets, { keepBlocked: true });
    if (errors.length) state.lastSearchNote = 'Some sources did not answer: ' + errors.slice(0, 3).join(' | ');
    else state.lastSearchNote = 'Live search finished at ' + new Date().toLocaleTimeString() + '.';
    store.pruneCache(state.settings.keepCachedDays || 14);
    renderJobs();
    renderSourceStatus();
    var strong = state.scored.filter(function (j) { return !j.match.blocked && j.match.score >= 65; }).length;
    if (results && results.length) toast(state.scored.length + ' listing(s) scored · ' + strong + ' at good-fit or better' + (errors.length ? ' · ' + errors.length + ' source(s) failed' : ''), false);
    updateCounts();
  }

  function loadDemo() {
    state.sampleLoaded = true;
    state.lastSearchNote = 'Synthetic sample set loaded — nothing here is a real vacancy.';
    var jobs = localJobs();
    state.scored = matcher.rank(jobs, currentProfile(), state.targets, { keepBlocked: true });
    renderJobs();
    toast(jobs.length + ' synthetic listings scored against your profile. Real listings come from step 6.');
  }

  function importJobs(raw, format) {
    var parsed = feeds.parseImport(raw, format);
    if (parsed.error) { toast(parsed.error, true); return; }
    var seen = Object.create(null);
    state.importedJobs = (state.importedJobs || []).concat(parsed.jobs).filter(function (job) {
      var key = matcher.urlKey(job) || job.id;
      if (seen[key]) return false;
      seen[key] = 1;
      return true;
    });
    state.lastSearchNote = state.importedJobs.length + ' listing(s) imported by you.';
    state.scored = matcher.rank(matcher.dedupe(localJobs().concat((Object.keys(store.getCache()) || []).reduce(function (acc, id) {
      var entry = store.getCache()[id];
      return acc.concat((entry && entry.jobs) || []);
    }, []))), currentProfile(), state.targets, { keepBlocked: true });
    renderJobs();
    toast('Imported ' + parsed.jobs.length + ' listing(s)');
  }

  function scheduleAuto() {
    clearInterval(state.autoTimer);
    if (!el('tAuto') || !el('tAuto').checked) return;
    var hours = text.clamp(text.toNumber(state.settings.autoRefreshHours, 6), 1, 48);
    state.autoTimer = setInterval(function () {
      if (document.hidden) return;
      searchNow(false);
    }, hours * 3600000);
    var label = el('autoLabel');
    if (label) label.textContent = 'Auto-refresh while this tab is open (every ' + hours + ' h, next check in ≤ ' + hours + ' h)';
  }

  /* ------------------------------------------------------------- packets */
  function makePacket(job) {
    var profile = currentProfile();
    var packet = packetsApi.assemble(job, job.match || { matched: [], missing: [], gaps: [] }, profile, { tone: state.targets.tone || 'standard' });
    return packet;
  }

  function selectPacket(id) {
    state.selectedPacket = id;
    renderPackets();
  }

  function renderPackets() {
    var map = store.getPackets();
    var ids = Object.keys(map);
    var filter = text.normalize(val('packetFilter')).toLowerCase();
    var count = el('packetCount');
    if (count) count.textContent = ids.length ? '(' + ids.length + ')' : '';
    var list = el('packetItems');
    var ordered = ids.map(function (id) { return map[id]; }).sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
    if (list) {
      html(list, ordered.length ? ordered.filter(function (packet) {
        return !filter || (text.str(packet.title) + ' ' + text.str(packet.company)).toLowerCase().indexOf(filter) !== -1;
      }).map(function (packet) {
        return '<button type="button" class="pk-item' + (packet.jobId === state.selectedPacket ? ' sel' : '') + '" data-pk="' + esc(packet.jobId) + '">' +
          '<b>' + esc(text.truncate(packet.title, 62)) + '</b><span>' + esc(text.truncate(packet.company + ' · ' + (packet.location || 'no location'), 54)) + '</span>' +
          '<span class="badges"><span class="pk-mini">' + (packet.score == null ? '—' : packet.score) + '/100</span>' +
          (packet.blanks ? '<span class="pk-mini warn">' + packet.blanks + ' to fill</span>' : '<span class="pk-mini">complete</span>') + '</span></button>';
      }).join('') : '<p class="hint">No packets yet. Generate one from step 3, or use “Prepare packets for all” to do the whole queue.</p>');
      list.querySelectorAll('[data-pk]').forEach(function (button) {
        button.addEventListener('click', function () { selectPacket(button.getAttribute('data-pk')); });
      });
    }
    var body = el('packetBody'), empty = el('packetEmpty');
    var packet = map[state.selectedPacket];
    if (body && empty) {
      body.classList.toggle('hidden', !packet);
      empty.classList.toggle('hidden', !!packet);
    }
    if (!packet) { updateCounts(); return; }

    html(el('pkTitle'), esc(packet.title));
    html(el('pkMeta'), esc([packet.company, packet.location, packet.score == null ? '' : 'match ' + packet.score + '/100', packet.verdict].filter(Boolean).join(' · ')));
    html(el('pkScore'), (packet.attribution ? esc(packet.attribution) + '<br>' : '') + 'generated ' + esc(new Date(packet.generatedAt).toLocaleString()));
    var letter = el('pkLetter'); if (letter) letter.value = packet.coverLetter;
    var blanks = el('pkBlanks'); if (blanks) blanks.textContent = String(packetsApi.countBlanks(packet) + countBlanksIn(letter ? letter.value : packet.coverLetter));
    var notice = el('pkNotice');
    if (notice) {
      var missing = packet.blanks ? packet.blanks : 0;
      notice.className = 'notice' + (missing ? '' : ' ok');
      notice.innerHTML = missing
        ? '<b>' + missing + ' placeholder(s) left.</b> Anything your resume does not say is marked <code>[FILL]</code>. Do not send it until the company-specific line and every number is real.'
        : '<b>No placeholders left.</b> Still read it once: you are the one who has to answer for it in the interview.';
    }
    var open = el('pkOpen');
    if (open) {
      if (packet.url && !packet.demo) { open.style.display = ''; open.href = packet.url; open.textContent = 'Open the application page ↗'; }
      else { open.style.display = 'none'; }
    }
    html(el('pkAnswers'), (packet.answers || []).map(function (row, index) {
      return '<div class="qa' + (row.blank ? ' flag' : '') + '"><button class="btn small ghost copy-q" type="button" data-a="' + index + '">Copy answer</button>' +
        '<div class="q">' + esc(row.q) + '</div><div class="a">' + esc(row.a) + '</div></div>';
    }).join(''));
    var ansWrap = el('pkAnswers');
    if (ansWrap) ansWrap.querySelectorAll('[data-a]').forEach(function (button) {
      button.addEventListener('click', function () {
        var row = (packet.answers || [])[parseInt(button.getAttribute('data-a'), 10)];
        if (row) copyToClipboard(row.a, 'Answer copied');
      });
    });
    var sheet = el('pkSheet');
    if (sheet) {
      html(sheet, (packet.fieldSheet || []).map(function (row, index) {
        return '<div class="lbl">' + esc(row.label) + '</div><div class="val"><span>' + esc(row.value) + '</span>' +
          '<button class="btn small ghost" type="button" data-f="' + index + '">copy</button></div>';
      }).join(''));
      sheet.querySelectorAll('[data-f]').forEach(function (button) {
        button.addEventListener('click', function () {
          var row = (packet.fieldSheet || [])[parseInt(button.getAttribute('data-f'), 10)];
          if (row) copyToClipboard(row.value, row.label);
        });
      });
    }
    var kp = packet.keywordPatch || { add: [], note: '', pasteLine: '' };
    html(el('pkKeywordNote'), esc(kp.note));
    html(el('pkKeywords'), kp.add.length ? kp.add.map(function (name) { return '<span class="tagchip match">' + esc(name) + '</span>'; }).join('') : '<span class="hint">—</span>');
    html(el('pkGaps'), (packet.gaps || []).length ? (packet.gaps || []).map(function (gap) {
      return '<li><b>' + esc(gap.name) + '</b> — ' + esc(gap.action) + (gap.lab ? ' <a href="/' + esc(String(gap.lab).replace(/^\//, '')) + '" target="_blank" rel="noopener">free lab ↗</a>' : '') + '</li>';
    }).join('') : '<li>Nothing weighted enough to be worth a gap plan for this posting.</li>');
    updateCounts();
  }

  function countBlanksIn(value) {
    return (String(value || '').match(/\[FILL(?:[:(\[]|])/g) || []).length;
  }

  function bindPacketControls() {
    on('packetFilter', 'input', renderPackets);
    on('btnRegen', 'click', function () {
      var packet = store.getPackets()[state.selectedPacket];
      if (!packet) return;
      var job = (state.renderIndex || {})[packet.jobId] || state.scored.filter(function (j) { return j.id === packet.jobId; })[0] || packet;
      var fresh = packetsApi.assemble(job, job.match || { matched: [], missing: [], gaps: [] }, currentProfile(), { tone: state.targets.tone || 'standard' });
      fresh.notes = packet.notes || '';
      store.savePacket(fresh);
      renderPackets();
      toast('Letter rebuilt from your current profile (edits replaced)');
    });
    on('pkLetter', 'input', function () {
      var packet = store.getPackets()[state.selectedPacket];
      if (!packet) return;
      packet.coverLetter = val('pkLetter');
      store.savePacket(packet);
      var blanks = el('pkBlanks'); if (blanks) blanks.textContent = String(countBlanksIn(packet.coverLetter) + (packet.answers || []).filter(function (a) { return a.blank; }).length);
    });
    document.querySelectorAll('#panel-packets [data-tone]').forEach(function (button) {
      button.addEventListener('click', function () {
        state.targets.tone = button.getAttribute('data-tone');
        commitTargets(false);
        var tone = el('tTone'); if (tone) tone.value = state.targets.tone;
        el('btnRegen').click();
      });
    });
    on('btnCopyLetter', 'click', function () { copyToClipboard(val('pkLetter'), 'Cover letter copied'); });
    on('btnDownloadLetter', 'click', function () {
      var packet = store.getPackets()[state.selectedPacket];
      if (!packet) return;
      var profile = currentProfile();
      var body = [
        packet.title + ' — ' + packet.company,
        'Match score ' + (packet.score == null ? 'n/a' : packet.score) + '/100 · generated ' + new Date(packet.generatedAt).toLocaleString(),
        (packet.attribution ? 'Source: ' + packet.attribution : ''),
        '='.repeat(78), '', 'COVER LETTER', packet.coverLetter, '', '='.repeat(78), '', 'FORM ANSWERS',
        (packet.answers || []).map(function (row) { return 'Q: ' + row.q + '\nA: ' + row.a; }).join('\n\n'),
        '', '='.repeat(78), '', 'PASTE-FIELD SHEET',
        (packet.fieldSheet || []).map(function (row) { return row.label + ': ' + row.value; }).join('\n'),
        '', 'Prepared locally by the RCW Job Matcher. Nothing was sent to any server. Review before sending: ' + profile.name
      ].join('\n');
      packetsApi.download(safeFileName(packet.company + ' - ' + packet.title) + '.txt', body, 'text/plain;charset=utf-8');
      toast('Saved as a .txt you can attach or paste');
    });
    on('btnCopySheet', 'click', function () {
      var packet = store.getPackets()[state.selectedPacket];
      if (!packet) return;
      var tsv = (packet.fieldSheet || []).map(function (row) { return row.label + '\t' + row.value.replace(/\s+/g, ' '); }).join('\n');
      copyToClipboard(tsv, 'Field sheet copied as two columns');
    });
    on('btnCopyKeywords', 'click', function () {
      var packet = store.getPackets()[state.selectedPacket];
      var line = packet && packet.keywordPatch ? packet.keywordPatch.pasteLine : '';
      if (!line) { toast('Nothing to copy — no overlap was detected for this posting.', true); return; }
      copyToClipboard(line, 'Keyword line copied');
    });
    on('btnMarkApplied', 'click', function () {
      var packet = store.getPackets()[state.selectedPacket];
      if (!packet) return;
      var job = (state.renderIndex || {})[packet.jobId];
      store.upsert(job ? trackerEntry(job, 'applied') : { id: packet.jobId, title: packet.title, company: packet.company, status: 'applied', score: packet.score });
      renderTracker(); renderJobs(); updateCounts();
      toast('Marked applied. Follow up in 10 working days if you hear nothing.');
    });
    on('btnDropPacket', 'click', function () {
      store.removePacket(state.selectedPacket);
      state.selectedPacket = null;
      renderPackets(); renderJobs();
      toast('Packet removed');
    });
    on('btnBulkPackets', 'click', function () {
      var jobs = visibleJobs().filter(function (j) { return !j.match.blocked && j.match.score >= state.targets.minScore; });
      if (!jobs.length) { toast('No listings above your floor.', true); return; }
      var progress = el('bulkProgress');
      if (progress) progress.textContent = 'Generating 0/' + Math.min(jobs.length, 25) + '…';
      var button = el('btnBulkPackets');
      if (button) button.disabled = true;
      packetsApi.prepareBulk(jobs, currentProfile(), state.targets, {
        limit: 25,
        progress: function (done, total) {
          if (progress) progress.textContent = 'Generating ' + done + '/' + total + '…';
        }
      }).then(function (result) {
        store.savePackets(result.packets);
        if (result.packets.length) selectPacket(result.packets[0].jobId);
        if (button) button.disabled = false;
        if (progress) progress.textContent = result.packets.length + ' packet(s) written to this browser' + (result.skipped ? '; ' + result.skipped + ' below the queue limit of 25 — narrow your floor or run it again' : '') + '. Every one of them still needs your eye before it goes out.';
        renderPackets(); renderJobs(); showTab('packets');
        toast(result.packets.length + ' packets prepared');
      });
    });
    on('btnBulkTrack', 'click', function () {
      var jobs = visibleJobs().filter(function (j) { return !j.match.blocked && j.match.score >= state.targets.minScore; }).slice(0, 100);
      if (!jobs.length) { toast('Nothing above your floor to add.', true); return; }
      jobs.forEach(function (job) {
        var existing = store.getTracker().filter(function (e) { return e.id === job.id; })[0];
        if (!existing) store.upsert(trackerEntry(job, 'new'));
      });
      renderTracker(); renderJobs(); updateCounts();
      toast(jobs.length + ' listing(s) added to the pipeline');
    });
  }

  function safeFileName(value) {
    return text.str(value).replace(/[^\w.\- ]+/g, '').replace(/\s+/g, '-').slice(0, 70) || 'application-packet';
  }

  /* ------------------------------------------------------------- tracker */
  function renderTracker() {
    var entries = store.getTracker();
    var filter = val('trackFilter', 'all');
    var shown = entries.filter(function (entry) { return filter === 'all' || entry.status === filter; });
    var body = el('pipeBody');
    if (body) {
      html(body, shown.length ? shown.map(function (entry) {
        var cls = { new: 'st-new', shortlisted: 'st-shortlisted', 'packet-ready': 'st-ready', applied: 'st-applied', screening: 'st-screening', interview: 'st-interview', offer: 'st-offer', rejected: 'st-dead', withdrawn: 'st-dead' }[entry.status || 'new'] || 'st-new';
        return '<tr data-id="' + esc(entry.id) + '">' +
          '<td><select data-field="status" class="' + cls + '">' + store.STATUSES.map(function (status) {
            return '<option value="' + status + '"' + (status === (entry.status || 'new') ? ' selected' : '') + '>' + status + '</option>';
          }).join('') + '</select></td>' +
          '<td><b>' + esc(text.truncate(entry.title, 58)) + '</b>' + (entry.applyUrl ? '<br><a href="' + esc(entry.applyUrl) + '" target="_blank" rel="noopener noreferrer nofollow">open ↗</a>' : '') + '</td>' +
          '<td>' + esc(text.truncate(entry.company, 34)) + '<br><span class="muted">' + esc(text.str(entry.location).slice(0, 30)) + '</span></td>' +
          '<td class="num">' + (entry.score == null ? '—' : entry.score) + '</td>' +
          '<td class="muted">' + esc(text.str(entry.added).slice(0, 10)) + '</td>' +
          '<td class="muted">' + esc(text.str(entry.updated).slice(0, 10)) + '</td>' +
          '<td><input data-field="notes" type="text" value="' + esc(entry.notes || '') + '" placeholder="recruiter name, nudge date, referral…"></td>' +
          '<td><button class="btn small ghost" data-act="del" type="button">remove</button></td></tr>';
      }).join('') : '');
      body.querySelectorAll('tr').forEach(function (row) {
        var id = row.getAttribute('data-id');
        var select = row.querySelector('[data-field="status"]');
        if (select) select.addEventListener('change', function () {
          store.upsert({ id: id, status: select.value });
          renderTracker(); renderJobs(); updateCounts();
        });
        var notes = row.querySelector('[data-field="notes"]');
        if (notes) notes.addEventListener('change', function () {
          store.upsert({ id: id, notes: notes.value });
          toast('Note saved');
        });
        var del = row.querySelector('[data-act="del"]');
        if (del) del.addEventListener('click', function () {
          store.removeEntry(id);
          renderTracker(); renderJobs(); updateCounts();
        });
      });
    }
    var emptyNote = el('trackEmpty');
    if (emptyNote) emptyNote.textContent = shown.length ? '' : 'Nothing here yet. Shortlist from step 3, or mark a packet as applied and it lands in this table.';
    var options = el('trackFilter');
    if (options && options.options.length <= 1) {
      options.innerHTML = '<option value="all">All statuses</option>' + store.STATUSES.map(function (status) { return '<option value="' + status + '">' + status + '</option>'; }).join('');
      options.value = 'all';
      options.addEventListener('change', renderTracker);
    }
    var stats = store.stats(entries);
    html(el('trackStats'), [
      { label: 'tracked', value: stats.total, cls: '' },
      { label: 'applied', value: stats.applied, cls: 'info' },
      { label: 'interview', value: stats.counts.interview || 0, cls: 'good' },
      { label: 'offer', value: stats.counts.offer || 0, cls: 'good' },
      { label: 'avg match', value: stats.avgScore == null ? '—' : stats.avgScore, cls: '' },
      { label: 'reply rate', value: stats.responseRate == null ? '—' : stats.responseRate + '%', cls: 'warn' },
      { label: 'packets with gaps', value: stats.packetsWithBlanks, cls: stats.packetsWithBlanks ? 'warn' : '' }
    ].map(function (item) {
      return '<div class="stat ' + item.cls + '"><b>' + item.value + '</b><span>' + item.label + '</span></div>';
    }).join(''));
  }

  /* --------------------------------------------------------------- sources */
  function renderSourceControls() {
    var wrap = el('sourceList');
    if (!wrap) return;
    var settings = state.settings;
    html(wrap, feeds.list().map(function (source) {
      var on_ = !!(settings.sources || {})[source.id];
      return '<label class="source' + (on_ ? ' on' : '') + '">' +
        '<input type="checkbox" data-src="' + esc(source.id) + '"' + (on_ ? ' checked' : '') + '>' +
        '<span class="body"><b>' + esc(source.label) + '</b>' +
        (source.needsKey ? '<span class="badge key">needs your key</span>' : '<span class="badge free">no key</span>') +
        (source.minIntervalMinutes >= 180 ? '<span class="badge eta">politeness floor ' + Math.round(source.minIntervalMinutes / 60) + ' h</span>' : '') +
        '<p>' + esc(source.about) + (source.companyHelp ? ' ' + esc(source.companyHelp) : '') + (source.keyHelp ? ' ' + esc(source.keyHelp) : '') + '</p></span></label>';
    }).join(''));
    wrap.querySelectorAll('input[data-src]').forEach(function (box) {
      box.addEventListener('change', function () {
        state.settings.sources = state.settings.sources || {};
        state.settings.sources[box.getAttribute('data-src')] = box.checked;
        store.setSettings(state.settings);
        renderSourceControls(); renderSourceStatus();
      });
    });
    var companies = settings.companies || {};
    var gh = el('ghCompanies'); if (gh) gh.value = (companies.greenhouse || []).join('\n');
    var lv = el('leverCompanies'); if (lv) lv.value = (companies.lever || []).join('\n');
    var sr = el('srCompanies'); if (sr) sr.value = (companies.smartrecruiters || []).join('\n');
    var keys = settings.keys || {};
    var ki = el('keyAdzunaId'); if (ki) ki.value = keys.adzuna_id || '';
    var kk = el('keyAdzunaKey'); if (kk) kk.value = keys.adzuna_key || '';
    var kc = el('keyAdzunaCountry'); if (kc) kc.value = keys.adzuna_country || 'in';
    var jk = el('keyJsearch'); if (jk) jk.value = keys.rapidapi_key || '';
    var jl = el('keyJsearchLoc'); if (jl) jl.value = keys.jsearch_location || 'India';
    var jr = el('keyJsearchRemote'); if (jr) jr.checked = !!keys.jsearch_remoteOnly;
    var hours = el('autoHours'); if (hours) hours.value = settings.autoRefreshHours || 6;
    var etiquette = el('etiquetteNote');
    if (etiquette) {
      var cache = store.getCache();
      var ages = Object.keys(cache).map(function (id) {
        var hours2 = store.cacheAgeHours(id);
        return hours2 === null ? null : id + ' ' + Math.round(hours2) + ' h';
      }).filter(Boolean);
      etiquette.innerHTML = 'Cache holds ' + (Object.keys(cache).length) + ' source(s)' + (ages.length ? ' (' + esc(ages.join(', ')) + ' old)' : '') +
        '. Remotive’s published terms ask for <b>at most a few fetches a day</b> and a link back to each listing — the tool enforces a 6 h floor and keeps the source link on every card. ' +
        'If you self-host a proxy for another source, add it in <code>lib/feeds.js</code>; the shape of an adapter is documented there.';
    }
  }

  function bindSourceControls() {
    on('btnSaveSources', 'click', function () {
      state.settings.companies = {
        greenhouse: parseLines(val('ghCompanies')),
        lever: parseLines(val('leverCompanies')),
        smartrecruiters: parseLines(val('srCompanies'))
      };
      state.settings.autoRefreshHours = text.clamp(text.toNumber(val('autoHours'), 6), 1, 48);
      store.setSettings(state.settings);
      renderSourceControls(); scheduleAuto();
      toast('Sources saved');
    });
    on('btnSaveKeys', 'click', function () {
      state.settings.keys = {
        adzuna_id: val('keyAdzunaId').trim(),
        adzuna_key: val('keyAdzunaKey').trim(),
        adzuna_country: (val('keyAdzunaCountry').trim() || 'in').toLowerCase().slice(0, 3),
        rapidapi_key: val('keyJsearch').trim(),
        jsearch_location: val('keyJsearchLoc').trim() || 'India',
        jsearch_remoteOnly: !!el('keyJsearchRemote').checked
      };
      store.setSettings(state.settings);
      toast(state.settings.keys.adzuna_key || state.settings.keys.rapidapi_key ? 'Keys saved in this browser only' : 'No keys present — key-based sources stay off', !state.settings.keys.adzuna_key && !state.settings.keys.rapidapi_key);
    });
    on('btnClearKeys', 'click', function () {
      state.settings.keys = {};
      store.setSettings(state.settings);
      renderSourceControls();
      toast('Keys deleted from this browser');
    });
    on('btnClearCache', 'click', function () {
      store.set('cache', {});
      renderSourceControls(); renderSourceStatus(); renderSourceSummary();
      toast('Cached listings cleared (your tracker and packets are untouched)');
    });
    on('btnWipeAll', 'click', function () {
      if (!window.confirm('Delete the profile, targets, packets, tracker, cache and keys this tool stored in this browser? This cannot be undone.')) return;
      store.wipe();
      state.profile = null; state.scored = []; state.importedJobs = []; state.sampleLoaded = false;
      state.selectedPacket = null;
      renderAll();
      toast('Local data deleted');
    });
  }

  function parseLines(value) {
    return text.normalize(value).split(/[\n,]/).map(function (s) { return s.trim().replace(/^https?:\/\/[^/]+\//, '').replace(/[/?#].*$/, ''); }).filter(Boolean);
  }

  /* ------------------------------------------------------------- resume IO */
  function bindResumeControls() {
    var drop = el('drop'), fileInput = el('fileInput');
    if (drop) {
      ['dragenter', 'dragover'].forEach(function (evt) {
        drop.addEventListener(evt, function (event) { event.preventDefault(); drop.classList.add('hot'); });
      });
      ['dragleave', 'drop'].forEach(function (evt) {
        drop.addEventListener(evt, function (event) { event.preventDefault(); drop.classList.remove('hot'); });
      });
      drop.addEventListener('drop', function (event) {
        var file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
        if (file) handleFile(file);
      });
    }
    if (fileInput) fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      if (file) handleFile(file);
      fileInput.value = '';
    });
    on('btnParse', 'click', function () {
      var raw = val('pasteBox');
      if (raw.trim().length < 80) { toast('Paste more than a fragment — the parser needs sections to read.', true); return; }
      var profile = resumeApi.parse(raw, { source: 'pasted text' });
      profile.seed = false;
      saveProfile(profile);
      toast('Profile built: ' + profile.skills.length + ' skills, ' + (profile.years || '?') + ' yrs, ATS ' + (profile.ats ? profile.ats.score : '?') + '/100');
    });
    on('btnSeed', 'click', function () {
      var seed = JSON.parse(JSON.stringify(R.seedProfile || {}));
      if (seed.raw) seed.ats = resumeApi.atsReview(seed, seed.raw);
      state.profile = seed;
      store.setProfile(seed);
      renderProfile(); renderSkills(); renderAts();
      showTab('resume');
      toast('Founder draft loaded — replace the [FILL] items before you send anything');
    });
    on('btnClearResume', 'click', function () {
      state.profile = blankProfile();
      store.setProfile(state.profile);
      var box = el('pasteBox'); if (box) box.value = '';
      renderProfile(); renderSkills(); renderAts();
      toast('Profile cleared from this browser');
    });
    ['pName', 'pHeadline', 'pEmail', 'pPhone', 'pLocation', 'pLinkedin', 'pWebsite', 'pNotice', 'pCurrent', 'pExpected', 'pVisa', 'pYears'].forEach(function (id) {
      on(id, 'change', function () {
        var p = currentProfile();
        var map = { pName: 'name', pHeadline: 'headline', pEmail: 'email', pPhone: 'phone', pLocation: 'location', pLinkedin: 'linkedin', pWebsite: 'website', pNotice: 'noticePeriod', pCurrent: 'currentCtc', pExpected: 'expectedCtc', pVisa: 'visa', pYears: 'years' };
        p[map[id]] = id === 'pYears' ? text.toNumber(val(id), 0) : val(id).trim();
        p.seed = false;
        saveProfile(p);
      });
    });
    on('btnSaveProfile', 'click', function () { saveProfile(currentProfile()); toast('Profile saved in this browser'); });
  }

  function handleFile(file) {
    if (file.name && /\.json$/i.test(file.name)) {
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var data = JSON.parse(reader.result);
          if (data.profile) {
            state.profile = data.profile;
            if (data.targets) { state.targets = Object.assign({}, store.DEFAULT_TARGETS, data.targets); store.setTargets(state.targets); }
            renderAll();
            toast('Workspace profile restored');
          } else toast('That JSON has no "profile" field.', true);
        } catch (e) { toast('Could not read that JSON: ' + e.message, true); }
      };
      reader.readAsText(file);
      return;
    }
    var note = el('parseNote');
    if (note) note.textContent = 'Reading ' + file.name + ' in this tab…';
    resumeApi.extractFromFile(file).then(function (result) {
      if (result.warning) {
        if (note) note.textContent = result.warning;
        toast(result.warning, true);
        return;
      }
      var box = el('pasteBox'); if (box) box.value = result.text.slice(0, 60000);
      var profile = resumeApi.parse(result.text, { source: result.kind + ' file: ' + file.name });
      profile.seed = false;
      saveProfile(profile);
      if (note) note.textContent = 'Extracted ' + result.text.length + ' characters from ' + file.name + ' (parsed locally, never uploaded).';
      toast('Parsed ' + file.name + ' · ' + profile.skills.length + ' skills found');
    }).catch(function (error) {
      if (note) note.textContent = 'Could not read that file: ' + (error.message || error);
      toast('Could not read that file: ' + (error.message || error), true);
    });
  }

  /* ------------------------------------------------------------- workspace */
  function bindWorkspace() {
    on('btnExport', 'click', function () {
      var content = packetsApi.workspace(currentProfile(), state.targets, store.getTracker(), store.getPackets(), {
        sources: state.settings.sources, companies: state.settings.companies, autoRefreshHours: state.settings.autoRefreshHours
      });
      packetsApi.download('rcw-job-matcher-workspace-' + new Date().toISOString().slice(0, 10) + '.json', content, 'application/json');
      toast('Workspace saved — keep it somewhere private, it contains your contact details');
    });
    on('btnImport', 'click', function () { el('workspaceFile').click(); });
    on('workspaceFile', 'change', function (event) {
      var file = event.target.files && event.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var data = JSON.parse(reader.result);
          if (data.profile) { state.profile = data.profile; store.setProfile(data.profile); }
          if (data.targets) { state.targets = Object.assign({}, store.DEFAULT_TARGETS, data.targets); store.setTargets(state.targets); }
          if (data.settings) { state.settings = Object.assign({}, store.DEFAULT_SETTINGS, data.settings); store.setSettings(state.settings); }
          if (data.tracker) store.set('tracker', data.tracker);
          if (data.packets) store.set('packets', data.packets);
          renderAll();
          toast('Workspace restored (' + (data.tracker ? data.tracker.length : 0) + ' tracked, ' + Object.keys(data.packets || {}).length + ' packets)');
        } catch (e) { toast('That file is not a workspace export: ' + e.message, true); }
      };
      reader.readAsText(file);
      event.target.value = '';
    });
    on('btnExportCsv', 'click', function () {
      var entries = store.getTracker();
      if (!entries.length) { toast('Tracker is empty.', true); return; }
      packetsApi.download('job-pipeline-' + new Date().toISOString().slice(0, 10) + '.csv', packetsApi.trackerCSV(entries), 'text/csv;charset=utf-8');
      toast('CSV exported');
    });
    on('btnExportJson', 'click', function () {
      packetsApi.download('job-pipeline-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(store.getTracker(), null, 2), 'application/json');
    });
    on('btnWipeTracker', 'click', function () {
      if (!window.confirm('Delete every row in the pipeline table? Packets and cached listings are kept.')) return;
      store.set('tracker', []);
      renderTracker(); renderJobs(); updateCounts();
      toast('Tracker cleared');
    });
    on('btnDemo', 'click', loadDemo);
    on('btnSearch', 'click', function () { searchNow(false); });
    on('btnSearchForce', 'click', function () { searchNow(true); });
    on('tAuto', 'change', function () {
      state.settings.auto = !!el('tAuto').checked;
      store.setSettings(state.settings);
      scheduleAuto();
      if (state.settings.auto) toast('Auto-refresh armed. Cached sources answer between checks, so this stays polite to them.');
    });
    on('btnImportJobs', 'click', function () {
      var raw = val('importBox');
      if (raw.trim().length < 12) { toast('Paste at least one listing block first.', true); return; }
      importJobs(raw);
      var box = el('importBox'); if (box) box.value = '';
    });
    on('importFile', 'change', function (event) {
      var file = event.target.files && event.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () { importJobs(reader.result, /\.csv$/i.test(file.name) ? 'csv' : /\.json$/i.test(file.name) ? 'json' : 'auto'); };
      reader.readAsText(file);
      event.target.value = '';
    });
    on('jobFilter', 'input', debounce(renderJobs, 140));
    on('showWhich', 'change', renderJobs);
  }

  function debounce(fn, ms) {
    var timer = null;
    return function () {
      clearTimeout(timer);
      timer = setTimeout(fn, ms);
    };
  }

  /* ---------------------------------------------------------------- tabs */
  function showTab(name) {
    document.querySelectorAll('.tab').forEach(function (tab) {
      var active = tab.getAttribute('data-tab') === name;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('.panel').forEach(function (panel) {
      panel.classList.toggle('active', panel.id === 'panel-' + name);
    });
    if (location.hash !== '#' + name) {
      try { history.replaceState(null, '', '#' + name); } catch (e) {}
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function bindTabs() {
    document.querySelectorAll('.tab').forEach(function (tab) {
      tab.addEventListener('click', function () { showTab(tab.getAttribute('data-tab')); });
    });
    var hash = (location.hash || '').replace('#', '');
    if (hash && el('panel-' + hash)) showTab(hash);
  }

  function updateCounts() {
    var jobs = visibleJobs().filter(function (j) { return !j.match.blocked; });
    var count = el('tabJobCount');
    if (count) count.textContent = state.scored.length ? String(jobs.length) : '';
    var packetsCount = Object.keys(store.getPackets()).length;
    var pc = el('tabPacketCount');
    if (pc) pc.textContent = packetsCount ? String(packetsCount) : '';
    var tc = el('tabTrackCount');
    var tracker = store.getTracker();
    if (tc) tc.textContent = tracker.length ? String(tracker.length) : '';
    var statMatches = el('statMatches');
    if (statMatches) statMatches.textContent = String(jobs.filter(function (j) { return j.match.score >= 65; }).length);
    var statPackets = el('statPackets');
    if (statPackets) statPackets.textContent = String(packetsCount);
    var statApplied = el('statApplied');
    if (statApplied) statApplied.textContent = String(tracker.filter(function (e) { return e.status === 'applied' || e.status === 'screening' || e.status === 'interview' || e.status === 'offer'; }).length);
  }

  /* ---------------------------------------------------------------- boot */
  function renderAll() {
    renderProfile(); renderSkills(); renderAts(); renderTargets(); renderSourceControls(); renderSourceStatus();
    renderJobs(); renderPackets(); renderTracker(); updateCounts();
    var auto = el('tAuto');
    if (auto) auto.checked = !!state.settings.auto;
  }

  function init() {
    matcher.options.mustHaveIsBlocking = store.get('mustBlock', true) !== false;
    bindResumeControls();
    bindTargetInputs();
    bindPacketControls();
    bindSourceControls();
    bindWorkspace();
    bindTabs();
    currentProfile();
    renderAll();
    // Restore a previous board so a reload does not look like data loss.
    var cache = store.getCache();
    if (Object.keys(cache).length) {
      mergeResults([], Object.keys(cache), cache);
      renderSourceStatus();
    }
    scheduleAuto();
    var last = store.lastShown();
    if (!last) {
      store.setLastShown(1);
      toast('Everything runs in this tab: your resume is parsed locally and never uploaded.');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
