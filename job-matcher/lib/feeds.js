/* RCW Job Matcher - job sources.
 *
 * Design rules, in order of how much they cost to break:
 *   1. Only public, documented APIs that allow browser (CORS) calls. No login walls,
 *      no scraping of portals that forbid it in their terms.
 *   2. Respect each source's published etiquette. Remotive's API terms ask for a link
 *      back to the listing, attribution of the source, and at most a few fetches per
 *      day — so this file stamps attribution on every job and the app enforces a
 *      minimum interval between live refreshes per source.
 *   3. Fail soft: one dead source must never blank the board. Each source reports its
 *      own status, and cached results survive a failed refresh.
 *
 * Browser: window.RCWJM.feeds   Node (tests): module.exports
 */
(function (root, factory) {
  'use strict';
  var deps = typeof module === 'object' && module && module.exports
    ? { text: require('./text.js') }
    : { text: root.RCWJM.text };
  if (typeof module === 'object' && module && module.exports) module.exports = factory(deps.text);
  else { root.RCWJM = root.RCWJM || {}; root.RCWJM.feeds = factory(deps.text); }
}(typeof self !== 'undefined' ? self : this, function (text) {
  'use strict';

  var SITE = 'https://www.rcwittraining.in';

  function base(job) {
    return {
      id: job.id || '',
      title: text.truncate(text.normalize(job.title), 140),
      company: text.normalize(job.company),
      location: text.normalize(job.location),
      url: job.url || job.applyUrl || '',
      applyUrl: job.applyUrl || job.url || '',
      description: text.str(job.description).slice(0, 20000),
      tags: Array.isArray(job.tags) ? job.tags.filter(Boolean).map(String).slice(0, 40) : [],
      posted: job.posted || '',
      salary: text.truncate(text.str(job.salary), 80),
      employmentType: job.employmentType || '',
      remote: job.remote,
      recruiterEmail: job.recruiterEmail || '',
      source: job.source,
      sourceLabel: job.sourceLabel,
      sourceUrl: job.sourceUrl || '',
      attribution: job.attribution || ''
    };
  }

  function withId(job) {
    var j = base(job);
    j.id = j.id || (j.source + ':' + text.hash((j.title + '|' + j.company + '|' + (j.url || j.location)).toLowerCase()));
    return j;
  }

  function emailFrom(textBlob) {
    var m = String(textBlob || '').match(/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/);
    return m ? m[0] : '';
  }

  /* ------------------------------------------------------------------ sources */

  var SOURCES = {
    remotive: {
      id: 'remotive',
      label: 'Remotive (remote, tech + ops)',
      about: 'Public JSON API of curated remote roles.',
      attribution: 'Listings via Remotive',
      attributionUrl: 'https://remotive.com/',
      needsKey: false,
      onByDefault: true,
      // Remotive asks for a few calls a day at most; the app enforces this interval.
      minIntervalMinutes: 360,
      cacheHours: 6,
      build: function (p) {
        var url = new URL('https://remotive.com/api/remote-jobs');
        url.searchParams.set('limit', '200');
        if (p.query) url.searchParams.set('search_term', p.query);
        if (p.category) url.searchParams.set('category', p.category);
        else url.searchParams.set('category', 'devops');
        return url.toString();
      },
      parse: function (json, p) {
        var rows = Array.isArray(json && json.jobs) ? json.jobs : [];
        return rows.map(function (row) {
          return withId({
            id: 'remotive:' + row.id,
            title: row.title,
            company: row.company_name,
            location: row.candidate_required_location || 'Remote',
            url: row.url,
            applyUrl: row.url,
            description: row.description,
            tags: row.tags,
            posted: row.publication_date,
            salary: row.salary,
            employmentType: row.job_type,
            remote: true,
            recruiterEmail: emailFrom(row.description),
            source: 'remotive',
            sourceLabel: 'Remotive',
            attribution: 'Remotive'
          });
        });
      }
    },

    arbeitnow: {
      id: 'arbeitnow',
      label: 'Arbeitnow (Europe + remote, ATS-sourced)',
      about: 'Aggregates direct-from-ATS postings (Greenhouse, SmartRecruiters, Teamtailor…). No key required.',
      attribution: 'Listings via Arbeitnow',
      attributionUrl: 'https://www.arbeitnow.com/',
      needsKey: false,
      onByDefault: true,
      minIntervalMinutes: 60,
      cacheHours: 6,
      build: function (p) {
        var url = new URL('https://www.arbeitnow.com/api/job-board/api/v1/jobs');
        url.searchParams.set('limit', '100');
        if (p.query) url.searchParams.set('query', p.query);
        return url.toString();
      },
      parse: function (json) {
        var rows = Array.isArray(json && json.data) ? json.data : (Array.isArray(json) ? json : []);
        return rows.map(function (row) {
          return withId({
            id: 'arbeitnow:' + row.id,
            title: row.title,
            company: row.company_name,
            location: [row.location, row.remote ? 'Remote' : ''].filter(Boolean).join(' · '),
            url: row.url,
            applyUrl: row.apply_url || row.url,
            description: row.description,
            tags: row.tags,
            posted: row.published_on ? new Date(Number(row.published_on) * 1000).toISOString() : '',
            salary: row.salary || '',
            employmentType: row.type || '',
            remote: !!row.remote,
            source: 'arbeitnow',
            sourceLabel: 'Arbeitnow',
            attribution: 'Arbeitnow'
          });
        });
      }
    },

    remoteok: {
      id: 'remoteok',
      label: 'RemoteOK (remote board)',
      about: 'Public community board, JSON feed.',
      attribution: 'Listings via RemoteOK',
      attributionUrl: 'https://remoteok.com/',
      needsKey: false,
      onByDefault: false,
      minIntervalMinutes: 60,
      cacheHours: 6,
      build: function (p) {
        var url = new URL('https://remoteok.com/api');
        if (p.query) url.searchParams.set('tag', p.query.split(/\s+/)[0]);
        return url.toString();
      },
      parse: function (json) {
        var rows = Array.isArray(json) ? json.filter(function (r) { return r && r.position; }) : [];
        return rows.map(function (row) {
          return withId({
            id: 'remoteok:' + row.id,
            title: row.position,
            company: row.company || row.organization || 'RemoteOK listing',
            location: row.location || 'Remote',
            url: 'https://remoteok.com/remote-jobs/' + row.id,
            applyUrl: row.url || 'https://remoteok.com/remote-jobs/' + row.id,
            description: row.description || row.one_line_job || '',
            tags: row.tags,
            posted: row.date,
            salary: row.salary_min ? '$' + Number(row.salary_min).toLocaleString() + ' - $' + Number(row.salary_max || row.salary_min).toLocaleString() : '',
            remote: true,
            recruiterEmail: emailFrom(row.description),
            source: 'remoteok',
            sourceLabel: 'RemoteOK',
            attribution: 'RemoteOK'
          });
        });
      }
    },

    muse: {
      id: 'muse',
      label: 'The Muse (public API)',
      about: 'Company-led postings with a public, key-free page API.',
      attribution: 'Listings via The Muse',
      attributionUrl: 'https://www.themuse.com/',
      needsKey: false,
      onByDefault: false,
      minIntervalMinutes: 60,
      cacheHours: 12,
      build: function (p) {
        var url = new URL('https://www.themuse.com/api/public/jobs');
        url.searchParams.set('page', String(p.page || 1));
        if (p.query) url.searchParams.set('q', p.query);
        return url.toString();
      },
      parse: function (json) {
        var rows = Array.isArray(json && json.page) ? json.page.results : [];
        return rows.map(function (row) {
          return withId({
            id: 'muse:' + row.id,
            title: row.name,
            company: row.company && row.company.name,
            location: row.locations && row.locations.length ? row.locations.map(function (l) { return l.name; }).join(', ') : (row.work_remote ? 'Remote' : ''),
            url: 'https://www.themuse.com' + (row.refs && row.refs.landing_page ? row.refs.landing_page : '/jobs'),
            applyUrl: row.refs && row.refs.apply_url ? row.refs.apply_url : '',
            description: (row.contents || '') + '\n' + (row.categories && row.categories.experience ? 'Experience: ' + row.categories.experience : ''),
            tags: row.categories && row.categories.type ? [row.categories.type] : [],
            posted: row.published_date,
            remote: !!row.work_remote,
            source: 'muse',
            sourceLabel: 'The Muse',
            attribution: 'The Muse'
          });
        });
      }
    },

    greenhouse: {
      id: 'greenhouse',
      label: 'Greenhouse boards (by company token)',
      about: 'Official public board API. Add company career-page tokens, e.g. "stripe, gitlab, datadog, cloudflare".',
      attribution: 'Listings from the company’s Greenhouse board',
      needsKey: false,
      needsCompanies: true,
      companyHelp: 'Token = the word in https://boards.greenhouse.io/<token> or the ?for= in a careers page link.',
      onByDefault: true,
      minIntervalMinutes: 30,
      cacheHours: 3,
      build: function (p, company) {
        return 'https://boards-api.greenhouse.io/v1/boards/' + encodeURIComponent(company) + '/jobs?content=true';
      },
      parse: function (json, p, company) {
        var rows = Array.isArray(json && json.jobs) ? json.jobs : [];
        return rows.map(function (row) {
          return withId({
            id: 'greenhouse:' + company + ':' + row.id,
            title: row.title,
            company: row.company_name || company,
            location: row.location && row.location.name ? row.location.name : '',
            url: row.absolute_url,
            applyUrl: row.absolute_url ? row.absolute_url + '?utm_source=rcw-job-matcher' : '',
            description: text.stripHtml(row.content || '').slice(0, 8000),
            tags: [],
            posted: row.updated_at || row.first_published,
            remote: /remote/i.test(row.location && row.location.name || ''),
            source: 'greenhouse',
            sourceLabel: 'Greenhouse · ' + company,
            attribution: company + ' careers'
          });
        });
      }
    },

    lever: {
      id: 'lever',
      label: 'Lever boards (by company)',
      about: 'Official postings API, no key. Add company slugs, e.g. "netflix, plausible, mistral".',
      attribution: 'Listings from the company’s Lever board',
      needsKey: false,
      needsCompanies: true,
      companyHelp: 'Slug = the word in https://jobs.lever.co/<slug>.',
      onByDefault: false,
      minIntervalMinutes: 30,
      cacheHours: 3,
      build: function (p, company) {
        return 'https://api.lever.co/v0/postings/' + encodeURIComponent(company) + '?mode=json&limit=100';
      },
      parse: function (json, p, company) {
        var rows = Array.isArray(json) ? json : [];
        return rows.map(function (row) {
          var categories = row.categories || {};
          return withId({
            id: 'lever:' + company + ':' + row.id,
            title: row.text,
            company: categories.company || company,
            location: [categories.location, categories.allLocations ? categories.allLocations.join(', ') : ''].filter(Boolean).join(' · '),
            url: row.hostedUrl,
            applyUrl: row.applyUrl || row.hostedUrl,
            description: text.stripHtml(row.descriptionPlain || row.description || ''),
            tags: categories.commitment ? [categories.commitment] : [],
            posted: row.createdAt ? new Date(row.createdAt).toISOString() : '',
            employmentType: categories.commitment || '',
            remote: /remote/i.test((categories.allLocations || []).join(' ') + ' ' + (categories.location || '')),
            source: 'lever',
            sourceLabel: 'Lever · ' + company,
            attribution: company + ' careers'
          });
        });
      }
    },

    smartrecruiters: {
      id: 'smartrecruiters',
      label: 'SmartRecruiters boards (by company)',
      about: 'Public postings API used by many European/US employers.',
      attribution: 'Listings from the company’s SmartRecruiters board',
      needsKey: false,
      needsCompanies: true,
      companyHelp: 'Identifier = the word in https://jobs.smartrecruiters.com/<company>/',
      onByDefault: false,
      minIntervalMinutes: 30,
      cacheHours: 3,
      build: function (p, company) {
        return 'https://api.smartrecruiters.com/v1/companies/' + encodeURIComponent(company) + '/postings';
      },
      parse: function (json, p, company) {
        var rows = Array.isArray(json && json.content) ? json.content : [];
        return rows.map(function (row) {
          var loc = row.location || {};
          return withId({
            id: 'smartrecruiters:' + company + ':' + row.id,
            title: row.name,
            company: (row.organization && row.organization.name) || company,
            location: [loc.city, loc.country].filter(Boolean).join(', '),
            url: row.refId ? 'https://jobs.smartrecruiters.com/' + company + '/' + row.refId : '',
            applyUrl: row.refId ? 'https://jobs.smartrecruiters.com/' + company + '/' + row.refId : '',
            description: text.stripHtml((row.jobAd && row.jobAd.sections ? Object.keys(row.jobAd.sections).map(function (k) { return row.jobAd.sections[k].text; }).join('\n') : '') || ''),
            tags: row.typeOfEmployment ? [row.typeOfEmployment.label] : [],
            posted: row.releaseDate,
            employmentType: row.typeOfEmployment && row.typeOfEmployment.label ? row.typeOfEmployment.label : '',
            remote: !!loc.remote,
            source: 'smartrecruiters',
            sourceLabel: 'SmartRecruiters · ' + company,
            attribution: company + ' careers'
          });
        });
      }
    },

    hnhiring: {
      id: 'hnhiring',
      label: 'Hacker News “Who is hiring” (comments)',
      about: 'Searches the monthly thread’s comments through Algolia. Noisy but often direct-to-hiring-manager; the query is used as the search term.',
      attribution: 'Comment postings via Hacker News (Algolia)',
      attributionUrl: 'https://hn.algolia.com/',
      needsKey: false,
      onByDefault: false,
      minIntervalMinutes: 30,
      cacheHours: 6,
      build: function (p) {
        var url = new URL('https://hn.algolia.com/api/v1/search');
        url.searchParams.set('tags', 'comment');
        url.searchParams.set('hitsPerPage', '50');
        var since = Math.floor((Date.now() - 45 * 86400000) / 1000);
        url.searchParams.set('numericFilters', 'created_at_i>' + since);
        url.searchParams.set('query', (p.query || 'infrastructure engineer') + ' hiring');
        return url.toString();
      },
      parse: function (json) {
        var rows = Array.isArray(json && json.hits) ? json.hits : [];
        return rows.map(function (row) {
          var body = text.normalize(row.comment_text || '').replace(/<[^>]*>/g, ' ');
          if (body.length < 60) return null;
          var companyLine = body.split(/\n/)[0].slice(0, 120);
          return withId({
            id: 'hnhiring:' + row.objectID,
            title: 'HN hiring comment — ' + text.truncate(companyLine, 70),
            company: (body.match(/^\s*([A-Z][A-Za-z0-9 .,&'-]{2,34})\s*[|]/) || [])[1] || 'via Hacker News',
            location: (body.match(/Remote|Europe|US|India|Bengaluru|London|Germany/i) || [''])[0],
            url: 'https://news.ycombinator.com/item?id=' + row.objectID,
            applyUrl: (body.match(/https?:\/\/\S+/g) || [])[0] || 'https://news.ycombinator.com/item?id=' + row.objectID,
            description: body.slice(0, 3000),
            tags: [],
            posted: row.created_at,
            recruiterEmail: emailFrom(body),
            source: 'hnhiring',
            sourceLabel: 'Hacker News',
            attribution: 'Hacker News'
          });
        }).filter(Boolean);
      }
    },

    adzuna: {
      id: 'adzuna',
      label: 'Adzuna search (needs your free API key)',
      about: 'Aggregated board search incl. India. Free app_id/app_key from developer.adzuna.com. Browser calls are usually allowed, but Adzuna does not document CORS — if it fails, the app reports it and moves on.',
      attribution: 'Search results via Adzuna',
      attributionUrl: 'https://www.adzuna.in/',
      needsKey: true,
      requiredKeys: ['adzuna_id', 'adzuna_key'],
      keyHelp: 'Create a free developer account → app_id + app_key. Keys stay in this browser only.',
      onByDefault: false,
      minIntervalMinutes: 15,
      cacheHours: 3,
      build: function (p, company, keys) {
        var url = new URL('https://api.adzuna.com/v1/api/jobs/' + (keys.country || 'in') + '/search/1');
        url.searchParams.set('app_id', keys.app_id || '');
        url.searchParams.set('app_key', keys.app_key || '');
        url.searchParams.set('what', p.query || 'linux administrator');
        url.searchParams.set('results_per_page', '40');
        url.searchParams.set('max_days_old', '28');
        url.searchParams.set('content-type', 'application/json');
        if (p.salaryMin) url.searchParams.set('salary_min', String(p.salaryMin * 100000));
        return url.toString();
      },
      parse: function (json) {
        var rows = Array.isArray(json && json.results) ? json.results : [];
        return rows.map(function (row) {
          return withId({
            id: 'adzuna:' + row.id,
            title: row.title,
            company: row.company && row.company.display_name,
            location: [row.location && row.location.display_name].filter(Boolean).join(', '),
            url: row.redirect_url,
            applyUrl: row.redirect_url,
            description: text.stripHtml(row.description || ''),
            tags: row.category && row.category.tag ? [row.category.tag] : [],
            posted: row.created,
            salary: row.salary_min ? row.currency + ' ' + Number(row.salary_min).toLocaleString() + ' - ' + Number(row.salary_max || row.salary_min).toLocaleString() : '',
            source: 'adzuna',
            sourceLabel: 'Adzuna',
            attribution: 'Adzuna'
          });
        });
      }
    },

    jsearch: {
      id: 'jsearch',
      label: 'JSearch aggregate (needs RapidAPI key)',
      about: 'Aggregates Google-Jobs-style results (LinkedIn, Indeed, Glassdoor, ZipRecruiter…). Free RapidAPI plan. Keys stay in this browser only.',
      attribution: 'Aggregated results via JSearch (RapidAPI)',
      needsKey: true,
      requiredKeys: ['rapidapi_key'],
      keyHelp: 'rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch → subscribe to the free plan, copy the X-RapidAPI-Key.',
      onByDefault: false,
      minIntervalMinutes: 15,
      cacheHours: 3,
      build: function (p, company, keys) {
        var url = new URL('https://jsearch.p.rapidapi.com/search');
        url.searchParams.set('query', (p.query || 'Linux Administrator') + ' in ' + (keys.location || 'India'));
        url.searchParams.set('page', '1');
        url.searchParams.set('num_pages', '1');
        url.searchParams.set('date_posted', keys.datePosted || 'week');
        url.searchParams.set('remote_jobs_only', keys.remoteOnly ? 'true' : 'false');
        url.searchParams.set('employment_types', 'FULLTIME');
        url.searchParams.set('limit', '30');
        return url.toString();
      },
      headers: function (keys) {
        return { 'X-RapidAPI-Key': keys.rapidapi_key || '', 'X-RapidAPI-Host': 'jsearch.p.rapidapi.com' };
      },
      parse: function (json) {
        var rows = Array.isArray(json && json.data) ? json.data : [];
        return rows.map(function (row) {
          return withId({
            id: 'jsearch:' + row.id,
            title: row.job_title,
            company: row.employer_name,
            location: [row.job_city, row.job_country].filter(Boolean).join(', '),
            url: row.job_apply_link || row.job_apply_url || '',
            applyUrl: row.job_apply_link || row.job_apply_url || '',
            description: text.stripHtml(row.job_description || ''),
            tags: (row.job_required_education && row.job_required_education.degree || '') ? [row.job_required_education.degree] : [],
            posted: row.job_posted_at_datetime_utc,
            salary: row.job_min_salary ? row.job_salary_currency + ' ' + row.job_min_salary : '',
            employmentType: row.job_employment_type || '',
            remote: row.job_is_remote === 1 || row.job_is_remote === true,
            source: 'jsearch',
            sourceLabel: 'JSearch',
            attribution: 'JSearch'
          });
        });
      }
    }
  };

  function list() {
    return Object.keys(SOURCES).map(function (key) { return SOURCES[key]; });
  }

  function get(id) {
    return SOURCES[id] || null;
  }

  function fetchWithTimeout(url, options, ms) {
    var opts = options || {};
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = null;
    var config = Object.assign({
      redirect: 'follow',
      headers: Object.assign({ Accept: 'application/json,text/plain,*/*' }, opts.headers || {})
    }, opts);
    if (controller) {
      config.signal = controller.signal;
      timer = setTimeout(function () { try { controller.abort(); } catch (e) {} }, ms || 15000);
    }
    return fetch(url, config).then(function (response) {
      if (timer) clearTimeout(timer);
      if (!response.ok) throw new Error('HTTP ' + response.status + ' ' + response.statusText);
      return response.text();
    }).then(function (body) {
      try { return JSON.parse(body); }
      catch (e) { throw new Error('The source returned something that is not JSON (blocked, rate-limited, or a login page).'); }
    });
  }

  /**
   * Run one source. `context` = {query, category, page, companies, keys, fetch}.
   * Returns { sourceId, ok, count, jobs, error, requested }.
   */
  function runSource(sourceId, context) {
    var source = SOURCES[sourceId];
    if (!source) return Promise.resolve({ sourceId: sourceId, ok: false, count: 0, jobs: [], error: 'Unknown source' });
    var fetcher = context.fetch || function (url, opts) { return fetchWithTimeout(url, opts, 15000); };
    if (source.needsKey) {
      var missingKeys = (source.requiredKeys || []).filter(function (name) { return !(context.keys || {})[name]; });
      if (missingKeys.length) {
        return Promise.resolve({
          sourceId: sourceId, ok: false, skipped: true, count: 0, jobs: [],
          error: 'Needs an API key (' + missingKeys.join(', ') + ') — add one in Sources, or leave this source off.'
        });
      }
    }
    var companies = source.needsCompanies ? (context.companies || []) : [null];
    if (source.needsCompanies && !companies.length) {
      return Promise.resolve({ sourceId: sourceId, ok: false, skipped: true, count: 0, jobs: [], error: 'Add at least one company/board slug.' });
    }
    var results = [];
    var errors = [];
    return companies.reduce(function (chain, company) {
      var url;
      try { url = source.build(context, company, context.keys || {}); }
      catch (e) { errors.push(e.message); return chain; }
      return chain.then(function () {
        return fetcher(url, { headers: source.headers ? source.headers(context.keys || {}) : {} })
          .then(function (json) { results = results.concat(source.parse(json, context, company) || []); })
          .catch(function (error) { errors.push((company ? company + ': ' : '') + (error.message || String(error))); });
      });
    }, Promise.resolve()).then(function () {
      var jobs = results.map(function (job) {
        return Object.assign({}, job, {
          attribution: job.attribution || source.attribution,
          sourceUrl: source.attributionUrl || (source.id === 'greenhouse' ? 'https://boards.greenhouse.io/' + encodeURIComponent(job.company) : SITE)
        });
      });
      return {
        sourceId: sourceId,
        ok: jobs.length > 0 || !errors.length,
        count: jobs.length,
        jobs: jobs,
        error: jobs.length ? (errors.length ? errors.slice(0, 2).join('; ') + ' (partial result)' : '') : errors.slice(0, 2).join('; ') || 'No listings returned',
        requested: companies.length
      };
    });
  }

  /**
   * Fetch several sources with bounded concurrency.
   * progress(sourceId, state) is called so the UI can show per-source chips.
   */
  function fetchAll(sourceIds, context, options) {
    var opts = options || {};
    var concurrency = opts.concurrency || 3;
    var results = [];
    var queue = sourceIds.slice();
    function worker() {
      if (!queue.length) return Promise.resolve();
      var id = queue.shift();
      if (opts.progress) opts.progress(id, 'loading');
      return runSource(id, context).then(function (result) {
        results.push(result);
        if (opts.progress) opts.progress(id, result.jobs.length ? 'done' : (result.skipped ? 'skipped' : 'error'), result);
      }).catch(function (error) {
        results.push({ sourceId: id, ok: false, count: 0, jobs: [], error: error.message || 'Network error' });
        if (opts.progress) opts.progress(id, 'error', { error: error.message });
      }).then(worker);
    }
    var workers = [];
    for (var i = 0; i < Math.max(1, Math.min(concurrency, sourceIds.length)); i += 1) workers.push(worker());
    return Promise.all(workers).then(function () { return results; });
  }

  /** Import jobs from the visitor's own paste (JSON array, CSV/TSV, or free text blocks). */
  function parseImport(raw, format) {
    var source = text.str(raw);
    var kind = format || 'auto';
    if (kind === 'auto') {
      if (/^\s*[\[{]/.test(source)) kind = 'json';
      else if (/^title[,\t]/i.test(source.trim())) kind = 'csv';
      else kind = 'text';
    }
    if (kind === 'json') {
      var data = null;
      try { data = JSON.parse(source); } catch (e) { return { jobs: [], error: 'That is not valid JSON: ' + e.message }; }
      var rows = Array.isArray(data) ? data : (Array.isArray(data.jobs) ? data.jobs : []);
      return { jobs: rows.map(function (row) {
        return withId({
          id: 'import:' + (row.id || text.hash(String(row.title || '') + row.company + row.url)),
          title: row.title, company: row.company || 'Imported listing', location: row.location || '',
          url: row.url || row.applyUrl || '', applyUrl: row.applyUrl || row.url || '',
          description: row.description || '', tags: row.tags || [], posted: row.posted || row.date || '',
          salary: row.salary || '', remote: row.remote, recruiterEmail: row.recruiterEmail || '',
          source: 'import', sourceLabel: 'Your import', attribution: 'Imported by you'
        });
      }) };
    }
    if (kind === 'csv') {
      var lines = source.replace(/\r/g, '').split('\n').filter(Boolean);
      if (lines.length < 2) return { jobs: [], error: 'Need a header row plus at least one data row.' };
      var header = splitCsv(lines[0]).map(function (h) { return h.trim().toLowerCase(); });
      var out = lines.slice(1).map(function (line) {
        var cells = splitCsv(line);
        var row = {};
        header.forEach(function (key, index) { row[key] = (cells[index] || '').trim(); });
        return withId({
          id: 'import:' + text.hash(row.title + row.company + (row.url || row.apply || row.link)),
          title: row.title || row.role,
          company: row.company || row.employer || 'Imported listing',
          location: row.location || row.city || '',
          url: row.url || row.apply || row.link || '',
          applyUrl: row.apply || row.url || row.link || '',
          description: row.description || row.requirements || '',
          salary: row.salary || row.ctc || '',
          posted: row.posted || row.date || '',
          remote: /^(yes|true|remote|1)$/i.test(row.remote || ''),
          source: 'import', sourceLabel: 'Your import', attribution: 'Imported by you'
        });
      });
      return { jobs: out };
    }
    // Free text: one block per job separated by blank lines; heuristics pull the fields.
    var blocks = source.replace(/\r/g, '').split(/\n{2,}/).map(function (b) { return b.trim(); }).filter(function (b) { return b.length > 12; });
    var jobs = blocks.map(function (block, index) {
      var lines = block.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
      var urlMatch = block.match(/https?:\/\/\S+/);
      var salaryMatch = block.match(/(?:₹|rs\.?|inr|\$)\s?[\d.,]+[^.,\n]*/i);
      return withId({
        id: 'import:text' + index + ':' + text.hash(block.slice(0, 160)),
        title: lines[0] || 'Imported listing',
        company: (lines[1] || '').replace(/^(at|company)\s*[:\-]?\s*/i, '') || 'Imported listing',
        location: (block.match(/(?:location|based)\s*[:\-]\s*([^\n]{3,40})/i) || [])[1] || (lines[2] || '').slice(0, 40),
        url: urlMatch ? urlMatch[0] : '',
        applyUrl: urlMatch ? urlMatch[0] : '',
        description: block,
        salary: salaryMatch ? salaryMatch[0] : '',
        recruiterEmail: emailFrom(block),
        source: 'import', sourceLabel: 'Your paste', attribution: 'Pasted by you'
      });
    });
    return { jobs: jobs };
  }

  function splitCsv(line) {
    var out = [], cell = '', quoted = false;
    for (var i = 0; i < line.length; i += 1) {
      var ch = line[i];
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') { cell += '"'; i += 1; }
        else if (ch === '"') quoted = false;
        else cell += ch;
        continue;
      }
      if (ch === '"') { quoted = true; continue; }
      if (ch === ',') { out.push(cell); cell = ''; continue; }
      if (ch === '\t') { out.push(cell); cell = ''; continue; }
      cell += ch;
    }
    out.push(cell);
    return out;
  }

  /** Build the boolean-ish search terms a source should use for this profile. */
  function buildQueries(profile, targets) {
    var baseTerms = [];
    if (targets.keywords && targets.keywords.length) baseTerms = targets.keywords.slice();
    else if (profile.headline) baseTerms = [profile.headline.replace(/[^A-Za-z0-9+#/\- ]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 4).join(' ')];
    if (!baseTerms.length) baseTerms = ['linux administrator', 'infrastructure engineer', 'cloud engineer'];
    var topSkills = (profile.skills || []).slice(0, 6).map(function (s) { return s.name; });
    return { primary: baseTerms.slice(0, 3), skills: topSkills };
  }

  return {
    buildQueries: buildQueries,
    fetchAll: fetchAll,
    fetchWithTimeout: fetchWithTimeout,
    get: get,
    list: list,
    parseImport: parseImport,
    runSource: runSource
  };
}));
