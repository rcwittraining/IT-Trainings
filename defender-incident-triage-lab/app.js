/* ==========================================================================
   RCW IT Training · Microsoft Defender lab series
   Lab 1 — Unified incident triage, containment and classification
   All data in this file is synthetic. No tenant, API or credential.
   ========================================================================== */
(function () {
  'use strict';

  var NOW = '2026-08-20T12:00:00Z';

  /* --------------------------------------------------- simulated schema */
  var TABLES = {
    DeviceProcessEvents: [
      { Timestamp: '2026-08-19 09:41:22Z', DeviceName: 'FIN-WKS-0421', FileName: 'powershell.exe', InitiatingProcessFileName: 'excel.exe', InitiatingProcessCommandLine: 'powershell.exe -nop -w hidden -enc SQBFAFgA', FolderPath: 'c:/windows/syswow64/windowspowershell/v1.0', ReportId: 'rr-9001', AccountName: 'fin.manager' },
      { Timestamp: '2026-08-19 09:44:10Z', DeviceName: 'FIN-WKS-0421', FileName: 'svch0st.exe', InitiatingProcessFileName: 'powershell.exe', InitiatingProcessCommandLine: 'svch0st.exe -c', FolderPath: 'c:/users/fin.manager/appdata/roaming/microsoft/windows/start menu/programs/startup', ReportId: 'rr-9002', AccountName: 'fin.manager' },
      { Timestamp: '2026-08-19 10:05:02Z', DeviceName: 'HR-WKS-0110', FileName: 'svch0st.exe', InitiatingProcessFileName: 'winword.exe', InitiatingProcessCommandLine: 'svch0st.exe -c', FolderPath: 'c:/users/hr.assistant/appdata/local/temp', ReportId: 'rr-9014', AccountName: 'hr.assistant' },
      { Timestamp: '2026-08-19 10:07:44Z', DeviceName: 'HR-WKS-0110', FileName: 'svch0st.exe', InitiatingProcessFileName: 'explorer.exe', InitiatingProcessCommandLine: 'svch0st.exe -c', FolderPath: 'c:/users/hr.assistant/appdata/roaming/microsoft/windows/start menu/programs/startup', ReportId: 'rr-9015', AccountName: 'hr.assistant' },
      { Timestamp: '2026-08-19 11:20:00Z', DeviceName: 'OPS-SRV-0102', FileName: 'svch0st.exe', InitiatingProcessFileName: 'cmd.exe', InitiatingProcessCommandLine: 'svch0st.exe --loop', FolderPath: 'c:/programdata/svc-host', ReportId: 'rr-9031', AccountName: 'svc_backup' },
      { Timestamp: '2026-06-02 09:00:00Z', DeviceName: 'FIN-WKS-0777', FileName: 'svch0st.exe', InitiatingProcessFileName: 'outlook.exe', InitiatingProcessCommandLine: 'unrelated historical detection', FolderPath: 'c:/users/old.box/downloads', ReportId: 'rr-7777', AccountName: 'old.box' },
      { Timestamp: '2026-08-19 08:15:00Z', DeviceName: 'FIN-WKS-0421', FileName: 'excel.exe', InitiatingProcessFileName: 'outlook.exe', InitiatingProcessCommandLine: 'excel.exe -Embedding', FolderPath: 'c:/program files/microsoft office/root/office16', ReportId: 'rr-8990', AccountName: 'fin.manager' }
    ],
    DeviceEvents: [
      { Timestamp: '2026-08-19 09:44:10Z', DeviceName: 'FIN-WKS-0421', ActionType: 'NewExecutableFileCreated', FileName: 'svch0st.exe', ReportId: 'rr-9002' },
      { Timestamp: '2026-08-19 10:02:00Z', DeviceName: 'FIN-WKS-0421', ActionType: 'NewInboxRuleCreated', FileName: '', ReportId: 'rr-9005' },
      { Timestamp: '2026-08-19 11:20:05Z', DeviceName: 'OPS-SRV-0102', ActionType: 'NewExecutableFileCreated', FileName: 'svch0st.exe', ReportId: 'rr-9032' },
      { Timestamp: '2026-08-19 10:05:04Z', DeviceName: 'HR-WKS-0110', ActionType: 'NewExecutableFileCreated', FileName: 'svch0st.exe', ReportId: 'rr-9016' }
    ],
    DeviceNetworkEvents: [
      { Timestamp: '2026-08-19 09:41:25Z', DeviceName: 'FIN-WKS-0421', RemoteIP: '203.0.113.64', RemoteUrl: 'login-contoso.secure-mail.example', Action: 'ConnectionFailed', InitiatingProcessFileName: 'svch0st.exe' },
      { Timestamp: '2026-08-19 09:52:00Z', DeviceName: 'FIN-WKS-0421', RemoteIP: '203.0.113.64', RemoteUrl: 'login-contoso.secure-mail.example', Action: 'Success', InitiatingProcessFileName: 'svch0st.exe' },
      { Timestamp: '2026-08-19 11:58:02Z', DeviceName: 'OPS-SRV-0102', RemoteIP: '203.0.113.64', RemoteUrl: 'login-contoso.secure-mail.example', Action: 'Success', InitiatingProcessFileName: 'svch0st.exe' },
      { Timestamp: '2026-08-19 10:05:09Z', DeviceName: 'HR-WKS-0110', RemoteIP: '203.0.113.64', RemoteUrl: 'login-contoso.secure-mail.example', Action: 'Success', InitiatingProcessFileName: 'svch0st.exe' },
      { Timestamp: '2026-08-19 07:10:00Z', DeviceName: 'FIN-WKS-0421', RemoteIP: '192.0.2.10', RemoteUrl: 'www.microsoft.com', Action: 'Success', InitiatingProcessFileName: 'msedge.exe' }
    ],
    DeviceRegistryEvents: [
      { Timestamp: '2026-08-19 09:44:12Z', DeviceName: 'FIN-WKS-0421', RegistryKey: 'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', RegistryValueName: 'WindowsSvcHost', RegistryValueData: 'C:\\Users\\fin.manager\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\svch0st.exe', InitiatingProcessFileName: 'powershell.exe', ActionType: 'ValueSet' },
      { Timestamp: '2026-08-19 10:05:10Z', DeviceName: 'HR-WKS-0110', RegistryKey: 'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', RegistryValueName: 'WindowsSvcHost', RegistryValueData: 'svch0st.exe', InitiatingProcessFileName: 'winword.exe', ActionType: 'ValueSet' }
    ],
    EmailEvents: [
      { Timestamp: '2026-08-19 09:33:41Z', SenderFromAddress: 'n1ghtbloom@relay-secure.example', RecipientEmailAddress: 'fin.manager@contoso-rcw.example', Subject: 'Invoice 88213 - open immediately', NetworkMessageId: 'm-88213a', DeliveryAction: 'SoftQuarined', ThreatTypes: '' },
      { Timestamp: '2026-08-19 09:33:41Z', SenderFromAddress: 'n1ghtbloom@relay-secure.example', RecipientEmailAddress: 'hr.assistant@contoso-rcw.example', Subject: 'Invoice 88213 - open immediately', NetworkMessageId: 'm-88213b', DeliveryAction: 'Passed', ThreatTypes: '' },
      { Timestamp: '2026-08-19 09:33:41Z', SenderFromAddress: 'n1ghtbloom@relay-secure.example', RecipientEmailAddress: 'ops.srv@contoso-rcw.example', Subject: 'Invoice 88213 - open immediately', NetworkMessageId: 'm-88213c', DeliveryAction: 'Passed', ThreatTypes: '' },
      { Timestamp: '2026-08-18 06:02:00Z', SenderFromAddress: 'newsletter@example-marketing.test', RecipientEmailAddress: 'fin.manager@contoso-rcw.example', Subject: 'Monthly digest', NetworkMessageId: 'm-11', DeliveryAction: 'Passed', ThreatTypes: '' }
    ],
    IdentityLogonEvents: [
      { Timestamp: '2026-08-19 10:19:36Z', AccountName: 'svc_backup', LogonType: 'Ntlm', IsSuccessful: true, DeviceName: 'FS-FIN01', ClientIP: '198.51.100.21', Protocol: 'Ntlm', Application: 'SMB' },
      { Timestamp: '2026-08-19 09:29:02Z', AccountName: 'fin.manager', LogonType: 'Interactive', IsSuccessful: true, DeviceName: 'FIN-WKS-0421', ClientIP: '198.51.100.44', Protocol: 'Kerberos', Application: 'Windows' },
      { Timestamp: '2026-08-19 08:02:00Z', AccountName: 'hr.assistant', LogonType: 'Interactive', IsSuccessful: true, DeviceName: 'HR-WKS-0110', ClientIP: '198.51.100.45', Protocol: 'Kerberos', Application: 'Windows' }
    ],
    AlertInfo: [
      { Timestamp: '2026-08-19 09:41:30Z', AlertId: 'al-1001', Title: 'PowerShell downloaded an executable from a remote server', Severity: 'High', Category: 'Execution', DetectionSource: 'Microsoft Defender Antivirus' },
      { Timestamp: '2026-08-19 09:44:20Z', AlertId: 'al-1002', Title: 'Startup file persistence on a workstation', Severity: 'Medium', Category: 'Persistence', DetectionSource: 'Microsoft Defender Antivirus' },
      { Timestamp: '2026-08-19 10:02:10Z', AlertId: 'al-1003', Title: 'Mailbox rule used to forward mail externally', Severity: 'High', Category: 'Collection', DetectionSource: 'Microsoft Defender for Office 365' },
      { Timestamp: '2026-08-19 10:19:40Z', AlertId: 'al-1004', Title: 'Unusual SMB access from a workstation account', Severity: 'High', Category: 'Lateral movement', DetectionSource: 'Microsoft Defender for Identity' }
    ],
    AlertEvidence: [
      { Timestamp: '2026-08-19 09:44:20Z', AlertId: 'al-1002', DeviceName: 'FIN-WKS-0421', FileName: 'svch0st.exe', RemoteUrl: 'login-contoso.secure-mail.example', RemoteIP: '203.0.113.64', AccountName: 'fin.manager' },
      { Timestamp: '2026-08-19 11:20:06Z', AlertId: 'al-1002', DeviceName: 'OPS-SRV-0102', FileName: 'svch0st.exe', RemoteUrl: 'login-contoso.secure-mail.example', RemoteIP: '203.0.113.64', AccountName: 'svc_backup' },
      { Timestamp: '2026-08-19 10:05:11Z', AlertId: 'al-1002', DeviceName: 'HR-WKS-0110', FileName: 'svch0st.exe', RemoteUrl: 'login-contoso.secure-mail.example', RemoteIP: '203.0.113.64', AccountName: 'hr.assistant' }
    ],
    DeviceInfo: [
      { Timestamp: '2026-08-20 06:00:00Z', DeviceName: 'FIN-WKS-0421', OSPlatform: 'Windows', IsMdeOnboarded: 1, IsAvActive: 1, DeviceGroup: 'FIN-WKS', ExposureLevel: 'Medium' },
      { Timestamp: '2026-08-20 06:00:00Z', DeviceName: 'HR-WKS-0110', OSPlatform: 'Windows', IsMdeOnboarded: 1, IsAvActive: 1, DeviceGroup: 'HR-WKS', ExposureLevel: 'Medium' },
      { Timestamp: '2026-08-20 06:00:00Z', DeviceName: 'OPS-SRV-0102', OSPlatform: 'WindowsServer', IsMdeOnboarded: 0, IsAvActive: 1, DeviceGroup: 'OPS-SRV', ExposureLevel: 'High' },
      { Timestamp: '2026-08-20 06:00:00Z', DeviceName: 'FIN-WKS-0777', OSPlatform: 'Windows', IsMdeOnboarded: 1, IsAvActive: 1, DeviceGroup: 'FIN-WKS', ExposureLevel: 'Low' }
    ]
  };

  var SCHEMA = [
    { table: 'DeviceProcessEvents', desc: 'Process creation, command line, parent process', cols: ['Timestamp', 'DeviceName', 'FileName', 'InitiatingProcessFileName', 'InitiatingProcessCommandLine', 'FolderPath', 'ReportId', 'AccountName'] },
    { table: 'DeviceEvents', desc: 'Generic behavioural detections on endpoints', cols: ['Timestamp', 'DeviceName', 'ActionType', 'FileName', 'ReportId'] },
    { table: 'DeviceNetworkEvents', desc: 'Outbound connections, URLs, IPs', cols: ['Timestamp', 'DeviceName', 'RemoteIP', 'RemoteUrl', 'Action', 'InitiatingProcessFileName'] },
    { table: 'DeviceRegistryEvents', desc: 'Registry changes — persistence hunting', cols: ['Timestamp', 'DeviceName', 'RegistryKey', 'RegistryValueName', 'RegistryValueData', 'InitiatingProcessFileName', 'ActionType'] },
    { table: 'EmailEvents', desc: 'Mailflow events for Defender for Office 365', cols: ['Timestamp', 'SenderFromAddress', 'RecipientEmailAddress', 'Subject', 'NetworkMessageId', 'DeliveryAction', 'ThreatTypes'] },
    { table: 'IdentityLogonEvents', desc: 'On-premises and cloud logons', cols: ['Timestamp', 'AccountName', 'LogonType', 'IsSuccessful', 'DeviceName', 'ClientIP', 'Protocol', 'Application'] },
    { table: 'AlertInfo', desc: 'Alert metadata across Defender XDR', cols: ['Timestamp', 'AlertId', 'Title', 'Severity', 'Category', 'DetectionSource'] },
    { table: 'AlertEvidence', desc: 'Entities attached to alerts', cols: ['Timestamp', 'AlertId', 'DeviceName', 'FileName', 'RemoteUrl', 'RemoteIP', 'AccountName'] },
    { table: 'DeviceInfo', desc: 'Device health, onboarding, groups', cols: ['Timestamp', 'DeviceName', 'OSPlatform', 'IsMdeOnboarded', 'IsAvActive', 'DeviceGroup', 'ExposureLevel'] }
  ];

  var EXPECTED = ['FIN-WKS-0421', 'HR-WKS-0110', 'OPS-SRV-0102'];
  var SEQ = ['Collect investigation package', 'Isolate device', 'Stop and quarantine file',
    'Add indicator to block file hash', 'Remove inbox rule',
    'Confirm identity action: revoke sessions and tokens', 'Reset password and require MFA re-register'];

  /* -------------------------------------------------------------- config */
  window.RCWLab.init({
    labId: 'defender-incident-triage',
    title: 'Microsoft Defender XDR · incident triage, containment and classification',
    now: NOW,
    kqlTables: TABLES,
    controls: [
      { id: 'intake', control: 'NIST 800-61r3 §3.2 Detection & classification', evidence: 'Priority call and ownership recorded' },
      { id: 'story', control: 'ISO/IEC 27035-2 §5.4 Assessment', evidence: 'Technique set asserted only where alerts support it' },
      { id: 'hunt', control: 'Coverage validation', evidence: 'Bounded, reproducible KQL over the endpoint schema' },
      { id: 'respond', control: 'Change control before containment', evidence: 'Approver, change reference, reversal path, evidence-first order' },
      { id: 'resolve', control: 'Audit-quality closure', evidence: 'Classification, tags, remediation state, four-element note' },
      { id: 'escalate', control: 'Legal & regulatory notification', evidence: 'Correct DORA/NIS2/GDPR clocks and named filing owner' }
    ],
    shell: {
      brand: 'Microsoft Defender portal',
      brandSuffix: 'console replica · Lab 1 of 5',
      tenant: 'contoso-rcw.example · simulated tenant',
      account: 'Mira Solanki',
      accountRole: 'SOC L2 · simulated role',
      navTitle: 'Defender portal',
      nav: [
        { section: 'Home', open: true, items: [{ route: 'overview', label: 'Home · lab briefing', icon: '⌂' }] },
        { section: 'Investigation & response', open: true, items: [
          { route: 'queue', label: 'Incidents', icon: '⚑', objective: 'triage' },
          { route: 'incident', label: 'INC-2291 · attack story', icon: '☰', objective: 'story' },
          { route: 'hunt', label: 'Advanced hunting', icon: '⌕', objective: 'hunt' },
          { plain: true, label: 'Alerts' }, { plain: true, label: 'Hunting graph' }
        ] },
        { section: 'Endpoints', open: true, items: [
          { route: 'respond', label: 'Devices · FIN-WKS-0421', icon: '▣', objective: 'respond' },
          { plain: true, label: 'Live response' }, { plain: true, label: 'Action center' }, { plain: true, label: 'Exposure management' }
        ] },
        { section: 'Closure', open: true, items: [
          { route: 'resolve', label: 'Classify & resolve', icon: '✓', objective: 'resolve' },
          { route: 'escalate', label: 'Escalation decision', icon: '⚖', objective: 'escalate' }
        ] },
        { section: 'Not part of this lab', open: false, items: [
          { plain: true, label: 'Threat intelligence' }, { plain: true, label: 'Identities' },
          { plain: true, label: 'Email & collaboration' }, { plain: true, label: 'Cloud apps' },
          { plain: true, label: 'Cloud security' }, { plain: true, label: 'Microsoft Sentinel' },
          { plain: true, label: 'Reports' }, { plain: true, label: 'System · Settings' }
        ] },
        { section: 'Reference', open: true, items: [{ route: 'guide', label: 'Lab guide & marking', icon: '?' }] }
      ]
    },

    objectives: [
      { id: 'intake', view: 'overview', points: 10, title: 'Intake and priority', navLabel: 'Intake & priority',
        capture: ['priority', 'oncall', 'sla'],
        checks: [
          { check: 'equals', id: 'priority', value: 'p2', message: 'Re-read the blast radius: one endpoint, 1.4 MB read, mailbox rule created, no confirmed bulk egress. That is a serious P2 to work today — declaring a major incident is a decision with business consequences and needs a fact you do not have yet.' },
          { check: 'equals', id: 'oncall', value: 'l2', message: 'Ownership must be a named analyst with a technical team copied. “My manager” or “nobody” both leave the incident unworked.' },
          { check: 'equals', id: 'sla', value: '15', message: 'A High severity incident in a team with an SLA is assigned and status-set quickly — 15 minutes is the value your own runbook uses.' },
          { check: 'allChecked', ids: ['i1', 'i2', 'i3'], message: 'All three intake acknowledgements are required before you touch the queue.' }
        ],
        evidence: ['Intake recorded at ' + NOW + ' (simulated shift time)'] },

      { id: 'triage', view: 'queue', points: 15, title: 'Queue filtering, selection and ownership', navLabel: 'Queue filter & ownership',
        requires: ['intake'], capture: ['qSeverity', 'qStatus', 'qSource', 'triageWhy'],
        checks: [
          { check: 'rowSelection', selector: '#incidentQueue', ids: ['INC-2291'], message: 'Select exactly INC-2291. INC-2288 is an in-scope red-team exercise and the rest are single-source or already remediated.' },
          { check: 'equals', id: 'qSeverity', value: 'High', message: 'Set Severity = High first: that is the queue discipline your SLA is written against.' },
          { check: 'equals', id: 'qStatus', value: 'New', message: 'Status = New — you are triaging unclaimed work, not re-reviewing resolved items.' },
          { check: 'equals', id: 'qSource', value: 'Microsoft Defender for Endpoint', message: 'Filter Service / detection source to Microsoft Defender for Endpoint; the incident is correlated from that workload.' },
          { check: 'equals', id: 'assignee', value: 'mira.solanki', message: 'Claim it. An incident that is nobody’s is the one that ages for nine days.' },
          { check: 'equals', id: 'incStatus', value: 'inprogress', message: 'Set the status to In progress so the queue metrics and the handover both reflect reality.' },
          { check: 'minLength', id: 'triageWhy', n: 80, message: 'Write a real justification (80 characters minimum). Future-you needs the reason, not the ticket number.' },
          { check: 'containsAll', id: 'triageWhy', words: ['2288'], message: 'Name the incident you rejected and why — the reviewer will look for INC-2288 in your reasoning.' }
        ] },

      { id: 'story', view: 'incident', points: 20, title: 'Attack story, techniques and pivot evidence', navLabel: 'Attack story & blast radius',
        requires: ['triage'], capture: ['initialAccess', 'pivot', 'silence'],
        checks: [
          { check: 'exactly', ids: ['t1566', 't1059', 't1547', 't1114', 't1021'], on: ['t1566', 't1059', 't1547', 't1114', 't1021'], message: 'Assert only the five techniques the alerts actually evidence. T1070.004 (no deletion events) and T1190 (device not internet-facing) are over-claims.' },
          { check: 'equals', id: 'initialAccess', value: 'phish', message: 'The first alert is a link in a delivered mail that detonated into PowerShell — that is spearphishing via a link, not an exploited gateway.' },
          { check: 'equals', id: 'pivot', value: 'rule', message: 'The inbox rule that deletes and forwards mail is the pivot: it proves attacker control of the mailbox, not just a bad laptop.' },
          { check: 'equals', id: 'silence', value: 'unknown', message: 'Missing beacons are absence of evidence. Verify sensor health before you downgrade anything.' }
        ] },

      { id: 'hunt', view: 'hunt', points: 15, title: 'Bounded KQL blast-radius hunt', navLabel: 'Advanced hunting (KQL)',
        requires: ['story'],
        checks: [
          { check: 'kql', editor: 'huntQuery', table: 'DeviceProcessEvents', exactRows: 3, requireTimeWindow: true,
            forbids: ['| take', '1 == 1', '1==1'], requiresOperators: ['where'],
            message: 'Your query must run over DeviceProcessEvents, bound the time window, and return exactly the three devices running svch0st.exe inside 14 days — deduplicated, with no trivially-true filter and no take-based shortcut.' }
        ],
        evidence: ['Blast radius proved by query, not by assumption'] },

      { id: 'respond', view: 'respond', points: 15, title: 'Contained, approved response actions', navLabel: 'Contained response',
        requires: ['hunt'], capture: ['approver', 'changeRef', 'respCategory', 'window'],
        checks: [
          { check: 'mustNotHaveFlag', flag: 'action-without-approval', message: 'You executed a console action before the authorisation fields were complete. Fill approver, change reference, category and window, then reset the sequence and re-run the steps.' },
          { check: 'mustNotHaveFlag', flag: 'premature-imaging', message: 'Imaging the device is an eradication decision that destroys volatile evidence and needs the asset owner. Clear it from your sequence by resetting this action pane.' },
          { check: 'equals', id: 'respCategory', value: 'contain', message: 'This stage is Containment in the NIST lifecycle — eradication and recovery come after the scope is known.' },
          { check: 'minLength', id: 'approver', n: 4, message: 'Name the human who approved the action (a role and a person, not a team alias).' },
          { check: 'minLength', id: 'changeRef', n: 6, message: 'Emergency or not, record a change/ticket reference — this is the field auditors sample first.' },
          { check: 'equals', id: 'window', value: 'Within the emergency-change window (user notified)', message: 'Isolation of a finance laptop during month-end needs the emergency window and a notification to the owner.' },
          { check: 'allChecked', ids: ['preIsolate', 'prePackage', 'preTokens', 'preRule', 'preSMB', 'preUndo'], message: 'Every listed pre-action control applies to this incident. Tick them or explain why not in your note — ticking all six is the correct answer here.' },
          { check: 'actionSequence', steps: SEQ, message: 'Sequence check: ' },
          { check: 'custom', fn: function (api) {
              var seq = api.state.answers['respond.seq'] || [];
              api._r = 'Image the device must not be clicked at this stage, and the Action center is your last step, after all seven containment actions.';
              if (seq.indexOf('Image the device') !== -1) return false;
              var ac = seq.indexOf('Open Action center');
              if (ac === -1) { api._r = 'Finish with the Action center: verification that each queued action actually succeeded is part of the objective.'; return false; }
              return seq.slice(0, 7).join('|') === SEQ.join('|');
            }, message: 'Click the action buttons in the documented order (evidence first, then isolation, then file and hash, then mailbox, then identity, then reset) and finish by opening the Action center to verify. Imaging waits for the eradication decision.' }
        ] },

      { id: 'resolve', view: 'resolve', points: 15, title: 'Classification, remediation state and closure note', navLabel: 'Classification & closure',
        requires: ['respond'], capture: ['status', 'classification', 'threatType', 'tags'],
        checks: [
          { check: 'equals', id: 'status', value: 'resolved', message: 'The incident is being closed, so status = Resolved (which also resolves the linked alerts).' },
          { check: 'equals', id: 'classification', value: 'tp', message: 'This is a true positive. Classifying it as a false positive would suppress real coverage and distort your metrics.' },
          { check: 'equals', id: 'threatType', value: 'multi', message: 'Threat type: Multi-staged activity — the incident spans initial access, persistence, collection and lateral movement.' },
          { check: 'equals', id: 'fpReason', value: '', message: 'Leave “False positive reason” empty when the classification is a true positive; a filled reason on a TP is a data-quality defect.' },
          { check: 'minLength', id: 'tags', n: 6, message: 'Add at least one tag (campaign, business unit, or action-needed) so this incident is searchable next quarter.' },
          { check: 'exactly', ids: ['remIsolated', 'remRule', 'remCreds', 'remSvc', 'remAsr', 'remNothing'], on: ['remIsolated', 'remRule', 'remCreds', 'remSvc', 'remAsr'], message: 'Five remediation items are genuinely complete; “Nothing further required” is wrong — the device still needs a rebuild and the ASR rule is still in audit mode.' },
          { check: 'minLength', id: 'triageNote', n: 220, message: 'A 220-character minimum is the floor for a note that survives an audit sample. Yours is shorter.' },
          { check: 'containsAll', id: 'triageNote', words: ['contain', 'svch0st', 'svc_backup', 'owner'], message: 'Your note must state containment, the artefact (svch0st), the root-cause exposure (svc_backup) and a named owner for the next action.' },
          { check: 'forbids', id: 'triageNote', words: ['@'], message: 'Remove email addresses from the note. Reference the person by role or by the synthetic account name — incident notes get exported, forwarded and sometimes disclosed.' }
        ] },

      { id: 'escalate', view: 'escalate', points: 10, title: 'Regulatory and contractual escalation decision', navLabel: 'Regulatory escalation',
        requires: ['resolve'], capture: ['entityType', 'doraClock', 'nis2Clock', 'gdprClock', 'finalClock', 'disclosureOwner', 'handover'],
        checks: [
          { check: 'equals', id: 'entityType', value: 'financial', message: 'The briefing states the tenant is an EU credit institution: DORA applies, and it is lex specialis relative to NIS2 for this entity.' },
          { check: 'equals', id: 'doraClock', value: '4h', message: 'DORA: initial notification within 4 hours of classifying the incident as major (and never later than 24 hours from awareness). It is the tightest clock you have.' },
          { check: 'equals', id: 'nis2Clock', value: 'context', message: 'For a financial entity in DORA scope, DORA supersedes NIS2 reporting for the same incident. NIS2’s 24h early warning still matters for group entities that are outside DORA scope — “24 hours applies to us” is the wrong simplification.' },
          { check: 'equals', id: 'gdprClock', value: '72h', message: 'Personal data of clients was read from the share, so Article 33 applies: within 72 hours of awareness, supplementing as facts develop.' },
          { check: 'equals', id: 'finalClock', value: '1m', message: 'Both DORA and NIS2 expect a final report within one month of the intermediate report / incident notification.' },
          { check: 'equals', id: 'disclosureOwner', value: 'dpo', message: 'The DPO or legal owner files; the SOC supplies the factual annex. An analyst self-filing to a regulator is not a defensible process.' },
          { check: 'exactly', ids: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6'], on: ['e1', 'e2', 'e3', 'e5'], message: 'Contractual notice, law-enforcement/CERT contact, board materiality assessment and notifying affected users all apply. A public web post and “nothing else” do not.' },
          { check: 'minLength', id: 'handover', n: 60, message: 'Write the one-sentence handover: what is contained, what is exposed, when the clocks started.' },
          { check: 'forbids', id: 'handover', words: ['@'], message: 'No email addresses in a handover line. Use the account name or a role.' }
        ] }
    ],

    onReady: function (api) {
      /* schema blade */
      var host = api.$('#huntSchema');
      if (host) {
        host.innerHTML = SCHEMA.map(function (t) {
          var rows = (TABLES[t.table] || []).length;
          return '<div class="tbl" role="treeitem" tabindex="0" data-tbl="' + t.table + '" title="' + api.esc(t.desc) + '">' +
            '<b>' + t.table + '</b><span class="cnt">' + rows + ' rows</span></div>' +
            '<div class="cols" role="group" aria-label="Columns of ' + t.table + '">' + t.cols.map(function (c) {
              return '<button type="button" data-kql-insert="' + c + '" title="Insert column ' + c + '">' + c + '</button>';
            }).join('') + '</div>';
        }).join('');
        api.$$('#huntSchema .tbl').forEach(function (el) {
          function ins() { api.$('#huntQuery').value = el.getAttribute('data-tbl') + ' | take 10'; api.$('#huntQuery').focus(); api.log('Schema', 'Loaded table ' + el.getAttribute('data-tbl'), 'info'); }
          el.addEventListener('dblclick', ins);
          el.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); ins(); } });
        });
      }
      api.mountKql({ editor: 'huntQuery', results: 'rcwKqlResults', meta: 'rcwKqlMeta', error: 'rcwKqlError', label: 'blast-radius hunt', maxRows: 50, tables: TABLES });
      if (api.state.learner) { var ln = api.get('learnerName'); if (ln) ln.value = api.state.learner; }
      api.toast('Lab ready', 'Objective 1 is on the Home page. Everything you do is logged and nothing leaves this browser.', 'ok');
    },

    onStep: function (api, btn, seq) {
      var approvalReady = api.txt('approver').length >= 4 && api.txt('changeRef').length >= 6 &&
        api.val('respCategory') === 'contain' && api.val('window').indexOf('emergency') >= 0;
      if (!approvalReady) {
        api.flag('action-without-approval', 'Executed “' + btn.getAttribute('data-seq-step') + '” before the authorisation fields were complete');
      }
      if (btn.getAttribute('data-seq-step') === 'Image the device') {
        api.flag('premature-imaging', 'Attempted device imaging during containment, before the eradication decision and owner approval');
      }
      if (seq.length === SEQ.length && seq.slice(0, SEQ.length).join('|') === SEQ.join('|') && approvalReady) {
        api.toast('Sequence looks right', 'Now open the Action center to verify each queued action succeeded, then submit.', 'ok');
      }
    },

    afterObjective: function (api, id) {
      if (id === 'hunt') {
        api.toast('Containment unlocked', 'The blast radius is proved. Go to Devices · FIN-WKS-0421 and act in order.', 'ok');
      }
      if (id === 'respond') {
        api.log('Isolation state', 'FIN-WKS-0421 modelled as Isolated (simulated) · 3 further hosts pending review', 'info');
        api.patchRow('INC-2291', { });
      }
      if (id === 'resolve') {
        api.log('Incident resolved', 'INC-2291 · True positive · Multi-staged activity (simulated)', 'done');
      }
    }
  });
})();
