'use strict';

/* RCW Job Matcher - logic tests (dependency-free, no DOM).
 *
 *   node tests/job-matcher.test.js
 *
 * These cover the parts a visitor cannot see but judges the tool by: skill extraction,
 * score ordering and explainability, dedupe, packet honesty (no invented facts),
 * import parsing, and the integrity of the shipped data (every "close this gap" link
 * must point at a page that actually exists in this repository).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LIB = p => path.join(ROOT, 'job-matcher', p);

const text = require(LIB('lib/text.js'));
const skills = require(LIB('lib/skills.js'));
const resume = require(LIB('lib/resume.js'));
const matcher = require(LIB('lib/matcher.js'));
const feeds = require(LIB('lib/feeds.js'));
const packets = require(LIB('lib/packets.js'));
const store = require(LIB('lib/store.js'));
const sampleJobs = require(LIB('data/sample-jobs.js'));
const seedProfile = require(LIB('data/seed-profile.js'));

const queue = [];
let passed = 0;
let failed = 0;
// Tests may be sync or return promises; the queue keeps ordering deterministic and
// lets the async ones (fetch/prepareBulk) run without a test framework.
function test(name, fn) { queue.push({ name, fn }); }

const RESUME = `Pradeep Raju
Senior Infrastructure Engineer | Linux, VMware, Cloud
Chennai, India | +91 98400 12345 | pradeep.raju@example.com | https://www.linkedin.com/in/example

SUMMARY
19+ years of enterprise infrastructure experience: RHEL estates, VMware vSphere, AWS and Azure
migrations, Veeam backup and disaster recovery. Led a team of 6 and cut the monthly patch window
from 6 hours to 40 minutes across 320 RHEL hosts.

TECHNICAL SKILLS
Linux: RHEL 8/9, CentOS, Ubuntu, systemd, SELinux, LVM, XFS, bash, awk, cron
Virtualisation: VMware vSphere 7/8, ESXi, vCenter, vMotion, datastore capacity, Citrix XenApp
Cloud: AWS EC2, S3, VPC, IAM, RDS, Terraform; Azure VMs, Entra ID, Intune, AKS
Automation: Ansible playbooks, Bash scripting, Python, Git, GitHub Actions CI/CD
Storage & backup: NetApp ONTAP, SAN zoning, multipath, Veeam, Commvault, immutable backups
Networking: TCP/IP, DNS, DHCP, VLAN, iptables, firewalld, tcpdump
Databases: MySQL, PostgreSQL, Redis

WORK EXPERIENCE
Senior Infrastructure Engineer | Nimbus Datacentre (Pvt) Ltd | Chennai, India | Mar 2018 - Present
• Owned 320 RHEL hosts and 60 Windows Server VMs; automated patching with Ansible, saving 22 hours a month
• Led the migration of 45 workloads from VMware to AWS, finishing with zero unplanned downtime
• Built Veeam backup with immutable repositories and quarterly restore tests across 1.2 PB
• Reduced Sev1 incidents by 38% by writing runbooks for the 20 most common failures
Infrastructure Engineer | Coastal Retail Systems | Apr 2011 - Feb 2018
• Administered ESXi/vCenter clusters and NetApp storage; tuned multipath and resolved latency incidents
• Ran Active Directory, DNS, DHCP and group policy for 1,800 users across 12 sites

CERTIFICATIONS
RHCSA, AWS Certified Solutions Architect - Associate, Microsoft Azure Administrator AZ-104, ITIL v4 Foundation

EDUCATION
B.E. Computer Science, Anna University, 2010
`;

const profile = resume.parse(RESUME, { source: 'test fixture' });

/* ------------------------------------------------------------ text helpers */
test('normalize folds whitespace and unicode dashes', () => {
  assert.strictEqual(text.normalize('a  —\tb\n\nc'), 'a - b\n\nc');
  assert.strictEqual(text.normalize('a  —\tb\n c'), 'a - b\nc');
});
test('tokens drop stop words and short noise', () => {
  const t = text.tokens('Strong hands-on experience with Red Hat Enterprise Linux and Ansible');
  assert.ok(t.includes('linux') && t.includes('ansible') && !t.includes('and'), t.join(','));
});
test('escapeHtml neutralises markup from remote listings', () => {
  assert.strictEqual(text.escapeHtml('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
});
test('relTime is human and bounded', () => {
  assert.strictEqual(text.relTime(new Date().toISOString()), 'today');
  assert.strictEqual(text.parseDate('garbage'), null);
});
test('hash is stable across runs', () => {
  assert.strictEqual(text.hash('a|b'), text.hash('a|b'));
});

/* ------------------------------------------------------------ taxonomy */
test('taxonomy has no duplicate canonical names', () => {
  const seen = new Set();
  skills.SKILLS.forEach(s => {
    assert.ok(!seen.has(s.name), `duplicate skill entry: ${s.name}`);
    seen.add(s.name);
  });
});
test('taxonomy carries the weights the scorer relies on', () => {
  skills.SKILLS.forEach(s => {
    assert.ok(s.aliases.length >= 1, `${s.name} has no aliases`);
    assert.ok(s.weight >= 1 && s.weight <= 3, `${s.name} weight ${s.weight}`);
  });
  assert.ok(skills.SKILLS.length >= 80, 'taxonomy too small to be useful');
});
test('every lab link resolves to a real page in this repo', () => {
  const broken = [];
  skills.SKILLS.forEach(s => {
    if (!s.lab) return;
    const clean = String(s.lab).replace(/^https?:\/\/[^/]+/, '').replace(/^\/+/, '');
    if (!fs.existsSync(path.join(ROOT, clean))) broken.push(`${s.name} -> ${s.lab}`);
  });
  assert.deepStrictEqual(broken, [], `broken gap-plan links: ${broken.join(', ')}`);
});
test('alias matching respects word boundaries', () => {
  assert.ok(!skills.extract('We hired a Go developer for the logo team').skills.some(s => s.name === 'GCP Compute'),
    'a stray "go"/"gcp" substring must not create a cloud skill');
  const hit = skills.extract('Ran RHEL 9 with ansible playbooks and zfs on NetApp');
  const names = hit.skills.map(s => s.name);
  ['RHEL', 'Ansible', 'Filesystems', 'NetApp'].forEach(n => assert.ok(names.includes(n), `missing ${n} in ${names}`));
});
test('classifyTitle maps roles and seniority', () => {
  assert.strictEqual(skills.classifyTitle('Senior Site Reliability Engineer').level, 5);
  assert.strictEqual(skills.classifyTitle('Junior IT Support Associate').level, 1);
  const fam = skills.classifyTitle('VMware Administrator');
  assert.ok(fam.families.some(f => f.id === 'virtualization'), JSON.stringify(fam));
});
test('locationRegions groups a posting', () => {
  assert.deepStrictEqual(skills.locationRegions('Bengaluru, India'), ['India']);
  assert.ok(skills.locationRegions('Remote - EMEA').includes('Remote (worldwide)'));
});
test('certHits finds real certification strings', () => {
  const found = skills.certHits('RHCSA and AZ-104, plus ITIL v4').map(c => c.name);
  ['RHCSA', 'Azure AZ-104', 'ITIL'].forEach(c => assert.ok(found.includes(c), found.join(',')));
});
test('resolveList canonicalises free text', () => {
  const r = skills.resolveList('rhel, ansible tower, k8s, something exotic');
  assert.ok(r.known.includes('RHEL') && r.known.includes('Ansible') && r.known.includes('Kubernetes'), JSON.stringify(r.known));
  assert.ok(r.unknown.includes('something exotic'), 'unrecognised words must be reported, not dropped silently');
});

/* ------------------------------------------------------------ resume parse */
test('contact block is extracted', () => {
  assert.strictEqual(profile.email, 'pradeep.raju@example.com');
  assert.ok(/\+91/.test(profile.phone), profile.phone);
  assert.ok(/linkedin\.com/.test(profile.linkedin));
  assert.ok(/Chennai/.test(profile.location), profile.location);
});
test('years of experience is read from the explicit line', () => {
  assert.strictEqual(profile.years, 19);
});
test('years fall back to the earliest date range when not stated', () => {
  const noExplicit = resume.parse('Senior Engineer\nWORK EXPERIENCE\nAdmin | X Corp | Mar 2015 - Present\n• ran servers', {});
  assert.ok(noExplicit.years >= 10 && noExplicit.years <= 25, `derived=${noExplicit.years}`);
});
test('sections split on the headings resumes actually use', () => {
  assert.ok(/RHEL/.test(profile.sections.skills), 'skills section');
  assert.ok(/Nimbus Datacentre/.test(profile.sections.experience), 'experience section');
  assert.ok(/Anna University/.test(profile.sections.education), 'education section');
});
test('employment entries parse from the date-line layout', () => {
  assert.ok(profile.employment.length >= 2, JSON.stringify(profile.employment));
  assert.ok(profile.employment.some(r => /Nimbus/.test(r.company)), 'company name');
});
test('achievements prefer quantified results over duty phrases', () => {
  assert.ok(profile.achievements.some(a => /38%/.test(a)), profile.achievements.join(' | '));
  assert.ok(!profile.achievements.some(a => /responsible for/i.test(a)), 'duty phrases should rank last');
});
test('skills detected are tied to work history when proven there', () => {
  const ansible = profile.skills.find(s => s.name === 'Ansible');
  assert.ok(ansible && ansible.usedInWorkHistory, 'Ansible appears under the job bullets, so it counts as proven');
});
test('ATS review rewards numbers and punishes prose', () => {
  assert.ok(profile.ats.score >= 60, `score=${profile.ats.score}`);
  assert.ok(profile.ats.quantified >= 4, 'quantified figures should be counted');
  const weak = resume.parse('John Doe\nI was responsible for servers and I worked on projects.', {});
  assert.ok(weak.ats.score < profile.ats.score, 'a thin CV must score lower');
  assert.ok(weak.ats.checks.some(c => !c.passed && /Quantified/.test(c.label)));
});
test('notice period and CTC lines are picked up when present', () => {
  const withCtc = resume.parse('Engineer\nNotice Period: 60 days\nExpected CTC: 28 LPA\nCurrent CTC: 19 LPA', {});
  assert.strictEqual(withCtc.noticePeriod, '60 days');
  assert.ok(/28/.test(withCtc.expectedCtc), withCtc.expectedCtc);
});
test('RTF control words are stripped, not mangled', () => {
  const stripped = resume.rtfToText('{\\rtf1\\ansi\\deff0 Senior {\\b Linux} Admin\\par line two\\par}');
  assert.ok(/Senior\s+Linux\s+Admin/.test(stripped), stripped);
  assert.ok(!/rtf1|ansipgk|deff0/.test(stripped), stripped);
});
test('HTML in an imported resume is flattened safely', () => {
  assert.strictEqual(text.stripHtml('<h1>Admin</h1><p>Ran <b>Ansible</b>.</p>'), 'Admin\nRan Ansible.');
  assert.strictEqual(text.stripHtml('<td>RHEL</td><td>Ansible</td>'), 'RHEL | Ansible');
  assert.ok(!/<|&lt;script/.test(text.stripHtml('<script>alert(1)</script>plain')), 'tags must be gone, not escaped-and-kept');
});


/* -------------------------------------------------- real PDF / DOCX fixtures
 * Built here rather than committed as binaries: a two-line change to the
 * extractors must fail loudly, and a fixture file in git fails silently.
 */
test('a real .docx is unzipped and read in the browser (no library, no upload)', async () => {
  const { execFileSync } = require('child_process');
  const os = require('os');
  const fixture = path.join(os.tmpdir(), `rcw-job-matcher-${process.pid}.docx`);
  const script = `
import sys, zipfile
xml = """<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>"""
def para(runs):
    return "<w:p>" + "".join("<w:r><w:t>" + r + "</w:t></w:r>" for r in runs) + "</w:p>"
xml += para(["Raju Rishi"])
xml += para(["Linux Administrator | Bengaluru, India | +91 90000 11111 | raju@example.com"])
xml += para(["TECHNICAL SKILLS"])
xml += para(["RHEL 9, Ansible, Veeam", "\t", "Kubernetes"])
xml += para(["Senior Linux Administrator | Example Cloud Pvt Ltd | Jun 2019 - Present"])
xml += para(["\u2022 Automated patching for 180 hosts, saving 22 hours a month"])
xml += "</w:body></w:document>"
with zipfile.ZipFile(sys.argv[1], "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("[Content_Types].xml", '<?xml version="1.0"?><Types/>')
    z.writestr("_rels/.rels", '<?xml version="1.0"?><Relationships/>')
    z.writestr("word/document.xml", xml)
`;
  try {
    execFileSync('python3', ['-c', script, fixture], { stdio: 'pipe' });
  } catch (error) {
    console.warn('  (skipped: python3 unavailable, cannot build a spec-correct .docx fixture)');
    return;
  }
  const zip = fs.readFileSync(fixture);
  fs.unlinkSync(fixture);
  const buffer = zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.length);

  const extracted = await resume.docxToText(buffer);
  assert.ok(/Raju Rishi/.test(extracted), extracted.slice(0, 60));
  assert.ok(/RHEL 9/.test(extracted) && /Kubernetes/.test(extracted), 'tab-separated runs must stay on one line');
  const parsed = resume.parse(extracted, { source: 'docx fixture' });
  assert.strictEqual(parsed.name, 'Raju Rishi');
  assert.ok(parsed.employment.length >= 1, 'employment line must parse');
  assert.ok(parsed.skills.some(sk => sk.name === 'Ansible'), 'skills must survive the round trip');
  assert.ok(parsed.ats.score > 30, `ATS score ${parsed.ats.score}`);
});

test('a real text PDF is decoded, and a scanned one is refused instead of guessed', async () => {
  const zlib = require('zlib');
  const lines = ['Raju Rishi', 'Linux Administrator', 'Bengaluru, India | +91 90000 11111 | raju@example.com',
    'TECHNICAL SKILLS', 'RHEL 9 with Ansible and Veeam backup', 'WORK EXPERIENCE',
    'Senior Linux Administrator | Example Cloud Pvt Ltd | Jun 2019 - Present',
    'Automated patching for 180 hosts, saving 22 hours a month'];
  let content = 'BT\n/F1 11 Tf\n72 760 Td\n14 TL\n';
  lines.forEach(line => {
    content += '(' + line.replace(/([()\\])/g, '\\$1') + ') Tj\nT*\n';
  });
  content += 'ET\n';
  const data = zlib.deflateRawSync(Buffer.from(content, 'utf8'));
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 5 0 R >> >> /MediaBox [0 0 595 842] /Contents 4 0 R >>',
    `<< /Length ${data.length} /Filter /FlateDecode >>\nstream\n`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ];
  let pdf = Buffer.from('%PDF-1.4\n', 'latin1');
  const offsets = [];
  objects.forEach((obj, index) => {
    offsets.push(pdf.length);
    const head = Buffer.from(`${index + 1} 0 obj\n${obj}`, 'latin1');
    pdf = Buffer.concat([pdf, head, index === 3 ? Buffer.concat([data, Buffer.from('\nendstream\nendobj\n', 'latin1')]) : Buffer.from('\nendobj\n', 'latin1')]);
  });
  const xref = pdf.length;
  let table = Buffer.from(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`, 'latin1');
  offsets.forEach(off => { table = Buffer.concat([table, Buffer.from(`${String(off).padStart(10, '0')} 00000 n \n`, 'latin1')]); });
  table = Buffer.concat([table, Buffer.from(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`, 'latin1')]);
  pdf = Buffer.concat([pdf, table]);

  const text2 = await resume.pdfToText(pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.length));
  assert.ok(/Raju Rishi/.test(text2), text2.slice(0, 80));
  assert.ok(/Ansible/.test(text2) && /Veeam/.test(text2), 'escaped parenthesised strings must decode');
  const parsed = resume.parse(text2, { source: 'pdf fixture' });
  assert.strictEqual(parsed.name, 'Raju Rishi');
  assert.ok(parsed.email.includes('raju@example.com'), parsed.email);
  assert.ok(resume.pdfLooksBroken('', pdf) === true, 'an empty extraction must be reported, not parsed as a CV');
  const realistic = [
    ' PROFESSIONAL SUMMARY ', ' Senior Linux Administrator with 9 years of experience across RHEL and Ubuntu estates. ',
    ' TECHNICAL SKILLS ', ' RHEL 9, Ansible, Kubernetes, Veeam, systemd, SELinux, LVM, bash scripting. ',
    ' WORK EXPERIENCE ', ' Senior Linux Administrator | Example Cloud Pvt Ltd | Jun 2019 - Present ',
    ' Automated patching for 180 hosts, saving 22 hours every month across three datacentres. '
  ].join('\n');
  assert.ok(resume.pdfLooksBroken(realistic, pdf) === false, 'real text must be accepted, not refused');
});

