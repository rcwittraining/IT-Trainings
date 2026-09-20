/* ============================================================
   RCW IT Training — HR Interview & Assessment Portal Simulator
   Azure Portal-style UI · fully client-side (GitHub Pages safe)
   - Data:   localStorage (rcw_hr_sim_db)
   - Videos: IndexedDB   (rcw_hr_sim_videos)
   - Compliance: SHA-256 hashed passwords, consent gate before
     recording, immutable audit trail, session expiry (30 min),
     right-to-erasure, data export (DPDP Act 2023 / GDPR aligned)
   ============================================================ */
(function () {
'use strict';

var DB_KEY = 'rcw_hr_sim_db_v1';
var SESSION_KEY = 'rcw_hr_sim_session';
var SESSION_TTL = 30 * 60 * 1000; // 30 min sliding expiry
var app = document.getElementById('app');
var db = null;
var ME = null;

/* ---------------- crypto helpers ---------------- */
function sha256(text) {
  var data = new TextEncoder().encode(text);
  return crypto.subtle.digest('SHA-256', data).then(function (buf) {
    return Array.prototype.map.call(new Uint8Array(buf), function (b) {
      return ('0' + b.toString(16)).slice(-2);
    }).join('');
  });
}
function hashPw(pw, salt) { return sha256(salt + '::' + pw); }
function uid(p) {
  var a = new Uint8Array(6); crypto.getRandomValues(a);
  return p + '-' + Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
}

/* ---------------- IndexedDB for videos ---------------- */
var idb = null;
function openIDB() {
  return new Promise(function (res, rej) {
    if (idb) return res(idb);
    var rq = indexedDB.open('rcw_hr_sim_videos', 1);
    rq.onupgradeneeded = function () { rq.result.createObjectStore('videos'); };
    rq.onsuccess = function () { idb = rq.result; res(idb); };
    rq.onerror = function () { rej(rq.error); };
  });
}
function idbPut(key, blob) {
  return openIDB().then(function (d) {
    return new Promise(function (res, rej) {
      var tx = d.transaction('videos', 'readwrite');
      tx.objectStore('videos').put(blob, key);
      tx.oncomplete = res; tx.onerror = function () { rej(tx.error); };
    });
  });
}
function idbGet(key) {
  return openIDB().then(function (d) {
    return new Promise(function (res, rej) {
      var rq = d.transaction('videos').objectStore('videos').get(key);
      rq.onsuccess = function () { res(rq.result); };
      rq.onerror = function () { rej(rq.error); };
    });
  });
}
function idbDel(key) {
  return openIDB().then(function (d) {
    return new Promise(function (res) {
      var tx = d.transaction('videos', 'readwrite');
      tx.objectStore('videos').delete(key);
      tx.oncomplete = res; tx.onerror = res;
    });
  });
}

/* ---------------- datastore ---------------- */
function seedDB() {
  return {
    users: [
      { id: 'u-hr1', role: 'hr', name: 'Priya Raman (HR)', username: 'hr', salt: 's1', pwHash: null, pwPlainSeed: 'hr123' },
      { id: 'u-c1', role: 'candidate', name: 'Arun Kumar', username: 'arun', salt: 's2', pwHash: null, pwPlainSeed: 'pass123' },
      { id: 'u-c2', role: 'candidate', name: 'Divya Shankar', username: 'divya', salt: 's3', pwHash: null, pwPlainSeed: 'pass123' },
      { id: 'u-c3', role: 'candidate', name: 'Karthik Raja', username: 'karthik', salt: 's4', pwHash: null, pwPlainSeed: 'pass123' },
      { id: 'u-c4', role: 'candidate', name: 'Meera Nair', username: 'meera', salt: 's5', pwHash: null, pwPlainSeed: 'pass123' }
    ],
    gdSessions: [{
      id: 'gd-1',
      topic: 'Is AI a threat or an opportunity for the Indian IT workforce?',
      description: 'Discuss both sides. Each participant should record a 1-3 minute contribution.',
      durationMins: 3, status: 'open', createdAt: Date.now() - 86400000,
      participants: ['u-c1', 'u-c2', 'u-c3', 'u-c4']
    }],
    recordings: [],
    gdRatings: [],
    scenarios: [
      { id: 'sc-1', active: true, category: 'Conflict Management', title: 'Team conflict before a release',
        prompt: 'Two senior members of your team disagree strongly on the deployment approach one day before a critical release. As the lead, how do you handle the situation? Explain your steps and reasoning.', timeLimitMins: 10 },
      { id: 'sc-2', active: true, category: 'Client Handling', title: 'Angry client on a missed deadline',
        prompt: 'A key client calls, upset that a promised feature slipped by two weeks. Draft how you would respond on the call and what corrective plan you would propose.', timeLimitMins: 10 },
      { id: 'sc-3', active: true, category: 'Ethics', title: 'Colleague inflating status reports',
        prompt: 'You notice a colleague reporting tasks as complete which are not. It is affecting sprint planning. What would you do and why?', timeLimitMins: 8 },
      { id: 'sc-4', active: false, category: 'Prioritisation', title: 'Production outage vs. demo prep',
        prompt: 'A production outage hits 30 minutes before you are due to demo to a prospect. You are the only engineer available. Walk through your decision-making.', timeLimitMins: 8 }
    ],
    scenarioAssignments: [],
    consents: [],
    audit: []
  };
}

function saveDB() { localStorage.setItem(DB_KEY, JSON.stringify(db)); }

function loadDB() {
  try { db = JSON.parse(localStorage.getItem(DB_KEY)); } catch (e) { db = null; }
  if (!db || !db.users) db = seedDB();
  // hash seed passwords on first run
  var pending = db.users.filter(function (u) { return !u.pwHash && u.pwPlainSeed; });
  if (!pending.length) { saveDB(); return Promise.resolve(); }
  return Promise.all(pending.map(function (u) {
    return hashPw(u.pwPlainSeed, u.salt).then(function (h) { u.pwHash = h; delete u.pwPlainSeed; });
  })).then(saveDB);
}

var CONSENT_STATEMENT = 'I consent to RCW IT Training recording, storing and processing my video/audio on THIS DEVICE ONLY for the purpose of group discussion assessment practice. I understand recordings never leave my browser (stored locally via IndexedDB), are reviewed in this simulator only, and that I may erase my data at any time from the Privacy blade. This aligns with the consent principles of India\u2019s DPDP Act 2023 and GDPR Art. 6/7.';

function logAudit(action, details) {
  db.audit.push({ id: uid('log'), at: Date.now(), actorId: ME ? ME.id : null, actorName: ME ? ME.name : 'anonymous', action: action, details: details || '' });
  if (db.audit.length > 2000) db.audit = db.audit.slice(-2000);
  saveDB();
}

/* ---------------- session ---------------- */
function getSession() {
  try {
    var s = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    if (!s || s.expiresAt < Date.now()) { sessionStorage.removeItem(SESSION_KEY); return null; }
    s.expiresAt = Date.now() + SESSION_TTL;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
    return s;
  } catch (e) { return null; }
}
function setSession(userId) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId: userId, expiresAt: Date.now() + SESSION_TTL }));
}

