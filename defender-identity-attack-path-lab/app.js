/* ==========================================================================
   RCW IT Training · Microsoft Defender lab series
   Lab 4 — Defender for Identity: attack paths, DCSync and token theft
   All data in this file is synthetic. No tenant, API or credential.
   ========================================================================== */
(function () {
  'use strict';

  var NOW = '2026-09-02T06:00:00Z';
  var REPLICATION_RIGHTS = 'DirectoryServiceReplicationGetChangesAll';

  /* --------------------------------------------------- simulated tables */
  var TABLES = {
    IdentityDirectoryEvents: [
      { Timestamp: '2026-09-02 04:38:11Z', DeviceName: 'DC-01', AccountName: 'svc_backup', ActionType: REPLICATION_RIGHTS, TargetAccountName: 'contoso-rcw.example', RemoteDeviceName: 'FIN-WKS-0777', Protocol: 'LDAP', ReportId: 'id-7001' },
      { Timestamp: '2026-09-02 04:38:44Z', DeviceName: 'DC-01', AccountName: 'svc_backup', ActionType: REPLICATION_RIGHTS, TargetAccountName: 'contoso-rcw.example', RemoteDeviceName: 'FIN-WKS-0777', Protocol: 'LDAP', ReportId: 'id-7002' },
      { Timestamp: '2026-09-01 22:04:02Z', DeviceName: 'DC-02', AccountName: 'adrsync-02$', ActionType: REPLICATION_RIGHTS, TargetAccountName: 'contoso-rcw.example', RemoteDeviceName: 'ADCONNECT-02', Protocol: 'LDAP', ReportId: 'id-6801' },
      { Timestamp: '2026-09-02 02:14:30Z', DeviceName: 'DC-01', AccountName: 'svc_backup', ActionType: 'KerberosServiceTicketRequested', TargetAccountName: 'MSSQLSvc/app-srv-01', RemoteDeviceName: 'FIN-WKS-0777', Protocol: 'Kerberos', ReportId: 'id-6900' },
      { Timestamp: '2026-09-02 02:16:02Z', DeviceName: 'DC-01', AccountName: 'svc_honey01', ActionType: 'NtlmAuthenticationAttempt', TargetAccountName: 'svc_honey01', RemoteDeviceName: 'WORKSTATION-9', Protocol: 'Ntlm', ReportId: 'id-6901' },
      { Timestamp: '2026-05-28 04:30:00Z', DeviceName: 'DC-01', AccountName: 'svc_backup', ActionType: REPLICATION_RIGHTS, TargetAccountName: 'contoso-rcw.example', RemoteDeviceName: 'OLD-MIGRATION-01', Protocol: 'LDAP', ReportId: 'id-5100' },
      { Timestamp: '2026-06-02 04:30:00Z', DeviceName: 'DC-03', AccountName: 'adrsync-02$', ActionType: 'DirectoryServiceReplicationGetChanges', TargetAccountName: 'contoso-rcw.example', RemoteDeviceName: 'ADCONNECT-02', Protocol: 'LDAP', ReportId: 'id-1200' },
      { Timestamp: '2026-09-02 02:20:10Z', DeviceName: 'DC-03', AccountName: 'backup-agent-02', ActionType: 'AccountEnumerated', TargetAccountName: 'CN=Protected Users', RemoteDeviceName: 'BACKUP-AGENT-02', Protocol: 'LDAP', ReportId: 'id-6905' }
    ],
    IdentityLogonEvents: [
      { Timestamp: '2026-09-02 02:14:22Z', AccountName: 'svc_backup', DeviceName: 'DC-01', ActionType: 'LogonSuccess', Protocol: 'Kerberos', LogonType: 'Network', RemoteDeviceName: 'FIN-WKS-0777', ReportId: 'il-3001' },
      { Timestamp: '2026-09-02 04:36:10Z', AccountName: 'it.admin.k', DeviceName: 'ADO-01', ActionType: 'LogonSuccess', Protocol: 'Cloud', LogonType: 'Interactive', RemoteDeviceName: '', ReportId: 'il-3002' },
      { Timestamp: '2026-09-02 04:39:02Z', AccountName: 'it.admin.k', DeviceName: 'APP-SRV-01', ActionType: 'LogonSuccess', Protocol: 'Ntlm', LogonType: 'Network', RemoteDeviceName: 'FIN-WKS-0777', ReportId: 'il-3003' },
      { Timestamp: '2026-09-02 05:58:44Z', AccountName: 'fin.clerk', DeviceName: 'DC-03', ActionType: 'LogonFailure', Protocol: 'Kerberos', LogonType: 'Interactive', RemoteDeviceName: 'FIN-WKS-0421', ReportId: 'il-3004' },
      { Timestamp: '2026-09-01 11:20:00Z', AccountName: 'ops.admin', DeviceName: 'DC-01', ActionType: 'LogonSuccess', Protocol: 'Kerberos', LogonType: 'RemoteInteractive', RemoteDeviceName: 'OPS-JUMP-01', ReportId: 'il-2900' }
    ],
    IdentityInfo: [
      { AccountName: 'svc_backup', DisplayName: 'Service account', AccountSource: 'On-premises', GroupNames: 'Account Operators;Backup Operators', RiskLevel: 'None', LastPasswordChange: '2024-03-11' },
      { AccountName: 'it.admin.k', DisplayName: 'IT admin', AccountSource: 'Hybrid', GroupNames: 'Domain Admins;Helpdesk', RiskLevel: 'High', LastPasswordChange: '2025-01-04' },
      { AccountName: 'adrsync-02$', DisplayName: 'Entra Connect computer', AccountSource: 'On-premises', GroupNames: 'ADSync RBAC', RiskLevel: 'None', LastPasswordChange: '2026-08-01' },
      { AccountName: 'svc_honey01', DisplayName: 'Honeytoken', AccountSource: 'On-premises', GroupNames: 'Domain Users', RiskLevel: 'None', LastPasswordChange: '2026-01-01' },
      { AccountName: 'fin.clerk', DisplayName: 'Finance clerk', AccountSource: 'Hybrid', GroupNames: 'FIN-WKS-LocalAdmin', RiskLevel: 'None', LastPasswordChange: '2026-07-19' }
    ],
    DeviceProcessEvents: [
      { Timestamp: '2026-09-02 04:37:40Z', DeviceName: 'FIN-WKS-0777', FileName: 'mimikatz.exe', AccountName: 'fin.clerk', InitiatingProcessFileName: 'cmd.exe', FolderPath: 'c:/users/fin.clerk/downloads', ReportId: 'pp-8801' },
      { Timestamp: '2026-09-02 04:38:02Z', DeviceName: 'FIN-WKS-0777', FileName: 'ntdsutil.exe', AccountName: 'fin.clerk', InitiatingProcessFileName: 'cmd.exe', FolderPath: 'c:/windows/system32', ReportId: 'pp-8802' },
      { Timestamp: '2026-09-02 02:13:50Z', DeviceName: 'FIN-WKS-0777', FileName: 'rubeus.exe', AccountName: 'fin.clerk', InitiatingProcessFileName: 'powershell.exe', FolderPath: 'c:/users/fin.clerk/downloads', ReportId: 'pp-8800' },
      { Timestamp: '2026-09-01 09:00:00Z', DeviceName: 'ADCONNECT-02', FileName: 'miissync.exe', AccountName: 'adrsync-02$', InitiatingProcessFileName: 'svchost.exe', FolderPath: 'c:/program files/microsoft sync', ReportId: 'pp-8700' }
    ],
    DeviceNetworkEvents: [
      { Timestamp: '2026-09-02 04:38:20Z', DeviceName: 'FIN-WKS-0777', RemoteIP: '203.0.113.97', RemotePort: 389, RemoteUrl: '', ActionType: 'ConnectionSuccess', InitiatingProcessFileName: 'ntdsutil.exe', BytesSent: 412000000, BytesReceived: 8800, ReportId: 'net-7001' },
      { Timestamp: '2026-09-02 04:40:02Z', DeviceName: 'FIN-WKS-0777', RemoteIP: '203.0.113.97', RemotePort: 443, RemoteUrl: 'beacon-relay.example', ActionType: 'ConnectionSuccess', InitiatingProcessFileName: 'svch0st.exe', BytesSent: 9700000, BytesReceived: 400, ReportId: 'net-7002' },
      { Timestamp: '2026-09-02 02:12:00Z', DeviceName: 'FIN-WKS-0777', RemoteIP: '10.20.4.19', RemotePort: 88, RemoteUrl: '', ActionType: 'ConnectionSuccess', InitiatingProcessFileName: 'lsass.exe', BytesSent: 1200, BytesReceived: 4400, ReportId: 'net-7000' }
    ],
    AlertInfo: [
      { Timestamp: '2026-09-02 02:14:40Z', AlertId: 'ALT-4401', Title: 'Kerberoasting activity', Description: 'Unusual volume of Kerberos service ticket requests', Severity: 'High', Category: 'CredentialAccess', AttackTechniques: 'T1558.003' },
      { Timestamp: '2026-09-02 02:16:20Z', AlertId: 'ALT-4402', Title: 'Suspicious user account mapping', Description: 'Enumeration of privileged group membership', Severity: 'Medium', Category: 'Discovery', AttackTechniques: 'T1087.002' },
      { Timestamp: '2026-09-02 04:38:30Z', AlertId: 'ALT-4403', Title: 'Active directory replication data access', Description: 'Directory replication data was requested by an unusual account', Severity: 'High', Category: 'CredentialAccess', AttackTechniques: 'T1003.006' },
      { Timestamp: '2026-09-02 04:40:10Z', AlertId: 'ALT-4404', Title: 'Honeytoken account used', Description: 'A honeypot account was used to authenticate', Severity: 'High', Category: 'CredentialAccess', AttackTechniques: 'T1187' },
      { Timestamp: '2026-09-02 03:02:00Z', AlertId: 'ALT-4405', Title: 'Suspicious connection to a domain controller', Description: 'Enumeration from a service host', Severity: 'Low', Category: 'Discovery', AttackTechniques: 'T1087.002' }
    ]
  };

  var SEQ = ['Confirm compromise', 'Revoke active sessions', 'Revoke refresh tokens', 'Disable user account',
    'Block sign-in on-premises (AD)', 'Reset password (cloud and on-premises)', 'Require re-registration of authentication methods'];

  /* -------------------------------------------------------------- config */
  window.RCWLab.init({
    labId: 'defender-identity-attack-path',
    title: 'Microsoft Defender for Identity · attack paths, DCSync and token theft response',
    now: NOW,
    complianceHref: '../microsoft-defender-labs/compliance-standards.html',
    kqlTables: TABLES,
    controls: [
      { id: 'intake', control: 'NIST SP 800-61r3 §3.2 · triage without over-claiming', evidence: 'Campaign alerts correlated; benign alert handled with a narrow suppression' },
      { id: 'recon', control: 'ISO/IEC 27001:2022 A.5.15 / A.8.2 · privileged access', evidence: 'Edge chosen on exploitability and business cost, not on severity labels' },
      { id: 'hunt', control: 'Verification before action', evidence: 'Bounded directory hunt distinguishing a legitimate connector from credential abuse' },
      { id: 'token', control: 'Containment order', evidence: 'Sessions and refresh tokens revoked before any password reset; cloud and on-premises both addressed' },
      { id: 'honey', control: 'Monitoring integrity', evidence: 'Exclusions narrowed and logged; the trip-wire itself was not muted' },
      { id: 'harden', control: 'Risk acceptance with an expiry', evidence: 'Feasible mitigations, audited enforcement, compensating control for the accepted exception' },
      { id: 'report', control: 'NIS2 Art. 23(4) · GDPR Art. 33/34', evidence: 'Correct clocks for this entity, confirmed/indicated split preserved, no personal data in the summary' }
    ],
    shell: {
      brand: 'Microsoft Defender portal',
      brandSuffix: 'console replica · Lab 4 of 5',
      tenant: 'contoso-rcw.example · simulated forest',
      account: 'Tomas Berg',
      accountRole: 'Identity SOC · simulated role',
      navTitle: 'Defender portal',
      nav: [
        { section: 'Home', open: true, items: [{ route: 'overview', label: 'Home · lab briefing', icon: '⌂' }] },
        { section: 'Identities', open: true, items: [
          { route: 'alerts', label: 'Identity alerts', icon: '⚑', objective: 'intake' },
          { route: 'graph', label: 'Exposure graph & paths', icon: '⛓', objective: 'recon' },
          { route: 'configure', label: 'Configuration · exclusions', icon: '⚙', objective: 'honey' }
        ] },
        { section: 'Investigation & response', open: true, items: [
          { route: 'hunt', label: 'Advanced hunting (identity)', icon: '⌕', objective: 'hunt' },
          { plain: true, label: 'Incidents' }, { plain: true, label: 'Hunting graph' }
        ] },
        { section: 'Entra ID Protection', open: true, items: [
          { route: 'entra', label: 'Risky users · it.admin.k', icon: '☗', objective: 'token' }
        ] },
        { section: 'Follow-up', open: true, items: [
          { route: 'harden', label: 'Hardening plan', icon: '⛨', objective: 'harden' },
          { route: 'report', label: 'Report & notification', icon: '⚖', objective: 'report' }
        ] },
        { section: 'Not part of this lab', open: false, items: [
          { plain: true, label: 'Endpoints' }, { plain: true, label: 'Email & collaboration' },
          { plain: true, label: 'Cloud apps' }, { plain: true, label: 'Exposure management' }
        ] },
        { section: 'Reference', open: true, items: [{ route: 'guide', label: 'Lab guide & marking', icon: '?' }] }
      ]
    },

    objectives: [
      { id: 'intake', view: 'alerts', points: 10, title: 'Identity alert triage and correlation', navLabel: 'Alert triage',
        capture: ['fpDecision', 'skew', 'whyOne'],
        checks: [
          { check: 'rowSelection', selector: '#idAlerts', ids: ['ALT-4401', 'ALT-4402', 'ALT-4403', 'ALT-4404'],
            message: 'Include the four campaign alerts. ALT-4405 matches a documented change record on the backup host — it belongs in the record as a false positive, not in the incident.' },
          { check: 'equals', id: 'fpDecision', value: 'o1', message: 'False positive with determination, then a narrowly scoped suppression with a review date. Closing all five to clear a queue deletes the honeytoken hit, which is the one alert that cannot be noise.' },
          { check: 'equals', id: 'skew', value: 'o1', message: 'Fix NTP on DC-03 and state the reliability caveat. Kerberos tolerance is five minutes; a four-minute skew makes both failures and silence on that DC untrustworthy.' },
          { check: 'minLength', id: 'whyOne', n: 90, message: 'Write the correlation argument (90 characters minimum) — the reviewer will not take “they look related”.' },
          { check: 'containsAll', id: 'whyOne', words: ['honeytoken'], message: 'The honeytoken hit is the anchor of the correlation: name it in your argument, because it is the only alert that proves credentials nobody should hold were used.' }
        ] },

      { id: 'recon', view: 'graph', points: 15, title: 'Attack-path reading and the edge to cut', navLabel: 'Attack path',
        requires: ['intake'], capture: ['pathWhy', 'pathLimits', 'pathNote'],
        checks: [
          { check: 'rowSelection', selector: '#pathEdges', ids: ['EDGE-3'],
            message: 'Cut EDGE-3 (unconstrained delegation on APP-SRV-01): it is the edge already used in the alert chain, it does not stop a business process, and removing it also removes the path through the DA group. EDGE-5 is the right long-term target with the wrong timing.' },
          { check: 'equals', id: 'pathWhy', value: 'o1', message: 'The Domain Admins membership is the correct end state; the payroll batch is the reason it cannot be today. Saying both, with an owner, is what makes the decision defensible.' },
          { check: 'equals', id: 'pathLimits', value: 'o1', message: 'The graph models possibility. Whether an edge was walked is a question for the alerts and the directory hunt — that is why objective 3 exists.' },
          { check: 'minLength', id: 'pathNote', n: 110, message: 'Describe the path the graph cannot see (110 characters minimum).' },
          { check: 'containsAll', id: 'pathNote', words: ['sid'], message: 'Mention the classic blind spot: history/SID-side relationships, non-domain-joined or ADFS-only identities, and trusts the sensor does not crawl. “sid” is the word the reviewer searches for.' },
          { check: 'forbids', id: 'pathNote', words: ['@'], message: 'No addresses in the path note; use account names or roles.' }
        ] },

      { id: 'hunt', view: 'hunt', points: 10, title: 'Prove the replication enquiry in KQL', navLabel: 'Directory hunt',
        requires: ['recon'], capture: ['huntNext', 'huntWhy'],
        checks: [
          { check: 'kql', editor: 'idQuery', table: 'IdentityDirectoryEvents', exactRows: 2, requireTimeWindow: true,
            rowFieldValues: { field: 'AccountName', values: ['svc_backup', 'adrsync-02$'] }, requiresOperators: ['summarize'], forbids: ['| take', '1 == 1'], firstRowField: 'Requests', firstRowValue: 2,
            message: 'Bound the window, filter ActionType to the GetChangesAll replication request, and summarise by AccountName. Exactly two accounts qualify inside 30 days: the backup service account (two requests from a workstation, plus one from an old migration host in May that a wider window would have merged in) and the sync connector account. The 2026-06-02 GetChanges event is a different action and outside the window.' },
          { check: 'equals', id: 'huntNext', value: 'o1', message: 'One of the two has the right by design. Verify its expected source host (ADCONNECT-02 here) before you disable a connector — that is how organisations produce a second incident on purpose.' },
          { check: 'minLength', id: 'huntWhy', n: 60, message: 'Explain the aggregation choice in at least 60 characters.' },
          { check: 'containsAll', id: 'huntWhy', words: ['alert'], message: 'The honest reason to summarise by account: a detection or an alert needs one signal per actor, not one per event, or you build a queue nobody can read.' }
        ] },

      { id: 'token', view: 'entra', points: 20, title: 'Risky-user containment in the correct order', navLabel: 'Risky user remediation',
        requires: ['hunt'], capture: ['disableScope', 'mfaWhy', 'tokenNote'],
        checks: [
          { check: 'actionSequence', steps: SEQ,
            message: 'Order: confirm compromise → revoke sessions → revoke refresh tokens → disable the account → block on-premises sign-in → reset the password on both sides → require MFA re-registration. Sessions without refresh-token revocation, or a reset before revocation, leaves the attacker a working token.' },
          { check: 'mustNotHaveFlag', flag: 'identity-deletion', message: 'You clicked “Delete the user”. Deletion destroys the sign-in history you are still relying on and breaks the sync object; disable, never delete, during containment.' },
          { check: 'mustNotHaveFlag', flag: 'password-reset-before-token-revocation', message: 'You reset the password before revoking refresh tokens. Undo the sequence, revoke first, then reset — and say so in the note.' },
          { check: 'mustNotHaveFlag', flag: 'risk-dismissed-before-remediation', message: 'You dismissed the risk on an account whose compromise is confirmed by a honeytoken hit. Reset the sequence and submit it in order.' },
          { check: 'equals', id: 'disableScope', value: 'o1', message: 'A cloud block does not stop Kerberos on-premises. Both sides, then confirm the sync state — otherwise the account keeps authenticating to the very DCs you are hunting on.' },
          { check: 'equals', id: 'mfaWhy', value: 'o1', message: 'Require re-registration: the second factor was bound on a device inside the blast radius, so the registration is part of the exposure, not a control you can trust.' },
          { check: 'allChecked', ids: ['tkA', 'tkB', 'tkC', 'tkD'], message: 'The four items around the account: SPN re-key, mailbox rules checked before lockout, legacy authentication blocked, KRBTGT rollback decided with a reason instead of skipped.' },
          { check: 'minLength', id: 'tokenNote', n: 160, message: '160 characters minimum: the note has to survive a handover at shift change.' },
          { check: 'containsAll', id: 'tokenNote', words: ['refresh', 'on-premises'], message: 'Name the two things a reviewer checks: refresh tokens revoked, and what happened on-premises.' }
        ],
        evidence: ['Simulated Entra ID Protection: sessions and refresh tokens revoked before any credential change'] },

      { id: 'honey', view: 'configure', points: 10, title: 'Exclusions and detection coverage integrity', navLabel: 'Coverage & exclusions',
        requires: ['token'], capture: ['exclApprove', 'honeySetup'],
        checks: [
          { check: 'equals', id: 'exclApprove', value: 'o1', message: 'Approve the single narrow request, with a review date. Excluding an alert category removes the enumeration that preceded the DCSync; excluding DC-03 removes your only view of the traffic you care about.' },
          { check: 'equals', id: 'honeySetup', value: 'o1', message: 'A honeytoken is a control because it is inert: never signed in, no mailbox, documented, and routed to a human. Give it a mailbox or normal group membership and you have created a target, not a trip-wire.' },
          { check: 'allChecked', ids: ['cx1', 'cx2', 'cx3'], message: 'Sensor health on every DC after the change, the 05:01 request recorded as an indicator, and exclusions documented with owner and expiry.' }
        ] },

      { id: 'harden', view: 'harden', points: 20, title: 'Hardening the path with a governed exception', navLabel: 'Hardening plan',
        requires: ['honey'], capture: ['ntlm', 'krbtgt', 'dmsa', 'exception', 'compControl'],
        checks: [
          { check: 'rowSelection', selector: '#mitigations', ids: ['MIT-1', 'MIT-2', 'MIT-3', 'MIT-7'],
            message: 'Exactly the four that can land in two weeks without a prerequisite: remove the delegation (MIT-1), revoke the mistaken GenericAll (MIT-2), gMSA for the roasted account (MIT-3), LAPS plus local-admin removal at the foothold (MIT-7). Protected Users (MIT-4) is right but needs the NTLM audit first; MIT-5 weakens you and MIT-6 is unrelated to this path.' },
          { check: 'equals', id: 'ntlm', value: 'o1', message: 'Audit then enforce, starting on tier-0. Enforcing everywhere tonight is how a hardening ticket becomes an outage ticket.' },
          { check: 'equals', id: 'krbtgt', value: 'o1', message: 'Twice, 12 hours apart, with tier-0 sessions ended — a single reset leaves previously issued tickets usable for their lifetime, and doing it blindly breaks long-lived service trust. Deferring with a reason is a decision; skipping is not.' },
          { check: 'equals', id: 'dmsa', value: 'o1', message: 'gMSA where the hosts support it; dMSA for the legacy hosts that cannot. They solve the same problem at different layers and the answer depends on the OS, not on preference.' },
          { check: 'equals', id: 'exception', value: 'o1', message: 'Accept the APP-SRV-01 exception with an owner, a compensating control and an expiry. “No exceptions, we fix everything this week” is a plan that will be silently abandoned.' },
          { check: 'minLength', id: 'compControl', n: 90, message: 'Write the compensating control (90 characters minimum) — this is the sentence an auditor reads to decide whether the exception is real.' },
          { check: 'containsAll', id: 'compControl', words: ['monitor'], message: 'Say how the host is monitored while the exception is open (alerting on interactive logon, delegation use, or replication requests).' }
        ] },

      { id: 'report', view: 'report', points: 15, title: 'Regulatory, executive and evidence record', navLabel: 'Report & notify',
        requires: ['harden'], capture: ['clock', 'gdpr', 'whoTold', 'indicated', 'execSum'],
        checks: [
          { check: 'equals', id: 'clock', value: 'o1', message: 'This tenant is an essential entity under NIS2: 24-hour early warning, 72-hour incident notification, final report within a month. DORA’s four hours belongs to financial entities — and “we contained it” does not remove the duty.' },
          { check: 'equals', id: 'gdpr', value: 'o1', message: 'Article 33 is triggered by the *risk* to rights and freedoms, not by proof of exfiltration. Notify within 72 hours of awareness, and record the reasoning if you decide Article 34 is not yet required.' },
          { check: 'equals', id: 'whoTold', value: 'o1', message: 'CISO, DPO, system owner and the on-call executive, with the confirmed/indicated split. An all-hands email at 06:15 is how a contained incident becomes a rumour.' },
          { check: 'equals', id: 'indicated', value: 'o1', message: 'Keep the unverified claim visible, with the specific evidence that would settle it. Removing it makes the report cleaner and the organisation blinder.' },
          { check: 'minLength', id: 'execSum', n: 200, message: '200 characters minimum for a summary that can be read without opening the console.' },
          { check: 'containsAll', id: 'execSum', words: ['honeytoken', 'not confirmed'], message: 'The summary must contain the anchor fact (honeytoken) and the honest limit (“not confirmed” on exfiltration). Both change what management decides next.' },
          { check: 'forbids', id: 'execSum', words: ['@'], message: 'No addresses or personal contact details in an executive summary.' }
        ],
        evidence: ['Report filed with the confirmed/indicated distinction intact'] }
    ],

    onReady: function (api) {
      api.mountKql({ editor: 'idQuery', results: 'res-idQuery', meta: 'meta-idQuery', error: 'err-idQuery', run: 'run-idQuery', format: 'fmt-idQuery', clear: 'clr-idQuery', label: 'DCSync replication hunt', maxRows: 40, tables: TABLES });
      var rst = api.$('#tokenReset');
      if (rst) rst.addEventListener('click', function () {
        api.state.answers['token.seq'] = []; api.clearFlag('identity-deletion'); api.clearFlag('risk-dismissed-before-remediation'); api.save();
        api.log('Risky user', 'Remediation sequence reset in the simulation', 'warn');
        api.toast('Sequence cleared', 'Click the actions in the order you would really work, then submit.', 'ok');
      });
      if (api.state.learner) { var ln = api.$('#learnerName'); if (ln) ln.value = api.state.learner; }
      api.toast('Lab ready', 'Start in the identity alert queue. Two of these five alerts are the same story as the other three.', 'ok');
    },

    onStep: function (api, btn, seq) {
      var step = btn.getAttribute('data-seq-step');
      if (step === 'Delete the user') api.flag('identity-deletion', 'Attempted to delete a user object during containment');
      if (step === 'Dismiss risk') api.flag('risk-dismissed-before-remediation', 'Dismissed the risk on a confirmed-compromised account before remediating it');
      if (step === 'Reset password (cloud and on-premises)' && seq.indexOf('Revoke refresh tokens') === -1) {
        api.flag('password-reset-before-token-revocation', 'Password reset before refreshing-token revocation, which leaves a valid refresh token in the attacker’s hands');
      }
      if (seq.length === SEQ.length && seq.slice(0, SEQ.length).join('|') === SEQ.join('|')) {
        api.toast('Order is right', 'Now set the scope and the MFA decision, then submit — the note is graded too.', 'ok');
      }
    },

    afterObjective: function (api, id) {
      if (id === 'intake') api.go('graph');
      if (id === 'hunt') api.toast('Hunt saved', 'Open the risky user. Two accounts matched; only one of them is a problem.', 'ok');
      if (id === 'token') api.log('Risky user contained', 'it.admin.k · sessions and refresh tokens revoked, both directories blocked (simulated)', 'done');
      if (id === 'harden') api.log('Exception filed', 'APP-SRV-01 · Domain Admins retained · compensating control and expiry recorded (simulated)', 'warn');
      if (id === 'report') api.toast('Lab complete', 'Export the evidence pack: the audit log shows the order you worked in, which is the part worth keeping.', 'ok');
    }
  });
})();
