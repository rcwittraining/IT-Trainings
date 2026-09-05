/* ==========================================================================
   RCW IT Training · Microsoft Defender lab series
   Lab 5 — Defender for Office 365: phishing campaign containment
   All data in this file is synthetic. No tenant, API or credential.
   ========================================================================== */
(function () {
  'use strict';

  var NOW = '2026-09-04T09:00:00Z';
  var SENDER = 'n1ghtbloom@relay-secure.example';
  var C2HOST = 'login-contoso.secure-mail.example';

  /* --------------------------------------------------- simulated tables */
  function delivered(n, minute) {
    var who = ['fin.clerk', 'fin.mgr', 'hr.assistant', 'recep01', 'ops.admin', 'it.shared', 'legal01',
               'procurement01', 'procurement02', 'tax.analyst', 'auditor1'];
    var rows = [];
    for (var i = 0; i < n; i++) {
      rows.push({
        Timestamp: '2026-09-04 07:0' + (minute + i % 5) + ':' + (10 + i) + 'Z',
        SenderFromAddress: SENDER, RecipientEmailAddress: who[i % who.length] + '@contoso-rcw.example',
        Subject: 'Invoice 882' + (10 + i) + ' - open immediately', NetworkMessageId: 'm-882' + (10 + i) + 'a',
        DeliveryAction: 'Delivered', DetectionMethods: 'Phish, URL click protection', ThreatTypes: 'Phish'
      });
    }
    return rows;
  }

  var TABLES = {
    EmailEvents: delivered(11, 1).concat([
      { Timestamp: '2026-09-04 06:58:02Z', SenderFromAddress: SENDER, RecipientEmailAddress: 'pay.batch@contoso-rcw.example', Subject: 'Invoice 88209 - open immediately', NetworkMessageId: 'm-88209a', DeliveryAction: 'Quarantined', DetectionMethods: 'Phish', ThreatTypes: 'Phish' },
      { Timestamp: '2026-09-04 07:01:44Z', SenderFromAddress: SENDER, RecipientEmailAddress: 'auditor2@contoso-rcw.example', Subject: 'Invoice 88210 - open immediately', NetworkMessageId: 'm-88210a', DeliveryAction: 'Quarantined', DetectionMethods: 'Phish', ThreatTypes: 'Phish' },
      { Timestamp: '2026-08-20 10:00:00Z', SenderFromAddress: SENDER, RecipientEmailAddress: 'old.box@contoso-rcw.example', Subject: 'Invoice 87001', NetworkMessageId: 'm-87001a', DeliveryAction: 'HardQuarantined', DetectionMethods: 'Phish', ThreatTypes: 'Phish' },
      { Timestamp: '2026-09-04 06:40:00Z', SenderFromAddress: 'news@letter.example', RecipientEmailAddress: 'ops.admin@contoso-rcw.example', Subject: 'Monthly operations digest', NetworkMessageId: 'm-70101', DeliveryAction: 'Delivered', DetectionMethods: '', ThreatTypes: '' },
      { Timestamp: '2026-09-03 15:20:00Z', SenderFromAddress: 'vendor@partner-portal.example', RecipientEmailAddress: 'procurement01@contoso-rcw.example', Subject: 'Statement of work update', NetworkMessageId: 'm-70099', DeliveryAction: 'Delivered', DetectionMethods: '', ThreatTypes: '' }
    ]),
    EmailUrlInfo: [
      { Timestamp: '2026-09-04 07:12:00Z', NetworkMessageId: 'm-88210a', Url: 'https://' + C2HOST + '/s/88216', ClickAction: 'ClickThrough', ReportId: 'u-1' },
      { Timestamp: '2026-09-04 07:20:10Z', NetworkMessageId: 'm-88211a', Url: 'https://' + C2HOST + '/s/88216', ClickAction: 'ClickThrough', ReportId: 'u-2' },
      { Timestamp: '2026-09-04 07:21:02Z', NetworkMessageId: 'm-88212a', Url: 'https://' + C2HOST + '/s/88216', ClickAction: 'ClickThrough', ReportId: 'u-3' },
      { Timestamp: '2026-09-04 07:22:44Z', NetworkMessageId: 'm-88213a', Url: 'https://' + C2HOST + '/s/88216', ClickAction: 'ClickThrough', ReportId: 'u-4' },
      { Timestamp: '2026-09-04 06:59:00Z', NetworkMessageId: 'm-88209a', Url: 'https://' + C2HOST + '/s/88216', ClickAction: 'Blocked', ReportId: 'u-5' }
    ],
    EmailPostDeliveryEvents: [
      { Timestamp: '2026-09-04 07:31:20Z', NetworkMessageId: 'm-88211a', ActionType: 'NewInboxRuleCreated', UserId: 'fin.clerk@contoso-rcw.example', ExtraProperties: '{"RuleName":"Outlook mobile","ForwardTo":"collector@mail-relay.example"}', ReportId: 'pd-1' },
      { Timestamp: '2026-09-04 07:44:00Z', NetworkMessageId: 'm-88211a', ActionType: 'SoftDeletedByAdmin', UserId: 'fin.clerk@contoso-rcw.example', ExtraProperties: '{"Source":"Search and purge"}', ReportId: 'pd-2' },
      { Timestamp: '2026-09-04 07:22:50Z', NetworkMessageId: 'm-88212a', ActionType: 'LinkClicked', UserId: 'fin.mgr@contoso-rcw.example', ExtraProperties: '{"Browser":"Edge"}', ReportId: 'pd-3' }
    ],
    EmailAttachmentInfo: [
      { Timestamp: '2026-09-04 07:12:00Z', NetworkMessageId: 'm-88216a', FileName: 'Invoice_88216.docm', FileSize: 214016, SHA256: '7c1f9a02b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e', DetectionStatus: 'Detonating' },
      { Timestamp: '2026-09-04 07:05:00Z', NetworkMessageId: 'm-88210a', FileName: 'invoice.pdf', FileSize: 88112, SHA256: '', DetectionStatus: 'NoDetonationRequired' }
    ],
    DeviceNetworkEvents: [
      { Timestamp: '2026-09-04 07:22:10Z', DeviceName: 'FIN-WKS-0421', RemoteIP: '203.0.113.64', RemotePort: 443, RemoteUrl: C2HOST, ActionType: 'ConnectionSuccess', InitiatingProcessFileName: 'msedge.exe', BytesSent: 2400, BytesReceived: 1800, ReportId: 'dn-1' },
      { Timestamp: '2026-09-04 07:24:30Z', DeviceName: 'FIN-WKS-0777', RemoteIP: '203.0.113.64', RemotePort: 443, RemoteUrl: C2HOST, ActionType: 'ConnectionSuccess', InitiatingProcessFileName: 'msedge.exe', BytesSent: 2600, BytesReceived: 1750, ReportId: 'dn-2' },
      { Timestamp: '2026-09-04 07:20:40Z', DeviceName: 'HR-WKS-0110', RemoteIP: '203.0.113.64', RemotePort: 443, RemoteUrl: C2HOST, ActionType: 'ConnectionSuccess', InitiatingProcessFileName: 'chrome.exe', BytesSent: 900, BytesReceived: 15000, ReportId: 'dn-3' }
    ],
    IdentityLogonEvents: [
      { Timestamp: '2026-09-04 07:26:00Z', AccountName: 'fin.clerk', DeviceName: 'ADO-01', ActionType: 'LogonSuccess', Protocol: 'Cloud', LogonType: 'Interactive', RemoteDeviceName: '', ReportId: 'il-1' },
      { Timestamp: '2026-09-04 07:29:00Z', AccountName: 'fin.mgr', DeviceName: 'ADO-01', ActionType: 'LogonSuccess', Protocol: 'Cloud', LogonType: 'Interactive', RemoteDeviceName: '', ReportId: 'il-2' },
      { Timestamp: '2026-09-04 05:10:00Z', AccountName: 'ops.admin', DeviceName: 'DC-01', ActionType: 'LogonSuccess', Protocol: 'Kerberos', LogonType: 'RemoteInteractive', RemoteDeviceName: 'OPS-JUMP-01', ReportId: 'il-0' }
    ]
  };

  var SEQ = ['Confirm the search results and export the message list', 'Soft delete from all mailboxes', 'Remove the malicious inbox rule on FIN-CLERK',
    'ZAP the campaign in the interacted mailboxes', 'Reset credentials and revoke sessions for the two who posted',
    'Add the URL and file-hash indicators', 'Request hard delete only where soft delete failed'];

  /* -------------------------------------------------------------- config */
  window.RCWLab.init({
    labId: 'defender-email-campaign',
    title: 'Microsoft Defender for Office 365 · phishing campaign containment and tracking',
    now: NOW,
    complianceHref: '../microsoft-defender-labs/compliance-standards.html',
    kqlTables: TABLES,
    controls: [
      { id: 'triage', control: 'NIST SP 800-61r3 §3.2 · detection validation', evidence: 'Alerts grouped on shared indicators, unrelated alert separated' },
      { id: 'submit', control: 'Verdict integrity', evidence: 'No tenant-wide allow list created from a single submission; unfinished detonation held as pending' },
      { id: 'scope', control: 'Scoping before action', evidence: 'Bounded mail query plus a mailbox list justified by interaction, not by delivery' },
      { id: 'remediate', control: 'Authorised mailbox actions · ISO/IEC 27001 A.5.15, PCI DSS v4.0 12.10', evidence: 'Evidence preserved first; approval recorded for a declared scope; hard delete last' },
      { id: 'policies', control: 'Control gap closure', evidence: 'The allow rule removed as a finding; auditing extended; changes guard-railed' },
      { id: 'comms', control: 'Duty of care & reporting culture', evidence: 'Actionable notice with no names, no amounts, one place to ask' },
      { id: 'record', control: 'NIS2 Art. 23(4) · GDPR Art. 33', evidence: 'Tracker open with pending indicators marked, clocks stated for the right regime' }
    ],
    shell: {
      brand: 'Microsoft Defender portal',
      brandSuffix: 'console replica · Lab 5 of 5',
      tenant: 'contoso-rcw.example · simulated tenant',
      account: 'Nadia Rahman',
      accountRole: 'Messaging & collaboration SOC · simulated role',
      navTitle: 'Defender portal',
      nav: [
        { section: 'Home', open: true, items: [{ route: 'overview', label: 'Home · lab briefing', icon: '⌂' }] },
        { section: 'Email & collaboration', open: true, items: [
          { route: 'alerts', label: 'Alerts queue', icon: '⚑', objective: 'triage' },
          { route: 'submissions', label: 'Submissions queue', icon: '✉', objective: 'submit' },
          { route: 'scope', label: 'Threat explorer · campaign', icon: '⌕', objective: 'scope' },
          { route: 'actions', label: 'Actions & approvals', icon: '⊘', objective: 'remediate' },
          { route: 'policies', label: 'Policies & rules', icon: '⚙', objective: 'policies' },
          { plain: true, label: 'Quarantine' }, { plain: true, label: 'Reports' }
        ] },
        { section: 'People & process', open: true, items: [
          { route: 'comms', label: 'User notification', icon: '🗨', objective: 'comms' },
          { route: 'record', label: 'Threat tracker & clocks', icon: '⛁', objective: 'record' }
        ] },
        { section: 'Not part of this lab', open: false, items: [
          { plain: true, label: 'Identities' }, { plain: true, label: 'Endpoints' },
          { plain: true, label: 'Cloud apps' }, { plain: true, label: 'Exposure management' }
        ] },
        { section: 'Reference', open: true, items: [{ route: 'guide', label: 'Lab guide & marking', icon: '?' }] }
      ]
    },

    objectives: [
      { id: 'triage', view: 'alerts', points: 10, title: 'Real-time email alert triage', navLabel: 'Alert triage',
        capture: ['override', 'other', 'triageNote'],
        checks: [
          { check: 'rowSelection', selector: '#mailAlerts', ids: ['MA-9001', 'MA-9002', 'MA-9003', 'MA-9004'],
            message: 'The campaign is MA-9001 to MA-9004: the delivery, the clicks, the reports and the inbox rule. MA-9005 is Tuesday’s unrelated malware with a different sender and payload — merging it inflates the incident and hides the real finding.' },
          { check: 'equals', id: 'override', value: 'o1', message: '“Delivered (allowed by admin override)” is two facts: the detection worked and a tenant rule overrode it. The rule is a finding in its own right and belongs in the report.' },
          { check: 'equals', id: 'other', value: 'o1', message: 'Same queue, different incident. Shared indicators are the test of whether alerts belong together, not the time of day.' },
          { check: 'minLength', id: 'triageNote', n: 100, message: 'Write what is proven and what is not (100 characters minimum).' },
          { check: 'containsAll', id: 'triageNote', words: ['clicked'], message: 'Say explicitly that delivery does not prove a click — that distinction is what decides whether you need identity actions at all.' }
        ] },

      { id: 'submit', view: 'submissions', points: 10, title: 'Threat submission adjudication', navLabel: 'Submission queue',
        requires: ['triage'], capture: ['v1', 'v2', 'v3'],
        checks: [
          { check: 'equals', id: 'v1', value: 'o1', message: 'Confirmed phish plus tenant-wide remediation for the same message. Removing it only from the reporter’s mailbox leaves ten copies delivered — which is how a reported campaign becomes a second incident next week.' },
          { check: 'equals', id: 'v2', value: 'o1', message: 'Allow the item and reply to the reporters; do not add the domain to a tenant allow list. A submission-based domain trust is how a real campaign gets delivered in March.' },
          { check: 'equals', id: 'v3', value: 'o1', message: 'Detonation is still running: hold the verdict, request the result, and act now on what is already evidenced (the macro beacon). Closing as clean because the tool has not spoken is a decision by silence.' },
          { check: 'allChecked', ids: ['qA', 'qB', 'qC'], message: 'Evidence referenced in the verdict, reporters answered, and no tenant-wide allow list born from one submission.' }
        ] },

      { id: 'scope', view: 'scope', points: 20, title: 'Campaign scope: query plus mailbox list', navLabel: 'Campaign scope',
        requires: ['submit'], capture: ['deliveredCount', 'whyGroup', 'searchScope', 'scopeNote'],
        checks: [
          { check: 'kql', editor: 'mailQuery', table: 'EmailEvents', exactRows: 2, requireTimeWindow: true,
            firstRowField: 'DeliveryAction', firstRowValue: 'Delivered', requiresOperators: ['summarize'], forbids: ['| take', '1 == 1', 'ago(30d)', 'ago(90d)'],
            message: 'Filter on the campaign sender inside a 7-day window and summarise by DeliveryAction with a distinct-user count: exactly two groups, Delivered (11 messages) first, and Quarantined second. The 2026-08-20 HardQuarantined hit is outside the window and must not be pulled in.' },
          { check: 'custom', fn: function (api) { return /dcount\s*\(/i.test(api.txt('mailQuery')); }, message: 'Count distinct recipients with dcount(): a campaign that hit one mailbox eleven times is not the same event as eleven mailboxes.' },
          { check: 'rowSelection', selector: '#mailboxGrid', ids: ['MBX-1', 'MBX-2', 'MBX-3', 'MBX-4'],
            message: 'User-level work is for the four who opened the page. The delivered-but-did-not-click mailboxes are covered by the tenant-wide removal; the quarantined service mailbox needs nothing, and adding the shared mailbox to an identity action list generates noise and a false sense of coverage.' },
          { check: 'equals', id: 'deliveredCount', value: 'o1', message: 'Your own result said 11. Answering from the briefing rather than the grid is exactly the habit this objective checks.' },
          { check: 'equals', id: 'whyGroup', value: 'o1', message: 'Delivery action is the field that determines the work: delivered means removal plus user follow-up; quarantined means verification only.' },
          { check: 'equals', id: 'searchScope', value: 'o1', message: 'All mailboxes, scoped by sender and message IDs, soft delete first. The four-mailbox version leaves the rest in place; the immediate hard-delete version destroys the export you have not made yet.' },
          { check: 'minLength', id: 'scopeNote', n: 120, message: 'The scope statement is what the approval is granted against — 120 characters minimum, and it must be consistent with the query you ran.' },
          { check: 'forbids', id: 'scopeNote', words: ['@'], message: 'No mailbox addresses in the scope statement; identify people by role or by the synthetic account name.' }
        ] },

      { id: 'remediate', view: 'actions', points: 20, title: 'Remediation with approval, in order', navLabel: 'Remediation & approvals',
        requires: ['scope'], capture: ['approval', 'deleteMode', 'actNote'],
        checks: [
          { check: 'actionSequence', steps: SEQ,
            message: 'Order: confirm and export the message list → soft delete → remove the inbox rule → ZAP the interacted mailboxes → reset credentials and revoke sessions → add indicators → hard delete only the residue. Skipping the export removes your proof; leaving the rule in place leaves the exfiltration path open after the mail is gone.' },
          { check: 'mustNotHaveFlag', flag: 'hard-delete-before-soft', message: 'You hard-deleted before the evidence export. Reset the operation list and work it in order — the lab keeps the violation on record, like a real action center would.' },
          { check: 'mustNotHaveFlag', flag: 'unapproved-mass-comms', message: 'A company-wide notice announcing a payment loss is not a mail operation. It goes through communications and the incident owner; objective 6 is where you draft it.' },
          { check: 'equals', id: 'approval', value: 'o1', message: 'Approval from the accountable owner, recorded against the incident, for the declared scope. “I am a global admin” is capability, not authorisation.' },
          { check: 'equals', id: 'deleteMode', value: 'o1', message: 'Soft delete first: it is reversible, it is usually what the change policy permits without extra sign-off, and hard delete then only has to cover the residue.' },
          { check: 'allChecked', ids: ['aA', 'aB', 'aC', 'aD'], message: 'Export filed, rule removal verified, credential reset before declaring ZAP sufficient, indicators covering URL plus sender plus hash.' },
          { check: 'minLength', id: 'actNote', n: 150, message: '150 characters minimum: the action record is the artefact that answers “what did you actually do, and in what order”.' },
          { check: 'containsAll', id: 'actNote', words: ['rule', 'indicator'], message: 'Name the two things people forget afterwards: the inbox rule and the indicators. If they are not in the record, they did not happen.' },
          { check: 'forbids', id: 'actNote', words: ['@'], message: 'No addresses in the action record.' }
        ],
        evidence: ['Mail remediation executed in the evidence-preserving order under a recorded approval'] },

      { id: 'policies', view: 'policies', points: 15, title: 'Mail policy hardening and the audit gap', navLabel: 'Mail policy',
        requires: ['remediate'], capture: ['policySet', 'zapNote', 'allowRule'],
        checks: [
          { check: 'equals', id: 'policySet', value: 'o1', message: 'Audit everywhere, impersonation protection for the named finance list, block-until-detonation for unknown malware, and remove the allow rule. Tenant-wide impersonation and outbound sandboxing are plausible-sounding but unrelated to this failure mode and expensive on day one.' },
          { check: 'equals', id: 'zapNote', value: 'o1', message: 'Turn the ZAP notifications on. Silent retraction trades an incident for a hundred support tickets and a workforce that stops trusting the reporting add-in.' },
          { check: 'equals', id: 'allowRule', value: 'o1', message: 'Remove the rule and record its origin. Blocking the URL instead leaves the exception in place for the next domain the actor registers.' },
          { check: 'allChecked', ids: ['gA', 'gB', 'gC'], message: 'Change window with rollback per change, mail flow re-tested with a real message, and the policy change linked into the incident record.' }
        ] },

      { id: 'comms', view: 'comms', points: 10, title: 'User notification without burning the reporting culture', navLabel: 'User communication',
        requires: ['policies'], capture: ['audience', 'naming', 'fraud', 'notice'],
        checks: [
          { check: 'equals', id: 'audience', value: 'o1', message: 'Everyone who received it, plus the two teams whose process is targeted, with one specific ask. All-staff-with-names damages the control; quiet-to-four leaves the other seven exposed.' },
          { check: 'equals', id: 'naming', value: 'o1', message: 'Roles and counts only. A named person stops reporting, and your reporting rate is the cheapest sensor in this tenant.' },
          { check: 'equals', id: 'fraud', value: 'o1', message: 'The loss goes in the record and to the owner of the loss. A mass notice with an amount creates rumour, and discloses a commercial dispute to the whole company.' },
          { check: 'minLength', id: 'notice', n: 160, message: 'The notice needs the symptom, the ask, the deadline and where to ask questions — 160 characters minimum.' },
          { check: 'containsAll', id: 'notice', words: ['report'], message: 'Include the ask: report it with the add-in. Without that sentence the notice is reassurance, not a control.' },
          { check: 'forbids', id: 'notice', words: ['@', 'FIN-CLERK', 'FIN-MGR', 'HR-ASST', 'RECEP-01'], message: 'No addresses and no mailbox names in a company-wide notice.' }
        ] },

      { id: 'record', view: 'record', points: 15, title: 'Threat tracker entry and notification clocks', navLabel: 'Tracker & clocks',
        requires: ['comms'], capture: ['status', 'classify', 'gdpr', 'clock', 'openNote'],
        checks: [
          { check: 'equals', id: 'status', value: 'o1', message: 'Open. Two identity follow-ups and one indicator are unfinished; “closed, the mail is gone” is the status that hides the rest of the incident from the next shift.' },
          { check: 'equals', id: 'classify', value: 'o1', message: 'Credential-harvesting phish, with the payment thread tracked as a related business email compromise. Calling it malware would mis-route every future search for this template.' },
          { check: 'equals', id: 'gdpr', value: 'o1', message: 'Assess Article 33 now, on risk: mail was forwarded to an external address, so the threshold to assess is met. Waiting for the investigation to close is how the 72 hours disappear.' },
          { check: 'equals', id: 'clock', value: 'o1', message: 'NIS2 essential entity: 24-hour early warning, 72-hour notification, final report within a month. DORA’s four hours applies to financial entities; this tenant is a hospital group, and borrowing the wrong clock is the mistake the series keeps testing.' },
          { check: 'allChecked', ids: ['iA', 'iB', 'iC'], message: 'Confirmed indicators enforced with expiry, the pending hash recorded as pending, and the tracker linked to everything it came from.' },
          { check: 'minLength', id: 'openNote', n: 180, message: 'Write the open list properly (180 characters minimum): what is not done, who owns it, and when it is reviewed.' },
          { check: 'containsAll', id: 'openNote', words: ['audit', 'indicator'], message: 'Name the two open threads the evidence shows: the mailboxes still without auditing, and the indicator awaiting confirmation.' },
          { check: 'forbids', id: 'openNote', words: ['@'], message: 'No addresses in the tracker record.' }
        ],
        evidence: ['Tracker filed with confirmed and pending evidence separated'] }
    ],

    onReady: function (api) {
      api.mountKql({ editor: 'mailQuery', results: 'res-mailQuery', meta: 'meta-mailQuery', error: 'err-mailQuery', run: 'run-mailQuery', format: 'fmt-mailQuery', clear: 'clr-mailQuery', label: 'campaign scope query', maxRows: 60, tables: TABLES });
      var rst = api.$('#actReset');
      if (rst) rst.addEventListener('click', function () {
        api.state.answers['remediate.seq'] = []; api.clearFlag('hard-delete-before-soft'); api.clearFlag('unapproved-mass-comms'); api.save();
        api.log('Mail actions', 'Operation list reset in the simulation', 'warn');
        api.toast('Operations cleared', 'Click them in the order that keeps the evidence and the approval intact.', 'ok');
      });
      if (api.state.learner) { var ln = api.$('#learnerName'); if (ln) ln.value = api.state.learner; }
      api.toast('Lab ready', 'Start in the alerts queue. The submission queue is where the shortcuts get recorded.', 'ok');
    },

    onStep: function (api, btn, seq) {
      var step = btn.getAttribute('data-seq-step');
      if (step === 'Hard delete everything immediately') api.flag('hard-delete-before-soft', 'Hard delete requested before the message list was exported and before soft delete was attempted');
      if (step === 'Notify all staff that finance lost money') api.flag('unapproved-mass-comms', 'Company-wide notification drafted as a mail operation, outside the communications owner');
      if (seq.length === SEQ.length && seq.slice(0, SEQ.length).join('|') === SEQ.join('|')) {
        api.toast('Order is right', 'Fill the authorisation record and submit — the note is graded too.', 'ok');
      }
    },

    afterObjective: function (api, id) {
      if (id === 'triage') api.go('submissions');
      if (id === 'scope') api.toast('Scope locked', 'Now run the operations in order. The export comes before the delete.', 'ok');
      if (id === 'remediate') api.log('Mail remediation', 'Soft delete completed across 11 mailboxes · 1 inbox rule removed · ZAP queued for 4 (simulated)', 'done');
      if (id === 'policies') api.log('Policy change', 'Allow rule removed, audit extended, block-until-detonation enabled, impersonation scoped to the finance list (simulated)', 'done');
      if (id === 'comms') api.toast('Notice ready', 'Last step: the tracker entry, the indicators and the clock that actually applies here.', 'ok');
      if (id === 'record') api.toast('Lab complete', 'Export the evidence pack — it carries the operation order, which is the graded part.', 'ok');
    }
  });
})();
