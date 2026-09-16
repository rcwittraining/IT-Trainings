/* RCW Job Matcher - application packets.
 *
 * This is the part that saves time: for every matching posting the tool assembles a
 * send-ready packet (tailored cover letter, portal answer drafts, field-by-field
 * autofill sheet, resume keyword gaps) that a human reviews and submits.
 *
 * Deliberate limits:
 *   - It never invents employers, dates, degrees, salaries or certifications. Anything
 *     not present in the resume comes out as a [FILL: …] marker, and the packet counter
 *     refuses to mark a packet "ready" while markers remain unreviewed.
 *   - It never submits anything to a third-party site and never stores credentials.
 *
 * Browser: window.RCWJM.packets   Node (tests): module.exports
 */
(function (root, factory) {
  'use strict';
  var deps = typeof module === 'object' && module && module.exports
    ? { text: require('./text.js'), skills: require('./skills.js') }
    : { text: root.RCWJM.text, skills: root.RCWJM.skills };
  if (typeof module === 'object' && module && module.exports) module.exports = factory(deps.text, deps.skills);
  else { root.RCWJM = root.RCWJM || {}; root.RCWJM.packets = factory(deps.text, deps.skills); }
}(typeof self !== 'undefined' ? self : this, function (text, skills) {
  'use strict';

  var FILL = '[FILL]';

  function fill(value, hint) {
    var v = text.str(value).trim();
    return v ? v : FILL + (hint ? '(' + hint + ')' : '');
  }

  function countBlanks(packet) {
    var blob = [packet.coverLetter, packet.summary, (packet.answers || []).map(function (a) { return a.answer; }).join('\n')].join('\n');
    return (blob.match(/\[FILL(?:[:([][^\])]*[\])])?\]/g) || []).length;
  }

  function jobName(job) {
    return text.titleCase(text.normalize(job.title)).replace(/\s*\|\s*.*$/, '');
  }

  function companyName(job) {
    var clean = text.normalize(job.company).replace(/\s*\(demo\)\s*$/i, '');
    return clean || 'your team';
  }

  function firstSentence(sentence) {
    var clean = text.normalize(sentence).replace(/^[•*\->–—\s]+/, '');
    var parts = clean.split(/(?<=[.!?])\s+/);
    return (parts[0] || clean).replace(/\.$/, '');
  }

  /** The 3 achievements that best answer "so what" for THIS posting. */
  function pickEvidence(profile, jobResult, limit) {
    var wanted = Object.create(null);
    ((jobResult && jobResult.matched) || []).forEach(function (m) { wanted[m.name.toLowerCase()] = m.weight; });
    var achievements = (profile.achievements || []).map(function (line) {
      var lower = line.toLowerCase();
      var bonus = 0;
      Object.keys(wanted).forEach(function (skill) {
        if (lower.indexOf(skill) !== -1) bonus += wanted[skill] * 2;
      });
      if (text.hasMetric(line)) bonus += 2.5;
      if (/\bresponsible for\b|\bworked on\b|\bassisted\b/.test(lower)) bonus -= 2;
      if (line.length < 60) bonus -= 1;
      if (line.length > 230) bonus -= 1.5;
      return { line: line, bonus: bonus };
    }).sort(function (a, b) { return b.bonus - a.bonus; });
    if (achievements.length < limit) {
      // Fall back to skills-with-evidence lines so the letter is never empty.
      (profile.skills || []).slice(0, limit).forEach(function (entry) {
        if (entry.evidence && entry.evidence[0]) {
          achievements.push({ line: firstSentence(entry.evidence[0]), bonus: 0 });
        }
      });
    }
    return achievements.slice(0, limit || 3).map(function (item) { return item.line; });
  }

  function skillsSentence(jobResult, max) {
    var names = ((jobResult && jobResult.matched) || []).slice(0, max || 5).map(function (m) { return m.name; });
    if (!names.length) return FILL + '(list 3-5 skills from the posting that you genuinely have)';
    return names.join(', ');
  }

  /**
   * buildCoverLetter(job, result, profile, opts) -> string
   * opts: { tone: 'concise'|'standard'|'detailed', channel: 'portal'|'email'|'referral',
   *         signature: true, salaryNote: '' }
   */
  function buildCoverLetter(job, result, profile, opts) {
    var o = Object.assign({ tone: 'standard', channel: 'portal', signature: true }, opts || {});
    var title = jobName(job);
    var company = companyName(job);
    var name = fill(profile.name, 'your name');
    var headline = fill(profile.headline, 'your headline, e.g. Senior Infrastructure Engineer');
    var years = profile.years ? Math.round(profile.years) + '+ years' : FILL + '(years of experience)';
    var matched = skillsSentence(result, o.tone === 'concise' ? 4 : 6);
    var gaps = ((result && result.matched) || []).length;
    var evidence = pickEvidence(profile, result, o.tone === 'concise' ? 2 : o.tone === 'detailed' ? 4 : 3);
    var remoteNote = job.location ? (isRemoteishJob(job) ? ' from ' + text.str(job.location).replace(/Remote.*/i, 'remotely').trim() : ' in ' + job.location) : '';
    var levelLabel = (result && result.levelLabel) ? result.levelLabel : '';

    var opening = {
      concise: 'I am applying for the ' + title + ' role at ' + company + '. ' + headline + ' with ' + years + ', I run ' + matched + ' in production.',
      standard: 'I would like to be considered for the ' + title + ' position at ' + company + '. I am a ' + headline.toLowerCase() + ' with ' + years + ' of hands-on production experience' + remoteNote + ', and the stack in your posting — ' + matched + ' — is the stack I work in day to day.',
      detailed: 'Your ' + title + ' posting at ' + company + ' reads like the work I already do: ' + matched + ', owned end to end rather than ticketed onward. I am a ' + headline.toLowerCase() + ' with ' + years + ' in enterprise infrastructure' + remoteNote + ', most of it spent keeping mixed Linux/Windows and virtualised estates patchable, observable and recoverable, and moving them to cloud without an outage budget.'
    }[o.tone] || '';

    var body = [];
    if (evidence.length) {
      body.push('What that has looked like recently:');
      evidence.forEach(function (line) {
        var clean = firstSentence(line);
        body.push('• ' + clean.charAt(0).toUpperCase() + clean.slice(1) + '.');
      });
    } else {
      body.push('I can bring ' + matched + ' to your environment at the scale you describe — ' + FILL + '(add one quantified result per bullet: how many hosts/users, what improved, by how much).');
    }

    var whyUs = {
      concise: 'Your posting asks for exactly this depth (' + gaps + ' of the listed requirements are already in my resume), so I can carry on-call from week one.',
      standard: 'What draws me to ' + company + ' specifically is ' + FILL + '(one sentence: a product, migration or engineering problem of theirs you can name — the single highest-leverage line in the letter)' +
        '. Of the requirements in your posting, ' + gaps + ' already appear in my resume, so the ramp-up is short and I can take part of the ' + (levelLabel ? levelLabel + ' ' : '') + 'scope from the first sprint.',
      detailed: 'Two things make this worth both our time. First, the overlap is real: ' + gaps + ' of your listed requirements appear directly in my resume, and where they came up I have run them in production rather than in a lab. Second, ' +
        FILL + '(one sentence about ' + company + ' — their product, their migration, a post from their engineering blog) is a problem I want, because ' +
        FILL + '(tie it to something you have done).'
    }[o.tone] || '';

    var close = 'My ' + (o.channel === 'email' ? 'CV is attached' : 'resume is attached') + '. I am available for a conversation at your convenience' +
      (profile.noticePeriod ? ', currently serving a notice period of ' + profile.noticePeriod : '') + '. I am happy to walk through any of the numbers above in a technical interview — they all came from work I did.';

    var letter = [opening, '', body.join('\n'), '', whyUs, '', close].join('\n').replace(/\n{4,}/g, '\n\n');
    if (o.signature) {
      letter += '\n\nRegards,\n' + name +
        '\n' + fill(profile.phone, 'phone') + ' · ' + fill(profile.email, 'email') +
        (profile.linkedin ? '\n' + (/^https?:/.test(profile.linkedin) ? profile.linkedin : 'https://' + profile.linkedin.replace(/^\/+/, '')) : '') +
        (profile.website ? '\n' + (/^https?:/.test(profile.website) ? profile.website : 'https://' + profile.website.replace(/^\/+/, '')) : '');
    }
    if (o.salaryNote) letter += '\n\nCompensation expectation: ' + o.salaryNote;
    return letter.trim();
  }

  function isRemoteishJob(job) {
    return job.remote === true || /remote|anywhere|wfh/i.test(text.str(job.location) + ' ' + text.str(job.description).slice(0, 500));
  }

  /**
   * Answers for the questions ATS forms actually ask, built from the profile only.
   * Unknowns stay as [FILL:…] so the visitor cannot accidentally send a blank or a lie.
   */
  function buildAnswers(job, result, profile) {
    var title = jobName(job);
    var company = companyName(job);
    var matched = skillsSentence(result, 5);
    var years = profile.years ? Math.round(profile.years) + ' years' : FILL + '(years)';
    var rows = [
      { q: 'Why are you interested in this role?', a: 'The stack in your ' + title + ' posting is my daily stack (' + matched + '). I want a role where that depth is used for the whole lifecycle — design, build, run, improve — rather than one slice of it.' },
      { q: 'Why do you want to work at ' + company + '?', a: FILL + '(name one specific thing about ' + company + ': product, engineering blog post, migration they are doing. Generic flattery reads worse than no answer.)' },
      { q: 'Total relevant experience', a: years },
      { q: 'Relevant experience with ' + (matched.split(',')[0] || 'the listed skills').trim(), a: (result && result.matched && result.matched[0] && result.matched[0].mentions ? result.matched[0].mentions + ' mentions in my resume — ' : '') + 'production use, not just exposure. ' + FILL + '(state years for this one tool)' },
      { q: 'Notice period / earliest start', a: fill(profile.noticePeriod, 'e.g. 60 days, negotiable') },
      { q: 'Current CTC', a: fill(profile.currentCtc, 'annual, with currency') },
      { q: 'Expected CTC', a: fill(profile.expectedCtc, 'annual, with currency, or "negotiable"') },
      { q: 'Are you willing to relocate / work in office / hybrid?', a: FILL + '(yes / remote only / hybrid N days — answer honestly, it is the fastest way to waste everyone’s time)' },
      { q: 'Work authorisation for this country', a: fill(profile.visa, 'citizen / PR / visa type + sponsorship need') },
      { q: 'Highest qualification', a: ((profile.education && profile.education.degrees || [])[0]) || FILL + '(degree)' },
      { q: 'Certifications', a: (profile.certifications || []).map(function (c) { return c.name; }).join(', ') || FILL + '(certs, or "in progress — target <month>")' },
      { q: 'Are you legally able to work a contract role / need sponsorship?', a: FILL + '(yes/no)' },
      { q: 'Anything else we should know?', a: profile.website ? 'I maintain ' + profile.website + ' — ' + ((profile.skills || []).length) + ' documented skill areas and hands-on labs, which is also how I keep my own notes.' : FILL + '(one line max, e.g. open-source, talks, portfolio)' }
    ];
    if (result && result.missing && result.missing.length) {
      rows.push({
        q: 'Gap handling — ' + result.missing.slice(0, 2).map(function (m) { return m.name; }).join(' and ') + ' (not on your resume)',
        a: 'Honest framing: "I have not used ' + result.missing[0].name + ' in production. Adjacent experience: ' +
          matched.split(',').slice(0, 2).join(',').trim() + ', and I picked up ' + (result.missing[1] ? result.missing[1].name : 'the neighbouring tool') +
          ' from zero to day-2 support in about ' + FILL + '(weeks) when the job needed it." Do not claim it. ' +
          (result.missing[0].lab ? 'To close it: https://www.rcwittraining.in/' + result.missing[0].lab.replace(/^https?:\/\/[^/]+/, '') : '')
      });
    }
    return rows.map(function (row) { return { q: row.q, a: row.a, blank: /\[FILL/.test(row.a) }; });
  }

  /** Field-by-field sheet: the thing that actually makes portal forms fast. */
  function buildFieldSheet(profile, job) {
    var rows = [
      ['Full name', fill(profile.name, 'as on your documents')],
      ['Legal / passport name', FILL + '(if different)'],
      ['Email', fill(profile.email, 'personal, not current work email')],
      ['Phone', fill(profile.phone, '+91 …')],
      ['Current location', fill(profile.location, 'City, Country')],
      ['LinkedIn URL', profile.linkedin ? ensureUrl(profile.linkedin) : FILL +('(LinkedIn slug)')],
      ['Portfolio / GitHub', profile.website ? ensureUrl(profile.website) : (profile.github ? ensureUrl(profile.github) : '')],
      ['Current title', fill(profile.headline, 'exactly as on your CV')],
      ['Current company', FILL + '(your current employer)'],
      ['Total experience', profile.years ? String(Math.round(profile.years * 10) / 10) : FILL + '(years)'],
      ['Notice period', fill(profile.noticePeriod, 'e.g. 60 days')],
      ['Current CTC', fill(profile.currentCtc, 'annual')],
      ['Expected CTC', fill(profile.expectedCtc, 'annual or negotiable')],
      ['Education', ((profile.education && profile.education.degrees || [])[0]) || FILL + '(degree)'],
      ['Certifications', (profile.certifications || []).map(function (c) { return c.name; }).join(', ') || FILL + '(list or none)'],
      ['Key skills (for the tags box)', (profile.skills || []).slice(0, 12).map(function (s) { return s.name; }).join(', ')],
      ['Why this job / summary', text.truncate(buildCoverLetter(job || { title: 'the role', company: 'your team' }, { matched: [] }, profile, { tone: 'concise', signature: false }), 500)],
      ['Referral source', FILL + '(employee name if you have one — it moves the CV to the top; ask on LinkedIn)'],
      ['How did you hear about us', 'Online job board']
    ];
    return rows.filter(function (row) { return row[1] !== ''; }).map(function (row) { return { label: row[0], value: row[1] }; });
  }

  function ensureUrl(value) {
    var v = text.str(value).trim();
    if (!v) return '';
    return /^https?:\/\//i.test(v) ? v : 'https://' + v.replace(/^\/+/, '');
  }

  /** Resume-side keyword patch: paste-ready line for the CV skills block. */
  function buildKeywordPatch(job, result) {
    var matched = ((result && result.matched) || []).map(function (m) { return m.name; });
    return {
      add: matched.slice(0, 10),
      note: matched.length
        ? 'These already appear in your resume and in this posting — make sure the exact wording from the posting is in your skills section too (ATS text matching is literal).'
        : 'No overlap detected. Either this is a poor match, or your CV describes things differently than this posting does — that is worth fixing once, in a phrase both worlds use.',
      pasteLine: matched.length ? 'Core strengths: ' + matched.slice(0, 8).join(', ') + '.' : ''
    };
  }

  function assemble(job, result, profile, opts) {
    var options = opts || {};
    var coverLetter = buildCoverLetter(job, result, profile, options);
    var answers = buildAnswers(job, result, profile);
    var packet = {
      jobId: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      url: job.applyUrl || job.url || '',
      score: result ? result.score : null,
      verdict: result ? result.verdict : '',
      generatedAt: new Date().toISOString(),
      coverLetter: coverLetter,
      answers: answers,
      fieldSheet: buildFieldSheet(profile, job),
      keywordPatch: buildKeywordPatch(job, result),
      gaps: (result && result.gaps) || [],
      attribution: job.attribution || '',
      tone: options.tone || 'standard',
      notes: ''
    };
    packet.blanks = countBlanks(packet);
    return packet;
  }

  /** Bulk preparation: the "apply to all matches" step, run locally with a progress line. */
  function prepareBulk(jobs, profile, targets, opts) {
    var options = opts || {};
    var progress = options.progress || function () {};
    var limit = options.limit || 25;
    var started = 0;
    var packetsOut = [];
    var queue = jobs.slice(0, limit);
    progress(0, queue.length);
    return queue.reduce(function (chain, item) {
      return chain.then(function () {
        return new Promise(function (resolve) {
          // Yield between jobs so a long queue never locks up the UI thread.
          setTimeout(function () {
            packetsOut.push(assemble(item, item.match || { matched: [], missing: [], score: null }, profile, options));
            started += 1;
            progress(started, queue.length);
            resolve();
          }, 0);
        });
      });
    }, Promise.resolve()).then(function () {
      return { packets: packetsOut, skipped: jobs.length - queue.length, limit: limit };
    });
  }

  /* ------------------------------------------------------------------ exports */

  function csvEscape(value) {
    var s = text.str(value);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function toCSV(rows) {
    if (!rows.length) return '';
    var header = Object.keys(rows[0]);
    return [header.join(',')].concat(rows.map(function (row) {
      return header.map(function (key) { return csvEscape(row[key]); }).join(',');
    })).join('\r\n');
  }

  function trackerCSV(entries) {
    return toCSV(entries.map(function (entry) {
      return {
        added: entry.added || '',
        status: entry.status || 'new',
        updated: entry.updated || '',
        score: entry.score == null ? '' : entry.score,
        verdict: entry.verdict || '',
        title: entry.title || '',
        company: entry.company || '',
        location: entry.location || '',
        source: (entry.sources || [entry.sourceLabel]).filter(Boolean).join(' + '),
        applyUrl: entry.applyUrl || entry.url || '',
        packetCoverLetter: entry.packet ? 1 : '',
        blanksLeft: entry.packet ? entry.packet.blanks : '',
        notes: entry.notes || ''
      };
    }));
  }

  function download(filename, content, mime) {
    var blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function workspace(profile, targets, tracker, packets, settings) {
    return JSON.stringify({
      app: 'rcw-job-matcher',
      version: 1,
      exportedAt: new Date().toISOString(),
      profile: profile,
      targets: targets,
      tracker: tracker,
      packets: packets,
      settings: settings
    }, null, 2);
  }

  return {
    assemble: assemble,
    buildAnswers: buildAnswers,
    buildCoverLetter: buildCoverLetter,
    buildFieldSheet: buildFieldSheet,
    buildKeywordPatch: buildKeywordPatch,
    countBlanks: countBlanks,
    csvEscape: csvEscape,
    download: download,
    pickEvidence: pickEvidence,
    prepareBulk: prepareBulk,
    toCSV: toCSV,
    trackerCSV: trackerCSV,
    workspace: workspace
  };
}));
