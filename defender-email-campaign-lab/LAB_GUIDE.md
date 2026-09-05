# Lab 5 — Defender for Office 365: phishing campaign containment and tracking

**Provider:** RCW IT Training
**Series:** Microsoft Defender security labs (Lab 5 of 5)
**Level:** Advanced practitioner / messaging and collaboration SOC
**Estimated time:** 80–100 minutes
**Delivery:** Offline, browser-local console replica. No tenant, no mailbox access, no network calls.
**Lab URL:** [Open the lab](./)

> Console replica for teaching. Not Microsoft software, no affiliation or endorsement, no Microsoft logo. Every mailbox, message ID, URL, IP and hash in this lab is fabricated.

## Contents
1. Learning objectives · 2. Scenario · 3. Simulated boundary · 4. Authorisation and privacy · 5. Marking · 6. Procedure · 7. Expected results · 8. Traps · 9. Evidence and access · 10. Control alignment · 11. References

## Learning objectives

- triage an email incident by *what the telemetry proves*, and keep an unrelated alert out of the story;
- use the submission queue to correct detection and policy without creating a new exposure;
- prove campaign scope with a bounded `EmailEvents` query and reconcile the delivered figure to your own result;
- plan and execute mail remediation in an order that preserves evidence, and understand ZAP, soft and hard delete;
- obtain and record the approval a destructive mailbox action needs, for a declared scope;
- close the control gap that let the campaign in — auditing, protection policy, an unsafe allow rule;
- handle the human side: user notice, credential reset, and the breach clocks that apply to this tenant.

## Scenario

Simulated clock **Friday 2026-09-04 09:00 UTC**, handover. At **07:12** the campaign mail — subject pattern `Invoice 88xxx · open immediately` from `n1ghtbloom@relay-secure.example` — was delivered to **11 mailboxes**. At **07:20** four users opened `login-contoso.secure-mail.example` (`203.0.113.64`) and **two entered credentials**. At **07:31** `FIN-CLERK` created a **forward-and-delete inbox rule** (post-delivery action recorded — this is why mail is not the whole story). At **07:41** a user reported the message, and the submissions queue now holds **three** items, one of them a newsletter. Separately, from **08:02** finance is reporting a payment made to a **changed bank detail** on a thread two weeks old — a possible business email compromise that belongs to a different case.

The delivery alert shows **Delivered (allowed by admin override)**, the override having been added on 2026-08-19: the detection fired and a tenant rule let the message through, so the mail fix is also a policy finding. Mailbox auditing is enabled on only **40%** of the 1,840 mailboxes, and one of the four interacted mailboxes has it disabled — which limits what you can claim about read state. Tenant `contoso-rcw.example` is a **regional hospital group**, and that is what decides the notification clock: **NIS2**, not DORA. Role: messaging and collaboration SOC analyst **Nadia Rahman**.

## Simulated boundary

Real behaviour modelled: email alert queue with per-alert verdicts; the submissions queue and what a submission can and cannot change; Threat explorer over `EmailEvents` with a KQL pane; the mailbox search-and-delete flow with soft/hard delete, ZAP, re-evaluation, tenant allow lists, actions and their statuses; message tracking; mail flow and protection policy views with audit bypass scopes; threat tracker entries; notification and action-centre records.
Simplified: no mailbox is touched, "purge" and "re-evaluate" return simulated statuses, detonation results are scripted, and policy edits are recorded rather than applied. Search-and-purge approval is modelled as a recorded approval, not a real consent workflow.

## Authorisation and privacy

Mailbox content is the most privacy-sensitive evidence a SOC handles, so the lab enforces it as a rule: **no message body or attachment content is present in the replica at all** — headers, telemetry and metadata only; the investigation package is a hash, a file size and a detonation verdict. You confirm an authorisation statement before any graded field accepts input, you must record the written scope *before* a destructive action is allowed, and every action is appended to a local audit record with identity redaction on by default. Evidence export is redacted unless you explicitly change it. Nothing leaves the browser: no cookies, no analytics, no third-party requests, one `localStorage` key per lab.

## Marking

| # | Objective | Pts | Core check |
| --- | --- | --- | --- |
| 1 | Real-time email alert triage | 10 | Exactly `MA-9001`–`MA-9004`; the override and the unrelated alert classified correctly; proof vs disproof written (100 chars) and the delivery ≠ click distinction named |
| 2 | Threat submission adjudication | 10 | Three verdicts: tenant-wide remediation for a confirmed phish, allow-with-reply for the newsletter (no tenant allow list), hold while detonation runs; three discipline checks |
| 3 | Campaign scope: query plus mailbox list | 20 | Bounded 7-day `EmailEvents` query summarised `by DeliveryAction` with `dcount()`, **2 rows, Delivered first**, delivered figure read from your result, exactly four mailboxes for user-level work, 120-character scope with no addresses |
| 4 | Remediation with approval, in order | 20 | Seven operations in the evidence-preserving order, no hard-delete-first, no mass comms as a mail action, approval and delete mode, four verified conditions, 150-character action record naming the rule and the indicators |
| 5 | Mail policy hardening and the audit gap | 15 | Policy set aimed at *this* failure mode, ZAP notifications on, the allow rule removed as a finding, three guardrails |
| 6 | User notification without burning the reporting culture | 10 | Audience, no names, no loss amounts, a 160-character notice that contains the ask |
| 7 | Threat tracker entry and notification clocks | 15 | Status open with the reason, correct classification, Article 33 assessed on risk, **NIS2** clocks (not DORA), confirmed vs pending indicators separated, 180-character open list naming the audit gap and the pending indicator |