/* ---------------- utils ---------------- */
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function fmtDate(ts) { return ts ? new Date(ts).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '\u2014'; }
function scoreCls(v) { return v == null ? '' : (v >= 7 ? 'good' : v >= 4 ? 'mid' : 'low'); }
function scoreCell(v) { return v == null ? '<span class="muted">\u2014</span>' : '<span class="score ' + scoreCls(v) + '">' + v + '</span>'; }
function toast(msg, err) {
  var t = document.createElement('div');
  t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function () { t.remove(); }, 4200);
}
function $(s, el) { return (el || document).querySelector(s); }
function $all(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
function byId(id) { return db.users.find(function (u) { return u.id === id; }); }
function candidates() { return db.users.filter(function (u) { return u.role === 'candidate'; }); }
function avgScores(scores) { var v = Object.keys(scores).map(function (k) { return scores[k]; }); return +(v.reduce(function (a, b) { return a + b; }, 0) / v.length).toFixed(2); }

var loginAttempts = {};

/* ============================================================
   LOGIN (Azure sign-in style)
   ============================================================ */
function renderLogin() {
  ME = null;
  document.title = 'Sign in \u00b7 HR Interview & Assessment Portal';
  app.innerHTML =
  '<div class="login-bg"><div class="login-card">' +
    '<div class="logo"><span class="sq"><i></i><i></i><i></i><i></i></span> RCW IT Training</div>' +
    '<h1>Sign in</h1>' +
    '<div class="muted" style="margin-bottom:6px">HR Interview &amp; Assessment Portal \u2014 practice simulator</div>' +
    '<form id="loginForm">' +
      '<label>Username <span class="req">*</span></label><input id="lu" autocomplete="username" required>' +
      '<label>Password <span class="req">*</span></label><input id="lp" type="password" autocomplete="current-password" required>' +
      '<div style="margin-top:20px;display:flex;justify-content:flex-end"><button class="az" style="min-width:110px">Sign in</button></div>' +
    '</form>' +
    '<div class="hint"><b>Demo accounts</b><br>HR portal: <b>hr / hr123</b><br>Candidates: <b>arun</b>, <b>divya</b>, <b>karthik</b>, <b>meera</b> \u2014 password <b>pass123</b></div>' +
    '<div class="login-links">Part of the <a href="https://www.rcwittraining.in/" target="_blank" rel="noopener">RCW IT Training</a> public catalogue \u00b7 Azure Mini Project</div>' +
  '</div></div>';
  $('#loginForm').onsubmit = function (e) {
    e.preventDefault();
    var un = $('#lu').value.trim(), pw = $('#lp').value;
    var rec = loginAttempts[un] || { count: 0, lockedUntil: 0 };
    if (rec.lockedUntil > Date.now()) return toast('Too many failed attempts. Try again in a few minutes.', true);
    var user = db.users.find(function (u) { return u.username === un; });
    if (!user) { failLogin(un, rec); return; }
    hashPw(pw, user.salt).then(function (h) {
      if (h !== user.pwHash) { failLogin(un, rec); return; }
      delete loginAttempts[un];
      ME = user; setSession(user.id);
      logAudit('LOGIN_SUCCESS', 'Signed in as ' + user.role);
      location.hash = ''; route();
    });
  };
}
function failLogin(un, rec) {
  rec.count += 1;
  if (rec.count >= 5) { rec.lockedUntil = Date.now() + 10 * 60 * 1000; rec.count = 0; }
  loginAttempts[un] = rec;
  db.audit.push({ id: uid('log'), at: Date.now(), actorId: null, actorName: un || 'unknown', action: 'LOGIN_FAILED', details: 'Invalid credentials' });
  saveDB();
  toast('Invalid username or password', true);
}
function logout() {
  logAudit('LOGOUT', '');
  sessionStorage.removeItem(SESSION_KEY);
  stopCamera(); ME = null; location.hash = ''; route();
}
window._logout = logout;

/* ============================================================
   AZURE SHELL — top bar + blade nav
   ============================================================ */
var NAV_HR = [
  { id: 'dashboard', ico: '\ud83d\udcca', label: 'Overview (Scoreboard)' },
  { id: 'hrgd', ico: '\ud83c\udfa5', label: 'GD Sessions & Ratings' },
  { id: 'hrscenario', ico: '\ud83e\udde9', label: 'Scenario Questions' },
  { id: 'hrcand', ico: '\ud83d\udc65', label: 'Candidates' },
  { id: 'audit', ico: '\ud83d\udcdc', label: 'Activity log' },
  { id: 'privacy', ico: '\ud83d\udd12', label: 'Privacy & Compliance' }
];
var NAV_CAND = [
  { id: 'gd', ico: '\ud83c\udfa5', label: 'Group Discussions' },
  { id: 'scenario', ico: '\ud83e\udde9', label: 'Scenario Questions' },
  { id: 'results', ico: '\ud83d\udcca', label: 'My Results' },
  { id: 'privacy', ico: '\ud83d\udd12', label: 'Privacy & My Data' }
];

var navCollapsed = false;
function shell(active, bladeTitle, bladeIcon, bladeSub, cmds, bodyHTML) {
  var nav = ME.role === 'hr' ? NAV_HR : NAV_CAND;
  var initials = ME.name.split(' ').map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase();
  document.title = bladeTitle + ' \u00b7 HR Assessment Portal';
  app.innerHTML =
  '<div class="topbar">' +
    '<div class="hamburger" id="hb">\u2630</div>' +
    '<div class="brand">RCW IT Training <span class="light">| HR Assessment Portal</span></div>' +
    '<div class="searchwrap"><input class="search" placeholder="Search resources, sessions, candidates (Ctrl+/)" id="topSearch"></div>' +
    '<div class="tb-item" title="Simulator \u2014 no real cloud resources">\u2601 Simulator</div>' +
    '<div class="tb-item" onclick="_logout()" title="Sign out">Sign out</div>' +
    '<div class="tb-item"><div class="avatar">' + esc(initials) + '</div></div>' +
  '</div>' +
  '<div class="sidenav' + (navCollapsed ? ' collapsed' : '') + '" id="sidenav">' +
    '<div class="nav-section"><div class="nav-label">' + (ME.role === 'hr' ? 'HR administration' : 'Candidate workspace') + '</div>' +
      nav.map(function (n) {
        return '<div class="nav-item' + (n.id === active ? ' active' : '') + '" data-nav="' + n.id + '"><span class="ico">' + n.ico + '</span><span>' + n.label + '</span></div>';
      }).join('') +
    '</div>' +
    '<div class="nav-section"><div class="nav-label">Signed in as</div>' +
      '<div class="nav-item"><span class="ico">\ud83d\udc64</span><span>' + esc(ME.name) + '</span></div>' +
    '</div>' +
  '</div>' +
  '<div class="main' + (navCollapsed ? ' wide' : '') + '" id="main">' +
    '<div class="breadcrumb"><a href="#" onclick="return false">Home</a> &rsaquo; ' + esc(bladeTitle) + '</div>' +
    '<div class="blade-head"><h1><span class="bicon">' + bladeIcon + '</span>' + esc(bladeTitle) + '</h1><div class="sub">' + bladeSub + '</div></div>' +
    (cmds && cmds.length ? '<div class="cmdbar">' + cmds.map(function (c, i) {
      return '<button class="cmd" data-cmd="' + i + '"><span class="ci">' + c.ico + '</span>' + esc(c.label) + '</button>';
    }).join('') + '</div>' : '') +
    '<div class="blade-body" id="blade">' + bodyHTML + '</div>' +
  '</div>';
  $('#hb').onclick = function () {
    navCollapsed = !navCollapsed;
    $('#sidenav').classList.toggle('collapsed', navCollapsed);
    $('#main').classList.toggle('wide', navCollapsed);
  };
  $all('[data-nav]').forEach(function (el) {
    el.onclick = function () { location.hash = el.getAttribute('data-nav'); };
  });
  if (cmds) $all('[data-cmd]').forEach(function (el) {
    el.onclick = function () { cmds[+el.getAttribute('data-cmd')].fn(); };
  });
}

/* ============================================================
   CONSENT MODAL (compliance gate before recording)
   ============================================================ */
function ensureConsent(purpose) {
  return new Promise(function (resolve) {
    var has = db.consents.some(function (c) { return c.userId === ME.id && c.purpose === purpose; });
    if (has) return resolve(true);
    var bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = '<div class="modal">' +
      '<div class="m-head">\ud83d\udd12 Recording consent required</div>' +
      '<div class="m-body">' +
        '<p style="margin-bottom:10px">' + esc(CONSENT_STATEMENT) + '</p>' +
        '<label style="display:flex;gap:8px;align-items:flex-start;font-weight:400;cursor:pointer"><input type="checkbox" id="ck" style="width:auto;height:auto;margin-top:3px"> I have read and freely give my consent for the purpose stated above.</label>' +
      '</div>' +
      '<div class="m-foot"><button class="az ghost" id="mNo">Decline</button><button class="az" id="mYes" disabled>Give consent &amp; continue</button></div>' +
    '</div>';
    document.body.appendChild(bg);
    $('#ck', bg).onchange = function () { $('#mYes', bg).disabled = !this.checked; };
    $('#mNo', bg).onclick = function () { bg.remove(); resolve(false); };
    $('#mYes', bg).onclick = function () {
      db.consents.push({ id: uid('cst'), userId: ME.id, purpose: purpose, statement: CONSENT_STATEMENT, givenAt: Date.now() });
      logAudit('CONSENT_GIVEN', 'Purpose: ' + purpose);
      bg.remove(); resolve(true);
    };
  });
}

/* ============================================================
   CANDIDATE — GROUP DISCUSSIONS
   ============================================================ */
var mediaStream = null, mediaRecorder = null, chunks = [], recStart = 0, recTimerInt = null;
function stopCamera() {
  if (recTimerInt) clearInterval(recTimerInt);
  if (mediaRecorder && mediaRecorder.state !== 'inactive') { try { mediaRecorder.stop(); } catch (e) {} }
  if (mediaStream) { mediaStream.getTracks().forEach(function (t) { t.stop(); }); mediaStream = null; }
}

function candGD() {
  var sessions = db.gdSessions.filter(function (s) { return s.participants.indexOf(ME.id) !== -1; });
  var html = sessions.length ? sessions.map(function (s) {
    var mine = db.recordings.filter(function (r) { return r.sessionId === s.id && r.userId === ME.id; });
    return '<div class="card">' +
      '<h3>' + esc(s.topic) + ' &nbsp;<span class="pill ' + s.status + '">' + s.status + '</span></h3>' +
      '<div class="muted">' + esc(s.description) + '</div>' +
      '<div class="muted" style="margin-top:6px">Max duration: <b>' + s.durationMins + ' min</b> \u00b7 Participants: ' +
        s.participants.map(function (p) { return esc((byId(p) || {}).name || '?'); }).join(', ') + '</div>' +
      (mine.length ? '<hr class="az"><b style="font-size:13px">Your submissions (' + mine.length + ')</b>' +
        mine.map(function (r) {
          return '<div class="flexrow" style="margin-top:8px"><span class="muted">' + fmtDate(r.createdAt) + ' \u00b7 ' + (r.sizeBytes / 1048576).toFixed(1) + ' MB \u00b7 ' + (r.durationSec || '?') + 's</span>' +
            '<button class="az small ghost" data-play="' + r.id + '">\u25b6 Play</button></div><div id="play-' + r.id + '"></div>';
        }).join('') : '') +
      (s.status === 'open' ? '<hr class="az"><button class="az" data-rec="' + s.id + '" data-dur="' + s.durationMins + '">\ud83c\udfac Record my GD contribution</button>' : '') +
      '<div id="recorder-' + s.id + '"></div>' +
    '</div>';
  }).join('') : '<div class="card muted">No group discussion sessions assigned to you yet. HR creates sessions from the HR portal.</div>';

  shell('gd', 'Group Discussions', '\ud83c\udfa5', 'Record your GD contribution on camera \u2014 HR reviews and rates it manually.', null,
    '<div class="notice blue">\u2139 Recordings are stored <b>only in your browser</b> (IndexedDB) \u2014 nothing is uploaded to any server. Camera access requires HTTPS and your permission, and an explicit consent record is captured first (DPDP/GDPR-aligned).</div>' + html);

  $all('[data-rec]').forEach(function (b) {
    b.onclick = function () {
      ensureConsent('gd-recording').then(function (ok) {
        if (ok) openRecorder(b.getAttribute('data-rec'), +b.getAttribute('data-dur'));
        else toast('Consent declined \u2014 recording unavailable. You can consent any time.', true);
      });
    };
  });
  $all('[data-play]').forEach(function (b) {
    b.onclick = function () {
      var id = b.getAttribute('data-play');
      idbGet('vid-' + id).then(function (blob) {
        if (!blob) return toast('Recording not found in this browser.', true);
        $('#play-' + id).innerHTML = '<video controls style="margin-top:8px" src="' + URL.createObjectURL(blob) + '"></video>';
      });
    };
  });
}

function openRecorder(sessionId, durationMins) {
  var box = $('#recorder-' + sessionId);
  box.innerHTML = '<hr class="az">' +
    '<video id="preview" autoplay muted playsinline></video>' +
    '<div class="recbtns">' +
      '<button class="az" id="btnStart">\u23fa Start recording</button>' +
      '<button class="az ghost" id="btnStop" disabled>\u23f9 Stop</button>' +
      '<span id="recStatus" class="muted">Camera starting\u2026</span>' +
    '</div><div id="reviewArea"></div>';
  navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: true }).then(function (stream) {
    mediaStream = stream;
    $('#preview').srcObject = stream;
    $('#recStatus').textContent = 'Camera ready. Press Start when you are set.';
  }).catch(function (err) {
    box.innerHTML = '<hr class="az"><div class="notice">\u26a0 Camera/microphone access failed: ' + esc(err.message) + '. Allow permissions and reload. Recording needs HTTPS (your site has it) and a webcam.</div>';
    return;
  });
  var mime = (window.MediaRecorder && MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) ? 'video/webm;codecs=vp9,opus'
    : (window.MediaRecorder && MediaRecorder.isTypeSupported('video/webm')) ? 'video/webm' : '';
  $('#btnStart').onclick = function () {
    if (!mediaStream) return;
    chunks = [];
    mediaRecorder = new MediaRecorder(mediaStream, mime ? { mimeType: mime } : undefined);
    mediaRecorder.ondataavailable = function (e) { if (e.data.size) chunks.push(e.data); };
    mediaRecorder.onstop = function () { showReview(sessionId); };
    mediaRecorder.start(1000);
    recStart = Date.now();
    $('#btnStart').disabled = true; $('#btnStop').disabled = false;
    var maxSec = durationMins * 60;
    recTimerInt = setInterval(function () {
      var s = Math.floor((Date.now() - recStart) / 1000);
      $('#recStatus').innerHTML = '<span class="dot"></span> Recording <span class="timer">' +
        ('0' + Math.floor(s / 60)).slice(-2) + ':' + ('0' + s % 60).slice(-2) + '</span> / ' + durationMins + ':00 max';
      if (s >= maxSec) { $('#btnStop').click(); toast('Time limit reached \u2014 recording stopped.'); }
    }, 500);
  };
  $('#btnStop').onclick = function () {
    clearInterval(recTimerInt);
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    $('#btnStart').disabled = false; $('#btnStop').disabled = true;
    $('#recStatus').textContent = 'Stopped. Review your recording below.';
  };
}

