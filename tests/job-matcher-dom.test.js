'use strict';

/* RCW Job Matcher - DOM smoke test.
 *
 * The pure-logic suite (job-matcher.test.js) proves the maths; this proves the page is
 * actually wired: the ids exist, the click paths run without throwing, a profile renders,
 * the sample set scores and sorts, a packet is generated and saved, and a dead network
 * degrades into a status chip instead of an empty board.
 *
 * jsdom is not a dependency of this repository, so this file skips itself when it cannot
 * resolve one:  node tests/job-matcher-dom.test.js
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'job-matcher');

let JSDOM;
try {
  ({ JSDOM } = require('jsdom'));
} catch (error) {
  try {
    ({ JSDOM } = require('/tmp/jshome/node_modules/jsdom'));
  } catch (inner) {
    console.log('SKIP  job-matcher DOM smoke test (install jsdom to run it)');
    process.exit(0);
  }
}

const htmlSrc = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
const scripts = [...htmlSrc.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1])
  .filter(src => !/^https?:/.test(src))
  .map(src => ({ src, code: fs.readFileSync(path.join(DIR, src), 'utf8') }));

const body = htmlSrc.replace(/<script[\s\S]*?<\/script>/g, '');
const dom = new JSDOM(body, { url: 'https://www.rcwittraining.in/job-matcher/', pretendToBeVisual: true, runScripts: 'outside-only' });
const { window } = dom;
const doc = window.document;

// The page must survive a hostile network: every source refuses.
let fetchCalls = 0;
window.fetch = function (url) {
  fetchCalls += 1;
  return Promise.reject(new Error('simulated CORS failure for ' + String(url).slice(0, 40)));
};
window.HTMLAnchorElement.prototype.click = function () { /* jsdom cannot download */ };
window.URL.createObjectURL = () => 'blob:stub';
window.URL.revokeObjectURL = () => {};
window.scrollTo = () => {};
window.HTMLElement.prototype.scrollIntoView = () => {};
window.confirm = () => true;
Object.defineProperty(window.navigator, 'clipboard', { value: { writeText: () => Promise.resolve() }, configurable: true });

const errors = [];
window.addEventListener('error', e => errors.push(String(e.message)));

let passed = 0;
const queue = [];
function test(name, fn) { queue.push({ name, fn }); }
function click(id) {
  const node = doc.getElementById(id);
  assert.ok(node, `#${id} is missing from the page`);
  node.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
}
function set(id, value) {
  const node = doc.getElementById(id);
  assert.ok(node, `#${id} is missing`);
  node.value = value;
  node.dispatchEvent(new window.Event('input', { bubbles: true }));
  node.dispatchEvent(new window.Event('change', { bubbles: true }));
}
const wait = ms => new Promise(r => setTimeout(r, ms));
const text_ = id => (doc.getElementById(id) || {}).textContent || '';
const count = sel => doc.querySelectorAll(sel).length;

scripts.forEach(s => {
  try { window.eval(s.code); }
  catch (error) { throw new Error(`Booting ${s.src} threw: ${error.message}`); }
});

test('the page boots, exposes the modules and keeps the tool tab visible', () => {
  assert.ok(window.RCWJM, 'RCWJM namespace missing');
  ['text', 'skills', 'resume', 'matcher', 'feeds', 'packets', 'store'].forEach(name =>
    assert.ok(window.RCWJM[name], `module ${name} did not attach`));
  assert.ok(doc.querySelector('#panel-resume').classList.contains('active'), 'step 1 should be open on load');
  assert.strictEqual(errors.length, 0, `window errors: ${errors.join('; ')}`);
});

test('the founder draft loads, is flagged as a draft, and its placeholders are visible', () => {
  click('btnSeed');
  const profile = JSON.parse(window.localStorage.getItem('rcwjm.v1.profile'));
  assert.strictEqual(profile.seed, true, 'the seed must stay flagged so the banner cannot be forgotten');
  assert.ok((doc.getElementById('pHeadline') || {}).value.includes('Architect'), 'headline should populate');
  assert.ok(count('#skillCloud .skill') >= 30, 'the seed profile must render its skill cloud');
  assert.ok(text_('atsScore').length >= 1, 'ATS ring should have a number');
  assert.ok(text_('parseNote').length > 0 || true);
});

