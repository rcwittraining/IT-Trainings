/* RCW Job Matcher - scoring engine.
 *
 * Scores are explainable by construction: every band contributes a known number of
 * points and every point carries a human-readable note. A score without a reason is
 * decoration, so the engine returns `bands`, `matched`, `missing` and `gaps` together.
 *
 * Bands (before penalties):
 *   skills        0-45   weighted overlap between resume skills and the posting
 *   title         0-18   role family + level alignment
 *   experience    0-12   years vs. the posting's stated range
 *   location      0-10   regions / remote intent
 *   credentials    0-8   certifications and education the posting asks for
 *   momentum       0-7   recency + listing completeness (description, salary, apply link)
 *
 * Browser: window.RCWJM.matcher   Node (tests): module.exports
 */
(function (root, factory) {
  'use strict';
  var deps = typeof module === 'object' && module && module.exports
    ? { text: require('./text.js'), skills: require('./skills.js') }
    : { text: root.RCWJM.text, skills: root.RCWJM.skills };
  if (typeof module === 'object' && module && module.exports) module.exports = factory(deps.text, deps.skills);
  else { root.RCWJM = root.RCWJM || {}; root.RCWJM.matcher = factory(deps.text, deps.skills); }
}(typeof self !== 'undefined' ? self : this, function (text, skills) {
  'use strict';

  var SENIORITY_PENALTY = { '-2': 0, '-1': 0, 0: 0, 1: 4, 2: 10, 3: 16, 4: 20 };
  var OPTIONS = defaults();

  function jobText(job) {
    return [
      job.title, job.title, job.title,
      Array.isArray(job.tags) ? job.tags.join(' ') : text.str(job.tags),
      text.stripHtml(job.description),
      text.str(job.requirements), text.str(job.benefits)
    ].join('\n');
  }

  function jobBlob(job) {
    return (text.str(job.title) + '\n' + jobText(job)).replace(/\s+/g, ' ');
  }

  /** Skills the posting asks for, weighted by where they appear ("required" > "nice to have"). */
  function jobSkills(job) {
    var blob = jobText(job);
    var extracted = skills.extract(blob);
    var byName = Object.create(null);
    var tagSet = Object.create(null);
    (Array.isArray(job.tags) ? job.tags : String(job.tags || '').split(/[,;]/)).forEach(function (tag) {
      var name = String(tag || '').trim();
      if (!name) return;
      var canonical = skills.lookup(name);
      tagSet[canonical ? canonical.name : name] = true;
    });
    extracted.skills.forEach(function (entry) {
      var inTags = !!tagSet[entry.name];
      var promoted = /must[- ]have|required|minimum|essential|strong (?:hands-on )?experience|expert/.test(blob) &&
        new RegExp('(must[- ]have|required|minimum|essential|strong experience)[^.\\n]{0,60}?' + skillsSafe(entry), 'i').test(blob);
      var demoted = /nice to have|bonus|plus|preferred|desirable|good to have/.test(blob) &&
        new RegExp('(nice to have|bonus|plus|desirable)[^.\\n]{0,50}?' + skillsSafe(entry), 'i').test(blob);
      var weight = entry.weight + (inTags ? 0.6 : 0) + (promoted ? 1 : 0) - (demoted ? 1.2 : 0);
      byName[entry.name] = {
        name: entry.name,
        weight: text.clamp(weight, 0.4, 4),
        category: entry.category,
        lab: entry.lab,
        inTags: inTags,
        promoted: promoted,
        demoted: demoted
      };
    });
    return byName;
  }

  function skillsSafe(entry) {
    return text.escapeRegExp(entry.aliases && entry.aliases.length ? entry.aliases[0] : entry.name);
  }

  function parseRequiredYears(blob) {
    var min = null, max = null;
    var re = /(\d{1,2})\s*(?:\+|to|-|~|–)\s*(\d{1,2})?\s*(?:years?|yrs?)/gi;
    var m;
    while ((m = re.exec(blob)) !== null) {
      var a = parseInt(m[1], 10), b = m[2] ? parseInt(m[2], 10) : null;
      if (b !== null && (b < a || b > 40)) b = null;
      if (b === null) { min = min === null ? a : Math.min(min, a); max = max === null ? a : Math.max(max, b === null ? a : b); continue; }
      min = min === null ? a : Math.min(min, a);
      max = max === null ? b : Math.max(max, b);
    }
    if (min === null) {
      var single = blob.match(/(?:minimum|at least)\s*(?:of\s*)?(\d{1,2})\s*(?:years?|yrs?)/i);
      if (single) { min = parseInt(single[1], 10); max = null; }
    }
    if (min === null) return null;
    if (min > 40) return null;
    return { min: min, max: max === null ? min + 5 : max };
  }

  function parseBudget(blob) {
    var body = text.str(blob);
    var dash = '\\s*(?:-|–|—|to|~)\\s*';
    var inr = body.match(new RegExp('(?:₹|rs\\.?|inr)\\s*([\\d.,]+)' + dash + '(?:₹|rs\\.?|inr)?\\s*([\\d.,]+)\\s*(lakh|lakhs|lpa|l|crore|crores|cr)?\\b', 'i'));
    if (inr) {
      var unit = (inr[3] || 'lakh').toLowerCase();
      var scale = /^c/.test(unit) ? 100 : 1; // crore -> lakh
      return { currency: 'INR', min: round2(inrNum(inr[1]) * scale), max: round2(inrNum(inr[2]) * scale), unit: 'LPA' };
    }
    var inrPlain = body.match(new RegExp('([\\d.,]+)\\s*(?:-|–|to)\\s*([\\d.,]+)\\s*(lpa|lak?h|l|crore|cr)\\b', 'i'));
    if (inrPlain) {
      var unit2 = (inrPlain[3] || 'lakh').toLowerCase();
      var scale2 = /^c/.test(unit2) ? 100 : 1;
      return { currency: 'INR', min: round2(inrNum(inrPlain[1]) * scale2), max: round2(inrNum(inrPlain[2]) * scale2), unit: 'LPA' };
    }
    var usd = body.match(/([$€£])\s*([\d,.]+)\s*(k|m)?\b\s*(?:-|–|—|to|~)\s*\1?\s*([\d,.]+)\s*(k|m)?\b/i);
    if (usd) {
      return { currency: 'USD', min: magnitude(usd[2], usd[3]), max: magnitude(usd[4], usd[5]), unit: 'per year' };
    }
    return null;
  }

  function inrNum(value) {
    // "12,00,000" (Indian), "1,200,000" (Western) and "12" (LPA) all have to land on lakhs.
    var digits = String(value).replace(/[^\d.]/g, '');
    var n = text.toNumber(digits, 0);
    if (!n) return 0;
    return n > 5000 ? n / 100000 : n;
  }

  function round2(n) { return Math.round(n * 100) / 100; }

  function magnitude(value, suffix) {
    var n = text.toNumber(String(value).replace(/,(?=\d{3}\b)/g, ''), 0);
    if (/^k$/i.test(suffix || '')) n *= 1000;
    if (/^m$/i.test(suffix || '')) n *= 1000000;
    return Math.round(n);
  }

  function isRemoteish(job) {
    var blob = (text.str(job.location) + ' ' + text.str(job.remote) + ' ' + jobBlob(job)).toLowerCase();
    if (/\b(hybrid|3 days in office|2 days a week|onsite|on-site|must be in office|office based)\b/.test(blob) && !/\bfully remote\b|\bremote only\b/.test(blob)) return 'hybrid';
    if (job.remote === true || job.remote === 'true' || /remote|anywhere|work from home|location independent|wfh/.test(blob)) return 'remote';
    return 'onsite';
  }

  function wantedRegions(targets) {
    var out = [];
    (targets.regions || []).forEach(function (region) {
      if (region === 'Remote (worldwide)' || region === 'Remote') out.push('Remote (worldwide)');
      else if (out.indexOf(region) === -1) out.push(region);
    });
    return out.length ? out : ['India', 'Remote (worldwide)'];
  }

  function profileSkillMap(profile) {
    var map = Object.create(null);
    (profile.skills || []).forEach(function (entry) {
      if (entry.excluded) return;
      map[entry.name] = entry;
    });
    // Free-text skills the visitor added by hand in the Targets panel.
    (profile.extraSkills || []).forEach(function (name) {
      var canonical = skills.lookup(name);
      var key = canonical ? canonical.name : name;
      if (!map[key]) map[key] = { name: key, weight: canonical ? canonical.weight : 2, category: canonical ? canonical.category : 'Custom', lab: canonical ? canonical.lab : '', mentions: 1, manual: true };
    });
    return map;
  }

  var OUT_OF_DOMAIN = {
    terms: ['react', 'angular', 'vue.js', 'frontend', 'front-end', 'ui developer', 'mobile developer',
      'ios', 'android', 'full stack', 'fullstack', 'java developer', '.net developer', 'php developer',
      'game', 'unity', 'data scien', 'machine learning engineer', 'ai researcher', 'nlp',
      'business analyst', 'product manager', 'product owner', 'scrum master', 'project manager',
      'content writer', 'copywriter', 'graphic designer', 'ux designer', 'ui designer', 'video editor',
      'marketing', 'seo', 'sales executive', 'business development', 'account manager', 'hr ', 'recruiter',
      'teacher', 'trainer faculty', 'nurse', 'pharma', 'lawyer', 'legal', 'architect (building)',
      'civil', 'mechanical', 'electrical engineer', 'instrumentation', 'hotel', 'chef', 'driver', 'admin assistant'],
    infraEscapes: ['infrastructure', 'cloud', 'devops', 'sre', 'platform', 'system administrator', 'linux', 'vmware',
      'network', 'storage', 'backup', 'endpoint', 'intune', 'security operations', 'site reliability', 'it operations']
  };

  /**
   * A title like "Senior Frontend Engineer" contains the word "engineer" but is not a role
   * this tool can honestly score or help with. Escapes matter: "Frontend Infrastructure
   * Engineer" is a real job and must not be penalised.
   */
  function outOfDomain(title, listTerms) {
    var lower = ' ' + text.str(title).toLowerCase() + ' ';
    var hits = OUT_OF_DOMAIN.terms.filter(function (term) { return lower.indexOf(term) !== -1; });
    if (!hits.length) return listTerms ? [] : false;
    var escape = OUT_OF_DOMAIN.infraEscapes.some(function (term) { return lower.indexOf(term) !== -1; });
    if (escape) return listTerms ? [] : false;
    return listTerms ? hits : true;
  }

  function matchesAny(blob, patterns) {
    if (!patterns || !patterns.length) return [];
    var hits = [];
    patterns.forEach(function (pattern) {
      var re = pattern instanceof RegExp ? pattern : new RegExp(text.escapeRegExp(pattern), 'i');
      if (re.test(blob)) hits.push(String(pattern.source || pattern).replace(/\\[.+*?^${}()|[\]\\]/g, ''));
    });
    return hits;
  }

  /**
   * score(job, profile, targets) -> result
   *   result.score      0-100
   *   result.bands      [{key, label, earned, max, note}]
   *   result.matched    [{name, weight, why, evidence}]
   *   result.missing    [{name, weight, mustHave, lab}]
   *   result.gaps       [{name, lab, action}]  resume-side advice
   *   result.blocked    string | null  hard stop (exclusion / wrong country / no apply link)
   */
  function score(job, profile, targets) {
    targets = targets || {};
    var opts = OPTIONS;
    var blob = jobBlob(job);
    var title = text.str(job.title);
    var wanted = jobSkills(job);
    var have = profileSkillMap(profile);
    var bands = [];
    var matched = [];
    var missing = [];
    var blocked = null;
    var note;

    /* --- exclusions (hard) ------------------------------------------------- */
    var excludeList = (targets.exclude || []).filter(Boolean);
    for (var e = 0; e < excludeList.length && !blocked; e += 1) {
      var word = excludeList[e];
      var re = new RegExp('\\b' + text.escapeRegExp(word) + '\\b', 'i');
      if (re.test(title + ' ' + text.str(job.location))) blocked = 'Excluded by your filter: "' + word + '"';
    }

    /* --- must-have skills -------------------------------------------------- */
    var mustHaves = (targets.mustHave || []).filter(Boolean).map(function (name) {
      var canonical = skills.lookup(name);
      return canonical ? canonical.name : name;
    });
    var missingMust = mustHaves.filter(function (name) { return !have[name]; });
    if (missingMust.length && opts.mustHaveIsBlocking) {
      blocked = 'Missing must-have: ' + missingMust.join(', ');
    }

    /* --- skills band ------------------------------------------------------- */
    var wantedTotal = 0, earnedRaw = 0;
    Object.keys(wanted).forEach(function (name) {
      var w = wanted[name];
      wantedTotal += w.weight;
      var mine = have[name];
      if (mine) {
        var depth = text.clamp((Math.log(1 + (mine.mentions || 1)) / Math.log(1 + 12)), 0.35, 1);
        var credited = w.weight * (0.55 + 0.45 * depth);
        earnedRaw += credited;
        matched.push({
          name: name,
          weight: w.weight,
          why: w.inTags ? 'listed in the posting tags' : w.promoted ? 'named in the "required" text' : 'appears in the posting',
          evidence: (mine.evidence && mine.evidence[0]) || (mine.mentions ? 'mentioned ' + mine.mentions + '× in your resume' : 'added by you'),
          mentions: mine.mentions || 0,
          manual: !!mine.manual
        });
      }
    });
    var skillPoints = wantedTotal ? 45 * text.clamp(earnedRaw / wantedTotal, 0, 1) : 0;
    if (!wantedTotal) {
      // Nothing in the posting matched the taxonomy. A thin listing should not be punished
      // as harshly as a listing that actively asks for something else, so this is the
      // middle of the band scaled to how much of the profile the posting mentions at all.
      var incidental = Object.keys(have).filter(function (name) { return new RegExp('\\b' + name + '\\b', 'i').test(blob); }).length;
      skillPoints = text.clamp(6 + incidental * 1.5, 0, 16);
      note = 'The listing did not state recognisable requirements, so the skills band stays near the middle — check it by eye.';
    }
    /* A missing must-have either blocks the listing or, if the visitor turned blocking off,
       takes real points. "Visible but ignored" would be the worst of both. */
    if (missingMust.length && !opts.mustHaveIsBlocking) {
      skillPoints = Math.max(0, skillPoints - Math.min(26, 9 * missingMust.length));
    }
    matched.sort(function (a, b) { return b.weight - a.weight; });
    Object.keys(wanted).forEach(function (name) {
      if (have[name]) return;
      var w = wanted[name];
      missing.push({ name: name, weight: w.weight, mustHave: mustHaves.indexOf(name) !== -1, lab: w.lab, category: w.category, demoted: w.demoted });
    });
    missing.sort(function (a, b) { return (b.mustHave ? 10 : 0) + b.weight - ((a.mustHave ? 10 : 0) + a.weight); });
    bands.push({
      key: 'skills', label: 'Skill overlap', earned: Math.round(skillPoints), max: 45,
      note: matched.length + '/' + Object.keys(wanted).length + ' required skills are in your resume' +
        (missingMust.length ? ' · missing must-have: ' + missingMust.join(', ') : '') + (note ? ' · ' + note : '')
    });

    /* --- title / level band ------------------------------------------------ */
    var titleInfo = skills.classifyTitle(title);
    var wantedFamilies = (targets.roleFamilies || []).filter(Boolean);
    var titlePoints = 0;
    var titleNote = '';
    var targetTerms = (opts.roleTerms || []).filter(function (term) { return new RegExp('\\b' + text.escapeRegExp(term), 'i').test(title); });
    if (wantedFamilies.length && titleInfo.families.length) {
      var overlap = titleInfo.families.filter(function (f) { return wantedFamilies.indexOf(f.id) !== -1; });
      if (overlap.length) { titlePoints += 10; titleNote = 'Role family ' + overlap.map(function (f) { return f.label; }).join(', ') + ' is in your target list'; }
      else { titlePoints += 2; titleNote = 'Role family ' + titleInfo.families.map(function (f) { return f.label; }).join(', ') + ' is not in your target list'; }
    } else if (titleInfo.families.length) {
      titlePoints += 8;
      titleNote = 'Matched ' + titleInfo.families.map(function (f) { return f.label; }).join(', ');
    } else if (outOfDomain(title)) {
      titlePoints -= 8;
      titleNote = 'Outside the infrastructure/cloud/ops domain this tool is tuned for (' + outOfDomain(title, true).slice(0, 2).join(', ') + ')';
    } else if (targetTerms.length) {
      titlePoints += 3;
      titleNote = 'Title matched only on generic words (' + targetTerms.slice(0, 3).join(', ') + ') — treat the score loosely';
    } else {
      titleNote = 'Title did not map to a known role family — check it by eye.';
    }
    var levelGap = titleInfo.level - (profile.seniority || 3);
    var penalty = SENIORITY_PENALTY[String(Math.max(-2, Math.min(4, levelGap)))] || 0;
    if (levelGap <= 0) { titlePoints += 8; titleNote += ' · level ' + titleInfo.level + ' vs your ' + (profile.seniority || 3) + ' (safe)'; }
    else { titleNote += ' · posting is ' + levelGap + ' level(s) above your band (−' + penalty + ')'; }
    bands.push({ key: 'title', label: 'Role & level', earned: Math.round(text.clamp(titlePoints - penalty, 0, 18)), max: 18, note: titleNote });

    /* --- experience band --------------------------------------------------- */
    var yearsNeeded = parseRequiredYears(blob);
    var mine = profile.years || 0;
    var expPoints = 4, expNote = 'No experience range stated — neutral.';
    if (yearsNeeded) {
      if (mine >= yearsNeeded.min) {
        var overshoot = mine - (yearsNeeded.max || yearsNeeded.min + 5);
        expPoints = overshoot > 8 ? 8 : 12;
        expNote = overshoot > 8
          ? 'You have ' + mine + ' yrs for a ' + yearsNeeded.min + '-' + yearsNeeded.max + ' yr band — likely over-qualified, expect pushback on cost.'
          : 'You have ' + mine + ' yrs, inside/above the ' + yearsNeeded.min + '-' + yearsNeeded.max + ' yr band.';
      } else {
        var shortBy = yearsNeeded.min - mine;
        expPoints = shortBy <= 1 ? 6 : shortBy <= 3 ? 3 : 0;
        expNote = 'Posting wants ' + yearsNeeded.min + '+ yrs, you have ' + mine + ' (short by ' + Math.round(shortBy * 10) / 10 + ').';
      }
    }
    bands.push({ key: 'experience', label: 'Experience fit', earned: Math.round(expPoints), max: 12, note: expNote });

    /* --- location band ----------------------------------------------------- */
    var regions = skills.locationRegions(job.location);
    var wantedR = wantedRegions(targets);
    var remoteMode = targets.remote || 'any';
    var actualRemote = isRemoteish(job);
    var locPoints = 5, locNote = 'Location "' + (text.str(job.location) || 'unspecified') + '" not matched to a region you selected.';
    if (remoteMode !== 'any') {
      if (remoteMode === 'remote' && actualRemote !== 'onsite') locPoints += 4;
      else if (remoteMode === 'hybrid' && actualRemote === 'hybrid') locPoints += 4;
      else if (remoteMode === 'onsite' && actualRemote === 'onsite') locPoints += 4;
      else locPoints -= 4;
    }
    var regionHit = regions.filter(function (r) { return wantedR.indexOf(r) !== -1; });
    if (regionHit.length) { locPoints += 5; locNote = 'Region ' + regionHit.join(' / ') + ' is in your target list'; }
    else if (regions.length) { locNote = 'Posting is in ' + regions.join(' / ') + '; you targeted ' + wantedR.join(' / ') + (targets.relocate ? ' (relocation allowed — no penalty)' : ' (−4)'); if (!targets.relocate) locPoints -= 4; }
    if (targets.indiaOnly && regions.indexOf('India') === -1 && regions.indexOf('Remote (worldwide)') === -1) { locPoints = 0; locNote = 'Outside India/remote and you set India-only.'; }
    bands.push({ key: 'location', label: 'Location & mode', earned: Math.round(text.clamp(locPoints, 0, 10)), max: 10, note: locNote });

    /* --- credentials band -------------------------------------------------- */
    var certPoints = 0, certNote = '';
    var wantedCerts = skills.certHits(blob);
    var myCerts = (profile.certifications || []).map(function (c) { return c.name; });
    if (!wantedCerts.length) { certPoints = 5; certNote = 'No certification named in the posting.'; }
    else {
      var overlapCerts = wantedCerts.filter(function (c) { return myCerts.indexOf(c.name) !== -1; });
      if (overlapCerts.length) { certPoints = 8; certNote = 'You hold ' + overlapCerts.map(function (c) { return c.name; }).join(', '); }
      else {
        var lab = wantedCerts.filter(function (c) { return c.name && myCerts.indexOf(c.name) === -1; });
        certPoints = 2;
        certNote = 'Asks for ' + lab.map(function (c) { return c.name; }).join(', ') + ' — not on your resume.';
      }
    }
    if (/\bbachelor'?s?\b|\bbe\/?b\.?tech\b|\bdegree\b/i.test(blob) && (profile.education && profile.education.degrees.length)) certPoints = Math.max(certPoints, 6);
    bands.push({ key: 'credentials', label: 'Credentials', earned: Math.round(text.clamp(certPoints, 0, 8)), max: 8, note: certNote });

    /* --- momentum band ----------------------------------------------------- */
    var posted = text.parseDate(job.posted || job.pub_date || job.publication_date);
    var momentum = 0, momNote = [];
    if (posted) {
      var fresh = posted.days <= 3 ? 4 : posted.days <= 10 ? 3 : posted.days <= 25 ? 2 : 0;
      momentum += fresh;
      momNote.push(posted.days <= 0 ? 'posted today' : posted.days + ' days old');
    } else momNote.push('no posting date');
    if (job.applyUrl || job.url) momentum += 2;
    else { momentum -= 3; momNote.push('no apply link'); }
    if (text.stripHtml(job.description).length > 320) momentum += 1;
    if (job.salary) momNote.push('salary stated');
    bands.push({ key: 'momentum', label: 'Freshness & completeness', earned: Math.round(text.clamp(momentum, 0, 7)), max: 7, note: momNote.join(' · ') });

    /* The skills band is the gate, not one voice among six. A listing that overlaps
       with nothing in the resume can still look attractive — remote, well paid, posted
       an hour ago, "engineer" in the title — and additive scoring lets that reach the
       50s, which is how a CV ends up in front of the wrong recruiter. Everything outside
       the skills band is therefore scaled by how much of the requirement list matched. */
    var offDomain = outOfDomain(title);
    var gate = offDomain ? 0.5 : skillPoints <= 2 ? 0.5 : skillPoints <= 8 ? 0.75 : skillPoints <= 16 ? 0.92 : 1;
    var total = bands.reduce(function (sum, b) {
      return sum + (b.key === 'skills' ? b.earned : b.earned * gate);
    }, 0);
    if (gate < 1) {
      bands.push({
        key: 'gate', label: 'Requirement gate', earned: -Math.round((1 - gate) * (total / gate)), max: 0,
        note: (offDomain ? 'The title is outside the infrastructure/cloud/ops roles this tool scores, so ' :
          'Little or nothing in this posting overlaps your resume, so ') +
          'the non-skill bands (location, salary, freshness) are discounted by ' + Math.round((1 - gate) * 100) +
          '%. A well-paying wrong-role listing is still a wrong-role listing.'
      });
    }
    if (blocked) total = Math.min(total, 34);
    if (targets.salaryMinLPA) {
      var budget = parseBudget(blob);
      if (budget && budget.currency === 'INR' && budget.max < targets.salaryMinLPA) {
        total = total - 12;
        bands.push({ key: 'salary', label: 'Salary floor', earned: 0, max: 0, note: 'Stated band ₹' + budget.min + '–' + budget.max + ' LPA is under your ₹' + targets.salaryMinLPA + ' LPA floor.' });
      }
    }

    var gaps = missing.filter(function (m) { return m.weight >= 2 && !m.demoted; }).slice(0, 6).map(function (m) {
      return {
        name: m.name,
        lab: m.lab,
        mustHave: m.mustHave,
        action: m.lab
          ? 'Do the free ' + m.name + ' lab on this site, then add it with a result sentence.'
          : 'Add evidence for ' + m.name + ' (one line: what you ran, at what scale, with what outcome).'
      };
    });

    return {
      jobId: job.id,
      score: Math.round(text.clamp(total, 0, 100)),
      bands: bands,
      matched: matched.slice(0, 24),
      missing: missing.slice(0, 24),
      gaps: gaps,
      blocked: blocked,
      mustHaveMissing: missingMust,
      remoteMode: actualRemote,
      regions: regions,
      level: titleInfo.level,
      levelLabel: skills.LEVEL_LABELS[titleInfo.level] || '',
      families: titleInfo.families,
      yearsNeeded: yearsNeeded,
      budget: parseBudget(blob),
      verdict: verdict(Math.round(text.clamp(total, 0, 100)), blocked)
    };
  }

  function verdict(value, blocked) {
    if (blocked) return 'Blocked';
    if (value >= 80) return 'Strong fit';
    if (value >= 65) return 'Good fit';
    if (value >= 50) return 'Worth a look';
    if (value >= 35) return 'Stretch';
    return 'Weak';
  }

  function defaults() {
    return {
      mustHaveIsBlocking: true,
      roleTerms: ['administrator', 'admin', 'engineer', 'architect', 'consultant', 'specialist', 'analyst', 'lead', 'manager', 'sre', 'devops', 'platform', 'infrastructure', 'operations', 'support', 'trainer', 'instructor', 'content']
    };
  }

  function dedupeKey(job) {
    var company = text.normalize(job.company).toLowerCase().replace(/[^a-z0-9]/g, '');
    var title = text.tokens(job.title).sort().join('');
    var place = text.normalize(job.location).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14);
    return company + '::' + title + '::' + place;
  }

  function urlKey(job) {
    var url = text.str(job.applyUrl || job.url || '');
    return url.replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase();
  }

  /** Merge duplicates from several boards, keeping the richest record. */
  function dedupe(jobs) {
    var byKey = Object.create(null);
    var out = [];
    (jobs || []).forEach(function (job) {
      var key = urlKey(job) || dedupeKey(job);
      var existing = byKey[key] || byKey[dedupeKey(job)];
      if (existing) {
        existing.sources = existing.sources.concat([job.sourceLabel || job.source]).filter(function (v, i, a) { return v && a.indexOf(v) === i; });
        if (text.stripHtml(job.description).length > text.stripHtml(existing.description).length) {
          existing.description = job.description;
        }
        existing.jobId = existing.jobId || job.id;
        return;
      }
      var copy = Object.assign({}, job);
      copy.sources = [job.sourceLabel || job.source].filter(Boolean);
      byKey[key] = copy;
      byKey[dedupeKey(job)] = copy;
      out.push(copy);
    });
    return out;
  }

  function rank(jobs, profile, targets, options) {
    var opts = options || {};
    var scored = (jobs || []).map(function (job) {
      var result = score(job, profile, targets);
      return Object.assign({}, job, { match: result });
    });
    if (!opts.keepBlocked) scored = scored.filter(function (job) { return !job.match.blocked; });
    if (typeof opts.minScore === 'number') scored = scored.filter(function (job) { return job.match.score >= opts.minScore; });
    scored.sort(function (a, b) {
      if (b.match.score !== a.match.score) return b.match.score - a.match.score;
      var da = text.parseDate(a.posted), db = text.parseDate(b.posted);
      var av = da ? -da.days : -9999, bv = db ? -db.days : -9999;
      if (bv !== av) return bv - av;
      return text.str(a.company).localeCompare(text.str(b.company));
    });
    return scored;
  }

  return {
    defaults: defaults,
    options: OPTIONS,
    dedupe: dedupe,
    dedupeKey: dedupeKey,
    isRemoteish: isRemoteish,
    outOfDomain: outOfDomain,
    jobSkills: jobSkills,
    jobText: jobText,
    parseBudget: parseBudget,
    parseRequiredYears: parseRequiredYears,
    rank: rank,
    score: score,
    urlKey: urlKey,
    verdict: verdict
  };
}));