function showReview(sessionId) {
  var blob = new Blob(chunks, { type: 'video/webm' });
  var durationSec = Math.round((Date.now() - recStart) / 1000);
  var url = URL.createObjectURL(blob);
  $('#reviewArea').innerHTML = '<hr class="az"><b style="font-size:13px">Review before submitting</b>' +
    '<video src="' + url + '" controls style="margin-top:8px"></video>' +
    '<div class="recbtns">' +
      '<button class="az" id="btnSave">\u2b06 Submit recording (' + (blob.size / 1048576).toFixed(1) + ' MB, ' + durationSec + 's)</button>' +
      '<button class="az ghost" id="btnDiscard">Discard &amp; re-record</button></div>';
  $('#btnDiscard').onclick = function () { $('#reviewArea').innerHTML = ''; };
  $('#btnSave').onclick = function () {
    var btn = $('#btnSave'); btn.disabled = true; btn.textContent = 'Saving\u2026';
    var rec = { id: uid('rec'), sessionId: sessionId, userId: ME.id, sizeBytes: blob.size, durationSec: durationSec, createdAt: Date.now() };
    idbPut('vid-' + rec.id, blob).then(function () {
      db.recordings.push(rec);
      logAudit('RECORDING_SAVED', 'Session: ' + ((db.gdSessions.find(function (s) { return s.id === sessionId; }) || {}).topic || sessionId) + ' (' + (blob.size / 1048576).toFixed(1) + ' MB)');
      toast('\u2705 Recording submitted! HR will review and rate it.');
      stopCamera(); candGD();
    }).catch(function (e) { toast('Could not save video: ' + e, true); btn.disabled = false; });
  };
}