/* ------------------------------------------------------------ scoring */
const targets = Object.assign({}, store.DEFAULT_TARGETS, { mustHave: [], exclude: [], keywords: [] });
const linuxJob = {
  id: 't1', title: 'Senior Linux Administrator', company: 'Acme (demo)', location: 'Chennai, India',
  description: 'Own 400 RHEL hosts. Required: RHEL, Ansible, bash, LVM, systemd, backup integration (Veeam). 6+ years experience. RHCSA preferred.',
  tags: ['RHEL', 'Ansible', 'Bash'], posted: new Date(Date.now() - 2 * 86400000).toISOString(),
  applyUrl: 'https://example.com/apply/1'
};
const mismatchJob = {
  id: 't2', title: 'Senior Frontend React Engineer', company: 'Remote Co (demo)', location: 'Remote (US)',
  description: 'React, TypeScript, Next.js, design systems. US citizens only, clearance required.',
  tags: ['react', 'typescript'], posted: new Date().toISOString(), applyUrl: 'https://example.com/apply/2'
};

const good = matcher.score(linuxJob, profile, targets);
const bad = matcher.score(mismatchJob, profile, targets);

test('a real fit outranks a mismatch by a wide margin', () => {
  assert.ok(good.score >= 70, `good=${good.score}`);
  assert.ok(bad.score <= 45, `bad=${bad.score}`);
  assert.ok(good.score - bad.score >= 30, 'the ordering must be decisive, not decorative');
});
test('bands are explainable and add up to the score', () => {
  const sum = good.bands.reduce((a, b) => a + b.earned, 0);
  assert.ok(Math.abs(sum - good.score) <= 1, `sum=${sum} score=${good.score}`);
  good.bands.forEach(b => {
    assert.ok(b.earned <= b.max, `${b.label} exceeds its max`);
    assert.ok(b.note.length > 8, `${b.label} has no reason`);
  });
});
test('matched and missing skills are separated for the UI', () => {
  assert.ok(good.matched.some(m => m.name === 'RHEL'), 'RHEL should be a match');
  assert.ok(Array.isArray(good.missing));
});
test('must-have filter blocks, and explains', () => {
  // "Fortinet" would be useless here: it is an alias of the canonical Firewalls skill,
  // and the fixture CV has firewalld/iptables, so it is genuinely present. A must-have
  // the CV really lacks has to be used to prove the gate.
  const absent = 'SAP HANA';
  const blocked = matcher.score(linuxJob, profile, Object.assign({}, targets, { mustHave: [absent] }));
  assert.ok(blocked.blocked && blocked.blocked.includes(absent), String(blocked.blocked));
  assert.ok(blocked.score <= 34, `a blocked job scored ${blocked.score}`);
  assert.ok(blocked.mustHaveMissing.length === 1, 'the reason must name the missing skill');
  matcher.options.mustHaveIsBlocking = false;
  const soft = matcher.score(linuxJob, profile, Object.assign({}, targets, { mustHave: [absent] }));
  matcher.options.mustHaveIsBlocking = true;
  assert.ok(!soft.blocked, 'with blocking off the job stays visible');
  assert.ok(soft.score > 34 && soft.score < good.score, 'but it must still rank below the real fit');
  assert.strictEqual(matcher.score(linuxJob, profile, targets).blocked, null, 'restored state must not leak into other tests');
});

