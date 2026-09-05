/* ==========================================================================
   RCW IT Training · Microsoft Defender lab series
   Lab 2 — Defender for Endpoint: device containment, live response, TVM
   All data in this file is synthetic. No tenant, API or credential.
   ========================================================================== */
(function () {
  'use strict';

  var NOW = '2026-08-21T10:00:00Z';
  var HASH = 'f3a4c2d18b7e4a0c9d55e1b0a6c4f2d9e8b71a3c';

  /* --------------------------------------------------- simulated schema */
  var TABLES = {
    DeviceFileEvents: [
      { Timestamp: '2026-08-21 08:09:11Z', DeviceName: 'FIN-WKS-0777', FileName: 'invoice_88216.xlsx.exe', FolderPath: 'c:/users/fin.clerk/downloads', SHA1: HASH, SHA256: 'a91f4c02d7b34e19f0aa2c5d61e93b77f4a10c2255de8301bb9c47ef2a10d3c5', ActionType: 'FileCreated', InitiatingProcessFileName: 'outlook.exe', ReportId: 'ff-4101' },
      { Timestamp: '2026-08-21 08:11:02Z', DeviceName: 'FIN-WKS-0777', FileName: 'svch0st.exe', FolderPath: 'c:/users/fin.clerk/appdata/local/temp', SHA1: '11aa22bb33cc44dd55ee66ff77aa88bb99cc00dd', SHA256: 'b2c4…', ActionType: 'FileCreated', InitiatingProcessFileName: 'invoice_88216.xlsx.exe', ReportId: 'ff-4102' },
      { Timestamp: '2026-08-21 09:02:40Z', DeviceName: 'FIN-WKS-0777', FileName: 'stage.cab', FolderPath: 'c:/perflogs', SHA1: '', SHA256: '', ActionType: 'FileCreated', InitiatingProcessFileName: 'svch0st.exe', ReportId: 'ff-4109' },
      { Timestamp: '2026-08-21 07:55:02Z', DeviceName: 'FIN-WKS-0421', FileName: 'invoice_88190.xlsx.exe', FolderPath: 'c:/users/fin.manager/downloads', SHA1: HASH, SHA256: 'a91f4c02d7b34e19f0aa2c5d61e93b77f4a10c2255de8301bb9c47ef2a10d3c5', ActionType: 'FileCreated', InitiatingProcessFileName: 'winword.exe', ReportId: 'ff-4088' },
      { Timestamp: '2026-08-20 18:41:20Z', DeviceName: 'FIN-WKS-0342', FileName: 'upd.exe', FolderPath: 'c:/programdata/upd', SHA1: HASH, SHA256: 'a91f4c02d7b34e19f0aa2c5d61e93b77f4a10c2255de8301bb9c47ef2a10d3c5', ActionType: 'FileCreated', InitiatingProcessFileName: 'excel.exe', ReportId: 'ff-4021' },
      { Timestamp: '2026-08-21 09:02:00Z', DeviceName: 'HR-WKS-0110', FileName: 'invoice_88001.xlsx.exe', FolderPath: 'c:/users/hr.assistant/downloads', SHA1: '99aa88bb77cc66dd55ee44ff33aa22bb11cc00dd', SHA256: 'c3d5…', ActionType: 'FileCreated', InitiatingProcessFileName: 'outlook.exe', ReportId: 'ff-4110' },
      { Timestamp: '2026-07-02 11:00:00Z', DeviceName: 'PAY-SRV-0007', FileName: 'old_loader.exe', FolderPath: 'c:/windows/temp', SHA1: HASH, SHA256: 'a91f4c02d7b34e19f0aa2c5d61e93b77f4a10c2255de8301bb9c47ef2a10d3c5', ActionType: 'FileCreated', InitiatingProcessFileName: 'powershell.exe', ReportId: 'ff-2201' }
    ],
    DeviceProcessEvents: [
      { Timestamp: '2026-08-21 08:07:20Z', DeviceName: 'FIN-WKS-0777', FileName: 'msedge.exe', InitiatingProcessFileName: 'outlook.exe', InitiatingProcessCommandLine: 'msedge.exe --embedded-webview', FolderPath: 'c:/program files (x86)/microsoft/edge/application', SHA1: 'ed01', ReportId: 'pp-5001' },
      { Timestamp: '2026-08-21 08:11:04Z', DeviceName: 'FIN-WKS-0777', FileName: 'svch0st.exe', InitiatingProcessFileName: 'invoice_88216.xlsx.exe', InitiatingProcessCommandLine: 'svch0st.exe -s', FolderPath: 'c:/users/fin.clerk/appdata/local/temp', SHA1: '11aa22bb33cc44dd55ee66ff77aa88bb99cc00dd', ReportId: 'pp-5002' },
      { Timestamp: '2026-08-21 07:56:10Z', DeviceName: 'FIN-WKS-0421', FileName: 'svch0st.exe', InitiatingProcessFileName: 'invoice_88190.xlsx.exe', InitiatingProcessCommandLine: 'svch0st.exe -s', FolderPath: 'c:/users/fin.manager/appdata/local/temp', SHA1: '11aa22bb33cc44dd55ee66ff77aa88bb99cc00dd', ReportId: 'pp-5011' },
      { Timestamp: '2026-08-20 18:42:00Z', DeviceName: 'FIN-WKS-0342', FileName: 'upd.exe', InitiatingProcessFileName: 'explorer.exe', InitiatingProcessCommandLine: 'upd.exe --loop', FolderPath: 'c:/programdata/upd', SHA1: HASH, ReportId: 'pp-5021' },
      { Timestamp: '2026-08-21 08:22:00Z', DeviceName: 'HR-WKS-0110', FileName: 'mshta.exe', InitiatingProcessFileName: 'winword.exe', InitiatingProcessCommandLine: 'mshta.exe javascript:eval(…)', FolderPath: 'c:/windows/system32', SHA1: '9f8e', ReportId: 'pp-5040' }
    ],
    DeviceRegistryEvents: [
      { Timestamp: '2026-08-21 08:14:02Z', DeviceName: 'FIN-WKS-0777', ActionType: 'ValueSet', RegistryKey: 'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', RegistryValueName: 'WindowsUpdateSvc', RegistryValueData: 'C:\\Users\\fin.clerk\\AppData\\Local\\Temp\\svch0st.exe', InitiatingProcessFileName: 'svch0st.exe', ReportId: 'rr-6001' },
      { Timestamp: '2026-08-21 07:58:44Z', DeviceName: 'FIN-WKS-0421', ActionType: 'ValueSet', RegistryKey: 'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', RegistryValueName: 'WindowsUpdateSvc', RegistryValueData: 'C:\\Users\\fin.manager\\AppData\\Local\\Temp\\svch0st.exe', InitiatingProcessFileName: 'svch0st.exe', ReportId: 'rr-6011' },
      { Timestamp: '2026-08-20 18:43:10Z', DeviceName: 'FIN-WKS-0342', ActionType: 'ValueSet', RegistryKey: 'HKEY_LOCAL_MACHINE\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', RegistryValueName: 'UpdaterSvc', RegistryValueData: 'C:\\ProgramData\\upd\\upd.exe', InitiatingProcessFileName: 'upd.exe', ReportId: 'rr-6021' },
      { Timestamp: '2026-08-19 14:02:00Z', DeviceName: 'HR-WKS-0110', ActionType: 'ValueSet', RegistryKey: 'HKEY_CURRENT_USER\\Software\\Microsoft\\Office\\Common\\Security', RegistryValueName: 'BlockContentExpiration', RegistryValueData: '1', InitiatingProcessFileName: 'winword.exe', ReportId: 'rr-5990' }
    ],
    DeviceNetworkEvents: [
      { Timestamp: '2026-08-21 08:11:30Z', DeviceName: 'FIN-WKS-0777', RemoteIP: '203.0.113.64', RemotePort: 443, RemoteUrl: 'login-contoso.secure-mail.example', ActionType: 'ConnectionSuccess', InitiatingProcessFileName: 'svch0st.exe', BytesSent: 14021, BytesReceived: 2611 },
      { Timestamp: '2026-08-21 08:19:02Z', DeviceName: 'FIN-WKS-0777', RemoteIP: '203.0.113.64', RemotePort: 443, RemoteUrl: 'login-contoso.secure-mail.example', ActionType: 'ConnectionSuccess', InitiatingProcessFileName: 'svch0st.exe', BytesSent: 9887140, BytesReceived: 402 },
      { Timestamp: '2026-08-21 09:38:10Z', DeviceName: 'FIN-WKS-0777', RemoteIP: '203.0.113.64', RemotePort: 443, RemoteUrl: 'login-contoso.secure-mail.example', ActionType: 'ConnectionFailed', InitiatingProcessFileName: 'svch0st.exe', BytesSent: 0, BytesReceived: 0 },
      { Timestamp: '2026-08-21 08:41:00Z', DeviceName: 'FIN-WKS-0777', RemoteIP: '10.20.4.19', RemotePort: 3389, RemoteUrl: '', ActionType: 'ConnectionSuccess', InitiatingProcessFileName: 'svchost.exe', BytesSent: 2200, BytesReceived: 198000 },
      { Timestamp: '2026-08-21 07:57:12Z', DeviceName: 'FIN-WKS-0421', RemoteIP: '203.0.113.64', RemotePort: 443, RemoteUrl: 'login-contoso.secure-mail.example', ActionType: 'ConnectionSuccess', InitiatingProcessFileName: 'svch0st.exe', BytesSent: 13004, BytesReceived: 2200 }
    ]
  };

  var SCHEMA = [
    { table: 'DeviceFileEvents', desc: 'File creation, copying, renaming and deletion observed by the sensor.', cols: ['Timestamp', 'DeviceName', 'FileName', 'FolderPath', 'SHA1', 'SHA256', 'ActionType', 'InitiatingProcessFileName', 'ReportId'] },
    { table: 'DeviceProcessEvents', desc: 'Process start, execution and image-load events.', cols: ['Timestamp', 'DeviceName', 'FileName', 'FolderPath', 'InitiatingProcessFileName', 'InitiatingProcessCommandLine', 'SHA1', 'ReportId'] },
    { table: 'DeviceRegistryEvents', desc: 'Key and value create/set/delete events — persistence lives here.', cols: ['Timestamp', 'DeviceName', 'ActionType', 'RegistryKey', 'RegistryValueName', 'RegistryValueData', 'InitiatingProcessFileName'] },
    { table: 'DeviceNetworkEvents', desc: 'Per-process outbound and inbound connections.', cols: ['Timestamp', 'DeviceName', 'RemoteIP', 'RemotePort', 'RemoteUrl', 'ActionType', 'InitiatingProcessFileName', 'BytesSent', 'BytesReceived'] }
  ];

  var EVIDENCE_VERBS = ['collect-investigation-package', 'get-file', 'list-processes', 'run-av-scan'];
  var DESTRUCTIVE = ['remove-item', 'stop-process', 'run-binary'];

  /* -------------------------------------------------------------- config */
  window.RCWLab.init({
    labId: 'defender-endpoint-containment',
    title: 'Microsoft Defender for Endpoint · containment, live response and vulnerability remediation',
    now: NOW,
    complianceHref: '../microsoft-defender-labs/compliance-standards.html',
    kqlTables: TABLES,
    controls: [
      { id: 'timeline', control: 'NIST SP 800-61r3 §3.2 · detection & analysis', evidence: 'Findings stated only where the timeline supports them' },
      { id: 'hunt', control: 'Coverage validation', evidence: 'Bounded hash-based hunt over four endpoint tables' },
      { id: 'lr', control: 'Evidence handling & change control', evidence: 'Collection before mutation; approval recorded before destructive verbs' },
      { id: 'isolate', control: 'Business continuity during response', evidence: 'Smallest reversible disruption, user notified, rollback owner named' },
      { id: 'tvm', control: 'ISO/IEC 27001:2022 A.8.8 · management of vulnerabilities', evidence: 'Risk-ordered remediation plus an exception with owner, expiry and compensating control' },
      { id: 'verify', control: 'NIST SP 800-61r3 §3.4 · recovery', evidence: 'Re-scan, sensor health, peer devices, custody note, residual risk stated' }
    ],
    shell: {
      brand: 'Microsoft Defender portal',
      brandSuffix: 'console replica · Lab 2 of 5',
      tenant: 'contoso-rcw.example · simulated tenant',
      account: 'Arjun Nair',
      accountRole: 'Endpoint engineering · simulated role',
      navTitle: 'Defender portal',
      nav: [
        { section: 'Home', open: true, items: [{ route: 'overview', label: 'Home · lab briefing', icon: '⌂' }] },
        { section: 'Assets', open: true, items: [
          { route: 'scope', label: 'Devices · FIN-WKS-0777', icon: '▣', objective: 'scope' },
          { route: 'timeline', label: 'Device timeline', icon: '☰', objective: 'timeline' },
          { plain: true, label: 'Software discovery' }
        ] },
        { section: 'Investigation & response', open: true, items: [
          { route: 'hunt', label: 'Advanced hunting', icon: '⌕', objective: 'hunt' },
          { route: 'liveresp', label: 'Live response', icon: '>', objective: 'lr' },
          { route: 'schema', label: 'Schema', icon: '⛃' }
        ] },
        { section: 'Response actions', open: true, items: [
          { route: 'isolate', label: 'Isolate / contain device', icon: '⊘', objective: 'isolate' },
          { plain: true, label: 'Action center' }
        ] },
        { section: 'Exposure management', open: true, items: [
          { route: 'tvm', label: 'Vulnerability recommendations', icon: '⚠', objective: 'tvm' }
        ] },
        { section: 'Closure', open: true, items: [
          { route: 'verify', label: 'Verification & closure', icon: '✓', objective: 'verify' }
        ] },
        { section: 'Not part of this lab', open: false, items: [
          { plain: true, label: 'Identities' }, { plain: true, label: 'Email & collaboration' },
          { plain: true, label: 'Cloud apps' }, { plain: true, label: 'Microsoft Sentinel' }, { plain: true, label: 'Reports' }
        ] },
        { section: 'Reference', open: true, items: [{ route: 'guide', label: 'Lab guide & marking', icon: '?' }] }
      ]
    },

    objectives: [
      { id: 'scope', view: 'scope', points: 10, title: 'Scope and asset context', navLabel: 'Scope & asset context',
        capture: ['devPick', 'dataClass', 'impact', 'devTags'],
        checks: [
          { check: 'equals', id: 'devPick', value: 'FIN-WKS-0777', message: 'FIN-WKS-0777 is the host with three open alerts, a healthy sensor and a live session. PAY-SRV-0007 has an alert but is an HVA in the payroll path with conditional launch applied; OPS-SRV-0102 has no onboarding, so nothing you click there will work.' },
          { check: 'equals', id: 'dataClass', value: 'o2', message: 'The staged archive came from the payroll export directory: this endpoint holds confidential finance data. Say so, because it decides the notification and the legal clock later.' },
          { check: 'equals', id: 'impact', value: 'o2', message: 'Be honest about impact. One clerk stops working and month-end slips a day — that sentence is what makes the isolation decision defensible afterwards.' },
          { check: 'allChecked', ids: ['sA', 'sB', 'sC'], message: 'All three scope statements matter: enforcement mode, the audit-mode ASR rules, and the promise not to reimage inside a triage.' },
          { check: 'minLength', id: 'devTags', n: 8, message: 'Add at least one real tag (8 characters minimum) so the device is findable by the next analyst.' },
          { check: 'forbids', id: 'devTags', words: ['@', 'fin.clerk'], message: 'Tags are a searchable index, not a place for personal identity. Use a role or a campaign name.' }
        ] },

      { id: 'timeline', view: 'timeline', points: 15, title: 'Device timeline and process-tree reading', navLabel: 'Timeline & process tree',
        requires: ['scope'], capture: ['pivot2', 'shouldBlock', 'tlNote'],
        checks: [
          { check: 'exactly', ids: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6'], on: ['e1', 'e2', 'e3', 'e5'],
            message: 'Four statements are supported: mail-client webview delivery, audit-mode enforcement, HKCU Run persistence, staging plus self-deletion. The 08:41 RDP session is a documented maintenance window and the mshta.exe event belongs to HR-WKS-0110 — asserting either is a fabricated finding.' },
          { check: 'equals', id: 'pivot2', value: 'o1', message: 'The registry value name WindowsUpdateSvc is the second pivot: it survives renaming of the file, unlike the file name, and it is not device-specific like the host name.' },
          { check: 'equals', id: 'shouldBlock', value: 'o2', message: 'Detection fired but enforcement was audit/EDR-block-off. Either ASR rule in block mode would have stopped execution — that is the control gap, not a product failure.' },
          { check: 'minLength', id: 'tlNote', n: 140, message: 'Write the chain, not a feeling: 140 characters minimum for an evidence-grade timeline note.' },
          { check: 'containsAll', id: 'tlNote', words: ['svch0st'], message: 'Name the executing artefact (svch0st.exe) in the note so a reviewer can match it to the alert without opening the timeline.' },
          { check: 'forbids', id: 'tlNote', words: ['@'], message: 'No addresses in timeline notes. Reference accounts by name or role.' }
        ] },

      { id: 'hunt', view: 'hunt', points: 15, title: 'Blast radius by hash, in a bounded window', navLabel: 'Blast radius (KQL)',
        requires: ['timeline'],
        checks: [
          { check: 'kql', editor: 'devQuery', table: 'DeviceFileEvents', exactRows: 3, requireTimeWindow: true,
            forbids: ['| take', '1 == 1', '1==1'], requiresOperators: ['where', 'summarize'],
            message: 'The query must run on DeviceFileEvents, bound Timestamp, filter on the loader SHA-1 and summarize by DeviceName — returning exactly three devices. The 2026-07-02 hit on PAY-SRV-0007 must fall outside the window, and HR-WKS-0110 must not appear because its file name looks similar but the hash differs.' },
          { check: 'equals', id: 'scopeCount', value: 'o2', message: 'Your own result returned three devices, all in FIN-WKS. Do not answer 118 because the group is called FIN-WKS — that is the assumption this objective is designed to catch.' },
          { check: 'equals', id: 'nextStep', value: 'o1', message: 'Scan the three hosts and move the audit-mode ASR rules to block for the affected group. Waiting for definitions is not remediation, and a tenant-wide reimage is not proportionate.' },
          { check: 'minLength', id: 'whyHash', n: 80, message: 'Explain in at least 80 characters why the hash beats the file name as a pivot.' },
          { check: 'containsAll', id: 'whyHash', words: ['renam'], message: 'The core reason: the file name was changed on at least one host (upd.exe, invoice_88190.xlsx.exe), so a name-based hunt under-reports. Say that.' }
        ] },

      { id: 'lr', view: 'liveresp', points: 20, title: 'Live response session with evidence-first sequencing', navLabel: 'Live response',
        requires: ['hunt'], capture: ['lrBinary', 'lrPreserve', 'lrNote'],
        checks: [
          { check: 'custom', fn: function (api) {
              var cmds = api.state.answers['lr.cmds'] || [];
              return cmds.indexOf('collect-investigation-package') >= 0 &&
                     cmds.some(function (c) { return c.indexOf('get-file') === 0; }) &&
                     cmds.indexOf('run-av-scan') >= 0;
            }, message: 'Run at least three things in the console: collect-investigation-package, get-file on the loader path, and run-av-scan. Reading about them is not the objective.' },
          { check: 'custom', fn: function (api) {
              var cmds = api.state.answers['lr.cmds'] || [];
              var firstDestructive = -1, firstEvidence = -1;
              for (var i = 0; i < cmds.length; i++) {
                var head = cmds[i].split(' ')[0];
                if (firstDestructive < 0 && DESTRUCTIVE.indexOf(head) >= 0) firstDestructive = i;
                if (firstEvidence < 0 && EVIDENCE_VERBS.indexOf(head) >= 0) firstEvidence = i;
              }
              return firstDestructive < 0 || (firstEvidence >= 0 && firstDestructive > firstEvidence);
            }, message: 'Something was removed, killed or downloaded before the first collection command in this session. On a live sensor that is unrecoverable: collect first, then mutate.' },
          { check: 'mustNotHaveFlag', flag: 'lr-unapproved', message: 'A destructive verb was refused because no approval was recorded. Record the change reference and approver, then re-run it — the flag stays with this objective until the session is reset and repeated correctly.' },
          { check: 'mustNotHaveFlag', flag: 'lr-unapproved-binary', message: 'You attempted to pull an unapproved binary into the session. That is recorded as a control violation; refuse it in the form and reset the session.' },
          { check: 'equals', id: 'lrBinary', value: 'o1', message: 'The correct answer is refusal. A compromised box is not a licence to install a tool you have not been approved to run; forensic work belongs in an approved environment.' },
          { check: 'equals', id: 'lrPreserve', value: 'o1', message: 'Copy it off-box, record the hash, leave the live file until the package is verified. Deleting to “stop the beacon” destroys the only copy of the payload in the tenant.' },
          { check: 'allChecked', ids: ['hA', 'hB', 'hC', 'hD'], message: 'Tick only the four conditions you actually satisfied. hD is the discipline check: the 08:41 RDP session is a documented maintenance window, not something to unwind during an IR.' },
          { check: 'minLength', id: 'lrNote', n: 120, message: 'Write the note the evidence folder needs: 120 characters minimum.' },
          { check: 'containsAll', id: 'lrNote', words: ['hash'], message: 'Record the hash in the note — an artefact without a fingerprint is not evidence.' },
          { check: 'forbids', id: 'lrNote', words: ['@'], message: 'No addresses in the live-response note.' }
        ],
        evidence: ['Simulated sensor session: collection before mutation, approval recorded'] },

      { id: 'isolate', view: 'isolate', points: 10, title: 'Isolation versus containment', navLabel: 'Isolation decision',
        requires: ['lr'], capture: ['isoAction', 'isoWhy', 'isoNote'],
        checks: [
          { check: 'equals', id: 'isoAction', value: 'o1', message: 'Isolate. The user needs the machine to stay usable for the investigation window, evidence must remain on disk, and containment would also stop local execution — which is what an IR reviewer least wants at 09:50.' },
          { check: 'equals', id: 'isoWhy', value: 'o1', message: 'Isolation blocks network except the sensor and the portal, and is reversible from the same control. Containment is for hardware with no business dependency.' },
          { check: 'equals', id: 'isoNote', value: 'o1', message: 'Notify the user with a contact and an expected duration. Surprise isolation generates a help-desk ticket that competes with your incident.' },
          { check: 'allChecked', ids: ['pA', 'pB', 'pC', 'pD'], message: 'All four pre-flight conditions: package collected, reversible action, help desk informed, rollback owner and window recorded.' },
          { check: 'custom', fn: function (api) {
              var cmds = api.state.answers['lr.cmds'] || [];
              return cmds.indexOf('collect-investigation-package') >= 0;
            }, message: 'Your live-response history does not contain collect-investigation-package, so the first pre-flight box is not true. Go back and collect it.' }
        ] },

      { id: 'tvm', view: 'tvm', points: 15, title: 'Vulnerability remediation and a governed exception', navLabel: 'Vulnerability remediation',
        requires: ['isolate'], capture: ['tvmMethod', 'tvmRec5', 'excExpiry', 'excJust'],
        checks: [
          { check: 'rowSelection', selector: '#tvmRecs', ids: ['REC-2', 'REC-4'],
            message: 'Fix exactly the two rows this incident proves: the ASR rule set to block (REC-2) and EDR in block mode (REC-4). The Edge and Office patches matter, but they are not what let this payload run; deferring them with a plan is correct, silently skipping them is not.' },
          { check: 'equals', id: 'tvmMethod', value: 'o1', message: 'Assign the built-in remediation package or the configuration policy to the affected group and monitor from the recommendation page. “Email the users” is not a remediation method.' },
          { check: 'equals', id: 'tvmRec5', value: 'o1', message: 'REC-5 needs an exception with owner, compensating control and expiry because the payroll tooling genuinely requires local admin today. Marking it remediated is a data-quality defect that an auditor will find.' },
          { check: 'custom', fn: function (api) {
              var v = api.txt('excExpiry'), m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
              if (!m) return false;
              var d = Date.UTC(+m[1], +m[2] - 1, +m[3]);
              if (isNaN(d)) return false;
              var days = (d - Date.parse(NOW)) / 86400000;
              return days > 0 && days <= 90;
            }, message: 'Enter the expiry as YYYY-MM-DD, at least one day out and no more than 90 days from the simulated incident date (2026-08-21). An open-ended exception is not an exception.' },
          { check: 'minLength', id: 'excJust', n: 60, message: 'A compensating control needs a real sentence: 60 characters minimum.' },
          { check: 'containsAll', id: 'excJust', words: ['compensat'], message: 'State the compensating control explicitly (the word “compensating” plus what you are doing instead).' },
          { check: 'forbids', id: 'excJust', words: ['@'], message: 'No addresses in exception justifications — they are exported into audit packs.' },
          { check: 'allChecked', ids: ['kA', 'kB', 'kC'], message: 'Pilot first, rollback written before assignment, and the exception reviewed by someone who did not request it.' }
        ] },

      { id: 'verify', view: 'verify', points: 15, title: 'Verification and closure of the device work', navLabel: 'Verification & closure',
        requires: ['tvm'], capture: ['unisolate', 'residual', 'vfNote'],
        checks: [
          { check: 'equals', id: 'unisolate', value: 'o1', message: 'Reverse isolation only when the second scan is clean, the persistence value is gone and the policy has actually applied — otherwise you have re-connected the compromise.' },
          { check: 'equals', id: 'residual', value: 'o1', message: 'Residual risk is not zero: a rebuild is still recommended and the local-admin exception is open. “None, the scan was clean” is the answer this lab exists to wean you off.' },
          { check: 'allChecked', ids: ['vA', 'vB', 'vC', 'vD', 'vE'], message: 'Five verification items: re-scan plus file re-check, sensor health, the two other devices explained, custody of the package, help-desk linkage.' },
          { check: 'minLength', id: 'vfNote', n: 200, message: 'A closure note under 200 characters will not survive a sample review a quarter later.' },
          { check: 'containsAll', id: 'vfNote', words: ['scan', 'persist', 'exception'], message: 'The note must record the re-scan result, the persistence state and the open exception — those are the three things a reviewer checks against the evidence pack.' },
          { check: 'forbids', id: 'vfNote', words: ['@'], message: 'No addresses in the closure note.' }
        ],
        evidence: ['Device returned to service on a written verification basis'] }
    ],

    onReady: function (api) {
      var host = api.$('#schemaList');
      if (host) {
        host.innerHTML = SCHEMA.map(function (t) {
          return '<div class="tbl" role="treeitem" tabindex="0" data-tbl="' + t.table + '" title="' + api.esc(t.desc) + '"><b>' + t.table + '</b><span class="cnt">' + (TABLES[t.table] || []).length + ' rows</span></div>' +
            '<div class="cols" role="group" aria-label="Columns of ' + t.table + '">' + t.cols.map(function (c) {
              return '<button type="button" data-kql-insert="' + c + '" title="Insert column ' + c + '">' + c + '</button>';
            }).join('') + '</div>';
        }).join('');
      }
      api.mountKql({ editor: 'devQuery', results: 'huntResults', meta: 'huntMeta', error: 'huntError', run: 'huntRun', clear: 'huntClear', format: 'huntFormat', exportCsv: 'huntExport', label: 'hash blast-radius hunt', maxRows: 50, tables: TABLES });

      /* ---- simulated live-response console ---- */
      var out = api.$('#lrOut'), input = api.$('#lrCmd');
      var hist = function () { return api.state.answers['lr.cmds'] || []; };
      var log = function () { return api.state.answers['lr.log'] || []; };
      function paint(extra) {
        if (!out) return;
        var rows = log().map(function (l) {
          return '<div class="lr-line' + (l.tone ? ' lr-' + l.tone : '') + '"><span class="lr-p">' + api.esc(l.in) + '</span><span class="lr-o">' + api.esc(l.out) + '</span></div>';
        });
        if (extra) rows.push('<div class="lr-line lr-warn"><span class="lr-p"> </span><span class="lr-o">' + api.esc(extra) + '</span></div>');
        out.innerHTML = rows.join('') || 'FIN-WKS-0777&gt; session requested. Type help for the accepted verbs.';
        out.scrollTop = out.scrollHeight;
      }
      function push(cmd, resp, tone) {
        var l = log().slice(); l.push({ in: cmd, out: resp, tone: tone || '' });
        api.state.answers['lr.log'] = l;
        if (cmd && cmd !== 'help' && cmd !== 'history' && cmd.indexOf('reset') !== 0) {
          var c = hist().slice(); c.push(cmd); api.state.answers['lr.cmds'] = c;
        }
        api.save(); paint();
      }
      function approved() { return api.state.answers['lr.approved'] === true; }
      function run() {
        if (!input) return;
        var raw = String(input.value || '').trim();
        if (!raw) { paint('Type a command first. help lists what this sensor accepts.'); input.focus(); return; }
        var head = raw.split(' ')[0].toLowerCase();
        var rest = raw.slice(head.length).trim();
        input.value = '';
        if (head === 'help') { push(raw, 'accepted: help · collect-investigation-package · get-file <path> · list-processes · run-av-scan · remove-item <path> · stop-process --pid <n> · run-binary <url> · history', 'info'); return; }
        if (head === 'history') { push(raw, hist().length ? hist().join(' | ') : 'nothing executed yet'); return; }
        if (head === 'collect-investigation-package') { push(raw, 'queued → 38 MB package retrieved at 09:52 (2 GB free, link unmetered). Hash recorded.'); api.state.answers['lr.pkg'] = true; api.save(); return; }
        if (head === 'list-processes') { push(raw, 'pid 8502 svch0st.exe (suspicious path) · pid 8444 invoice_88216.xlsx.exe (deleted) · 214 further rows'); return; }
        if (head === 'get-file') {
          if (!rest) { push(raw, 'usage: get-file <absolute path> — a bare get-file does nothing', 'warn'); return; }
          push(raw, 'copied 1.4 MB from ' + rest + ' · SHA-1 ' + HASH + ' · original left in place', 'ok');
          api.state.answers['lr.getFile'] = rest; api.save(); return;
        }
        if (head === 'run-av-scan') { push(raw, 'full scan finished · 2 items detected, 1 cleaned, 1 pending reboot · results are in the Action center, read them'); api.state.answers['lr.scan'] = true; api.save(); return; }
        if (head === 'remove-item' || head === 'stop-process') {
          if (!approved()) { push(raw, 'REFUSED: this action requires a recorded approval for the session', 'error'); api.flag('lr-unapproved', 'ran ' + head + ' with no approval recorded'); return; }
          var evSeen = hist().some(function (c) { return EVIDENCE_VERBS.indexOf(c.split(' ')[0]) >= 0; });
          if (!evSeen) { push(raw, 'REFUSED: no evidence collected yet — this sensor will not let you mutate a live path first', 'error'); return; }
          push(raw, head === 'remove-item' ? 'item removed from ' + (rest || 'the given path') + ' · still present inside the collected package' : 'process stopped · parent chain untouched', 'warn');
          return;
        }
        if (head === 'run-binary') { push(raw, 'REFUSED: unsigned remote binary — blocked by policy and reported', 'error'); api.flag('lr-unapproved-binary', 'attempted to run an unapproved remote binary in a live-response session'); return; }
        push(raw, 'verb not supported by this simulated sensor — type help', 'warn');
      }
      if (input) {
        input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); run(); } });
        input.setAttribute('data-restore', 'lr-input');
      }
      var rb = api.$('#lrRun'); if (rb) rb.addEventListener('click', run);
      var hb = api.$('#lrHistory'); if (hb) hb.addEventListener('click', function () { push('history', hist().length ? hist().join(' | ') : 'nothing executed yet'); });
      var rs = api.$('#lrReset'); if (rs) rs.addEventListener('click', function () {
        api.state.answers['lr.cmds'] = []; api.state.answers['lr.log'] = []; api.state.answers['lr.approved'] = false;
        delete api.state.answers['lr.pkg']; delete api.state.answers['lr.scan'];
        api.clearFlag('lr-unapproved'); api.clearFlag('lr-unapproved-binary'); api.save(); paint('Session reset. Approval must be recorded again.');
        var st = api.$('#lrApproveState'); if (st) st.textContent = 'No approval recorded — remove-item, stop-process and run-binary will be refused and flagged.';
        api.log('Live response', 'Session reset (simulated sensor)', 'info');
      });
      var ab = api.$('#lrApprove'); if (ab) ab.addEventListener('click', function () {
        var cref = api.txt('lrChange'), who = api.txt('lrApprover');
        if (cref.length < 6 || who.length < 3) { api.toast('Approval incomplete', 'A change reference of at least 6 characters and an approver role are required.', 'warn'); return; }
        api.state.answers['lr.approved'] = true; api.save();
        var st = api.$('#lrApproveState'); if (st) st.textContent = 'Approval recorded for this session: ' + cref + ' · approver ' + who;
        paint('approval recorded — destructive verbs now permitted, provided evidence exists');
        api.log('Approval', 'Live-response destructive actions authorised under ' + api.redact(cref), 'done');
      });
      var chip = api.$('#lrState');
      if (chip) { chip.textContent = hist().length ? 'Session: ' + hist().length + ' command(s) run' : 'Session: not started'; }
      if (api.state.learner) { var ln = api.$('#learnerName'); if (ln) ln.value = api.state.learner; }
      api.toast('Lab ready', 'Objective 1 is on the Home page. Start with the inventory, not with the isolation button.', 'ok');
      paint();
    },

    afterObjective: function (api, id) {
      var chip = api.$('#lrState');
      if (chip && id === 'lr') { var n = (api.state.answers['lr.cmds'] || []).length; chip.textContent = 'Session: closed · ' + n + ' command(s)'; }
      if (id === 'scope') api.toast('Scope set', 'Now read the timeline. Two of the nine rows are decoys on purpose.', 'ok');
      if (id === 'hunt') api.toast('Blast radius proved', 'Three hosts. Open live response before you touch containment.', 'ok');
      if (id === 'isolate') api.log('Isolation state', 'FIN-WKS-0777 modelled as Isolated (simulated) · help desk notified · rollback owner recorded', 'info');
      if (id === 'tvm') api.log('Policy assigned', 'ASR rule + EDR block mode → FIN-WKS pilot group · exception REC-5 open until ' + api.txt('excExpiry'), 'done');
      if (id === 'verify') api.toast('Device work closed', 'Export the evidence pack — the audit log is the part assessors sample.', 'ok');
    }
  });
})();