/* ============================================================
   CANDIDATE — SCENARIOS (optional & on-demand)
   ============================================================ */
var scenarioTimerInt = null;
function candScenarios() {
  var assignments = db.scenarioAssignments.filter(function (a) { return a.userId === ME.id; });
  var pending = assignments.filter(function (a) { return a.status === 'assigned'; });
  var done = assignments.filter(function (a) { return a.status !== 'assigned'; });
  var scOf = function (a) { return db.scenarios.find(function (s) { return s.id === a.scenarioId; }) || {}; };

  shell('scenario', 'Scenario Questions', '\ud83e\udde9', 'Optional, on-demand scenario-based questions. Request one anytime \u2014 or HR may assign one to you.',
    [{ ico: '\ud83c\udfb2', label: 'Request a scenario now', fn: requestScenario }],
    pending.map(function (a) {
      var sc = scOf(a);
      return '<div class="card">' +
        '<h3>' + esc(sc.title) + ' &nbsp;<span class="pill assigned">assigned</span></h3>' +
        '<div class="muted">Category: ' + esc(sc.category) + ' \u00b7 Time limit: ' + sc.timeLimitMins + ' min \u00b7 ' + (a.assignedBy === 'self' ? 'Self-requested' : 'Assigned by HR') + ' on ' + fmtDate(a.assignedAt) + '</div>' +
        '<hr class="az"><div style="line-height:1.6">' + esc(sc.prompt) + '</div>' +
        '<div class="muted" style="margin:10px 0" id="timer-' + a.id + '"></div>' +
        '<textarea id="ans-' + a.id + '" placeholder="Type your structured answer\u2026 (situation analysis \u2192 options \u2192 decision \u2192 justification)"></textarea>' +
        '<div style="margin-top:10px"><button class="az" data-submit="' + a.id + '">Submit answer</button></div>' +
      '</div>';
    }).join('') +
    (done.length ? '<div class="card"><h3>Past attempts</h3><table class="az">' +
      '<tr><th>Scenario</th><th>Status</th><th>Submitted</th><th>Score</th><th>Feedback</th></tr>' +
      done.map(function (a) {
        var sc = scOf(a);
        return '<tr><td>' + esc(sc.title) + '</td><td><span class="pill ' + a.status + '">' + a.status + '</span></td>' +
          '<td class="muted">' + fmtDate(a.submittedAt) + '</td><td>' + scoreCell(a.score) + '</td><td class="muted">' + (esc(a.feedback) || '\u2014') + '</td></tr>' +
          '<tr><td colspan="5"><details><summary>My answer</summary><div class="muted" style="white-space:pre-wrap">' + esc(a.answerText) + '</div></details></td></tr>';
      }).join('') + '</table></div>' : '') +
    (!pending.length && !done.length ? '<div class="card muted">No scenario attempts yet \u2014 use \u201cRequest a scenario now\u201d in the command bar above. It\u2019s optional practice.</div>' : ''));

  $all('[data-submit]').forEach(function (b) {
    b.onclick = function () {
      var id = b.getAttribute('data-submit');
      var txt = $('#ans-' + id).value.trim();
      if (!txt) return toast('Please write your answer first.', true);
      var a = db.scenarioAssignments.find(function (x) { return x.id === id; });
      a.answerText = txt.slice(0, 20000); a.status = 'submitted'; a.submittedAt = Date.now();
      logAudit('ANSWER_SUBMITTED', (scOf(a).title || ''));
      toast('\u2705 Answer submitted for HR evaluation.');
      candScenarios();
    };
  });
  clearInterval(scenarioTimerInt);
  scenarioTimerInt = setInterval(function () {
    pending.forEach(function (a) {
      var el = document.getElementById('timer-' + a.id);
      if (!el) return;
      var sc = scOf(a);
      var left = Math.max(0, a.assignedAt + sc.timeLimitMins * 60000 - Date.now());
      var m = Math.floor(left / 60000), s = Math.floor(left % 60000 / 1000);
      el.innerHTML = left > 0 ? '\u23f1 Time remaining: <span class="timer">' + m + ':' + ('0' + s).slice(-2) + '</span>'
        : '\u23f1 <span style="color:var(--bad)">Time limit passed \u2014 you can still submit; HR sees the timestamp.</span>';
    });
  }, 1000);
}
function requestScenario() {
  var active = db.scenarios.filter(function (s) { return s.active; });
  if (!active.length) return toast('No active scenarios available.', true);
  var attempted = {};
  db.scenarioAssignments.forEach(function (a) { if (a.userId === ME.id) attempted[a.scenarioId] = 1; });
  var pool = active.filter(function (s) { return !attempted[s.id]; });
  var list = pool.length ? pool : active;
  var chosen = list[Math.floor(Math.random() * list.length)];
  db.scenarioAssignments.push({ id: uid('asg'), scenarioId: chosen.id, userId: ME.id, assignedBy: 'self', assignedAt: Date.now(), status: 'assigned', answerText: '', submittedAt: null, score: null, feedback: '' });
  logAudit('SCENARIO_REQUESTED', chosen.title);
  toast('New scenario assigned \u2014 answer it below!');
  candScenarios();
}

/* ============================================================
   CANDIDATE — RESULTS + PRIVACY
   ============================================================ */