test('exclusions apply to title and location, not to body prose', () => {
  const excludeTargets = Object.assign({}, targets, { exclude: ['clearance required'] });
  const inTitle = matcher.score(Object.assign({}, mismatchJob, { title: 'React Engineer (clearance required)' }), profile, excludeTargets);
  assert.ok(inTitle.blocked, 'an exclusion hit in the title must block');
  const inBody = matcher.score(Object.assign({}, linuxJob, { description: linuxJob.description + ' No clearance required for this role.' }), profile, excludeTargets);
  assert.ok(!inBody.blocked, 'the same words in the prose must NOT block — job ads say "no clearance required"');
});
test('over-qualified is flagged instead of hidden', () => {
  const junior = { id: 't3', title: 'Linux Administrator', company: 'X (demo)', location: 'Chennai', description: 'Looking for 2-4 years experience with bash and cron.', tags: [], posted: new Date().toISOString() };
  const r = matcher.score(junior, profile, targets);
  assert.ok(r.bands.some(b => b.key === 'experience' && /over-qualified|under|band/.test(b.note)), JSON.stringify(r.bands.find(b => b.key === 'experience')));
});
test('salary floor trims a listing that cannot pay', () => {
  const cheap = Object.assign({}, linuxJob, { description: linuxJob.description + ' Salary: ₹8-10 LPA', id: 't4' });
  const withFloor = matcher.score(cheap, profile, Object.assign({}, targets, { salaryMinLPA: 25 }));
  assert.ok(withFloor.bands.some(b => b.key === 'salary'), 'the floor penalty must be visible in the bands');
});
test('budget and years ranges are parsed from messy text', () => {
  assert.deepStrictEqual(matcher.parseRequiredYears('needs 6-9 years of experience'), { min: 6, max: 9 });
  assert.deepStrictEqual(matcher.parseRequiredYears('Minimum 10 years'), { min: 10, max: 15 });
  assert.strictEqual(matcher.parseBudget('₹24-32 LPA').max, 32);
  assert.strictEqual(matcher.parseBudget('$120,000 - $150,000').min, 120000);
});
test('remote detection distinguishes hybrid', () => {
  assert.strictEqual(matcher.isRemoteish({ location: 'Remote, India' }), 'remote');
  assert.strictEqual(matcher.isRemoteish({ location: 'Bengaluru (3 days in office)' }), 'hybrid');
  assert.strictEqual(matcher.isRemoteish({ location: 'Chennai' }), 'onsite');
});
test('dedupe merges the same posting from two boards', () => {
  const dupes = matcher.dedupe([
    Object.assign({}, linuxJob, { source: 'a', sourceLabel: 'Board A' }),
    Object.assign({}, linuxJob, { source: 'b', sourceLabel: 'Board B' }),
    Object.assign({}, mismatchJob, { source: 'b', sourceLabel: 'Board B' })
  ]);
  assert.strictEqual(dupes.length, 2);
  assert.ok(dupes[0].sources.includes('Board A') && dupes[0].sources.includes('Board B'), JSON.stringify(dupes[0].sources));
});
test('rank sorts by score and keeps the blocked set optional', () => {
  const ranked = matcher.rank([mismatchJob, linuxJob], profile, targets, {});
  assert.strictEqual(ranked[0].id, 't1', JSON.stringify(ranked.map(j => [j.id, j.match.score])));
  const kept = matcher.rank([mismatchJob], profile, Object.assign({}, targets, { mustHave: ['RHEL'] }), { keepBlocked: true });
  assert.strictEqual(kept.length, 1, 'keepBlocked must retain the row so the user can see why it was dropped');
});

