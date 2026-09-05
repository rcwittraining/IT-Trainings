/* ==========================================================================
   RCW IT Training · Microsoft Defender lab series
   Lab 3 — Advanced hunting, custom detections and alert tuning
   All data in this file is synthetic. No tenant, API or credential.
   ========================================================================== */
(function () {
  'use strict';

  var NOW = '2026-08-28T09:00:00Z';
  var C2 = '203.0.113.64';

  /* --------------------------------------------------- simulated tables */
  var TABLES = {
    DeviceProcessEvents: [
      { Timestamp: '2026-08-27 08:11:04Z', DeviceName: 'FIN-WKS-0777', FileName: 'svch0st.exe', FolderPath: 'c:/users/svc_print/appdata/local/temp', AccountName: 'svc_print', InitiatingProcessFileName: 'invoice_88216.xlsx.exe', ReportId: 'pp-7001' },
      { Timestamp: '2026-08-27 08:14:02Z', DeviceName: 'OPS-SRV-0102', FileName: 'splweb.exe', FolderPath: 'c:/program files/print/splweb.exe', AccountName: 'svc_print', InitiatingProcessFileName: 'spoolsv.exe', ReportId: 'pp-7002' },
      { Timestamp: '2026-08-27 09:02:40Z', DeviceName: 'HR-WKS-0110', FileName: 'updater.exe', FolderPath: 'c:/programdata/updater', AccountName: 'svc_print', InitiatingProcessFileName: 'svch0st.exe', ReportId: 'pp-7003' },
      { Timestamp: '2026-08-27 12:40:00Z', DeviceName: 'FIN-WKS-0421', FileName: 'rundll32.exe', FolderPath: 'c:/windows/system32', AccountName: 'svc_print', InitiatingProcessFileName: 'explorer.exe', ReportId: 'pp-7004' },
      { Timestamp: '2026-08-28 08:52:00Z', DeviceName: 'FIN-WKS-0777', FileName: 'svch0st.exe', FolderPath: 'c:/users/svc_print/appdata/local/temp', AccountName: 'svc_print', InitiatingProcessFileName: 'explorer.exe', ReportId: 'pp-7100' },
      { Timestamp: '2026-08-26 22:10:00Z', DeviceName: 'PAY-SRV-0007', FileName: 'powershell.exe', FolderPath: 'c:/windows/syswow64/windowspowershell/v1.0', AccountName: 'pay.batch', InitiatingProcessFileName: 'svc_host.exe', ReportId: 'pp-6980' },
      { Timestamp: '2026-08-25 06:00:00Z', DeviceName: 'FIN-WKS-0777', FileName: 'excel.exe', FolderPath: 'c:/program files/microsoft office/root/office16', AccountName: 'fin.clerk', InitiatingProcessFileName: 'outlook.exe', ReportId: 'pp-6900' },
      { Timestamp: '2026-08-21 10:00:00Z', DeviceName: 'HR-WKS-0110', FileName: 'mshta.exe', FolderPath: 'c:/windows/system32', AccountName: 'hr.assistant', InitiatingProcessFileName: 'winword.exe', ReportId: 'pp-6500' },
      { Timestamp: '2026-08-19 10:00:00Z', DeviceName: 'OPS-SRV-0102', FileName: 'whoami.exe', FolderPath: 'c:/windows/system32', AccountName: 'ops.admin', InitiatingProcessFileName: 'cmd.exe', ReportId: 'pp-6100' },
      { Timestamp: '2026-07-10 10:00:00Z', DeviceName: 'FIN-WKS-0342', FileName: 'regsvr32.exe', FolderPath: 'c:/windows/system32', AccountName: 'svc_print', InitiatingProcessFileName: 'wmiprvse.exe', ReportId: 'pp-4001' },
      { Timestamp: '2026-06-30 10:00:00Z', DeviceName: 'FIN-WKS-0342', FileName: 'certutil.exe', FolderPath: 'c:/windows/system32', AccountName: 'svc_print', InitiatingProcessFileName: 'cmd.exe', ReportId: 'pp-3900' }
    ],
    IdentityLogonEvents: [
      { Timestamp: '2026-08-27 08:09:10Z', AccountName: 'svc_print', DeviceName: 'FIN-WKS-0777', ActionType: 'LogonSuccess', Protocol: 'Ntlm', LogonType: 'Interactive', ReportId: 'il-9001' },
      { Timestamp: '2026-08-27 08:12:44Z', AccountName: 'svc_print', DeviceName: 'OPS-SRV-0102', ActionType: 'LogonSuccess', Protocol: 'Ntlm', LogonType: 'Interactive', ReportId: 'il-9002' },
      { Timestamp: '2026-08-27 09:01:02Z', AccountName: 'svc_print', DeviceName: 'HR-WKS-0110', ActionType: 'LogonSuccess', Protocol: 'Kerberos', LogonType: 'Interactive', ReportId: 'il-9003' },
      { Timestamp: '2026-08-27 07:30:00Z', AccountName: 'fin.clerk', DeviceName: 'FIN-WKS-0777', ActionType: 'LogonSuccess', Protocol: 'Kerberos', LogonType: 'Interactive', ReportId: 'il-8990' },
      { Timestamp: '2026-08-26 23:15:00Z', AccountName: 'svc_print', DeviceName: 'PAY-SRV-0007', ActionType: 'LogonFailure', Protocol: 'Kerberos', LogonType: 'Network', ReportId: 'il-8900' },
      { Timestamp: '2026-07-01 09:00:00Z', AccountName: 'svc_print', DeviceName: 'FIN-WKS-0342', ActionType: 'LogonSuccess', Protocol: 'Ntlm', LogonType: 'Interactive', ReportId: 'il-2200' },
      { Timestamp: '2026-08-27 06:00:00Z', AccountName: 'ops.admin', DeviceName: 'OPS-SRV-0102', ActionType: 'LogonSuccess', Protocol: 'Kerberos', LogonType: 'RemoteInteractive', ReportId: 'il-8800' }
    ],
    DeviceLogonEvents: [
      { Timestamp: '2026-08-27 08:09:10Z', DeviceName: 'FIN-WKS-0777', AccountName: 'svc_print', ActionType: 'LogonSuccess', LogonType: 'Interactive', AdditionalFields: '{"AuthenticationPackage":"NTLM","LogonId":"0x3e7","LogonRemoteMachineName":"OPS-SRV-0102","IsLocalLogon":false}' },
      { Timestamp: '2026-08-27 08:12:44Z', DeviceName: 'OPS-SRV-0102', AccountName: 'svc_print', ActionType: 'LogonSuccess', LogonType: 'Interactive', AdditionalFields: '{"AuthenticationPackage":"NTLM","LogonId":"0x4a1","LogonRemoteMachineName":"FIN-WKS-0777","IsLocalLogon":false}' },
      { Timestamp: '2026-08-27 09:01:02Z', DeviceName: 'HR-WKS-0110', AccountName: 'svc_print', ActionType: 'LogonSuccess', LogonType: 'Interactive', AdditionalFields: '{"AuthenticationPackage":"Kerberos","LogonId":"0x5c2","IsLocalLogon":false}' },
      { Timestamp: '2026-08-27 07:30:00Z', DeviceName: 'FIN-WKS-0777', AccountName: 'fin.clerk', ActionType: 'LogonSuccess', LogonType: 'Interactive', AdditionalFields: '{"AuthenticationPackage":"Kerberos","LogonId":"0x112","IsLocalLogon":true}' },
      { Timestamp: '2026-08-01 08:00:00Z', DeviceName: 'FIN-WKS-0342', AccountName: 'svc_print', ActionType: 'LogonSuccess', LogonType: 'Interactive', AdditionalFields: '{"AuthenticationPackage":"NTLM","LogonId":"0x9aa","IsLocalLogon":true}' }
    ],
    DeviceNetworkEvents: [
      { Timestamp: '2026-08-27 08:05:00Z', DeviceName: 'FIN-WKS-0777', RemoteIP: C2, RemotePort: 443, RemoteUrl: 'login-contoso.secure-mail.example', ActionType: 'ConnectionSuccess', InitiatingProcessFileName: 'svch0st.exe', BytesSent: 14021, BytesReceived: 2611, ReportId: 'net-5001' },
      { Timestamp: '2026-08-27 08:20:00Z', DeviceName: 'FIN-WKS-0777', RemoteIP: C2, RemotePort: 443, RemoteUrl: 'login-contoso.secure-mail.example', ActionType: 'ConnectionSuccess', InitiatingProcessFileName: 'svch0st.exe', BytesSent: 14102, BytesReceived: 2600, ReportId: 'net-5002' },
      { Timestamp: '2026-08-27 08:35:00Z', DeviceName: 'OPS-SRV-0102', RemoteIP: C2, RemotePort: 443, RemoteUrl: 'login-contoso.secure-mail.example', ActionType: 'ConnectionSuccess', InitiatingProcessFileName: 'splweb.exe', BytesSent: 13990, BytesReceived: 2555, ReportId: 'net-5003' },
      { Timestamp: '2026-08-27 08:50:00Z', DeviceName: 'HR-WKS-0110', RemoteIP: C2, RemotePort: 443, RemoteUrl: 'login-contoso.secure-mail.example', ActionType: 'ConnectionSuccess', InitiatingProcessFileName: 'updater.exe', BytesSent: 14010, BytesReceived: 2590, ReportId: 'net-5004' },
      { Timestamp: '2026-08-27 08:58:00Z', DeviceName: 'FIN-WKS-0777', RemoteIP: C2, RemotePort: 443, RemoteUrl: 'login-contoso.secure-mail.example', ActionType: 'ConnectionFailed', InitiatingProcessFileName: 'svch0st.exe', BytesSent: 0, BytesReceived: 0, ReportId: 'net-5005' },
      { Timestamp: '2026-08-27 09:10:00Z', DeviceName: 'FIN-WKS-0777', RemoteIP: C2, RemotePort: 443, RemoteUrl: 'login-contoso.secure-mail.example', ActionType: 'ConnectionSuccess', InitiatingProcessFileName: 'svch0st.exe', BytesSent: 9887140, BytesReceived: 402, ReportId: 'net-5006' },
      { Timestamp: '2026-08-27 09:22:00Z', DeviceName: 'OPS-SRV-0102', RemoteIP: C2, RemotePort: 443, RemoteUrl: 'login-contoso.secure-mail.example', ActionType: 'ConnectionSuccess', InitiatingProcessFileName: 'splweb.exe', BytesSent: 14200, BytesReceived: 2600, ReportId: 'net-5007' },
      { Timestamp: '2026-08-27 12:15:00Z', DeviceName: 'FIN-WKS-0421', RemoteIP: '192.0.2.10', RemotePort: 443, RemoteUrl: 'www.example-patch.example', ActionType: 'ConnectionSuccess', InitiatingProcessFileName: 'rundll32.exe', BytesSent: 800, BytesReceived: 4200, ReportId: 'net-5008' },
      { Timestamp: '2026-08-12 12:15:00Z', DeviceName: 'FIN-WKS-0421', RemoteIP: C2, RemotePort: 443, RemoteUrl: 'login-contoso.secure-mail.example', ActionType: 'ConnectionSuccess', InitiatingProcessFileName: 'rundll32.exe', BytesSent: 900, BytesReceived: 400, ReportId: 'net-4100' }
    ],
    DeviceRegistryEvents: [
      { Timestamp: '2026-08-27 08:14:02Z', DeviceName: 'FIN-WKS-0777', ActionType: 'ValueSet', RegistryKey: 'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', RegistryValueName: 'WindowsUpdateSvc', RegistryValueData: 'C:\\Users\\svc_print\\AppData\\Local\\Temp\\svch0st.exe', InitiatingProcessFileName: 'svch0st.exe', ReportId: 'rg-3001' },
      { Timestamp: '2026-08-27 08:15:00Z', DeviceName: 'OPS-SRV-0102', ActionType: 'ValueSet', RegistryKey: 'HKEY_LOCAL_MACHINE\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', RegistryValueName: 'PrintHelper', RegistryValueData: 'C:\\Program Files\\Print\\splweb.exe', InitiatingProcessFileName: 'splweb.exe', ReportId: 'rg-3002' },
      { Timestamp: '2026-08-25 11:00:00Z', DeviceName: 'HR-WKS-0110', ActionType: 'ValueSet', RegistryKey: 'HKEY_CURRENT_USER\\Software\\Microsoft\\Office\\Common\\Security', RegistryValueName: 'BlockContentExpiration', RegistryValueData: '1', InitiatingProcessFileName: 'winword.exe', ReportId: 'rg-2900' }
    ],
    EmailEvents: [
      { Timestamp: '2026-08-27 08:07:00Z', SenderFromAddress: 'n1ghtbloom@relay-secure.example', RecipientEmailAddress: 'fin.clerk@contoso-rcw.example', Subject: 'Invoice 88216 - open immediately', NetworkMessageId: 'm-88216a', DeliveryAction: 'Delivered', ThreatTypes: '' },
      { Timestamp: '2026-08-27 07:58:00Z', SenderFromAddress: 'n1ghtbloom@relay-secure.example', RecipientEmailAddress: 'hr.assistant@contoso-rcw.example', Subject: 'Invoice 88215 - open immediately', NetworkMessageId: 'm-88215a', DeliveryAction: 'SoftQuarantined', ThreatTypes: 'Phish' },
      { Timestamp: '2026-08-26 18:30:00Z', SenderFromAddress: 'news@letter.example', RecipientEmailAddress: 'ops.admin@contoso-rcw.example', Subject: 'Monthly digest', NetworkMessageId: 'm-70010', DeliveryAction: 'Delivered', ThreatTypes: '' }
    ]
  };

  var SCHEMA = [
    { table: 'DeviceProcessEvents', desc: 'Process starts on endpoints. 14-day retention in this lab.', cols: ['Timestamp', 'DeviceName', 'FileName', 'FolderPath', 'AccountName', 'InitiatingProcessFileName', 'ReportId'] },
    { table: 'DeviceNetworkEvents', desc: 'Per-process network connections from endpoints.', cols: ['Timestamp', 'DeviceName', 'RemoteIP', 'RemotePort', 'RemoteUrl', 'ActionType', 'InitiatingProcessFileName', 'BytesSent', 'BytesReceived', 'ReportId'] },
    { table: 'DeviceLogonEvents', desc: 'Logons observed by the endpoint sensor; rich detail sits in AdditionalFields JSON.', cols: ['Timestamp', 'DeviceName', 'AccountName', 'ActionType', 'LogonType', 'AdditionalFields'] },
    { table: 'IdentityLogonEvents', desc: 'Directory-side logon records (identity domain), keyed by account and target device.', cols: ['Timestamp', 'AccountName', 'DeviceName', 'ActionType', 'Protocol', 'LogonType', 'ReportId'] },
    { table: 'DeviceRegistryEvents', desc: 'Persistence: key and value writes on endpoints.', cols: ['Timestamp', 'DeviceName', 'ActionType', 'RegistryKey', 'RegistryValueName', 'RegistryValueData', 'InitiatingProcessFileName'] },
    { table: 'EmailEvents', desc: 'Mail delivery records for the tenant (synthetic).', cols: ['Timestamp', 'SenderFromAddress', 'RecipientEmailAddress', 'Subject', 'NetworkMessageId', 'DeliveryAction', 'ThreatTypes'] }
  ];

  var SAMPLES = {
    pivot1: "DeviceProcessEvents\n| where Timestamp > ago(14d)\n| where FileName !in ('explorer.exe')\n| summarize E = count() by DeviceName",
    pivot2: "let win = 30d;\nIdentityLogonEvents\n| where Timestamp > ago(win) and ActionType == 'LogonSuccess'\n| where AccountName =~ 'svc_print'",
    bad1: 'DeviceEvents\n| take 100000\n| where 1 == 1'
  };

  /* -------------------------------------------------------------- config */
  window.RCWLab.init({
    labId: 'defender-advanced-hunting',
    title: 'Microsoft Defender advanced hunting · KQL, custom detections and alert tuning',
    now: NOW,
    complianceHref: '../microsoft-defender-labs/compliance-standards.html',
    kqlTables: TABLES,
    controls: [
      { id: 'qtime', control: 'Query discipline (bounded scope)', evidence: 'Windowed query, deterministic single-row result' },
      { id: 'qpivot', control: 'Cross-domain correlation', evidence: 'let + join on a stable identifier, result interpreted not over-claimed' },
      { id: 'qparse', control: 'Schema literacy', evidence: 'AdditionalFields materialised with parse_json before filtering' },
      { id: 'qagg', control: 'Baseline before threshold', evidence: 'bin() + dcount() aggregation ordered by signal' },
      { id: 'rule', control: 'ISO/IEC 27001:2022 A.8.16 · monitoring design', evidence: 'Detection tested, scoped, limited, exempted, without auto-remediation on first run' },
      { id: 'tune', control: 'PCI DSS v4.0 req. 10.4 · change control on suppression', evidence: 'Narrow, expiring, owned suppression with a "must still alert" condition' },
      { id: 'note', control: 'NIST SP 800-61r3 §3.2 · documentation', evidence: 'Saved query, incident created from evidence, redacted export, review date' }
    ],
    shell: {
      brand: 'Microsoft Defender portal',
      brandSuffix: 'console replica · Lab 3 of 5',
      tenant: 'contoso-rcw.example · simulated tenant',
      account: 'Leena Verghese',
      accountRole: 'Detection engineering · simulated role',
      navTitle: 'Defender portal',
      nav: [
        { section: 'Home', open: true, items: [{ route: 'overview', label: 'Home · lab briefing', icon: '⌂' }] },
        { section: 'Investigation & response', open: true, items: [
          { route: 'workbench', label: 'Workbench · queries', icon: '⌕', objective: 'qtime' },
          { route: 'library', label: 'Query library', icon: '⛁' },
          { route: 'detections', label: 'Custom detections', icon: '⚡', objective: 'rule' },
          { plain: true, label: 'Hunting graph' }, { plain: true, label: 'Incidents' }
        ] },
        { section: 'Settings', open: true, items: [
          { route: 'tuning', label: 'Alert tuning', icon: '⊘', objective: 'tune' }
        ] },
        { section: 'Closure', open: true, items: [
          { route: 'handoff', label: 'Save · export · handover', icon: '✓', objective: 'note' }
        ] },
        { section: 'Not part of this lab', open: false, items: [
          { plain: true, label: 'Email & collaboration' }, { plain: true, label: 'Identities' },
          { plain: true, label: 'Exposure management' }, { plain: true, label: 'Reports' }
        ] },
        { section: 'Reference', open: true, items: [{ route: 'guide', label: 'Lab guide & marking', icon: '?' }] }
      ]
    },

    objectives: [
      { id: 'qtime', view: 'workbench', points: 10, title: 'Bounded counting on the right table', navLabel: 'Task 1 · bounded count',
        capture: ['whyBound'],
        checks: [
          { check: 'kql', editor: 'qTime', table: 'DeviceProcessEvents', exactRows: 1, firstRowField: 'Count', firstRowValue: 8, requireTimeWindow: true,
            forbids: ['| take', '1 == 1', '1==1', 'ago(30d)', 'ago(60d)', 'ago(90d)'],
            message: 'Task 1 asks for the count of process events in the last 7 days: DeviceProcessEvents, a window of 7 days or less, and one row whose Count is 8. A wider window, a take, or a truthy filter all change the answer.' },
          { check: 'minLength', id: 'whyBound', n: 60, message: 'Say why the window exists (60 characters minimum): cost, retention and reproducibility are the three real reasons.' },
          { check: 'containsAll', id: 'whyBound', words: ['retention'], message: 'Mention retention: a window longer than the plan’s retention silently returns less, which is worse than an error.' }
        ] },

      { id: 'qpivot', view: 'workbench', points: 20, title: 'Cross-domain pivot from identity to endpoint', navLabel: 'Task 2 · identity → endpoint',
        requires: ['qtime'], capture: ['pivotMeans', 'pivotKey'],
        checks: [
          { check: 'kql', editor: 'qPivot', tables: ['IdentityLogonEvents'], requireTimeWindow: true, exactRows: 3,
            rowFieldValues: { field: 'DeviceName', values: ['FIN-WKS-0777', 'OPS-SRV-0102', 'HR-WKS-0110'] },
            forbids: ['| take'],
            message: 'The join must return exactly the three devices where svc_print both authenticated (IdentityLogonEvents, LogonSuccess, inside 30 days) and executed a process (DeviceProcessEvents, inside 14 days). FIN-WKS-0421 has a process but no logon; PAY-SRV-0007 logon failed; the 2026-07-01 logon is outside the window.' },
          { check: 'custom', fn: function (api) {
              var q = api.txt('qPivot');
              return /let\s+\w+\s*=/.test(q) && /join\s+kind\s*=\s*inner/i.test(q);
            }, message: 'Use a let for at least one side and an explicit kind=inner — the default innerunique silently drops the extra matches, which is exactly what a learner expects it not to do.' },
          { check: 'equals', id: 'pivotMeans', value: 'o1', message: 'A join proves co-occurrence of an authentication and an execution on the same account. It does not prove compromise on every row it returns.' },
          { check: 'equals', id: 'pivotKey', value: 'o1', message: 'The identity table is keyed by account and target device; the endpoint table by the device that executed. The account is the identifier that survives crossing domains.' }
        ] },

      { id: 'qparse', view: 'workbench', points: 15, title: 'Materialise a JSON field before filtering it', navLabel: 'Task 3 · AdditionalFields',
        requires: ['qpivot'], capture: ['extWhy', 'costNote'],
        checks: [
          { check: 'kql', editor: 'qParse', table: 'DeviceLogonEvents', requireTimeWindow: true, exactRows: 2,
            rowFieldValues: { field: 'DeviceName', values: ['FIN-WKS-0777', 'OPS-SRV-0102'] },
            requiresOperators: ['extend', 'where'], forbids: ['| take'], mustMatch: 'parse_json\\(\\s*AdditionalFields',
            message: 'Extend AuthPkg from parse_json(AdditionalFields), filter to NTLM, and bound the window to 14 days: that yields the two workstations, not the 2026-08-01 logon that sits outside retention.' },
          { check: 'equals', id: 'extWhy', value: 'o1', message: 'The point of extend is a typed, named, reusable column — for filtering, for aggregation, and for the detection rule you will build in task 5.' },
          { check: 'minLength', id: 'costNote', n: 40, message: 'One line about cost (40 characters minimum): parsing a JSON field on every row of a 14-day scan is the price; say what you traded.' }
        ] },

      { id: 'qagg', view: 'workbench', points: 15, title: 'Hourly baseline of the beacon', navLabel: 'Task 4 · baseline & peak',
        requires: ['qparse'], capture: ['peakHour', 'dcountWhy'],
        checks: [
          { check: 'kql', editor: 'qAgg', table: 'DeviceNetworkEvents', requireTimeWindow: true, exactRows: 2,
            firstRowField: 'Conns', firstRowValue: 5, requiresOperators: ['summarize'], forbids: ['| take'], mustMatch: 'bin\\(\\s*Timestamp\\s*,\\s*1h\\s*\\)',
            message: 'Restrict to the C2 address, summarize per hour with Conns = count() and Devices = dcount(DeviceName), and order descending so the peak (5 connections at 08:00 UTC) is the first row. Two hourly buckets exist inside 14 days on that address.' },
          { check: 'custom', fn: function (api) { return /dcount\s*\(/i.test(api.txt('qAgg')); }, message: 'Count distinct devices, not rows: a host that beacons ten times must not look like ten hosts.' },
          { check: 'custom', fn: function (api) { return /order\s+by\s+\w+\s+desc/i.test(api.txt('qAgg')); }, message: 'Order the result so the peak is the first row. A rule or a note that starts from an unordered grid is read differently by every analyst.' },
          { check: 'equals', id: 'peakHour', value: 'o1', message: 'Your own result says 08:00 UTC. If you answered from expectation rather than from the grid, this is the objective that catches it.' },
          { check: 'equals', id: 'dcountWhy', value: 'o1', message: 'dcount measures how many hosts are affected; count measures how many events happened. Both are useful, and they answer different questions.' }
        ] },

      { id: 'rule', view: 'detections', points: 20, title: 'Custom detection design and safety settings', navLabel: 'Custom detection',
        requires: ['qagg'], capture: ['detName', 'detSeverity', 'detCategory', 'detTactic', 'detFreq', 'detPeriod', 'detLimit', 'detExempt', 'detRemediation', 'detRec'],
        checks: [
          { check: 'minLength', id: 'detName', n: 12, message: 'Give the rule a name an analyst can triage from: subject plus behaviour, 12 characters minimum. “Test alert 3” will be deleted by the next person.' },
          { check: 'equals', id: 'detSeverity', value: 'o4', message: 'High is right here: the beacon, the staged archive and the self-deletion are evidenced. Severity should be earned by the evidence, not by the loudest alert in the tab.' },
          { check: 'equals', id: 'detCategory', value: 'o3', message: 'Category: Command and control — that is what the query detects. A rule labelled Initial access trains analysts to look at the wrong stage.' },
          { check: 'equals', id: 'detTactic', value: 'o1', message: 'TA0011 matches the category you just chose. Mismatched tactic and category is the first thing a metrics review finds.' },
          { check: 'equals', id: 'detFreq', value: 'o1', message: 'Run the rule every hour so a beacon is not discovered a day late.' },
          { check: 'equals', id: 'detPeriod', value: 'o1', message: 'Hourly schedule with a last-hour query period: no gap, no overlap. Three days of lookback on an hourly rule re-raises the same activity 72 times.' },
          { check: 'equals', id: 'detLimit', value: 'o2', message: 'Limit to 10 devices by highest count: enough to see a campaign, small enough not to bury the queue. One device would hide the blast radius you just proved.' },
          { check: 'equals', id: 'detRemediation', value: 'o1', message: 'No automatic remediation on a first run. Isolation is a business event; earn it with a week of observed false-positive rate, then add it deliberately.' },
          { check: 'custom', fn: function (api) {
              var v = api.txt('detExempt').trim().toLowerCase();
              return v === 'none' || /(pay|fin|ops)-(srv|wks)/.test(v);
            }, message: 'Exemptions must be a real device group from this tenant (PAY-SRV, FIN-SRV, OPS-SRV, FIN-WKS…) or the honest word “none”. Exempting a single host because it is annoying is how coverage disappears.' },
          { check: 'minLength', id: 'detRec', n: 14, message: 'Recommended actions are read by whoever picks this up at 03:00. Write at least one concrete first step.' },
          { check: 'kql', editor: 'detQuery', requireTimeWindow: true, minRows: 1, forbids: ['| take', '1 == 1', 'ago(90d)', 'ago(365d)'],
            message: 'The detection query must run, return at least one row here, be bounded, and contain no always-true filter or oversized window. A rule whose query never returns anything looks identical to a rule that works.' },
          { check: 'containsAll', id: 'detQuery', words: ['summarize'], message: 'Aggregate in the query: a custom detection alerts per returned row, so an unaggregated query alerts per event.' },
          { check: 'forbids', id: 'detQuery', words: ['@'], message: 'No mailbox addresses in a detection query. It is stored, exported and shown in every incident — use the account name or a device group.' },
          { check: 'custom', fn: function (api) { return api.state.answers['detQuery.ran'] === true; },
            message: 'Run the query in the detections editor once before saving. Testing a detection is not optional; it is the difference between a rule and a wish.' }
        ],
        evidence: ['Detection saved with a paired schedule and query window, no automatic remediation on first run'] },

      { id: 'tune', view: 'tuning', points: 10, title: 'Scoped, expiring alert suppression', navLabel: 'Alert tuning',
        requires: ['rule'], capture: ['tuneWhere', 'tuneScope', 'tuneExpiry', 'tuneOwner', 'tuneKeep', 'tuneWhy'],
        checks: [
          { check: 'equals', id: 'tuneWhere', value: 'o1', message: 'Alert tuning is the intended control. Disabling the underlying detection also blinds you to the real thing wearing the same name; a view filter changes nothing for the next analyst.' },
          { check: 'equals', id: 'tuneScope', value: 'o1', message: 'Alert name + product + the two device groups where the software is deployed. Tenant-wide suppression of a behaviour class is the mistake this objective exists to catch.' },
          { check: 'equals', id: 'tuneExpiry', value: 'o1', message: 'Every suppression expires and is reviewed. “The vendor says it is normal” was true in 2024 for a binary that has since been replaced.' },
          { check: 'equals', id: 'tuneOwner', value: 'o1', message: 'A role owns the rule, in the rule description. “Whoever is on shift” owns nothing.' },
          { check: 'equals', id: 'tuneKeep', value: 'o1', message: 'The same name with a different command line, path or parent must still alert — that is the exact shape malware borrows.' },
          { check: 'minLength', id: 'tuneWhy', n: 80, message: 'Write the change record (80 characters minimum): sample rate, what you saw, what stays visible, when it is reviewed.' },
          { check: 'containsAll', id: 'tuneWhy', words: ['expir', 'owner'], message: 'The justification must name the expiry and the owner; those are the two fields an auditor reads first.' }
        ] },

      { id: 'note', view: 'handoff', points: 10, title: 'Saved query, incident and handover note', navLabel: 'Handover',
        requires: ['tune'], capture: ['qName', 'handoffTo', 'exportScope', 'qReview', 'huntNote'],
        checks: [
          { check: 'minLength', id: 'qName', n: 10, message: 'Name the query with its folder, e.g. “svc-print-beacon-baseline · Detection engineering”.' },
          { check: 'equals', id: 'handoffTo', value: 'o1', message: 'Create the incident from the query results: the evidence, the query text and the run time then travel together, which is what makes the finding auditable.' },
          { check: 'equals', id: 'exportScope', value: 'o1', message: 'Export the current result set, redacted, with the query and the run time. Dumping 30 days of a raw table into a file is a data-handling problem, not analysis.' },
          { check: 'custom', fn: function (api) {
              var v = api.txt('qReview'), m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
              if (!m) return false;
              var days = (Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.parse(NOW)) / 86400000;
              return days > 0 && days <= 90;
            }, message: 'Set the query review date as YYYY-MM-DD, within 90 days of 2026-08-28. Queries rot with the schema.' },
          { check: 'allChecked', ids: ['nA', 'nB', 'nC', 'nD'], message: 'All four handover hygiene items: assumptions in the description, the queue changes listed, identities as roles or accounts, and the residual uncertainty written down.' },
          { check: 'minLength', id: 'huntNote', n: 180, message: '180 characters is the floor for a note that stands alone: question, method, window, result, what it does not prove.' },
          { check: 'containsAll', id: 'huntNote', words: ['window', 'not'], message: 'State the query window and what the finding does not prove. Both are what a reviewer looks for first.' },
          { check: 'forbids', id: 'huntNote', words: ['@'], message: 'No addresses in the hunting note.' }
        ],
        evidence: ['Hunt saved, incident created from evidence, suppression and detection listed'] }
    ],

    onReady: function (api) {
      var edList = ['qTime', 'qPivot', 'qParse', 'qAgg'];
      var mounts = {};
      edList.forEach(function (id) {
        mounts[id] = api.mountKql({ editor: id, results: 'res-' + id, meta: 'meta-' + id, error: 'err-' + id, run: 'run-' + id, format: 'fmt-' + id, clear: 'clr-' + id, label: id, maxRows: 60, tables: TABLES });
      });
      mounts.detQuery = api.mountKql({ editor: 'detQuery', meta: 'meta-detQuery', error: 'err-detQuery', run: 'run-detQuery', label: 'custom detection query', maxRows: 60, tables: TABLES,
        onDone: function (a, res) { a.state.answers['detQuery.ran'] = true; a.save(); a.log('Detection query', 'Tested against ' + res.rows.length + ' simulated row(s)', res.rows.length ? 'done' : 'warn'); a.toast(res.rows.length ? 'Query returns rows' : 'Query returns nothing', res.rows.length ? 'It still has to be bounded and aggregated before you save it.' : 'A detection that never fires looks identical to one that never runs.', res.rows.length ? 'ok' : 'warn'); } });

      var t4 = api.$('#copyFromTask4');
      if (t4) t4.addEventListener('click', function () {
        var src = api.$('#qAgg'); var dst = api.$('#detQuery');
        if (!src || !dst) return;
        if (!/\S/.test(src.value)) { api.toast('Nothing to copy', 'Complete task 4 first — the detection is built from the hunt, not the other way round.', 'warn'); return; }
        dst.value = src.value; api.log('Detection query', 'Loaded the task 4 baseline query as a starting point', 'info');
        api.toast('Copied', 'Now change the schedule pairing, the limit and the projection before you save.', 'ok');
      });

      api.$$('button[data-load]').forEach(function (b) {
        b.addEventListener('click', function () {
          var k = b.getAttribute('data-load'); var dst = api.$(k === 'pivot1' || k === 'bad1' ? '#qTime' : '#qPivot');
          if (!dst) return;
          dst.value = SAMPLES[k] || '';
          api.log('Query library', 'Loaded sample “' + k + '” into the workbench', 'info');
          api.go('workbench');
          api.toast('Sample loaded', 'Editing it into something defensible is the graded part.', 'ok');
        });
      });

      var rc = api.$('[data-rowcount]');
      if (rc) { var n = 0; Object.keys(TABLES).forEach(function (k) { n += TABLES[k].length; }); rc.textContent = n + ' rows across ' + Object.keys(TABLES).length + ' tables (in-memory)'; }
      if (api.state.learner) { var ln = api.$('#learnerName'); if (ln) ln.value = api.state.learner; }
      api.toast('Lab ready', 'Six synthetic tables, one offline KQL engine. Start with task 1 in the workbench.', 'ok');
    },

    afterObjective: function (api, id) {
      if (id === 'qtime') api.go('workbench');
      if (id === 'qpivot') api.toast('Pivot accepted', 'Now materialise the JSON field — task 3 is where most tenant hunts quietly under-report.', 'ok');
      if (id === 'qagg') api.toast('Baseline done', 'You have a peak, a spread and a defensible query. Turn it into a detection.', 'ok');
      if (id === 'rule') api.log('Detection saved', api.txt('detName') + ' · ' + api.txt('detFreq') + ' schedule · no automatic remediation', 'done');
      if (id === 'tune') api.log('Suppression saved', 'Scoped alert-tuning rule with expiry and owner (simulated)', 'warn');
      if (id === 'note') api.toast('Lab complete', 'Export the evidence pack — it contains the query text and the run log, which is the part worth keeping.', 'ok');
    }
  });
})();