function candResults() {
  var gdR = db.gdRatings.filter(function (r) { return r.userId === ME.id; });
  var scen = db.scenarioAssignments.filter(function (a) { return a.userId === ME.id && a.status !== 'assigned'; });
  var KEYS = ['communication', 'content', 'teamwork', 'confidence', 'leadership'];
  shell('results', 'My Results', '\ud83d\udcca', 'GD ratings are given manually by HR on five criteria (0\u201310 each).', null,
    '<div class="card"><h3>Group discussion ratings <span class="sub">(manual, by HR)</span></h3>' +
      (gdR.length ? '<table class="az"><tr><th>Topic</th><th>Comm.</th><th>Content</th><th>Teamwork</th><th>Confidence</th><th>Leadership</th><th>Avg</th><th>HR remarks</th></tr>' +
        gdR.map(function (r) {
          var topic = (db.gdSessions.find(function (s) { return s.id === r.sessionId; }) || {}).topic || '?';
          return '<tr><td>' + esc(topic) + '</td>' + KEYS.map(function (k) { return '<td>' + scoreCell(r.scores[k]) + '</td>'; }).join('') +
            '<td>' + scoreCell(avgScores(r.scores)) + '</td><td class="muted">' + (esc(r.remarks) || '\u2014') + '</td></tr>';
        }).join('') + '</table>'
      : '<div class="muted">No ratings yet. Submit a GD recording and wait for HR to rate it.</div>') + '</div>' +
    '<div class="card"><h3>Scenario question results</h3>' +
      (scen.length ? '<table class="az"><tr><th>Submitted</th><th>Status</th><th>Score /10</th><th>Feedback</th></tr>' +
        scen.map(function (a) {
          return '<tr><td class="muted">' + fmtDate(a.submittedAt) + '</td><td><span class="pill ' + a.status + '">' + a.status + '</span></td><td>' + scoreCell(a.score) + '</td><td class="muted">' + (esc(a.feedback) || 'Awaiting HR evaluation') + '</td></tr>';
        }).join('') + '</table>'
      : '<div class="muted">No scenario attempts yet.</div>') + '</div>');
}

function privacyBlade() {
  var myConsents = db.consents.filter(function (c) { return ME.role === 'hr' || c.userId === ME.id; });
  var isHR = ME.role === 'hr';
  shell('privacy', isHR ? 'Privacy & Compliance' : 'Privacy & My Data', '\ud83d\udd12',
    'DPDP Act 2023 / GDPR-aligned controls: consent records, data export, and right to erasure.', null,
    '<div class="notice blue"><b>How this simulator handles data:</b> everything (accounts, scores, consent records, audit log) lives in <b>your browser\u2019s localStorage</b>; video recordings live in <b>IndexedDB on this device</b>. Nothing is transmitted to any server \u2014 the site is static. Passwords are stored as SHA-256 hashes. Sessions expire after 30 minutes of inactivity.</div>' +
    '<div class="card"><h3>Consent records ' + (isHR ? '(all users)' : '(yours)') + '</h3>' +
      (myConsents.length ? '<table class="az"><tr>' + (isHR ? '<th>User</th>' : '') + '<th>Purpose</th><th>Given at</th><th>Statement</th></tr>' +
        myConsents.map(function (c) {
          return '<tr>' + (isHR ? '<td>' + esc((byId(c.userId) || {}).name || '?') + '</td>' : '') +
            '<td>' + esc(c.purpose) + '</td><td class="muted">' + fmtDate(c.givenAt) + '</td>' +
            '<td class="muted"><details><summary>View statement</summary>' + esc(c.statement) + '</details></td></tr>';
        }).join('') + '</table>' : '<div class="muted">No consent records yet.</div>') + '</div>' +
    '<div class="card"><h3>' + (isHR ? 'Data subject rights (act on behalf of candidates)' : 'Your data rights') + '</h3>' +
      (isHR
        ? '<label>Candidate</label><select id="eraseSel">' + candidates().map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + '</option>'; }).join('') + '</select>' +
          '<div style="margin-top:10px" class="flexrow">' +
          '<button class="az danger" id="btnErase">\ud83d\uddd1 Erase candidate\u2019s assessment data (right to erasure)</button></div>' +
          '<div class="muted" style="margin-top:8px">Deletes the candidate\u2019s recordings (from IndexedDB), ratings, scenario attempts and consent records. Action is written to the audit log.</div>'
        : '<div class="flexrow">' +
          '<button class="az" id="btnExport">\u2b07 Export my data (JSON)</button>' +
          '<button class="az danger" id="btnEraseMe">\ud83d\uddd1 Erase all my assessment data</button></div>' +
          '<div class="muted" style="margin-top:8px">Export covers your profile, ratings, scenario attempts and consent records (data portability). Erasure deletes your recordings, scores and consents from this browser.</div>') +
    '</div>');

  if (isHR) {
    $('#btnErase').onclick = function () {
      var uid_ = $('#eraseSel').value, u = byId(uid_);
      if (!confirm('Erase ALL assessment data for ' + u.name + '? This cannot be undone.')) return;
      eraseUserData(uid_).then(function (n) {
        logAudit('DATA_ERASED', 'All assessment data purged for ' + u.name + ' (' + n + ' video(s) deleted)');
        toast('Data erased for ' + u.name);
        privacyBlade();
      });
    };
  } else {
    $('#btnExport').onclick = function () {
      var data = {
        exportedAt: new Date().toISOString(),
        profile: { id: ME.id, name: ME.name, username: ME.username, role: ME.role },
        gdRatings: db.gdRatings.filter(function (r) { return r.userId === ME.id; }),
        recordingsMeta: db.recordings.filter(function (r) { return r.userId === ME.id; }),
        scenarioAssignments: db.scenarioAssignments.filter(function (a) { return a.userId === ME.id; }),
        consents: db.consents.filter(function (c) { return c.userId === ME.id; })
      };
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      a.download = 'my-assessment-data.json'; a.click();
      logAudit('DATA_EXPORTED', 'Self-service data export');
    };
    $('#btnEraseMe').onclick = function () {
      if (!confirm('Erase all your recordings, scores and consents from this browser?')) return;
      eraseUserData(ME.id).then(function () {
        logAudit('DATA_ERASED', 'Self-service erasure by ' + ME.name);
        toast('Your assessment data has been erased.');
        privacyBlade();
      });
    };
  }
}
function eraseUserData(userId) {
  var vids = db.recordings.filter(function (r) { return r.userId === userId; });
  return Promise.all(vids.map(function (r) { return idbDel('vid-' + r.id); })).then(function () {
    db.recordings = db.recordings.filter(function (r) { return r.userId !== userId; });
    db.gdRatings = db.gdRatings.filter(function (r) { return r.userId !== userId; });
    db.scenarioAssignments = db.scenarioAssignments.filter(function (a) { return a.userId !== userId; });
    db.consents = db.consents.filter(function (c) { return c.userId !== userId; });
    saveDB();
    return vids.length;
  });
}

/* ============================================================
   HR — DASHBOARD / SCOREBOARD
   ============================================================ */