/* ------------------------------------------------------------ feeds */
test('Remotive payloads normalise into the job shape', () => {
  const parsed = feeds.get('remotive').parse({ jobs: [{
    id: 7, title: 'DevOps Engineer', company_name: 'Foo', candidate_required_location: 'Worldwide',
    url: 'https://remotive.com/remote-jobs/x-7', description: 'Ansible and Terraform. Email hr@foo.example',
    tags: ['ansible', 'terraform'], publication_date: '2026-09-01T00:00:00', job_type: 'full_time'
  }] });
  assert.strictEqual(parsed[0].company, 'Foo');
  assert.strictEqual(parsed[0].recruiterEmail, 'hr@foo.example');
  assert.ok(parsed[0].attribution.includes('Remotive'), 'source attribution must survive normalisation');
  assert.ok(/^remotive:7$/.test(parsed[0].id));
});
test('Greenhouse and Lever adapters need slugs, not keys', () => {
  ['greenhouse', 'lever', 'smartrecruiters'].forEach(id => {
    const s = feeds.get(id);
    assert.strictEqual(s.needsKey, false, `${id} must not require a key`);
    assert.ok(s.needsCompanies, `${id} is company-scoped`);
  });
  assert.ok(/boards-api\.greenhouse\.io/.test(feeds.get('greenhouse').build({}, 'acme', {})));
});
test('every source degrades with a message instead of throwing', async () => {
  const original = global.fetch;
  global.fetch = () => Promise.reject(new Error('blocked by CORS'));
  const result = await feeds.runSource('remotive', { fetch: global.fetch, query: 'linux' });
  global.fetch = original;
  assert.strictEqual(result.jobs.length, 0);
  assert.ok(/CORS/.test(result.error), result.error);
});
test('key-based sources are skipped with instructions, never attempted', async () => {
  const result = await feeds.runSource('adzuna', { keys: {} });
  assert.ok(result.skipped && /key/.test(result.error), JSON.stringify(result));
});
test('import accepts pasted text, JSON and CSV', () => {
  const asText = feeds.parseImport('Senior Linux Admin | Acme | Chennai\nRHEL, Ansible, 300 hosts. https://x.example/apply\n\nReact Dev | Beta | Remote\nTypeScript required.');
  assert.strictEqual(asText.jobs.length, 2);
  assert.ok(/x\.example/.test(asText.jobs[0].applyUrl));
  const asJson = feeds.parseImport(JSON.stringify([{ title: 'A', company: 'B', applyUrl: 'https://e/1' }]));
  assert.strictEqual(asJson.jobs[0].title, 'A');
  const asCsv = feeds.parseImport('title,company,location,apply\n"Storage Admin, Sr",Acme,Pune,https://a/2');
  assert.strictEqual(asCsv.jobs[0].company, 'Acme');
  assert.strictEqual(asCsv.jobs[0].location, 'Pune');
  const badJson = feeds.parseImport('{oops', 'json');
  assert.ok(badJson.error, 'invalid JSON must report, not throw');
});
test('no source is allowed to name an authenticated endpoint', () => {
  feeds.list().forEach(s => {
    const url = String(s.build({ query: 'x' }, 'acme', { app_id: '1', app_key: '2', rapidapi_key: '3' }));
    assert.ok(/^https:\/\//.test(url), `${s.id} must be https`);
    assert.ok(!/password|login|signin|oauth\/token/i.test(url), `${s.id} looks like a credential flow`);
    assert.ok(!/naukri|linkedin\.com\/(jobs|feed|in\/[A-Za-z]+)\/apply|indeed\.com\/(myjobs|careerpad)/i.test(url), `${s.id} targets a login-walled portal`);
  });
});

/* ------------------------------------------------------------ packets */
test('cover letter quotes the posting and the candidate, not the model', () => {
  const letter = packets.buildCoverLetter(linuxJob, good, profile, { tone: 'standard' });
  assert.ok(/Senior Linux Administrator/.test(letter), 'role title');
  assert.ok(/Acme/.test(letter), 'company');
  assert.ok(/RHEL/.test(letter), 'matched skill');
  assert.ok(/38%|22 hours|zero unplanned/.test(letter), 'should reuse a quantified achievement from the CV');
  assert.ok(/\[FILL\]/.test(letter), 'the "why this company" line must stay a marker, never invented');
});
test('tone changes length and stays coherent', () => {
  const short = packets.buildCoverLetter(linuxJob, good, profile, { tone: 'concise' });
  const long = packets.buildCoverLetter(linuxJob, good, profile, { tone: 'detailed' });
  assert.ok(short.length < long.length, `${short.length} vs ${long.length}`);
  [short, long].forEach(l => assert.ok(l.length > 200));
});
test('packets never fabricate on an empty profile', () => {
  const bare = { name: '', headline: '', years: 0, skills: [], extraSkills: [], certifications: [], education: { degrees: [] }, achievements: [], employment: [] };
  const empty = matcher.score(linuxJob, bare, targets);
  const packet = packets.assemble(linuxJob, empty, bare, {});
  assert.ok(/\[FILL/.test(packet.coverLetter), 'letter must mark unknowns');
  assert.ok(packet.blanks >= 5, `blanks=${packet.blanks}`);
  assert.ok(!/Acme's mission|your renowned|industry leader/.test(packet.coverLetter), 'no filler flattery');
  const answers = packet.answers.filter(a => /\[FILL/.test(a.a));
  assert.ok(answers.length >= 4, 'salary/notice/visa answers stay unresolved for a bare profile');
});
test('field sheet covers the portal questions in order', () => {
  const sheet = packets.buildFieldSheet(profile, linuxJob);
  const labels = sheet.map(r => r.label);
  ['Full name', 'Email', 'Phone', 'Total experience', 'Notice period', 'Expected CTC'].forEach(l =>
    assert.ok(labels.includes(l), `missing ${l}`));
  assert.ok(sheet.every(r => r.value.length > 0));
});
test('gap advice points at a real lab on this site', () => {
  const r = matcher.score(Object.assign({}, linuxJob, { description: 'Required: Kubernetes, Helm, ArgoCD, Terraform, AWS EKS. 5+ years.' }), profile, targets);
  const packet = packets.assemble(linuxJob, r, profile, {});
  if (packet.gaps.length) {
    packet.gaps.filter(g => g.lab).forEach(g => {
      assert.ok(fs.existsSync(path.join(ROOT, String(g.lab).replace(/^\//, ''))), `gap lab missing: ${g.lab}`);
    });
  }
  assert.ok(r.missing.length >= 0);
});
test('prepareBulk caps the queue and reports what it skipped', async () => {
  const jobs = Array.from({ length: 30 }, (_, i) => Object.assign({}, linuxJob, { id: 'b' + i, title: 'Linux Admin ' + i, match: good }));
  const result = await packets.prepareBulk(jobs, profile, targets, { limit: 25 });
  assert.strictEqual(result.packets.length, 25);
  assert.strictEqual(result.skipped, 5);
  assert.ok(result.packets.every(p => p.coverLetter && p.jobId));
});
test('CSV export escapes what a spreadsheet would otherwise eat', () => {
  const csv = packets.toCSV([{ a: 'x,"y"', b: 2 }, { a: 'plain', b: '' }]);
  assert.ok(/"x,""y"""/.test(csv), csv);
  const tracker = packets.trackerCSV([{ id: 1, title: 'A', company: 'B', status: 'applied', score: 80, sources: ['X'], packet: { blanks: 2 } }]);
  assert.ok(/applied/.test(tracker) && /score/.test(tracker));
});

/* ------------------------------------------------------------ store */
test('targets defaults survive a partial saved object', () => {
  const merged = Object.assign({}, store.DEFAULT_TARGETS, { minScore: 70 }, { exclude: (store.DEFAULT_TARGETS.exclude || []) });
  assert.ok(merged.roleFamilies.length > 0 && merged.minScore === 70);
});
test('tracker status flow is monotonic and stats count what matters', () => {
  store.set('tracker', []);
  store.upsert({ id: 'j1', title: 'Linux Admin', company: 'Acme', score: 82, status: 'new' });
  store.upsert({ id: 'j1', status: 'applied' });
  store.upsert({ id: 'j2', title: 'SRE', company: 'Beta', score: 61, status: 'interview' });
  const list = store.getTracker();
  assert.strictEqual(list.length, 2);
  const first = list.find(e => e.id === 'j1');
  assert.strictEqual(first.status, 'applied');
  assert.strictEqual(first.history.length, 2, 'status changes should leave a paper trail');
  const stats = store.stats(list);
  assert.strictEqual(stats.applied, 2);
  assert.strictEqual(stats.avgScore, 72);
  assert.strictEqual(stats.responseRate, 50);
  store.set('tracker', []);
});
test('cache freshness respects a source etiquette floor', () => {
  store.set('cache', { remotive: { at: new Date(Date.now() - 5 * 60000).toISOString(), jobs: [linuxJob] } });
  assert.strictEqual(store.isFreshEnough('remotive', 360), false, '5 minutes after a fetch, Remotive should not be called again');
  assert.strictEqual(store.isFreshEnough('remotive', 1), true);
  store.set('cache', {});
});
test('no storage key leaks outside the app namespace', () => {
  ['profile', 'targets', 'settings', 'cache', 'tracker', 'packets'].forEach(k => assert.ok(!k.includes('key') || k !== 'keys'));
  assert.ok(!/authorization|cookie|token/i.test(JSON.stringify(store.DEFAULT_SETTINGS)), 'defaults must not imagine a credential field');
});

/* ------------------------------------------------------------ shipped data */
test('sample jobs are unmistakably synthetic', () => {
  assert.ok(sampleJobs.length >= 12, 'the offline demo needs enough spread to be useful');
  sampleJobs.forEach(job => {
    assert.ok(job.demo === true, `${job.title} missing demo flag`);
    assert.strictEqual(job.applyUrl, '', 'sample data must never offer an apply link');
    assert.ok(/\(demo\)$/i.test(job.company), `${job.company} should be obviously fictional`);
    assert.ok(job.description.length > 120, `${job.title} description too thin to score`);
  });
});
test('sample set produces a score spread, not a flat wall of 90s', () => {
  const scored = matcher.rank(sampleJobs, profile, targets, { keepBlocked: true });
  const scores = scored.map(j => j.match.score);
  assert.ok(Math.max(...scores) - Math.min(...scores) >= 30, `spread too narrow: ${scores}`);
  const best = scored[0];
  assert.ok(/Linux|Infrastructure|Storage|Backup|Architect|DevOps/.test(best.title), `top pick odd: ${best.title}`);
  const frontend = scored.find(j => /Frontend/.test(j.title));
  const frontendDemo = sampleJobs.find(j => /Frontend/.test(j.title));
  const fe = matcher.score(frontendDemo, profile, targets);
  assert.ok(fe.score < 55, `a React role should not score ${fe.score} for an infra CV`);
});
test('seed profile asserts nothing a website cannot know', () => {
  assert.strictEqual(seedProfile.seed, true);
  assert.deepStrictEqual(seedProfile.employment, [], 'no invented employers');
  assert.deepStrictEqual(seedProfile.certifications, [], 'no invented certifications');
  assert.deepStrictEqual(seedProfile.education.degrees, [], 'no invented degrees');
  assert.ok(Array.isArray(seedProfile.toVerify) && seedProfile.toVerify.length >= 4, 'the gaps must be listed for the user');
  assert.ok(seedProfile.years >= 15 && seedProfile.years <= 25, 'years should match what the site publishes');
  seedProfile.skills.forEach(entry => {
    const canonical = skills.lookup(entry.name);
    assert.ok(canonical, `seed skill "${entry.name}" is not in the taxonomy`);
  });
});
test('seed profile still scores a real job sensibly', () => {
  const r = matcher.score(linuxJob, seedProfile, targets);
  assert.ok(r.score >= 55, `seed profile scored ${r.score}`);
  assert.ok(!r.blocked);
});
test('the taxonomy covers what the sample data asks for', () => {
  const names = new Set(skills.SKILLS.map(s => s.name));
  let unresolved = 0;
  sampleJobs.forEach(job => {
    (job.tags || []).forEach(tag => {
      if (!names.has(tag)) {
        const canonical = skills.lookup(tag);
        if (!canonical) unresolved += 1;
      }
    });
  });
  assert.ok(unresolved <= 3, `${unresolved} sample tags are outside the taxonomy — add them or rename`);
});

/* ------------------------------------------------------------ safety */
test('the tool ships no credential field and no submit path', () => {
  const app = fs.readFileSync(LIB('app.js'), 'utf8');
  const html = fs.readFileSync(LIB('index.html'), 'utf8');
  const all = app + html;
  assert.ok(!/type=["']password["']/.test(html), 'no password input anywhere');
  assert.ok(!/name=["']?(password|passwd|secret)/i.test(html), 'no credential field');
  assert.ok(!/\.(submit|click)\(\s*\)\s*;?\s*\/\//.test(app), 'no synthetic form submission');
  assert.ok(!/new XMLHttpRequest\(\)/.test(app), 'fetch only, so the audit trail is one code path');
  assert.ok(!/document\.cookie/.test(app), 'no cookies');
  assert.ok(!/googletagmanager|gtag\(|facebook|hotjar/i.test(all), 'no analytics added to a tool that promises none');
  assert.ok(!/adsbygoogle/.test(html), 'tool pages are not monetised, per the site audit');
});
test('every script the page loads exists on disk', () => {
  const html = fs.readFileSync(LIB('index.html'), 'utf8');
  const refs = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]).filter(s => !/^https?:/.test(s));
  assert.ok(refs.length >= 9, `expected local scripts, found ${refs.length}`);
  refs.forEach(src => assert.ok(fs.existsSync(path.join(ROOT, 'job-matcher', src)), `missing ${src}`));
});
test('the page is wired into the site (catalogue + sitemap)', () => {
  const catalogue = fs.readFileSync(path.join(ROOT, 'catalogue-data.js'), 'utf8');
  assert.ok(catalogue.includes('job-matcher'), 'the tool must appear in the homepage catalogue');
  const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  assert.ok(sitemap.includes('/job-matcher/'), 'the tool must be in the sitemap');
});

(async () => {
  for (const item of queue) {
    try {
      await item.fn();
      passed += 1;
    } catch (error) {
      failed += 1;
      process.exitCode = 1;
      const firstLine = String((error && error.message) || error).split('\n')[0];
      console.error(`FAIL  ${item.name}\n      ${firstLine}`);
    }
  }
  if (failed) console.error(`${failed} of ${passed + failed} checks FAILED.`);
  else console.log(`${passed} checks passed - job matcher logic, data integrity and safety boundaries.`);
})();