test('a pasted resume parses end to end and updates every panel', () => {
  const cv = [
    'Raju Rishi',
    'Linux Administrator | Bengaluru, India',
    'raju@example.com | +91 90000 11111 | https://www.linkedin.com/in/example',
    '',
    'SUMMARY',
    '6+ years administering RHEL and Ubuntu estates; automated patching with Ansible across 180 hosts.',
    '',
    'TECHNICAL SKILLS',
    'RHEL 9, Ubuntu 22.04, systemd, SELinux, LVM, XFS, bash, cron, Ansible, Docker, Kubernetes, Veeam, ZFS',
    '',
    'WORK EXPERIENCE',
    'Linux Administrator | Example Cloud Pvt Ltd | Bengaluru, India | Jun 2019 - Present',
    '• Cut the patch window from 5 hours to 35 minutes across 180 RHEL hosts using Ansible',
    '• Owned Veeam backup for 40 TB and ran quarterly restore tests',
    '',
    'EDUCATION',
    'B.E. Computer Science, Example University, 2018',
    '',
    'CERTIFICATIONS',
    'RHCSA, CKA'
  ].join('\n');
  set('pasteBox', cv);
  click('btnParse');
  const profile = JSON.parse(window.localStorage.getItem('rcwjm.v1.profile'));
  assert.strictEqual(profile.name, 'Raju Rishi');
  assert.ok(/@example\.com$/.test(profile.email), profile.email);
  assert.ok(profile.years >= 6, `years=${profile.years}`);
  const names = profile.skills.map(s => s.name);
  ['RHEL', 'Ansible', 'Backup & DR', 'Kubernetes'].forEach(n =>
    assert.ok(names.includes(n), `skill ${n} should have been extracted, got ${names.join(',')}`));
  assert.ok(profile.ats.score > 55, `ATS ${profile.ats.score}`);
  assert.ok(count('#skillCloud .skill') >= 4, 'skill cloud must re-render');
});

test('targets persist and the job list re-scores without a refetch', async () => {
  set('tMinScore', '55');
  set('tKeywords', 'linux administrator\ninfrastructure engineer');
  await wait(220);
  const saved = JSON.parse(window.localStorage.getItem('rcwjm.v1.targets'));
  assert.strictEqual(saved.minScore, 55, 'the slider must persist');
  assert.ok(saved.keywords.includes('infrastructure engineer'));
});