function scoreboard() {
  return candidates().map(function (c) {
    var gdR = db.gdRatings.filter(function (r) { return r.userId === c.id; });
    var gdAvg = gdR.length ? +(gdR.reduce(function (s, r) { return s + avgScores(r.scores); }, 0) / gdR.length).toFixed(2) : null;
    var scen = db.scenarioAssignments.filter(function (a) { return a.userId === c.id && a.status === 'evaluated'; });
    var scenAvg = scen.length ? +(scen.reduce(function (s, a) { return s + a.score; }, 0) / scen.length).toFixed(2) : null;
    var recs = db.recordings.filter(function (r) { return r.userId === c.id; }).length;
    var parts = [gdAvg, scenAvg].filter(function (x) { return x !== null; });
    var overall = parts.length ? +(parts.reduce(function (a, b) { return a + b; }, 0) / parts.length).toFixed(2) : null;
    return { userId: c.id, name: c.name, username: c.username, gdSessionsRated: gdR.length, gdAvg: gdAvg, scenariosEvaluated: scen.length, scenarioAvg: scenAvg, recordingsSubmitted: recs, overall: overall };
  });
}

function hrDashboard() {
  var board = scoreboard();
  var sum = function (k) { return board.reduce(function (s, b) { return s + b[k]; }, 0); };
  shell('dashboard', 'Overview \u2014 Candidate Scoreboard', '\ud83d\udcca',
    'All candidate scores in one place. GD ratings are manual; overall = average of GD avg and scenario avg.',
    [{ ico: '\u267b', label: 'Reset simulator data', fn: resetSim },
     { ico: '\u2b07', label: 'Export scores (CSV)', fn: exportCSV }],
    '<div class="tiles">' +
      '<div class="tile"><div class="n">' + board.length + '</div><div class="l">Candidates</div></div>' +
      '<div class="tile"><div class="n">' + sum('recordingsSubmitted') + '</div><div class="l">GD recordings submitted</div></div>' +
      '<div class="tile"><div class="n">' + sum('gdSessionsRated') + '</div><div class="l">GD ratings given</div></div>' +
      '<div class="tile"><div class="n">' + sum('scenariosEvaluated') + '</div><div class="l">Scenarios evaluated</div></div>' +
    '</div>' +
    '<div class="card"><h3>All candidate scores</h3><table class="az">' +
      '<tr><th>#</th><th>Candidate</th><th>GD recordings</th><th>GD sessions rated</th><th>GD avg /10</th><th>Scenarios evaluated</th><th>Scenario avg /10</th><th>Overall /10</th></tr>' +
      board.slice().sort(function (a, b) { return (b.overall == null ? -1 : b.overall) - (a.overall == null ? -1 : a.overall); })
        .map(function (b, i) {
          return '<tr><td>' + (i + 1) + '</td><td><b>' + esc(b.name) + '</b> <span class="muted">(' + esc(b.username) + ')</span></td>' +
            '<td>' + b.recordingsSubmitted + '</td><td>' + b.gdSessionsRated + '</td><td>' + scoreCell(b.gdAvg) + '</td>' +
            '<td>' + b.scenariosEvaluated + '</td><td>' + scoreCell(b.scenarioAvg) + '</td><td>' + scoreCell(b.overall) + '</td></tr>';
        }).join('') + '</table>' +
      (board.some(function (b) { return b.overall != null; }) ? '' : '<div class="muted" style="margin-top:10px">No scores yet \u2014 rate GD recordings and evaluate scenario answers to populate this board.</div>') +
    '</div>');
}
function exportCSV() {
  var board = scoreboard();
  var rows = [['Candidate', 'Username', 'GD recordings', 'GD sessions rated', 'GD avg', 'Scenarios evaluated', 'Scenario avg', 'Overall']];
  board.forEach(function (b) { rows.push([b.name, b.username, b.recordingsSubmitted, b.gdSessionsRated, b.gdAvg == null ? '' : b.gdAvg, b.scenariosEvaluated, b.scenarioAvg == null ? '' : b.scenarioAvg, b.overall == null ? '' : b.overall]); });
  var csv = rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'candidate-scores.csv'; a.click();
  logAudit('SCORES_EXPORTED', 'CSV export of scoreboard');
}
function resetSim() {
  if (!confirm('Reset all simulator data (users, sessions, ratings, recordings) to defaults?')) return;
  Promise.all(db.recordings.map(function (r) { return idbDel('vid-' + r.id); })).then(function () {
    localStorage.removeItem(DB_KEY);
    db = seedDB();
    return loadDB();
  }).then(function () {
    ME = db.users.find(function (u) { return u.id === ME.id; }) || null;
    if (!ME) { sessionStorage.removeItem(SESSION_KEY); renderLogin(); return; }
    toast('Simulator reset to defaults.');
    hrDashboard();
  });
}

/* ============================================================
   HR — GD SESSIONS & MANUAL RATINGS
   ============================================================ */