Total 100 points.

## Procedure

1. **Triage (10).** Alerts view → select the campaign alerts, answer the two questions that decide the rest of the lab (what does "delivered by override" mean, and where else does this sender appear), then write what is proven and what is not.
2. **Submissions (10).** Submissions view → decide each submission and tick the discipline items. Read the four things a submission can change before you decide.
3. **Scope (20).** Threat explorer → write the query against `EmailEvents` (schema card above the editor lists the columns), run it, and answer the three follow-ups **from your own result**; then select the mailboxes that need user-level work and write the search scope you will request approval for.
4. **Remediate (20).** Actions view → click the seven operations in order (reset the list if you break it), record the approval and the delete mode, tick the four verified conditions and write the action record.
5. **Policies (15).** Policies view → choose the policy set, the ZAP notification stance and the disposition of the tenant allow rule behind MA-9001, then the guardrails.
6. **Comms (10).** Notification view → audience, names, the payment detail, and the notice itself.
7. **Record (15).** Threat tracker → status, classification, the Article 33 assessment, the clock that applies, indicator handling, and what stays open. Then export the evidence pack from the guide view.

## Expected results

- Alerts: `MA-9001`–`MA-9004` only. `MA-9005` is the previous day's unrelated malware.
- Submissions: confirmed phish → remediate tenant-wide; newsletter → allow and answer the reporters, **do not** add `letter.example` to a tenant allow list; unfinished detonation → hold and record what is already evidenced (`SUB-1103`'s macro beaconing to `203.0.113.64`).
- Scope query returns **Delivered 11 / Quarantined 2**; `Users` = 11; the answer to "how many delivered" is **11** because your own grid said so. Grouping by recipient, or a 30/90-day window, is rejected.
- Remediation order: export → soft delete → remove the inbox rule → ZAP → credential reset → indicators → hard delete for the residue only. Hard delete first sets a flag that survives a reset, like a real action record.
- Policy: audit everywhere, impersonation protection for the named finance list, block-until-detonation for unknown malware, and **remove the tenant rule that allowed `n1ghtbloom@relay-secure.example`** — with who asked for it and against what justification recorded, because that is a control finding, not a mail fix.
- Clocks: **NIS2 essential entity — 24 h early warning, 72 h notification, final report within one month**; GDPR Article 33 assessed on risk; DORA's 4 hours does **not** apply to a hospital group.

## Traps the lab records

1. Deleting before the message list is exported.
2. A tenant-wide allow list born from one submission.
3. Hard delete "to be sure", with no approval and no scope.
4. Fixing mail only: leaving the inbox rule and the two credential-posting accounts behind.
5. Enforcing an indicator from an unfinished detonation instead of recording it as pending.
6. Naming who clicked in a company-wide notice.
7. Reading "delivered" as "compromised" — delivery, click and credential entry are three facts, and each changes the next action.

## Evidence and access

`Lab guide` → **Export evidence pack** (JSON, redacted by default) contains the operation order, every field, the query and its result counts, and the audit trail. `Reset lab state` clears only this lab. Grids: arrow keys move, Space toggles, Shift+Arrow extends, and the caption announces the running count so selection is never colour-only. The operations list is a labelled group of real buttons with an announced sequence state. Every form message sits inside its form, uses `aria-live`, and repeats the expected value in words. Skip link, 3:1 focus, Escape closes the audit flyout, forced colours and `prefers-reduced-motion` supported, print view expands the tabs.

## Control alignment

Process: **NIST SP 800-61r3** §3.2–§3.4 (detection and analysis, containment/eradication/recovery, post-incident). Management system: **ISO/IEC 27001:2022 A.5.24–A.5.28** (incident management), **A.5.15/A.5.18** (access revocation), **A.8.15–A.8.16** (logging and monitoring — the audit-gap finding), **A.5.9/A.8.19** for the policy change. Change control: **PCI DSS v4.0** 6.3 for the mail flow rule, 12.10 for incident response. Clocks: **NIS2 Art. 23(4)**; **GDPR Art. 33/34** on risk; DORA Art. 19 cited only to be correctly excluded. Adversary techniques: **MITRE ATT&CK** T1566.002, T1204.003, T1534, T1098.003, T1078.004. Educational mapping only — not a compliance certification, audit opinion, or legal advice, and not affiliated with or endorsed by Microsoft.

## References

`learn.microsoft.com/defender-office-365/mdo-sec-ops-guide` · `learn.microsoft.com/defender-office-365/remediate-enterprise-alert` · `learn.microsoft.com/defender-office-365/threat-explorer` · `learn.microsoft.com/defender-office-365/mdo-threat-tracking` · `learn.microsoft.com/defender-office-365/phish-zap-submission` · `learn.microsoft.com/defender-office-365/tds-auto-directed-weight` · `learn.microsoft.com/purview/trace-and-reduce-mail` · `learn.microsoft.com/defender-xdr/advanced-hunting-schema-tables` · NIST SP 800-61r3 · ISO/IEC 27001:2022 Annex A · ENISA NIS2 implementing regulation (EU) 2024/2960 · MITRE ATT&CK Enterprise