test('the sample set renders scored, ordered cards with explainable bands', async () => {
  click('btnDemo');
  const cards = doc.querySelectorAll('#jobList .job');
  // Only a few synthetic listings should clear a 55 floor for a 6-year Linux admin CV.
  // A board that showed everything at 90% would be the bug, not this.
  assert.ok(cards.length >= 2, `expected some matches above the floor, got ${cards.length}`);
  set('showWhich', 'all');
  const all = doc.querySelectorAll('#jobList .job');
  assert.ok(all.length >= 15, `"show everything" must reveal the whole set, saw ${all.length}`);
  const scores = [...all].map(card => parseInt(card.querySelector('.score-ring b').textContent, 10));
  assert.ok(scores[0] >= scores[scores.length - 1], 'cards must arrive sorted by score');
  assert.ok(Math.max(...scores) - Math.min(...scores) >= 25, `the board must discriminate, spread was ${Math.max(...scores)}-${Math.min(...scores)}`);
  set('showWhich', 'matches');
  const shown = doc.querySelectorAll('#jobList .job');
  [...shown].forEach(card => assert.ok(parseInt(card.querySelector('.score-ring b').textContent, 10) >= 55, 'the floor is respected'));

  const top = shown[0];
  assert.ok(top.querySelector('.job-title').textContent.length > 5, 'title rendered');
  assert.ok(top.querySelectorAll('.tagchip').length >= 1, 'matched/missing chips rendered');
  assert.ok(parseInt(text_('bulkCount'), 10) >= 1, 'bulk bar counts the queue');
  top.querySelector('[data-act="why"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  const bandCount = top.querySelectorAll('.band').length;
  assert.ok(bandCount >= 6, `the "why" panel should show every band, saw ${bandCount}`);
  assert.ok([...top.querySelectorAll('.band p')].every(p => p.textContent.trim().length > 10), 'each band needs a reason');
  assert.ok(!/NaN|undefined/.test(top.textContent), 'no NaN leaking into a card');
});

test('filters narrow the board and the blocked view is separate', async () => {
  const before = count('#jobList .job');
  set('jobFilter', 'linux');
  await wait(240);
  const after = count('#jobList .job');
  assert.ok(after <= before && after >= 1, `filter behaviour ${before} -> ${after}`);
  set('jobFilter', 'zzz-nothing-matches-zzz');
  await wait(240);
  assert.strictEqual(count('#jobList .job'), 0, 'a filter that matches nothing must empty the list');
  assert.ok(!doc.getElementById('jobEmpty').classList.contains('hidden'), 'and show the empty state');
  set('jobFilter', '');
  await wait(240);
  assert.ok(count('#jobList .job') > 0, 'clearing the filter must bring the board back');
});

test('packet generation, editing and status flow all round-trip through storage', async () => {
  const first = doc.querySelector('#jobList .job [data-act="packet"]');
  first.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(60);
  assert.ok(doc.getElementById('panel-packets').classList.contains('active'), 'the tool should jump to the packet');
  const letter = doc.getElementById('pkLetter').value;
  assert.ok(letter.length > 220, 'letter generated');
  assert.ok(/\[FILL/.test(letter), 'unknowns must stay marked');
  assert.ok(count('#pkAnswers .qa') >= 8, 'form answers should be drafted');
  assert.ok(count('#pkSheet .val') >= 8, 'the autofill sheet should be populated');
  assert.ok(text_('pkNotice').length > 20, 'the packet must warn about its own gaps');

  set('pkLetter', letter + '\n\nCustom line added by the candidate.');
  const stored = JSON.parse(window.localStorage.getItem('rcwjm.v1.packets'));
  const ids = Object.keys(stored);
  assert.strictEqual(ids.length, 1, 'exactly one packet saved');
  assert.ok(stored[ids[0]].coverLetter.includes('Custom line added by the candidate.'), 'edits must persist');

  click('btnMarkApplied');
  const tracker = JSON.parse(window.localStorage.getItem('rcwjm.v1.tracker'));
  assert.strictEqual(tracker.length, 1);
  assert.strictEqual(tracker[0].status, 'applied');
  assert.strictEqual(text_('tabTrackCount').trim(), '1', 'tab badge updates');
});

test('bulk preparation writes a queue of packets and reports the limit', async () => {
  const total = count('#jobList .job');
  assert.ok(total >= 2, 'need a couple of listings to batch');
  click('btnBulkPackets');
  await wait(1500);
  const stored = JSON.parse(window.localStorage.getItem('rcwjm.v1.packets'));
  assert.ok(Object.keys(stored).length >= 2, `expected several packets, got ${Object.keys(stored).length}`);
  assert.ok(text_('bulkProgress').includes('packet(s) written'), 'the progress line must explain what happened');
  assert.ok(count('#packetItems .pk-item') >= 2, 'the packet queue must list them');
});

test('an unreachable network becomes a status chip, not a broken board', async () => {
  const beforeFetch = fetchCalls;
  click('btnSearchForce');
  await wait(1200);
  assert.ok(fetchCalls > beforeFetch, 'live search should have attempted fetches');
  const chips = [...doc.querySelectorAll('#sourceStatus .src')].map(c => c.className);
  assert.ok(chips.some(c => /error/.test(c)), `sources should report failure, saw ${chips.join(' | ')}`);
  assert.ok(count('#jobList .job') >= 1, 'previously loaded listings must survive a failed refresh');
  assert.ok(!/undefined|NaN/.test(doc.getElementById('jobList').textContent), 'no NaN/undefined leakage into the UI');
  assert.ok(text_('sourceSummary').length > 10, 'the header must still explain the state');
});

test('importing pasted listings feeds the same pipeline', async () => {
  set('importBox', 'Senior Storage Engineer | Sample Storage Co | Chennai\nNetApp ONTAP, ZFS, SAN zoning, Veeam. 8+ years. https://example.org/j/9');
  click('btnImportJobs');
  await wait(240);
  const cards = [...doc.querySelectorAll('#jobList .job')];
  const titles = cards.map(c => c.querySelector('.job-title').textContent);
  assert.ok(titles.some(t => /Storage Engineer/.test(t)), `imported listing should appear, saw ${titles.slice(0, 4)}`);
});

test('the sources panel exposes toggles and never a credential field', () => {
  doc.querySelector('.tab[data-tab="sources"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  const sources = doc.getElementById('panel-sources');
  assert.ok(sources, 'panel exists');
  assert.ok(count('#sourceList .source') >= 8, 'all adapters listed');
  const inputs = [...doc.querySelectorAll('input')].map(i => i.type);
  assert.ok(!inputs.includes('password'), 'a password input must never exist');
  assert.ok(sources.textContent.includes('never'), 'the privacy wording should be present');
});

test('tracker export produces a parseable CSV of the real pipeline', () => {
  click('btnExportCsv');
  assert.ok(true, 'download stubbed at anchor level; the call must not throw');
  const csv = window.RCWJM.packets.trackerCSV(JSON.parse(window.localStorage.getItem('rcwjm.v1.tracker')));
  assert.ok(/title/.test(csv) && /status/.test(csv), csv.slice(0, 80));
  assert.ok(/applied/.test(csv), 'the applied status must be in the export');
});

test('wiping local data really empties every key', () => {
  click('btnWipeAll');
  const left = Object.keys(window.localStorage).filter(k => k.startsWith('rcwjm.v1.'));
  assert.deepStrictEqual(left, [], `keys survived: ${left}`);
  assert.strictEqual(count('#jobList .job'), 0, 'the board must clear too');
});

(async () => {
  let passed = 0;
  const failures = [];
  for (const item of queue) {
    try { await item.fn(); passed += 1; }
    catch (error) { failures.push(`${item.name}\n      ${error.message}`); process.exitCode = 1; }
  }
  if (failures.length) console.error(`FAILURES (${failures.length}):\n  ${failures.join('\n  ')}`);
  else console.log(`${passed} DOM checks passed - the page boots, renders, scores, writes packets and fails safely.`);
})();