var KEYS5 = ['communication', 'content', 'teamwork', 'confidence', 'leadership'];
function hrGD() {
  var cands = candidates();
  shell('hrgd', 'GD Sessions & Ratings', '\ud83c\udfa5',
    'Create sessions, watch candidate recordings, and give the manual GD rating on five criteria.', null,
    '<div class="card"><h3>\u2795 Create a new GD session</h3><div class="cards two">' +
      '<div><label>Topic <span class="req">*</span></label><input id="gdTopic" placeholder="e.g. Remote work vs office work">' +
        '<label>Description / instructions</label><input id="gdDesc" placeholder="Instructions for candidates">' +
        '<label>Max recording duration (minutes)</label><input id="gdDur" type="number" value="3" min="1" max="15"></div>' +
      '<div><label>Participants</label>' +
        '<div style="max-height:150px;overflow:auto;border:1px solid var(--line);padding:10px">' +
          cands.map(function (c) { return '<label style="display:flex;gap:8px;align-items:center;margin:4px 0;font-weight:400"><input type="checkbox" class="gdPart" value="' + c.id + '" checked style="width:auto;height:auto"> ' + esc(c.name) + '</label>'; }).join('') +
        '</div><div style="margin-top:12px"><button class="az" id="btnCreateGD">Create session</button></div></div>' +
    '</div></div>' +
    db.gdSessions.map(function (s) {
      return '<div class="card"><h3>' + esc(s.topic) + ' &nbsp;<span class="pill ' + s.status + '">' + s.status + '</span></h3>' +
        '<div class="muted">' + esc(s.description) + ' \u00b7 ' + s.durationMins + ' min \u00b7 Created ' + fmtDate(s.createdAt) + '</div>' +
        '<div class="flexrow" style="margin-top:10px"><button class="az small ghost" data-toggle="' + s.id + '" data-next="' + (s.status === 'open' ? 'closed' : 'open') + '">' + (s.status === 'open' ? '\ud83d\udd12 Close session' : '\ud83d\udd13 Reopen session') + '</button></div>' +
        '<hr class="az"><b style="font-size:13px">Recordings &amp; manual ratings</b>' +
        s.participants.map(function (pid) {
          var u = byId(pid); if (!u) return '';
          var urecs = db.recordings.filter(function (r) { return r.sessionId === s.id && r.userId === pid; });
          var rating = db.gdRatings.find(function (r) { return r.sessionId === s.id && r.userId === pid; });
          return '<div class="subcard">' +
            '<div class="flexrow" style="justify-content:space-between"><b>' + esc(u.name) + '</b>' +
              '<span class="muted">' + urecs.length + ' recording(s)' + (rating ? ' \u00b7 rated ' + fmtDate(rating.ratedAt) : '') + '</span></div>' +
            (urecs.length ? urecs.map(function (r) {
              return '<details style="margin-top:6px"><summary>\u25b6 Recording \u2014 ' + fmtDate(r.createdAt) + ' (' + (r.sizeBytes / 1048576).toFixed(1) + ' MB' + (r.durationSec ? ', ' + r.durationSec + 's' : '') + ')</summary>' +
                '<div data-vid="' + r.id + '"><button class="az small ghost" data-loadvid="' + r.id + '" style="margin-top:8px">Load video</button></div></details>';
            }).join('') : '<div class="muted" style="margin-top:6px">No recording submitted yet.</div>') +
            '<details style="margin-top:8px"><summary>' + (rating ? '\u270f Edit rating' : '\u2b50 Give manual rating') + '</summary>' +
              '<div class="rate-grid" style="margin-top:8px">' +
                KEYS5.map(function (k) {
                  return '<div><label>' + k[0].toUpperCase() + k.slice(1) + ' /10</label><input type="number" min="0" max="10" step="0.5" id="r-' + s.id + '-' + pid + '-' + k + '" value="' + (rating ? rating.scores[k] : '') + '"></div>';
                }).join('') + '</div>' +
              '<label>Remarks</label><textarea id="r-' + s.id + '-' + pid + '-remarks" style="min-height:56px">' + (rating ? esc(rating.remarks) : '') + '</textarea>' +
              '<div style="margin-top:8px" class="flexrow"><button class="az small" data-rate="' + s.id + '|' + pid + '">\ud83d\udcbe Save rating</button>' +
                (rating ? '<span class="muted">Current avg: ' + scoreCell(avgScores(rating.scores)) + '</span>' : '') + '</div>' +
            '</details></div>';
        }).join('') + '</div>';
    }).join(''));

  $('#btnCreateGD').onclick = function () {
    var topic = $('#gdTopic').value.trim();
    if (!topic) return toast('Topic is required.', true);
    var parts = $all('.gdPart:checked').map(function (c) { return c.value; });
    db.gdSessions.push({ id: uid('gd'), topic: topic, description: $('#gdDesc').value, durationMins: +$('#gdDur').value || 3, status: 'open', createdAt: Date.now(), participants: parts.length ? parts : candidates().map(function (c) { return c.id; }) });
    logAudit('GD_SESSION_CREATED', topic);
    toast('GD session created.'); hrGD();
  };
  $all('[data-toggle]').forEach(function (b) {
    b.onclick = function () {
      var s = db.gdSessions.find(function (x) { return x.id === b.getAttribute('data-toggle'); });
      s.status = b.getAttribute('data-next');
      logAudit('GD_SESSION_STATUS', s.topic + ' \u2192 ' + s.status);
      hrGD();
    };
  });
  $all('[data-loadvid]').forEach(function (b) {
    b.onclick = function () {
      var id = b.getAttribute('data-loadvid');
      idbGet('vid-' + id).then(function (blob) {
        var wrap = $('[data-vid="' + id + '"]');
        if (!blob) { wrap.innerHTML = '<div class="notice" style="margin-top:8px">\u26a0 Video not found in this browser. Recordings live in each user\u2019s own browser \u2014 in this single-device simulator, record and review in the same browser (e.g. candidate in one tab, HR in another).</div>'; return; }
        wrap.innerHTML = '<video controls style="margin-top:8px" src="' + URL.createObjectURL(blob) + '"></video>';
      });
    };
  });
  $all('[data-rate]').forEach(function (b) {
    b.onclick = function () {
      var p = b.getAttribute('data-rate').split('|'), sid = p[0], pid = p[1];
      var scores = {};
      for (var i = 0; i < KEYS5.length; i++) {
        var v = document.getElementById('r-' + sid + '-' + pid + '-' + KEYS5[i]).value;
        if (v === '') return toast('Fill all five score fields (0\u201310).', true);
        v = +v;
        if (isNaN(v) || v < 0 || v > 10) return toast('Scores must be between 0 and 10.', true);
        scores[KEYS5[i]] = v;
      }
      var remarks = document.getElementById('r-' + sid + '-' + pid + '-remarks').value;
      var rating = db.gdRatings.find(function (r) { return r.sessionId === sid && r.userId === pid; });
      if (rating) { rating.scores = scores; rating.remarks = remarks; rating.ratedBy = ME.id; rating.ratedAt = Date.now(); }
      else db.gdRatings.push({ id: uid('rate'), sessionId: sid, userId: pid, scores: scores, remarks: remarks, ratedBy: ME.id, ratedAt: Date.now() });
      logAudit('GD_RATING_SAVED', 'Candidate: ' + ((byId(pid) || {}).name || pid));
      toast('\u2705 Rating saved.'); hrGD();
    };
  });
}

/* ============================================================
   HR — SCENARIOS
   ============================================================ */
function hrScenarios() {
  var cands = candidates();
  var toReview = db.scenarioAssignments.filter(function (a) { return a.status === 'submitted'; });
  var others = db.scenarioAssignments.filter(function (a) { return a.status !== 'submitted'; });
  var scOf = function (a) { return db.scenarios.find(function (s) { return s.id === a.scenarioId; }) || {}; };
  shell('hrscenario', 'Scenario Questions', '\ud83e\udde9',
    'Manage the question bank, assign scenarios on demand, and evaluate submitted answers.', null,
    '<div class="cards two">' +
      '<div class="card"><h3>\u2795 Add scenario question</h3>' +
        '<label>Title <span class="req">*</span></label><input id="scTitle">' +
        '<label>Category</label><input id="scCat" placeholder="e.g. Leadership">' +
        '<label>Scenario prompt <span class="req">*</span></label><textarea id="scPrompt"></textarea>' +
        '<label>Time limit (minutes)</label><input id="scTime" type="number" value="10" min="1">' +
        '<div style="margin-top:10px"><button class="az" id="btnAddSc">Add to question bank</button></div></div>' +
      '<div class="card"><h3>\ud83d\udce4 Assign scenario to a candidate (on-demand)</h3>' +
        '<label>Candidate</label><select id="asgUser">' + cands.map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + '</option>'; }).join('') + '</select>' +
        '<label>Scenario</label><select id="asgScenario">' + db.scenarios.filter(function (s) { return s.active; }).map(function (s) { return '<option value="' + s.id + '">' + esc(s.title) + ' (' + esc(s.category) + ')</option>'; }).join('') + '</select>' +
        '<div style="margin-top:10px"><button class="az" id="btnAssign">Assign now</button></div>' +
        '<div class="muted" style="margin-top:10px">Candidates can also self-request a random scenario \u2014 it\u2019s optional practice for them.</div></div>' +
    '</div>' +
    '<div class="card"><h3>Question bank (' + db.scenarios.length + ')</h3><table class="az">' +
      '<tr><th>Title</th><th>Category</th><th>Time</th><th>Active</th><th></th></tr>' +
      db.scenarios.map(function (s) {
        return '<tr><td><b>' + esc(s.title) + '</b><div class="muted" style="max-width:520px">' + esc(s.prompt) + '</div></td>' +
          '<td>' + esc(s.category) + '</td><td>' + s.timeLimitMins + 'm</td><td>' + (s.active ? '\u2705' : '\u274c') + '</td>' +
          '<td><button class="az small ghost" data-scact="' + s.id + '">' + (s.active ? 'Deactivate' : 'Activate') + '</button></td></tr>';
      }).join('') + '</table></div>' +
    '<div class="card"><h3>\ud83d\udcdd Answers awaiting evaluation (' + toReview.length + ')</h3>' +
      (toReview.length ? toReview.map(function (a) {
        return '<div class="subcard">' +
          '<div class="flexrow" style="justify-content:space-between"><b>' + esc((byId(a.userId) || {}).name || '?') + '</b><span class="muted">' + esc(scOf(a).title) + ' \u00b7 submitted ' + fmtDate(a.submittedAt) + '</span></div>' +
          '<div class="muted" style="margin:8px 0;white-space:pre-wrap;border-left:3px solid var(--line);padding-left:10px">' + esc(a.answerText) + '</div>' +
          '<div class="flexrow"><input type="number" id="ev-score-' + a.id + '" min="0" max="10" step="0.5" placeholder="Score /10" style="width:110px">' +
          '<input id="ev-fb-' + a.id + '" placeholder="Feedback" style="flex:1;min-width:200px">' +
          '<button class="az small" data-eval="' + a.id + '">Save evaluation</button></div></div>';
      }).join('') : '<div class="muted">Nothing to review right now.</div>') + '</div>' +
    '<div class="card"><h3>All assignments</h3><table class="az">' +
      '<tr><th>Candidate</th><th>Scenario</th><th>Source</th><th>Status</th><th>Score</th></tr>' +
      (others.length ? others.map(function (a) {
        return '<tr><td>' + esc((byId(a.userId) || {}).name || '?') + '</td><td>' + esc(scOf(a).title) + '</td>' +
          '<td class="muted">' + (a.assignedBy === 'self' ? 'self-requested' : 'HR-assigned') + '</td>' +
          '<td><span class="pill ' + a.status + '">' + a.status + '</span></td><td>' + scoreCell(a.score) + '</td></tr>';
      }).join('') : '<tr><td colspan="5" class="muted">None yet.</td></tr>') + '</table></div>');

  $('#btnAddSc').onclick = function () {
    var t = $('#scTitle').value.trim(), pr = $('#scPrompt').value.trim();
    if (!t || !pr) return toast('Title and prompt are required.', true);
    db.scenarios.push({ id: uid('sc'), title: t, category: $('#scCat').value.trim() || 'General', prompt: pr, timeLimitMins: +$('#scTime').value || 10, active: true });
    logAudit('SCENARIO_ADDED', t);
    toast('Scenario added.'); hrScenarios();
  };
  $('#btnAssign').onclick = function () {
    var u = byId($('#asgUser').value), sc = db.scenarios.find(function (s) { return s.id === $('#asgScenario').value; });
    if (!u || !sc) return toast('Pick a candidate and scenario.', true);
    db.scenarioAssignments.push({ id: uid('asg'), scenarioId: sc.id, userId: u.id, assignedBy: ME.id, assignedAt: Date.now(), status: 'assigned', answerText: '', submittedAt: null, score: null, feedback: '' });
    logAudit('SCENARIO_ASSIGNED', sc.title + ' \u2192 ' + u.name);
    toast('Scenario assigned to ' + u.name + '.'); hrScenarios();
  };
  $all('[data-scact]').forEach(function (b) {
    b.onclick = function () {
      var s = db.scenarios.find(function (x) { return x.id === b.getAttribute('data-scact'); });
      s.active = !s.active; saveDB(); hrScenarios();
    };
  });
  $all('[data-eval]').forEach(function (b) {
    b.onclick = function () {
      var id = b.getAttribute('data-eval');
      var score = $('#ev-score-' + id).value;
      if (score === '') return toast('Enter a score 0\u201310.', true);
      score = +score;
      if (isNaN(score) || score < 0 || score > 10) return toast('Score must be 0\u201310.', true);
      var a = db.scenarioAssignments.find(function (x) { return x.id === id; });
      a.score = score; a.feedback = $('#ev-fb-' + id).value; a.status = 'evaluated';
      logAudit('ANSWER_EVALUATED', ((byId(a.userId) || {}).name || '') + ' \u2014 score ' + score + '/10');
      toast('\u2705 Evaluation saved.'); hrScenarios();
    };
  });
}

/* ============================================================
   HR — CANDIDATES & AUDIT
   ============================================================ */
function hrCandidates() {
  shell('hrcand', 'Candidates', '\ud83d\udc65', 'Create and manage candidate accounts.', null,
    '<div class="card"><h3>\u2795 Add candidate account</h3><div class="cards two"><div>' +
      '<label>Full name <span class="req">*</span></label><input id="ncName">' +
      '<label>Username <span class="req">*</span></label><input id="ncUser">' +
      '<label>Password <span class="req">*</span> <span class="muted">(min 6 chars \u2014 stored as SHA-256 hash)</span></label><input id="ncPass" type="password">' +
      '<div style="margin-top:10px"><button class="az" id="btnAddC">Create account</button></div>' +
    '</div></div></div>' +
    '<div class="card"><h3>Candidate accounts (' + candidates().length + ')</h3><table class="az">' +
      '<tr><th>Name</th><th>Username</th><th>Password storage</th></tr>' +
      candidates().map(function (c) { return '<tr><td>' + esc(c.name) + '</td><td class="muted">' + esc(c.username) + '</td><td class="muted">SHA-256 hash (' + c.pwHash.slice(0, 12) + '\u2026)</td></tr>'; }).join('') +
    '</table></div>');
  $('#btnAddC').onclick = function () {
    var n = $('#ncName').value.trim(), u = $('#ncUser').value.trim(), p = $('#ncPass').value;
    if (!n || !u || !p) return toast('All fields are required.', true);
    if (p.length < 6) return toast('Password must be at least 6 characters.', true);
    if (db.users.some(function (x) { return x.username === u; })) return toast('Username already exists.', true);
    var salt = uid('salt');
    hashPw(p, salt).then(function (h) {
      db.users.push({ id: uid('u'), role: 'candidate', name: n, username: u, salt: salt, pwHash: h });
      logAudit('CANDIDATE_CREATED', n + ' (' + u + ')');
      toast('Candidate account created.'); hrCandidates();
    });
  };
}

function hrAudit() {
  var logs = db.audit.slice(-300).reverse();
  shell('audit', 'Activity log', '\ud83d\udcdc', 'Immutable audit trail of all sensitive actions \u2014 sign-ins, consents, recordings, ratings, erasures.', null,
    '<div class="card"><table class="az"><tr><th>Time</th><th>Actor</th><th>Action</th><th>Details</th></tr>' +
      (logs.length ? logs.map(function (l) {
        return '<tr><td class="muted" style="white-space:nowrap">' + fmtDate(l.at) + '</td><td>' + esc(l.actorName) + '</td><td><b>' + esc(l.action) + '</b></td><td class="muted">' + esc(l.details) + '</td></tr>';
      }).join('') : '<tr><td colspan="4" class="muted">No activity yet.</td></tr>') +
    '</table></div>');
}

/* ============================================================
   ROUTER
   ============================================================ */
function route() {
  stopCamera();
  clearInterval(scenarioTimerInt);
  var sess = getSession();
  ME = sess ? db.users.find(function (u) { return u.id === sess.userId; }) : null;
  if (!ME) return renderLogin();
  var hash = location.hash.replace('#', '');
  if (ME.role === 'hr') {
    ({ dashboard: hrDashboard, hrgd: hrGD, hrscenario: hrScenarios, hrcand: hrCandidates, audit: hrAudit, privacy: privacyBlade }[hash] || hrDashboard)();
  } else {
    ({ gd: candGD, scenario: candScenarios, results: candResults, privacy: privacyBlade }[hash] || candGD)();
  }
}
window.addEventListener('hashchange', route);
loadDB().then(route);
})();
